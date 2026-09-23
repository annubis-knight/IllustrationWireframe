#!/usr/bin/env node
/**
 * Générateur des illustrations filaires « Wireframe 3D / HUD » — Starter, Booster, Nitro.
 *
 * Principe : mini moteur 3D maison (primitives révolution / sphère / treillis / polygones),
 * projection perspective, tri faces avant / arrière (lignes cachées en pointillés, convention
 * du dessin technique), simplification Ramer-Douglas-Peucker, puis export SVG 2D pur.
 * Le navigateur ne reçoit que du SVG statique : aucune 3D n'est calculée côté client.
 *
 * Sorties :
 *   - svg/<tier>.svg  → fichiers autonomes (style embarqué), ouvrables dans Figma / Illustrator
 *   - index.html      → SVG inline injectés entre <!-- @svg:<tier> --> et <!-- /@svg:<tier> -->
 *
 * Usage : node 01-svg-gsap/tools/generate-svg.mjs   (ou `npm run svg:build` à la racine du lab)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const W = 400;
const H = 420;
const TAU = Math.PI * 2;

/* ── Maths 3D ───────────────────────────────────────────────────────────── */
const v = (x = 0, y = 0, z = 0) => ({ x, y, z });
const add = (a, b) => v(a.x + b.x, a.y + b.y, a.z + b.z);
const sub = (a, b) => v(a.x - b.x, a.y - b.y, a.z - b.z);
const mul = (a, s) => v(a.x * s, a.y * s, a.z * s);
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const len = (a) => Math.hypot(a.x, a.y, a.z);
const unit = (a) => mul(a, 1 / (len(a) || 1));
const rad = (d) => (d * Math.PI) / 180;
const rotX = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return v(p.x, p.y * c - p.z * s, p.y * s + p.z * c); };
const rotY = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return v(p.x * c + p.z * s, p.y, -p.x * s + p.z * c); };
const rotZ = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return v(p.x * c - p.y * s, p.x * s + p.y * c, p.z); };
const ROT = { x: rotX, y: rotY, z: rotZ };

/** Transformation objet : échelle → rotations (ordre donné, en degrés) → translation. */
function xform({ scale = [1, 1, 1], rot = [], pos = [0, 0, 0] } = {}) {
  const [sx, sy, sz] = scale;
  const R = (p) => rot.reduce((q, [axis, deg]) => ROT[axis](q, rad(deg)), p);
  return {
    pt: (p) => add(R(v(p.x * sx, p.y * sy, p.z * sz)), v(...pos)),
    // normales : inverse-transposée d'une échelle diagonale = division
    dir: (n) => unit(R(v(n.x / sx, n.y / sy, n.z / sz))),
  };
}
const chain = (...xs) => ({
  pt: (p) => xs.reduce((q, x) => x.pt(q), p),
  dir: (n) => xs.reduce((q, x) => x.dir(q), n),
});
const ID = xform();

/** Caméra perspective. pitch > 0 = vue plongeante ; yaw = orbite autour de Y. */
function camera({ yaw = 0, pitch = 0, dist = 40, focal = 1 }) {
  const view = (p) => rotX(rotY(p, rad(-yaw)), rad(-pitch));
  const toCam = (p) => { const q = view(p); return v(q.x, q.y, q.z + dist); };
  return {
    toCam,
    project(p) {
      const q = toCam(p);
      const k = (focal * dist) / q.z;
      return [q.x * k, -q.y * k];
    },
    /** Vrai si la surface (point p, normale n) regarde la caméra. */
    faces(p, n) {
      return dot(view(n), mul(toCam(p), -1)) > 0;
    },
  };
}

/** Le rayon caméra → p traverse-t-il la sphère avant d'atteindre p ? */
function occluded(cam, p, { c, r }) {
  const P = cam.toCam(p);
  const C = cam.toCam(c);
  const L = len(P);
  const d = mul(P, 1 / L);
  const tca = dot(C, d);
  if (tca < 0) return false;
  const d2 = dot(C, C) - tca * tca;
  if (d2 > r * r) return false;
  return tca - Math.sqrt(r * r - d2) < L - 1e-6;
}

/* ── Utilitaires 2D / format ────────────────────────────────────────────── */
function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const n1 = (x) => {
  const r = Math.round(x * 10) / 10;
  return Object.is(r, -0) ? '0' : String(r);
};
const pathD = (pts) => 'M' + pts.map(([x, y]) => `${n1(x)} ${n1(y)}`).join(' ');

/** Simplification Ramer-Douglas-Peucker (tolérance en unités viewBox). */
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0];
  const [bx, by] = pts[pts.length - 1];
  const dx = bx - ax;
  const dy = by - ay;
  const L = Math.hypot(dx, dy);
  let max = 0;
  let idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i];
    const d = L < 1e-6 ? Math.hypot(px - ax, py - ay) : Math.abs(dy * px - dx * py + bx * ay - by * ax) / L;
    if (d > max) { max = d; idx = i; }
  }
  if (max <= eps) return [pts[0], pts[pts.length - 1]];
  return [...rdp(pts.slice(0, idx + 1), eps).slice(0, -1), ...rdp(pts.slice(idx), eps)];
}

/** Découpe une suite d'échantillons {p3, front} en tronçons homogènes avant / arrière. */
function splitRuns(samples, closed) {
  const n = samples.length;
  if (!n) return [];
  let seq = samples;
  if (closed) {
    const i = samples.findIndex((s, k) => s.front !== samples[(k - 1 + n) % n].front);
    if (i === -1) return [{ front: samples[0].front, pts: [...samples.map((s) => s.p3), samples[0].p3] }];
    seq = [...samples.slice(i), ...samples.slice(0, i), samples[i]];
  }
  const out = [];
  let cur = { front: seq[0].front, pts: [seq[0].p3] };
  for (let k = 1; k < seq.length; k++) {
    const s = seq[k];
    cur.pts.push(s.p3);
    if (s.front !== cur.front && k < seq.length - 1) {
      out.push(cur);
      cur = { front: s.front, pts: [s.p3] };
    }
  }
  out.push(cur);
  return out;
}

/* ── Scène : collecte des traits, cadrage, rendu ────────────────────────── */
class Scene {
  constructor(cam) {
    this.cam = cam;
    this.strokes = [];
    this.T = { s: 1, tx: 0, ty: 0 };
  }

  proj(p3) {
    return this.cam.project(p3);
  }

  /** Trait déjà projeté. g = groupe de rendu, m = clé de fusion (un seul <path> par clé). */
  add(g, pts, { m, tag } = {}) {
    if (g && pts.length > 1) this.strokes.push({ g, m, tag, pts });
  }

  seg(g, a, b, o) {
    this.add(g, [this.proj(a), this.proj(b)], o);
  }

  line(g, pts3, o) {
    this.add(g, pts3.map((p) => this.proj(p)), o);
  }

  runs(samples, { closed = false, g, gb, m, tag }) {
    for (const r of splitRuns(samples, closed)) {
      this.add(r.front ? g : gb, r.pts.map((p) => this.proj(p)), { m: m && `${m}${r.front ? '' : '~b'}`, tag });
    }
  }

  /** Cadre les traits portant ces tags dans la boîte [x, y, w, h] du viewBox. */
  fit(tags, [bx, by, bw, bh], align = 'center') {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const s of this.strokes) {
      if (!tags.includes(s.tag)) continue;
      for (const [x, y] of s.pts) {
        x0 = Math.min(x0, x); y0 = Math.min(y0, y);
        x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
    }
    const s = Math.min(bw / (x1 - x0), bh / (y1 - y0));
    this.T = {
      s,
      tx: bx + (bw - (x1 - x0) * s) / 2 - x0 * s,
      ty: align === 'bottom' ? by + bh - y1 * s : by + (bh - (y1 - y0) * s) / 2 - y0 * s,
    };
  }

  xy([x, y]) {
    return [x * this.T.s + this.T.tx, y * this.T.s + this.T.ty];
  }

  /** Point 3D → coordonnées viewBox finales. */
  at(p3) {
    return this.xy(this.proj(p3));
  }

  bbox(tags) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const s of this.strokes) {
      if (!tags.includes(s.tag)) continue;
      for (const p of s.pts) {
        const [x, y] = this.xy(p);
        x0 = Math.min(x0, x); y0 = Math.min(y0, y);
        x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
    }
    return { x0, y0, x1, y1 };
  }

  /** Rendu d'un groupe : un <path> par clé de fusion (sous-chemins concaténés). */
  paths(g, { draw = false, eps = 0.35 } = {}) {
    const buckets = new Map();
    this.strokes.forEach((s, i) => {
      if (s.g !== g) return;
      const k = s.m ?? `#${i}`;
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(s);
    });
    let out = '';
    for (const list of buckets.values()) {
      const d = list.map((s) => pathD(rdp(s.pts.map((p) => this.xy(p)), eps))).join('');
      out += `<path${draw ? ' class="draw" pathLength="1"' : ''} d="${d}"/>`;
    }
    return out;
  }
}

/* ── Primitives 3D ──────────────────────────────────────────────────────── */

/** Surface de révolution autour de Y : anneaux + méridiens + silhouette. profile = [[r, y], …] */
function lathe(sc, { profile: PR, xf = ID, seg = 72, meridians = 12, phase = 0.21, rings, g = 'front', gb = 'back', gc = 'contour', m, tag }) {
  const tan = (i) => {
    const a = PR[Math.max(0, i - 1)];
    const b = PR[Math.min(PR.length - 1, i + 1)];
    return [b[0] - a[0], b[1] - a[1]];
  };
  const at = (i, th) => {
    const [r, y] = PR[i];
    const [dr, dy] = tan(i);
    const c = Math.cos(th), s = Math.sin(th);
    const p3 = xf.pt(v(r * c, y, r * s));
    return { p3, front: sc.cam.faces(p3, xf.dir(v(c * dy, -dr, s * dy))) };
  };

  for (const i of rings ?? PR.map((_, k) => k)) {
    if (PR[i][0] < 1e-3) continue;
    const samples = Array.from({ length: seg }, (_, k) => at(i, phase + (k / seg) * TAU));
    sc.runs(samples, { closed: true, g, gb, m: m && `${m}-r`, tag });
  }
  for (let k = 0; k < meridians; k++) {
    const th = phase + (k / meridians) * TAU;
    sc.runs(PR.map((_, i) => at(i, th)), { g, gb, m: m && `${m}-m`, tag });
  }

  // Silhouette : points où la surface bascule de face avant à face arrière
  if (!gc) return;
  const a0 = sc.proj(xf.pt(v(0, PR[0][1], 0)));
  const a1 = sc.proj(xf.pt(v(0, PR[PR.length - 1][1], 0)));
  const side = (p) => -(a1[1] - a0[1]) * p[0] + (a1[0] - a0[0]) * p[1];
  const left = [], right = [];
  const N = 240;
  PR.forEach(([r, y], i) => {
    if (r < 1e-3) {
      const tip = sc.proj(xf.pt(v(0, y, 0)));
      left.push(tip);
      right.push(tip);
      return;
    }
    const hits = [];
    let prev = at(i, 0);
    for (let k = 1; k <= N; k++) {
      const cur = at(i, (k / N) * TAU);
      if (cur.front !== prev.front) hits.push(sc.proj(cur.p3));
      prev = cur;
    }
    if (hits.length === 2) {
      hits.sort((p, q) => side(p) - side(q));
      left.push(hits[0]);
      right.push(hits[1]);
    }
  });
  if (left.length > 1) {
    sc.add(gc, left, { m: m && `${m}-c`, tag });
    sc.add(gc, right, { m: m && `${m}-c`, tag });
  }
}

/** Sphère filaire (parallèles + méridiens). */
function sphere(sc, { c, r, lat = 7, lon = 12, seg = 96, tilt = ID, g, gb, m, tag }) {
  const at = (phi, th) => {
    const n = tilt.dir(v(Math.cos(phi) * Math.cos(th), Math.sin(phi), Math.cos(phi) * Math.sin(th)));
    const p3 = add(c, mul(n, r));
    return { p3, front: sc.cam.faces(p3, n) };
  };
  for (let i = 1; i <= lat; i++) {
    const phi = -Math.PI / 2 + (i / (lat + 1)) * Math.PI;
    sc.runs(Array.from({ length: seg }, (_, k) => at(phi, (k / seg) * TAU)), { closed: true, g, gb, m: m && `${m}-lat`, tag });
  }
  for (let j = 0; j < lon; j++) {
    const th = (j / lon) * TAU;
    const half = seg / 2;
    sc.runs(Array.from({ length: half + 1 }, (_, k) => at(-Math.PI / 2 + (k / half) * Math.PI, th)), { g, gb, m: m && `${m}-lon`, tag });
  }
}

/** Cercle 3D (orbite) — la partie masquée par la planète passe en « arrière ». */
function orbit(sc, { c, r, xf, seg = 180, planet, g, gb, m, tag }) {
  const samples = Array.from({ length: seg }, (_, k) => {
    const th = (k / seg) * TAU;
    const p3 = add(c, xf.pt(v(r * Math.cos(th), 0, r * Math.sin(th))));
    return { p3, front: !occluded(sc.cam, p3, planet) };
  });
  sc.runs(samples, { closed: true, g, gb, m, tag });
  return samples;
}

/**
 * Plages de progression (0→1, en longueur d'arc 2D) où l'orbite passe derrière la planète.
 * Sert à masquer le satellite animé en MotionPath : "0.41-0.58,0.93-1".
 */
function hiddenRanges(samples, sc) {
  const pts = samples.map((s) => sc.at(s.p3));
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = cum[cum.length - 1] + Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]);
  const out = [];
  let start = null;
  samples.forEach((s, i) => {
    if (!s.front && start === null) start = cum[i] / total;
    if (s.front && start !== null) { out.push(`${start.toFixed(3)}-${(cum[i] / total).toFixed(3)}`); start = null; }
  });
  if (start !== null) out.push(`${start.toFixed(3)}-1`);
  return out.join(',');
}

/** Tour en treillis (section carrée, croisillons en X sur chaque face). */
function truss(sc, { w, h, levels, xf, g = 'truss', gb = 'truss-b', m = 'truss', tag }) {
  const hw = w / 2;
  const C = [[-hw, -hw], [hw, -hw], [hw, hw], [-hw, hw]];
  const P = (i, y) => xf.pt(v(C[i % 4][0], y, C[i % 4][1]));
  const dy = h / levels;
  const faceFront = C.map((a, f) => {
    const b = C[(f + 1) % 4];
    const mid = v((a[0] + b[0]) / 2, h / 2, (a[1] + b[1]) / 2);
    return sc.cam.faces(xf.pt(mid), xf.dir(v(mid.x, 0, mid.z)));
  });
  C.forEach((_, f) => {
    const G = faceFront[f] ? g : gb;
    const o = { m: `${m}-f${f}`, tag };
    sc.seg(G, P(f, 0), P(f + 1, 0), o);
    for (let l = 0; l < levels; l++) {
      const y0 = l * dy;
      const y1 = y0 + dy;
      sc.seg(G, P(f, y0), P(f + 1, y1), o);
      sc.seg(G, P(f + 1, y0), P(f, y1), o);
      sc.seg(G, P(f, y1), P(f + 1, y1), o);
    }
  });
  C.forEach((_, i) => {
    const front = faceFront[i] || faceFront[(i + 3) % 4];
    sc.seg(front ? g : gb, P(i, 0), P(i, h), { m: `${m}-legs${front ? '' : '~b'}`, tag });
  });
}

function poly(sc, pts3, { g = 'front', m, tag, closed = true }) {
  const pts = pts3.map((p) => sc.proj(p));
  if (closed) pts.push(pts[0]);
  sc.add(g, pts, { m, tag });
}

function groundGrid(sc, { R, step, y = 0, g = 'grid', tag = 'ground' }) {
  for (let a = -R; a <= R + 1e-9; a += step) {
    const b = Math.sqrt(Math.max(0, R * R - a * a));
    if (b < 1e-3) continue;
    sc.line(g, [v(a, y, -b), v(a, y, b)], { m: 'grid', tag });
    sc.line(g, [v(-b, y, a), v(b, y, a)], { m: 'grid', tag });
  }
}

/** Lanceur générique : corps, coiffe ogivale, tuyère, ailerons optionnels. */
function rocket(sc, xf, { m = 'rk', tag = 'rocket', meridians = 14, fins = true } = {}) {
  lathe(sc, { profile: [[0.96, 0], [1, 0.14], [1, 1.5], [1, 2.9], [1, 4.3], [1, 5.7], [1, 6.3]], xf, meridians, m: `${m}-body`, tag });
  lathe(sc, {
    profile: [[1, 6.3], [1.07, 6.5], [1.07, 7.35], [1.02, 7.85], [0.9, 8.3], [0.72, 8.7], [0.5, 9.03], [0.28, 9.27], [0.09, 9.42], [0, 9.46]],
    xf, meridians, m: `${m}-fair`, tag,
  });
  lathe(sc, { profile: [[0.3, 0], [0.34, -0.18], [0.46, -0.46], [0.64, -0.82]], xf, meridians: 10, m: `${m}-bell`, tag, gc: null });
  if (fins) {
    for (let k = 0; k < 4; k++) {
      const th = rad(45 + k * 90);
      const c = Math.cos(th), s = Math.sin(th);
      const q = (r, y) => xf.pt(v(r * c, y, r * s));
      const front = sc.cam.faces(q(1.4, 0.8), xf.dir(v(c, 0, s)));
      const G = front ? 'front' : 'back';
      const o = { g: G, m: `${m}-fins${front ? '' : '~b'}`, tag };
      poly(sc, [q(1, 1.9), q(1.9, 0.6), q(1.9, -0.3), q(1, 0.12)], o);
      sc.seg(G, q(1, 1.0), q(1.9, 0.15), o);
    }
  }
  return { tip: xf.pt(v(0, 9.46, 0)), exit: xf.pt(v(0, -0.82, 0)), axis: (y) => xf.pt(v(0, y, 0)) };
}

/* ── Éléments 2D (HUD, annotations, effets) ─────────────────────────────── */
function defs(id, extra = '') {
  return `<defs>
<filter id="glow-${id}" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="1.3" result="b1"/><feGaussianBlur in="SourceGraphic" stdDeviation="4.2" result="b2"/><feMerge><feMergeNode in="b2"/><feMergeNode in="b1"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<linearGradient id="plume-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".7"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient>
<linearGradient id="cone-${id}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="currentColor" stop-opacity=".16"/><stop offset=".7" stop-color="currentColor" stop-opacity="0"/></linearGradient>
<linearGradient id="scan-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0"/><stop offset=".9" stop-color="currentColor" stop-opacity=".13"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient>
<radialGradient id="fade-${id}"><stop offset=".35" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>
${extra}</defs>`;
}

function hudBack() {
  const cx = 200, cy = 200, R = 172;
  let ticks = '';
  for (let a = 0; a < 360; a += 5) {
    const t = rad(a);
    const r0 = R - (a % 30 === 0 ? 10 : 4);
    ticks += `M${n1(cx + Math.cos(t) * r0)} ${n1(cy + Math.sin(t) * r0)} ${n1(cx + Math.cos(t) * R)} ${n1(cy + Math.sin(t) * R)}`;
  }
  const arc = (r, a0, a1) => {
    const p = (a) => `${n1(cx + Math.cos(rad(a)) * r)} ${n1(cy + Math.sin(rad(a)) * r)}`;
    return `M${p(a0)}A${r} ${r} 0 0 1 ${p(a1)}`;
  };
  return `<g class="hud-back" data-layer="ring">
<g class="hud-rot"><path class="hud-ticks" d="${ticks}"/></g>
<circle class="hud-ring" cx="${cx}" cy="${cy}" r="${R + 6}"/>
<g class="hud-rot-rev"><circle class="hud-dash" cx="${cx}" cy="${cy}" r="${R - 22}"/></g>
<path class="hud-arcs" d="${arc(R + 13, -150, -112)}${arc(R + 13, -68, -30)}${arc(R + 13, 30, 68)}${arc(R + 13, 112, 150)}"/>
<path class="hud-cross" d="M${cx - 7} ${cy}H${cx + 7}M${cx} ${cy - 7}V${cy + 7}"/>
</g>`;
}

function holoBase(id) {
  const cx = 200, cy = 398, k = 0.16;
  const e = (rx, cls) => `<ellipse class="${cls}" cx="${cx}" cy="${cy}" rx="${rx}" ry="${n1(rx * k)}"/>`;
  let ticks = '';
  for (let a = 0; a < 360; a += 10) {
    const t = rad(a);
    ticks += `M${n1(cx + Math.cos(t) * 134)} ${n1(cy + Math.sin(t) * 134 * k)} ${n1(cx + Math.cos(t) * 141)} ${n1(cy + Math.sin(t) * 141 * k)}`;
  }
  return `<g class="holo-base" data-layer="base">
<path class="holo-cone" d="M${cx - 128} ${cy}L${cx - 160} 70H${cx + 160}L${cx + 128} ${cy}Z" fill="url(#cone-${id})"/>
${e(128, 'hb-1')}${e(92, 'hb-2')}${e(56, 'hb-3')}<path class="hb-ticks" d="${ticks}"/>${e(128, 'hb-pulse')}
</g>`;
}

const hudCorners = () => `<path class="hud-corners" data-layer="overlay" d="M10 30V10H30M370 10H390V30M390 390V410H370M30 410H10V390"/>`;

function hudTexts(tl, tr) {
  return `<g class="hud-texts" data-layer="labels">
<text class="hud-k" x="18" y="30">${tl[0]}</text><text class="hud-v" x="18" y="45"${tl[2] ?? ''}>${tl[1]}</text>
<text class="hud-k" x="382" y="30" text-anchor="end">${tr[0]}</text><text class="hud-v" x="382" y="45" text-anchor="end"${tr[2] ?? ''}>${tr[1]}</text>
</g>`;
}

/** Étiquette technique : ancre → coude → palier horizontal + texte. */
function callout([ax, ay], [edx, edy], h, text, sub) {
  const ex = ax + edx, ey = ay + edy, hx = ex + h;
  const anchor = h >= 0 ? 'start' : 'end';
  const tx = h >= 0 ? ex + 1 : ex - 1;
  return `<g class="callout" data-layer="labels"><circle class="c-dot" cx="${n1(ax)}" cy="${n1(ay)}" r="2"/><path class="c-lead draw" pathLength="1" d="M${n1(ax)} ${n1(ay)} ${n1(ex)} ${n1(ey)} ${n1(hx)} ${n1(ey)}"/><text class="c-txt" x="${n1(tx)}" y="${n1(ey - 4)}" text-anchor="${anchor}">${text}</text>${sub ? `<text class="c-sub" x="${n1(tx)}" y="${n1(ey + 10)}" text-anchor="${anchor}">${sub}</text>` : ''}</g>`;
}

/** Cote verticale (dessin technique) de y0 (bas) à y1 (haut). */
function dimV(x, y0, y1, label, fromX) {
  const X = n1(x), a = n1(y0), b = n1(y1);
  return `<g class="dim" data-layer="labels"><path class="dim-ext" d="M${n1(fromX[0])} ${a}H${n1(x - 4)}M${n1(fromX[1])} ${b}H${n1(x - 4)}"/><path class="dim-line draw" pathLength="1" d="M${X} ${a}V${b}"/><path class="dim-arrows" d="M${n1(x - 3)} ${n1(y1 + 6)}L${X} ${b} ${n1(x + 3)} ${n1(y1 + 6)}M${n1(x - 3)} ${n1(y0 - 6)}L${X} ${a} ${n1(x + 3)} ${n1(y0 - 6)}"/><text class="dim-txt" transform="translate(${n1(x - 5)} ${n1((y0 + y1) / 2)}) rotate(-90)" text-anchor="middle">${label}</text></g>`;
}

/** Panache de réacteur orienté (angle en degrés, pointe dans l'axe local +Y). */
function plume([x, y], angle, { len: L, w, diamonds = 0, cls = '' }, id) {
  const drop = (hw, l) => `M${n1(-hw)} 0C${n1(-hw)} ${n1(l * 0.35)} ${n1(-hw * 0.35)} ${n1(l * 0.8)} 0 ${n1(l)}C${n1(hw * 0.35)} ${n1(l * 0.8)} ${n1(hw)} ${n1(l * 0.35)} ${n1(hw)} 0Z`;
  let dia = '';
  for (let i = 0; i < diamonds; i++) {
    const cy = L * (0.14 + i * 0.13);
    const s = (w / 2) * 0.42 * (1 - i * 0.16);
    dia += `M0 ${n1(cy - s)} ${n1(s * 0.62)} ${n1(cy)} 0 ${n1(cy + s)} ${n1(-s * 0.62)} ${n1(cy)}Z`;
  }
  return `<g transform="translate(${n1(x)} ${n1(y)}) rotate(${n1(angle)})"><g class="plume ${cls}"><g class="plume-flk"><path class="pl-outer" fill="url(#plume-${id})" d="${drop(w / 2, L)}"/><path class="pl-mid" d="${drop(w * 0.3, L * 0.68)}"/><path class="pl-core" d="${drop(w * 0.13, L * 0.38)}"/>${dia ? `<path class="pl-diamonds" d="${dia}"/>` : ''}</g></g></g>`;
}

/** Angle SVG (deg) pour orienter l'axe local +Y de a vers b. */
const angleTo = ([ax, ay], [bx, by]) => (Math.atan2(-(bx - ax), by - ay) * 180) / Math.PI;

const scanLine = (id) => `<rect class="scan" data-layer="overlay" x="0" y="-44" width="${W}" height="44" fill="url(#scan-${id})"/>`;

const reticle = () => `<g class="reticle" data-layer="overlay"><path class="ret-h" d="M0 0H${W}"/><path class="ret-v" d="M0 0V${H}"/><g class="ret-mark"><circle r="9"/><path d="M-15 0h6M9 0h6M0-15v6M0 9v6"/><text class="ret-txt" x="14" y="-12">X 000 · Y 000</text></g></g>`;

/* ── Scène 1 : STARTER — pas de tir ─────────────────────────────────────── */
function sceneStarter() {
  const id = 'starter';
  const sc = new Scene(camera({ yaw: 34, pitch: 14, dist: 46 }));

  groundGrid(sc, { R: 7.5, step: 0.75 });

  // Plateforme + table de lancement
  lathe(sc, { profile: [[3.6, 0], [3.6, 0.38], [2.6, 0.38], [1.45, 0.38]], meridians: 28, gc: null, m: 'pad', tag: 'pad' });
  lathe(sc, { profile: [[1.2, 0.95], [1.2, 1.18]], meridians: 16, gc: null, m: 'mount', tag: 'pad' });
  for (let k = 0; k < 4; k++) {
    const th = rad(45 + 90 * k);
    sc.seg('front', v(1.9 * Math.cos(th), 0.38, 1.9 * Math.sin(th)), v(1.2 * Math.cos(th), 1.02, 1.2 * Math.sin(th)), { m: 'mount-posts', tag: 'pad' });
  }
  // Carneau (tranchée d'évacuation des flammes)
  for (const z of [-0.55, 0.55]) sc.seg('front', v(-1.45, 0.38, z), v(-3.6, 0.38, z), { m: 'trench', tag: 'pad' });
  sc.seg('front', v(-3.6, 0.38, -0.55), v(-3.6, 0.38, 0.55), { m: 'trench', tag: 'pad' });

  const rk = rocket(sc, xform({ pos: [0, 1.2, 0] }), { m: 'rk', tag: 'rocket' });

  // Tour ombilicale
  const T = { x: 3.1, z: -1.4, base: 0.38, h: 12 };
  truss(sc, { w: 1.3, h: T.h, levels: 12, xf: xform({ pos: [T.x, T.base, T.z] }), m: 'tower', tag: 'tower' });
  sc.seg('truss', v(T.x, T.base + T.h, T.z), v(T.x, T.base + T.h + 1.6, T.z), { m: 'mast', tag: 'tower' });
  sc.seg('truss', v(T.x - 0.65, T.base + T.h, T.z), v(T.x, T.base + T.h + 1.6, T.z), { m: 'mast', tag: 'tower' });
  sc.seg('truss', v(T.x + 0.65, T.base + T.h, T.z), v(T.x, T.base + T.h + 1.6, T.z), { m: 'mast', tag: 'tower' });

  sc.fit(['pad', 'rocket', 'tower'], [62, 58, 276, 300], 'bottom');

  // Bras ombilicaux : géométrie « connecté » + « rétracté » (même structure → morph GSAP)
  const u = unit(v(T.x, 0, T.z));
  const arm = (y, rSurf, swing) => {
    const A = v(T.x - 0.65, y, T.z + 0.2);
    const B = v(u.x * rSurf, y, u.z * rSurf);
    const Bs = add(A, rotY(sub(B, A), rad(swing)));
    const beam = (a, b) => {
      const up = v(0, 0.2, 0);
      const zig = Array.from({ length: 7 }, (_, i) => {
        const p = add(a, mul(sub(b, a), i / 6));
        return i % 2 ? add(p, up) : sub(p, up);
      });
      return [[add(a, up), add(b, up)], [sub(a, up), sub(b, up)], zig]
        .map((list) => pathD(list.map((p) => sc.at(p))))
        .join('');
    };
    const pivot = sc.at(A);
    return `<path class="arm draw" pathLength="1" d="${beam(A, B)}" data-retract="${beam(A, Bs)}" data-pivot="${n1(pivot[0])} ${n1(pivot[1])}"/>`;
  };
  const arms = arm(9.3, 1.12, -70) + arm(5.4, 1.05, -70);

  const rb = sc.bbox(['rocket']);
  const tip = sc.at(rk.tip);
  const base = sc.at(v(0, 0.38, 0));
  const exit = sc.at(rk.exit);
  const mastTop = sc.at(v(T.x, T.base + T.h + 1.6, T.z));
  const padFront = sc.at(v(3.6 * Math.cos(rad(115)), 0.2, 3.6 * Math.sin(rad(115))));
  const gridC = sc.at(v(0, 0, 0));

  // Vapeurs de refroidissement (cercles filaires) + flamme d'allumage (visible au survol)
  const rnd = prng(7);
  let vapor = '';
  for (let i = 0; i < 9; i++) {
    const vx = exit[0] + (rnd() - 0.5) * 70;
    const vy = exit[1] + 6 - rnd() * 14;
    vapor += `<circle class="vapor" cx="${n1(vx)}" cy="${n1(vy)}" r="${n1(5 + rnd() * 9)}"/>`;
  }

  const extraDefs = `<mask id="gridmask-${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><ellipse cx="${n1(gridC[0])}" cy="${n1(gridC[1])}" rx="175" ry="70" fill="url(#fade-${id})"/></mask>`;

  const body = `${defs(id, extraDefs)}
${hudBack()}
${holoBase(id)}
<g class="scene">
<g class="levitate">
<g class="glow" filter="url(#glow-${id})">
<g class="g-grid" data-layer="decor" mask="url(#gridmask-${id})">${sc.paths('grid')}</g>
<g class="g-back" data-layer="model">${sc.paths('back')}</g>
<g class="g-truss-b" data-layer="model">${sc.paths('truss-b')}</g>
<g class="g-front" data-layer="model">${sc.paths('front', { draw: true })}</g>
<g class="g-truss" data-layer="model">${sc.paths('truss', { draw: true })}</g>
<g class="g-contour" data-layer="model">${sc.paths('contour', { draw: true })}</g>
<g class="g-arms" data-layer="model">${arms}</g>
</g>
<g class="fx" data-layer="fx" filter="url(#glow-${id})">
<g class="vapors">${vapor}</g>
<g class="ignite">${plume(exit, 0, { len: 46, w: 16, diamonds: 2 }, id)}</g>
<circle class="beacon-halo" cx="${n1(mastTop[0])}" cy="${n1(mastTop[1])}" r="7"/><circle class="beacon" cx="${n1(mastTop[0])}" cy="${n1(mastTop[1])}" r="2.4"/>
</g>
</g>
</g>
<g class="annot">
${dimV(rb.x0 - 22, base[1], tip[1], 'H 42,6 M', [rb.x0 - 4, tip[0] - 4])}
${callout(mastTop, [16, 28], 42, 'TOUR OMB.', 'H 58 M')}
${callout(padFront, [-26, 18], -52, 'PAD LC-01', 'TOULOUSE')}
${hudTexts(['SÉQUENCE', 'T-00:00:10', ' data-countdown=""'], ['MODULE', '01 / 03'])}
${hudCorners()}
</g>
${scanLine(id)}
${reticle()}`;

  return { id, body, title: 'Starter — fusée sur son pas de tir, en filaire', desc: "Illustration filaire d'une fusée sur sa base de lancement, avec tour ombilicale en treillis et cotations techniques.", sc };
}

/* ── Scène 2 : BOOSTER — lanceur en vol vers l'orbite ───────────────────── */
function sceneBooster() {
  const id = 'booster';
  const sc = new Scene(camera({ yaw: 0, pitch: 10, dist: 70 }));
  const planet = { c: v(-3.4, -4.6, 0), r: 4 };

  sphere(sc, { ...planet, lat: 8, lon: 16, tilt: xform({ rot: [['z', 20], ['x', 14]] }), g: 'planet', gb: 'planet-b', m: 'planet', tag: 'planet' });
  const orb = orbit(sc, { c: planet.c, r: 6.6, xf: xform({ rot: [['x', -22], ['z', 17]] }), planet, g: 'orbit', gb: 'orbit-b', m: 'orbit', tag: 'orbit' });

  // Lanceur : étage central + 2 boosters latéraux
  const craftXf = xform({ scale: [0.6, 0.6, 0.6], rot: [['y', 28], ['z', -34]], pos: [1.6, 0.2, 1.2] });
  const rk = rocket(sc, craftXf, { m: 'core', tag: 'craft', fins: false });
  const boosters = [-1, 1].map((sx) => {
    const bx = chain(xform({ pos: [sx * 1.5, 0.3, 0] }), craftXf);
    lathe(sc, { profile: [[0.4, 0], [0.46, 0.12], [0.46, 2.2], [0.46, 4.4], [0.4, 4.95], [0.28, 5.4], [0.12, 5.75], [0, 5.85]], xf: bx, meridians: 10, m: `bst${sx}`, tag: 'craft' });
    lathe(sc, { profile: [[0.18, 0], [0.22, -0.2], [0.32, -0.5]], xf: bx, meridians: 8, gc: null, m: `bstb${sx}`, tag: 'craft' });
    for (const y of [0.9, 4.3]) sc.seg('front', bx.pt(v(-sx * 0.46, y, 0)), craftXf.pt(v(sx * 1, y + 0.3, 0)), { m: 'struts', tag: 'craft' });
    return { exit: bx.pt(v(0, -0.5, 0)), far: bx.pt(v(0, -4, 0)) };
  });

  sc.fit(['planet', 'orbit', 'craft'], [34, 66, 332, 306]);

  const exit = sc.at(rk.exit);
  const ang = angleTo(exit, sc.at(rk.axis(-5)));
  const tip = sc.at(rk.tip);
  const orbitD = pathD(orb.map((s) => sc.at(s.p3))) + 'Z';

  // Trajectoire : du sol planétaire jusqu'au lanceur
  const launch = sc.at(add(planet.c, mul(unit(v(0.35, 1, 0.5)), planet.r)));
  const tail = sc.at(rk.axis(-3.2));
  const ctrl = [launch[0] + 6, tail[1] + 12];
  const trail = `M${n1(launch[0])} ${n1(launch[1])}Q${n1(ctrl[0])} ${n1(ctrl[1])} ${n1(tail[0])} ${n1(tail[1])}`;

  const rnd = prng(42);
  let stars = '';
  for (let i = 0; i < 46; i++) {
    stars += `<circle class="star${rnd() > 0.7 ? ' tw' : ''}" cx="${n1(16 + rnd() * 368)}" cy="${n1(16 + rnd() * 330)}" r="${n1(0.5 + rnd() * 1)}"/>`;
  }

  const plumes = [
    plume(exit, ang, { len: 70, w: 24, diamonds: 3 }, id),
    ...boosters.map((b) => plume(sc.at(b.exit), angleTo(sc.at(b.exit), sc.at(b.far)), { len: 44, w: 12, diamonds: 2, cls: 'plume--sm' }, id)),
  ].join('');

  const planetAnchor = sc.at(add(planet.c, mul(unit(v(-0.8, -0.2, 0.6)), planet.r)));
  const boosterAnchor = sc.at(chain(xform({ pos: [-1.5, 3.2, 0] }), craftXf).pt(v(-0.46, 0, 0)));

  const body = `${defs(id)}
${hudBack()}
<g class="stars" data-layer="decor">${stars}</g>
${holoBase(id)}
<g class="scene">
<g class="glow" filter="url(#glow-${id})">
<g class="g-planet-b" data-layer="decor">${sc.paths('planet-b')}</g>
<g class="g-orbit-b" data-layer="decor">${sc.paths('orbit-b')}</g>
<g class="g-planet" data-layer="decor">${sc.paths('planet', { draw: true })}</g>
<g class="g-orbit" data-layer="decor">${sc.paths('orbit')}</g>
<path class="trail" data-layer="decor" d="${trail}"/>
<path id="orbit-path-${id}" class="orbit-guide" d="${orbitD}"/>
<g class="satellite" data-layer="decor" data-hidden="${hiddenRanges(orb, sc)}"><circle r="3"/><path d="M-7 0h4M3 0h4"/></g>
</g>
<g class="levitate">
<g class="craft" data-dx="${n1(tip[0] - exit[0])}" data-dy="${n1(tip[1] - exit[1])}">
<g class="fx" data-layer="fx" filter="url(#glow-${id})">${plumes}</g>
<g class="glow" filter="url(#glow-${id})">
<g class="g-back" data-layer="model">${sc.paths('back')}</g>
<g class="g-front" data-layer="model">${sc.paths('front', { draw: true })}</g>
<g class="g-contour" data-layer="model">${sc.paths('contour', { draw: true })}</g>
</g>
</g>
</g>
</g>
<g class="annot">
${callout(tip, [-26, -6], -58, 'ALT 408 KM', 'MAX-Q PASSÉ')}
${callout(boosterAnchor, [-30, -22], -50, 'BOOSTERS ×2', 'SÉP. T+124 S')}
${callout(planetAnchor, [-14, 30], -40, 'ORBITE LEO', 'INCL. 51,6°')}
${hudTexts(['VITESSE', '7,66 KM/S', ' data-vel=""'], ['MODULE', '02 / 03'])}
${hudCorners()}
</g>
${scanLine(id)}
${reticle()}`;

  return { id, body, title: 'Booster — lanceur en vol vers une orbite, en filaire', desc: "Illustration filaire d'un lanceur à deux boosters latéraux quittant une planète vers son orbite, trajectoire en pointillés.", sc };
}

/* ── Scène 3 : NITRO — vaisseau 2.0 en hyper-vitesse ────────────────────── */
function sceneNitro() {
  const id = 'nitro';
  const sc = new Scene(camera({ yaw: 0, pitch: 32, dist: 60 }));
  // Nez vers le haut-droite et en profondeur : on voit le dessus des ailes et les réacteurs face caméra
  const ship = xform({ rot: [['y', -14], ['x', -90], ['y', -128], ['z', 12]] });
  const S = (x, y, z) => ship.pt(v(x, y, z));

  // Fuselage aplati + verrière
  lathe(sc, {
    profile: [[0.78, 0], [0.92, 0.35], [1, 1.4], [1, 2.8], [0.92, 4.2], [0.78, 5.4], [0.6, 6.5], [0.42, 7.5], [0.24, 8.35], [0.08, 8.95], [0, 9.15]],
    xf: chain(xform({ scale: [1.25, 1, 0.52] }), ship), meridians: 14, m: 'fus', tag: 'ship',
  });
  lathe(sc, {
    profile: [[0.3, 4.2], [0.5, 4.8], [0.52, 5.5], [0.42, 6.2], [0.22, 6.8], [0, 7.1]],
    xf: chain(xform({ scale: [0.7, 1, 0.6], pos: [0, 0, 0.3] }), ship), meridians: 8, m: 'canopy', tag: 'ship',
  });

  // Ailes delta, dérives, stabilisateur
  for (const sx of [-1, 1]) {
    const o = { m: 'wings', tag: 'ship' };
    poly(sc, [S(sx * 1.1, 5.2, 0), S(sx * 4.8, 1.2, 0), S(sx * 4.8, 0.1, 0), S(sx * 1.2, 0.5, 0)], o);
    sc.seg('front', S(sx * 1.15, 3.8, 0), S(sx * 4.8, 0.85, 0), o);
    sc.seg('front', S(sx * 1.2, 2.2, 0), S(sx * 4.8, 0.45, 0), o);
    sc.seg('front', S(sx * 3, 3.15, 0), S(sx * 3, 0.29, 0), o);
  }
  poly(sc, [S(0, 0.3, 0.45), S(0, 2.8, 0.45), S(0, 1, 1.8), S(0, -0.2, 1.8)], { m: 'stab', tag: 'ship' });

  // Nacelles latérales
  const nozzles = [{ x: 0, y: 0, z: 0, r: 0.42 }];
  for (const sx of [-1, 1]) {
    const nx = chain(xform({ pos: [sx * 2.2, -0.6, -0.15] }), ship);
    lathe(sc, { profile: [[0.42, 0], [0.55, 0.3], [0.58, 0.9], [0.58, 2.6], [0.5, 3.3], [0.34, 3.8], [0.12, 4.15], [0, 4.2]], xf: nx, meridians: 10, m: `nac${sx}`, tag: 'ship' });
    nozzles.push({ x: sx * 2.2, y: -0.6, z: -0.15, r: 0.34 });
  }

  // Tuyères + anneaux de post-combustion (« réacteurs dopés »)
  nozzles.forEach((nz, i) => {
    const nxf = chain(xform({ pos: [nz.x, nz.y, nz.z] }), ship);
    lathe(sc, { profile: [[nz.r, 0], [nz.r * 0.86, -0.24], [nz.r * 1.12, -0.58]], xf: nxf, meridians: 8, gc: null, m: `noz${i}`, tag: 'ship' });
    [[1.3, 0.95], [2.4, 0.8], [3.7, 0.6]].forEach(([d, k], j) => {
      lathe(sc, { profile: [[nz.r * 1.3 * k, -0.58 - d]], xf: nxf, meridians: 0, gc: null, g: 'burn', gb: 'burn', m: `burn${i}-${j}`, tag: 'fx' });
    });
    nz.exit = nxf.pt(v(0, -0.58, 0));
    nz.far = nxf.pt(v(0, -6, 0));
  });

  // Cône d'onde de choc devant le nez
  lathe(sc, { profile: [[0.05, 9.3], [0.9, 8.6], [1.8, 7.5], [2.6, 6.2]], xf: ship, meridians: 12, rings: [1, 2, 3], gc: null, g: 'shock', gb: 'shock', m: 'shock', tag: 'fx' });

  sc.fit(['ship'], [100, 92, 226, 196]);

  const nose = sc.at(S(0, 9.15, 0));
  const tailC = sc.at(S(0, 0, 0));
  const dir = (() => { const dx = nose[0] - tailC[0], dy = nose[1] - tailC[1], l = Math.hypot(dx, dy); return [dx / l, dy / l]; })();

  // Traînées hyper-vitesse : lignes parallèles à l'axe, tracées de l'avant vers l'arrière
  const rnd = prng(2026);
  let streaks = '';
  for (let i = 0; i < 30; i++) {
    const off = (rnd() - 0.5) * 560;
    const cx = 200 - dir[1] * off, cy = 210 + dir[0] * off;
    const a = [cx + dir[0] * 340, cy + dir[1] * 340];
    const b = [cx - dir[0] * 340, cy - dir[1] * 340];
    const dash = Math.round(24 + rnd() * 110);
    streaks += `<path class="streak s${1 + Math.floor(rnd() * 3)}" d="${pathD([a, b])}" stroke-dasharray="${dash} 1000" stroke-dashoffset="${Math.round(-rnd() * 640)}" data-len="680" data-dash="${dash}" data-dur="${(0.5 + rnd() * 0.9).toFixed(2)}"/>`;
  }

  const plumes = nozzles.map((nz, i) => {
    const e = sc.at(nz.exit);
    return plume(e, angleTo(e, sc.at(nz.far)), i === 0 ? { len: 110, w: 30, diamonds: 4 } : { len: 84, w: 22, diamonds: 3, cls: 'plume--sm' }, id);
  }).join('');

  const nozAnchor = sc.at(nozzles[1].exit);
  const wingAnchor = sc.at(S(-4.8, 0.6, 0));

  const body = `${defs(id)}
${hudBack()}
<g class="streaks" data-layer="decor">${streaks}</g>
${holoBase(id)}
<g class="scene">
<g class="levitate">
<g class="craft">
<g class="fx" data-layer="fx" filter="url(#glow-${id})">${plumes}<g class="g-burn" data-layer="fx">${sc.paths('burn')}</g></g>
<g class="glow" filter="url(#glow-${id})">
<g class="g-shock" data-layer="fx">${sc.paths('shock')}</g>
<g class="g-back" data-layer="model">${sc.paths('back')}</g>
<g class="g-front" data-layer="model">${sc.paths('front', { draw: true })}</g>
<g class="g-contour" data-layer="model">${sc.paths('contour', { draw: true })}</g>
</g>
</g>
</g>
</g>
<g class="annot">
${callout(nose, [-18, -24], -46, 'WARP ×2.0', 'VITESSE 0,98 c')}
${callout(nozAnchor, [8, 42], 40, 'RÉACTEURS ×3', 'POST-COMBUSTION')}
${callout(wingAnchor, [14, 26], 30, 'AILE DELTA', 'ENV. 9,6 M')}
${hudTexts(['PROPULSION', 'NITRO 340 %', ' data-boost=""'], ['MODULE', '03 / 03'])}
${hudCorners()}
</g>
${scanLine(id)}
${reticle()}`;

  return { id, body, title: 'Nitro — vaisseau 2.0 en hyper-vitesse, en filaire', desc: "Illustration filaire d'un vaisseau delta à trois réacteurs dopés, traînées d'hyper-vitesse et cône d'onde de choc.", sc };
}

/* ── Assemblage & export ────────────────────────────────────────────────── */
const COLORS = { starter: '#3ff0ff', booster: '#9d8cff', nitro: '#ff4fd8' };

function svgDoc({ id, title, desc, body }, standaloneCss) {
  const open = `<svg class="illu illu--${id}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${id}-t ${id}-d"${standaloneCss ? ` xmlns="http://www.w3.org/2000/svg" style="color:${COLORS[id]};background:#030a14"` : ''}>`;
  const style = standaloneCss ? `<style>${standaloneCss}</style>` : '';
  return `${open}<title id="${id}-t">${title}</title><desc id="${id}-d">${desc}</desc>${style}\n${body}\n</svg>`;
}

const css = readFileSync(resolve(ROOT, 'css/illu.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ');
const htmlPath = resolve(ROOT, 'index.html');
let html = readFileSync(htmlPath, 'utf8');

const report = [];
for (const make of [sceneStarter, sceneBooster, sceneNitro]) {
  const scene = make();
  const inline = svgDoc(scene);
  writeFileSync(resolve(ROOT, `svg/${scene.id}.svg`), svgDoc(scene, css));

  const re = new RegExp(`(<!-- @svg:${scene.id} -->)[\\s\\S]*?(<!-- /@svg:${scene.id} -->)`);
  if (!re.test(html)) throw new Error(`Marqueur <!-- @svg:${scene.id} --> introuvable dans index.html`);
  html = html.replace(re, (_, a, b) => `${a}\n${inline}\n${b}`);

  report.push({
    tier: scene.id,
    paths: (inline.match(/<path/g) || []).length,
    nodes: (inline.match(/<[a-z]/g) || []).length,
    'Ko brut': +(Buffer.byteLength(inline) / 1024).toFixed(1),
    'Ko gzip': +(gzipSync(inline).length / 1024).toFixed(1),
  });
}
writeFileSync(htmlPath, html);
console.table(report);
