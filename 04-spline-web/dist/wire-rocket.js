/**
 * <wire-rocket> — illustration filaire 3D animée, en un seul fichier, sans dépendance.
 * Généré par 04-spline-web/tools/bundle.mjs — ne pas éditer à la main.
 *
 *   <script src="wire-rocket.js"></script>
 *   <wire-rocket tier="booster" color="#9d8cff" label="VITESSE" value="7,66 KM/S" module="02 / 03"></wire-rocket>
 */
(() => {
  'use strict';
  const scope = {};

  /* ── moteur filaire (partagé avec le prototype 03) ─────────────────────────────── */
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
      constructor(strokes = [], { pos = [0, 0, 0], rot = [0, 0, 0], scale = 1, layer = null, alpha = 1 } = {}) {
        this.strokes = strokes;
        this.alpha = alpha; // opacité du nœud, multipliée à celle de ses traits
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
              this._push(run, s, nrm, node.alpha);
              run = { front, pts: [xy] }; // le point de bascule appartient aux deux tronçons
            }
          }
          if (run) this._push(run, s, nrm, node.alpha);
        }
        for (const child of node.children) this._collect(child, w);
      }
  
      /** Range un tronçon dans son calque : effets / lignes cachées / lignes vues. */
      _push(run, s, hasNormals, nodeAlpha = 1) {
        if (run.pts.length < 2 || nodeAlpha <= 0.01) return;
        const bucket = s.fx ? this._fx : hasNormals && !run.front ? this._back : this._front;
        bucket.push({ run: run.pts, w: s.w, alpha: s.alpha * nodeAlpha });
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
  
    scope.WIRE = { Node, Renderer, lathe, sphere, ring, line, truss, grid, rad, TAU };
  })();


  /* ── scènes Starter / Booster / Nitro ─────────────────────────────── */
  /**
   * Les 3 scènes du prototype 03, construites avec le moteur de js/engine.js.
   * Mêmes profils et mêmes compositions que les prototypes 01 et 02 — seul le rendu change.
   */
  (() => {
    'use strict';
    const { Node, lathe, sphere, ring, line, truss, grid } = scope.WIRE;
  
    // Lanceur elance (rapport 1:9), en quatre troncons : etage 1, interetage, etage 2, coiffe
    const BODY = [[0.56, 0], [0.6, 0.15], [0.6, 1.6], [0.6, 3.2], [0.6, 4.8], [0.6, 6.2]];
    const INTER = [[0.6, 6.2], [0.54, 6.4], [0.54, 7], [0.6, 7.2]];
    const UPPER = [[0.6, 7.2], [0.6, 8.3]];
    const FAIRING = [[0.6, 8.3], [0.66, 8.55], [0.66, 9.2], [0.6, 9.7], [0.48, 10.1], [0.33, 10.45], [0.16, 10.7], [0, 10.8]];
    const BELL = [[0.13, 0], [0.15, -0.1], [0.2, -0.26], [0.27, -0.46]];
    const BOOSTER = [[0.26, 0], [0.3, 0.1], [0.3, 2.5], [0.3, 4.8], [0.26, 5.3], [0.18, 5.8], [0.08, 6.2], [0, 6.35]];
    const FUSELAGE = [[0.78, 0], [0.92, 0.35], [1, 1.4], [1, 2.8], [0.92, 4.2], [0.78, 5.4], [0.6, 6.5], [0.42, 7.5], [0.24, 8.35], [0.08, 8.95], [0, 9.15]];
    const NACELLE = [[0.42, 0], [0.55, 0.3], [0.58, 0.9], [0.58, 2.6], [0.5, 3.3], [0.34, 3.8], [0.12, 4.15], [0, 4.2]];
  
    /** Panache : cône filaire additif, étiré selon l'intensité. */
    const plumeShape = (r, len) => lathe([[r, 0], [r * 0.78, -len * 0.35], [r * 0.45, -len * 0.72], [0, -len]], { segments: 18, meridians: 8, w: 0.9, alpha: 0.75 }).map((s) => ((s.fx = true), s));
  
    /** Socle holographique : anneaux concentriques + graduations, sous la scene. */
    function holoBase(y, r) {
      const out = [
        ...ring(r, { segments: 72, y, w: 1.1, alpha: 0.85 }),
        ...ring(r * 0.72, { segments: 64, y, w: 0.6, alpha: 0.5 }),
        ...ring(r * 0.44, { segments: 48, y, w: 0.8, alpha: 0.45 }),
      ];
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        out.push(...line([[Math.cos(a) * r, y, Math.sin(a) * r], [Math.cos(a) * r * 1.06, y, Math.sin(a) * r * 1.06]], { w: 0.8, alpha: 0.7 }));
      }
      return out;
    }
  
    function rocketNode({ fins = true, engines = true } = {}) {
      const n = new Node([
        ...lathe(BODY, { meridians: 10, w: 1 }),
        ...lathe(INTER, { meridians: 10, w: 0.9 }),
        ...lathe(UPPER, { meridians: 10, w: 1 }),
        ...lathe(FAIRING, { meridians: 10, w: 1 }),
      ]);
      // Grappe de 4 moteurs
      if (engines) {
        for (let k = 0; k < 4; k++) {
          const th = (Math.PI / 4) + (k * Math.PI) / 2;
          const b = n.add(new Node(lathe(BELL, { meridians: 6, w: 0.9 })));
          b.pos = [Math.cos(th) * 0.3, 0, Math.sin(th) * 0.3];
        }
      }
      // Ailerons, alignes sur les axes (entre les moteurs)
      if (fins) {
        for (let k = 0; k < 4; k++) {
          const th = (k * Math.PI) / 2;
          const c = Math.cos(th);
          const s = Math.sin(th);
          const q = (r, y) => [r * c, y, r * s];
          n.strokes.push(
            ...line([q(0.6, 1.7), q(1.45, 0.35), q(1.45, -0.35), q(0.6, 0.05)], { w: 0.9, closed: true }),
            ...line([q(0.6, 0.9), q(1.45, 0.1)], { w: 0.8 }),
          );
        }
      }
      return n;
    }
  
    /**
     * Echappement des reacteurs : chaque bouffee nait a la tuyere, file vers l'exterieur en
     * grossissant puis se dissipe, et recommence. C'est l'enchainement (progression cyclique)
     * qui donne le jet, pas la disposition des bouffees.
     */
    function smokeNodes(parent, { y = 0.4, count = 26 } = {}) {
      const puffs = [];
      for (let i = 0; i < count; i++) {
        const a = i * 2.39996;                       // angle d'or : aucune direction privilegiee
        const node = parent.add(new Node(sphere(1, { lat: 2, lon: 4, segments: 12, w: 0.7, alpha: 0.55 }), { layer: 'fx' }));
        node.alpha = 0;
        puffs.push({
          node,
          dir: [Math.cos(a), Math.sin(a)],
          dist: 4 + (i % 5) * 1.1,                 // portee au sol
          rise: 0.5 + (i % 3) * 0.5,                 // enroulement vers le haut en fin de course
          size: 0.85 + (i % 4) * 0.3,
          speed: 0.32 + (i % 3) * 0.06,
          phase: i / count,
          y,
        });
      }
      return puffs;
    }
  
    /* ── STARTER ── */
    function starter(renderer) {
      renderer.fov = 30;
      renderer.dist = 46;
      renderer.target = [0, 5.4, 0];
      renderer.pitch = 0.22;
  
      const root = new Node();
      root.add(new Node(holoBase(-0.5, 5.4), { layer: 'base' }));
      root.add(new Node(grid(7.5, 0.75, { alpha: 0.3 }), { layer: 'decor' }));
      root.add(new Node([...lathe([[3.6, 0], [3.6, 0.38], [2.6, 0.38], [1.45, 0.38]], { meridians: 24, w: 0.9, alpha: 0.85 })], { layer: 'model' }));
  
      const craft = root.add(rocketNode());
      craft.layer = 'model';
      craft.pos = [0, 1.2, 0];
  
      const smoke = smokeNodes(root, { y: 0.5 });
  
      const tower = root.add(new Node(truss(1.3, 12, 12, { w: 0.7, alpha: 0.85 }), { layer: 'model' }));
      tower.pos = [3.1, 0.38, -1.4];
  
      const arms = [9, 5].map((y) => {
        const pivot = root.add(new Node());
        pivot.layer = 'model';
        pivot.pos = [3.1, y, -1.4];
        const dx = -3.1;
        const dz = 1.4;
        const L = Math.hypot(dx, dz);
        const u = [dx / L, 0, dz / L];
        const at = (d, h) => [u[0] * d, h, u[2] * d];
        pivot.strokes.push(...line([at(0.65, 0.2), at(2.3, 0.2)], { w: 0.7 }), ...line([at(0.65, -0.2), at(2.3, -0.2)], { w: 0.7 }));
        for (let i = 0; i < 6; i++) {
          pivot.strokes.push(...line([at(0.65 + (i / 6) * 1.65, i % 2 ? 0.2 : -0.2), at(0.65 + ((i + 1) / 6) * 1.65, i % 2 ? -0.2 : 0.2)], { w: 0.6 }));
        }
        return pivot;
      });
  
      const flame = root.add(new Node(plumeShape(0.35, 3.2), { layer: 'fx' }));
      flame.pos = [0, 0.38, 0];
      flame.visible = false;
  
      return {
        root,
        anchor: [0, 12, 0],
        update(t, hover) {
          renderer.yaw = 0.4 + Math.sin(t * 0.12) * 0.25;
          root.pos = [0, Math.sin(t * 0.7) * 0.18, 0];
          arms.forEach((a, i) => (a.rot = [0, -hover * (1.1 + i * 0.1), 0]));
          flame.visible = hover > 0.05;
          flame.scale = 0.4 + hover * 0.9 + Math.sin(t * 30) * 0.04 * hover;
          // Jet continu : la progression tourne en boucle, l'intensite suit le survol
          for (const p of smoke) {
            const k = (t * p.speed + p.phase) % 1;             // 0 = a la tuyere, 1 = dissipee
            const reach = k * p.dist;
            p.node.pos = [p.dir[0] * reach, p.y + k * k * p.rise, p.dir[1] * reach];
            p.node.scale = p.size * (0.3 + k * 1.8);
            p.node.alpha = hover * Math.sin(k * Math.PI) * 0.9;
          }
        },
      };
    }
  
    /* ── BOOSTER ── */
    function booster(renderer) {
      renderer.fov = 32;
      renderer.dist = 48;
      renderer.target = [0, 1, 0];
      renderer.pitch = 0.1;
  
      const root = new Node();
      root.add(new Node(holoBase(-13.5, 10), { layer: 'base' }));
      const planet = root.add(new Node(sphere(6.2, { lat: 8, lon: 16, segments: 44, w: 0.8, alpha: 0.85 }), { layer: 'decor' }));
      planet.pos = [-4, -6, 0];
      planet.rot = [0, 0, 0.35];
  
      const orbit = root.add(new Node(ring(10.5, { segments: 80, w: 1, alpha: 0.6 }), { layer: 'decor' }));
      orbit.pos = [-4, -6, 0];
      orbit.rot = [-0.38, 0, 0.3];
  
      const satellite = orbit.add(new Node([
        ...line([[-0.5, 0, 0], [0.5, 0, 0]], { w: 1.4, fx: true }),
        ...line([[0, -0.35, 0], [0, 0.35, 0]], { w: 1.4, fx: true }),
        ...ring(0.3, { segments: 10, w: 1.2, fx: true }),
      ], { layer: 'decor' }));
  
      const craft = root.add(new Node());
      craft.pos = [3.4, 4.6, 2];
      craft.rot = [0, 0.5, -0.6];
      craft.scale = 0.62;
      craft.add(rocketNode({ fins: false })).layer = 'model';
  
      const plumes = [];
      const corePlume = craft.add(new Node(plumeShape(0.3, 3.6), { layer: 'fx' }));
      corePlume.pos = [0, -0.46, 0];
      plumes.push(corePlume);
  
      for (const sx of [-1, 1]) {
        const b = craft.add(new Node([...lathe(BOOSTER, { meridians: 8, w: 0.9 }), ...lathe([[0.12, 0], [0.15, -0.15], [0.2, -0.35]], { meridians: 6, w: 0.8 })], { layer: 'model' }));
        b.pos = [sx * 0.9, 0.3, 0];
        craft.strokes.push(
          ...line([[sx * 0.6, 1.3, 0], [sx * 0.9, 1.3, 0]], { w: 0.8 }),
          ...line([[sx * 0.6, 4.9, 0], [sx * 0.9, 4.9, 0]], { w: 0.8 }),
        );
        const p = craft.add(new Node(plumeShape(0.18, 2.4), { layer: 'fx' }));
        p.pos = [sx * 0.9, -0.1, 0];
        plumes.push(p);
      }
  
      const home = [3.4, 4.6, 2];
      const axis = [Math.sin(0.6) * Math.cos(0.5), Math.cos(0.6), Math.sin(0.6) * Math.sin(0.5)];
  
      return {
        root,
        anchor: [3.4 + axis[0] * 6.7, 4.6 + axis[1] * 6.7, 2 + axis[2] * 6.7],
        update(t, hover) {
          renderer.yaw = Math.sin(t * 0.1) * 0.2;
          planet.rot = [0, t * 0.06, 0.35];
          const a = t * (0.4 + hover * 0.6);
          satellite.pos = [Math.cos(a) * 10.5, 0, Math.sin(a) * 10.5];
          const d = hover * 1.6 + Math.sin(t * 0.8) * 0.12;
          craft.pos = [home[0] + axis[0] * d, home[1] + axis[1] * d, home[2] + axis[2] * d];
          plumes.forEach((p, i) => (p.scale = (0.75 + hover * 0.8) * (i ? 0.9 : 1) * (0.95 + Math.sin(t * 26 + i) * 0.05)));
        },
      };
    }
  
    /* ── NITRO ── */
    function nitro(renderer) {
      renderer.fov = 34;
      renderer.dist = 27;
      renderer.target = [0, 0.5, 0];
      renderer.pitch = 0.23;
  
      const root = new Node();
      root.add(new Node(holoBase(-6.5, 7.5), { layer: 'base' }));
      const ship = root.add(new Node());
      ship.layer = 'model';
      ship.rot = [-Math.PI / 2 + 0.35, 0, 0];
  
      const hull = ship.add(new Node(lathe(FUSELAGE, { meridians: 12, w: 1.1 }), { layer: 'model' }));
      hull.scale = [1.25, 1, 0.52];
  
      const canopy = ship.add(new Node(lathe([[0.3, 4.2], [0.5, 4.8], [0.52, 5.5], [0.42, 6.2], [0.22, 6.8], [0, 7.1]], { meridians: 8, w: 0.9, alpha: 0.7 }), { layer: 'model' }));
      canopy.scale = [0.7, 1, 0.6];
      canopy.pos = [0, 0, 0.3];
  
      for (const sx of [-1, 1]) {
        ship.strokes.push(
          ...line([[sx * 1.1, 5.2, 0], [sx * 4.8, 1.2, 0], [sx * 4.8, 0.1, 0], [sx * 1.2, 0.5, 0]], { w: 1.1, closed: true }),
          ...line([[sx * 1.15, 3.8, 0], [sx * 4.8, 0.85, 0]], { w: 0.8 }),
          ...line([[sx * 1.2, 2.2, 0], [sx * 4.8, 0.45, 0]], { w: 0.8 }),
          ...line([[sx * 3, 3.15, 0], [sx * 3, 0.29, 0]], { w: 0.8 }),
        );
      }
      ship.strokes.push(...line([[0, 0.3, 0.45], [0, 2.8, 0.45], [0, 1, 1.8], [0, -0.2, 1.8]], { w: 1, closed: true }));
  
      const burn = [];
      const plumes = [];
      for (const nz of [{ x: 0, y: 0, r: 0.42, big: true }, { x: -2.2, y: -0.6, r: 0.34 }, { x: 2.2, y: -0.6, r: 0.34 }]) {
        const n = ship.add(new Node());
        n.layer = 'model';
        n.pos = [nz.x, nz.y, nz.x === 0 ? 0 : -0.15];
        if (nz.x !== 0) n.strokes.push(...lathe(NACELLE, { meridians: 8, w: 1 }));
        n.strokes.push(...lathe([[nz.r, 0], [nz.r * 0.86, -0.24], [nz.r * 1.12, -0.58]], { meridians: 6, w: 1, alpha: 0.85 }));
        [1.3, 2.4, 3.7].forEach((d, i) => {
          const r = n.add(new Node(ring(nz.r * 1.3 * [0.95, 0.8, 0.6][i], { segments: 24, w: 1.2, fx: true }), { layer: 'fx' }));
          r.pos = [0, -0.58 - d, 0];
          r.rot = [Math.PI / 2, 0, 0];
          burn.push(r);
        });
        const p = n.add(new Node(plumeShape(nz.r * 1.1, nz.big ? 5 : 3.8), { layer: 'fx' }));
        p.pos = [0, -0.58, 0];
        plumes.push(p);
      }
  
      const shock = ship.add(new Node([
        ...ring(0.9, { segments: 28, y: 8.6, w: 0.7, alpha: 0.3 }),
        ...ring(1.8, { segments: 28, y: 7.5, w: 0.7, alpha: 0.3 }),
        ...ring(2.6, { segments: 28, y: 6.2, w: 0.7, alpha: 0.3 }),
      ], { layer: 'fx' }));
  
      // Traînées d'hyper-vitesse : segments le long de Z, défilant vers la caméra
      const SPAN = 60;
      const streaks = root.add(new Node([], { layer: 'decor' }));
      for (let i = 0; i < 60; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 3 + Math.random() * 11;
        const z = -SPAN / 2 + Math.random() * SPAN;
        const len = 2 + Math.random() * 6;
        streaks.strokes.push(...line([[Math.cos(a) * r, Math.sin(a) * r * 0.6, z], [Math.cos(a) * r, Math.sin(a) * r * 0.6, z + len]], { w: 0.8, alpha: 0.35, fx: true }));
      }
  
      return {
        root,
        anchor: [0, 0, 9.4],
        update(t, hover) {
          renderer.yaw = -0.45 + Math.sin(t * 0.13) * 0.18;
          ship.pos = [(Math.random() - 0.5) * hover * 0.08, 0.5 + Math.sin(t * 0.9) * 0.15, (Math.random() - 0.5) * hover * 0.08];
          streaks.pos = [0, 0, ((t * (8 + hover * 46)) % SPAN) - SPAN / 2];
          burn.forEach((r, i) => (r.scale = 1 + 0.35 * (0.5 + 0.5 * Math.sin(t * (6 + hover * 10) - i * 0.9))));
          plumes.forEach((p, i) => (p.scale = (0.8 + hover * 0.9) * (0.95 + Math.sin(t * 30 + i) * 0.05)));
          shock.visible = true;
        },
      };
    }
  
    scope.SCENES = { starter, booster, nitro };
  })();


  /* ── élément <wire-rocket> ─────────────────────────────── */
  /**
   * <wire-rocket> — élément HTML natif autonome (Shadow DOM), sans framework.
   *
   * Usage :
   *   <script src="wire-rocket.js"></script>
   *   <wire-rocket tier="nitro" color="#ff4fd8" label="PROPULSION" value="NITRO 340 %" module="03 / 03"></wire-rocket>
   *
   * Attributs : tier (starter|booster|nitro), color, label, value, module, glow ("off" pour couper),
   *             boost ("on" pour forcer l'état survolé).
   * Propriété : el.boost = true/false — pilotable depuis l'extérieur (Vue, React, WordPress…).
   *
   * L'élément s'anime seul, se met en pause hors écran et respecte prefers-reduced-motion.
   */
  (() => {
    'use strict';
  
    const TEMPLATE = document.createElement('template');
    TEMPLATE.innerHTML = `
      <style>
        /* La page peut surcharger cette couleur (elle gagne sur :host) → le composant suit le thème */
        :host { position: relative; display: block; aspect-ratio: 400 / 420; color: #3ff0ff; contain: content; }
        canvas, svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
        svg { fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round;
              font-family: "JetBrains Mono", ui-monospace, Consolas, monospace; pointer-events: none; }
        text { fill: currentColor; stroke: none; }
        .back { opacity: .4; }
        .ring { stroke-width: .5; opacity: .6; }
        .dash { stroke-width: .6; stroke-dasharray: 1 5; }
        .cross { stroke-width: .6; }
        .corners { stroke-width: 1.2; opacity: .8; }
        .k { font-size: 7.5px; letter-spacing: .18em; opacity: .6; }
        .v { font-size: 11px; font-weight: 600; letter-spacing: .08em; }
        [data-layer][hidden] { display: none; }
      </style>
      <canvas part="canvas"></canvas>
      <svg viewBox="0 0 400 420" aria-hidden="true" part="hud">
        <g class="back" data-layer="ring">
          <circle class="ring" cx="200" cy="200" r="178"/>
          <circle class="dash" cx="200" cy="200" r="150"/>
          <path class="cross" d="M193 200h14M200 193v14"/>
        </g>
        <g data-layer="labels">
          <text class="k" x="18" y="30" data-label></text>
          <text class="v" x="18" y="45" data-value></text>
          <text class="k" x="382" y="30" text-anchor="end">MODULE</text>
          <text class="v" x="382" y="45" text-anchor="end" data-module></text>
        </g>
        <path class="corners" data-layer="overlay" d="M10 30V10H30M370 10H390V30M390 390V410H370M30 410H10V390"/>
      </svg>`;
  
    const lerp = (a, b, k) => a + (b - a) * k;
  
    class WireRocket extends HTMLElement {
      static observedAttributes = ['tier', 'color', 'label', 'value', 'module', 'glow', 'boost', 'paused'];
  
      #raf = 0;
      #hover = 0;
      #target = 0;
      #intro = 0;
      #t = 0;
      #last = 0;
      #visible = true;
      #mq = null;
  
      constructor() {
        super();
        this.attachShadow({ mode: 'open' }).append(TEMPLATE.content.cloneNode(true));
        this.canvas = this.shadowRoot.querySelector('canvas');
        this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      }
  
      connectedCallback() {
        const tier = this.getAttribute('tier') || 'starter';
        // Sans attribut `color`, on hérite de la couleur de la page → le composant suit son thème
        const color = this.#resolveColor();
        if (this.getAttribute('color')) this.style.color = color;
        this.renderer = new scope.WIRE.Renderer(this.canvas, { color });
        this.scene = scope.SCENES[tier](this.renderer);
        this.basePitch = this.renderer.pitch;
        this.#intro = this.reduced ? 1 : 0;
        this.#syncText();
  
        this.addEventListener('pointerenter', () => (this.boost = true));
        this.addEventListener('pointerleave', () => (this.boost = false));
  
        this.observer = new IntersectionObserver(([e]) => (this.#visible = e.isIntersecting));
        this.observer.observe(this);
  
        // Thème clair / sombre : piloté par la page (événement) ou par le système
        this.#mq = matchMedia('(prefers-color-scheme: light)');
        this.#mq.addEventListener('change', this.#applyTheme);
        addEventListener('themechange', this.#applyTheme);
        this.#applyTheme();
        addEventListener('layerchange', this.#applyLayers);
        this.#applyLayers();
        this.#last = performance.now();
        this.#loop(this.#last);
      }
  
      disconnectedCallback() {
        cancelAnimationFrame(this.#raf);
        this.observer?.disconnect();
        this.#mq?.removeEventListener('change', this.#applyTheme);
        removeEventListener('themechange', this.#applyTheme);
        removeEventListener('layerchange', this.#applyLayers);
      }
  
      attributeChangedCallback(name, _old, value) {
        if (!this.renderer) return;
        if (name === 'color') {
          this.renderer.color = value;
          this.style.color = value;
        } else if (name === 'glow') {
          this.renderer.glow = value !== 'off';
        } else if (name === 'boost') {
          this.#target = value === null || value === 'off' ? 0 : 1;
        } else {
          this.#syncText();
        }
      }
  
      #resolveColor() {
        return this.getAttribute('color') || getComputedStyle(this).color || '#3ff0ff';
      }
  
      /** Calques : le moteur pour ce qu'il peint, le Shadow DOM pour le HUD. */
      #applyLayers = (e) => {
        if (!this.renderer) return;
        const layers = e?.detail?.layers ?? window.LabLayers?.state() ?? {};
        this.renderer.layers = layers;
        for (const el of this.shadowRoot.querySelectorAll('[data-layer]')) {
          el.hidden = layers[el.dataset.layer] === false;
        }
      };
  
      #applyTheme = () => {
        if (!this.renderer) return;
        const t = document.documentElement.dataset.theme;
        this.renderer.light = t ? t === 'light' : matchMedia('(prefers-color-scheme: light)').matches;
        this.renderer.color = this.#resolveColor();
      };
  
      get boost() {
        return this.#target > 0.5;
      }
  
      set boost(v) {
        this.#target = v ? 1 : 0;
        this.dispatchEvent(new CustomEvent('boostchange', { detail: { boost: !!v } }));
      }
  
      #syncText() {
        const q = (sel) => this.shadowRoot.querySelector(sel);
        q('[data-label]').textContent = this.getAttribute('label') || '';
        q('[data-value]').textContent = this.getAttribute('value') || '';
        q('[data-module]').textContent = this.getAttribute('module') || '';
      }
  
      #loop = (now) => {
        this.#raf = requestAnimationFrame(this.#loop);
        const dt = Math.min(0.05, (now - this.#last) / 1000);
        this.#last = now;
        if (!this.#visible || this.hasAttribute('paused')) return;
  
        this.#t += dt;
        this.#hover = lerp(this.#hover, this.#target, 0.09);
        this.#intro = lerp(this.#intro, 1, 0.05);
        this.scene.update(this.#t, this.#hover, { x: 0, y: 0 });
        this.renderer.alpha = this.#intro;
        this.renderer.pitch = this.basePitch;
        this.scene.root.scale = 0.88 + 0.12 * this.#intro;
        this.renderer.draw(this.scene.root, { time: this.#t });
      };
    }
  
    customElements.define('wire-rocket', WireRocket);
  })();

})();
