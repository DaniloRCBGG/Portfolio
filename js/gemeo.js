// Mini Gêmeo: a malha viária de Niterói (OpenStreetMap, a mesma do city-roads) desenhada em canvas,
// com ônibus simulados andando sobre as ruas reais. A cada ciclo o estado de cada ônibus é recalculado
// com a mesma regra do Gêmeo (Bus.getStatus) e os mesmos limiares. Estações da NitBike e câmeras só
// aparecem (não entram no cruzamento); a NitBike segue a lógica real: snapshot a cada 30 s, saídas e
// entradas pela diferença de contagem, soma por minuto e janela dos últimos 5 minutos.
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
    bike: document.getElementById('lay-bike'), cam: document.getElementById('lay-cam'),
    counts: document.getElementById('gdn-counts'), last: document.getElementById('gdn-last'), cycle: document.querySelector('#gdn-cycle i'),
  };
  const bctx = base.getContext('2d');
  const fctx = fx.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const view = { x: 0, y: 300, mpp: 9 }; // centro da câmera em metros e metros por pixel
  let mesh = null; // { classes: { major: Path2D, minor, path }, count, graph }
  let land = null; // contornos do IBGE em Path2D
  let routes = [], buses = [], alerts = [], jams = [], cell = null, selected = null, follow = false;
  let stations = [], cams = [];
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
    // Duas vias engarrafadas, em linhas diferentes
    const jamOn = (r, f, len) => {
      const L = r.cum[r.cum.length - 1], pts = [];
      for (let d = L * f; d <= Math.min(L, L * f + len); d += 20) { const q = along(r, d); pts.push([q.x, q.y]); }
      return { pts };
    };
    const r1 = Math.min(1, R.length - 1);
    const j1 = jamOn(R[r1], 0.3, 600);
    // A segunda fica perto de onde o mapa abre (para ser vista logo), longe da primeira e em outra linha
    let spot = null, best = Infinity;
    R.forEach((r, ri) => {
      if (ri === r1 && R.length > 1) return;
      for (let f = 0.15; f <= 0.75; f += 0.05) {
        const q = along(r, r.cum[r.cum.length - 1] * f);
        const dView = Math.hypot(q.x, q.y - 300), dJam = Math.hypot(q.x - j1.pts[0][0], q.y - j1.pts[0][1]);
        if (dJam > 900 && dView < best) { best = dView; spot = [r, f]; }
      }
    });
    jams = [j1, spot ? jamOn(spot[0], spot[1], 520) : jamOn(R[0], 0.62, 520)];
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

  /* ---------------- NitBike e câmeras ---------------- */
  const poiLayer = wrap.querySelector('.gdn-poi');
  // Estações simuladas, perto de onde ficariam; cada uma é encaixada na via principal mais próxima
  const NB = [
    { name: 'Praça Araribóia', bairro: 'Centro', ll: [-43.1262, -22.8935], cap: 14 },
    { name: 'Rua da Conceição', bairro: 'Centro', ll: [-43.1208, -22.8962], cap: 12 },
    { name: 'Campus do Gragoatá', bairro: 'São Domingos', ll: [-43.1335, -22.8988], cap: 12, full: true },
    { name: 'Rua Tiradentes', bairro: 'Ingá', ll: [-43.1232, -22.9012], cap: 10 },
    { name: 'Praia de Icaraí', bairro: 'Icaraí', ll: [-43.1120, -22.9058], cap: 16 },
    { name: 'Campo de São Bento', bairro: 'Icaraí', ll: [-43.1058, -22.9028], cap: 12 },
    { name: 'Rua Santa Rosa', bairro: 'Santa Rosa', ll: [-43.0975, -22.9072], cap: 10 },
  ];
  let seed2 = 7310;
  const rnd2 = () => { seed2 = (seed2 * 1103515245 + 12345) >>> 0; return seed2 / 4294967296; };
  const hhmm = (t) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  // Relógio simulado: começa 5 minutos atrás para a janela já nascer cheia
  let simT = Math.floor(Date.now() / 60000) * 60000 - 5 * 60000, snapN = 0, nbWindow = [];

  function makePois() {
    poiLayer.innerHTML = '';
    const g = mesh && mesh.graph;
    const snap = (p, max = 500) => {
      if (!g) return p;
      let best = null, bd = max;
      for (const q of g.pts) { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; best = q; } }
      return best ? [best[0], best[1]] : p;
    };
    stations = NB.map((s, i) => {
      const [x, y] = snap(toXY(s.ll[0], s.ll[1]));
      const st = { ...s, kind: 'station', id: i, x, y, bikes: s.full ? s.cap : Math.round(s.cap * (0.3 + rnd2() * 0.45)), acc: { out: 0, in: 0 }, mins: [], last: 0 };
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'gdn-station';
      el.innerHTML = '<i class="bi bi-bicycle" aria-hidden="true"></i><span class="gdn-st-delta" aria-hidden="true"></span>';
      el.addEventListener('click', (e) => { e.stopPropagation(); selected = st; follow = false; renderPop(); });
      poiLayer.appendChild(el);
      st.el = el;
      return st;
    });
    // Câmeras em cruzamentos das vias principais, espalhadas
    const spots = [];
    if (g) {
      const cand = g.pts.filter((p, i) => g.adj[i].length >= 3 && Math.hypot(p[0], p[1] - 300) < 2400);
      let guard = 0;
      while (spots.length < 5 && guard++ < 600 && cand.length) {
        const p = cand[Math.floor(rnd2() * cand.length)];
        if (spots.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > 700) && stations.every((s) => Math.hypot(s.x - p[0], s.y - p[1]) > 200)) spots.push(p);
      }
    }
    if (!spots.length) [0.15, 0.5, 0.85].forEach((f) => { const r = routes[0]; const q = along(r, r.cum[r.cum.length - 1] * f); spots.push([q.x, q.y]); });
    cams = spots.map((p, i) => {
      const c = { kind: 'cam', id: String(i + 1).padStart(2, '0'), x: p[0], y: p[1] };
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'gdn-cam';
      el.setAttribute('aria-label', `Câmera urbana simulada ${c.id}`);
      el.innerHTML = '<i class="bi bi-camera-video-fill" aria-hidden="true"></i>';
      el.addEventListener('click', (e) => { e.stopPropagation(); selected = c; follow = false; renderPop(); });
      poiLayer.appendChild(el);
      c.el = el;
      return c;
    });
    // Histórico: 10 snapshots (5 minutos) antes de começar
    for (let k = 0; k < 10; k++) nbSnap(true);
    renderNb(false);
  }

  const paintStation = (st) => {
    const full = st.bikes >= st.cap;
    st.el.classList.toggle('is-full', full);
    st.el.classList.toggle('is-empty', st.bikes === 0);
    st.el.setAttribute('aria-label', `Estação NitBike simulada ${st.name}, ${st.bairro}: ${st.bikes} de ${st.cap} bikes${full ? ', cheia' : ''}`);
  };
  const flashDelta = (st, d) => {
    const tag = st.el.querySelector('.gdn-st-delta');
    tag.textContent = d < 0 ? `−${-d}` : `+${d}`;
    tag.className = `gdn-st-delta ${d < 0 ? 'is-out' : 'is-in'}`;
    void tag.offsetWidth;
    tag.classList.add('go');
  };

  // Um snapshot: a diferença de contagem diz quantas bikes saíram ou chegaram em cada estação
  function nbSnap(quiet) {
    if (!stations.length) return;
    simT += 30000;
    stations.forEach((st) => {
      const prev = st.bikes;
      let next;
      if (st.full) next = prev < st.cap ? st.cap : (rnd2() < 0.22 ? st.cap - 1 : st.cap);
      else { const r = rnd2(); next = Math.max(0, Math.min(st.cap, prev + (r < 0.16 ? -2 : r < 0.4 ? -1 : r < 0.6 ? 0 : r < 0.84 ? 1 : 2))); }
      st.bikes = next;
      st.last = next - prev;
      st.acc.out += Math.max(0, prev - next);
      st.acc.in += Math.max(0, next - prev);
      paintStation(st);
      if (!quiet && st.last && !reduce) flashDelta(st, st.last);
    });
    // A cada minuto (dois snapshots) fecha o total e a janela anda: sai o minuto mais antigo, entra o novo
    if (++snapN % 2 === 0) {
      const t = simT - 60000;
      let out = 0, inn = 0;
      stations.forEach((st) => {
        st.mins.push({ t, out: st.acc.out, in: st.acc.in });
        if (st.mins.length > 5) st.mins.shift();
        out += st.acc.out; inn += st.acc.in;
        st.acc = { out: 0, in: 0 };
      });
      nbWindow.push({ t, out, in: inn });
      const gone = nbWindow.length > 5 ? nbWindow.shift() : null;
      if (!quiet) renderNb(true, gone);
    }
    if (!quiet && selected && selected.kind === 'station') renderPop();
  }

  const nbEl = { rows: document.getElementById('nb-rows'), out: document.getElementById('nb-out'), in: document.getElementById('nb-in'), topOut: document.getElementById('nb-top-out'), topIn: document.getElementById('nb-top-in'), roll: document.getElementById('nb-roll') };
  function renderNb(fresh, gone) {
    if (!nbEl.rows) return;
    nbEl.rows.innerHTML = nbWindow.slice().reverse().map((m, i) => `<tr class="${fresh && i === 0 ? 'is-new' : ''}"><th scope="row">${hhmm(m.t)}</th><td class="nb-o">${m.out}</td><td class="nb-i">${m.in}</td></tr>`).join('');
    nbEl.out.textContent = nbWindow.reduce((n, m) => n + m.out, 0);
    nbEl.in.textContent = nbWindow.reduce((n, m) => n + m.in, 0);
    const sum = (st, k) => st.mins.reduce((n, m) => n + m[k], 0);
    const top = (k) => {
      const list = stations.map((st) => ({ st, n: sum(st, k) })).sort((a, b) => b.n - a.n).slice(0, 3);
      const max = Math.max(1, list[0] ? list[0].n : 1);
      return list.map(({ st, n }) => `<li><span>${st.name}</span><b>${n}</b><i style="width:${(n / max) * 100}%"></i></li>`).join('');
    };
    nbEl.topOut.innerHTML = top('out');
    nbEl.topIn.innerHTML = top('in');
    const last = nbWindow[nbWindow.length - 1];
    if (nbEl.roll && last) nbEl.roll.textContent = gone ? `entrou ${hhmm(last.t)} · saiu ${hhmm(gone.t)}` : `até ${hhmm(last.t)}`;
  }

  function stationPop(st) {
    const full = st.bikes >= st.cap;
    const state = full ? 'cheia' : st.bikes === 0 ? 'vazia' : 'com bikes e vagas';
    const last = st.last < 0 ? `${-st.last} saíram` : st.last > 0 ? `${st.last} chegaram` : 'sem mudança';
    return `
      <div class="d-flex justify-content-between align-items-start gap-2">
        <div><div class="gdn-pop-eyebrow">Estação NitBike simulada · ${st.bairro}</div><b>${st.name}</b></div>
        <button type="button" class="btn-close btn-close-white" aria-label="Fechar" data-close></button>
      </div>
      <div class="gdn-pop-state"><span class="lg-st${full ? ' is-full' : ''}"><i class="bi bi-bicycle" aria-hidden="true"></i></span><code>${state}</code></div>
      <dl>
        <dt>Bikes</dt><dd>${st.bikes} de ${st.cap} · ${st.cap - st.bikes} vagas</dd>
        <dt>Último snapshot</dt><dd>${last}</dd>
        <dt>Minuto em curso</dt><dd>${st.acc.out} saídas · ${st.acc.in} entradas</dd>
      </dl>
      <table class="gdn-pop-table"><thead><tr><th>minuto</th><th>saídas</th><th>entradas</th></tr></thead><tbody>${st.mins.slice().reverse().map((m) => `<tr><td>${hhmm(m.t)}</td><td>${m.out}</td><td>${m.in}</td></tr>`).join('')}</tbody></table>`;
  }
  function camPop(c) {
    return `
      <div class="d-flex justify-content-between align-items-start gap-2">
        <div><div class="gdn-pop-eyebrow">Câmera urbana simulada ${c.id} · NITTRANS</div><b>Só aparece no mapa</b></div>
        <button type="button" class="btn-close btn-close-white" aria-label="Fechar" data-close></button>
      </div>
      <p class="mb-0 mt-2">As câmeras urbanas só aparecem no mapa: não entram no cruzamento que decide a cor dos ônibus.</p>`;
  }

  function placePois() {
    const put = (on, list) => list.forEach((p) => {
      const [sx, sy] = worldToScreen(p.x, p.y);
      p.el.style.transform = `translate(${sx}px, ${sy}px)`;
      p.el.hidden = !on || sx < -30 || sy < -30 || sx > W + 30 || sy > H + 30;
    });
    put(!ui.bike || ui.bike.checked, stations);
    put(!ui.cam || ui.cam.checked, cams);
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
      if (ui.jam.checked) jams.forEach((j) => { for (let i = 1; i < j.pts.length; i++) jd = Math.min(jd, distSeg(p, j.pts[i - 1], j.pts[i])); });
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
    // Os limites do IBGE são simplificados: só aparecem quando a malha real não carrega
    if (land && !mesh) {
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
    // Pluviômetro: um brilho suave sobre a malha, que só ganha força e contorno acima do limiar
    if (cell) {
      const mm = parseFloat(ui.rain.value);
      const over = mm >= RAIN_T;
      const [cx, cy] = cell.center;
      const pulse = over && !reduce ? 0.85 + 0.15 * Math.sin(t / 380) : 1;
      const g = fctx.createRadialGradient(cx, cy, 0, cx, cy, 650);
      g.addColorStop(0, `rgba(91, 143, 214, ${(over ? 0.32 : 0.12) * pulse})`);
      g.addColorStop(0.7, `rgba(91, 143, 214, ${(over ? 0.12 : 0.04) * pulse})`);
      g.addColorStop(1, 'rgba(91, 143, 214, 0)');
      fctx.fillStyle = g; fctx.beginPath(); fctx.arc(cx, cy, 650, 0, Math.PI * 2); fctx.fill();
      if (over) {
        fctx.setLineDash([6 * view.mpp, 6 * view.mpp]);
        fctx.lineWidth = 1.2 * view.mpp; fctx.strokeStyle = 'rgba(232, 149, 90, 0.55)';
        fctx.beginPath(); cell.poly.forEach((p, i) => (i ? fctx.lineTo(p[0], p[1]) : fctx.moveTo(p[0], p[1]))); fctx.closePath(); fctx.stroke();
        fctx.setLineDash([]);
      }
      fctx.fillStyle = '#5b8fd6'; fctx.beginPath(); fctx.arc(cx, cy, 5 * view.mpp, 0, Math.PI * 2); fctx.fill();
      fctx.lineWidth = 2 * view.mpp; fctx.strokeStyle = 'rgba(247, 247, 242, 0.9)'; fctx.stroke();
    }
    if (!failed) {
      // Lentidão
      if (ui.jam.checked) jams.forEach((j) => {
        const path = () => { fctx.beginPath(); j.pts.forEach((p, i) => (i ? fctx.lineTo(p[0], p[1]) : fctx.moveTo(p[0], p[1]))); };
        fctx.lineCap = 'round'; fctx.lineJoin = 'round';
        // brilho por baixo e o trecho lento por cima, com um tracejado andando devagar
        fctx.lineWidth = 16 * view.mpp; fctx.strokeStyle = 'rgba(214, 69, 69, 0.18)'; path(); fctx.stroke();
        fctx.lineWidth = 7 * view.mpp; fctx.strokeStyle = 'rgba(214, 69, 69, 0.9)'; path(); fctx.stroke();
        fctx.setLineDash([10 * view.mpp, 14 * view.mpp]); fctx.lineDashOffset = reduce ? 0 : -(t / 90) * view.mpp;
        fctx.lineWidth = 2.2 * view.mpp; fctx.strokeStyle = 'rgba(255, 214, 205, 0.85)'; path(); fctx.stroke();
        fctx.setLineDash([]); fctx.lineDashOffset = 0;
      });
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
    // Na falha do BFF somem só os ônibus: o pop-up de uma estação ou câmera continua
    if (failed && selected && !selected.kind) { selected = null; follow = false; pop.hidden = true; }
    if (!failed) buses.forEach((b) => {
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
    if (b.kind === 'station') { pop.innerHTML = stationPop(b); pop.querySelector('[data-close]').onclick = closePop; return; }
    if (b.kind === 'cam') { pop.innerHTML = camPop(b); pop.querySelector('[data-close]').onclick = closePop; return; }
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
    pop.querySelector('[data-close]').onclick = closePop;
    pop.querySelector('[data-follow]').onclick = () => { follow = !follow; renderPop(); };
  }
  function closePop() { selected = null; follow = false; renderPop(); }

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
      if (t - lastCycle > CYCLE) { lastCycle = t; cycle(); nbSnap(false); }
      ui.cycle.style.width = `${Math.min(1, (t - lastCycle) / CYCLE) * 100}%`;
    }
    buses.forEach((b) => { const q = along(b.r, b.d); b.x = q.x; b.y = q.y; b.ang = q.ang; });
    if (follow && selected) { view.x = selected.x; view.y = selected.y; drawBase(); }
    drawFx(t);
    placePois();
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
    if (e.target.closest('.gdn-bus, .gdn-station, .gdn-cam, .gdn-pop, .gdn-tools')) return;
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
  wrap.addEventListener('click', (e) => { if (!e.target.closest('.gdn-bus, .gdn-station, .gdn-cam, .gdn-pop, .gdn-tools')) { selected = null; renderPop(); } });

  /* ---------------- Controles de camadas ---------------- */
  const syncRain = () => {
    const mm = parseFloat(ui.rain.value);
    ui.rainOut.textContent = `${mm.toFixed(1).replace('.', ',')} mm em 15 min${mm >= RAIN_T ? ' · alerta de chuva' : ''}`;
    ui.rainOut.classList.toggle('is-over', mm >= RAIN_T);
  };
  ui.rain.addEventListener('input', () => { syncRain(); cycle(); });
  [ui.alert, ui.jam].forEach((c) => c.addEventListener('change', cycle));
  ui.roads.addEventListener('change', drawBase);
  [ui.bike, ui.cam].forEach((c) => c?.addEventListener('change', () => {
    if (selected && ((selected.kind === 'station' && !ui.bike.checked) || (selected.kind === 'cam' && !ui.cam.checked))) closePop();
  }));
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
    makePois();
    buses.forEach((b) => { const q = along(b.r, b.d); b.x = q.x; b.y = q.y; });
    cycle();
    drawBase();
    requestAnimationFrame(frame);
  })();
})();
