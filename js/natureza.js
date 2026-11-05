// Salão: um ar de natureza na paleta do salão (bege terroso, terra e verde-oliva), a partir do
// comunicado de reajuste da marca. Nos cantos, plantas: costela-de-adão, samambaias, a mancha terrosa e a
// folha oliva. No fundo, um tapete de veludo: o cursor (ou o dedo) deixa um rastro mais claro, liso, que
// volta ao normal devagar, como pelo que se assenta de novo.
(() => {
  const sec = document.getElementById('curly');
  if (!sec) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const C = { terra: '#67270b', terraClara: '#7d4b33', oliva: '#6f652b', olivaEscura: '#57501f', folha: '#3f4a1a', folhaClara: '#5d6b2c', linha: '#8a7d3e' };
  const rng = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  /* ---------------- Plantas nos cantos ---------------- */
  // Samambaia: um eixo curvo com folíolos alternados que diminuem até a ponta
  const fern = (x0, y0, x1, y1, bend, size, color, seed) => {
    const R = rng(seed);
    const cx = (x0 + x1) / 2 + bend, cy = (y0 + y1) / 2 - Math.abs(bend) * 0.3;
    const pt = (t) => [(1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1, (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1];
    let s = `<path d="M${x0} ${y0} Q${cx} ${cy} ${x1} ${y1}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`;
    const n = 22;
    for (let i = 2; i < n; i++) {
      const t = i / n;
      const [x, y] = pt(t), [xa, ya] = pt(Math.min(1, t + 0.01));
      const a = (Math.atan2(ya - y, xa - x) * 180) / Math.PI;
      const len = size * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (0.85 + R() * 0.25);
      [-1, 1].forEach((side) => {
        s += `<path d="M0 0 C${(len * 0.3).toFixed(1)} ${(-len * 0.2).toFixed(1)} ${(len * 0.8).toFixed(1)} ${(-len * 0.16).toFixed(1)} ${len.toFixed(1)} 0 C${(len * 0.8).toFixed(1)} ${(len * 0.16).toFixed(1)} ${(len * 0.3).toFixed(1)} ${(len * 0.2).toFixed(1)} 0 0Z" fill="${color}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(a + side * (62 - t * 18)).toFixed(0)})"/>`;
      });
    }
    return s;
  };
  // Costela-de-adão: folha em coração com recortes, nervura central e um degradê de luz
  const polar = (a, r) => [150 + Math.cos(((a - 90) * Math.PI) / 180) * r, 150 + Math.sin(((a - 90) * Math.PI) / 180) * r];
  const monstera = (id) => {
    const cortes = [[-66, 62], [-42, 74], [-16, 80], [12, 80], [38, 74], [62, 64], [84, 52]].map(([a, r0]) => {
      const [x0, y0] = polar(a, r0), [x1, y1] = polar(a, 170);
      return `<path d="M${x0.toFixed(0)} ${y0.toFixed(0)} L${x1.toFixed(0)} ${y1.toFixed(0)}" stroke="#000" stroke-width="8" stroke-linecap="round"/>`;
    }).join('');
    const furos = [[-52, 48], [-26, 54], [4, 56], [30, 52], [54, 44]].map(([a, r]) => {
      const [x, y] = polar(a, r);
      return `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="4.5" ry="9" transform="rotate(${a} ${x.toFixed(0)} ${y.toFixed(0)})" fill="#000"/>`;
    }).join('');
    return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.folhaClara}"/><stop offset="1" stop-color="${C.folha}"/></linearGradient>
      <mask id="${id}-m" maskUnits="userSpaceOnUse" x="0" y="0" width="300" height="300"><rect width="300" height="300" fill="#fff"/>${cortes}${furos}</mask></defs>
      <path d="M150 268 C70 250 20 190 22 128 C24 66 78 22 140 30 C150 32 156 40 158 52 C168 34 190 26 214 32 C262 46 284 100 276 150 C266 216 214 258 150 268 Z" fill="url(#${id})" mask="url(#${id}-m)"/>
      <path d="M150 268 C150 210 154 120 156 52" fill="none" stroke="#8f9a55" stroke-opacity=".55" stroke-width="2.4"/>
      <path d="M150 300 L150 266" stroke="${C.folha}" stroke-width="5" stroke-linecap="round"/>`;
  };
  const CORNERS = {
    tl: () => `<svg viewBox="0 0 300 300">
      <defs><linearGradient id="cs-terra" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.terra}"/><stop offset="1" stop-color="${C.terraClara}"/></linearGradient></defs>
      <path d="M0 0 H230 C200 40 210 90 170 120 C120 158 70 120 40 170 C26 194 18 230 0 250 Z" fill="url(#cs-terra)"/>
      <path d="M10 270 C60 236 72 172 52 118" fill="none" stroke="${C.linha}" stroke-width="1.6"/>
      <g class="cs-sway" style="--o:30px 0px">${fern(30, 0, 150, 200, -40, 22, C.oliva, 3)}</g></svg>`,
    tr: () => `<svg viewBox="0 0 300 300"><g class="cs-sway" style="--o:300px 0px">${fern(300, 10, 140, 150, 30, 26, C.folhaClara, 7)}${fern(292, 0, 210, 220, -26, 20, C.oliva, 11)}</g>
      <path d="M300 236 C250 224 210 182 200 120" fill="none" stroke="${C.linha}" stroke-width="1.6"/></svg>`,
    bl: () => `<svg viewBox="0 0 300 300">
      <path d="M0 300 V120 C70 110 150 160 170 240 C176 262 178 284 176 300 Z" fill="${C.oliva}"/>
      <path d="M0 150 C60 150 130 200 150 300" fill="none" stroke="#8f8648" stroke-opacity=".6" stroke-width="2"/>
      <path d="M40 30 C120 64 172 140 204 300" fill="none" stroke="${C.linha}" stroke-width="1.6"/>
      <g class="cs-sway" style="--o:10px 300px">${fern(10, 300, 160, 100, 40, 20, C.folhaClara, 13)}</g></svg>`,
    br: () => `<svg viewBox="0 0 300 300"><g class="cs-sway is-slow" style="--o:300px 300px">${fern(300, 300, 170, 130, 30, 18, C.oliva, 17)}</g>
      <g class="cs-sway" style="--o:300px 300px"><g transform="translate(70 66) rotate(-30 150 150)">${monstera('cs-mon')}</g></g></svg>`,
  };
  const fillCorners = () => {
    sec.querySelectorAll('.cs-corner').forEach((el) => { const k = el.dataset.corner; if (CORNERS[k] && !el.firstChild) el.innerHTML = CORNERS[k](); });
  };

  /* ---------------- Tapete de veludo ---------------- */
  const cv = sec.querySelector('.cs-velvet');
  const ctx = cv.getContext('2d');
  const trail = document.createElement('canvas');
  const tctx = trail.getContext('2d');
  let W = 0, dpr = 1, raf = 0, lastInk = 0;
  const size = () => {
    dpr = Math.min(1.5, window.devicePixelRatio || 1);
    W = cv.clientWidth;
    [cv, trail].forEach((c) => { c.width = Math.round(cv.clientWidth * dpr); c.height = Math.round(cv.clientHeight * dpr); });
  };
  // Escova macia: o pelo deitado reflete mais luz, então o rastro fica mais claro e sem textura
  const stamp = (x, y, r) => {
    const g = tctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255, 247, 238, 0.26)');
    g.addColorStop(0.6, 'rgba(255, 247, 238, 0.13)');
    g.addColorStop(1, 'rgba(255, 246, 236, 0)');
    tctx.fillStyle = g;
    tctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  const draw = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(trail, 0, 0);
  };
  // O pelo volta a se assentar: o rastro some aos poucos (perde ~60% por segundo), e o laço para quando não há
  // mais nada. O apagamento vai em passos de ~70 ms: com passos pequenos demais, o arredondamento do canvas
  // deixaria um resto claro parado.
  let tPrev = 0, acc = 0;
  const loop = (now) => {
    acc += Math.min(200, now - (tPrev || now)); tPrev = now;
    if (acc >= 70) {
      tctx.setTransform(1, 0, 0, 1, 0, 0);
      tctx.globalCompositeOperation = 'destination-out';
      tctx.fillStyle = `rgba(0, 0, 0, ${(1 - Math.pow(0.4, acc / 1000)).toFixed(3)})`;
      tctx.fillRect(0, 0, trail.width, trail.height);
      tctx.globalCompositeOperation = 'source-over';
      acc = 0;
    }
    draw();
    raf = now - lastInk < 5000 ? requestAnimationFrame(loop) : 0;
    if (!raf) { tPrev = 0; acc = 0; tctx.clearRect(0, 0, trail.width, trail.height); draw(); }
  };
  let last = null;
  const brush = (cx, cy) => {
    const rect = cv.getBoundingClientRect();
    const x = (cx - rect.left) * dpr, y = (cy - rect.top) * dpr;
    const r = (W < 600 ? 42 : 52) * dpr;
    tctx.setTransform(1, 0, 0, 1, 0, 0);
    if (last && performance.now() - last.t < 160) {
      const d = Math.hypot(x - last.x, y - last.y);
      const n = Math.min(40, Math.ceil(d / (r / 4)));
      for (let i = 1; i <= n; i++) stamp(last.x + ((x - last.x) * i) / n, last.y + ((y - last.y) * i) / n, r);
    } else stamp(x, y, r);
    last = { x, y, t: performance.now() };
    lastInk = performance.now();
    if (reduce) { draw(); return; }
    if (!raf) raf = requestAnimationFrame(loop);
  };
  sec.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') brush(e.clientX, e.clientY); });
  sec.addEventListener('pointerleave', () => { last = null; });
  sec.addEventListener('touchstart', (e) => { last = null; if (e.touches[0]) brush(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  sec.addEventListener('touchmove', (e) => { if (e.touches[0]) brush(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });

  let lastW = 0, lastH = 0;
  const resize = () => {
    if (cv.clientWidth !== lastW || cv.clientHeight !== lastH) { lastW = cv.clientWidth; lastH = cv.clientHeight; size(); draw(); }
    fillCorners();
  };
  window.addEventListener('resize', resize);
  resize();
})();
