// Linha do tempo no estilo do tour do Google Earth: cada rota é um trecho, cada capítulo um ponto.
// O marcador acompanha a rolagem; o play percorre os capítulos e atravessa as páginas sozinho.
(() => {
  const P = window.PORTFOLIO;
  const track = document.getElementById('tl-track');
  if (!track) return;
  const routeId = document.body.dataset.route;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DWELL = 7000;

  const flat = [];
  P.routes.forEach((r) => r.chapters.forEach((c, ci) => flat.push({ ...c, route: r, ci })));
  const total = flat.length;
  const pad = (n) => String(n).padStart(2, '0');

  // Trechos e pontos
  const ticks = [];
  P.routes.forEach((r) => {
    const seg = document.createElement('div');
    seg.className = 'tl-seg' + (r.id === routeId ? ' is-current' : '');
    seg.style.flex = String(r.chapters.length);
    const label = document.createElement('a');
    label.className = 'tl-seg-label';
    label.href = r.page;
    label.textContent = r.label;
    label.tabIndex = -1;
    seg.appendChild(label);
    r.chapters.forEach((c, ci) => {
      const g = flat.findIndex((f) => f.route === r && f.ci === ci);
      const a = document.createElement('a');
      a.className = 'tl-tick';
      a.href = `${r.page}#${c.id}`;
      a.style.left = `${((ci + 0.5) / r.chapters.length) * 100}%`;
      a.setAttribute('aria-label', `Capítulo ${g + 1} de ${total}: ${c.label} (${r.label})`);
      a.dataset.bsToggle = 'tooltip';
      a.dataset.bsTitle = `${r.label} · ${c.label}`;
      a.addEventListener('click', (ev) => { if (r.id === routeId) { ev.preventDefault(); goTo(g, true); } else { stopTour(); } });
      seg.appendChild(a);
      ticks[g] = a;
    });
    track.appendChild(seg);
  });
  if (window.bootstrap) ticks.forEach((t) => bootstrap.Tooltip.getOrCreateInstance(t));

  const fill = document.createElement('div');
  fill.className = 'tl-fill';
  const head = document.createElement('div');
  head.className = 'tl-head';
  track.parentElement.append(fill, head);

  const statusNum = document.getElementById('tl-num');
  const statusName = document.getElementById('tl-name');
  const dwellBar = document.querySelector('.tl-dwell i');
  const playBtn = document.getElementById('tl-play');
  const prevBtn = document.getElementById('tl-prev');
  const nextBtn = document.getElementById('tl-next');

  // Capítulos desta página e posição de rolagem
  const local = flat.map((f, g) => ({ ...f, g })).filter((f) => f.route.id === routeId);
  const localEls = local.map((f) => document.getElementById(f.id));
  let current = local.length ? local[0].g : 0;

  const tickX = (g) => {
    const t = ticks[g];
    const base = track.parentElement.getBoundingClientRect().left;
    const r = t.getBoundingClientRect();
    return r.left + r.width / 2 - base;
  };

  const measure = () => {
    if (!local.length) return { g: 0, f: 0 };
    const y = window.scrollY + window.innerHeight * 0.35;
    const tops = localEls.map((el) => (el ? el.getBoundingClientRect().top + window.scrollY : 0));
    const end = document.documentElement.scrollHeight;
    let i = 0;
    for (let k = 0; k < tops.length; k++) if (y >= tops[k]) i = k;
    const next = i + 1 < tops.length ? tops[i + 1] : end;
    const atBottom = window.scrollY + window.innerHeight >= end - 4;
    if (atBottom) i = tops.length - 1;
    const f = atBottom ? 0 : Math.max(0, Math.min(0.99, (y - tops[i]) / Math.max(1, next - tops[i])));
    return { g: local[i].g, f: i + 1 < tops.length ? f : 0 };
  };

  const paint = () => {
    const { g, f } = measure();
    current = g;
    const x0 = tickX(g);
    const x1 = g + 1 < total ? tickX(g + 1) : x0;
    const x = x0 + (x1 - x0) * f;
    head.style.left = `${x}px`;
    fill.style.width = `${x}px`;
    ticks.forEach((t, i) => {
      t.classList.toggle('done', i < g);
      if (i === g) t.setAttribute('aria-current', 'step'); else t.removeAttribute('aria-current');
    });
    const c = flat[g];
    statusNum.textContent = `${pad(g + 1)} / ${pad(total)} · ${c.route.label}`;
    statusName.textContent = c.label;
    prevBtn.disabled = g === 0;
    nextBtn.disabled = g === total - 1;
  };

  let raf = 0;
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; paint(); }); };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('load', schedule);
  paint();

  function goTo(g, fromUser) {
    if (g < 0 || g >= total) return;
    if (fromUser) stopTour();
    const c = flat[g];
    if (c.route.id === routeId) {
      const el = document.getElementById(c.id);
      if (!el) return;
      el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', `#${c.id}`);
      current = g;
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
    } else {
      location.href = `${c.route.page}#${c.id}`;
    }
  }
  prevBtn.addEventListener('click', () => goTo(current - 1, true));
  nextBtn.addEventListener('click', () => goTo(current + 1, true));

  // Tour automático
  let timer = 0;
  let started = 0;
  let dwellRaf = 0;
  const setPlayIcon = (on) => {
    playBtn.innerHTML = on ? '<i class="bi bi-pause-fill" aria-hidden="true"></i>' : '<i class="bi bi-play-fill" aria-hidden="true"></i>';
    playBtn.setAttribute('aria-label', on ? 'Pausar o tour' : 'Iniciar o tour pelas rotas');
    playBtn.setAttribute('aria-pressed', String(on));
  };
  const animateDwell = () => {
    const k = Math.min(1, (performance.now() - started) / DWELL);
    dwellBar.style.width = `${k * 100}%`;
    if (timer) dwellRaf = requestAnimationFrame(animateDwell);
  };
  const step = () => {
    if (current >= total - 1) { stopTour(); window.PORTFOLIO.notify?.('Fim do tour. Obrigado pela visita!'); return; }
    const next = current + 1;
    const samePage = flat[next].route.id === routeId;
    goTo(next, false);
    // Em outra página, o tour continua sozinho quando ela abrir
    if (samePage) startDwell();
  };
  function startDwell() {
    clearTimeout(timer);
    started = performance.now();
    timer = setTimeout(step, DWELL);
    cancelAnimationFrame(dwellRaf);
    dwellRaf = requestAnimationFrame(animateDwell);
  }
  function startTour() {
    try { sessionStorage.setItem('tour', '1'); } catch (e) { /* segue só nesta página */ }
    setPlayIcon(true);
    startDwell();
  }
  function stopTour() {
    clearTimeout(timer);
    timer = 0;
    cancelAnimationFrame(dwellRaf);
    dwellBar.style.width = '0';
    try { sessionStorage.removeItem('tour'); } catch (e) { /* nada a limpar */ }
    setPlayIcon(false);
  }
  window.PORTFOLIO.startTour = () => { if (local.length && current !== local[0].g) goTo(local[0].g, false); startTour(); };
  playBtn.addEventListener('click', () => (timer ? stopTour() : startTour()));
  setPlayIcon(false);

  // O tour para quando a pessoa assume o controle
  const userTakesOver = () => { if (timer) stopTour(); };
  window.addEventListener('wheel', userTakesOver, { passive: true });
  window.addEventListener('touchmove', userTakesOver, { passive: true });
  window.addEventListener('keydown', (e) => {
    if (!timer) return;
    if (e.target.closest && e.target.closest('.timeline')) return;
    userTakesOver();
  });

  let resume = false;
  try { resume = sessionStorage.getItem('tour') === '1'; } catch (e) { resume = false; }
  if (resume) startTour();
})();
