/**
 * Commutateur de thème commun au lab (zéro dépendance).
 *
 * - suit le système par défaut ; l'utilisateur peut forcer clair ou sombre
 * - mémorise le choix (localStorage, échec silencieux en navigation privée)
 * - pose `data-theme="light|dark"` sur <html> (les feuilles de style font le reste)
 * - prévient les démos qui peignent elles-mêmes (Canvas, WebGL) :
 *     addEventListener('themechange', (e) => e.detail.theme)  ·  window.LabTheme.current()
 *
 * Trois réglages : Clair · Auto (suit le système) · Sombre, rendus dans un panneau du dock
 * (LabDock) quand il existe, sinon dans la barre du haut.
 * L'attribut est aussi appliqué très tôt par un script en <head> pour éviter le flash au chargement.
 */
(() => {
  'use strict';

  const KEY = 'lab-theme';
  const root = document.documentElement;
  const media = matchMedia('(prefers-color-scheme: light)');

  const stored = () => {
    try {
      const v = localStorage.getItem(KEY);
      return v === 'light' || v === 'dark' ? v : null;
    } catch {
      return null;
    }
  };

  /** Thème effectivement appliqué (choix explicite, sinon système). */
  const current = () => root.dataset.theme || (media.matches ? 'light' : 'dark');
  /** Réglage choisi : 'light', 'dark' ou 'auto' (suit le système). */
  const mode = () => root.dataset.theme || 'auto';

  function apply(next) {
    if (next === 'auto') delete root.dataset.theme;
    else root.dataset.theme = next;
    try {
      if (next === 'auto') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch { /* navigation privée : le choix ne vaut que pour la session */ }
    sync();
    dispatchEvent(new CustomEvent('themechange', { detail: { theme: current(), mode: next } }));
  }

  /* ── Panneau : Clair · Auto · Sombre ── */
  const style = document.createElement('style');
  style.textContent = `
    .dock-theme { display: flex; gap: 4px; }
    .dock-theme button {
      flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px;
      padding: 7px 4px; cursor: pointer; background: transparent;
      border: 1px solid var(--line, rgba(110, 220, 255, .3));
      font: 600 9px/1 var(--font-mono, ui-monospace, monospace); letter-spacing: .12em; text-transform: uppercase;
      color: var(--ink-faint, rgba(214, 246, 255, .5)); transition: color .2s, border-color .2s, background .2s;
    }
    .dock-theme button:hover { color: var(--c-starter, #3ff0ff); border-color: var(--c-starter, #3ff0ff); }
    .dock-theme button[aria-pressed="true"] {
      color: var(--title, #fff); border-color: var(--c-starter, #3ff0ff);
      background: color-mix(in srgb, var(--c-starter, #3ff0ff) 16%, transparent);
    }
    .dock-theme button:focus-visible { outline: 2px solid var(--c-starter, #3ff0ff); outline-offset: 2px; }
    .dock-theme svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; }
  `;
  document.head.append(style);

  const ICONS = {
    light: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6"/></svg>',
    auto: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" stroke="none"/></svg>',
    dark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.4A8.6 8.6 0 0 1 9.6 4 8.5 8.5 0 1 0 20 14.4Z"/></svg>',
  };
  const MODES = [['light', 'Clair'], ['auto', 'Auto'], ['dark', 'Sombre']];

  const wrap = document.createElement('div');
  wrap.className = 'dock-theme';
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', 'Thème');
  wrap.innerHTML = MODES.map(([m, label]) => `<button type="button" data-mode="${m}">${ICONS[m]}<span>${label}</span></button>`).join('');

  function sync() {
    const m = mode();
    wrap.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
  }

  wrap.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-mode]');
    if (btn) apply(btn.dataset.mode);
  });

  function mount() {
    // Dans le dock si le lab en a un, sinon dans la barre du haut (usage autonome)
    const slot = window.LabDock?.panel({ id: 'theme', title: 'Thème', order: 20 })
      || document.querySelector('[data-theme-toggle]')
      || document.querySelector('.topbar')
      || document.body;
    slot.append(wrap);
    sync();
  }

  // Si l'utilisateur n'a rien choisi, on suit les changements de réglage système
  media.addEventListener('change', () => {
    if (!stored()) {
      delete root.dataset.theme;
      sync();
      dispatchEvent(new CustomEvent('themechange', { detail: { theme: current() } }));
    }
  });

  if (stored()) root.dataset.theme = stored();
  if (document.body) mount();
  else addEventListener('DOMContentLoaded', mount, { once: true });

  window.LabTheme = {
    current,
    mode,
    toggle: () => apply(current() === 'light' ? 'dark' : 'light'),
    set: (t) => apply(t),
    /** Couleur calculée d'un jeton CSS (les démos Canvas/WebGL en ont besoin). */
    token: (name, fallback = '') => getComputedStyle(root).getPropertyValue(name).trim() || fallback,
  };
})();
