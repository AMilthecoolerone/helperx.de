(function () {
  function fadeInBody() {
    document.body.style.opacity = "0";
    document.body.style.transition = "opacity 0.8s ease-out";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.body.style.opacity = "1";
      });
    });
  }

  function initNav() {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.nav-links');
    if (!toggle || !nav) return;

    const setClosed = () => {
      toggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('show');
    };

    const toggleNav = (e) => {
      e.stopPropagation();
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      nav.classList.toggle('show');
    };

    toggle.addEventListener('click', toggleNav);

    // Close when clicking/tapping outside
    document.addEventListener('pointerdown', (e) => {
      if (!nav.classList.contains('show')) return;
      if (toggle.contains(e.target) || nav.contains(e.target)) return;
      setClosed();
    });

    // Ensure nav is closed when resizing to desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        setClosed();
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setClosed();
    });
  }

  function init() {
    fadeInBody();
    initNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();