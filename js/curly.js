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
    document.getElementById('ba-note').textContent = ba.dataset.kind === 'foto' ? 'Fotos do salão, com autorização das clientes.' : 'Bonecas de pano ilustradas aqui. No site do salão, a galeria usa fotos reais das clientes, com autorização, guardadas no Supabase Storage.';
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

})();
