/**
 * Banc de layouts — une seule offre à l'écran, onze mises en scène différentes.
 *
 * Techno : SVG inline + GSAP (la plus simple du lab, aucune compilation). Les trois visuels
 * viennent de js/svg-data.js, généré par le prototype 01 : même source, même rendu.
 *
 * Deux familles :
 *   01-06  le visuel et le texte se partagent un conteneur (côte à côte, empilés, en fiche) ;
 *   07-11  le visuel passe **en fond de section** et la définition de l'offre flotte au-dessus,
 *          chacune avec son propre jeu de profondeur (parallaxe, verre dépoli, masque, vraie 3D).
 *
 * Règle de la page : **rien ne démarre tout seul**. Chaque section est en veille, son
 * contenu n'est ni injecté ni animé tant qu'on n'a pas cliqué sur « Lancer ». Éteindre une
 * section libère tout (timelines tuées, écouteurs retirés, DOM vidé), et une section sortie
 * de l'écran met ses boucles en pause.
 *
 * Chaque layout apporte aussi sa propre façon de changer d'offre : onglets, ascenseur,
 * carrousel, explorateur, pile, levier, interrupteurs, typographie, volets, molette, étiquettes.
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
    // En fond de section, le visuel remplit son plan ; c'est la CSS du layout qui le cadre
    if (host.dataset.visual === 'cover') svg.classList.add('illu--bg');

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

  /* ── Profondeur : deux réponses au pointeur ─────────────────────────────
   * Toutes deux renvoient une fonction de nettoyage, appelée quand la section
   * change d'offre ou s'éteint — sinon des écouteurs survivraient au DOM.
   * ─────────────────────────────────────────────────────────────────────── */

  /** Plans qui ne défilent pas à la même vitesse : le fond suit la souris, le texte résiste. */
  function parallax(root, layers) {
    const moves = layers
      .filter(([el]) => el)
      .map(([el, amp]) => ({
        el,
        amp,
        x: gsap.quickTo(el, 'x', { duration: 0.7, ease: 'power3.out' }),
        y: gsap.quickTo(el, 'y', { duration: 0.7, ease: 'power3.out' }),
      }));
    if (reduced || !moves.length) return null;
    const move = (e) => {
      const r = root.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      moves.forEach((m) => { m.x(nx * m.amp); m.y(ny * m.amp * 0.55); });
    };
    const rest = () => moves.forEach((m) => { m.x(0); m.y(0); });
    root.addEventListener('pointermove', move);
    root.addEventListener('pointerleave', rest);
    return () => {
      root.removeEventListener('pointermove', move);
      root.removeEventListener('pointerleave', rest);
      moves.forEach((m) => gsap.killTweensOf(m.el));
    };
  }

  /** Vraie perspective CSS : la scène pivote, chaque plan garde sa profondeur. */
  function tilt(root, scene, deg = 6) {
    if (reduced || !scene) return null;
    const ry = gsap.quickTo(scene, 'rotationY', { duration: 0.8, ease: 'power3.out' });
    const rx = gsap.quickTo(scene, 'rotationX', { duration: 0.8, ease: 'power3.out' });
    const move = (e) => {
      const r = root.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - 0.5) * deg * 2);
      rx(-((e.clientY - r.top) / r.height - 0.5) * deg);
    };
    const rest = () => { ry(0); rx(0); };
    root.addEventListener('pointermove', move);
    root.addEventListener('pointerleave', rest);
    return () => {
      root.removeEventListener('pointermove', move);
      root.removeEventListener('pointerleave', rest);
      gsap.killTweensOf(scene);
    };
  }

  /* ── Les onze layouts ───────────────────────────────────────────────────
   * Chacun expose : markup(offer) et wire(root, setOffer, offer) — wire peut
   * renvoyer une fonction de nettoyage.
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
          <div class="l-imm__overlay">
            <p class="eyebrow">${esc(o.code)} · ${esc(o.status)}</p>
            <h3 class="name name--xl">${esc(o.name)}</h3>
            <p class="pitch">${esc(o.pitch)}</p>
            <div class="l-imm__foot">${priceBlock(o, 'price--ghost')}${cta(o)}</div>
            <div class="l-imm__nav">
              <button class="l-imm__arrow" type="button" data-pick="${OFFERS[(i + 2) % 3].tier}" aria-label="Offre précédente">‹</button>
              <button class="l-imm__arrow" type="button" data-pick="${OFFERS[(i + 1) % 3].tier}" aria-label="Offre suivante">›</button>
            </div>
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

    /* ═══ À partir d'ici : le visuel passe en fond, le contenu flotte au-dessus ═══ */

    /* 7 — Poste de pilotage : on regarde la fusée à travers une verrière. Le bloc
     *     instruments se pose sur le paysage, les interrupteurs changent de module.
     *     Profondeur : parallaxe inversée fond / panneau + voile dégradé. */
    cockpit: {
      markup: (o) => `
        <div class="l-cock" data-tier="${o.tier}">
          <div class="l-cock__bg" data-visual="cover"></div>
          <div class="l-cock__scrim" aria-hidden="true"></div>
          <div class="l-cock__glass" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
          <div class="l-cock__panel">
            <p class="eyebrow">${esc(o.code)} · ${esc(o.status)}</p>
            <h3 class="name">${esc(o.name)}</h3>
            <p class="pitch">${esc(o.pitch)}</p>
            <dl class="specs specs--dense l-cock__read">${specsRows(o)}</dl>
            <div class="l-cock__foot">${priceBlock(o)}${cta(o)}</div>
          </div>
          <div class="l-cock__switches" role="radiogroup" aria-label="Choisir un module">
            ${OFFERS.map((x) => `
              <button class="tog" type="button" role="radio" data-pick="${x.tier}" data-tier="${x.tier}" aria-checked="${x.tier === o.tier}">
                <i class="tog__slot" aria-hidden="true"><span></span></i>
                <span class="tog__code">${esc(x.code)}</span>
                <em class="tog__name">${esc(x.name)}</em>
              </button>`).join('')}
          </div>
        </div>`,
      wire(root) {
        const el = root.querySelector('.l-cock');
        return parallax(el, [[el.querySelector('.l-cock__bg'), 30], [el.querySelector('.l-cock__panel'), -12]]);
      },
    },

    /* 8 — Typographie évidée : les trois noms en très grand *sont* le sélecteur.
     *     L'actif s'allume en fondu lumineux sur le visuel, les autres restent en contour.
     *     Profondeur : trois plans — visuel, lettres en mode fusion, fiche posée dessus. */
    stencil: {
      markup: (o) => `
        <div class="l-sten" data-tier="${o.tier}">
          <div class="l-sten__bg" data-visual="cover"></div>
          <div class="l-sten__veil" aria-hidden="true"></div>
          <div class="l-sten__words" role="tablist" aria-label="Choisir une offre">
            ${OFFERS.map((x) => `
              <button class="l-sten__word" type="button" role="tab" data-pick="${x.tier}" data-tier="${x.tier}"
                      aria-selected="${x.tier === o.tier}">${esc(x.name)}</button>`).join('')}
          </div>
          <aside class="l-sten__card">
            <p class="eyebrow">${esc(o.code)} · ${esc(o.stageLong)}</p>
            <p class="pitch">${esc(o.pitch)}</p>
            <ul class="chips chips--left">${o.specs.map(([k, v]) => `<li><span>${esc(k)}</span> ${esc(v)}</li>`).join('')}</ul>
            <div class="l-sten__foot">${priceBlock(o)}${cta(o)}</div>
          </aside>
        </div>`,
      wire(root) {
        const el = root.querySelector('.l-sten');
        return parallax(el, [[el.querySelector('.l-sten__bg'), 22], [el.querySelector('.l-sten__words'), -8]]);
      },
    },

    /* 9 — Volets de verre : trois lames verticales sur le même fond. Celle de l'offre
     *     choisie s'ouvre et laisse voir le visuel net ; les deux autres restent en verre
     *     dépoli, nom à la verticale. Profondeur : le flou se fait *derrière* les lames. */
    shutters: {
      markup: (o) => `
        <div class="l-shut" data-tier="${o.tier}">
          <div class="l-shut__bg" data-visual="cover"></div>
          <div class="l-shut__rail">
            ${OFFERS.map((x) => (x.tier === o.tier ? `
              <section class="l-shut__pane is-open" data-tier="${x.tier}">
                <div class="l-shut__inner">
                  <p class="eyebrow">${esc(x.code)} · ${esc(x.status)}</p>
                  <h3 class="name name--xl">${esc(x.name)}</h3>
                  <p class="pitch">${esc(x.pitch)}</p>
                  <dl class="specs specs--dense">${specsRows(x)}</dl>
                  <div class="l-shut__foot">${priceBlock(x)}${cta(x)}</div>
                </div>
              </section>` : `
              <button class="l-shut__pane l-shut__pane--closed" type="button" data-pick="${x.tier}" data-tier="${x.tier}"
                      aria-expanded="false" aria-label="Ouvrir l'offre ${esc(x.name)}">
                <span class="l-shut__vert">${esc(x.name)}</span>
                <span class="l-shut__meta">${price(x.price)} €</span>
              </button>`)).join('')}
          </div>
        </div>`,
    },

    /* 10 — Hublot : tout est flou et sombre, sauf un disque où le visuel reste net.
     *      Le texte se lit sur la zone floutée, la molette fait tourner les modules.
     *      Profondeur : un seul visuel, un masque radial qui floute son propre fond. */
    porthole: {
      markup: (o) => `
        <div class="l-port" data-tier="${o.tier}">
          <div class="l-port__bg" data-visual="cover"></div>
          <div class="l-port__mask" aria-hidden="true"></div>
          <div class="l-port__ring" aria-hidden="true"><i></i></div>
          <div class="l-port__text">
            <p class="eyebrow">${esc(o.stageLong)}</p>
            <h3 class="name name--xl">${esc(o.name)}</h3>
            <p class="pitch">${esc(o.argument)}</p>
            <dl class="specs specs--lead">${specsRows(o)}</dl>
            <div class="l-port__foot">${priceBlock(o)}${cta(o)}</div>
          </div>
          <div class="l-port__dial" role="radiogroup" aria-label="Choisir un module" style="--needle: ${(o.level - 2) * 46}deg">
            <div class="l-port__face" aria-hidden="true"><b></b></div>
            <div class="l-port__marks">
              ${OFFERS.map((x) => `
                <button type="button" role="radio" data-pick="${x.tier}" data-tier="${x.tier}" aria-checked="${x.tier === o.tier}">
                  <i></i>${esc(x.name)}
                </button>`).join('')}
            </div>
          </div>
        </div>`,
      wire(root) {
        const el = root.querySelector('.l-port');
        return parallax(el, [[el.querySelector('.l-port__bg'), 18]]);
      },
    },

    /* 11 — Diorama : vraie perspective CSS. Le visuel est une toile reculée, une grille
     *      flotte entre deux eaux, la fiche est posée devant. La scène pivote au pointeur
     *      et les étiquettes de sélection vivent à des profondeurs différentes. */
    diorama: {
      markup: (o) => {
        const i = OFFERS.findIndex((x) => x.tier === o.tier);
        return `
        <div class="l-dio" data-tier="${o.tier}">
          <div class="l-dio__scene">
            <div class="l-dio__plane l-dio__bg" data-visual="cover"></div>
            <div class="l-dio__plane l-dio__grid" aria-hidden="true"></div>
            <div class="l-dio__plane l-dio__haze" aria-hidden="true"></div>
            <nav class="l-dio__tabs" aria-label="Choisir une offre">
              ${OFFERS.map((x, k) => `
                <button class="l-dio__tab" type="button" data-pick="${x.tier}" data-tier="${x.tier}"
                        aria-current="${x.tier === o.tier}" style="--z: ${k === i ? 66 : 10 + k * 8}px">
                  <span>${esc(x.code)}</span><em>${esc(x.name)}</em>
                </button>`).join('')}
            </nav>
            <article class="l-dio__card">
              <p class="eyebrow">${esc(o.status)}</p>
              <h3 class="name">${esc(o.name)}</h3>
              <p class="pitch">${esc(o.pitch)}</p>
              <ul class="chips chips--left">${o.specs.slice(0, 3).map(([k, v]) => `<li><span>${esc(k)}</span> ${esc(v)}</li>`).join('')}</ul>
              <div class="l-dio__foot">${priceBlock(o)}${cta(o)}</div>
            </article>
          </div>
        </div>`;
      },
      wire(root) {
        const el = root.querySelector('.l-dio');
        return tilt(el, el.querySelector('.l-dio__scene'), 7);
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
      this.cleanup = null; // écouteurs posés par le layout (parallaxe, perspective…)

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
      this.cleanup?.();
      this.cleanup = null;
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
      this.cleanup?.();
      this.visual?.kill();
      this.stage.innerHTML = layout.markup(offer);
      const host = this.stage.querySelector('[data-visual]');
      this.visual = host ? mountVisual(host, this.tier) : null;
      this.cleanup = layout.wire?.(this.stage, (t) => this.setOffer(t), offer) || null;
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
