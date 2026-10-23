/**
 * LabVisualTune — quatre curseurs pour régler le rendu et figer des valeurs.
 *
 *   Opacité · Saturation   le dessin, et lui seul
 *   Épaisseur              l'échelle des traits, dans les quatre technologies
 *   Arrondi                les angles des surfaces (pas du dessin : un trait
 *                          n'a pas d'angle, une carte oui)
 *
 * Tout passe par des jetons posés sur <html>. Les trois premiers n'agissent que
 * sur les zones de dessin : la vignette des cartes (`.offer__visual`), les plans
 * du banc de layouts (`[data-visual]`) et le canvas plein cadre de Three.js.
 *
 * L'épaisseur est un **facteur**, pas une valeur absolue : chaque trait garde son
 * poids relatif (`stroke-width: calc(.8 * var(--illu-stroke))` dans les feuilles
 * SVG, multiplication du `lineWidth` côté Canvas, du `linewidth` côté WebGL).
 * Canvas et WebGL ne lisant pas la CSS, ils relisent les jetons sur l'événement
 * `themechange` — celui qui sert déjà au thème et aux couleurs.
 *
 * Tant qu'un réglage vaut sa valeur nominale, **aucune règle ne s'applique** :
 * son attribut n'est posé qu'au premier écart. Un filtre ou une opacité crée un
 * contexte d'empilement, et plusieurs layouts en dépendent (le masque du hublot,
 * les plans en perspective du diorama) — autant ne rien introduire pour rien.
 *
 * Réglages mémorisés (localStorage), bouton RAZ pour tout remettre à zéro.
 */
(() => {
  'use strict';

  const KEY = 'lab-illu-tune';
  const root = document.documentElement;
  const DEFAULTS = { opacity: 100, saturate: 100, stroke: 100, round: 0 };

  let state = { ...DEFAULTS };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    state = {
      opacity: clamp(saved.opacity, 10, 100, DEFAULTS.opacity),
      saturate: clamp(saved.saturate, 0, 200, DEFAULTS.saturate),
      stroke: clamp(saved.stroke, 25, 300, DEFAULTS.stroke),
      round: clamp(saved.round, 0, 28, DEFAULTS.round),
    };
  } catch { /* navigation privée */ }

  function clamp(value, min, max, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  }

  const style = document.createElement('style');
  style.textContent = `
    /* Les zones de dessin, et elles seules. Les deux réglages sont séparés
       exprès : l'opacité est quasi gratuite, alors qu'un filtre fait repasser
       la carte dans une passe de rendu à chaque image. Le filtre n'apparaît
       donc que si on touche vraiment à la saturation.
       (Attention : ce bloc est un gabarit JS, pas de backtick dans les
       commentaires — il fermerait la chaîne.) */
    html[data-illu-opacity] :is(.offer__visual, [data-visual], #stage) {
      opacity: var(--illu-opacity, 1);
    }
    html[data-illu-saturate] :is(.offer__visual, [data-visual], #stage) {
      filter: saturate(var(--illu-saturate, 1));
    }

    /* L'arrondi, lui, ne concerne pas le dessin : les traits n'ont pas d'angles,
       les surfaces si. Dès qu'on quitte 0, l'angle coupé du lab (clip-path)
       laisse la place à un rayon — les deux ne peuvent pas cohabiter. */
    html[data-illu-round] :is(.offer__frame, .offer__badge, .offer__cta, .cta, .power, .seg,
      .seg button, .tog, .dock-panel, .banner, .tile, .howto, .table-wrap, .ocard, .ocard__badge,
      .ocard__pick, .l-split, .l-hero, .l-imm, .l-data, .l-throttle, .l-cock, .l-sten, .l-shut,
      .l-port, .l-dio, .l-stack__front, .l-stack__ghost, .l-dio__card, .l-sten__card,
      .l-cock__panel, .l-imm__arrow, .l-dio__tab, .l-onbg, .l-rows__item, .l-tick__card,
      .explorer button, .page__actions button, .toolbar button, .tile__links a, .topbar__back,
      .lab-panel button, .dock-accents__reset, .dock-layers__reset, .dock-tune__reset,
      .l-cfg__opts button, .l-tab__bar button, .l-stk__bar, .l-cmp__flag) {
      clip-path: none;
      border-radius: var(--illu-round, 0px);
    }
    /* Le trait en diagonale qui dessine la coupe n'a plus d'objet une fois arrondi */
    html[data-illu-round] .offer__frame::before,
    html[data-illu-round] .offer__frame::after { display: none; }
    /* Les petits éléments ne suivent pas le même rayon que les grandes surfaces */
    html[data-illu-round] :is(.cta, .power, .seg button, .ocard__pick, .page__actions button,
      .toolbar button, .tile__links a, .topbar__back, .lab-panel button, .l-cfg__opts button,
      .dock-accents__reset, .dock-layers__reset, .dock-tune__reset, .offer__badge, .ocard__badge,
      .l-cmp__flag) {
      border-radius: min(var(--illu-round, 0px), 10px);
    }

    .dock-tune { display: flex; flex-direction: column; gap: 10px; }
    .dock-tune label { display: grid; gap: 5px; }
    .dock-tune__row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
    .dock-tune__row span { letter-spacing: .14em; text-transform: uppercase; font-size: 10px; color: var(--ink-dim, #9fd); }
    .dock-tune__row b { font: 600 11px/1 var(--font-mono, monospace); color: var(--ink, #d6f6ff); font-variant-numeric: tabular-nums; }
    .dock-tune input {
      width: 100%; height: 18px; margin: 0; padding: 0; cursor: pointer;
      accent-color: var(--c-starter, #3ff0ff); background: transparent;
    }
    .dock-tune input:focus-visible { outline: 2px solid var(--c-starter, #3ff0ff); outline-offset: 3px; }
    .dock-tune__reset {
      margin-top: 2px; width: 100%; padding: 5px 8px; cursor: pointer;
      font: 600 10px/1 var(--font-mono, monospace); letter-spacing: .14em; text-transform: uppercase;
      color: var(--ink-faint, rgba(214,246,255,.5)); background: transparent;
      border: 1px solid var(--line, rgba(110, 220, 255, .3));
    }
    .dock-tune__reset:hover { color: var(--c-starter, #3ff0ff); border-color: var(--c-starter, #3ff0ff); }
    @media (pointer: coarse) { .dock-tune input { height: 34px; } }
  `;
  document.head.append(style);

  const FIELDS = [
    { key: 'opacity', label: 'Opacité', min: 10, max: 100, step: 5, unit: '%', hint: 'du dessin' },
    { key: 'saturate', label: 'Saturation', min: 0, max: 200, step: 5, unit: '%', hint: 'du dessin' },
    { key: 'stroke', label: 'Épaisseur', min: 25, max: 300, step: 5, unit: '%', hint: 'des traits' },
    { key: 'round', label: 'Arrondi', min: 0, max: 28, step: 1, unit: 'px', hint: 'des angles (0 = coupé)' },
  ];
  const readout = (f) => (f.key === 'round' && state.round === 0 ? 'coupé' : `${state[f.key]}${f.unit}`);

  function apply({ persist = true } = {}) {
    root.style.setProperty('--illu-opacity', String(state.opacity / 100));
    root.style.setProperty('--illu-saturate', String(state.saturate / 100));
    root.style.setProperty('--illu-stroke', String(state.stroke / 100));
    root.style.setProperty('--illu-round', `${state.round}px`);
    root.toggleAttribute('data-illu-opacity', state.opacity !== DEFAULTS.opacity);
    root.toggleAttribute('data-illu-saturate', state.saturate !== DEFAULTS.saturate);
    root.toggleAttribute('data-illu-round', state.round !== DEFAULTS.round);
    if (persist) {
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
      } catch { /* navigation privée */ }
    }
    /* Canvas et WebGL ne lisent pas la CSS : ils relisent les jetons sur cet
       événement, celui-là même qui sert déjà au thème et aux couleurs. */
    dispatchEvent(new CustomEvent('themechange', {
      detail: { theme: window.LabTheme?.current?.() ?? 'dark', reason: 'tune' },
    }));
  }

  function mount() {
    apply({ persist: false });
    if (!window.LabDock) return;
    const body = window.LabDock.panel({ id: 'tune', title: 'Visuels', order: 28 });

    const wrap = document.createElement('div');
    wrap.className = 'dock-tune';
    wrap.innerHTML = FIELDS.map((f) => `
      <label title="${f.label} ${f.hint}">
        <span class="dock-tune__row"><span>${f.label}</span><b data-out="${f.key}">${readout(f)}</b></span>
        <input type="range" data-tune="${f.key}" min="${f.min}" max="${f.max}" step="${f.step}" value="${state[f.key]}"
               aria-label="${f.label} ${f.hint}">
      </label>`).join('');

    const sync = () => {
      for (const f of FIELDS) {
        wrap.querySelector(`[data-tune="${f.key}"]`).value = String(state[f.key]);
        wrap.querySelector(`[data-out="${f.key}"]`).textContent = readout(f);
      }
    };

    wrap.addEventListener('input', (e) => {
      const input = e.target.closest('input[data-tune]');
      if (!input) return;
      const field = FIELDS.find((f) => f.key === input.dataset.tune);
      state[field.key] = Number(input.value);
      wrap.querySelector(`[data-out="${field.key}"]`).textContent = readout(field);
      apply();
    });

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'dock-tune__reset';
    reset.textContent = 'RAZ';
    reset.title = 'Revenir aux valeurs nominales';
    reset.addEventListener('click', () => {
      state = { ...DEFAULTS };
      apply();
      sync();
    });

    body.append(wrap, reset);
  }

  if (document.body) mount();
  else addEventListener('DOMContentLoaded', mount, { once: true });

  window.LabVisualTune = {
    get: () => ({ ...state }),
    set(next) {
      state = {
        opacity: clamp(next.opacity, 10, 100, state.opacity),
        saturate: clamp(next.saturate, 0, 200, state.saturate),
        stroke: clamp(next.stroke, 25, 300, state.stroke),
        round: clamp(next.round, 0, 28, state.round),
      };
      apply();
    },
    reset() {
      state = { ...DEFAULTS };
      apply();
    },
  };
})();
