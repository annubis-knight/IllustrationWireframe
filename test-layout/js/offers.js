/**
 * Contenu des 3 offres, partagé par tous les layouts de la page.
 * Même matière pour tout le monde : seule la mise en scène change d'un layout à l'autre.
 *
 * Contenus et prix fictifs (placeholders de démo).
 */
window.LAB_OFFERS = [
  {
    tier: 'starter',
    code: 'MOD·01',
    stage: 'Étage 1',
    stageLong: 'Étage 1 — Base de lancement',
    name: 'Starter',
    status: 'Pas de tir · prêt',
    level: 1,
    price: 1490,
    pitch: 'Le site qui vous met en orbite basse : une vitrine nette, rapide, prête à recevoir vos premiers visiteurs.',
    argument: 'Idéal pour un lancement d’activité ou une première présence crédible.',
    specs: [
      ['Pages', '1 – 5'],
      ['Design', 'Template adapté'],
      ['CMS', '—'],
      ['SEO', 'Fondations'],
      ['Mise en orbite', '3 sem.'],
    ],
    cta: 'Initialiser le lancement',
  },
  {
    tier: 'booster',
    code: 'MOD·02',
    stage: 'Étage 2',
    stageLong: 'Étage 2 — Mise en orbite',
    name: 'Booster',
    status: 'En vol · nominal',
    level: 2,
    price: 3490,
    pitch: 'La poussée supplémentaire : contenu autonome, référencement travaillé, mesure de ce qui marche.',
    argument: 'Le choix de la plupart des TPE qui veulent un site qui travaille pour elles.',
    badge: 'Trajectoire recommandée',
    specs: [
      ['Pages', '5 – 12'],
      ['Design', 'Sur-mesure'],
      ['CMS', 'WordPress headless'],
      ['SEO', 'Avancé + GA4'],
      ['Mise en orbite', '5 sem.'],
    ],
    cta: 'Activer les boosters',
  },
  {
    tier: 'nitro',
    code: 'MOD·03',
    stage: 'Étage 3',
    stageLong: 'Étage 3 — Vaisseau 2.0',
    name: 'Nitro',
    status: 'Hyper-vitesse',
    level: 3,
    price: 6900,
    pitch: 'Tout l’arsenal : motion 3D, tunnels de conversion, performance et accompagnement dans la durée.',
    argument: 'Pour une marque qui veut se distinguer, pas seulement exister.',
    specs: [
      ['Pages', 'Illimitées'],
      ['Design', 'Sur-mesure + motion 3D'],
      ['CMS', 'WordPress headless'],
      ['SEO', 'Stratégie + tunnels'],
      ['Mise en orbite', '8 sem.'],
    ],
    cta: 'Passer en hyper-vitesse',
  },
];
