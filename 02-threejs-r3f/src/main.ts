/**
 * Prototype 02 — Three.js en temps réel.
 *
 * Un seul contexte WebGL pour les 3 cartes : un canvas plein écran en `mix-blend-mode: screen`,
 * et à chaque frame on dessine chaque scène dans le rectangle de sa carte (viewport + scissor).
 * Passe de bloom unique en post-traitement → le néon est calculé par le GPU, pas par des filtres SVG.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Pass } from 'three/addons/postprocessing/Pass.js';
import { BUILDERS, type SceneState, type Tier, type View } from './scenes';
import '../../_shared/offers.css';
import './style.css';
import '../../_shared/dock.js';
import '../../_shared/perf-hud.js';
import '../../_shared/theme.js';
import '../../_shared/layers.js';
import '../../_shared/accents.js';

const COLORS: Record<Tier, number> = { starter: 0x3ff0ff, booster: 0x9d8cff, nitro: 0xff4fd8 };
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const nf = new Intl.NumberFormat('fr-FR');
const fmt = (n: number) => nf.format(n).replace(/ /g, ' ');
const pad = (n: number, l = 2) => String(Math.floor(n)).padStart(l, '0');

/* ── Rendu ──────────────────────────────────────────────────────────────── */
const canvas = document.getElementById('stage') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x000000, 1);
const resolution = new THREE.Vector2();

interface CardView {
  el: HTMLElement;
  card: HTMLElement;
  view: View;
  hover: number;
  hoverTarget: number;
  pointer: THREE.Vector2;
  pointerTarget: THREE.Vector2;
  intro: number;
  introTarget: number;
  callout: SVGGElement | null;
  visible: boolean;
}

const cards: CardView[] = [...document.querySelectorAll<HTMLElement>('.offer')].map((card) => {
  const tier = card.dataset.tier as Tier;
  const el = card.querySelector<HTMLElement>('.offer__visual')!;
  return {
    el,
    card,
    view: BUILDERS[tier](resolution, COLORS[tier]),
    hover: 0,
    hoverTarget: 0,
    pointer: new THREE.Vector2(),
    pointerTarget: new THREE.Vector2(),
    intro: reduced ? 1 : 0,
    introTarget: reduced ? 1 : 0,
    callout: card.querySelector<SVGGElement>('[data-callout]'),
    visible: true,
  };
});

/** Passe de rendu multi-vues : une scène par carte, découpée au ciseau dans le canvas. */
class ViewsPass extends Pass {
  render(r: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget) {
    r.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    r.setScissorTest(false);
    r.clear();
    r.setScissorTest(true);
    const h = canvas.clientHeight;
    for (const c of cards) {
      if (!c.visible) continue;
      const rect = c.el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > h || rect.width < 2) continue;
      const y = h - rect.bottom;
      r.setViewport(rect.left, y, rect.width, rect.height);
      r.setScissor(rect.left, y, rect.width, rect.height);
      c.view.camera.aspect = rect.width / rect.height;
      c.view.camera.updateProjectionMatrix();
      r.render(c.view.scene, c.view.camera);
    }
    // Indispensable : les passes suivantes (bloom, output) dessinent un quad plein écran,
    // qui serait sinon écrasé dans le viewport de la dernière carte.
    r.setScissorTest(false);
    r.setViewport(0, 0, canvas.clientWidth, canvas.clientHeight);
    r.setScissor(0, 0, canvas.clientWidth, canvas.clientHeight);
  }
}

const composer = new EffectComposer(renderer);
const viewsPass = new ViewsPass();
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.42, 0.45, 0.3);
const output = new OutputPass();
composer.addPass(viewsPass);
composer.addPass(bloom);
composer.addPass(output);

/* ── Thème ──────────────────────────────────────────────────────────────────
 * Sombre : lignes néon sur noir, canvas en `screen`, bloom actif.
 * Clair  : encre foncée sur blanc, canvas en `multiply`, bloom coupé (il délaverait tout).
 * Les couleurs viennent des jetons CSS, comme pour les autres démos.
 * ─────────────────────────────────────────────────────────────────────────── */
let light = false;
let bloomWanted = true;

function applyTheme() {
  const t = document.documentElement.dataset.theme;
  light = t ? t === 'light' : matchMedia('(prefers-color-scheme: light)').matches;
  const token = (n: string, fb: string) => window.LabTheme?.token(n, fb) || fb;
  const hot = new THREE.Color(token('--hot', '#ffffff'));
  const bg = new THREE.Color(light ? 0xffffff : 0x000000);

  canvas.style.mixBlendMode = light ? 'multiply' : 'screen';
  renderer.setClearColor(bg, 1);
  bloom.enabled = bloomWanted && !light;

  for (const c of cards) {
    const accent = new THREE.Color(token(`--c-${c.card.dataset.tier}`, '#3ff0ff'));
    c.view.scene.traverse((o: any) => {
      const mats: THREE.Material[] = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of mats) {
        const role = (m as any).userData?.role;
        if (role === 'accent' || role === 'hot') {
          (m as any).color.copy(role === 'hot' ? hot : accent);
          (m as any).blending = light || !(m as any).userData.additive ? THREE.NormalBlending : THREE.AdditiveBlending;
        } else if (role === 'plume') {
          const u = (m as THREE.ShaderMaterial).uniforms;
          u.uColor.value.copy(accent);
          u.uDark.value = light ? 0 : 1;
          (m as any).blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
        } else if (role === 'bg') {
          (m as any).color.copy(bg);
        }
        m.needsUpdate = true;
      }
    });
  }
}
addEventListener('themechange', applyTheme);

/* ── Calques : on masque les objets marques, sans toucher a leurs enfants ── */
function applyLayers(layers: Record<string, boolean>) {
  for (const c of cards) {
    c.view.scene.traverse((o) => {
      const layer = o.userData?.layer;
      if (layer) o.visible = layers[layer] !== false;
    });
  }
}
addEventListener('layerchange', (e) => applyLayers((e as CustomEvent).detail.layers));

function resize() {
  const w = innerWidth;
  const h = innerHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  bloom.setSize(w, h);
  renderer.getDrawingBufferSize(resolution);
  for (const c of cards) for (const m of c.view.materials) (m as any).resolution?.set(resolution.x, resolution.y);
}
addEventListener('resize', resize);
resize();
applyTheme();
applyLayers(window.LabLayers?.state() ?? {});

/* ── Étiquette ancrée à un point 3D (la contrepartie du WebGL : le texte reste en DOM) ── */
const ndc = new THREE.Vector3();
function updateCallout(c: CardView) {
  if (!c.callout || !c.view.anchor) return;
  ndc.setFromMatrixPosition(c.view.anchor.matrixWorld).project(c.view.camera);
  const x = (ndc.x * 0.5 + 0.5) * 400;
  const y = (-ndc.y * 0.5 + 0.5) * 420;
  const left = x > 200;
  const ex = left ? x - 24 : x + 24;
  const ey = y - 18;
  const hx = left ? ex - 44 : ex + 44;
  c.callout.querySelector('.c-dot')!.setAttribute('cx', String(x));
  c.callout.querySelector('.c-dot')!.setAttribute('cy', String(y));
  c.callout.querySelector('.c-lead')!.setAttribute('d', `M${x} ${y} ${ex} ${ey} ${hx} ${ey}`);
  for (const [sel, dy] of [['.c-txt', -4], ['.c-sub', 10]] as const) {
    const t = c.callout.querySelector(sel)!;
    t.setAttribute('x', String(left ? ex - 1 : ex + 1));
    t.setAttribute('y', String(ey + dy));
    t.setAttribute('text-anchor', left ? 'end' : 'start');
  }
}

/* ── Boucle ─────────────────────────────────────────────────────────────── */
let t = 0;
let running = true;
let last = performance.now();
const state: SceneState = { time: 0, hover: 0, intro: 1, pointer: new THREE.Vector2() };

function frame(now: number) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (running) t += dt;

  let hoverMax = 0;
  for (const c of cards) {
    c.hover = lerp(c.hover, c.hoverTarget, 0.08);
    c.intro = lerp(c.intro, c.introTarget, 0.045);
    c.pointer.lerp(c.pointerTarget, 0.07);
    hoverMax = Math.max(hoverMax, c.hover);
    state.time = t;
    state.hover = c.hover;
    state.intro = c.intro;
    state.pointer.copy(c.pointer);
    c.view.update(state);
    for (const m of c.view.materials) (m as THREE.Material).opacity = ((m as any).__base ?? 1) * c.intro;
    updateCallout(c);
  }
  bloom.strength = 0.4 + hoverMax * 0.3;
  composer.render();
  window.PerfHUD?.set('draw calls', renderer.info.render.calls);
}

// Opacité de base mémorisée avant que l'intro ne la pilote
for (const c of cards) for (const m of c.view.materials) ((m as any).__base = (m as THREE.Material).opacity);

requestAnimationFrame((now) => {
  last = now;
  frame(now);
});

/* ── Interactions ───────────────────────────────────────────────────────── */
for (const c of cards) {
  const on = () => {
    c.card.classList.add('is-active');
    c.hoverTarget = 1;
  };
  const off = () => {
    c.card.classList.remove('is-active');
    c.hoverTarget = 0;
  };
  c.card.addEventListener('pointerenter', on);
  c.card.addEventListener('pointerleave', () => {
    off();
    c.pointerTarget.set(0, 0);
  });
  c.card.addEventListener('focusin', on);
  c.card.addEventListener('focusout', (e) => !c.card.contains(e.relatedTarget as Node) && off());
  if (finePointer && !reduced) {
    c.card.addEventListener('pointermove', (e) => {
      const r = c.el.getBoundingClientRect();
      c.pointerTarget.set(
        THREE.MathUtils.clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1),
        THREE.MathUtils.clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1),
      );
    });
  }
}

// Intro + mise en pause hors écran
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    const c = cards.find((x) => x.card === e.target)!;
    c.visible = e.isIntersecting;
    if (e.isIntersecting) {
      c.card.classList.add('is-in');
      c.introTarget = 1;
    }
  }
}, { threshold: 0.15 });
cards.forEach((c) => io.observe(c.card));
if (reduced) cards.forEach((c) => c.card.classList.add('is-in'));

/* Compteurs de la carte (prix, compte à rebours, télémétrie) */
for (const c of cards) {
  const price = c.card.querySelector<HTMLElement>('[data-count]')!;
  const target = +price.dataset.count!;
  let shown = 0;
  setInterval(() => {
    if (!c.card.classList.contains('is-in') || shown >= target) return;
    shown = Math.min(target, shown + Math.ceil(target / 24));
    price.textContent = fmt(Math.round(shown / 10) * 10);
  }, 40);
}
const cd = document.querySelector('[data-countdown]');
const vel = document.querySelector('[data-vel]');
const boost = document.querySelector('[data-boost]');
let n = 10;
setInterval(() => {
  const hot = cards.some((c) => c.hoverTarget > 0.5);
  if (cd) {
    n = n <= 0 ? 10 : n - 1;
    cd.textContent = n === 0 ? 'IGNITION' : `T-00:00:${pad(n)}`;
  }
  if (vel) vel.textContent = `${((hot ? 11.2 : 7.62) + Math.random() * 0.08).toFixed(2).replace('.', ',')} KM/S`;
  if (boost) boost.textContent = `NITRO ${Math.round((hot ? 512 : 338) + Math.random() * 6)} %`;
}, 700);

const clock = document.querySelector('[data-clock]')!;
const t0 = performance.now();
setInterval(() => {
  const s = (performance.now() - t0) / 1000;
  clock.textContent = `T+ ${pad(s / 3600)}:${pad((s / 60) % 60)}:${pad(s % 60)}`;
}, 1000);

/* Panneau LAB */
document.querySelector('.lab-panel')!.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest('button');
  if (!btn) return;
  const pressed = btn.getAttribute('aria-pressed') !== 'true';
  if (btn.dataset.toggle === 'glow') {
    btn.setAttribute('aria-pressed', String(pressed));
    bloomWanted = pressed;
    bloom.enabled = pressed && !light;
    window.PerfHUD?.set('bloom', pressed ? 'on' : 'off');
  } else if (btn.dataset.toggle === 'anim') {
    btn.setAttribute('aria-pressed', String(pressed));
    running = pressed;
    document.documentElement.classList.toggle('no-anim', !pressed);
  } else if (btn.dataset.action === 'replay') {
    cards.forEach((c) => {
      c.intro = 0;
      c.introTarget = 1;
    });
  }
});

window.PerfHUD?.set('segments', cards.reduce((s, c) => s + c.view.materials.length, 0) + ' matériaux');
window.PerfHUD?.set('bloom', 'on');

window.__lab = {
  // Exposé pour tools/ : permet de vérifier ce qui est réellement visible
  scenes: () => cards.map((c) => c.view.scene),
  boostAll: (v: boolean) => cards.forEach((c) => {
    c.hoverTarget = v ? 1 : 0;
    c.card.classList.toggle('is-active', v);
  }),
  setGlow: (v: boolean) => {
    bloomWanted = v;
    bloom.enabled = v && !light;
  },
};
