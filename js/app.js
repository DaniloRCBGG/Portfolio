// Comportamentos comuns a todas as rotas.
(() => {
  const root = document.documentElement;
  root.classList.add('js');

  // Transição entre páginas: o Chrome cancela a animação quando a navegação muda no meio; não é erro
  const quiet = (vt) => { if (!vt) return; ['ready', 'finished', 'updateCallbackDone'].forEach((k) => vt[k]?.catch(() => {})); };
  window.addEventListener('pageswap', (e) => quiet(e.viewTransition));
  window.addEventListener('pagereveal', (e) => quiet(e.viewTransition));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.PORTFOLIO.reduceMotion = reduceMotion;

  // Tema: a escolha fica no navegador; sem escolha, segue o sistema
  const themeBtn = document.getElementById('theme-toggle');
  const paintThemeBtn = () => {
    if (!themeBtn) return;
    const dark = root.getAttribute('data-bs-theme') === 'dark';
    themeBtn.innerHTML = dark ? '<i class="bi bi-sun" aria-hidden="true"></i>' : '<i class="bi bi-moon-stars" aria-hidden="true"></i>';
    themeBtn.setAttribute('aria-label', dark ? 'Usar tema claro' : 'Usar tema escuro');
    themeBtn.setAttribute('title', dark ? 'Tema claro' : 'Tema escuro');
  };
  paintThemeBtn();
  themeBtn?.addEventListener('click', () => {
    const next = root.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-bs-theme', next);
    try { localStorage.setItem('tema', next); } catch (e) { /* sem armazenamento: vale só nesta visita */ }
    paintThemeBtn();
    document.dispatchEvent(new CustomEvent('themechange', { detail: next }));
  });

  // Avisos curtos (Bootstrap Toast)
  const toastEl = document.getElementById('app-toast');
  const toast = toastEl && window.bootstrap ? bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 2200 }) : null;
  window.PORTFOLIO.notify = (msg) => {
    if (!toast) return;
    toastEl.querySelector('.toast-body').textContent = msg;
    toast.show();
  };

  // Copiar email e link do portfólio
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const text = btn.dataset.copy;
      const ok = () => window.PORTFOLIO.notify(`Copiado: ${text}`);
      const fail = () => window.PORTFOLIO.notify(`Copie manualmente: ${text}`);
      try { navigator.clipboard.writeText(text).then(ok, fail); } catch (e) { fail(); }
    });
  });

  // Tooltips do Bootstrap
  if (window.bootstrap) {
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => bootstrap.Tooltip.getOrCreateInstance(el));
  }

  // Contadores que sobem quando entram na tela
  const runCounter = (el) => {
    const end = parseFloat(el.dataset.count);
    const decimals = (el.dataset.count.split('.')[1] || '').length;
    const fmt = (v) => v.toFixed(decimals).replace('.', ',');
    if (reduceMotion) { el.textContent = fmt(end); return; }
    const t0 = performance.now();
    const dur = 1100;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      el.textContent = fmt(end * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  // Revelar ao rolar: só some o que ainda está abaixo da dobra
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.remove('is-pending');
      e.target.querySelectorAll('[data-count]').forEach(runCounter);
      if (e.target.matches('[data-count]')) runCounter(e.target);
      document.dispatchEvent(new CustomEvent('revealed', { detail: e.target }));
      io.unobserve(e.target);
    });
  }, { threshold: 0.15 }) : null;
  window.PORTFOLIO.observeReveal = (el) => {
    // Com GSAP carregado, a entrada em sequência fica com o motion.js
    if (window.PORTFOLIO.revealWith && !reduceMotion) {
      window.PORTFOLIO.revealWith(el, () => {
        el.querySelectorAll('[data-count]').forEach(runCounter);
        document.dispatchEvent(new CustomEvent('revealed', { detail: el }));
      });
      return;
    }
    if (!io || reduceMotion) { el.querySelectorAll('[data-count]').forEach(runCounter); document.dispatchEvent(new CustomEvent('revealed', { detail: el })); return; }
    if (el.getBoundingClientRect().top > window.innerHeight) el.classList.add('is-pending');
    io.observe(el);
  };
  document.querySelectorAll('.reveal').forEach((el) => window.PORTFOLIO.observeReveal(el));

  // Imagens dos projetos: o espaço some enquanto o arquivo não existe; o clique abre a galeria
  const modalEl = document.getElementById('shot-modal');
  document.querySelectorAll('.shots').forEach((box) => {
    const refresh = () => { box.hidden = box.querySelectorAll('.shot').length === 0; };
    box.querySelectorAll('.shot').forEach((btn) => {
      const img = btn.querySelector('img');
      const drop = () => { btn.remove(); refresh(); };
      if (img.complete && img.naturalWidth === 0) drop();
      img.addEventListener('error', drop);
      // A imagem é lazy: confere logo se o arquivo existe, para o espaço vazio não aparecer e sumir depois
      const probe = new Image();
      probe.onerror = drop;
      probe.src = img.getAttribute('src');
      btn.addEventListener('click', () => {
        if (!modalEl || !window.bootstrap) { window.open(img.src, '_blank', 'noopener'); return; }
        const imgs = [...box.querySelectorAll('.shot img')];
        const inner = modalEl.querySelector('.carousel-inner');
        inner.innerHTML = imgs.map((im, i) => `
          <div class="carousel-item${im === img ? ' active' : ''}">
            <img src="${im.getAttribute('src')}" class="d-block w-100 rounded-3" alt="${im.alt}">
            <p class="mt-2 mb-0 text-center text-muted-2">${im.alt} · ${i + 1} de ${imgs.length}</p>
          </div>`).join('');
        modalEl.querySelectorAll('.carousel-control-prev, .carousel-control-next').forEach((c) => { c.hidden = imgs.length < 2; });
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
      });
    });
    refresh();
  });
})();
