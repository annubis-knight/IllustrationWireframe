#!/usr/bin/env node
/**
 * Écrit le contenu des trois cartes dans les quatre démos, depuis la source unique.
 *
 * Les quatre pages montrent **la même section d'offres** rendue par quatre
 * technologies : leur contenu doit être identique au mot près, sinon la
 * comparaison ne vaut rien. Il était écrit à la main dans chaque page — donc
 * condamné à diverger. Il est désormais généré depuis `test-layout/js/offers.js`,
 * lui-même repris de `OFFRES.md`.
 *
 * Ce qui est préservé dans chaque page :
 *   · le bloc `.offer__visual` (c'est tout ce qui change d'une techno à l'autre) ;
 *   · le HTML reste **statique** : le prototype 01 doit rester lisible sans JS,
 *     c'est tout son argument. Le dérouleur est un <details> natif.
 *
 * Usage : npm run offers:build  (appelé aussi par npm run verify)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = ['01-svg-gsap', '02-threejs-r3f', '03-canvas-glsl', '04-spline-web'];

/* La source : on l'évalue telle quelle, c'est un simple script qui pose deux globales. */
const scope = { window: {} };
new Function('window', readFileSync(resolve(ROOT, 'test-layout/js/offers.js'), 'utf8'))(scope.window);
const OFFERS = scope.window.LAB_OFFERS;
const SECTION = scope.window.LAB_SECTION;

const nf = new Intl.NumberFormat('fr-FR');
const money = (n) => nf.format(n).replace(/ /g, ' ');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const item = (it) => `<li class="oitem oitem--${it.kind}"><i aria-hidden="true"></i>`
  + `<span><b>${esc(it.name)}</b>${it.benefit ? ` : ${esc(it.benefit)}` : ''}</span></li>`;

/** Le corps d'une carte : l'anatomie d'OFFRES.md, partie 1. */
function body(o) {
  const level = o.level * 4;
  const shown = o.items.slice(0, o.visible);
  const rest = o.items.slice(o.visible);
  const lines = [
    `<div class="offer__body">`,
    `  <p class="offer__stage">${esc(o.stageLong)}</p>`,
    `  <h2 id="${o.tier}-name" class="offer__name">${esc(o.name)}</h2>`,
    `  <p class="offer__promise">${esc(o.pitch)}${o.pitchTail ? ` <b>${esc(o.pitchTail)}</b>` : ''}</p>`,
    `  <div class="offer__power" data-level="${level}" role="img" aria-label="Puissance : niveau ${o.level} sur 3">${'<i></i>'.repeat(12)}</div>`,
  ];
  if (o.count) {
    lines.push(`  <p class="ocount"><b>${o.count.n}</b> ${esc(o.count.label)}`
      + `${o.count.note ? `<span>${esc(o.count.note)}</span>` : ''}</p>`);
  } else if (o.alacarte) {
    lines.push(`  <p class="ocount ocount--alt">${esc(o.alacarte)}</p>`);
  }
  if (o.included) {
    lines.push(`  <div class="oincl">`,
      `    <p class="oincl__head">${esc(o.included.title)} <span>${esc(o.included.value)}</span></p>`,
      `    <p class="oincl__list">${o.included.items.map(esc).join(' · ')}</p>`,
      `  </div>`);
  }
  if (o.chips) {
    lines.push(`  <ul class="chips chips--left">${o.chips.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>`);
  }
  lines.push(`  <ul class="oitems">${shown.map(item).join('')}</ul>`);
  if (rest.length) {
    lines.push(`  <details class="omore">`,
      `    <summary>${esc(o.more || `Voir les ${rest.length} autres éléments`)}</summary>`,
      `    <ul class="oitems">${rest.map(item).join('')}</ul>`,
      `  </details>`);
  }
  /* Le bloc prix garde son balisage d'origine : `data-count` sert au compteur
     animé du prototype 01, `offer__from` / `offer__cur` à la composition. */
  lines.push(`  <p class="offer__price">`
    + `${o.priceFrom ? `<span class="offer__from">${esc(o.priceFrom)}</span> ` : ''}`
    + `<b data-count="${o.price}">${money(o.price)}</b> <span class="offer__cur">€</span>`
    + `${o.priceNote ? ` <span class="offer__note">${esc(o.priceNote)}</span>` : ''}</p>`);
  if (o.guarantee) lines.push(`  <p class="obuy__warranty">${esc(o.guarantee)}</p>`);
  const href = /audit/i.test(o.cta) ? '#audit' : '#contact';
  lines.push(`  <a class="offer__cta" href="${href}">${esc(o.cta)} `
    + `<svg aria-hidden="true" viewBox="0 0 16 16"><path d="M2 8h11M9 4l4 4-4 4"/></svg></a>`);
  if (o.ctaNote) lines.push(`  <p class="obuy__sub">${esc(o.ctaNote)}</p>`);
  if (o.link) lines.push(`  <a class="obuy__link" href="#offre">${esc(o.link)}</a>`);
  lines.push(`</div>`);
  return lines.join('\n');
}

/** Le pied de section : rareté honnête et mention de TVA. */
const foot = () => [
  `<footer class="offers__foot">`,
  `  <p><b>${esc(SECTION.scarcity)}</b> ${esc(SECTION.nextSlot)}</p>`,
  `  <p><a class="obuy__link" href="#offres">${esc(SECTION.compare)}</a></p>`,
  `  <p class="offers__vat">${esc(SECTION.vat)}</p>`,
  `</footer>`,
].join('\n');

/** Remplace tout ce qui est entre deux marqueurs, marqueurs compris. */
function inject(html, key, content) {
  const open = `<!-- @offer:${key} -->`;
  const close = `<!-- /@offer:${key} -->`;
  const a = html.indexOf(open);
  const b = html.indexOf(close);
  if (a === -1 || b === -1) throw new Error(`marqueurs @offer:${key} absents`);
  return html.slice(0, a) + open + '\n' + content + '\n' + close + html.slice(b + close.length);
}

let touched = 0;
for (const page of PAGES) {
  const file = resolve(ROOT, page, 'index.html');
  let html = readFileSync(file, 'utf8');
  for (const o of OFFERS) html = inject(html, o.tier, body(o));
  html = inject(html, 'foot', foot());
  writeFileSync(file, html);
  touched++;
  console.log(`✔ ${page}/index.html — 3 cartes + pied de section`);
}
console.log(`\n${touched} pages alimentées depuis test-layout/js/offers.js`);
