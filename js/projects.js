// Projetos: interações da parte técnica e janelas de detalhe. O mapa do Gêmeo, o salão e o n8n ficam
// em gemeo.js, curly.js e n8n.js.
(() => {
  const P = window.PORTFOLIO;
  const reduce = P.reduceMotion;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));

  // Gêmeo, parte técnica: o ciclo de 30 segundos passo a passo
  const steps = $$('#cycle-steps .step');
  const detail = $('#cycle-detail');
  const show = (s) => { steps.forEach((x) => x.setAttribute('aria-pressed', String(x === s))); detail.innerHTML = `<b>${s.querySelector('b').textContent}.</b> ${s.dataset.detail}`; };
  steps.forEach((s) => s.addEventListener('click', () => show(s)));
  $('#cycle-run')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    for (const s of steps) { s.classList.add('is-lit'); show(s); await wait(850); }
    await wait(500);
    steps.forEach((s) => s.classList.remove('is-lit'));
    btn.disabled = false;
  });
  if (steps[0]) show(steps[0]);

  // A regra que decide a cor do ônibus, com a linha que decidiu destacada
  const STATE = { normal: 'var(--st-normal)', alert: 'var(--st-alert)', jammed: 'var(--st-jam)', alert_jammed: 'var(--st-both)' };
  const flags = { isAlert: false, isFlooded: false, isJammed: false };
  const status = ({ isAlert, isFlooded, isJammed }) => (isAlert && isJammed ? 'alert_jammed' : isAlert || isFlooded ? 'alert' : isJammed ? 'jammed' : 'normal');
  const paintRule = () => {
    const st = status(flags);
    $('#rule-dot').style.background = STATE[st];
    $('#rule-code-out').textContent = st;
    $$('#rule-code [data-line]').forEach((l) => l.classList.toggle('hl', l.dataset.line === st));
  };
  $$('#rule-toggles .btn').forEach((b) => b.addEventListener('click', () => {
    flags[b.dataset.flag] = !flags[b.dataset.flag];
    b.setAttribute('aria-pressed', String(flags[b.dataset.flag]));
    b.classList.toggle('active', flags[b.dataset.flag]);
    paintRule();
  }));
  if ($('#rule-code')) paintRule();

  // O contrato invisível entre três repositórios
  const chain = $('#chain-break');
  chain?.addEventListener('change', () => {
    const broken = chain.checked;
    $('#chain-prefect').innerHTML = broken ? '"Inundação"<small>Prefect traduz (nome trocado)</small>' : '"Alagamento"<small>Prefect traduz</small>';
    $('#chain-prefect').classList.toggle('is-changed', broken);
    $('#chain-bff').innerHTML = broken ? 'subtipo_alerta: "inundação"<small>BFF normaliza</small>' : 'subtipo_alerta: "alagamento"<small>BFF normaliza</small>';
    $('#chain-render').classList.toggle('is-broken', broken);
    $('#chain-render').innerHTML = broken ? 'value: "alagamento" ≠ "inundação"<small>o ícone some do mapa</small>' : 'value: "alagamento" → <i class="bi bi-water"></i><small>renderer mostra o ícone</small>';
    $('#chain-msg').textContent = broken ? 'O ícone de alagamento desapareceu, sem erro, sem aviso e sem build quebrado.' : 'A mesma string atravessa os três repositórios até virar ícone.';
  });

  // Detalhes dos outros projetos em janela
  const dm = document.getElementById('detail-modal');
  $$('[data-modal]').forEach((b) => b.addEventListener('click', () => {
    const tpl = document.getElementById(b.dataset.modal);
    if (!dm || !tpl || !window.bootstrap) return;
    dm.querySelector('.modal-title').textContent = b.dataset.title;
    dm.querySelector('.modal-body').innerHTML = tpl.innerHTML;
    bootstrap.Modal.getOrCreateInstance(dm).show();
  }));
})();
