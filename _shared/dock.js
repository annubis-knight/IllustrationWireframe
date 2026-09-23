/**
 * LabDock — colonne de panneaux repliables, à droite de l'écran (zéro dépendance).
 *
 * Les outils du lab s'y branchent au lieu de flotter chacun dans son coin :
 *   PERF (compteur FPS) · THÈME (clair/auto/sombre) · CALQUES (éléments du visuel) · LAB (glow, anim…)
 *
 * API :
 *   LabDock.panel({ id, title, order })  → renvoie l'élément de contenu à remplir
 *   LabDock.adopt(id, title, node, order) → déplace un élément existant dans un panneau
 *
 * Le panneau `.lab-panel` d'une démo est adopté automatiquement s'il existe.
 * Touche « D » : replier / déplier tout le dock. L'état de chaque panneau est mémorisé.
 */
(() => {
  'use strict';

  const KEY = 'lab-dock';
  const read = () => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '{}');
    } catch {
      return {};
    }
  };
  const write = (state) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch { /* navigation privée */ }
  };
  let state = read();

  const style = document.createElement('style');
  style.textContent = `
    .lab-dock {
      position: fixed; top: calc(12px + env(safe-area-inset-top, 0px)); right: 12px; z-index: 9999;
      width: 194px; display: flex; flex-direction: column; gap: 8px;
      filter: drop-shadow(0 18px 30px rgba(0, 0, 0, .45));
      /* Le dock passe par-dessus la page : au repos il s'efface pour laisser lire ce qu'il couvre */
      opacity: .55; transition: opacity .25s var(--ease, ease);
      max-height: calc(100vh - 24px); overflow-y: auto; overscroll-behavior: contain;
      font: 500 11px/1.35 var(--font-mono, ui-monospace, monospace); letter-spacing: .04em;
      color: var(--ink, #d6f6ff); scrollbar-width: thin;
      scrollbar-color: color-mix(in srgb, var(--c-starter, #3ff0ff) 45%, transparent) transparent;
    }
    .lab-dock:hover, .lab-dock:focus-within, .lab-dock[data-collapsed] { opacity: 1; }
    @media (hover: none) { .lab-dock { opacity: 1; } }
    .lab-dock::-webkit-scrollbar { width: 6px; }
    .lab-dock::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--c-starter, #3ff0ff) 45%, transparent); }
    .lab-dock[data-collapsed] .dock-panel:not(.dock-panel--handle) { display: none; }

    .dock-panel {
      background: var(--panel-solid, rgba(2, 10, 18, .85));
      border: 1px solid var(--line, rgba(110, 220, 255, .3));
      backdrop-filter: blur(6px);
      clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%);
    }
    .dock-panel__head {
      display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%;
      padding: 7px 9px; background: transparent; border: 0; cursor: pointer;
      font: 600 10px/1 var(--font-mono, ui-monospace, monospace); letter-spacing: .2em; text-transform: uppercase;
      color: var(--ink-faint, rgba(214, 246, 255, .5));
    }
    .dock-panel__head:hover { color: var(--c-starter, #3ff0ff); }
    .dock-panel__head:focus-visible { outline: 2px solid var(--c-starter, #3ff0ff); outline-offset: -2px; }
    .dock-panel__head i { font-style: normal; transition: transform .25s var(--ease, ease); }
    .dock-panel[data-closed] .dock-panel__head i { transform: rotate(-90deg); }
    .dock-panel[data-closed] .dock-panel__body { display: none; }
    .dock-panel__body { padding: 0 9px 9px; }

    /* Le panneau LAB des démos, une fois adopté */
    .lab-dock .lab-panel {
      position: static; display: flex; flex-wrap: wrap; gap: 6px;
      padding: 0; background: none; border: 0; backdrop-filter: none;
    }
    .lab-dock .lab-panel__title { display: none; }
    .lab-dock .lab-panel button { flex: 1 0 auto; }

    .dock-handle { display: flex; align-items: center; gap: 6px; }
    @media (max-width: 720px) {
      .lab-dock { width: 168px; right: 8px; }
    }
    @media print { .lab-dock { display: none; } }
  `;
  document.head.append(style);

  const dock = document.createElement('aside');
  dock.className = 'lab-dock';
  dock.setAttribute('aria-label', 'Outils du lab');
  if (state.__collapsed) dock.setAttribute('data-collapsed', '');

  /* Poignée : replie tout le dock */
  const handle = document.createElement('section');
  handle.className = 'dock-panel dock-panel--handle';
  const handleBtn = document.createElement('button');
  handleBtn.type = 'button';
  handleBtn.className = 'dock-panel__head';
  const syncHandle = () => {
    const collapsed = dock.hasAttribute('data-collapsed');
    handleBtn.innerHTML = `<span class="dock-handle">LAB · OUTILS</span><i>${collapsed ? '▸' : '▾'}</i>`;
    handleBtn.setAttribute('aria-expanded', String(!collapsed));
  };
  handleBtn.addEventListener('click', () => {
    dock.toggleAttribute('data-collapsed');
    state.__collapsed = dock.hasAttribute('data-collapsed');
    write(state);
    syncHandle();
  });
  syncHandle();
  handle.append(handleBtn);
  dock.append(handle);

  const panels = new Map();

  function panel({ id, title, order = 50 }) {
    if (panels.has(id)) return panels.get(id).body;
    const section = document.createElement('section');
    section.className = 'dock-panel';
    section.dataset.panel = id;
    section.style.order = String(order);
    if (state[id] === false) section.setAttribute('data-closed', '');

    const head = document.createElement('button');
    head.type = 'button';
    head.className = 'dock-panel__head';
    head.innerHTML = `<span>${title}</span><i>▾</i>`;
    head.setAttribute('aria-expanded', String(state[id] !== false));
    head.addEventListener('click', () => {
      section.toggleAttribute('data-closed');
      const open = !section.hasAttribute('data-closed');
      state[id] = open;
      head.setAttribute('aria-expanded', String(open));
      write(state);
    });

    const body = document.createElement('div');
    body.className = 'dock-panel__body';
    section.append(head, body);
    dock.append(section);
    panels.set(id, { section, body });
    return body;
  }

  /** Déplace un élément déjà présent dans la page (ex. le panneau LAB d'une démo). */
  function adopt(id, title, node, order = 60) {
    if (!node) return null;
    const body = panel({ id, title, order });
    body.append(node);
    return body;
  }

  function mount() {
    document.body.append(dock);
    // Le panneau LAB de la démo rejoint le dock automatiquement
    adopt('lab', 'Lab', document.querySelector('.lab-panel'), 60);
  }

  addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'd' && !e.ctrlKey && !e.metaKey && !e.altKey && !/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) {
      handleBtn.click();
    }
  });

  if (document.body) mount();
  else addEventListener('DOMContentLoaded', mount, { once: true });

  window.LabDock = { panel, adopt, el: dock };
})();
