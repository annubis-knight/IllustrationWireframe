/**
 * Banc de layouts — une seule offre à l'écran, onze mises en scène différentes.
 *
 * Techno : SVG inline + GSAP (la plus simple du lab, aucune compilation). Les trois visuels
 * viennent de js/svg-data.js, généré par le prototype 01 : même source, même rendu.
 *
 * Trois familles :
 *   01-06  le visuel et le texte se partagent un conteneur (côte à côte, empilés, en fiche) ;
 *   07-11  le visuel passe **en fond de section** et la définition de l'offre flotte au-dessus,
 *          chacune avec son propre jeu de profondeur (parallaxe, verre dépoli, masque, vraie 3D) ;
 *   12-16  **la carte d'offre prend la vedette** et le visuel redescend au rang d'illustration
 *          (vignette, filigrane, tampon, icône) — c'est la famille la plus proche du besoin réel.
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
  const SECTION = window.LAB_SECTION;
  const BY_TIER = Object.fromEntries(OFFERS.map((o) => [o.tier, o]));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const nf = new Intl.NumberFormat('fr-FR');
  const price = (n) => nf.format(n).replace(/ /g, ' ');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const specsRows = (o) => o.specs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
  const priceBlock = (o, cls = '') => `<p class="price ${cls}">${o.priceFrom ? `<span>${esc(o.priceFrom)}</span> ` : ''}<b>${price(o.price)}</b> <span>€</span></p>`;
  const priceTag = (o) => `${o.priceFrom ? `${esc(o.priceFrom)} ` : ''}${price(o.price)} €`;
  const cta = (o) => `<a class="cta" href="#devis">${esc(o.cta)} <span aria-hidden="true">→</span></a>`;

  /* ── Le contenu d'une offre ─────────────────────────────────────────────
   * Ces briques-là portent ce que l'offre contient vraiment (OFFRES.md) :
   * la promesse, le **compteur** de valeur, les meilleurs éléments visibles,
   * le reste dans un dérouleur, et le bloc prix avec sa garantie.
   *
   * Principe de la source : *montrer la quantité, cacher le détail*. Le
   * dérouleur est un <details> natif — aucun câblage, il survit au re-rendu
   * de la section et reste utilisable au clavier.
   *
   * Trois densités, pour que chaque layout prenne ce que son conteneur peut
   * tenir sans qu'on touche à sa composition :
   *   full     compteur + offre incluse + éléments + dérouleur
   *   compact  compteur + les meilleurs éléments
   *   digest   les 5 lignes de résumé (conteneurs étroits)
   * ─────────────────────────────────────────────────────────────────────── */

  /** La promesse, avec sa chute en gras quand il y en a une. */
  const promise = (o, cls = 'pitch') => `<p class="${cls}">${esc(o.pitch)}${o.pitchTail ? ` <b>${esc(o.pitchTail)}</b>` : ''}</p>`;

  /** Le compteur : la quantité de valeur, avant le détail. */
  const counter = (o) => (o.count
    ? `<p class="ocount"><b>${o.count.n}</b> ${esc(o.count.label)}${o.count.note ? `<span>${esc(o.count.note)}</span>` : ''}</p>`
    : (o.alacarte ? `<p class="ocount ocount--alt">${esc(o.alacarte)}</p>` : ''));

  /** « L'offre dans l'offre » — volontairement distincte des puces. */
  const included = (o) => (o.included ? `
    <div class="oincl">
      <p class="oincl__head">${esc(o.included.title)} <span>${esc(o.included.value)}</span></p>
      <p class="oincl__list">${o.included.items.map(esc).join(' · ')}</p>
    </div>` : '');

  /** Un élément : nom connu du livrable, puis ce que ça change. */
  const item = (it) => `
    <li class="oitem oitem--${it.kind}">
      <i aria-hidden="true"></i>
      <span><b>${esc(it.name)}</b>${it.benefit ? ` : ${esc(it.benefit)}` : ''}</span>
    </li>`;

  /** Les éléments visibles, puis le reste replié derrière son compteur. */
  const itemList = (o, { max = o.visible } = {}) => {
    const shown = o.items.slice(0, max);
    const rest = o.items.slice(max);
    return `
      <ul class="oitems">${shown.map(item).join('')}</ul>
      ${rest.length ? `
        <details class="omore">
          <summary>${esc(o.more || `Voir les ${rest.length} autres éléments`)}</summary>
          <ul class="oitems">${rest.map(item).join('')}</ul>
        </details>` : ''}`;
  };

  /** Les étiquettes de Nitro : des missions, pas une liste de livrables. */
  const chipsOf = (o) => (o.chips ? `<ul class="chips chips--left">${o.chips.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : '');

  /** Le bloc prix : prix ancré, mention, garantie en une ligne, un CTA. */
  const priceBox = (o, { note = true, guarantee = true, sub = true, link = false } = {}) => `
    <div class="obuy">
      ${priceBlock(o)}
      ${note && o.priceNote ? `<p class="obuy__note">${esc(o.priceNote)}</p>` : ''}
      ${guarantee && o.guarantee ? `<p class="obuy__warranty">${esc(o.guarantee)}</p>` : ''}
      ${cta(o)}
      ${sub && o.ctaNote ? `<p class="obuy__sub">${esc(o.ctaNote)}</p>` : ''}
      ${link && o.link ? `<a class="obuy__link" href="#offre">${esc(o.link)}</a>` : ''}
    </div>`;

  /** Le contenu d'une offre, à la densité que le conteneur peut tenir. */
  const offerBody = (o, density = 'full') => {
    if (density === 'digest') return `<dl class="specs specs--dense">${specsRows(o)}</dl>`;
    if (density === 'compact') return `${counter(o)}${chipsOf(o)}<ul class="oitems">${o.items.slice(0, 3).map(item).join('')}</ul>`;
    return `${counter(o)}${included(o)}${chipsOf(o)}${itemList(o)}`;
  };

  /* Pied de section : rareté et mention de TVA — ils appartiennent à la section. */
  const sectionFoot = () => (SECTION ? `
    <footer class="osec__foot">
      <p><b>${esc(SECTION.scarcity)}</b> ${esc(SECTION.nextSlot)}</p>
      <p class="osec__vat">${esc(SECTION.vat)}</p>
    </footer>` : '');

  /* ── Deux briques pour la famille « cartes » ─────────────────────────────
   * Une section d'offres réelle s'ouvre par un en-tête, pas par une carte ;
   * et les trois cartes doivent se ressembler d'un layout à l'autre, sinon on
   * compare des dessins de cartes au lieu de comparer des compositions.
   * ─────────────────────────────────────────────────────────────────────── */
  const sectionHead = (o) => `
    <header class="osec__head">
      <p class="kicker"><span class="kicker__dot"></span>${esc(SECTION.kicker)}</p>
      <h3 class="osec__title">${SECTION.title}</h3>
      <p class="osec__lede">${esc(SECTION.lede)} Vous regardez <b>${esc(o.name)}</b>.</p>
    </header>`;

  /** La carte d'offre. Ouverte, elle détaille ; repliée, elle garde de quoi choisir. */
  const offerCard = (x, open = false) => `
    <article class="ocard${open ? ' ocard--open' : ''}" data-tier="${x.tier}"${open ? '' : ` data-pick="${x.tier}"`}>
      ${open && x.badge ? `<p class="ocard__badge">${esc(x.badge)}</p>` : ''}
      <p class="eyebrow">${esc(x.code)} · ${esc(open ? x.status : x.stage)}</p>
      <h3 class="name">${esc(x.name)}</h3>
      ${open ? promise(x) : `<p class="pitch">${esc(x.promiseShort || x.pitch)}</p>`}
      ${open ? offerBody(x, 'full') : counter(x)}
      <div class="ocard__foot">
        ${priceBlock(x)}
        ${open ? cta(x) : `<button class="ocard__pick" type="button" data-pick="${x.tier}">Choisir</button>`}
      </div>
    </article>`;

  /* ── Visuel : injection du SVG + intro « tracé » + boucles légères ──────── */
  function mountVisual(host, tier) {
    host.innerHTML = SVG[tier] || '';
    const svg = host.querySelector('svg');
    if (!svg) return { kill() {} };
    svg.removeAttribute('class');
    svg.classList.add('illu', `illu--${tier}`);
    // Deux rôles de second plan : décor de section, ou vignette dans une carte.
    // Dans les deux cas le dessin se tait — à 80 px, ses légendes sont illisibles.
    if (host.dataset.visual === 'cover') svg.classList.add('illu--bg');
    if (host.dataset.visual === 'mini') svg.classList.add('illu--mini');

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
            ${promise(o)}
            ${offerBody(o, 'full')}
            ${priceBox(o, { link: true })}
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
            ${promise(o)}
            ${counter(o)}
            <ul class="chips">${o.items.slice(0, 3).map((it) => `<li><span>${esc(it.kind)}</span> ${esc(it.name)}</li>`).join('')}</ul>
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
            ${promise(o)}
            ${counter(o)}
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
                <span class="explorer__price">${priceTag(x)}</span>
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
                ${promise(o)}
                ${offerBody(o, 'full')}
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
              <span class="l-stack__price">${priceTag(x)}</span>
              <span class="l-stack__hint">Mettre devant</span>
            </button>`).join('')}
          <article class="l-stack__front">
            <div class="l-stack__visual" data-visual></div>
            <div class="l-stack__body">
              <p class="eyebrow">${esc(o.code)} · ${esc(o.stage)}</p>
              <h3 class="name">${esc(o.name)}</h3>
              ${promise(o)}
              ${offerBody(o, 'full')}
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
            ${promise(o)}
            ${offerBody(o, 'compact')}
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
            ${promise(o)}
            ${offerBody(o, 'compact')}
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
            ${promise(o)}
            ${counter(o)}
            <ul class="chips chips--left">${o.items.slice(0, 3).map((it) => `<li>${esc(it.name)}</li>`).join('')}</ul>
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
                  ${promise(x)}
                  ${offerBody(x, 'full')}
                  <div class="l-shut__foot">${priceBlock(x)}${cta(x)}</div>
                </div>
              </section>` : `
              <button class="l-shut__pane l-shut__pane--closed" type="button" data-pick="${x.tier}" data-tier="${x.tier}"
                      aria-expanded="false" aria-label="Ouvrir l'offre ${esc(x.name)}">
                <span class="l-shut__vert">${esc(x.name)}</span>
                <span class="l-shut__meta">${priceTag(x)}</span>
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
            ${promise(o)}
            ${offerBody(o, 'compact')}
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
              ${promise(o)}
              ${counter(o)}
              <ul class="chips chips--left">${o.items.slice(0, 2).map((it) => `<li>${esc(it.name)}</li>`).join('')}</ul>
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

    /* ═══ Troisième famille : des cartes d'offres, le visuel hors des cartes ══
     * Les deux premières familles mettent en scène un dessin. Ici on compose une
     * vraie **section d'offres** : ce qu'on vend tient dans des cartes — nom, prix,
     * ce qu'on obtient, un bouton — et le visuel vit **à côté**, en bandeau, en
     * fond, en colonne ou en débord. Il habille la section, il n'habite pas la carte.
     *
     * Deux briques communes, pour que les cinq compositions parlent la même langue :
     * `sectionHead` (l'en-tête d'une section réelle) et `offerCard` (la carte).
     * ═══════════════════════════════════════════════════════════════════════ */

    /* 12 — Bandeau : l'illustration ouvre la section, les trois cartes dessous. */
    banner: {
      markup: (o) => `
        <div class="l-ban osec" data-tier="${o.tier}">
          ${sectionHead(o)}
          <div class="l-ban__visual" data-visual="mini" aria-hidden="true"></div>
          <div class="l-ban__cards">${OFFERS.map((x) => offerCard(x, x.tier === o.tier)).join('')}</div>
        </div>`,
    },

    /* 13 — Colonne : le visuel tient la moitié gauche, les cartes s'empilent à droite. */
    aside: {
      markup: (o) => `
        <div class="l-aside osec" data-tier="${o.tier}">
          <div class="l-aside__visual" data-visual aria-hidden="true"></div>
          <div class="l-aside__col">
            ${sectionHead(o)}
            <div class="l-aside__cards">${OFFERS.map((x) => offerCard(x, x.tier === o.tier)).join('')}</div>
          </div>
        </div>`,
    },

    /* 14 — Cartes posées sur le visuel : il passe en fond de section, atténué, et
     *      les trois cartes flottent dessus. La carte reste une carte. */
    onbg: {
      markup: (o) => `
        <div class="l-onbg osec" data-tier="${o.tier}">
          <div class="l-onbg__bg" data-visual="cover" aria-hidden="true"></div>
          <div class="l-onbg__veil" aria-hidden="true"></div>
          <div class="l-onbg__inner">
            ${sectionHead(o)}
            <div class="l-onbg__cards">${OFFERS.map((x) => offerCard(x, x.tier === o.tier)).join('')}</div>
          </div>
        </div>`,
    },

    /* 15 — Débord : une seule carte, et le visuel qui dépasse derrière elle.
     *      Le chevauchement donne la profondeur sans mettre le dessin dans la carte. */
    overlap: {
      markup: (o) => `
        <div class="l-over osec" data-tier="${o.tier}">
          ${sectionHead(o)}
          <div class="l-over__stage">
            <div class="l-over__visual" data-visual aria-hidden="true"></div>
            <div class="l-over__panel">
              <div class="seg" role="tablist" aria-label="Choisir une offre">
                ${OFFERS.map((x) => `<button role="tab" type="button" data-pick="${x.tier}" aria-selected="${x.tier === o.tier}">${esc(x.name)}</button>`).join('')}
              </div>
              ${offerCard(o, true)}
            </div>
          </div>
        </div>`,
    },

    /* 16 — Lignes tarifaires : l'en-tête porte le visuel à droite, et les trois
     *      offres s'alignent en bandeaux dessous. Le réflexe « page de prix ». */
    rows: {
      markup: (o) => `
        <div class="l-rows osec" data-tier="${o.tier}">
          <header class="l-rows__head">
            ${sectionHead(o)}
            <div class="l-rows__visual" data-visual="mini" aria-hidden="true"></div>
          </header>
          <div class="l-rows__list">
            ${OFFERS.map((x) => {
    const on = x.tier === o.tier;
    return `
              <article class="l-rows__item${on ? ' is-on' : ''}" data-tier="${x.tier}"${on ? '' : ` data-pick="${x.tier}"`}>
                <div class="l-rows__id">
                  <p class="eyebrow">${esc(x.code)} · ${esc(x.stage)}</p>
                  <h3 class="name">${esc(x.name)}</h3>
                  ${promise(x)}
                  ${on ? counter(x) : ''}
                </div>
                <ul class="chips chips--left">
                  ${x.items.slice(0, on ? 4 : 2).map((it) => `<li>${esc(it.name)}</li>`).join('')}
                </ul>
                <div class="l-rows__buy">
                  ${priceBlock(x)}
                  ${on ? cta(x) : `<button class="ocard__pick" type="button" data-pick="${x.tier}">Choisir</button>`}
                </div>
              </article>`;
  }).join('')}
          </div>
        </div>`,
    },

    /* ═══ Quatrième famille : les mécaniques du web ═══════════════════════════
     * Les trois premières familles sont des *compositions*. Celle-ci teste des
     * **dispositifs** : ce qu'un site marchand met réellement en place pour faire
     * choisir — un tableau qui compare, des onglets, un visuel collant piloté par
     * le défilement, une barre d'achat qui ne quitte jamais l'écran, un petit
     * configurateur qui recommande. Ce ne sont plus des mises en page, ce sont
     * des outils de décision.
     * ═══════════════════════════════════════════════════════════════════════ */

    /* 17 — Tableau comparatif : la colonne choisie s'allume. Le réflexe de
     *      l'acheteur qui hésite — et le seul format où l'on voit les écarts. */
    compare: {
      markup: (o) => {
        const keys = OFFERS[0].compare.map(([k]) => k);
        return `
        <div class="l-cmp osec" data-tier="${o.tier}">
          <div class="l-cmp__intro">
            ${sectionHead(o)}
            <div class="l-cmp__visual" data-visual="mini" aria-hidden="true"></div>
          </div>
          <div class="l-cmp__wrap">
            <table class="l-cmp__table">
              <caption class="sr">Comparatif des trois formules</caption>
              <thead>
                <tr>
                  <th scope="col"><span class="sr">Critère</span></th>
                  ${OFFERS.map((x) => `
                    <th scope="col" class="${x.tier === o.tier ? 'is-on' : ''}" data-tier="${x.tier}">
                      ${x.badge ? `<span class="l-cmp__flag">${esc(x.badge)}</span>` : ''}
                      <span class="l-cmp__name">${esc(x.name)}</span>
                      <span class="l-cmp__price">${priceTag(x)}</span>
                    </th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${keys.map((k, i) => `
                  <tr>
                    <th scope="row">${esc(k)}</th>
                    ${OFFERS.map((x) => `<td class="${x.tier === o.tier ? 'is-on' : ''}">${esc(x.compare[i][1])}</td>`).join('')}
                  </tr>`).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td></td>
                  ${OFFERS.map((x) => `
                    <td class="${x.tier === o.tier ? 'is-on' : ''}">
                      ${x.tier === o.tier ? cta(x) : `<button class="ocard__pick" type="button" data-pick="${x.tier}">Choisir</button>`}
                    </td>`).join('')}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>`;
      },
    },

    /* 18 — Onglets et panneau : la page produit. Barre d'onglets soulignée,
     *      panneau dessous, liste de ce qui est inclus — cochée, pas listée. */
    tabs: {
      markup: (o) => `
        <div class="l-tab osec" data-tier="${o.tier}">
          ${sectionHead(o)}
          <div class="l-tab__bar" role="tablist" aria-label="Choisir une offre">
            ${OFFERS.map((x) => `
              <button role="tab" type="button" data-pick="${x.tier}" data-tier="${x.tier}" aria-selected="${x.tier === o.tier}">
                <b>${esc(x.name)}</b><span>${priceTag(x)}</span>
              </button>`).join('')}
          </div>
          <div class="l-tab__panel">
            <div class="l-tab__visual" data-visual aria-hidden="true"></div>
            <div class="l-tab__body">
              <p class="eyebrow">${esc(o.stageLong)}</p>
              <h3 class="name name--xl">${esc(o.name)}</h3>
              <p class="pitch">${esc(o.pitch)}</p>
              ${counter(o)}
              <ul class="l-tab__feats">
                ${o.items.map((it) => `<li><i aria-hidden="true">✓</i><span>${esc(it.name)}</span><b>${esc(it.benefit)}</b></li>`).join('')}
              </ul>
              <div class="l-tab__foot">${priceBlock(o)}${cta(o)}</div>
            </div>
          </div>
        </div>`,
    },

    /* 19 — Visuel collant, contenu qui défile : le scrollytelling des pages
     *      produit. Ici c'est le **défilement** qui choisit l'offre ; le visuel
     *      change sans reconstruire la section, sinon on perdrait le fil. */
    scrolly: {
      markup: (o) => `
        <div class="l-stp" data-tier="${o.tier}">
          <aside class="l-stp__rail">
            <p class="kicker"><span class="kicker__dot"></span>SYS.OFFRES // Montée en gamme</p>
            <h3 class="osec__title">Trois <em>étages</em></h3>
            <div class="l-stp__visual" data-visual aria-hidden="true"></div>
            <p class="l-stp__now" data-now>${esc(o.stage)} · <b>${esc(o.name)}</b></p>
          </aside>
          <div class="l-stp__flow">
            ${OFFERS.map((x) => `
              <article class="l-stp__step${x.tier === o.tier ? ' is-on' : ''}" data-step="${x.tier}" data-tier="${x.tier}">
                <p class="l-stp__num">${x.level}</p>
                <h4 class="name">${esc(x.name)}</h4>
                ${promise(x)}
                ${counter(x)}
                <ul class="chips chips--left">${x.items.slice(0, 3).map((it) => `<li>${esc(it.name)}</li>`).join('')}</ul>
                <div class="l-stp__foot">${priceBlock(x)}${cta(x)}</div>
                <button class="sr" type="button" data-goto="${x.tier}">Aller à l'étage ${esc(x.name)}</button>
              </article>`).join('')}
          </div>
        </div>`,
      wire(root, setOffer, offer, api) {
        const rail = root.querySelector('[data-now]');
        const steps = [...root.querySelectorAll('[data-step]')];
        let current = offer.tier;
        /* Le défilement change l'offre **sur place** : un rendu complet ferait
           sauter la page sous le doigt à chaque étage franchi. */
        const io = new IntersectionObserver((entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            const tier = e.target.dataset.step;
            if (tier === current) continue;
            current = tier;
            steps.forEach((s) => s.classList.toggle('is-on', s.dataset.step === tier));
            root.querySelector('.l-stp').dataset.tier = tier;
            const x = BY_TIER[tier];
            rail.innerHTML = `${esc(x.stage)} · <b>${esc(x.name)}</b>`;
            api?.swapVisual(tier);
            api?.silentTier(tier);
          }
        }, { rootMargin: '-45% 0px -45% 0px' });
        steps.forEach((s) => io.observe(s));
        /* Au clavier, on ne « choisit » pas un étage : on y va. L'observateur
           fait le reste — sinon il reprendrait la main aussitôt après le clic. */
        const goto = (e) => {
          const btn = e.target.closest('[data-goto]');
          if (!btn) return;
          steps.find((s) => s.dataset.step === btn.dataset.goto)
            ?.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
        };
        root.addEventListener('click', goto);
        return () => { io.disconnect(); root.removeEventListener('click', goto); };
      },
    },

    /* 20 — Barre d'achat collante : le prix et le bouton ne quittent jamais
     *      l'écran pendant qu'on lit le détail. Le réflexe e-commerce. */
    sticky: {
      markup: (o) => `
        <div class="l-stk osec" data-tier="${o.tier}">
          ${sectionHead(o)}
          <div class="l-stk__visual" data-visual="mini" aria-hidden="true"></div>
          <div class="l-stk__detail">
            <div>
              <h4 class="l-stk__h">Ce que comprend ${esc(o.name)}</h4>
              ${offerBody(o, 'full')}
            </div>
            <div>
              <h4 class="l-stk__h">Pourquoi cette formule</h4>
              ${promise(o)}
              ${o.guarantee ? `<p class="obuy__warranty">${esc(o.guarantee)}</p>` : ''}
              <p class="pitch">${esc(o.ctaNote || o.argument)}</p>
              <p class="status"><i></i>${esc(o.status)}</p>
            </div>
          </div>
          <div class="l-stk__bar">
            <div class="seg" role="tablist" aria-label="Choisir une offre">
              ${OFFERS.map((x) => `<button role="tab" type="button" data-pick="${x.tier}" aria-selected="${x.tier === o.tier}">${esc(x.name)}</button>`).join('')}
            </div>
            ${priceBlock(o)}
            ${cta(o)}
          </div>
        </div>`,
    },

    /* 21 — Configurateur : trois questions, une recommandation. On ne demande
     *      plus au visiteur de comparer, on choisit pour lui. */
    config: {
      markup: (o) => {
        const QUESTIONS = [
          ['Où en êtes-vous ?', ['Je ne sais pas quoi dire, ni à qui', 'Il me faut un site qui vend', 'Mon site existe, je veux aller plus loin']],
          ['Ce qu’il vous faut d’abord ?', ['Une stratégie claire', 'La stratégie et le site', 'Une mission ciblée']],
          ['Votre budget ?', ['1 490 €', 'À partir de 3 490 €', 'Missions dès 790 €']],
        ];
        return `
        <div class="l-cfg osec" data-tier="${o.tier}">
          ${sectionHead(o)}
          <div class="l-cfg__grid">
            <form class="l-cfg__form" onsubmit="return false">
              ${QUESTIONS.map(([q, opts], qi) => `
                <fieldset class="l-cfg__q">
                  <legend>${esc(String(qi + 1).padStart(2, '0'))} · ${esc(q)}</legend>
                  <div class="l-cfg__opts">
                    ${opts.map((label, i) => `
                      <button type="button" data-pick="${OFFERS[i].tier}" data-tier="${OFFERS[i].tier}"
                              aria-pressed="${OFFERS[i].tier === o.tier}">${esc(label)}</button>`).join('')}
                  </div>
                </fieldset>`).join('')}
              <p class="l-cfg__note">Trois réponses, une recommandation. Rien n'est envoyé.</p>
            </form>
            <div class="l-cfg__out">
              <div class="l-cfg__visual" data-visual="mini" aria-hidden="true"></div>
              <p class="l-cfg__verdict">Formule recommandée</p>
              ${offerCard(o, true)}
            </div>
          </div>
        </div>`;
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
      /* Certains layouts changent d'offre sans tout reconstruire (le défilement
         pilote la 19). Ils remplacent alors le visuel par ce canal, pour que la
         section garde la main sur les timelines à tuer. */
      const api = {
        swapVisual: (tier) => {
          const slot = this.stage.querySelector('[data-visual]');
          if (!slot) return;
          this.visual?.kill();
          this.visual = mountVisual(slot, tier);
        },
        silentTier: (tier) => { this.tier = tier; },
      };
      this.cleanup = layout.wire?.(this.stage, (t) => this.setOffer(t), offer, api) || null;
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
