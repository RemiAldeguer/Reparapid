# Validation de Reparapid

Copie indépendante créée le 12 octobre 2026. Les recettes de la vitrine RépaRapid et du parcours d’envoi ci-dessous décrivent la personnalisation de cette copie. Les recettes de La Clinique Rétro sont conservées dans une section historique distincte.

Validation initiale de l’import le **12 octobre 2026**, avec Node **24.19.0** : `npm ci`, compilation TypeScript/Vite et **434 tests réussis** (393 Node/domaine/API et 41 Cloudflare). Ce résultat décrit la copie avant le nouveau parcours public. Les tests API utilisent des serveurs temporaires et l’accès aux sockets locaux.

Documentation mise à jour le **13 octobre 2026** ; les résultats ci-dessous restent rattachés à leur date de vérification. Pour la reprise détaillée, lire [CONTEXTE_PROJET.md](CONTEXTE_PROJET.md).

## Résultat automatisé courant

Le **13 octobre 2026**, `npm test` a passé **476 tests : 431 Node/domaine/API, puis 45 Cloudflare**, sans échec ni test ignoré. Deux nouveaux tests Node et Worker couvrent la réception et la clôture du parcours des demandes du site. TypeScript et le build final Vite ont réussi avec **87 modules**, après les derniers ajustements des illustrations et coordonnées de cartes. La recette des demandes, du portail et du contact est détaillée ci-dessous ; la publication est vérifiée sur 100 % du trafic Cloudflare, avec assets conformes au build final et protections des routes privées contrôlées. Le projet exige Node 22.16 ou supérieur.

Le résultat précédent du **12 octobre 2026**, **474 tests (429 Node/domaine/API + 45 Cloudflare)** avec Node 24.19.0, reste historique. Il précédait les reprises visuelles successives du logo, des engagements et de la gestion ; ces évolutions avaient été vérifiées par build et recette sans nouvelle exécution de la suite métier.

Ce résultat est daté. Les anciens chiffres de 52 tests décrivaient l’ajout initial de l’authentification et ne représentaient plus la suite actuelle.

~~~sh
npm test
npm run typecheck
npm run build
~~~

npm test compile les modules métier puis exécute les tests listés dans package.json. Le build effectue aussi le contrôle TypeScript avant Vite. L’avertissement Vite de taille du bundle supérieur à 500 kB n’est pas un échec.

## Couverture principale

| Groupe | Fichiers |
| --- | --- |
| Étapes, stock, temps, coûts, paiements, revenus terminés/théoriques, suppression, migration | tests/domain.test.cjs |
| Pièces clients et disponibilité | tests/client-part-requests.test.cjs |
| Périodes financières, calendrier Paris, encaissements et gain | tests/finance-domain.test.mjs |
| Factures simple/complète, propriété, coûts, TVA, dates et projection | tests/invoice-domain.test.mjs |
| Authentification, cookies, CSRF, limites, transactions et sessions | tests/auth.test.mjs |
| Accès clients, projections et révocation sur les deux hôtes | tests/client-access.test.mjs |
| Catalogue de consoles, suggestions de panne, admission en attente d’envoi et transitions | tests/repair-intake-domain.test.cjs |
| Compte et demande atomiques, fiche filtrée, parcours réception/clôture, CSRF, isolation, idempotence, révocation et conflits sur les deux hôtes | tests/repair-intake-api.test.mjs |
| Premier administrateur Cloudflare : cible dédiée, refus hors terminal, INSERT sans remplacement et aide sûre | tests/cloudflare-admin-create.test.mjs |
| Notifications, dépôt, destinataires, idempotence et reprises | tests/repair-notifications.test.mjs, tests/notification-delivery.test.mjs, tests/notifications-api.test.mjs |
| Vie des sessions navigateur et réponses tardives | tests/api-session.test.mjs |
| Inscriptions et ateliers isolés | tests/registration-requests.test.mjs, tests/workshop-scope.test.mjs, tests/saas-api.test.mjs |
| Silhouettes et couleurs | tests/console-appearance.test.mjs |
| En-têtes et limites de réponses | tests/response-security.test.mjs |
| Worker/D1, fragments atomiques et sécurité | tests/cloudflare-worker.test.mjs, tests/cloudflare-database.test.mjs, tests/cloudflare-security.test.mjs |

Les identifiants fixes sont exclusivement des fixtures. Les tests utilisent des bases isolées et des transports e-mail simulés ; ils ne créent pas de comptes dans l’atelier réel et n’envoient pas de message client réel.

## Recette RépaRapid : vitrine, demande et fiche d’envoi

Recette dans le navigateur intégré avec serveur temporaire et coordonnées entièrement fictives :

- Accueil et formulaire de réparation contrôlés sur ordinateur et aux largeurs mobiles **390 px** et **320 px**, avec navigation, choix de console et suggestions de panne lisibles.
- Création d’un compte client fictif et de sa première demande ; redirection vers l’espace client, statut **En attente d’envoi** et accès à la fiche récapitulative.
- Deuxième demande enregistrée depuis le même compte ; les deux consoles et dossiers apparaissent dans le suivi du propriétaire.
- Passage d’un dossier à **Réception** dans la gestion du magasin ; emplacement corrigé à **À l’atelier**, suivi client actualisé et fiche d’envoi toujours disponible.
- Fiche contrôlée avec référence, console, symptômes, accessoires, coordonnées client et adresse du magasin. Aucune note interne, photo privée ou donnée d’un autre client dans le document.
- Commande d’impression déclenchée et ouverture du dialogue du navigateur constatée. Aucun PDF n’a été enregistré et aucune impression physique n’a été effectuée pendant cette recette.
- Déconnexion retirant les données privées ; panneau admin **Vitrine Reparapid et adresse d’envoi** présent avec les coordonnées publiques préremplies.

Les tests automatisés vérifient les refus d’origine et de CSRF, les champs de prix/statut/propriétaire forgés, les limites de corps et tentatives, le refus d’une session d’un autre atelier et les collisions de compte. Ils prouvent aussi le retour au même dossier après un double enregistrement, les gardes de session/révision au commit et l’annulation atomique d’une création échouée. Une ancienne fiche client portant le même e-mail reste séparée : l’inscription crée une nouvelle identité et ne récupère jamais ses données.

Le premier compte administrateur réel de production a été créé et vérifié le **13 octobre 2026**, séparément des tests. Les tests de `cloudflare:admin:create` utilisent une base en mémoire et des valeurs synthétiques ; ils n’initialisent pas la production et ne réinitialisent aucun compte. La commande reste disponible pour une autre installation D1 sans administrateur.

## Recette visuelle : logo original et direction RépaRapid

- Logo repris sans retouche depuis l’[asset WordPress/CDN RépaRapid](https://i0.wp.com/reparapid.fr/wp-content/uploads/2023/03/Sans-titre-2.png?fit=300%2C300&ssl=1) dans `public/reparapid-logo-original.webp`. SHA-256 source = copie : `5c592b863b669335922a51c76171eff93ed948747b0e93582b9aafc1785c8418`.
- Logo présent sur la vitrine, le portail client principal, la fiche récapitulative et le favicon.
- En-tête et pied de page noirs, hero rouge `#a32720`, accents `#b21414`, motifs géométriques CSS ; titres et navigation avec Oxanium auto-hébergée, licence conservée.
- Accueil contrôlé à **1280 px** et **320 px**, sans débordement horizontal ; formulaire de réparation accessible.

Les règles métier et les API n’ont pas changé. Aucun nouveau compte de production, changement DNS ou écriture D1 n’a été effectué pour cette recette. TypeScript et le build Vite ont réussi (**80 modules**) ; la version Cloudflare est active à 100 % et les hashes du HTML, des bundles, du logo et de la police servis correspondent au build validé. Le résultat précédent de **474 tests** reste daté et n’est pas présenté comme une nouvelle exécution.

Favicon : PNG original 300 × 300 déclaré dans le HTML, compilation validée et HTML/PNG servis identiques au build. Recette Node temporaire en mémoire : PNG/WebP/TTF en GET et HEAD 200 avec MIME correct, octets GET identiques, HEAD sans corps, `nosniff` conservé et `/api/store` anonyme 401. Aucun test de production avec données clients ; aucune nouvelle exécution de la suite métier.

## Évolution du 13 octobre : engagements, avis et illustrations

Périmètre de cette reprise :

- **Nos engagements** : contenu reformulé depuis [reparapid.fr](https://reparapid.fr/), avec les exceptions de délai et d’ouverture ; distinction entre intervention à l’atelier et acheminement du colis.
- **Avis Google** : trois courts extraits vérifiés dans le widget public Trustindex du site d’origine, avec auteurs, dates et notes individuelles. Source visible et accès aux avis complets via la fiche Google Maps ; aucun agrégat ou compteur, aucune synchronisation automatique revendiquée.
- **Consoles** : nouvelles illustrations SVG natives dans `src/shop-console-art.tsx` et `src/shop-console-art.css`, adaptées aux 38 modèles du catalogue et à leurs variantes, utilisées sur la vitrine et dans le formulaire. Illustrations de l’administration conservées.

Le **build final et le contrôle TypeScript ont réussi avec 82 modules**. Recette à **1280 px et 320 px** : trois engagements et trois avis visibles, aucun débordement horizontal, 38 choix radio et 38 SVG avec identification de leur silhouette, identifiants de gradients uniques, Xbox Series X et Series S visuellement distinctes et sélection d’un modèle fonctionnelle. Publication vérifiée le **13 octobre 2026** : version active sur 100 % du trafic Cloudflare ; SHA-256 du HTML, du JavaScript, du CSS, du logo, de la police et de sa licence identiques au build final ; API publique en HTTP 200 et toutes les routes privées contrôlées en HTTP 401 sans exposition de données. La suite métier complète n’a pas été relancée : le résultat de **474 tests du 12 octobre 2026** est conservé comme historique, sans le présenter comme une validation automatisée de cette évolution visuelle.

Le compte administrateur principal de la D1 a été créé. La vérification a constaté un seul compte, une connexion réussie et le rôle effectif `super_admin` via `/api/auth/me`. La seule session de vérification a été déconnectée, puis un nouvel appel a été refusé en **HTTP 401**. Aucun client, dossier ou Store d’atelier n’a été modifié ; le SQL privé de préparation a été supprimé. Les identifiants ont été remis séparément, hors du dépôt : aucun secret, empreinte de mot de passe ou chemin privé n’est documenté ici.

## Reprise du 13 octobre : gestion et cadres du formulaire

Modifications préparées dans les sources :

- Identité RépaRapid de la connexion magasin, de la navigation et des écrans de gestion ; logo des factures et noms des fichiers téléchargés harmonisés.
- Nom d’atelier importé par défaut présenté via `workshopDisplayName`, noms personnalisés conservés et identifiants internes de stockage/session inchangés.
- Styles dédiés `src/backoffice-theme.css` et `src/backoffice-components.css`, avec préservation des couleurs métier ; cadres, SVG et libellés du formulaire bornés dans `src/repair-intake.css`.

Recette réalisée sur une **API Node temporaire en mémoire**, avec deux clients et des dossiers fictifs :

- Connexion et **neuf pages de gestion** contrôlées : logo original, sidebar noire, actions rouges, Oxanium et aucune mention visible de La Clinique Rétro.
- Modale d’ajout d’une console recevant les styles du thème.
- À **320 px** : tableau de bord, clients, réglages, factures et aperçu généré sans débordement ; ouverture/fermeture du menu et navigation fonctionnelles.
- Aperçu de facture simple fictive conservant le total de **27,15 €**, avec nom RépaRapid, logo et séparateurs rouges. Aucune impression, aucun PDF ni facture de production.
- Formulaire public à **1280, 390 et 320 px** : 38 cartes, 38 SVG et aucune illustration hors cadre ; récapitulatif après sélection d’une PS5 Digital contenu.
- Déconnexion locale contrôlée : dossiers retirés et retour à la connexion. Onglets temporaires fermés et dimensions du navigateur rétablies après la recette.

Le **build final et TypeScript ont réussi avec 85 modules**. La publication est vérifiée sur 100 % du trafic Cloudflare ; les SHA-256 du HTML, du JavaScript, du CSS, du logo, de la police et de sa licence correspondent au build final. L’API publique répond en HTTP 200 et **cinq routes privées** contrôlées refusent les appels anonymes en HTTP 401 sans exposition de données. Aucun nouveau résultat de test métier n’est annoncé. La validation de **474 tests du 12 octobre** et la publication précédente des engagements/avis/illustrations restent des résultats historiques datés. Aucune API, migration ou donnée de production n’a été modifiée pour cette harmonisation.

## Dernière reprise du 13 octobre : demandes du site et contact

Recette sur une base temporaire en mémoire, avec demandes et coordonnées fictives :

- **Demandes du site** : trois demandes publiques parmi neuf dossiers hors site ; seules les trois demandes du site apparaissent. Filtres, compteurs, recherche et tri disponibles.
- Confirmation de réception physique : compteur **À réceptionner** ramené à zéro et dossier au statut **Réception**. Clôture : un dossier **Prêt à récupérer** et filtre correspondant affichant une demande. Étapes et compteurs conservés après rechargement.
- Cartes et SVG contenus à **1280 px et 320 px**, sans débordement. Silhouettes `ShopConsoleArt` utilisées dans cette vue ; photos de consoles conservées.
- Portail du même client : badge et description **Prête à récupérer**, invitation à organiser le retrait ou le retour avec l’atelier, aucune donnée interne exposée.
- **Contactez-nous** accessible depuis le portail : coordonnées publiques, téléphone, e-mail, itinéraire, horaires et réseaux sociaux ; section sans débordement à **1280 px et 320 px**.
- Quatre champs obligatoires contrôlés avec des valeurs fictives : prénom et nom limités à 80 caractères chacun, e-mail à 254 et message à 3 000 ; validation du format e-mail.

Le bouton **Ouvrir mon e-mail** prépare un `mailto:`. Il n’a pas été soumis pendant la recette : aucun message n’a été envoyé et aucune transmission à un backend n’est implémentée. **Prête à récupérer** reste le libellé d’un dossier `terminee`, sans nouveau suivi d’expédition ou de remise.

`npm test` : **476 réussis (431 + 45)**, aucun échec ni test ignoré, avec deux tests supplémentaires du parcours révisé sur Node et Worker. TypeScript et build final de **87 modules** réussis. Aucune API, structure de projection, migration ou donnée de production modifiée. Publication vérifiée sur **100 % du trafic Cloudflare** : SHA-256 du HTML, du JavaScript, du CSS, du logo, de la police et de sa licence conformes au build final ; API publique en HTTP 200 et cinq routes privées contrôlées en HTTP 401 sans exposition de données.

## Recettes historiques de La Clinique Rétro

Navigateur intégré et serveur Node avec SQLite en mémoire et données fictives :

- Facture multiconsole, montant nul, TVA, puis format simple sans coordonnées légales ni numéro.
- Invalidation de l’aperçu au changement de format/champ et quand le serveur contient une révision de prix plus récente.
- Facture longue, sans diagnostic ou note privée dans le document.
- Déconnexion : formulaire et aperçu privés retirés.
- Listing complet des réparations clients, filtres, défilement clavier.
- Cartes desktop et écrans 320/390 px, libellés, navigation et symbole euro.
- Pièces en attente : 3 demandes / 4 unités / 2 clients, exclusion des autres statuts et conservation d’une demande du dossier clôturé.
- Trois totaux distincts, exclusion d’une réparation personnelle du total théorique, lien vers le bon dossier et absence de débordement à 320 px.
- Logo retravaillé : proportions à 24 / 39 / 47 / 64 / 80 px, sidebar à 39 px et accueil à 47 px. Build complet réussi ; la suite métier n’a pas été relancée pour cette modification limitée au SVG.
- Dernier ajustement : console inclinée à −6° et boutons réalignés ; proportions contrôlées de 24 à 80 px. Synthèse côte à côte vérifiée à 1280 et 1101 px : séparateur vertical, en-têtes et début des listes alignés, 22 dossiers conservés et 20 boutons de paiement. Défilement clavier indépendant, filtre Payées donnant 2 dossiers, retour à Toutes donnant 22 dossiers et remettant la liste en haut. À 320 px : listes empilées, en-tête de pièces lisible et aucun défilement horizontal. Build complet réussi ; pas de nouvelle suite métier pour ces changements SVG / disposition.
- Publication [identifiant historique retiré] : page HTTP 200, références et hashes JS/CSS/SVG identiques au build validé, logo incliné observé sur l’accueil publié.

L’action Imprimer / Enregistrer en PDF s’appuie sur le dialogue du navigateur. La validation de l’aperçu et de cette commande ne signifie pas qu’un PDF a été automatiquement enregistré sur disque.

## Déploiement

La nouvelle vitrine RépaRapid est publiée sur https://reparapid.aldeguer-remi.workers.dev et contrôlée le 12 octobre 2026 : le Worker sert le nouveau déploiement à 100 %, les SHA-256 du HTML, du JavaScript et du CSS correspondent au build, l’API publique renvoie les coordonnées du magasin et les routes privées renvoient 401 sans session. Le déploiement ne modifie aucun schéma ni aucune donnée de la D1 ; les quatre migrations de l’installation initiale restent suffisantes pour ce parcours.

Le domaine [reparapid.fr](https://reparapid.fr/) conserve son site WordPress. Aucune modification DNS n’a été effectuée. Les coordonnées publiques du magasin proviennent de ce site ; aucune donnée client réelle n’a été utilisée pendant la recette. La connexion administrateur en production a été vérifiée après création du compte principal le **13 octobre 2026**, sans modifier l’atelier. Aucun paiement ni envoi de colis réel n’a été réalisé.

Après publication, relever le Version ID Wrangler, vérifier la réponse de l’URL publique et comparer les références/hashes JS-CSS au build. Pour une modification API, vérifier les routes/protections concernées. GET /api/store et GET /api/admin/invoice-source doivent refuser une requête anonyme.

Une courte propagation Cloudflare peut servir l’ancien HTML : examiner la réponse avant de redéployer. Recetter les mutations uniquement sur des données explicitement destinées au test.

## Limites

Les tests ne remplacent pas un audit indépendant, un test d’intrusion ou une validation juridique des factures. Ils ne vérifient pas la réception réelle d’un e-mail Resend ou un paiement bancaire.

Le workflow .github/workflows/ci.yml exécute tests et build. Aucun résultat de CI distante n’a été consulté pour cette reprise ; les résultats ci-dessus sont locaux.

## Recette de présentation du parcours — 13 octobre 2026

La section « Votre réparation, pas à pas » distingue les actions du client et la prise en charge à l’atelier. Contrôle à 1280 / 390 / 320 px : quatre étapes lisibles, texte contenu, une colonne sur mobile, liens vers `#/demande-reparation` et `#/espace-client` opérationnels, ancre directe `#/accueil?section=rp-how` accessible et focalisée. Aucun compte, colis, paiement ou e-mail n’a été créé ou envoyé. Recette sur API publique temporaire en mémoire. TypeScript et le build final Vite sont validés (87 modules). Publication vérifiée sur 100 % du trafic Cloudflare : HTML, JavaScript, CSS, logo, police et licence servis identiques au build par SHA-256 ; API publique 200 et cinq routes privées contrôlées 401 sans exposition de données. Les 476 tests de la reprise précédente restent datés ; aucune suite métier relancée pour ce changement de texte et de disposition.
