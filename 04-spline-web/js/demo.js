/**
 * Page de démo du prototype 04 : habillage des cartes autour du composant <wire-rocket>.
 * Tout le visuel est dans le composant — ce fichier ne fait que le piloter de l'extérieur,
 * exactement comme le ferait un composant Vue / un thème WordPress.
 */
(() => {
  'use strict';

  /** Colle ici l'URL publique d'une scène exportée depuis Spline pour activer la comparaison. */
  const SPLINE_URL = '';

  const pad = (n, l = 2) => String(Math.floor(n)).padStart(l, '0');
  const nf = new Intl.NumberFormat('fr-FR');
  const fmt = (n) => nf.format(n).replace(/ /g, ' ');
  const rockets = [...document.querySelectorAll('wire-rocket')];
  const cards = [...document.querySelectorAll('.offer')];

  /* Survol de la carte → état « boost » du composant */
  for (const card of cards) {
    const el = card.querySelector('wire-rocket');
    const set = (v) => {
      card.classList.toggle('is-active', v);
      if (el) el.boost = v;
    };
    card.addEventListener('pointerenter', () => set(true));
    card.addEventListener('pointerleave', () => set(false));
    card.addEventListener('focusin', () => set(true));
    card.addEventListener('focusout', (e) => !card.contains(e.relatedTarget) && set(false));
  }

  /* Entrée des cartes */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => e.isIntersecting && e.target.classList.add('is-in'));
  }, { threshold: 0.15 });
  cards.forEach((c) => io.observe(c));

  /* Télémétrie : on écrit dans les attributs du composant */
  const host = (sel) => document.querySelector(sel);
  let n = 10;
  setInterval(() => {
    const hot = cards.some((c) => c.classList.contains('is-active'));
    n = n <= 0 ? 10 : n - 1;
    host('[data-countdown-host]')?.setAttribute('value', n === 0 ? 'IGNITION' : `T-00:00:${pad(n)}`);
    host('[data-vel-host]')?.setAttribute('value', `${((hot ? 11.2 : 7.62) + Math.random() * 0.08).toFixed(2).replace('.', ',')} KM/S`);
    host('[data-boost-host]')?.setAttribute('value', `NITRO ${Math.round((hot ? 512 : 338) + Math.random() * 6)} %`);
  }, 700);

  for (const card of cards) {
    const price = card.querySelector('[data-count]');
    const target = +price.dataset.count;
    let shown = 0;
    setInterval(() => {
      if (!card.classList.contains('is-in') || shown >= target) return;
      shown = Math.min(target, shown + Math.ceil(target / 24));
      price.textContent = fmt(Math.round(shown / 10) * 10);
    }, 40);
  }

  const clock = document.querySelector('[data-clock]');
  const t0 = performance.now();
  setInterval(() => {
    const s = (performance.now() - t0) / 1000;
    clock.textContent = `T+ ${pad(s / 3600)}:${pad((s / 60) % 60)}:${pad(s % 60)}`;
  }, 1000);

  /* Panneau LAB */
  document.querySelector('.lab-panel').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const pressed = btn.getAttribute('aria-pressed') !== 'true';
    if (btn.dataset.toggle === 'glow') {
      btn.setAttribute('aria-pressed', String(pressed));
      rockets.forEach((r) => (pressed ? r.removeAttribute('glow') : r.setAttribute('glow', 'off')));
      window.PerfHUD?.set('glow', pressed ? 'on' : 'off');
    } else if (btn.dataset.toggle === 'anim') {
      btn.setAttribute('aria-pressed', String(pressed));
      rockets.forEach((r) => (pressed ? r.removeAttribute('paused') : r.setAttribute('paused', '')));
      document.documentElement.classList.toggle('no-anim', !pressed);
    } else if (btn.dataset.action === 'replay') {
      // Re-créer l'élément rejoue son intro : la démonstration du cycle de vie d'un Web Component
      rockets.forEach((r) => {
        const clone = r.cloneNode(true);
        r.replaceWith(clone);
      });
      location.reload();
    }
  });

  /* Emplacement Spline (inactif tant qu'aucune URL n'est fournie) */
  const splineHost = document.getElementById('spline-host');
  if (SPLINE_URL) {
    const viewer = document.createElement('spline-viewer');
    viewer.setAttribute('url', SPLINE_URL);
    splineHost.replaceChildren(viewer);
    const s = document.createElement('script');
    s.type = 'module';
    s.src = 'https://unpkg.com/@splinetool/viewer@2.0.55/build/spline-viewer.js';
    document.head.append(s);
  }

  window.PerfHUD?.set('composants', rockets.length);
  window.PerfHUD?.set('glow', 'on');

  window.__lab = {
    boostAll: (v) => cards.forEach((c) => {
      c.classList.toggle('is-active', v);
      const el = c.querySelector('wire-rocket');
      if (el) el.boost = v;
    }),
    setGlow: (v) => rockets.forEach((r) => (v ? r.removeAttribute('glow') : r.setAttribute('glow', 'off'))),
  };
})();
