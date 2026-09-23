/**
 * Les 3 scènes (Starter / Booster / Nitro) en géométrie 3D réelle.
 *
 * Deux différences majeures avec le prototype 01 :
 *  - tout tourne en temps réel (la projection est faite par le GPU à chaque frame) ;
 *  - les lignes cachées sont vraiment masquées par des volumes noirs opaques (occludeurs),
 *    au lieu d'être calculées puis dessinées en pointillés.
 */
import * as THREE from 'three';
import { grid, lathe, lines, plume, polyline, ring, sphere, truss, type Profile, type Seg } from './wire';

export type Tier = 'starter' | 'booster' | 'nitro';

export interface SceneState {
  time: number;
  hover: number; // 0 → 1, lissé
  intro: number; // 0 → 1
  pointer: THREE.Vector2; // -1 → 1
}

export interface View {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  update(s: SceneState): void;
  /** Matériaux dont l'opacité est pilotée par l'intro (hors effets qui gèrent la leur). */
  materials: THREE.Material[];
  /** Point 3D auquel s'accroche l'étiquette HTML/SVG, reprojeté à chaque frame. */
  anchor: THREE.Object3D;
}

const BG = 0x02070e;
const WHITE = 0xffffff;

/* Profils partagés avec le prototype 01 (mêmes silhouettes) */
// Lanceur elance (rapport 1:9) : etage 1, interetage plus etroit, etage 2, coiffe
const BODY: Profile = [[0.56, 0], [0.6, 0.15], [0.6, 1.6], [0.6, 3.2], [0.6, 4.8], [0.6, 6.2]];
const INTER: Profile = [[0.6, 6.2], [0.54, 6.4], [0.54, 7], [0.6, 7.2]];
const UPPER: Profile = [[0.6, 7.2], [0.6, 8.3]];
const FAIRING: Profile = [[0.6, 8.3], [0.66, 8.55], [0.66, 9.2], [0.6, 9.7], [0.48, 10.1], [0.33, 10.45], [0.16, 10.7], [0, 10.8]];
const BELL: Profile = [[0.13, 0], [0.15, -0.1], [0.2, -0.26], [0.27, -0.46]];
const BOOSTER_BODY: Profile = [[0.26, 0], [0.3, 0.1], [0.3, 2.5], [0.3, 4.8], [0.26, 5.3], [0.18, 5.8], [0.08, 6.2], [0, 6.35]];
const FUSELAGE: Profile = [[0.78, 0], [0.92, 0.35], [1, 1.4], [1, 2.8], [0.92, 4.2], [0.78, 5.4], [0.6, 6.5], [0.42, 7.5], [0.24, 8.35], [0.08, 8.95], [0, 9.15]];
const NACELLE: Profile = [[0.42, 0], [0.55, 0.3], [0.58, 0.9], [0.58, 2.6], [0.5, 3.3], [0.34, 3.8], [0.12, 4.15], [0, 4.2]];

/** Volume noir opaque qui masque les lignes situées derrière (élimination des parties cachées). */
function occluder(profile: Profile, segments = 32): THREE.Mesh {
  const geometry = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.001), y)), segments);
  const material = new THREE.MeshBasicMaterial({ color: BG });
  material.userData.role = 'bg'; // suit la couleur de fond quand le thème change
  return new THREE.Mesh(geometry, material);
}

function occluderSphere(radius: number): THREE.Mesh {
  const material = new THREE.MeshBasicMaterial({ color: BG });
  material.userData.role = 'bg';
  return new THREE.Mesh(new THREE.SphereGeometry(radius * 0.99, 32, 24), material);
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Marque un objet pour le panneau CALQUES (model / decor / fx). */
function L<T extends THREE.Object3D>(obj: T, layer: string): T {
  obj.userData.layer = layer;
  return obj;
}

/** Socle holographique : anneaux concentriques + graduations, sous la scene. */
function holoBase(res: THREE.Vector2, color: number, y: number, r: number): THREE.Object3D {
  const segs: Seg = [...ring(r, 72, y), ...ring(r * 0.72, 64, y), ...ring(r * 0.44, 48, y)];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    segs.push(...polyline([V(Math.cos(a) * r, y, Math.sin(a) * r), V(Math.cos(a) * r * 1.06, y, Math.sin(a) * r * 1.06)]));
  }
  return L(lines(segs, { color, width: 1, opacity: 0.7, resolution: res }), 'base');
}

/** Lanceur complet (corps, coiffe, tuyere, ailerons) + son occludeur. */
function rocket(res: THREE.Vector2, color: number, { fins = true, engines = true, width = 1.1 } = {}) {
  const g = new THREE.Group();
  const segs: Seg = [...lathe(BODY, { meridians: 8 }), ...lathe(INTER, { meridians: 8 }), ...lathe(UPPER, { meridians: 8 }), ...lathe(FAIRING, { meridians: 8 })];

  // Grappe de 4 moteurs sous la jupe
  if (engines) {
    for (let k = 0; k < 4; k++) {
      const th = (Math.PI / 4) + (k * Math.PI) / 2;
      const dx = Math.cos(th) * 0.3;
      const dz = Math.sin(th) * 0.3;
      segs.push(...lathe(BELL, { meridians: 6 }).map((v2, i) => (i % 3 === 0 ? v2 + dx : i % 3 === 2 ? v2 + dz : v2)));
    }
  }
  // Ailerons, alignes sur les axes (entre les moteurs)
  if (fins) {
    for (let k = 0; k < 4; k++) {
      const th = (k * Math.PI) / 2;
      const c = Math.cos(th);
      const s = Math.sin(th);
      const q = (r: number, y: number) => V(r * c, y, r * s);
      segs.push(...polyline([q(0.6, 1.7), q(1.45, 0.35), q(1.45, -0.35), q(0.6, 0.05)], true), ...polyline([q(0.6, 0.9), q(1.45, 0.1)]));
    }
  }
  const body = lines(segs, { color, width, resolution: res });
  g.add(occluder([...BODY, ...INTER, ...UPPER, ...FAIRING]), body);
  return { group: L(g, 'model'), materials: [body.material] };
}

/** Nuage de decollage : bouffees spheriques autour du pas de tir, deployees au survol. */
function smoke(res: THREE.Vector2, color: number, parent: THREE.Object3D, count = 12) {
  const puffs: { obj: THREE.Object3D; mat: THREE.Material; dir: THREE.Vector2; d: number; y: number; phase: number }[] = [];
  for (let i = 0; i < count; i++) {
    const a = i * 2.39996;                       // angle d'or : repartition reguliere
    const d = 1.2 + (i / count) * 2.6;
    const r = 0.5 + (i % 3) * 0.22;
    const obj = L(lines(sphere(r, { lat: 2, lon: 4, segments: 10 }), { color, width: 0.6, opacity: 0, resolution: res }), 'fx');
    obj.position.set(Math.cos(a) * d, 0.5 + (i % 2) * 0.35, Math.sin(a) * d);
    parent.add(obj);
    puffs.push({ obj, mat: obj.material as THREE.Material, dir: new THREE.Vector2(Math.cos(a), Math.sin(a)), d, y: obj.position.y, phase: (i % 5) / 5 });
  }
  return puffs;
}

/* ── STARTER ───────────────────────────────────────────────────────────── */
function starter(res: THREE.Vector2, color: number): View {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  camera.position.set(1.5, 11, 44);
  camera.lookAt(0, 5.6, 0);

  const root = new THREE.Group();
  scene.add(root);
  const materials: THREE.Material[] = [];
  const add = (segs: Seg, opts: Parameters<typeof lines>[1]) => {
    const l = lines(segs, opts);
    materials.push(l.material);
    root.add(l);
    return l;
  };

  root.add(holoBase(res, color, -0.5, 5.4));
  L(add(grid(7.5, 0.75), { color, width: 0.8, opacity: 0.35, resolution: res }), 'decor');
  L(add([...lathe([[3.6, 0], [3.6, 0.38], [2.6, 0.38], [1.45, 0.38]], { meridians: 28 }), ...lathe([[0.85, 0.95], [0.85, 1.18]], { meridians: 16 })], { color, width: 1, opacity: 0.8, resolution: res }), 'model');

  const craft = rocket(res, color);
  craft.group.position.y = 1.2;
  materials.push(...craft.materials);
  root.add(craft.group);

  // Tour ombilicale + bras : ici la rétractation est une simple rotation 3D (en SVG il fallait morpher le tracé)
  const tower = new THREE.Group();
  tower.position.set(3.1, 0.38, -1.4);
  const towerLines = lines(truss(1.3, 12, 9), { color, width: 0.9, opacity: 0.85, resolution: res });
  materials.push(towerLines.material);
  tower.add(L(towerLines, 'model'));
  root.add(tower);

  const arms: THREE.Group[] = [];
  for (const y of [9, 5]) {
    const pivot = new THREE.Group();
    pivot.position.set(3.1, y, -1.4);
    const dir = new THREE.Vector3(-3.1, 0, 1.4).normalize();
    const end = dir.clone().multiplyScalar(2.3);
    const segs: Seg = [];
    for (const dy of [0.2, -0.2]) segs.push(...polyline([V(dir.x * 0.65, dy, dir.z * 0.65), V(end.x, dy, end.z)]));
    for (let i = 0; i < 6; i++) {
      const a = 0.65 + (i / 6) * 1.65;
      const b = 0.65 + ((i + 1) / 6) * 1.65;
      segs.push(...polyline([V(dir.x * a, i % 2 ? 0.2 : -0.2, dir.z * a), V(dir.x * b, i % 2 ? -0.2 : 0.2, dir.z * b)]));
    }
    const l = lines(segs, { color, width: 0.8, resolution: res });
    materials.push(l.material);
    pivot.add(L(l, 'model'));
    root.add(pivot);
    arms.push(pivot);
  }

  const puffs = smoke(res, color, root);

  const flame = L(plume(0.32, 3.6, color), 'fx');
  flame.position.y = 0.38;
  flame.scale.setScalar(0.001);
  root.add(flame);
  const flameMat = flame.material as THREE.ShaderMaterial;

  const anchor = new THREE.Object3D(); // pointe de la coiffe
  anchor.position.set(0, 12, 0);
  root.add(anchor);

  return {
    scene,
    camera,
    materials,
    anchor,
    update({ time, hover, intro, pointer }) {
      root.rotation.y = 0.35 + Math.sin(time * 0.12) * 0.22 + pointer.x * 0.3;
      root.rotation.x = -0.04 + pointer.y * 0.06;
      root.position.y = Math.sin(time * 0.7) * 0.18;
      root.scale.setScalar(0.85 + 0.15 * intro);
      arms.forEach((a, i) => (a.rotation.y = -hover * (1.1 + i * 0.1)));
      flame.scale.setScalar(Math.max(0.001, hover * intro));
      flameMat.uniforms.uTime.value = time;
      flameMat.uniforms.uIntensity.value = 0.6 + hover * 0.6;
      // Le nuage s'ouvre depuis le pas de tir, chaque bouffee a son propre souffle
      for (const p of puffs) {
        const g2 = Math.min(1, hover * (0.55 + p.phase * 0.9));
        (p.mat as any).opacity = g2 * 0.32 * intro;
        const spread = p.d * (0.55 + g2 * 0.9);
        p.obj.position.set(p.dir.x * spread, p.y + g2 * 0.9, p.dir.y * spread);
        p.obj.scale.setScalar(0.4 + g2 * 1.1 + Math.sin(time * 1.6 + p.phase * 6) * 0.06 * g2);
      }
    },
  };
}

/* ── BOOSTER ───────────────────────────────────────────────────────────── */
function booster(res: THREE.Vector2, color: number): View {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 400);
  camera.position.set(0, 2, 46);
  camera.lookAt(0, 1, 0);

  const root = new THREE.Group();
  scene.add(root);
  const materials: THREE.Material[] = [];

  root.add(holoBase(res, color, -13.5, 10));
  // Planete : sphere noire opaque + filaire par-dessus → les lignes du fond sont masquées
  const planet = new THREE.Group();
  planet.position.set(-4, -6, 0);
  planet.rotation.z = 0.35;
  const planetLines = lines(sphere(6.2, { lat: 9, lon: 18, segments: 64 }), { color, width: 0.9, opacity: 0.85, resolution: res });
  materials.push(planetLines.material);
  planet.add(L(occluderSphere(6.2), 'decor'), L(planetLines, 'decor'));
  root.add(planet);

  const orbit = new THREE.Group();
  orbit.position.copy(planet.position);
  orbit.rotation.set(-0.38, 0, 0.3);
  const orbitLines = lines(ring(10.5, 96), { color, width: 1.2, opacity: 0.7, resolution: res });
  materials.push(orbitLines.material);
  orbit.add(L(orbitLines, 'decor'));
  const satMat = new THREE.MeshBasicMaterial({ color: WHITE });
  satMat.userData.role = 'hot';
  const satellite = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), satMat);
  orbit.add(L(satellite, 'decor'));
  root.add(orbit);

  // Lanceur + 2 boosters latéraux
  const craft = new THREE.Group();
  craft.position.set(3.4, 4.6, 2);
  craft.rotation.set(0, 0.5, -0.6);
  craft.scale.setScalar(0.62);
  const core = rocket(res, color, { fins: false });
  materials.push(...core.materials);
  craft.add(core.group);

  const plumes: THREE.Mesh[] = [];
  const addPlume = (x: number, y: number, radius: number, length: number) => {
    const p = L(plume(radius, length, color), 'fx');
    p.position.set(x, y, 0);
    craft.add(p);
    plumes.push(p);
  };
  addPlume(0, -0.46, 0.3, 4);
  for (const sx of [-1, 1]) {
    const b = new THREE.Group();
    b.position.set(sx * 0.9, 0.3, 0);
    const bl = lines([...lathe(BOOSTER_BODY, { meridians: 8 }), ...lathe([[0.12, 0], [0.15, -0.15], [0.2, -0.35]], { meridians: 6 })], { color, width: 1.1, resolution: res });
    materials.push(bl.material);
    b.add(L(occluder(BOOSTER_BODY), 'model'), L(bl, 'model'));
    craft.add(b);
    const struts = lines([...polyline([new THREE.Vector3(sx * 0.6, 1.3, 0), new THREE.Vector3(sx * 0.9, 1.3, 0)]), ...polyline([new THREE.Vector3(sx * 0.6, 4.9, 0), new THREE.Vector3(sx * 0.9, 4.9, 0)])], { color, width: 0.9, resolution: res });
    materials.push(struts.material);
    craft.add(L(struts, 'model'));
    addPlume(sx * 0.9, -0.1, 0.18, 2.6);
  }
  root.add(craft);

  const axis = new THREE.Vector3(0, 1, 0).applyEuler(craft.rotation);
  const home = craft.position.clone();

  const anchor = new THREE.Object3D(); // pointe du lanceur
  anchor.position.set(0, 10.8, 0);
  core.group.add(anchor);

  return {
    scene,
    camera,
    materials,
    anchor,
    update({ time, hover, intro, pointer }) {
      root.rotation.y = Math.sin(time * 0.1) * 0.18 + pointer.x * 0.25;
      root.rotation.x = pointer.y * 0.05;
      root.scale.setScalar(0.88 + 0.12 * intro);
      planet.rotation.y = time * 0.05;
      orbit.rotation.y = time * 0.04;

      const a = time * (0.35 + hover * 0.5);
      satellite.position.set(Math.cos(a) * 10.5, 0, Math.sin(a) * 10.5);
      satellite.rotation.set(a, a * 0.7, 0);

      craft.position.copy(home).addScaledVector(axis, hover * 1.6 + Math.sin(time * 0.8) * 0.12);
      plumes.forEach((p, i) => {
        const m = p.material as THREE.ShaderMaterial;
        m.uniforms.uTime.value = time;
        m.uniforms.uIntensity.value = (0.8 + hover * 0.8) * intro * (i === 0 ? 1 : 0.9);
      });
    },
  };
}

/* ── NITRO ─────────────────────────────────────────────────────────────── */
function nitro(res: THREE.Vector2, color: number): View {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 300);
  camera.position.set(0, 6, 26);
  camera.lookAt(0, 0, 0);

  const root = new THREE.Group();
  scene.add(root);
  const materials: THREE.Material[] = [];

  root.add(holoBase(res, color, -6.5, 7.5));
  // Vaisseau : nez vers +Y local, aplati sur Z, puis couche vers le spectateur
  const ship = new THREE.Group();
  ship.rotation.set(-Math.PI / 2 + 0.35, 0, 0);
  ship.position.y = 0.5;

  const hull = new THREE.Group();
  hull.scale.set(1.25, 1, 0.52);
  const hullLines = lines(lathe(FUSELAGE, { meridians: 14 }), { color, width: 1.3, resolution: res });
  materials.push(hullLines.material);
  hull.add(L(occluder(FUSELAGE), 'model'), L(hullLines, 'model'));
  ship.add(hull);
  ship.position.z = -1;

  const canopy = new THREE.Group();
  canopy.scale.set(0.7, 1, 0.6);
  canopy.position.z = 0.3;
  const canopyLines = lines(lathe([[0.3, 4.2], [0.5, 4.8], [0.52, 5.5], [0.42, 6.2], [0.22, 6.8], [0, 7.1]], { meridians: 8 }), { color: WHITE, width: 1, opacity: 0.5, resolution: res });
  materials.push(canopyLines.material);
  canopy.add(L(canopyLines, 'model'));
  ship.add(canopy);

  const wingSegs: Seg = [];
  for (const sx of [-1, 1]) {
    wingSegs.push(
      ...polyline([V(sx * 1.1, 5.2, 0), V(sx * 4.8, 1.2, 0), V(sx * 4.8, 0.1, 0), V(sx * 1.2, 0.5, 0)], true),
      ...polyline([V(sx * 1.15, 3.8, 0), V(sx * 4.8, 0.85, 0)]),
      ...polyline([V(sx * 1.2, 2.2, 0), V(sx * 4.8, 0.45, 0)]),
      ...polyline([V(sx * 3, 3.15, 0), V(sx * 3, 0.29, 0)]),
    );
  }
  wingSegs.push(...polyline([V(0, 0.3, 0.45), V(0, 2.8, 0.45), V(0, 1, 1.8), V(0, -0.2, 1.8)], true));
  const wings = lines(wingSegs, { color, width: 1.3, resolution: res });
  materials.push(wings.material);
  ship.add(L(wings, 'model'));

  // 3 réacteurs : nacelles, tuyères, anneaux de post-combustion, panaches
  const burnRings: THREE.Object3D[] = [];
  const plumes: THREE.Mesh[] = [];
  for (const nz of [{ x: 0, y: 0, z: 0, r: 0.42 }, { x: -2.2, y: -0.6, z: -0.15, r: 0.34 }, { x: 2.2, y: -0.6, z: -0.15, r: 0.34 }]) {
    const n = new THREE.Group();
    n.position.set(nz.x, nz.y, nz.z);
    if (nz.x !== 0) {
      const nl = lines(lathe(NACELLE, { meridians: 10 }), { color, width: 1.1, resolution: res });
      materials.push(nl.material);
      n.add(L(occluder(NACELLE), 'model'), L(nl, 'model'));
    }
    const nozzle = lines(lathe([[nz.r, 0], [nz.r * 0.86, -0.24], [nz.r * 1.12, -0.58]], { meridians: 8 }), { color: WHITE, width: 1.2, opacity: 0.8, resolution: res });
    materials.push(nozzle.material);
    n.add(L(nozzle, 'model'));

    [1.3, 2.4, 3.7].forEach((d, i) => {
      // Anneaux de post-combustion : opacité pulsée dans update() → hors de `materials`
      const r = lines(ring(nz.r * 1.3 * [0.95, 0.8, 0.6][i], 32), { color, width: 1.4, additive: true, resolution: res });
      r.rotation.x = Math.PI / 2;
      r.position.y = -0.58 - d;
      n.add(L(r, 'fx'));
      burnRings.push(r);
    });

    const p = L(plume(nz.r * 1.05, nz.x === 0 ? 5 : 3.8, color), 'fx');
    p.position.y = -0.58;
    n.add(p);
    plumes.push(p);
    ship.add(n);
  }

  // Cône d'onde de choc devant le nez
  const shock = lines([...ring(0.9, 40, 8.6), ...ring(1.8, 40, 7.5), ...ring(2.6, 40, 6.2)], { color, width: 0.9, opacity: 0.35, resolution: res });
  materials.push(shock.material);
  ship.add(L(shock, 'fx'));
  root.add(ship);

  // Traînées d'hyper-vitesse : segments qui défilent le long de l'axe de vol
  const streakGroup = new THREE.Group();
  const streakSegs: Seg = [];
  const SPAN = 60;
  for (let i = 0; i < 70; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 3 + Math.random() * 12;
    const z = -SPAN / 2 + Math.random() * SPAN;
    const len = 2 + Math.random() * 6;
    streakSegs.push(Math.cos(a) * r, Math.sin(a) * r * 0.6, z, Math.cos(a) * r, Math.sin(a) * r * 0.6, z + len);
  }
  // Opacité pilotée dans update() → hors de `materials`
  const streaks = lines(streakSegs, { color: WHITE, width: 1, opacity: 0.35, additive: true, resolution: res });
  streakGroup.add(L(streaks, 'decor'));
  root.add(streakGroup);

  const anchor = new THREE.Object3D(); // nez du vaisseau
  anchor.position.set(0, 9.15, 0);
  ship.add(anchor);

  return {
    scene,
    camera,
    materials,
    anchor,
    update({ time, hover, intro, pointer }) {
      root.rotation.y = -0.5 + Math.sin(time * 0.13) * 0.2 + pointer.x * 0.3;
      root.rotation.x = 0.1 + pointer.y * 0.06;
      root.scale.setScalar(0.9 + 0.1 * intro);
      ship.position.y = 0.5 + Math.sin(time * 0.9) * 0.15 + (Math.random() - 0.5) * hover * 0.06;
      ship.position.x = (Math.random() - 0.5) * hover * 0.06;

      const speed = 8 + hover * 46;
      streakGroup.position.z = (streakGroup.position.z + speed * 0.016) % SPAN;
      (streaks.material as THREE.Material).opacity = (0.2 + hover * 0.5) * intro;

      burnRings.forEach((r, i) => {
        const k = 0.6 + 0.4 * Math.sin(time * (6 + hover * 10) - i * 0.9);
        r.scale.setScalar(1 + (1 - k) * 0.5);
        ((r as any).material as THREE.Material).opacity = k * intro;
      });
      plumes.forEach((p) => {
        const m = p.material as THREE.ShaderMaterial;
        m.uniforms.uTime.value = time;
        m.uniforms.uIntensity.value = (0.9 + hover * 0.9) * intro;
      });
    },
  };
}

export const BUILDERS: Record<Tier, (res: THREE.Vector2, color: number) => View> = {
  starter,
  booster,
  nitro,
};
