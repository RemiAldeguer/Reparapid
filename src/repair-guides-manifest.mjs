// Public URLs only. Article text is never bundled into the API Worker.
export const GUIDE_ORIGIN = 'https://reparapid.aldeguer-remi.workers.dev';
export const GUIDE_PUBLISHED_DATE = '2026-10-13';
const slugs = [
  'ps5-bruit-ventilateur-nettoyage',
  'ps4-disque-non-reconnu',
  'ps3-ecran-noir-sortie-video',
  'ps2-carte-memoire-sauvegarde',
  'ps1-jeu-saute-lecture-disque',
  'switch-ne-sallume-plus',
  'switch-oled-pas-image-tv',
  'switch-lite-joystick-gauche-drift',
  'ds-lite-remplacement-batterie',
  '3ds-circle-pad-calibration',
  'game-boy-cartouche-ne-demarre-pas',
  'gba-boutons-membrane',
  'xbox-one-alimentation-demarrage',
  'xbox-series-x-aucun-signal-hdmi',
  'xbox-series-s-surchauffe',
  'xbox-360-voyants-rouges',
  'psp-3000-remplacement-batterie',
  'ps-vita-bloquee-redemarrage',
  'dreamcast-jeux-non-lus',
  'game-gear-ecran-son-diagnostic',
  'mega-drive-manette-port-controleur',
  'super-nintendo-sauvegarde-disparait',
  'nes-voyant-clignotant-cartouche',
  'steam-deck-bloque-charge-redemarrage',
];
export const guideManifest = Object.freeze(slugs.map(slug => Object.freeze({
  slug,
  pathname: `/guides/${slug}/`,
  filename: `guides/${slug}/index.html`,
})));
export const guideCatalog = Object.freeze({pathname: '/guides/', filename: 'guides/index.html'});
