// Habilidades na prática: cada área mostra as tecnologias e, ao escolher uma, o exemplo real de onde e
// como ela foi usada nos projetos. Abaixo, a matriz habilidades × projetos.
(() => {
  const P = window.PORTFOLIO;
  const lab = document.getElementById('skill-lab');
  if (!lab) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const proj = Object.fromEntries(P.projects.map((p) => [p.id, p]));
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tabs = lab.querySelector('.lab-tabs');
  const chips = lab.querySelector('.lab-chips');
  const detail = lab.querySelector('.lab-detail');
  const areaDesc = lab.querySelector('.lab-area-desc');
  let area = P.areas[0], skill = null;

  tabs.innerHTML = P.areas.map((a, i) => `<button type="button" class="lab-tab" role="tab" id="lab-tab-${a.id}" aria-controls="lab-panel" aria-selected="${i === 0}" data-area="${a.id}"><i class="bi ${a.icon}" aria-hidden="true"></i><span>${a.label}</span><small>${a.groups.reduce((n, g) => n + g.skills.length, 0)}</small></button>`).join('');

  const renderArea = () => {
    areaDesc.textContent = area.desc;
    chips.innerHTML = area.groups.map((g) => `
      ${g.label ? `<div class="eyebrow mt-2">${g.label}</div>` : ''}
      <div class="lab-chip-row">${g.skills.map((s) => {
        const n = (P.examples[s] || []).length;
        return `<button type="button" class="lab-chip${n ? '' : ' is-empty'}" data-skill="${esc(s)}" aria-pressed="false">${esc(s)}${n ? `<span class="lab-n">${n}</span>` : ''}</button>`;
      }).join('')}</div>`).join('');
    chips.querySelectorAll('.lab-chip').forEach((b) => b.addEventListener('click', () => select(b.dataset.skill)));
    const first = area.groups.flatMap((g) => g.skills).find((s) => (P.examples[s] || []).length);
    select(first);
    if (!reduce && window.gsap) gsap.fromTo(chips.querySelectorAll('.lab-chip'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.025 });
  };

  const select = (s) => {
    skill = s;
    chips.querySelectorAll('.lab-chip').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.skill === s)));
    const ex = P.examples[s] || [];
    detail.innerHTML = `
      <div class="lab-detail-head"><span class="eyebrow">${area.label}</span><h3>${esc(s)}</h3></div>
      ${ex.length ? `<ol class="lab-examples">${ex.map(([pid, text]) => `
        <li><a class="lab-ex" href="${proj[pid].href}">
          <span class="lab-ex-proj">${proj[pid].label}</span>
          <span class="lab-ex-text">${text}</span>
          <span class="lab-ex-go" aria-hidden="true"><i class="bi bi-arrow-up-right"></i></span>
        </a></li>`).join('')}</ol>` : '<p class="text-muted-2 mb-0">Uso em estudos e interfaces React; ainda sem um projeto do portfólio para mostrar aqui.</p>'}`;
    if (!reduce && window.gsap) gsap.fromTo(detail.querySelectorAll('.lab-ex, h3'), { autoAlpha: 0, x: 14 }, { autoAlpha: 1, x: 0, duration: 0.35, stagger: 0.06 });
  };

  tabs.querySelectorAll('.lab-tab').forEach((t, i, all) => {
    t.addEventListener('click', () => {
      area = P.areas.find((a) => a.id === t.dataset.area);
      all.forEach((x) => x.setAttribute('aria-selected', String(x === t)));
      renderArea();
    });
    t.addEventListener('keydown', (e) => {
      const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!k) return;
      e.preventDefault();
      const n = all[(i + k + all.length) % all.length];
      n.focus(); n.click();
    });
  });
  renderArea();

  // Matriz habilidades × projetos (cada habilidade aparece uma vez, na primeira área em que está)
  const table = document.getElementById('matrix');
  if (!table) return;
  const seen = new Set();
  const cols = P.projects;
  let body = '';
  P.areas.forEach((a) => {
    const skills = a.groups.flatMap((g) => g.skills).filter((s) => !seen.has(s) && (seen.add(s), true));
    body += `<tr class="area-row"><th colspan="${cols.length + 1}" scope="colgroup">${a.label}</th></tr>`;
    body += skills.map((s) => {
      const used = P.usage[s] || [];
      return `<tr data-projects="${used.join(' ')}"><th scope="row">${esc(s)}</th>${cols.map((c) => `<td data-col="${c.id}">${used.includes(c.id) ? `<span class="cell" role="img" aria-label="usado em ${c.label}"></span>` : '<span class="visually-hidden">não</span>'}</td>`).join('')}</tr>`;
    }).join('');
  });
  table.innerHTML = `
    <caption class="visually-hidden">Em quais projetos cada habilidade foi usada</caption>
    <thead><tr><th scope="col" class="text-start">Habilidade</th>${cols.map((c) => `<th scope="col" data-col="${c.id}"><button type="button" aria-pressed="false" data-col="${c.id}">${c.label}</button></th>`).join('')}</tr></thead>
    <tbody>${body}</tbody>`;
  const counter = document.getElementById('matrix-count');
  const setCount = (n, label) => { if (counter) counter.textContent = label ? `${n} habilidades usadas em ${label}` : `${seen.size} habilidades · ${cols.length} projetos`; };
  setCount();
  table.querySelectorAll('thead button').forEach((b) => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    table.querySelectorAll('thead button').forEach((x) => x.setAttribute('aria-pressed', 'false'));
    table.querySelectorAll('.col-hot').forEach((x) => x.classList.remove('col-hot'));
    let n = 0;
    table.querySelectorAll('tbody tr[data-projects]').forEach((tr) => {
      const hit = tr.dataset.projects.split(' ').includes(b.dataset.col);
      tr.classList.toggle('is-out', on && !hit);
      if (on && hit) n++;
    });
    if (on) {
      b.setAttribute('aria-pressed', 'true');
      table.querySelectorAll(`[data-col="${b.dataset.col}"]`).forEach((x) => { if (x.tagName !== 'BUTTON') x.classList.add('col-hot'); });
      setCount(n, cols.find((c) => c.id === b.dataset.col).label);
    } else setCount();
  }));
})();
