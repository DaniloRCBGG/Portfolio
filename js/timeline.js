// Linha do tempo como árvore de commits (estilo GitLens): a main segue reta e cada ramo sai para cima ou
// para baixo, com sub-ramos, e volta num merge. Cada seção é um commit com hash curto. A cor do progresso
// corre pelo próprio ramo e um símbolo de ramo marca onde a pessoa está. No celular fica recolhida.
(() => {
  const P = window.PORTFOLIO;
  const host = document.getElementById('tl-wrap');
  if (!host) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DWELL = 7000;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const LANE = { '-2': 14, '-1': 28, '0': 43, '1': 58 };
  const H = 74;
  const B = P.branches;

  const hash = (s) => {
    let h = 0x811c9dc5;
    for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0').slice(0, 7);
  };
  const flat = [];
  P.routes.forEach((r) => r.chapters.forEach((c) => {
    const branch = c.branch || r.branch;
    flat.push({ ...c, route: r, branch, color: B[branch].color, lane: B[branch].lane, sha: hash(`${r.id}/${c.id}`) });
  }));
  const total = flat.length;
  const onPage = (c) => !!document.getElementById(c.id);

  // Trechos de cada ramo: os commits dele e dos sub-ramos (o pai continua enquanto o filho existe)
  const lineage = (b) => { const out = []; for (let x = b; x && x !== 'main'; x = B[x].parent) out.push(x); return out; };
  const runs = [];
  Object.keys(B).filter((b) => b !== 'main').forEach((b) => {
    let cur = null;
    flat.forEach((c, i) => {
      if (lineage(c.branch).includes(b)) {
        if (cur && cur.to === i - 1) cur.to = i; else runs.push(cur = { branch: b, from: i, to: i });
      }
    });
  });

  // Elementos
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('class', 'tl-graph');
  svg.setAttribute('aria-hidden', 'true');
  host.appendChild(svg);
  const ticks = flat.map((c, g) => {
    const a = document.createElement('a');
    a.className = 'tl-tick';
    a.href = `#${c.id}`;
    a.style.setProperty('--c', c.color);
    a.setAttribute('aria-label', `Commit ${c.sha}: ${c.label} (${c.branch})`);
    a.dataset.bsToggle = 'tooltip';
    a.dataset.bsTitle = `${c.sha} · ${c.label} · ${c.branch}`;
    a.innerHTML = `<span class="tl-sha" aria-hidden="true">${c.sha}</span>`;
    a.addEventListener('click', (ev) => { if (onPage(c)) { ev.preventDefault(); goTo(g, true); } else stopTour(); });
    host.appendChild(a);
    return a;
  });
  if (window.bootstrap) ticks.forEach((t) => bootstrap.Tooltip.getOrCreateInstance(t));
  const head = document.createElement('div');
  head.className = 'tl-headmark';
  head.setAttribute('aria-hidden', 'true');
  head.innerHTML = '<svg viewBox="0 0 16 16"><circle cx="4.5" cy="3.2" r="1.7"/><circle cx="4.5" cy="12.8" r="1.7"/><circle cx="11.5" cy="5.2" r="1.7"/><path d="M4.5 4.9v6.2M11.5 6.9c0 2.6-7 1.7-7 4.2"/></svg>';
  host.appendChild(head);

  let X = [], W = 0;
  const yOf = (lane) => LANE[String(lane)];
  const layout = () => {
    W = Math.max(host.clientWidth, 560);
    const padL = 26, padR = 42;
    const step = (W - padL - padR) / (total - 1);
    X = flat.map((_, i) => padL + i * step);
    ticks.forEach((t, i) => { t.style.left = `${X[i]}px`; t.style.top = `${yOf(flat[i].lane)}px`; });
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W);
    let base = '', prog = '', marks = '';
    // A main segue reta de ponta a ponta
    const mainD = `M4 ${yOf(0)} H${W - 4}`;
    base += `<path class="tl-lane" style="stroke:${B.main.color}" d="${mainD}"/>`;
    prog += `<path class="tl-lane is-prog" style="stroke:${B.main.color}" d="${mainD}"/>`;
    runs.forEach((r, n) => {
      const b = B[r.branch];
      const parentY = yOf(B[b.parent].lane);
      const y = yOf(b.lane);
      const x0 = X[r.from], x1 = X[r.to];
      const fx = x0 - step * 0.45, mx = x1 + step * 0.45, k = step * 0.3;
      const d = `M${fx} ${parentY} C${fx + k * 0.6} ${parentY} ${x0 - k * 0.9} ${y} ${x0 - k * 0.4} ${y} H${x1 + k * 0.4} C${x1 + k * 0.9} ${y} ${mx - k * 0.6} ${parentY} ${mx} ${parentY}`;
      base += `<path class="tl-lane" style="stroke:${b.color}" d="${d}"/>`;
      prog += `<path class="tl-lane is-prog" style="stroke:${b.color}" d="${d}"/>`;
      // Nome do ramo junto ao início dele, para fora da main (uma vez por ramo)
      const ly = b.lane < 0 ? y - 8 : y + 14;
      // Nomes no fim do grafo encostam na borda direita em vez de sair dela
      const lx = Math.min(x0 - k * 0.2, W - 4 - r.branch.length * 5.3);
      if (runs.findIndex((o) => o.branch === r.branch) === n) marks += `<text class="tl-branch" x="${lx}" y="${ly}" style="fill:${b.color}">${r.branch}</text>`;
      // Símbolo de merge no fim do ramo
      marks += `<g class="tl-merge" transform="translate(${mx} ${parentY})"><title>merge ${r.branch} → ${b.parent}</title><circle r="6.2" style="stroke:${b.color}"/><path d="M-2.8 -2.8 L0 0 L-2.8 2.8 M0 0 H3" style="stroke:${b.color}"/></g>`;
    });
    marks += `<text class="tl-branch" x="6" y="${yOf(0) + 14}" style="fill:${B.main.color}">main</text>`;
    svg.innerHTML = `<defs><clipPath id="tl-clip"><rect id="tl-clip-rect" x="0" y="0" width="0" height="${H}"/></clipPath></defs><g class="tl-base">${base}</g><g clip-path="url(#tl-clip)">${prog}</g>${marks}`;
  };

  const statusNum = document.getElementById('tl-num');
  const statusName = document.getElementById('tl-name');
  const dwellBar = document.querySelector('.tl-dwell i');
  const playBtn = document.getElementById('tl-play');
  const prevBtn = document.getElementById('tl-prev');
  const nextBtn = document.getElementById('tl-next');
  const navLinks = [...document.querySelectorAll('.site-nav .nav-link[data-route]')];
  const scroller = document.getElementById('tl-scroll');
  const chipsBox = document.getElementById('tl-chips');

  const local = flat.map((f, g) => ({ ...f, g })).filter(onPage);
  const localEls = local.map((f) => document.getElementById(f.id));
  let current = local.length ? local[0].g : 0;

  const measure = () => {
    if (!local.length) return { g: 0, f: 0 };
    const y = window.scrollY + window.innerHeight * 0.35;
    const tops = localEls.map((el) => {
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

  let lastRoute = '';
  const paint = () => {
    if (!X.length) return;
    const { g, f } = measure();
    current = g;
    const c = flat[g];
    const n = flat[Math.min(total - 1, g + 1)];
    const x = X[g] + ((X[Math.min(total - 1, g + 1)] - X[g]) * f);
    const y = yOf(c.lane) + (yOf(n.lane) - yOf(c.lane)) * Math.max(0, (f - 0.6) / 0.4);
    head.style.transform = `translate(${x}px, ${y}px)`;
    head.style.setProperty('--c', c.color);
    const rect = svg.querySelector('#tl-clip-rect');
    if (rect) rect.setAttribute('width', String(x));
    ticks.forEach((t, i) => {
      t.classList.toggle('done', i < g);
      if (i === g) t.setAttribute('aria-current', 'step'); else t.removeAttribute('aria-current');
    });
    if (c.route.id !== lastRoute) {
      lastRoute = c.route.id;
      navLinks.forEach((l) => { if (l.dataset.route === lastRoute) l.setAttribute('aria-current', 'location'); else l.removeAttribute('aria-current'); });
    }
    statusNum.innerHTML = `<span class="tl-ref" style="--c:${c.color}">HEAD → ${c.branch}</span> <span class="tl-sha-now">${c.sha}</span>`;
    statusName.textContent = c.label;
    prevBtn.disabled = g === 0;
    nextBtn.disabled = g === total - 1;
    chipsBox?.querySelectorAll('button').forEach((b) => b.classList.toggle('is-on', b.dataset.branch === c.branch));
    // No celular, o grafo rola de lado para manter o HEAD à vista
    if (scroller && scroller.scrollWidth > scroller.clientWidth + 4 && !scrollerTouched) {
      scroller.scrollLeft = Math.max(0, x - scroller.clientWidth / 2);
    }
  };

  // Chips para escolher qual ramo ver (úteis quando o grafo não cabe na tela)
  let scrollerTouched = false;
  if (chipsBox) {
    chipsBox.innerHTML = Object.entries(B).map(([name, b]) => `<button type="button" data-branch="${name}" style="--c:${b.color}">${name}</button>`).join('');
    chipsBox.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      const i = flat.findIndex((c) => c.branch === b.dataset.branch);
      scrollerTouched = true;
      scroller.scrollTo({ left: Math.max(0, X[i] - 30), behavior: reduceMotion ? 'auto' : 'smooth' });
    }));
    scroller?.addEventListener('pointerdown', () => { scrollerTouched = true; });
  }

  let raf = 0;
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; paint(); }); };
  window.addEventListener('scroll', () => { scrollerTouched = false; schedule(); }, { passive: true });
  const relayout = () => { layout(); paint(); };
  window.addEventListener('resize', relayout);
  window.addEventListener('load', relayout);
  new ResizeObserver(relayout).observe(host);
  relayout();

  // Mostrar ou esconder a linha do tempo (recolhida por padrão no celular)
  const bar = document.getElementById('timeline');
  const toggle = document.getElementById('tl-toggle');
  const setOpen = (open, save) => {
    bar.hidden = !open;
    toggle?.setAttribute('aria-expanded', String(open));
    document.documentElement.style.setProperty('--timeline-h', open ? `${bar.offsetHeight || 64}px` : '0px');
    if (save) { try { localStorage.setItem('linha-do-tempo', open ? '1' : '0'); } catch (e) { /* só nesta visita */ } }
    if (open) relayout();
    window.ScrollTrigger?.refresh();
  };
  let saved = null;
  try { saved = localStorage.getItem('linha-do-tempo'); } catch (e) { saved = null; }
  setOpen(saved ? saved === '1' : window.matchMedia('(min-width: 768px)').matches, false);
  toggle?.addEventListener('click', () => setOpen(bar.hidden, true));

  function goTo(g, fromUser) {
    if (g < 0 || g >= total) return;
    if (fromUser) stopTour();
    const c = flat[g];
    const el = document.getElementById(c.id);
    if (el) {
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
  let timer = 0, started = 0, dwellRaf = 0;
  const setPlayIcon = (on) => {
    playBtn.innerHTML = on ? '<i class="bi bi-pause-fill" aria-hidden="true"></i>' : '<i class="bi bi-play-fill" aria-hidden="true"></i>';
    playBtn.setAttribute('aria-label', on ? 'Pausar o tour' : 'Iniciar o tour');
    playBtn.setAttribute('aria-pressed', String(on));
  };
  const animateDwell = () => {
    dwellBar.style.width = `${Math.min(1, (performance.now() - started) / DWELL) * 100}%`;
    if (timer) dwellRaf = requestAnimationFrame(animateDwell);
  };
  const step = () => {
    if (current >= total - 1) { stopTour(); P.notify?.('Fim do tour. Obrigado pela visita!'); return; }
    goTo(current + 1, false);
    startDwell();
  };
  function startDwell() {
    clearTimeout(timer);
    started = performance.now();
    timer = setTimeout(step, DWELL);
    cancelAnimationFrame(dwellRaf);
    dwellRaf = requestAnimationFrame(animateDwell);
  }
  function startTour() { setPlayIcon(true); startDwell(); }
  function stopTour() {
    clearTimeout(timer); timer = 0;
    cancelAnimationFrame(dwellRaf);
    dwellBar.style.width = '0';
    setPlayIcon(false);
  }
  P.startTour = () => { if (current !== 0) goTo(0, false); startTour(); };
  playBtn.addEventListener('click', () => (timer ? stopTour() : startTour()));
  setPlayIcon(false);
  const userTakesOver = () => { if (timer) stopTour(); };
  window.addEventListener('wheel', userTakesOver, { passive: true });
  window.addEventListener('touchmove', userTakesOver, { passive: true });
  window.addEventListener('keydown', (e) => { if (timer && !(e.target.closest && e.target.closest('.timeline'))) userTakesOver(); });
})();
