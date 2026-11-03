// Etapas explicadas do Gêmeo e do n8n. No Gêmeo, o mapa em camadas acompanha a etapa que está no meio da
// tela (e as camadas se afastam com a rolagem); no n8n, cada card aponta o nó correspondente no fluxo.
(() => {
  const P = window.PORTFOLIO;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Minifluxos: na horizontal quando cabem, senão na vertical ----------
  const flows = [...document.querySelectorAll('.mf')];
  const fit = () => flows.forEach((f) => {
    f.classList.remove('is-vertical');
    if (f.scrollWidth > f.clientWidth + 2) f.classList.add('is-vertical');
  });
  fit();
  let fitRaf = 0;
  window.addEventListener('resize', () => { cancelAnimationFrame(fitRaf); fitRaf = requestAnimationFrame(fit); });
  document.fonts?.ready.then(fit);

  // ---------- Gêmeo: mapa em camadas ----------
  const lm = document.getElementById('gemeo-layers');
  if (lm) {
    const cards = [...document.querySelectorAll('#gemeo-etapas .step-card')];
    const layers = [...lm.querySelectorAll('.lm-layer')];
    const keys = [...document.querySelectorAll('#gemeo-etapas .lm-key')];
    const caption = document.getElementById('lm-caption');
    const initial = caption.innerHTML;
    const short = Object.fromEntries(keys.map((k) => [k.dataset.layer, k.dataset.name]));
    let active = -1, pinned = null;

    const light = (ids) => {
      lm.classList.toggle('has-focus', ids.length > 0);
      layers.forEach((l) => l.classList.toggle('is-on', ids.includes(l.dataset.layer)));
      keys.forEach((k) => k.classList.toggle('is-on', ids.includes(k.dataset.layer)));
    };
    const stepLayers = () => (active >= 0 ? cards[active].dataset.layers.split(' ') : []);
    const restore = () => light(pinned ? [pinned] : stepLayers());

    const setStep = (k) => {
      if (k === active) return;
      active = k;
      pinned = null;
      keys.forEach((x) => x.setAttribute('aria-pressed', 'false'));
      cards.forEach((c, i) => c.classList.toggle('is-active', i === k));
      lm.dataset.step = String(k + 1);
      if (k < 0) { light([]); caption.innerHTML = initial; return; }
      const c = cards[k];
      const ids = stepLayers();
      light(ids);
      caption.innerHTML = `<b>Etapa ${k + 1} · ${c.querySelector('.eyebrow').textContent}</b> · ${ids.length === layers.length ? 'todas as camadas' : ids.map((id) => short[id]).join(', ')}`;
    };

    // A etapa que cruza o meio da tela é a ativa
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) setStep(cards.indexOf(e.target));
    }), { rootMargin: '-45% 0px -45% 0px' });
    cards.forEach((c, i) => {
      io.observe(c);
      c.addEventListener('pointerenter', () => setStep(i));
      c.addEventListener('focusin', () => setStep(i));
    });

    // Legenda: passar o mouse mostra a camada; clicar fixa até a próxima etapa
    keys.forEach((k) => {
      k.addEventListener('pointerenter', () => light([k.dataset.layer]));
      k.addEventListener('pointerleave', restore);
      k.addEventListener('click', () => {
        pinned = pinned === k.dataset.layer ? null : k.dataset.layer;
        keys.forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.layer === pinned)));
        restore();
      });
    });

    // As camadas se afastam enquanto o bloco entra na tela
    if (!reduce && window.gsap && window.ScrollTrigger) {
      gsap.fromTo(lm, { '--gap': '8px' }, { '--gap': '38px', ease: 'none', scrollTrigger: { trigger: lm, start: 'top 90%', end: 'top 35%', scrub: true } });
    } else lm.style.setProperty('--gap', '34px');
  }

  // ---------- n8n: card ↔ nó do fluxo ----------
  const stage = document.getElementById('flow-stage');
  if (stage) {
    const node = (id) => stage.querySelector(`.flow-node[data-node="${id}"]`);
    const cards = [...document.querySelectorAll('#n8n-etapas .step-card')];
    let pulse = 0;
    cards.forEach((c) => {
      const nodes = (c.dataset.node || '').split(' ').map(node).filter(Boolean);
      const on = (v) => { nodes.forEach((n) => n.classList.toggle('is-pointed', v)); c.classList.toggle('is-active', v); };
      c.addEventListener('pointerenter', () => on(true));
      c.addEventListener('pointerleave', () => on(false));
      c.addEventListener('focusin', () => on(true));
      c.addEventListener('focusout', (e) => { if (!c.contains(e.relatedTarget)) on(false); });
      // O fluxo fica acima dos cards: um atalho sobe até ele e acende o nó
      const see = document.createElement('button');
      see.type = 'button';
      see.className = 'step-see';
      see.innerHTML = `<i class="bi bi-arrow-up" aria-hidden="true"></i> ver ${nodes.length > 1 ? 'o fluxo inteiro' : 'este nó no fluxo'}`;
      see.addEventListener('click', () => {
        if (P.scrollTo) P.scrollTo(stage.closest('.flow-scroll') || stage); else stage.scrollIntoView({ block: 'center' });
        clearTimeout(pulse);
        stage.querySelectorAll('.is-pointed').forEach((n) => n.classList.remove('is-pointed'));
        nodes.forEach((n) => n.classList.add('is-pointed'));
        pulse = setTimeout(() => nodes.forEach((n) => n.classList.remove('is-pointed')), 2600);
      });
      c.querySelector('p').after(see);
    });
    // E o contrário: passar o mouse num nó acende o card dele
    stage.querySelectorAll('.flow-node').forEach((n) => {
      const card = cards.find((c) => c.dataset.node === n.dataset.node);
      if (!card) return;
      n.addEventListener('pointerenter', () => card.classList.add('is-active'));
      n.addEventListener('pointerleave', () => card.classList.remove('is-active'));
    });
  }
})();
