# Banc de layouts — une offre à la fois

Les quatre prototypes comparent des **technologies**. Cette page compare des **partis pris de
mise en page** : une seule offre à l'écran, et onze façons différentes de passer de l'une à l'autre.

Elle se lit en deux familles :

1. **01 → 06** — le visuel et le texte **partagent un conteneur** : ils sont voisins.
2. **07 → 11** — le visuel passe **en fond de section** et la définition de l'offre flotte
   au-dessus. C'est là que se joue la profondeur.

![Hublot](../docs/layout-porthole.png)

## Lancer

```bash
npm run dev    # → http://localhost:4600/test-layout/
```

Ou double-clic sur `index.html`. Aucune compilation.

## Pourquoi le SVG

Tous les layouts utilisent **le visuel du prototype 01** (SVG inline + GSAP), volontairement :
c'est la technologie la plus simple du lab — pas de build, pas de contexte WebGL, un simple
markup qu'on injecte. Comme on peut afficher onze sections en même temps, c'était aussi la moins
risquée pour la fluidité. Les trois visuels viennent de `js/svg-data.js`, généré par le
prototype 01 : une seule source, aucun doublon.

## Une section prend toute la largeur

Aucune section n'est bridée par une largeur de page : la bordure, le fond et le visuel vont
d'un bord à l'autre de l'écran. Ce sont les **blocs à l'intérieur** (colonne de texte à 62 ch,
carte, panneau, grille de specs) qui se limitent, là où la lecture l'exige.

Le dock d'outils passe **par-dessus** la page plutôt que de lui manger une colonne. Il s'estompe
au repos, et les layouts ne décalent leur contenu vers la gauche que si l'écran ne laisse pas
la place de passer à côté (`--dock-clear` dans `css/style.css`, nul au-delà de ~1780 px).

## Rien ne démarre tout seul

C'est la règle de la page. Chaque section est **en veille** au chargement : ni visuel injecté,
ni animation, ni timeline. Un clic sur **Lancer** la réveille, **Éteindre** libère tout
(timelines tuées, écouteurs de parallaxe retirés, DOM vidé — vérifié : plus aucune animation
dans GSAP après extinction). Une section sortie de l'écran met ses boucles en pause.

Concrètement, la page se charge avec **0 SVG monté** et n'anime que ce qu'on lui demande.

## Famille 1 — le visuel à côté du texte

| # | Layout | Sélection | Ce qu'on teste |
|---|---|---|---|
| 01 | Deux colonnes | Onglets segmentés | La valeur sûre : lecture immédiate, comparaison facile, zéro surprise |
| 02 | Hero centré | Ascenseur d'étages (1·2·3) | Le visuel domine ; la montée en gamme se lit comme une trajectoire |
| 03 | Immersif | Carrousel : paire de flèches sous le texte, points, clavier ←/→ | Spectaculaire, mais le texte se bat contre l'image |
| 04 | Fiche technique | Explorateur de modules avec prix | Pour l'acheteur qui compare : rationnel, dense, peu émotionnel |
| 05 | Pile de cartes | Clic sur une carte du fond | Garde le choix sous les yeux sans afficher trois blocs complets |
| 06 | Levier de poussée | Curseur 1 → 3 + jauge | La sélection devient un geste ; ludique, très thématique, à valider avec de vrais visiteurs |

## Famille 2 — le visuel en fond, l'offre au-dessus

Même matière, mais le visuel n'est plus un bloc voisin : c'est le **décor**. Chaque layout
répond alors à la même question — *comment poser du texte sur une image sans la tuer ?* — avec
un outil de profondeur différent.

| # | Layout | Profondeur | Sélection | Ce qu'on teste |
|---|---|---|---|---|
| 07 | Poste de pilotage | Parallaxe inversée : le fond suit la souris, le panneau résiste | Trois interrupteurs à bascule | La plus sage des cinq : le texte garde son bloc, le décor respire derrière |
| 08 | Typographie évidée | Les lettres **fusionnent** avec le visuel (`mix-blend-mode`), la fiche flotte au-dessus | Les trois noms en très grand **sont** le menu | Très affirmé graphiquement ; à réserver à une marque qui assume |
| 09 | Volets de verre | Le flou se fait **derrière** les lames (`backdrop-filter`) | Clic sur une lame fermée | Garde les trois offres à l'écran sans les afficher trois fois |
| 10 | Hublot | Un masque radial : net dans le disque, flou et sombre autour | Molette à trois crans | La profondeur sert directement la lisibilité — le texte se lit sur le flou |
| 11 | Diorama | **Vraie** perspective CSS : chaque plan a sa distance, la scène pivote au pointeur | Étiquettes posées à des profondeurs différentes | Le plus spectaculaire ; attention aux bords, un plan avancé sort vite du cadre |

Trois règles communes à cette famille, dans `css/style.css` :

- le plan de fond **déborde** de la section, pour que la parallaxe ne découvre jamais un bord ;
- un **voile dégradé** s'intercale toujours entre le visuel et le texte, et le contenu porte son
  propre fond translucide — jamais de texte posé à nu sur le trait ;
- en fond, le visuel **perd ses légendes et son halo** (`.illu--bg`) : deux typographies
  concurrentes à deux échelles, c'en est une de trop, et un flou gaussien agrandi 2× coûte cher
  pour un plan qu'on regarde à peine. Le calque « Légendes » du dock n'a donc pas d'effet ici.

## Changer d'offre

Fondu sortant (~0,2 s) puis **la nouvelle offre se redessine** : l'intro « tracé » du SVG est
rejouée. Le changement a ainsi une valeur en soi, au lieu d'être un simple échange d'images.

## Ce que ça coûte

Relevé sur la machine du lab, 1920 × 1000, une seule section allumée et visible (médiane de 3) :

| Layout | FPS | Layout | FPS |
|---|---:|---|---:|
| 01 Deux colonnes | 59,6 | 08 Typographie évidée | **54,3** |
| 03 Immersif | 60,2 | 09 Volets de verre | 60,0 |
| 07 Poste de pilotage | 60,1 | 10 Hublot | 60,0 |
| | | 11 Diorama | 60,0 |

**Les onze allumées en même temps (une seule visible) : 48,3 fps** — les sections hors écran
mettent leurs boucles en pause, c'est ce qui sauve la page.

Deux enseignements : le verre dépoli et le masque radial, qui *semblent* coûteux, ne coûtent
presque rien parce qu'ils sont statiques ; le mode de fusion, lui, se paie — il doit être
recomposé à chaque image du visuel qui passe dessous. Le limiter au seul mot allumé (au lieu
des trois) a rendu 15 fps au layout 08.

## Ce que la page ne tranche pas

Elle montre des options, elle ne les départage pas. Pour décider, il faut regarder :

- **le nombre de clics** pour comparer deux offres (les onglets gagnent, le levier perd) ;
- **la lisibilité du prix** au premier coup d'œil (l'immersif et la typographie évidée le noient,
  la fiche technique l'expose) ;
- **ce qui reste visible** des offres non sélectionnées (la pile et les volets les gardent, le
  hero les oublie) ;
- **le comportement mobile** : tous passent en une colonne, mais le carrousel, la pile et le
  diorama demandent une vraie adaptation tactile — et la parallaxe n'existe pas au doigt ;
- **l'accessibilité** : `prefers-reduced-motion` coupe parallaxe, pivot et transitions ; les
  sélecteurs restent au clavier (onglets, boutons radio, accordéon).

## Fichiers

```
test-layout/
├── index.html        les onze sections, en veille
├── css/style.css     ossature de la page + les onze mises en page
├── js/offers.js      contenu des trois offres (source unique)
├── js/svg-data.js    visuels générés par le prototype 01 (npm run svg:build)
└── js/main.js        montage / démontage par section, transitions, sélecteurs,
                      helpers de profondeur (parallaxe, perspective)
```

Les contenus et prix sont **fictifs** (placeholders de démo).
