# Préparation de la migration SEO Réparapid

Date du relevé : **22 novembre 2026**. Origine inspectée : [reparapid.fr](https://reparapid.fr/). Le nouveau site est préparé pour remplacer l’ancien en conservant ce domaine. Ce document ne constate aucune bascule DNS et ne certifie pas une migration terminée.

## Inventaire public

Les requêtes publiques ont croisé les deux familles de sitemaps, la navigation HTML et les listes publiées de WordPress. Elles identifient **170 chemins distincts** :

| Ensemble | Nombre | Observation sur l’ancien site | Décision cible |
| --- | ---: | --- | --- |
| Pages et contenus conservés | 22 | HTTP 200 | Même chemin, HTML utile, HTTP 200 |
| Pages et archives regroupées | 9 | HTTP 200 | Redirection permanente HTTP 308 |
| Alias de pièces jointes WordPress | 139 | HTTP 301 vers une image, puis 200 | Inventaire seulement ; activation bloquée avant archivage des images |
| **Total** | **170** | **31 contenus HTML, 139 alias médias** | **22 conservés + 9 redirections + 139 différés** |

Le relevé HTML couvre 24 pages publiées, 2 articles, 3 catégories et 2 archives datées. Ces dernières portaient déjà `noindex, follow`. Toutes les réponses finales observées étaient HTTP 200. Une réponse 200 ou la présence dans un sitemap ne prouve pas une indexation dans Google.

Les fichiers [JSON](anciens-slugs-2026-11-22.json) et [CSV](anciens-slugs-2026-11-22.csv) contiennent les 170 lignes : source publique, statut initial et final, URL finale, type de contenu, canonical observée et décision de migration. Les champs `observed_*` sont des observations du site ancien ; les champs `proposed_*` constituent le plan cible. Une canonical vide indique une absence dans le HTML observé ou un fichier image. Ces fichiers ne contiennent ni HTML brut ni configuration privée.

## Chemins à conserver en HTTP 200

Chaque URL ci-dessous doit présenter un contenu correspondant à son sujet, avec une canonical propre sur `https://reparapid.fr`. Le maintien du chemin seul ne suffit pas si une page générique remplace son contenu. Les pages smartphones et tablettes doivent conserver une présentation et un contact pertinents pour ces appareils ; un formulaire limité aux consoles ne remplace pas leur intention.

| Ancien chemin = chemin cible | Intention à préserver |
| --- | --- |
| `/` | Accueil commercial et présentation atelier |
| `/a-propos/` | Présentation du magasin et de son atelier |
| `/accueil/blog/` | Archives de blog / catégories |
| `/accueil/smartphones/` | Réparation de smartphones : sélection de marque/modèle et contact |
| `/accueil/smartphones/blackview/` | Réparation de smartphones : sélection de marque/modèle et contact |
| `/accueil/smartphones/google/` | Réparation de smartphones : sélection de marque/modèle et contact |
| `/accueil/smartphones/huawei/` | Réparation de smartphones : sélection de marque/modèle et contact |
| `/accueil/smartphones/oneplus/` | Réparation de smartphones : sélection de marque/modèle et contact |
| `/accueil/smartphones/oppo/` | Réparation de smartphones : sélection de marque/modèle et contact |
| `/accueil/smartphones/realme/` | Réparation de smartphones : sélection de marque/modèle et contact |
| `/accueil/smartphones/samsung/` | Réparation de smartphones : sélection de marque/modèle et contact |
| `/accueil/smartphones/smartphone-apple/` | Réparation de smartphones : sélection de marque/modèle et contact |
| `/accueil/smartphones/vivo/` | Réparation de smartphones : sélection de marque/modèle et contact |
| `/accueil/smartphones/xiaomi/` | Réparation de smartphones : sélection de marque/modèle et contact |
| `/consoles/` | Réparation de consoles : présentation de marque ou contact |
| `/consoles/contact-consoles-retro/` | Réparation de consoles : présentation de marque ou contact |
| `/consoles/microsoft/` | Réparation de consoles : présentation de marque ou contact |
| `/consoles/nintendo/` | Réparation de consoles : présentation de marque ou contact |
| `/consoles/sony/` | Réparation de consoles : présentation de marque ou contact |
| `/petit-apercu/` | Article avec galerie de réalisations de l’atelier |
| `/politique-de-cookies-ue/` | Information légale sur les cookies de l’ancien site |
| `/tablettes/` | Réparation de tablettes et contact |

Les textes et références légales, dont la politique de cookies, doivent refléter le nouveau site et ses traitements réels. Préserver le slug ne signifie pas conserver des mentions devenues inexactes.

## Regroupements par redirection permanente

Le plan utilise HTTP **308**, cohérent avec les redirections permanentes du nouveau serveur. Les 301 observés sur les médias restent des faits distincts. Google reconnaît notamment 301 et 308 comme redirections permanentes ; une destination pertinente et un trajet direct évitent les chaînes et les redirections vers une page d’accueil sans rapport. [Documentation Google sur les déplacements avec changement d’URL](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes).

| Ancien chemin | Cible | Statut cible |
| --- | --- | ---: |
| `/2023/02/17/` | `/accueil/blog/` | 308 |
| `/2023/05/31/` | `/accueil/blog/` | 308 |
| `/bonjour-tout-le-monde/` | `/accueil/blog/` | 308 |
| `/category/informations-generales/` | `/accueil/blog/` | 308 |
| `/category/latelier/` | `/accueil/blog/` | 308 |
| `/category/non-classe/` | `/accueil/blog/` | 308 |
| `/consoles/contact-consoles-nintendo/` | `/consoles/nintendo/` | 308 |
| `/consoles/contact-consoles-sony/` | `/consoles/sony/` | 308 |
| `/consoles/contact-consoles-xbox/` | `/consoles/microsoft/` | 308 |

Le blog conservé doit présenter les informations d’atelier et permettre d’accéder à `/petit-apercu/`. Les anciens regroupements éditoriaux sont ainsi réunis dans une destination qui conserve leur sujet.

## Alias technique supplémentaire

Un contrôle ciblé du 22 novembre 2026 confirme que [l’ancienne URL `/accueil/`](https://reparapid.fr/accueil/) répond HTTP **301** vers `https://reparapid.fr/`, qui répond 200, en un seul saut. Cet alias technique de la page d’accueil est relevé **hors des 170 slugs de l’inventaire éditorial et médias**. La cible à conserver est `/`, avec une redirection permanente 308 sur le nouveau serveur. Ne pas le remplacer par une deuxième page d’accueil.

## Bloqueur : fichiers médias non archivés

Les **139 alias de pièces jointes** identifiés renvoient actuellement vers 139 fichiers originaux sous `/wp-content/uploads/`. Ils sont listés avec leur destination exacte dans l’inventaire. Aucun de ces fichiers n’a été archivé pour le nouvel hébergement dans cette tâche. **La bascule de `reparapid.fr` doit attendre leur préservation et leur contrôle.** Leurs éventuelles redirections sur le nouveau serveur restent désactivées jusque-là.

Des chemins comme `/ps5/`, `/xbox/`, `/sony-2/` ou `/nintendo-3/` sont des alias de médias WordPress, et non des pages de réparation de ces modèles. Les envoyer automatiquement vers un formulaire changerait leur destination réelle.

Avant activation : récupérer les originaux depuis une sauvegarde autorisée ou le site public, conserver les chemins existants ou documenter chaque destination pérenne, puis contrôler le type image et le HTTP 200 de chaque fichier. Activer ensuite uniquement les alias correspondant à des fichiers effectivement préservés et tester leurs redirections sans boucle. Il faut aussi vérifier les images intégrées aux pages conservées. Les fichiers du site ancien ne doivent pas être supposés disponibles après le changement d’hébergement. Google inclut explicitement images et téléchargements dans le périmètre d’une migration. [Préparation des ressources à déplacer](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes).

## Procédure pour la future bascule

Cette procédure décrit une opération future à autoriser et réaliser séparément. Elle ne modifie pas les données métier de la nouvelle application.

1. Compléter ce relevé avec Search Console, liens entrants et journaux historiques ; sauvegarder WordPress, ses médias et la zone DNS hors du dépôt public. Lever le bloqueur des 139 images.
2. Valider sur le nouvel hébergement les 22 pages utiles, les 9 redirections directes et les ressources archivées. Les chemins inconnus doivent produire un vrai 404 ; vérifier formulaires, suivi client et téléchargements avec des données fictives.
3. Préparer le domaine personnalisé `reparapid.fr`, son certificat HTTPS et un retour arrière vers l’hébergement précédent. Relever les DNS existants et préserver les enregistrements de messagerie et de vérification.
4. Préparer un build avec `PUBLIC_SITE_ORIGIN=https://reparapid.fr` pour canonical, liens internes, métadonnées et sitemap ; l’activer seulement lors de la bascule. Jusque-là, conserver l’origine et les canonicals `workers.dev`. Vérifier aussi `APP_ORIGIN` côté Worker pour les mutations autorisées et `MAIL_PORTAL_ORIGIN` lorsque l’envoi de mails sera actif. Définir le traitement du domaine de prévisualisation et lever les blocages temporaires uniquement sur le site final.
5. Après autorisation de bascule, modifier les seuls DNS nécessaires, vérifier HTTPS et réponses depuis plusieurs résolveurs, puis soumettre le sitemap dans la propriété Search Console du domaine conservé. Aucun outil « Changement d’adresse » n’est nécessaire ici.
6. Surveiller 404, boucles, 5xx, images, exploration et indexation après lancement ; compléter le mapping pour les URL historiques découvertes. Garder l’ancien hébergement disponible pour retour arrière jusqu’à validation du trafic et de la propagation.

Le changement d’hébergement se prépare et se surveille sans changer les URL conservées. [Guide Google sur un changement d’hébergement](https://developers.google.com/search/docs/crawling-indexing/site-move-no-url-changes). Le domaine reste le même ; les regroupements de chemins suivent le [guide des changements d’URL](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes). Des fluctuations de référencement restent possibles ; aucun maintien de position n’est garanti.

## Sources publiques du relevé

Les sitemaps ne sont pas des listes garanties de toutes les URL indexées. Les deux index publics ont été croisés avec WordPress et les liens HTML. Les URL ci-dessous sont des sources de découverte, pas des cibles à reproduire comme pages du nouveau site.

- [Robots](https://reparapid.fr/robots.txt).
- Index Yoast : [sitemap_index.xml](https://reparapid.fr/sitemap_index.xml), [pages](https://reparapid.fr/page-sitemap.xml), [articles](https://reparapid.fr/post-sitemap.xml), [catégories](https://reparapid.fr/category-sitemap.xml).
- Autre famille déclarée : [sitemap.xml](https://reparapid.fr/sitemap.xml), [sitemap-1.xml](https://reparapid.fr/sitemap-1.xml), [images](https://reparapid.fr/image-sitemap-1.xml), [vidéos](https://reparapid.fr/video-sitemap-1.xml), [actualités](https://reparapid.fr/news-sitemap.xml).
- Listes WordPress publiques : [pages publiées](https://reparapid.fr/wp-json/wp/v2/pages?per_page=100&_fields=id,link,slug,title,parent,status), [articles publiés](https://reparapid.fr/wp-json/wp/v2/posts?per_page=100&_fields=id,link,slug,title,status), [catégories](https://reparapid.fr/wp-json/wp/v2/categories?per_page=100&_fields=id,link,slug,name,count).
- Navigation et liens d’archives : [accueil](https://reparapid.fr/), [blog](https://reparapid.fr/accueil/blog/), [article initial](https://reparapid.fr/bonjour-tout-le-monde/), [informations générales](https://reparapid.fr/category/informations-generales/), [atelier](https://reparapid.fr/category/latelier/), [petit aperçu](https://reparapid.fr/petit-apercu/).

## Limites et contrôle de complétude

**Search Console n’était pas accessible pendant ce relevé.** Aucun export de performances, de couverture d’indexation, de liens entrants ou de journaux historiques n’a été consulté. Le chiffre 170 décrit les URL publiques découvertes, pas toutes celles qui ont pu exister ni toutes celles actuellement connues de Google. Il doit être complété avant la bascule si ces accès deviennent disponibles.

Les URL d’API, d’administration, flux, paramètres de recherche et autres utilitaires WordPress ne deviennent pas des destinations éditoriales du nouveau site. Les fichiers originaux associés aux médias sont renseignés comme destinations, sans être comptés une deuxième fois parmi les 170 slugs. Aucune donnée client, session ou interface privée n’a été utilisée.

Le plan est prêt à être confronté au code et aux réponses servies. Sa validation finale exige le contrôle des 170 chemins, des images d’origine, du domaine HTTPS et des signaux SEO après bascule.
