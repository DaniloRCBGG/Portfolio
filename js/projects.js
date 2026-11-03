// Projetos: simulações e demonstrações interativas de cada projeto.
(() => {
  const P = window.PORTFOLIO;
  const reduceMotion = P.reduceMotion;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const STATE = {
    normal: { color: 'var(--st-normal)', hex: '#00a6a6', text: 'circulando sem ocorrências' },
    alert: { color: 'var(--st-alert)', hex: '#e8955a', text: 'perto de um alerta ou alagamento' },
    jammed: { color: 'var(--st-jam)', hex: '#d64545', text: 'em trecho congestionado' },
    alert_jammed: { color: 'var(--st-both)', hex: '#8e6bd8', text: 'alerta e congestionamento juntos' },
  };
  // A mesma regra do domínio compartilhado do Gêmeo (Bus.getStatus), na mesma ordem
  const getStatus = ({ isAlert, isFlooded, isJammed }) => {
    if (isAlert && isJammed) return 'alert_jammed';
    if (isAlert || isFlooded) return 'alert';
    if (isJammed) return 'jammed';
    return 'normal';
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, reduceMotion ? 0 : ms));

  /* ===================== Gêmeo: mapa ao vivo (simulação) ===================== */
  const mapEl = document.getElementById('gdn-map');
  let map = null;
  if (mapEl && window.L) {
    const center = [-22.9022, -43.1125];
    map = L.map(mapEl, { zoomControl: false, scrollWheelZoom: false, attributionControl: true }).setView(center, 14);
    // O canto esquerdo fica com o painel do estado
    L.control.zoom({ position: 'topright', zoomInTitle: 'Aproximar', zoomOutTitle: 'Afastar' }).addTo(map);
    const tileUrl = (dark) => `https://{s}.basemaps.cartocdn.com/${dark ? 'dark_all' : 'light_all'}/{z}/{x}/{y}{r}.png`;
    const isDark = () => document.documentElement.getAttribute('data-bs-theme') === 'dark';
    let tiles = L.tileLayer(tileUrl(isDark()), { maxZoom: 19, subdomains: 'abcd', attribution: '&copy; OpenStreetMap &copy; CARTO' }).addTo(map);
    document.addEventListener('themechange', () => { map.removeLayer(tiles); tiles = L.tileLayer(tileUrl(isDark()), { maxZoom: 19, subdomains: 'abcd', attribution: '&copy; OpenStreetMap &copy; CARTO' }).addTo(map); });

    // Trajeto e ocorrências fictícios; as regras e os limiares são os do Gêmeo
    const route = [[-22.8955, -43.1240], [-22.8990, -43.1190], [-22.9030, -43.1150], [-22.9065, -43.1100], [-22.9080, -43.1040], [-22.9050, -43.0990], [-22.9000, -43.1040], [-22.8965, -43.1120], [-22.8955, -43.1240]];
    const lat0 = center[0] * Math.PI / 180;
    const toXY = ([lat, lng]) => [(lng - center[1]) * Math.cos(lat0) * 111320, (lat - center[0]) * 110540];
    const toLL = ([x, y]) => [y / 110540 + center[0], x / (Math.cos(lat0) * 111320) + center[1]];
    const pts = route.map(toXY);
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = cum[cum.length - 1];
    const along = (d) => {
      d = ((d % total) + total) % total;
      let i = 1; while (cum[i] < d) i++;
      const t = (d - cum[i - 1]) / (cum[i] - cum[i - 1]);
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
    };
    const distSeg = (p, a, b) => {
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
      return Math.hypot(p[0] - (a[0] + dx * t), p[1] - (a[1] + dy * t));
    };
    const inPoly = (p, poly) => {
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i], [xj, yj] = poly[j];
        if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    };

    L.polyline(route, { color: '#6e8598', weight: 3, opacity: 0.7, dashArray: '6 6' }).addTo(map);
    const ALERT_R = 150, JAM_D = 12, RAIN_T = 6.2;
    const alertLL = [-22.9061, -43.1109];
    const alertXY = toXY(alertLL);
    const alertLayer = L.layerGroup([
      L.circle(alertLL, { radius: ALERT_R, color: '#e8955a', weight: 2, fillColor: '#e8955a', fillOpacity: 0.15 }),
      L.circleMarker(alertLL, { radius: 6, color: '#fff', weight: 2, fillColor: '#c25e2a', fillOpacity: 1 }).bindTooltip('Alerta fictício: acidente (raio de 150 m)'),
    ]);
    const jamA = pts[4], jamB = pts[5];
    const jamLayer = L.polyline([route[4], route[5]], { color: '#d64545', weight: 8, opacity: 0.75 }).bindTooltip('Lentidão fictícia: menos de 5 km/h');
    const cellLL = [[-22.8972, -43.1088], [-22.8968, -43.1005], [-22.9022, -43.0992], [-22.9038, -43.1072]];
    const cellXY = cellLL.map(toXY);
    const cellLayer = L.polygon(cellLL, { color: '#5b8fd6', weight: 1.5, fillColor: '#5b8fd6', fillOpacity: 0.08 }).bindTooltip('Área de um pluviômetro (Voronoi)');
    cellLayer.addTo(map);

    const buses = Array.from({ length: 9 }, (_, i) => ({
      id: String(i + 1).padStart(2, '0'), d: (total / 9) * i, v: 55 + (i % 3) * 12, status: 'normal',
      marker: L.circleMarker([0, 0], { radius: 7, color: '#ffffff', weight: 2, fillColor: STATE.normal.hex, fillOpacity: 1 }).addTo(map),
    }));
    buses.forEach((b) => b.marker.bindTooltip(() => `Ônibus fictício ${b.id} · ${b.status}`));

    const ctl = { alert: $('#sim-alert'), jam: $('#sim-jam'), rain: $('#sim-rain'), rainOut: $('#sim-rain-out'), play: $('#sim-play') };
    const counts = $('#sim-counts');
    const cycleBar = $('#sim-cycle i');
    const lastCycle = $('#sim-last');
    let rainMm = parseFloat(ctl.rain?.value || '0');
    const syncLayers = () => {
      if (ctl.alert.checked) alertLayer.addTo(map); else alertLayer.remove();
      if (ctl.jam.checked) jamLayer.addTo(map); else jamLayer.remove();
      rainMm = parseFloat(ctl.rain.value);
      const over = rainMm >= RAIN_T;
      ctl.rainOut.textContent = `${rainMm.toFixed(1).replace('.', ',')} mm em 15 min${over ? ' · alerta de chuva' : ''}`;
      ctl.rainOut.classList.toggle('is-over', over);
      cellLayer.setStyle({ fillOpacity: over ? 0.32 : 0.08, color: over ? '#e8955a' : '#5b8fd6' });
    };
    ['change', 'input'].forEach((ev) => [ctl.alert, ctl.jam, ctl.rain].forEach((c) => c?.addEventListener(ev, syncLayers)));
    syncLayers();

    // O estado só muda no ciclo, como no BFF: as posições andam o tempo todo, as cores a cada ciclo
    const CYCLE = 3000;
    let cycleStart = performance.now(), running = !reduceMotion, lastT = 0;
    const cycle = () => {
      const tally = { normal: 0, alert: 0, jammed: 0, alert_jammed: 0 };
      buses.forEach((b) => {
        const p = along(b.d);
        const isAlert = ctl.alert.checked && Math.hypot(p[0] - alertXY[0], p[1] - alertXY[1]) <= ALERT_R;
        const isJammed = ctl.jam.checked && distSeg(p, jamA, jamB) <= JAM_D;
        const isFlooded = rainMm >= RAIN_T && inPoly(p, cellXY);
        b.status = getStatus({ isAlert, isFlooded, isJammed });
        b.marker.setStyle({ fillColor: STATE[b.status].hex });
        tally[b.status]++;
      });
      counts.innerHTML = Object.keys(STATE).map((k) => `<span><i style="background:${STATE[k].color}"></i>${k} ${tally[k]}</span>`).join('');
      lastCycle.textContent = new Date().toLocaleTimeString('pt-BR');
    };
    const frame = (t) => {
      const dt = Math.min(0.1, (t - (lastT || t)) / 1000);
      lastT = t;
      if (running) {
        buses.forEach((b) => { b.d += b.v * dt; b.marker.setLatLng(toLL(along(b.d))); });
        const k = (t - cycleStart) / CYCLE;
        cycleBar.style.width = `${Math.min(1, k) * 100}%`;
        if (k >= 1) { cycleStart = t; cycle(); }
      }
      requestAnimationFrame(frame);
    };
    buses.forEach((b) => b.marker.setLatLng(toLL(along(b.d))));
    cycle();
    requestAnimationFrame(frame);
    const paintPlay = () => {
      ctl.play.innerHTML = running ? '<i class="bi bi-pause-fill" aria-hidden="true"></i> Pausar simulação' : '<i class="bi bi-play-fill" aria-hidden="true"></i> Continuar simulação';
      ctl.play.setAttribute('aria-pressed', String(!running));
    };
    ctl.play?.addEventListener('click', () => { running = !running; lastT = 0; cycleStart = performance.now(); paintPlay(); });
    $('#sim-cycle-now')?.addEventListener('click', () => { cycleStart = performance.now(); cycle(); });
    paintPlay();
    document.addEventListener('visibilitychange', () => { if (document.hidden) lastT = 0; });
  } else if (mapEl) {
    mapEl.innerHTML = '<p class="p-4 mb-0">O mapa não carregou. As regras da simulação continuam explicadas na aba “Regras e limiares”.</p>';
  }
  document.querySelectorAll('[data-bs-toggle="tab"]').forEach((t) => t.addEventListener('shown.bs.tab', () => map?.invalidateSize()));

  /* ===================== Gêmeo: ciclo de 30 segundos ===================== */
  const cycleSteps = $$('#cycle-steps .step');
  const cycleDetail = $('#cycle-detail');
  const showStep = (s) => {
    cycleSteps.forEach((x) => x.setAttribute('aria-pressed', String(x === s)));
    cycleDetail.innerHTML = `<b>${s.querySelector('b').textContent}.</b> ${s.dataset.detail}`;
  };
  cycleSteps.forEach((s) => s.addEventListener('click', () => showStep(s)));
  $('#cycle-run')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    cycleSteps.forEach((s) => s.classList.remove('is-lit'));
    for (const s of cycleSteps) { s.classList.add('is-lit'); showStep(s); await wait(900); }
    await wait(600);
    cycleSteps.forEach((s) => s.classList.remove('is-lit'));
    btn.disabled = false;
  });
  if (cycleSteps[0]) showStep(cycleSteps[0]);

  // Diferencial de três vias do flow de alertas
  const diffOut = $('#diff-out');
  $$('#diff-buttons button').forEach((b) => b.addEventListener('click', () => {
    $$('#diff-buttons button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    diffOut.innerHTML = b.dataset.result;
  }));

  /* ===================== Gêmeo: camadas ===================== */
  const layerRows = $$('#layer-table tbody tr');
  const failSwitch = $('#layer-fail');
  const failNote = $('#layer-fail-note');
  const paintLayers = () => {
    const onlyCross = $('#layer-only-cross')?.checked;
    const fail = failSwitch?.checked;
    layerRows.forEach((tr) => {
      tr.hidden = onlyCross && tr.dataset.cross !== 'sim';
      const off = fail && tr.dataset.kind === 'memoria';
      tr.classList.toggle('is-off', off);
      tr.querySelector('.layer-state').textContent = off ? 'apagou' : 'na tela';
    });
    failNote.hidden = !fail;
  };
  ['change'].forEach((ev) => { failSwitch?.addEventListener(ev, paintLayers); $('#layer-only-cross')?.addEventListener(ev, paintLayers); });
  if (layerRows.length) paintLayers();

  /* ===================== Gêmeo: regras ===================== */
  const ruleFlags = { isAlert: false, isFlooded: false, isJammed: false };
  const ruleLines = $$('#rule-code [data-line]');
  const paintRule = () => {
    const st = getStatus(ruleFlags);
    $('#rule-dot').style.background = STATE[st].color;
    $('#rule-code-out').textContent = st;
    $('#rule-text').textContent = STATE[st].text;
    ruleLines.forEach((l) => l.classList.toggle('hl', l.dataset.line === st));
  };
  $$('#rule-toggles .btn').forEach((b) => b.addEventListener('click', () => {
    ruleFlags[b.dataset.flag] = !ruleFlags[b.dataset.flag];
    b.setAttribute('aria-pressed', String(ruleFlags[b.dataset.flag]));
    b.classList.toggle('active', ruleFlags[b.dataset.flag]);
    paintRule();
  }));
  if (ruleLines.length) paintRule();

  // O contrato invisível entre três repositórios
  const chainSwitch = $('#chain-break');
  chainSwitch?.addEventListener('change', () => {
    const broken = chainSwitch.checked;
    $('#chain-prefect').innerHTML = broken ? '"Inundação"<small>Prefect traduz (nome trocado)</small>' : '"Alagamento"<small>Prefect traduz</small>';
    $('#chain-prefect').classList.toggle('is-changed', broken);
    $('#chain-bff').innerHTML = broken ? 'subtipo_alerta: "inundação"<small>BFF normaliza</small>' : 'subtipo_alerta: "alagamento"<small>BFF normaliza</small>';
    $('#chain-render').classList.toggle('is-broken', broken);
    $('#chain-render').innerHTML = broken ? 'value: "alagamento" ≠ "inundação"<small>renderer não acha o valor: o ícone some</small>' : 'value: "alagamento" → <i class="bi bi-water"></i><small>renderer mostra o ícone</small>';
    $('#chain-msg').textContent = broken
      ? 'O ícone de alagamento desapareceu do mapa, sem erro, sem aviso e sem build quebrado.'
      : 'Tudo certo: a mesma string atravessa os três repositórios até virar ícone.';
  });

  /* ===================== Gêmeo: maturidade ===================== */
  const levels = $$('#maturity .level');
  const levelDetail = $('#maturity-detail');
  levels.forEach((l) => l.addEventListener('click', () => {
    levels.forEach((x) => x.setAttribute('aria-pressed', String(x === l)));
    levelDetail.textContent = l.dataset.detail;
  }));

  /* ===================== Curly Studio: agendamento ===================== */
  const bk = {
    size: null, slot: null, state: 'livre', left: 0, timer: 0,
    el: { status: $('#bk-status'), dot: $('#bk-dot'), clock: $('#bk-clock'), log: $('#bk-log'), reserve: $('#bk-reserve'), confirm: $('#bk-confirm'), done: $('#bk-done'), reset: $('#bk-reset') },
  };
  const BK_COLOR = { livre: 'var(--st-off)', aguardando_sinal: 'var(--st-alert)', agendado: 'var(--st-normal)', concluido: 'var(--accent-fill)', expirado: 'var(--st-jam)' };
  const BK_STEP = { livre: [], aguardando_sinal: ['site', 'reserva', 'pix'], agendado: ['site', 'reserva', 'pix', 'equipe'], concluido: ['site', 'reserva', 'pix', 'equipe', 'estoque'], expirado: ['site', 'reserva'] };
  const log = (msg) => {
    if (!bk.el.log) return;
    const li = document.createElement('li');
    li.innerHTML = `<time>${new Date().toLocaleTimeString('pt-BR')}</time><span>${msg}</span>`;
    bk.el.log.prepend(li);
  };
  const paintBk = () => {
    const { el } = bk;
    el.status.textContent = bk.state;
    el.dot.style.background = BK_COLOR[bk.state];
    const mm = String(Math.floor(bk.left)).padStart(2, '0');
    el.clock.textContent = bk.state === 'aguardando_sinal' ? `${mm}:00` : '--:--';
    el.reserve.disabled = !(bk.size && bk.slot) || bk.state !== 'livre';
    el.confirm.disabled = bk.state !== 'aguardando_sinal';
    el.done.disabled = bk.state !== 'agendado';
    $$('#bk-flow .step').forEach((s) => {
      s.classList.toggle('is-lit', BK_STEP[bk.state].includes(s.dataset.node));
      s.classList.toggle('is-fail', bk.state === 'expirado' && s.dataset.node === 'pix');
    });
    $$('#bk-slots .btn').forEach((b) => { b.disabled = bk.state !== 'livre' && b.dataset.slot !== bk.slot; });
  };
  $$('#bk-sizes input').forEach((r) => r.addEventListener('change', () => { bk.size = r.value; paintBk(); }));
  $$('#bk-slots .btn').forEach((b) => b.addEventListener('click', () => {
    if (bk.state !== 'livre') return;
    bk.slot = b.dataset.slot;
    $$('#bk-slots .btn').forEach((x) => x.classList.toggle('active', x === b));
    paintBk();
  }));
  bk.el.reserve?.addEventListener('click', () => {
    bk.state = 'aguardando_sinal'; bk.left = 30;
    log(`Horário das ${bk.slot} reservado para cabelo ${bk.size}. Pix do sinal pendente.`);
    clearInterval(bk.timer);
    bk.timer = setInterval(() => {
      bk.left -= 1;
      if (bk.left <= 0) {
        clearInterval(bk.timer); bk.state = 'expirado';
        log('Sem sinal em 30 min: reserva expirada e horário liberado.');
      }
      paintBk();
    }, 1000);
    paintBk();
  });
  bk.el.confirm?.addEventListener('click', () => {
    clearInterval(bk.timer); bk.state = 'agendado';
    log('Equipe conferiu o comprovante pelo WhatsApp e confirmou o sinal.');
    paintBk();
  });
  bk.el.done?.addEventListener('click', () => {
    bk.state = 'concluido';
    log(`Atendimento concluído: o gatilho do banco deu baixa nos produtos do serviço para cabelo ${bk.size}.`);
    P.notify?.('Estoque atualizado pelo gatilho do banco');
    paintBk();
  });
  bk.el.reset?.addEventListener('click', () => {
    clearInterval(bk.timer); bk.state = 'livre'; bk.slot = null; bk.left = 0;
    $$('#bk-slots .btn').forEach((x) => x.classList.remove('active'));
    log('Nova simulação.');
    paintBk();
  });
  if (bk.el.status) paintBk();

  /* ===================== Curly Studio: ViaCEP ao vivo ===================== */
  const cepForm = $('#cep-form');
  cepForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = $('#cep-input');
    const out = $('#cep-out');
    const cep = input.value.replace(/\D/g, '');
    if (cep.length !== 8) { out.innerHTML = '<span class="text-danger-emphasis">Digite os 8 números do CEP.</span>'; input.focus(); return; }
    out.textContent = 'Consultando o ViaCEP…';
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const d = await res.json();
      if (d.erro) { out.textContent = 'CEP não encontrado. Confira os números e tente de novo.'; return; }
      out.innerHTML = `<dl class="row mb-0 small">
        <dt class="col-4">Logradouro</dt><dd class="col-8">${d.logradouro || '—'}</dd>
        <dt class="col-4">Bairro</dt><dd class="col-8">${d.bairro || '—'}</dd>
        <dt class="col-4">Cidade</dt><dd class="col-8">${d.localidade} – ${d.uf}</dd></dl>`;
    } catch (err) {
      out.textContent = 'Não foi possível falar com o ViaCEP agora. Verifique a conexão e tente de novo.';
    }
  });
  $('#cep-input')?.addEventListener('input', (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 8);
    e.target.value = v.length > 5 ? `${v.slice(0, 5)}-${v.slice(5)}` : v;
  });

  /* ===================== n8n: envio simulado ===================== */
  const editor = $('#n8n-json');
  const presets = {
    ok: { event_id: 'evt-0001', source: 'sistema-exemplo', timestamp: '2026-03-10T14:32:00-03:00', data: { tipo: 'teste', descricao: 'payload de exemplo' } },
    semTimestamp: { event_id: 'evt-0002', source: 'sistema-exemplo', data: { tipo: 'teste' } },
    dataInvalida: { event_id: 'evt-0003', source: 'sistema-exemplo', timestamp: '10/03/2026', data: { tipo: 'teste' } },
    lista: [{ event_id: 'evt-0004', source: 'sistema-exemplo', timestamp: '2026-03-10T15:00:00-03:00', data: { tipo: 'lote' } }],
  };
  const setPreset = (k) => { editor.value = JSON.stringify(presets[k], null, 2); };
  $$('#n8n-presets button').forEach((b) => b.addEventListener('click', () => { setPreset(b.dataset.preset); $$('#n8n-presets button').forEach((x) => x.classList.toggle('active', x === b)); }));
  if (editor) setPreset('ok');
  const validate = (body) => {
    // Como no Code Node: aceita objeto ou lista com um evento
    const ev = Array.isArray(body) ? body[0] : body;
    if (!ev || typeof ev !== 'object') return 'o corpo precisa ser um objeto JSON (ou uma lista com um evento)';
    for (const f of ['event_id', 'source', 'timestamp', 'data']) if (!(f in ev)) return `falta o campo ${f}`;
    if (typeof ev.event_id !== 'string' || !ev.event_id) return 'event_id precisa ser um texto';
    if (typeof ev.source !== 'string' || !ev.source) return 'source precisa ser um texto';
    if (Number.isNaN(Date.parse(ev.timestamp)) || !/^\d{4}-\d{2}-\d{2}T/.test(ev.timestamp)) return 'timestamp precisa estar em ISO 8601 (ex.: 2026-03-10T14:32:00-03:00)';
    if (typeof ev.data !== 'object' || ev.data === null || Array.isArray(ev.data)) return 'data precisa ser um objeto';
    return null;
  };
  const rowsBody = $('#n8n-rows');
  let saved = 0;
  $('#n8n-send')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const steps = $$('#n8n-flow .step');
    const out = $('#n8n-out');
    const dot = $('#n8n-dot');
    btn.disabled = true;
    steps.forEach((s) => s.classList.remove('is-lit', 'is-fail', 'is-skip'));
    const lit = async (node, fail) => { const s = steps.find((x) => x.dataset.node === node); s.classList.add(fail ? 'is-fail' : 'is-lit'); await wait(500); };
    const finish = (ok, msg) => {
      dot.style.background = ok ? 'var(--st-normal)' : 'var(--st-jam)';
      out.innerHTML = msg;
      steps.filter((s) => !s.classList.contains('is-lit') && !s.classList.contains('is-fail')).forEach((s) => s.classList.add('is-skip'));
      btn.disabled = false;
    };
    dot.style.background = 'var(--st-off)';
    out.textContent = 'Executando…';
    if (!$('#n8n-auth').checked) { await lit('webhook', true); finish(false, '<b>Requisição recusada pelo Webhook.</b> Sem o token Bearer, o fluxo nem começa.'); return; }
    await lit('webhook');
    let body;
    try { body = JSON.parse(editor.value); } catch (err) { await lit('code', true); finish(false, '<b>Code Node:</b> o texto não é um JSON válido.'); return; }
    await lit('code');
    const problem = validate(body);
    if (problem) { await lit('if', true); finish(false, `<b>IF → caminho de erro:</b> ${problem}. Nada é gravado no banco.`); return; }
    await lit('if');
    await lit('pg');
    await lit('resp');
    const ev = Array.isArray(body) ? body[0] : body;
    saved += 1;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${saved}</td><td>${String(ev.event_id).slice(0, 24)}</td><td>${String(ev.source).slice(0, 24)}</td><td>${String(ev.timestamp).slice(0, 25)}</td>`;
    rowsBody.querySelector('.empty')?.remove();
    rowsBody.prepend(tr);
    finish(true, `<b>HTTP 200.</b> Evento ${Array.isArray(body) ? 'da lista ' : ''}conferido e gravado em <code>webhook_events</code>.`);
  });

  /* ===================== Outros projetos: detalhes em modal ===================== */
  const dm = document.getElementById('detail-modal');
  $$('[data-modal]').forEach((b) => b.addEventListener('click', () => {
    const tpl = document.getElementById(b.dataset.modal);
    if (!dm || !tpl || !window.bootstrap) return;
    dm.querySelector('.modal-title').textContent = b.dataset.title;
    dm.querySelector('.modal-body').innerHTML = tpl.innerHTML;
    bootstrap.Modal.getOrCreateInstance(dm).show();
  }));
})();
