/**
 * Mini moteur filaire temps réel — Canvas 2D, zéro dépendance.
 *
 * C'est le moteur du prototype 01 (mêmes primitives, même tri des faces vues / cachées),
 * mais exécuté à chaque frame dans le navigateur au lieu d'être « cuit » au build :
 * l'objet tourne librement, le CPU reprojette tout à chaque image.
 *
 * Script classique (pas de module) → la page s'ouvre aussi en double-clic, en file://.
 */
(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const rad = (d) => (d * Math.PI) / 180;

  /* ── Construction des formes ─────────────────────────────────────────── */
  // Un objet = liste de traits. Un trait = { p: [x,y,z, …], n: [nx,ny,nz, …] | null, w, alpha, fx }
  // `n` porte la normale de surface au point : elle sert au tri vues / cachées, chaque frame.

  const stroke = (p, n, opts = {}) => ({ p: Float32Array.from(p), n: n ? Float32Array.from(n) : null, w: opts.w ?? 1, alpha: opts.alpha ?? 1, fx: opts.fx ?? false, closed: !!opts.closed });

  /** Surface de révolution autour de Y : anneaux + méridiens (avec normales). */
  function lathe(profile, { segments = 40, meridians = 12, rings, w = 1, alpha = 1 } = {}) {
    const out = [];
    const tangent = (i) => {
      const a = profile[Math.max(0, i - 1)];
      const b = profile[Math.min(profile.length - 1, i + 1)];
      return [b[0] - a[0], b[1] - a[1]];
    };
    const sample = (i, th, p, n) => {
      const [r, y] = profile[i];
      const [dr, dy] = tangent(i);
      const c = Math.cos(th);
      const s = Math.sin(th);
      p.push(r * c, y, r * s);
      n.push(c * dy, -dr, s * dy);
    };

    for (const i of rings ?? profile.map((_, k) => k)) {
      if (profile[i][0] < 1e-3) continue;
      const p = [];
      const n = [];
      for (let k = 0; k <= segments; k++) sample(i, (k / segments) * TAU, p, n);
      out.push(stroke(p, n, { w, alpha }));
    }
    for (let m = 0; m < meridians; m++) {
      const th = (m / meridians) * TAU;
      const p = [];
      const n = [];
      for (let i = 0; i < profile.length; i++) sample(i, th, p, n);
      out.push(stroke(p, n, { w, alpha }));
    }
    return out;
  }

  /** Sphère filaire. */
  function sphere(radius, { lat = 7, lon = 12, segments = 48, w = 1, alpha = 1 } = {}) {
    const out = [];
    const at = (phi, th, p, n) => {
      const x = Math.cos(phi) * Math.cos(th);
      const y = Math.sin(phi);
      const z = Math.cos(phi) * Math.sin(th);
      p.push(x * radius, y * radius, z * radius);
      n.push(x, y, z);
    };
    for (let i = 1; i <= lat; i++) {
      const phi = -Math.PI / 2 + (i / (lat + 1)) * Math.PI;
      const p = [];
      const n = [];
      for (let k = 0; k <= segments; k++) at(phi, (k / segments) * TAU, p, n);
      out.push(stroke(p, n, { w, alpha }));
    }
    for (let m = 0; m < lon; m++) {
      const th = (m / lon) * TAU;
      const p = [];
      const n = [];
      for (let k = 0; k <= segments / 2; k++) at(-Math.PI / 2 + (k / (segments / 2)) * Math.PI, th, p, n);
      out.push(stroke(p, n, { w, alpha }));
    }
    return out;
  }

  /** Cercle dans le plan XZ (orbite, anneau de réacteur). */
  function ring(radius, { segments = 64, y = 0, w = 1, alpha = 1, fx = false } = {}) {
    const p = [];
    for (let k = 0; k <= segments; k++) {
      const th = (k / segments) * TAU;
      p.push(Math.cos(th) * radius, y, Math.sin(th) * radius);
    }
    return [stroke(p, null, { w, alpha, fx })];
  }

  /** Polyligne 3D libre. */
  function line(points, { w = 1, alpha = 1, fx = false, closed = false } = {}) {
    const p = [];
    for (const [x, y, z] of points) p.push(x, y, z);
    if (closed && points.length > 2) p.push(points[0][0], points[0][1], points[0][2]);
    return [stroke(p, null, { w, alpha, fx })];
  }

  /** Tour en treillis (montants, ceintures, croisillons). */
  function truss(width, height, levels, { w = 0.8, alpha = 1 } = {}) {
    const out = [];
    const h = width / 2;
    const c = [[-h, -h], [h, -h], [h, h], [-h, h]];
    const P = (i, y) => [c[i % 4][0], y, c[i % 4][1]];
    const dy = height / levels;
    for (let i = 0; i < 4; i++) out.push(...line([P(i, 0), P(i, height)], { w, alpha }));
    for (let f = 0; f < 4; f++) {
      out.push(...line([P(f, 0), P(f + 1, 0)], { w, alpha }));
      for (let l = 0; l < levels; l++) {
        const y0 = l * dy;
        const y1 = y0 + dy;
        out.push(...line([P(f, y0), P(f + 1, y1)], { w, alpha }));
        out.push(...line([P(f + 1, y0), P(f, y1)], { w, alpha }));
        out.push(...line([P(f, y1), P(f + 1, y1)], { w, alpha }));
      }
    }
    return out;
  }

  /** Grille circulaire au sol. */
  function grid(radius, step, { w = 0.5, alpha = 0.4 } = {}) {
    const out = [];
    for (let a = -radius; a <= radius + 1e-9; a += step) {
      const b = Math.sqrt(Math.max(0, radius * radius - a * a));
      if (b < 1e-3) continue;
      out.push(...line([[a, 0, -b], [a, 0, b]], { w, alpha }));
      out.push(...line([[-b, 0, a], [b, 0, a]], { w, alpha }));
    }
    return out;
  }

  /* ── Nœud : un groupe de traits avec sa transformation ───────────────── */
  class Node {
    constructor(strokes = [], { pos = [0, 0, 0], rot = [0, 0, 0], scale = 1, layer = null } = {}) {
      this.strokes = strokes;
      this.layer = layer; // 'model' | 'decor' | 'fx' … (panneau CALQUES)
      this.pos = pos;
      this.rot = rot; // [x, y, z] en radians
      this.scale = scale;
      this.visible = true;
      this.children = [];
    }

    add(node) {
      this.children.push(node);
      return node;
    }

    /** Matrice 3×3 (rotation ZXY) + translation, recalculée à chaque frame. */
    matrix(out) {
      const [rx, ry, rz] = this.rot;
      const cx = Math.cos(rx), sx = Math.sin(rx);
      const cy = Math.cos(ry), sy = Math.sin(ry);
      const cz = Math.cos(rz), sz = Math.sin(rz);
      // Échelle uniforme (nombre) ou par axe ([x, y, z], pour aplatir une coque par exemple)
      const k = this.scale;
      const k0 = Array.isArray(k) ? k[0] : k;
      const k1 = Array.isArray(k) ? k[1] : k;
      const k2 = Array.isArray(k) ? k[2] : k;
      // R = Ry · Rx · Rz, stockée en colonnes (image des axes locaux X, Y, Z)
      out[0] = (cy * cz + sy * sx * sz) * k0;
      out[1] = (cx * sz) * k0;
      out[2] = (-sy * cz + cy * sx * sz) * k0;
      out[3] = (-cy * sz + sy * sx * cz) * k1;
      out[4] = (cx * cz) * k1;
      out[5] = (sy * sz + cy * sx * cz) * k1;
      out[6] = (sy * cx) * k2;
      out[7] = -sx * k2;
      out[8] = (cy * cx) * k2;
      out[9] = this.pos[0];
      out[10] = this.pos[1];
      out[11] = this.pos[2];
      return out;
    }
  }

  /* ── Rendu ───────────────────────────────────────────────────────────── */
  class Renderer {
    constructor(canvas, { color = '#3ff0ff', fov = 30, dist = 44 } = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.color = color;
      this.fov = fov;
      this.dist = dist;
      this.target = [0, 0, 0];
      this.pitch = rad(12);
      this.yaw = 0;
      this.glow = true;
      this.layers = {}; // calques éteints : { fx: false, … }
      this.light = false; // thème clair : encre sur papier, pas de néon additif
      this.alpha = 1; // pilotée par l'intro
      this.dpr = 1;
      this._m = new Float32Array(12);
      this._front = [];
      this._back = [];
      this._fx = [];
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }
      this.dpr = dpr;
      this.w = rect.width;
      this.h = rect.height;
      this.f = this.h / 2 / Math.tan(rad(this.fov) / 2); // focale en pixels
      return rect.width > 0;
    }

    /** Monde → caméra → écran. La caméra vise `target`, orbite de `yaw` et plonge de `pitch`. */
    project(x, y, z, out) {
      const dx = x - this.target[0];
      const dy = y - this.target[1];
      const dz = z - this.target[2];
      const cy = Math.cos(-this.yaw), sy = Math.sin(-this.yaw);
      const px = dx * cy + dz * sy;
      const pz0 = -dx * sy + dz * cy;
      const cp = Math.cos(-this.pitch), sp = Math.sin(-this.pitch);
      const py = dy * cp - pz0 * sp;
      const pz = dy * sp + pz0 * cp + this.dist;
      const k = this.f / Math.max(0.01, pz);
      out[0] = this.w / 2 + px * k;
      out[1] = this.h / 2 - py * k;
      out[2] = pz;
      return pz;
    }

    /** Profondeur caméra seule (sert au tri vues / cachées, sans projeter). */
    camZ(x, y, z) {
      const dx = x - this.target[0];
      const dy = y - this.target[1];
      const dz = z - this.target[2];
      const pz0 = -dx * Math.sin(-this.yaw) + dz * Math.cos(-this.yaw);
      return dy * Math.sin(-this.pitch) + pz0 * Math.cos(-this.pitch) + this.dist;
    }

    draw(root, { time = 0 } = {}) {
      if (!this.resize()) return;
      const ctx = this.ctx;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.w, this.h);
      this._front.length = 0;
      this._back.length = 0;
      this._fx.length = 0;
      this._collect(root, [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]);
      // Ce qui a reellement ete peint (sert aux tests et au debogage des calques)
      this.stats = { front: this._front.length, back: this._back.length, fx: this._fx.length };
      this._paint(this._back, { dash: [2, 3], alpha: 0.34 * this.alpha, glow: false });
      this._paint(this._fx, { alpha: 0.9 * this.alpha, glow: this.glow, additive: true });
      this._paint(this._front, { alpha: this.alpha, glow: this.glow });
      void time;
    }

    /** Parcourt l'arbre, projette, et trie chaque segment vu / caché. */
    _collect(node, parent) {
      if (!node.visible) return;
      // Calque éteint : on saute SES traits, mais on continue vers les enfants
      // (masquer la fusée ne doit pas emporter ses flammes).
      const hidden = node.layer && this.layers[node.layer] === false;
      const m = node.matrix(this._m);
      const w = combine(parent, m);
      const p0 = [0, 0, 0];
      const p1 = [0, 0, 0];
      const n0 = [0, 0, 0];

      if (!hidden) for (const s of node.strokes) {
        const pts = s.p;
        const nrm = s.n;
        let run = null;

        for (let i = 0; i < pts.length; i += 3) {
          transform(w, pts[i], pts[i + 1], pts[i + 2], p1);
          this.project(p1[0], p1[1], p1[2], p0);
          const xy = [p0[0], p0[1]];

          // Face tournée vers la caméra ? On compare la profondeur du point et celle du point
          // décalé le long de sa normale : plus proche = surface vue.
          let front = true;
          if (nrm) {
            rotate(w, nrm[i], nrm[i + 1], nrm[i + 2], n0);
            front = this.camZ(p1[0] + n0[0], p1[1] + n0[1], p1[2] + n0[2]) < this.camZ(p1[0], p1[1], p1[2]);
          }

          if (!run) {
            run = { front, pts: [xy] };
            continue;
          }
          run.pts.push(xy);
          if (front !== run.front) {
            this._push(run, s, nrm);
            run = { front, pts: [xy] }; // le point de bascule appartient aux deux tronçons
          }
        }
        if (run) this._push(run, s, nrm);
      }
      for (const child of node.children) this._collect(child, w);
    }

    /** Range un tronçon dans son calque : effets / lignes cachées / lignes vues. */
    _push(run, s, hasNormals) {
      if (run.pts.length < 2) return;
      const bucket = s.fx ? this._fx : hasNormals && !run.front ? this._back : this._front;
      bucket.push({ run: run.pts, w: s.w, alpha: s.alpha });
    }

    _paint(list, { dash = null, alpha = 1, glow = false, additive = false }) {
      if (!list.length) return;
      const ctx = this.ctx;
      ctx.save();
      ctx.strokeStyle = this.color;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (dash) ctx.setLineDash(dash);
      // En thème clair, le mélange additif éclaircirait l'encre : on reste en tracé normal
      const blend = this.light ? 'source-over' : 'lighter';
      if (additive) ctx.globalCompositeOperation = blend;

      // Regroupement par (épaisseur, opacité) : un seul `stroke` par groupe au lieu d'un par trait.
      // C'est le principal levier de perf en Canvas 2D — chaque appel à stroke() coûte cher.
      const groups = new Map();
      for (const item of list) {
        const key = `${item.w}|${item.alpha}`;
        let g = groups.get(key);
        if (!g) groups.set(key, (g = { w: item.w, a: item.alpha, runs: [] }));
        g.runs.push(item.run);
      }

      // Halo : même tracé, épais et transparent, en mélange additif (le « glow » du canvas 2D)
      if (glow) {
        ctx.globalCompositeOperation = blend;
        for (const g of groups.values()) {
          ctx.globalAlpha = (this.light ? 0.05 : 0.09) * alpha * g.a;
          ctx.lineWidth = g.w * 5;
          ctx.beginPath();
          for (const run of g.runs) trace(ctx, run);
          ctx.stroke();
        }
        ctx.globalCompositeOperation = additive ? blend : 'source-over';
      }

      for (const g of groups.values()) {
        ctx.globalAlpha = alpha * g.a;
        // Sur papier, sans halo pour épaissir le trait, on compense un peu
        ctx.lineWidth = g.w * (this.light ? 1.25 : 1);
        ctx.beginPath();
        for (const run of g.runs) trace(ctx, run);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function trace(ctx, run) {
    ctx.moveTo(run[0][0], run[0][1]);
    for (let i = 1; i < run.length; i++) ctx.lineTo(run[i][0], run[i][1]);
  }

  /* Matrices « 3×3 + translation » stockées à plat (9 + 3) */
  function combine(a, b) {
    const o = new Float32Array(12);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        o[r * 3 + c] = a[0 * 3 + c] * b[r * 3 + 0] + a[1 * 3 + c] * b[r * 3 + 1] + a[2 * 3 + c] * b[r * 3 + 2];
      }
    }
    o[9] = a[0] * b[9] + a[3] * b[10] + a[6] * b[11] + a[9];
    o[10] = a[1] * b[9] + a[4] * b[10] + a[7] * b[11] + a[10];
    o[11] = a[2] * b[9] + a[5] * b[10] + a[8] * b[11] + a[11];
    return o;
  }

  function transform(m, x, y, z, out) {
    out[0] = m[0] * x + m[3] * y + m[6] * z + m[9];
    out[1] = m[1] * x + m[4] * y + m[7] * z + m[10];
    out[2] = m[2] * x + m[5] * y + m[8] * z + m[11];
  }

  function rotate(m, x, y, z, out) {
    out[0] = m[0] * x + m[3] * y + m[6] * z;
    out[1] = m[1] * x + m[4] * y + m[7] * z;
    out[2] = m[2] * x + m[5] * y + m[8] * z;
  }

  window.WIRE = { Node, Renderer, lathe, sphere, ring, line, truss, grid, rad, TAU };
})();
