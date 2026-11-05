// Salão: um ar de natureza, como pede o guia da marca (formas orgânicas, terra, areia e folha).
// No fundo, um gramado que balança com ondas de brisa e se curva quando o cursor passa por perto, com
// sementes e pétalas levadas pelo vento. Nas laterais, ramos com folhas e flores que oscilam devagar.
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

  /* ---------------- Gramado com brisa ---------------- */
  const cv = sec.querySelector('.cs-grass');
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, blades = [], seeds = [];
  const pointer = { x: -9999, y: 0, vx: 0, lastX: null, t: 0 };
  const LAYERS = [
    { colors: ['rgba(108, 147, 53, 0.22)', 'rgba(74, 107, 34, 0.18)'], hMin: 0.09, hMax: 0.16, gap: 5, w: 2.6 },
    { colors: ['rgba(108, 147, 53, 0.55)', 'rgba(74, 107, 34, 0.6)', 'rgba(140, 170, 80, 0.5)'], hMin: 0.05, hMax: 0.12, gap: 4, w: 3 },
  ];
  const size = () => {
    dpr = Math.min(1.5, window.devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const R = rng(7);
    blades = LAYERS.map((L) => {
      const list = [];
      for (let x = -10; x < W + 10; x += L.gap * (0.6 + R() * 0.8)) {
        list.push({ x, h: H * (L.hMin + R() * (L.hMax - L.hMin)) * (W < 600 ? 0.7 : 1), c: Math.floor(R() * L.colors.length), ph: R() * 6.28, k: 0.6 + R() * 0.8, bend: 0 });
      }
      return list;
    });
    const R2 = rng(11);
    seeds = Array.from({ length: W < 600 ? 10 : 22 }, () => ({ x: R2() * W, y: H * (0.2 + R2() * 0.7), s: 1.5 + R2() * 2.5, ph: R2() * 6.28, kind: R2() < 0.55 ? 'semente' : 'petala', rot: R2() * 6.28 }));
  };
  sec.addEventListener('pointermove', (e) => {
    const r = cv.getBoundingClientRect();
    const x = e.clientX - r.left;
    if (pointer.lastX != null) pointer.vx = Math.max(-40, Math.min(40, x - pointer.lastX));
    pointer.lastX = x; pointer.x = x; pointer.y = e.clientY - r.top; pointer.t = performance.now();
  });
  sec.addEventListener('pointerleave', () => { pointer.lastX = null; });
  // Brisa: uma onda de base, rajadas que atravessam a tela de tempos em tempos e o "vento" do cursor
  const wind = (x, t) => {
    const base = Math.sin(x * 0.012 - t * 1.4) * 0.35 + Math.sin(x * 0.004 - t * 0.6) * 0.25;
    const gx = ((t * 160) % (W + 900)) - 450;
    const gust = Math.exp(-((x - gx) ** 2) / (2 * 140 * 140)) * 1.1;
    const near = performance.now() - pointer.t < 900 ? Math.exp(-((x - pointer.x) ** 2) / (2 * 90 * 90)) * (pointer.vx / 14) * (1 - (performance.now() - pointer.t) / 900) : 0;
    return base + gust + near;
  };
  const draw = (t) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // sementes e pétalas levadas pela brisa
    seeds.forEach((s) => {
      if (!reduce) { s.x += (0.35 + wind(s.x, t) * 0.9) * 1.1; s.y += Math.sin(t * 1.3 + s.ph) * 0.25; s.rot += 0.01; }
      if (s.x > W + 20) { s.x = -20; s.y = H * (0.2 + Math.random() * 0.7); }
      if (s.x < -30) s.x = W + 10;
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot);
      if (s.kind === 'semente') {
        ctx.strokeStyle = 'rgba(61, 28, 17, 0.28)'; ctx.lineWidth = 0.8;
        for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(i) * s.s * 2.2, Math.sin(i) * s.s * 2.2 - s.s); ctx.stroke(); }
        ctx.fillStyle = 'rgba(61, 28, 17, 0.4)'; ctx.beginPath(); ctx.arc(0, 0, 1, 0, 6.28); ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(108, 147, 53, 0.38)'; ctx.beginPath(); ctx.ellipse(0, 0, s.s * 2, s.s, 0, 0, 6.28); ctx.fill();
      }
      ctx.restore();
    });
    // capim: cada lâmina é uma curva que afina até a ponta
    blades.forEach((list, li) => {
      const L = LAYERS[li];
      L.colors.forEach((col, ci) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        list.forEach((b) => {
          if (b.c !== ci) return;
          const target = reduce ? 0.15 : wind(b.x, t) * b.k + Math.sin(t * 2 + b.ph) * 0.08;
          b.bend += (target - b.bend) * 0.08;
          const lean = b.bend * b.h * 0.55;
          const tipX = b.x + lean, tipY = H - b.h + Math.abs(lean) * 0.25;
          const cx = b.x + lean * 0.35, cy = H - b.h * 0.55;
          const w = L.w;
          ctx.moveTo(b.x - w, H);
          ctx.quadraticCurveTo(cx - w * 0.5, cy, tipX, tipY);
          ctx.quadraticCurveTo(cx + w * 0.5, cy, b.x + w, H);
        });
        ctx.fill();
      });
    });
  };

  let visible = false, raf = 0;
  const loop = (now) => { draw(now / 1000); raf = visible ? requestAnimationFrame(loop) : 0; };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf && !reduce) raf = requestAnimationFrame(loop);
  }, { rootMargin: '100px 0px' }).observe(sec);
  // Só refaz o que mudou: o gramado quando a tela muda de tamanho, os ramos quando cabe outro número deles
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
