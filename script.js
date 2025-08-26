'use strict';

// Yardımcılar
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const lerp = (a, b, t) => a + (b - a) * t;

// Global durum
const state = {
  theme: 'auto',
  navOpen: false,
  carouselIndex: 0,
  carouselTimer: null,
  prefersReduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
};

// Başlangıç
window.addEventListener('DOMContentLoaded', () => {
  setupTheme();
  setupHeader();
  setupHeroCounters();
  setupVideoModal();
  setupCanvasBackground();
  setupCarousel();
  setupAccordion();
  setupForm();
  revealOnScroll();
  setupPointerGlow();
  updateYear();
});

// Tema
function setupTheme() {
  const saved = localStorage.getItem('rq-theme');
  if (saved) {
    state.theme = saved;
    document.documentElement.dataset.theme = saved;
  }
  const btn = $('#tema-toggle');
  if (!btn) return;
  // Başlangıç ARIA durumu
  const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const currentTheme = document.documentElement.dataset.theme || (systemPrefersDark ? 'dark' : 'light');
  document.documentElement.dataset.theme = currentTheme;
  btn.setAttribute('aria-pressed', String(currentTheme === 'dark'));
  btn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('rq-theme', next);
    btn.setAttribute('aria-pressed', String(next === 'dark'));
  });
}

// Üst menü ve navigasyon
function setupHeader() {
  const toggle = $('.nav-toggle');
  const nav = $('#nav');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', () => {
    state.navOpen = !state.navOpen;
    if (state.navOpen) {
      nav.dataset.open = 'true';
    } else {
      delete nav.dataset.open;
    }
    toggle.setAttribute('aria-expanded', String(state.navOpen));
  });
  $$('.nav-list a').forEach((a) => a.addEventListener('click', () => {
    state.navOpen = false;
    delete nav.dataset.open;
    toggle.setAttribute('aria-expanded', 'false');
  }));
  // Dışarı tıklamada menüyü kapat
  document.addEventListener('click', (e) => {
    if (!state.navOpen) return;
    if (!nav.contains(e.target) && !toggle.contains(e.target)) {
      state.navOpen = false;
      delete nav.dataset.open;
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
  // Escape ile kapat
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.navOpen) {
      state.navOpen = false;
      delete nav.dataset.open;
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    }
  });
  // Scroll spy
  const links = $$('.nav-list a');
  const sections = links.map((l) => document.querySelector(l.getAttribute('href'))).filter(Boolean);
  const spy = () => {
    const y = window.scrollY + 120;
    let activeIdx = 0;
    sections.forEach((s, i) => { if (s.offsetTop <= y) activeIdx = i; });
    links.forEach((l, i) => {
      const on = i === activeIdx;
      l.classList.toggle('active', on);
      if (on) l.setAttribute('aria-current', 'page'); else l.removeAttribute('aria-current');
    });
  };
  window.addEventListener('scroll', spy, { passive: true });
  spy();
}

// Hero sayaçları
function setupHeroCounters() {
  const nums = $$('.hero .num');
  if (!nums.length) return;
  const duration = 1400;
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        const el = e.target;
        const target = Number(el.getAttribute('data-count')) || 0;
        const start = performance.now();
        const tick = (t) => {
          const p = clamp((t - start) / duration, 0, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(lerp(0, target, eased)).toLocaleString('tr-TR');
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        obs.unobserve(el);
      }
    });
  }, { threshold: 0.6 });
  nums.forEach((n) => observer.observe(n));
}

// Video modali
function setupVideoModal() {
  const modal = $('#video-modal');
  const openers = $$('[data-open-video]');
  const closeBtn = modal ? modal.querySelector('[data-close]') : null;
  if (!modal) return;
  const iframe = modal.querySelector('iframe');
  const originalSrc = iframe ? iframe.src : '';
  const open = () => {
    modal.showModal();
    if (iframe && !iframe.src) iframe.src = originalSrc;
  };
  const close = () => {
    modal.close();
    // YouTube oynatımı durdurmak için src'yi temizle
    if (iframe) {
      const current = iframe.src;
      iframe.src = '';
      // Hemen geri yükleme yapmıyoruz; tekrar açıldığında set edilir
      setTimeout(() => { if (modal.open === false && !iframe.src) iframe.src = current; }, 200);
    }
  };
  openers.forEach((b) => b.addEventListener('click', open));
  if (closeBtn) closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.open) close(); });
}

// Arka plan tuvali: paralaks yıldız/partikül alanı
function setupCanvasBackground() {
  const canvas = $('#bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);
  let pixels = [];
  let running = true;

  function createField() {
    pixels = Array.from({ length: width * height > 1_500_000 ? 70 : 110 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      z: Math.random() * 0.8 + 0.2,
      vx: (Math.random() - 0.5) * 0.06,
      vy: (Math.random() - 0.5) * 0.06,
      hue: 190 + Math.random() * 80,
    }));
  }

  function draw(t) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, width, height);
    for (const p of pixels) {
      p.x += p.vx * (p.z * 1.2);
      p.y += p.vy * (p.z * 1.2);
      if (p.x < -20) p.x = width + 20; if (p.x > width + 20) p.x = -20;
      if (p.y < -20) p.y = height + 20; if (p.y > height + 20) p.y = -20;
      const size = p.z * 2.2;
      ctx.beginPath();
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 8);
      g.addColorStop(0, `hsla(${p.hue}, 90%, 74%, ${0.18 * p.z})`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!state.prefersReduced && running) requestAnimationFrame(draw);
  }

  const onResize = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    createField();
  };
  window.addEventListener('resize', onResize);
  onResize();
  requestAnimationFrame(draw);
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) requestAnimationFrame(draw);
  });
}

// Carousel
function setupCarousel() {
  const root = $('[data-carousel]');
  if (!root) return;
  const track = root.querySelector('.carousel-track');
  const slides = $$('.slide', track);
  const prev = root.querySelector('.prev');
  const next = root.querySelector('.next');
  const dots = root.querySelector('.carousel-dots');

  let index = 0;
  function update() {
    track.style.transform = `translateX(${-index * 100}%)`;
    dots.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-current', String(i === index)));
    // Erişilebilir canlı metin (gerekirse)
  }

  function goTo(i) {
    index = (i + slides.length) % slides.length;
    update();
  }

  prev.addEventListener('click', () => goTo(index - 1));
  next.addEventListener('click', () => goTo(index + 1));

  slides.forEach((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Slayt ${i + 1}`);
    b.addEventListener('click', () => goTo(i));
    dots.appendChild(b);
  });

  update();

  const auto = () => { state.carouselTimer = setInterval(() => goTo(index + 1), 4500); };
  const stop = () => { if (state.carouselTimer) clearInterval(state.carouselTimer); };
  root.addEventListener('mouseenter', stop);
  root.addEventListener('mouseleave', auto);
  auto();

  // Klavye ve görünürlük desteği
  root.setAttribute('tabindex', '0');
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1); }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else auto();
  });

  // Basit dokunma sürükleme
  let startX = 0; let dx = 0; let dragging = false;
  root.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; dragging = true; stop(); }, { passive: true });
  root.addEventListener('touchmove', (e) => { if (!dragging) return; dx = e.touches[0].clientX - startX; }, { passive: true });
  root.addEventListener('touchend', () => {
    if (!dragging) return; dragging = false;
    if (Math.abs(dx) > 40) { if (dx > 0) goTo(index - 1); else goTo(index + 1); }
    dx = 0; auto();
  });
}

// Accordion
function setupAccordion() {
  const details = $$('[data-accordion] details');
  if (!details.length) return;
  details.forEach((d) => {
    d.addEventListener('toggle', () => {
      if (d.open) details.filter((x) => x !== d).forEach((x) => x.removeAttribute('open'));
    });
  });
}

// Form
function setupForm() {
  const form = $('#form-kayit');
  if (!form) return;
  const msg = $('.form-msg', form);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const validName = (data.ad || '').trim().length >= 2;
    const validEmail = /.+@.+\..+/.test((data.email || '').trim());
    const okKvkk = $('#kvkk', form).checked;
    if (!validName) return show('Lütfen adınızı doğru girin.');
    if (!validEmail) return show('Lütfen geçerli bir e-posta girin.');
    if (!okKvkk) return show('Devam etmek için onay gerekli.');
    show('Kaydınız alındı. E-postanızı kontrol edin.', true);
    try { localStorage.setItem('rq-pre-reg', JSON.stringify({ t: Date.now(), ...data })); } catch {}
    form.reset();
  });
  function show(text, success = false) {
    msg.textContent = text;
    msg.style.color = success ? 'var(--success)' : 'var(--muted)';
  }
}

// Scroll reveal
function revealOnScroll() {
  const targets = $$('section .feature-card, .faction, .panel, .timeline .node, .community .highlights li');
  if (!targets.length) return;
  targets.forEach((t) => t.style.opacity = '0');
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.animate([
          { opacity: 0, transform: 'translateY(12px)' },
          { opacity: 1, transform: 'translateY(0px)' },
        ], { duration: 420, easing: 'cubic-bezier(.2,.6,.2,1)', fill: 'forwards' });
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.2 });
  targets.forEach((t) => io.observe(t));
}

function updateYear() { const y = $('[data-year]'); if (y) y.textContent = String(new Date().getFullYear()); }

// İşaretçi parıltısı: öğe üzerinde konuma göre CSS değişkenleri güncelle
function setupPointerGlow() {
  const targets = $$('.feature-card, .faction, .panel, .video-placeholder');
  if (!targets.length) return;
  const setVars = (el, e) => {
    const r = el.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    el.style.setProperty('--mx', mx + 'px');
    el.style.setProperty('--my', my + 'px');
  };
  targets.forEach((el) => {
    el.addEventListener('pointermove', (e) => setVars(el, e));
    el.addEventListener('pointerleave', () => { el.style.removeProperty('--mx'); el.style.removeProperty('--my'); });
  });
}

