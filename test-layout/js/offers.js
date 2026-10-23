/**
 * Contenu des 3 offres, partagé par tous les layouts de la page.
 * Même matière pour tout le monde : seule la mise en scène change d'un layout à l'autre.
 *
 * Textes et prix repris de OFFRES.md (source unique) — on modifie ce fichier-là d'abord.
 *
 * La structure suit l'anatomie de « Partie 1 — Cartes de l'accueil » :
 * promesse · **compteur** de valeur · les meilleurs éléments visibles · le reste
 * dans un dérouleur · bloc prix (prix ancré, garantie en une ligne, un CTA).
 * Principe : *montrer la quantité, cacher le détail*.
 *
 *   items[].kind  donne la puce (OFFRES.md, règle 6) : livrable · bonus · garantie
 *   visible       combien d'éléments restent à l'air libre, le reste se déroule
 *   included      « l'offre dans l'offre » — hiérarchie distincte des puces
 *   specs         résumé en 5 lignes, pour les conteneurs trop petits pour la liste
 *
 * `code`, `stage`, `status` et `level` restent du décor HUD propre au lab.
 */

/* En-tête et pied : ils appartiennent à la section, pas aux cartes. */
window.LAB_SECTION = {
  kicker: 'Nos offres',
  title: 'La méthode PropulSite pour être <em>vu, compris et choisi</em>',
  lede: 'Un seul interlocuteur, dédié à votre projet du premier appel à la mise en ligne. '
    + 'Commencez par la stratégie, lancez un site qui vend, puis allez plus loin.',
  scarcity: '3 nouveaux projets maximum par mois, pour rester dédié à chacun.',
  nextSlot: 'Prochain démarrage : [DATE]',
  compare: 'Comparer les 3 offres en détail →',
  vat: 'TVA non applicable, art. 293 B du CGI',
};

window.LAB_OFFERS = [
  {
    tier: 'starter',
    code: 'MOD·01',
    stage: 'Étage 1',
    stageLong: 'Pour commencer · Stratégie',
    name: 'Starter',
    status: 'Pas de tir · prêt',
    level: 1,
    price: 1490,
    priceFrom: '',
    priceNote: 'déductible de Booster',
    pitch: 'Savoir quoi dire, à qui, et par où commencer.',
    argument: '6 éléments inclus : votre stratégie de croissance, en 3 documents. Déductible de Booster.',
    count: { n: 6, label: 'éléments inclus', note: 'votre stratégie de croissance, en 3 documents' },
    items: [
      { kind: 'livrable', name: 'Analyse de marché et concurrence', benefit: 'où vous en êtes' },
      { kind: 'livrable', name: 'Positionnement marketing', benefit: 'votre client idéal, votre message, ce qui vous différencie' },
      { kind: 'livrable', name: 'Plan de croissance 90 jours', benefit: 'quoi faire, et dans quel ordre' },
      { kind: 'livrable', name: 'Vidéo de restitution', benefit: 'chaque recommandation expliquée' },
      { kind: 'bonus', name: 'Appel de suivi à 30 jours', benefit: 'on fait le point sur ce qui avance, ce qui bloque' },
      { kind: 'garantie', name: 'Satisfait ou remboursé', benefit: 'si vous n’apprenez rien sur votre marché' },
    ],
    visible: 3,
    more: '+ vidéo, 1 bonus et une garantie',
    guarantee: 'Satisfait ou remboursé',
    delay: '7 jours ouvrés après l’appel',
    cta: 'Réserver mon audit gratuit',
    ctaNote: 'Offert, sans engagement : votre site (ou votre projet) passé au crible, sur le fond comme sur la forme.',
    link: 'Voir le détail →',
    specs: [
      ['Inclus', '6 éléments'],
      ['Stratégie', '3 documents + vidéo'],
      ['Délai', '7 jours ouvrés'],
      ['Bonus', 'Appel de suivi à 30 jours'],
      ['Garantie', 'Satisfait ou remboursé'],
    ],
    compare: [
      ['Vous obtenez', 'Votre stratégie, en 3 documents'],
      ['Inclus', '6 éléments'],
      ['Délai', '7 jours ouvrés après l’appel'],
      ['Garantie', 'Satisfait ou remboursé'],
    ],
  },
  {
    tier: 'booster',
    code: 'MOD·02',
    stage: 'Étage 2',
    stageLong: 'Stratégie + site web',
    name: 'Booster',
    status: 'En vol · nominal',
    level: 2,
    badge: 'Recommandée',
    price: 3490,
    priceFrom: 'à partir de',
    priceNote: 'Stratégie incluse (valeur 1 490 €) · 5 pages',
    pitch: 'Un site qui transforme vos visiteurs en clients, livré en 20 jours.',
    pitchTail: 'Vous parlez, on écrit.',
    argument: '13 éléments inclus, dont l’offre Starter complète (valeur 1 490 €).',
    count: { n: 13, label: 'éléments inclus', note: '' },
    /* L'offre dans l'offre : hiérarchie visuelle distincte des puces (OFFRES.md) */
    included: {
      title: 'L’offre Starter complète, incluse',
      value: 'valeur 1 490 €',
      items: ['Analyse de marché et concurrence', 'Positionnement marketing', 'Plan de croissance 90 jours', 'Vidéo de restitution'],
    },
    items: [
      { kind: 'livrable', name: 'Site web sur mesure, 5 pages', benefit: 'une vitrine pro qui vous ressemble' },
      { kind: 'livrable', name: 'Textes rédigés pour vous', benefit: 'des mots qui convainquent, sans écrire une ligne' },
      { kind: 'livrable', name: 'Référencement local', benefit: 'vos clients vous trouvent sur Google' },
      { kind: 'livrable', name: 'Mise en ligne clé en main', benefit: 'domaine, hébergement et accès à votre nom' },
      { kind: 'bonus', name: 'Fiche Google Business optimisée', benefit: 'plus visible sur Google Maps' },
      { kind: 'bonus', name: 'Vidéo de présentation de votre site', benefit: 'vous savez le faire vivre' },
      { kind: 'bonus', name: 'Bilan à 3 mois', benefit: 'ce qui marche, ce qu’on peut améliorer' },
      { kind: 'garantie', name: 'Délai garanti', benefit: 'livré en 20 jours ouvrés, sinon 100 € remboursés par semaine de retard' },
      { kind: 'garantie', name: 'Site 100 % à vous', benefit: 'vous partez quand vous voulez, avec tout' },
    ],
    visible: 2,
    more: 'Voir les 7 autres éléments',
    guarantee: 'Délai garanti · Site 100 % à vous',
    delay: '20 jours ouvrés',
    cta: 'Réserver mon audit gratuit',
    ctaNote: 'Offert, sans engagement : votre site (ou votre projet) passé au crible, sur le fond comme sur la forme.',
    link: 'Découvrir la création de site →',
    specs: [
      ['Inclus', '13 éléments'],
      ['Stratégie', 'Offre Starter complète'],
      ['Site', '5 pages, textes rédigés'],
      ['Délai', '20 jours ouvrés, garanti'],
      ['Propriété', 'Site 100 % à vous'],
    ],
    compare: [
      ['Vous obtenez', 'Stratégie + site sur mesure, 5 pages'],
      ['Inclus', '13 éléments'],
      ['Délai', '20 jours ouvrés'],
      ['Garantie', 'Délai garanti · Site 100 % à vous'],
    ],
  },
  {
    tier: 'nitro',
    code: 'MOD·03',
    stage: 'Étage 3',
    stageLong: 'Pour aller plus loin · Sur mesure',
    name: 'Nitro',
    status: 'Hyper-vitesse',
    level: 3,
    price: 790,
    priceFrom: 'missions dès',
    priceNote: 'sur devis',
    pitch: 'Être plus visible et travailler plus simplement, mission par mission.',
    argument: 'À la carte, sur devis : SEO local & IA, outil métier, agent IA, optimisation de process.',
    /* Nitro n'est pas un palier plus cher : c'est un complément à la carte. */
    alacarte: 'À la carte · sur devis',
    chips: ['SEO local & IA', 'Outil métier', 'Agent IA', 'Optimisation de process'],
    count: null,
    items: [
      { kind: 'livrable', name: 'Visibilité locale entretenue', benefit: 'vous montez sans y penser' },
      { kind: 'livrable', name: 'Outil métier sur mesure', benefit: 'un quotidien simplifié, adapté à votre façon de travailler' },
      { kind: 'livrable', name: 'Agent IA', benefit: 'les demandes simples traitées, même la nuit' },
      { kind: 'livrable', name: 'Optimisation de vos process', benefit: 'moins de tâches répétitives' },
    ],
    visible: 4,
    more: '',
    guarantee: '',
    delay: 'selon la mission',
    cta: 'Parler de mon projet',
    ctaNote: '',
    link: 'Voir les missions →',
    specs: [
      ['Format', 'À la carte'],
      ['Visibilité', 'SEO local & IA'],
      ['Outil', 'Métier, sur mesure'],
      ['Assistant', 'Agent IA'],
      ['Process', 'Optimisation'],
    ],
    compare: [
      ['Vous obtenez', 'Missions à la carte'],
      ['Inclus', 'Sur devis'],
      ['Délai', 'Selon la mission'],
      ['Garantie', '—'],
    ],
  },
];
