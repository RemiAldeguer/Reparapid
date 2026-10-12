# Reprise du projet

Lire [CONTEXTE_PROJET.md](CONTEXTE_PROJET.md), [README.md](README.md) et [TESTS.md](TESTS.md) au début d’une reprise. Le guide contient la carte du code, les choix métier, les dernières demandes utilisateur et les procédures.

## Principes

- Interface en français, prix EUR. Préserver les choix visuels et métier documentés.
- src/domain.ts reste la référence pour transitions, coûts, stock, paiements et pièces clients.
- Adapter Node et Worker ensemble quand un contrat d’API ou une règle serveur évolue.
- Préserver isolation multi-atelier, projections du portail, CSRF, sessions et sauvegardes atomiques avec révision.
- Distinguer coût courant/reçu, stock/pièce fournie par le client, disponible/livré et zéro/valeur absente.
- Tester sur des bases temporaires et des données fictives ; ne pas réinitialiser la production pour une recette.
- Ne jamais écrire mots de passe, tokens, clés API, cookies ou données clients réelles dans la documentation ou les assets.
- SQLite local, D1 local et D1 distant sont indépendants : vérifier l’environnement ciblé.
- Vérifications adaptées : compilation/recette pour le visuel, tests métier/API/Worker pour le comportement.
- Corriger les sources, pas dist/ ni tests/.compiled/.
- Pour une publication autorisée, vérifier le build et la version servie ; préserver les données D1.
- Maintenir le guide de contexte après une évolution importante.

## Commandes

~~~sh
npm test
npm run build
~~~

Développement : npm run dev:server puis npm run dev, interface sur http://127.0.0.1:5173.

Cette copie Reparapid possède un dépôt Git et utilise https://github.com/RemiAldeguer/Reparapid. Le document CONTEXTE_PROJET.md conserve l’historique du projet d’origine ; ses anciens chemins et références de production ne désignent pas cette copie. La configuration active utilise reparapid et un database_id nul à remplacer par celui d’une nouvelle D1 dédiée avant publication.
