// Fluidez entre as seções: rolagem suave (Lenis) sincronizada com o GSAP ScrollTrigger,
// entrada das seções em sequência e transições nas abas. Sem movimento para quem pede menos movimento.
(() => {
  const P = window.PORTFOLIO;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const headerOffset = () => {
    const top = document.querySelector('.site-top');
    return (top ? top.getBoundingClientRect().height : 0) + 12;
  };

  let lenis = null;
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true, wheelMultiplier: 0.95, touchMultiplier: 1.2 });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    // Janelas do Bootstrap travam a página por baixo
    document.addEventListener('show.bs.modal', () => lenis.stop());
    document.addEventListener('hidden.bs.modal', () => lenis.start());
  }
  P.lenis = lenis;

  // Rolagem até um elemento descontando o cabeçalho fixo
  P.scrollTo = (target, opts = {}) => {
    const el = typeof target === 'string' ? document.getElementById(target) : target;
    if (lenis) {
      lenis.scrollTo(typeof target === 'number' ? target : el, { offset: typeof target === 'number' ? 0 : -headerOffset(), duration: opts.duration || 1.2, immediate: !!opts.immediate });
    } else if (typeof target === 'number') {
      window.scrollTo({ top: target, behavior: reduce ? 'auto' : 'smooth' });
    } else if (el) {
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
  };

  // Entrada em sequência: usada pelo app.js no lugar do IntersectionObserver
  if (hasGsap && !reduce) {
    const pending = [];
    let scheduled = false;
    P.revealWith = (el, onReveal) => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) { onReveal(); return; }
      // Só opacidade (sem visibility): o conteúdo continua alcançável pelo Tab e pela busca da página
      gsap.set(el, { opacity: 0, y: 28, filter: 'blur(4px)' });
      el.addEventListener('focusin', () => { gsap.to(el, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.3, clearProps: 'filter,transform' }); el.dispatchEvent(new CustomEvent('reveal-now')); }, { once: true });
      pending.push({ el, onReveal });
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        ScrollTrigger.batch(pending.splice(0).map((p) => p.el), {
          start: 'top 88%',
          once: true,
          onEnter: (batch) => {
            gsap.to(batch, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8, ease: 'power3.out', stagger: 0.09, clearProps: 'filter,transform' });
            batch.forEach((b) => b.dispatchEvent(new CustomEvent('reveal-now')));
          },
        });
      });
      el.addEventListener('reveal-now', onReveal, { once: true });
    };

    // Hero: o texto sobe e esmaece enquanto o fundo fica, dando profundidade na passagem para a próxima seção
    const hero = document.querySelector('.hero');
    if (hero) {
      gsap.to(hero.querySelector('.hero-inner'), { y: -80, autoAlpha: 0.15, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to(hero.querySelector('canvas'), { scale: 1.12, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    }

    // Títulos de seção deslizam levemente com a rolagem
    document.querySelectorAll('.section-head h1, .section-head h2, .project-head h2').forEach((h) => {
      gsap.fromTo(h, { x: -24 }, { x: 0, ease: 'none', scrollTrigger: { trigger: h, start: 'top 95%', end: 'top 45%', scrub: true } });
    });

    // Abas: o conteúdo novo entra deslizando
    document.addEventListener('shown.bs.tab', (e) => {
      const pane = document.querySelector(e.target.dataset.bsTarget);
      if (!pane) return;
      gsap.fromTo(pane.children, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out', stagger: 0.06, clearProps: 'transform' });
      ScrollTrigger.refresh();
    });

    window.addEventListener('load', () => ScrollTrigger.refresh());
  }

  // Ao abrir uma página com #capítulo, posiciona já descontando o cabeçalho
  if (location.hash && lenis) {
    const el = document.getElementById(location.hash.slice(1));
    if (el) window.addEventListener('load', () => P.scrollTo(el, { immediate: true }));
  }
})();
