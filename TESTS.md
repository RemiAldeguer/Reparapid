# Validation de Reparapid

Copie indépendante créée le 12 octobre 2026. Les recettes de la vitrine RépaRapid et du parcours d’envoi ci-dessous décrivent la personnalisation de cette copie. Les recettes de La Clinique Rétro sont conservées dans une section historique distincte.

Validation initiale de l’import le **12 octobre 2026**, avec Node **24.19.0** : `npm ci`, compilation TypeScript/Vite et **434 tests réussis** (393 Node/domaine/API et 41 Cloudflare). Ce résultat décrit la copie avant le nouveau parcours public. Les tests API utilisent des serveurs temporaires et l’accès aux sockets locaux.

Documentation mise à jour le **21 octobre 2026** ; les résultats ci-dessous restent rattachés à leur date de vérification. Pour la reprise détaillée, lire [CONTEXTE_PROJET.md](CONTEXTE_PROJET.md).

## Résultat courant : devis après diagnostic, retour et rachat — 21 octobre 2026

Le domaine et les API Node/Worker couvrent publication/version, accord et refus, console HS avec ou sans rachat, retour gratuit/payant, déclaration de virement, confirmation magasin et suivi d’expédition. Le devis accepté est repris en facturation et en encaissement, indépendamment des coûts internes. Les anciens reçus sans proposition restent lisibles et annulables ; la création d’un nouveau reçu avant accord est refusée. Aucun faux paiement de réparation n’est créé pour les frais de retour ou le rachat.

Les tests vérifient l’idempotence, les prix 0/absents/invalides, les offres remplacées, la conservation du stock et des coûts/reçus, la validation des dates/états, l’impossibilité d’expédier avant réception du virement, les consentements non transférables à une autre console ou un autre client, les anciens éditeurs, sessions révoquées et écritures concurrentes. Les API testent origine/CSRF, allowlists strictes, propriétaire étranger, contextes d’ateliers réellement provisionnés avec IDs identiques, taille UTF-8 maximale et bornes de suivi. Le diagnostic technique, les notes et les coordonnées bancaires avant choix de retour restent absents de la projection client.

Recette sur **SQLite en mémoire**, un compte administrateur et un client fictifs, quatre dossiers : publication d’un devis de 89,90 €, acceptation confirmée et montant d’encaissement identique ; refus avec frais de 12,50 €, déclaration de virement sans validation automatique, confirmation magasin puis expédition avec suivi fictif ; rachat pour pièces de 25 € accepté et finalisé ; retour gratuit sans virement. La frise et les choix client reflètent les suites en attente, même après clôture technique du dossier. Aucun diagnostic interne visible dans le portail. Affichage client contrôlé à **1280, 390 et 320 px**, sans débordement. Le backoffice desktop conserve son identité RépaRapid. Capture client enregistrée hors dépôt.

Compilation finale : **116 modules**, **137 fichiers publics** dont 123 pages de guides, TypeScript et contrôles des sources/assets réussis. Le warning historique du bundle supérieur à 500 kB reste présent. **593 tests réussis (548 Node/domaine/API + 45 Cloudflare)**, aucun échec ni test ignoré. Les 36 scénarios de propositions API et les 25 nouveaux tests de propositions du domaine sont inclus dans cette suite.

Serveur de recette arrêté : les quatre dossiers ont uniquement les choix attendus (devis accepté, retour expédié, rachat finalisé, retour gratuit en préparation), un seul client fictif et aucun paiement de réparation créé. Aucun e-mail, virement, rachat ou envoi réel. Onglets créés fermés et viewport réinitialisé.

Publication confirmée sur **100 % du trafic Cloudflare** : neuf assets identiques au build, coordonnées publiques 200, cinq routes privées et les deux nouvelles actions de diagnostic refusées anonymement en 401. Le bundle publié contient le nouveau parcours ; la page de connexion magasin est vérifiée dans le navigateur. Aucune migration ni modification des données D1 de production.

## Résultat précédent : nouvelle présentation des avis — 19 octobre 2026

Présentation de la troisième section : fond crème, citations plus lisibles, bouton Google rouge, étoiles/notes propres à chaque carte et auteurs en pied. Les trois textes, dates, auteurs et notes sont conservés ; aucun score global ou total n’est ajouté. Aucun changement d’API, règle métier ou asset autorisé ; pas de relance métier pour ce design.

TypeScript, revue indépendante et build de **112 modules** validés, avec **137 fichiers publics**. Recette à **1280, 390 et 320 px** : citations, trois notes individuelles accessibles, auteurs/dates, crédits, focus clavier et lien Google sécurisé contrôlés ; aucun débordement. Trois colonnes à 1024 px, une seule à 900 px. Contrastes ciblés vérifiés : étoiles 3,61:1, dates 5,19:1, source 4,85:1. Ordre hero/parcours/avis conservé. Les dossiers, clients et pièces de la base éphémère sont inchangés ; serveur arrêté.

Publication confirmée sur **100 % du trafic Cloudflare** : neuf assets conformes au build, API publique 200 et cinq API privées 401. La nouvelle présentation, les trois notes individuelles et la troisième place sont vérifiées sur le site publié. Capture enregistrée, onglet créé fermé et viewport réinitialisé ; aucune migration ni écriture D1.

## Résultat précédent : avis Google en troisième section — 19 octobre 2026

Déplacement de `GoogleReviews` juste après `HomeRepairJourney`, avant le bandeau de confiance. Le contenu des avis et leurs liens restent identiques ; aucun changement de données, API ou métier. Pas de nouvelle exécution métier pour ce changement d’ordre.

TypeScript, build de **112 modules** et revue ciblée validés, avec **137 fichiers publics**. Ordre vérifié dans le DOM : hero, parcours, avis Google, bandeau de confiance ; un seul bloc d’avis et trois cartes. Recette à 1280 et 390 px, contrôle de débordement à 320 px. Les deux dossiers, clients et pièces de la base éphémère restent inchangés ; serveur arrêté.

Publication vérifiée sur **100 % du trafic Cloudflare** : neuf assets conformes au build, API publique 200 et cinq API privées 401. L’ordre et l’unicité des avis sont confirmés sur le site publié. Capture enregistrée, onglet créé fermé, viewport réinitialisé ; aucune migration ni écriture D1.

## Résultat précédent : parcours simplifié — 19 octobre 2026

Textes et présentation de `HomeRepairJourney` allégés : trois schémas, numéro/titre réunis, un paragraphe par carte, seules les destinations talon/colis légendées, liens courts et une note commune. La section reste immédiatement après le hero. Aucun changement de métier, API, asset autorisé ou fiche imprimable ; pas de relance de la suite métier pour cette présentation.

TypeScript, revue indépendante et build final réussis : **112 modules**, huit sources publiques et **137 fichiers**, dont 123 pages de guides. Recette à **1280, 390 et 320 px** : trois schémas et trois paragraphes, une seule légende talon/colis, absence de débordement et flèches verticales sur mobile. Ordre hero/parcours/bandeau conservé ; ancre, focus, Tab et Entrée vers le formulaire, lien du compte vérifiés. Les deux dossiers, clients et pièces de la base en mémoire sont inchangés ; serveur arrêté. La suite métier/API n’est pas relancée pour cette présentation.

Publication confirmée sur **100 % du trafic Cloudflare** : neuf assets conformes au build, API publique 200 et cinq API privées 401. Le site publié confirme trois cartes courtes sans rôles ni résultats, juste après le hero. Capture enregistrée, onglet créé fermé et viewport réinitialisé. Aucune migration ni écriture D1.

## Résultat précédent : trois étapes illustrées sous le bloc principal — 19 octobre 2026

Le parcours public comprend trois cartes avec SVG décoratifs et consignes HTML : demande/compte, préparation/envoi, atelier/suivi/retrait. Il se trouve immédiatement après le hero. Les cartes passent de trois colonnes à une colonne à 900 px, avec flèches verticales. Le document imprimable, les règles métier, les API et la liste d’assets publics restent inchangés. La suite métier/API et les 32 tests des assets de la reprise précédente ne sont pas relancés pour cette présentation.

TypeScript, revue indépendante et build final réussis : **112 modules**, huit sources publiques et **137 fichiers**, dont 123 pages de guides. Recette sur SQLite en mémoire à **1280, 390 et 320 px** : trois schémas contenus, textes lisibles et absence de débordement. Trois colonnes confirmées à 1024 px, une seule à 900 px ; flèches verticales sur mobile. Ordre du DOM contrôlé : hero, parcours, bandeau de confiance, familles de consoles. Ancre directe, focus, Tab puis Entrée vers le formulaire et liens demande/compte vérifiés. Les deux dossiers, clients et pièces fictifs sont inchangés ; serveur arrêté.

Publication confirmée sur **100 % du trafic Cloudflare** : neuf assets conformes au build, API publique 200 et cinq API privées 401. La recette du site publié confirme les trois cartes, trois schémas et leur position juste après le hero. Capture enregistrée, onglet de recette fermé et viewport réinitialisé. Aucune migration ni écriture D1.

## Résultat précédent : identité Maxxi Games et photographies — 19 octobre 2026

L’accroche présente l’atelier de Maxxi Games avec son logo et la devanture en fond rouge transparent. La section **Votre console, notre établi** comprend la photo réelle du comptoir, l’identité du magasin et trois points sur le contact, la prise en charge et le suivi. Deux nouveaux JPEG sont autorisés par leur chemin exact, sans ouvrir les autres images.

**32 tests ciblés réussis** dans `tests/public-assets.test.mjs` : liste publique, garde des sources/build, réponses GET/HEAD Node et Worker, refus des fichiers inconnus et liens symboliques. Les deux photos sont incluses dans les cas permis et un JPEG non déclaré dans les refus. TypeScript et la compilation finale passent : **111 modules**, huit sources publiques et **137 fichiers**, dont 123 pages de guides. La suite métier complète n’est pas relancée pour cette présentation. Le warning de bundle supérieur à 500 kB demeure.

Recette finale sur SQLite **en mémoire**, sans écriture métier : **1280, 390 et 320 px** contrôlés. Logo Maxxi Games, voile de la devanture et fondu mobile, photo du comptoir chargée, trois points de service et crédit vérifiés. Aucun débordement horizontal ; les cartes restent contenues à 320 px. Le bouton de contact fait défiler jusqu’à la rubrique et lui donne le focus. La recherche Switch OLED puis le choix explicite ouvrent directement les pannes du bon modèle. Les 38 choix restent présents sans recherche.

Publication confirmée sur **100 % du trafic Cloudflare** : neuf assets conformes au build (dont les deux photos), API publique 200 et cinq API privées 401. L’accueil et la section magasin publiés ont été vérifiés. La base de recette reste inchangée, le serveur est arrêté, l’onglet créé est fermé et le viewport réinitialisé. Aucune migration ni écriture D1.

## Résultat précédent : recherche écrite et grille de consoles sur l’accueil — 19 octobre 2026

Le grand aperçu est retiré. Le choix des consoles est une grille toujours visible avec recherche texte et radios natifs ; les 38 identifiants du catalogue et le parcours vers les pannes restent inchangés. Aucun contrat API ni règle métier ne change ; la suite métier/API n’est pas relancée pour cette présentation.

TypeScript, revue indépendante et build final réussis : **111 modules**, six sources publiques autorisées, **135 fichiers** dont 123 pages de guides. Le dernier build prend en compte le focus unique autour de la recherche mobile et le bouton explicite « Voir toutes les consoles ». Le warning de bundle supérieur à 500 kB demeure.

Recette à **1280, 390 et 320 px** : grand aperçu absent, 38 illustrations sans identifiants dupliqués, deux colonnes lisibles, aucun débordement horizontal ni illustration hors de son cadre. La recherche propose quatre PS5 pour « PS5 » ou « ps 5 », une Switch OLED, une Xbox Series X (sans Series S), une Series S et les trois Sega malgré la saisie accentuée « SÉGA ». Une saisie sans correspondance propose effacement/retour au catalogue et Autre console.

Aucun choix initial ni sélection implicite lors de la saisie ou d’Entrée. Entrée place le focus dans les radios ; les flèches changent le choix natif et font défiler la grille jusqu’au dernier modèle. Un choix masqué par le filtre reste annoncé dans le récapitulatif ; « Changer » réinitialise le choix et la recherche. La soumission vide affiche l’erreur et remet le focus dans la recherche. Switch ouvre directement les pannes ; Autre garde l’étape de saisie libre. À 320 px, le champ conserve une taille de 16 px et un seul cadre de focus ; retour aux 38 choix confirmé après « Voir toutes les consoles ».

Deux bases SQLite en mémoire, avec données fictives, restent inchangées : aucun compte ou dossier créé par cette recette, clients et pièces préservés. Serveurs arrêtés et viewport réinitialisé. Les vérifications de publication sont consignées séparément.

Publication confirmée sur **100 % du trafic Cloudflare** : sept assets conformes au build, API publique 200 et cinq API privées 401. L’accueil publié confirme l’absence de grand aperçu, les 38 choix et le filtrage Switch avec sélection explicite. Onglets de recette fermés ; aucune migration ni écriture D1.

## Résultat précédent : vue Liste des demandes du site — 19 octobre 2026

Présentation dans `website-requests.tsx/.css` : vue **Liste** par défaut et bascule **Liste / Cartes**. Recherche, filtres, tri, compteurs, transitions et confirmations réutilisés ; aucun changement de contrat API, domaine ou données de production. La suite métier/API n’est pas relancée pour cette évolution de présentation.

TypeScript et build final réussis : **111 modules**, six sources publiques et **135 fichiers**, dont 123 pages de guides. Un second build prend en compte l’ajustement de largeur à 960 px minimum et le libellé accessible des pannes longues. Le warning de bundle supérieur à 500 kB demeure.

Recette sur SQLite **en mémoire**, notifications désactivées : onze dossiers fictifs, dont dix demandes publiques et un dossier classique exclu du listing. Liste par défaut, six colonnes, bascule sans perdre recherche/filtre/tri, tris chronologiques, résultat vide puis réinitialisation vérifiés. Le texte complet de la panne longue se déplie au clavier. Le bouton du dossier ouvre bien la bonne référence et le retour retrouve la liste. Les dossiers irréparable/abandonné restent sans action rapide de progression.

Annulation puis confirmation de réception sur un dossier et confirmation « prête à récupérer » sur un autre, suivies d’un rechargement pour vérifier la persistance. Les onze dossiers restent présents ; seuls les deux dossiers et leurs consoles liés à ces actions attendues sont modifiés. Clients et pièces restent inchangés. Aucun e-mail réel ni donnée fictive transférée en production.

**1280, 390 et 320 px effectivement contrôlés** sur le bundle final : à 1280 px les six colonnes sont visibles sans défilement horizontal ; à 390/320 px seul le tableau défile, y compris au clavier, sans débordement du document. Compte fictif déconnecté, tableau privé retiré, onglet fermé, viewport réinitialisé et serveur arrêté. Les captures contiennent uniquement des demandes fictives.

Publication confirmée sur **100 % du trafic Cloudflare** : sept assets identiques au build, API publique 200 et cinq API privées 401. Aucune migration ni écriture D1.

## Résultat précédent : frise horizontale et choix direct de console — 15 octobre 2026

Retouche de présentation dans `client-portal.*`, `public-home.*` et `home-console-select.*`. La frise pleine largeur précède les deux panneaux du dossier. L’accueil propose directement les 38 consoles illustrées dans un seul sélecteur, sans marque obligatoire. Aucun contrat API, règle métier, document imprimable ou stockage ne change.

`npm run typecheck`, `npm run build` et `git diff --check` réussis. Le build final transforme **111 modules** et valide six sources publiques puis **135 fichiers** (dont les 123 pages de guides). Le warning de bundle supérieur à 500 kB demeure. La suite métier/API n’a pas été relancée pour ces changements de présentation ; les résultats antérieurs restent datés ci-dessous.

Recette finale répétée sur SQLite **en mémoire**, avec un compte et neuf dossiers fictifs, notifications désactivées : les neuf états, dont l’attente de pièces (sept jalons), prêt à récupérer, irréparable, abandonné et vérifications d’un dossier classique (cinq jalons). Une seule frise précède les panneaux ; aucun doublon ne reste dans les consignes. Les clôtures affichent un message sans fausse progression. `aria-current`, étapes passées/futures et zéro/absence de montant sont conservés.

**1280, 390 et 320 px effectivement contrôlés** sur le suivi : document sans débordement horizontal, frise seule défilable, dernier jalon visible à l’ouverture et après passage de 1280 à 390 puis 320 px. Le dernier contrôle de redimensionnement a été répété après rechargement du bundle final, avec une position de défilement de 600 px à 320 px et le jalon actuel entièrement visible.

Accueil : champ unique actif dès l’ouverture, **38 choix et 38 illustrations**, validation vide ramenant le focus au sélecteur, sélection Switch ouvrant directement les pannes, End/Entrée vers Autre console puis saisie libre. La recherche clavier « switch » sélectionne Nintendo Switch. Menu contenu à 320 px et sélection illustrée lisible à 390 px ; aucun débordement du document. Les captures ne contiennent que des données fictives.

Compte fictif déconnecté, panneaux privés retirés, viewport réinitialisé, onglets de recette fermés et serveur temporaire arrêté. Les dix dossiers existants, les clients et les pièces de la base en mémoire restent inchangés.

Publication confirmée sur **100 % du trafic Cloudflare** : sept assets conformes au build, API publique 200 et cinq API privées 401. Recette publique de l’accueil : un seul champ « Votre console », 38 choix et 38 illustrations, sélection Switch conservée avec aperçu. Aucune migration ni écriture D1.

## Résultat précédent : menus illustrés et schéma d’envoi

Évolution de présentation uniquement : schéma en quatre étapes dans le suivi client, logos dans le choix de marque, miniatures partagées des consoles dans le choix du modèle et chevrons des listes natives espacés de 15 px du bord. Le document imprimable, les contrats API, le domaine et les données ne changent pas ; les 129 tests ci-dessous restent rattachés à la reprise précédente, sans nouvelle exécution métier pour cette retouche.

TypeScript et build réussis : **111 modules**, six sources publiques autorisées et **135 fichiers**, dont 123 pages HTML de guides. Les quatre logos proviennent des sites officiels ; les imports Vite `?inline` les intègrent au bundle sans nouvel accès externe ni extension de la liste d’assets publics.

Recette sur SQLite en mémoire, uniquement avec comptes/dossiers fictifs : cinq marques et **38 modèles illustrés** (Sony 12, Nintendo 16, Microsoft 6, Sega 3, Autre 1), quatre logos chargés, champs initialement vides et modèle désactivé avant la marque. Les erreurs requises placent le focus sur le choix manquant ; changer de marque efface le modèle. Flèches, Home/End, Entrée, Échap, Tab, recherche par lettre et fermeture extérieure vérifiés. Le menu Sony défile jusqu’à PS Vita ; ses SVG restent dans leur cadre, sans identifiant dupliqué. Switch ouvre directement l’étape panne ; Autre ouvre le choix/saisie du modèle.

**1280, 390 et 320 px effectivement observés** : menus et suivi sans débordement horizontal, quatre cartes du schéma contenues avec texte lisible et destinations distinctes. À 320 px, le dernier modèle du menu est visible après ouverture et défilement au clavier. Inventaire du magasin vérifié à 1280 et 320 px : ses quatre listes ont un chevron à 15 px et une réserve texte de 42 px. Après déconnexion, nom client et panneaux privés disparaissent. Le document imprimable et son CSS sont strictement inchangés ; aucune nouvelle ouverture du dialogue d’impression.

La recette ne crée ni demande ni donnée métier ; les clients, dossiers et pièces de la base en mémoire restent inchangés. Sessions fictives déconnectées, serveur arrêté et viewport réinitialisé.

Publication confirmée à **100 % du trafic Cloudflare** : sept assets identiques au build, API publique 200 et cinq API privées 401. L’accueil publié charge les quatre logos intégrés et les douze miniatures Sony. Le premier contrôle HTML a précédé la propagation ; le contrôle complet est réussi après confirmation de la nouvelle version servie. Aucune migration ni écriture D1.

## Résultat précédent : sélection d’accueil, suivi client et fiche à découper

**129 tests ciblés réussis**, sans échec ni test ignoré : domaine/demandes de réparation, API Node/Worker, accès client et sessions. TypeScript et build final réussis : **102 modules**, six sources publiques autorisées, **135 fichiers**, dont 123 pages de guides. Une seconde compilation finale prend en compte la cohérence des instructions de découpe sur l’accueil et à la confirmation. Les 531 tests complets plus anciens restent rattachés à la reprise des forfaits.

Recette sur SQLite en mémoire : accueil sans marque/modèle par défaut, validation des champs requis, sélection Switch puis accès direct aux pannes, retour au modèle, compte client existant et création de REP-011. Le dossier créé est automatiquement sélectionné et reste sans montant supposé. Les neuf autres dossiers du client vérifient choix par référence, actualisation gardant la sélection, zéro explicite, tarif réel saisi, prêt à récupérer et clôture irréparable. Aucun filtre/recherche/tri/bascule mosaïque ; réparation à gauche et process à droite à 1280 px. Les marqueurs internes et le dossier de l’autre propriétaire restent absents.

**390 et 320 px effectivement observés** : les deux panneaux sont empilés, sans débordement horizontal ; le formulaire d’accueil est également vérifié à 320 px. « Autre console » demande le modèle libre ; une query modèle invalide ne présélectionne rien ; l’ancien filtre de marque Sony garde ses douze modèles. Le compte sans dossier affiche son action de première demande. Après déconnexion, aucun panneau privé, fiche ou nom client ne reste affiché.

Fiche : talon et partie atelier identifiés, schéma lisible, ligne de découpe, absence de données internes et pas de copie d’impression hors impression. Une deuxième base avec adresse non confirmée et champs longs vérifie avertissement, bouton d’impression désactivé, présence de la totalité des symptômes/accessoires/adresse et défilement jusqu’au pied du document sans débordement. La première base ne change que par l’ajout attendu d’une console/demande ; les dossiers et clients préexistants et le stock restent inchangés. La deuxième base reste inchangée.

**Limite de recette PDF :** l’impression native a été déclenchée après revalidation. L’accès à l’application Codex est refusé par l’outil de contrôle natif ; aucun PDF n’a été enregistré ni rendu en PNG. Le dialogue d’impression a bloqué l’exécution JavaScript de l’onglet de recette ; l’onglet créé pour ce test a été fermé et la recette reprise dans un nouvel onglet. Le document et ses champs longs sont vérifiés à l’écran ; ne pas affirmer un nombre de pages A4 ou un export PDF visuellement validé.

Le cas courant d’un client avec un seul dossier a aussi été vérifié : pas de sélecteur supplémentaire, split direct et aucune écriture métier. Les trois serveurs temporaires sont arrêtés, les onglets créés sont fermés et le viewport du navigateur est réinitialisé.

Publication vérifiée sur **100 % du trafic Cloudflare** : sept assets principaux identiques au build, API publique 200 et cinq API privées 401, 123 pages de guides conformes et 140 contrôles SEO réussis. L’accueil publié confirme les champs initialement vides, le choix Sony/PS5 et les instructions de découpe actualisées. Aucun client, console, compte ou tarif fictif transféré en production ; aucune migration ni écriture D1.

## Résultat précédent : illustrations des consoles et accroche

Retouche visuelle du SVG partagé : matériaux, reflets des écrans, relief des commandes, ombres de contact et détails de surfaces. Nouvelle accroche : **« Une seconde vie pour votre console. »**. Les **14 tests de correspondance et apparence des consoles** ont été réexécutés avec succès ; les 531 tests métier/API précédents ne sont pas relancés pour cette retouche. Aucun changement de contrat serveur ou migration D1.

TypeScript et build final réussis : **100 modules**, six sources publiques autorisées, **135 fichiers de build**, dont 123 pages HTML de guides. La revue indépendante a signalé deux traits de châssis qui passaient sur les manettes Xbox One et PS3 ; ils ont été raccourcis avant ce build final. Deux builds intermédiaires ont été interrompus pour intégrer ces corrections.

Recette Node à **1280 px** dans une base en mémoire contenant 38 consoles fictives : accroche d’accueil confirmée, nouvelles surfaces du hero et cartes Sony inspectées, **38 SVG du formulaire et 38 SVG partagés de l’inventaire contenus dans leurs cadres**, aucun débordement horizontal. Aucun identifiant SVG dupliqué ni référence de gradient/clip manquante sur ces deux vues. Le Store est strictement inchangé, le serveur arrêté et l’onglet temporaire fermé. Aucune nouvelle vérification à 390/320 px n’est affirmée ; les cadres et media queries restent inchangés.

Le premier contrôle de fermeture de la fixture arrivait après la fermeture automatique de SQLite. La fixture a été corrigée avec une connexion explicitement fournie à l’application, puis la recette accueil/formulaire/inventaire répétée sur une nouvelle base fictive ; le contrôle final confirme le Store inchangé et le serveur fermé.

Publication vérifiée sur **100 % du trafic Cloudflare** : sept assets principaux identiques au build, 123 pages de guides conformes et 140 contrôles SEO réussis, API publique 200 et cinq API privées 401. L’accueil en ligne confirme la nouvelle accroche, l’absence de l’ancienne et les nouveaux détails SVG. Aucun compte, tarif ou console fictive transféré en production ; aucune migration ou écriture D1.

## Résultat précédent : onglet Forfaits de réparation

Déplacement visuel vers `#/repair-packages`, ajout dans la navigation et retrait des réglages. Menu et accès direct réservés au magasin principal ; connexion administrateur conservée. L’éditeur, le contrat serveur et le domaine des forfaits sont réutilisés. La suite de 531 tests ci-dessous reste celle de l’évolution métier précédente ; ce déplacement ne la relance pas.

TypeScript et build réussis : **99 modules**, six sources publiques autorisées et **135 fichiers de build**, dont 123 pages de guides. Une erreur d’import de `PageHeader` a été corrigée avant cette compilation finale.

Recette Node en mémoire à **1280 px**, uniquement avec administrateur et forfaits fictifs : accès direct anonyme → connexion → onglet dédié, état actif/titre/fil d’Ariane, ajout et sauvegarde confirmée, rechargement retrouvant six forfaits, réouverture en modification, disposition côte à côte et absence de débordement horizontal. Le panneau n’apparaît plus dans les réglages. Les collections clients, consoles, réparations et pièces restent inchangées ; le serveur est arrêté et l’onglet temporaire fermé. Les gardes rôle/atelier ont été relues indépendamment ; aucune nouvelle recette d’un atelier secondaire ni vérification à 390/320 px n’est affirmée.

Publication vérifiée sur **100 % du trafic Cloudflare** : les sept assets principaux sont identiques au build, l’API publique répond en HTTP 200 et les cinq API privées contrôlées refusent les accès anonymes en HTTP 401. Aucun tarif de recette, migration ou import D1.

## Résultat précédent : forfaits de réparation

**531 tests réussis (486 Node/domaine/API + 45 Cloudflare)**, aucun échec, annulation ou test ignoré. TypeScript et build final réussis : **98 modules**, six sources publiques autorisées, **135 fichiers de build**, dont 123 pages de guides. Les nouveaux tests vérifient publication/masquage et projection explicite, modèles/symptômes et champs valides, zéro et décimales 0.29/79.99, rejet de 1.005, persistance et ancienne sauvegarde, omission d’un ancien éditeur, effacement explicite, isolation et refus des montants/références forgés dans les POST. La création reste sans coût, diagnostic ou paiement dérivé du forfait.

Deux fixtures multi-atelier ont été ajustées après un premier passage à 484/486 : elles installaient leur grille avant un provisionnement qui exige un atelier initial vide. La grille fictive est désormais ajoutée après cette création ; la garde de production est conservée. La suite complète ci-dessus a été relancée ensuite.

Recette Node en mémoire à **1280 px**, avec prix fictifs explicitement étiquetés : PS5 et port HDMI → offre précise ; surchauffe → prix « à partir de » ; deux pannes → offres individuelles sans total automatique ; PS5 Digital sans grille → montant à confirmer ; Switch et joystick → zéro explicite, maintenu à l’étape compte. Le forfait masqué et le tarif PS4 ne sont pas exposés à cette sélection. Aucun dossier client ou paiement créé par la recette.

Compte administrateur fictif : masquage d’une offre, création/publication d’une nouvelle à 0.29 €, rechargement confirmant la persistance, changement de modèle vidant le symptôme et montant publié actualisé dans le formulaire. Les collections **clients, consoles, réparations et pièces restent inchangées** ; seule la grille fictive et son historique sont modifiés. Une deuxième base vide confirme montant/mode vides, publication désactivée et formulaire prêt. Aucun débordement horizontal observé ; les limites de viewport mobile du navigateur documentées précédemment restent applicables.

**Grille commerciale manquante :** les pages du magasin consultées proposent des demandes de devis et aucun montant public chiffré. La grille réelle a été demandée ; la production ne reçoit aucun tarif fictif ou prix par défaut. Les montants seront renseignés par le magasin ou à réception de sa grille. Aucune migration SQL, import, reset de production ou modification de données clients.

Publication à **100 % du trafic Cloudflare**, sans migration ni écriture D1 : sept assets principaux conformes au build, 123 pages HTML conformes et 140 contrôles SEO réussis. GET `/api/public/repair-intake` renvoie HTTP 200 avec exactement `shop` et `repairPackages` ; la grille publique est vide tant que les tarifs réels ne sont pas renseignés. Les cinq API privées contrôlées renvoient HTTP 401 sans données privées. Les deux serveurs de recette sont arrêtés et les onglets temporaires sont fermés.

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
