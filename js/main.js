// Botões de copiar (email e link do portfólio)
document.querySelectorAll('[data-copy]').forEach((btn) => {
  const original = btn.innerHTML;
  btn.addEventListener('click', () => {
    const text = btn.dataset.copy;
    const done = (msg) => {
      btn.textContent = msg;
      setTimeout(() => { btn.innerHTML = original; }, 1800);
    };
    try {
      navigator.clipboard.writeText(text).then(() => done('Copiado'), () => done(text));
    } catch (e) { done(text); }
  });
});

// Projetos: imagens ampliadas e demonstrações (só nas páginas que têm projetos)
if (document.getElementById('viewer')) {
    // Imagens: o espaço some enquanto o arquivo não existe; o clique abre a imagem ampliada
    const viewer = document.getElementById('viewer');
    const vImg = document.getElementById('viewer-img');
    const vCap = document.getElementById('viewer-cap');
    const vPrev = document.getElementById('viewer-prev');
    const vNext = document.getElementById('viewer-next');
    let group = [], current = 0;
    const show = (i) => {
      current = (i + group.length) % group.length;
      const img = group[current];
      vImg.src = img.currentSrc || img.src;
      vImg.alt = img.alt;
      vCap.textContent = img.alt;
      vPrev.hidden = vNext.hidden = group.length < 2;
    };
    document.querySelectorAll('.shots').forEach((box) => {
      const check = () => { box.hidden = box.querySelectorAll('.shot').length === 0; };
      box.querySelectorAll('.shot').forEach((btn) => {
        const img = btn.querySelector('img');
        const drop = () => { btn.remove(); check(); };
        if (img.complete && img.naturalWidth === 0) drop();
        img.addEventListener('error', drop);
        btn.addEventListener('click', () => {
          group = [...box.querySelectorAll('.shot img')];
          show(group.indexOf(img));
          if (viewer.showModal) viewer.showModal(); else window.open(img.src, '_blank');
        });
      });
      check();
    });
    vPrev.addEventListener('click', () => show(current - 1));
    vNext.addEventListener('click', () => show(current + 1));
    document.getElementById('viewer-close').addEventListener('click', () => viewer.close());
    viewer.addEventListener('click', (e) => { if (e.target === viewer) viewer.close(); });
    viewer.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    });

    // Gêmeo: a mesma regra que decide a cor de cada ônibus no mapa
    const busStates = {
      normal: ['var(--s-normal)', 'circulando sem ocorrências'],
      alert: ['var(--s-alert)', 'perto de um alerta ou alagamento'],
      jammed: ['var(--s-jam)', 'em trecho congestionado'],
      alert_jammed: ['var(--s-both)', 'alerta e congestionamento juntos'],
    };
    const flags = { alert: false, jam: false };
    const renderBus = () => {
      const st = flags.alert && flags.jam ? 'alert_jammed' : flags.alert ? 'alert' : flags.jam ? 'jammed' : 'normal';
      document.getElementById('bus-dot').style.background = busStates[st][0];
      document.getElementById('bus-code').textContent = st;
      document.getElementById('bus-text').textContent = busStates[st][1];
      document.querySelectorAll('#bus-legend .state').forEach((el) => el.classList.toggle('is-active', el.dataset.state === st));
    };
    document.querySelectorAll('#bus-demo .toggle').forEach((t) => t.addEventListener('click', () => {
      flags[t.dataset.flag] = !flags[t.dataset.flag];
      t.setAttribute('aria-pressed', String(flags[t.dataset.flag]));
      renderBus();
    }));

    // Curly Studio: cada estado acende as etapas do fluxo em que ele acontece
    const curlySvg = document.querySelector('[aria-labelledby="curly"] svg.cycle');
    const curlyButtons = document.querySelectorAll('#curly-legend button.state');
    curlyButtons.forEach((b) => b.addEventListener('click', () => {
      const on = b.getAttribute('aria-pressed') !== 'true';
      curlyButtons.forEach((x) => { x.setAttribute('aria-pressed', 'false'); x.classList.remove('is-active'); });
      curlySvg.querySelectorAll('[data-node]').forEach((n) => n.classList.remove('lit'));
      if (!on) return;
      b.setAttribute('aria-pressed', 'true');
      b.classList.add('is-active');
      b.dataset.nodes.split(' ').forEach((n) => curlySvg.querySelector(`[data-node="${n}"]`).classList.add('lit'));
    }));

    // n8n: o evento válido segue até a resposta; o inválido sai pelo caminho de erro no IF
    const n8nSvg = document.querySelector('[aria-labelledby="n8n"] svg.cycle');
    const cases = {
      ok: {
        nodes: 'webhook p1 code p2 if p3 pg p4 resp',
        payload: '{\n  "event_id": "evt-0001",\n  "source": "sistema-exemplo",\n  "timestamp": "2026-03-10T14:32:00-03:00",\n  "data": { "tipo": "teste", "descricao": "payload de exemplo" }\n}',
        dot: 'var(--s-normal)', code: 'HTTP 200', text: 'campos conferidos, evento gravado em webhook_events',
      },
      bad: {
        nodes: 'webhook p1 code p2 if perr',
        payload: '{\n  "event_id": "evt-0002",\n  "source": "sistema-exemplo",\n  "data": { "tipo": "teste" }\n}',
        dot: 'var(--s-jam)', code: 'caminho de erro', text: 'falta o campo timestamp, nada é gravado no banco',
      },
    };
    const renderN8n = (k) => {
      const c = cases[k];
      document.querySelectorAll('#n8n-demo .toggle').forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.case === k)));
      document.getElementById('n8n-payload').textContent = c.payload;
      document.getElementById('n8n-dot').style.background = c.dot;
      document.getElementById('n8n-code').textContent = c.code;
      document.getElementById('n8n-text').textContent = c.text;
      n8nSvg.querySelectorAll('[data-node]').forEach((n) => n.classList.toggle('lit', c.nodes.split(' ').includes(n.dataset.node)));
    };
    document.querySelectorAll('#n8n-demo .toggle').forEach((t) => t.addEventListener('click', () => renderN8n(t.dataset.case)));
    renderN8n('ok');
}
