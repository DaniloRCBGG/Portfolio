// Ligações entre Projetos e Habilidades, nos dois sentidos: cada projeto mostra as habilidades que usou
// (e cada etapa, as dela); clicar numa leva ao laboratório de Habilidades já aberto nela. Do laboratório,
// cada exemplo leva à etapa do projeto. Depois de um salto aparece um botão para voltar de onde veio.
(() => {
  const P = window.PORTFOLIO;
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const link = (s, text = s) => `<a class="skill-link" href="#habilidade-${P.slug(s)}" data-skill="${esc(s)}">${esc(text)}</a>`;
  const known = (s) => (P.hasSkill ? P.hasSkill(s) : true);

  // Habilidades de cada projeto, na ordem das áreas, a partir dos exemplos do data.js
  const order = [...new Set(P.areas.flatMap((a) => a.groups.flatMap((g) => g.skills)))];
  document.querySelectorAll('.proj-skills[data-project]').forEach((box) => {
    const pid = box.dataset.project;
    const names = order.filter((s) => (P.usage[s] || []).includes(pid));
    if (!names.length) { box.remove(); return; }
    const label = box.classList.contains('is-compact') ? 'Habilidades' : `Habilidades deste projeto · ${names.length}`;
    box.innerHTML = `<span class="sl-label">${label}</span>${names.map((s) => link(s)).join('')}`;
  });

  // Conquistas da trajetória também levam às habilidades
  const alias = { 'ArcGIS Maps SDK': 'ArcGIS Maps SDK for JavaScript' };
  document.querySelectorAll('.jr-chip').forEach((li) => {
    const name = li.textContent.replace(/^\+\s*/, '').trim();
    const s = alias[name] || name;
    if (known(s) && P.usage[s]) li.innerHTML = `<a href="#habilidade-${P.slug(s)}" class="skill-link-plain" data-skill="${esc(s)}">+ ${esc(name)}</a>`;
  });

  // Botão de volta
  const back = document.createElement('div');
  back.className = 'jump-back';
  back.hidden = true;
  back.innerHTML = '<button type="button" class="jb-go"><i class="bi bi-arrow-return-left" aria-hidden="true"></i><span></span></button><button type="button" class="jb-x" aria-label="Fechar o botão de volta"><i class="bi bi-x-lg" aria-hidden="true"></i></button>';
  document.body.appendChild(back);
  let backTo = null, backTimer = 0, landY = null;
  const showBack = (info) => {
    clearTimeout(backTimer);
    backTo = info;
    back.hidden = !info;
    landY = null;
    if (!info) return;
    back.querySelector('span').textContent = `Voltar para ${info.label}`;
    // Depois que a rolagem do salto termina, anota onde a pessoa chegou
    setTimeout(() => { if (backTo === info) landY = window.scrollY; }, 1500);
    backTimer = setTimeout(() => { back.hidden = true; }, 30000);
  };
  // Se a pessoa seguir lendo para longe de onde chegou, o botão sai do caminho
  window.addEventListener('scroll', () => {
    if (landY !== null && !back.hidden && Math.abs(window.scrollY - landY) > window.innerHeight * 1.5) showBack(null);
  }, { passive: true });
  back.querySelector('.jb-x').addEventListener('click', () => showBack(null));
  back.querySelector('.jb-go').addEventListener('click', () => {
    const info = backTo;
    showBack(null);
    if (!info) return;
    if (info.skill) P.openSkill?.(info.skill);
    jump(info.el, null, info.focus);
  });

  const focusables = 'a, button, input, textarea, select, summary, [tabindex]';
  const land = (el) => {
    el.classList.remove('is-landed');
    void el.offsetWidth;
    el.classList.add('is-landed');
    setTimeout(() => el.classList.remove('is-landed'), 2000);
  };
  function jump(el, hash, focusEl) {
    if (!el) return;
    if (P.scrollTo) P.scrollTo(el); else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (hash) history.replaceState(null, '', hash);
    const f = focusEl || el;
    if (!f.matches(focusables)) f.setAttribute('tabindex', '-1');
    f.focus({ preventScroll: true });
    if (el.matches('.step-card, .mini-card, .skill-lab, .jr-card, .proj-skills')) land(el);
  }

  // De onde a pessoa saiu, para o botão de volta
  const origin = (a) => {
    let box = a.closest('.step-card, .pf-card, .nb, .mini-card, .jr-card, .proj-skills, #mapa, .project, section[id]');
    if (!box) return null;
    if (box.matches('.proj-skills.is-compact')) box = box.closest('.mini-card') || box;
    const proj = a.closest('.project');
    const name = proj ? proj.querySelector('h2').textContent.trim() : '';
    let label = name || box.querySelector('h2, h3')?.textContent.trim() || 'onde estava';
    if (box.matches('.step-card')) label = `${name} · etapa ${box.querySelector('.step-no').textContent}`;
    else if (box.matches('.nb')) label = `${name} · NitBike`;
    else if (box.matches('.pf-card')) label = `${name} · ${box.dataset.where}`;
    else if (box.matches('.mini-card')) label = box.querySelector('h3').textContent.trim();
    else if (box.matches('.jr-card')) label = 'Trajetória';
    else if (box.id === 'mapa') label = 'Habilidades × projetos';
    return { label, el: box, focus: a };
  };

  const lab = document.getElementById('skill-lab');
  const openSkill = (name, from, immediate) => {
    if (!lab || !P.openSkill || !P.openSkill(name)) return false;
    const chip = lab.querySelector('.lab-chip[aria-pressed="true"]');
    if (immediate) {
      if (P.scrollTo) P.scrollTo(lab, { immediate: true }); else lab.scrollIntoView();
      return true;
    }
    jump(lab, `#habilidade-${P.slug(name)}`, chip);
    showBack(from ? origin(from) : null);
    return true;
  };
  P.openSkillFrom = openSkill;

  // Um só ouvinte para os links internos: rolagem suave, habilidades e saltos de volta
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.matches('.skip, [data-bs-toggle]')) return;
    const href = a.getAttribute('href');
    if (href.length < 2) return;
    if (a.dataset.skill) {
      if (openSkill(a.dataset.skill, a)) e.preventDefault();
      return;
    }
    const el = document.getElementById(decodeURIComponent(href.slice(1)));
    if (!el) return;
    e.preventDefault();
    // Saindo do laboratório para um projeto: o botão de volta reabre a mesma habilidade
    const skill = a.dataset.fromSkill;
    jump(el, href, null);
    if (skill) showBack({ label: `Habilidades · ${skill}`, el: a.closest('#mapa') || lab, skill, focus: null });
    else showBack(null);
    // O menu do celular fecha depois de escolher uma rota
    const menu = a.closest('.navbar-collapse.show');
    if (menu && window.bootstrap) bootstrap.Collapse.getOrCreateInstance(menu).hide();
  });

  // Link direto para uma habilidade (#habilidade-react) abre o laboratório nela. Ao abrir a página, o
  // layout ainda cresce (pinos do ScrollTrigger, imagens): reposiciona algumas vezes até assentar.
  const fromHash = (immediate) => {
    const m = location.hash.match(/^#habilidade-(.+)$/);
    if (!m) return false;
    const s = order.find((x) => P.slug(x) === m[1]);
    return s ? openSkill(s, null, immediate) : false;
  };
  const settle = () => {
    const id = location.hash.slice(1);
    const isSkill = /^habilidade-/.test(id);
    const el = isSkill ? lab : document.getElementById(id);
    if (!el || !P.lenis) { if (isSkill) fromHash(true); return; }
    if (isSkill) fromHash(true);
    let n = 0;
    const again = () => { if (n++ < 6 && window.scrollY > 0) P.scrollTo(el, { immediate: true }); };
    window.ScrollTrigger?.addEventListener('refresh', again);
    [120, 400, 900, 1600].forEach((t) => setTimeout(again, t));
    setTimeout(() => window.ScrollTrigger?.removeEventListener('refresh', again), 2500);
    // Se a pessoa rolar nesse meio-tempo, para de reposicionar
    const stop = () => { n = 99; };
    window.addEventListener('wheel', stop, { once: true, passive: true });
    window.addEventListener('touchstart', stop, { once: true, passive: true });
    window.addEventListener('keydown', stop, { once: true });
    window.addEventListener('pointerdown', stop, { once: true });
  };
  if (location.hash.length > 1) {
    if (document.readyState === 'complete') settle(); else window.addEventListener('load', settle);
  }
  window.addEventListener('hashchange', () => fromHash(false));
})();
