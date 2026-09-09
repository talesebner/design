<?php
/*
	Secure contact endpoint for Tales Ebner Design.
	Requirements to configure before production use:
	1) Replace CONTACT_EMAIL with your destination inbox.
	2) Ensure your hosting supports mail() or swap for an SMTP provider.
	3) Serve this endpoint only over HTTPS.
*/
declare(strict_types=1);

const CONTACT_EMAIL = 'hello@talesebner.com';
const MAX_REQUESTS_PER_WINDOW = 5;
const RATE_LIMIT_WINDOW_SECONDS = 600;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
	http_response_code(405);
	exit('Method not allowed.');
}

$csrfForm = $_POST['csrf_token'] ?? '';
$csrfCookie = $_COOKIE['te_csrf'] ?? '';
if (!is_string($csrfForm) || !is_string($csrfCookie) || $csrfForm === '' || $csrfCookie === '') {
	http_response_code(400);
	exit('Missing CSRF token.');
}

if (!hash_equals($csrfCookie, $csrfForm)) {
	http_response_code(403);
	exit('Invalid CSRF token.');
}

$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$rateDir = sys_get_temp_dir() . '/te-design-rate-limit';
if (!is_dir($rateDir) && !mkdir($rateDir, 0770, true) && !is_dir($rateDir)) {
	http_response_code(500);
	exit('Rate limit storage unavailable.');
}

$rateFile = $rateDir . '/' . hash('sha256', $ip) . '.json';
$now = time();
$history = [];
if (file_exists($rateFile)) {
	$raw = file_get_contents($rateFile);
	$decoded = json_decode((string) $raw, true);
	if (is_array($decoded)) {
		$history = array_filter(
			$decoded,
			static fn ($stamp): bool => is_int($stamp) && ($now - $stamp) < RATE_LIMIT_WINDOW_SECONDS
		);
	}
}

if (count($history) >= MAX_REQUESTS_PER_WINDOW) {
	http_response_code(429);
	exit('Too many requests. Please wait and try again.');
}

$history[] = $now;
$encodedHistory = json_encode(array_values($history));
if ($encodedHistory === false || file_put_contents($rateFile, $encodedHistory, LOCK_EX) === false) {
	http_response_code(500);
	exit('Unable to apply rate limiting.');
}

$name = trim((string) ($_POST['name'] ?? ''));
$email = trim((string) ($_POST['email'] ?? ''));
$message = trim((string) ($_POST['message'] ?? ''));

$name = preg_replace('/[\r\n]+/', ' ', $name) ?? $name;
$email = preg_replace('/[\r\n]+/', ' ', $email) ?? $email;

if (mb_strlen($name) < 2 || mb_strlen($message) < 10 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
	http_response_code(422);
	exit('Validation failed.');
}

$subject = 'Portfolio contact request';
$body = "Name: {$name}\nEmail: {$email}\n\nMessage:\n{$message}";
$headers = [
	'From: noreply@talesebner.com',
	'Reply-To: ' . $email,
	'Content-Type: text/plain; charset=UTF-8'
];

$sent = mail(CONTACT_EMAIL, $subject, $body, implode("\r\n", $headers));
if (!$sent) {
	http_response_code(500);
	exit('Unable to send at this time.');
}

header('Location: index.html#contact');
exit;
