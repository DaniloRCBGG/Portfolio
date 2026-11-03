// Carol Rios Curly Studio: comparação de antes e depois (a função mais usada do site) e o agendamento
// completo, do login com Google à baixa de estoque. Paleta e logo do próprio salão.
(() => {
  const root = document.getElementById('curly');
  if (!root) return;
  const P = window.PORTFOLIO;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const C = { brown: '#3d1c11', green: '#6c9335', beige: '#e5dbd1', cream: '#f4eee7', shine: '#8a5a44' };

  /* ---------------- Antes e depois ---------------- */
  const ba = document.getElementById('ba');
  // Três bonecas de pano, de pele negra, parda e retinta, uma para cada resultado
  const looks = [
    { id: 'definicao', label: 'Definição', seed: 7, coil: 1, skin: '#6b3e26', cheek: '#c2705a', dress: '#6c9335', hair: '#1c0f0a', spread: 1 },
    { id: 'volume', label: 'Volume', seed: 21, coil: 1.25, skin: '#a8724e', cheek: '#d98a72', dress: '#b9855f', hair: '#2a160d', spread: 1.25 },
    { id: 'corte', label: 'Corte e forma', seed: 42, coil: 0.85, skin: '#3e2418', cheek: '#a35a48', dress: '#3d1c11', hair: '#120a06', spread: 0.85 },
  ];
  let look = looks[0];

  // Ilustração gerada aqui: antes com a lã armada e sem definição, depois com cachos definidos.
  // Fotos reais podem entrar em img/curly/antes-N.jpg e depois-N.jpg (mesma numeração).
  const draw = (canvas, after, lk) => {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    let s = lk.seed * 97 + (after ? 13 : 5);
    const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const S = Math.min(w, h);
    const cx = w / 2, cy = h * 0.47, R = S * 0.2;
    // Fundo de tecido
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, after ? '#f6efe6' : '#ece3d8'); bg.addColorStop(1, after ? C.beige : '#dccfc2');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(61, 28, 17, 0.06)'; ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 6) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    // Corpo com vestido xadrez
    ctx.save();
    ctx.beginPath(); ctx.ellipse(cx, h * 1.02, R * 1.55, R * 1.15, 0, Math.PI, 0); ctx.closePath(); ctx.clip();
    ctx.fillStyle = lk.dress; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)'; ctx.lineWidth = S * 0.012;
    for (let x = -w; x < w * 2; x += S * 0.05) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, x); ctx.lineTo(w, x); ctx.stroke(); }
    ctx.restore();
    ctx.setLineDash([S * 0.012, S * 0.012]); ctx.strokeStyle = 'rgba(255, 250, 244, 0.8)'; ctx.lineWidth = S * 0.005;
    ctx.beginPath(); ctx.ellipse(cx, h * 1.02, R * 1.5, R * 1.1, 0, Math.PI, 0); ctx.stroke(); ctx.setLineDash([]);
    // Pescoço
    ctx.fillStyle = lk.skin; ctx.fillRect(cx - R * 0.22, cy + R * 0.8, R * 0.44, R * 0.5);

    const curl = (x, y, rr, col, shine) => {
      ctx.lineWidth = Math.max(2, S * 0.009); ctx.strokeStyle = col; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let k = 0; k <= 30; k++) { const t = (k / 30) * Math.PI * 3.4; const px = x + Math.cos(t) * rr * (1 - k / 46), py = y + Math.sin(t) * rr * 0.58 + k * rr * 0.07; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
      ctx.stroke();
      if (shine) { ctx.lineWidth = Math.max(1, S * 0.003); ctx.strokeStyle = 'rgba(160, 110, 80, 0.85)'; ctx.beginPath(); ctx.arc(x - rr * 0.25, y - rr * 0.1, rr * 0.45, Math.PI * 1.1, Math.PI * 1.65); ctx.stroke(); }
    };
    const frizz = (x, y, col) => {
      ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, S * 0.004 + r() * S * 0.004);
      ctx.beginPath(); ctx.moveTo(x, y);
      let px = x, py = y;
      for (let k = 0; k < 4; k++) { px += (r() - 0.5) * S * 0.05; py += (r() - 0.5) * S * 0.05; ctx.lineTo(px, py); }
      ctx.stroke();
    };
    const hairR = R * 1.75 * (after ? lk.spread : 1.15);
    // Cabelo de trás
    if (after) {
      for (let i = 0; i < 230; i++) {
        const a = r() * Math.PI * 2, d = hairR * Math.sqrt(r());
        const x = cx + Math.cos(a) * d, y = cy - R * 0.2 + Math.sin(a) * d * 0.88;
        if (lk.id === 'corte' && y > cy + R * 0.5) continue;
        curl(x, y, S * (0.022 + r() * 0.02) * lk.coil, lk.hair, r() < 0.6);
      }
    } else {
      ctx.fillStyle = 'rgba(28, 15, 10, 0.55)';
      ctx.beginPath(); ctx.ellipse(cx, cy - R * 0.1, hairR * 1.02, hairR * 0.92, 0, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 2200; i++) {
        const a = r() * Math.PI * 2, d = hairR * (0.25 + 0.85 * Math.sqrt(r()));
        frizz(cx + Math.cos(a) * d, cy - R * 0.1 + Math.sin(a) * d * 0.92, `rgba(${30 + r() * 40}, ${16 + r() * 20}, ${10 + r() * 10}, ${0.35 + r() * 0.5})`);
      }
    }
    // Cabeça de pano
    ctx.fillStyle = lk.skin; ctx.beginPath(); ctx.arc(cx, cy + R * 0.15, R, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = lk.skin; [-1, 1].forEach((sd) => { ctx.beginPath(); ctx.arc(cx + sd * R * 0.98, cy + R * 0.25, R * 0.18, 0, Math.PI * 2); ctx.fill(); });
    ctx.setLineDash([S * 0.01, S * 0.008]); ctx.lineWidth = S * 0.004; ctx.strokeStyle = 'rgba(255, 240, 225, 0.55)';
    ctx.beginPath(); ctx.arc(cx, cy + R * 0.15, R * 0.93, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    // Olhos de botão
    [-1, 1].forEach((sd) => {
      const ex = cx + sd * R * 0.36, ey = cy + R * 0.08, er = R * 0.13;
      ctx.fillStyle = '#16100c'; ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'; ctx.lineWidth = S * 0.003; ctx.beginPath(); ctx.arc(ex, ey, er * 0.8, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([u, v]) => { ctx.beginPath(); ctx.arc(ex + u * er * 0.3, ey + v * er * 0.3, er * 0.1, 0, Math.PI * 2); ctx.fill(); });
    });
    // Bochechas e sorriso bordado
    ctx.fillStyle = lk.cheek; ctx.globalAlpha = 0.55;
    [-1, 1].forEach((sd) => { ctx.beginPath(); ctx.ellipse(cx + sd * R * 0.55, cy + R * 0.42, R * 0.14, R * 0.09, 0, 0, Math.PI * 2); ctx.fill(); });
    ctx.globalAlpha = 1;
    ctx.setLineDash([S * 0.012, S * 0.008]); ctx.strokeStyle = '#7a2e24'; ctx.lineWidth = S * 0.007; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy + R * 0.3, R * 0.32, Math.PI * 0.18, Math.PI * 0.82); ctx.stroke(); ctx.setLineDash([]);
    // Franja por cima da testa
    if (after) {
      for (let i = 0; i < 26; i++) { const a = Math.PI * (1.08 + 0.84 * (i / 25)); const d = R * (0.95 + r() * 0.2); curl(cx + Math.cos(a) * d, cy + R * 0.15 + Math.sin(a) * d - R * 0.05, S * (0.022 + r() * 0.012) * lk.coil, lk.hair, true); }
      // Presilha no verde do salão
      ctx.fillStyle = C.green;
      for (let k = 0; k < 5; k++) { const a = (Math.PI * 2 * k) / 5; ctx.beginPath(); ctx.ellipse(cx + R * 0.95 + Math.cos(a) * R * 0.12, cy - R * 0.62 + Math.sin(a) * R * 0.12, R * 0.11, R * 0.07, a, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#f3d36b'; ctx.beginPath(); ctx.arc(cx + R * 0.95, cy - R * 0.62, R * 0.07, 0, Math.PI * 2); ctx.fill();
    } else {
      for (let i = 0; i < 260; i++) { const a = Math.PI * (1.05 + 0.9 * r()); const d = R * (0.85 + r() * 0.3); frizz(cx + Math.cos(a) * d, cy + R * 0.15 + Math.sin(a) * d, 'rgba(30, 16, 10, 0.7)'); }
    }
  };
  const tryPhoto = (src) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  const cover = (canvas, im) => { const ctx = canvas.getContext('2d'); const k = Math.max(canvas.width / im.width, canvas.height / im.height); const w = im.width * k, h = im.height * k; ctx.drawImage(im, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h); };
  const renderLook = async () => {
    const before = ba.querySelector('.ba-before canvas'), after = ba.querySelector('.ba-after canvas');
    [before, after].forEach((c) => { c.width = c.clientWidth * Math.min(2, devicePixelRatio || 1); c.height = c.clientHeight * Math.min(2, devicePixelRatio || 1); });
    const n = looks.indexOf(look) + 1;
    const [pb, pa] = await Promise.all([tryPhoto(`img/curly/antes-${n}.jpg`), tryPhoto(`img/curly/depois-${n}.jpg`)]);
    if (pb && pa) { cover(before, pb); cover(after, pa); ba.dataset.kind = 'foto'; } else { draw(before, false, look); draw(after, true, look); ba.dataset.kind = 'ilustracao'; }
    document.getElementById('ba-note').textContent = ba.dataset.kind === 'foto' ? 'Fotos do salão.' : 'Bonecas de pano ilustradas aqui; no site do salão, a galeria usa as fotos das clientes guardadas no Supabase Storage.';
  };
  const range = document.getElementById('ba-range');
  const setPos = (v) => {
    ba.style.setProperty('--pos', `${v}%`);
    range.value = v;
    range.setAttribute('aria-valuetext', `${Math.round(v)}% mostrando o depois`);
  };
  if (ba && range) {
    range.addEventListener('input', () => setPos(+range.value));
    let dragging = false;
    const fromEvent = (e) => { const r = ba.getBoundingClientRect(); setPos(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100))); };
    ba.addEventListener('pointerdown', (e) => { dragging = true; ba.setPointerCapture(e.pointerId); fromEvent(e); });
    ba.addEventListener('pointermove', (e) => { if (dragging) fromEvent(e); });
    ba.addEventListener('pointerup', () => { dragging = false; });
    document.querySelectorAll('#ba-looks button').forEach((b, i) => b.addEventListener('click', () => {
      look = looks[i];
      document.querySelectorAll('#ba-looks button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      renderLook();
      if (!reduce && window.gsap) gsap.fromTo({ v: 15 }, { v: 15 }, { v: 85, duration: 1.2, ease: 'power2.inOut', onUpdate() { setPos(this.targets()[0].v); } });
    }));
    setPos(50);
    renderLook();
    new ResizeObserver(() => renderLook()).observe(ba);
    // Na primeira vez que aparece, a linha passeia sozinha para mostrar que dá para arrastar
    if (!reduce && window.gsap && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(([e]) => { if (!e.isIntersecting) return; io.disconnect(); const o = { v: 50 }; gsap.timeline().to(o, { v: 22, duration: 0.8, ease: 'power2.inOut', onUpdate: () => setPos(o.v) }).to(o, { v: 78, duration: 1.1, ease: 'power2.inOut', onUpdate: () => setPos(o.v) }).to(o, { v: 50, duration: 0.7, ease: 'power2.inOut', onUpdate: () => setPos(o.v) }); }, { threshold: 0.6 });
      io.observe(ba);
    }
  }

  /* ---------------- Agendamento ---------------- */
  const bk = { step: 0, user: null, address: null, size: null, slot: null, state: 'livre', left: 0, timer: 0 };
  const steps = [...root.querySelectorAll('.bk-step')];
  const log = (msg) => {
    const ul = document.getElementById('bk-log');
    if (!ul) return;
    const li = document.createElement('li');
    li.innerHTML = `<time>${new Date().toLocaleTimeString('pt-BR')}</time><span>${msg}</span>`;
    ul.prepend(li);
  };
  const goStep = (k) => {
    bk.step = k;
    steps.forEach((s, i) => { s.classList.toggle('is-open', i === k); s.classList.toggle('is-done', i < k); s.querySelector('.bk-step-head').setAttribute('aria-expanded', String(i === k)); });
    if (!reduce && window.gsap) gsap.fromTo(steps[k].querySelector('.bk-step-body'), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.35 });
  };
  steps.forEach((s, i) => s.querySelector('.bk-step-head').addEventListener('click', () => { if (i <= bk.step) goStep(i); }));

  // 1. Entrar com Google (simulado: nada é enviado)
  document.getElementById('bk-google')?.addEventListener('click', (e) => {
    const b = e.currentTarget;
    b.disabled = true;
    b.innerHTML = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Conectando…';
    setTimeout(() => {
      bk.user = { name: 'Cliente de exemplo', email: 'cliente@exemplo.com' };
      document.getElementById('bk-user').innerHTML = `<span class="bk-avatar" aria-hidden="true">CE</span><span><b>${bk.user.name}</b><br><small>${bk.user.email} · entrou com Google</small></span>`;
      document.getElementById('bk-user').hidden = false;
      b.hidden = true;
      log('Cliente entrou com a conta Google. O Supabase Auth cria o perfil com permissão de cliente.');
      goStep(1);
    }, reduce ? 0 : 900);
  });

  // 2. Endereço pelo CEP (consulta real ao ViaCEP)
  const cepIn = document.getElementById('cep-input');
  cepIn?.addEventListener('input', () => { const v = cepIn.value.replace(/\D/g, '').slice(0, 8); cepIn.value = v.length > 5 ? `${v.slice(0, 5)}-${v.slice(5)}` : v; });
  document.getElementById('cep-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const out = document.getElementById('cep-out');
    const cep = cepIn.value.replace(/\D/g, '');
    if (cep.length !== 8) { out.textContent = 'Digite os 8 números do CEP.'; cepIn.focus(); return; }
    out.textContent = 'Consultando o ViaCEP…';
    try {
      const d = await (await fetch(`https://viacep.com.br/ws/${cep}/json/`)).json();
      if (d.erro) { out.textContent = 'CEP não encontrado. Confira os números e tente de novo.'; return; }
      bk.address = `${d.logradouro || 'Endereço'} · ${d.bairro || ''} · ${d.localidade}/${d.uf}`;
      out.innerHTML = `<i class="bi bi-geo-alt-fill" aria-hidden="true"></i> ${bk.address}`;
      log(`Endereço preenchido pelo ViaCEP: ${d.localidade}/${d.uf}.`);
      document.getElementById('cep-next').disabled = false;
    } catch (err) {
      out.textContent = 'Não foi possível falar com o ViaCEP agora. Você pode seguir sem o endereço.';
      document.getElementById('cep-next').disabled = false;
    }
  });
  document.getElementById('cep-next')?.addEventListener('click', () => goStep(2));

  // 3. Tamanho e horário
  const reserveBtn = document.getElementById('bk-reserve');
  const syncReserve = () => { if (reserveBtn) reserveBtn.disabled = !(bk.size && bk.slot); };
  root.querySelectorAll('#bk-sizes input').forEach((r) => r.addEventListener('change', () => { bk.size = r.value; syncReserve(); }));
  root.querySelectorAll('#bk-slots .btn').forEach((b) => b.addEventListener('click', () => {
    bk.slot = b.dataset.slot;
    root.querySelectorAll('#bk-slots .btn').forEach((x) => { x.classList.toggle('active', x === b); x.setAttribute('aria-pressed', String(x === b)); });
    syncReserve();
  }));

  // 4. Reserva de 30 min e sinal por Pix
  const clock = document.getElementById('bk-clock');
  const state = document.getElementById('bk-state');
  const paint = () => {
    state.textContent = bk.state;
    state.dataset.state = bk.state;
    clock.textContent = bk.state === 'aguardando_sinal' ? `${String(bk.left).padStart(2, '0')}:00` : '--:--';
  };
  reserveBtn?.addEventListener('click', () => {
    bk.state = 'aguardando_sinal'; bk.left = 30;
    log(`Horário das ${bk.slot} reservado para cabelo ${bk.size}. Reserva trava por 30 min enquanto o sinal não chega.`);
    clearInterval(bk.timer);
    bk.timer = setInterval(() => {
      bk.left -= 1;
      if (bk.left <= 0) { clearInterval(bk.timer); bk.state = 'expirado'; log('Sem sinal em 30 min: reserva expirada e horário liberado.'); document.getElementById('bk-confirm').disabled = true; }
      paint();
    }, 1000);
    paint();
    goStep(3);
    document.getElementById('bk-confirm').disabled = false;
  });
  document.getElementById('bk-confirm')?.addEventListener('click', (e) => {
    clearInterval(bk.timer); bk.state = 'agendado'; e.currentTarget.disabled = true;
    log('Equipe conferiu o comprovante pelo WhatsApp e confirmou o sinal: atendimento na agenda.');
    paint();
    goStep(4);
  });
  // 5. Atendimento e estoque
  document.getElementById('bk-done')?.addEventListener('click', (e) => {
    bk.state = 'concluido'; e.currentTarget.disabled = true;
    log(`Atendimento concluído: o gatilho do banco deu baixa nos produtos do serviço para cabelo ${bk.size}.`);
    P.notify?.('Estoque atualizado pelo gatilho do banco');
    paint();
    steps[4].classList.add('is-done');
  });
  document.getElementById('bk-reset')?.addEventListener('click', () => {
    clearInterval(bk.timer);
    Object.assign(bk, { step: 0, user: null, address: null, size: null, slot: null, state: 'livre', left: 0 });
    document.getElementById('bk-user').hidden = true;
    const g = document.getElementById('bk-google');
    g.hidden = false; g.disabled = false; g.innerHTML = '<i class="bi bi-google" aria-hidden="true"></i> Entrar com Google';
    root.querySelectorAll('#bk-sizes input').forEach((r) => { r.checked = false; });
    root.querySelectorAll('#bk-slots .btn').forEach((x) => { x.classList.remove('active'); x.setAttribute('aria-pressed', 'false'); });
    ['cep-next', 'bk-confirm', 'bk-done'].forEach((id) => { const b = document.getElementById(id); if (b) b.disabled = id !== 'bk-done' ? true : false; });
    document.getElementById('cep-out').textContent = 'O endereço aparece aqui.';
    syncReserve(); paint(); goStep(0);
    log('Nova simulação.');
  });
  if (state) { paint(); goStep(0); syncReserve(); }
})();
