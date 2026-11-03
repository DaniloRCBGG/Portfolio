// Habilidades: blocos por área com filtro, balões "usado em" e a matriz habilidades × projetos.
(() => {
  const P = window.PORTFOLIO;
  const grid = document.getElementById('areas-grid');
  if (!grid) return;
  const projName = Object.fromEntries(P.projects.map((p) => [p.id, p.label]));
  const projHref = { gemeo: 'projetos.html#gemeo', curly: 'projetos.html#curly', n8n: 'projetos.html#n8n', inspira: 'projetos.html#outros', webhook: 'projetos.html#outros', academicos: 'projetos.html#outros' };
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const maxCount = Math.max(...P.areas.map((a) => a.groups.reduce((n, g) => n + g.skills.length, 0)));

  grid.innerHTML = P.areas.map((a, i) => {
    const count = a.groups.reduce((n, g) => n + g.skills.length, 0);
    const groups = a.groups.map((g) => `
      <div class="area-sub">
        ${g.label ? `<div class="eyebrow">${g.label}</div>` : ''}
        <ul class="tag-list">${g.skills.map((s) => `<li><button type="button" class="tag" data-skill="${esc(s)}" data-area="${a.id}">${esc(s)}</button></li>`).join('')}</ul>
      </div>`).join('');
    const used = [...new Set(a.groups.flatMap((g) => g.skills.flatMap((s) => P.usage[s] || [])))];
    return `
    <div class="col-12 col-lg-6 area-col" data-area="${a.id}">
      <section class="panel panel-pad area-card reveal" aria-labelledby="area-${a.id}">
        <div class="area-head">
          <span class="area-icon"><i class="bi ${a.icon}" aria-hidden="true"></i></span>
          <h2 id="area-${a.id}">${a.label}</h2>
          <span class="area-rank">${String(i + 1).padStart(2, '0')} · ${count} tecnologias</span>
        </div>
        <div class="area-meter" aria-hidden="true"><i data-w="${Math.round((count / maxCount) * 100)}"></i></div>
        <p class="mb-0 text-muted-2">${a.desc}</p>
        ${groups}
        <p class="mb-0 small text-muted-2">Usado em: <strong class="text-body">${used.map((u) => projName[u]).join(', ')}</strong></p>
      </section>
    </div>`;
  }).join('');
  grid.querySelectorAll('.reveal').forEach((el) => P.observeReveal(el));
  const fillMeters = () => grid.querySelectorAll('.area-meter i').forEach((i) => { i.style.width = `${i.dataset.w}%`; });
  document.addEventListener('revealed', fillMeters);
  setTimeout(fillMeters, 300);

  // Balões "usado em"
  if (window.bootstrap) {
    grid.querySelectorAll('button.tag').forEach((btn) => {
      const ids = P.usage[btn.dataset.skill] || [];
      const area = P.areas.find((a) => a.id === btn.dataset.area);
      const content = ids.length
        ? `<div class="small">Usado em:</div><ul class="mb-0 ps-3 small">${ids.map((id) => `<li><a href="${projHref[id]}">${projName[id]}</a></li>`).join('')}</ul>`
        : `<div class="small">${area.desc}</div>`;
      const pop = bootstrap.Popover.getOrCreateInstance(btn, { title: btn.dataset.skill, content, html: true, trigger: 'click', placement: 'top', container: 'body' });
      btn.addEventListener('show.bs.popover', () => {
        grid.querySelectorAll('button.tag[aria-describedby]').forEach((o) => { if (o !== btn) bootstrap.Popover.getInstance(o)?.hide(); });
      });
      btn.addEventListener('keydown', (e) => { if (e.key === 'Escape') pop.hide(); });
    });
    // Clique fora fecha o balão aberto (os links dentro dele continuam clicáveis)
    document.addEventListener('click', (e) => {
      if (e.target.closest('.popover') || e.target.closest('button.tag')) return;
      grid.querySelectorAll('button.tag[aria-describedby]').forEach((o) => bootstrap.Popover.getInstance(o)?.hide());
    });
  }

  // Filtro por área
  const filters = document.getElementById('area-filter');
  filters?.addEventListener('change', (e) => {
    const v = e.target.value;
    grid.querySelectorAll('.area-col').forEach((c) => { c.classList.toggle('d-none', v !== 'todas' && c.dataset.area !== v); });
    fillMeters();
  });

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
  table.querySelectorAll('tbody tr[data-projects]').forEach((tr) => {
    tr.addEventListener('mouseenter', () => tr.classList.add('is-hot'));
    tr.addEventListener('mouseleave', () => tr.classList.remove('is-hot'));
  });
})();
