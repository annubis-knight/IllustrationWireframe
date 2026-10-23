# Offres — contenu de référence

**Source unique** du contenu des offres. Toute carte, page, fiche GBP ou devis reprend ces textes et ces prix **à l'identique** (Google et les IA croisent les informations).

> Ce fichier fixe le **contenu**, pas le design (règle projet : ne pas inventer le design d'un composant). La mise en forme validée vit dans la maquette.
> Maquette : https://claude.ai/artifact/5HeQXEdsTan8LgkY9TYkYe — **variante F** = référence pour les cartes de l'accueil.

## Chaque endroit a un rôle différent

| Endroit | Rôle | Ce qu'on y met | Partie |
|---|---|---|---|
| **Cartes de l'accueil** | **Donner envie de cliquer** | Promesse, quantité de valeur (compteur), 3 meilleurs éléments, prix ancré, garantie en une ligne, un CTA. Le reste en dérouleur | [Partie 1](#partie-1--cartes-de-laccueil) |
| **Pages d'offre** (Booster, Starter, Nitro, hub `/offres`) | **Faire acheter** | L'offre complète : pile de valeur détaillée, bonus, garanties expliquées, effort client, déroulé, preuves, FAQ-objections, frais après livraison | [Partie 2](#partie-2--pages-doffre) |
| **Rendez-vous / audit** | **Conclure** | Récapitulatif de valeur personnalisé, garantie, prochain créneau, devis (avec Sérénité en option) | [ONBOARDING.md](ONBOARDING.md) |

---

## Socle commun

### Noms et titre

- Les offres s'appellent **Starter, Booster, Nitro** — rien ne s'y ajoute.
- **Titre de méthode** : **« La méthode PropulSite pour être vu, compris et choisi »** — uniquement en **titre** (bloc des 3 offres, hub, devis, discours). **Jamais** dans les cartes ni dans le nom des offres. Ni une page, ni une requête SEO.

### Vue d'ensemble

| | **Starter** | **Booster** ⭐ | **Nitro** |
|---|---|---|---|
| Promesse | Savoir quoi dire, à qui, et par où commencer | Un site qui transforme vos visiteurs en clients | Être plus visible et travailler plus simplement, mission par mission |
| Prix | **1 490 €** | **À partir de 3 490 €** | **Missions dès 790 €** |
| Mention prix | déductible si vous passez à Booster | stratégie incluse (valeur 1 490 €) · 5 pages | sur devis |
| Délai | 7 jours ouvrés après l'appel | 20 jours ouvrés | selon la mission |
| Garantie | Satisfait ou remboursé | Délai garanti · Site 100 % à vous | — |
| Éléments inclus | **6** | **13** | à la carte |
| Lien carte | `/offres#starter` → `/strategie-croissance-tpe-toulouse` (phase 4) | `/creation-site-internet-toulouse` | `/offres#nitro` → `/referencement-local-toulouse` (phase 5) |

Badge Booster : **« Recommandée »** (pas « la plus choisie » sans donnée). Nitro n'est **pas** un 3ᵉ palier plus cher : c'est un complément à la carte.

### Règles d'affichage (partout)

1. **Prix en texte HTML**, jamais en image.
2. **Mêmes prix partout** : on modifie ce fichier d'abord, puis partout.
3. **TVA** : franchise en base → prix **sans HT ni TTC** + mention unique **en petit** : *« TVA non applicable, art. 293 B du CGI »*. Passage à la TVA → « HT » partout (cf. [STRATEGIE.md](STRATEGIE.md#journal-des-décisions)).
4. **Un seul CTA principal** par carte / bloc : l'audit gratuit (Starter, Booster), le contact (Nitro).
5. **Livrables nommés + bénéfice** : « **Nom connu du livrable** : ce que ça change pour vous ». Ne jamais lister ce qu'on ne livre pas.
6. **4 styles de puces** (ronds, cohérents avec la DA) : stratégie Starter incluse (rond crème, contour pointillé) · livrable (rond jaune, coche) · bonus (rond jaune cerclé de noir, « + ») · garantie (bouclier noir, coche jaune).
7. JSON-LD : `priceRange` sur l'entité `ProfessionalService` (ex. `"790 € – 3 490 €"`).

> **Implémentation (plus tard)** : centraliser ces données dans un fichier unique côté code (modèle : [`utils/site.ts`](../../../utils/site.ts)), lu par les cartes, les pages et le JSON-LD — y compris la mention TVA, pour basculer en une ligne.

---

# Partie 1 — Cartes de l'accueil

**Objectif : le clic.** Principe : **montrer la quantité, cacher le détail** — le compteur et les meilleurs éléments sont toujours visibles, le reste se déroule (un élément suivant à moitié effacé + un bouton qui annonce combien il en reste).

### En-tête de section

- Étiquette : **Nos offres**
- Titre : **La méthode PropulSite pour être vu, compris et choisi**
- Sous-titre : *Un seul interlocuteur, dédié à votre projet du premier appel à la mise en ligne. Commencez par la stratégie, lancez un site qui vend, puis allez plus loin.*

### Carte Booster (grande carte vedette, en premier)

**Partie contenu**
- Badge : **Recommandée** · Étiquette : *Stratégie + site web*
- Nom : **Booster**
- Promesse : *Un site qui transforme vos visiteurs en clients, livré en 20 jours.* **Vous parlez, on écrit.**
- Compteur : **13 éléments inclus**
- **Bloc « offre dans l'offre »** (hiérarchie visuelle distincte des puces) : **L'offre Starter complète, incluse** · *valeur 1 490 €* → Analyse de marché et concurrence · Positionnement marketing · Plan de croissance 90 jours · Vidéo de restitution
- **Et en plus**, visibles :
  - **Site web sur mesure, 5 pages** : une vitrine pro qui vous ressemble
  - **Textes rédigés pour vous** : des mots qui convainquent, sans écrire une ligne
- Aperçu à moitié effacé : **Référencement local**
- Dérouleur **« Voir les 7 autres éléments »** :
  - **Référencement local** : vos clients vous trouvent sur Google
  - **Mise en ligne clé en main** : domaine, hébergement et accès à votre nom
  - **Bonus · Fiche Google Business optimisée** : plus visible sur Google Maps
  - **Bonus · Vidéo de présentation de votre site** : vous savez le faire vivre
  - **Bonus · Bilan à 3 mois** : ce qui marche, ce qu'on peut améliorer
  - **Délai garanti** : livré en 20 jours ouvrés, sinon 100 € remboursés par semaine de retard
  - **Site 100 % à vous** : vous partez quand vous voulez, avec tout

**Partie prix (bloc jaune)**
- *À partir de* **3 490 €** · *Stratégie incluse (valeur 1 490 €)*
- Garantie en une ligne : **Délai garanti · Site 100 % à vous**
- CTA : **Réserver mon audit gratuit**
- Sous le CTA : *Offert, sans engagement : votre site (ou votre projet) passé au crible, sur le fond comme sur la forme.*
- Lien : **Découvrir la création de site →**

### Carte Starter (« Pour commencer »)

- Étiquette : *Pour commencer · Stratégie* · Nom : **Starter**
- Prix : **1 490 €** · *déductible de Booster*
- Promesse : *Savoir quoi dire, à qui, et par où commencer.*
- Compteur + chapeau : **6 éléments inclus** · *votre stratégie de croissance, en 3 documents*
- Visibles :
  - **Analyse de marché et concurrence** : où vous en êtes
  - **Positionnement marketing** : votre client idéal, votre message, ce qui vous différencie
  - **Plan de croissance 90 jours** : quoi faire, et dans quel ordre
- Dérouleur **« + vidéo, 1 bonus et une garantie »** :
  - **Vidéo de restitution** : chaque recommandation expliquée
  - **Bonus · Appel de suivi à 30 jours** : on fait le point sur ce qui avance, ce qui bloque
  - **Satisfait ou remboursé** : si vous n'apprenez rien sur votre marché
- CTA : **Réserver mon audit gratuit** · Lien : **Voir le détail →**

### Carte Nitro (« Pour aller plus loin »)

- Étiquette : *Pour aller plus loin · Sur mesure* · Nom : **Nitro**
- Prix : *missions dès* **790 €**
- Promesse : *Être plus visible et travailler plus simplement, mission par mission.*
- **À la carte** · sur devis — étiquettes : SEO local & IA · Outil métier · Agent IA · Optimisation de process
- CTA : **Parler de mon projet** · Lien : **Voir les missions →**

### Pied de section

- Rareté : **3 nouveaux projets maximum par mois**, pour rester dédié à chacun · Prochain démarrage : `[DATE]` (mis à jour à la main)
- Lien : **Comparer les 3 offres en détail →** (`/offres`)
- *TVA non applicable, art. 293 B du CGI* (en petit)

### Absent des cartes (volontairement)

Sérénité · conditions de paiement · déroulé · frais après livraison · FAQ · preuves détaillées. **Preuve** : une citation d'avis Google sous la carte Booster **dès que les avis sont publiés** (emplacement réservé).

---

# Partie 2 — Pages d'offre

**Objectif : l'achat.** Ici s'applique **toute** la logique Hormozi : pile de valeur complète, chaque élément nommé avec son contenu et son bénéfice, garanties expliquées, effort client minimal rendu visible, preuves, objections levées. Les textes des cartes (Partie 1) sont **repris à l'identique** en tête de page.

## Page Booster — `/creation-site-internet-toulouse` (phase 1, priorité)

Requête visée et détail SEO : [PLAN_DE_PAGES.md](PLAN_DE_PAGES.md). Ordre des sections :

1. **Réponse directe** (3 lignes, extraites par les IA) : qui, quoi, à partir de 3 490 €, 20 jours ouvrés.
2. **Pour qui** : TPE et PME de Toulouse, 3–4 métiers nommés ; sites existants devenus obsolètes ou premier site.
3. **La pile de valeur** — tour des 13 éléments empilés sur la base Starter (variante D de la maquette), juste **avant** le prix :

   | Élément | Contenu | Ce que ça change |
   |---|---|---|
   | **L'offre Starter complète** (valeur 1 490 €) | Les 3 documents + vidéo de restitution (cf. page Starter) | Un site construit sur un message clair |
   | **Site web sur mesure, 5 pages** | Design à votre image, pas de template | Une vitrine pro qui vous ressemble |
   | **Textes rédigés pour vous** | Copywriting des 5 pages, à partir de l'appel | Des mots qui convainquent, sans écrire une ligne |
   | **Référencement local** | SEO technique, balises, sitemap, Search Console | Vos clients vous trouvent sur Google |
   | **Mise en ligne clé en main** | Domaine, hébergement et accès créés à votre nom | Vous êtes propriétaire de tout |
   | **Bonus · Fiche Google Business optimisée** | Catégories, services, photos, infos complètes | Plus visible sur Google Maps |
   | **Bonus · Vidéo de présentation de votre site** | Visite commentée de votre site | Vous savez le faire vivre |
   | **Bonus · Bilan à 3 mois** | Rapport visites + recommandations | Ce qui marche, ce qu'on peut améliorer |

4. **Garanties expliquées**
   - **Délai garanti** : livré en 20 jours ouvrés, sinon 100 € remboursés par semaine de retard (si les validations client arrivent dans les 3 jours ouvrés).
   - **Site 100 % à vous** : domaine, code, accès à votre nom ; vous partez quand vous voulez, avec tout.
5. **Ce qui nous distingue** : la stratégie avant le design ; un seul interlocuteur ; 3 projets maximum par mois.
6. **Votre part / notre part** (≈ 4 h de votre temps) :

   | Votre part (≈ 4 h au total) | Notre part |
   |---|---|
   | 1 appel de 1 h 30 pour raconter votre entreprise | Analyse du marché, stratégie |
   | Valider les contenus | Rédaction de tous les textes |
   | Choisir 1 ambiance parmi 3 | Design, développement, référencement |
   | Dire « go » | Mise en ligne, présentation de votre site |

   **Vous parlez, on écrit** : les contenus existants (textes, logo, photos) sont récupérés par PropulSite ; on ne demande que ce qui manque.
7. **Le déroulé en 20 jours ouvrés** (3 validations) :

   | Étape | Le client valide | Cadre |
   |---|---|---|
   | 1. Contenus | Structure des pages + textes | 1 tour de retours groupés |
   | 2. Direction artistique | 1 direction parmi **3 moodboards** (outil de travail, pas un livrable) | Pas de maquette : le choix s'applique directement au site |
   | 3. Recette | Retouches **à l'intérieur des sections** | 1 tour groupé. Nouvelle section / page / fonctionnalité → devis ou Nitro |

8. **Le prix** : à partir de 3 490 € (5 pages) · page supplémentaire 200 € · ce qui fait varier le prix · paiement en 2 ou 3 fois (cf. [Conditions](#conditions-devis--page-booster)).
9. **Et après la mise en ligne ?** — hébergement **Firebase** au nom du client : gratuit dans la plupart des cas (offre Spark : 10 Go de stockage, 360 Mo de transfert/jour, domaine personnalisé + HTTPS inclus) ; nom de domaine **GoDaddy** au nom du client : ~20 à 23 $/an (.fr/.com) — tarifs vérifiés le 2026-10-23, à reconfirmer ; tout payé directement par le client. **Sérénité** en option (cf. [plus bas](#sérénité--maintenance-après-mise-en-ligne)).
10. **Preuves** : 2 réalisations ([`/realisations`](PLAN_DE_PAGES.md)) + avis Google dès publication.
11. **Rareté** : 3 nouveaux projets maximum par mois · prochain démarrage `[DATE]`.
12. **FAQ** (5–6 questions, réponses de 2–3 phrases) : Combien de temps ? · Qui écrit les textes ? · Le site m'appartient-il ? · Et si je n'ai pas de photos ? · **Y a-t-il des frais après la livraison ?** (« Hébergement gratuit, environ 20 € par an pour le nom de domaine, et c'est tout. La maintenance est en option. ») · Comment se passe le paiement ?
13. **Pour aller plus loin** : 3 liens vers le blog.
14. **CTA** : audit gratuit + contact.

## Page Starter — `/strategie-croissance-tpe-toulouse` (phase 4)

En attendant : bloc `#starter` sur le hub.

1. **Le constat** : un beau site qui ne vend rien, parce qu'on a commencé par le design.
2. **Votre stratégie de croissance, en 3 documents** :

   | Livrable | Contenu | Ce que ça change |
   |---|---|---|
   | **Analyse de marché et concurrence** | Concurrents locaux (et nationaux si utile), opportunités | Vous savez où vous en êtes et comment vous démarquer |
   | **Positionnement marketing** | Persona (client idéal), valeurs, vision, message clé, différenciation | Vous savez à qui parler et quoi lui dire |
   | **Plan de croissance 90 jours** | Priorités, leviers, ordre des actions | Vous savez quoi faire, et dans quel ordre |
   | **Vidéo de restitution** | Présentation commentée des 3 documents (10 min) | Chaque recommandation expliquée |
   | **Bonus · Appel de suivi à 30 jours** (20 min) | Point sur l'application du plan | Ce qui avance, ce qui bloque |

3. **Garantie** : si la stratégie ne vous apprend rien sur votre marché, vous êtes remboursé.
4. **Format** : documents utilisables même sans travailler ensuite avec PropulSite ; appel de 30 min optionnel pour parler de la suite.
5. **Prix et délai** : 1 490 €, paiement en une fois · 7 jours ouvrés après l'appel.
6. **Et après** : Starter est **déductible** si vous passez à Booster → lien Booster.
7. **FAQ** : Que contiennent les documents ? · Et si j'ai déjà un site ? · Comment Starter est-il déduit de Booster ? · Combien de temps ça me demande ?

## Page Nitro — `/referencement-local-toulouse` (phase 5)

En attendant : bloc `#nitro` sur le hub.

| Mission | Ce que ça change |
|---|---|
| Visibilité locale entretenue (Google + IA) | Vous montez sans y penser |
| Outil métier sur mesure | Un quotidien simplifié, adapté à votre façon de travailler |
| Agent IA | Les demandes simples traitées, même la nuit |
| Optimisation de vos process | Moins de tâches répétitives |

Sections : ce qui change depuis que les gens posent leurs questions à une IA · ce qu'on fait concrètement · preuve (nos propres positions Google) · missions dès 790 €, sur devis · section outils métier / agents IA.

## Hub `/offres` (phase 2, ex-`/solutions`)

Ne vise aucune requête générique. Sections : phrase de cadrage (la stratégie d'abord, le site ensuite, les outils après) · **tableau comparatif** 3 colonnes × 4 lignes (pour qui, ce que vous obtenez, durée, prix) · 3 blocs ancrés `#starter #booster #nitro` (150–250 mots chacun, bouton « en savoir plus » dès que la page dédiée existe) · process en 4 étapes · FAQ prix et délais · audit gratuit.

---

## Sérénité — maintenance (après mise en ligne)

**Promesse** : Votre site fonctionne, reste sûr et à jour. Vous n'y pensez plus.
**Prix** : **49 € / mois**, prélèvement automatique, sans engagement.
**Frontière** : Sérénité = *votre site fonctionne* · Nitro = *votre site progresse* (le SEO actif reste **toujours** dans Nitro).
**Où la présenter** : **jamais** sur les cartes de l'accueil. Page Booster (section « Et après la mise en ligne ? » + FAQ frais), devis (option), livraison ([ONBOARDING.md](ONBOARDING.md)).

| Inclus | Non inclus (→ devis ou Nitro) |
|---|---|
| Mises à jour techniques et sécurité | SEO actif, contenus, positions (→ Nitro) |
| Surveillance 24/7 de la disponibilité, alerte en cas de panne | Nouvelles pages ou sections |
| Sauvegarde complète et versionnée, restauration en cas de problème | Nouvelles fonctionnalités |
| Certificat HTTPS surveillé | |
| Test mensuel du formulaire de contact (aucune demande perdue) | |
| Contrôle mensuel des liens cassés | |
| Alertes Google Search Console (erreurs d'indexation, sécurité) | |
| Renouvellements domaine / hébergement suivis (rappels) | |
| Mentions légales et bandeau cookies mis à jour si la réglementation change | |
| Petites modifs de contenu : 30 min / mois, non cumulables | |
| Rapport mensuel : visites, performance, état du site | |
| Support e-mail sous 48 h | |

> Presque tout est automatisable (surveillance, sauvegardes Git, rapports) : forte valeur perçue, temps réel faible.

## Conditions (devis + page Booster)

- **Démarrage** des 20 jours ouvrés : à réception du **premier paiement** **et** après le **rendez-vous d'onboarding** (appel de 1 h 30). Process : [ONBOARDING.md](ONBOARDING.md).
- **Paiement** : Starter en une fois. Booster en 2 ou 3 fois au choix du client, premier paiement au lancement :
  - en 2 fois : 50 % au lancement · 50 % à la livraison, avant mise en ligne
  - en 3 fois : 40 % au lancement · 30 % à la validation des contenus · 30 % à la livraison, avant mise en ligne
  - pages supplémentaires facturées avec le solde
- **Validations client** : retours groupés sous 3 jours ouvrés ; au-delà, le compteur des 20 jours est en pause.
- **Domaine et hébergement** : comptes créés **par le client, à son nom, avec sa carte**, pendant l'onboarding (guidé) ; PropulSite ajouté comme collaborateur.

## Audit gratuit (le CTA principal)

- **Site existant** : audit du positionnement, du design, de la stratégie et du neuromarketing (message, confiance) — sur le fond comme sur la forme.
- **Sans site** : le prospect présente son entreprise, son offre et ses objectifs.
- Ligne sous les CTA : *Offert, sans engagement : votre site (ou votre projet) passé au crible, sur le fond comme sur la forme.*

## Preuves (à fabriquer au fil des livraisons)

Peu de projets au démarrage → la **garantie** compense.

| Preuve | Où l'afficher | Quand |
|---|---|---|
| **Avis Google** des clients existants, puis à chaque livraison | 1 citation sous la carte Booster ; page Booster ; GBP | Phase 0 |
| **Pages réalisations** : chaque client (et PropulSite) — ce qui a été fait, comment, avant/après, avis | `/realisations` ; 2 réalisations sur la page Booster | Phase 2 |
| *(≠ études de cas : marques connues, ex. Amazon, pour l'autorité — `/blog/etudes-de-cas`)* | | |
| **La méthode montrée** | Page Booster, hub | Phase 1–2 |
| **Exemple d'audit anonymisé** | Contact / Booster | Backlog B14 |
| **Étude locale à données** | Blog + presse | Backlog B13 |
| **Nos propres positions Google** | Page Nitro | Phase 5 |

## Rareté (honnête uniquement)

- **« 3 nouveaux projets maximum par mois, pour rester dédié à chacun. »** Plafond réel (2–3 Booster/mois) et argument de positionnement.
- **Prochain créneau de démarrage : [date]** — mis à jour à la main.
- ❌ Jamais de faux compte à rebours ni de fausse limite.

---

## Décisions

- [x] Titre de méthode · page supplémentaire 200 € · échéancier · Sérénité mensuelle sans engagement · pas de clients fondateurs · contenu de l'audit
- [x] Starter en 3 documents nommés + vidéo + appel de suivi ; Booster : 4 livrables, 3 bonus, 2 garanties (13 éléments)
- [x] Hébergement Firebase, domaine GoDaddy, payés par le client
- [ ] Mise en page définitive de la section accueil (variante F pressentie)
- [ ] Citation d'avis Google sous la carte Booster (dès publication des avis)
