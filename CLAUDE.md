# IllustrationWireframe — Lab comparatif

## Quoi

Lab d'expérimentation **autonome** : une même section d'offres au style « Wireframe 3D /
HUD Sci-Fi » (Starter / Booster / Nitro), réalisée avec **une technologie par sous-dossier**,
pour comparer rendu, poids, performances et facilité de production.

Voir [README.md](README.md) pour le comparatif mesuré et la recommandation.

## ⚠️ Dépôt Git — à lire avant toute commande git

Ce projet a **son propre dépôt** : https://github.com/annubis-knight/IllustrationWireframe

Il se trouve physiquement dans `Propulsite/3_PRODUCT_TECH/BizOps/`, qui appartient au dépôt
**Structure_OPS** (le template de structure Ops). Les deux n'ont **aucun rapport fonctionnel** :

- le `.gitignore` de Structure_OPS ignore ce dossier via la règle `[0-9]_*/*/*/` ;
- ne jamais committer quoi que ce soit d'ici vers Structure_OPS ;
- si `git rev-parse --show-toplevel` répond `…/Propulsite`, c'est qu'on est hors du dépôt
  du lab (cas impossible ici, ce dossier a son propre `.git`).

## Structure

```
index.html          dashboard comparatif (ouvrable aussi en file://)
01-svg-gsap/        SVG inline + GSAP — 3D pré-calculée en Node
02-threejs-r3f/     Three.js / WebGL temps réel (build Vite → dist/)
03-canvas-glsl/     Canvas 2D, projection 3D maison, zéro dépendance
04-spline-web/      Web Component <wire-rocket> + emplacement Spline
_shared/            habillage des cartes, thème clair/sombre, compteur FPS
tools/              serveur statique, banc de mesure, verify
```

## Commandes

```bash
npm run dev       # dashboard + démos → http://localhost:4600/
npm run verify    # régénère les artefacts puis vérifie les 4 démos (0 erreur, image animée)
npm run measure   # poids, FPS et captures → tools/results.json + _shared/results.js
npm run build:02  # build Vite du prototype Three.js
npm run svg:build # régénère les SVG du prototype 01
npm run bundle:04 # réassemble le Web Component
```

## Conventions du lab

- **Design identique dans les 4 démos** (`_shared/offers.css`) : seule la zone d'illustration
  change, sinon la comparaison ne vaut rien.
- **Deux thèmes** : sombre = hologramme néon, clair = plan technique à l'encre. Toute nouvelle
  couleur passe par un jeton CSS, jamais en dur (les démos Canvas/WebGL lisent ces jetons).
- **Toute mesure citée vient de `npm run measure`** (médiane de 3 relevés), jamais d'une
  estimation. Si un chiffre change, relancer le banc et mettre à jour les README.
- Les prix et contenus des offres sont **fictifs**.
