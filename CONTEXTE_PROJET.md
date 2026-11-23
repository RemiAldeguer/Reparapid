# Reparapid — contexte de reprise pour une session IA

Dernière mise à jour : **23 novembre 2026**, fuseau de référence **Europe/Paris**.

Les contacts personnels, identifiants de ressources, adresses de production et identifiants de publication historiques ont été retirés de cette documentation destinée au dépôt public. Les exemples doivent être configurés pour Reparapid.

> **Reparapid — copie indépendante du 12 octobre 2026.** Dépôt : https://github.com/RemiAldeguer/Reparapid ; dossier local : [copie locale Reparapid]. Les sources et les fonctionnalités proviennent de la version locale à jour de La Clinique Rétro. Les références à l’absence de .git, au dossier Desktop, aux ressources Cloudflare et aux publications ci-dessous constituent l’historique du projet d’origine. Reparapid possède son propre dépôt Git, aucune base client ni sauvegarde transférée. Le Worker reparapid et sa D1 dédiée ont été publiés le 12 octobre 2026. La configuration de cette production est .wrangler/reparapid.production.jsonc (privée et ignorée par Git) ; wrangler.jsonc reste un modèle avec identifiant nul pour une autre installation. Les identifiants, comptes, contacts et URL historiques ne doivent pas être réutilisés pour publier cette copie.

Ce document décrit le projet réellement présent dans cette copie, ses choix métier et les changements effectués dans la session. Il sert de point d’entrée pour une nouvelle session de développement. Le code reste la référence en cas de divergence ; actualiser ce document quand le fonctionnement évolue.

Validation de l’import Reparapid : `npm ci`, `npm run build` et `npm test` réussis le 12 octobre 2026 avec Node 24.19.0 ; 434 tests (393 + 41), aucun échec ni test ignoré. Les fichiers applicatifs, migrations, tests et assets sources sont identiques à l’original ; seuls la documentation, les noms de package, le workflow et la configuration de cette copie ont été adaptés.

## Reprise prioritaire : vitrine RépaRapid et demande de réparation

**Nouvelle demande du 12 octobre 2026 :** le client Maxxi Games souhaite une vitrine RépaRapid inspirée du parcours de réparation de Gamefix, avec sélection du modèle, suggestions de pannes courantes, création ou connexion au compte client, dossier **En attente d’envoi**, fiche à imprimer et accès du magasin à la gestion des réparations. Cette personnalisation remplace l’ancien accueil SaaS comme point d’entrée public de cette copie ; les fonctions de gestion et l’isolation des ateliers sont conservées.

Le parcours actif est `#/demande-reparation` : console → panne → compte. Le compte et sa première console/réparation sont créés atomiquement dans l’atelier principal. Un client déjà connecté peut ajouter une autre demande. La nouvelle console reste **en-panne**, son emplacement est **En attente d’envoi** et son dossier commence à l’étape `attente-envoi`. Le passage à **Réception** met la console **en-reparation** et son emplacement **À l’atelier**. Utiliser les transitions du domaine pour préserver cette cohérence.

Le portail `#/espace-client` affiche la demande et propose sa fiche d’envoi imprimable. La fiche reste accessible après réception ; elle contient uniquement référence, console, symptômes, accessoires, coordonnées du propriétaire et destination. Les diagnostics, notes, photos, tests et comptes internes ne sont jamais envoyés. Un dossier public sans chiffrage affiche **À confirmer après diagnostic** ; le zéro explicite garde son sens de gratuité. La fiche n’achète aucun transport et le formulaire n’encaisse aucun paiement.

Coordonnées professionnelles publiques relevées sur [reparapid.fr](https://reparapid.fr/) : **RépaRapid · Maxxi Games**, **30 bis, avenue de Fontainebleau, 94270 Le Kremlin-Bicêtre**, **01 58 46 82 51**, **contact@reparapid.fr**. Elles servent de valeurs initiales de `settings.publicIntake`. Le panneau **Réglages → Vitrine Reparapid et adresse d’envoi**, réservé au compte du magasin principal, permet de modifier ces informations et la confirmation de réception des colis. Si l’adresse n’est plus confirmée, la fiche demande de contacter le magasin avant d’envoyer la console.

Le domaine **reparapid.fr conserve son site WordPress** ; aucune bascule DNS ni modification de ce site n’a été effectuée. La nouvelle vitrine est publiée sur **https://reparapid.aldeguer-remi.workers.dev** : HTML, JavaScript et CSS servis identiques au build, API publique des coordonnées contrôlée et routes privées refusant les accès anonymes. Le déploiement n’a modifié ni schéma ni données D1. Toute publication d’un dernier ajustement doit refaire ce contrôle des assets.

**Accès administrateur de production : initialisé et vérifié le 13 octobre 2026.** La D1 principale contient un administrateur ; la connexion et `/api/auth/me` ont confirmé le rôle effectif `super_admin`. La seule session créée pour cette vérification a été déconnectée, puis la requête authentifiée a été refusée en HTTP 401. Aucun client, dossier ou Store d’atelier n’a été modifié. Les identifiants sont remis séparément, hors des fichiers versionnés. Pour une autre installation D1 sans administrateur, `npm run cloudflare:admin:create` fournit l’initialisation interactive et refuse tout compte existant. `npm run admin:create` cible uniquement SQLite local.

Les API d’inscription et de nouvelle demande sont limitées au **magasin principal** dans Node et Worker, indépendamment d’un cookie d’un autre atelier. Une session dédiée vérifie ce contexte pour le formulaire. Les inscriptions ne rattachent jamais une fiche existante par simple correspondance d’e-mail et ne remplacent jamais un compte ; un compte déjà présent doit se connecter. Les requêtes sont bornées et limitées, les écritures authentifiées exigent le CSRF, et les gardes de session/révision sont revérifiées au commit. `Repair.publicRequestId` assure l’idempotence par client ; les anciens éditeurs ne peuvent pas effacer ce marqueur ni les coordonnées d’envoi lors d’une sauvegarde ordinaire. Une restauration ou réinitialisation explicite garde ses règles existantes.

Validation de cette évolution le **12 octobre 2026** : **474 tests réussis (429 Node/domaine/API + 45 Cloudflare)**, aucun échec ni test ignoré, contrôle TypeScript et build Vite réussis. Recette sur serveur temporaire avec compte fictif : deux demandes, suivi client, réception, fiche encore accessible et retrait des données privées à la déconnexion. Accueil/formulaire contrôlés à **390 px et 320 px** ; panneau des coordonnées admin prérempli vérifié. Le dialogue d’impression a été déclenché ; aucun PDF enregistré ni impression physique. Aucun paiement, e-mail ou envoi de colis réel. Les détails et limites sont dans [TESTS.md](TESTS.md).

## Dernière reprise : e-mails illustrés et retrait du dispositif client — 23 novembre 2026

Demandes successives : enlever le délai de rétractation des CGV et de l’application, puis enrichir le design des e-mails. Après explication du droit légal et clarification asynchrone, l’utilisateur insiste sur le retrait du système de rétractation de l’applicatif client. Le bouton, la confirmation, la page dédiée, les liens et la création HTTP `withdraw` sont retirés ; les anciens liens affichent les CGV. Node et Worker partagent le même rejet, également présent au niveau de l’application de la requête. Leurs actions injectées n’exposent plus le mutateur. La liste visible des préférences n’offre plus l’événement retiré.

Les archives `proposal.withdrawal`, leurs accusés et les protections des preuves sont conservés. Le domaine garde le lecteur/validateur et l’outil historique utilisé par les fixtures ; aucune route client ne peut créer une déclaration. Aucun dossier de production n’est réécrit. Le refus du devis avant acceptation, le retour par virement et le rachat sont inchangés. Les CGV datées du 23 novembre gardent le droit légal et les moyens de contact, mais ne décrivent plus une fonction supprimée. Le formulaire ne présente plus de choix de démarrage anticipé. Les champs de preuve restent compatibles, à false pour une nouvelle acceptation depuis l’interface ; aucun consentement n’est présumé. Les rappels et gardes de délai des vues magasin sont retirés. Les accords éventuels hors application restent à organiser par le magasin selon les CGV. **Conformité ouverte signalée à l’utilisateur :** L221-21 depuis le 19 juin 2026 exige une fonction en ligne pour les contrats concernés conclus en ligne ; ne pas présenter le retrait demandé comme une conformité juridique et faire valider ce choix avant ouverture commerciale.

Les e-mails reprennent le PNG du logo original, le noir/rouge, une référence de dossier, la console, une frise de cinq jalons et une consigne adaptée à l’événement et au destinataire. Les événements de retour/rachat ne simulent pas un succès de réparation. Un accord de devis ne fait pas avancer prématurément à l’intervention. `server/notification-email.mjs` est le rendu partagé Node/Worker/aperçu. Pas de police externe, SVG, script ou tracker ; la version texte est conservée. Les ateliers secondaires n’affichent pas la marque principale. Le seul chargement d’image est un logo public fixe sans paramètre client.

L’aperçu reste isolé et inerte. `src/notification-preview-document.mjs` conserve CSP et sandbox, neutralise les liens et n’autorise que l’URL exacte du PNG public local. Les adresses fictives, variantes et lectures sans données client sont conservées. Le routage de test, les secrets et la file de notifications ne changent pas.

Validation locale : **753 tests (688 + 65 Worker)**, aucun échec ni test ignoré. Les nouveaux cas couvrent la frise réelle, les branches de retour/rachat, l’identité des ateliers, le périmètre CSP de l’aperçu et le refus des requêtes retirées sans modification des archives. Une mutation de condition de progression est détectée. Recette des e-mails sur bureau et à 320 px : pas de débordement, logo chargé, devis et version magasin lisibles, iframe inerte sans liens actifs. Aucun message réel envoyé et pas de test dans les boîtes Gmail/Outlook. TypeScript, build final de 126 modules / 158 fichiers et assemblage Worker validés. La recette réelle du portail en mémoire confirme l’absence d’action/mention de rétractation pour les dossiers courants, une confirmation de devis limitée aux CGV et l’alias historique vers ces conditions. Le backoffice propose 16 événements visibles, sa frise et son logo fonctionnent dans l’iframe isolée ; les liens y restent neutralisés. Le planning du magasin n’a plus de garde de délai applicatif. La sortie locale contenait ensuite des répertoires dupliqués inattendus : un paquet isolé a été constitué à partir des fichiers publics attendus, des assets référencés par le HTML principal et par les pages générées, puis validé par le garde-fou inchangé. Les 158 fichiers sont identiques au build ; aucun dossier inattendu n’est publié. Publication vérifiée sur 100 % du trafic Cloudflare : neuf fichiers/pages identiques au paquet par SHA-256, en-têtes de sécurité présents, aucun cookie public supplémentaire, trois API privées 401 et trois fichiers privés 404. Révision/génération D1 et répartition des notifications identiques avant/après. Aucun compte, dossier ou message créé en production ; secrets d’envoi et routage de test conservés. Aucun envoi ni réception réelle vérifié pendant cette recette.

## Reprise précédente : politique de cookies et configuration Resend — 23 novembre 2026

La page historique `/politique-de-cookies-ue/` est complétée en **Politique de cookies** : identité VESTY GAMES 3 · Maxxi Games, définition, tableau des deux cookies applicatifs, finalités, durée maximale de 8 heures, expiration serveur après 30 minutes d’inactivité, déconnexion distincte de chaque espace, caractéristiques de sécurité, ancien stockage local `la-clinique-retro:v1`, liens tiers, hébergement, réglages de suppression et contact pour les droits. Les faits proviennent de `server/application.mjs`, `cloudflare/worker.mjs` et `src/admin-settings.tsx`, rapprochés des [explications de la CNIL](https://www.cnil.fr/fr/cookies-et-autres-traceurs/que-dit-la-loi). Aucun traceur publicitaire ou d’audience n’est ajouté ; aucun choix de consentement fictif n’est proposé pour les seules sessions nécessaires.

Les liens **Politique de cookies** sont explicites sur la vitrine, les guides, les pages statiques, les pages juridiques et le portail client principal. Les autres ateliers gardent leurs propres informations. Les textes contractuels et `LEGAL_VERSION` restent inchangés : ne pas modifier des preuves de CGV pour une mise à jour de cette page. `legacyPages.lastmod` facultatif permet de dater la seule politique du 23 novembre dans le document, le JSON-LD et le sitemap. L’origine reste workers.dev ; aucun DNS ni WordPress modifié.

Validation : **748 tests (683 + 65 Cloudflare)**, aucun échec ni test ignoré, dont un nouveau contrôle de cohérence entre la date propre à la politique, le sitemap et le HTML. Les tests existants de réponse de sécurité couvrent les véritables cookies Node/Worker. TypeScript et build de 125 modules / 158 fichiers validés. Recette sur base en mémoire : version, liens et tableau lisibles sur bureau et à 320 px sans débordement ; les durées sont affichées de manière compacte. Publication vérifiée sur 100 % du trafic : six fichiers/pages conformes au build, accès anonyme à la politique sans nouveau cookie, version et redirection canonique correctes, routes privées 401 et fichiers privés 404. Révision/génération D1 et file de notifications conservées. Deux tentatives de publication depuis `dist/` ont été refusées après une compilation concurrente puis la présence d’un dossier inattendu ; le garde-fou est resté strict. La publication finale utilise un build temporaire isolé et validé, via `--assets` qui conserve les autres options de sécurité de la configuration privée.

**Configuration Resend demandée pendant cette reprise :** l’utilisateur s’est connecté au service puis a choisi de créer/copier lui-même la clé et de la placer dans Cloudflare, pas dans Codex ni le chat. Le formulaire Resend a été préparé avec une clé dédiée et permission `Sending access`, sans création de clé par l’agent. `MAIL_FROM` est maintenant configuré en secret avec l’expéditeur de démonstration Resend ; `MAIL_REPLY_TO` reprend le contact public du magasin. `MAIL_TEST_RECIPIENT` reste actif et privé. La réception de démonstration est limitée par Resend à l’adresse du compte ; aucun domaine ou enregistrement DNS n’a été modifié. L’utilisateur a ensuite confirmé l’enregistrement de la clé dans Cloudflare. Les quatre noms de secrets et leur statut chiffré ont été vérifiés dans le tableau de bord et par CLI, sans lecture des valeurs. L’activation globale est confirmée ; aucun dossier ou message fictif n’a été créé en production pour cette vérification. La boîte de test reste la seule destination des notifications principales. Aucun envoi ni réception réelle n’a encore été vérifié pendant cette reprise ; ne pas confondre configuration enregistrée et délivrabilité démontrée.

## Reprise précédente : destination unique des e-mails de test — 23 novembre 2026

L’utilisateur demande de router les e-mails clients et administrateurs vers sa boîte personnelle pour ses tests. Il a confirmé **« Uniquement mon adresse pendant les tests »**. La destination est gardée dans le secret Cloudflare `MAIL_TEST_RECIPIENT`, jamais dans le dépôt, la documentation ou les assets. Les adresses habituelles des clients et du magasin ne sont pas réécrites. L’envoi remplace seulement le champ `to` transmis à Resend, sans CC/BCC ; contenus, préférences et clés d’idempotence sont conservés. Supprimer le secret ou le laisser vide rétablit le routage habituel pour les prochains envois.

`server/notification-delivery.mjs` valide une seule adresse, retourne `testRecipient` uniquement dans le statut administrateur et refuse tout envoi du magasin principal si la valeur est invalide. `serviceConfigured` reste interne : une erreur du mode test principal ne doit pas empêcher le traitement planifié des ateliers distincts. Node et Worker passent le contexte `workshopId`, y compris lors des reprises et du cron ; aucune redirection de leurs messages vers la boîte du magasin principal. Les contrôles de propriété, contact d’origine, sessions, préférences et révision sont revérifiés avant chaque tentative comme précédemment.

Le backoffice affiche **Mode test : destinataire unique** dans l’onglet E-mails et les panneaux de suivi client administrateur. La valeur provient d’une API protégée ; elle ne figure pas dans la vitrine, les fichiers compilés ou le portail client. L’historique désigne désormais explicitement le destinataire **prévu** du dossier, pas l’adresse effective d’une livraison passée en mode test. Aucun nouveau paramètre public ou champ de sauvegarde d’atelier, aucune migration SQL.

Validation : **747 tests réussis (682 Node/domaine/API + 65 Cloudflare)**, dont 13 nouveaux scénarios. Les tests contrôlent les deux audiences, les relances avec même clé, les changements de propriétaire/contact, l’absence de CC/BCC, le blocage d’une adresse invalide et l’isolation des ateliers dans les requêtes et le traitement planifié. TypeScript et build de 125 modules / 158 fichiers validés ; warning historique de bundle conservé. Recette navigateur sur base en mémoire, administrateur et adresse fictifs : bandeau visible sur bureau et à 320 px sans débordement, service non configuré explicite, activation indisponible, déconnexion confirmée. Aucun e-mail réel envoyé.

Le contrôle des seuls noms de secrets confirme que `RESEND_API_KEY` et `MAIL_FROM` restent absents. Leur configuration est nécessaire avant tout test de réception réelle. Ne pas utiliser un autre expéditeur, fournisseur, ou une clé fictive pour prétendre avoir envoyé un message. Publication vérifiée sur 100 % du trafic Cloudflare : sept fichiers/pages identiques au build, bandeau présent dans le bundle, quatre routes privées 401, trois fichiers sensibles 404 et projection publique conforme. Le secret de routage est présent ; la clé et l’expéditeur restent absents. La boîte privée ne figure pas dans les textes publics contrôlés. Révision/génération D1 et nombre de notifications identiques avant/après ; aucun envoi réel ni modification de dossier.

## Reprise précédente : anciens slugs et retours visuels — 22 novembre 2026

Objectif : remplacer ultérieurement WordPress sur **reparapid.fr** en préservant ses URL utiles. Le relevé public croise navigation, deux familles de sitemaps et listes WordPress : **170 slugs**, dont **31 URL HTML** (24 pages, 2 articles, 3 catégories, 2 archives datées) et **139 alias de médias** actuellement redirigés vers des images. Sources, statuts, canonicals et correspondances sont conservés dans `docs/seo/anciens-slugs-2026-11-22.json` et `.csv`. [Le guide de migration](docs/seo/migration-reparapid.md) détaille les limites et la future bascule. Sans Search Console ni journaux historiques, ce relevé ne prouve pas l’exhaustivité des URL connues de Google ni leur indexation.

**22 chemins HTML conservés en 200**, accueil compris : 21 nouvelles pages statiques reprennent exactement les chemins consoles, marques, smartphones, tablettes, atelier, blog et cookies. Les trois formulaires consoles doublons, l’article WordPress de démarrage, trois catégories et deux archives rejoignent une destination pertinente par **neuf redirections permanentes 308**. L’alias technique `/accueil/` rejoint `/` ; huit anciens sitemaps rejoignent `/sitemap.xml`. Ces neuf alias techniques s’ajoutent aux neuf regroupements HTML. Aucun renvoi générique des chemins inconnus vers l’accueil. Les 139 médias restent **inventoriés seulement** : préserver leurs originaux et leurs alias est un préalable explicite à la bascule ; ne pas traiter `/ps5/` ou `/xbox/` comme des pages commerciales.

`src/legacy-site-manifest.mjs` déclare les seuls nouveaux chemins et redirections ; `src/legacy-site-pages.tsx` fournit les textes et métadonnées spécifiques, les liens vers les guides et les contacts publics vérifiés. Le formulaire reste réservé aux consoles ; les pages smartphones/tablettes invitent à contacter le magasin. Contenu HTML sans bundle applicatif, un H1, canonical propre, métadonnées uniques et JSON-LD échappé. La charte, les photographies authentiques et les illustrations de consoles sont partagées. La vitrine et les tutoriels relient les nouveaux hubs. La politique de cookies décrit la version actuelle sans reprendre les traceurs de l’ancien WordPress.

Le générateur existant produit **144 pages statiques** (123 guides/catalogues + 21 pages reprises) et un sitemap de **145 URL** avec l’accueil. Node et Worker partagent l’allowlist exacte et les mêmes 308 ; les ancêtres autorisés n’ouvrent aucun répertoire générique. Les refus de fichiers privés, chemins encodés et liens symboliques sont conservés. `PUBLIC_SITE_ORIGIN` permet une origine HTTPS stricte au build, partagée entre accueil, pages statiques, robots et sitemap. **Défaut toujours workers.dev** ; n’utiliser `PUBLIC_SITE_ORIGIN=https://reparapid.fr` qu’à la future bascule, en vérifiant aussi `APP_ORIGIN` et `MAIL_PORTAL_ORIGIN`. Aucune modification DNS ou WordPress.

Les trois CSS vitrine/formulaire/portail ajoutent des transitions brèves (120–180 ms), des retours de sélection et d’apparition des messages. Aucun délai ajouté au parcours ni animation des illustrations. La préférence `prefers-reduced-motion` supprime les mouvements concernés. Recette navigateur : hubs consoles et smartphones, page Apple à 320/390 px et bureau ; recherche « ps5 » puis passage direct à l’étape panne, focus sur le titre, animation du formulaire et absence de débordement observés. Le réglage système de réduction des animations a été contrôlé dans les règles CSS, sans émulation navigateur.

Validation : **734 tests réussis (672 + 62 Worker)**, aucun échec ni test ignoré, TypeScript et build **125 modules / 158 fichiers** validés ; le warning historique de bundle supérieur à 500 kB reste présent. Les tests confrontent indépendamment les 31 URL HTML relevées aux destinations réellement déclarées, vérifient les 21 rendus, les redirections GET/HEAD Node/Worker, les refus de chemins privés et le build avec la future origine. Publication et contrôles servis consignés dans TESTS.md après vérification.

Validation finale : **734 tests (672 + 62 Cloudflare)**, TypeScript, build **125 modules / 158 fichiers publics**. Publication workers.dev contrôlée : 25 documents et cinq autres assets identiques au build, 18 redirections directes, API publique 200, trois routes privées 401 et sept chemins privés/inconnus 404 ; le fichier WordPress sensible est refusé en amont par Cloudflare en 403. Métadonnées D1 et file de notifications préservées. Aucun compte ou envoi réel, aucune migration. Le transfert des médias et la bascule du domaine restent des opérations futures.

## Reprise précédente : durcissement de sécurité — 22 novembre 2026

Demandes : vérifier les clés API éventuellement en clair, puis renforcer la sécurité de l’application. Un audit de source indépendant et deux revues ciblées ont vérifié les sessions, CSRF, propriétaires, ateliers, projections, rendus, fichiers publics et chaîne de publication. Aucune clé réelle ni clé privée n’a été identifiée dans les sources ou les motifs examinés de l’historique Git ; les valeurs restantes sont des fixtures démontrées. Les bundles locaux, le code serveur et les réponses administratives ne transmettent pas la clé Resend. La configuration privée de production est ignorée par Git et ne contient aucune variable sensible en clair ; les secrets d’envoi restent absents. Ces vérifications ne prouvent pas l’absence de tout secret d’un format arbitraire.

**Risque résiduel faible connu :** l’inscription client de réparation distingue l’adresse déjà utilisée (409) de l’inscription réussie (201 avec session). Les limites persistantes réduisent les essais mais ne masquent pas ce test ciblé. Aucun ancien dossier n’est rattaché par simple e-mail et aucun compte n’est réinitialisé. Une résolution complète exige une inscription en attente et la preuve de possession de la boîte avant délivrance de session, donc un service mail opérationnel ; modifier seulement le message ne suffit pas. Le service reste à configurer. Ne pas présenter cette limite comme corrigée ni l’application comme invulnérable.

`server/public-asset-secrets.mjs`, appelé par `scripts/verify-public-assets.mjs`, bloque dans HTML/JS/CSS publics les formats reconnaissables Resend/OpenAI/GitHub, les blocs PEM privés et la valeur exacte de `RESEND_API_KEY`, `CLOUDFLARE_API_TOKEN`, `CF_API_TOKEN`, `OPENAI_API_KEY` ou `GITHUB_TOKEN` si elle est présente dans l’environnement de compilation. Les erreurs n’affichent jamais la valeur. Les exemples explicitement fictifs ne sont tolérés par l’heuristique que s’ils ne correspondent pas à une valeur configurée. Ce garde-fou ne lit pas `.env`, ne protège pas tous les formats inconnus ou encodages et n’analyse pas les fichiers binaires. La liste stricte des assets et le refus des liens symboliques restent en place.

L’ancienne **inscription publique d’ateliers** est désactivée par défaut : seul `POST /api/public/registrations` retourne 404 avant lecture du corps, hachage, quotas et écriture. Elle peut être réactivée pour une autre installation par `WORKSHOP_REGISTRATION_ENABLED=true` explicite ; le modèle Wrangler et la configuration privée Reparapid gardent `false`. Node reçoit `allowWorkshopRegistration` au démarrage et le transmet aux ateliers enfants. Cette réduction de surface ne concerne pas les inscriptions clients de réparation, les connexions existantes ou les routes privées d’approbation. Aucun schéma ni migration SQL.

Les cinq alertes npm hautes des outils sont traitées par **Vite 7.3.8** et **Wrangler 4.166.0**, versions exactes, sans mise à jour de React ni ajout de bibliothèque applicative. L’audit complet après résolution ne signale aucune vulnérabilité connue, développement compris. Les installations utilisent `npm ci --ignore-scripts` ; les scripts postinstall ne sont pas autorisés globalement. La CI refuse les alertes hautes/critiques (`npm audit --audit-level=high`), vérifie aussi les branches `codex/**` et fige checkout/setup-node/upload-artifact sur leurs commits officiels v4 vérifiés. Les permissions restent `contents: read` et les identifiants Git ne sont pas conservés.

Validation : **729 tests (667 + 62 Cloudflare)**, TypeScript, build de **123 modules / 137 fichiers publics** et assemblage Worker validés. Installation propre sans postinstall contrôlée sur macOS et résolution Linux x64 ; audit npm complet sans vulnérabilité connue. Publication vérifiée sur **100 % du trafic Cloudflare** : dix assets identiques au build, HTML du catalogue conforme, API publique 200, douze actions privées 401, dix chemins sensibles 404 et inscription d’ateliers 404. Les headers CSP/HSTS/nosniff et absence de secrets reconnaissables dans les textes servis sont contrôlés. Révision/génération D1 et file préservées ; aucune migration ni donnée client modifiée. Le rapport d’audit initial reste une photographie avant ces durcissements ; la limitation d’énumération ci-dessus demeure ouverte.

## Reprise précédente : conditions, rétractation, réseaux et espace e-mails — 22 novembre 2026

L’utilisateur a confirmé que l’exploitant est **VESTY GAMES 3**, SARL, enseigne **Maxxi Games** : SIREN **799 620 570**, SIRET **799 620 570 00017**, **RCS Créteil**, siège **30–30 bis avenue de Fontainebleau, 94270 Le Kremlin-Bicêtre**. La destination des colis reste le **30 bis** dans les coordonnées d’envoi. Les contacts publics existants sont conservés. Source d’identité : [Annuaire des entreprises](https://annuaire-entreprises.data.gouv.fr/etablissement/79962057000017). Aucun capital, numéro de TVA ou nom de directeur de publication non confirmé n’est inventé.

Les pages publiques **CGU**, **CGV**, **Mentions légales** et **Rétractation** sont reliées depuis le pied de page de la vitrine, du portail principal et des guides. `src/legal-content.mjs` partage la version **2026-11-22**, les textes, le formulaire type et les références officielles avec le serveur. `src/legal-pages.tsx` fournit sommaire, impression et téléchargement texte. Les CGV suivent le parcours réel : demande sans commande payante, diagnostic et devis distincts, accord, frais de retour par dossier, virement manuel, console irréparable et rachat pour pièces, restitution, délais, garanties applicables et rétractation. Elles n’inventent ni garantie commerciale générale, ni transfert de propriété par silence, ni pénalité automatique de rétractation.

**À compléter par le magasin :** médiateur effectivement choisi, coordonnées et site du médiateur, capital social, TVA si applicable, directeur de publication et information détaillée sur les traitements de données. À la question du médiateur, l’utilisateur a répondu « je ne sais pas laisse pour l’instant » : l’information manquante est signalée dans les textes, sans prétendre remplir l’obligation. Aucune nouvelle confirmation n’est nécessaire pour ce choix déjà donné. La publication de ces textes ne doit pas être présentée comme une certification juridique complète.

Le nouvel accord de réparation du **magasin principal seulement** exige des CGV actuelles et une acceptation explicite. Le bouton payant annonce l’obligation de paiement ; le zéro conserve son libellé gratuit. La demande de commencement anticipé reste facultative et distincte, avec reconnaissance de la perte du droit seulement à l’exécution complète. `server/repair-proposals.mjs` injecte le document et la version serveur ; le client ne peut pas envoyer son propre document, son identité ou un horodatage. `RepairProposal.legal` conserve ces éléments et les déclarations à la date de l’accord. Une nouvelle version des conditions ne réécrit pas une preuve existante ; une répétition de décision est sans effet. Les ateliers distincts conservent leurs propres contrats, et les anciens accords restent lisibles sans justificatif fabriqué rétroactivement.

Le portail propose une confirmation texte avec devis, conditions acceptées et formulaire de rétractation (`src/legal-receipts.ts`). Les téléchargements manuels relisent **POST `/api/client/portal`**, JSON vide, après contrôle d’une session fraîche et du CSRF, puis vérifient encore la session locale avant de préparer le fichier. Le document utilise la preuve figée, pas les CGV courantes. Pour une fiche historique sans adresse de contact, l’adresse du compte authentifié peut servir à la preuve ; une adresse de fiche renseignée reste prioritaire. Ce repli concerne les accords et déclarations, sans modifier implicitement les coordonnées d’envoi des notifications.

**Rétractation :** le propriétaire peut notifier sa décision depuis un devis de réparation accepté, y compris ancien, puis télécharger l’accusé. `requestRepairWithdrawal` conserve référence, horodatage, identité et déclaration ; répétition sans nouvel effet. Aucun calcul automatique de l’expiration, refus fondé sur la seule clôture technique ou remboursement automatique n’est introduit. Étape, stock, coûts, paiement et décision initiale restent conservés ; le magasin traite les conséquences avec le client. Une alerte persistante apparaît dans le dossier et les demandes du site ; les actions rapides de progression sont retirées pour ce dossier. Sans commencement anticipé demandé, la progression rapide vers l’intervention renvoie au dossier pour **vérification manuelle du délai applicable**. La transition manuelle reste disponible : aucun calendrier juridique n’est calculé par le logiciel.

La section **Les réseaux de Maxxi Games** (`src/maxxi-social.tsx`, `.css`) présente uniquement les comptes vérifiés [Instagram](https://www.instagram.com/maxxigames_kremlinbicetre/) et [TikTok](https://www.tiktok.com/@maxxigameskremlinbicetre). Liens externes simples, aucun widget ou suivi social incorporé, aucun compteur inventé. Le parcours et les avis gardent leurs deuxième et troisième places sur l’accueil.

**Nouvelle demande d’interface e-mails :** les préférences quittent le panneau complet des réglages pour un onglet **E-mails** (`#/emails`), avec activation/désactivation par événement pour **Client** et **Magasin**, aperçu du modèle réellement utilisé et choix des scénarios disponibles. Le catalogue comprend désormais **17 événements / 34 choix**, avec la rétractation. Un aperçu est un exemple fictif en lecture seule, pas un envoi de test ni une boîte de réception des messages entrants. Préférences et aperçus restent utilisables avant configuration du fournisseur. L’adresse du magasin reste son contact public ; aucune clé ou donnée privée ne doit passer dans le navigateur pour configurer le service.

Validation finale : **694 tests réussis (632 Node/domaine/API + 62 Cloudflare)**, aucun échec ni test ignoré. TypeScript et build de **123 modules / 137 fichiers publics**, dont 123 guides, réussis. Le warning historique de bundle supérieur à 500 kB reste présent ; aucune dépendance n’est ajoutée ou mise à jour. Les scénarios couvrent les preuves immuables, consentements, contacts historiques, sessions fraîches d’export, propriétaires, ateliers, rétractations et les aperçus des 17 événements pour les deux audiences.

Recette réelle sur SQLite en mémoire : accords fictifs payant et gratuit, démarrage anticipé facultatif, rétractation et accusés texte, signalement magasin, 34 interrupteurs, sauvegarde/rechargement et brouillon préservé, aperçu HTML/texte et variante rachat magasin. Contrôles à 1280/390/320 px sans débordement. Le défilement d’un aperçu long sur mobile a été corrigé et vérifié au clavier, sans modifier la CSP globale ; les liens d’aperçu restent neutralisés et l’iframe isolée. Aucun paiement ni e-mail réel. Les serveurs de recette sont arrêtés ; captures hors dépôt.

Publication vérifiée sur **100 % du trafic Cloudflare** : dix assets principaux et le catalogue des guides identiques au build par SHA-256, API publique 200 avec allowlist, douze routes/actions privées refusées anonymement en 401, dont aperçu et source documentaire. Version des CGV et comptes sociaux vérifiés dans le navigateur publié. Révision/génération de la D1 et nombre de messages de la file inchangés ; aucune migration ni donnée métier modifiée. Voir [TESTS.md](TESTS.md).

Ces métadonnées facultatives n’imposent aucune nouvelle migration SQL. Préserver la D1 dédiée et la file existante ; utiliser seulement la configuration privée `.wrangler/reparapid.production.jsonc` pour une publication autorisée. Une ancienne version qui ignore les nouveaux champs de preuve ne constitue pas un retour sûr sans vérification de leur conservation ; conserver une sauvegarde privée et privilégier une correction compatible. Le service réel d’e-mail reste non configuré (`RESEND_API_KEY` et `MAIL_FROM` absents lors du dernier contrôle), sans envoi réel effectué pour cette reprise.

## Reprise précédente : e-mails du cycle de réparation et préférences — 20 novembre 2026

La file de notification couvre désormais la création d’un dossier (inscription publique et nouvelle demande incluses), chaque changement d’étape, les propositions après diagnostic et leur remplacement, le choix du client, la déclaration puis la confirmation du virement de retour, l’expédition du retour et la finalisation du rachat pour pièces. Chaque événement produit au plus un message par audience ; le changement de statut induit par un refus/rachat ne double pas le message de décision. Une action idempotente ne crée aucun envoi. Les imports/restaurations et réinitialisations continuent à annuler la file sans produire d’événements.

Le client utilise l’adresse de sa fiche. À la demande de l’utilisateur, le magasin utilise **son adresse de contact publique** (`settings.publicIntake.email`, ou le contact canonique de la vitrine lorsque les réglages du magasin principal sont absents), modifiable dans **Réglages → Vitrine Reparapid et adresse d’envoi**. Si elle manque, l’interface le signale et les messages client restent indépendants. `notificationStoreView` résout le contact canonique uniquement pour le magasin principal, sans mutation du Store ; une adresse explicitement vide est respectée. Génération, livraison, statut admin et cron principal utilisent cette même projection. Aucun contact implicite du magasin principal n’est employé pour un autre atelier. Les préférences Client/Magasin par événement sont dans **Réglages → Notifications par e-mail**, toutes cochées par défaut, enregistrables avant configuration ou pendant la pause globale. Désactiver annule les envois correspondants encore en attente ; réactiver ne rejoue aucun événement historique. L’historique global indique l’audience et l’événement ; la fiche client ne montre que ses messages clients.

Le contrat GET admin fournit `events`, `preferences`, `shopRecipient`/`shopRecipientMissing`, et l’historique enrichi. Le PUT accepte l’activation et/ou les préférences strictement booléennes ; les clés inconnues sont refusées. Node et Worker déposent les lignes dans les mêmes transactions gardées que les comptes, sessions, révisions et publications métier. La livraison revérifie le propriétaire, le contact, les préférences et la révision du snapshot au début de chaque tentative. Une sauvegarde concurrente libère le claim sans consommer d’essai. Les messages malformés échouent individuellement sans casser la file ou l’historique. Claims, reprises bornées, clés stables Resend et pauses restent en place. Les anciens messages de statut restent lisibles et relançables, y compris avec un préfixe d’atelier.

Les payloads v2 restent une projection minimale : référence et console, événement, choix client ou suivi de retour si utile, lien vers le portail ou le dossier admin. Aucun diagnostic technique, note privée, prix, coordonnées bancaires ou identifiant de connexion n’est transmis. Les mails proposent des consignes adaptées à chaque étape, dont l’impression de la fiche d’envoi et la prise de contact pour le retrait/retour.

Migration additive **0005_notification_preferences.sql** : nouvelle table serveur `notification_preferences` par atelier, hors export JSON métier. SQLite racine l’installe à l’ouverture ; D1 racine utilise les migrations. Provisionnement des nouveaux ateliers et extension paresseuse des namespaces existants (premier accès ou cron) préservent les données, préférences et messages. Pour toute action de production, utiliser exclusivement `.wrangler/reparapid.production.jsonc`.

**Activation réelle encore à terminer :** contrôle des noms des secrets Cloudflare effectué, sans lecture de valeurs ni envoi ; `RESEND_API_KEY` et `MAIL_FROM` sont absents. L’origine publique des liens d’e-mail est configurée dans la configuration de production privée ; aucun secret mail n’est présent dans l’environnement local. Ne pas coller une clé dans ce guide ou le chat : la fournir via `wrangler secret put` ou Cloudflare. Le fournisseur doit disposer d’un domaine d’expédition vérifié. La fonctionnalité reste utilisable pour préparer les préférences ; sans configuration complète, aucun événement n’est mis en file et aucun ancien événement n’est rejoué après activation. L’adresse de contact du magasin ne constitue pas à elle seule un expéditeur validé.

Validation : **662 tests (600 + 62 Cloudflare)**, TypeScript et build de **117 modules / 137 fichiers** réussis. Recette du panneau sur données fictives en mémoire à 1280/390/320 px : 32 cases, clavier, sauvegarde/rechargement, brouillon préservé, pause/reprise, historique invalide sûr. Deux appels au fournisseur simulé, zéro mail réel, Store métier inchangé ; serveur arrêté, onglet de recette fermé et viewport réinitialisé. Les cinq migrations sont appliquées à une D1 locale indépendante ; la nouvelle migration est appliquée à la D1 de production dédiée, métadonnées et file préservées.

Publication confirmée sur **100 % du trafic**, dix assets conformes, API publique 200 et neuf routes/actions privées 401. Activation du fournisseur toujours en attente des paramètres ci-dessus ; aucun envoi ni délivrabilité réelle affirmés. Retour au commit précédent possible en conservant la table additive et en gardant les envois non configurés/en pause, sans restaurer la base métier. Voir [TESTS.md](TESTS.md).

## Reprise précédente : grille priorisée et passage direct à la panne — 19 novembre 2026

La grille d’accueil affiche trois colonnes au-dessus de 680 px et deux sur mobile. L’ordre demandé commence par **PS5, Switch 2, Xbox Series**. Le modèle général Xbox Series reste représenté par la silhouette X ; sa version X/S est toujours facultative à l’étape 2. L’ordre est construit dans la vue `HomeConsolePicker`, sans modifier le catalogue canonique ni l’ordre du formulaire complet. Les 27 choix, la recherche par nom/variante et les identifiants sont conservés.

Le clic sur une console ouvre directement **Version et panne**, depuis l’accueil ou l’étape 1, sans passage obligatoire par le bouton de poursuite. Les textes annoncent cette action. Les flèches restent des sélections natives sans changement d’étape ; Entrée/Espace confirment, et les boutons restent disponibles comme alternative. « Autre console » reste à l’étape 1 pour saisir son modèle. Recliquer une même famille après retour conserve version et symptômes ; choisir une autre famille les réinitialise. Aucun POST de demande, compte ou paiement ne se déclenche au choix d’une console.

Validation : TypeScript, revue indépendante et build de **117 modules / 137 fichiers**. Recette à 1440/1024/768 px (trois colonnes) et 390/320 px (deux), clics directs, clavier, cas Autre et préservation des choix vérifiés. Publication sur **100 % du trafic**, neuf assets conformes, API publique 200 et sept routes/actions privées 401 ; parcours publié contrôlé. Base de recette en mémoire inchangée, serveur arrêté, onglet créé fermé et viewport réinitialisé. La suite métier n’est pas relancée pour cette navigation visuelle. Aucun changement de métier serveur, de contrat d’API ou de données D1 ; voir [TESTS.md](TESTS.md). Le retour à l’affichage antérieur se fait par restauration du commit précédent et nouvelle publication avec la configuration privée, sans réinitialisation de base.

## Reprise précédente : modèles généraux et version facultative — 22 octobre 2026

L’accueil et l’étape 1 proposent **27 modèles généraux**, regroupés par `INTAKE_MODEL_GROUPS` dans `src/repair-intake-catalog.ts`. Les versions PS5/PS4, Switch, Xbox One/Series et les formats 3DS connus sont proposés dans `IntakeSubmodel`, à l’étape 2 **Version et panne**. Le choix **Je ne sais pas** est sélectionné par défaut ; la demande peut être envoyée sans préciser la version. Les générations Switch 2/Switch et Wii U/Wii restent distinctes. Les recherches par nom de variante remontent seulement son modèle général. Les anciens liens directs vers une variante la présélectionnent toujours à l’étape 2.

Les 38 identifiants existants restent valides. **Xbox Series** (`xbox-series`) devient la 39e entrée du catalogue partagé afin de conserver honnêtement une version inconnue, sans inventer X ou S ; Node et Worker utilisent la même validation. Une silhouette représentative de la gamme est utilisée sur la vitrine et dans l’atelier. Aucun schéma ni migration D1. Le changement de version retire les symptômes incompatibles tout en gardant les symptômes communs, puis recalcule les forfaits affichés. Changer de modèle général réinitialise version et symptômes sélectionnés.

Le champ **Accessoires prévus** est supprimé du formulaire ; les nouvelles demandes de cette interface envoient la valeur vide existante. Le contrat serveur et les accessoires des anciens dossiers sont conservés. Le numéro de série reste facultatif. La section **À chaque console, sa prochaine partie** est retirée de l’accueil ; parcours et avis conservent leurs deuxième et troisième places.

Validation : **598 tests réussis (553 + 45 Cloudflare)**, TypeScript et build de **117 modules / 137 fichiers**. Recette avec deux demandes fictives en mémoire (PS5 Slim et Xbox Series sans version), contrôles à 1280/390/320 px, pannes filtrées, clavier et absence d’accessoires vérifiés. Publication contrôlée sur **100 % du trafic**, neuf assets conformes, API publique 200 et sept routes/actions privées 401. Aucun changement des données D1 ; serveur arrêté, onglet créé fermé et viewport réinitialisé. Voir [TESTS.md](TESTS.md).

## Reprise précédente : en-tête allégé — 22 octobre 2026

La signature **par Maxxi Games · Le Kremlin-Bicêtre** est retirée sous le nom RépaRapid dans l’en-tête partagé de la vitrine. `ReparapidBrand` accepte `showPartner` (vrai par défaut) ; `StorefrontShell` le passe à faux uniquement dans son header. Le logo, le nom, le lien et son nom accessible restent identiques. Le pied de page et les tutoriels conservent leur signature ; l’identité **L’atelier de réparation de Maxxi Games** dans le hero est inchangée. Aucun métier, API, stockage ou asset supplémentaire.

TypeScript, revue ciblée et build de **116 modules / 137 fichiers** validés. Recette à 1280/390/320 px sans débordement, suppression dans le header et conservation du hero/footer contrôlées. Publication vérifiée sur **100 % du trafic Cloudflare**, neuf assets conformes, API publique 200 et sept routes/actions privées 401. Base de recette en mémoire inchangée, serveur arrêté, onglet créé fermé et viewport réinitialisé. Aucun changement de métier ni de données D1 ; voir [TESTS.md](TESTS.md).

## Reprise précédente : diagnostic, accord client et retour — 21 octobre 2026

Le magasin publie une **proposition au client** depuis l’onglet **Diagnostic** du dossier, distincte du diagnostic technique privé. Console réparable : description publique et prix total TTC (pièces comprises). Console irréparable : explication et offre facultative de rachat pour pièces. Le magasin saisit **les frais de retour pour chaque dossier**, y compris 0 pour un retour offert, et les instructions de virement si le montant est positif. Aucune coordonnée bancaire réelle n’est fournie par défaut ni présente dans le dépôt.

Le client choisit dans son espace : accepter la réparation, la refuser et demander le retour, ou accepter le rachat proposé pour une console HS. Une confirmation explicite précède l’enregistrement. L’accord de réparation autorise l’atelier à poursuivre ; il ne déclenche aucun paiement automatique. Le devis accepté reste figé et sert de montant de réparation facturable et encaissable (`repairChargeAmount`), indépendamment des coûts internes (`repairTotalCost`). Les frais de retour et le rachat ne sont jamais enregistrés comme un paiement de réparation.

Le retour demandé clôture l’intervention (`abandonnee` si refus d’une réparation, `irreparable` si HS), mais reste **En traitement** dans les demandes et actif dans le suivi jusqu’à l’expédition. Le client accède alors aux instructions privées et à la référence du dossier. Il peut déclarer son virement ; **seul le magasin confirme sa réception**. L’expédition exige cette confirmation, sauf retour gratuit, puis un transporteur/numéro de suivi. Le rachat accepté se finalise séparément par le magasin ; aucun mouvement bancaire ou transfert automatique de la console dans le stock ne se produit.

`Repair.proposal` est validé dans `src/domain.ts`. Une proposition encore sans réponse peut être remplacée par une nouvelle version ; une ancienne page ne peut accepter un prix remplacé. Un choix accepté/refusé est définitif dans ce parcours ; il n’est pas éditable par une sauvegarde ordinaire. Les actions identiques sont idempotentes. Les demandes du site encore avant réparation exigent l’accord pour progresser, être facturées ou marquées payées ; les anciens dossiers déjà avancés sans proposition conservent leur fonctionnement.

Routes ciblées : `POST /api/admin/repairs/:id/proposal` (révision + action), `POST /api/client/repairs/:id/proposal` (version + choix/déclaration). Node et Worker partagent `server/repair-proposals.mjs` ; session, propriété, atelier, origine, CSRF et révision sont revérifiés au commit. La sauvegarde ordinaire ne peut ni altérer/omettre une proposition ni changer sa console ou son client. Restauration/réinitialisation explicites gardent leurs règles. Aucune migration D1. Le portail reste une projection explicite ; la banque n’est incluse que pour un retour payant choisi par son propriétaire. Diagnostic interne, notes, photos, coûts fournisseurs et reçus internes restent privés. Aucune nouvelle notification e-mail de devis ; publication dans le portail seulement.

Validation : **593 tests réussis (548 + 45 Cloudflare)**, build de **116 modules** et **137 fichiers publics**. Recette complète sur quatre dossiers fictifs en mémoire, contrôles client à 1280/390/320 px, capture conservée hors dépôt. Publication vérifiée sur **100 % du trafic** : neuf assets conformes, API publique 200 et sept API/actions privées 401. Aucun schéma ni donnée D1 modifiés ; serveur arrêté et onglets de recette fermés. Voir le résultat courant dans [TESTS.md](TESTS.md).

## Reprise précédente : présentation des avis Google — 19 octobre 2026

La troisième section devient **La parole à nos clients** : fond crème, bouton Google plus visible, citations agrandies, étoiles et note propres à chaque avis, auteurs/dates en pied de carte. Les trois extraits, dates et cinq étoiles existants sont conservés. Le chiffre visible **5/5** appartient à sa carte et est masqué au lecteur d’écran pour éviter de répéter l’étiquette accessible des étoiles ; aucun score global ni total n’est ajouté. Les crédits et liens d’origine restent présents.

Le bloc utilise un conteneur `rp-shell` interne et passe en cartes verticales à 900 px ; aucun carrousel, média externe, API ou stockage supplémentaire. Aucun métier ni donnée d’atelier ne change.

TypeScript, revue indépendante et build de **112 modules** validés, avec **137 fichiers publics**. Recette à **1280, 390 et 320 px** : citations, trois notes individuelles accessibles, auteurs/dates, crédits, focus clavier et lien Google sécurisé contrôlés ; aucun débordement. Trois colonnes à 1024 px, une seule à 900 px. Contrastes ciblés vérifiés : étoiles 3,61:1, dates 5,19:1, source 4,85:1. Ordre hero/parcours/avis conservé. Les dossiers, clients et pièces de la base éphémère sont inchangés ; serveur arrêté.

Publication confirmée sur **100 % du trafic Cloudflare** : neuf assets conformes au build, API publique 200 et cinq API privées 401. La nouvelle présentation, les trois notes individuelles et la troisième place sont vérifiées sur le site publié. Capture enregistrée, onglet créé fermé et viewport réinitialisé ; aucune migration ni écriture D1.

## Reprise précédente : avis Google en troisième section — 19 octobre 2026

L’ordre d’accueil commence par le hero, **Comment ça marche ?**, puis **les avis Google**. `GoogleReviews` n’est monté qu’une fois, avant le bandeau de confiance. Les citations, dates, étoiles, crédits et liens restent identiques. Aucun changement de métier, API ou donnée.

TypeScript, build de **112 modules** et revue ciblée validés, avec **137 fichiers publics**. Ordre vérifié dans le DOM : hero, parcours, avis Google, bandeau de confiance ; un seul bloc d’avis et trois cartes. Recette à 1280 et 390 px, contrôle de débordement à 320 px. Les deux dossiers, clients et pièces de la base éphémère restent inchangés ; serveur arrêté.

Publication vérifiée sur **100 % du trafic Cloudflare** : neuf assets conformes au build, API publique 200 et cinq API privées 401. L’ordre et l’unicité des avis sont confirmés sur le site publié. Capture enregistrée, onglet créé fermé, viewport réinitialisé ; aucune migration ni écriture D1.

## Reprise précédente : parcours encore simplifié — 19 octobre 2026

La section **Comment ça marche ?**, toujours juste après le hero, garde ses trois schémas mais retire les rôles, résultats, introduction et répétitions. Numéro et titre sont réunis ; les cartes deviennent uniformément blanches et plus compactes. Un paragraphe par étape et les seuls labels **Talon chez vous / Fiche dans le colis** restent visibles. Deux liens courts et une seule note sur diagnostic, paiement et transport terminent le bloc.

Le compte, l’adresse confirmée, la console protégée avec sa fiche atelier et le retrait/retour à convenir une fois prête restent explicités. Aucun métier, API, asset public ou document imprimable ne change.

TypeScript, revue indépendante et build final réussis : **112 modules**, huit sources publiques et **137 fichiers**, dont 123 pages de guides. Recette à **1280, 390 et 320 px** : trois schémas et trois paragraphes, une seule légende talon/colis, absence de débordement et flèches verticales sur mobile. Ordre hero/parcours/bandeau conservé ; ancre, focus, Tab et Entrée vers le formulaire, lien du compte vérifiés. Les deux dossiers, clients et pièces de la base en mémoire sont inchangés ; serveur arrêté. La suite métier/API n’est pas relancée pour cette présentation.

Publication confirmée sur **100 % du trafic Cloudflare** : neuf assets conformes au build, API publique 200 et cinq API privées 401. Le site publié confirme trois cartes courtes sans rôles ni résultats, juste après le hero. Capture enregistrée, onglet créé fermé et viewport réinitialisé. Aucune migration ni écriture D1.

## Reprise précédente : trois étapes illustrées sous le bloc principal — 19 octobre 2026

Le composant `HomeRepairJourney`, dans `public-home.tsx`, est placé directement après le hero, avant le bandeau de confiance. Le parcours est regroupé en trois cartes : demande et création/connexion du compte, préparation et envoi, prise en charge à l’atelier et suivi/retrait. `home-repair-journey-art.tsx` ajoute trois SVG décoratifs ; les textes HTML distinguent notamment **talon chez vous** et **fiche dans le colis**. Les cartes passent de trois colonnes à une seule à 900 px, avec des flèches verticales.

Les étapes d’envoi, l’adresse confirmée, l’affranchissement séparé, le montant après diagnostic et le retrait/retour à convenir sont conservés. L’ancre `rp-how`, son focus et les deux liens de demande/compte restent disponibles. Aucun schéma de données, API, métier ou fiche imprimable ne change. Les photographies et l’identité Maxxi Games restent celles de la reprise précédente.

TypeScript, revue indépendante et build final réussis : **112 modules**, huit sources publiques et **137 fichiers**, dont 123 pages de guides. Recette sur SQLite en mémoire à **1280, 390 et 320 px** : trois schémas contenus, textes lisibles et absence de débordement. Trois colonnes confirmées à 1024 px, une seule à 900 px ; flèches verticales sur mobile. Ordre du DOM contrôlé : hero, parcours, bandeau de confiance, familles de consoles. Ancre directe, focus, Tab puis Entrée vers le formulaire et liens demande/compte vérifiés. Les deux dossiers, clients et pièces fictifs sont inchangés ; serveur arrêté.

Publication confirmée sur **100 % du trafic Cloudflare** : neuf assets conformes au build, API publique 200 et cinq API privées 401. La recette du site publié confirme les trois cartes, trois schémas et leur position juste après le hero. Capture enregistrée, onglet de recette fermé et viewport réinitialisé. Aucune migration ni écriture D1.

## Reprise précédente : Maxxi Games et photographies du magasin — 19 octobre 2026

L’accueil identifie explicitement RépaRapid comme **l’atelier de réparation de Maxxi Games** : logo dans l’accroche, équipe et magasin du Kremlin-Bicêtre nommés. La vraie devanture apparaît derrière le texte avec un voile rouge CSS ; le formulaire garde son fond blanc et sa grille de recherche. La section **Votre console, notre établi** présente une photo authentique du comptoir, le rôle de l’équipe, le diagnostic et trois points de service : contact, étapes de prise en charge et suivi dans le compte.

Les photos `public/maxxi-games-devanture.jpg` et `public/maxxi-games-atelier.jpg` sont auto-hébergées sans retouche. La devanture provient de la fiche exacte Gamepedia, crédit **Google User Content** lié dans l’accroche ; le comptoir provient du site officiel RépaRapid. Sources, dimensions et empreintes sont dans README.md. Les deux noms précis sont ajoutés à la liste d’assets partagée par Node et Worker ; les autres JPEG restent refusés. Aucun contrat d’API, règle métier ou stockage ne change ; l’adresse d’envoi reste conditionnée à sa confirmation.

Validation : **32 tests ciblés** des assets publics Node/Worker réussis, TypeScript et build final de **111 modules**, huit sources publiques et **137 fichiers**. Revue indépendante et recette en mémoire à **1280, 390 et 320 px** : photos, lisibilité, trois services, absence de débordement, contact et accès direct aux pannes Switch OLED vérifiés. Voir TESTS.md.

Publication confirmée sur **100 % du trafic Cloudflare** : neuf assets conformes au build (dont les deux photos), API publique 200 et cinq API privées 401. L’accueil et la section magasin publiés ont été vérifiés. La base de recette reste inchangée, le serveur est arrêté, l’onglet créé est fermé et le viewport réinitialisé. Aucune migration ni écriture D1.

## Reprise précédente : recherche écrite et choix visuel sur l’accueil — 19 octobre 2026

Le bloc **Quelle console réparer ?** retire le grand aperçu de console et donne sa place à une sélection agrandie toujours visible. `ConsolePickerSearch`, dans `home-console-select.tsx/.css`, fournit une recherche écrite, les illustrations et un choix explicite par boutons radio natifs. Le catalogue et les identifiants du formulaire restent les mêmes ; aucune présélection ni modification du contrat serveur.

La recherche accepte modèle, marque, famille et identifiant court (PS5, PS Vita, Switch…), avec normalisation des accents et recherche par plusieurs mots. Le choix confirmé reste explicite même si un filtre le masque ; l’utilisateur peut effacer sa recherche ou sa sélection. Une recherche sans résultat propose de revenir au catalogue ou de choisir **Autre console**. Ce repli conserve la saisie libre dans le formulaire.

Validation : TypeScript, revue indépendante et build final de **111 modules**, 135 fichiers. Recherche par alias, accents et plusieurs mots ; sélection explicite au clavier, absence de résultat, changement/effacement et parcours Switch/Autre contrôlés. Grille contenue à **1280, 390 et 320 px**, sans aperçu séparé ni débordement. Deux bases éphémères inchangées, serveurs arrêtés. Voir TESTS.md.

Publication confirmée sur **100 % du trafic Cloudflare** : sept assets conformes au build, API publique 200 et cinq API privées 401. L’accueil publié confirme l’absence de grand aperçu, les 38 choix et le filtrage Switch avec sélection explicite. Onglets de recette fermés ; aucune migration ni écriture D1.

## Reprise précédente : vue Liste des demandes du site — 19 octobre 2026

L’onglet du magasin `#/website-requests` propose une vue **Liste** compacte par défaut et une bascule **Liste / Cartes**. Les deux présentations utilisent les mêmes demandes, recherche, filtres, tri et compteurs. Le listing présente console/référence, client, panne, dates, statut et accès au dossier avec action de progression. Les transitions et confirmations existantes restent centralisées ; aucun contrat serveur ni règle du domaine ne change.

La table reste contenue dans une zone défilable sur les petits écrans. Les données clients restent dans l’application authentifiée, sans nouvelle route publique ni copie dans les assets.

Validation : TypeScript et build final de **111 modules**, 135 fichiers publics ; recette en mémoire sur dix demandes et un dossier classique exclu. Bascule, recherche, filtres, tri, texte intégral des pannes et ouverture du dossier vérifiés. Réception et mise à disposition confirmées puis relues après rechargement ; seules ces deux actions modifient leurs dossiers/consoles fictifs. Six colonnes visibles à 1280 px, tableau défilable à 390/320 px sans débordement. Les détails sont dans TESTS.md.

Publication confirmée sur **100 % du trafic Cloudflare** : sept assets identiques au build, API publique 200 et cinq API privées 401. Aucune migration ni écriture D1.

## Reprise précédente : frise du suivi et choix direct de la console — 15 octobre 2026

Le suivi du dossier sélectionné commence par une frise horizontale pleine largeur, avant les panneaux console et consignes. Les étapes sont reliées ; les étapes passées sont cochées, l’étape actuelle est mise en évidence et conserve `aria-current="step"`. Sur petit écran, seule la frise défile horizontalement, au clavier ou au toucher. Un `ResizeObserver` recentre l’étape actuelle lors d’un redimensionnement. Les variantes restent conservées : envoi pour les demandes en ligne, attente de pièces seulement lorsqu’elle est actuelle, cinq étapes pour un dossier classique et message de clôture pour les dossiers irréparables ou abandonnés.

Sur l’accueil, un seul champ **Votre console** donne directement accès aux 38 choix illustrés, sans choix de marque préalable. Les noms Nintendo, Sega et PlayStation portables sont explicites ; la recherche clavier accepte aussi le nom court comme Switch. Le choix rejoint directement les pannes du modèle ; **Autre console** conserve la saisie libre dans le formulaire complet. Les illustrations partagées, identifiants de modèles et contrats serveur ne changent pas.

TypeScript et build final réussis : 111 modules, six sources publiques autorisées et 135 fichiers. Recette finale en mémoire sur neuf dossiers fictifs, à 1280, 390 et 320 px : étapes/états, position de la frise, absence de débordement du document et recentrage de la dernière étape après redimensionnement. Accueil : 38 illustrations, un seul champ actif, validation/focus, sélection Switch, recherche clavier, accès direct aux pannes et repli Autre vérifiés. Détails dans TESTS.md. Publication confirmée sur 100 % du trafic Cloudflare : sept assets identiques au build, API publique 200 et cinq API privées 401. L’accueil publié confirme un seul champ et ses 38 illustrations. Aucun changement de données D1 ; le serveur et les onglets de recette sont fermés.

## Reprise précédente : menus illustrés et schéma d’envoi

Le suivi client utilise un schéma dédié dans `shipping-process-diagram.tsx/.css` : quatre étapes numérotées avec illustrations plus grandes, texte HTML lisible et destinations **CHEZ VOUS** / **DANS LE COLIS**. Il distingue impression, découpe sur les pointillés, conservation du talon et placement de toute la fiche atelier à l’intérieur du colis avec la console protégée. Le document imprimable et ses styles restent identiques à la reprise précédente.

Le choix de marque/modèle de l’accueil utilise des menus illustrés : logos de marque auto-hébergés dans les sources et SVG des consoles partagés avec le site. Les choix initiaux restent vides, le changement de marque remet le modèle à zéro et le bouton transmet toujours l’identifiant exact au formulaire. La navigation clavier, la fermeture des menus et la validation des deux choix font partie de la recette visuelle.

Les listes déroulantes natives à choix unique ont un chevron placé à 15 px du bord droit et une réserve de 42 px pour le texte via `select-controls.css`. Les listes multiples et les listes visibles de plusieurs lignes gardent leur rendu natif ; les couleurs forcées rétablissent également le chevron système.

Validation : TypeScript et build de **111 modules**, 135 fichiers publics ; menus, clavier, 38 modèles et quatre logos contrôlés dans une base éphémère. Suivi et menus vérifiés à **1280, 390 et 320 px**, inventaire natif à 1280/320 px. Document imprimable inchangé. Les 129 tests métier restent le résultat de la reprise précédente. Détails dans TESTS.md.

Publication confirmée à 100 % du trafic, sept assets identiques au build, API publique 200 et cinq API privées 401. Les menus illustrés sont contrôlés sur l’accueil publié. Aucune migration ni écriture D1.

## Reprise précédente : sélection d’accueil, suivi client et fiche à découper

Le hero de l’accueil contient un formulaire marque/modèle exact issu de `INTAKE_MODELS`, avec aperçu SVG et aucune valeur choisie par défaut. **Choisir la panne** ouvre `#/demande-reparation?modele=<id>` directement à l’étape panne pour un modèle reconnu. « Autre console » reste à la saisie du modèle ; un identifiant inconnu revient au choix normal. Les anciens liens `?marque=` et l’accès au formulaire complet sont conservés. Le parcours d’envoi de l’accueil et la confirmation du formulaire expliquent désormais la découpe.

L’espace client présente le dossier sélectionné à gauche (console, symptômes, références, accessoires et montant réel) et le process à droite (statut courant, action attendue, étapes et fiche d’envoi). Filtres, tris, recherche et bascule mosaïque/détails sont retirés. Plusieurs dossiers se choisissent par référence ; `?demande=<repairId>` sélectionne le dossier qui vient d’être créé, puis le choix reste stable à l’actualisation. Un seul dossier apparaît sans sélecteur supplémentaire ; les comptes vides et les consoles sans dossier restent pris en charge. Les états irréparable/abandonné restent fermés et les montants zéro/absents sont distincts. Les pièces clients des ateliers secondaires conservent leurs actions, sans filtres ; le magasin principal ne les affiche pas.

`client-shipping-sheet.tsx/.css` fournit le document partagé et `ShippingPreparationDiagram`. La fiche comprend un **talon à conserver**, une ligne pointillée avec ciseaux et la **fiche atelier à mettre dans le colis avec la console protégée**. Le schéma explique impression, découpe et destinations. Le transport se prévoit séparément ; les champs longs ne sont pas tronqués et toutes les pages de la partie atelier doivent accompagner le colis. La mise en page d’impression demande A4. L’adresse non confirmée bloque l’impression et indique de contacter l’atelier.

Contrats Node/Worker, projections, contrôle du propriétaire, sessions/CSRF/epochs et revalidation avant impression restent inchangés. Les données de recette sont fictives et restent dans SQLite en mémoire. Validation et limites d’impression : voir TESTS.md.

Validation : **129 tests ciblés**, TypeScript et build final de **102 modules** réussis ; 135 fichiers publics. Recette du parcours complet, multi-dossiers et dossier unique, compte vide, zéro/absence, clôtures, confidentialité à la déconnexion et champs longs. Le suivi est effectivement vérifié à **1280, 390 et 320 px**, sans débordement, et l’accueil à 1280/320 px. La fiche a été vérifiée à l’écran et l’impression déclenchée ; le contrôle natif de l’application est refusé par l’outil, donc aucun PDF n’a été exporté ni rendu et aucun nombre de pages imprimées n’est certifié. Trois bases éphémères, serveurs arrêtés, onglets fermés et viewport réinitialisé. Publication à 100 % du trafic, sept assets conformes, API publique 200 et cinq API privées 401, 123 pages et 140 contrôles SEO réussis ; aucune écriture D1.

## Reprise précédente : illustrations des consoles et accroche d’accueil

Les SVG partagés par la vitrine, les guides et l’atelier conservent leurs silhouettes et leurs cadres. `shop-console-art.tsx` affine les dégradés de coques, ombres de contact, boutons/joysticks, relief des manettes, verre des écrans et couleurs des Joy-Con. Le nouveau `shop-console-details.tsx` ajoute ports, arêtes et petits détails dans les coordonnées et transformations des modèles existants. Chaque dégradé et clip conserve un identifiant issu de `useId` ; les écrans restent contenus dans leur propre zone. Les traits de châssis Xbox One et PS3 ont été raccourcis pour préserver les manettes au premier plan.

L’accueil affiche désormais **« Une seconde vie pour votre console. »**. Classification des modèles, variantes, photographies prioritaires, interactions, coûts et données serveur restent inchangés. Les validations et la publication de cette retouche visuelle figurent dans TESTS.md.

Validation : 14 tests de correspondance/apparence réussis, TypeScript et build final de 100 modules, 135 fichiers publics. Recette à 1280 px sur 38 consoles fictives : les 38 SVG de chaque vue formulaire/inventaire restent dans leurs cadres, sans identifiant dupliqué ni référence manquante ; Store inchangé, serveurs arrêtés et onglets fermés. La nouvelle accroche est aussi confirmée sur l’accueil publié. Publication à 100 % du trafic, sept assets conformes, 123 pages et 140 contrôles SEO réussis, API publique 200 et cinq API privées 401 ; aucune écriture D1. Les 531 tests métier/API restent le résultat de la reprise des forfaits.

## Reprise précédente : onglet Forfaits de réparation

La gestion des forfaits est désormais une page dédiée **Forfaits de réparation** dans le menu principal du backoffice, à l’adresse `#/repair-packages`. Le titre, le fil d’Ariane et l’état actif du menu suivent cette route. Le panneau a été retiré de **Réglages & sauvegardes**. La page réutilise l’éditeur et le catalogue existants ; sur grand écran, le catalogue et le formulaire sont disposés côte à côte, puis empilés sur les écrans plus étroits.

Menu, route et éditeur restent réservés à `super_admin` sans `workshopId`, soit le magasin principal. Un accès anonyme passe par la connexion administrateur et un atelier secondaire reçoit une page de refus. Aucun contrat d’API, tarif, donnée ou règle métier n’est modifié. Consulter TESTS.md pour la compilation, la recette et la publication de ce déplacement.

TypeScript et build final de **99 modules** réussis, 135 fichiers publics. Recette à 1280 px en mémoire : navigation directe, catalogue et formulaire côte à côte, sauvegarde/rechargement, réglages sans forfaits et collections métier inchangées ; serveur arrêté, onglet fermé. Gardes relues indépendamment. Publication vérifiée à 100 % du trafic avec sept assets conformes, API publique 200 et cinq API privées 401, sans écriture D1. Les 531 tests restent le résultat de la reprise métier précédente.

## Reprise précédente : forfaits de réparation par modèle et panne

L’utilisateur demande l’affichage des forfaits quand une panne peut correspondre à une intervention identifiée. Les pages officielles de réparapid.fr consultées proposent des demandes de devis, sans grille chiffrée publiée ; la grille réelle (modèle, intervention, montant TTC et inclusions) a été demandée à l’utilisateur. **Aucun tarif réel ou tarif par défaut n’est initialisé.** Le magasin peut renseigner les montants dans l’onglet **Forfaits de réparation** ; les données fictives de recette ne sont jamais transférées en production.

Le panneau du compte principal permet ajout/modification, prix fixe ou « à partir de », contenu du forfait et publication explicite. Un nouveau forfait démarre sans montant et non publié ; **Masquer du site** préserve sa fiche. Les montants sont en EUR TTC, y compris zéro. Le brouillon reste visible pendant la soumission ; le Provider confirme la sauvegarde serveur et gère les conflits. Changer le modèle vide le symptôme lié.

`Store.settings.publicRepairPackages` est un tableau optionnel de `RepairPackage` validé par le domaine : au plus 200 entrées, identifiants uniques, modèle exact du catalogue sauf « Autre », symptôme cohérent, intervention/inclusions obligatoires, montant fini de 0 à 100 000 € et deux décimales, prix fixe/à partir, publication booléenne explicite. Libellé 160, inclusions 1000 caractères. Les anciens Store restent valides. Une grille absente donne une liste publique vide ; un ancien éditeur ne peut omettre une grille présente lors d’une sauvegarde ordinaire. Un tableau vide ou une restauration/reset explicites conservent leurs sémantiques existantes.

Node et Worker renvoient désormais **`{shop, repairPackages}`** via GET `/api/public/repair-intake`, avec une projection explicite des forfaits publiés, sans indicateur privé ni forfait masqué. La route reste réservée au contexte du magasin principal. Le catalogue/suggestions a été extrait dans `repair-intake-catalog.ts`, réexporté par `repair-intake-domain.ts` ; la compilation CJS prend en charge ce module. `domain.ts` garde la validation de référence, sans cycle d’import à l’exécution.

Le formulaire affiche les forfaits correspondant exactement au modèle et aux symptômes sélectionnés. Le prix principal apparaît seulement pour une panne et un forfait ; les autres combinaisons conservent un montant global à confirmer et listent les offres sans addition. La confirmation du diagnostic/intervention reste indiquée. Les POST ne transmettent ni prix ni référence tarifaire ; aucun chiffrage, diagnostic, paiement ou coût de pièce n’est dérivé de ce catalogue. Les dossiers, le portail et les factures gardent leurs coûts réels existants.

Validation : **531 tests réussis (486 + 45)**, TypeScript et build final de 98 modules, six sources publiques et 135 fichiers. Recette en mémoire à 1280 px : forfait précis, « à partir », zéro, variante sans prix, plusieurs pannes sans total, masquage, création/publication, relecture serveur et actualisation du formulaire ; collections clients/consoles/dossiers/pièces inchangées. Une deuxième base vide confirme le formulaire admin sans valeur préremplie. Aucun compte ou prix fictif de recette n’est destiné à la production. Les serveurs sont arrêtés et les onglets temporaires fermés.

Publication à **100 % du trafic Cloudflare**, sans migration ni écriture D1 : sept assets principaux conformes au build, 123 pages HTML conformes et 140 contrôles SEO réussis. API publique 200 avec `shop` et `repairPackages`, grille publique vide en attente des tarifs réels ; cinq API privées refusent les accès anonymes en HTTP 401. Détails dans TESTS.md.

## Reprise précédente : 120 tutoriels et logo Maxxi Games

L’utilisateur demande le plus de tutoriels possible pour consoles et smartphones, puis le logo de Maxxi Games à la place de sa signature textuelle sur l’accueil. **96 nouveaux articles** complètent les 24 précédents : **120 guides**, répartis en **72 consoles/manettes** et **48 smartphones**. Le catalogue `/guides/` propose recherche progressive et catégories `/guides/consoles/` et `/guides/smartphones/`. Le contenu complet reste disponible sans JavaScript ; seuls les trois catalogues chargent le petit script public de filtrage, sans stockage, réseau ou code de gestion.

Familles : PlayStation 19, Nintendo 29, Xbox 14, Sega 7, Steam Deck 3, iPhone 24, Samsung Galaxy 10, Pixel 8, Xiaomi/Redmi/Poco 4 et Motorola 2. Deux exemples et deux FAQ par article donnent 240 de chaque. Sources primaires liées, modèle/variante précisés, procédures abrégées accompagnées du guide illustré, précautions de batteries/nappes et limites de calibration explicites. Les guides smartphones dirigent vers le contact du magasin ; le formulaire métier reste réservé aux consoles. Aucun changement au domaine, aux comptes ou aux données D1.

Les fichiers `repair-guides-consoles-extra.ts`, `repair-guides-iphone.ts` et `repair-guides-android.ts` sont agrégés par `repair-guides-content.ts`. Leurs modules de slugs sont importés par le manifeste exact. Les familles et SVG de smartphones/manettes sont dans `repair-guide-families.ts` et `guide-device-art.tsx`. Le build génère **123 pages HTML de guides**, un script de recherche nommé par hash et deux ressources SEO. Le sitemap compte **124 URL publiques**. Les catégories et alias sont ajoutés à la liste exacte Node/Worker, sans élargir l’accès aux fichiers privés.

Le logo original **Maxxi Games rouge et jaune** est auto-hébergé dans `public/maxxi-games-logo-original.png`, déclaré parmi les assets publics fixes. La signature sous RépaRapid affiche désormais le mot « par » juste avant ce logo, sur une même ligne. Elle utilise cette image avec un cadrage CSS du bandeau, sans retouche du fichier ; accueil, autres écrans publics et tutoriels restent cohérents. Le logo RépaRapid et le favicon sont conservés. L’ajout de « par » est validé par TypeScript, build et recette à 1280 px ; la nouvelle publication est contrôlée à 100 % du trafic, avec 123 pages et sept assets conformes. Les 523 tests restent ceux de la reprise des tutoriels. La source et son empreinte sont documentées dans README.md.

Validation finale : **523 tests (478 + 45)**, puis 13 tests de guides et TypeScript réussis après les dernières précisions ; build de 94 modules, six sources publiques et 135 fichiers. Publication à 100 % du trafic, 123 pages conformes au build, 140 contrôles SEO et sept assets principaux conformes incluant le logo. API publique 200, routes privées 401 et fichiers privés 404. Recette réellement observée à 1280 px ; le navigateur est resté à cette largeur malgré les réglages mobiles, donc aucune nouvelle validation à 390/320 px n’est affirmée. Le Store en mémoire est inchangé, serveur arrêté et onglets temporaires fermés. Consulter TESTS.md pour les détails. Les chiffres de 522 tests, 25 pages et 37 contrôles SEO ci-dessous restent ceux de la première version de 24 articles. Le domaine canonique reste workers.dev ; WordPress et DNS reparapid.fr sont conservés.

## Reprise précédente du 13 octobre : 24 tutoriels et retrait du Journal d’activité

L’utilisateur demande de nombreux tutoriels de réparation à faire soi-même, un développement SEO et le retrait de l’onglet **Journal d’activité**. Le site publié propose un catalogue public [/guides/](https://reparapid.aldeguer-remi.workers.dev/guides/) et 24 articles `/guides/{slug}/`, couvrant **7 sujets PlayStation, 9 Nintendo, 4 Xbox, 3 Sega et 1 Steam Deck**. Chaque guide comporte introduction, symptômes, matériel, procédure, contrôles finaux, signes imposant de s’arrêter, deux exemples concrets, deux questions fréquentes et sources liées : **48 exemples et 48 FAQ** au total. Les procédures distinguent les modèles et variantes, les contrôles accessibles et les interventions qui demandent un atelier. Auteur : **RépaRapid · Maxxi Games** ; aucun tarif, temps de réparation ou récit client n’est inventé.

Le contenu TypeScript est rendu en HTML statique à la compilation par `scripts/generate-repair-guides.mjs`, avec React côté build et **esbuild 0.28.2** comme dépendance de développement directe verrouillée. Les pages complètes sont consultables sans JavaScript applicatif. Elles réutilisent les styles Vite, le logo, Oxanium et les SVG natifs du site ; un SVG Steam Deck complète les silhouettes communes. La navigation et le pied de page publics proposent **Tutoriels**, et trois cartes sur l’accueil ouvrent des articles.

Le SEO comprend titres et descriptions uniques, canonical/Open Graph propres, un seul H1, fil d’Ariane visible, données structurées `Article`/`BreadcrumbList` pour les articles et `CollectionPage` pour le catalogue. Les FAQ restent visibles sans schéma `FAQPage`. La date éditoriale est le **13 octobre 2026**, pas la date de chaque rebuild. `sitemap.xml` liste **26 URL** : racine, catalogue et 24 articles, sans API ni route hash privée. `robots.txt` annonce ce sitemap et exclut `/api/` de l’exploration ; ce fichier ne remplace aucune autorisation serveur.

Le domaine canonique reste **https://reparapid.aldeguer-remi.workers.dev**. Le WordPress et le DNS de **reparapid.fr** ne changent pas. Aucun résultat d’indexation ou de classement Google n’est établi et aucune Search Console n’a été consultée ; ne pas présenter les métadonnées comme une garantie de positionnement.

`server/public-assets.mjs` partage entre Node et Worker la liste exacte des pages générées et leurs fichiers. Les URL connues sont servies en GET/HEAD ; les variantes connues sans slash final et avec `index.html` reçoivent un **308** vers le canonical. Un chemin inconnu n’est jamais converti en article. Les fichiers et dossiers non déclarés ainsi que les liens symboliques restent refusés. Le contrôle **public/ avant Vite** accepte seulement les assets de marque fixes ; les guides et fichiers SEO sont produits dans `dist/` par le build, puis leur présence est contrôlée. Cloudflare conserve `run_worker_first=true`, avec `html_handling: "none"` et `not_found_handling: "none"`, pour laisser le Worker décider du routage.

L’interface ne monte plus **Journal d’activité** et retire son lien **Voir tout** du dashboard. La route historique `#/activity` affiche une page inexistante et un retour au tableau de bord. Les événements, les historiques de réparation et les règles qui les utilisent restent conservés dans `src/domain.ts` ; aucune purge ou migration n’est requise.

**Validation finale le 13 octobre : 522 tests réussis (477 Node/domaine/API + 45 Cloudflare)**, aucun échec, test annulé ou ignoré ; contrôle des espaces du diff réussi. TypeScript et le build Vite final de **88 modules** sont réussis : cinq sources publiques autorisées, **35 fichiers dans dist/** dont les 25 pages HTML de tutoriels, `robots.txt` et `sitemap.xml`. Les **510 tests (465 + 45)** et la publication de la reprise de confidentialité ci-dessous restent historiques. Aucune migration ou modification de données D1 n’est nécessaire.

Recette finale sur serveur Node temporaire en mémoire : **24 cartes et SVG** du catalogue, trois teasers et liens publics de l’accueil contrôlés à **1280, 390 et 320 px**, illustrations entières dans leurs cadres et aucun débordement horizontal. Articles PS5 et Steam Deck contrôlés à 1280/320 px, article Switch à 320 px, sommaire et FAQ native ouverte ; deux exemples et deux FAQ par guide, sans script applicatif. Le CTA Steam Deck ouvre le formulaire avec filtre **Autre** et choix **Autre console**. Gestion fictive avec huit rubriques : Journal absent, aucun lien vers `#/activity`, ancienne route inexistante, Inscriptions toujours absent, inventaire avec onze silhouettes communes et un repli. Déconnexion retirant les vues privées, Store strictement inchangé et serveur temporaire arrêté. Aucun export, import, reset, paiement, e-mail ou écriture de données de production. Le détail figure dans [TESTS.md](TESTS.md).

Publication finale vérifiée sur **100 % du trafic Cloudflare**. Les **25 pages HTML** du catalogue et des articles répondent en HTTP 200 et sont identiques au build par SHA-256 ; `robots.txt` et `sitemap.xml` sont également conformes. **37 contrôles SEO réussis** : pages, canonical, absence de bundle applicatif, quatre redirections connues en HTTP 308, cinq chemins inconnus ou de sources en HTTP 404, HEAD en HTTP 200 sans corps. Les six assets principaux HTML/JavaScript/CSS/logo/police/licence sont conformes au build ; API publique en HTTP 200 et cinq routes privées en HTTP 401. Contrôle complémentaire : quatre API privées en HTTP 401 avec `no-store` et 18 GET/HEAD de fichiers privés en HTTP 404 avec `no-store`. Aucune migration, écriture de données de production ou modification DNS.

Pour une modification éditoriale, corriger `src/repair-guides-content.ts` et conserver sa correspondance avec les slugs de `src/repair-guides-manifest.mjs`. `npm run build` génère le catalogue, les articles, `robots.txt` et `sitemap.xml` après Vite, puis contrôle la liste publique complète. Ne pas modifier `dist/` ni copier du HTML dans `public/`. Pour une future bascule de domaine, mettre à jour `GUIDE_ORIGIN` et les canonical/Open Graph de `index.html`, vérifier les origines applicatives, reconstruire puis contrôler les URL et fichiers SEO réellement servis. Utiliser la configuration privée de cette installation lors d’une publication autorisée, sans nouvel import ni reset D1.

Pour consulter les tutoriels localement, lancer `npm run build` puis `npm start`, ou utiliser un serveur Node temporaire servant ce `dist/` pour une recette. Refaire le build après chaque modification éditoriale. Le serveur Vite de développement ne génère pas ces pages statiques à la volée.

## Reprise précédente du 13 octobre : diffusion des données et fichiers publics

L’utilisateur demande un backend évitant d’exposer les données en clair sur le Web. Le backend Node/SQLite et Worker/D1 est déjà présent : Store serveur, sessions, contrôle du propriétaire, séparation des ateliers, CSRF et révisions atomiques. La nouvelle reprise durcit la frontière des fichiers statiques ; elle ne remplace pas ce backend et ne modifie ni schéma, contrat métier ou migration.

Le module partagé `server/public-assets.mjs` limite Node et Worker aux assets publics explicitement autorisés et aux fichiers JavaScript/CSS Vite hashés. Un fichier non autorisé est refusé même s’il est injecté dans `dist/`. `scripts/verify-public-assets.mjs` vérifie **public/ avant Vite**, car Vite peut déréférencer les liens : seuls logos, favicon, police et licence fixes sont acceptés, sans HTML ni faux bundle JavaScript/CSS copié. Le contrôle de `dist/` après Vite est conservé et refuse liens symboliques, exports, configurations, source maps et fichiers inconnus. `.gitignore` couvre les exports JSON/CSV, récupérations et brouillons sous les nouveaux noms Reparapid.

Les réglages proposent la suppression manuelle de l’ancienne copie `localStorage`, avec confirmation et relecture pour ne pas retirer une copie qui a changé. La purge n’est pas automatique et ne touche pas le Store du serveur. La recette fictive a conservé une copie changée entre lecture et confirmation, puis l’a supprimée après relecture et nouvelle confirmation ; le Store serveur est resté strictement identique. Les protections de session, de propriétaire et d’atelier restent obligatoires pour chaque requête privée.

Les données et les exports explicites restent du JSON lisible ; l’application ne chiffre pas la base de bout en bout. HTTPS protège le transport et les projections limitent la diffusion au destinataire autorisé, qui peut toujours inspecter ses données dans le navigateur. Ne pas promettre une invisibilité des données à leur propriétaire ni un chiffrement applicatif absent.

Limite non corrigée : l’inscription publique distingue une création de compte d’une adresse déjà enregistrée, ce qui permet une faible énumération d’accès, sans accès aux dossiers. Une fermeture complète dépend d’une vérification de possession de l’e-mail. Le service d’envoi n’est pas configuré ; le choix du parcours reste soumis à clarification.

Une demande supplémentaire masque **Pièces à fournir par les clients** dans le magasin principal RépaRapid et le portail principal ; les ateliers distincts gardent cette fonction. La recette a confirmé l’absence des sections, compteurs et actions malgré une demande fictive conservée dans les données. Le stock, les pièces utilisées et les accessoires habituels restent inchangés. Les anciennes données `clientParts`, les règles du domaine et les API restent conservées : masquer les éléments d’interface ne purge pas les demandes et ne change pas le contrat serveur.

L’interface de gestion ne propose plus **Inscriptions**, ni création ou validation d’autres administrateurs ou ateliers. `App.tsx` n’importe et ne monte plus `RegistrationReview` ; l’ancienne route `#/super-admin/registrations` affiche une page inexistante avec retour au tableau de bord. Les libellés affichent **Administrateur**. Le compte du magasin, les comptes clients et l’admission publique restent conservés. Les anciens rôles effectifs, API, règles et ateliers du backend sont inchangés : ce retrait d’interface n’est pas une fermeture des anciennes routes serveur.

`ConsoleArt` réutilise désormais `ShopConsoleArt` du site. Le classificateur est partagé dans `src/shop-console-kind.ts` ; `workshopConsoleArtItem`, dans `console-appearance.ts`, adapte les alias de modèles, avec cadres bornés dans `workshop-console-art.css` et options de présentation/accessibilité du composant commun. Les photos restent prioritaires. Accessoires, Game Boy Pocket/Light/Micro, Xbox originale et modèles inconnus conservent un repli. La parité des 38 modèles du catalogue est couverte par les tests d’apparence, **14 réussis sur 14**.

Validation finale intégrée : **510 tests réussis (465 Node/domaine/API + 45 Cloudflare)**, aucun échec ni test ignoré ; **38 tests ciblés de confidentialité** réussis. TypeScript et build Vite de **87 modules** validés, avec cinq fichiers autorisés dans `public/` et huit dans `dist/`. Recette Node en mémoire avec client, consoles, dossiers et pièce client fictifs : réglages et ancienne route sans inscriptions, pièces clients masquées, 11 illustrations communes et un repli dans l’inventaire, paiement/coût conservés et aucun SVG hors cadre ou débordement à 1280/320 px. Le portail conserve ses consoles/statistiques et masque les pièces clients ; déconnexions admin/client retirant les vues privées. Aucun export, import, reset ou paiement réel ; serveur temporaire arrêté et Store strictement inchangé.

Publication vérifiée sur **100 % du trafic Cloudflare** : SHA-256 du HTML, du JavaScript, du CSS, du logo, de la police et de sa licence identiques au build final ; API publique en HTTP 200 et cinq routes privées en HTTP 401. Contrôle complémentaire : quatre API privées en HTTP 401 avec `no-store` et 18 GET/HEAD vers neuf chemins de fichiers interdits en HTTP 404 avec `no-store`. Aucune migration, réinitialisation ou modification de données de production. Les résultats précédents restent historiques et datés.

## Reprise précédente : parcours expliqué sur l’accueil — 13 octobre 2026

La section **Votre réparation, pas à pas** précise les quatre étapes : modèle et symptômes, enregistrement avec un compte nouveau ou existant au statut **En attente d’envoi**, impression de la fiche et expédition vers l’adresse confirmée, puis réception et prise en charge à l’atelier avec suivi des étapes et du montant. Les trois actions du client et le relais de RépaRapid sont distingués visuellement. Le statut **Prête à récupérer** invite à organiser le retrait ou le retour avec le magasin. La fiche identifie le dossier ; affranchissement et étiquette de transport se prévoient séparément. Le montant est confirmé après diagnostic, sans paiement dans le formulaire. Aucun texte de diagnostic interne n’est promis au client.

Deux liens proposent de commencer une demande ou de retrouver un dossier. L’ancre `#/accueil?section=rp-how` ouvre directement cette section. La recette à 1280, 390 et 320 px valide les quatre cartes, leur ordre, l’absence de débordement de texte et les destinations des liens. TypeScript et le build final Vite sont validés (87 modules). Publication vérifiée sur 100 % du trafic Cloudflare : HTML, JavaScript, CSS, logo, police et licence servis identiques au build par SHA-256 ; API publique 200 et cinq routes privées contrôlées 401 sans exposition de données. Aucun métier, API, schéma ou donnée d’atelier ne change ; la suite complète de **476 tests** appartient à la reprise fonctionnelle précédente et n’a pas été relancée pour cette présentation.

## Reprise précédente du 13 octobre : demandes du site et contact

La nouvelle vue `#/website-requests`, **Demandes du site**, est réservée au magasin principal. Elle sélectionne uniquement les dossiers portant `publicRequestId`, avec compteurs, filtres, recherche et tri. Les cartes montrent modèle, coordonnées client et symptômes ; `ShopConsoleArt` fournit les silhouettes lorsque la console n’a pas de photo, et les photos existantes restent prioritaires. Le détail d’un dossier propose un retour vers cette vue.

La réception demande de confirmer l’arrivée physique au magasin. Les actions passent ensuite par `moveRepair` et conservent les transitions canoniques ; `transact` vérifie que le dossier possède encore l’étape attendue avant d’appliquer l’action. La clôture annonce explicitement les tests tous marqués OK et l’arrêt du chronomètre. **Prête à récupérer** désigne `terminee` : le retrait ou le retour reste à organiser, sans nouveau champ ni statut de remise ou d’expédition. Le portail affiche ce même libellé et invite au contact pour les dossiers `intakeSubmitted` terminés. Aucun schéma, contrat d’API ou structure de projection n’a changé.

L’accueil propose maintenant **Contactez-nous**, accessible depuis les éléments publics partagés et le portail. Les coordonnées viennent des réglages publics du magasin, avec les valeurs initiales et les liens professionnels vérifiés sur [reparapid.fr](https://reparapid.fr/) le 13 octobre. Les horaires du mardi au samedi, 10 h à 20 h, conservent leurs exceptions. Le formulaire comporte prénom, nom, e-mail et message ; **Ouvrir mon e-mail** prépare uniquement un lien `mailto:`. La transmission exige que l’utilisateur envoie le message dans sa messagerie ; il n’y a pas de route serveur de contact ni d’envoi automatique. Aucun e-mail n’a été transmis pendant la recette.

Validation finale : **476 tests réussis (431 Node/domaine/API + 45 Cloudflare)**, aucun échec ni test ignoré. Deux nouveaux tests Node et Worker couvrent le parcours révisé. TypeScript et le build final ont réussi avec **87 modules**, après l’ajustement des illustrations et coordonnées des cartes. Sur une base temporaire en mémoire : trois demandes du site parmi neuf dossiers hors site, réception, clôture, compteurs, filtre et persistance après rechargement ; portail du même client avec statut prêt et sans données internes ; contact et navigation contrôlés. Cartes, SVG et contact restent contenus à 1280 et 320 px. Publication vérifiée sur **100 % du trafic Cloudflare** : SHA-256 du HTML, du JavaScript, du CSS, du logo, de la police et de sa licence conformes au build final ; API publique en HTTP 200 et cinq routes privées contrôlées en HTTP 401 sans exposition de données. Aucune donnée de production n’a été modifiée.

## Reprise précédente du 13 octobre : gestion du magasin et cadres du formulaire

L’utilisateur demande d’harmoniser la gestion avec l’identité RépaRapid et de corriger les illustrations qui débordent dans `#/demande-reparation`. La recette visuelle est réalisée sur une API Node temporaire en mémoire avec deux clients et des dossiers fictifs. Le **build final et TypeScript ont réussi avec 85 modules**. Cette harmonisation est publiée sur 100 % du trafic Cloudflare ; les SHA-256 du HTML, du JavaScript, du CSS, du logo, de la police et de sa licence correspondent au build final. L’API publique répond en HTTP 200 et cinq routes privées contrôlées refusent les appels anonymes en HTTP 401 sans exposition de données. Les résultats de publication de la section suivante concernent la reprise précédente.

`src/backoffice-theme.css` et `src/backoffice-components.css` appliquent le noir, le rouge et la typographie Oxanium aux écrans de gestion sous le conteneur `.rp-backoffice`, y compris les composants clients, synthèse, finance, notifications, inscriptions et factures. `src/auth.css` et `src/auth.tsx` reprennent cette identité pour l’accès au magasin. La navigation, les libellés, le logo partagé et celui des factures utilisent RépaRapid ; les noms des fichiers téléchargés portent Reparapid. Les couleurs sémantiques des états et graphiques restent conservées.

`workshopDisplayName`, dans `src/reparapid-identity.ts`, remplace uniquement à l’affichage le nom importé par défaut ; les noms d’ateliers personnalisés sont conservés. Les identifiants invisibles du stockage et des canaux de session restent identiques pour préserver la compatibilité. Les sources métier et les contrats d’API ne changent pas ; aucune migration ni donnée de production n’a été modifiée dans cette reprise.

Dans `src/repair-intake.css`, les cartes, cadres d’illustration et SVG sont bornés ; les libellés longs peuvent se répartir sur plusieurs lignes sans élargir la carte. Le catalogue, les suggestions de pannes et le parcours console → panne → compte sont conservés. Les **38 cartes et 38 SVG** ont été contrôlés à **1280, 390 et 320 px**, sans illustration hors cadre ; le récapitulatif après sélection d’une PS5 Digital reste contenu.

La connexion et neuf pages de gestion ont été contrôlées : logo original, navigation noire, actions rouges et Oxanium, sans mention visible de La Clinique Rétro. La modale d’ajout d’une console reçoit le thème. À **320 px**, tableau de bord, clients, réglages, factures et aperçu généré restent sans débordement ; le menu s’ouvre, se ferme et permet la navigation. Un aperçu simple fictif conserve son total de **27,15 €**, avec le nom RépaRapid, le logo et les séparateurs rouges. La déconnexion locale retire les dossiers et ramène à la connexion. Aucun PDF, impression ou facture de production n’a été réalisé. Les API et les données de production n’ont pas changé ; la suite métier de 474 tests du 12 octobre n’a pas été relancée.

## Reprise précédente du 13 octobre : engagements, avis et illustrations

L’accueil reprend maintenant les engagements publics de [reparapid.fr](https://reparapid.fr/) sous une formulation adaptée à la vitrine : rapidité, expérience du technicien et proximité du magasin. Le détail des délais et horaires se trouve dans [README.md](README.md). Le texte distingue explicitement le temps d’intervention à l’atelier de l’acheminement du colis et conserve les exceptions annoncées par le commerçant.

Trois courts extraits d’avis Google ont été vérifiés dans le widget Trustindex public du site d’origine. Les cartes conservent l’attribution, la date et les cinq étoiles propres à chaque avis ; elles identifient leur source et proposent la fiche Google Maps de l’atelier. La sélection est statique : aucun total, moyenne ou rafraîchissement automatique n’est revendiqué. Les auteurs et dates sont documentés dans [README.md](README.md) ; les textes sont dans `src/public-home.tsx`. Ne pas présenter cette sélection comme un flux d’avis Google connecté.

`src/shop-console-art.tsx` et `src/shop-console-art.css` fournissent les nouvelles illustrations SVG natives de la vitrine. Les 38 entrées du catalogue sont représentées par leurs familles et variantes dans l’accueil, le visuel principal et le formulaire. Les illustrations historiques de gestion et leurs règles de détection restent conservées.

Le **build final et TypeScript ont réussi avec 82 modules**. La recette à **1280 px et 320 px** a contrôlé trois engagements et trois avis sans débordement horizontal ; les 38 modèles possèdent chacun leur choix radio et leur illustration SVG, avec des identifiants de gradients uniques. Les Xbox Series X et Series S sont visuellement distinctes et la sélection d’un modèle fonctionne. La publication a été vérifiée le **13 octobre 2026** : version active sur 100 % du trafic Cloudflare ; SHA-256 du HTML, du JavaScript, du CSS, du logo, de la police et de sa licence identiques au build final ; API publique en HTTP 200 et routes privées contrôlées en HTTP 401 sans exposition de données. La suite complète de **474 tests du 12 octobre** n’a pas été relancée pour ces changements de présentation ; elle reste un résultat historique daté. Les preuves et limites sont dans [TESTS.md](TESTS.md).

Le compte administrateur principal a été **créé et vérifié**, sans réinitialiser ni remplacer l’atelier. Le fichier SQL privé de préparation a été supprimé. Aucun identifiant de connexion, secret, empreinte de mot de passe ni emplacement de fichier privé ne doit apparaître dans les fichiers versionnés.

## Reprise visuelle du 12 octobre : logo original et direction RépaRapid

La demande suivante reprend le **logo original du site RépaRapid**, sans redessin ni retouche, et une partie de sa direction visuelle. Source exacte : [asset original WordPress/CDN](https://i0.wp.com/reparapid.fr/wp-content/uploads/2023/03/Sans-titre-2.png?fit=300%2C300&ssl=1). La copie locale est `public/reparapid-logo-original.webp` ; son SHA-256 est identique à celui de la source : `5c592b863b669335922a51c76171eff93ed948747b0e93582b9aafc1785c8418`. Ce logo est utilisé dans la vitrine, le portail client principal, la fiche imprimable et le favicon.

La vitrine utilise maintenant un en-tête et un pied de page noirs, un hero rouge **#a32720** avec motifs géométriques CSS et des accents **#b21414**. Les titres et la navigation sont en **Oxanium**, auto-hébergée dans `public/fonts/oxanium.ttf` ; conserver la licence `public/fonts/oxanium-OFL.txt`. Source de la police : [google/fonts/ofl/oxanium](https://github.com/google/fonts/tree/main/ofl/oxanium). Ces choix concernent la vitrine et les éléments publics partagés ; les anciens choix visuels d’administration décrits plus bas constituent leur historique.

Recette visuelle : accueil à **1280 px** et **320 px**, sans débordement horizontal, et formulaire de réparation accessible. Aucun métier ni contrat d’API n’a changé. La suite complète **474 tests** correspond à la validation précédente et n’a pas été relancée pour ces changements visuels. Le contrôle TypeScript et le build Vite sont validés (**80 modules**). La publication Cloudflare est active à 100 % et les hashes du HTML, des bundles, du logo et de la police servis correspondent au build validé ; aucune action DNS, D1 ou création de compte administrateur réel n’a été effectuée pour cette recette.

Le favicon utilise désormais `public/favicon-reparapid.png`, le PNG original 300 × 300 récupéré directement sur reparapid.fr. Le nouveau chemin remplace la déclaration WebP pour que les navigateurs chargent une icône PNG standard et actualisent leur cache. Compilation validée et HTML/PNG publiés vérifiés par hash. Le serveur Node accepte aussi les formats de marque WebP et TTF ; recette temporaire réussie en mémoire (PNG/WebP/TTF GET et HEAD, MIME correct, API privée 401). La suite métier complète n’a pas été relancée.

## Publication de Reparapid le 12 octobre 2026

- URL : https://reparapid.aldeguer-remi.workers.dev.
- Worker reparapid et D1 distincte des installations précédentes ; base créée en Europe de l’Ouest, quatre migrations appliquées et aucune migration restante.
- Build TypeScript/Vite réussi ; HTML, JavaScript, CSS et SVG servis en HTTP 200, avec SHA-256 identiques au build local.
- Routes /api/store, /api/admin/invoice-source et /api/auth/session : HTTP 401 sans authentification. Accueil public observé dans le navigateur.
- Au 12 octobre, le compte administrateur initial restait à créer ; il a été initialisé et vérifié le 13 octobre. Aucun accès ou jeu de données d’une installation précédente n’a été importé. Aucun secret mail n’est configuré.
- Utiliser --config .wrangler/reparapid.production.jsonc pour les migrations et publications sur cette machine. Les identifiants du compte/D1 et les détails de version sont conservés hors des fichiers publics.

## 1. Reprise rapide

1. Lire ce fichier, puis [README.md](README.md) pour l’exploitation et [TESTS.md](TESTS.md) pour la validation.
2. Vérifier les fichiers et modifications déjà présents. Cette copie locale possède un dépôt Git et utilise RemiAldeguer/Reparapid : vérifier la branche, le remote et les modifications avant une opération Git.
3. Vérifier Node, npm et les dépendances. Le projet requiert Node **22.16 ou supérieur**, notamment pour node:sqlite ; la dernière exécution utilisait Node **24.19.0**.
4. Identifier l’environnement concerné : SQLite local, D1 local de Wrangler ou **D1 de production**. Ces bases sont distinctes.
5. Lire les fichiers métier et les deux implémentations serveur avant de modifier un contrat de données ou une API.
6. Pour les tests visuels, utiliser une base temporaire ou SQLite en mémoire et des données fictives. Ne pas réinitialiser l’atelier réel pour obtenir une démonstration.
7. Adapter les vérifications à la modification. Un changement de CSS demande surtout une compilation et une recette visuelle ; une modification de permissions ou de persistance demande les tests Node et Worker concernés.
8. Une compilation ne publie pas le site. Pour une publication autorisée, déployer puis vérifier que les assets servis correspondent au build.
9. Ne pas déduire l’état courant de production des anciens nombres présents dans des captures de démonstration.
10. Compléter le journal de reprise en fin de modification importante.

## 2. Identité du projet et environnement

| Élément | Contexte |
| --- | --- |
| Nom | Reparapid / RépaRapid · Maxxi Games |
| Usage | Vitrine de réparation de consoles, demandes et expédition ; gestion du magasin, collection, clients et suivi |
| Langue | Français |
| Devise | EUR |
| Source locale de cette session | [copie locale Reparapid] |
| URL publiée | https://reparapid.aldeguer-remi.workers.dev |
| Hébergement courant | Cloudflare Workers + assets Vite + D1 |
| Version de package | 2.0.0 ; elle n’est pas incrémentée automatiquement à chaque déploiement |
| Licence | MIT ; voir LICENSE et THIRD_PARTY_NOTICES.md |
| Dépôt | https://github.com/RemiAldeguer/Reparapid ; vérifier la synchronisation du commit courant |
| Gestion Git locale | Dépôt Git indépendant RemiAldeguer/Reparapid ; vérifier l’état avant toute opération |

Le site publié et le dossier de sources local sont deux choses différentes. Pour reprendre depuis une autre machine, transférer les sources et les documents, installer les dépendances et configurer l’accès aux services dans l’environnement sécurisé de cette machine. Les journaux et scripts temporaires d’une ancienne session ne constituent pas des sources portables.

Versions installées vérifiées dans package-lock.json : **React / React DOM 19.1.1**, **Vite 7.3.6**, **TypeScript 5.8.3**, **Wrangler 4.147.0**, **esbuild 0.28.2** pour le rendu des tutoriels pendant la compilation. La dernière exécution utilisait npm **10.8.2**. Certaines plages de package.json sont plus larges que ces versions : conserver le lockfile et examiner les changements lors d’une mise à jour.

Il n’y a actuellement que React et React DOM comme dépendances applicatives. Les SVG, graphiques financiers, factures et composants sont construits dans le code ; ne pas ajouter une bibliothèque lourde pour un petit ajustement visuel.

## 3. Architecture

~~~mermaid
flowchart LR
  B["Navigateur : React, routes hash"] --> G["Authentification et API même origine"]
  G --> N["Serveur Node local"]
  G --> W["Cloudflare Worker en ligne"]
  N --> S["SQLite : JSON de l'atelier + comptes"]
  W --> D["D1 : fragments JSON + comptes"]
  N --> Q["File de notifications par atelier"]
  W --> Q
  Q --> R["Resend si configuré"]
~~~

Les deux branches Node et Worker représentent **deux modes d’hébergement**, pas une réplication automatique entre deux bases.

- **Frontend** : application React, navigation par hash, composants et règles métier TypeScript dans src/.
- **Tutoriels publics** : catalogue et articles en HTML complet à des URL sans hash, générés pendant le build et consultables sans JavaScript ; le formulaire et les comptes restent dans l’application React.
- **Domaine** : règles indépendantes de React et du stockage dans src/domain.ts ; rapports spécialisés dans finance-domain.ts et invoice-domain.ts.
- **Node** : server/application.mjs, serveur HTTP natif et SQLite natif ; pas Express.
- **Worker** : cloudflare/worker.mjs et cloudflare/database.mjs, assets et D1.
- **Partage** : modules de portail, notifications, inscriptions, sécurité des réponses et isolation d’atelier dans server/.
- **Compilation métier Node** : scripts/compile-domain.cjs transpile domain, seed, finance-domain, invoice-domain et repair-intake-domain en CommonJS dans tests/.compiled/. Le serveur Node utilise aussi ces sorties.
- **Persistance admin** : un Store JSON par atelier, soumis intégralement avec contrôle de révision ; ce n’est pas une API CRUD indépendante pour chaque console.
- **Portail client** : projection spécifique des données, nouvelles demandes de réparation du magasin principal, fiche d’envoi filtrée et signalement limité de disponibilité d’une pièce.

Le serveur ne sert pas les sources, bases ou exports privés. En production, les fichiers publics sont les fichiers de dist/. Les modules Markdown de contexte restent dans les sources.

## 4. Carte des fichiers

| Fichier / groupe | Responsabilité et intérêt pour une modification |
| --- | --- |
| src/main.tsx | Choix entre accueil public, portail client et application protégée |
| src/App.tsx | Shell, sidebar, routes admin, recherche globale, modales, confirmations et erreurs |
| src/website-requests.tsx, .css | Demandes de la vitrine du magasin principal, filtres, coordonnées et progression via les transitions métier |
| src/backoffice-theme.css, src/backoffice-components.css | Identité RépaRapid des écrans et composants de gestion, styles limités à .rp-backoffice |
| src/reparapid-identity.ts | Nom d’atelier importé par défaut présenté sous RépaRapid, avec préservation des noms personnalisés |
| src/pages.tsx | Dashboard, inventaire, atelier et stock ; ancien composant de journal conservé mais plus monté ; Metric partagé |
| src/details.tsx | Fiches console et réparation, onglets et actions du dossier |
| src/forms.tsx | Formulaires console / réparation / pièce et admission d’un équipement |
| src/store.tsx | Provider, chargement, copie de travail, transact, sauvegarde révisée et exports |
| src/domain.ts | Types, validation, transitions, coûts, paiements, stock, pièces clients, suppression |
| src/auth.tsx, src/api.ts, src/session-privacy.ts | Session admin, CSRF, requêtes tardives, départ de page et déconnexion |
| src/clients.tsx, src/clients.css | Liste et fiches clients, plusieurs consoles et dossiers par client |
| src/client-access.tsx, src/client-access.css | Création / remplacement / désactivation des accès clients |
| src/client-portal.tsx, src/client-portal.css | Portail client, mosaïque, détails, filtres et pièces à fournir |
| src/client-part-requests.tsx, .css | Gestion admin des demandes de pièces sur un dossier |
| src/repair-card-client-parts.tsx, .css | Pièces demandées sur les cartes Kanban |
| src/repair-payment.tsx | Badges et boutons d’enregistrement du paiement |
| src/repair-total-cost.tsx | Édition du total directement dans l’atelier |
| src/dashboard-repairs.tsx | Toutes les réparations clients de la synthèse, filtres et actions rapides |
| src/dashboard-client-parts.tsx, .css | Demandes de pièces clients encore en attente dans Ma synthèse |
| src/dashboard-summary-lists.css | Disposition côte à côte des listes pièces / réparations de Ma synthèse, séparateur vertical et adaptation des lignes |
| src/dashboard-metrics.css | Design des quatre cartes du dashboard, sans affecter les autres métriques |
| src/finance.tsx, src/finance-domain.ts | Rapports hebdomadaires / mensuels, encaissements et gains estimés |
| src/invoices.tsx, src/invoice-domain.ts, src/invoices.css | Formats simple / complet, préparation, aperçu et impression |
| src/console-appearance.ts | Détection du modèle/couleur et adaptateur workshopConsoleArtItem des alias de gestion vers les silhouettes communes |
| src/shop-console-kind.ts, src/workshop-console-art.css | Classificateur commun des silhouettes et cadres bornés des illustrations dans l’atelier |
| src/console-handheld-art.tsx, src/ui.tsx | SVG des consoles, visuels, icônes et composants génériques |
| src/nintendo-model-picker.tsx | Suggestions Nintendo ; les champs de modèle restent libres |
| src/admin-settings.tsx | Réglages, sauvegardes, restauration, démo, compte admin |
| src/email-notifications.tsx, .css | Espace E-mails, préférences par audience/événement, aperçus et historique ; suivi limité sur les fiches clients |
| src/public-home.tsx, .css | Vitrine RépaRapid, shell public partagé, engagements, avis et section contact préparant un mailto |
| src/maxxi-social.tsx, .css | Liens Instagram et TikTok vérifiés de Maxxi Games, sans widget incorporé |
| src/legal-content.mjs, .d.mts | CGU/CGV/mentions, version, identité confirmée, sources et modèle de rétractation partagés |
| src/legal-pages.tsx, .css | Pages publiques de conditions, mentions et rétractation, sommaire, impression et texte téléchargeable |
| src/legal-receipts.ts | Documents privés fondés sur les preuves figées d’accord et de rétractation |
| src/repair-proposal-client.tsx, src/repair-proposal-admin.tsx | Devis partagé, choix, consentements, documents et avertissements de traitement du dossier |
| src/repair-guides-content.ts, src/repair-guides-types.ts | Contenu des 24 tutoriels, sections, modèles, difficultés, exemples, FAQ et sources |
| src/repair-guides-manifest.mjs, .d.mts | Slugs publics exacts, chemins générés, domaine canonique et date éditoriale partagés avec les hôtes |
| src/repair-guides.tsx, .css | Catalogue, articles, navigation HTML, métadonnées et données structurées rendus pendant le build |
| src/shop-console-art.tsx, .css | Illustrations SVG natives de la vitrine, par famille et variante du catalogue |
| src/repair-intake.tsx, .css, src/repair-intake-domain.ts | Parcours console/panne/compte, catalogue partagé, suggestions, admission et idempotence |
| src/public-intake-settings.tsx | Réglages admin des coordonnées publiques et destination d’envoi |
| src/registration-review.tsx, .css | Ancienne vue d’inscriptions conservée dans les sources, plus importée ni montée dans l’interface |
| src/seed.ts | Jeux de démonstration, à ne pas injecter dans la production pour une recette |
| src/styles.css | Styles historiques et globaux, dont plusieurs lignes très longues |
| public/reparapid-logo-original.webp | Copie exacte du logo RépaRapid, utilisée par les éléments publics, fiche et favicon |
| public/fonts/oxanium.ttf, oxanium-OFL.txt | Police locale des titres/navigation publics et licence à conserver |
| public/logo-clinique-retro.svg | Logo historique de l’administration ; conserver ses proportions |
| server/application.mjs | Routes Node, authentification, gardes et transactions SQLite |
| server/database.mjs, server/security.mjs | Schéma / ouverture SQLite, hachage et primitives de sécurité |
| server/workshop-scope.mjs | Cloisonnement SQL des ateliers et provisionnement |
| server/client-portal.mjs | Liste explicite des champs autorisés dans le portail |
| server/client-part-availability.mjs | Validation stricte du signalement client |
| server/repair-intake.mjs | Validation des coordonnées d’inscription, fiche publique filtrée et protection des métadonnées d’envoi |
| server/repair-proposals.mjs | Frontière stricte des décisions, conditions injectées par le serveur et protection des preuves contre les sauvegardes ordinaires |
| server/registration-requests.mjs | Inscription, revue et données publiques limitées |
| server/repair-notifications.mjs | Catalogue et préférences des événements du cycle, détection des changements et modèles de mails |
| server/notification-storage.mjs | File persistante, lots et dépôt atomique des notifications |
| server/notification-delivery.mjs | Configuration Resend, envoi, claim, reprises et assainissement des erreurs |
| server/notification-admin.mjs | Statut, préférences, activation / pause, aperçu fictif et relance depuis l’admin |
| server/notification-preview.mjs | Exemples entièrement fictifs par événement, audience et variante ; réutilise le modèle réel sans lire de dossier ni envoyer |
| server/response-security.mjs | En-têtes communs à Node et Worker |
| server/public-assets.mjs | Liste explicite des assets et tutoriels publics, chemins canoniques et alias 308 partagés entre Node et Worker |
| cloudflare/worker.mjs, database.mjs, security.mjs | Routes, stockage D1 et hachage adaptés à Workers |
| cloudflare/migrations/ | Quatre migrations du stockage Cloudflare |
| scripts/admin.mjs | Création / reset du compte admin SQLite local |
| scripts/cloudflare-admin-create.mjs | Initialisation humaine du premier admin D1 Reparapid, sans remplacement ni transfert de données |
| scripts/cloudflare-export.mjs | Transfert initial privé SQLite vers une nouvelle base D1 |
| scripts/dev-server.mjs | API de développement avec origine attendue sur 5173 |
| scripts/build-offline.mjs | Refuse volontairement un build admin sans serveur |
| scripts/generate-repair-guides.mjs | Rendu temporaire esbuild/React, génération des 25 pages HTML, du sitemap et de robots après Vite |
| scripts/verify-public-assets.mjs | Vérification de public/ avant Vite et de dist/ après génération, refus des fichiers non autorisés et liens symboliques, présence de tous les guides |
| tests/repair-guides.test.mjs | Manifeste, garde source/build, génération, métadonnées, sitemap et parité GET/HEAD/308 des pages Node/Worker |
| tests/ | Tests domaine, Node, session, isolation, portail, notifications et Worker |
| .github/workflows/ci.yml | Tests et build sur push / pull request ; ne déploie pas le Worker |

Le dossier art-fadist/ existe aussi dans cette copie mais ne constitue pas l’entrée du package courant. Il n’a pas été audité dans cette reprise : ne pas modifier un autre projet en le confondant avec les fichiers listés ci-dessus.

## 5. Routes de l’interface

| Route | Écran / accès |
| --- | --- |
| / ou #/accueil | Vitrine publique RépaRapid et accès magasin / client |
| /guides/ | Catalogue public des 24 tutoriels, HTML complet sans JavaScript applicatif |
| /guides/{slug}/ | Article public déclaré dans le manifeste, contenu et métadonnées propres |
| /robots.txt, /sitemap.xml | Consignes d’exploration et liste des 26 URL publiques canoniques |
| #/accueil?section=rp-contact | Section Contactez-nous, accessible depuis le portail et les éléments publics partagés |
| #/demande-reparation | Modèle, pannes et compte ; création du dossier En attente d’envoi |
| #/cgu, #/cgv, #/mentions-legales, #/retractation | Conditions, identité de l’exploitant et droits du client, pages publiques du magasin principal |
| #/connexion | Connexion atelier ; une connexion valide redirige vers le dashboard |
| #/dashboard | Dashboard / Ma synthèse |
| #/website-requests | Demandes créées depuis la vitrine et progression ; magasin principal seulement |
| #/emails | Préférences Client/Magasin, aperçu des modèles et historique des envois du magasin connecté |
| #/clients | Répertoire clients |
| #/clients/ID | Fiche client, consoles, dossiers, accès et notifications |
| #/inventory | Inventaire de consoles, cartes ou liste |
| #/inventory/ID | Fiche console et réparations liées |
| #/repairs | Atelier, Kanban / liste, filtres et dossiers clôturés |
| #/repairs/ID | Fiche de réparation |
| #/finance | Finance, période de référence et granularité |
| #/invoices | Générateur de factures |
| #/parts | Stock de pièces de l’atelier |
| #/activity | Ancienne route du Journal d’activité retirée de l’interface : page inexistante et retour au tableau de bord |
| #/settings | Réglages et sauvegardes |
| #/super-admin/registrations | Ancienne route retirée de l’interface : page inexistante et retour au tableau de bord |
| #/espace-client | Portail client et sa connexion propre |

Les paramètres des pages admin sont après le hash, par exemple #/repairs?payment=unpaid et #/invoices?repairId=ID. Les liens clients des ateliers inscrits utilisent **?atelier=UUID#/espace-client** : le paramètre atelier est avant le hash, car le portail en déduit le contexte de connexion.

La sidebar comprend Tableau de bord, Demandes du site pour le magasin principal, Clients, Consoles, L’atelier, Finance, Factures et Pièces détachées, puis Réglages et l’identité de l’atelier. Les menus Inscriptions et Journal d’activité sont retirés ; le rôle affiché est Administrateur. Les historiques des dossiers et événements du domaine restent conservés.

## 6. Modèle métier à préserver

### Store et relations

Le Store contient schemaVersion, revision, settings, clients, consoles, repairs, parts et events. Le schemaVersion reste actuellement **1** ; la compatibilité des ajouts a été gérée par normalisation et champs optionnels.

- Un Client contient notamment id, code, nom, e-mail de contact, téléphone, adresse, notes et date de création.
- Une ConsoleItem contient marque, modèle, couleur / variante, numéro de série, état, prix d’achat, estimation, emplacement, photos, archive et un clientId optionnel.
- Une console sans clientId appartient à la collection de l’atelier.
- Un Repair appartient à une console par consoleId. Son client se déduit de la console ; ne pas ajouter un deuxième rattachement divergent au dossier.
- Un client peut posséder plusieurs consoles, chacune avec plusieurs réparations successives.
- Une console ne peut avoir qu’**une seule réparation active**.
- Part désigne une référence du stock ; PartUsage conserve quantité et prix unitaire au moment de l’utilisation.
- clientParts désigne des fournitures demandées au client. Ce sont deux concepts distincts.
- Activity est le journal avec liens optionnels au client, à la console et au dossier.

Les champs nouveaux importants de Repair sont interventionCost, payment, clientParts et publicRequestId. Ce dernier conserve l’identifiant de déclaration en ligne pour les doubles enregistrements et l’accès à la fiche du client. Les coordonnées publiques sont dans settings.publicIntake. L’absence de ces champs dans un ancien fichier n’est pas toujours équivalente à une suppression intentionnelle ; le serveur protège les champs existants contre les vieux bundles qui les omettent.

Références visibles : CLT-…, CRT-…, REP-…. Les identifiants techniques sont distincts des codes visibles ; utiliser les helpers de numérotation existants, y compris les traces de suppression, pour ne pas réutiliser les références.

### Validation

validateStore reconstruit des objets validés, contrôle types, tailles, références, unicité et invariants. Parmi les contrôles :

- pas de réparation sans console, de console rattachée à un client absent ni de liens de journal incohérents ;
- pas de réparation active sur console archivée ; console en-panne pour un dossier en attente d’envoi, puis en-reparation pour les autres étapes actives ;
- pas de dossier terminé avec test pending ou fail ;
- dates de clôture cohérentes avec l’ouverture du dossier ;
- **un seul chronomètre actif dans tout l’atelier** ;
- références de pièces utilisées existantes ;
- demandes de pièces clients : jusqu’à 100 par dossier, quantité de 1 à 1000, nom jusqu’à 200 caractères, note jusqu’à 1000 ;
- identifiants de demandes de pièces uniques dans l’ensemble du Store.

Les champs de panne peuvent atteindre 30 000 caractères. Le générateur de facture supporte cette limite : ne pas réintroduire une limite arbitraire de 6000 caractères.

### États et transitions

États d’une console : a-tester, en-panne, en-reparation, fonctionnelle, pour-pieces.

Étapes de réparation : attente-envoi, reception, diagnostic, attente-pieces, reparation, tests, terminee, irreparable, abandonnee. Les trois dernières sont fermées ; active() centralise cette règle. Le passage de l’attente d’envoi à la réception actualise aussi l’état et l’emplacement de la console.

L’ancien état a-commander n’est plus proposé. normalizeRepairStages le convertit en attente-pieces à la lecture / à l’import sans réécrire l’historique ni envoyer une notification pour cette seule normalisation.

Une clôture directe en terminee marque les tests OK, ajoute les contrôles standard si nécessaire, arrête le chronomètre, inscrit la clôture et rend la console fonctionnelle. Une réouverture remet les tests à faire. Modifier les étapes via les helpers du domaine, pas via une affectation isolée qui contourne ces règles.

## 7. Coûts, paiements et chiffres du dashboard

### Coût d’une réparation

Le calcul de référence est **repairTotalCost(Store, Repair)**.

1. Si interventionCost contient un nombre, utiliser ce montant d’intervention.
2. Si interventionCost est absent ou null, utiliser les minutes des worklogs et le taux horaire de l’atelier.
3. Ajouter partsCost, calculé à partir des PartUsage enregistrées.
4. Arrondir en centimes avec les helpers existants.

**Zéro est un montant manuel valide**, distinct d’un champ vide. Ne pas écrire une condition de vérité qui transforme 0 en calcul horaire.

À la création du dossier, le montant saisi est celui de l’intervention **hors pièces**. Dans l’éditeur du Kanban, le montant saisi est le **total pièces incluses** ; setRepairTotalCost ajuste seulement l’intervention. Ce total ne peut pas être inférieur au coût des pièces déjà utilisées.

Le prix unitaire d’une consommation est historisé dans PartUsage : modifier ensuite le prix du stock ne réécrit pas automatiquement ce prix utilisé.

### Paiement

payment vaut un reçu {amount, paidAt}, null pour une annulation explicite ou peut être absent dans un ancien dossier. setRepairPayment :

- enregistre le total courant à la réception d’un règlement complet ;
- conserve ce montant et cette date si le coût ou l’étape changent ensuite ;
- est idempotent lors d’un signalement répété ;
- journalise l’enregistrement ou l’annulation ;
- concerne les dossiers rattachés à un client.

Ce bouton n’effectue pas de transaction bancaire. Il ne gère ni acomptes ni paiements partiels. Modifier un coût ne corrige pas un reçu déjà enregistré.

### Dashboard

Les quatre cartes en haut suivent l’inventaire et les dossiers de tout l’atelier :

- Consoles en collection : consoles non archivées, avec compte des fonctionnelles et des consoles à tester.
- À l’atelier : toutes les réparations actives, avec nombre de dossiers au statut attente-pieces.
- Réparations terminées : dossiers actuellement terminee.
- Valeur de la collection : somme des estimatedValue des consoles non archivées.

Elles peuvent inclure la collection personnelle, contrairement aux totaux financiers clients. Leur somme ou leur périmètre ne doit pas être confondu avec celui de Ma synthèse.

Dans Ma synthèse :

- **Total théorique des réparations** = somme des coûts courants de tous les dossiers clients, toutes étapes confondues (en cours, terminés, irréparables ou abandonnés), pièces incluses. Les consoles clientes archivées sont conservées et la collection personnelle est exclue. theoreticalRepairRevenue centralise ce calcul. Ce montant théorique ne modifie pas les reçus.

- **Montant des réparations** = total courant des réparations clients actuellement terminées, pièces incluses.
- **Total encaissé** = somme des reçus conservés, quel que soit le statut actuel du dossier.
- Les consoles clientes archivées restent prises en compte ; la collection sans client est exclue.
- Supprimer un dossier supprime aussi son reçu du suivi conservé ; ce n’est pas un registre comptable immuable.

### Deux listings dans Ma synthèse

Le listing des pièces concerne les ateliers distincts. Pour RépaRapid principal, il est masqué ; la liste des réparations reste disponible, sans suppression des données historiques.

Les deux listes occupent **la même rangée sur ordinateur**, avec les pièces à gauche, les réparations à droite et un séparateur vertical. Chaque liste conserve son défilement indépendant. À 1100 px de largeur d’écran et en dessous, elles s’empilent avec un séparateur horizontal. Les lignes et les en-têtes sont adaptés aux colonnes plus étroites ; les filtres et boutons de paiement restent présents.

**Pièces à fournir par les clients**, à gauche :

- toutes les demandes strictement au statut en-attente, pas les disponibles, livrées ou installées ;
- quantité totale et nombre de demandes sont distincts ;
- affichage de la quantité, du nom, de la note éventuelle, du client, de la référence, de la console et de sa couleur ;
- demandes les plus anciennes en premier ;
- une demande encore en attente reste présente même sur un dossier clôturé ou une console cliente archivée ;
- liens vers le dossier et le client, sans modification automatique des statuts ;
- liste défilable, plafonnée en hauteur, accessible au clavier ; plafond de 440 px / 65 vh dans la disposition côte à côte, 260 px / 55 vh dans la disposition empilée ;
- état vide explicite lorsqu’aucune demande n’est en attente.

**Réparations clients** :

- toutes les réparations correspondantes, plus de limite à cinq ;
- filtres Toutes / Non payées / Payées ;
- non payées en premier, puis terminées, puis plus récemment mises à jour ;
- bouton rapide Marquer payée, coût total et montant reçu ;
- défilement interne, hauteur maximale de 440 px ou 65 vh ;
- changement de filtre remet la liste en haut, sans remettre à zéro les totaux financiers.

## 8. Stock et pièces demandées au client

### Pièces de l’atelier

Le stock a des références, quantités, seuils, prix unitaires, compatibilités, fournisseurs et emplacements. Utiliser une pièce la déduit du stock et l’inscrit dans le dossier avec son prix de consommation.

### Pièces à fournir par le client

Fonction conservée pour les ateliers distincts ; son affichage est masqué dans le magasin et le portail principaux RépaRapid. Les données et transitions ci-dessous restent valides dans le domaine et les sauvegardes.

Statuts exacts :

| Identifiant | Sens |
| --- | --- |
| en-attente | En attente de la pièce |
| disponible | Le client l’a obtenue et peut la remettre à l’atelier |
| livree | Réception confirmée par l’atelier |
| installee | Installation confirmée par l’atelier |

Disponible ne signifie **pas** Livrée. Le client ne peut pas confirmer lui-même une réception ou une installation.

- L’ajout / édition du contenu d’une demande nécessite un dossier ouvert et un client associé.
- L’admin peut gérer les statuts et supprimer les demandes après clôture.
- Le client peut signaler en-attente → disponible, même après clôture.
- Une répétition de ce signalement est idempotente.
- Une demande livrée / installée ne peut pas être remise disponible par le client.
- Ces demandes ne modifient **ni le stock, ni les coûts, ni le reçu, ni les tests, ni le statut du dossier**.
- Elles n’envoient pas d’e-mail automatique.
- Leur note est destinée au client : ne pas y inscrire un diagnostic privé.

Sur une fiche de réparation, le panneau reste directement visible et se place à côté de Paiement client sur grand écran, puis se superpose sur petit écran.

Sur une carte Kanban, les trois premières demandes sont affichées, avec quantité et statut ; déplier les suivantes. Les disponibles passent en premier, puis les demandes en attente.

## 9. Clients, consoles et suppression

Les clients ont leurs fiches et peuvent déposer plusieurs équipements en une opération. Une réparation peut être créée pour une console existante ou pour une **nouvelle console / manette**, sans obligation d’être déjà dans l’inventaire.

Le sélecteur Nintendo est une aide, pas une restriction : Game Boy / Advance, DS, 3DS / 2DS, NES / SNES / N64 / GameCube / Wii / Wii U, Switch / OLED / Lite / Switch 2 et les manettes associées, notamment Joy-Con gauche / droit / paires et Pro. Les marques et modèles libres permettent d’autres fabricants.

Les miniatures utilisent la silhouette du modèle et la couleur de variant, avec synonymes et modèles connus. Ne pas confondre le champ historique illustration, plus générique, avec la détection affinée de consoleAppearance.

Le client concerné est affiché sur la fiche de réparation. L’inventaire montre les réparations liées dans les vues cartes et liste, deux visibles puis historique dépliable.

Suppression d’un dossier :

- confirmation depuis le bouton rouge visible en haut de fiche ;
- suppression du dossier, notes, photos, temps, tests et reçu ;
- conservation de la console et du client ;
- aucune remise automatique des pièces consommées dans le stock ;
- traces de journal adaptées pour éviter des références orphelines et une réutilisation de numéro ;
- annulation des notifications en attente liées au dossier.

Suppression d’une console :

- action depuis l’inventaire ou sa fiche, avec confirmation ;
- supprime ses dossiers et leurs reçus / contenus ;
- conserve le client, son compte et ses autres consoles ;
- conserve le stock déjà déduit et les traces de suppression ;
- neutralise les notifications devenues obsolètes.

Ne pas utiliser ces actions sur des données réelles pour une recette. La restauration JSON remplace un atelier entier ; elle n’est pas un bouton Annuler pour une suppression ponctuelle.

## 10. Portail client

Connexion distincte de l’admin, à partir de l’accès créé dans la fiche client ou de l’inscription publique avec première demande de réparation du magasin principal. L’adresse de connexion peut être différente de l’adresse de contact destinée aux notifications pour les accès gérés par l’admin.

Le portail propose :

- synthèse du suivi et, pour les ateliers distincts, des quantités de pièces à fournir ;
- mosaïque par défaut, vue détaillée, recherche et filtres ;
- consoles avec silhouette / couleur et montants courants des dossiers ;
- accès au détail et à l’historique des réparations ;
- nouvelle demande de réparation et fiche d’envoi imprimable pour les dossiers déclarés en ligne au magasin principal ;
- pour les ateliers distincts, tableau des pièces demandées et filtre par statut ;
- pour les ateliers distincts, signalement Marquer disponible, avec confirmation de toute la quantité demandée ;
- actualisation et contrôle de session.

**Projection serveur explicite** dans server/client-portal.mjs :

- nom de l’atelier et nom du client ;
- consoles de ce client : id, code, marque, modèle, variante, série, état, accessoires ;
- dossiers de ces consoles : identité, titre, panne, statut, échéance, dates, total calculé ou null pour une déclaration publique encore non chiffrée, marqueur intakeSubmitted pour l’accès à la fiche ;
- demandes client : id, nom, quantité, note et statut.

Les diagnostics internes, tests, worklogs, photos privées, notes d’atelier, autres clients, stock et données comptables admin ne sont pas envoyés au portail. Ajouter un champ au Store ne doit jamais le rendre automatiquement public.

Le montant affiché est le coût courant, pas un extrait bancaire ni le reçu admin. Les tests internes ne sont pas affichés, conformément à la demande utilisateur.

## 11. Finance

La vue Finance est réservée à l’admin de son atelier. buildFinanceReport centralise :

- calendrier **Europe/Paris**, semaines du lundi au dimanche ou mois ;
- fenêtre de 12 semaines ou 6 mois se terminant à la période de référence ;
- navigation dans les périodes et retour Aujourd’hui ;
- encaissements selon paidAt, indépendamment du statut actuel ;
- coût des pièces des dossiers payés ;
- gain estimé = encaissement moins pièces, **hors temps de travail et autres charges** ;
- montant à encaisser sur les dossiers clients terminés et non payés, affectés à leur clôture ;
- détail des paiements ouvrant les dossiers.

Le gain peut être négatif. Cette vue reflète les dossiers et reçus actuellement conservés : annulation, suppression, restauration ou modification des consommations peut changer l’historique présenté.

Il n’y a actuellement ni comptabilité complète, ni rapprochement bancaire, ni gestion de trésorerie avec charges / TVA / acomptes.

## 12. Générateur de factures

Entrées : menu Factures, raccourci Finance et bouton de la fiche de réparation cliente. Les paramètres repairId et clientId permettent une présélection.

Choisir un client puis **1 à 100 réparations de ce même client**. Les dossiers terminés, actifs, consoles archivées et réparations gratuites sont acceptés. Le montant est le coût courant canonique, pièces déjà incluses une fois.

### Facture simple

- sélection et date d’émission ; numéro / notes facultatifs ;
- identité atelier et client reprise du Store ;
- noms des consoles, variantes / séries, références, pannes et montants ;
- total et notes libres ;
- **aucune adresse, immatriculation, coordonnée de contact, TVA ou échéance** ;
- un ancien brouillon complet n’injecte pas ses coordonnées dans le snapshot simple.

### Facture complète

- format par défaut ;
- numéro manuel, dates d’émission et d’échéance, émetteur et destinataire ;
- adresses et immatriculation requises ; coordonnées clients préremplies et modifiables ;
- Sans TVA ou TVA comprise ; la taxe est extraite du total existant, jamais ajoutée automatiquement ;
- taux borné, numéro de TVA requis si taxe positive, mention libre selon la situation de l’émetteur ;
- panne = symptoms non vide, sinon titre ;
- information de prestation terminée / en cours, sans diagnostic ni notes internes.

### Limites et sécurité

- Pas de registre ni historique persistant des factures, pas de réservation / numérotation automatique.
- Pas de sauvegarde automatique du profil de facturation ; les champs restent dans l’état de la page.
- Pas de génération serveur d’un PDF ni bibliothèque PDF : window.print ouvre le dialogue d’impression ; l’utilisateur choisit Enregistrer au format PDF.
- Pas d’envoi de facture par e-mail et pas de modification du paiement lors de l’impression.
- Snapshot profondément figé, calculs en centimes et validation des textes / dates.
- Changer un champ, la sélection ou le format invalide l’aperçu.
- Lecture fraîche avant génération **et avant impression** par GET /api/admin/invoice-source.
- Ce GET exige aussi le **CSRF de la session admin courante**, afin de détecter un remplacement de session / atelier même si les IDs et révisions coïncident.
- Une révision différente bloque l’impression et demande de régénérer.
- Réponses tardives / page démontée : requêtes annulées ou ignorées.
- Le rendu d’impression isole la facture, sans navigation, formulaires ni overlays ; en-tête de tableau répétable et textes longs préservés.
- Les coordonnées et mentions du mode complet ne constituent pas une certification légale ; l’interface propose le lien de référence déjà présent dans le README.

## 13. SaaS et rôles

La vitrine publique actuelle s’adresse aux clients RépaRapid. Le mécanisme historique d’inscription d’un autre atelier reste disponible dans l’API ; cette inscription est une **demande d’accès soumise à revue**. Elle est distincte de la création du compte client avec sa première demande de réparation, qui prend effet immédiatement dans le magasin principal.

Rôles :

- **super_admin** : compte initial, conserve l’atelier existant et gère les demandes ;
- **admin** : compte d’un atelier approuvé, accès à son atelier seulement ;
- **client** : compte rattaché à une fiche client dans un atelier.

Le rôle public du compte initial est déterminé côté serveur par workshopId null. Les tables SQL historiques peuvent encore stocker role='admin' : ne pas tenter une simple mise à jour SQL vers super_admin, contraire à leur contrainte.

Une approbation :

- vérifie l’autorisation du super admin au moment du commit ;
- crée un UUID et les tables de l’atelier isolé ;
- crée un atelier vide et le compte avec la phrase de passe de la demande ;
- retire le hash de la demande traitée ;
- ne déplace pas les données de l’atelier initial.

Un refus ne crée pas d’accès. Il n’y a pas d’e-mail automatique d’acceptation / refus, pas de système de plans payants ou de facturation SaaS des abonnements.

### Isolation SQL

server/workshop-scope.mjs construit les namespaces **tenant_<uuid sans tirets>_** pour les tables propres à l’atelier. L’UUID est validé côté serveur ; les valeurs SQL restent liées comme paramètres.

saas_workshops et saas_session_index font partie du registre de plateforme. L’index retrouve l’atelier d’un cookie, puis la vraie session et ses permissions sont revérifiées dans son namespace. Un identifiant fourni par le navigateur n’est jamais à lui seul une autorisation d’atelier.

Les liens clients incluent le contexte UUID et le portail transmet X-Workshop-ID. Une incohérence avec la session réelle doit être refusée.

## 14. API : routes à connaître

| Méthode | Route | Fonction |
| --- | --- | --- |
| GET | /api/public/repair-intake | Coordonnées publiques du magasin principal, par liste explicite |
| POST | /api/public/repair-intake/register | Nouveau compte client, session et dossier En attente d’envoi atomiques ; magasin principal seulement |
| POST | /api/public/registrations | Désactivé par défaut ; activation explicite seulement pour une autre installation SaaS |
| POST | /api/auth/login | Connexion admin / super admin |
| GET | /api/auth/me | Validation de session admin, sans prolonger seule l’inactivité |
| POST | /api/auth/logout | Révocation et cookie vidé |
| POST | /api/auth/password | Changement admin avec currentPassword et newPassword |
| GET | /api/store | Store complet de l’atelier admin courant |
| PUT | /api/store | Sauvegarde intégrale révisée, mode edit / restore / reset |
| GET | /api/admin/invoice-source | Store courant pour factures, CSRF requis même en GET |
| GET / POST / DELETE | /api/admin/client-access/CLIENT_ID | Consulter / créer ou remplacer / désactiver l’accès client |
| GET | /api/admin/notifications | Configuration apparente et historique ; filtre clientId possible |
| PUT | /api/admin/notifications | Activation / pause et/ou préférences strictes par audience et événement |
| GET | /api/admin/notifications/preview | Exemple fictif du modèle, selon événement, audience et variante autorisés ; aucune mise en file |
| POST | /api/admin/notifications/retry | Relance d’un échec récent |
| GET | /api/super-admin/registrations | Liste de demandes, filtre status |
| POST | /api/super-admin/registrations/ID/review | Approbation / refus |
| POST | /api/client/auth/login | Connexion client |
| GET | /api/client/auth/me | Validation de session client |
| GET | /api/client/repair-intake/session | Session client du magasin principal uniquement, sans prolonger seule l’inactivité |
| POST | /api/client/repair-intake | Nouvelle console et demande du client connecté au magasin principal ; CSRF et idempotence |
| GET | /api/client/repair-intake/REPAIR_ID/sheet | Fiche d’envoi filtrée du propriétaire, magasin principal uniquement |
| POST | /api/client/auth/logout | Déconnexion client |
| GET | /api/client/portal | Projection limitée au client authentifié |
| POST | /api/client/portal | Même projection fraîche pour document privé ; corps JSON vide et CSRF requis |
| POST | /api/client/repairs/REPAIR_ID/proposal | Décision sur une version précise, consentement serveur ou notification de rétractation ; propriétaire et CSRF vérifiés |
| POST | /api/client/repairs/REPAIR_ID/parts/PART_ID/available | Signalement de disponibilité, corps JSON vide {} seulement |

Consulter les handlers pour les champs complets et les contraintes. Une réponse 401 retire les vues privées. Le 403 du GET de source facture retire également la vue, car il signifie notamment qu’une session ne correspond plus au CSRF capturé.

Les écritures demandent l’origine correcte ; les mutations authentifiées exigent aussi le CSRF. L’inscription publique initiale possède ses propres limites de corps et tentatives. Un 409 de révision n’est pas une erreur à corriger en forçant l’écriture : récupérer le brouillon et relire l’état serveur.

## 15. Persistance et concurrence

### SQLite Node

server/database.mjs ouvre la base avec WAL, clés étrangères, timeout et permissions restrictives. L’atelier est dans workshop, sous forme JSON et revision. Les comptes, sessions, limites, notifications et inscriptions sont dans des tables distinctes.

### D1 Worker

Le Store est fractionné dans workshop_chunks. workshop désigne la génération active et sa révision. Les fragments utilisent 250 000 unités UTF-16 et évitent de couper une paire de surrogates.

- lecture de métadonnées et fragments dans une requête cohérente ;
- publication atomique d’une génération via batch ;
- contrôle de session et de révision dans la transaction ;
- aucune publication partielle ni écrasement sur garde refusée ;
- limite de sauvegarde : **20 Mio**.

Ne pas transformer la sauvegarde D1 en succession non atomique de requêtes indépendantes.

### Frontend

transact clone le Store courant, applique les helpers, valide, incrémente revision et soumet :

~~~json
{"revision":42,"data":{"schemaVersion":1,"revision":43},"mode":"edit"}
~~~

Cet exemple montre seulement l’enveloppe : data doit contenir le Store complet validé. Le serveur recalcule la révision attendue.

Une seule sauvegarde est autorisée à la fois. L’affichage présente le brouillon mais les actions sont bloquées jusqu’à la réponse. true renvoyé par transact signifie accepté pour soumission, **pas enregistré définitivement**.

En cas de conflit / échec, préserver le brouillon exportable et proposer une relecture explicite. Ne pas rejouer automatiquement une écriture ambiguë.

Un signalement client de pièce incrémente aussi la révision. Un admin utilisant un ancien Store peut donc recevoir un 409 ; c’est une protection à conserver.

## 16. Sécurité et vie de session

- Mots de passe de 15 à 128 caractères, sel unique et scrypt.
- Node : N=131072, r=8, p=1 ; Worker : N=32768, r=8, p=3. Ces formats ne sont pas simplement interchangeables.
- Limiteurs de hachage : deux calculs simultanés côté Node, un par instance Worker.
- Tokens de session aléatoires ; seule leur empreinte SHA-256 est persistée.
- Cookies HttpOnly, SameSite=Strict, Secure / préfixe __Host- en HTTPS.
- Durée absolue 8 heures, inactivité 30 minutes ; les sondes /me n’entretiennent pas artificiellement la session.
- Limitations de tentatives par adresse / réseau / global et erreurs de connexion génériques.
- Authentification et autorisation serveur à chaque requête, puis nouvelles gardes après réception / hachage asynchrone avant commit.
- Changement / remplacement d’un mot de passe révoque les sessions correspondantes.
- Réponses no-store, Vary Cookie / Origin, CSP et autres en-têtes communs.
- CSP : scripts même origine, pas de script inline, pas de frames ni workers ; attributs style React permis pour graphiques ; images same-origin / data / blob.
- API et frontend de même origine, pas de CORS permissif pour contourner un problème d’origine.
- Aucun secret dans VITE_*, dist/, exports, journaux ou ces documents.
- Fichiers statiques limités à la liste publique partagée, avec vérification avant et après Vite ; ne jamais servir une base, un export ou une configuration sous prétexte qu’ils sont dans dist/.

AuthGate retire réellement le sous-arbre privé après expiration / déconnexion / départ de page. Le retour depuis l’historique revalide la session. BroadcastChannel propage les déconnexions entre onglets.

Une simple bascule d’onglet vérifie la session sans abandonner un brouillon admin encore autorisé. Les requêtes d’un ancien epoch ne doivent pas remplir ou déconnecter une nouvelle session.

Le Provider d’authentification est keyed par atelier, e-mail et CSRF : un remplacement d’identité remonte l’application au lieu de conserver une facture ou un Store d’une autre session.

Une donnée légitimement affichée à un utilisateur reste observable dans son DOM. L’objectif est de contrôler **qui la reçoit**, de minimiser la projection client et d’effacer les vues après session ; pas de prétendre rendre une information affichée invisible aux outils du navigateur.

Limites : pas de MFA, pas d’équipe de plusieurs admins par atelier, pas de connexion sociale ni récupération automatique par e-mail. Le stockage n’est pas chiffré par l’application. Ces contrôles ne valent pas audit externe.

## 17. Notifications par e-mail

L’onglet **E-mails** (`#/emails`) centralise les choix Client/Magasin et les aperçus. Le GET d’aperçu utilise le même rendu que la livraison, avec données fictives uniquement ; il ne lit aucun dossier client et n’envoie rien. Les choix de modèle ne donnent pas accès à des champs de diagnostic interne, de prix ou de coordonnées bancaires. L’état de configuration et l’historique restent distincts de l’activation de chaque événement.

Transport HTTP Resend, sans SDK applicatif supplémentaire. Variables côté serveur :

- RESEND_API_KEY : secret du service ;
- MAIL_FROM : expéditeur sur domaine vérifié ;
- MAIL_REPLY_TO : adresse de réponse ;
- MAIL_PORTAL_ORIGIN : origine du lien vers l’espace client.

Déclencheur : changement de statut d’un dossier rattaché à un client avec adresse de contact exploitable. La destination est l’adresse de la fiche client, pas nécessairement l’e-mail de son compte de connexion.

La file est déposée dans la même transaction que la sauvegarde du dossier. Une sauvegarde refusée ne doit jamais générer un e-mail.

Envoi après commit, puis reprise Node chaque minute / Worker toutes les cinq minutes. Revérifier propriétaire et destinataire avant l’envoi. Reprises espacées, maximum six tentatives et fenêtre de 23 heures, même clé d’idempotence.

Pause, restauration et suppressions neutralisent les messages obsolètes. Les coûts, paiements, notes et modifications de demandes de pièces ne constituent pas des changements de statut à notifier.

Envoyé signifie accepté par Resend, pas lu ni nécessairement reçu. Les erreurs du fournisseur sont assainies ; aucun retour de clé API dans l’interface.

**État constaté le 12/10/2026 : Wrangler secret list retourne une liste vide pour le Worker.** Ne pas supposer que les e-mails fonctionnent. Les variables publiques de contact sont présentes dans wrangler.jsonc, mais les secrets d’expédition doivent être configurés puis le statut vérifié dans Réglages. Aucun envoi réel n’a été exécuté pour cette documentation ou la recette.

## 18. Sauvegardes et récupération

- Export JSON depuis l’admin : Store de l’atelier, pas les comptes / hashes / sessions / notifications.
- Export CSV : inventaire, valeurs EUR et protection des cellules contre l’interprétation comme formule.
- Restauration JSON : remplacement explicite du Store du bon atelier, confirmation RESTAURER.
- Compte admin conservé lors d’une restauration ; accès clients devenus orphelins / sessions et messages devenus invalides sont traités par les gardes serveur.
- Les anciennes sauvegardes sans clients et avec a-commander sont normalisées.
- L’ancienne clé localStorage la-clinique-retro:v1 sert à la migration explicite, pas au stockage courant.
- Une suppression manuelle de cette ancienne copie est disponible dans les réglages, avec confirmation et protection contre une copie modifiée entre-temps ; elle préserve l’atelier serveur.
- La base et ses sauvegardes contiennent des données privées. Ne pas les exposer en assets publics.
- SQLite WAL : une copie du fichier principal seul à chaud n’est pas une sauvegarde fiable ; utiliser une sauvegarde cohérente ou arrêter le serveur puis copier les données protégées.
- D1 et SQLite ne se synchronisent pas automatiquement.

cloudflare:export prépare un transfert initial privé dans .backups/ après vérification du compte local. **Ce n’est pas une commande de mise à jour quotidienne** : importer ce SQL vise une nouvelle D1 et refuse un admin déjà présent.

npm run admin:reset agit sur la base SQLite choisie par DATABASE_PATH. Il ne réinitialise pas magiquement le compte de la D1 publiée. Pour un compte connecté, privilégier le formulaire sécurisé de changement de mot de passe.

## 19. Développement et commandes

### Installation / vérifications

~~~sh
npm install
npm test
npm run typecheck
npm run build
~~~

build compile les modules métier, vérifie TypeScript et la liste des sources publiques, produit dist/ avec Vite, puis rend les 25 pages de tutoriels, robots.txt et sitemap.xml. Le contrôle final refuse un fichier non déclaré ou une page générée manquante. Les sorties tests/.compiled/, dist/ et node_modules/ sont générées ; ne pas en faire les sources d’une correction.

Le build complet a pris environ 80–90 secondes dans cette session. L’avertissement Vite sur un chunk supérieur à 500 kB est présent ; c’est un avertissement de taille, pas un échec.

### Serveur local avec build

~~~sh
npm run admin:create
npm run build
npm start
~~~

Créer l’admin seulement dans une base nouvelle destinée à cet usage. La commande refuse d’écraser un compte existant.

Origine par défaut : **http://127.0.0.1:3040**. Variables de .env.example : NODE_ENV, HOST, PORT, APP_ORIGIN, DATABASE_PATH et options mail. Ne pas recopier des valeurs secrètes dans ce document.

### Développement Vite

Deux terminaux :

~~~sh
# API 3040, configurée pour l'origine Vite
npm run dev:server
~~~

~~~sh
# Interface 5173, proxy /api vers 3040
npm run dev
~~~

Ouvrir **http://127.0.0.1:5173**, pas une origine arbitraire. Le port 3040 est celui de l’API ; les écritures attendent l’origine Vite en mode dev.

Les tutoriels sont générés pendant le build, pas à la volée par Vite. Pour les contrôler, exécuter `npm run build` puis `npm start`, ou servir le `dist/` obtenu avec une API Node temporaire. Toute modification de contenu exige une reconstruction.

### Runtime de vérification

Cette copie a été vérifiée avec Node 24.19.0. Utiliser une installation locale de Node 22.16 ou supérieur ; aucun chemin absolu de la machine d’origine n’est requis.

## 20. Cloudflare : configuration et publication

> Pour cette installation, utiliser **--config .wrangler/reparapid.production.jsonc**. La D1 Reparapid est déjà dédiée et publiée ; ne pas en recréer une ou importer l’ancien atelier pour une modification de vitrine. Le fichier versionné wrangler.jsonc reste un modèle à identifiant nul pour d’autres installations.

Configuration portable de référence : [wrangler.jsonc](wrangler.jsonc). La configuration active reste privée et exclue de Git.

| Élément | Valeur dans cette copie |
| --- | --- |
| Worker | reparapid |
| Account ID | Conservé dans la configuration privée |
| Main | cloudflare/worker.mjs |
| Compatibilité | 2026-10-05, nodejs_compat |
| Assets | dist/, binding ASSETS, run_worker_first=true, html_handling=none, not_found_handling=none |
| D1 / binding | reparapid / DB |
| D1 ID | Conservé dans la configuration privée |
| Migrations | cloudflare/migrations |
| Cron | Toutes les cinq minutes |
| Envoi des e-mails | Non configuré ; la coordonnée publique de contact n’active pas l’expédition |
| Observabilité Wrangler | enabled=false |

Ces identifiants de ressources et l’adresse de contact ne sont pas des jetons d’accès. Aucun token Cloudflare, clé Resend, cookie ni mot de passe n’est enregistré ici.

L’authentification Wrangler a fonctionné sur cette machine pendant la session ; la disponibilité des credentials doit être revérifiée dans une nouvelle session. Un environnement automatisé peut utiliser CLOUDFLARE_API_TOKEN et CLOUDFLARE_ACCOUNT_ID, stockés dans ses paramètres sécurisés. Des permissions de lecture seules ne suffisent pas à publier.

### Migrations

| Migration | Contenu |
| --- | --- |
| 0001_initial.sql | Admin, sessions, limites, workshop et fragments D1 |
| 0002_client_accounts.sql | Comptes et sessions clients |
| 0003_email_notifications.sql | Réglages et file de notifications |
| 0004_saas_registrations.sql | Inscriptions, registre ateliers et index de sessions |

Vérification en lecture seule du 12/10/2026 : **aucune migration à appliquer** sur la D1 distante configurée.

~~~sh
npx wrangler d1 migrations list reparapid --remote --config .wrangler/reparapid.production.jsonc
~~~

Lors d’une modification de schéma, modifier aussi l’initialisation Node et le provisionnement des ateliers si nécessaire. Le mécanisme multi-atelier crée certaines tables au moment de l’approbation : une migration de tables de l’atelier initial seule ne suffit pas forcément pour tous les tenants existants.

### Publier une modification autorisée

~~~sh
npm run build
npx wrangler deploy --config .wrangler/reparapid.production.jsonc
~~~

Les scripts Cloudflare portables utilisent le modèle wrangler.jsonc. Pour cette production, passer explicitement la configuration privée ci-dessus. Avec un build déjà validé et inchangé, appeler directement Wrangler évite une deuxième compilation.

Après succès :

1. relever le Version ID de Wrangler ;
2. vérifier que l’URL publiée répond ;
3. comparer les références et, si nécessaire, les SHA-256 des JS / CSS dist/ avec ceux servis ;
4. tenir compte d’un court délai de propagation : examiner le résultat avant de redéployer ;
5. pour une modification API, vérifier aussi les gardes et routes concernées, sans exposer des données privées.

Pour une publication des tutoriels, contrôler aussi les **25 pages HTML** contre le build, leurs canonical, les GET/HEAD, les alias 308 et le refus des chemins inconnus. Comparer `robots.txt` et `sitemap.xml` au build ; le sitemap doit garder 26 URL publiques et aucune route de compte, de gestion ou d’API. Vérifier les liens du catalogue, d’au moins un article et de l’accueil à 320 px et sur ordinateur, avec les illustrations dans leurs cadres. Ces contrôles de publication ne prouvent pas une indexation Google.

La session a publié directement sur le Worker existant à la demande de l’utilisateur. Pour une future action destructive, un nouveau service payant ou une modification de permissions, obtenir une instruction adaptée ; l’historique n’est pas une autorisation illimitée sur l’infrastructure.

### Tester D1 localement

~~~sh
npm run cloudflare:test
npm run cloudflare:migrate:local
npm run cloudflare:dev
~~~

Le test Wrangler écoute sur 127.0.0.1:8787 avec LOCAL_DEV:true et utilise .wrangler/. Cette base est différente de la SQLite de npm start.

### E-mails

~~~sh
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put MAIL_FROM
~~~

Saisir les valeurs dans les prompts sécurisés, jamais comme arguments visibles ni dans une conversation. Le domaine d’expédition doit être vérifié chez le fournisseur ; MAIL_REPLY_TO seul n’est pas un expéditeur.

## 21. Design et demandes visuelles retenues

La vitrine RépaRapid suit désormais le logo original, les en-têtes/pieds de page noirs, le hero rouge à motifs CSS et Oxanium locale décrits dans **Dernière reprise visuelle** en tête du document. Conserver la source exacte du logo et les fichiers de licence de la police. Les choix ci-dessous décrivent l’administration et les évolutions historiques de La Clinique Rétro.

- Identité rétro sobre : vert forêt, fonds crème et couleurs secondaires douces.
- Logo SVG actif dans public/logo-clinique-retro.svg, redessiné le 12/10/2026 pour des proportions plus naturelles : console de 40 × 60 unités dans un cadran de 80 × 80, écran LCD encadré, croix et boutons calibrés, deux petites commandes en bas. Le dernier retour utilisateur rétablit une légère inclinaison de **−6°**, appliquée à toute la console, et une diagonale plus douce pour les deux boutons cuivre : leur milieu vertical est aligné sur celui de la croix ; les deux petites commandes sont centrées sur le boîtier. Conserver la palette vert forêt / ivoire / sauge / cuivre et le tracé de pulsation.
- Miniatures reconnaissables par modèle et couleur, y compris pour les manettes Nintendo.
- Les quatre cartes du dashboard sont colorées : collection verte sombre, atelier bleu, terminées lilas, estimation dorée.
- Grands chiffres, icônes et filigranes, mais cartes **compactes** après demande de réduction.
- À 1280 px de largeur, les cartes observées sont passées d’environ 231 à **178 px de haut**. La hauteur réelle dépend du contenu et de la largeur ; les minima CSS sont autour de 170–175 px.
- Quatre colonnes sur grand écran, deux à 1100 px et en dessous ; libellés vérifiés jusqu’à 320 px.
- Styles spéciaux limités à dashboard-metrics, car Metric est aussi utilisé sur d’autres pages.
- Icône € redessinée dans les paths de src/ui.tsx : courbe équilibrée et deux barres distinctes. Le filigrane euro reste **droit**, avec retrait suffisant pour éviter son découpage.
- Sidebar : bloc décoratif « Réparer. Préserver. Rejouer. / Les belles histoires… » et ses « + » retirés ; bouton « + Ajouter une console » retiré de la sidebar.
- Les actions d’ajout restent sur le dashboard, dans Consoles et dans les dépôts clients.
- Le grand bloc promotionnel « La passion, ça se répare / De retour dans la partie » n’est plus rendu sur la synthèse.
- Les boutons de suppression de réparation doivent rester visibles, pas cachés dans un menu difficile à trouver.
- Ma synthèse : pièces clients à gauche, réparations à droite dans une seule rangée, séparateur vertical et défilements indépendants ; retour à une pile sur tablette / mobile. Conserver les en-têtes alignés et les actions de paiement lisibles.

Ne pas refaire ces choix visuels en oubliant les retours utilisateur. Les SVG existants et les styles sont la bonne source pour des corrections ; il n’est pas nécessaire de remplacer un pictogramme vectoriel par une image générée.

## 22. Validation et état de référence

La reprise **24 tutoriels et retrait du Journal d’activité**, du **13/10/2026**, a passé **522 tests (477 Node/domaine/API + 45 Cloudflare)**, sans échec, test annulé ou ignoré. TypeScript et build final de **88 modules** réussis, cinq sources publiques et **35 fichiers de build** autorisés ; recette finale du catalogue et de l’accueil à 1280/390/320 px et articles, CTA et retrait du Journal vérifiés sur données fictives. Publication vérifiée sur 100 % du trafic Cloudflare : 25 pages et fichiers SEO conformes au build, 37 contrôles SEO réussis, six assets principaux conformes, API publique 200 et routes privées refusées. Le résultat précédent de **510 tests (465 + 45)**, son build de 87 modules, sa recette et sa publication de confidentialité restent historiques et sont décrits en tête du document et dans [TESTS.md](TESTS.md).

La personnalisation RépaRapid du **12/10/2026** a passé **474 tests (429 + 45)**, le contrôle TypeScript et le build. La recette du formulaire, des deux demandes fictives, de la réception et de la fiche imprimable est décrite en tête de ce guide et dans [TESTS.md](TESTS.md). La vitrine a été publiée sur le Worker et contrôlée contre le build ; cette vérification doit être répétée après tout dernier ajustement visuel.

L’import initial et les validations historiques de La Clinique Rétro ci-dessous avaient réussi :

- **393 tests** dans la première suite Node / domaine / API ;
- **41 tests** dans la suite Cloudflare ;
- **434 au total**, zéro échec et zéro test ignoré.

Ce nombre est daté : le recontrôler après une modification et ne pas le présenter comme un état perpétuellement garanti.

Le dernier build, après le logo incliné et les listes de synthèse côte à côte, a passé la compilation métier, tsc et Vite. La version publiée et vérifiée est **[identifiant historique retiré]** : JS **index-DXltHcOK.js** et CSS **index-DIQcifBn.css**. Les SHA-256 des fichiers JS, CSS et logo SVG servis correspondent au build local, et la page publique répond HTTP 200. La suite de 434 tests ci-dessus précédait ces changements visuels SVG / structure / CSS ; elle n’a pas été relancée pour ces ajustements.

Recette visuelle réalisée dans cette session sur un navigateur intégré, avec serveur local SQLite en mémoire et données fictives : factures simple / complète, changement de format, numéros facultatifs, TVA, coûts périmés, aperçu long, retrait à la déconnexion, listings clients, filtres, défilement clavier, cartes desktop et écrans 320 / 390 px, icône euro.

Recette de la synthèse enrichie : 3 demandes strictement en-attente, quantité totale 4, sur 2 clients ; les demandes disponible/livree/installee sont absentes, mais une demande du dossier terminé reste affichée. Les trois montants fictifs sont 205,68 € terminés, 25,50 € encaissés et 250,18 € théoriques. Une réparation personnelle à 999 € est bien exclue du total théorique. Les liens ouvrent le bon dossier ; à 320 px, les trois totaux se superposent sans défilement horizontal.

Recette du logo : rasterisation de contrôle à 24 / 39 / 47 / 64 / 80 px, affichage carré sans distorsion, vérification dans la sidebar à 39 px et sur l’accueil à 47 px, puis observation du logo sur l’accueil public après publication. L’ajustement incliné à −6° a aussi été contrôlé aux cinq tailles. Les composants de logo et leurs tailles existantes restent partagés ; leur dessin est modifié uniquement dans le SVG public.

Recette de la disposition côte à côte : contrôles à 1280 et 1101 px, sections sur la même rangée, séparateur vertical et en-têtes de 122 px avec listes démarrant à la même hauteur. Les 22 dossiers fictifs restent dans la liste, avec 20 boutons Marquer payée. La touche Fin fait défiler uniquement les réparations ; le filtre Payées affiche 2 dossiers, le retour à Toutes réaffiche 22 dossiers et remet la liste en haut. À 320 px, les sections s’empilent et le document reste exactement à 320 px de large ; l’en-tête des pièces conserve 206 px pour son texte. Ces essais n’ont enregistré aucun nouveau paiement.

Les snapshots / captures de ces essais utilisent des clients et consoles de démonstration. Aucun e-mail réel ni paiement bancaire n’a été envoyé. Ils ne prouvent pas une réception Resend ou une certification des factures.

Des scripts de recette et captures ont été créés dans /private/tmp/ pendant la session. Les processus temporaires ont été arrêtés après leurs essais. Ces fichiers peuvent disparaître et ne sont **pas** un prérequis de build / déploiement ; recréer un harnais de test autonome si nécessaire.

Le warning de bundle Vite au-dessus de 500 kB demeure. Une éventuelle séparation des routes en chunks doit être étudiée si demandée, sans mélanger cette optimisation avec une correction visuelle ponctuelle.

## 23. Journal des évolutions fonctionnelles de cette conversation

Évolutions déjà intégrées avant cette reprise documentaire :

1. Mise en route locale, création d’administration et déploiement Workers / D1.
2. Gestion des clients et de plusieurs consoles / réparations.
3. Suggestions Nintendo, puis équipements libres et manettes.
4. Clôture directe avec tests OK et comptes de connexion clients.
5. Identité visuelle, logo et miniatures par modèle / couleur.
6. Suivi client en mosaïque et coût visible.
7. Montant manuel d’intervention, édition du total Kanban et suppressions visibles.
8. Client sur la fiche de réparation et historique lié dans l’inventaire.
9. Paiements enregistrés, total encaissé distinct et boutons rapides.
10. Nettoyage de la synthèse et suppression de l’étape À commander.
11. Finance hebdomadaire / mensuelle.
12. Renforcement de la session, des projections et des protections serveur.
13. Demandes de pièces clients, panneau direct et présentation à côté du paiement.
14. Accueil SaaS, super admin et revue des demandes d’inscription.
15. Portail client enrichi et action Marquer disponible.
16. Pièces demandées sur les cartes Kanban.
17. Générateur de facture regroupant plusieurs dossiers d’un même client.
18. Format Facture simple ajouté au format complet.
19. Listing de synthèse complet et défilable, au lieu de cinq dossiers.
20. Retrait des éléments décoratifs et du bouton d’ajout de la sidebar.
21. Cartes de dashboard redesignées puis réduites.
22. Symbole euro corrigé.
23. Documentation de reprise, pièces clients en attente et Total théorique des réparations dans Ma synthèse.
24. Logo vectoriel repris avec une silhouette droite, des proportions de console portable régulières et un écran LCD encadré ; le fichier partagé est utilisé par l’accueil, la connexion, la sidebar, le portail et les factures.
25. Retour visuel sur le logo : inclinaison légère rétablie à −6°, boutons cuivre alignés selon une diagonale moins raide et petites commandes centrées sur le boîtier.
26. Pièces à fournir par les clients et Réparations clients côte à côte dans Ma synthèse, séparées verticalement sur ordinateur et empilées sur tablette / mobile, avec défilements indépendants.
27. Vitrine RépaRapid pour Maxxi Games, déclaration publique d’une console avec suggestions de pannes, compte client et dossier En attente d’envoi, fiche imprimable, coordonnées publiques éditables, transitions réception cohérentes, API Node/Worker limitées au magasin principal et initialisation humaine du premier admin Cloudflare.
28. Logo RépaRapid original repris sans retouche dans les éléments publics, portail principal, fiche et favicon ; direction noire/rouge, motifs CSS et police Oxanium auto-hébergée avec licence.
29. Catalogue de 24 tutoriels DIY et pages HTML propres sans hash, métadonnées et données structurées, sitemap/robots, liens publics et silhouette Steam Deck ; retrait de l’accès au Journal d’activité sans effacer les historiques. 522 tests, TypeScript, build final de 88 modules et recette locale réussis ; publication vérifiée à 100 % et 37 contrôles SEO réussis, sans migration ni modification de données de production ou du DNS.

### Versions publiées récentes, à titre de traçabilité

| Version ID | Changement |
| --- | --- |
| [identifiant historique retiré] | Générateur de factures initial |
| [identifiant historique retiré] | Facture simple / complète et retrait du motto sidebar |
| [identifiant historique retiré] | Tous les dossiers clients dans le listing défilable |
| [identifiant historique retiré] | Retrait du bouton d’ajout dans la sidebar |
| [identifiant historique retiré] | Nouveau design des métriques |
| [identifiant historique retiré] | Cartes compactées |
| [identifiant historique retiré] | Icône euro équilibrée, filigrane droit |
| [identifiant historique retiré] | Pièces clients en attente et total théorique dans Ma synthèse |
| [identifiant historique retiré] | Logo droit, écran LCD et proportions de console portable équilibrées |
| [identifiant historique retiré] | Logo incliné à −6°, boutons alignés et listes de synthèse côte à côte |

Incident de publication du 12/10/2026 : une première tentative Wrangler 4.147.0 a refusé une réponse JSON malformée de GET deployments, HTTP 200, avant tout upload. Une lecture des versions a confirmé que rien de nouveau n’avait été créé ; la seconde tentative avec la même version de Wrangler a réussi. Examiner l’état distant avant de réessayer un résultat ambigu ; aucune modification du SDK ou des données n’a été nécessaire.

Ces identifiants sont des publications de cette session, pas des commits Git. Ne pas confondre restauration d’une version de Worker et restauration des données D1.

## 24. Limites et questions ouvertes

- Factures : pas d’archivage, registre, numérotation automatique, profil émetteur persistant ou envoi PDF.
- Paiements : un reçu complet par dossier, pas d’acompte, passerelle de paiement ni rapprochement bancaire.
- Finance : gain estimé hors charges / travail et basé sur les dossiers conservés.
- Notifications : configuration d’expédition absente au moment de la vérification ; activation et délivrabilité à confirmer après configuration.
- SaaS : validation manuelle, un admin par atelier, pas d’abonnements payants ni gestion d’équipe.
- Connexion : pas de MFA, récupération e-mail ou social login.
- Sync : pas de mises à jour temps réel poussées pour l’admin ; relire / recharger ou traiter un conflit quand un client signale une disponibilité.
- Sauvegarde : les comptes et la file de notifications ne sont pas contenus dans le JSON d’atelier.
- Stockage : Store complet et photos dans JSON ; limites de 20 Mio et coûts de sauvegarde globale à considérer avant un changement d’échelle.
- Deployment : plan Cloudflare, quotas et délivrabilité du fournisseur sont des paramètres externes à revérifier, pas des garanties de cette documentation.
- Git / CI : dépôt indépendant Reparapid et workflow de tests/build ; aucun résultat de CI distante ne doit être déduit des résultats locaux.
- Référencement : indexation et classement Google non vérifiés, Search Console non consultée ; domaine canonique workers.dev tant que le domaine principal conserve WordPress.
- Conditions : médiateur, capital, TVA si applicable et directeur de publication restent à compléter par VESTY GAMES 3 ; les textes ne certifient pas une conformité complète. Vérifier manuellement le délai avant intervention et traiter les suites d’une rétractation ; aucune décision juridique ou remboursement automatique.

Il n’y a pas de nouvelle demande de développement à inventer à partir de cette liste. Elle explique le périmètre actuel et les points à préciser si une future demande les concerne.

## 25. Conseils pour continuer sans régression

1. Commencer par lire le code du parcours concerné et les tests existants, puis changer le minimum cohérent.
2. Garder les règles financières, de clôture et de validation dans le domaine partagé.
3. Faire évoluer **Node et Worker** ensemble pour un nouveau contrat ou une nouvelle permission.
4. Conserver les gardes de revision, origine, CSRF et session jusqu’au commit, y compris après un hachage / upload asynchrone.
5. Ne jamais remplacer la projection du portail par l’envoi du Store admin.
6. Ajouter une propriété client par liste explicite et une écriture client par action ciblée, pas par sauvegarde globale.
7. Préserver les différences entre zéro / null / absent, stock / pièce fournie, coût courant / reçu et disponible / livré.
8. Garder les brouillons récupérables en cas de conflit et éviter un retry qui pourrait écraser un autre acteur.
9. Pour les graphiques / factures, calculer dans le fuseau explicite utilisé par le module ; ne pas changer silencieusement les dates métier.
10. Préserver les imports anciens et les protections contre les anciens bundles.
11. Ne pas publier de données de démonstration ou de secrets pour une recette.
12. Vérifier la version réellement servie avant de conclure qu’un changement est en ligne.

### Prompt court de reprise à copier

> Je reprends Reparapid pour RépaRapid · Maxxi Games. Lis AGENTS.md, CONTEXTE_PROJET.md, README.md et TESTS.md, puis vérifie le code actuel et l’état de validation. La vitrine Cloudflare propose console/pannes/compte → En attente d’envoi → fiche imprimable ; les tutoriels sont générés depuis src/repair-guides* à /guides/ et /guides/{slug}/. reparapid.fr conserve son WordPress sans bascule DNS. Le Journal d’activité est retiré de la navigation ; préserver les événements et historiques métier. L’API Node/SQLite locale et la D1 publiée sont distinctes. Préserve l’isolation, les sessions, le CSRF, les révisions et l’idempotence, ainsi que les distinctions coûts/paiements et stock/pièces clients. Utilise --config .wrangler/reparapid.production.jsonc pour cette production. Le compte admin principal est initialisé et sa connexion a été vérifiée le 13 octobre 2026 ; ses identifiants sont conservés hors du dépôt. Ne réinitialise pas la production pour tester. Ma nouvelle demande est : [à compléter].
