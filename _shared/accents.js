/**
 * LabAccents — une couleur principale par offre, modifiable en direct.
 *
 * Chaque carte est déjà entièrement pilotée par un seul jeton (`--c-starter`,
 * `--c-booster`, `--c-nitro`, repris par `--accent` sur la carte) :
 *   - CSS : bordures, fonds, jauges, CTA… dérivés par `color-mix()` ;
 *   - illustration SVG : tous les traits sont en `currentColor` ;
 *   - Canvas / WebGL / Web Component : la couleur est relue dans le jeton.
 * Il suffit donc de réécrire le jeton sur <html> pour que tout suive.
 *
 * Les blancs incandescents (`--hot`) et l'ambre de la balise restent indépendants,
 * volontairement : ce sont des couleurs de matière, pas d'identité.
 *
 * Choix mémorisé (localStorage) et valable dans les deux thèmes.
 */
(() => {
  'use strict';

  const KEY = 'lab-accents';
  const root = document.documentElement;
  const TIERS = [
    { key: 'starter', label: 'Starter' },
    { key: 'booster', label: 'Booster' },
    { key: 'nitro', label: 'Nitro' },
  ];

  let custom = {};
  try {
    custom = JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch { /* navigation privée */ }

  /** Couleur du thème courant pour une offre, sans la surcharge utilisateur. */
  function themeColor(tier) {
    const probe = root.style.getPropertyValue(`--c-${tier}`);
    root.style.removeProperty(`--c-${tier}`);
    const value = getComputedStyle(root).getPropertyValue(`--c-${tier}`).trim();
    if (probe) root.style.setProperty(`--c-${tier}`, probe);
    return value || '#3ff0ff';
  }

  /** `rgb(…)` ou `#abc` → `#aabbcc`, seul format accepté par <input type="color">. */
  function toHex(value) {
    if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
    if (/^#[0-9a-f]{3}$/i.test(value)) return '#' + [...value.slice(1)].map((c) => c + c).join('');
    const m = value.match(/(\d+(?:\.\d+)?)/g);
    if (!m || m.length < 3) return '#3ff0ff';
    return '#' + m.slice(0, 3).map((n) => Math.round(+n).toString(16).padStart(2, '0')).join('');
  }

  function apply({ persist = true } = {}) {
    for (const { key } of TIERS) {
      if (custom[key]) root.style.setProperty(`--c-${key}`, custom[key]);
      else root.style.removeProperty(`--c-${key}`);
    }
    if (persist) {
      try {
        localStorage.setItem(KEY, JSON.stringify(custom));
      } catch { /* navigation privée */ }
    }
    // Les démos qui peignent relisent les jetons sur cet événement (comme au changement de thème)
    dispatchEvent(new CustomEvent('themechange', { detail: { theme: window.LabTheme?.current?.() ?? 'dark', reason: 'accent' } }));
  }

  const style = document.createElement('style');
  style.textContent = `
    .dock-accents { display: flex; flex-direction: column; gap: 6px; }
    .dock-accents label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .dock-accents span { flex: 1; letter-spacing: .1em; text-transform: uppercase; font-size: 10px; color: var(--ink-dim, #9fd); }
    .dock-accents input {
      flex: 0 0 auto; width: 34px; height: 20px; padding: 0; cursor: pointer;
      background: transparent; border: 1px solid var(--line, rgba(110, 220, 255, .35));
    }
    .dock-accents input::-webkit-color-swatch-wrapper { padding: 2px; }
    .dock-accents input::-webkit-color-swatch { border: 0; }
    .dock-accents input:focus-visible { outline: 2px solid var(--c-starter, #3ff0ff); outline-offset: 2px; }
    .dock-accents__reset {
      margin-top: 4px; width: 100%; padding: 5px 8px; cursor: pointer;
      font: 600 10px/1 var(--font-mono, ui-monospace, monospace); letter-spacing: .14em; text-transform: uppercase;
      color: var(--ink-faint, rgba(214,246,255,.5)); background: transparent;
      border: 1px solid var(--line, rgba(110, 220, 255, .3));
    }
    .dock-accents__reset:hover { color: var(--c-starter, #3ff0ff); border-color: var(--c-starter, #3ff0ff); }
  `;
  document.head.append(style);

  function mount() {
    apply({ persist: false });
    if (!window.LabDock) return;
    const body = window.LabDock.panel({ id: 'accents', title: 'Couleurs', order: 25 });

    const wrap = document.createElement('div');
    wrap.className = 'dock-accents';
    wrap.innerHTML = TIERS.map(({ key, label }) => `
      <label title="Couleur principale de l'offre ${label}">
        <span>${label}</span>
        <input type="color" data-tier="${key}" value="${toHex(custom[key] || themeColor(key))}">
      </label>`).join('');

    const sync = () => {
      for (const input of wrap.querySelectorAll('input')) {
        input.value = toHex(custom[input.dataset.tier] || themeColor(input.dataset.tier));
      }
    };

    wrap.addEventListener('input', (e) => {
      const input = e.target.closest('input[data-tier]');
      if (!input) return;
      custom[input.dataset.tier] = input.value;
      apply();
    });

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'dock-accents__reset';
    reset.textContent = 'Couleurs du thème';
    reset.addEventListener('click', () => {
      custom = {};
      apply();
      sync();
    });

    // Au changement de thème, les cases retrouvent les couleurs du thème (sauf surcharge)
    addEventListener('themechange', (e) => {
      if (e.detail?.reason !== 'accent') setTimeout(sync, 0);
    });

    body.append(wrap, reset);
  }

  if (document.body) mount();
  else addEventListener('DOMContentLoaded', mount, { once: true });

  window.LabAccents = {
    get: (tier) => custom[tier] || themeColor(tier),
    set(tier, color) {
      custom[tier] = color;
      apply();
    },
    reset() {
      custom = {};
      apply();
    },
  };
})();
