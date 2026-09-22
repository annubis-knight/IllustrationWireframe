# IllustrationWireframe · Lab comparatif

Monorepo d'expérimentation : **une section d'offres interactive au style « Wireframe 3D / HUD Sci-Fi »** (lignes néon filaires, glow, éléments transparents façon plan d'aérospatiale), réalisée avec **une technologie par sous-dossier** pour comparer rendu, poids, performances et facilité de production.

Thème commun, 3 états d'une fusée :

| Offre | Visuel |
|---|---|
| **Starter** | Base de lancement / pas de tir filaire |
| **Booster** | Fusée en vol / mise en orbite |
| **Nitro** | Vaisseau 2.0 en hyper-vitesse, réacteurs dopés |

## Démarrer

```bash
npm install          # outillage du lab (playwright-core)
npm run dev          # dashboard + démos → http://localhost:4600/
npm run verify       # régénère ce qui est généré, puis vérifie que les 4 démos s'affichent sans erreur
npm run measure      # poids, FPS et captures des 4 démos
npm run build:02     # build Vite du prototype Three.js (nécessaire une fois)
npm run svg:build    # régénère les SVG du prototype 01
npm run bundle:04    # réassemble le Web Component
```

Le dashboard [`index.html`](index.html) s'ouvre aussi directement en `file://`. Il liste les 4 démos, affiche les métriques mesurées et propose une vue **côte à côte** (4 iframes miniatures).

## Structure

```
IllustrationWireframe/
├── index.html            dashboard du lab
├── 01-svg-gsap/          ✅ SVG inline + GSAP (3D pré-calculée en Node → SVG 2D)
├── 02-threejs-r3f/       ✅ Three.js / WebGL temps réel (bloom, occludeurs)
├── 03-canvas-glsl/       ✅ Canvas 2D, projection 3D maison, zéro dépendance
├── 04-spline-web/        ✅ Web Component <wire-rocket> (+ emplacement Spline)
├── _shared/
│   ├── offers.css        habillage commun des cartes (design identique partout)
│   ├── perf-hud.js       compteur FPS commun (touche P) + API lue par le banc
│   └── results.js        résultats générés par npm run measure (lus par le dashboard)
└── tools/
    ├── serve.mjs         serveur statique sans dépendance
    ├── verify.mjs        contrôle que les 4 démos se chargent, s'animent et n'erreurent pas
    └── measure.mjs       banc de mesure (Playwright + Chrome/Edge installés)
```

Les 4 démos partagent **le même habillage de cartes, le même contenu et les mêmes formes** : seule la technologie de rendu de l'illustration change.

Chaque démo a son `README.md` : rendu obtenu, poids / FPS, facilité d'animation et de personnalisation.

## Comparatif mesuré

| | 01 SVG + GSAP | 02 Three.js | 03 Canvas 2D | 04 Web Component |
|---|---|---|---|---|
| Poids prod (gzip) | 71 Ko (dont GSAP 37) | **151 Ko** | **16 Ko** | 18 Ko (composant seul : 9,3) |
| FPS repos | 58,7 (1 % low 30) | **59,9** (low 59) | **59,9** (low 59) | 59,4 (low 59) |
| FPS survol des 3 cartes | 45,2 | **59,9** | 58,9 | 59,9 |
| FPS CPU ×4 (≈ mobile) | 27,7 | **49,9** | 21,6 | 28,7 |
| Sans glow / bloom | 59,9 | 59,7 | 59,9 | — |
| Vraie 3D temps réel | ✗ (angle figé au build) | ✓ | ✓ | ✓ |
| Lignes cachées | pointillés (calculés) | masquées (profondeur) | pointillés (calculés) | pointillés (calculés) |
| Visible sans JS / indexable | **✓** | ✗ | ✗ | ✗ |
| Édition visuelle sans code | ✗ | ✗ | ✗ | ✗ (Spline le permettrait) |
| Distribution | markup dans la page | bundle + build | 3 fichiers JS | **1 fichier, 1 tag** |

### Ce que les mesures disent

1. **Le glow SVG coûte plus cher que la 3D WebGL.** Le prototype 01 perd 15 fps dès que les 3 cartes sont survolées (45 fps), et retrouve 60 fps réguliers une fois les filtres coupés. Three.js, lui, ne bouge pas — le GPU absorbe tout.
2. **Le plus léger n'est pas le plus fluide.** Le Canvas 2D tient 60 fps sur desktop avec 16 Ko, mais tombe à 22 fps quand le CPU est ralenti ×4 : tout le travail de projection est sur le processeur.
3. **Le plus lourd est le plus robuste.** Three.js coûte 151 Ko mais reste à 50 fps en mobile simulé, là où les trois autres sont entre 22 et 29.
4. **Un seul candidat survit sans JavaScript** : le SVG du prototype 01, qui reste visible et indexable — un argument de poids pour une section d'offres commerciale.

### Recommandation pour une section d'offres PropulSite

- **Site vitrine classique, priorité SEO et légèreté** → prototype **01 (SVG + GSAP)**, en allégeant le glow (filtre au survol uniquement, ou halo par doublage de tracé comme en 03).
- **Effet « waouh » assumé, page de vente ou landing premium** → prototype **02 (Three.js)**, avec une image de repli pour le SSR et les machines sans GPU.
- **Réutilisation sur plusieurs sites clients / WordPress** → prototype **04 (`<wire-rocket>`)** : un fichier de 9,3 Ko, aucun build, aucun conflit CSS.
- **Spline** reste pertinent si tu veux *éditer visuellement* les scènes : c'est le seul chemin sans code, mais il demande ton compte et pèse 1 à 3 Mo.

### Protocole de mesure

`tools/measure.mjs` ouvre chaque démo dans un Chrome headless neuf (cache vide), piloté par Playwright : viewport 1440×1000, DPR 1, intro laissée se jouer 4 s, puis FPS relevés sur 5 s via `_shared/perf-hud.js` dans 4 cas : **repos**, **boost** (survol forcé des 3 cartes), **CPU ralenti ×4** (throttling CDP, proxy d'un mobile milieu de gamme), **sans glow**. Le poids vient de la Resource Timing API (non compressé en dev, hors webfonts cross-origin). Le GPU utilisé est reporté dans les résultats (actuellement iGPU AMD Radeon 660M via ANGLE D3D11).

> Ces valeurs servent à **comparer les démos entre elles** dans les mêmes conditions, pas à fixer une vérité absolue. Pour du réel mobile, ouvrir la démo sur un téléphone avec la touche P / le HUD de perf.

## Pistes non testées (hors périmètre, à garder en tête)

- **Rive** (state machine vectorielle, runtime ~100-150 Ko) : très fort pour les interactions complexes, mais les animations se font dans l'éditeur Rive. Pertinent si un motion designer produit les états.
- **Lottie** : export JSON After Effects, bien pour une boucle passive, faible pour l'interactivité fine.
- **TresJS** : l'équivalent Vue / Nuxt de React Three Fiber, à envisager pour porter le prototype 02 dans la stack PropulSite.

## Notes

- **Spline n'a pas pu être testé en conditions réelles** : le format `.splinecode` est propriétaire et sans API d'écriture publique, une scène ne peut être créée que dans l'éditeur Spline (compte requis). Le prototype 04 contient l'emplacement d'intégration prêt à recevoir une URL d'export — voir son README.
- Les contenus et prix des offres sont **fictifs** (placeholders de démo).
- Le banc utilise **Playwright et non Puppeteer** : sur ce poste, l'extension Cold Turkey ferme les instances Chrome qui ne l'ont pas installée, et puppeteer perdait ses pages au bout de quelques secondes.
