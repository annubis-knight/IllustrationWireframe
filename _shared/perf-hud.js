/**
 * PerfHUD — compteur de performances commun aux 4 démos du lab (zéro dépendance).
 *
 * - FPS instantané, moyenne glissante, « 1 % low » et temps de frame p95
 * - poids transféré de la page (Resource Timing ; indisponible en file://)
 * - métriques libres poussées par chaque démo : PerfHUD.set('Paths SVG', 142)
 *
 * Touche « P » : afficher / masquer. `?perf=0` dans l'URL : masqué au chargement.
 * `window.PerfHUD.stats()` est lu par tools/measure.mjs pour le comparatif.
 */
(() => {
  'use strict';

  const MAX_SAMPLES = 1200; // ~20 s à 60 Hz
  const frameTimes = [];
  const extras = new Map();
  let last = performance.now();
  let acc = 0;
  let count = 0;
  let fpsNow = 0;

  /* ── Mesure ─────────────────────────────────────────── */
  function tick(t) {
    const dt = t - last;
    last = t;
    frameTimes.push(dt);
    if (frameTimes.length > MAX_SAMPLES) frameTimes.shift();
    acc += dt;
    count++;
    if (acc >= 500) {
      fpsNow = (count * 1000) / acc;
      acc = 0;
      count = 0;
      render();
    }
    requestAnimationFrame(tick);
  }

  function percentile(sorted, p) {
    if (!sorted.length) return 0;
    return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  }

  function stats() {
    const ft = frameTimes.slice(1); // la 1re frame inclut le temps de boot
    const sorted = [...ft].sort((a, b) => a - b);
    const mean = ft.reduce((s, x) => s + x, 0) / (ft.length || 1);
    return {
      samples: ft.length,
      fpsAvg: +(1000 / mean).toFixed(1),
      fpsLow1: +(1000 / (percentile(sorted, 0.99) || 1)).toFixed(1),
      frameMsAvg: +mean.toFixed(2),
      frameMsP95: +percentile(sorted, 0.95).toFixed(2),
      transferKB: transferKB(),
      extras: Object.fromEntries(extras),
    };
  }

  function reset() {
    frameTimes.length = 0;
  }

  function transferKB() {
    const nav = performance.getEntriesByType('navigation')[0];
    const res = performance.getEntriesByType('resource');
    const total = [nav, ...res].reduce((s, e) => s + (e ? e.transferSize || 0 : 0), 0);
    return total ? Math.round(total / 1024) : null;
  }

  /* ── Affichage ──────────────────────────────────────── */
  const el = document.createElement('aside');
  el.className = 'perf-hud';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <style>
      .perf-hud{position:fixed;top:calc(12px + env(safe-area-inset-top,0px));right:12px;z-index:9999;
        font:500 11px/1.35 ui-monospace,"JetBrains Mono",Consolas,monospace;color:#bff6ff;
        background:rgba(2,10,18,.78);border:1px solid rgba(90,230,255,.35);padding:8px 10px 6px;
        min-width:168px;backdrop-filter:blur(6px);pointer-events:none;letter-spacing:.04em}
      .perf-hud[hidden]{display:none}
      .perf-hud b{color:#fff;font-weight:700}
      .perf-hud .ph-big{font-size:20px;line-height:1}
      .perf-hud .ph-row{display:flex;justify-content:space-between;gap:12px;opacity:.85}
      .perf-hud canvas{display:block;width:100%;height:22px;margin:6px 0 4px}
      .perf-hud .ph-k{opacity:.6}
    </style>
    <div class="ph-row"><span><b class="ph-big" data-fps>--</b> FPS</span><span data-ms>-- ms</span></div>
    <canvas width="168" height="22"></canvas>
    <div data-rows></div>`;

  const $fps = el.querySelector('[data-fps]');
  const $ms = el.querySelector('[data-ms]');
  const $rows = el.querySelector('[data-rows]');
  const canvas = el.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const history = [];

  function render() {
    if (el.hidden) return;
    const s = stats();
    $fps.textContent = Math.round(fpsNow);
    $fps.style.color = fpsNow >= 55 ? '#7dffb2' : fpsNow >= 40 ? '#ffd166' : '#ff5c7a';
    $ms.textContent = `${(1000 / (fpsNow || 1)).toFixed(1)} ms`;

    history.push(fpsNow);
    if (history.length > 42) history.shift();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    history.forEach((f, i) => {
      const h = Math.max(1, Math.min(1, f / 60) * canvas.height);
      ctx.fillStyle = f >= 55 ? '#3ff0ff' : f >= 40 ? '#ffd166' : '#ff5c7a';
      ctx.fillRect(i * 4, canvas.height - h, 3, h);
    });

    const rows = [
      ['moy.', `${s.fpsAvg} fps`],
      ['1% low', `${s.fpsLow1} fps`],
      ['p95', `${s.frameMsP95} ms`],
      ['transféré', s.transferKB == null ? 'n/a' : `${s.transferKB} Ko`],
      ...extras,
    ];
    $rows.innerHTML = rows
      .map(([k, v]) => `<div class="ph-row"><span class="ph-k">${k}</span><span>${v}</span></div>`)
      .join('');
  }

  function mount() {
    el.hidden = new URLSearchParams(location.search).get('perf') === '0';
    document.body.appendChild(el);
  }

  addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'p' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      el.hidden = !el.hidden;
      render();
    }
  });

  if (document.body) mount();
  else addEventListener('DOMContentLoaded', mount, { once: true });
  requestAnimationFrame(tick);

  window.PerfHUD = {
    set(key, value) {
      extras.set(key, value);
    },
    stats,
    reset,
  };
})();
