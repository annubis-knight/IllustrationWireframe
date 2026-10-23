#!/usr/bin/env node
/**
 * Banc du test-layout : ce qu'on ne peut pas vérifier à l'œil sur 21 sections.
 *
 *   1. la page se charge avec **0 SVG monté** (règle de la page) ;
 *   2. chaque layout change bien d'offre avec **son** sélecteur ;
 *   3. éteindre tout libère tout (aucune timeline GSAP ne survit) ;
 *   4. aucun contrôle n'est **inatteignable** et rien ne déborde, de 390 à 1920 px,
 *      direction artistique éteinte puis allumée.
 *
 * Un contrôle n'est signalé que s'il est couvert en haut **et** en bas de section :
 * couvert d'un seul côté, c'est un bloc plus haut que l'écran, qu'un coup de
 * défilement dégage — pas un bouton hors d'atteinte.
 *
 * Usage : npm run check:layouts
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.PORT || '4620';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const require = createRequire(resolve(ROOT, 'package.json'));
const { chromium } = await import(pathToFileURL(require.resolve('playwright-core')).href)
  .then((m) => m.default ?? m);

const KEYS = ['split', 'hero', 'immersive', 'datasheet', 'stack', 'throttle',
  'cockpit', 'stencil', 'shutters', 'porthole', 'diorama',
  'banner', 'aside', 'onbg', 'overlap', 'rows',
  'compare', 'tabs', 'scrolly', 'sticky', 'config'];
const WIDTHS = [390, 768, 1280, 1920];

const server = spawn(process.execPath, [resolve(ROOT, 'tools/serve.mjs')], {
  env: { ...process.env, PORT }, stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 800));
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const url = `http://localhost:${PORT}/test-layout/index.html`;
let failed = false;
const say = (ok, line) => { console.log(`${ok ? '✔' : '✖'} ${line}`); if (!ok) failed = true; };

/* ── Sélecteurs, veille, extinction ───────────────────────────────────────── */
{
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, colorScheme: 'dark' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message.slice(0, 90)));
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 90)));
  await page.goto(url, { waitUntil: 'networkidle' });
  await new Promise((r) => setTimeout(r, 700));

  const idle = await page.evaluate(() => ({
    sections: document.querySelectorAll('[data-layout]').length,
    svgs: document.querySelectorAll('.lab-section svg').length,
  }));
  say(idle.sections === KEYS.length, `${idle.sections} sections attendues : ${KEYS.length}`);
  say(idle.svgs === 0, `au chargement : ${idle.svgs} SVG monté(s), attendu 0`);

  const ko = [];
  for (const k of KEYS) {
    const sel = `[data-layout="${k}"]`;
    await page.$eval(`${sel} [data-power]`, (el) => el.click());
    await new Promise((r) => setTimeout(r, 1700));
    await page.$eval(`${sel} .lab-section__stage`, (el) => el.scrollIntoView({ block: 'start' }));
    await new Promise((r) => setTimeout(r, 350));
    const before = await page.$eval(sel, (el) => el.querySelector('[data-tier]')?.dataset.tier);
    const picks = await page.$$eval(`${sel} [data-pick]`, (els) => els.map((e) => e.dataset.pick));
    const next = picks.find((p) => p !== before);
    if (next) {
      await page.$eval(`${sel} [data-pick="${next}"]`, (el) => el.click());
    } else if (k === 'scrolly') {
      // Son sélecteur est le défilement : on descend jusqu'au dernier étage
      await page.$eval(`${sel} [data-step="nitro"]`, (el) => el.scrollIntoView({ block: 'center' }));
    } else {
      await page.selectOption(`${sel} [data-plan]`, 'starter').catch(() => {});
    }
    await new Promise((r) => setTimeout(r, 1200));
    const after = await page.$eval(sel, (el) => el.querySelector('[data-tier]')?.dataset.tier);
    if (before === after) ko.push(k);
  }
  say(!ko.length, `sélecteurs : ${KEYS.length - ko.length}/${KEYS.length}${ko.length ? ` — KO : ${ko.join(', ')}` : ''}`);

  await page.$eval('[data-all-off]', (el) => el.click());
  await new Promise((r) => setTimeout(r, 800));
  const off = await page.evaluate(() => ({
    live: document.querySelectorAll('.is-live').length,
    svgs: document.querySelectorAll('.lab-section svg').length,
    tweens: window.gsap.globalTimeline.getChildren().length,
  }));
  say(!off.live && !off.svgs && !off.tweens, `après extinction : ${JSON.stringify(off)}`);
  say(!errs.length, `erreurs console : ${errs.length ? errs[0] : 'aucune'}`);
  await ctx.close();
}

/* ── Contrôles atteignables et débordement ────────────────────────────────── */
for (const art of [false, true]) {
  for (const w of WIDTHS) {
    const ctx = await browser.newContext({
      viewport: { width: w, height: 900 }, colorScheme: 'dark',
      isMobile: w < 700, hasTouch: w < 1024,
    });
    if (art) await ctx.addInitScript(() => { try { localStorage.setItem('lab-art', 'propulsite'); } catch {} });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.$$eval('[data-power]', (els) => els.forEach((e) => e.click()));
    await new Promise((r) => setTimeout(r, 4200));

    const bad = []; const haut = [];
    for (const k of KEYS) {
      for (const where of ['start', 'end']) {
        await page.$eval(`[data-layout="${k}"] .lab-section__stage`, (el, p) => el.scrollIntoView({ block: p }), where);
        await new Promise((r) => setTimeout(r, 150));
        const hits = await page.evaluate((key) => {
          const out = [];
          for (const el of document.querySelectorAll(`[data-layout="${key}"] :is(button, a, select, input)`)) {
            const r = el.getBoundingClientRect();
            if (!r.width || r.top > innerHeight || r.bottom < 0) continue;
            const t = document.elementFromPoint(
              Math.round(r.x + r.width / 2),
              Math.round(Math.max(2, Math.min(innerHeight - 2, r.y + r.height / 2))),
            );
            if (t && !el.contains(t) && !t.contains(el)) {
              out.push(`${key}:${(el.textContent.trim() || el.ariaLabel || el.tagName).slice(0, 16)}`);
            }
          }
          return out;
        }, k);
        if (where === 'start') haut.push(...hits);
        else bad.push(...hits.filter((h) => haut.includes(h)));
      }
    }
    const over = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    const uniq = [...new Set(bad)];
    say(!over && !uniq.length,
      `DA ${art ? 'on ' : 'off'} · ${String(w).padStart(4)} px : ${over ? 'DÉBORDE ' : ''}${uniq.length ? uniq.slice(0, 3).join(' | ') : 'rien à signaler'}`);
    await ctx.close();
  }
}

await browser.close();
server.kill();
console.log(failed ? '\n✖ Le banc de layouts a trouvé quelque chose' : '\n✔ Banc de layouts : tout est en ordre');
process.exit(failed ? 1 : 0);
