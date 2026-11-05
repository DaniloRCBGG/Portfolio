// Prefect: fundo com luz que segue o cursor e dados correndo numa grade, mapa da orquestração com cada
// execução viajando como um ponto de luz (fonte → worker → camada) e o gráfico das execuções. É uma
// simulação, mas com as cadências, os caminhos e os destinos reais do ambiente.
(() => {
  const sec = document.getElementById('prefect');
  if (!sec) return;
  const P = window.PORTFOLIO;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPEED = 30; // 1 s real = 30 s simulados
  const WINDOW = 15 * 60 * 1000; // o gráfico mostra os últimos 15 min
  const hms = (t) => new Date(t).toLocaleTimeString('pt-BR');
  let visible = false;

  /* ---------------- Fundo: grade de pontos, luz no cursor e correntes de dados ---------------- */
  const bg = sec.querySelector('.pf-bg');
  const bctx = bg.getContext('2d');
  let BW = 0, BH = 0, bdpr = 1;
  const GRID = 30;
  const light = { x: 0, y: 0, tx: 0, ty: 0, on: false };
  const sizeBg = () => {
    bdpr = Math.min(1.5, window.devicePixelRatio || 1);
    BW = bg.clientWidth; BH = bg.clientHeight;
    bg.width = Math.round(BW * bdpr); bg.height = Math.round(BH * bdpr);
  };
  sec.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = bg.getBoundingClientRect();
    light.tx = e.clientX - r.left; light.ty = e.clientY - r.top; light.on = true;
  });
  sec.addEventListener('pointerleave', () => { light.on = false; });
  const COLORS = ['0, 166, 166', '91, 143, 214', '155, 108, 240', '159, 217, 214'];
  const newStream = () => {
    const horiz = Math.random() < 0.6;
    return {
      horiz, dir: Math.random() < 0.5 ? 1 : -1, speed: 60 + Math.random() * 120, len: 40 + Math.random() * 90,
      line: Math.floor(Math.random() * ((horiz ? BH : BW) / GRID)) * GRID,
      pos: Math.random() * (horiz ? BW : BH), c: COLORS[Math.floor(Math.random() * COLORS.length)],
    };
  };
  let streams = [];
  function drawBg(t, dt) {
    if (!light.on) { light.tx = BW * (0.5 + 0.34 * Math.sin(t / 4300)); light.ty = BH * (0.45 + 0.28 * Math.sin(t / 3100)); }
    light.x += (light.tx - light.x) * Math.min(1, dt * 6);
    light.y += (light.ty - light.y) * Math.min(1, dt * 6);
    bctx.setTransform(bdpr, 0, 0, bdpr, 0, 0);
    bctx.clearRect(0, 0, BW, BH);
    const R = Math.max(260, Math.min(BW, BH) * 0.42);
    const g = bctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, R);
    g.addColorStop(0, 'rgba(91, 143, 214, 0.20)'); g.addColorStop(0.45, 'rgba(0, 166, 166, 0.07)'); g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    bctx.fillStyle = g; bctx.fillRect(0, 0, BW, BH);
    // grade: os pontos acendem perto da luz (parallax leve com a rolagem)
    const oy = -((window.scrollY * 0.15) % GRID);
    const buckets = [[], [], [], [], []];
    for (let y = oy; y < BH + GRID; y += GRID) {
      for (let x = GRID / 2; x < BW; x += GRID) {
        const k = Math.max(0, 1 - Math.hypot(x - light.x, y - light.y) / R);
        buckets[Math.min(4, Math.floor(k * 5))].push(x, y, k);
      }
    }
    buckets.forEach((list, b) => {
      bctx.fillStyle = `rgba(159, 217, 214, ${0.07 + b * 0.13})`;
      for (let i = 0; i < list.length; i += 3) { const s = 1 + list[i + 2] * 1.6; bctx.fillRect(list[i] - s / 2, list[i + 1] - s / 2, s, s); }
    });
    // correntes de dados andando pelas linhas da grade
    bctx.globalCompositeOperation = 'lighter';
    streams.forEach((s, i) => {
      s.pos += s.dir * s.speed * dt;
      const max = s.horiz ? BW : BH;
      if (s.pos < -s.len || s.pos > max + s.len) { streams[i] = newStream(); return; }
      const [x0, y0, x1, y1] = s.horiz ? [s.pos - s.dir * s.len, s.line + oy, s.pos, s.line + oy] : [s.line + GRID / 2, s.pos - s.dir * s.len, s.line + GRID / 2, s.pos];
      const lg = bctx.createLinearGradient(x0, y0, x1, y1);
      lg.addColorStop(0, `rgba(${s.c}, 0)`); lg.addColorStop(1, `rgba(${s.c}, 0.5)`);
      bctx.strokeStyle = lg; bctx.lineWidth = 1.6;
      bctx.beginPath(); bctx.moveTo(x0, y0); bctx.lineTo(x1, y1); bctx.stroke();
      bctx.fillStyle = `rgba(${s.c}, 0.95)`; bctx.fillRect(x1 - 1.5, y1 - 1.5, 3, 3);
    });
    bctx.globalCompositeOperation = 'source-over';
  }

  /* ---------------- Mapa da orquestração ---------------- */
  const stage = document.getElementById('pf-stage');
  const wires = stage.querySelector('.pf-wires');
  const wctx = wires.getContext('2d');
  let SW = 0, SH = 0, sdpr = 1;
  const nodes = {};
  stage.querySelectorAll('.pf-node').forEach((el) => { nodes[el.dataset.node] = { el, x: 0, y: 0 }; });
  const EDGES = [
    ['nitbike', 'worker'], ['waze', 'worker'], ['dc', 'worker'], ['colab', 'worker'], ['do', 'worker'], ['github', 'worker'],
    ['server', 'worker'], ['server', 'pg'], ['worker', 'pg'], ['worker', 'agol'], ['worker', 'portal'], ['worker', 'mail'],
    ['mon', 'server'], ['mon', 'pg'], ['mon', 'teams'], ['mon', 'worker'],
  ];
  const edgeOf = {};
  const sizeStage = () => {
    sdpr = Math.min(2, window.devicePixelRatio || 1);
    SW = stage.clientWidth; SH = stage.clientHeight;
    wires.width = Math.round(SW * sdpr); wires.height = Math.round(SH * sdpr);
    Object.values(nodes).forEach((n) => { n.x = (parseFloat(n.el.style.left) / 100) * SW; n.y = (parseFloat(n.el.style.top) / 100) * SH; });
    EDGES.forEach(([a, b]) => {
      const A = nodes[a], B = nodes[b];
      const dx = B.x - A.x, dy = B.y - A.y;
      const horiz = Math.abs(dx) > Math.abs(dy) * 0.8;
      const c1 = horiz ? [A.x + dx * 0.5, A.y] : [A.x, A.y + dy * 0.5];
      const c2 = horiz ? [B.x - dx * 0.5, B.y] : [B.x, B.y - dy * 0.5];
      edgeOf[`${a}>${b}`] = { a, b, p: [[A.x, A.y], c1, c2, [B.x, B.y]] };
    });
  };
  const bez = (p, t) => {
    const u = 1 - t;
    return [u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0],
      u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1]];
  };
  // Trecho de a para b, na direção certa
  const seg = (a, b) => { const e = edgeOf[`${a}>${b}`]; if (e) return e.p; const r = edgeOf[`${b}>${a}`]; return r ? r.p.slice().reverse() : null; };

  let focus = '';
  let packets = [];
  const hitAt = {};
  const hit = (id, cls = 'is-hit') => {
    const n = nodes[id];
    if (!n || (hitAt[id] && performance.now() - hitAt[id] < 260)) return;
    hitAt[id] = performance.now();
    n.el.classList.remove(cls); void n.el.offsetWidth; n.el.classList.add(cls);
  };
  const send = (path, color, opts = {}) => {
    if (reduce || !visible) return;
    if (packets.length > 140) packets.shift();
    packets.push({ path, i: 0, t: 0, color, frente: opts.frente || '', size: opts.size || 3.2, speed: opts.speed || 1.25, done: opts.done });
  };
  function drawStage(dt) {
    wctx.setTransform(sdpr, 0, 0, sdpr, 0, 0);
    wctx.clearRect(0, 0, SW, SH);
    // fios: os da frente escolhida ficam acesos
    const lit = new Set();
    if (focus) DEPS.filter((d) => d.frente === focus).forEach((d) => d.path.forEach((id, k) => { if (k) { lit.add(`${d.path[k - 1]}>${id}`); lit.add(`${id}>${d.path[k - 1]}`); } }));
    const fc = focus ? FRENTE_COLOR[focus] : null;
    Object.entries(edgeOf).forEach(([key, e]) => {
      const on = lit.has(key);
      wctx.strokeStyle = on ? fc : 'rgba(159, 217, 214, 0.22)';
      wctx.lineWidth = on ? 2.2 : 1.2;
      wctx.setLineDash(e.a === 'mon' || e.b === 'mon' ? [4, 5] : []);
      wctx.beginPath(); wctx.moveTo(e.p[0][0], e.p[0][1]); wctx.bezierCurveTo(e.p[1][0], e.p[1][1], e.p[2][0], e.p[2][1], e.p[3][0], e.p[3][1]); wctx.stroke();
    });
    wctx.setLineDash([]);
    // pontos de luz
    wctx.globalCompositeOperation = 'lighter';
    packets = packets.filter((k) => {
      k.t += dt * k.speed;
      while (k.t >= 1) {
        k.t -= 1; k.i++;
        if (k.i >= k.path.length - 1) { hit(k.path[k.path.length - 1]); if (k.done) k.done(); return false; }
        hit(k.path[k.i]);
      }
      const p = seg(k.path[k.i], k.path[k.i + 1]);
      if (!p) return false;
      const [x, y] = bez(p, k.t);
      const dim = focus && k.frente && k.frente !== focus;
      const a = dim ? 0.12 : 1;
      const r = k.size * 4.5;
      const g = wctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, hexA(k.color, 0.9 * a)); g.addColorStop(0.35, hexA(k.color, 0.35 * a)); g.addColorStop(1, hexA(k.color, 0));
      wctx.fillStyle = g; wctx.beginPath(); wctx.arc(x, y, r, 0, Math.PI * 2); wctx.fill();
      wctx.fillStyle = `rgba(255, 255, 255, ${0.9 * a})`; wctx.beginPath(); wctx.arc(x, y, k.size * 0.55, 0, Math.PI * 2); wctx.fill();
      return true;
    });
    wctx.globalCompositeOperation = 'source-over';
  }
  const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`; };

  /* ---------------- Execuções: cadências e caminhos reais ---------------- */
  const FRENTE_COLOR = { nitbike: '#9b6cf0', waze: '#e8955a', dc: '#5b8fd6', edn: '#7ee0a1' };
  const ROWS = ['Extract NitBike · 10 s', 'Atualização NitBike · 1 min', 'Waze Live · 2 min', 'COLAB · 5 min', 'Defesa Civil · 15 min', 'Diário Oficial · diário'];
  const DEPS = [
    { name: 'Extract NitBike', row: 0, every: 10, frente: 'nitbike', path: ['nitbike', 'worker', 'pg'], note: '65 estações gravadas' },
    { name: 'Atualização NitBike', row: 1, every: 60, frente: 'nitbike', path: ['pg', 'worker', 'agol'], note: 'janela de 5 min publicada' },
    { name: 'Waze Live', row: 2, every: 120, frente: 'waze', path: ['waze', 'worker', 'agol'], note: 'alertas e tráfego ao vivo' },
    { name: 'COLAB', row: 3, every: 300, frente: 'edn', path: ['colab', 'worker', 'portal'], note: 'publicações atualizadas' },
    { name: 'Risco de incêndio', row: 4, every: 900, offset: 0, frente: 'dc', path: ['dc', 'worker', 'agol'], note: 'risco e meteorologia' },
    { name: 'Ocorrências de incêndio', row: 4, every: 900, offset: 300, frente: 'dc', path: ['dc', 'worker', 'agol'], note: 'focos atualizados' },
    { name: 'SVIDA', row: 4, every: 900, offset: 600, frente: 'dc', path: ['dc', 'worker', 'portal'], note: 'pluviômetros e avisos' },
    { name: 'Diário Oficial', row: 5, every: 0, frente: 'edn', path: ['do', 'worker', 'mail'] },
  ];
  let simNow = Date.now();
  let runs = [];
  let total = 0;
  let workerDown = 0; // até quando (tempo simulado) o worker fica fora
  const countEl = document.getElementById('pf-count');
  const clockEl = document.getElementById('pf-clock');
  const logEl = document.getElementById('pf-log');
  let extractN = 0;
  const log = (t, name, text, kind = '') => {
    if (!logEl) return;
    const li = document.createElement('li');
    li.className = kind;
    li.innerHTML = `<time>${hms(t)}</time><b>${name}</b><span>${text}</span>`;
    logEl.prepend(li);
    while (logEl.children.length > 6) logEl.lastChild.remove();
  };
  const record = (d, t, state, quiet) => {
    runs.push({ row: d.row, t, state, small: d.row === 0 });
    if (!quiet) { total++; if (countEl) countEl.textContent = total.toLocaleString('pt-BR'); }
  };
  function fire(d, t, quiet) {
    if (workerDown > t) {
      // Sem worker, a execução não sai: passa 15 s do horário e vira Late
      record(d, t, 'late', quiet);
      if (!quiet && d.row !== 0) log(t, d.name, 'atrasada (Late): worker fora do ar', 'is-warn');
      return;
    }
    const fail = d.row === 0 && Math.random() < 0.003;
    record(d, t, fail ? 'fail' : 'ok', quiet);
    if (quiet) return;
    const color = FRENTE_COLOR[d.frente];
    if (d.row !== 0) send(['github', 'worker'], '#a9bccd', { size: 2.2, speed: 1.8, frente: d.frente });
    send(d.path, color, { frente: d.frente, size: d.row === 0 ? 2.6 : 3.6, done: () => { if (d.row !== 0) send(['worker', 'server'], '#f7f7f2', { size: 2, speed: 2, frente: d.frente }); } });
    if (d.row === 0) { if (++extractN % 9 === 0) log(t, d.name, fail ? 'falhou (sem nova tentativa)' : d.note, fail ? 'is-fail' : ''); } else log(t, d.name, d.note);
  }
  // Diário Oficial: às vezes o PDF do dia ainda não saiu e o flow tenta de novo (de hora em hora)
  let doTimer = 0;
  function runDO() {
    const d = DEPS[7];
    if (!visible || reduce) return;
    const late = Math.random() < 0.6;
    if (late) {
      record(d, simNow, 'retry');
      send(['do', 'worker'], FRENTE_COLOR.edn, { frente: 'edn' });
      log(simNow, d.name, 'diário ainda não publicado: nova tentativa em 1 h', 'is-warn');
      setTimeout(() => { record(d, simNow, 'ok'); send(d.path, FRENTE_COLOR.edn, { frente: 'edn' }); log(simNow, d.name, 'PDF lido, aviso enviado por e-mail'); }, 3200);
    } else {
      record(d, simNow, 'ok');
      send(d.path, FRENTE_COLOR.edn, { frente: 'edn' });
      log(simNow, d.name, 'PDF lido, aviso enviado por e-mail');
    }
  }
  const next = DEPS.map((d) => (d.every ? Math.ceil((simNow / 1000 - (d.offset || 0)) / d.every) * d.every + (d.offset || 0) : Infinity));
  // Histórico dos últimos 15 min, sem animação, para o gráfico já nascer cheio
  DEPS.forEach((d) => {
    if (!d.every) return;
    for (let s = Math.ceil((simNow - WINDOW) / 1000 / d.every) * d.every + (d.offset || 0); s * 1000 < simNow; s += d.every) fire(d, s * 1000, true);
  });
  record(DEPS[7], simNow - 11 * 60 * 1000, 'retry', true);
  record(DEPS[7], simNow - 9 * 60 * 1000, 'ok', true);
  function tick(dtSim) {
    simNow += dtSim;
    DEPS.forEach((d, k) => { while (next[k] * 1000 <= simNow) { fire(d, next[k] * 1000, false); next[k] += d.every; } });
    runs = runs.filter((r) => simNow - r.t < WINDOW);
    if (clockEl) clockEl.textContent = `${hms(simNow)} · relógio ${SPEED}× mais rápido`;
  }

  /* ---------------- Gráfico das execuções ---------------- */
  const rc = document.getElementById('pf-runs');
  const rctx = rc.getContext('2d');
  let RW = 0, RH = 0, rdpr = 1;
  const sizeRuns = () => {
    rdpr = Math.min(2, window.devicePixelRatio || 1);
    RW = rc.clientWidth; RH = rc.clientHeight;
    rc.width = Math.round(RW * rdpr); rc.height = Math.round(RH * rdpr);
  };
  const STATE_COLOR = { ok: '#7ee0a1', retry: '#e8955a', late: '#e8955a', fail: '#d64545' };
  function drawRuns() {
    rctx.setTransform(rdpr, 0, 0, rdpr, 0, 0);
    rctx.clearRect(0, 0, RW, RH);
    const LW = RW < 560 ? 104 : 168, top = 6, rowH = (RH - top - 22) / ROWS.length, x0 = LW, x1 = RW - 10;
    rctx.font = `${RW < 560 ? 10 : 11.5}px "JetBrains Mono", monospace`;
    rctx.textBaseline = 'middle';
    ROWS.forEach((label, i) => {
      const y = top + rowH * (i + 0.5);
      const dimRow = focus && DEPS.find((d) => d.row === i).frente !== focus;
      rctx.fillStyle = dimRow ? 'rgba(169, 188, 205, 0.3)' : 'rgba(233, 237, 241, 0.85)';
      rctx.textAlign = 'left';
      rctx.fillText(RW < 560 ? label.split(' · ')[0].replace('Atualização', 'Atualiz.').replace('Ocorrências', 'Ocorr.') : label, 0, y);
      rctx.strokeStyle = 'rgba(169, 188, 205, 0.1)'; rctx.lineWidth = 1;
      rctx.beginPath(); rctx.moveTo(x0, y); rctx.lineTo(x1, y); rctx.stroke();
    });
    // marcas de 5 em 5 minutos
    rctx.fillStyle = 'rgba(169, 188, 205, 0.6)'; rctx.textAlign = 'center';
    [15, 10, 5, 0].forEach((m) => {
      const x = x1 - (m * 60000 / WINDOW) * (x1 - x0);
      rctx.strokeStyle = 'rgba(169, 188, 205, 0.12)';
      rctx.beginPath(); rctx.moveTo(x, top); rctx.lineTo(x, RH - 18); rctx.stroke();
      rctx.fillText(m ? `-${m} min` : 'agora', Math.min(x1 - 14, x), RH - 8);
    });
    runs.forEach((r) => {
      const x = x1 - ((simNow - r.t) / WINDOW) * (x1 - x0);
      const y = top + rowH * (r.row + 0.5);
      const fresh = simNow - r.t < 20000;
      const dim = focus && DEPS.find((d) => d.row === r.row).frente !== focus;
      rctx.globalAlpha = dim ? 0.18 : 1;
      if (fresh && !dim) { rctx.fillStyle = hexA(STATE_COLOR[r.state], 0.25); rctx.beginPath(); rctx.arc(x, y, 8, 0, Math.PI * 2); rctx.fill(); }
      rctx.fillStyle = STATE_COLOR[r.state];
      rctx.beginPath(); rctx.arc(x, y, r.small ? 2.2 : 3.6, 0, Math.PI * 2); rctx.fill();
      rctx.globalAlpha = 1;
    });
  }

  /* ---------------- Frentes, blocos e queda simulada do worker ---------------- */
  const info = document.getElementById('pf-info');
  const kicker = document.getElementById('pf-info-kicker');
  const chips = [...sec.querySelectorAll('.pf-chip[data-frente]')];
  const cards = [...sec.querySelectorAll('.pf-frente')];
  const setFocus = (f) => {
    focus = f;
    stage.dataset.focus = f;
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.frente === f)));
    cards.forEach((c) => c.classList.toggle('is-on', c.dataset.frente === f));
    const card = cards.find((c) => c.dataset.frente === f);
    if (card) {
      kicker.textContent = card.querySelector('h4').textContent;
      info.textContent = `${card.querySelector('p').textContent} ${card.querySelectorAll('li').length} flows: ${[...card.querySelectorAll('li b')].map((b) => b.textContent).join(', ')}.`;
    } else { kicker.textContent = 'Como ler'; info.textContent = 'Cada ponto de luz é uma execução: sai da fonte, passa pelo worker e chega à camada. Escolha uma frente ou clique num bloco para ver o que ele faz.'; }
    if (reduce) drawAll(0);
  };
  chips.forEach((c) => c.addEventListener('click', () => setFocus(c.dataset.frente === focus ? '' : c.dataset.frente)));
  Object.values(nodes).forEach((n) => n.el.addEventListener('click', () => {
    kicker.textContent = n.el.querySelector('b').textContent;
    info.textContent = n.el.dataset.info;
    Object.values(nodes).forEach((m) => m.el.classList.toggle('is-picked', m === n));
  }));
  // Derrubar o worker por um instante: o monitor avisa no Teams e o autoheal reinicia o container
  const failBtn = document.createElement('button');
  failBtn.type = 'button';
  failBtn.className = 'pf-chip pf-fail';
  failBtn.innerHTML = '<i class="bi bi-lightning-charge" aria-hidden="true"></i>Simular queda do worker';
  sec.querySelector('.pf-chips').appendChild(failBtn);
  failBtn.addEventListener('click', () => {
    if (workerDown > simNow) return;
    workerDown = simNow + 90 * 1000;
    failBtn.disabled = true;
    nodes.worker.el.classList.add('is-down');
    log(simNow, 'prefect-worker', 'container sem resposta (unhealthy)', 'is-fail');
    kicker.textContent = 'Queda simulada';
    info.textContent = 'O worker parou: as execuções agendadas viram Late. O monitor de containers manda o alerta para o Teams e o autoheal reinicia o worker; depois, a fila volta a andar.';
    setTimeout(() => { send(['worker', 'mon', 'teams'], '#d64545', { size: 3.4, speed: 1.4 }); log(simNow, 'monitor', 'alerta enviado ao Teams: container fora do ar', 'is-fail'); }, 500);
    setTimeout(() => { send(['mon', 'worker'], '#7ee0a1', { size: 3, speed: 1.6 }); log(simNow, 'autoheal', 'reiniciando o worker'); }, 2000);
    setTimeout(() => {
      workerDown = 0;
      nodes.worker.el.classList.remove('is-down');
      failBtn.disabled = false;
      log(simNow, 'prefect-worker', 'de volta: a fila volta a andar');
    }, 3000);
  });

  /* ---------------- Cartões com luz que segue o cursor ---------------- */
  sec.querySelectorAll('.pf-card, .pf-kpi, .pf-frente, .pf-panel').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--x', `${e.clientX - r.left}px`);
      el.style.setProperty('--y', `${e.clientY - r.top}px`);
    });
  });

  /* ---------------- Laço ---------------- */
  const resize = () => { sizeBg(); sizeStage(); sizeRuns(); streams = Array.from({ length: Math.round(BW / 110) }, newStream); drawAll(0); };
  // No celular o mapa é mais largo que a tela: abre centrado na VM e avisa que dá para arrastar
  const scroller = stage.parentElement;
  if (scroller.scrollWidth > scroller.clientWidth + 8) {
    scroller.scrollLeft = (scroller.scrollWidth - scroller.clientWidth) * 0.45;
    const hint = document.createElement('p');
    hint.className = 'pf-swipe';
    hint.innerHTML = '<i class="bi bi-arrows-expand-vertical" aria-hidden="true"></i> Arraste o mapa para o lado para ver o caminho inteiro.';
    scroller.before(hint);
  }
  function drawAll(dt) { drawBg(performance.now(), dt); drawStage(dt); drawRuns(); }
  let last = 0, raf = 0;
  const loop = (now) => {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    tick(dt * 1000 * SPEED);
    drawAll(dt);
    raf = visible ? requestAnimationFrame(loop) : 0;
  };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (reduce) { drawAll(0); return; }
    if (visible && !raf) {
      last = 0; raf = requestAnimationFrame(loop);
      clearInterval(doTimer);
      setTimeout(runDO, 4000);
      doTimer = setInterval(runDO, 45000);
    } else if (!visible) clearInterval(doTimer);
  }, { rootMargin: '120px 0px' }).observe(sec);
  new ResizeObserver(resize).observe(stage);
  window.addEventListener('resize', resize);
  resize();
  tick(0);
  drawAll(0);
  P.prefectSim = { get total() { return total; }, get runs() { return runs.length; } };
})();
