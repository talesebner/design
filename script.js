/*
	Shared website behavior:
	- Responsive mobile navigation
	- Theme persistence with system preference fallback
	- Canvas particle hero
	- Scroll-triggered reveal animation
	- Lightweight parallax effect
	- Image lightbox gallery
	- Contact form front-end validation and CSRF injection
*/
(() => {
	const root = document.documentElement;
	const year = new Date().getFullYear();
	document.querySelectorAll('[data-year]').forEach((node) => {
		node.textContent = String(year);
	});

	const nav = document.querySelector('#site-nav');
	const menuButton = document.querySelector('[data-menu-toggle]');
	if (nav && menuButton) {
		menuButton.addEventListener('click', () => {
			const expanded = menuButton.getAttribute('aria-expanded') === 'true';
			menuButton.setAttribute('aria-expanded', String(!expanded));
			nav.classList.toggle('is-open');
		});
	}

	const mq = window.matchMedia('(prefers-color-scheme: dark)');
	const storedTheme = localStorage.getItem('te-theme');
	const initialTheme = storedTheme || (mq.matches ? 'dark' : 'light');
	root.setAttribute('data-theme', initialTheme);
	const themeToggle = document.querySelector('[data-theme-toggle]');
	if (themeToggle) {
		themeToggle.addEventListener('click', () => {
			const nextTheme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
			root.setAttribute('data-theme', nextTheme);
			localStorage.setItem('te-theme', nextTheme);
		});
	}

	if (!storedTheme) {
		mq.addEventListener('change', (event) => {
			root.setAttribute('data-theme', event.matches ? 'dark' : 'light');
		});
	}

	const revealItems = document.querySelectorAll('.reveal');
	if ('IntersectionObserver' in window && revealItems.length) {
		const observer = new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					entry.target.classList.add('visible');
					observer.unobserve(entry.target);
				}
			});
		}, {threshold: 0.15});
		revealItems.forEach((item) => observer.observe(item));
	} else {
		revealItems.forEach((item) => item.classList.add('visible'));
	}

	const cards = Array.from(document.querySelectorAll('.parallax-zone .card'));
	if (cards.length) {
		const updateParallax = () => {
			const midpoint = window.scrollY + window.innerHeight / 2;
			cards.forEach((card, index) => {
				const cardMid = card.offsetTop + card.offsetHeight / 2;
				const distance = (midpoint - cardMid) * 0.05;
				card.style.setProperty('--parallax', String(Math.max(-20, Math.min(20, distance + index * 1.5))));
			});
		};
		updateParallax();
		window.addEventListener('scroll', updateParallax, {passive: true});
		window.addEventListener('resize', updateParallax);
	}

	const modal = document.querySelector('[data-lightbox-modal]');
	if (modal) {
		const safeAssetUrl = (value) => {
			try {
				const parsed = new URL(value, window.location.href);
				if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
					return parsed.href;
				}
			} catch (_error) {
				return '';
			}
			return '';
		};
		const modalImage = modal.querySelector('[data-lightbox-image]');
		const modalTitle = modal.querySelector('[data-lightbox-title]');
		const closeButton = modal.querySelector('[data-lightbox-close]');
		document.querySelectorAll('[data-lightbox]').forEach((item) => {
			item.addEventListener('click', () => {
				const image = safeAssetUrl(item.getAttribute('data-image') || item.querySelector('img')?.src || '');
				const title = item.getAttribute('data-title') || item.querySelector('h2, h3')?.textContent || '';
				if (!image) {
					return;
				}
				if (modalImage) {
					modalImage.src = image;
					modalImage.alt = title;
				}
				if (modalTitle) {
					modalTitle.textContent = title;
				}
				modal.hidden = false;
				document.body.style.overflow = 'hidden';
			});
		});

		const closeLightbox = () => {
			modal.hidden = true;
			document.body.style.overflow = '';
		};

		closeButton?.addEventListener('click', closeLightbox);
		modal.addEventListener('click', (event) => {
			if (event.target === modal) {
				closeLightbox();
			}
		});
		document.addEventListener('keydown', (event) => {
			if (event.key === 'Escape' && !modal.hidden) {
				closeLightbox();
			}
		});
	}

	const form = document.querySelector('[data-contact-form]');
	if (form) {
		const tokenField = form.querySelector('[data-csrf-token]');
		const note = form.querySelector('[data-form-note]');
		if (tokenField) {
			const token = crypto.randomUUID ? crypto.randomUUID() : crypto.getRandomValues(new Uint32Array(4)).join('');
			tokenField.value = token;
			document.cookie = `te_csrf=${encodeURIComponent(token)}; path=/; SameSite=Strict${window.location.protocol === 'https:' ? '; Secure' : ''}`;
		}
		form.addEventListener('submit', (event) => {
			if (!(form instanceof HTMLFormElement)) {
				return;
			}
			const payload = new FormData(form);
			const name = String(payload.get('name') || '').trim();
			const email = String(payload.get('email') || '').trim();
			const message = String(payload.get('message') || '').trim();
			const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (name.length < 2 || !emailPattern.test(email) || message.length < 10) {
				event.preventDefault();
				if (note) {
					note.textContent = 'Please provide a valid name, email, and a message of at least 10 characters.';
				}
			}
		});
	}

	const canvas = document.querySelector('#hero-canvas');
	if (canvas instanceof HTMLCanvasElement) {
		const context = canvas.getContext('2d');
		if (context) {
			const particles = [];
			let frameId = 0;

			const resizeCanvas = () => {
				canvas.width = canvas.clientWidth;
				canvas.height = canvas.clientHeight;
			};

			const resetParticles = () => {
				particles.length = 0;
				for (let i = 0; i < 65; i += 1) {
					particles.push({
						x: Math.random() * canvas.width,
						y: Math.random() * canvas.height,
						vx: (Math.random() - 0.5) * 0.6,
						vy: (Math.random() - 0.5) * 0.6,
						r: 1 + Math.random() * 2
					});
				}
			};

			const draw = () => {
				context.clearRect(0, 0, canvas.width, canvas.height);
				context.fillStyle = 'rgba(255, 209, 0, 0.85)';
				particles.forEach((p) => {
					p.x += p.vx;
					p.y += p.vy;
					if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
					if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
					context.beginPath();
					context.arc(p.x, p.y, p.r, 0, Math.PI * 2);
					context.fill();
				});
				frameId = requestAnimationFrame(draw);
			};

			resizeCanvas();
			resetParticles();
			draw();
			window.addEventListener('resize', () => {
				cancelAnimationFrame(frameId);
				resizeCanvas();
				resetParticles();
				draw();
			});
		}
	}
})();
