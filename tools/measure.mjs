#!/usr/bin/env node
/**
 * Banc de mesure commun aux 4 démos du lab.
 *
 * Pour chaque démo : poids transféré (par type de ressource), erreurs console, capture
 * `preview.png`, et FPS relevés par _shared/perf-hud.js dans 4 situations :
 *   repos · boost (survol simulé) · CPU ralenti ×4 (≈ mobile milieu de gamme) · sans glow.
 *
 * Utilise Chrome ou Edge déjà installés via playwright-core (aucun navigateur téléchargé).
 * NB : puppeteer-core 25 perdait la page au bout de 5-12 s avec Chrome 153 sous Windows.
 * Résultats : tools/results.json + _shared/results.js (lu par le dashboard, compatible file://).
 *
 * Usage : npm run measure                 → toutes les démos disponibles
 *         npm run measure -- 01-svg-gsap  → une seule
 *
 * ⚠ Mesures headless : ordre de grandeur et comparaison relative entre démos, pas une vérité
 *   absolue. Le renderer GPU utilisé est reporté dans les résultats.
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4617;
const BASE = `http://localhost:${PORT}`;

const DEMOS = [
  { id: '01-svg-gsap', entry: '01-svg-gsap/index.html' },
  { id: '02-threejs-r3f', entry: '02-threejs-r3f/dist/index.html' },
  { id: '03-canvas-glsl', entry: '03-canvas-glsl/index.html' },
  { id: '04-spline-web', entry: '04-spline-web/index.html' },
];

const BROWSERS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
];

const VIEWPORT = { width: 1440, height: 1000 };
const SETTLE_MS = 4000; // laisse l'intro se jouer
const SAMPLE_MS = 4000; // fenêtre de mesure FPS
const RUNS = 3; // relevés par scénario → médiane (la charge de la machine fait varier du simple au double)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(BASE + '/'); // toute réponse HTTP (même 404) = serveur prêt
      return;
    } catch { /* pas encore prêt */ }
    await sleep(100);
  }
  throw new Error('Serveur statique injoignable');
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

/** RUNS relevés successifs ; on garde la médiane de chaque indicateur (+ la dispersion). */
async function sampleFps(page) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    await page.evaluate(() => window.PerfHUD?.reset());
    await sleep(SAMPLE_MS);
    const s = await page.evaluate(() => window.PerfHUD?.stats() ?? null);
    if (!s) return null;
    runs.push(s);
  }
  return {
    avg: median(runs.map((r) => r.fpsAvg)),
    low1: median(runs.map((r) => r.fpsLow1)),
    p95ms: median(runs.map((r) => r.frameMsP95)),
    spread: `${Math.min(...runs.map((r) => r.fpsAvg))}–${Math.max(...runs.map((r) => r.fpsAvg))}`,
    extras: runs[0].extras,
  };
}

/** Poids transféré par type, via Resource Timing (navigateur neuf à chaque démo → cache vide). */
function collectBytes() {
  const kind = (e) => {
    const ext = new URL(e.name).pathname.split('.').pop().toLowerCase();
    if (['woff2', 'woff', 'ttf', 'otf'].includes(ext)) return 'font';
    if (['glb', 'gltf', 'splinecode', 'bin', 'hdr', 'ktx2', 'wasm'].includes(ext)) return '3d/wasm';
    if (['png', 'jpg', 'jpeg', 'webp', 'avif', 'svg'].includes(ext)) return 'image';
    if (ext === 'css' || e.initiatorType === 'link') return 'css';
    if (['js', 'mjs'].includes(ext) || e.initiatorType === 'script') return 'script';
    return e.initiatorType || 'other';
  };
  const nav = performance.getEntriesByType('navigation')[0];
  const out = { document: nav.transferSize || nav.encodedBodySize };
  for (const e of performance.getEntriesByType('resource')) {
    const k = kind(e);
    out[k] = (out[k] ?? 0) + (e.transferSize || e.encodedBodySize || 0);
  }
  return out;
}

async function measure(executablePath, demo) {
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--hide-scrollbars'] });
  try {
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);

    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('crash', () => errors.push('crash du renderer'));

    const t0 = Date.now();
    await page.goto(`${BASE}/${demo.entry}`, { waitUntil: 'networkidle', timeout: 60000 });
    const loadMs = Date.now() - t0;
    await page.evaluate(() => document.fonts?.ready.then(() => true));
    await page.evaluate(() => document.querySelector('.offers__grid, [data-lab-stage]')?.scrollIntoView({ block: 'center' }));
    await sleep(SETTLE_MS);

    const bytes = await page.evaluate(collectBytes);
    const gpu = await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl');
      const ext = gl?.getExtension('WEBGL_debug_renderer_info');
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'inconnu';
    });

    const fps = {};
    fps.repos = await sampleFps(page);

    await page.evaluate(() => window.__lab?.boostAll?.(true));
    await sleep(800);
    fps.boost = await sampleFps(page);
    await page.evaluate(() => window.__lab?.boostAll?.(false));

    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await sleep(500);
    fps.cpu4x = await sampleFps(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });

    if (await page.evaluate(() => typeof window.__lab?.setGlow === 'function')) {
      await page.evaluate(() => window.__lab.setGlow(false));
      await sleep(500);
      fps.sansGlow = await sampleFps(page);
      await page.evaluate(() => window.__lab.setGlow(true));
    }

    await page.evaluate(() => scrollTo(0, 0));
    await sleep(800);
    await page.screenshot({ path: resolve(ROOT, demo.id, 'preview.png'), fullPage: true });

    const kb = (n) => +(n / 1024).toFixed(1);
    return {
      id: demo.id,
      date: new Date().toISOString(),
      gpu,
      loadMs,
      totalKB: kb(Object.values(bytes).reduce((s, v) => s + v, 0)),
      byTypeKB: Object.fromEntries(Object.entries(bytes).map(([k, v]) => [k, kb(v)])),
      fps: Object.fromEntries(Object.entries(fps).map(([k, s]) => [k, s && { avg: s.avg, low1: s.low1, p95ms: s.p95ms, spread: s.spread }])),
      extras: fps.repos?.extras ?? {},
      errors,
    };
  } finally {
    await browser.close();
  }
}

/* ── Main ── */
const only = process.argv.slice(2);
const demos = DEMOS.filter((d) => (!only.length || only.includes(d.id)) && existsSync(resolve(ROOT, d.entry)));
if (!demos.length) {
  console.error('Aucune démo disponible à mesurer.');
  process.exit(1);
}

const executablePath = BROWSERS.find((p) => existsSync(p));
if (!executablePath) {
  console.error('Chrome ou Edge introuvable.');
  process.exit(1);
}

const server = spawn(process.execPath, [resolve(ROOT, 'tools/serve.mjs')], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
try {
  await waitForServer();

  const resultsPath = resolve(ROOT, 'tools/results.json');
  const all = existsSync(resultsPath) ? JSON.parse(readFileSync(resultsPath, 'utf8')) : {};

  for (const demo of demos) {
    process.stdout.write(`▸ ${demo.id} … `);
    const r = await measure(executablePath, demo);
    all[demo.id] = r;
    console.log(`${r.totalKB} Ko · ${r.fps.repos?.avg ?? '?'} fps (repos) · ${r.fps.cpu4x?.avg ?? '?'} fps (CPU ×4)${r.errors.length ? ` · ⚠ ${r.errors.length} erreur(s)` : ''}`);
    r.errors.forEach((e) => console.log('   ✖', e));
  }

  writeFileSync(resultsPath, JSON.stringify(all, null, 2));
  writeFileSync(resolve(ROOT, '_shared/results.js'), `/* Généré par tools/measure.mjs — ne pas éditer à la main */\nwindow.LAB_RESULTS = ${JSON.stringify(all, null, 2)};\n`);
  console.log('\n✔ tools/results.json + _shared/results.js mis à jour');
} finally {
  server.kill();
}
