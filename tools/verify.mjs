#!/usr/bin/env node
/**
 * Filet de sécurité du lab : régénère ce qui est généré, puis ouvre chaque démo et vérifie
 * qu'elle s'affiche sans erreur, avec une image qui bouge.
 *
 * Usage : npm run verify
 * Sortie : code 1 si une démo est cassée (utilisable en pre-commit ou en CI).
 */
import { execFileSync } from 'node:child_process';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4618;
const BASE = `http://localhost:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BROWSERS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
];

/** Chaque démo : son entrée + un contrôle propre à sa technologie. */
const CHECKS = [
  {
    id: '01-svg-gsap',
    entry: '01-svg-gsap/index.html',
    check: () => {
      const paths = document.querySelectorAll('svg.illu path').length;
      return paths > 100 ? null : `seulement ${paths} tracés SVG`;
    },
  },
  {
    id: '02-threejs-r3f',
    entry: '02-threejs-r3f/dist/index.html',
    check: () => {
      const c = document.getElementById('stage');
      if (!c) return 'canvas WebGL absent';
      return c.getContext('webgl2') || c.getContext('webgl') ? null : 'contexte WebGL indisponible';
    },
  },
  {
    id: '03-canvas-glsl',
    entry: '03-canvas-glsl/index.html',
    check: () => (document.querySelectorAll('canvas.wire').length === 3 ? null : 'canvas manquants'),
  },
  {
    id: 'test-layout',
    entry: 'test-layout/index.html',
    check: () => {
      const sections = document.querySelectorAll('[data-layout]').length;
      if (sections < 5) return `seulement ${sections} layouts`;
      // L'invariant de cette page : rien n'est monte tant qu'on n'a pas clique
      if (document.querySelectorAll('.lab-section svg').length) return 'des visuels sont montes alors que tout doit etre en veille';
      const first = document.querySelector('[data-layout] [data-power]');
      first.click();
      return null;
    },
  },
  {
    id: '04-spline-web',
    entry: '04-spline-web/index.html',
    check: () => {
      if (!customElements.get('wire-rocket')) return 'élément <wire-rocket> non enregistré';
      const el = document.querySelector('wire-rocket');
      return el?.shadowRoot?.querySelector('canvas') ? null : 'Shadow DOM vide';
    },
  },
];

/** Une image animée : le canvas / SVG change entre deux instants. */
const MOVING = () => window.PerfHUD?.stats()?.fpsAvg ?? 0;

const steps = [];
const fail = (msg) => {
  steps.push(`✖ ${msg}`);
  return false;
};
const ok = (msg) => {
  steps.push(`✔ ${msg}`);
  return true;
};

let healthy = true;

/* 1. Ré-générer les artefacts */
try {
  execFileSync(process.execPath, [resolve(ROOT, '01-svg-gsap/tools/generate-svg.mjs')], { stdio: 'pipe' });
  ok('01 — SVG régénérés');
} catch (e) {
  healthy = fail(`01 — générateur SVG : ${e.message.split('\n')[0]}`);
}
try {
  execFileSync(process.execPath, [resolve(ROOT, '04-spline-web/tools/bundle.mjs')], { stdio: 'pipe' });
  ok('04 — Web Component assemblé');
} catch (e) {
  healthy = fail(`04 — bundle : ${e.message.split('\n')[0]}`);
}
if (!existsSync(resolve(ROOT, '02-threejs-r3f/dist/index.html'))) {
  healthy = fail('02 — dist/ absent (lancer npm run build:02)');
}

/* 2. Charger chaque démo */
const executablePath = BROWSERS.find((p) => existsSync(p));
if (!executablePath) {
  console.error('Chrome ou Edge introuvable — vérification navigateur ignorée.');
  process.exit(healthy ? 0 : 1);
}

const server = spawn(process.execPath, [resolve(ROOT, 'tools/serve.mjs')], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
const browser = await chromium.launch({ executablePath, headless: true, args: ['--hide-scrollbars'] });
try {
  await sleep(700);
  for (const demo of CHECKS) {
    if (!existsSync(resolve(ROOT, demo.entry))) {
      healthy = fail(`${demo.id} — page absente`);
      continue;
    }
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    try {
      await page.goto(`${BASE}/${demo.entry}`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.evaluate(() => document.querySelector('.offers__grid')?.scrollIntoView({ block: 'center' }));
      await sleep(3000);
      const problem = await page.evaluate(demo.check);
      const fps = await page.evaluate(MOVING);
      if (errors.length) healthy = fail(`${demo.id} — ${errors.length} erreur(s) : ${errors[0].slice(0, 90)}`);
      else if (problem) healthy = fail(`${demo.id} — ${problem}`);
      else if (fps < 10) healthy = fail(`${demo.id} — image figée (${fps} fps)`);
      else ok(`${demo.id} — ${Math.round(fps)} fps, 0 erreur`);
    } catch (e) {
      healthy = fail(`${demo.id} — ${e.message.split('\n')[0]}`);
    }
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}

console.log('\n' + steps.join('\n'));
console.log(healthy ? '\n✔ Lab opérationnel\n' : '\n✖ Au moins une démo est cassée\n');
process.exit(healthy ? 0 : 1);
