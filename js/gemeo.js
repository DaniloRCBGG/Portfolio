// Mini Gêmeo: a malha viária de Niterói (OpenStreetMap, a mesma do city-roads) desenhada em canvas,
// com ônibus simulados andando sobre as ruas reais. A cada ciclo o estado de cada ônibus é recalculado
// com a mesma regra do Gêmeo (Bus.getStatus) e os mesmos limiares.
(() => {
  const wrap = document.getElementById('gdn-mini');
  if (!wrap) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Feed de posições: não há API pública da MobNit acessível; com uma URL, basta adaptar toBuses()
  const MOBNIT_URL = null;
  const AREA = 3602220789; // Niterói no OpenStreetMap, a mesma área do city-roads
  const OVERPASS = 'https://overpass-api.de/api/interpreter';
  const ALERT_R = 150, JAM_D = 12, RAIN_T = 6.2, CYCLE = 3000, SPEEDUP = 8;
  const CENTER = [-43.1065, -22.9045]; // [lng, lat] entre o Centro e Icaraí
  const STATE = {
    normal: { hex: '#00a6a6', text: 'circulando sem ocorrências' },
    alert: { hex: '#e8955a', text: 'perto de um alerta ou alagamento' },
    jammed: { hex: '#d64545', text: 'em trecho congestionado' },
    alert_jammed: { hex: '#8e6bd8', text: 'alerta e congestionamento juntos' },
  };
  // A mesma regra do domínio compartilhado do Gêmeo, na mesma ordem
  const getStatus = ({ isAlert, isFlooded, isJammed }) => {
    if (isAlert && isJammed) return 'alert_jammed';
    if (isAlert || isFlooded) return 'alert';
    if (isJammed) return 'jammed';
    return 'normal';
  };

  // Projeção local em metros
  const lat0 = (CENTER[1] * Math.PI) / 180;
  const KX = Math.cos(lat0) * 111320, KY = 110540;
  const toXY = (lng, lat) => [(lng - CENTER[0]) * KX, -(lat - CENTER[1]) * KY];

  // Aleatório com semente, para as rotas serem sempre as mesmas
  let seed = 20250701;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  const base = wrap.querySelector('.gdn-base');
  const fx = wrap.querySelector('.gdn-fx');
  const busLayer = wrap.querySelector('.gdn-buses');
  const pop = wrap.querySelector('.gdn-pop');
  const status = document.getElementById('gdn-mesh-status');
  const ui = {
    alert: document.getElementById('lay-alert'), jam: document.getElementById('lay-jam'), rain: document.getElementById('lay-rain'),
    rainOut: document.getElementById('lay-rain-out'), roads: document.getElementById('lay-roads'), fail: document.getElementById('lay-fail'),
    counts: document.getElementById('gdn-counts'), last: document.getElementById('gdn-last'), cycle: document.querySelector('#gdn-cycle i'),
  };
  const bctx = base.getContext('2d');
  const fctx = fx.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const view = { x: 0, y: 300, mpp: 9 }; // centro da câmera em metros e metros por pixel
  let mesh = null; // { classes: { major: Path2D, minor, path }, count, graph }
  let land = null; // contornos do IBGE em Path2D
  let routes = [], buses = [], alerts = [], jam = null, cell = null, selected = null, follow = false;
  let lastCycle = 0, running = !reduce, cycleClock = '';

  /* ---------------- Malha ---------------- */
  const classOf = (hw) => (/^(motorway|trunk|primary|secondary|tertiary)(_link)?$/.test(hw) ? 'major'
    : /^(residential|unclassified|living_street|service|road)$/.test(hw) ? 'minor' : 'path');

  // Formato compacto do repositório: inteiros (grau × 1e5) com deltas
  function fromCompact(json) {
    const ways = { major: [], minor: [], path: [] };
    for (const k of Object.keys(ways)) {
      for (const arr of json.classes[k] || []) {
        const line = [];
        let lng = 0, lat = 0;
        for (let i = 0; i < arr.length; i += 2) { lng += arr[i]; lat += arr[i + 1]; line.push(toXY(lng / 1e5, lat / 1e5)); }
        ways[k].push(line);
      }
    }
    return ways;
  }
  // Resposta da Overpass (out geom)
  function fromOverpass(json) {
    const ways = { major: [], minor: [], path: [] };
    for (const el of json.elements || []) {
      if (el.type !== 'way' || !el.geometry || !el.tags || !el.tags.highway) continue;
      ways[classOf(el.tags.highway)].push(el.geometry.map((g) => toXY(g.lon, g.lat)));
    }
    return ways;
  }
  // Para guardar no navegador no mesmo formato compacto do repositório
  function toCompactFromOverpass(json) {
    const classes = { major: [], minor: [], path: [] };
    for (const el of json.elements || []) {
      if (el.type !== 'way' || !el.geometry || !el.tags || !el.tags.highway) continue;
      const out = [];
      let pl = 0, pa = 0;
      for (const g of el.geometry) { const l = Math.round(g.lon * 1e5), a = Math.round(g.lat * 1e5); out.push(l - pl, a - pa); pl = l; pa = a; }
      classes[classOf(el.tags.highway)].push(out);
    }
    return { classes };
  }

  const idb = {
    open: () => new Promise((res, rej) => { const r = indexedDB.open('portfolio-danilo', 1); r.onupgradeneeded = () => r.result.createObjectStore('cache'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }),
    get: async (k) => { const db = await idb.open(); return new Promise((res) => { const t = db.transaction('cache').objectStore('cache').get(k); t.onsuccess = () => res(t.result); t.onerror = () => res(null); }); },
    set: async (k, v) => { const db = await idb.open(); return new Promise((res) => { const t = db.transaction('cache', 'readwrite').objectStore('cache').put(v, k); t.onsuccess = () => res(true); t.onerror = () => res(false); }); },
  };

  async function loadMesh() {
    const say = (t) => { status.textContent = t; };
    // 1. Arquivo gerado pelo workflow do repositório
    try {
      say('Carregando a malha viária…');
      const r = await fetch('data/niteroi-ruas.json', { cache: 'force-cache' });
      if (r.ok) return { ways: fromCompact(await r.json()), from: 'OpenStreetMap (arquivo do repositório)' };
    } catch (e) { /* segue para o próximo */ }
    // 2. Cache do navegador de uma visita anterior
    try {
      const c = await idb.get('malha-niteroi');
      if (c) return { ways: fromCompact(c), from: 'OpenStreetMap (guardada no navegador)' };
    } catch (e) { /* sem IndexedDB */ }
    // 3. Overpass ao vivo, como o city-roads faz
    try {
      say('Baixando a malha viária de Niterói do OpenStreetMap (pode levar alguns segundos)…');
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 70000);
      const q = `[out:json][timeout:90];area(${AREA})->.a;way["highway"](area.a);out geom qt;`;
      const r = await fetch(OVERPASS, { method: 'POST', body: `data=${encodeURIComponent(q)}`, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: ctrl.signal });
      clearTimeout(t);
      if (r.ok) {
        const json = await r.json();
        idb.set('malha-niteroi', toCompactFromOverpass(json)).catch(() => {});
        return { ways: fromOverpass(json), from: 'OpenStreetMap (Overpass, ao vivo)' };
      }
    } catch (e) { /* sem rede ou sem resposta */ }
    return null;
  }

  function buildMesh(ways) {
    const classes = {};
    let count = 0;
    for (const k of Object.keys(ways)) {
      const p = new Path2D();
      for (const line of ways[k]) { p.moveTo(line[0][0], line[0][1]); for (let i = 1; i < line.length; i++) p.lineTo(line[i][0], line[i][1]); }
      classes[k] = p;
      count += ways[k].length;
    }
    // Grafo das vias principais para montar as rotas dos ônibus
    const nodes = new Map(), pts = [], adj = [];
    const id = (p) => { const key = `${Math.round(p[0])},${Math.round(p[1])}`; let i = nodes.get(key); if (i === undefined) { i = pts.length; nodes.set(key, i); pts.push(p); adj.push([]); } return i; };
    for (const line of ways.major) for (let i = 1; i < line.length; i++) { const a = id(line[i - 1]), b = id(line[i]); if (a !== b) { adj[a].push(b); adj[b].push(a); } }
    return { classes, count, graph: { pts, adj } };
  }

  function buildLand() {
    const geo = window.NITEROI_GEO;
    if (!geo) return null;
    const out = { city: new Path2D(), others: new Path2D() };
    geo.features.forEach((f) => {
      const target = f.properties.codigo === '3303302' ? out.city : out.others;
      f.geometry.coordinates.forEach((poly) => poly.forEach((ring) => { ring.forEach(([lng, lat], i) => { const [x, y] = toXY(lng, lat); if (i) target.lineTo(x, y); else target.moveTo(x, y); }); target.closePath(); }));
    });
    return out;
  }

  /* ---------------- Rotas, ocorrências e ônibus ---------------- */
  const polyLen = (pts) => { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return cum; };
  const along = (r, d) => {
    const L = r.cum[r.cum.length - 1];
    d = Math.max(0, Math.min(L, d));
    let i = 1; while (i < r.cum.length - 1 && r.cum[i] < d) i++;
    const t = (d - r.cum[i - 1]) / Math.max(1e-6, r.cum[i] - r.cum[i - 1]);
    const a = r.pts[i - 1], b = r.pts[i];
    return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  };
  const distSeg = (p, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(p[0] - (a[0] + dx * t), p[1] - (a[1] + dy * t));
  };
  const inPoly = (p, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c; } return c; };

  // Caminhada pelas vias principais preferindo seguir reto, como uma linha de ônibus
  function walkRoute(graph, start, target) {
    const { pts, adj } = graph;
    const path = [start];
    let prev = -1, cur = start, len = 0, guard = 0;
    const seen = new Set([start]);
    while (len < target && guard++ < 4000) {
      const opts = adj[cur].filter((n) => n !== prev && !seen.has(n));
      if (!opts.length) break;
      let best = opts[0], bestScore = Infinity;
      for (const n of opts) {
        let turn = 0;
        if (prev >= 0) {
          const a1 = Math.atan2(pts[cur][1] - pts[prev][1], pts[cur][0] - pts[prev][0]);
          const a2 = Math.atan2(pts[n][1] - pts[cur][1], pts[n][0] - pts[cur][0]);
          turn = Math.abs(Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1)));
        }
        const score = turn + rnd() * 0.35;
        if (score < bestScore) { bestScore = score; best = n; }
      }
      len += Math.hypot(pts[best][0] - pts[cur][0], pts[best][1] - pts[cur][1]);
      prev = cur; cur = best; seen.add(cur); path.push(cur);
    }
    return path.map((i) => pts[i]);
  }

  function makeRoutes() {
    routes = [];
    const g = mesh && mesh.graph;
    if (g && g.pts.length > 50) {
      const near = g.pts.map((p, i) => [i, Math.hypot(p[0], p[1])]).filter(([i, d]) => d < 2600 && g.adj[i].length >= 2);
      let tries = 0;
      while (routes.length < 6 && tries++ < 80 && near.length) {
        const [start] = near[Math.floor(rnd() * near.length)];
        const pts = walkRoute(g, start, 2600 + rnd() * 1600);
        const cum = polyLen(pts);
        if (cum[cum.length - 1] > 1500) routes.push({ pts, cum, name: `Linha simulada ${routes.length + 1}` });
      }
    }
    if (!routes.length) {
      // Sem malha: trajeto ilustrativo entre o Centro e Icaraí
      const ll = [[-43.1240, -22.8955], [-43.1190, -22.8990], [-43.1150, -22.9030], [-43.1100, -22.9065], [-43.1040, -22.9080], [-43.0990, -22.9050], [-43.1040, -22.9000], [-43.1120, -22.8965], [-43.1240, -22.8955]];
      const pts = ll.map(([a, b]) => toXY(a, b));
      routes.push({ pts, cum: polyLen(pts), name: 'Linha simulada 1' });
    }
    const R = routes;
    const pick = (r, f) => { const q = along(r, r.cum[r.cum.length - 1] * f); return [q.x, q.y]; };
    alerts = [
      { p: pick(R[0], 0.45), kind: 'Acidente' },
      { p: pick(R[Math.min(2, R.length - 1)], 0.7), kind: 'Buraco na via' },
    ];
    const jr = R[Math.min(1, R.length - 1)];
    const L = jr.cum[jr.cum.length - 1];
    const jpts = [];
    for (let d = L * 0.3; d <= L * 0.3 + 260; d += 20) { const q = along(jr, d); jpts.push([q.x, q.y]); }
    jam = { pts: jpts };
    const c = pick(R[Math.min(3, R.length - 1)], 0.5);
    cell = { center: c, poly: Array.from({ length: 6 }, (_, i) => [c[0] + Math.cos((Math.PI / 3) * i + 0.3) * 650, c[1] + Math.sin((Math.PI / 3) * i + 0.3) * 650]) };
    makeBuses();
  }

  const busSvg = '<i class="bi bi-bus-front-fill" aria-hidden="true"></i>';
  function makeBuses() {
    busLayer.innerHTML = '';
    buses = [];
    const n = Math.max(8, routes.length * 2);
    for (let i = 0; i < n; i++) {
      const r = routes[i % routes.length];
      const b = { id: String(i + 1).padStart(2, '0'), r, d: (r.cum[r.cum.length - 1] / Math.ceil(n / routes.length)) * Math.floor(i / routes.length) + rnd() * 200, dir: i % 2 ? 1 : -1, status: 'normal', why: '', speed: 0, x: 0, y: 0, ang: 0 };
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'gdn-bus';
      el.setAttribute('aria-label', `Ônibus fictício ${b.id}`);
      el.innerHTML = `<span class="gdn-bus-dir" aria-hidden="true"></span><span class="gdn-bus-body">${busSvg}</span>`;
      el.addEventListener('click', (e) => { e.stopPropagation(); selected = b; follow = false; renderPop(); });
      busLayer.appendChild(el);
      b.el = el;
      buses.push(b);
    }
  }

  /* ---------------- Ciclo: estado recalculado como no BFF ---------------- */
  function cycle() {
    const tally = { normal: 0, alert: 0, jammed: 0, alert_jammed: 0 };
    const mm = parseFloat(ui.rain.value);
    buses.forEach((b) => {
      const p = [b.x, b.y];
      const near = ui.alert.checked ? alerts.map((a) => ({ a, d: Math.hypot(p[0] - a.p[0], p[1] - a.p[1]) })).sort((x, y) => x.d - y.d)[0] : null;
      const isAlert = !!near && near.d <= ALERT_R;
      let jd = Infinity;
      if (ui.jam.checked && jam) for (let i = 1; i < jam.pts.length; i++) jd = Math.min(jd, distSeg(p, jam.pts[i - 1], jam.pts[i]));
      const isJammed = jd <= JAM_D;
      const isFlooded = mm >= RAIN_T && cell && inPoly(p, cell.poly);
      b.status = getStatus({ isAlert, isFlooded, isJammed });
      b.why = [isAlert ? `a ${Math.round(near.d)} m de um alerta (${near.a.kind.toLowerCase()})` : '', isJammed ? 'em trecho abaixo de 5 km/h' : '', isFlooded ? `na área de um pluviômetro com ${mm.toFixed(1).replace('.', ',')} mm` : ''].filter(Boolean).join(' · ') || 'nenhuma ocorrência no raio';
      b.el.style.setProperty('--c', STATE[b.status].hex);
      b.el.dataset.status = b.status;
      tally[b.status]++;
    });
    cycleClock = new Date().toLocaleTimeString('pt-BR');
    ui.last.textContent = cycleClock;
    ui.counts.innerHTML = Object.keys(STATE).map((k) => `<span><i style="background:${STATE[k].hex}"></i>${k} <b>${tally[k]}</b></span>`).join('');
    if (selected) renderPop();
  }

  /* ---------------- Desenho ---------------- */
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = wrap.clientWidth; H = wrap.clientHeight;
    [base, fx].forEach((c) => { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); c.style.width = `${W}px`; c.style.height = `${H}px`; });
    drawBase();
  }
  const worldToScreen = (x, y) => [(x - view.x) / view.mpp + W / 2, (y - view.y) / view.mpp + H / 2];
  function setWorld(ctx) { ctx.setTransform(dpr / view.mpp, 0, 0, dpr / view.mpp, dpr * (W / 2 - view.x / view.mpp), dpr * (H / 2 - view.y / view.mpp)); }

  function drawBase() {
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.clearRect(0, 0, base.width, base.height);
    setWorld(bctx);
    if (land) {
      bctx.fillStyle = 'rgba(22, 39, 58, 0.55)'; bctx.fill(land.others);
      bctx.fillStyle = 'rgba(26, 46, 66, 0.9)'; bctx.fill(land.city);
      bctx.lineWidth = 1.2 * view.mpp; bctx.strokeStyle = 'rgba(0, 166, 166, 0.35)'; bctx.stroke(land.city);
    }
    if (mesh && ui.roads.checked) {
      bctx.lineCap = 'round'; bctx.lineJoin = 'round';
      bctx.lineWidth = 0.6 * view.mpp; bctx.strokeStyle = 'rgba(169, 188, 205, 0.16)'; bctx.stroke(mesh.classes.path);
      bctx.lineWidth = 0.9 * view.mpp; bctx.strokeStyle = 'rgba(190, 210, 225, 0.42)'; bctx.stroke(mesh.classes.minor);
      bctx.lineWidth = 1.8 * view.mpp; bctx.strokeStyle = 'rgba(225, 238, 245, 0.85)'; bctx.stroke(mesh.classes.major);
    }
  }

  function drawFx(t) {
    fctx.setTransform(1, 0, 0, 1, 0, 0);
    fctx.clearRect(0, 0, fx.width, fx.height);
    setWorld(fctx);
    const failed = ui.fail.checked;
    // Rotas (fica no Portal: não some na falha)
    fctx.lineWidth = 3 * view.mpp; fctx.strokeStyle = 'rgba(0, 166, 166, 0.22)';
    routes.forEach((r) => { fctx.beginPath(); r.pts.forEach((p, i) => (i ? fctx.lineTo(p[0], p[1]) : fctx.moveTo(p[0], p[1]))); fctx.stroke(); });
    // Pluviômetro e área (hospedada)
    if (cell) {
      const over = parseFloat(ui.rain.value) >= RAIN_T;
      fctx.beginPath(); cell.poly.forEach((p, i) => (i ? fctx.lineTo(p[0], p[1]) : fctx.moveTo(p[0], p[1]))); fctx.closePath();
      fctx.fillStyle = over ? 'rgba(91, 143, 214, 0.28)' : 'rgba(91, 143, 214, 0.08)'; fctx.fill();
      fctx.lineWidth = 1.5 * view.mpp; fctx.strokeStyle = over ? 'rgba(232, 149, 90, 0.8)' : 'rgba(91, 143, 214, 0.6)'; fctx.stroke();
      fctx.fillStyle = '#5b8fd6'; fctx.beginPath(); fctx.arc(cell.center[0], cell.center[1], 5 * view.mpp, 0, Math.PI * 2); fctx.fill();
    }
    if (!failed) {
      // Lentidão
      if (ui.jam.checked && jam) {
        fctx.lineWidth = 7 * view.mpp; fctx.strokeStyle = 'rgba(214, 69, 69, 0.85)'; fctx.lineCap = 'round';
        fctx.beginPath(); jam.pts.forEach((p, i) => (i ? fctx.lineTo(p[0], p[1]) : fctx.moveTo(p[0], p[1]))); fctx.stroke();
      }
      // Alertas com pulso de 150 m
      if (ui.alert.checked) alerts.forEach((a, i) => {
        const k = reduce ? 0.5 : ((t / 1600 + i * 0.5) % 1);
        fctx.beginPath(); fctx.arc(a.p[0], a.p[1], ALERT_R, 0, Math.PI * 2);
        fctx.fillStyle = 'rgba(232, 149, 90, 0.12)'; fctx.fill();
        fctx.lineWidth = 1.5 * view.mpp; fctx.strokeStyle = 'rgba(232, 149, 90, 0.8)'; fctx.stroke();
        fctx.beginPath(); fctx.arc(a.p[0], a.p[1], ALERT_R * k, 0, Math.PI * 2);
        fctx.strokeStyle = `rgba(232, 149, 90, ${0.7 * (1 - k)})`; fctx.stroke();
        fctx.fillStyle = '#c25e2a'; fctx.beginPath(); fctx.arc(a.p[0], a.p[1], 6 * view.mpp, 0, Math.PI * 2); fctx.fill();
      });
    }
  }

  function placeBuses() {
    const failed = ui.fail.checked;
    busLayer.hidden = failed;
    if (failed) { pop.hidden = true; return; }
    buses.forEach((b) => {
      const [sx, sy] = worldToScreen(b.x, b.y);
      b.el.style.transform = `translate(${sx}px, ${sy}px)`;
      b.el.querySelector('.gdn-bus-dir').style.transform = `rotate(${b.ang + (b.dir < 0 ? Math.PI : 0)}rad)`;
      b.el.hidden = sx < -30 || sy < -30 || sx > W + 30 || sy > H + 30;
    });
    if (selected) { const [sx, sy] = worldToScreen(selected.x, selected.y); pop.style.transform = `translate(${Math.min(W - 290, Math.max(8, sx + 18))}px, ${Math.min(H - pop.offsetHeight - 8, Math.max(8, sy - 60))}px)`; }
  }

  function renderPop() {
    if (!selected) { pop.hidden = true; return; }
    const b = selected;
    pop.hidden = false;
    pop.innerHTML = `
      <div class="d-flex justify-content-between align-items-start gap-2">
        <div><div class="gdn-pop-eyebrow">Ônibus fictício ${b.id}</div><b>${b.r.name}</b></div>
        <button type="button" class="btn-close btn-close-white" aria-label="Fechar" data-close></button>
      </div>
      <div class="gdn-pop-state"><i style="background:${STATE[b.status].hex}"></i><code>${b.status}</code></div>
      <dl>
        <dt>Por quê</dt><dd>${b.why}</dd>
        <dt>Velocidade</dt><dd>${Math.round(b.speed)} km/h (simulada)</dd>
        <dt>Último ciclo</dt><dd>${cycleClock}</dd>
      </dl>
      <button type="button" class="btn btn-sm gdn-follow" data-follow aria-pressed="${follow}">${follow ? '<i class="bi bi-pin-angle-fill"></i> Seguindo' : '<i class="bi bi-crosshair"></i> Seguir este ônibus'}</button>`;
    pop.querySelector('[data-close]').onclick = () => { selected = null; follow = false; renderPop(); };
    pop.querySelector('[data-follow]').onclick = () => { follow = !follow; renderPop(); };
  }

  let lastT = 0;
  function frame(t) {
    const dt = Math.min(0.1, (t - (lastT || t)) / 1000);
    lastT = t;
    if (running) {
      buses.forEach((b) => {
        const L = b.r.cum[b.r.cum.length - 1];
        const inJam = b.status === 'jammed' || b.status === 'alert_jammed';
        b.speed = inJam ? 5 : 24 + (parseInt(b.id, 10) % 4) * 3;
        b.d += b.dir * (b.speed / 3.6) * SPEEDUP * dt;
        if (b.d > L) { b.d = L; b.dir = -1; } else if (b.d < 0) { b.d = 0; b.dir = 1; }
      });
      if (t - lastCycle > CYCLE) { lastCycle = t; cycle(); }
      ui.cycle.style.width = `${Math.min(1, (t - lastCycle) / CYCLE) * 100}%`;
    }
    buses.forEach((b) => { const q = along(b.r, b.d); b.x = q.x; b.y = q.y; b.ang = q.ang; });
    if (follow && selected) { view.x = selected.x; view.y = selected.y; drawBase(); }
    drawFx(t);
    placeBuses();
    requestAnimationFrame(frame);
  }

  /* ---------------- Navegação no mapa ---------------- */
  const zoomBy = (k) => { view.mpp = Math.max(1.2, Math.min(40, view.mpp * k)); drawBase(); };
  document.getElementById('gdn-zoom-in')?.addEventListener('click', () => zoomBy(0.75));
  document.getElementById('gdn-zoom-out')?.addEventListener('click', () => zoomBy(1.33));
  document.getElementById('gdn-recenter')?.addEventListener('click', () => { view.x = 0; view.y = 300; view.mpp = W < 600 ? 13 : 9; follow = false; drawBase(); });
  let drag = null;
  wrap.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.gdn-bus, .gdn-pop, .gdn-tools')) return;
    drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    wrap.setPointerCapture(e.pointerId);
    wrap.classList.add('is-dragging');
  });
  wrap.addEventListener('pointermove', (e) => {
    if (!drag) return;
    view.x = drag.vx - (e.clientX - drag.x) * view.mpp;
    view.y = drag.vy - (e.clientY - drag.y) * view.mpp;
    follow = false;
    drawBase();
  });
  const endDrag = () => { drag = null; wrap.classList.remove('is-dragging'); };
  wrap.addEventListener('pointerup', endDrag);
  wrap.addEventListener('pointercancel', endDrag);
  wrap.addEventListener('dblclick', () => zoomBy(0.6));
  wrap.addEventListener('click', (e) => { if (!e.target.closest('.gdn-bus, .gdn-pop, .gdn-tools')) { selected = null; renderPop(); } });

  /* ---------------- Controles de camadas ---------------- */
  const syncRain = () => {
    const mm = parseFloat(ui.rain.value);
    ui.rainOut.textContent = `${mm.toFixed(1).replace('.', ',')} mm em 15 min${mm >= RAIN_T ? ' · alerta de chuva' : ''}`;
    ui.rainOut.classList.toggle('is-over', mm >= RAIN_T);
  };
  ui.rain.addEventListener('input', () => { syncRain(); cycle(); });
  [ui.alert, ui.jam].forEach((c) => c.addEventListener('change', cycle));
  ui.roads.addEventListener('change', drawBase);
  ui.fail.addEventListener('change', () => {
    document.getElementById('gdn-fail-note').hidden = !ui.fail.checked;
    wrap.classList.toggle('is-failed', ui.fail.checked);
  });
  document.getElementById('gdn-play')?.addEventListener('click', (e) => {
    running = !running; lastT = 0;
    e.currentTarget.innerHTML = running ? '<i class="bi bi-pause-fill" aria-hidden="true"></i> Pausar' : '<i class="bi bi-play-fill" aria-hidden="true"></i> Continuar';
  });
  syncRain();

  /* ---------------- Início ---------------- */
  land = buildLand();
  new ResizeObserver(resize).observe(wrap);
  resize();
  if (W < 600) view.mpp = 13;
  (async () => {
    const res = await loadMesh();
    if (res) {
      mesh = buildMesh(res.ways);
      status.innerHTML = `<i class="bi bi-check-circle" aria-hidden="true"></i> Malha viária: ${res.from} · ${mesh.count.toLocaleString('pt-BR')} vias`;
      wrap.classList.add('has-mesh');
    } else {
      status.innerHTML = '<i class="bi bi-exclamation-circle" aria-hidden="true"></i> Não foi possível baixar a malha agora. Mostrando os limites do IBGE e um trajeto ilustrativo.';
    }
    if (MOBNIT_URL) status.innerHTML += ' · posições da MobNit';
    makeRoutes();
    buses.forEach((b) => { const q = along(b.r, b.d); b.x = q.x; b.y = q.y; });
    cycle();
    drawBase();
    requestAnimationFrame(frame);
  })();
})();
