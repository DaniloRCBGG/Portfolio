// Início: fundo animado do hero, texto rotativo e trajetória.
(() => {
  const reduceMotion = window.PORTFOLIO.reduceMotion;

  // Fundo do hero: linhas de ônibus fictícias; um ônibus muda de cor ao passar por um alerta,
  // a mesma regra que o Gêmeo aplica na cidade de verdade.
  const canvas = document.getElementById('hero-canvas');
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    const C = { line: 'rgba(169,188,205,0.16)', stop: 'rgba(169,188,205,0.35)', bus: '#00a6a6', alert: '#e8955a', ring: 'rgba(232,149,90,0.55)' };
    let w = 0, h = 0, dpr = 1, lines = [], buses = [], alerts = [], running = true, last = 0;
    const rand = (a, b) => a + Math.random() * (b - a);

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = w < 640 ? 4 : 7;
      lines = Array.from({ length: n }, (_, i) => {
        const pts = [];
        const y0 = (h / (n + 1)) * (i + 1) + rand(-30, 30);
        const steps = 6;
        for (let k = 0; k <= steps; k++) pts.push([(w * 0.25) + ((w * 0.85) / steps) * k - w * 0.1, y0 + rand(-60, 60)]);
        const len = []; let acc = 0;
        for (let k = 1; k < pts.length; k++) { acc += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); len.push(acc); }
        return { pts, len, total: acc };
      });
      buses = [];
      lines.forEach((ln, li) => { for (let k = 0; k < 3; k++) buses.push({ li, d: rand(0, ln.total), v: rand(18, 34) * (Math.random() < 0.5 ? 1 : -1), hot: 0 }); });
      alerts = [];
    };
    const pointAt = (ln, d) => {
      d = ((d % ln.total) + ln.total) % ln.total;
      let k = 0; while (ln.len[k] < d) k++;
      const prev = k === 0 ? 0 : ln.len[k - 1];
      const t = (d - prev) / (ln.len[k] - prev);
      const a = ln.pts[k], b = ln.pts[k + 1];
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    };
    const draw = (dt) => {
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 2; ctx.strokeStyle = C.line;
      lines.forEach((ln) => { ctx.beginPath(); ln.pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); });
      ctx.fillStyle = C.stop;
      lines.forEach((ln) => ln.pts.forEach((p) => { ctx.beginPath(); ctx.arc(p[0], p[1], 2.5, 0, Math.PI * 2); ctx.fill(); }));
      if (Math.random() < dt * 0.35 && alerts.length < 3) {
        const ln = lines[Math.floor(Math.random() * lines.length)];
        const [x, y] = pointAt(ln, rand(0, ln.total));
        alerts.push({ x, y, age: 0, life: rand(5, 8), r: w < 640 ? 46 : 70 });
      }
      alerts.forEach((a) => {
        a.age += dt;
        const k = a.age / a.life;
        const fade = k < 0.15 ? k / 0.15 : k > 0.8 ? (1 - k) / 0.2 : 1;
        ctx.globalAlpha = Math.max(0, fade);
        ctx.strokeStyle = C.ring; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r * ((a.age * 0.6) % 1), 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = C.alert; ctx.beginPath(); ctx.arc(a.x, a.y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      });
      alerts = alerts.filter((a) => a.age < a.life);
      let inAlert = 0;
      buses.forEach((b) => {
        b.d += b.v * dt;
        const [x, y] = pointAt(lines[b.li], b.d);
        const hit = alerts.some((a) => Math.hypot(a.x - x, a.y - y) < a.r);
        b.hot = hit ? 1 : 0;
        if (hit) inAlert++;
        ctx.fillStyle = hit ? C.alert : C.bus;
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(15,25,37,0.9)'; ctx.lineWidth = 2; ctx.stroke();
      });
      const out = document.getElementById('hero-live');
      if (out) out.textContent = `${buses.length} ônibus fictícios · ${inAlert} em área de alerta`;
    };
    const loop = (t) => {
      if (!running) return;
      const dt = Math.min(0.05, (t - (last || t)) / 1000);
      last = t;
      draw(dt);
      requestAnimationFrame(loop);
    };
    build();
    if (reduceMotion) { draw(0); } else { requestAnimationFrame(loop); }
    window.addEventListener('resize', () => { build(); if (reduceMotion) draw(0); });
    // Pausa fora da tela ou com a aba escondida
    const setRunning = (on) => { if (reduceMotion) return; if (on && !running) { running = true; last = 0; requestAnimationFrame(loop); } else if (!on) running = false; };
    if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => setRunning(e.isIntersecting)).observe(canvas);
    document.addEventListener('visibilitychange', () => setRunning(!document.hidden));
  }

  // Texto rotativo do hero
  const rot = document.getElementById('rotator-text');
  if (rot) {
    const phrases = JSON.parse(rot.dataset.phrases);
    if (!reduceMotion) {
      let i = 0, j = phrases[0].length, deleting = true;
      const tick = () => {
        const p = phrases[i];
        if (deleting) {
          j--; rot.textContent = p.slice(0, j);
          if (j <= 0) { deleting = false; i = (i + 1) % phrases.length; }
          setTimeout(tick, 28);
        } else {
          j++; rot.textContent = phrases[i].slice(0, j);
          if (j >= phrases[i].length) { deleting = true; setTimeout(tick, 2600); } else setTimeout(tick, 48);
        }
      };
      setTimeout(tick, 2600);
    }
  }

  document.getElementById('start-tour')?.addEventListener('click', () => window.PORTFOLIO.startTour?.());
})();
