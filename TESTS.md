# Validation de Reparapid

Copie indépendante créée le 12 octobre 2026. Les recettes visuelles et les versions Cloudflare décrites plus bas constituent l’historique de La Clinique Rétro ; aucune publication de Reparapid n’a été effectuée.

Validation locale de cette copie le **12 octobre 2026**, avec Node **24.19.0** : installation reproductible par `npm ci`, compilation TypeScript/Vite réussie et **434 tests réussis** (393 Node/domaine/API et 41 Cloudflare), zéro échec et zéro test ignoré. Les assets compilés sont identiques à ceux de la version locale d’origine à jour. Les tests API ont été exécutés avec l’accès aux sockets locaux requis par leurs serveurs temporaires.

État vérifié le **12 octobre 2026**. Pour la reprise détaillée, lire [CONTEXTE_PROJET.md](CONTEXTE_PROJET.md).

## Résultat automatisé courant

La commande npm test a passé **434 tests : 393 dans la première suite Node/domaine/API, puis 41 dans la suite Cloudflare**, sans échec ni test ignoré. Exécution avec Node 24.19.0 ; le projet exige Node 22.16 ou supérieur.

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
| Notifications, dépôt, destinataires, idempotence et reprises | tests/repair-notifications.test.mjs, tests/notification-delivery.test.mjs, tests/notifications-api.test.mjs |
| Vie des sessions navigateur et réponses tardives | tests/api-session.test.mjs |
| Inscriptions et ateliers isolés | tests/registration-requests.test.mjs, tests/workshop-scope.test.mjs, tests/saas-api.test.mjs |
| Silhouettes et couleurs | tests/console-appearance.test.mjs |
| En-têtes et limites de réponses | tests/response-security.test.mjs |
| Worker/D1, fragments atomiques et sécurité | tests/cloudflare-worker.test.mjs, tests/cloudflare-database.test.mjs, tests/cloudflare-security.test.mjs |

Les identifiants fixes sont exclusivement des fixtures. Les tests utilisent des bases isolées et des transports e-mail simulés ; ils ne créent pas de comptes dans l’atelier réel et n’envoient pas de message client réel.

## Recette visuelle de cette session

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

Après publication, relever le Version ID Wrangler, vérifier la réponse de l’URL publique et comparer les références/hashes JS-CSS au build. Pour une modification API, vérifier les routes/protections concernées. GET /api/store et GET /api/admin/invoice-source doivent refuser une requête anonyme.

Une courte propagation Cloudflare peut servir l’ancien HTML : examiner la réponse avant de redéployer. Recetter les mutations uniquement sur des données explicitement destinées au test.

## Limites

Les tests ne remplacent pas un audit indépendant, un test d’intrusion ou une validation juridique des factures. Ils ne vérifient pas la réception réelle d’un e-mail Resend ou un paiement bancaire.

Le workflow .github/workflows/ci.yml exécute tests et build. Aucun résultat de CI distante n’a été consulté pour cette reprise ; les résultats ci-dessus sont locaux.
