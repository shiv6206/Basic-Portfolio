(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* -----------------------------------------------------------
     Theme toggle
     ----------------------------------------------------------- */
  const root = document.documentElement;
  const themeToggle = document.getElementById('theme-toggle');

  function setTheme(isLight) {
    root.classList.toggle('light', isLight);
    themeToggle.setAttribute('aria-pressed', String(isLight));
    themeToggle.setAttribute('aria-label', isLight ? 'Switch to dark theme' : 'Switch to light theme');
  }

  themeToggle.addEventListener('click', () => {
    setTheme(!root.classList.contains('light'));
  });

  /* -----------------------------------------------------------
     Scroll-aware active nav
     ----------------------------------------------------------- */
  const navLinks = Array.from(document.querySelectorAll('.primary-nav a'));
  const sections = navLinks
    .map((link) => document.getElementById(link.dataset.nav))
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const link = navLinks.find((l) => l.dataset.nav === entry.target.id);
          if (!link) return;
          navLinks.forEach((l) => l.classList.remove('is-active'));
          link.classList.add('is-active');
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );
    sections.forEach((section) => observer.observe(section));
  }

  /* -----------------------------------------------------------
     Count-up stats
     ----------------------------------------------------------- */
  const statEls = document.querySelectorAll('.stat');

  function animateStat(el) {
    const target = Number(el.dataset.countTo);
    const suffix = el.dataset.suffix || '';
    const numberEl = el.querySelector('.stat-number');

    if (prefersReducedMotion || !Number.isFinite(target)) {
      numberEl.textContent = target + suffix;
      return;
    }

    const duration = 900;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      numberEl.textContent = Math.round(target * eased) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  if ('IntersectionObserver' in window) {
    const statObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateStat(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    statEls.forEach((el) => statObserver.observe(el));
  } else {
    statEls.forEach(animateStat);
  }

  /* -----------------------------------------------------------
     Copy email
     ----------------------------------------------------------- */
  const copyBtn = document.getElementById('copy-email');
  const toast = document.getElementById('toast');
  let toastTimer = null;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2200);
  }

  copyBtn.addEventListener('click', async () => {
    const email = copyBtn.dataset.email;
    try {
      await navigator.clipboard.writeText(email);
      showToast('Email copied to clipboard');
    } catch (err) {
      showToast(email);
    }
  });

  /* -----------------------------------------------------------
     Command palette
     ----------------------------------------------------------- */
  const cmdkTrigger = document.getElementById('cmdk-trigger');
  const cmdkOverlay = document.getElementById('cmdk-overlay');
  const cmdkInput = document.getElementById('cmdk-input');
  const cmdkList = document.getElementById('cmdk-list');

  const commands = [
    { label: 'Go to About', hint: 'section', action: () => scrollToSection('about') },
    { label: 'Go to Stack', hint: 'section', action: () => scrollToSection('stack') },
    { label: 'Go to Projects', hint: 'section', action: () => scrollToSection('projects') },
    { label: 'Go to Experience', hint: 'section', action: () => scrollToSection('experience') },
    { label: 'Go to Contact', hint: 'section', action: () => scrollToSection('contact') },
    { label: 'Toggle theme', hint: 'action', action: () => themeToggle.click() },
    { label: 'Copy email address', hint: 'action', action: () => copyBtn.click() },
    { label: 'Open GitHub', hint: 'link', action: () => window.open('https://github.com/shiv6206', '_blank', 'noopener') },
  ];

  let activeIndex = 0;
  let filtered = commands;

  function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }

  function renderList() {
    cmdkList.innerHTML = '';
    filtered.forEach((cmd, i) => {
      const li = document.createElement('li');
      li.textContent = cmd.label;
      const hint = document.createElement('span');
      hint.className = 'cmdk-hint';
      hint.textContent = cmd.hint;
      li.appendChild(hint);
      if (i === activeIndex) li.classList.add('is-active');
      li.addEventListener('mouseenter', () => { activeIndex = i; renderList(); });
      li.addEventListener('click', () => runActive());
      cmdkList.appendChild(li);
    });
  }

  function runActive() {
    const cmd = filtered[activeIndex];
    if (cmd) cmd.action();
    closePalette();
  }

  function openPalette() {
    cmdkOverlay.hidden = false;
    cmdkInput.value = '';
    filtered = commands;
    activeIndex = 0;
    renderList();
    cmdkInput.focus();
  }

  function closePalette() {
    cmdkOverlay.hidden = true;
    cmdkTrigger.focus();
  }

  cmdkTrigger.addEventListener('click', openPalette);

  cmdkOverlay.addEventListener('click', (e) => {
    if (e.target === cmdkOverlay) closePalette();
  });

  cmdkInput.addEventListener('input', () => {
    const q = cmdkInput.value.trim().toLowerCase();
    filtered = commands.filter((c) => c.label.toLowerCase().includes(q));
    activeIndex = 0;
    renderList();
  });

  cmdkInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, filtered.length - 1);
      renderList();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      renderList();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runActive();
    } else if (e.key === 'Escape') {
      closePalette();
    }
  });

  document.addEventListener('keydown', (e) => {
    const isMod = e.metaKey || e.ctrlKey;
    if (isMod && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (cmdkOverlay.hidden) openPalette();
      else closePalette();
    }
  });
})();
