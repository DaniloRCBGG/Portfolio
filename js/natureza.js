// Salão: um ar de natureza, como pede o guia da marca (formas orgânicas, terra, areia e folha).
// No fundo, uma textura de grãos finos que o cursor ou o dedo sopram como uma brisa, com sementes e
// pétalas levadas pelo vento. Nas laterais, ramos com folhas e flores que oscilam devagar.
(() => {
  const sec = document.getElementById('curly');
  if (!sec) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const C = { terra: '#3d1c11', areia: '#e5dbd1', folha: '#6c9335', folhaEscura: '#4a6b22', clara: '#f4efe9' };
  const rng = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  /* ---------------- Ramos floridos nas laterais ---------------- */
  const bez = (p, t) => { const u = 1 - t; return [0, 1].map((k) => u * u * u * p[0][k] + 3 * u * u * t * p[1][k] + 3 * u * t * t * p[2][k] + t * t * t * p[3][k]); };
  const ang = (p, t) => { const a = bez(p, Math.max(0, t - 0.01)), b = bez(p, Math.min(1, t + 0.01)); return (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI; };
  const LEAF = 'M0 0 C9 -11 30 -12 44 0 C30 12 9 11 0 0 Z';
  const flower = (x, y, r, petal, centro, rot) => {
    let s = `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(0)})">`;
    for (let i = 0; i < 5; i++) s += `<ellipse cx="0" cy="${(-r * 0.62).toFixed(1)}" rx="${(r * 0.42).toFixed(1)}" ry="${(r * 0.62).toFixed(1)}" fill="${petal}" transform="rotate(${i * 72})"/>`;
    return `${s}<circle r="${(r * 0.3).toFixed(1)}" fill="${centro}"/></g>`;
  };
  // Um ramo: caule curvo, folhas alternadas com nervura e flores (ou botões) nas pontas
  const sprig = (seed) => {
    const R = rng(seed);
    const stem = [[18, 300], [20 + R() * 30, 210], [70 + R() * 40, 150], [92 + R() * 30, 30 + R() * 20]];
    let s = `<path d="M${stem[0][0]} ${stem[0][1]} C${stem[1][0]} ${stem[1][1]} ${stem[2][0]} ${stem[2][1]} ${stem[3][0]} ${stem[3][1]}" fill="none" stroke="${C.folhaEscura}" stroke-width="2.4" stroke-linecap="round"/>`;
    [0.18, 0.3, 0.42, 0.55, 0.68, 0.8].forEach((t, i) => {
      const [x, y] = bez(stem, t);
      const a = ang(stem, t) + (i % 2 ? 58 : -58) + (R() - 0.5) * 18;
      const k = 0.55 + R() * 0.45;
      const fill = R() < 0.5 ? C.folha : C.folhaEscura;
      s += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${a.toFixed(0)}) scale(${k.toFixed(2)})"><path d="${LEAF}" fill="${fill}"/><path d="M3 0 H38" stroke="${C.clara}" stroke-opacity=".55" stroke-width="1.1"/></g>`;
    });
    // galhinho lateral com um botão
    const [bx, by] = bez(stem, 0.48);
    const tx = bx + 38 + R() * 16, ty = by - 26 - R() * 20;
    s += `<path d="M${bx.toFixed(1)} ${by.toFixed(1)} Q${(bx + 20).toFixed(1)} ${(by - 4).toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)}" fill="none" stroke="${C.folhaEscura}" stroke-width="1.6" stroke-linecap="round"/>`;
    s += flower(tx, ty, 9 + R() * 3, R() < 0.5 ? C.areia : '#ffffff', C.folha, R() * 70);
    const [fx, fy] = stem[3];
    s += flower(fx, fy, 15 + R() * 5, R() < 0.6 ? C.areia : C.terra, R() < 0.5 ? C.folha : '#c9a67a', R() * 70);
    const [gx, gy] = bez(stem, 0.86);
    s += flower(gx - 18, gy + 6, 8 + R() * 3, '#ffffff', C.terra, R() * 70);
    return `<svg class="cs-sprig" viewBox="0 0 170 310" style="--d:${(R() * -6).toFixed(2)}s;--dur:${(5 + R() * 3).toFixed(2)}s">${s}</svg>`;
  };
  const fillFlora = () => {
    const h = sec.offsetHeight;
    const n = Math.max(2, Math.round(h / 620));
    sec.querySelectorAll('.cs-flora').forEach((box, side) => {
      let html = '';
      for (let i = 0; i < n; i++) {
        const top = ((i + (side ? 0.5 : 0.15)) / n) * 100;
        html += `<div class="cs-sprig-wrap" style="top:${top.toFixed(1)}%">${sprig(17 + i * 31 + side * 97)}</div>`;
      }
      box.innerHTML = html;
    });
  };

  /* ---------------- Fundo granulado com brisa ---------------- */
  // A seção inteira tem uma textura de grãos finos, como capim visto de perto. O cursor (ou o dedo, no
  // celular) é a brisa: o sopro empurra e acende os grãos por onde passa, se espalha um pouco e se acalma.
  const cv = sec.querySelector('.cs-grass');
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, grains = [], petals = [];
  const CELL = 34;
  let GW = 0, GH = 0, wx = null, wy = null, tx = null, ty = null;
  const size = () => {
    dpr = Math.min(1.5, window.devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    GW = Math.ceil(W / CELL) + 2; GH = Math.ceil(H / CELL) + 2;
    wx = new Float32Array(GW * GH); wy = new Float32Array(GW * GH); tx = new Float32Array(GW * GH); ty = new Float32Array(GW * GH);
    const R = rng(7);
    const gap = W < 600 ? 13 : 14;
    grains = [];
    for (let y = gap / 2; y < H; y += gap) {
      for (let x = gap / 2; x < W; x += gap) {
        grains.push({ x: x + (R() - 0.5) * gap * 0.9, y: y + (R() - 0.5) * gap * 0.9, a: -1.25 + (R() - 0.5) * 1.1, len: 3 + R() * 4, dot: R() < 0.12, ph: R() * 6.28, bx: 0, by: 0 });
      }
    }
    const R2 = rng(11);
    petals = Array.from({ length: W < 600 ? 9 : 16 }, () => ({ x: R2() * W, y: R2() * H, vx: 0, vy: 0, s: 1.6 + R2() * 2.4, ph: R2() * 6.28, kind: R2() < 0.5 ? 'semente' : 'petala', rot: R2() * 6.28 }));
  };
  // Sopro: cada movimento do cursor ou do dedo empurra o vento das células por onde passou
  const blows = [];
  let last = null;
  const blow = (x, y) => {
    const r = cv.getBoundingClientRect();
    const px = x - r.left, py = y - r.top;
    if (last && performance.now() - last.t < 120) blows.push([last.x, last.y, px, py]);
    last = { x: px, y: py, t: performance.now() };
  };
  sec.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') blow(e.clientX, e.clientY); });
  sec.addEventListener('touchstart', (e) => { last = null; if (e.touches[0]) blow(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  sec.addEventListener('touchmove', (e) => { if (e.touches[0]) blow(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  sec.addEventListener('pointerleave', () => { last = null; });
  // Ao rolar com o dedo, a página anda e o dedo fica parado na tela: a rolagem também vira sopro
  let lastScroll = window.scrollY;
  window.addEventListener('scroll', () => {
    const d = window.scrollY - lastScroll;
    lastScroll = window.scrollY;
    if (last && performance.now() - last.t < 600 && Math.abs(d) < 200) blows.push([last.x, last.y + d, last.x, last.y]);
  }, { passive: true });
  const stepWind = (t) => {
    // espalha um pouco o vento para os vizinhos e deixa ele se acalmar
    for (let j = 1; j < GH - 1; j++) {
      for (let i = 1; i < GW - 1; i++) {
        const k = j * GW + i;
        tx[k] = (wx[k] * 0.6 + (wx[k - 1] + wx[k + 1] + wx[k - GW] + wx[k + GW]) * 0.1) * 0.955;
        ty[k] = (wy[k] * 0.6 + (wy[k - 1] + wy[k + 1] + wy[k - GW] + wy[k + GW]) * 0.1) * 0.955;
      }
    }
    [wx, tx] = [tx, wx]; [wy, ty] = [ty, wy];
    // os sopros desta rodada: ao longo do caminho, com força pelo tamanho do movimento
    blows.splice(0).forEach(([x0, y0, x1, y1]) => {
      const dx = x1 - x0, dy = y1 - y0, dist = Math.hypot(dx, dy);
      if (dist < 0.5) return;
      const n = Math.max(1, Math.ceil(dist / (CELL / 2)));
      const fx = Math.max(-3, Math.min(3, dx / 9)), fy = Math.max(-3, Math.min(3, dy / 9));
      for (let s = 0; s <= n; s++) {
        const px = x0 + (dx * s) / n, py = y0 + (dy * s) / n;
        const ci = Math.floor(px / CELL) + 1, cj = Math.floor(py / CELL) + 1;
        for (let j = cj - 2; j <= cj + 2; j++) {
          for (let i = ci - 2; i <= ci + 2; i++) {
            if (i < 0 || j < 0 || i >= GW || j >= GH) continue;
            const ddx = (i - 1 + 0.5) * CELL - px, ddy = (j - 1 + 0.5) * CELL - py;
            const f = Math.exp(-(ddx * ddx + ddy * ddy) / (2 * 46 * 46)) / n;
            wx[j * GW + i] += fx * f * 1.6; wy[j * GW + i] += fy * f * 1.6;
          }
        }
      }
    });
  };
  const windAt = (x, y) => {
    const i = Math.max(0, Math.min(GW - 1, Math.floor(x / CELL) + 1)), j = Math.max(0, Math.min(GH - 1, Math.floor(y / CELL) + 1));
    return [wx[j * GW + i], wy[j * GW + i]];
  };
  const BUCKETS = ['rgba(108, 147, 53, 0.15)', 'rgba(108, 147, 53, 0.36)', 'rgba(90, 128, 44, 0.55)', 'rgba(74, 107, 34, 0.78)'];
  const draw = (t) => {
    if (!reduce) stepWind(t);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // brisa de fundo: uma onda lenta que atravessa a seção na diagonal
    const paths = BUCKETS.map(() => new Path2D());
    const dots = new Path2D();
    const band = ((t * 120) % (W + H + 600)) - 300;
    grains.forEach((g) => {
      const [vx, vy] = windAt(g.x, g.y);
      const amb = reduce ? 0 : Math.sin(g.x * 0.01 + g.y * 0.006 - t * 1.2 + g.ph * 0.15) * 0.22 + Math.exp(-(((g.x + g.y * 0.6) - band) ** 2) / (2 * 120 * 120)) * 0.7;
      const tgx = vx * 7 + amb * 3, tgy = vy * 7 + amb * 0.8;
      g.bx += (tgx - g.bx) * 0.18; g.by += (tgy - g.by) * 0.18;
      const m = Math.hypot(g.bx, g.by);
      if (g.dot) { dots.moveTo(g.x + g.bx * 0.5 + 1, g.y + g.by * 0.5); dots.arc(g.x + g.bx * 0.5, g.y + g.by * 0.5, 1, 0, 6.28); return; }
      const lx = Math.cos(g.a) * g.len + g.bx * 0.9, ly = Math.sin(g.a) * g.len + g.by * 0.9;
      const p = paths[m < 1.2 ? 0 : m < 3 ? 1 : m < 6 ? 2 : 3];
      p.moveTo(g.x + g.bx * 0.35, g.y + g.by * 0.35);
      p.lineTo(g.x + g.bx * 0.35 + lx, g.y + g.by * 0.35 + ly);
    });
    ctx.lineCap = 'round';
    paths.forEach((p, i) => { ctx.strokeStyle = BUCKETS[i]; ctx.lineWidth = 1.1 + i * 0.25; ctx.stroke(p); });
    ctx.fillStyle = 'rgba(61, 28, 17, 0.14)'; ctx.fill(dots);
    // sementes e pétalas que o vento carrega
    petals.forEach((s) => {
      if (!reduce) {
        const [vx, vy] = windAt(s.x, s.y);
        s.vx += (0.25 + vx * 2.2 - s.vx) * 0.06; s.vy += (Math.sin(t * 1.1 + s.ph) * 0.18 + vy * 2.2 - s.vy) * 0.06;
        s.x += s.vx; s.y += s.vy; s.rot += 0.008 + Math.abs(s.vx) * 0.01;
      }
      if (s.x > W + 20) s.x = -20; if (s.x < -20) s.x = W + 20;
      if (s.y > H + 20) s.y = -20; if (s.y < -20) s.y = H + 20;
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot);
      if (s.kind === 'semente') {
        ctx.strokeStyle = 'rgba(61, 28, 17, 0.3)'; ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) { ctx.moveTo(0, 0); ctx.lineTo(Math.cos(i) * s.s * 2.2, Math.sin(i) * s.s * 2.2 - s.s); }
        ctx.stroke();
        ctx.fillStyle = 'rgba(61, 28, 17, 0.42)'; ctx.beginPath(); ctx.arc(0, 0, 1, 0, 6.28); ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(108, 147, 53, 0.4)'; ctx.beginPath(); ctx.ellipse(0, 0, s.s * 2, s.s, 0, 0, 6.28); ctx.fill();
      }
      ctx.restore();
    });
  };

  let visible = false, raf = 0;
  const loop = (now) => { draw(now / 1000); raf = visible ? requestAnimationFrame(loop) : 0; };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf && !reduce) raf = requestAnimationFrame(loop);
  }, { rootMargin: '100px 0px' }).observe(sec);
  // Só refaz o que mudou: os grãos quando a tela muda de tamanho, os ramos quando cabe outro número deles
  let lastW = 0, lastH = 0, lastN = 0;
  const resize = () => {
    if (cv.clientWidth !== lastW || cv.clientHeight !== lastH) { lastW = cv.clientWidth; lastH = cv.clientHeight; size(); }
    const n = Math.max(2, Math.round(sec.offsetHeight / 620));
    if (n !== lastN) { lastN = n; fillFlora(); }
    draw(performance.now() / 1000);
  };
  new ResizeObserver(() => { clearTimeout(resize.t); resize.t = setTimeout(resize, 120); }).observe(sec);
  resize();
})();
