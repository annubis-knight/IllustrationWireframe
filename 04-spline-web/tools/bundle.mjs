#!/usr/bin/env node
/**
 * Assemble le Web Component en un seul fichier déposable partout (WordPress, Nuxt, HTML nu).
 *
 * Concatène le moteur et les scènes du prototype 03 avec l'élément <wire-rocket>, le tout
 * enfermé dans une IIFE : aucune variable ne fuit dans `window` (les deux globales du proto 03
 * sont réécrites vers un objet `scope` local).
 *
 * Usage : node 04-spline-web/tools/bundle.mjs  →  04-spline-web/dist/wire-rocket.js
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LAB = resolve(ROOT, '..');

const parts = [
  ['moteur filaire (partagé avec le prototype 03)', resolve(LAB, '03-canvas-glsl/js/engine.js')],
  ['scènes Starter / Booster / Nitro', resolve(LAB, '03-canvas-glsl/js/scenes.js')],
  ['élément <wire-rocket>', resolve(ROOT, 'src/wire-rocket.js')],
];

const body = parts
  .map(([title, file]) => `\n/* ── ${title} ─────────────────────────────── */\n${readFileSync(file, 'utf8')}`)
  .join('\n')
  .replaceAll('window.WIRE', 'scope.WIRE')
  .replaceAll('window.SCENES', 'scope.SCENES');

const out = `/**
 * <wire-rocket> — illustration filaire 3D animée, en un seul fichier, sans dépendance.
 * Généré par 04-spline-web/tools/bundle.mjs — ne pas éditer à la main.
 *
 *   <script src="wire-rocket.js"></script>
 *   <wire-rocket tier="booster" color="#9d8cff" label="VITESSE" value="7,66 KM/S" module="02 / 03"></wire-rocket>
 */
(() => {
  'use strict';
  const scope = {};
${body
  .split('\n')
  .map((l) => (l ? '  ' + l : l))
  .join('\n')}
})();
`;

mkdirSync(resolve(ROOT, 'dist'), { recursive: true });
writeFileSync(resolve(ROOT, 'dist/wire-rocket.js'), out);
console.log(`✔ dist/wire-rocket.js — ${(Buffer.byteLength(out) / 1024).toFixed(1)} Ko brut, ${(gzipSync(out).length / 1024).toFixed(1)} Ko gzip`);
