/**
 * LabArt — un interrupteur qui bascule tout le lab dans la direction artistique
 * de PropulSite (https://www.propulsitetoulouse.website).
 *
 * Relevé sur le site, rien d'inventé :
 *   couleurs  #fbbb21 (jaune marque) · #fccd5f #fde09b #fef2d7 #fef9eb (rampe)
 *             #1e2122 (encre) · #011a22 (encre froide) · #f8f8f8 #f3f4f6 (fonds) · blanc
 *   typo      Playfair Display 700 pour les titres · Outfit 300-600 pour le reste
 *   formes    boutons jaunes pleins, rayon 8 px, cartes blanches à filet jaune
 *   fond      papier blanc + constellation grise
 *
 * Deux points demandent un arbitrage, parce que la marque et le lab ne comptent
 * pas pareil :
 *
 * 1. Le lab code chaque offre par une couleur, la marque n'a qu'un accent. On
 *    déroule donc la gamme sur un axe encre → jaune → ambre : l'offre
 *    recommandée porte le jaune de la marque, exactement comme le CTA du site.
 * 2. Le site est clair. La DA force donc le thème clair et **verrouille** les
 *    réglages qui la contrediraient : thème et couleurs par offre. Tant qu'elle
 *    est active, c'est elle qui décide — c'est tout l'intérêt d'une DA.
 *
 * Les calques, le compteur et le panneau Lab restent libres : ils ne touchent
 * pas à l'identité.
 */
(() => {
  'use strict';

  const KEY = 'lab-art';
  const PREV = 'lab-art-theme'; // le thème d'avant la DA, à rendre en l'éteignant
  const ART = 'propulsite';
  const root = document.documentElement;
  const FONTS = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap';

  const stored = () => {
    try {
      return localStorage.getItem(KEY) === ART;
    } catch {
      return false;
    }
  };
  const isOn = () => root.dataset.art === ART;

  /* La DA force le thème clair, et `LabTheme.set` mémorise ce choix. Sans garder
     le réglage d'avant *sur le disque*, un rechargement avec la DA active
     effacerait définitivement la préférence de l'utilisateur. */
  const prevTheme = {
    read() {
      try {
        return localStorage.getItem(PREV);
      } catch {
        return null;
      }
    },
    write(value) {
      try {
        if (value) localStorage.setItem(PREV, value);
        else localStorage.removeItem(PREV);
      } catch { /* navigation privée */ }
    },
  };

  /* Les polices ne sont chargées qu'à la première activation : la DA est éteinte
     par défaut, elle n'a pas à peser sur les mesures du banc. */
  let fontsAsked = false;
  function loadFonts() {
    if (fontsAsked) return;
    fontsAsked = true;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONTS;
    document.head.append(link);
  }

  /* ── La feuille de la DA ──────────────────────────────────────────────────
   * `html:root[data-art]` passe devant `:root[data-theme="light"]` sans recourir
   * à !important : même attribut, mais un sélecteur de plus.
   * ─────────────────────────────────────────────────────────────────────────── */
  const style = document.createElement('style');
  style.textContent = `
    html:root[data-art="${ART}"] {
      --bg: #ffffff;
      --panel: rgba(255, 255, 255, .94);
      --panel-solid: #ffffff;
      --thumb-bg: #f8f8f8;
      --ink: #1e2122;
      --ink-dim: rgba(30, 33, 34, .68);
      --ink-faint: rgba(30, 33, 34, .45);
      --line: rgba(30, 33, 34, .14);
      --grid: rgba(30, 33, 34, .05);
      --scanline: transparent;
      --glow-top: rgba(251, 187, 33, .18);
      --glow-right: rgba(251, 187, 33, .08);
      --glow-left: rgba(1, 26, 34, .05);

      /* Encre → jaune → ambre : l'offre recommandée porte la couleur de la marque */
      --c-starter: #1e2122;
      --c-booster: #fbbb21;
      --c-nitro: #c07d00;
      /* Le tableau de bord a ses propres jetons, mêmes valeurs */
      --cyan: #1e2122;
      --violet: #fbbb21;
      --magenta: #c07d00;
      --ok: #1e2122;

      --amber: #fbbb21;
      --hot: #fbbb21;
      --on-accent: #ffffff;
      --title: #1e2122;
      --panel-tint: 6%;
      --font-display: "Playfair Display", Georgia, "Times New Roman", serif;
      --font-mono: "Outfit", system-ui, -apple-system, sans-serif;
      --cut: 0px;
      color-scheme: light;
    }
    /* Un aplat jaune se lit en encre, un aplat encre se lit en blanc */
    html:root[data-art="${ART}"] [data-tier="booster"],
    html:root[data-art="${ART}"] .tile[data-id*="02"] { --on-accent: #1e2122; }

    /* Titres : Playfair en casse normale. Capitales + interlettrage, c'est la
       grammaire du HUD, pas celle d'une didone. */
    html:root[data-art="${ART}"] :is(h1, h2, h3, .name, .page__title, .page__parttitle,
      .offers__title, .offer__name, .lab-section h2, .tile h2, .dock-handle) {
      text-transform: none;
      letter-spacing: 0;
    }
    html:root[data-art="${ART}"] :is(.name, .offers__title, .page__title, .page__parttitle) {
      font-weight: 700;
    }

    /* La marque n'a pas d'angle coupé : elle arrondit. */
    html:root[data-art="${ART}"] :is(.offer__frame, .offer__badge, .cta, .power, .seg, .tog,
      .dock-panel, .banner, .tile, .howto, .table-wrap, .l-split, .l-hero, .l-imm, .l-data,
      .l-throttle, .l-cock, .l-sten, .l-shut, .l-port, .l-dio, .l-stack__front, .l-stack__ghost,
      .l-dio__card, .l-sten__card, .l-cock__panel, .l-imm__arrow, .l-dio__tab, .explorer button,
      .page__actions button, .toolbar button, .tile__links a, .topbar__back, .seg button,
      .dock-accents__reset, .dock-layers__reset, .lab-panel button) {
      clip-path: none;
      border-radius: 10px;
    }
    html:root[data-art="${ART}"] :is(.cta, .power, .page__actions button, .toolbar button,
      .tile__links a, .topbar__back, .seg button, .l-dio__tab, .lab-panel button) { border-radius: 8px; }
    html:root[data-art="${ART}"] :is(.offer__frame, .tile, .l-stack__front, .l-dio__card,
      .l-sten__card, .l-cock__panel) { border-radius: 12px; }

    /* Fond : papier blanc et constellation grise, comme les illustrations du site */
    html:root[data-art="${ART}"] .backdrop::after {
      content: "";
      position: absolute;
      inset: 0;
      background-image: radial-gradient(circle, rgba(30, 33, 34, .11) 1.1px, transparent 1.2px);
      background-size: 46px 46px;
      opacity: .5;
    }

    /* Le dessin passe à l'encre : pas de halo, un trait un peu plus affirmé —
       le jaune de la marque est clair, il ne tient pas en cheveu sur du blanc. */
    html:root[data-art="${ART}"] .illu { font-family: "Outfit", system-ui, sans-serif; }
    html:root[data-art="${ART}"] .illu .glow,
    html:root[data-art="${ART}"] .illu .fx { filter: none; }
    html:root[data-art="${ART}"] .illu .g-front { stroke-width: 1; }
    html:root[data-art="${ART}"] .illu .g-contour { stroke-width: 1.9; }
    html:root[data-art="${ART}"] .illu .hud-ring,
    html:root[data-art="${ART}"] .illu .hud-back { opacity: .7; }

    /* Tout le vocabulaire du HUD ne se traduit pas sur du papier : le cône
       d'hologramme devient une boîte grise, la fumée un pâté. On les met en
       sourdine par le groupe parent — GSAP anime l'opacité des enfants, une
       règle sur eux se ferait écraser par le style en ligne. */
    html:root[data-art="${ART}"] .illu .holo-cone { opacity: .16; }
    html:root[data-art="${ART}"] .illu .smoke { opacity: .26; }
    html:root[data-art="${ART}"] .illu .vapor { opacity: .22; }
    html:root[data-art="${ART}"] .illu .hb-pulse { opacity: 0; }

    /* Du blanc posé sur du blanc ne creuse rien : les voiles qui portaient la
       profondeur sur fond noir doivent mordre davantage sur du papier. */
    html:root[data-art="${ART}"] .l-port__mask { background: color-mix(in srgb, #ffffff 88%, transparent); }
    html:root[data-art="${ART}"] .l-shut__pane--closed { background: color-mix(in srgb, #ffffff 72%, transparent); }

    /* Un réglage verrouillé par la DA se voit : grisé, barré d'un mot d'explication */
    .dock-locked { position: relative; }
    .dock-locked > :not(.dock-locked__why) { opacity: .4; pointer-events: none; filter: grayscale(1); }
    .dock-locked__why {
      display: block; margin-top: 7px; font-size: 9.5px; line-height: 1.4;
      letter-spacing: .08em; text-transform: uppercase; color: var(--ink-faint);
    }

    /* L'interrupteur */
    .dock-art { display: flex; flex-direction: column; gap: 8px; }
    .dock-art__row {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      width: 100%; padding: 0; background: transparent; border: 0; cursor: pointer;
      color: var(--ink, #d6f6ff); font: inherit; text-align: left;
    }
    .dock-art__name { display: flex; flex-direction: column; gap: 2px; }
    .dock-art__name b { font: 600 11px/1.2 var(--font-mono, monospace); letter-spacing: .1em; }
    .dock-art__name span { font-size: 9.5px; letter-spacing: .08em; color: var(--ink-faint, #789); }
    .dock-art__sw {
      flex: 0 0 auto; width: 38px; height: 20px; border-radius: 999px; position: relative;
      background: color-mix(in srgb, var(--ink-faint, #789) 35%, transparent);
      border: 1px solid var(--line, rgba(110, 220, 255, .3));
      transition: background .25s var(--ease, ease), border-color .25s;
    }
    .dock-art__sw::after {
      content: ""; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px;
      border-radius: 50%; background: var(--ink, #d6f6ff);
      transition: transform .25s var(--ease, ease), background .25s;
    }
    .dock-art__row[aria-checked="true"] .dock-art__sw { background: #fbbb21; border-color: #fbbb21; }
    .dock-art__row[aria-checked="true"] .dock-art__sw::after { transform: translateX(18px); background: #1e2122; }
    .dock-art__row:focus-visible { outline: 2px solid var(--c-starter, #3ff0ff); outline-offset: 3px; }
    .dock-art__hint { font-size: 9.5px; line-height: 1.45; letter-spacing: .04em; color: var(--ink-faint, #789); }
    .dock-art__swatches { display: flex; gap: 3px; }
    .dock-art__swatches i { flex: 1; height: 5px; border-radius: 2px; }
  `;
  document.head.append(style);

  /* ── Verrouillage des réglages que la DA impose ───────────────────────────── */
  function lockPanel(selector, why) {
    const body = document.querySelector(selector)?.closest('.dock-panel__body');
    if (!body) return;
    body.classList.toggle('dock-locked', isOn());
    let note = body.querySelector('.dock-locked__why');
    if (isOn()) {
      if (!note) {
        note = document.createElement('p');
        note.className = 'dock-locked__why';
        body.append(note);
      }
      note.textContent = why;
    } else if (note) {
      note.remove();
    }
    body.querySelectorAll('input, button').forEach((el) => {
      if (el.closest('.dock-panel__head')) return;
      el.disabled = isOn();
    });
  }

  function syncLocks() {
    lockPanel('.dock-theme', 'Thème imposé par la DA PropulSite');
    lockPanel('.dock-accents', 'Couleurs imposées par la DA PropulSite');
    window.LabAccents?.suspend?.(isOn());
  }

  function apply(on, { persist = true } = {}) {
    const wasOn = isOn();
    if (on) {
      loadFonts();
      if (!wasOn) prevTheme.write(window.LabTheme?.mode?.() ?? 'auto');
      root.dataset.art = ART;
      window.LabTheme?.set?.('light'); // le site est clair : la DA l'est aussi
    } else {
      delete root.dataset.art;
      const back = prevTheme.read();
      if (back) window.LabTheme?.set?.(back);
      prevTheme.write(null);
    }
    if (persist) {
      try {
        if (on) localStorage.setItem(KEY, ART);
        else localStorage.removeItem(KEY);
      } catch { /* navigation privée */ }
    }
    syncLocks();
    syncSwitch();
    // Canvas, WebGL et Web Component relisent les jetons sur cet événement
    dispatchEvent(new CustomEvent('themechange', {
      detail: { theme: window.LabTheme?.current?.() ?? 'light', reason: 'art', art: on ? ART : null },
    }));
  }

  /* ── Le panneau ───────────────────────────────────────────────────────────── */
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'dock-art__row';
  row.setAttribute('role', 'switch');
  row.innerHTML = `
    <span class="dock-art__name"><b>PropulSite</b><span>propulsitetoulouse.website</span></span>
    <span class="dock-art__sw" aria-hidden="true"></span>`;
  row.addEventListener('click', () => apply(!isOn()));

  const hint = document.createElement('p');
  hint.className = 'dock-art__hint';

  const swatches = document.createElement('div');
  swatches.className = 'dock-art__swatches';
  swatches.setAttribute('aria-hidden', 'true');
  swatches.innerHTML = ['#1e2122', '#fbbb21', '#c07d00', '#fde09b', '#f8f8f8']
    .map((c) => `<i style="background:${c};box-shadow:inset 0 0 0 1px rgba(30,33,34,.18)"></i>`).join('');

  function syncSwitch() {
    row.setAttribute('aria-checked', String(isOn()));
    hint.textContent = isOn()
      ? 'Thème et couleurs verrouillés tant que la DA est active.'
      : 'Bascule le lab dans les couleurs et typographies de propulsitetoulouse.website.';
  }

  function mount() {
    const body = window.LabDock?.panel({ id: 'art', title: 'Direction artistique', order: 18 });
    if (body) {
      const wrap = document.createElement('div');
      wrap.className = 'dock-art';
      wrap.append(row, swatches, hint);
      body.append(wrap);
    }
    // Les autres panneaux se montent dans le même tour de boucle : on verrouille après
    apply(stored() || isOn(), { persist: false });
    setTimeout(syncLocks, 0);
  }

  if (document.body) mount();
  else addEventListener('DOMContentLoaded', mount, { once: true });

  window.LabArt = {
    current: () => (isOn() ? ART : null),
    set: (on) => apply(!!on),
    toggle: () => apply(!isOn()),
  };
})();
