// Trajetória como mapa de jogo: um caminho com as fases e galhos com os projetos.
// A rolagem leva o marcador de fase em fase (a seção fica fixa enquanto isso); o cursor perto de um ponto
// também leva até ele. Cada ponto abre um card com os detalhes e as habilidades desbloqueadas.
(() => {
  const P = window.PORTFOLIO;
  const root = document.getElementById('journey');
  if (!root) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const SVGNS = 'http://www.w3.org/2000/svg';

  const STAGES = [
    { id: 'fisica', when: '2016', title: 'Física na UFF', short: 'Física', level: 'Base de cálculo',
      text: 'Bacharelado em Física, de 2016 a 2021, não concluído. Deu a base em matemática, lógica e métodos quantitativos que eu uso até hoje para pensar em dados e regras.',
      skills: ['Matemática', 'Lógica', 'Métodos quantitativos'], pos: [90, 440], mpos: [95, 70] },
    { id: 'computacao', when: '2022', title: 'Ciência da Computação na UFF', short: 'Computação', level: 'Modelagem',
      text: 'Graduação em andamento. Em equipe, modelei sistemas com levantamento de requisitos, casos de uso e UML.',
      skills: ['Requisitos', 'Casos de uso', 'UML', 'Documentação'], pos: [255, 320], mpos: [300, 235],
      link: ['projetos.html#outros', 'Ver os projetos acadêmicos'] },
    { id: 'inspira', when: 'out/2024', title: 'Inspira Design · UFF', short: 'Inspira', level: 'Interface',
      text: 'Desenvolvedor front-end no projeto de extensão, até out/2025: telas do Figma viraram páginas React + TypeScript, com componentes reutilizáveis e rotas.',
      skills: ['React', 'TypeScript', 'HTML', 'CSS'], pos: [430, 420], mpos: [100, 400] },
    { id: 'escritorio', when: 'jul/2025', title: 'Escritório de Dados de Niterói', short: 'Prefeitura', level: 'Dados em tempo real',
      text: 'Desenvolvedor front-end (estágio) e desenvolvedor principal do Gêmeo Digital de Niterói. Também montei a plataforma de automação com n8n, hoje ferramenta interna do escritório.',
      skills: ['ArcGIS Maps SDK', 'Node.js', 'Express', 'Redis', 'Server-Sent Events', 'Docker', 'Nginx', 'Prefect', 'n8n'], pos: [610, 270], mpos: [300, 570],
      link: ['projetos.html#gemeo', 'Ver o Gêmeo Digital'] },
    { id: 'curly', when: 'set/2026', title: 'Carol Rios Curly Studio', short: 'Curly Studio', level: 'Full stack',
      text: 'Site e sistema do salão em Next.js e Supabase, com agendamento, sinal por Pix e baixa automática de estoque. Em testes com a dona antes do lançamento oficial.',
      skills: ['Next.js', 'Supabase', 'PostgreSQL', 'RLS', 'Netlify', 'GitHub Actions'], pos: [785, 380], mpos: [105, 745],
      link: ['projetos.html#curly', 'Ver o Curly Studio'] },
    { id: 'hoje', when: 'hoje', title: 'Próxima fase', short: 'Próxima fase', level: 'Pronto para o time',
      text: 'Buscando vaga júnior de Front-end, Full Stack ou Análise e Desenvolvimento de Sistemas. Gosto de interface, mas também de entender o dado e colocar o sistema no ar.',
      skills: [], pos: [925, 190], mpos: [290, 925], next: true,
      link: ['contato.html', 'Falar comigo'] },
  ];
  // Projetos que saem das fases (só no mapa largo)
  const BRANCHES = [
    { from: 1, label: 'UFForáculo', text: 'Biblioteca da UFF com requisitos levantados em entrevista com o chefe da biblioteca central.', href: 'projetos.html#outros', pos: [150, 175] },
    { from: 1, label: 'Sorveteria', text: 'PDV, delivery e estoque: 67 requisitos funcionais, 17 não funcionais e 9 casos de uso.', href: 'projetos.html#outros', pos: [262, 135] },
    { from: 1, label: 'Curly Care', text: 'Agendamento, estoque e financeiro do salão, modelados em equipe. Virou o sistema real depois.', href: 'projetos.html#outros', pos: [372, 190], to: 4 },
    { from: 3, label: 'Gêmeo Digital', text: 'Mapa 3D de Niterói que cruza ônibus, trânsito e chuva a cada 30 segundos.', href: 'projetos.html#gemeo', pos: [520, 115] },
    { from: 3, label: 'Plataforma n8n', text: 'Instância própria do n8n com PostgreSQL e Redis, hoje ferramenta interna.', href: 'projetos.html#n8n', pos: [660, 95] },
    { from: 3, label: 'Webhook → OneLake', text: 'Prova de conceito em FastAPI que grava ocorrências no Microsoft Fabric.', href: 'projetos.html#outros', pos: [745, 200] },
  ];

  const stageEl = root.querySelector('.journey-stage');
  const svg = root.querySelector('svg');
  const layer = root.querySelector('.journey-nodes');
  const card = root.querySelector('.journey-card');
  const wrap = root.querySelector('.journey-wrap');
  const hud = { level: root.querySelector('#jr-level'), xp: root.querySelector('#jr-xp i'), xpText: root.querySelector('#jr-xp-text'), count: root.querySelector('#jr-count') };
  const mq = window.matchMedia('(min-width: 768px)');
  let wide = mq.matches;
  let path, trail, nodeLens = [], total = 0, player, shadow, dims = [1000, 560], buttons = [], branchBtns = [], current = -1, previewing = false, previewFrom = 0, st = null;

  const catmull = (pts) => {
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
    }
    return d;
  };
  const el = (tag, attrs, parent) => { const e = document.createElementNS(SVGNS, tag); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); parent?.appendChild(e); return e; };
  const unlockedSkills = (k) => STAGES.slice(0, k + 1).reduce((n, s) => n + s.skills.length, 0);

  function build() {
    wide = mq.matches;
    const W = wide ? 1000 : 400, H = wide ? 560 : 1000;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = '';
    layer.innerHTML = '';
    const pts = STAGES.map((s) => (wide ? s.pos : s.mpos));

    // Grade de fundo, como um mapa de jogo
    const g = el('g', { class: 'jr-grid' }, svg);
    for (let x = 0; x <= W; x += 40) el('line', { x1: x, y1: 0, x2: x, y2: H }, g);
    for (let y = 0; y <= H; y += 40) el('line', { x1: 0, y1: y, x2: W, y2: y }, g);

    // Galhos dos projetos
    if (wide) BRANCHES.forEach((b) => {
      const a = pts[b.from];
      el('path', { class: 'jr-branch', d: `M${a[0]},${a[1]} Q${(a[0] + b.pos[0]) / 2},${b.pos[1] + 40} ${b.pos[0]},${b.pos[1]}`, 'data-from': b.from }, svg);
      if (b.to !== undefined) { const t = pts[b.to]; el('path', { class: 'jr-branch jr-link', d: `M${b.pos[0]},${b.pos[1]} C${b.pos[0] + 160},${b.pos[1] + 30} ${t[0] - 120},${t[1] - 160} ${t[0]},${t[1]}`, 'data-from': b.to }, svg); }
    });

    const d = catmull(pts);
    el('path', { class: 'jr-road', d }, svg);
    path = el('path', { class: 'jr-path', d }, svg);
    trail = el('path', { class: 'jr-trail', d }, svg);
    total = path.getTotalLength();
    trail.style.strokeDasharray = `${total}`;
    trail.style.strokeDashoffset = `${total}`;
    nodeLens = pts.map((p) => {
      let best = 0, bestD = Infinity;
      for (let i = 0; i <= 800; i++) { const l = (total * i) / 800; const q = path.getPointAtLength(l); const dd = (q.x - p[0]) ** 2 + (q.y - p[1]) ** 2; if (dd < bestD) { bestD = dd; best = l; } }
      return best;
    });

    // Sombra no caminho (SVG) e pino do jogador (HTML, por cima dos pontos)
    shadow = el('ellipse', { rx: 16, ry: 6, class: 'jr-shadow' }, svg);
    player = document.createElement('div');
    player.className = 'jr-pin';
    player.setAttribute('aria-hidden', 'true');
    player.innerHTML = '<span>DR</span>';
    dims = [W, H];

    // Pontos clicáveis (HTML por cima do SVG, para teclado e leitor de tela)
    const toPct = (p) => [`${(p[0] / W) * 100}%`, `${(p[1] / H) * 100}%`];
    buttons = STAGES.map((s, i) => {
      const [left, top] = toPct(pts[i]);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'jr-node' + (s.next ? ' is-next' : '');
      b.style.left = left; b.style.top = top;
      b.dataset.index = i;
      b.setAttribute('aria-label', `Fase ${i + 1} de ${STAGES.length}: ${s.title}, ${s.when}`);
      b.innerHTML = `<span class="jr-dot" aria-hidden="true">${s.next ? '<i class="bi bi-flag-fill"></i>' : i + 1}</span><span class="jr-label"><b>${s.short}</b><small>${s.when}</small></span>`;
      layer.appendChild(b);
      return b;
    });
    branchBtns = wide ? BRANCHES.map((br, i) => {
      const [left, top] = toPct(br.pos);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'jr-node jr-proj';
      b.style.left = left; b.style.top = top;
      b.dataset.branch = i;
      b.setAttribute('aria-label', `Projeto: ${br.label}`);
      b.innerHTML = `<span class="jr-dot" aria-hidden="true"><i class="bi bi-diamond-fill"></i></span><span class="jr-label"><b>${br.label}</b></span>`;
      layer.appendChild(b);
      return b;
    }) : [];

    layer.appendChild(player);
    bindNodes();
    current = -1;
    placeAt(nodeLens[0]);
    setStage(Math.max(0, current), true);
  }

  function placeAt(len) {
    const q = path.getPointAtLength(Math.max(0, Math.min(total, len)));
    shadow.setAttribute('cx', q.x); shadow.setAttribute('cy', q.y);
    player.style.left = `${(q.x / dims[0]) * 100}%`;
    player.style.top = `${(q.y / dims[1]) * 100}%`;
    trail.style.strokeDashoffset = `${total - len}`;
  }

  // Card de detalhe e estado do jogo
  function setStage(k, silent) {
    if (k === current && !silent) return;
    const prev = current;
    current = k;
    const s = STAGES[k];
    buttons.forEach((b, i) => {
      b.classList.toggle('done', i < k);
      b.classList.toggle('active', i === k);
      b.setAttribute('aria-pressed', String(i === k));
    });
    branchBtns.forEach((b) => b.classList.toggle('unlocked', BRANCHES[+b.dataset.branch].from <= k));
    svg.querySelectorAll('.jr-branch').forEach((p) => p.classList.toggle('unlocked', +p.dataset.from <= k));
    const count = unlockedSkills(k);
    hud.level.textContent = `Nível ${k + 1} · ${s.level}`;
    hud.xp.style.width = `${(k / (STAGES.length - 1)) * 100}%`;
    hud.xpText.textContent = `${Math.round((k / (STAGES.length - 1)) * 100)}% da trajetória`;
    hud.count.textContent = String(count);
    showCard({
      eyebrow: `Fase ${k + 1} de ${STAGES.length} · ${s.when}`, title: s.title, text: s.text,
      skills: s.skills, skillsLabel: s.next ? null : 'Conquistas desbloqueadas', link: s.link, anchor: buttons[k], final: s.next,
    });
    if (!silent && prev !== -1 && hasGsap && !reduce) {
      gsap.fromTo(buttons[k].querySelector('.jr-dot'), { scale: 1.6 }, { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.45)' });
      if (k > prev) burst(buttons[k]);
    }
  }

  function showBranch(i) {
    const br = BRANCHES[i];
    showCard({ eyebrow: `Projeto · fase ${br.from + 1}`, title: br.label, text: br.text, skills: [], link: [br.href, 'Ver o projeto'], anchor: branchBtns[i] });
  }

  function showCard({ eyebrow, title, text, skills, skillsLabel, link, anchor, final }) {
    card.innerHTML = `
      <div class="eyebrow">${eyebrow}</div>
      <h3 class="h5 mb-1">${title}</h3>
      <p class="mb-2">${text}</p>
      ${skills.length ? `<div class="eyebrow mb-1">${skillsLabel}</div><ul class="tag-list mb-2">${skills.map((x) => `<li class="tag jr-chip">+ ${x}</li>`).join('')}${skills.length > 4 ? `<li class="tag jr-more">+${skills.length - 4} habilidades</li>` : ''}</ul>` : ''}
      ${link ? `<a class="btn ${final ? 'btn-accent' : 'btn-line'} btn-sm" href="${link[0]}">${link[1]} <i class="bi bi-arrow-right" aria-hidden="true"></i></a>` : ''}`;
    // No mapa largo o card fica ao lado do ponto; no estreito, abaixo do mapa
    if (wide) {
      const box = wrap.getBoundingClientRect();
      const r = anchor.getBoundingClientRect();
      const ax = r.left - box.left + r.width / 2, ay = r.top - box.top + r.height / 2;
      const cw = card.offsetWidth, ch = card.offsetHeight, gap = 34;
      const clampX = (x) => Math.max(8, Math.min(x, box.width - cw - 8));
      const clampY = (y) => Math.max(8, Math.min(y, box.height - ch - 8));
      const spots = [
        [clampX(ax + gap), clampY(ay - ch / 2)], [clampX(ax - cw - gap), clampY(ay - ch / 2)],
        [clampX(ax - cw / 2), clampY(ay - ch - gap - 18)], [clampX(ax - cw / 2), clampY(ay + gap + 24)],
      ];
      const centers = [...buttons, ...branchBtns].filter((b) => b !== anchor).map((b) => { const q = b.getBoundingClientRect(); return [q.left - box.left + q.width / 2, q.top - box.top + q.height / 2]; });
      const cost = ([x, y]) => {
        const coversAnchor = ax > x - 24 && ax < x + cw + 24 && ay > y - 24 && ay < y + ch + 24 ? 100 : 0;
        return coversAnchor + centers.filter(([cx, cy]) => cx > x - 20 && cx < x + cw + 20 && cy > y - 20 && cy < y + ch + 20).length;
      };
      const best = spots.reduce((a, b) => (cost(b) < cost(a) ? b : a));
      card.style.left = `${best[0]}px`;
      card.style.top = `${best[1]}px`;
    } else {
      card.style.left = ''; card.style.top = '';
    }
    if (hasGsap && !reduce) {
      gsap.fromTo(card, { autoAlpha: 0, y: 12, scale: 0.98 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.35, ease: 'power2.out' });
      gsap.fromTo(card.querySelectorAll('.jr-chip'), { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.35, stagger: 0.05, delay: 0.12, ease: 'back.out(2)' });
    }
  }

  // Pequena explosão de partículas ao desbloquear uma fase
  function burst(btn) {
    const r = btn.getBoundingClientRect(), box = stageEl.getBoundingClientRect();
    const cx = r.left - box.left + r.width / 2, cy = r.top - box.top + r.height / 2;
    for (let i = 0; i < 12; i++) {
      const s = document.createElement('i');
      s.className = 'jr-spark';
      s.style.left = `${cx}px`; s.style.top = `${cy}px`;
      stageEl.appendChild(s);
      const a = (Math.PI * 2 * i) / 12;
      gsap.to(s, { x: Math.cos(a) * 46, y: Math.sin(a) * 46, autoAlpha: 0, duration: 0.7, ease: 'power2.out', onComplete: () => s.remove() });
    }
  }

  // Rolagem → posição: cada fase tem uma parada, o caminho entre elas é suave
  const ease = (x) => x * x * (3 - 2 * x);
  function fromProgress(p) {
    const n = STAGES.length - 1;
    const t = p * n;
    const k = Math.min(n - 1, Math.floor(t));
    const f = t - k;
    const g = ease(Math.max(0, Math.min(1, (f - 0.3) / 0.4)));
    placeAt(nodeLens[k] + (nodeLens[k + 1] - nodeLens[k]) * g);
    setStage(g < 0.5 ? k : k + 1);
  }

  function goToStage(k, focus) {
    if (st) {
      const target = st.start + ((st.end - st.start) * k) / (STAGES.length - 1);
      P.scrollTo ? P.scrollTo(target) : window.scrollTo(0, target);
    } else {
      if (hasGsap && !reduce) {
        const from = { l: nodeLens[Math.max(0, current)] };
        gsap.to(from, { l: nodeLens[k], duration: 0.6, ease: 'power2.inOut', onUpdate: () => placeAt(from.l) });
      } else placeAt(nodeLens[k]);
      setStage(k);
    }
    if (focus) buttons[k].focus({ preventScroll: true });
  }

  function bindNodes() {
    buttons.forEach((b, i) => {
      b.addEventListener('click', () => goToStage(i));
      b.addEventListener('keydown', (e) => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (step) { e.preventDefault(); goToStage(Math.max(0, Math.min(STAGES.length - 1, i + step)), true); }
      });
    });
    branchBtns.forEach((b, i) => {
      b.addEventListener('click', () => showBranch(i));
      b.addEventListener('focus', () => showBranch(i));
    });
  }

  // Cursor: perto de um ponto, o marcador vai até ele; ao sair do mapa, volta para onde a rolagem manda
  stageEl.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !wide) return;
    // Em cima do card, o cursor lê o card; o clique ainda atravessa para os pontos
    const cr = card.getBoundingClientRect();
    if (wide && e.clientX > cr.left && e.clientX < cr.right && e.clientY > cr.top && e.clientY < cr.bottom) return;
    let best = null, bestD = 90 * 90;
    buttons.forEach((b, i) => {
      const r = b.getBoundingClientRect();
      const dd = (r.left + r.width / 2 - e.clientX) ** 2 + (r.top + r.height / 2 - e.clientY) ** 2;
      if (dd < bestD) { bestD = dd; best = { type: 'stage', i }; }
    });
    branchBtns.forEach((b, i) => {
      if (!b.classList.contains('unlocked')) return;
      const r = b.getBoundingClientRect();
      const dd = (r.left + r.width / 2 - e.clientX) ** 2 + (r.top + r.height / 2 - e.clientY) ** 2;
      if (dd < bestD) { bestD = dd; best = { type: 'branch', i }; }
    });
    if (!best) return;
    if (!previewing) previewFrom = st ? st.progress : 0;
    previewing = true;
    if (best.type === 'stage' && best.i !== current) {
      const from = { l: nodeLens[Math.max(0, current)] };
      if (hasGsap && !reduce) gsap.to(from, { l: nodeLens[best.i], duration: 0.45, ease: 'power2.out', overwrite: true, onUpdate: () => placeAt(from.l) });
      else placeAt(nodeLens[best.i]);
      setStage(best.i);
    } else if (best.type === 'branch') showBranch(best.i);
  });
  stageEl.addEventListener('pointerleave', () => { if (previewing && st) { previewing = false; fromProgress(st.progress); } });

  // Fixa a seção e liga a rolagem ao caminho (só com GSAP, tela larga e movimento liberado)
  function setupScroll() {
    if (st) { st.kill(); st = null; }
    if (!hasGsap || reduce) return;
    if (wide) {
      st = ScrollTrigger.create({
        trigger: root, pin: true, start: 'top top+=' + (document.querySelector('.site-top')?.offsetHeight || 0),
        end: () => `+=${(STAGES.length - 1) * window.innerHeight * 0.55}`, scrub: true,
        onUpdate: (self) => {
          if (previewing && Math.abs(self.progress - previewFrom) > 0.01) previewing = false;
          if (!previewing) fromProgress(self.progress);
        },
      });
    } else {
      // No celular o ponto ativo fica no terço de cima; o card ocupa o rodapé
      st = ScrollTrigger.create({ trigger: stageEl, start: 'top 32%', end: 'bottom 45%', scrub: true, onUpdate: (self) => fromProgress(self.progress) });
    }
    ScrollTrigger.refresh();
  }

  build();
  setupScroll();
  mq.addEventListener('change', () => { build(); setupScroll(); });
  window.addEventListener('resize', () => { if (current >= 0 && wide) setStage(current, true); });
})();
