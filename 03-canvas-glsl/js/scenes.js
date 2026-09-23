/**
 * Les 3 scènes du prototype 03, construites avec le moteur de js/engine.js.
 * Mêmes profils et mêmes compositions que les prototypes 01 et 02 — seul le rendu change.
 */
(() => {
  'use strict';
  const { Node, lathe, sphere, ring, line, truss, grid } = window.WIRE;

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

  window.SCENES = { starter, booster, nitro };
})();
