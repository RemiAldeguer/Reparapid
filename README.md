# Reparapid

Site de réparation de consoles pour **RépaRapid · Maxxi Games**, au Kremlin-Bicêtre, et application de gestion des dossiers du magasin. Cette copie indépendante de La Clinique Rétro a été créée le 12 octobre 2026 ; elle conserve le métier et l’administration de l’application d’origine. Le dépôt contient les sources, les migrations, les tests et la documentation ; chaque installation démarre avec sa propre base vide.

**Vitrine publiée : [https://reparapid.aldeguer-remi.workers.dev](https://reparapid.aldeguer-remi.workers.dev).** Nouveau parcours de réparation publié et vérifié le 12 octobre 2026 : HTML, JavaScript et CSS identiques au build, coordonnées publiques accessibles et routes privées refusant les accès anonymes. La D1 dédiée et ses quatre migrations sont conservées ; la publication n’a modifié aucune donnée de l’atelier. Le premier compte administrateur reste à initialiser ; les e-mails ne sont pas configurés.

Le domaine [reparapid.fr](https://reparapid.fr/) conserve son site WordPress. Aucune bascule DNS ni modification de ce site n’a été effectuée ; l’application Cloudflare utilise actuellement l’adresse `workers.dev` ci-dessus.

La configuration effective de cette machine est `.wrangler/reparapid.production.jsonc`, exclue de Git. Elle contient les identifiants du compte et de la D1 dédiée. Le fichier versionné `wrangler.jsonc` reste un modèle portable avec un identifiant nul : configurez une nouvelle base pour une autre installation. Aucun déploiement Cloudflare n’est effectué par la CI GitHub.

Pour republier cette installation depuis cette machine :

```sh
npm run build
npx wrangler deploy --config .wrangler/reparapid.production.jsonc
```

**Réparer. Préserver. Rejouer.**

**Reprise dans une nouvelle session IA :** commencer par [CONTEXTE_PROJET.md](CONTEXTE_PROJET.md), le guide de l’architecture, du métier, de la sécurité, du déploiement et des évolutions de cette conversation. [AGENTS.md](AGENTS.md) sert de point d’entrée aux agents ; [TESTS.md](TESTS.md) consigne la validation actuelle.

La vitrine permet à un particulier de demander une réparation, de créer son compte et de préparer l’envoi de sa console. L’accès **Magasin** ouvre l’application protégée : clients, consoles, dossiers, stock, paiements et exports. L’espace client présente uniquement les consoles et demandes de son propriétaire. Le socle de gestion d’ateliers indépendants reste disponible ; le compte du magasin initial possède le rôle effectif de super administrateur.

## Identité visuelle RépaRapid

Le logo original du [site RépaRapid](https://reparapid.fr/) est repris sans retouche dans `public/reparapid-logo-original.webp`. Il apparaît sur la vitrine, le portail client principal, la fiche récapitulative et le favicon. Le favicon utilise le PNG original `public/favicon-reparapid.png`. La direction visuelle reprend les en-têtes et pieds de page noirs, un accueil rouge `#a32720` avec motifs géométriques CSS et des accents `#b21414`.

Les titres et la navigation utilisent **Oxanium**, auto-hébergée dans `public/fonts/oxanium.ttf`, avec sa licence `public/fonts/oxanium-OFL.txt`. La source est le [répertoire officiel Google Fonts](https://github.com/google/fonts/tree/main/ofl/oxanium). Cette reprise concerne la présentation ; le parcours, les règles métier et les API restent identiques. TypeScript et le build Vite sont validés ; les assets HTML/JS/CSS, le logo et la police de la version publiée sont identiques au build validé.

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

## Initialiser le premier administrateur Cloudflare

Le compte du magasin en production reste à créer par une personne dans un terminal interactif :

```sh
npm run cloudflare:admin:create
```

La commande utilise par défaut `.wrangler/reparapid.production.jsonc`, vérifie qu’il cible le Worker et la D1 Reparapid, puis masque l’adresse e-mail, la phrase de passe et sa confirmation. Elle crée uniquement le premier compte administrateur. Un administrateur existant provoque un refus ; la commande ne propose aucune réinitialisation. Aucun identifiant de connexion par défaut n’est fourni. L’aide est accessible avec `npm run cloudflare:admin:create -- --help`.

## Génération de factures

Le menu **Factures**, le bouton **Créer une facture** de Finance et celui des dossiers clients ouvrent le générateur. Choisissez un client puis une ou plusieurs de ses réparations, y compris les dossiers clôturés et les interventions gratuites. La facture reprend la console, sa variante et son numéro de série, la référence du dossier, le titre, la panne saisie (ou le titre si la panne est vide), ainsi que le montant actuel de chaque réparation, pièces utilisées incluses. Les diagnostics, notes internes, tests, photos et données des autres clients ne figurent pas dans le document.

Deux formats sont disponibles. **Facture simple** reprend le nom de l’atelier et du client, la date, les consoles, les pannes, les montants et le total, sans coordonnées de facturation ni mentions légales. Le numéro et les notes sont facultatifs. **Facture complète** conserve le numéro, les dates, l’identité et les coordonnées de facturation de l’atelier et du client, ainsi que les options de TVA et les mentions.

Pour le format complet, renseignez le numéro selon votre séquence comptable : le générateur ne tient pas de registre de factures et ne réserve aucun numéro. La TVA est choisie explicitement ; le mode **TVA comprise** extrait la taxe des montants existants sans augmenter le total. Les champs de facturation restent dans la session, sans sauvegarde automatique des coordonnées saisies.

**Générer l’aperçu**, puis **Imprimer / Enregistrer en PDF** permet de produire le document depuis le dialogue d’impression du navigateur. L’aperçu est figé ; une modification du formulaire ou de la sélection oblige à le régénérer. Les données serveur sont relues avant sa préparation et son impression. Une révision devenue différente bloque l’impression pour éviter de reprendre un montant périmé. Cette action ne modifie ni les paiements ni les étapes et n’envoie pas d’e-mail. Les coordonnées et mentions à utiliser dépendent de votre activité ; les [mentions de facturation de Service Public](https://entreprendre.service-public.gouv.fr/vosdroits/F31808) sont accessibles depuis le formulaire.

## Inscriptions d’ateliers indépendants

Le mécanisme historique d’inscription d’un autre atelier reste disponible dans l’API `/api/public/registrations`, indépendamment du formulaire de réparation de la vitrine. Une demande recueille le nom, l’e-mail, le nom de l’atelier, une présentation facultative et une phrase de passe. Elle attend la validation de la super administration et n’ouvre pas de session. La réponse publique reste identique pour une adresse déjà enregistrée ; un doublon ne remplace ni les informations ni le mot de passe du compte existant.

Le compte administrateur initial conserve ses identifiants et toutes ses données, et reçoit le rôle effectif **Super administrateur**. Son menu **Inscriptions** présente les demandes, leurs coordonnées et leur activité ; les filtres distinguent les demandes en attente, acceptées et refusées. Une confirmation permet d’accepter ou de refuser une demande avec une note interne. Aucun e-mail d’inscription n’est envoyé automatiquement : communiquez votre décision au candidat.

Accepter crée atomiquement un compte administrateur et un atelier vide, séparé de tous les autres, avec le mot de passe choisi dans le formulaire. Le candidat peut ensuite se connecter depuis **Se connecter**. Refuser ne crée aucun accès ; une nouvelle demande après refus reçoit un nouvel identifiant. L’approbation retire le hash de la demande et le conserve uniquement dans le compte. Les listes de demandes ne renvoient jamais les mots de passe, leurs hashes ou les jetons de revue. Seul le super administrateur peut consulter ou traiter ces demandes ; les écritures vérifient l’origine, le CSRF et la session au moment de la transaction.

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

Ouvrez **http://127.0.0.1:3040**, choisissez **Accès magasin**, puis connectez-vous avec l’adresse et la phrase de passe choisies dans `admin:create`. La saisie du mot de passe n’est pas affichée. Aucun compte ni mot de passe par défaut n’est fourni. La commande refuse d’écraser un administrateur existant. Cette commande locale agit sur SQLite ; utilisez `cloudflare:admin:create` pour initialiser la production D1.

L’atelier serveur commence vide. Les données de démonstration sont accessibles, après connexion, dans **Réglages & sauvegardes**. Le premier compte doit être créé sur le serveur qui héberge réellement l’application, avec le même `DATABASE_PATH` que l’API.

## Fonctionnalités

Tableau de bord, fiches consoles, photos, emplacement, coûts, stock et pièces, dossier patient, journal d’intervention, Kanban, chronomètre, tests de validation, impressions, exports JSON/CSV et restauration. Une seule réparation active est autorisée par console. Passer directement une réparation en **Terminée** marque tous ses tests **OK**, ajoute les contrôles standard si nécessaire, arrête le chronomètre et rend la console fonctionnelle. Le journal indique cette validation lors de la clôture directe. Rouvrir le dossier remet les tests à faire.

**Étapes de réparation :** En attente d’envoi, Réception, Diagnostic, En attente de pièces, Réparation en cours, Tests de validation, Terminée, Irréparable et Abandonnée. Une console déclarée en ligne reste en panne jusqu’au passage du dossier à Réception. L’ancien statut « À commander » est automatiquement converti en « En attente de pièces » à la lecture et lors de l’import de sauvegardes, sans modifier le journal historique, les paiements ou les interventions. La conversion seule ne déclenche aucun e-mail client.

**Pièces à demander au client :** le panneau apparaît dès l’ouverture d’une fiche de réparation, juste après le client concerné, et reste visible dans tous les onglets. Sur ordinateur, il est placé à côté du paiement client ; sur les écrans plus étroits, les deux panneaux sont empilés. Ajoutez plusieurs demandes avec un nom, une quantité et des précisions destinées au client. Chaque pièce commence **En attente de la pièce** ; le client peut la **Marquer disponible** lorsqu’il l’a obtenue et peut la remettre à l’atelier. Ce signalement apparaît dans le suivi et le journal de l’atelier. L’atelier gère ensuite les statuts **Livrée** et **Installée**, et peut corriger les statuts indépendamment de l’étape du dossier. Les demandes apparaissent dans l’espace de leur client, dans l’impression du dossier et dans les sauvegardes JSON. L’ajout et la modification du contenu nécessitent un dossier ouvert rattaché à un client ; le signalement de disponibilité, les statuts et la suppression restent accessibles après clôture. Les pièces fournies par le client ne modifient ni le stock, ni le montant de la réparation, ni les paiements ou les tests. Leur mise à jour ne déclenche pas d’e-mail. Un ancien onglet doit être rechargé avant d’enregistrer un dossier contenant ces nouvelles demandes.

**Coût de l’intervention :** saisissez le montant dès **Nouvelle réparation**, ou dans le bilan d’un dossier, même après sa clôture. Ce montant en euros, hors pièces, remplace la valorisation horaire ; le coût des pièces est ajouté séparément au total. Laissez le champ vide à la création pour conserver le calcul au temps, ou saisissez zéro pour une intervention offerte. Le suivi du temps reste disponible et l’action **Calculer depuis le temps** rétablit le calcul horaire. Le montant est conservé dans les sauvegardes JSON et dans l’impression du dossier.

**Montant total dans le Kanban :** cliquez sur le montant ou le crayon d’une carte de l’atelier pour modifier directement le total, pièces incluses, puis **Enregistrer**. Le coût de l’intervention est ajusté ; les pièces utilisées et le paiement déjà reçu restent conservés. Le total ne peut pas être inférieur au coût des pièces utilisées. **Annuler** ou Échap ferme l’édition sans changement.

**Pièces demandées dans le Kanban :** les cartes de réparation affichent le nom, la quantité et le statut des pièces demandées au client. Les pièces disponibles apparaissent en premier, suivies des pièces en attente. Les trois premières demandes sont visibles ; le bouton **Voir les autres demandes** déplie la liste complète dans la carte. Le statut **Disponible** signalé par le client est consultable au rechargement du suivi de l’atelier.

**Finance :** la vue réservée à l’admin compare les encaissements, les pièces des dossiers payés et le gain estimé par semaine (lundi à dimanche) ou par mois. Les fenêtres affichent les 12 semaines ou les 6 mois se terminant à la période de la date de référence. Les flèches et le calendrier permettent de parcourir l’historique, et **Aujourd’hui** retrouve la période courante. Les périodes suivent le calendrier de Paris. Les reçus sont affectés à leur date de paiement, quel que soit le statut actuel du dossier ; modifier son prix ne modifie pas le montant encaissé. Le gain estimé correspond à l’encaissement moins les pièces des dossiers payés, hors charges et temps de travail, et peut être négatif. Les montants à encaisser concernent les réparations terminées et non payées à leur date de clôture. Le détail des paiements permet d’ouvrir chaque dossier. Les consoles clients archivées sont incluses ; la collection personnelle est exclue. Cette vue exploite les dossiers conservés : annuler un paiement, supprimer un dossier, modifier ses pièces ou restaurer une sauvegarde actualise le suivi correspondant.

**Consoles et réparations liées :** les vues cartes et liste de l’onglet Consoles affichent les dossiers rattachés à chaque console, avec leur numéro, leur objet, leur étape et un accès direct. Les dossiers en cours apparaissent en premier. Deux dossiers sont visibles ; dépliez les suivants pour consulter tout l’historique. Une console sans dossier indique « Aucune réparation ».

**Suppression d’une console :** utilisez le bouton de suppression dans l’inventaire ou **Supprimer la console** en haut de sa fiche. Après confirmation, la console, ses photos, ses dossiers de réparation et leurs interventions sont retirés définitivement. Le client, son accès et ses autres consoles restent enregistrés. Les pièces déjà utilisées restent déduites du stock. Une trace de suppression conserve les numéros de la console et de ses dossiers, y compris après export/import. Les e-mails en attente concernant ces dossiers ne sont plus envoyés.

**Suppression d’un dossier :** le bouton rouge **Supprimer la réparation** en haut de sa fiche, à côté de **Modifier le dossier** demande confirmation, puis retire définitivement le dossier, ses notes, ses photos, ses temps et ses tests. La console et son client restent enregistrés. Les pièces déjà utilisées restent déduites du stock ; remettez-les explicitement en stock depuis le dossier avant sa suppression si elles n’ont pas été consommées. Le journal conserve une trace de suppression sans référence orpheline, et le numéro du dossier n’est pas réutilisé. Une console dont le seul dossier actif est supprimé revient en panne. Les e-mails en attente concernant ce dossier ne sont plus envoyés.

**Paiements clients :** dans une fiche de réparation rattachée à un client, le panneau **Paiement client** affiche **Payée / Non payée** et permet de **Marquer comme payée** après réception du règlement complet. Le montant total actuel, pièces incluses, et la date du paiement sont enregistrés ; ils restent conservés si le coût, le taux horaire ou l’étape évoluent ensuite. **Marquer comme non payée** corrige une erreur d’enregistrement et retire le montant du total encaissé. Les actions sont consignées dans le journal. Les anciens dossiers sont considérés non payés jusqu’à enregistrement explicite. Un petit bouton **Marquer payée** permet aussi d’enregistrer le règlement directement depuis les cartes et la liste de l’atelier, avec la même confirmation du montant. Les badges apparaissent dans les cartes et listes de l’atelier, les dossiers à suivre et les réparations liées aux consoles ; le filtre **Tous les paiements / Réparations payées / Réparations non payées** porte uniquement sur les réparations clients. Le suivi reste réservé à l’admin, est conservé dans les sauvegardes JSON et l’impression interne, et ne déclenche aucun e-mail. Il enregistre un règlement complet, pas un encaissement bancaire ni des acomptes.

**Ma synthèse :** le tableau de bord affiche trois totaux distincts. **Total théorique des réparations** cumule le coût courant de tous les dossiers clients, toutes étapes confondues, y compris ceux en cours, irréparables ou abandonnés, pièces incluses. Il exclut la collection personnelle et conserve les consoles clientes archivées. **Montant des réparations** cumule le coût actuel des réparations clients terminées, pièces comprises, avec le montant d’intervention saisi ou son calcul horaire. Les dossiers en cours, irréparables ou abandonnés sont exclus ; rouvrir un dossier le retire de ce total jusqu’à sa nouvelle clôture. **Total encaissé** cumule les montants effectivement enregistrés comme payés, quel que soit le statut du dossier, et conserve donc le règlement des dossiers rouverts. Les trois totaux incluent les consoles clients archivées et excluent la collection personnelle. Sous ces trois totaux, la section **Pièces à fournir par les clients** rassemble toutes les demandes au statut **En attente de la pièce**, avec quantité, note, client, console et couleur, référence et accès au dossier. Elle distingue le nombre de demandes de la quantité totale attendue, affiche les plus anciennes en premier et défile dans une hauteur limitée. Les pièces disponibles, livrées ou installées n’y apparaissent pas ; une demande en attente reste visible après clôture du dossier. Ensuite, une liste compacte défilable affiche toutes les réparations clients, avec console et couleur, client, référence, étape, paiement, coût actuel et montant reçu. Le défilement fonctionne à la souris, au toucher et au clavier ; changer de filtre replace la liste en haut. Les dossiers non payés sont présentés en premier, puis les terminés et les plus récents. Les filtres **Toutes / Non payées / Payées** portent sur tous les dossiers clients, y compris les consoles archivées. Le bouton **Marquer payée** enregistre le règlement depuis la synthèse ; les accès rapides ouvrent le dossier ou le client. Les compteurs indiquent le nombre total de dossiers par filtre et le lien en bas ouvre l’atelier. Les totaux restent globaux, quel que soit le filtre de la liste. Le lien du total encaissé ouvre les dossiers payés. Supprimer une réparation ou sa console retire également son paiement enregistré du total ; conservez une sauvegarde avant de supprimer un historique financier.

**Clients :** référencez vos clients dans le module Clients, puis rattachez leurs consoles aux fiches correspondantes. Un client peut avoir plusieurs consoles et plusieurs demandes de réparation ; chaque demande reste un dossier suivi dans l’atelier. Les consoles de votre collection peuvent rester sans client. Le client concerné est affiché en haut de chaque fiche de réparation, avec un accès direct à sa fiche ; les consoles sans client sont indiquées comme faisant partie de la collection de l’atelier. Les clients et leurs liens sont inclus dans la sauvegarde JSON, protégés par la connexion administrateur et enregistrés avec le reste de l’atelier. Les anciennes sauvegardes sans clients restent importables.

**Nouvelle réparation :** depuis l’atelier, enregistrez directement une nouvelle console ou manette de toute marque, ou sélectionnez un équipement déjà référencé. La marque et le modèle restent libres ; le sélecteur Nintendo propose aussi les consoles de salon et leurs manettes. Renseignez le propriétaire, la couleur, le numéro de série et les accessoires déposés. La fiche et le dossier en Réception sont créés ensemble ; une erreur ne laisse aucune fiche incomplète. Les équipements archivés ou déjà en réparation restent exclus des choix existants.

**Accès clients :** ouvrez une fiche client, puis le panneau **Accès client** pour créer son identifiant e-mail et son mot de passe (15 à 128 caractères). Transmettez manuellement ces identifiants et le lien fourni par **Copier le lien** (il identifie l’atelier pour les nouveaux comptes) : aucun e-mail n’est envoyé automatiquement. Le portail affiche le nom de l’atelier, ses consoles, leurs demandes et leurs étapes, en mosaïque ou dans la vue détaillée. Son accueil résume les consoles et réparations, et met les **Pièces demandées** directement en évidence : quantité, précisions destinées au client et statuts **En attente de la pièce / Disponible / Livrée / Installée**, regroupés par console et dossier, y compris après clôture. Le bouton **Marquer disponible** apparaît sur les pièces en attente, dans l’accueil et les détails ; il signale que le client a obtenu la quantité demandée. Le client ne peut modifier ni le contenu des demandes ni leurs statuts de réception ou d’installation. Les filtres permettent de retrouver les pièces à fournir, disponibles, livrées et installées ; les compteurs portent sur les quantités. Une recherche et des filtres facilitent le suivi des consoles, avec une progression par étapes sans afficher les tests effectués. Le **Montant actuel** de chaque dossier indique le total calculé par l’atelier, pièces utilisées incluses ; les pièces demandées au client ne sont pas facturées automatiquement. Les notes internes, diagnostics, détail des coûts des pièces, taux horaire, paiements enregistrés, stocks, temps de travail et données des autres clients restent privés. Vous pouvez réinitialiser ou désactiver un accès ; ces actions révoquent immédiatement ses sessions. Supprimer un client de l’atelier désactive son accès. Les comptes et leurs empreintes de mots de passe sont conservés dans la base serveur, séparément des exports JSON d’atelier.

**Administration :** connexion et déconnexion, rôle administrateur vérifié sur les routes API, changement de mot de passe avec vérification de l’ancien et révocation de toutes les sessions. La déconnexion efface les données chargées en mémoire par l’interface. Les autres onglets de la même origine reçoivent la déconnexion ; chaque requête serveur vérifie de toute façon la session.

**Notifications par e-mail :** après configuration du service d’envoi, chaque changement de statut d’une réparation existante informe l’adresse de contact de sa fiche client. Le message indique la console, la référence du dossier, l’ancien et le nouveau statut, avec un lien vers l’espace client. Les notes internes, diagnostics, prix et identifiants de connexion ne sont jamais inclus. Une nouvelle demande, une modification sans changement de statut, un import ou une réinitialisation ne déclenchent aucun e-mail. Les dossiers sans client ou sans adresse de contact sont ignorés.

Les réglages et les fiches clients présentent l’historique des envois, les échecs et les nouvelles tentatives. Vous pouvez mettre les notifications en pause ; les changements effectués pendant la pause ou avant la configuration ne sont pas envoyés rétroactivement. Une restauration annule les envois encore en attente. L’historique des e-mails et leur activation sont dans la base serveur, séparément de l’export JSON d’atelier. « Envoyé » signifie que le fournisseur a accepté le message ; ce n’est pas une confirmation de lecture ou de réception par le client.

## Migrer l’ancienne application locale

1. Dans l’ancienne application, exportez une sauvegarde JSON avant de changer d’adresse ou de navigateur.
2. Connectez-vous à cette version, puis ouvrez **Réglages & sauvegardes → Restaurer ou migrer des données**.
3. Importez le JSON et confirmez avec `RESTAURER`. Il remplace l’atelier du serveur, pas le compte administrateur.
4. Vérifiez les consoles, les réparations et les photos avant de supprimer vos anciennes copies locales.

Aucun transfert ni effacement de l’ancien localStorage n’est automatique. Lorsqu’une sauvegarde ancienne est accessible sur la même origine, un bouton permet de la récupérer. L’authentification **ne protège pas rétroactivement** les fichiers HTML autonomes, les exports JSON ou le localStorage de l’ancienne version. Protégez ou supprimez ces copies après une migration vérifiée.

Les nouvelles données d’atelier sont dans SQLite, pas dans localStorage. Un changement n’est confirmé qu’après validation serveur. Pendant l’enregistrement, les nouvelles actions sont bloquées. En cas d’échec ou de conflit, un écran permet de récupérer le brouillon JSON puis de recharger l’état serveur ; aucun écrasement concurrent n’est effectué automatiquement. Une expiration de session peut faire perdre une modification non confirmée : ne fermez pas l’onglet pendant l’enregistrement.

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

- Mot de passe de 15 à 128 caractères, hachage scrypt (`N=131072`, `r=8`, `p=1`) et sel aléatoire unique ; aucune valeur secrète dans le code frontend ou les variables Vite.
- Identifiant de session aléatoire de 256 bits, empreinte SHA-256 seulement dans la base. Cookie `HttpOnly`, `SameSite=Strict`, `Secure` et préfixe `__Host-` sous HTTPS.
- Durée maximale de 8 heures et expiration après 30 minutes sans activité API. Les vérifications périodiques de session n’allongent pas l’inactivité.
- Vérification d’origine sur les écritures, y compris la connexion, et jeton CSRF sur les autres mutations authentifiées.
- Limitation persistante des tentatives par adresse, par connexion réseau et globale, erreurs de connexion génériques et calcul comparable pour une adresse inconnue.
- Autorisation serveur à chaque lecture ou écriture des données, validation métier, limitation de taille et contrôle de révision pour éviter les modifications perdues.
- En-têtes de sécurité partagés entre Node et Cloudflare, réponses `no-store` et variantes de session/origine explicites. Dans les navigateurs modernes, la CSP bloque les scripts et feuilles de style en ligne dans des éléments, les cadres, médias et workers ; les attributs de style des graphiques React restent autorisés. Aucun secret dans les journaux d’erreur.
- Projection client limitée aux champs affichés du suivi, aux demandes de pièces qui lui sont destinées et aux consoles de son propriétaire. Les tests internes, notes d’atelier, photos privées, pièces du stock, temps, autres clients et identifiants client inutilisés ne sont pas envoyés au portail.
- Écriture client limitée au passage de ses pièces en attente à **Disponible**, protégée par session, origine et CSRF. Le serveur vérifie à nouveau l’accès et la révision lors de l’enregistrement atomique ; un ancien état de l’atelier ne peut écraser le signalement.
- Retrait réel des vues privées à la déconnexion, à l’expiration et avant une navigation quittant le document. Un retour depuis l’historique revalide la session avant de charger les données ; les requêtes tardives d’une ancienne session sont annulées ou ignorées. Une simple bascule d’onglet vérifie la session admin sans perdre ses brouillons si elle reste valide.

Les informations effectivement affichées à un utilisateur autorisé restent lisibles dans le DOM et les outils de son navigateur. La protection repose sur l’autorisation serveur, la minimisation des données envoyées et le retrait des vues après la session ; elle ne cherche pas à masquer les données à leur propre destinataire. L’écran de connexion et le HTML public ne contiennent aucune donnée métier.

Ce socle ne remplace pas un audit de sécurité. Il ne comprend pas de MFA, de comptes administrateurs multiples, de connexion sociale ni de récupération par e-mail. La base n’est pas chiffrée par l’application : les accès système, le disque et les sauvegardes doivent être protégés par l’exploitant.

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

Le dossier `cloudflare/` fournit une API Workers avec une base D1 persistante et les mêmes écrans d’administration. Les fichiers publics sont uniquement ceux de `dist/`. Le serveur Node local reste disponible avec `npm start` ; sa base SQLite et la base Cloudflare sont indépendantes après le transfert.

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

`src/` contient l’interface, le contrôle de session, les formulaires et les règles métier ; `repair-intake-domain.ts` partage le catalogue et les règles de déclaration publique. `server/` contient l’API, SQLite et les frontières de données publiques. `scripts/admin.mjs` gère le compte SQLite ; `scripts/cloudflare-admin-create.mjs` initialise uniquement le premier compte D1. Les tests du nouveau parcours sont dans `tests/repair-intake-domain.test.cjs` et `tests/repair-intake-api.test.mjs`.

MIT. Voir `LICENSE` et `THIRD_PARTY_NOTICES.md`. Les noms des consoles servent à l’identification ; l’application n’est pas affiliée aux fabricants.
