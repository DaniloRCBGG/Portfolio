// Plataforma n8n como camada de transporte: sobre uma malha cinza, cada evento é um ponto de luz que
// viaja do sistema de origem pelo fluxo (Webhook → Code → IF → PostgreSQL → Resposta) e volta com o
// resultado. A validação é a mesma do Code Node do primeiro fluxo.
(() => {
  const stage = document.getElementById('flow-stage');
  if (!stage) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = stage.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const boxes = Object.fromEntries([...stage.querySelectorAll('.flow-node')].map((b) => [b.dataset.node, b]));
  const editor = document.getElementById('flow-json');
  const logBody = document.getElementById('flow-log');
  const auth = document.getElementById('flow-auth');
  // Ligações do fluxo, na ordem de passagem
  const LINKS = { ok: ['origem', 'webhook', 'code', 'if', 'pg', 'resp'], invalid: ['origem', 'webhook', 'code', 'if', 'erro'], auth: ['origem', 'webhook'] };
  const SPEED = 240; // px por segundo
  let W = 0, H = 0, dpr = 1, centers = {}, packets = [], seq = 0, last = 0;

  const presets = {
    ok: { event_id: 'evt-0001', source: 'sistema-exemplo', timestamp: '2026-03-10T14:32:00-03:00', data: { tipo: 'teste', descricao: 'payload de exemplo' } },
    semTimestamp: { event_id: 'evt-0002', source: 'sistema-exemplo', data: { tipo: 'teste' } },
    dataInvalida: { event_id: 'evt-0003', source: 'sistema-exemplo', timestamp: '10/03/2026', data: { tipo: 'teste' } },
    lista: [{ event_id: 'evt-0004', source: 'sistema-exemplo', timestamp: '2026-03-10T15:00:00-03:00', data: { tipo: 'lote' } }],
  };
  const setPreset = (k) => { editor.value = JSON.stringify(presets[k], null, 2); };
  document.querySelectorAll('#flow-presets button').forEach((b) => b.addEventListener('click', () => { setPreset(b.dataset.preset); document.querySelectorAll('#flow-presets button').forEach((x) => x.classList.toggle('active', x === b)); }));
  setPreset('ok');

  // Como no Code Node: aceita objeto ou lista com um evento
  const validate = (body) => {
    const ev = Array.isArray(body) ? body[0] : body;
    if (!ev || typeof ev !== 'object') return 'o corpo precisa ser um objeto JSON';
    for (const f of ['event_id', 'source', 'timestamp', 'data']) if (!(f in ev)) return `falta o campo ${f}`;
    if (typeof ev.event_id !== 'string' || !ev.event_id) return 'event_id precisa ser um texto';
    if (typeof ev.source !== 'string' || !ev.source) return 'source precisa ser um texto';
    if (Number.isNaN(Date.parse(ev.timestamp)) || !/^\d{4}-\d{2}-\d{2}T/.test(ev.timestamp)) return 'timestamp fora do padrão ISO 8601';
    if (typeof ev.data !== 'object' || ev.data === null || Array.isArray(ev.data)) return 'data precisa ser um objeto';
    return null;
  };

  const measure = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = stage.clientWidth; H = stage.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
    const base = stage.getBoundingClientRect();
    for (const [k, b] of Object.entries(boxes)) { const r = b.getBoundingClientRect(); centers[k] = [r.left - base.left + r.width / 2, r.top - base.top + r.height / 2]; }
  };

  // Cada trecho é uma curva suave entre os centros das caixas
  const segPoint = (a, b, t) => {
    const [x0, y0] = centers[a], [x1, y1] = centers[b];
    const mx = (x0 + x1) / 2;
    const u = 1 - t;
    const x = u * u * u * x0 + 3 * u * u * t * mx + 3 * u * t * t * mx + t * t * t * x1;
    const y = u * u * u * y0 + 3 * u * u * t * y0 + 3 * u * t * t * y1 + t * t * t * y1;
    return [x, y];
  };
  const segLen = (a, b) => Math.hypot(centers[b][0] - centers[a][0], centers[b][1] - centers[a][1]) * 1.15;

  const drawWire = (a, b, lit, color) => {
    ctx.beginPath();
    for (let i = 0; i <= 30; i++) { const [x, y] = segPoint(a, b, i / 30); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.lineWidth = lit ? 2.5 : 1.5;
    ctx.strokeStyle = lit ? color : 'rgba(150, 160, 170, 0.35)';
    ctx.stroke();
  };

  const fmt = (d) => `${d.toLocaleTimeString('pt-BR')}.${String(d.getMilliseconds()).padStart(3, '0')}`;
  const light = (node, kind) => {
    const b = boxes[node];
    if (!b) return;
    b.classList.remove('is-ok', 'is-fail');
    void b.offsetWidth;
    b.classList.add(kind === 'fail' ? 'is-fail' : 'is-ok');
  };

  function send(bodyText) {
    let body = null, problem = null, route;
    if (!auth.checked) route = 'auth';
    else {
      try { body = JSON.parse(bodyText); } catch (e) { problem = 'o texto não é um JSON válido'; }
      if (!problem) problem = validate(body);
      route = problem ? 'invalid' : 'ok';
    }
    const ev = body ? (Array.isArray(body) ? body[0] : body) : null;
    const id = ev && typeof ev.event_id === 'string' ? ev.event_id : `evt-${String(++seq).padStart(4, '0')}`;
    const row = document.createElement('tr');
    row.innerHTML = `<td>${fmt(new Date())}</td><td>${id.slice(0, 18)}</td><td class="flow-hops">saiu da origem</td><td><span class="flow-code is-wait">em trânsito</span></td>`;
    logBody.querySelector('.empty')?.remove();
    logBody.prepend(row);
    while (logBody.children.length > 8) logBody.lastChild.remove();
    const p = { path: LINKS[route], seg: 0, t: 0, route, problem, row, hops: [], back: false, color: '#9fd9d6' };
    packets.push(p);
    if (reduce) { while (!step(p, 1e6)) { /* entrega imediata */ } }
  }

  // Avança um pacote; devolve true quando terminou a viagem
  function step(p, dt) {
    if (p.done) return true;
    const a = p.path[p.seg], b = p.path[p.seg + 1];
    if (b === undefined) return finish(p);
    p.t += (SPEED * dt) / segLen(a, b);
    if (p.t >= 1) {
      p.t = 0; p.seg += 1;
      const node = p.path[p.seg];
      const now = new Date();
      p.hops.push(`${node} ${fmt(now).slice(-9)}`);
      p.row.querySelector('.flow-hops').textContent = p.hops.join(' → ');
      const failsHere = (p.route === 'auth' && node === 'webhook') || (p.route === 'invalid' && node === 'erro');
      light(node, failsHere ? 'fail' : 'ok');
      if (failsHere) p.color = '#ff8a80';
      if (p.seg >= p.path.length - 1) return finish(p);
    }
    return false;
  }
  function finish(p) {
    if (p.done) return true;
    p.done = true;
    const code = p.row.querySelector('.flow-code');
    if (p.route === 'ok') { code.className = 'flow-code is-ok'; code.textContent = '200 · gravado'; }
    else if (p.route === 'auth') { code.className = 'flow-code is-fail'; code.textContent = '403 · sem token'; }
    else { code.className = 'flow-code is-fail'; code.textContent = `erro · ${p.problem}`; }
    // Volta da resposta até a origem
    packets.push({ path: [p.path[p.path.length - 1], 'origem'], seg: 0, t: 0, route: 'back', row: p.row, hops: [], done: false, color: p.route === 'ok' ? '#7ee0a1' : '#ff8a80', isReply: true });
    return true;
  }

  function draw(t) {
    const dt = Math.min(0.05, (t - (last || t)) / 1000);
    last = t;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // Malha cinza
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(160, 170, 180, 0.10)';
    ctx.beginPath();
    for (let x = 0; x <= W; x += 24) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
    for (let y = 0; y <= H; y += 24) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
    ctx.stroke();
    // Fios do fluxo
    const wires = [['origem', 'webhook'], ['webhook', 'code'], ['code', 'if'], ['if', 'pg'], ['pg', 'resp'], ['if', 'erro']];
    const litNow = new Set(packets.filter((p) => !p.done && !p.isReply).map((p) => `${p.path[p.seg]}>${p.path[p.seg + 1]}`));
    wires.forEach(([a, b]) => drawWire(a, b, litNow.has(`${a}>${b}`), 'rgba(159, 217, 214, 0.8)'));
    // Pacotes: ponto de luz que acende a malha num raio
    packets.forEach((p) => {
      if (p.isReply) {
        if (p.done) return;
        p.t += (SPEED * 1.4 * dt) / Math.hypot(centers.origem[0] - centers[p.path[0]][0], centers.origem[1] - centers[p.path[0]][1]);
        if (p.t >= 1) { p.done = true; light('origem', p.color === '#7ee0a1' ? 'ok' : 'fail'); return; }
        const [x0, y0] = centers[p.path[0]], [x1, y1] = centers.origem;
        const x = x0 + (x1 - x0) * p.t, y = y0 + (y1 - y0) * p.t + Math.sin(p.t * Math.PI) * -60;
        glow(x, y, p.color, 46);
        return;
      }
      if (step(p, dt)) return;
      const a = p.path[p.seg], b = p.path[p.seg + 1];
      if (b === undefined) return;
      const [x, y] = segPoint(a, b, p.t);
      glow(x, y, p.color, 70);
    });
    packets = packets.filter((p) => !p.done);
    requestAnimationFrame(draw);
  }
  function glow(x, y, color, r) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // Halo
    const halo = ctx.createRadialGradient(x, y, 0, x, y, r);
    halo.addColorStop(0, hexA(color, 0.5)); halo.addColorStop(0.4, hexA(color, 0.16)); halo.addColorStop(1, hexA(color, 0));
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    // A malha acende dentro do raio
    ctx.strokeStyle = hexA(color, 0.35); ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = Math.floor((x - r) / 24) * 24; gx <= x + r; gx += 24) { const h = Math.sqrt(Math.max(0, r * r - (gx - x) ** 2)); ctx.moveTo(gx + 0.5, y - h); ctx.lineTo(gx + 0.5, y + h); }
    for (let gy = Math.floor((y - r) / 24) * 24; gy <= y + r; gy += 24) { const w = Math.sqrt(Math.max(0, r * r - (gy - y) ** 2)); ctx.moveTo(x - w, gy + 0.5); ctx.lineTo(x + w, gy + 0.5); }
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`; };

  document.getElementById('flow-send')?.addEventListener('click', () => send(editor.value));
  document.getElementById('flow-burst')?.addEventListener('click', () => {
    const order = ['ok', 'semTimestamp', 'ok', 'dataInvalida', 'lista'];
    order.forEach((k, i) => setTimeout(() => send(JSON.stringify(presets[k])), reduce ? 0 : i * 450));
  });
  new ResizeObserver(measure).observe(stage);
  measure();
  requestAnimationFrame(draw);
})();
