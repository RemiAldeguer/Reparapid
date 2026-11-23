import {renderToStaticMarkup} from 'react-dom/server';
import type {ReactNode} from 'react';
import {ShopConsoleArt} from './shop-console-art';
import {legacyPages, LEGACY_PUBLISHED_DATE} from './legacy-site-manifest.mjs';
import {guideManifest, GUIDE_ORIGIN} from './repair-guides-manifest.mjs';

type PageType = 'consoles' | 'console-brand' | 'retro' | 'smartphones' | 'phone-brand' | 'tablets' | 'about' | 'blog' | 'workshop' | 'cookies';
type Section = {title: string; body: string; points?: readonly string[]};
type GuideLink = {slug: string; title: string};
type LegacyContent = {
  pathname: string; type: PageType; title: string; description: string; heading: string;
  eyebrow: string; introduction: string; sections: readonly Section[];
  brand?: string; models?: readonly string[]; guides?: readonly GuideLink[];
};
const CONTACT = '/#/accueil?section=rp-contact';
const REQUEST = '/#/demande-reparation';
const PHONE = '01 58 46 82 51';
const EMAIL = 'contact@reparapid.fr';
const ADDRESS = '30 bis avenue de Fontainebleau';
const CITY = '94270 Le Kremlin-Bicêtre';
const consoleGuides: readonly GuideLink[] = [
  {slug: 'ps5-bruit-ventilateur-nettoyage', title: 'PS5 : comprendre un ventilateur bruyant'},
  {slug: 'switch-ne-sallume-plus', title: 'Nintendo Switch : vérifier une console qui ne s’allume plus'},
  {slug: 'xbox-series-x-aucun-signal-hdmi', title: 'Xbox Series X : rechercher la cause d’un écran sans signal'},
];
const phoneGuides: readonly GuideLink[] = [
  {slug: 'iphone-11-remplacer-batterie', title: 'iPhone 11 : comprendre le remplacement de la batterie'},
  {slug: 'galaxy-s23-humidite-port-charge', title: 'Samsung Galaxy S23 : une alerte d’humidité à la charge'},
  {slug: 'pixel-5-ne-charge-plus', title: 'Google Pixel 5 : les vérifications quand la charge ne démarre plus'},
];
const consoleBrands: readonly LegacyContent[] = [
  {
    pathname: '/consoles/nintendo/', type: 'console-brand', brand: 'Nintendo',
    title: 'Réparation Nintendo Switch, DS et consoles Nintendo',
    description: 'Switch, Switch 2, DS, 3DS, Wii ou Game Boy : identifiez les symptômes et préparez votre demande de réparation auprès de RépaRapid · Maxxi Games.',
    heading: 'Votre Nintendo mérite une prochaine partie.', eyebrow: 'CONSOLES NINTENDO',
    introduction: 'Une Switch qui ne charge plus, un Joy-Con imprécis ou une DS dont l’écran reste noir : commencez par le modèle et ce que vous constatez. Le formulaire vous aide à décrire la panne sans connaître le nom des composants.',
    models: ['Switch 2', 'Switch · OLED · Lite', 'Nintendo DS · 3DS', 'Wii · Wii U', 'Game Boy · Game Boy Advance', 'NES · Super Nintendo · Nintendo 64 · GameCube'],
    sections: [
      {title: 'Charge et démarrage', body: 'Précisez si un logo, un voyant ou une icône de batterie apparaît. Sur Switch, indiquez aussi si le comportement change entre le chargeur et la station d’accueil.'},
      {title: 'Image et commandes', body: 'Distinguez un écran intégré défaillant d’une absence d’image sur le téléviseur. Pour un joystick, décrivez une dérive au repos, un bouton muet ou une déconnexion.'},
      {title: 'Lecture des jeux', body: 'Indiquez si le problème concerne une seule cartouche ou plusieurs jeux. Sur les consoles plus anciennes, n’utilisez ni liquide ni objet métallique dans le connecteur.'},
    ],
    guides: [consoleGuides[1], {slug: 'switch-lite-joystick-gauche-drift', title: 'Switch Lite : vérifier un joystick qui dérive'}, {slug: '3ds-circle-pad-calibration', title: 'Nintendo 3DS : vérifier la calibration du Circle Pad'}],
  },
  {
    pathname: '/consoles/sony/', type: 'console-brand', brand: 'Sony',
    title: 'Réparation PlayStation PS5, PS4, PS3 et consoles Sony',
    description: 'PS5, PS4, PS3, PS2, PSP ou PS Vita : décrivez la panne, consultez les guides et demandez un diagnostic à l’atelier RépaRapid · Maxxi Games.',
    heading: 'Votre PlayStation, prête pour la suite.', eyebrow: 'CONSOLES SONY PLAYSTATION',
    introduction: 'Votre PlayStation affiche un écran noir, s’éteint pendant une partie ou ne reconnaît plus les disques ? Notez les signes visibles et choisissez votre console pour créer un dossier de réparation.',
    models: ['PlayStation 5', 'PlayStation 4', 'PlayStation 3', 'PlayStation · PlayStation 2', 'PSP', 'PS Vita'],
    sections: [
      {title: 'Image absente ou instable', body: 'Indiquez si la console démarre, si un son est audible et si le téléviseur annonce « aucun signal ». Un autre câble et une autre entrée HDMI permettent d’écarter un problème extérieur.'},
      {title: 'Bruit, chauffe ou arrêt', body: 'Décrivez à quel moment le ventilateur devient bruyant et si un message apparaît avant l’arrêt. Laissez les aérations dégagées et ne multipliez pas les redémarrages si la console coupe.'},
      {title: 'Disques et manettes', body: 'Précisez si le lecteur accepte le disque, si plusieurs jeux sont concernés et si la manette fonctionne avec un câble adapté. Une description séparée de chaque symptôme facilite le diagnostic.'},
    ],
    guides: [consoleGuides[0], {slug: 'ps4-disque-non-reconnu', title: 'PS4 : comprendre un disque non reconnu'}, {slug: 'ps-vita-bloquee-redemarrage', title: 'PS Vita : les vérifications avant un redémarrage'}],
  },
  {
    pathname: '/consoles/microsoft/', type: 'console-brand', brand: 'Microsoft',
    title: 'Réparation Xbox Series X, Series S, One et Xbox 360',
    description: 'Xbox Series X ou S, Xbox One et Xbox 360 : préparez votre demande de réparation, de la panne d’alimentation au problème d’image ou de lecture.',
    heading: 'Une panne Xbox ? Faisons le point.', eyebrow: 'CONSOLES MICROSOFT XBOX',
    introduction: 'Une Xbox qui ne démarre plus ou qui n’affiche plus d’image ne présente pas forcément la même panne. Décrivez les voyants, les sons et les essais effectués : l’atelier dispose ainsi d’un point de départ concret.',
    models: ['Xbox Series X', 'Xbox Series S', 'Xbox One · One S · One X', 'Xbox 360', 'Xbox d’origine'],
    sections: [
      {title: 'Alimentation et démarrage', body: 'Précisez si la console émet un son puis s’arrête, reste complètement éteinte ou affiche un message. Sur les modèles avec alimentation externe, décrivez également son voyant.'},
      {title: 'HDMI et affichage', body: 'Essayez une autre entrée du téléviseur et un câble connu comme fonctionnel. Signalez une prise abîmée ou un incident récent, sans tenter de redresser ses contacts.'},
      {title: 'Lecture et ventilation', body: 'La Series S n’utilise pas de disque. Pour une console équipée d’un lecteur, indiquez le type de jeu et si le problème touche plusieurs disques. Pour la chauffe, notez l’emplacement et les éventuels messages.'},
    ],
    guides: [consoleGuides[2], {slug: 'xbox-one-alimentation-demarrage', title: 'Xbox One : contrôler l’alimentation avant de conclure'}, {slug: 'xbox-series-s-surchauffe', title: 'Xbox Series S : comprendre une surchauffe'}],
  },
];

type PhoneProfile = {slug: string; brand: string; models: readonly string[]; identification: string; display: string; charging: string; preparation: string; guides?: readonly GuideLink[]};
const phoneProfiles: readonly PhoneProfile[] = [
  {slug: 'smartphone-apple', brand: 'Apple', models: ['iPhone SE', 'iPhone · mini · Plus', 'iPhone Pro · Pro Max'], identification: 'Sur un iPhone accessible, ouvrez Réglages > Général > Informations et relevez le nom du modèle. La taille ou le nombre d’objectifs ne suffit pas à distinguer toutes les versions.', display: 'Précisez si la vitre est fissurée, si l’image présente des lignes ou si le tactile répond encore. Mentionnez aussi un éventuel message sur Face ID ou Touch ID : ces fonctions ne se résument pas à la vitre.', charging: 'Indiquez le connecteur Lightning ou USB-C, le câble essayé et si une alerte de liquide apparaît. Une autonomie réduite et une absence totale de charge doivent être décrites séparément.', preparation: 'Avant un dépôt, sauvegardez les données si l’appareil reste utilisable. Demandez au magasin les éventuelles manipulations liées à Localiser ; ne communiquez jamais votre mot de passe Apple par e-mail.', guides: [phoneGuides[0], {slug: 'iphone-16-charge-usb-c', title: 'iPhone 16 : vérifier un problème de charge USB-C'}, {slug: 'iphone-13-face-id', title: 'iPhone 13 : comprendre un problème de Face ID'}]},
  {slug: 'samsung', brand: 'Samsung', models: ['Galaxy S', 'Galaxy A', 'Galaxy Note', 'Galaxy Z Flip · Z Fold'], identification: 'Dans Paramètres > À propos du téléphone, relevez le nom et la référence commençant souvent par SM-. Deux Galaxy d’une même gamme peuvent utiliser des écrans et batteries différents.', display: 'Distinguez une vitre fissurée d’une image noire avec sons encore présents. Pour un Z Flip ou Z Fold, précisez si le défaut touche l’écran extérieur, l’écran intérieur ou la zone de pliure ; ne forcez pas la charnière.', charging: 'Une alerte d’humidité USB n’établit pas à elle seule une panne du connecteur. Indiquez le message exact, les chargeurs essayés et si la charge sans fil reste possible sur votre modèle.', preparation: 'Sauvegardez vos données avant tout dépôt. Si votre Galaxy propose un mode Maintenance, demandez à l’atelier si son activation convient aux contrôles prévus.', guides: [phoneGuides[1], {slug: 'galaxy-s22-remplacement-ecran', title: 'Galaxy S22 : comprendre le remplacement d’un écran'}, {slug: 'galaxy-z-flip4-ecran-tactile-diagnostic', title: 'Galaxy Z Flip4 : examiner un défaut de tactile'}]},
  {slug: 'xiaomi', brand: 'Xiaomi', models: ['Xiaomi', 'Redmi · Redmi Note', 'POCO'], identification: 'Relevez le nom complet dans les informations du téléphone, y compris Pro, Plus, 4G ou 5G. Un Redmi Note et un POCO de taille proche ne sont pas une référence de pièce interchangeable.', display: 'Décrivez la fissure, les taches, les lignes ou les zones qui ne répondent plus au toucher. Précisez si l’appareil vibre ou reçoit des appels lorsque l’écran est noir.', charging: 'Indiquez si la charge est absente, intermittente ou seulement plus lente. Notez le câble et l’adaptateur utilisés ; la charge rapide dépend aussi de leur compatibilité.', preparation: 'Si le téléphone démarre encore, sauvegardez vos données et relevez la version du système. N’envoyez pas le code de déverrouillage ni les identifiants de votre compte Xiaomi dans votre premier message.', guides: [{slug: 'redmi-note-11-charge-lente', title: 'Redmi Note 11 : comprendre une charge lente'}, {slug: 'poco-f3-remplacement-batterie', title: 'POCO F3 : préparer un remplacement de batterie'}]},
  {slug: 'huawei', brand: 'Huawei', models: ['Huawei P', 'Huawei Mate', 'Huawei nova'], identification: 'Notez le nom commercial et la référence dans les informations de l’appareil ou sur sa boîte. Les déclinaisons Lite et Pro peuvent nécessiter des pièces très différentes.', display: 'Indiquez si le problème concerne la vitre, l’image ou le tactile. Décrivez également toute chute ou exposition à un liquide, même si le défaut est apparu plus tard.', charging: 'Précisez si le téléphone reconnaît un chargeur et si la connexion se coupe quand le câble bouge. N’insérez aucun outil dans le port de charge.', preparation: 'Vérifiez la sauvegarde des photos et contacts si l’appareil est accessible. Mentionnez les services de sauvegarde disponibles sur votre modèle et demandez au magasin de confirmer la prise en charge avant un déplacement.'},
  {slug: 'oneplus', brand: 'OnePlus', models: ['OnePlus', 'OnePlus Nord', 'OnePlus Open'], identification: 'Relevez le nom complet et la référence dans les paramètres. Une mention telle que Nord CE ou une déclinaison régionale aide à éviter une confusion de modèle.', display: 'Décrivez les zones tactiles affectées, les lignes colorées et la visibilité de l’image. Sur un modèle pliant, précisez l’écran concerné sans appuyer sur la pliure.', charging: 'Indiquez le chargeur et le câble utilisés, notamment si seule la charge rapide ne fonctionne plus. Signalez toute chauffe inhabituelle et cessez la charge si la coque ou l’écran se soulève.', preparation: 'Préparez une sauvegarde et un résumé des essais déjà effectués. La disponibilité des pièces et la possibilité d’intervention doivent être confirmées avec l’atelier pour la référence exacte.'},
  {slug: 'google', brand: 'Google', models: ['Pixel', 'Pixel a', 'Pixel Pro · Pro XL', 'Pixel Fold'], identification: 'Dans Paramètres > À propos du téléphone, relevez le modèle exact. Pixel, Pixel a et Pixel Pro d’une même génération n’utilisent pas nécessairement les mêmes composants.', display: 'Précisez si le tactile, l’image ou le lecteur d’empreinte pose problème. Un souci de déverrouillage après un remplacement d’écran doit être signalé avec l’historique de l’intervention.', charging: 'Testez un câble et un adaptateur compatibles que vous savez fonctionnels. Notez si le téléphone affiche une alerte, une icône de charge ou un simple écran noir.', preparation: 'Sauvegardez les données si possible. Si votre Pixel propose le mode Réparation, vérifiez avec le magasin s’il est adapté à l’intervention et aux essais nécessaires.', guides: [phoneGuides[2], {slug: 'pixel-7-remplacement-ecran', title: 'Pixel 7 : ce qu’implique le remplacement d’un écran'}, {slug: 'pixel-8a-surchauffe-diagnostic', title: 'Pixel 8a : rechercher la cause d’une chauffe'}]},
  {slug: 'oppo', brand: 'OPPO', models: ['OPPO Find', 'OPPO Reno', 'OPPO A'], identification: 'Relevez le nom du modèle et sa référence CPH lorsqu’elle est indiquée dans les paramètres ou sur la boîte. Le seul nom de gamme ne permet pas de confirmer une pièce.', display: 'Précisez si la vitre est cassée, si l’écran reste noir et si le téléphone continue à vibrer. Pour un modèle pliant, décrivez l’écran concerné et l’état de la charnière.', charging: 'Distinguez une absence de charge d’une charge rapide qui ne s’active plus. Donnez la référence du chargeur et indiquez si le problème existe avec un autre câble adapté.', preparation: 'Conservez une sauvegarde récente si le téléphone reste accessible. Contactez l’atelier avec la référence exacte pour vérifier les possibilités de diagnostic et les pièces nécessaires.'},
  {slug: 'vivo', brand: 'vivo', models: ['vivo X', 'vivo V', 'vivo Y'], identification: 'Relevez la référence dans les informations du téléphone, en plus du nom X, V ou Y. Les appareils d’une même gamme peuvent différer selon la génération et le marché.', display: 'Décrivez la qualité de l’image, les zones tactiles inactives et l’état de la vitre. Indiquez si un choc a précédé le défaut ou si le téléphone a déjà été ouvert.', charging: 'Notez si l’icône de batterie apparaît et si le câble doit être maintenu dans une position particulière. N’utilisez pas de liquide pour nettoyer le connecteur.', preparation: 'Sauvegardez les photos et documents avant un dépôt lorsque c’est possible. Transmettez le modèle et les symptômes pour que le magasin confirme les possibilités de prise en charge.'},
  {slug: 'realme', brand: 'realme', models: ['realme GT', 'realme C', 'realme · Pro'], identification: 'Relevez le nom complet et la référence RMX lorsqu’elle figure dans les paramètres ou sur la boîte. Les versions Pro, Pro+ et 5G doivent être distinguées.', display: 'Précisez si le défaut se limite à une fissure ou s’accompagne d’un écran noir, de taches ou d’un tactile irrégulier. Mentionnez toute intervention antérieure.', charging: 'Indiquez les câbles et adaptateurs essayés. Une autonomie qui baisse, une charge interrompue et un arrêt soudain sont des symptômes différents à détailler.', preparation: 'Préparez votre sauvegarde et demandez confirmation au magasin pour votre référence exacte. Une batterie déformée ou un écran qui se soulève impose d’arrêter l’utilisation et la charge.'},
  {slug: 'blackview', brand: 'Blackview', models: ['Blackview BV', 'Blackview BL', 'Blackview A'], identification: 'Relevez la référence complète, y compris les suffixes Pro ou Plus. Sur les modèles renforcés, la coque extérieure ne suffit pas à identifier l’écran ou la batterie.', display: 'Décrivez les fissures, les défauts d’image et le fonctionnement du tactile. Signalez les chocs et toute exposition à un liquide : une coque renforcée ne permet pas de conclure à l’absence de dommage interne.', charging: 'Si le port possède un cache, vérifiez uniquement son état extérieur sans forcer. Décrivez la charge avec un câble adapté et toute trace visible sur le connecteur.', preparation: 'Contactez l’atelier avant un envoi ou un dépôt pour confirmer la disponibilité des pièces. Ne présumez pas du maintien d’une résistance à l’eau après un choc ou une ouverture.'},
];
const phonePages: readonly LegacyContent[] = phoneProfiles.map(profile => ({
  pathname: `/accueil/smartphones/${profile.slug}/`, type: 'phone-brand', brand: profile.brand,
  title: `Réparation smartphone ${profile.brand} au Kremlin-Bicêtre`,
  description: `Écran, batterie ou charge de votre smartphone ${profile.brand} : identifiez le modèle et préparez votre échange avec l’atelier RépaRapid · Maxxi Games.`,
  heading: `Votre ${profile.brand} a besoin d’attention.`, eyebrow: `SMARTPHONES ${profile.brand.toUpperCase()}`,
  introduction: profile.identification, models: profile.models, guides: profile.guides,
  sections: [{title: 'Écran et tactile', body: profile.display}, {title: 'Batterie et charge', body: profile.charging}, {title: 'Avant de confier votre appareil', body: profile.preparation}],
}));

const content: readonly LegacyContent[] = [
  {
    pathname: '/consoles/', type: 'consoles', title: 'Réparation de consoles au Kremlin-Bicêtre | Maxxi Games',
    description: 'PlayStation, Nintendo, Xbox et consoles rétro : préparez votre réparation avec RépaRapid, l’atelier Maxxi Games au Kremlin-Bicêtre, et suivez votre dossier.',
    heading: 'Votre console. Notre atelier.', eyebrow: 'RÉPARATION DE CONSOLES',
    introduction: 'Choisissez votre console, décrivez ce qui ne fonctionne plus et retrouvez votre dossier dans votre espace client. Derrière RépaRapid, l’atelier de Maxxi Games vous accueille au Kremlin-Bicêtre.',
    sections: [{title: 'Un symptôme suffit pour commencer', body: 'Pas besoin de connaître le composant en cause. Une console qui ne s’allume plus, une image absente ou un joystick qui dérive sont de bons points de départ.'}, {title: 'Un diagnostic avant votre décision', body: 'L’atelier examine l’appareil et précise la réparation envisagée et son prix. Lorsque la réparation est possible, vous pouvez accepter ou refuser la proposition depuis votre dossier.'}, {title: 'Un suivi au même endroit', body: 'Retrouvez la fiche d’envoi, les étapes du dossier et les échanges utiles dans votre espace client. Attendez les indications de l’atelier pour organiser la récupération ou le retour.'}],
    guides: consoleGuides,
  },
  ...consoleBrands,
  {
    pathname: '/consoles/contact-consoles-retro/', type: 'retro', title: 'Réparation de consoles rétro | RépaRapid · Maxxi Games',
    description: 'Game Boy, NES, Super Nintendo, Mega Drive, Dreamcast ou PlayStation : décrivez les symptômes de votre console rétro à l’atelier Maxxi Games au Kremlin-Bicêtre.',
    heading: 'Les anciennes consoles ont encore leur place.', eyebrow: 'CONSOLES RÉTRO',
    introduction: 'Une cartouche non reconnue, une image instable ou une sauvegarde disparue demandent des vérifications différentes. L’état de l’appareil, son alimentation et les modifications déjà réalisées comptent autant que son âge.',
    models: ['Game Boy · Game Boy Advance', 'NES · Super Nintendo · Nintendo 64', 'Mega Drive · Game Gear · Dreamcast', 'PlayStation · PlayStation 2'],
    sections: [{title: 'Décrire l’ensemble utilisé', body: 'Indiquez la console, la région si vous la connaissez, l’alimentation et le câble vidéo. Un écran récent, un adaptateur et un jeu d’une autre région peuvent modifier le comportement observé.'}, {title: 'Préserver les connecteurs et les piles', body: 'Ne soufflez pas dans les cartouches et ne grattez pas les contacts. Si une pile a coulé ou si une batterie est déformée, arrêtez l’utilisation et signalez-le avant tout envoi.'}, {title: 'Signaler l’historique de la console', body: 'Mentionnez les ouvertures, réparations ou modifications connues. Selon l’état et la disponibilité des pièces, l’atelier vous indique les possibilités après examen ; une remise en état n’est pas systématique.'}],
    guides: [{slug: 'game-boy-cartouche-ne-demarre-pas', title: 'Game Boy : une cartouche qui ne démarre pas'}, {slug: 'super-nintendo-sauvegarde-disparait', title: 'Super Nintendo : comprendre une sauvegarde disparue'}, {slug: 'dreamcast-jeux-non-lus', title: 'Dreamcast : vérifier les jeux qui ne sont plus lus'}],
  },
  {
    pathname: '/accueil/smartphones/', type: 'smartphones', title: 'Réparation de smartphones | RépaRapid · Maxxi Games',
    description: 'iPhone, Samsung, Xiaomi, Huawei, Google et autres smartphones : repérez votre modèle et contactez RépaRapid · Maxxi Games pour préparer un diagnostic.',
    heading: 'Votre téléphone, regardons cela de plus près.', eyebrow: 'SMARTPHONES',
    introduction: 'Un écran abîmé, une charge impossible ou une batterie qui ne tient plus ? Commencez par le modèle exact et les symptômes. Contactez le magasin pour confirmer les possibilités de prise en charge avant tout déplacement ou envoi.',
    sections: [{title: 'Le nom complet du modèle', body: 'Dans les paramètres, sur la boîte ou sur une facture, recherchez le nom et la référence. Les mentions Pro, Lite, Plus ou 5G peuvent changer la pièce nécessaire.'}, {title: 'Ce qui fonctionne encore', body: 'L’appareil sonne-t-il malgré un écran noir ? Charge-t-il avec un autre câble ? Décrire les fonctions encore présentes permet de mieux préparer l’examen.'}, {title: 'Vos données avant tout', body: 'Sauvegardez ce qui peut l’être avant un dépôt. Ne transmettez pas de mot de passe, de code de déverrouillage ou de document personnel dans votre premier message.'}],
    guides: phoneGuides,
  },
  ...phonePages,
  {
    pathname: '/tablettes/', type: 'tablets', title: 'Réparation de tablettes iPad et Android au Kremlin-Bicêtre',
    description: 'Écran, batterie, charge ou démarrage d’une tablette iPad ou Android : préparez les informations utiles et contactez l’atelier RépaRapid · Maxxi Games.',
    heading: 'Un grand écran. Des symptômes à préciser.', eyebrow: 'TABLETTES IPAD ET ANDROID',
    introduction: 'Pour une tablette qui ne charge plus ou dont l’écran est endommagé, relevez la référence exacte avant de contacter Maxxi Games. La taille d’écran et le nom de la gamme ne suffisent pas toujours à identifier les pièces.',
    models: ['iPad · iPad Air · iPad mini · iPad Pro', 'Samsung Galaxy Tab', 'Autres tablettes Android : référence à confirmer'],
    sections: [{title: 'Identifier la version', body: 'Relevez le numéro de modèle dans les paramètres ou sur le boîtier. Précisez la présence d’une connexion mobile et la génération si vous la connaissez, sans publier le numéro de série.'}, {title: 'Distinguer vitre, image et tactile', body: 'Une vitre cassée peut coexister avec une image normale ; un écran noir peut aussi laisser des sons audibles. Notez séparément l’état de l’affichage et la réponse au toucher.'}, {title: 'Préparer le diagnostic', body: 'Indiquez les chargeurs essayés et l’autonomie observée. Sauvegardez les données si possible. Si l’écran se soulève ou si la coque se déforme, arrêtez la charge et contactez le magasin avant tout transport.'}],
  },
  {
    pathname: '/a-propos/', type: 'about', title: 'À propos de RépaRapid, l’atelier de Maxxi Games',
    description: 'Découvrez RépaRapid, le service de réparation exploité par VESTY GAMES 3 sous l’enseigne Maxxi Games, au 30 bis avenue de Fontainebleau au Kremlin-Bicêtre.',
    heading: 'Un site. Et un véritable atelier derrière.', eyebrow: 'RÉPARAPID · MAXXI GAMES',
    introduction: 'RépaRapid est le service de réparation de Maxxi Games au Kremlin-Bicêtre. Le site vous aide à décrire la panne de votre console, à préparer son envoi et à suivre les décisions liées à votre dossier.',
    sections: [{title: 'Un interlocuteur identifiable', body: 'Le service est exploité par VESTY GAMES 3, sous l’enseigne Maxxi Games. Vous pouvez joindre le magasin par téléphone, par e-mail ou à son adresse au Kremlin-Bicêtre.'}, {title: 'Une réparation expliquée', body: 'Le diagnostic sert à préciser la panne, la solution envisagée et son montant. Lorsqu’une proposition est disponible, votre dossier vous permet de consulter les conditions et de communiquer votre décision.'}, {title: 'Votre appareil, votre choix', body: 'La suite dépend de l’état de l’appareil et de votre accord. En cas de réparation refusée ou impossible, les modalités de restitution sont précisées par le magasin ; les frais éventuels sont indiqués dans le dossier.'}],
  },
  {
    pathname: '/accueil/blog/', type: 'blog', title: 'Conseils et tutoriels de réparation | Le blog RépaRapid',
    description: 'Les conseils RépaRapid pour comprendre les pannes de consoles et de smartphones, préparer une demande de réparation et découvrir l’atelier Maxxi Games.',
    heading: 'Comprendre la panne avant de se lancer.', eyebrow: 'CONSEILS ET VIE DE L’ATELIER',
    introduction: 'Une panne ne se résume pas toujours à une pièce à remplacer. Nos tutoriels vous aident à observer les symptômes, à commencer par les vérifications adaptées et à savoir quand passer le relais à un atelier.',
    sections: [{title: 'Commencer par les contrôles extérieurs', body: 'Un câble, un adaptateur ou un réglage peut expliquer certains symptômes. Consultez le guide du modèle avant un démontage et notez les résultats de chaque essai.'}, {title: 'Respecter les limites du tutoriel', body: 'Les étapes dépendent du modèle exact et du matériel nécessaire. Une batterie déformée, une odeur anormale ou un appareil mouillé demande d’arrêter les essais et de contacter un professionnel.'}, {title: 'Préparer un échange utile', body: 'Mentionnez la référence de l’appareil, les messages affichés et les essais déjà faits. Une description courte et précise aide davantage qu’une supposition sur le composant à remplacer.'}],
    guides: [...consoleGuides, ...phoneGuides],
  },
  {
    pathname: '/petit-apercu/', type: 'workshop', title: 'Un aperçu de l’atelier RépaRapid · Maxxi Games',
    description: 'Retrouvez les photos du magasin et de l’atelier Maxxi Games au Kremlin-Bicêtre, ainsi que les informations pour préparer votre dossier de réparation RépaRapid.',
    heading: 'Derrière votre dossier, notre établi.', eyebrow: 'UN APERÇU DE MAXXI GAMES',
    introduction: 'Le parcours commence en ligne et se poursuit au magasin. Voici la devanture de Maxxi Games et l’espace atelier : des repères concrets pour savoir à qui vous confiez votre appareil.',
    sections: [{title: 'Avant l’arrivée', body: 'Pour une console, créez votre demande puis consultez les indications et la fiche d’envoi de votre dossier. Pour un téléphone ou une tablette, prenez d’abord contact avec le magasin.'}, {title: 'Au moment du diagnostic', body: 'L’atelier précise la panne et les possibilités d’intervention après examen. La réception de l’appareil ne signifie pas qu’une réparation est déjà validée.'}, {title: 'Pour la suite', body: 'Consultez les propositions et l’état de votre dossier dans votre espace client. Convenez avec l’atelier des modalités de retrait ou de retour lorsque l’appareil est prêt.'}],
  },
  {
    pathname: '/politique-de-cookies-ue/', type: 'cookies', title: 'Cookies et fonctionnement du site | RépaRapid',
    description: 'Informations sur les cookies de connexion, les liens vers des services tiers et les réglages du navigateur pour le site RépaRapid de Maxxi Games.',
    heading: 'Cookies : comprendre ce que fait le site.', eyebrow: 'INFORMATIONS ET CONFIDENTIALITÉ',
    introduction: 'Cette page décrit le fonctionnement de cette version de RépaRapid. Les cookies de connexion servent à accéder aux espaces protégés ; les pages informatives restent consultables sans créer de compte.',
    sections: [
      {title: 'Les cookies de connexion', body: 'Lorsque vous vous connectez à votre espace client ou à l’accès magasin, un cookie de session permet au serveur de reconnaître votre connexion. Il sert au fonctionnement de l’espace protégé et ne contient pas le contenu de votre dossier. La déconnexion met fin à la session concernée.'},
      {title: 'Les pages et liens externes', body: 'Cette version du site n’intègre pas de module publicitaire ni de widget social. Les liens d’itinéraire, de réseaux sociaux ou de documentation ouvrent des services distincts, qui appliquent leur propre politique lors de votre visite. Les photos du magasin sont servies par le site, sans lecteur social intégré.'},
      {title: 'Les réglages de votre navigateur', body: 'Vous pouvez consulter et supprimer les cookies dans les paramètres de votre navigateur, ou les bloquer. Le blocage des cookies nécessaires empêche le maintien de la connexion et peut rendre l’espace client ou magasin inutilisable. Il ne supprime pas les informations de votre dossier conservées par l’atelier.'},
      {title: 'Une question sur vos données ?', body: 'RépaRapid est exploité par VESTY GAMES 3, sous l’enseigne Maxxi Games. Les mentions légales et les conditions d’utilisation complètent ces informations. Pour toute question relative à vos données, contactez le magasin à contact@reparapid.fr sans joindre de mot de passe ni de document sensible.'},
    ],
  },
];

export const legacyContentMetadata = Object.freeze(content.map(({pathname, type, title, description}) => Object.freeze({pathname, type, title, description})));

function Brand({footer = false}: {footer?: boolean}) {
  return <a className="rl-brand" href="/" aria-label="RépaRapid, accueil"><img src="/reparapid-logo-original.webp" width="300" height="300" alt=""/><span>RépaRapid{footer && <small>L’atelier de réparation de Maxxi Games</small>}</span></a>;
}
function Shell({page, children}: {page: LegacyContent; children: ReactNode}) {
  const nav = [{href: '/', label: 'Accueil'}, {href: '/consoles/', label: 'Consoles'}, {href: '/accueil/smartphones/', label: 'Smartphones'}, {href: '/guides/', label: 'Guides'}, {href: CONTACT, label: 'Contact'}];
  return <div className="reparapid-site rp-legacy"><a className="rl-skip" href="#rl-main">Aller au contenu</a><div className="rl-topline"><div className="rl-shell"><span>Réparation · Le Kremlin-Bicêtre</span><a href="/#/connexion">Accès magasin <span aria-hidden="true">↗</span></a></div></div><header className="rl-header"><div className="rl-shell"><Brand/><nav aria-label="Navigation du site">{nav.map(item => <a href={item.href} key={item.href} aria-current={item.href === page.pathname ? 'page' : undefined}>{item.label}</a>)}</nav><a className="rl-account" href="/#/espace-client">Mon espace client <span aria-hidden="true">↗</span></a></div></header>{children}<footer className="rl-footer"><div className="rl-shell"><div className="rl-footer-main"><div><Brand footer/><p>RépaRapid est exploité par VESTY GAMES 3,<br/>sous l’enseigne Maxxi Games.</p><img className="rl-maxxi-logo" src="/maxxi-games-logo-original.png" width="500" height="500" loading="lazy" alt="Maxxi Games"/></div><nav aria-label="L’atelier"><strong>L’atelier</strong><a href="/a-propos/">À propos de RépaRapid</a><a href="/petit-apercu/">Un aperçu du magasin</a><a href={CONTACT}>Nous contacter</a><a href="/accueil/blog/">Conseils et tutoriels</a></nav><nav aria-label="Les appareils"><strong>Votre appareil</strong><a href="/consoles/">Consoles</a><a href="/accueil/smartphones/">Smartphones</a><a href="/tablettes/">Tablettes</a><a href="/#/espace-client">Suivre ma réparation</a></nav></div><div className="rl-footer-bottom"><span>© {LEGACY_PUBLISHED_DATE.slice(0, 4)} Maxxi Games · VESTY GAMES 3</span><nav aria-label="Informations légales"><a href="/#/cgu">CGU</a><a href="/#/cgv">CGV</a><a href="/#/mentions-legales">Mentions légales</a><a href="/politique-de-cookies-ue/">Cookies</a><a href="/#/retractation">Rétractation</a></nav></div><p className="rl-independence">Les marques et modèles identifient les appareils. RépaRapid est un service indépendant des fabricants.</p></div></footer></div>;
}
function parentFor(page: LegacyContent) {
  if (page.type === 'console-brand' || page.type === 'retro') return {href: '/consoles/', label: 'Consoles'};
  if (page.type === 'phone-brand') return {href: '/accueil/smartphones/', label: 'Smartphones'};
  return undefined;
}
function Breadcrumb({page}: {page: LegacyContent}) {
  const parent = parentFor(page);
  const label = page.brand || ({consoles: 'Consoles', retro: 'Consoles rétro', smartphones: 'Smartphones', tablets: 'Tablettes', about: 'À propos', blog: 'Conseils', workshop: 'L’atelier', cookies: 'Cookies'} as Partial<Record<PageType, string>>)[page.type];
  return <nav className="rl-breadcrumb rl-shell" aria-label="Fil d’Ariane"><ol><li><a href="/">Accueil</a></li>{parent && <li><a href={parent.href}>{parent.label}</a></li>}<li><span aria-current="page">{label}</span></li></ol></nav>;
}
const consolePage = (page: LegacyContent) => ['consoles', 'console-brand', 'retro'].includes(page.type);
function DeviceDrawing({tablet = false}: {tablet?: boolean}) {
  return <svg className="rl-device-drawing" viewBox="0 0 420 300" width="420" height="300" aria-hidden="true" focusable="false"><ellipse cx="208" cy="268" rx="136" ry="12" fill="#000" opacity=".08"/>{tablet ? <><rect x="63" y="43" width="294" height="214" rx="19" fill="#f6f3f0" stroke="#8e969f" strokeWidth="3"/><rect x="76" y="56" width="268" height="188" rx="9" fill="#273a49"/><path d="m76 192 186-136h82v72L190 244H76z" fill="#587783" opacity=".6"/><path d="m76 112 80-56h49L76 151z" fill="#d7e9e9" opacity=".12"/><circle cx="210" cy="49" r="2" fill="#555"/></> : <><g transform="rotate(10 264 147)"><rect x="218" y="27" width="110" height="228" rx="21" fill="#c9d4d7" stroke="#819198" strokeWidth="2"/><rect x="229" y="39" width="45" height="62" rx="12" fill="#b1c1c5"/><circle cx="242" cy="53" r="8" fill="#344956"/><circle cx="261" cy="71" r="8" fill="#344956"/><circle cx="242" cy="87" r="8" fill="#344956"/><circle cx="263" cy="49" r="3" fill="#faf2d8"/></g><g transform="rotate(-8 158 149)"><rect x="94" y="28" width="121" height="235" rx="22" fill="#2c3943" stroke="#8c9aa4" strokeWidth="2"/><rect x="101" y="35" width="107" height="221" rx="16" fill="#243f50"/><path d="m101 191 107-133v121l-59 77h-48z" fill="#5a7f8a" opacity=".65"/><path d="m101 109 61-74h38L101 159z" fill="#c5d7d8" opacity=".15"/><rect x="137" y="41" width="35" height="9" rx="5" fill="#101c27"/><path d="M142 245h26" stroke="#d0dee4" strokeWidth="3" strokeLinecap="round"/></g></>}<path d="m356 32 5 13 14 5-14 5-5 14-5-14-14-5 14-5z" fill="#b21414" opacity=".7"/><circle cx="62" cy="224" r="5" fill="#b21414" opacity=".25"/></svg>;
}
function HeroArt({page}: {page: LegacyContent}) {
  if (['about', 'blog', 'workshop'].includes(page.type)) {
    const workshop = page.type === 'workshop';
    return <figure className="rl-hero-photo"><img src={workshop ? '/maxxi-games-atelier.jpg' : '/maxxi-games-devanture.jpg'} width="1000" height="750" alt={workshop ? 'L’espace atelier de Maxxi Games au Kremlin-Bicêtre' : 'La devanture du magasin Maxxi Games au Kremlin-Bicêtre'}/><figcaption>Maxxi Games <span>Le Kremlin-Bicêtre</span></figcaption></figure>;
  }
  if (page.type === 'cookies') return <div className="rl-privacy-art" aria-hidden="true"><svg width="100" height="110" viewBox="0 0 100 110" fill="none"><path d="M50 7 88 22v31c0 22-14 39-38 50C26 92 12 75 12 53V22z" stroke="currentColor" strokeWidth="2"/><rect x="34" y="47" width="32" height="27" rx="5" stroke="currentColor" strokeWidth="2"/><path d="M41 47v-8a9 9 0 0 1 18 0v8" stroke="currentColor" strokeWidth="2"/><circle cx="50" cy="59" r="3" fill="currentColor"/></svg><span>Votre connexion.<br/>Votre espace.</span></div>;
  const model = page.brand === 'Nintendo' ? 'Nintendo Switch' : page.brand === 'Microsoft' ? 'Xbox Series X' : page.type === 'retro' ? 'Super Nintendo' : 'PlayStation 5';
  return <div className="rl-hero-art">{consolePage(page) ? <ShopConsoleArt item={{brand: page.brand || (page.type === 'retro' ? 'Nintendo' : 'Sony'), model}}/> : <DeviceDrawing tablet={page.type === 'tablets'}/>}<span className="rl-art-caption">{consolePage(page) ? 'Une console, un dossier, un suivi.' : 'Le modèle exact fait la différence.'}</span></div>;
}
function Hero({page}: {page: LegacyContent}) {
  const isConsole = consolePage(page);
  const request = isConsole ? REQUEST + (page.brand ? `?marque=${encodeURIComponent(page.brand)}` : '') : CONTACT;
  const isCookies = page.type === 'cookies';
  return <><Breadcrumb page={page}/><section className="rl-hero rl-shell"><div className="rl-hero-copy"><span className="rl-eyebrow">{page.eyebrow}</span><h1>{page.heading}</h1><p>{page.introduction}</p>{!isCookies && <div className="rl-actions"><a className="rl-button rl-primary" href={request}>{isConsole ? 'Demander une réparation' : 'Contacter le magasin'} <span aria-hidden="true">→</span></a><a className="rl-text-link" href={isConsole ? '/guides/consoles/' : page.type === 'phone-brand' || page.type === 'smartphones' ? '/guides/smartphones/' : '/guides/'}>Consulter les guides <span aria-hidden="true">↗</span></a></div>}{['smartphones', 'phone-brand', 'tablets'].includes(page.type) && <p className="rl-hero-note">La prise en charge de cet appareil se prépare directement avec le magasin.</p>}</div><HeroArt page={page}/></section></>;
}
function SectionHeading({eyebrow, title, children}: {eyebrow: string; title: string; children?: ReactNode}) {
  return <div className="rl-section-heading"><div><span className="rl-eyebrow">{eyebrow}</span><h2>{title}</h2></div>{children && <p>{children}</p>}</div>;
}
function DeviceCategories({phones = false}: {phones?: boolean}) {
  const cards = phones ? phonePages : consoleBrands;
  return <section className="rl-section rl-shell" aria-labelledby="rl-device-title"><div className="rl-section-heading"><div><span className="rl-eyebrow">COMMENCEZ PAR VOTRE APPAREIL</span><h2 id="rl-device-title">{phones ? 'Quelle marque de smartphone ?' : 'Quelle console souhaitez-vous réparer ?'}</h2></div></div><div className={`rl-category-grid${phones ? ' rl-phone-grid' : ''}`}>{cards.map(page => <a className="rl-category-card" href={page.pathname} key={page.pathname}>{!phones && <div className="rl-category-art"><ShopConsoleArt item={{brand: page.brand || '', model: page.brand === 'Nintendo' ? 'Nintendo Switch' : page.brand === 'Sony' ? 'PlayStation 5' : 'Xbox Series X'}}/></div>}<div className="rl-category-copy"><h3>{page.brand === 'Sony' ? 'PlayStation' : page.brand === 'Microsoft' ? 'Xbox' : page.brand}</h3><p>{page.models?.slice(0, phones ? 2 : 3).join(' · ')}</p><span className="rl-card-link">Voir les informations <span aria-hidden="true">→</span></span></div></a>)}</div>{!phones && <a className="rl-retro-link" href="/consoles/contact-consoles-retro/"><div><strong>Une console plus ancienne ?</strong><span>Game Boy, Super Nintendo, Mega Drive, Dreamcast…</span></div><span>Découvrir la prise en charge rétro <span aria-hidden="true">→</span></span></a>}</section>;
}
function Information({page}: {page: LegacyContent}) {
  const cookies = page.type === 'cookies';
  return <section className={`rl-information${cookies ? ' rl-information-legal' : ''}`}><div className="rl-shell"><SectionHeading eyebrow={cookies ? 'FONCTIONNEMENT DU SITE' : 'POUR BIEN PRÉPARER LA SUITE'} title={cookies ? 'Des usages à distinguer.' : page.type === 'about' ? 'Un parcours lisible, des décisions claires.' : page.type === 'workshop' ? 'De votre demande à votre appareil.' : 'Les informations qui font avancer le diagnostic.'}/>{page.models && <div className="rl-models" aria-label="Exemples de familles et de modèles">{page.models.map(model => <span key={model}>{model}</span>)}</div>}<div className="rl-info-grid">{page.sections.map((section, index) => <article key={section.title}><span className="rl-info-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><h3>{section.title}</h3><p>{section.body}</p>{section.points && <ul>{section.points.map(point => <li key={point}>{point}</li>)}</ul>}</article>)}</div>{cookies && <p className="rl-updated">Version du <time dateTime={LEGACY_PUBLISHED_DATE}>{new Date(`${LEGACY_PUBLISHED_DATE}T12:00:00Z`).toLocaleDateString('fr-FR', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'})}</time>.</p>}</div></section>;
}
function PhotoStory({page}: {page: LegacyContent}) {
  return <section className="rl-section rl-shell"><SectionHeading eyebrow="À L’ATELIER MAXXI GAMES" title={page.type === 'about' ? 'Une adresse, un contact, un atelier.' : 'Des repères avant de nous confier votre appareil.'}>Les photos du magasin et de l’atelier au Kremlin-Bicêtre.</SectionHeading><div className="rl-photo-grid"><figure><img src="/maxxi-games-devanture.jpg" width="1000" height="750" loading="lazy" alt="La devanture du magasin Maxxi Games, avenue de Fontainebleau"/><figcaption><strong>Le magasin</strong><span>{ADDRESS}, {CITY}.</span></figcaption></figure><figure><img src="/maxxi-games-atelier.jpg" width="1000" height="750" loading="lazy" alt="L’espace de travail de l’atelier Maxxi Games"/><figcaption><strong>L’atelier</strong><span>Le diagnostic précise l’intervention adaptée à l’appareil.</span></figcaption></figure></div></section>;
}
function Guides({guides}: {guides: readonly GuideLink[]}) {
  return <section className="rl-section rl-shell"><SectionHeading eyebrow="OBSERVER AVANT D’INTERVENIR" title="Des guides pour y voir plus clair.">Choisissez toujours le modèle exact et lisez les limites de l’intervention avant de commencer.</SectionHeading><div className="rl-guide-grid">{guides.map((guide, index) => <a className="rl-guide-link" href={`/guides/${guide.slug}/`} key={guide.slug}><span className="rl-guide-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><h3>{guide.title}</h3><span>Lire le tutoriel <span aria-hidden="true">↗</span></span></a>)}</div><a className="rl-text-link rl-all-guides" href="/guides/">Voir tous les tutoriels <span aria-hidden="true">→</span></a></section>;
}
function ContactPanel({page}: {page: LegacyContent}) {
  return <section className="rl-contact"><div className="rl-shell"><div><span className="rl-eyebrow">RÉPARAPID · L’ATELIER DE MAXXI GAMES</span><h2>{consolePage(page) ? 'Votre demande commence ici.' : 'Une question sur votre appareil ?'}</h2><p>{consolePage(page) ? 'Choisissez votre console et décrivez la panne. Votre espace client regroupe ensuite la fiche d’envoi et le suivi.' : 'Indiquez le modèle exact et les symptômes. Le magasin vous précise les possibilités de prise en charge avant un dépôt ou un envoi.'}</p><a className="rl-button rl-light" href={consolePage(page) ? REQUEST : CONTACT}>{consolePage(page) ? 'Créer ma demande' : 'Échanger avec le magasin'} <span aria-hidden="true">→</span></a></div><address><strong>Maxxi Games</strong><span>{ADDRESS}<br/>{CITY}</span><a href="tel:+33158468251">{PHONE}</a><a href={`mailto:${EMAIL}`}>{EMAIL}</a></address></div></section>;
}
function Page({page}: {page: LegacyContent}) {
  return <Shell page={page}><main id="rl-main" tabIndex={-1}><Hero page={page}/>{page.type === 'consoles' && <DeviceCategories/>}{page.type === 'smartphones' && <DeviceCategories phones/>}<Information page={page}/>{['about', 'workshop'].includes(page.type) && <PhotoStory page={page}/>} {!!page.guides?.length && <Guides guides={page.guides}/>} {page.type === 'cookies' ? <section className="rl-legal-links rl-shell"><h2>Pour compléter ces informations</h2><a href="/#/mentions-legales">Mentions légales et données personnelles <span aria-hidden="true">→</span></a><a href="/#/cgu">Conditions générales d’utilisation <span aria-hidden="true">→</span></a><a href={`mailto:${EMAIL}`}>Contacter Maxxi Games <span aria-hidden="true">↗</span></a></section> : <ContactPanel page={page}/>}</main></Shell>;
}
function structuredData(page: LegacyContent) {
  const url = GUIDE_ORIGIN + page.pathname, parent = parentFor(page);
  const crumbs = [{'@type': 'ListItem', position: 1, name: 'Accueil', item: GUIDE_ORIGIN + '/'}];
  if (parent) crumbs.push({'@type': 'ListItem', position: 2, name: parent.label, item: GUIDE_ORIGIN + parent.href});
  crumbs.push({'@type': 'ListItem', position: crumbs.length + 1, name: page.brand || page.heading, item: url});
  const isCollection = ['consoles', 'smartphones', 'blog'].includes(page.type);
  const items = page.type === 'consoles' ? consoleBrands.map(item => ({name: item.brand, url: GUIDE_ORIGIN + item.pathname})) : page.type === 'smartphones' ? phonePages.map(item => ({name: item.brand, url: GUIDE_ORIGIN + item.pathname})) : (page.guides || []).map(item => ({name: item.title, url: `${GUIDE_ORIGIN}/guides/${item.slug}/`}));
  return {'@context': 'https://schema.org', '@graph': [
    {'@type': 'BreadcrumbList', itemListElement: crumbs},
    {'@type': isCollection ? 'CollectionPage' : page.type === 'about' ? 'AboutPage' : 'WebPage', '@id': url + '#page', url, name: page.title, description: page.description, inLanguage: 'fr-FR', dateModified: LEGACY_PUBLISHED_DATE, isPartOf: {'@type': 'WebSite', name: 'RépaRapid', url: GUIDE_ORIGIN + '/'}, about: {'@id': GUIDE_ORIGIN + '/#atelier'}, ...(isCollection ? {mainEntity: {'@type': 'ItemList', itemListElement: items.map((item, index) => ({'@type': 'ListItem', position: index + 1, ...item}))}} : {})},
    {'@type': 'LocalBusiness', '@id': GUIDE_ORIGIN + '/#atelier', name: 'RépaRapid · Maxxi Games', legalName: 'VESTY GAMES 3', url: GUIDE_ORIGIN + '/', telephone: '+33158468251', email: EMAIL, image: GUIDE_ORIGIN + '/maxxi-games-devanture.jpg', address: {'@type': 'PostalAddress', streetAddress: ADDRESS, postalCode: '94270', addressLocality: 'Le Kremlin-Bicêtre', addressCountry: 'FR'}},
  ]};
}
const escapeAttribute = (value: string) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
export function renderLegacyDocument({pathname, stylesheets}: {pathname: string; stylesheets: string[]}) {
  const page = content.find(item => item.pathname === pathname);
  if (!page) throw new Error(`Page historique introuvable : ${pathname}`);
  const title = page.title + ' | RépaRapid', canonical = GUIDE_ORIGIN + page.pathname;
  const body = renderToStaticMarkup(<Page page={page}/>);
  const json = JSON.stringify(structuredData(page)).replaceAll('<', '\\u003c');
  return `<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><meta name="theme-color" content="#a32720"/><title>${escapeAttribute(title)}</title><meta name="description" content="${escapeAttribute(page.description)}"/><meta name="robots" content="index,follow"/><link rel="canonical" href="${escapeAttribute(canonical)}"/><meta property="og:type" content="website"/><meta property="og:title" content="${escapeAttribute(title)}"/><meta property="og:description" content="${escapeAttribute(page.description)}"/><meta property="og:url" content="${escapeAttribute(canonical)}"/><meta property="og:image" content="${escapeAttribute(GUIDE_ORIGIN + '/maxxi-games-devanture.jpg')}"/><meta property="og:locale" content="fr_FR"/><meta property="og:site_name" content="RépaRapid"/><link rel="icon" type="image/png" href="/favicon-reparapid.png"/>${stylesheets.map(href => `<link rel="stylesheet" href="${escapeAttribute(href)}"/>`).join('')}<script type="application/ld+json">${json}</script></head><body>${body}</body></html>\n`;
}

export function validateLegacyContent() {
  const paths = content.map(page => page.pathname), manifestPaths = legacyPages.map(page => page.pathname);
  if (new Set(paths).size !== paths.length || paths.length !== manifestPaths.length || paths.some(path => !manifestPaths.includes(path))) throw new Error('Le contenu historique doit correspondre exactement au manifeste.');
  if (new Set(content.map(page => page.title)).size !== content.length || new Set(content.map(page => page.description)).size !== content.length) throw new Error('Chaque page historique doit avoir un titre et une description uniques.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(LEGACY_PUBLISHED_DATE) || !Number.isFinite(Date.parse(LEGACY_PUBLISHED_DATE))) throw new Error('Date des pages historiques invalide.');
  const guides = new Set(guideManifest.map(guide => guide.slug));
  for (const page of content) {
    if (!/^\/[a-z0-9/-]+\/$/.test(page.pathname) || !page.title.trim() || !page.description.trim() || !page.heading.trim() || !page.introduction.trim() || page.sections.length < 3) throw new Error(`Contenu historique incomplet : ${page.pathname}`);
    if (page.sections.some(section => !section.title.trim() || !section.body.trim())) throw new Error(`Section historique incomplète : ${page.pathname}`);
    if (page.guides?.some(guide => !guides.has(guide.slug) || !guide.title.trim()) || new Set(page.guides?.map(guide => guide.slug)).size !== (page.guides?.length || 0)) throw new Error(`Lien de tutoriel historique invalide : ${page.pathname}`);
    if ((page.type === 'console-brand' || page.type === 'phone-brand') && (!page.brand || !page.models?.length)) throw new Error(`Marque ou modèles manquants : ${page.pathname}`);
    const parent = parentFor(page);
    if (parent && !paths.includes(parent.href)) throw new Error(`Parent historique introuvable : ${page.pathname}`);
  }
}
