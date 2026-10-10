/**
 * LabArt — l'interrupteur de la direction artistique PropulSite.
 *
 * Tout le rendu est dans `art-direction.css`, chargé avec les autres feuilles ;
 * ce module ne fait que trois choses :
 *   1. poser / retirer `data-art` (et `data-theme="light"`, le site est clair) ;
 *   2. verrouiller les deux réglages que la DA impose — Thème et Couleurs ;
 *   3. prévenir **une seule fois** les démos qui peignent (Canvas, WebGL).
 *
 * Ce qu'il ne fait plus, et pourquoi :
 *   · il n'injecte plus la feuille — elle arrivait après le premier rendu, d'où
 *     le flash de couleur ;
 *   · il ne demande plus les polices au montage — le script de tête s'en charge
 *     quand la DA est déjà active, sinon elles arrivaient après DOMContentLoaded ;
 *   · il ne passe plus par `LabTheme.set()` — qui mémorisait « clair » et écrasait
 *     la préférence de l'utilisateur, en plus d'émettre un second `themechange`.
 */
(() => {
  'use strict';

  const KEY = 'lab-art';
  const ART = 'propulsite';
  const root = document.documentElement;
  const FONTS = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=Playfair+Display:wght@600;700&display=swap';

  const isOn = () => root.dataset.art === ART;
  const read = (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  /* Les polices ne sont chargées qu'une fois la DA allumée : éteinte, elle ne
     doit rien peser. Au chargement c'est le script de tête qui s'en occupe. */
  function loadFonts() {
    if (document.querySelector('link[data-art-fonts]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONTS;
    link.dataset.artFonts = '';
    document.head.append(link);
  }

  /* ── Verrouillage ─────────────────────────────────────────────────────────── */
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
    body.querySelectorAll('input, button').forEach((el) => { el.disabled = isOn(); });
    // Le panneau Thème doit dire la vérité : c'est « clair » qui s'applique
    if (isOn()) {
      body.querySelectorAll('.dock-theme button').forEach((b) => {
        b.setAttribute('aria-pressed', String(b.dataset.mode === 'light'));
      });
    }
  }

  function syncLocks() {
    lockPanel('.dock-theme', 'Thème imposé par la DA PropulSite');
    lockPanel('.dock-accents', 'Couleurs imposées par la DA PropulSite');
    // Les surcharges par offre sont mises en sommeil, pas effacées
    window.LabAccents?.suspend?.(isOn());
  }

  function apply(on) {
    if (on) {
      loadFonts();
      root.dataset.art = ART;
      // Attribut posé à la main : passer par LabTheme mémoriserait « clair » et
      // écraserait la préférence de l'utilisateur, qu'on doit lui rendre intacte.
      root.dataset.theme = 'light';
    } else {
      delete root.dataset.art;
    }
    try {
      if (on) localStorage.setItem(KEY, ART);
      else localStorage.removeItem(KEY);
    } catch { /* navigation privée */ }

    syncLocks();
    syncSwitch();

    if (on) {
      // Un seul événement : Canvas, WebGL et Web Component relisent les jetons une fois
      dispatchEvent(new CustomEvent('themechange', {
        detail: { theme: 'light', reason: 'art', art: ART },
      }));
    } else {
      // En rendant la main, c'est LabTheme qui réapplique le thème d'avant,
      // resynchronise son panneau et prévient les démos — un seul chemin.
      const saved = read('lab-theme');
      const back = saved === 'light' || saved === 'dark' ? saved : 'auto';
      if (window.LabTheme?.set) window.LabTheme.set(back);
      else if (back === 'auto') delete root.dataset.theme;
      else root.dataset.theme = back;
    }
  }

  /* ── Le panneau ───────────────────────────────────────────────────────────── */
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'dock-art__row';
  row.setAttribute('role', 'switch');
  row.innerHTML = `
    <span class="dock-art__name"><b>PropulSite</b><span>Couleurs + typographies</span></span>
    <span class="dock-art__sw" aria-hidden="true"></span>`;
  row.addEventListener('click', () => apply(!isOn()));

  const hint = document.createElement('p');
  hint.className = 'dock-art__hint';

  const swatches = document.createElement('div');
  swatches.className = 'dock-art__swatches';
  swatches.setAttribute('aria-hidden', 'true');
  swatches.innerHTML = ['#fccd5f', '#fbbb21', '#c07d00', '#1e2122', '#f8f8f8']
    .map((c) => `<i style="background:${c}"></i>`).join('');

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
    // Déjà posée par le script de tête : rien à rejouer, juste à refléter
    syncSwitch();
    syncLocks();
    if (isOn()) loadFonts();
  }

  if (document.body) mount();
  else addEventListener('DOMContentLoaded', mount, { once: true });

  window.LabArt = {
    current: () => (isOn() ? ART : null),
    set: (on) => apply(!!on),
    toggle: () => apply(!isOn()),
  };
})();
