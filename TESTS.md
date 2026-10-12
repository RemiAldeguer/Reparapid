# Validation de Reparapid

Copie indépendante créée le 12 octobre 2026. Les recettes de la vitrine RépaRapid et du parcours d’envoi ci-dessous décrivent la personnalisation de cette copie. Les recettes de La Clinique Rétro sont conservées dans une section historique distincte.

Validation initiale de l’import le **12 octobre 2026**, avec Node **24.19.0** : `npm ci`, compilation TypeScript/Vite et **434 tests réussis** (393 Node/domaine/API et 41 Cloudflare). Ce résultat décrit la copie avant le nouveau parcours public. Les tests API utilisent des serveurs temporaires et l’accès aux sockets locaux.

État vérifié le **12 octobre 2026**. Pour la reprise détaillée, lire [CONTEXTE_PROJET.md](CONTEXTE_PROJET.md).

## Résultat automatisé courant

Le **12 octobre 2026**, `npm test` a passé **474 tests : 429 dans la première suite Node/domaine/API, puis 45 dans la suite Cloudflare**, sans échec ni test ignoré. Le contrôle TypeScript et le build Vite ont également réussi. La nouvelle vitrine a été publiée et vérifiée sur le Worker ; les derniers ajustements visuels doivent conserver ce contrôle des assets après chaque publication. Le projet exige Node 22.16 ou supérieur ; cette recette utilise Node 24.19.0.

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
| Compte et demande atomiques, fiche filtrée, CSRF, isolation, idempotence, révocation et conflits sur les deux hôtes | tests/repair-intake-api.test.mjs |
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

Le premier compte administrateur réel de production reste à créer par une personne avec `npm run cloudflare:admin:create`. Les tests de cette commande utilisent une base en mémoire et des valeurs synthétiques ; ils n’initialisent pas la production et ne réinitialisent aucun compte.

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

Le domaine [reparapid.fr](https://reparapid.fr/) conserve son site WordPress. Aucune modification DNS n’a été effectuée. Les coordonnées publiques du magasin proviennent de ce site ; aucune donnée client réelle n’a été utilisée pendant la recette. La connexion admin en production reste à vérifier après initialisation humaine du premier compte ; aucun paiement ni envoi de colis réel n’a été réalisé.

Après publication, relever le Version ID Wrangler, vérifier la réponse de l’URL publique et comparer les références/hashes JS-CSS au build. Pour une modification API, vérifier les routes/protections concernées. GET /api/store et GET /api/admin/invoice-source doivent refuser une requête anonyme.

Une courte propagation Cloudflare peut servir l’ancien HTML : examiner la réponse avant de redéployer. Recetter les mutations uniquement sur des données explicitement destinées au test.

## Limites

Les tests ne remplacent pas un audit indépendant, un test d’intrusion ou une validation juridique des factures. Ils ne vérifient pas la réception réelle d’un e-mail Resend ou un paiement bancaire.

Le workflow .github/workflows/ci.yml exécute tests et build. Aucun résultat de CI distante n’a été consulté pour cette reprise ; les résultats ci-dessus sont locaux.
