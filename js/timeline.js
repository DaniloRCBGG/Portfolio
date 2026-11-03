// Linha do tempo no estilo do grafo de commits do GitLens: cada rota é um ramo colorido que sai da linha
// principal e volta a ela; cada seção é um commit com um hash curto. O HEAD acompanha a rolagem e o play
// percorre os commits atravessando as páginas.
(() => {
  const P = window.PORTFOLIO;
  const track = document.getElementById('tl-track');
  if (!track) return;
  // Com tudo numa página só, a rota atual é a do capítulo em que a rolagem está
  let routeId = document.body.dataset.route;
  const onPage = (c) => !!document.getElementById(c.id);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DWELL = 7000;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const MAIN_Y = 38, LANE_Y = 22;

  // Hash curto e estável a partir do id da seção (FNV-1a)
  const hash = (s) => {
    let h = 0x811c9dc5;
    for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0').slice(0, 7);
  };

  const flat = [];
  P.routes.forEach((r) => r.chapters.forEach((c, ci) => flat.push({ ...c, route: r, ci, sha: hash(`${r.id}/${c.id}`) })));
  const total = flat.length;
  const pad = (n) => String(n).padStart(2, '0');
  const wrap = track.parentElement;

  // Ramos e commits
  const ticks = [];
  const segs = [];
  P.routes.forEach((r) => {
    const seg = document.createElement('div');
    seg.className = 'tl-seg' + (r.id === routeId ? ' is-current' : '');
    seg.style.flex = String(r.chapters.length);
    seg.style.setProperty('--c', r.color);
    const label = document.createElement('a');
    label.className = 'tl-seg-label';
    label.href = r.page;
    label.innerHTML = `<i class="bi bi-git" aria-hidden="true"></i>${r.branch}`;
    label.tabIndex = -1;
    seg.appendChild(label);
    r.chapters.forEach((c, ci) => {
      const g = flat.findIndex((f) => f.route === r && f.ci === ci);
      const a = document.createElement('a');
      a.className = 'tl-tick';
      a.href = `${r.page}#${c.id}`;
      a.style.left = `${((ci + 0.5) / r.chapters.length) * 100}%`;
      a.setAttribute('aria-label', `Commit ${flat[g].sha}, capítulo ${g + 1} de ${total}: ${c.label} (${r.label})`);
      a.dataset.bsToggle = 'tooltip';
      a.dataset.bsTitle = `${flat[g].sha} · ${c.label} (${r.branch})`;
      a.innerHTML = `<span class="tl-sha" aria-hidden="true">${flat[g].sha}</span>`;
      a.addEventListener('click', (ev) => { if (onPage(c)) { ev.preventDefault(); goTo(g, true); } else { stopTour(); } });
      seg.appendChild(a);
      ticks[g] = a;
    });
    track.appendChild(seg);
    segs.push({ seg, r });
  });
  if (window.bootstrap) ticks.forEach((t) => bootstrap.Tooltip.getOrCreateInstance(t));

  // Desenho das linhas: principal embaixo, cada ramo sai dela e volta
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('class', 'tl-graph');
  svg.setAttribute('aria-hidden', 'true');
  wrap.insertBefore(svg, track);
  const fill = document.createElement('div');
  fill.className = 'tl-fill';
  const head = document.createElement('div');
  head.className = 'tl-head';
  wrap.append(fill, head);

  const navLinks = [...document.querySelectorAll('.site-nav .nav-link[data-route]')];
  const drawLanes = () => {
    const base = wrap.getBoundingClientRect();
    const w = base.width;
    svg.setAttribute('viewBox', `0 0 ${w} 48`);
    let d = `<path class="tl-main" d="M0 ${MAIN_Y} H${w}"/>`;
    segs.forEach(({ seg, r }) => {
      const b = seg.getBoundingClientRect();
      const x0 = b.left - base.left + 2, x1 = b.right - base.left - 2;
      const k = Math.min(14, (x1 - x0) / 4);
      d += `<path class="tl-lane${r.id === routeId ? ' is-current' : ''}" style="stroke:${r.color}" d="M${x0} ${MAIN_Y} C${x0 + k} ${MAIN_Y} ${x0 + k * 0.4} ${LANE_Y} ${x0 + k * 1.6} ${LANE_Y} H${x1 - k * 1.6} C${x1 - k * 0.4} ${LANE_Y} ${x1 - k} ${MAIN_Y} ${x1} ${MAIN_Y}"/>`;
      d += `<circle class="tl-merge" cx="${x1}" cy="${MAIN_Y}" r="3" style="fill:${r.color}"/>`;
    });
    svg.innerHTML = d;
  };

  const statusNum = document.getElementById('tl-num');
  const statusName = document.getElementById('tl-name');
  const dwellBar = document.querySelector('.tl-dwell i');
  const playBtn = document.getElementById('tl-play');
  const prevBtn = document.getElementById('tl-prev');
  const nextBtn = document.getElementById('tl-next');

  // Capítulos desta página e posição de rolagem
  const local = flat.map((f, g) => ({ ...f, g })).filter((f) => onPage(f));
  const localEls = local.map((f) => document.getElementById(f.id));
  let current = local.length ? local[0].g : 0;

  const tickX = (g) => {
    const t = ticks[g];
    const base = wrap.getBoundingClientRect().left;
    const r = t.getBoundingClientRect();
    return r.left + r.width / 2 - base;
  };

  const measure = () => {
    if (!local.length) return { g: 0, f: 0 };
    const y = window.scrollY + window.innerHeight * 0.35;
    // Seções fixadas pelo ScrollTrigger ficam dentro de um .pin-spacer: mede por ele
    const tops = localEls.map((el) => {
      if (!el) return 0;
      const box = el.parentElement && el.parentElement.classList.contains('pin-spacer') ? el.parentElement : el;
      return box.getBoundingClientRect().top + window.scrollY;
    });
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
    const c = flat[g];
    head.style.left = `${x}px`;
    head.style.setProperty('--c', c.route.color);
    fill.style.width = `${x}px`;
    ticks.forEach((t, i) => {
      t.classList.toggle('done', i < g);
      if (i === g) t.setAttribute('aria-current', 'step'); else t.removeAttribute('aria-current');
    });
    // O ramo da seção atual acende, e o menu acompanha
    if (c.route.id !== routeId) {
      routeId = c.route.id;
      segs.forEach(({ seg, r }) => seg.classList.toggle('is-current', r.id === routeId));
      drawLanes();
    }
    navLinks.forEach((l) => { if (l.dataset.route === routeId) l.setAttribute('aria-current', 'location'); else l.removeAttribute('aria-current'); });
    statusNum.innerHTML = `<span class="tl-ref" style="--c:${c.route.color}">HEAD → ${c.route.branch}</span> <span class="tl-sha-now">${c.sha}</span>`;
    statusName.textContent = c.label;
    prevBtn.disabled = g === 0;
    nextBtn.disabled = g === total - 1;
  };

  let raf = 0;
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; paint(); }); };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', () => { drawLanes(); schedule(); });
  window.addEventListener('load', () => { drawLanes(); schedule(); });
  drawLanes();
  paint();

  function goTo(g, fromUser) {
    if (g < 0 || g >= total) return;
    if (fromUser) stopTour();
    const c = flat[g];
    if (onPage(c)) {
      const el = document.getElementById(c.id);
      if (!el) return;
      if (P.scrollTo) P.scrollTo(el); else el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
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
    const samePage = onPage(flat[next]);
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
