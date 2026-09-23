/**
 * LabLayers — allume / éteint en direct les calques des illustrations, dans les 4 démos.
 *
 * Sept calques, communs aux quatre technologies (même vocabulaire = comparaison possible) :
 *   model · ring · base · overlay · labels · decor · fx
 *
 * Deux canaux d'application, selon ce que la démo sait faire :
 *   1. CSS — `<html data-layers-off="ring fx">` masque tout élément `[data-layer="ring"]`
 *      (SVG du proto 01, HUD en surimpression des protos 02/03).
 *   2. Événement `layerchange` — pour ce qui est peint : scènes Three.js, Canvas 2D,
 *      Shadow DOM du Web Component.
 *
 * État mémorisé (localStorage), panneau rendu dans le dock.
 */
(() => {
  'use strict';

  const KEY = 'lab-layers';

  const LAYERS = [
    { key: 'model', label: 'Élément central', hint: 'fusée, lanceur, vaisseau' },
    { key: 'ring', label: 'Cercle HUD', hint: 'cadran radar et graduations' },
    { key: 'base', label: 'Socle', hint: 'socle holographique et cône de lumière' },
    { key: 'overlay', label: 'Overlay', hint: 'balayage, réticule, coins d’écran' },
    { key: 'labels', label: 'Légendes', hint: 'étiquettes techniques et télémétrie' },
    { key: 'decor', label: 'Décor', hint: 'grille au sol, planète, étoiles, traînées' },
    { key: 'fx', label: 'Effets', hint: 'flammes, anneaux de réacteur, vapeurs' },
  ];

  const state = Object.fromEntries(LAYERS.map((l) => [l.key, true]));
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    for (const l of LAYERS) if (typeof saved[l.key] === 'boolean') state[l.key] = saved[l.key];
  } catch { /* navigation privée */ }

  function apply({ persist = true, notify = true } = {}) {
    const off = LAYERS.filter((l) => !state[l.key]).map((l) => l.key);
    document.documentElement.dataset.layersOff = off.join(' ');
    if (persist) {
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
      } catch { /* navigation privée */ }
    }
    if (notify) dispatchEvent(new CustomEvent('layerchange', { detail: { layers: { ...state }, off } }));
  }

  /* ── Panneau ── */
  const style = document.createElement('style');
  style.textContent = `
    .dock-layers { display: flex; flex-direction: column; gap: 1px; }
    .dock-layers label {
      display: flex; align-items: center; gap: 8px; padding: 4px 2px; cursor: pointer;
      color: var(--ink, #d6f6ff); transition: color .2s;
    }
    .dock-layers label:hover { color: var(--c-starter, #3ff0ff); }
    .dock-layers input { position: absolute; opacity: 0; pointer-events: none; }
    .dock-layers .box {
      position: relative; flex: 0 0 auto; width: 12px; height: 12px;
      border: 1px solid color-mix(in srgb, var(--c-starter, #3ff0ff) 55%, transparent);
    }
    .dock-layers input:checked + .box { background: color-mix(in srgb, var(--c-starter, #3ff0ff) 85%, transparent); }
    .dock-layers input:checked + .box::after {
      content: ""; position: absolute; inset: 2px 2px 3px 2px;
      border-left: 1.5px solid var(--on-accent, #041018); border-bottom: 1.5px solid var(--on-accent, #041018);
      transform: rotate(-45deg);
    }
    .dock-layers input:focus-visible + .box { outline: 2px solid var(--c-starter, #3ff0ff); outline-offset: 2px; }
    .dock-layers label span { flex: 1; }
    .dock-layers input:not(:checked) ~ span { opacity: .45; text-decoration: line-through; }
    .dock-layers__reset {
      margin-top: 7px; width: 100%; padding: 5px 8px; cursor: pointer;
      font: 600 10px/1 var(--font-mono, ui-monospace, monospace); letter-spacing: .14em; text-transform: uppercase;
      color: var(--ink-faint, rgba(214,246,255,.5)); background: transparent;
      border: 1px solid var(--line, rgba(110, 220, 255, .3));
    }
    .dock-layers__reset:hover { color: var(--c-starter, #3ff0ff); border-color: var(--c-starter, #3ff0ff); }
  `;
  document.head.append(style);

  function mount() {
    apply({ persist: false, notify: false });
    if (!window.LabDock) return;
    const body = window.LabDock.panel({ id: 'layers', title: 'Calques', order: 30 });
    const wrap = document.createElement('div');
    wrap.className = 'dock-layers';
    wrap.innerHTML = LAYERS.map((l) => `
      <label title="${l.hint}">
        <input type="checkbox" data-layer-key="${l.key}"${state[l.key] ? ' checked' : ''}>
        <i class="box"></i><span>${l.label}</span>
      </label>`).join('');

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'dock-layers__reset';
    reset.textContent = 'Tout afficher';
    reset.addEventListener('click', () => {
      for (const l of LAYERS) state[l.key] = true;
      wrap.querySelectorAll('input').forEach((i) => (i.checked = true));
      apply();
    });

    wrap.addEventListener('change', (e) => {
      const input = e.target.closest('input[data-layer-key]');
      if (!input) return;
      state[input.dataset.layerKey] = input.checked;
      apply();
    });

    body.append(wrap, reset);
    apply({ persist: false });
  }

  if (document.body) mount();
  else addEventListener('DOMContentLoaded', mount, { once: true });

  window.LabLayers = {
    LAYERS,
    state: () => ({ ...state }),
    isOn: (key) => state[key] !== false,
    set(key, on) {
      state[key] = !!on;
      document.querySelector(`input[data-layer-key="${key}"]`)?.toggleAttribute('checked', !!on);
      apply();
    },
  };
})();
