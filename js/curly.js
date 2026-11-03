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
  const looks = [
    { id: 'definicao', label: 'Definição', seed: 7, coil: 1 },
    { id: 'volume', label: 'Volume', seed: 21, coil: 1.35 },
    { id: 'corte', label: 'Corte e forma', seed: 42, coil: 0.8 },
  ];
  let look = looks[0];

  // Ilustração gerada: antes com fios armados e sem definição, depois com cachos definidos.
  // Fotos reais podem entrar em img/curly/antes-N.jpg e depois-N.jpg (mesma numeração dos looks).
  const draw = (canvas, after, lk) => {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    let s = lk.seed * (after ? 3 : 1) + 11;
    const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, after ? C.cream : '#ece4db'); g.addColorStop(1, after ? C.beige : '#d9cec3');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h * 0.47, R = Math.min(w, h) * 0.3 * (after ? lk.coil : 1.05);
    // Silhueta
    ctx.fillStyle = 'rgba(61, 28, 17, 0.9)';
    ctx.beginPath(); ctx.ellipse(cx, h * 0.98, w * 0.26, h * 0.2, 0, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx, cy + R * 0.35, R * 0.42, R * 0.52, 0, 0, Math.PI * 2); ctx.fill();
    if (!after) {
      // Fios armados: muitos traços curtos e irregulares
      ctx.lineCap = 'round';
      for (let i = 0; i < 1600; i++) {
        const a = r() * Math.PI * 2, d = R * Math.sqrt(r()) * 1.05;
        const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.9 - R * 0.15;
        ctx.strokeStyle = `rgba(61, 28, 17, ${0.25 + r() * 0.5})`;
        ctx.lineWidth = 0.8 + r() * 1.2;
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.lineTo(x + (r() - 0.5) * 14, y + (r() - 0.5) * 14); ctx.lineTo(x + (r() - 0.5) * 18, y + (r() - 0.5) * 18); ctx.stroke();
      }
    } else {
      // Cachos definidos: molas com brilho
      for (let i = 0; i < 260; i++) {
        const a = r() * Math.PI * 2, d = R * Math.sqrt(r());
        const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.92 - R * 0.12;
        const rr = 6 + r() * 7 * lk.coil;
        ctx.lineWidth = 2.6;
        ctx.strokeStyle = C.brown;
        ctx.beginPath();
        for (let k = 0; k <= 26; k++) { const t = (k / 26) * Math.PI * 3.2; const px = x + Math.cos(t) * rr * (1 - k / 40), py = y + Math.sin(t) * rr * 0.55 + k * 0.9; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
        ctx.stroke();
        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(138, 90, 68, 0.9)';
        ctx.beginPath(); ctx.arc(x - rr * 0.3, y - rr * 0.1, rr * 0.45, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
      }
      ctx.fillStyle = C.green;
      ctx.beginPath(); ctx.ellipse(cx + R * 0.72, cy - R * 0.62, 9, 4.5, -0.6, 0, Math.PI * 2); ctx.fill();
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
    document.getElementById('ba-note').textContent = ba.dataset.kind === 'foto' ? 'Fotos do salão.' : 'Ilustração gerada aqui; no site do salão, a galeria usa as fotos guardadas no Supabase Storage.';
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
