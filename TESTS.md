# Validation de Reparapid

Copie indépendante créée le 12 octobre 2026. Les recettes de la vitrine RépaRapid et du parcours d’envoi ci-dessous décrivent la personnalisation de cette copie. Les recettes de La Clinique Rétro sont conservées dans une section historique distincte.

Validation initiale de l’import le **12 octobre 2026**, avec Node **24.19.0** : `npm ci`, compilation TypeScript/Vite et **434 tests réussis** (393 Node/domaine/API et 41 Cloudflare). Ce résultat décrit la copie avant le nouveau parcours public. Les tests API utilisent des serveurs temporaires et l’accès aux sockets locaux.

Documentation mise à jour le **13 octobre 2026** ; les résultats ci-dessous restent rattachés à leur date de vérification. Pour la reprise détaillée, lire [CONTEXTE_PROJET.md](CONTEXTE_PROJET.md).

## Dernier ajustement visuel : « par Maxxi Games »

Le mot « par » précède le logo sur une même ligne, dans l’en-tête et le pied de page de l’accueil et des tutoriels. TypeScript et le build final réussissent : 94 modules, six sources publiques et 135 fichiers, dont 123 pages de guides. Recette Node en mémoire à 1280 px : texte placé avant l’image, logo chargé et aucun débordement, accueil et catalogue contrôlés. Serveur arrêté avec Store inchangé. La signature est aussi vérifiée sur l’accueil publié.

Publication à 100 % du trafic Cloudflare : 123 pages conformes au build et 140 contrôles SEO réussis ; sept assets principaux conformes, API publique 200 et cinq API privées 401. Aucune modification D1. Cet ajustement de texte et CSS n’a pas relancé la suite métier ; les 523 tests ci-dessous restent le résultat de la reprise précédente.

## Résultat de la reprise précédente : 120 tutoriels et logo Maxxi Games

**523 tests réussis (478 Node/domaine/API + 45 Cloudflare)**, aucun échec, test annulé ou ignoré. Après les deux dernières précisions éditoriales Steam Deck, les **13 tests de guides** et TypeScript ont été réexécutés avec succès. Le build final de **94 modules** réussit en 1 min 26 s : **six sources publiques autorisées**, **135 fichiers de build**, dont **123 pages HTML de guides**, les deux ressources SEO et le petit script de recherche. Les dernières précisions sont présentes dans le HTML final ; le contrôle des espaces du diff est réussi.

Recette sur un serveur Node temporaire en mémoire : catalogue de 120 cartes/SVG, catégorie consoles de 72 articles et catégorie smartphones de 48 ; aucun débordement horizontal ni SVG hors cadre à la largeur effectivement observée de **1280 px**. Aucun identifiant de gradient dupliqué. Recherche Samsung : 10 résultats ; « écran » et « ecran » : 18 chacun ; « iPhone batterie » : 5 ; requête sans résultat : zéro et message visible. Effacer rétablit 120 cartes et le focus sur le champ. Le lien de famille iPhone efface le filtre et rejoint la bonne ancre. Articles iPhone 13 et Pixel 7 : deux FAQ, CTA contact, aucun script externe ni débordement ; retour au contact de l’accueil fonctionnel. Accueil : logo Maxxi Games chargé, trois teasers et compteur de 120 guides. Aucun formulaire de contact envoyé.

Les réglages du viewport du navigateur intégré ont été demandés à 390 et 320 px, mais la surface de recette est restée à 1280 × 720. **Cette reprise ne revendique donc pas une nouvelle recette réelle à ces largeurs mobiles** ; les vérifications mobiles documentées pour la version précédente restent historiques. Les styles conservent leurs règles responsive, mais ce constat n’équivaut pas à une validation visuelle sur téléphone. Cette recette vérifie les pages ; elle n’a pas réalisé les réparations physiques décrites.

Onglets temporaires fermés, viewport rétabli et serveur arrêté avec **Store strictement inchangé**. Aucun compte, dossier, paiement, e-mail, import, export, reset ou écriture de données de production.

Publication vérifiée sur **100 % du trafic Cloudflare** : **123 pages HTML** et les fichiers robots/sitemap identiques au build par SHA-256, ainsi que le script de recherche. **140 contrôles SEO réussis** : pages/canonical, articles sans bundle applicatif, script sur les trois catalogues seulement, huit alias connus 308, cinq chemins inconnus/de sources 404, HEAD 200 sans corps et hash du script. Les **sept assets principaux**, incluant le nouveau logo Maxxi Games, sont conformes ; API publique 200 et cinq API privées 401. Contrôle complémentaire : quatre API privées 401 avec `no-store`, et 18 GET/HEAD privés 404 avec `no-store`. Aucune migration, écriture D1 ou modification DNS.

Périmètre : 96 nouveaux articles, 120 au total (72 consoles/manettes, 48 smartphones), deux catégories, recherche progressive autonome et logo Maxxi Games dans la signature publique. Aucun changement de règle métier ou de schéma D1. Les tests utilisent des bases temporaires et des coordonnées fictives.

La suite contrôle l’égalité des 120 slugs avec les articles, leurs métadonnées et sections, les 240 exemples/FAQ, le rendu sans bundle applicatif, les catégories de 72/48 articles, le petit script autonome et les 124 URL du sitemap. Les tests Node/Worker vérifient GET/HEAD, alias 308, chemins inconnus refusés, frontières entre fichiers sources et générés, liens symboliques et disponibilité du nouveau PNG de marque.

## Résultat de la première version : 24 tutoriels et retrait du Journal

Le **13 octobre 2026**, la reprise **24 tutoriels DIY et retrait du Journal d’activité** a passé la suite intégrée : **522 tests réussis (477 Node/domaine/API + 45 Cloudflare)**, aucun échec, test annulé ou ignoré. Le contrôle des espaces du diff est réussi. TypeScript et le build Vite final ont réussi avec **88 modules**, cinq sources publiques autorisées et **35 fichiers de build**, dont les 25 pages HTML des guides, `robots.txt` et `sitemap.xml`. La recette locale finale est réussie. La publication est **vérifiée sur 100 % du trafic Cloudflare**, avec 25 pages et fichiers SEO conformes au build et **37 contrôles SEO réussis** ; les détails figurent ci-dessous.

## Résultat automatisé de la reprise précédente

Le **13 octobre 2026**, la suite intégrée finale a passé **510 tests (465 Node/domaine/API + 45 Cloudflare)**, sans échec ni test ignoré. La série ciblée de confidentialité a passé **38 tests** et celle d’apparence **14 tests**. TypeScript et le build final Vite ont réussi avec **87 modules** ; cinq fichiers sources publics et huit fichiers de build sont autorisés. La recette et la publication du durcissement, de la suppression locale et des ajustements d’interface sont vérifiées et détaillées ci-dessous.

La reprise précédente **Demandes du site et Contactez-nous**, le **13 octobre 2026**, avait passé **476 tests (431 Node/domaine/API + 45 Cloudflare)**. Deux nouveaux tests Node et Worker couvraient la réception et la clôture ; son build de 87 modules, sa recette et sa publication restent des résultats historiques de cette étape. Le projet exige Node 22.16 ou supérieur.

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
| Liste publique de fichiers, chemins, contrôle des sources/builds et fichiers interdits | tests/public-assets.test.mjs |
| 24 tutoriels, manifeste, HTML complet, métadonnées, sitemap, garde source/build, GET/HEAD, alias 308 et refus des pages inconnues Node/Worker | tests/repair-guides.test.mjs |
| Worker/D1, fragments atomiques et sécurité | tests/cloudflare-worker.test.mjs, tests/cloudflare-database.test.mjs, tests/cloudflare-security.test.mjs |

Les identifiants fixes sont exclusivement des fixtures. Les tests utilisent des bases isolées et des transports e-mail simulés ; ils ne créent pas de comptes dans l’atelier réel et n’envoient pas de message client réel.

## Validation des tutoriels et du retrait du Journal d’activité

La suite de tutoriels vérifie le manifeste de **24 slugs distincts**, sa correspondance avec les contenus et les fichiers publics exacts, les titres et descriptions uniques, les sections complètes et les liens internes. Le rendu doit contenir un seul H1, le canonical attendu, Open Graph, la date éditoriale du **13 octobre 2026**, l’auteur **RépaRapid · Maxxi Games**, `Article`/`BreadcrumbList` et `CollectionPage` sur le catalogue. Les FAQ doivent être visibles sans schéma `FAQPage` ; les articles ne chargent pas le bundle JavaScript de l’application.

Les vérifications Node et Worker couvrent GET/HEAD des **25 pages HTML** et des fichiers SEO avec MIME et `nosniff`, HEAD sans corps, les variantes connues sans slash final ou avec `index.html` redirigées en **308**, les méthodes refusées et les chemins inconnus en **404**. Elles contrôlent aussi les liens symboliques, les fichiers et dossiers non autorisés, et le refus de copier les guides ou fichiers SEO dans `public/`. Le générateur doit refuser un lien symbolique avant l’écriture, produire toutes les pages déclarées et le contrôle final doit détecter une page manquante.

Le sitemap doit contenir **26 URL canoniques** du domaine actuel : accueil, catalogue et 24 articles, sans API, route hash ou domaine WordPress. `robots.txt` doit annoncer ce sitemap et exclure `/api/` de l’exploration. Les contrôles de sécurité de fichiers publics et les autorisations API restent requis ; un fichier robots n’autorise ni ne protège une lecture privée.

Commandes de validation sur les sources :

~~~sh
npm test
npm run typecheck
npm run build
~~~

Le build contrôle `public/` avant Vite, rend les **25 pages** après Vite avec `scripts/generate-repair-guides.mjs`, puis vérifie la présence de tous les fichiers générés et la liste publique. Aucun HTML de tutoriel n’est à écrire directement dans `public/` ou `dist/`.

Pour consulter le résultat localement, utiliser `npm run build` puis `npm start`, ou servir le `dist/` obtenu depuis un serveur Node temporaire de recette. Reconstruire après toute modification du contenu. Le serveur Vite de développement ne génère pas les pages statiques des guides à la volée.

Recette finale réalisée sur un serveur Node temporaire en mémoire avec des données fictives :

- Catalogue à **1280, 390 et 320 px** : **24 cartes et 24 SVG** entiers, texte contenu et aucun débordement horizontal. Accueil aux mêmes largeurs : trois teasers, liens **Tutoriels** de l’en-tête et du pied de page, illustrations dans leurs cadres.
- Articles PS5 et Steam Deck à **1280 et 320 px**, article Switch à **320 px** : sommaire fonctionnel, FAQ native ouverte, deux exemples et deux FAQ, sans script JavaScript applicatif. Le contenu des 24 articles est aussi vérifié par les tests de rendu.
- CTA Steam Deck ouvrant le formulaire avec filtre **Autre** et choix **Autre console**. Liens de compte et de formulaire partant de la racine de l’application.
- Connexion d’un administrateur fictif : huit rubriques, **Journal d’activité** absent, dashboard sans son lien **Voir tout**, aucun lien vers `#/activity`, ancienne route affichant une page inexistante. **Inscriptions** reste absent. Inventaire avec onze illustrations communes et un repli.
- Déconnexion retirant les vues privées, **Store serveur strictement inchangé** et serveur temporaire arrêté. Aucun export, import, reset, paiement, e-mail ou écriture de données de production.

Après une publication autorisée avec la configuration privée de cette installation, comparer les **25 pages**, les bundles, les assets de marque, `robots.txt` et `sitemap.xml` servis au build validé. Vérifier les canonical, GET/HEAD et alias 308, les chemins de guides inconnus en 404, l’API publique et les refus anonymes des routes privées. La configuration Cloudflare doit laisser `html_handling` et `not_found_handling` à `none` pour conserver le routage décidé par le Worker. Aucun import, reset ou migration D1 n’est nécessaire.

Publication finale vérifiée le **13 octobre 2026** sur **100 % du trafic Cloudflare** :

- **25 pages HTML** du catalogue et des 24 articles en HTTP 200, avec SHA-256 identiques au build final ; `robots.txt` et `sitemap.xml` également conformes.
- **37 contrôles SEO réussis** : pages et canonical, absence de bundle applicatif, quatre redirections connues en HTTP 308, cinq chemins inconnus ou de sources en HTTP 404, HEAD en HTTP 200 sans corps.
- Six assets principaux **HTML, JavaScript, CSS, logo, police et licence** conformes au build par SHA-256 ; API publique en HTTP 200 et cinq routes privées en HTTP 401.
- Contrôle complémentaire de confidentialité : quatre API privées en HTTP 401 avec `no-store`, et **18 GET/HEAD** de fichiers privés en HTTP 404 avec `no-store`.
- Aucune migration, écriture de données de production ou modification DNS.

**Limites :** ces vérifications confirment la présence du contenu et le socle technique du référencement. Elles ne prouvent aucune indexation ni position Google ; la Search Console n’a pas été consultée. Le WordPress et le DNS de **reparapid.fr** restent inchangés, avec canonical sur **https://reparapid.aldeguer-remi.workers.dev**. La validation de 510 tests ci-dessus reste historique.

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

## Validation finale du 13 octobre : backend et fichiers publics

Liste explicite d’assets publics partagée entre Node et Worker, refus des fichiers non autorisés même copiés dans `dist/`. Le build vérifie **public/ avant Vite**, pour détecter les liens que Vite peut déréférencer ; seules les images de marque, le favicon, la police et sa licence fixes sont admis, sans HTML ou faux bundle JavaScript/CSS copié. `dist/` reste contrôlé après Vite contre liens symboliques, exports, configurations, source maps et fichiers inconnus. Les exports et brouillons Reparapid sont exclus du dépôt. Les réglages permettent la suppression confirmée de l’ancienne copie locale, sans purge automatique, sans retrait d’une copie modifiée depuis sa lecture et sans modification du serveur.

Résultat final : **510 tests réussis (465 Node/domaine/API + 45 Cloudflare)**, aucun échec ni test ignoré ; **38 tests ciblés de confidentialité** réussis. **14 tests d’apparence** réussis, dont la parité des 38 modèles du catalogue entre site et atelier. TypeScript et le build final de **87 modules** validés ; contrôle des cinq fichiers sources publics et huit fichiers de build réussi. Aucun schéma, contrat métier ou migration ne change. Le backend conserve les gardes de session, propriétaire, atelier, origine, CSRF et révision.

Recette privée sur serveur Node en mémoire, avec un client, douze consoles, neuf dossiers et une demande de pièce client entièrement fictifs :

- Connexion admin et réglages sans inscriptions ; ancienne route `#/super-admin/registrations` affichant une page inexistante.
- Tableau de bord et détail de réparation sans demandes de pièces clients ; paiement et coût fictif de **27,15 €** conservés.
- Inventaire avec onze illustrations `ShopConsoleArt` et un repli pour un modèle non couvert ; identifiants de gradients uniques. Aucun SVG hors cadre ni débordement horizontal à **1280 et 320 px**.
- Portail du même client : section, compteur et action de pièces absents malgré une demande encore présente dans les données ; statistiques et illustrations communes conservées, sans débordement à **320 px**.
- Suppression locale : copie fictive changée entre lecture et clic conservée, confirmation restant ouverte ; après relecture et nouvelle confirmation, copie supprimée et boutons de récupération/suppression retirés.
- Déconnexions client/admin retirant les vues privées ; onglet temporaire fermé, dimensions du navigateur rétablies et serveur temporaire arrêté. Le JSON du Store serveur est resté **strictement inchangé**. Aucun export, import, reset ou paiement réel.

Le retrait visible des pièces clients concerne uniquement le magasin et le portail principaux RépaRapid. Les ateliers distincts, le stock, les accessoires, les anciennes données `clientParts` et les API sont conservés.

Le menu **Inscriptions** et sa branche d’interface sont retirés ; les réglages et libellés ne proposent plus de créer ou valider d’autres administrateurs/ateliers. Le compte du magasin, les comptes clients et l’admission sont préservés ; les anciennes API restent inchangées. Les illustrations de l’atelier utilisent celles du site, avec photos prioritaires et repli pour les modèles non couverts.

Publication vérifiée sur **100 % du trafic Cloudflare** : SHA-256 du HTML, du JavaScript, du CSS, du logo, de la police et de sa licence identiques au build final ; API publique en HTTP 200 et cinq routes privées contrôlées en HTTP 401 sans exposition de données. Vérification complémentaire : quatre API privées en HTTP 401 avec `no-store`, et **18 requêtes GET/HEAD vers neuf chemins de fichiers interdits en HTTP 404 avec `no-store`**. Aucune migration, réinitialisation ou modification de données de production.

Ces contrôles ne chiffrent pas le JSON dans la base ou les exports explicites. Les données fournies à un navigateur autorisé y restent lisibles. La différence de réponse à l’inscription pour une adresse déjà enregistrée reste connue et n’est pas présentée comme corrigée ; sa fermeture complète requiert un parcours de possession d’e-mail encore à décider.

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
