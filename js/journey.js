// Trajetória como mapa de jogo, conduzida só pela rolagem: o mapa fica fixo de um lado e os cards grandes
// de cada fase passam do outro (no celular, o mapa fica no topo e os cards embaixo). Cada card tem uma barra
// que se completa conforme a rolagem; quando ela termina, o pino segue para a próxima fase.
(() => {
  const root = document.getElementById('journey');
  if (!root) return;
  const P = window.PORTFOLIO;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const SVGNS = 'http://www.w3.org/2000/svg';
  const W = 1000, H = 560;

  const STAGES = [
    { id: 'fisica', when: '2016', title: 'Física na UFF', short: 'Física', level: 'Base de cálculo', icon: 'bi-calculator',
      text: 'Bacharelado em Física, de 2016 a 2021, não concluído. Foi onde ganhei a base em matemática, lógica e métodos quantitativos que eu uso até hoje para pensar em dados e regras.',
      skills: ['Matemática', 'Lógica', 'Métodos quantitativos'], pos: [80, 450] },
    { id: 'computacao', when: '2022', title: 'Ciência da Computação na UFF', short: 'Computação', level: 'Modelagem', icon: 'bi-mortarboard',
      text: 'Graduação em andamento. Em equipe, modelei sistemas reais com levantamento de requisitos, casos de uso e UML: uma biblioteca, uma sorveteria e o primeiro desenho do sistema do salão.',
      skills: ['Requisitos', 'Casos de uso', 'UML', 'Documentação'], pos: [250, 330] },
    { id: 'inspira', when: 'out/2024', title: 'Inspira Design · UFF', short: 'Inspira', level: 'Interface', icon: 'bi-palette',
      text: 'Primeiro trabalho como desenvolvedor front-end, no projeto de extensão, até out/2025. Telas do Figma viraram páginas React + TypeScript, com componentes reutilizáveis e rotas, junto com a equipe de design.',
      skills: ['React', 'TypeScript', 'HTML', 'CSS'], pos: [430, 430] },
    { id: 'escritorio', when: 'jul/2025', title: 'Escritório de Dados de Niterói', short: 'Prefeitura', level: 'Dados em tempo real', icon: 'bi-buildings',
      text: 'Desenvolvedor front-end (estágio) e desenvolvedor principal do Gêmeo Digital de Niterói. Montei a plataforma n8n, hoje ferramenta interna, e arquitetei o uso do Prefect numa máquina dedicada.',
      skills: ['ArcGIS Maps SDK', 'Node.js', 'Express', 'Redis', 'Server-Sent Events', 'Docker', 'Nginx', 'Prefect', 'n8n'], pos: [610, 270] },
    { id: 'curly', when: 'set/2026', title: 'Carol Rios Curly Studio', short: 'Curly Studio', level: 'Full stack', icon: 'bi-scissors',
      text: 'Site e sistema do salão em Next.js e Supabase, com antes e depois, agendamento com sinal por Pix, login com Google e baixa automática de estoque. Em testes com a dona antes do lançamento oficial.',
      skills: ['Next.js', 'Supabase', 'PostgreSQL', 'RLS', 'Netlify', 'GitHub Actions'], pos: [790, 390] },
    { id: 'hoje', when: 'hoje', title: 'Próxima fase', short: 'Próxima fase', level: 'Pronto para o time', icon: 'bi-flag', next: true,
      text: 'Buscando vaga júnior de Front-end, Full Stack ou Análise e Desenvolvimento de Sistemas. Gosto de interface, mas também de entender o dado e colocar o sistema no ar.',
      skills: [], pos: [930, 190] },
  ];
  // Projetos que saem de cada fase
  const BRANCHES = [
    { from: 1, label: 'UFForáculo', href: '#outros', pos: [140, 180] },
    { from: 1, label: 'Sorveteria', href: '#outros', pos: [255, 140] },
    { from: 1, label: 'Curly Care', href: '#outros', pos: [365, 200], to: 4 },
    { from: 3, label: 'Gêmeo Digital', href: '#gemeo', pos: [505, 110] },
    { from: 3, label: 'n8n', href: '#n8n', pos: [625, 95] },
    { from: 3, label: 'Prefect', href: '#prefect', pos: [735, 175] },
    { from: 4, label: 'Antes e depois', href: '#curly', pos: [880, 470] },
  ];

  const svg = root.querySelector('.journey-svg');
  const layer = root.querySelector('.journey-nodes');
  const cardsBox = root.querySelector('.journey-cards');
  const hud = { level: root.querySelector('#jr-level'), xp: root.querySelector('#jr-xp i'), xpText: root.querySelector('#jr-xp-text'), count: root.querySelector('#jr-count') };
  const el = (tag, attrs, parent) => { const e = document.createElementNS(SVGNS, tag); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); parent?.appendChild(e); return e; };
  const unlocked = (k) => STAGES.slice(0, k + 1).reduce((n, s) => n + s.skills.length, 0);
  const catmull = (pts) => {
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
    }
    return d;
  };

  // Mapa
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const grid = el('g', { class: 'jr-grid' }, svg);
  for (let x = 0; x <= W; x += 40) el('line', { x1: x, y1: 0, x2: x, y2: H }, grid);
  for (let y = 0; y <= H; y += 40) el('line', { x1: 0, y1: y, x2: W, y2: y }, grid);
  const pts = STAGES.map((s) => s.pos);
  BRANCHES.forEach((b) => {
    const a = pts[b.from];
    el('path', { class: 'jr-branch', d: `M${a[0]},${a[1]} Q${(a[0] + b.pos[0]) / 2},${b.pos[1] + 40} ${b.pos[0]},${b.pos[1]}`, 'data-from': b.from }, svg);
    if (b.to !== undefined) { const t = pts[b.to]; el('path', { class: 'jr-branch jr-link', d: `M${b.pos[0]},${b.pos[1]} C${b.pos[0] + 170},${b.pos[1] + 20} ${t[0] - 130},${t[1] - 170} ${t[0]},${t[1]}`, 'data-from': b.to }, svg); }
  });
  const d = catmull(pts);
  el('path', { class: 'jr-road', d }, svg);
  const path = el('path', { class: 'jr-path', d }, svg);
  const trail = el('path', { class: 'jr-trail', d }, svg);
  const shadow = el('ellipse', { rx: 16, ry: 6, class: 'jr-shadow' }, svg);
  const total = path.getTotalLength();
  trail.style.strokeDasharray = `${total}`;
  const nodeLens = pts.map((p) => {
    let best = 0, bestD = Infinity;
    for (let i = 0; i <= 800; i++) { const l = (total * i) / 800; const q = path.getPointAtLength(l); const dd = (q.x - p[0]) ** 2 + (q.y - p[1]) ** 2; if (dd < bestD) { bestD = dd; best = l; } }
    return best;
  });
  const pct = (p) => [`${(p[0] / W) * 100}%`, `${(p[1] / H) * 100}%`];
  let cards = [];
  const nodes = STAGES.map((s, i) => {
    const [left, top] = pct(s.pos);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'jr-node' + (s.next ? ' is-next' : '');
    b.style.left = left; b.style.top = top;
    b.setAttribute('aria-label', `Ir para a fase ${i + 1}: ${s.title}, ${s.when}`);
    b.innerHTML = `<span class="jr-dot" aria-hidden="true">${s.next ? '<i class="bi bi-flag-fill"></i>' : i + 1}</span><span class="jr-label"><b>${s.short}</b><small>${s.when}</small></span>`;
    b.addEventListener('click', () => { const c = cards[i]; if (P.scrollTo) P.scrollTo(c); else c.scrollIntoView({ block: 'center' }); });
    layer.appendChild(b);
    return b;
  });
  const branchEls = BRANCHES.map((br) => {
    const [left, top] = pct(br.pos);
    const a = document.createElement('a');
    a.className = 'jr-node jr-proj';
    a.href = br.href;
    a.style.left = left; a.style.top = top;
    a.setAttribute('aria-label', `Projeto ${br.label}`);
    a.innerHTML = `<span class="jr-dot" aria-hidden="true"><i class="bi bi-diamond-fill"></i></span><span class="jr-label"><b>${br.label}</b></span>`;
    layer.appendChild(a);
    return a;
  });
  const pin = document.createElement('div');
  pin.className = 'jr-pin';
  pin.setAttribute('aria-hidden', 'true');
  pin.innerHTML = '<span>DR</span>';
  layer.appendChild(pin);

  // Cards grandes
  cards = STAGES.map((s, i) => {
    const projects = BRANCHES.filter((b) => b.from === i);
    const c = document.createElement('article');
    c.className = 'jr-card panel' + (s.next ? ' is-final' : '');
    c.setAttribute('aria-labelledby', `jr-t-${s.id}`);
    c.innerHTML = `
      <div class="jr-card-bar" aria-hidden="true"><i></i></div>
      <div class="jr-card-top"><span class="jr-card-icon"><i class="bi ${s.icon}" aria-hidden="true"></i></span><span class="eyebrow">Fase ${i + 1} de ${STAGES.length} · ${s.when}</span></div>
      <h3 id="jr-t-${s.id}">${s.title}</h3>
      <p>${s.text}</p>
      ${s.skills.length ? `<div class="eyebrow mb-2">Conquistas desbloqueadas</div><ul class="tag-list mb-3">${s.skills.map((x) => `<li class="tag jr-chip">+ ${x}</li>`).join('')}</ul>` : ''}
      ${projects.length ? `<div class="eyebrow mb-2">Projetos desta fase</div><div class="d-flex flex-wrap gap-2">${projects.map((p) => `<a class="btn btn-line btn-sm" href="${p.href}"><i class="bi bi-diamond" aria-hidden="true"></i> ${p.label}</a>`).join('')}</div>` : ''}
      ${s.next ? '<a class="btn btn-accent mt-2" href="#contato">Falar comigo <i class="bi bi-arrow-right" aria-hidden="true"></i></a>' : ''}`;
    cardsBox.appendChild(c);
    return c;
  });

  // Estado
  let current = -1;
  const placeAt = (len) => {
    const q = path.getPointAtLength(Math.max(0, Math.min(total, len)));
    shadow.setAttribute('cx', q.x); shadow.setAttribute('cy', q.y);
    pin.style.left = `${(q.x / W) * 100}%`;
    pin.style.top = `${(q.y / H) * 100}%`;
    trail.style.strokeDashoffset = `${total - len}`;
  };
  const setStage = (k) => {
    if (k === current) return;
    const prev = current;
    current = k;
    const s = STAGES[k];
    nodes.forEach((b, i) => { b.classList.toggle('done', i < k); b.classList.toggle('active', i === k); if (i === k) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    branchEls.forEach((a, i) => a.classList.toggle('unlocked', BRANCHES[i].from <= k));
    svg.querySelectorAll('.jr-branch').forEach((p) => p.classList.toggle('unlocked', +p.dataset.from <= k));
    cards.forEach((c, i) => c.classList.toggle('is-active', i === k));
    hud.level.textContent = `Nível ${k + 1} · ${s.level}`;
    hud.xp.style.width = `${(k / (STAGES.length - 1)) * 100}%`;
    hud.xpText.textContent = `${Math.round((k / (STAGES.length - 1)) * 100)}% da trajetória`;
    hud.count.textContent = String(unlocked(k));
    if (hasGsap && !reduce && prev !== -1 && k > prev) {
      gsap.fromTo(nodes[k].querySelector('.jr-dot'), { scale: 1.6 }, { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.45)' });
      gsap.fromTo(cards[k].querySelectorAll('.jr-chip'), { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.35, stagger: 0.05, ease: 'back.out(2)' });
    }
  };
  placeAt(nodeLens[0]);
  setStage(0);

  // Rolagem: enquanto um card passa, a barra dele enche; no fim do card, o pino anda até a próxima fase
  const ease = (x) => x * x * (3 - 2 * x);
  const onCard = (k, p) => {
    cards[k].querySelector('.jr-card-bar i').style.width = `${Math.round(p * 100)}%`;
    cards[k].classList.toggle('is-done', p >= 0.999);
    if (k < STAGES.length - 1) {
      const g = ease(Math.max(0, Math.min(1, (p - 0.6) / 0.4)));
      placeAt(nodeLens[k] + (nodeLens[k + 1] - nodeLens[k]) * g);
      setStage(g < 0.5 ? k : k + 1);
    } else { placeAt(nodeLens[k]); setStage(k); }
  };
  if (hasGsap) {
    cards.forEach((c, k) => {
      ScrollTrigger.create({ trigger: c, start: 'top 62%', end: 'bottom 62%', onUpdate: (self) => onCard(k, self.progress), onLeaveBack: () => onCard(Math.max(0, k - 1), k > 0 ? 1 : 0) });
    });
  } else if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { const k = cards.indexOf(e.target); placeAt(nodeLens[k]); setStage(k); } }), { rootMargin: '-45% 0px -45% 0px' });
    cards.forEach((c) => io.observe(c));
  }
})();
