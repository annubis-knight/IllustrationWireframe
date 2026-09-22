/**
 * Commutateur de thème commun au lab (zéro dépendance).
 *
 * - suit le système par défaut ; l'utilisateur peut forcer clair ou sombre
 * - mémorise le choix (localStorage, échec silencieux en navigation privée)
 * - pose `data-theme="light|dark"` sur <html> (les feuilles de style font le reste)
 * - prévient les démos qui peignent elles-mêmes (Canvas, WebGL) :
 *     addEventListener('themechange', (e) => e.detail.theme)  ·  window.LabTheme.current()
 *
 * Le bouton s'insère dans [data-theme-toggle], sinon dans .topbar / .toolbar, sinon en flottant.
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

  function apply(theme, { persist = true } = {}) {
    root.dataset.theme = theme;
    if (persist) {
      try {
        localStorage.setItem(KEY, theme);
      } catch { /* navigation privée : on garde le choix pour la session uniquement */ }
    }
    sync();
    dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  }

  /* ── Bouton ── */
  const style = document.createElement('style');
  style.textContent = `
    .theme-toggle {
      display: inline-flex; align-items: center; gap: 7px;
      font: 600 11px/1 var(--font-mono, ui-monospace, monospace); letter-spacing: .14em; text-transform: uppercase;
      color: var(--ink, #d6f6ff); background: transparent;
      border: 1px solid var(--line, rgba(110,220,255,.3)); padding: 5px 10px; cursor: pointer;
      transition: border-color .3s, background .3s, color .3s;
    }
    .theme-toggle:hover { border-color: var(--c-starter, #3ff0ff); background: color-mix(in srgb, var(--c-starter, #3ff0ff) 12%, transparent); }
    .theme-toggle:focus-visible { outline: 2px solid var(--c-starter, #3ff0ff); outline-offset: 2px; }
    .theme-toggle svg { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; }
    .theme-toggle[data-floating] { position: fixed; top: 12px; left: 12px; z-index: 60; background: var(--panel-solid, rgba(2,10,18,.85)); }
    .topbar .theme-toggle { margin-left: 12px; }
  `;
  document.head.append(style);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'theme-toggle';
  const SUN = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6"/></svg>';
  const MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.4A8.6 8.6 0 0 1 9.6 4 8.5 8.5 0 1 0 20 14.4Z"/></svg>';

  function sync() {
    const light = current() === 'light';
    btn.innerHTML = `${light ? MOON : SUN}<span>${light ? 'Sombre' : 'Clair'}</span>`;
    btn.setAttribute('aria-label', light ? 'Passer au thème sombre' : 'Passer au thème clair');
    btn.title = btn.getAttribute('aria-label');
  }

  btn.addEventListener('click', () => apply(current() === 'light' ? 'dark' : 'light'));

  function mount() {
    const slot = document.querySelector('[data-theme-toggle]') || document.querySelector('.topbar') || document.querySelector('.toolbar');
    if (slot) slot.append(btn);
    else {
      btn.dataset.floating = '';
      document.body.append(btn);
    }
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
    set: (t) => apply(t),
    toggle: () => apply(current() === 'light' ? 'dark' : 'light'),
    /** Couleur calculée d'un jeton CSS (les démos Canvas/WebGL en ont besoin). */
    token: (name, fallback = '') => getComputedStyle(root).getPropertyValue(name).trim() || fallback,
  };
})();
