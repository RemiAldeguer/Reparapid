# Reparapid

Site de réparation de consoles pour **RépaRapid · Maxxi Games**, au Kremlin-Bicêtre, et application de gestion des dossiers du magasin. Cette copie indépendante de La Clinique Rétro a été créée le 12 octobre 2026 ; elle conserve le métier et l’administration de l’application d’origine. Le dépôt contient les sources, les migrations, les tests et la documentation ; chaque installation démarre avec sa propre base vide.

**Vitrine publiée : [https://reparapid.aldeguer-remi.workers.dev](https://reparapid.aldeguer-remi.workers.dev).** Nouveau parcours de réparation publié et vérifié le 12 octobre 2026 : HTML, JavaScript et CSS identiques au build, coordonnées publiques accessibles et routes privées refusant les accès anonymes. La D1 dédiée et ses quatre migrations sont conservées. Le compte administrateur principal a été créé et sa connexion vérifiée le **13 octobre 2026**, sans modification des clients, dossiers ou données de l’atelier. Les e-mails ne sont pas configurés.

Le domaine [reparapid.fr](https://reparapid.fr/) conserve son site WordPress. Aucune bascule DNS ni modification de ce site n’a été effectuée ; l’application Cloudflare utilise actuellement l’adresse `workers.dev` ci-dessus.

La configuration effective de cette machine est `.wrangler/reparapid.production.jsonc`, exclue de Git. Elle contient les identifiants du compte et de la D1 dédiée. Le fichier versionné `wrangler.jsonc` reste un modèle portable avec un identifiant nul : configurez une nouvelle base pour une autre installation. Aucun déploiement Cloudflare n’est effectué par la CI GitHub.

Pour republier cette installation depuis cette machine :

```sh
npm run build
npx wrangler deploy --config .wrangler/reparapid.production.jsonc
```

**Réparer. Préserver. Rejouer.**

**Reprise dans une nouvelle session IA :** commencer par [CONTEXTE_PROJET.md](CONTEXTE_PROJET.md), le guide de l’architecture, du métier, de la sécurité, du déploiement et des évolutions de cette conversation. [AGENTS.md](AGENTS.md) sert de point d’entrée aux agents ; [TESTS.md](TESTS.md) consigne la validation actuelle.

La vitrine permet à un particulier de demander une réparation, de créer son compte et de préparer l’envoi de sa console. L’accès **Magasin** ouvre l’application protégée : clients, consoles, dossiers, stock, paiements et exports. L’espace client présente uniquement les consoles et demandes de son propriétaire. Le socle d’ateliers distincts est conservé côté serveur ; le rôle effectif du compte du magasin reste celui de la plateforme, tandis que l’interface affiche Administrateur.

## Tutoriels de réparation de consoles et smartphones

Le catalogue [/guides/](https://reparapid.aldeguer-remi.workers.dev/guides/) rassemble **120 tutoriels en français**, dont **96 ajoutés lors de cette reprise**. Deux pages facilitent la navigation : [Consoles et manettes](https://reparapid.aldeguer-remi.workers.dev/guides/consoles/) (**72 guides**) et [Smartphones](https://reparapid.aldeguer-remi.workers.dev/guides/smartphones/) (**48 guides**). Les familles sont PlayStation (19), Nintendo (29), Xbox (14), Sega (7), Steam Deck (3), iPhone (24), Samsung Galaxy (10), Google Pixel (8), Xiaomi/Redmi/Poco (4) et Motorola (2).

Chaque article présente symptômes, matériel, procédure, contrôles, conditions d’arrêt, deux exemples, deux questions fréquentes et sources primaires liées : **240 exemples et 240 FAQ**. Les remplacements concernent des modèles précis ; les étapes abrégées renvoient aux procédures illustrées du fabricant ou d’iFixit. Les démontages précisent les risques de batteries et nappes, ainsi que les limites de calibration et d’étanchéité. Aucun prix, délai ou témoignage client n’est inventé. Les guides smartphones renvoient au contact de l’atelier ; ils ne créent pas de demande dans le formulaire réservé aux consoles.

Le contenu complet est rendu en HTML statique pendant le build et reste lisible sans JavaScript. Une recherche progressive, limitée au catalogue et aux deux catégories, filtre localement par famille, marque, modèle et panne, avec normalisation des accents et cumul des mots. Elle indique le nombre de résultats, permet d’effacer la recherche et masque les familles vides. Sans JavaScript, toutes les cartes et liens restent visibles. Ce petit script n’utilise ni stockage, ni réseau, ni bundle de gestion. Les illustrations natives comprennent consoles, manettes et smartphones ; les trois cartes de l’accueil ouvrent des guides Switch, PS5 et iPhone.

Les titres/descriptions uniques, canonical/Open Graph, fil d’Ariane et données structurées `Article`/`BreadcrumbList` sont conservés. Les trois catalogues utilisent `CollectionPage` avec la liste de leurs articles ; les FAQ restent visibles sans schéma `FAQPage`. La date éditoriale est fixe, indépendante du rebuild. Le sitemap contient **124 URL** : accueil, catalogue, deux catégories et 120 articles ; aucune API ou route hash privée. `robots.txt` annonce le sitemap et exclut `/api/` de l’exploration, sans remplacer les autorisations serveur.

Le canonical reste **https://reparapid.aldeguer-remi.workers.dev**. Le WordPress et le DNS de **reparapid.fr** restent inchangés. Aucune indexation ou position Google n’est prouvée ; Search Console n’a pas été consultée. Le Journal d’activité et sa route d’interface restent retirés ; les événements du domaine sont conservés.

**Validation : 523 tests réussis (478 + 45)**, 13 tests de guides et TypeScript revérifiés après les dernières précisions, build final de 94 modules et 135 fichiers. La publication reçoit 100 % du trafic Cloudflare ; 123 pages et les ressources SEO/recherche correspondent au build, avec 140 contrôles SEO réussis et sept assets principaux conformes, dont le logo Maxxi Games. Les API privées restent refusées aux visiteurs anonymes. Recette visuelle réelle à 1280 px ; les tentatives de viewport mobile sont restées à cette largeur et ne constituent pas une nouvelle validation sur téléphone. Le détail et les limites figurent dans [TESTS.md](TESTS.md). Le résultat antérieur de 522 tests, 25 pages et 37 contrôles SEO concerne le premier catalogue de 24 articles.

### Modifier ou générer les guides

Les 24 articles initiaux sont dans `src/repair-guides-content.ts`, qui agrège `repair-guides-consoles-extra.ts`, `repair-guides-iphone.ts` et `repair-guides-android.ts`. Les slugs correspondants sont déclarés par `repair-guides-manifest.mjs` et les trois modules `repair-guide-slugs-*.mjs`. Maintenir l’égalité entre contenu et manifeste, ainsi que l’unicité des métadonnées ; les tests les vérifient.

`src/repair-guides.tsx` rend les pages, `repair-guide-families.ts` décrit les familles, `guide-device-art.tsx` complète les SVG existants et `guide-catalog-search.ts` porte la recherche. `npm run build` compile le métier, vérifie TypeScript et `public/`, lance Vite puis génère **123 pages HTML de guides**, `sitemap.xml`, `robots.txt` et un script de recherche nommé par hash. esbuild 0.28.2 sert au rendu temporaire et à ce script ; aucun bundle applicatif n’est chargé par les articles. Le contrôle final exige tous les fichiers déclarés. Corriger les sources, jamais `dist/` ni les sorties compilées.

Pour consulter localement, construire puis utiliser `npm start` ou un serveur Node temporaire servant le `dist/` validé. Vite ne génère pas ces pages à la volée. Node et Worker partagent la liste exacte des fichiers dans `server/public-assets.mjs` : GET/HEAD des pages connues, 308 pour leurs alias sans slash et `index.html`, refus des chemins inconnus et liens symboliques. La liste source accepte seulement les assets de marque déclarés ; elle n’autorise aucun HTML, export ou fichier SEO copié dans `public/`.

Une publication utilise la configuration privée `.wrangler/reparapid.production.jsonc`, avec `run_worker_first=true`, `html_handling: "none"` et `not_found_handling: "none"`. Comparer le build final aux pages, scripts et assets réellement servis. Cette évolution ne demande aucune migration ni import D1. Pour un futur changement de domaine, modifier `GUIDE_ORIGIN` et `index.html`, vérifier les origines applicatives, reconstruire et contrôler les canonical, robots et sitemap.

## Identité visuelle RépaRapid

Le logo original du [site RépaRapid](https://reparapid.fr/) est repris sans retouche dans `public/reparapid-logo-original.webp`. Il apparaît sur la vitrine, le portail client principal, la fiche récapitulative et le favicon. Le favicon utilise le PNG original `public/favicon-reparapid.png`. La direction visuelle reprend les en-têtes et pieds de page noirs, un accueil rouge `#a32720` avec motifs géométriques CSS et des accents `#b21414`.

La signature « par Maxxi Games » associe le mot « par » au logo rouge et jaune sur une même ligne dans l’en-tête et le pied de page publics, ainsi que dans les tutoriels. Le fichier PNG est auto-hébergé, sans retouche, dans `public/maxxi-games-logo-original.png` ; le cadrage CSS présente son bandeau central. Source : [logo de la fiche Maxxi Games inSiti](https://www.insiti.com/search/enseignes/maxxi-games-jeux-video), [fichier public](https://s3.eu-west-3.amazonaws.com/insiti.com/logos/5064/big_square/168541.png). SHA-256 : `53bd6208fff112eea9de9520551c87a944a7d80fd17a5088eb076bc71f976461`. Il est déclaré explicitement dans la liste des assets fixes partagée par Node et Worker.

Les titres et la navigation utilisent **Oxanium**, auto-hébergée dans `public/fonts/oxanium.ttf`, avec sa licence `public/fonts/oxanium-OFL.txt`. La source est le [répertoire officiel Google Fonts](https://github.com/google/fonts/tree/main/ofl/oxanium). Cette reprise concerne la présentation ; le parcours, les règles métier et les API restent identiques. TypeScript et le build Vite sont validés ; les assets HTML/JS/CSS, le logo et la police de la version publiée sont identiques au build validé.

Les illustrations partagées de la vitrine et de l’atelier sont des SVG natifs dans `src/shop-console-art.tsx` et `src/shop-console-art.css`, avec reconnaissance des silhouettes dans `src/shop-console-kind.ts`. Les 38 choix du catalogue utilisent les mêmes modèles dans l’accueil, le formulaire et la gestion. Les photos restent prioritaires ; les accessoires, modèles non couverts et certaines variantes rétro gardent une illustration de repli.

### Harmonisation de la gestion du magasin

Une nouvelle reprise du **13 octobre 2026**, préparée dans les sources, applique l’identité RépaRapid à la connexion du magasin, la navigation, les écrans de gestion et le logo des factures : noir, rouge et titres Oxanium. Les styles dédiés sont dans `src/backoffice-theme.css` et `src/backoffice-components.css`. Les états métier et les graphiques gardent leurs couleurs de lecture.

`src/reparapid-identity.ts` présente le nom d’atelier importé par défaut sous **RépaRapid · Maxxi Games** ; un nom personnalisé reste affiché tel quel. Les libellés et les noms des fichiers téléchargés utilisent Reparapid. Les clés de stockage et les canaux de session existants sont conservés, sans migration ni modification automatique des données.

Le formulaire `#/demande-reparation` borne désormais les cadres et SVG des consoles, ainsi que les libellés longs, dans `src/repair-intake.css`. La recette sur un serveur Node temporaire en mémoire a contrôlé la connexion et neuf pages de gestion, puis les principales vues à 320 px sans débordement. Les 38 illustrations du formulaire restent dans leur cadre à 1280, 390 et 320 px. Un aperçu de facture simple fictive conserve son total et l’identité RépaRapid ; aucune impression ni facture de production n’a été réalisée.

Le **build final et TypeScript ont réussi avec 85 modules**. La publication de cette harmonisation est vérifiée sur 100 % du trafic Cloudflare : SHA-256 du HTML, du JavaScript, du CSS, du logo, de la police et de sa licence conformes au build final, API publique en HTTP 200 et cinq routes privées contrôlées en HTTP 401 sans exposition de données. La suite métier n’a pas été relancée ; le résultat de 474 tests du 12 octobre reste historique. La publication précédente ci-dessous concerne les engagements, avis et nouvelles illustrations.

## Parcours expliqué sur l’accueil — 13 octobre 2026

La section **Votre réparation, pas à pas** précise les quatre étapes : modèle et symptômes, enregistrement avec un compte nouveau ou existant au statut **En attente d’envoi**, impression de la fiche et expédition vers l’adresse confirmée, puis réception et prise en charge à l’atelier avec suivi des étapes et du montant. Les trois actions du client et le relais de RépaRapid sont distingués visuellement. Le statut **Prête à récupérer** invite à organiser le retrait ou le retour avec le magasin. La fiche identifie le dossier ; affranchissement et étiquette de transport se prévoient séparément. Le montant est confirmé après diagnostic, sans paiement dans le formulaire. Aucun texte de diagnostic interne n’est promis au client.

Deux liens proposent de commencer une demande ou de retrouver un dossier. L’ancre `#/accueil?section=rp-how` ouvre directement cette section. La recette à 1280, 390 et 320 px valide les quatre cartes, leur ordre, l’absence de débordement de texte et les destinations des liens. TypeScript et le build final Vite sont validés (87 modules). Publication vérifiée sur 100 % du trafic Cloudflare : HTML, JavaScript, CSS, logo, police et licence servis identiques au build par SHA-256 ; API publique 200 et cinq routes privées contrôlées 401 sans exposition de données. Aucun métier, API, schéma ou donnée d’atelier ne change ; la suite complète de **476 tests** appartient à la reprise fonctionnelle précédente et n’a pas été relancée pour cette présentation.

## Engagements et avis publics

La section **Nos engagements**, ajoutée le **13 octobre 2026**, reformule les informations du [site RépaRapid](https://reparapid.fr/) : interventions courantes annoncées en une heure, délai de 24 à 48 heures si une pièce doit être commandée, hors forte affluence, et prise en charge par un technicien expérimenté. Le site présente un atelier ouvert depuis sept ans, accueillant le public du mardi au samedi, de 10 h à 20 h, sauf exceptions. Ces délais concernent l’intervention à l’atelier ; le transport de la console s’ajoute séparément.

La vitrine présente trois courts extraits d’avis Google vérifiés dans le widget public Trustindex de [reparapid.fr](https://reparapid.fr/), avec le nom de l’auteur, la date et les cinq étoiles de chaque avis :

| Auteur public | Date de l’avis | Note |
| --- | --- | --- |
| XevilHaxx | 5 juin 2026 | 5 étoiles |
| Amin Gasmi | 25 octobre 2025 | 5 étoiles |
| Ibrahim Camara | 7 mai 2025 | 5 étoiles |

Les extraits sont une sélection datée, sans moyenne ni compteur d’avis. Ils ne se mettent pas à jour automatiquement. La source est indiquée sous les cartes ; le bouton **Tous les avis Google** ouvre la [fiche Google Maps de l’atelier](https://www.google.com/maps/search/?api=1&query=Reparapid%20Le%20Kremlin-Bicetre&query_place_id=ChIJIxKphttx5kcRw7EU2fbERBg) pour consulter les avis complets.

Le build final et TypeScript ont réussi avec **82 modules**. La recette à **1280 px et 320 px** a vérifié les engagements, les avis et les illustrations sans débordement. La publication a été vérifiée le **13 octobre 2026** : version active sur 100 % du trafic Cloudflare, HTML, JavaScript, CSS, logo, police et licence identiques au build final par SHA-256, API publique en HTTP 200 et routes privées contrôlées en HTTP 401 sans exposition de données. La suite de **474 tests du 12 octobre** demeure la dernière validation métier complète, sans nouvelle exécution pour ces changements de présentation.

## Demander une réparation et préparer l’envoi

Depuis **Demander une réparation** (`#/demande-reparation`), le client suit trois étapes :

1. Choisir la marque et le modèle de console, ou préciser un modèle via **Autre console**.
2. Sélectionner une ou plusieurs pannes courantes proposées pour ce modèle, ajouter une description et renseigner, si utile, le numéro de série et les accessoires.
3. Créer un compte client avec ses coordonnées et une phrase de passe, ou se connecter à son compte existant pour enregistrer la demande.

Le compte et la demande sont créés ensemble. Le dossier apparaît **En attente d’envoi** dans l’espace client et dans l’atelier du magasin. Un nouvel envoi peut être enregistré depuis le même compte ; un double enregistrement de la même demande ne crée pas un deuxième dossier. Une adresse déjà utilisée par un compte ne permet jamais de remplacer son mot de passe ni de récupérer une fiche client préexistante.

Dans l’espace client, **Voir ma fiche d’envoi** ou **Voir la fiche** ouvre le récapitulatif imprimable : référence du dossier, console, panne signalée, accessoires, coordonnées de l’expéditeur et destinataire. Le client le glisse dans le colis avant l’envoi. Cette fiche identifie le dossier ; le transporteur et l’affranchissement restent à organiser. **Imprimer / Enregistrer en PDF** ouvre le dialogue d’impression du navigateur. Le montant reste **À confirmer après diagnostic** tant que le magasin n’a pas chiffré l’intervention ; un montant explicitement fixé à zéro reste une intervention gratuite. Le formulaire n’encaisse aucun paiement.

Les coordonnées publiques initiales reprennent le [site RépaRapid](https://reparapid.fr/) : **RépaRapid · Maxxi Games, 30 bis, avenue de Fontainebleau, 94270 Le Kremlin-Bicêtre**, téléphone **01 58 46 82 51**, e-mail **contact@reparapid.fr**. Dans **Réglages → Vitrine Reparapid et adresse d’envoi**, l’administrateur du magasin peut corriger ces informations et confirmer que l’adresse reçoit les consoles. Si cette confirmation est désactivée, le client peut enregistrer sa demande, mais la fiche lui indique de contacter le magasin avant toute expédition.

À l’arrivée de la console, le magasin passe le dossier à **Réception**, puis utilise le diagnostic et le suivi de réparation existants. La fiche du client reste disponible après ce changement d’étape. Les notes, diagnostics, photos, tests et données internes du magasin restent exclus de cette fiche et du portail.

Les routes de ce parcours sont implémentées dans les deux hôtes Node/SQLite et Worker/D1. Les inscriptions publiques et les nouvelles demandes concernent exclusivement le magasin principal Reparapid ; une session d’un autre atelier ne peut y créer un dossier. Les écritures vérifient l’origine, la session et le CSRF lorsqu’elles sont authentifiées, avec contrôle atomique de révision et limitation des tentatives.

## Suivre les demandes du site au magasin

Le menu **Demandes du site** (`#/website-requests`), réservé au magasin principal, rassemble les réparations créées depuis la vitrine. Les compteurs et filtres distinguent **À réceptionner**, **En traitement**, **Prêtes à récupérer** et **Autres clôturées**. Recherche et tri permettent de retrouver une référence, un modèle, un client ou une panne ; les cartes présentent la console, les coordonnées du client et les symptômes. Elles utilisent les nouvelles silhouettes de consoles tout en conservant les photos déjà présentes.

**Confirmer la réception** demande de confirmer l’arrivée physique de la console, puis passe le dossier à **Réception**. Les actions suivantes suivent les transitions métier de l’atelier. Avant la clôture, la confirmation annonce que tous les tests seront marqués **OK** et que le chronomètre sera arrêté. Une étape modifiée depuis l’affichage bloque l’action et invite à consulter le dossier. Le détail permet de revenir aux demandes du site.

**Prête à récupérer** correspond au statut **Terminée**. Le retrait ou le retour de la console reste à organiser avec le client ; aucun nouveau statut d’expédition ou de remise n’est enregistré. Dans l’espace client, une demande terminée porte aussi **Prête à récupérer** et invite à contacter l’atelier pour convenir du retrait ou du retour.

## Contacter le magasin

**Contact** ouvre la section **Contactez-nous** de l’accueil, y compris depuis l’espace client. Elle reprend les coordonnées publiques du magasin, les horaires du mardi au samedi de 10 h à 20 h sauf exceptions, les liens téléphone/e-mail, l’itinéraire et les réseaux sociaux indiqués sur le [site RépaRapid](https://reparapid.fr/), vérifié le **13 octobre 2026**.

Le formulaire demande **Prénom**, **Nom**, **E-mail** et **Message**. **Ouvrir mon e-mail** prépare un message dans la messagerie de l’utilisateur via un lien `mailto:` ; l’utilisateur doit ensuite l’envoyer lui-même. Le formulaire ne transmet rien à un serveur et n’envoie aucun e-mail automatiquement. Aucun message réel n’a été envoyé pendant la recette.

Cette reprise a passé **476 tests** et le build final TypeScript/Vite de **87 modules**. Les parcours du magasin et du client ainsi que le contact ont été contrôlés sur une base temporaire, sans modifier la production. La publication est vérifiée sur **100 % du trafic Cloudflare** : SHA-256 du HTML, du JavaScript, du CSS, du logo, de la police et de sa licence conformes au build final ; API publique en HTTP 200 et cinq routes privées contrôlées en HTTP 401 sans exposition de données.

## Forfaits publics de réparation

Dans **Réglages → Forfaits de réparation du site**, l’administrateur principal peut renseigner les tarifs du magasin : modèle exact, symptôme, intervention précise, montant EUR TTC, prix fixe ou « à partir de » et contenu inclus. Cocher **Afficher sur le site** puis enregistrer publie le forfait ; **Masquer du site** retire sa présentation publique et conserve la fiche. Un nouveau forfait n’a aucun montant par défaut et n’est pas publié. Le prix zéro est accepté comme valeur explicite.

Le formulaire montre les offres du modèle et des symptômes choisis, avec confirmation par l’atelier après diagnostic. Une seule panne et un seul forfait peuvent afficher un prix principal ; plusieurs offres ou symptômes gardent le montant global à confirmer. Les prix ne sont pas additionnés automatiquement. La création d’un dossier, ses coûts, ses paiements et son montant dans le portail ne sont pas chiffrés à partir de cette grille.

Les [pages consoles du site d’origine](https://reparapid.fr/consoles/) proposent des devis sans grille chiffrée visible. Les montants réels ont été demandés à l’utilisateur et restent à renseigner. Aucun prix supposé, prix d’un concurrent ou tarif fictif de test n’est initialisé en production.

Le champ optionnel `settings.publicRepairPackages` est validé dans `domain.ts` : 200 entrées maximum, modèles/symptômes cohérents, identifiants uniques et montants 0–100 000 € limités à deux décimales. GET `/api/public/repair-intake` expose `{shop, repairPackages}` avec les forfaits publiés seulement, dans le contexte du magasin principal. Les POST publics conservent leurs champs autorisés et refusent les prix forgés. Le catalogue modèle/symptôme est partagé par `repair-intake-catalog.ts`, avec réexports conservés dans `repair-intake-domain.ts` et compilation CJS adaptée. Une sauvegarde ordinaire d’un ancien éditeur ne peut omettre la grille ; restaurations et réinitialisations explicites gardent leurs règles.

**531 tests réussis (486 + 45)**, TypeScript et build de 98 modules validés. Recette à 1280 px sur des bases en mémoire uniquement ; les détails et la publication figurent dans [TESTS.md](TESTS.md). Aucune migration SQL n’est nécessaire pour ce champ JSON optionnel.

## Administrateur Cloudflare et nouvelle installation

Le compte du magasin principal est initialisé depuis le **13 octobre 2026**. La connexion, le rôle effectif **super administrateur** et la déconnexion de la session de vérification ont été contrôlés. Les identifiants sont remis séparément et ne figurent pas dans le dépôt.

Pour une nouvelle installation D1 sans administrateur, configurez sa cible puis utilisez un terminal interactif :

```sh
npm run cloudflare:admin:create
```

La commande utilise par défaut `.wrangler/reparapid.production.jsonc`, vérifie qu’il cible le Worker et la D1 Reparapid, puis masque l’adresse e-mail, la phrase de passe et sa confirmation. Elle crée uniquement le premier compte administrateur. Un administrateur existant provoque un refus ; la commande ne propose aucune réinitialisation. Aucun identifiant de connexion par défaut n’est fourni. L’aide est accessible avec `npm run cloudflare:admin:create -- --help`.

## Génération de factures

Le menu **Factures**, le bouton **Créer une facture** de Finance et celui des dossiers clients ouvrent le générateur. Choisissez un client puis une ou plusieurs de ses réparations, y compris les dossiers clôturés et les interventions gratuites. La facture reprend la console, sa variante et son numéro de série, la référence du dossier, le titre, la panne saisie (ou le titre si la panne est vide), ainsi que le montant actuel de chaque réparation, pièces utilisées incluses. Les diagnostics, notes internes, tests, photos et données des autres clients ne figurent pas dans le document.

Deux formats sont disponibles. **Facture simple** reprend le nom de l’atelier et du client, la date, les consoles, les pannes, les montants et le total, sans coordonnées de facturation ni mentions légales. Le numéro et les notes sont facultatifs. **Facture complète** conserve le numéro, les dates, l’identité et les coordonnées de facturation de l’atelier et du client, ainsi que les options de TVA et les mentions.

Pour le format complet, renseignez le numéro selon votre séquence comptable : le générateur ne tient pas de registre de factures et ne réserve aucun numéro. La TVA est choisie explicitement ; le mode **TVA comprise** extrait la taxe des montants existants sans augmenter le total. Les champs de facturation restent dans la session, sans sauvegarde automatique des coordonnées saisies.

**Générer l’aperçu**, puis **Imprimer / Enregistrer en PDF** permet de produire le document depuis le dialogue d’impression du navigateur. L’aperçu est figé ; une modification du formulaire ou de la sélection oblige à le régénérer. Les données serveur sont relues avant sa préparation et son impression. Une révision devenue différente bloque l’impression pour éviter de reprendre un montant périmé. Cette action ne modifie ni les paiements ni les étapes et n’envoie pas d’e-mail. Les coordonnées et mentions à utiliser dépendent de votre activité ; les [mentions de facturation de Service Public](https://entreprendre.service-public.gouv.fr/vosdroits/F31808) sont accessibles depuis le formulaire.

## Administration du magasin

L’interface RépaRapid affiche **Administrateur** et ne propose plus les menus **Inscriptions** et **Journal d’activité**, ni la création ou validation d’autres administrateurs ou ateliers. Les anciennes routes d’interface `#/super-admin/registrations` et `#/activity` affichent une page inexistante et permettent de revenir au tableau de bord. Le compte du magasin, les comptes clients, leur inscription avec demande de réparation et les historiques métier sont conservés.

Ce retrait concerne l’interface : les API et règles d’inscription d’ateliers héritées restent présentes sur le serveur avec leurs autorisations existantes. Il ne désactive pas ces anciennes routes serveur et ne supprime aucun atelier ni compte. Leur rôle effectif serveur reste distinct du libellé **Administrateur** affiché dans l’interface.

L’isolation repose sur des tables propres à chaque atelier, désignées exclusivement par un UUID serveur. Un index de sessions associe les cookies opaques à l’atelier ; la session réelle de cet atelier reste vérifiée à chaque appel. Clients, consoles, réparations, sauvegardes, comptes clients, limitations et notifications restent dans leur atelier. Les liens clients incluent `?atelier=<UUID>#/espace-client` ; le lien du compte initial reste `/#/espace-client`. Les notifications de réparation des nouveaux ateliers utilisent le même lien et des clés d’idempotence propres à l’atelier.

Appliquez la migration **0004_saas_registrations.sql** avant de déployer le Worker. Elle ajoute le registre des ateliers, les demandes et l’index de sessions sans déplacer ou réécrire les données de l’atelier initial. Les tables des ateliers sont créées lors d’une approbation. La compatibilité du schéma historique conserve la valeur SQL `admin` ; le rôle public et les autorisations de plateforme sont déterminés côté serveur selon l’atelier initial ou un atelier inscrit.

## Démarrage

Prérequis : Node.js **22.16 ou supérieur**, npm et un terminal interactif. Le module natif `node:sqlite` est utilisé ; Node 22 affiche actuellement un avertissement expérimental à son chargement.

```sh
git clone https://github.com/RemiAldeguer/Reparapid.git
cd Reparapid
npm ci
npm run admin:create
npm run build
npm start
```

Pour une copie déjà clonée, remplacez les deux premières commandes par `git pull` dans le projet.

Ouvrez **http://127.0.0.1:3040**, choisissez **Accès magasin**, puis connectez-vous avec l’adresse et la phrase de passe choisies dans `admin:create`. La saisie du mot de passe n’est pas affichée. Aucun compte ni mot de passe par défaut n’est fourni. La commande refuse d’écraser un administrateur existant. Cette commande locale agit sur SQLite ; `cloudflare:admin:create` concerne une D1 sans administrateur. La production Reparapid possède déjà son compte principal.

L’atelier serveur commence vide. Les données de démonstration sont accessibles, après connexion, dans **Réglages & sauvegardes**. Le premier compte doit être créé sur le serveur qui héberge réellement l’application, avec le même `DATABASE_PATH` que l’API.

## Fonctionnalités

Tableau de bord, fiches consoles, photos, emplacement, coûts, stock et pièces, dossier patient, journal d’intervention, Kanban, chronomètre, tests de validation, impressions, exports JSON/CSV et restauration. Une seule réparation active est autorisée par console. Passer directement une réparation en **Terminée** marque tous ses tests **OK**, ajoute les contrôles standard si nécessaire, arrête le chronomètre et rend la console fonctionnelle. Le journal indique cette validation lors de la clôture directe. Rouvrir le dossier remet les tests à faire.

**Étapes de réparation :** En attente d’envoi, Réception, Diagnostic, En attente de pièces, Réparation en cours, Tests de validation, Terminée, Irréparable et Abandonnée. Une console déclarée en ligne reste en panne jusqu’au passage du dossier à Réception. L’ancien statut « À commander » est automatiquement converti en « En attente de pièces » à la lecture et lors de l’import de sauvegardes, sans modifier le journal historique, les paiements ou les interventions. La conversion seule ne déclenche aucun e-mail client.

**Pièces à demander au client (ateliers distincts) :** le panneau apparaît dès l’ouverture d’une fiche de réparation, juste après le client concerné, et reste visible dans tous les onglets. Sur ordinateur, il est placé à côté du paiement client ; sur les écrans plus étroits, les deux panneaux sont empilés. Ajoutez plusieurs demandes avec un nom, une quantité et des précisions destinées au client. Chaque pièce commence **En attente de la pièce** ; le client peut la **Marquer disponible** lorsqu’il l’a obtenue et peut la remettre à l’atelier. Ce signalement apparaît dans le suivi et le journal de l’atelier. L’atelier gère ensuite les statuts **Livrée** et **Installée**, et peut corriger les statuts indépendamment de l’étape du dossier. Les demandes apparaissent dans l’espace de leur client, dans l’impression du dossier et dans les sauvegardes JSON. L’ajout et la modification du contenu nécessitent un dossier ouvert rattaché à un client ; le signalement de disponibilité, les statuts et la suppression restent accessibles après clôture. Les pièces fournies par le client ne modifient ni le stock, ni le montant de la réparation, ni les paiements ou les tests. Leur mise à jour ne déclenche pas d’e-mail. Un ancien onglet doit être rechargé avant d’enregistrer un dossier contenant ces nouvelles demandes.

**Coût de l’intervention :** saisissez le montant dès **Nouvelle réparation**, ou dans le bilan d’un dossier, même après sa clôture. Ce montant en euros, hors pièces, remplace la valorisation horaire ; le coût des pièces est ajouté séparément au total. Laissez le champ vide à la création pour conserver le calcul au temps, ou saisissez zéro pour une intervention offerte. Le suivi du temps reste disponible et l’action **Calculer depuis le temps** rétablit le calcul horaire. Le montant est conservé dans les sauvegardes JSON et dans l’impression du dossier.

**Montant total dans le Kanban :** cliquez sur le montant ou le crayon d’une carte de l’atelier pour modifier directement le total, pièces incluses, puis **Enregistrer**. Le coût de l’intervention est ajusté ; les pièces utilisées et le paiement déjà reçu restent conservés. Le total ne peut pas être inférieur au coût des pièces utilisées. **Annuler** ou Échap ferme l’édition sans changement.

**Pièces demandées dans le Kanban (ateliers distincts) :** les cartes de réparation affichent le nom, la quantité et le statut des pièces demandées au client. Les pièces disponibles apparaissent en premier, suivies des pièces en attente. Les trois premières demandes sont visibles ; le bouton **Voir les autres demandes** déplie la liste complète dans la carte. Le statut **Disponible** signalé par le client est consultable au rechargement du suivi de l’atelier.

**Finance :** la vue réservée à l’admin compare les encaissements, les pièces des dossiers payés et le gain estimé par semaine (lundi à dimanche) ou par mois. Les fenêtres affichent les 12 semaines ou les 6 mois se terminant à la période de la date de référence. Les flèches et le calendrier permettent de parcourir l’historique, et **Aujourd’hui** retrouve la période courante. Les périodes suivent le calendrier de Paris. Les reçus sont affectés à leur date de paiement, quel que soit le statut actuel du dossier ; modifier son prix ne modifie pas le montant encaissé. Le gain estimé correspond à l’encaissement moins les pièces des dossiers payés, hors charges et temps de travail, et peut être négatif. Les montants à encaisser concernent les réparations terminées et non payées à leur date de clôture. Le détail des paiements permet d’ouvrir chaque dossier. Les consoles clients archivées sont incluses ; la collection personnelle est exclue. Cette vue exploite les dossiers conservés : annuler un paiement, supprimer un dossier, modifier ses pièces ou restaurer une sauvegarde actualise le suivi correspondant.

**Consoles et réparations liées :** les vues cartes et liste de l’onglet Consoles affichent les dossiers rattachés à chaque console, avec leur numéro, leur objet, leur étape et un accès direct. Les dossiers en cours apparaissent en premier. Deux dossiers sont visibles ; dépliez les suivants pour consulter tout l’historique. Une console sans dossier indique « Aucune réparation ».

**Suppression d’une console :** utilisez le bouton de suppression dans l’inventaire ou **Supprimer la console** en haut de sa fiche. Après confirmation, la console, ses photos, ses dossiers de réparation et leurs interventions sont retirés définitivement. Le client, son accès et ses autres consoles restent enregistrés. Les pièces déjà utilisées restent déduites du stock. Une trace de suppression conserve les numéros de la console et de ses dossiers, y compris après export/import. Les e-mails en attente concernant ces dossiers ne sont plus envoyés.

**Suppression d’un dossier :** le bouton rouge **Supprimer la réparation** en haut de sa fiche, à côté de **Modifier le dossier** demande confirmation, puis retire définitivement le dossier, ses notes, ses photos, ses temps et ses tests. La console et son client restent enregistrés. Les pièces déjà utilisées restent déduites du stock ; remettez-les explicitement en stock depuis le dossier avant sa suppression si elles n’ont pas été consommées. Le journal conserve une trace de suppression sans référence orpheline, et le numéro du dossier n’est pas réutilisé. Une console dont le seul dossier actif est supprimé revient en panne. Les e-mails en attente concernant ce dossier ne sont plus envoyés.

**Paiements clients :** dans une fiche de réparation rattachée à un client, le panneau **Paiement client** affiche **Payée / Non payée** et permet de **Marquer comme payée** après réception du règlement complet. Le montant total actuel, pièces incluses, et la date du paiement sont enregistrés ; ils restent conservés si le coût, le taux horaire ou l’étape évoluent ensuite. **Marquer comme non payée** corrige une erreur d’enregistrement et retire le montant du total encaissé. Les actions sont consignées dans le journal. Les anciens dossiers sont considérés non payés jusqu’à enregistrement explicite. Un petit bouton **Marquer payée** permet aussi d’enregistrer le règlement directement depuis les cartes et la liste de l’atelier, avec la même confirmation du montant. Les badges apparaissent dans les cartes et listes de l’atelier, les dossiers à suivre et les réparations liées aux consoles ; le filtre **Tous les paiements / Réparations payées / Réparations non payées** porte uniquement sur les réparations clients. Le suivi reste réservé à l’admin, est conservé dans les sauvegardes JSON et l’impression interne, et ne déclenche aucun e-mail. Il enregistre un règlement complet, pas un encaissement bancaire ni des acomptes.

**Ma synthèse :** le tableau de bord affiche trois totaux distincts. **Total théorique des réparations** cumule le coût courant de tous les dossiers clients, toutes étapes confondues, y compris ceux en cours, irréparables ou abandonnés, pièces incluses. Il exclut la collection personnelle et conserve les consoles clientes archivées. **Montant des réparations** cumule le coût actuel des réparations clients terminées, pièces comprises, avec le montant d’intervention saisi ou son calcul horaire. Les dossiers en cours, irréparables ou abandonnés sont exclus ; rouvrir un dossier le retire de ce total jusqu’à sa nouvelle clôture. **Total encaissé** cumule les montants effectivement enregistrés comme payés, quel que soit le statut du dossier, et conserve donc le règlement des dossiers rouverts. Les trois totaux incluent les consoles clients archivées et excluent la collection personnelle. Pour les ateliers distincts, sous ces trois totaux, la section **Pièces à fournir par les clients** rassemble toutes les demandes au statut **En attente de la pièce**, avec quantité, note, client, console et couleur, référence et accès au dossier. Elle distingue le nombre de demandes de la quantité totale attendue, affiche les plus anciennes en premier et défile dans une hauteur limitée. Les pièces disponibles, livrées ou installées n’y apparaissent pas ; une demande en attente reste visible après clôture du dossier. Ensuite, une liste compacte défilable affiche toutes les réparations clients, avec console et couleur, client, référence, étape, paiement, coût actuel et montant reçu. Le défilement fonctionne à la souris, au toucher et au clavier ; changer de filtre replace la liste en haut. Les dossiers non payés sont présentés en premier, puis les terminés et les plus récents. Les filtres **Toutes / Non payées / Payées** portent sur tous les dossiers clients, y compris les consoles archivées. Le bouton **Marquer payée** enregistre le règlement depuis la synthèse ; les accès rapides ouvrent le dossier ou le client. Les compteurs indiquent le nombre total de dossiers par filtre et le lien en bas ouvre l’atelier. Les totaux restent globaux, quel que soit le filtre de la liste. Le lien du total encaissé ouvre les dossiers payés. Supprimer une réparation ou sa console retire également son paiement enregistré du total ; conservez une sauvegarde avant de supprimer un historique financier.

**Clients :** référencez vos clients dans le module Clients, puis rattachez leurs consoles aux fiches correspondantes. Un client peut avoir plusieurs consoles et plusieurs demandes de réparation ; chaque demande reste un dossier suivi dans l’atelier. Les consoles de votre collection peuvent rester sans client. Le client concerné est affiché en haut de chaque fiche de réparation, avec un accès direct à sa fiche ; les consoles sans client sont indiquées comme faisant partie de la collection de l’atelier. Les clients et leurs liens sont inclus dans la sauvegarde JSON, protégés par la connexion administrateur et enregistrés avec le reste de l’atelier. Les anciennes sauvegardes sans clients restent importables.

**Nouvelle réparation :** depuis l’atelier, enregistrez directement une nouvelle console ou manette de toute marque, ou sélectionnez un équipement déjà référencé. La marque et le modèle restent libres ; le sélecteur Nintendo propose aussi les consoles de salon et leurs manettes. Renseignez le propriétaire, la couleur, le numéro de série et les accessoires déposés. La fiche et le dossier en Réception sont créés ensemble ; une erreur ne laisse aucune fiche incomplète. Les équipements archivés ou déjà en réparation restent exclus des choix existants.

**Accès clients :** ouvrez une fiche client, puis le panneau **Accès client** pour créer son identifiant e-mail et son mot de passe (15 à 128 caractères). Transmettez manuellement ces identifiants et le lien fourni par **Copier le lien** (il identifie l’atelier pour les nouveaux comptes) : aucun e-mail n’est envoyé automatiquement. Le portail affiche le nom de l’atelier, ses consoles, leurs demandes et leurs étapes, en mosaïque ou dans la vue détaillée. Son accueil résume les consoles et réparations. Dans les ateliers distincts, il met aussi les **Pièces demandées** directement en évidence : quantité, précisions destinées au client et statuts **En attente de la pièce / Disponible / Livrée / Installée**, regroupés par console et dossier, y compris après clôture. Le bouton **Marquer disponible** apparaît sur les pièces en attente, dans l’accueil et les détails ; il signale que le client a obtenu la quantité demandée. Le client ne peut modifier ni le contenu des demandes ni leurs statuts de réception ou d’installation. Les filtres permettent de retrouver les pièces à fournir, disponibles, livrées et installées ; les compteurs portent sur les quantités. Une recherche et des filtres facilitent le suivi des consoles, avec une progression par étapes sans afficher les tests effectués. Le **Montant actuel** de chaque dossier indique le total calculé par l’atelier, pièces utilisées incluses ; les pièces demandées au client ne sont pas facturées automatiquement. Les notes internes, diagnostics, détail des coûts des pièces, taux horaire, paiements enregistrés, stocks, temps de travail et données des autres clients restent privés. Vous pouvez réinitialiser ou désactiver un accès ; ces actions révoquent immédiatement ses sessions. Supprimer un client de l’atelier désactive son accès. Les comptes et leurs empreintes de mots de passe sont conservés dans la base serveur, séparément des exports JSON d’atelier.

**Administration :** connexion et déconnexion, rôle administrateur vérifié sur les routes API, changement de mot de passe avec vérification de l’ancien et révocation de toutes les sessions. La déconnexion efface les données chargées en mémoire par l’interface. Les autres onglets de la même origine reçoivent la déconnexion ; chaque requête serveur vérifie de toute façon la session.

**Notifications par e-mail :** après configuration du service d’envoi, chaque changement de statut d’une réparation existante informe l’adresse de contact de sa fiche client. Le message indique la console, la référence du dossier, l’ancien et le nouveau statut, avec un lien vers l’espace client. Les notes internes, diagnostics, prix et identifiants de connexion ne sont jamais inclus. Une nouvelle demande, une modification sans changement de statut, un import ou une réinitialisation ne déclenchent aucun e-mail. Les dossiers sans client ou sans adresse de contact sont ignorés.

Les réglages et les fiches clients présentent l’historique des envois, les échecs et les nouvelles tentatives. Vous pouvez mettre les notifications en pause ; les changements effectués pendant la pause ou avant la configuration ne sont pas envoyés rétroactivement. Une restauration annule les envois encore en attente. L’historique des e-mails et leur activation sont dans la base serveur, séparément de l’export JSON d’atelier. « Envoyé » signifie que le fournisseur a accepté le message ; ce n’est pas une confirmation de lecture ou de réception par le client.

## Migrer l’ancienne application locale

1. Dans l’ancienne application, exportez une sauvegarde JSON avant de changer d’adresse ou de navigateur.
2. Connectez-vous à cette version, puis ouvrez **Réglages & sauvegardes → Restaurer ou migrer des données**.
3. Importez le JSON et confirmez avec `RESTAURER`. Il remplace l’atelier du serveur, pas le compte administrateur.
4. Vérifiez les consoles, les réparations et les photos avant de supprimer vos anciennes copies locales.

Aucun transfert ni effacement de l’ancien localStorage n’est automatique. Lorsqu’une sauvegarde ancienne est accessible sur la même origine, un bouton permet de la récupérer. L’authentification **ne protège pas rétroactivement** les fichiers HTML autonomes, les exports JSON ou le localStorage de l’ancienne version. Protégez ou supprimez ces copies après une migration vérifiée.

Les nouvelles données d’atelier sont dans SQLite pour Node ou D1 pour Cloudflare, pas dans localStorage. Un changement n’est confirmé qu’après validation serveur. Pendant l’enregistrement, les nouvelles actions sont bloquées. En cas d’échec ou de conflit, un écran permet de récupérer le brouillon JSON puis de recharger l’état serveur ; aucun écrasement concurrent n’est effectué automatiquement. Une expiration de session peut faire perdre une modification non confirmée : ne fermez pas l’onglet pendant l’enregistrement.

## Configuration et hébergement

Le fichier `.env` est facultatif en local. Copiez `.env.example` pour personnaliser la configuration. Il est exclu de Git, comme les bases et le dossier `data/`.

| Variable | Usage |
| --- | --- |
| `APP_ORIGIN` | Origine exacte du navigateur, sans chemin ni slash final. Par défaut `http://127.0.0.1:3040`. Obligatoire et HTTPS en production. |
| `NODE_ENV` | Utilisez `production` sur le serveur public. |
| `HOST` | Interface d’écoute. Par défaut `127.0.0.1`, derrière le proxy local. |
| `PORT` | Port de l’API et du site, par défaut `3040`. |
| `DATABASE_PATH` | Base SQLite persistante, par défaut `data/clinique.sqlite`. Le chemin relatif part de la racine du projet. |

En production, installez l’application sur un serveur Node avec un disque persistant et un reverse proxy HTTPS. Servez l’interface et `/api/` sous **la même origine** et préservez les en-têtes `Origin` du navigateur. L’API refuse de démarrer en production sans origine HTTPS. N’exposez pas directement son port HTTP ; le proxy assure la terminaison TLS. Le dossier de données ne doit jamais être servi par le proxy.

Le serveur Node héberge plusieurs ateliers séparés dans **une instance serveur**, avec un super administrateur et un administrateur par atelier. N’utilisez pas la base SQLite sur un système de fichiers réseau ou dans plusieurs réplicas. GitHub Pages et un hébergement purement statique ne peuvent pas faire fonctionner cette authentification. Le code peut rester public sans publier le compte ou les données.

Le serveur ne fait pas confiance aux en-têtes `X-Forwarded-For` fournis par les clients : derrière un proxy, la limitation IP est donc partagée. Ajoutez une limitation appropriée au niveau de votre proxy sans supprimer les contrôles applicatifs. Le hachage scrypt demande environ 128 Mio par calcul ; prévoyez une marge mémoire, avec au maximum deux calculs simultanés.

## Sécurité mise en place

- Mot de passe de 15 à 128 caractères, hachage scrypt avec sel aléatoire unique : Node utilise `N=131072`, `r=8`, `p=1` ; Worker utilise `N=32768`, `r=8`, `p=3`. Ces formats ne sont pas directement interchangeables. Aucune valeur secrète dans le code frontend ou les variables Vite.
- Identifiant de session aléatoire de 256 bits, empreinte SHA-256 seulement dans la base. Cookie `HttpOnly`, `SameSite=Strict`, `Secure` et préfixe `__Host-` sous HTTPS.
- Durée maximale de 8 heures et expiration après 30 minutes sans activité API. Les vérifications périodiques de session n’allongent pas l’inactivité.
- Vérification d’origine sur les écritures, y compris la connexion, et jeton CSRF sur les autres mutations authentifiées.
- Limitation persistante des tentatives par adresse, par connexion réseau et globale, erreurs de connexion génériques et calcul comparable pour une adresse inconnue.
- Autorisation serveur à chaque lecture ou écriture des données, validation métier, limitation de taille et contrôle de révision pour éviter les modifications perdues.
- En-têtes de sécurité partagés entre Node et Cloudflare, réponses `no-store` et variantes de session/origine explicites. Dans les navigateurs modernes, la CSP bloque les scripts et feuilles de style en ligne dans des éléments, les cadres, médias et workers ; les attributs de style des graphiques React restent autorisés. Aucun secret dans les journaux d’erreur.
- Projection client limitée aux champs affichés du suivi, aux demandes de pièces qui lui sont destinées et aux consoles de son propriétaire. Les tests internes, notes d’atelier, photos privées, pièces du stock, temps, autres clients et identifiants client inutilisés ne sont pas envoyés au portail.
- Écritures d’un client connecté limitées à la création de ses propres demandes de réparation dans le magasin principal et au passage de ses pièces en attente à **Disponible**, protégées par session, origine et CSRF. L’inscription publique crée ensemble une nouvelle identité et sa demande, sans récupérer les dossiers d’une identité existante. Le serveur vérifie à nouveau l’accès et la révision lors de l’enregistrement atomique ; un ancien état de l’atelier ne peut écraser une autre modification.
- Retrait réel des vues privées à la déconnexion, à l’expiration et avant une navigation quittant le document. Un retour depuis l’historique revalide la session avant de charger les données ; les requêtes tardives d’une ancienne session sont annulées ou ignorées. Une simple bascule d’onglet vérifie la session admin sans perdre ses brouillons si elle reste valide.

Les informations effectivement affichées à un utilisateur autorisé restent lisibles dans le DOM et les outils de son navigateur. La protection repose sur l’autorisation serveur, la minimisation des données envoyées et le retrait des vues après la session ; elle ne cherche pas à masquer les données à leur propre destinataire. L’écran de connexion et le HTML public ne contiennent aucune donnée métier.

Ce socle ne remplace pas un audit de sécurité. Il ne comprend pas de MFA, de comptes administrateurs multiples, de connexion sociale ni de récupération par e-mail. La base n’est pas chiffrée par l’application : les accès système, le disque et les sauvegardes doivent être protégés par l’exploitant.

### Protection des fichiers publics — validée le 13 octobre

Le backend Node/SQLite et Worker/D1 garde les données sur le serveur et contrôle leur diffusion par session, propriétaire et atelier. Les fichiers servis sont désormais restreints à une liste explicite d’assets publics et aux bundles JavaScript/CSS Vite portant leur hash. Le module partagé `server/public-assets.mjs` refuse les fichiers non autorisés sur les deux hôtes, même s’ils ont été copiés dans `dist/`. `scripts/verify-public-assets.mjs` contrôle d’abord `public/`, **avant Vite**, qui peut déréférencer un lien symbolique : seules les images de marque, le favicon, la police et sa licence déclarés sont autorisés, sans HTML ni JavaScript/CSS copié pouvant imiter un bundle. Le contrôle de `dist/` après Vite refuse aussi liens symboliques, exports, configurations, source maps et fichiers inconnus. Les exports JSON/CSV et brouillons Reparapid sont exclus de Git.

**Réglages → Supprimer la copie locale** retire l’ancienne sauvegarde de ce navigateur après confirmation, sans purge automatique ni changement de l’atelier serveur. Une copie modifiée depuis sa lecture est conservée et doit être relue avant une nouvelle confirmation. Cette protection a été vérifiée sur des données fictives, avec le Store serveur strictement inchangé.

Validation de cette reprise de confidentialité : **510 tests réussis (465 Node/domaine/API + 45 Cloudflare)**, **38 tests ciblés de confidentialité** et **14 tests d’apparence** réussis. TypeScript et le build de **87 modules** sont validés, avec cinq fichiers sources publics et huit fichiers de build autorisés. Publication vérifiée sur 100 % du trafic Cloudflare : six assets conformes au build par SHA-256, API publique en HTTP 200 et cinq routes privées en HTTP 401. Les contrôles complémentaires ont confirmé quatre API privées en HTTP 401 avec `no-store`, ainsi que 18 requêtes GET/HEAD vers neuf chemins de fichiers interdits en HTTP 404 avec `no-store`. Aucun schéma, contrat métier, migration ou donnée de production n’a été modifié. Ce résultat précède les tutoriels et reste historique.

Les données restent lisibles dans la base serveur et dans les exports demandés par l’administrateur. HTTPS protège le transport ; les sessions et projections contrôlent qui reçoit les données. Un navigateur autorisé peut lire les données qu’il affiche : ce travail n’ajoute pas de chiffrement de bout en bout.

L’inscription publique conserve une différence de réponse entre une création et une adresse déjà enregistrée. Cela peut révéler l’existence d’un accès, sans donner accès à ses dossiers. Supprimer complètement cette distinction nécessite un parcours vérifiant la possession de l’adresse e-mail ; le service d’envoi n’est pas configuré et ce choix reste à décider.

### Pièces à fournir par les clients : interface RépaRapid

À la demande du magasin, les panneaux, listes et actions **Pièces à fournir par les clients** sont masqués dans l’interface du magasin principal RépaRapid et de son portail client. Les ateliers distincts conservent cette fonctionnalité. Le stock de l’atelier, les pièces utilisées et les accessoires habituels restent disponibles ; les anciennes demandes `clientParts`, les règles métier et les API sont conservées, sans suppression de données. La recette a confirmé l’absence des panneaux, compteurs et actions malgré des demandes fictives encore présentes.

Les illustrations de l’atelier utilisent `ShopConsoleArt` comme la vitrine, avec un adaptateur dans `console-appearance.ts` et des cadres bornés dans `workshop-console-art.css`. La parité des 38 modèles du catalogue est testée ; les photos restent prioritaires et les modèles non couverts gardent un repli. La recette à 1280 et 320 px a contrôlé les SVG dans leurs cadres, les identifiants de gradients uniques, les paiements et coûts conservés, puis le retrait des vues privées après déconnexion.

## Changement et récupération du mot de passe

Dans l’application : **Réglages & sauvegardes → Compte administrateur**. Le mot de passe actuel est requis. Toutes les sessions sont invalidées après le changement.

En cas d’oubli, depuis le terminal du serveur avec le même chemin de base :

```sh
npm run admin:reset
```

Cette commande exige l’adresse du compte existant et une nouvelle phrase de passe saisie sans affichage. Elle conserve l’inventaire et révoque les sessions. Aucun secret ne doit être collé dans une issue GitHub ou un message public.

## Sauvegardes

Exportez régulièrement un JSON depuis l’application. Pour sauvegarder aussi le compte, utilisez une sauvegarde SQLite cohérente ; une copie du seul fichier `.sqlite` pendant que le serveur fonctionne peut omettre le journal WAL. Le plus simple pour un atelier personnel est d’arrêter le serveur puis de sauvegarder le répertoire de données protégé. Testez vos restaurations et protégez ces copies, qui incluent les données privées et les empreintes de mots de passe.

## Hébergement Cloudflare

Reparapid est publié sur [https://reparapid.aldeguer-remi.workers.dev](https://reparapid.aldeguer-remi.workers.dev), avec une base D1 dédiée. Sur cette machine, utilisez la configuration privée `.wrangler/reparapid.production.jsonc` pour agir sur cette installation.

Le dossier `cloudflare/` fournit une API Workers avec une base D1 persistante et les mêmes écrans d’administration. Seuls les fichiers de `dist/` autorisés par la liste publique partagée sont servis. Le serveur Node local reste disponible avec `npm start` ; sa base SQLite et la base Cloudflare sont indépendantes après le transfert.

La configuration se trouve dans `wrangler.jsonc`. Sélectionnez votre compte Cloudflare et créez une nouvelle base D1 dédiée à Reparapid. Le nom du Worker est `reparapid` ; remplacez le `database_id` nul par l’identifiant de la nouvelle base.

```sh
npm install
npx wrangler login --scopes account:read user:read workers:write workers_scripts:write d1:write
npx wrangler d1 create reparapid --location weur --update-config --binding DB
npm run cloudflare:migrate
npm run cloudflare:export
npx wrangler d1 execute reparapid --remote --file .backups/cloudflare-transfer.sql
npm run cloudflare:deploy
```

`cloudflare:export` vérifie le mot de passe administrateur local et prépare un fichier SQL privé dans `.backups/`, exclu de Git et des fichiers publiés. Le compte garde son e-mail et son mot de passe ; les sessions ne sont pas transférées. Importez ce fichier uniquement dans une nouvelle base après sa migration initiale. L’import refuse un administrateur déjà présent. En cas d’import interrompu, terminez la récupération avant d’ouvrir l’atelier distant.

Workers utilise le profil scrypt `N=32768, r=8, p=3` recommandé par OWASP, pour tenir dans sa limite mémoire ; le serveur local garde son profil initial. Un seul calcul de mot de passe s’exécute à la fois dans chaque instance Workers. Vérifiez les limites CPU de votre forfait Cloudflare avant d’utiliser le site en production ; le forfait gratuit n’accorde que 10 ms par invocation. Aucun abonnement n’est activé par les commandes de ce projet.

Les données et photos restent regroupées dans les sauvegardes JSON. Sur D1, elles sont stockées en fragments afin de respecter la limite de taille par ligne, avec publication atomique et contrôle de révision. La limite d’envoi reste 20 Mio. Pour un domaine personnalisé, ajoutez-le au Worker dans Cloudflare ; vous pouvez fixer `APP_ORIGIN` à cette origine HTTPS dans les variables du Worker.

```sh
npm run cloudflare:test
npm run cloudflare:build
npm run cloudflare:migrate:local
npm run cloudflare:dev
```

Le dernier programme démarre l’environnement de test sur `http://127.0.0.1:8787`. La base locale D1 de test se trouve dans `.wrangler/` et ne remplace pas `data/clinique.sqlite`.

## Activer les e-mails de suivi

L’envoi utilise l’API HTTP [Resend](https://resend.com/docs/api-reference/emails/send-email), sans dépendance supplémentaire. Le site peut rester sur `workers.dev`, mais l’adresse d’expédition doit appartenir à un [domaine vérifié dans Resend](https://resend.com/docs/add-a-domain). Une adresse Gmail ou l’expéditeur de démonstration Resend ne permet pas l’envoi aux clients arbitraires.

Créez une clé Resend avec permission d’envoi limitée à ce domaine, puis renseignez les paramètres du Worker sans coller la clé dans le chat, le frontend ou un export JSON :

```sh
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put MAIL_FROM
```

Saisissez la clé au premier prompt. Au second, saisissez par exemple `La Clinique Rétro <contact@example.invalid>`. Ces valeurs restent côté serveur. `MAIL_REPLY_TO` indique l’adresse de réponse de l’atelier et `MAIL_PORTAL_ORIGIN` l’origine HTTPS du site ; renseignez leurs valeurs pour Reparapid dans les variables du Worker ou dans `wrangler.jsonc`. Avant un déploiement initial, appliquez les migrations D1 avec `npm run cloudflare:migrate`.

En local, renseignez les mêmes paramètres dans `.env`, puis redémarrez `npm start`. Sans configuration complète, l’interface affiche **À configurer** et aucun e-mail n’est envoyé. Une fois configuré, ouvrez **Réglages → Notifications par e-mail** pour vérifier l’expéditeur et l’activation. L’adresse du destinataire est celle de la fiche client, indépendamment de son identifiant de connexion.

La notification est inscrite dans une file persistante dans la même transaction que la sauvegarde du statut. Une sauvegarde refusée n’inscrit aucun message. L’envoi démarre après cette sauvegarde ; le Worker reprend les messages en attente toutes les cinq minutes, et le serveur Node toutes les minutes. Le destinataire et le propriétaire sont revérifiés avant chaque envoi. Les pannes et limites temporaires déclenchent des tentatives espacées, au maximum six par message. La même [clé d’idempotence Resend](https://resend.com/docs/dashboard/emails/idempotency-keys) est conservée ; les nouvelles tentatives s’arrêtent après 23 heures pour rester dans sa fenêtre de 24 heures. Un échec récent peut être relancé depuis l’historique. Les contenus d’erreurs du fournisseur et la clé API ne sont pas exposés.

## Développement local

Après `npm install` et la création du compte, utilisez deux terminaux :

```sh
# Terminal 1 : API, origine de développement attendue par le serveur.
npm run dev:server

# Terminal 2 : interface et proxy /api.
npm run dev
```

Ouvrez exactement `http://127.0.0.1:5173`. Le nom `localhost`, un autre port ou un slash dans `APP_ORIGIN` n’est pas équivalent. Le serveur de développement utilise les ports 3040 et 5173. N’utilisez pas le mode développement en production.

```sh
npm test
npm run typecheck
npm run build
```

Les tests couvrent le parcours public de réparation, ses suggestions, la création atomique du compte et du dossier, la fiche filtrée, les conflits, les doubles enregistrements et l’isolation du magasin principal. Ils couvrent aussi les inscriptions d’ateliers, le métier, l’authentification, les accès clients et les notifications sur Node et Cloudflare. Les transports d’e-mails de test sont simulés ; la suite n’envoie aucun message réel. La CI GitHub exécute les tests, le contrôle TypeScript et la compilation Vite. Les fichiers générés et les dépendances ne sont pas versionnés.

`build:offline` échoue volontairement avec une explication : une administration authentifiée n’a pas de mode HTML autonome sans serveur. L’ancienne édition séparée reste un produit local sans cette protection, pas une porte d’accès à la nouvelle base.

## Organisation

`src/` contient l’interface, le contrôle de session, les formulaires et les règles métier ; `repair-intake-domain.ts` partage le catalogue et les règles de déclaration publique. Les modules `repair-guides*` portent les tutoriels statiques, rendus par `scripts/generate-repair-guides.mjs` et vérifiés par `tests/repair-guides.test.mjs`. `server/` contient l’API, SQLite et les frontières de données publiques. `scripts/admin.mjs` gère le compte SQLite ; `scripts/cloudflare-admin-create.mjs` initialise uniquement le premier compte D1. Les tests du parcours de demande sont dans `tests/repair-intake-domain.test.cjs` et `tests/repair-intake-api.test.mjs`.

MIT. Voir `LICENSE` et `THIRD_PARTY_NOTICES.md`. Les noms des consoles servent à l’identification ; l’application n’est pas affiliée aux fabricants.
