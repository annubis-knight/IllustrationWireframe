/**
 * Primitives filaires : chaque fonction rend un tableau plat de segments [x1,y1,z1, x2,y2,z2, …]
 * prêt pour LineSegmentsGeometry (lignes épaisses, contrairement à GL_LINES limité à 1 px).
 *
 * Mêmes formes que le prototype 01 (révolution, sphère, treillis, polygones), mais gardées en 3D :
 * ici c'est le GPU qui projette, à chaque frame — donc rotation libre.
 */
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

export type Seg = number[];
export type Profile = [number, number][]; // [rayon, y]

const TAU = Math.PI * 2;

/** Ajoute un segment. */
const push = (out: Seg, a: THREE.Vector3, b: THREE.Vector3) => {
  out.push(a.x, a.y, a.z, b.x, b.y, b.z);
};

/** Polyligne → segments consécutifs. */
export function polyline(points: THREE.Vector3[], close = false): Seg {
  const out: Seg = [];
  for (let i = 1; i < points.length; i++) push(out, points[i - 1], points[i]);
  if (close && points.length > 2) push(out, points[points.length - 1], points[0]);
  return out;
}

/** Surface de révolution autour de Y : anneaux + méridiens. */
export function lathe(profile: Profile, { segments = 48, meridians = 12, rings }: { segments?: number; meridians?: number; rings?: number[] } = {}): Seg {
  const out: Seg = [];
  const at = (r: number, y: number, th: number) => new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r);

  for (const i of rings ?? profile.map((_, k) => k)) {
    const [r, y] = profile[i];
    if (r < 1e-3) continue;
    for (let k = 0; k < segments; k++) {
      push(out, at(r, y, (k / segments) * TAU), at(r, y, ((k + 1) / segments) * TAU));
    }
  }
  for (let m = 0; m < meridians; m++) {
    const th = (m / meridians) * TAU;
    for (let i = 1; i < profile.length; i++) {
      push(out, at(profile[i - 1][0], profile[i - 1][1], th), at(profile[i][0], profile[i][1], th));
    }
  }
  return out;
}

/** Sphère filaire (parallèles + méridiens). */
export function sphere(radius: number, { lat = 7, lon = 12, segments = 48 } = {}): Seg {
  const out: Seg = [];
  const at = (phi: number, th: number) =>
    new THREE.Vector3(Math.cos(phi) * Math.cos(th) * radius, Math.sin(phi) * radius, Math.cos(phi) * Math.sin(th) * radius);

  for (let i = 1; i <= lat; i++) {
    const phi = -Math.PI / 2 + (i / (lat + 1)) * Math.PI;
    for (let k = 0; k < segments; k++) push(out, at(phi, (k / segments) * TAU), at(phi, ((k + 1) / segments) * TAU));
  }
  for (let m = 0; m < lon; m++) {
    const th = (m / lon) * TAU;
    for (let k = 0; k < segments; k++) {
      push(out, at(-Math.PI / 2 + (k / segments) * Math.PI, th), at(-Math.PI / 2 + ((k + 1) / segments) * Math.PI, th));
    }
  }
  return out;
}

/** Cercle dans le plan XZ (orbite, anneau de post-combustion). */
export function ring(radius: number, segments = 64, y = 0): Seg {
  const out: Seg = [];
  const at = (th: number) => new THREE.Vector3(Math.cos(th) * radius, y, Math.sin(th) * radius);
  for (let k = 0; k < segments; k++) push(out, at((k / segments) * TAU), at(((k + 1) / segments) * TAU));
  return out;
}

/** Tour en treillis : 4 montants, ceintures et croisillons en X. */
export function truss(width: number, height: number, levels: number): Seg {
  const out: Seg = [];
  const h = width / 2;
  const c: [number, number][] = [[-h, -h], [h, -h], [h, h], [-h, h]];
  const P = (i: number, y: number) => new THREE.Vector3(c[i % 4][0], y, c[i % 4][1]);
  const dy = height / levels;

  for (let i = 0; i < 4; i++) push(out, P(i, 0), P(i, height));
  for (let f = 0; f < 4; f++) {
    push(out, P(f, 0), P(f + 1, 0));
    for (let l = 0; l < levels; l++) {
      const y0 = l * dy;
      const y1 = y0 + dy;
      push(out, P(f, y0), P(f + 1, y1));
      push(out, P(f + 1, y0), P(f, y1));
      push(out, P(f, y1), P(f + 1, y1));
    }
  }
  return out;
}

/** Grille circulaire au sol (plan XZ). */
export function grid(radius: number, step: number): Seg {
  const out: Seg = [];
  for (let a = -radius; a <= radius + 1e-9; a += step) {
    const b = Math.sqrt(Math.max(0, radius * radius - a * a));
    if (b < 1e-3) continue;
    push(out, new THREE.Vector3(a, 0, -b), new THREE.Vector3(a, 0, b));
    push(out, new THREE.Vector3(-b, 0, a), new THREE.Vector3(b, 0, a));
  }
  return out;
}

/** Fabrique un objet de lignes épaisses (largeur en pixels, indépendante de la distance). */
export function lines(segs: Seg, { color, width = 1.4, opacity = 1, additive = false, resolution }: { color: THREE.ColorRepresentation; width?: number; opacity?: number; additive?: boolean; resolution: THREE.Vector2 }): LineSegments2 {
  const geometry = new LineSegmentsGeometry();
  geometry.setPositions(segs);
  const material = new LineMaterial({
    color: new THREE.Color(color),
    linewidth: width,
    transparent: true,
    opacity,
    depthWrite: false,
    // Mélange normal pour la géométrie (sinon les croisements de lignes saturent en blanc),
    // additif réservé aux effets lumineux (anneaux, traînées).
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  material.resolution = resolution;
  // Rôle : permet de reteinter le bon matériau quand le thème change (cf. applyTheme dans main.ts)
  material.userData.role = new THREE.Color(color).getHex() === 0xffffff ? 'hot' : 'accent';
  material.userData.additive = additive;
  const mesh = new LineSegments2(geometry, material);
  mesh.computeLineDistances();
  return mesh;
}

/** Cône de plasma (panache de réacteur) : dégradé du blanc vers la couleur, additif. */
export function plume(radius: number, length: number, color: THREE.ColorRepresentation): THREE.Mesh {
  const geometry = new THREE.ConeGeometry(radius, length, 18, 6, true);
  geometry.translate(0, -length / 2, 0); // pointe vers -Y, base à l'origine (la tuyère)
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uTime: { value: 0 },
      uIntensity: { value: 1 },
      uDark: { value: 1 }, // 1 = cœur blanc incandescent (thème sombre), 0 = flamme à l'encre
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying float vLen;
      uniform float uTime;
      uniform float uIntensity;
      void main() {
        vUv = uv;
        // Étirement du panache + léger battement de flamme
        vec3 p = position;
        float wobble = sin(uTime * 22.0 + p.y * 3.0) * 0.04 * (1.0 - uv.y);
        p.y *= uIntensity;
        p.x += wobble;
        p.z += wobble;
        vLen = uv.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      varying float vLen;
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uDark;
      void main() {
        // vUv.y = 1 à la tuyère, 0 à la pointe
        float core = smoothstep(0.0, 1.0, vUv.y);
        float flicker = 0.88 + 0.12 * sin(uTime * 37.0 + vUv.y * 12.0);
        vec3 col = mix(uColor, vec3(1.0), core * core * uDark) * core * flicker;
        gl_FragColor = vec4(col, core * 0.3);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  material.userData.role = 'plume';
  return new THREE.Mesh(geometry, material);
}
