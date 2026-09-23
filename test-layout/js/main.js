/**
 * Banc de layouts — une seule offre à l'écran, six mises en scène différentes.
 *
 * Techno : SVG inline + GSAP (la plus simple du lab, aucune compilation). Les trois visuels
 * viennent de js/svg-data.js, généré par le prototype 01 : même source, même rendu.
 *
 * Règle de la page : **rien ne démarre tout seul**. Chaque section est en veille, son
 * contenu n'est ni injecté ni animé tant qu'on n'a pas cliqué sur « Lancer ». Éteindre une
 * section libère tout (timelines tuées, DOM vidé), et une section sortie de l'écran met ses
 * boucles en pause.
 *
 * Chaque layout apporte sa propre façon de changer d'offre : onglets, ascenseur d'étages,
 * carrousel, explorateur, pile de cartes, levier de poussée.
 */
(() => {
  'use strict';

  const { gsap } = window;
  const OFFERS = window.LAB_OFFERS;
  const SVG = window.LAB_SVG || {};
  const BY_TIER = Object.fromEntries(OFFERS.map((o) => [o.tier, o]));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const nf = new Intl.NumberFormat('fr-FR');
  const price = (n) => nf.format(n).replace(/ /g, ' ');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const specsRows = (o) => o.specs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
  const priceBlock = (o, cls = '') => `<p class="price ${cls}"><span>dès</span> <b>${price(o.price)}</b> <span>€ HT</span></p>`;
  const cta = (o) => `<a class="cta" href="#devis">${esc(o.cta)} <span aria-hidden="true">→</span></a>`;

  /* ── Visuel : injection du SVG + intro « tracé » + boucles légères ──────── */
  function mountVisual(host, tier) {
    host.innerHTML = SVG[tier] || '';
    const svg = host.querySelector('svg');
    if (!svg) return { kill() {} };
    svg.removeAttribute('class');
    svg.classList.add('illu', `illu--${tier}`);

    const draws = svg.querySelectorAll('.draw');
    const tls = [];
    if (!reduced) {
      tls.push(gsap.timeline()
        .fromTo(draws, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1, ease: 'power1.inOut', stagger: { amount: 0.8 } })
        .from(svg.querySelectorAll('.g-back, .g-grid, .g-planet-b, .g-orbit-b, .stars, .streaks, .fx, .annot, .holo-base'), { autoAlpha: 0, duration: 0.6, stagger: 0.04 }, 0.35)
        .set(draws, { clearProps: 'strokeDasharray,strokeDashoffset' }));
      // Boucles volontairement minimales : la page peut afficher plusieurs sections à la fois
      tls.push(gsap.to(svg.querySelectorAll('.levitate'), { y: -6, duration: 2.8, repeat: -1, yoyo: true, ease: 'sine.inOut' }));
      tls.push(gsap.to(svg.querySelectorAll('.hud-rot'), { rotation: 360, svgOrigin: '200 200', duration: 90, repeat: -1, ease: 'none' }));
    }
    return {
      tls,
      pause: (v) => tls.forEach((t) => t.paused(v)),
      kill: () => tls.forEach((t) => t.kill()),
    };
  }

  /* ── Les six layouts ────────────────────────────────────────────────────
   * Chacun expose : markup(offer) et wire(root, setOffer, offer).
   * Le sélecteur fait partie du layout : c'est justement ce qu'on compare.
   * ─────────────────────────────────────────────────────────────────────── */
  const LAYOUTS = {
    /* 1 — Deux colonnes, onglets segmentés. La valeur sûre. */
    split: {
      markup: (o) => `
        <div class="l-split" data-tier="${o.tier}">
          <div class="l-split__visual" data-visual></div>
          <div class="l-split__body">
            <div class="seg" role="tablist" aria-label="Choisir une offre">
              ${OFFERS.map((x) => `<button role="tab" type="button" data-pick="${x.tier}" aria-selected="${x.tier === o.tier}">${esc(x.name)}</button>`).join('')}
            </div>
            <p class="eyebrow">${esc(o.code)} · ${esc(o.stageLong)}</p>
            <h3 class="name">${esc(o.name)}</h3>
            <p class="pitch">${esc(o.pitch)}</p>
            <dl class="specs">${specsRows(o)}</dl>
            ${priceBlock(o)}
            ${cta(o)}
          </div>
        </div>`,
    },

    /* 2 — Visuel en grand, étages empilés à gauche comme un ascenseur de lancement. */
    hero: {
      markup: (o) => `
        <div class="l-hero" data-tier="${o.tier}">
          <nav class="stepper" aria-label="Choisir un étage">
            ${OFFERS.map((x) => `
              <button type="button" data-pick="${x.tier}" aria-current="${x.tier === o.tier}">
                <i>${x.level}</i><span>${esc(x.stage)}</span><em>${esc(x.name)}</em>
              </button>`).join('')}
          </nav>
          <div class="l-hero__main">
            <div class="l-hero__visual" data-visual></div>
            <p class="eyebrow">${esc(o.stageLong)}</p>
            <h3 class="name name--xl">${esc(o.name)}</h3>
            <p class="pitch">${esc(o.pitch)}</p>
            <ul class="chips">${o.specs.map(([k, v]) => `<li><span>${esc(k)}</span> ${esc(v)}</li>`).join('')}</ul>
            <div class="l-hero__foot">${priceBlock(o)}${cta(o)}</div>
          </div>
        </div>`,
    },

    /* 3 — Plein cadre, contenu en surimpression, navigation carrousel (flèches + points). */
    immersive: {
      markup: (o) => {
        const i = OFFERS.findIndex((x) => x.tier === o.tier);
        return `
        <div class="l-imm" data-tier="${o.tier}" tabindex="0" aria-label="Carrousel des offres, flèches gauche et droite pour naviguer">
          <div class="l-imm__visual" data-visual></div>
          <button class="l-imm__arrow l-imm__arrow--prev" type="button" data-pick="${OFFERS[(i + 2) % 3].tier}" aria-label="Offre précédente">‹</button>
          <button class="l-imm__arrow l-imm__arrow--next" type="button" data-pick="${OFFERS[(i + 1) % 3].tier}" aria-label="Offre suivante">›</button>
          <div class="l-imm__overlay">
            <p class="eyebrow">${esc(o.code)} · ${esc(o.status)}</p>
            <h3 class="name name--xl">${esc(o.name)}</h3>
            <p class="pitch">${esc(o.pitch)}</p>
            <div class="l-imm__foot">${priceBlock(o, 'price--ghost')}${cta(o)}</div>
          </div>
          <div class="dots" role="tablist" aria-label="Choisir une offre">
            ${OFFERS.map((x) => `<button role="tab" type="button" data-pick="${x.tier}" aria-selected="${x.tier === o.tier}"><span class="sr">${esc(x.name)}</span></button>`).join('')}
          </div>
        </div>`;
      },
      wire(root, setOffer, o) {
        const i = OFFERS.findIndex((x) => x.tier === o.tier);
        root.querySelector('.l-imm').addEventListener('keydown', (e) => {
          if (e.key === 'ArrowRight') setOffer(OFFERS[(i + 1) % 3].tier);
          if (e.key === 'ArrowLeft') setOffer(OFFERS[(i + 2) % 3].tier);
        });
      },
    },

    /* 4 — Fiche technique : explorateur de modules à gauche, données denses à droite. */
    datasheet: {
      markup: (o) => `
        <div class="l-data" data-tier="${o.tier}">
          <nav class="explorer" aria-label="Choisir un module">
            <p class="explorer__title">Modules</p>
            ${OFFERS.map((x) => `
              <button type="button" data-pick="${x.tier}" aria-current="${x.tier === o.tier}">
                <span class="explorer__code">${esc(x.code)}</span>
                <span class="explorer__name">${esc(x.name)}</span>
                <span class="explorer__price">${price(x.price)} €</span>
              </button>`).join('')}
          </nav>
          <div class="l-data__panel">
            <header class="l-data__head">
              <div><p class="eyebrow">${esc(o.stageLong)}</p><h3 class="name">${esc(o.name)}</h3></div>
              <span class="status"><i></i>${esc(o.status)}</span>
            </header>
            <div class="l-data__grid">
              <div class="l-data__visual" data-visual></div>
              <div>
                <p class="pitch">${esc(o.pitch)}</p>
                <dl class="specs specs--dense">${specsRows(o)}</dl>
              </div>
            </div>
            <footer class="l-data__foot">${priceBlock(o)}${cta(o)}</footer>
          </div>
        </div>`,
    },

    /* 5 — Pile de cartes : les deux autres offres restent visibles derrière, on clique pour permuter. */
    stack: {
      markup: (o) => {
        const others = OFFERS.filter((x) => x.tier !== o.tier);
        return `
        <div class="l-stack" data-tier="${o.tier}">
          ${others.map((x, k) => `
            <button class="l-stack__ghost l-stack__ghost--${k}" type="button" data-pick="${x.tier}" data-tier="${x.tier}">
              <span class="l-stack__code">${esc(x.code)}</span>
              <span class="l-stack__name">${esc(x.name)}</span>
              <span class="l-stack__price">${price(x.price)} € HT</span>
              <span class="l-stack__hint">Mettre devant</span>
            </button>`).join('')}
          <article class="l-stack__front">
            <div class="l-stack__visual" data-visual></div>
            <div class="l-stack__body">
              <p class="eyebrow">${esc(o.code)} · ${esc(o.stage)}</p>
              <h3 class="name">${esc(o.name)}</h3>
              <p class="pitch">${esc(o.argument)}</p>
              <dl class="specs">${specsRows(o)}</dl>
              <div class="l-stack__foot">${priceBlock(o)}${cta(o)}</div>
            </div>
          </article>
        </div>`;
      },
    },

    /* 6 — Levier de poussée : un curseur physique pour monter en gamme. */
    throttle: {
      markup: (o) => `
        <div class="l-throttle" data-tier="${o.tier}">
          <div class="l-throttle__visual" data-visual></div>
          <div class="l-throttle__panel">
            <p class="eyebrow">Niveau de poussée</p>
            <div class="l-throttle__lever">
              <input type="range" min="1" max="3" step="1" value="${o.level}" aria-label="Niveau de poussée, 1 à 3" aria-valuetext="${esc(o.name)}">
              <div class="l-throttle__ticks">
                ${OFFERS.map((x) => `<button type="button" data-pick="${x.tier}" aria-current="${x.tier === o.tier}">${esc(x.name)}</button>`).join('')}
              </div>
            </div>
            <div class="l-throttle__gauge" aria-hidden="true">${Array.from({ length: 12 }, (_, i) => `<i${i < o.level * 4 ? ' class="on"' : ''}></i>`).join('')}</div>
            <h3 class="name">${esc(o.name)}</h3>
            <p class="pitch">${esc(o.pitch)}</p>
            <dl class="specs specs--dense">${specsRows(o)}</dl>
            <div class="l-throttle__foot">${priceBlock(o)}${cta(o)}</div>
          </div>
        </div>`,
      wire(root, setOffer) {
        const range = root.querySelector('input[type="range"]');
        range.addEventListener('input', () => {
          const next = OFFERS.find((x) => x.level === +range.value);
          if (next && next.tier !== root.querySelector('.l-throttle').dataset.tier) setOffer(next.tier);
        });
      },
    },
  };

  /* ── Une section = un layout en veille, qu'on allume ────────────────────── */
  class Section {
    constructor(el) {
      this.el = el;
      this.key = el.dataset.layout;
      this.stage = el.querySelector('[data-stage]');
      this.button = el.querySelector('[data-power]');
      this.tier = el.dataset.tier || 'starter';
      this.on = false;
      this.visual = null;

      this.button.addEventListener('click', () => (this.on ? this.stop() : this.start()));
      this.stage.addEventListener('click', (e) => {
        const pick = e.target.closest('[data-pick]');
        if (pick) this.setOffer(pick.dataset.pick);
      });

      // Hors écran : on met les boucles en pause (la section reste montée)
      new IntersectionObserver(([entry]) => this.visual?.pause(!entry.isIntersecting), { threshold: 0.05 }).observe(el);
    }

    start() {
      this.on = true;
      this.el.classList.add('is-live');
      this.button.setAttribute('aria-pressed', 'true');
      this.button.innerHTML = '<span aria-hidden="true">■</span> Éteindre';
      this.render();
    }

    stop() {
      this.on = false;
      this.el.classList.remove('is-live');
      this.button.setAttribute('aria-pressed', 'false');
      this.button.innerHTML = '<span aria-hidden="true">▶</span> Lancer';
      this.visual?.kill();
      this.visual = null;
      this.stage.innerHTML = '<p class="lab-section__idle">Section en veille — rien n\'est chargé ni animé.</p>';
    }

    setOffer(tier) {
      if (!BY_TIER[tier] || tier === this.tier || this.busy) return;
      this.busy = true;
      const done = () => {
        this.tier = tier;
        this.render();
        this.busy = false;
      };
      if (reduced) return done();
      // Fondu sortant, puis la nouvelle offre se redessine
      gsap.to(this.stage, { autoAlpha: 0, duration: 0.22, ease: 'power1.in', onComplete: done });
    }

    render() {
      const layout = LAYOUTS[this.key];
      const offer = BY_TIER[this.tier];
      this.visual?.kill();
      this.stage.innerHTML = layout.markup(offer);
      const host = this.stage.querySelector('[data-visual]');
      this.visual = host ? mountVisual(host, this.tier) : null;
      layout.wire?.(this.stage, (t) => this.setOffer(t), offer);
      gsap.fromTo(this.stage, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: 'power1.out' });
    }
  }

  const sections = [...document.querySelectorAll('[data-layout]')].map((el) => new Section(el));

  /* Tout allumer / tout éteindre, depuis la barre du haut */
  document.querySelector('[data-all-on]')?.addEventListener('click', () => sections.forEach((s) => !s.on && s.start()));
  document.querySelector('[data-all-off]')?.addEventListener('click', () => sections.forEach((s) => s.on && s.stop()));

  window.PerfHUD?.set('sections', `0 / ${sections.length}`);
  const count = () => window.PerfHUD?.set('sections', `${sections.filter((s) => s.on).length} / ${sections.length}`);
  document.addEventListener('click', () => setTimeout(count, 50));

  window.__lab = {
    sections,
    startAll: () => sections.forEach((s) => !s.on && s.start()),
    stopAll: () => sections.forEach((s) => s.on && s.stop()),
    setOffer: (tier) => sections.forEach((s) => s.on && s.setOffer(tier)),
  };
})();
