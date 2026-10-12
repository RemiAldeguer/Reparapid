import type {Illustration} from './domain';

/** The same miniature can be used with an inventory item or the client's public view. */
export type ConsoleVisualItem = {model: string; variant?: string; brand?: string; illustration?: Illustration};
export type ConsoleKind =
  | 'gameboy' | 'gameboy-pocket' | 'gameboy-light' | 'gameboy-color'
  | 'advance' | 'advance-sp' | 'micro' | 'ds' | 'ds-lite' | 'dsi' | 'dsi-xl'
  | '3ds' | '3ds-xl' | 'new-3ds' | 'new-3ds-xl' | '2ds' | 'new-2ds-xl'
  | 'switch-lite' | 'switch' | 'psp' | 'nes' | 'snes' | 'n64' | 'gamecube' | 'wii' | 'wii-u'
  | 'controller-nes' | 'controller-snes' | 'controller-n64' | 'controller-gamecube'
  | 'controller-classic' | 'controller-pro' | 'wii-remote' | 'nunchuk' | 'wii-u-gamepad'
  | 'joy-con-left' | 'joy-con-right' | 'joy-con-pair'
  | 'playstation' | 'megadrive' | 'dreamcast' | 'gamegear';
export type ConsoleAppearance = {
  kind: ConsoleKind;
  shell: string; shellDark: string; shellLight: string; controls: string; buttons: string;
  colorLabel: string; screen: string; left?: string; right?: string;
};

type Color = {label: string; hex: string; names: string[]};
const colors: Record<string, Color> = {
  transparent: {label: 'Transparent', hex: '#c5d0cb', names: ['transparent', 'transparente', 'clear', 'crystal', 'cristal']},
  atomic: {label: 'Violet transparent', hex: '#9988b3', names: ['atomic purple', 'violet transparent', 'violet translucide']},
  glacier: {label: 'Bleu glacier', hex: '#a5bdd4', names: ['glacier', 'ice blue', 'bleu glace', 'bleu glacier']},
  black: {label: 'Noir', hex: '#353d42', names: ['noir', 'noire', 'black', 'onyx', 'charcoal', 'graphite', 'ebene']},
  white: {label: 'Blanc', hex: '#edeae2', names: ['blanc', 'blanche', 'white', 'ivoire', 'ivory']},
  silver: {label: 'Argent', hex: '#b2bbc2', names: ['argent', 'argentee', 'argente', 'silver', 'platinum', 'platine']},
  grey: {label: 'Gris', hex: '#b8bab9', names: ['gris', 'grise', 'grey', 'gray']},
  indigo: {label: 'Indigo', hex: '#6a61a7', names: ['indigo']},
  purple: {label: 'Violet', hex: '#7f6ca8', names: ['violet', 'violette', 'purple', 'mauve', 'grape', 'raisin']},
  navy: {label: 'Bleu marine', hex: '#3e527c', names: ['bleu marine', 'navy', 'midnight blue', 'bleu nuit']},
  blue: {label: 'Bleu', hex: '#5085b3', names: ['bleu', 'bleue', 'blue', 'cobalt', 'azur', 'azure']},
  turquoise: {label: 'Turquoise', hex: '#64aaa8', names: ['turquoise', 'teal', 'aqua', 'cyan', 'sarcelle']},
  green: {label: 'Vert', hex: '#86aa6d', names: ['vert', 'verte', 'green', 'kiwi', 'lime', 'menthe', 'mint']},
  yellow: {label: 'Jaune', hex: '#e3c459', names: ['jaune', 'yellow', 'dandelion', 'pikachu']},
  burgundy: {label: 'Bordeaux', hex: '#874b58', names: ['bordeaux', 'burgundy', 'wine', 'berry', 'lie de vin']},
  coral: {label: 'Corail', hex: '#dc8e86', names: ['corail', 'coral', 'salmon', 'saumon']},
  red: {label: 'Rouge', hex: '#c65e5b', names: ['rouge', 'red', 'crimson', 'carmesin']},
  pink: {label: 'Rose', hex: '#d3a0ba', names: ['rose', 'pink', 'fuchsia', 'magenta']},
  orange: {label: 'Orange', hex: '#d79958', names: ['orange', 'spice', 'epice']},
  gold: {label: 'Doré', hex: '#c8ad76', names: ['dore', 'doree', 'gold', 'golden', 'or']},
};

const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const phrasePattern = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '[\\s-]+');
const wholePhrase = (value: string) => new RegExp(`(^|[^a-z0-9_])(${phrasePattern(value)})(?=$|[^a-z0-9_])`, 'g');

/** Do not interpret a colour embedded in an opaque identifier as a shell colour. */
function partOfCode(text: string, start: number, end: number) {
  const before = text.slice(0, start).match(/[^\s·,;()\/]*$/)?.[0] ?? '';
  const after = text.slice(end).match(/^[^\s·,;()\/]*/)?.[0] ?? '';
  const token = before + text.slice(start, end) + after;
  return /\d/.test(token) && /^[a-z0-9_-]+$/.test(token) && /[_-]/.test(token);
}

function mentionedColors(value: string): Color[] {
  const text = normalized(value);
  const matches: {start: number; end: number; color: Color}[] = [];
  for (const color of Object.values(colors)) for (const name of color.names) {
    for (const match of text.matchAll(wholePhrase(name))) {
      const start = match.index! + match[1].length;
      const end = start + match[2].length;
      if (!partOfCode(text, start, end)) matches.push({start, end, color});
    }
  }
  // A specific name such as "atomic purple" wins over the generic "purple" inside it.
  matches.sort((a, b) => a.start - b.start || b.end - a.end);
  const result: Color[] = [];
  let consumed = -1;
  for (const match of matches) if (match.start >= consumed) {
    consumed = match.end;
    if (!result.includes(match.color)) result.push(match.color);
  }
  return result;
}

function kindFor(item: ConsoleVisualItem): ConsoleKind {
  const model = normalized(item.model);
  const is = (pattern: string) => new RegExp(`(^|[^a-z0-9])(?:${pattern})(?=$|[^a-z0-9])`).test(model);
  // Accessories must resolve before their console's name ("Manette Pro Switch" has no screen).
  if (is('joy[ -]*con(?:[ -]*2)?')) {
    if (is('gauche|left|l')) return 'joy-con-left';
    if (is('droit|droite|right|r')) return 'joy-con-right';
    return 'joy-con-pair';
  }
  if (is('nunchu[ck]k?')) return 'nunchuk';
  if (is('wii[ -]*u') && is('game[ -]*pad')) return 'wii-u-gamepad';
  if (is('wii[ -]*remote|wiimote|telecommande[ -]*wii')) return 'wii-remote';
  const controller = is('manette|controller|controleur');
  if (controller && is('super[ -]*(?:nintendo|nes|famicom)|snes')) return 'controller-snes';
  if (controller && is('nes|famicom')) return 'controller-nes';
  if (controller && is('nintendo[ -]*64|n64')) return 'controller-n64';
  if (controller && is('game[ -]*cube|ngc')) return 'controller-gamecube';
  if (is('wii') && is('classique|classic')) return 'controller-classic';
  if (is('switch|wii[ -]*u') && (controller || is('pro'))) return 'controller-pro';
  // More specific revisions must come first (New 2DS XL is a clamshell, 2DS is not).
  if (is('new[ -]*(?:nintendo[ -]*)?2[ -]*ds[ -]*(?:xl|ll)')) return 'new-2ds-xl';
  if (is('new[ -]*(?:nintendo[ -]*)?3[ -]*ds[ -]*(?:xl|ll)')) return 'new-3ds-xl';
  if (is('new[ -]*(?:nintendo[ -]*)?3[ -]*ds')) return 'new-3ds';
  if (is('3[ -]*ds[ -]*(?:xl|ll)')) return '3ds-xl';
  if (is('3[ -]*ds')) return '3ds';
  if (is('2[ -]*ds')) return '2ds';
  if (is('ds[ -]*i[ -]*(?:xl|ll)')) return 'dsi-xl';
  if (is('ds[ -]*i')) return 'dsi';
  if (is('ds[ -]*lite')) return 'ds-lite';
  if (is('ds')) return 'ds';
  if (is('(?:game[ -]*boy[ -]*advance|gba)[ -]*sp')) return 'advance-sp';
  if (is('game[ -]*boy[ -]*advance|gba')) return 'advance';
  if (is('game[ -]*boy[ -]*micro|gb[ -]*micro')) return 'micro';
  if (is('game[ -]*boy[ -]*color|gbc')) return 'gameboy-color';
  if (is('game[ -]*boy[ -]*pocket|gbp')) return 'gameboy-pocket';
  if (is('game[ -]*boy[ -]*light')) return 'gameboy-light';
  if (is('game[ -]*boy|dmg(?:[ -]*01)?')) return 'gameboy';
  if (is('switch[ -]*lite')) return 'switch-lite';
  if (is('switch')) return 'switch';
  if (is('psp|playstation[ -]*portable')) return 'psp';
  if (is('super[ -]*(?:nintendo|nes|famicom)|snes')) return 'snes';
  if (is('nes|famicom')) return 'nes';
  if (is('nintendo[ -]*64|n64')) return 'n64';
  if (is('game[ -]*cube|ngc')) return 'gamecube';
  if (is('wii[ -]*u')) return 'wii-u';
  if (is('wii')) return 'wii';
  if (is('playstation|ps[1-5]')) return 'playstation';
  if (is('mega[ -]*drive|genesis')) return 'megadrive';
  if (is('dreamcast')) return 'dreamcast';
  if (is('game[ -]*gear')) return 'gamegear';
  return item.illustration ?? 'gameboy';
}

const defaultColor: Record<ConsoleKind, string> = {
  gameboy: 'grey', 'gameboy-pocket': 'silver', 'gameboy-light': 'silver', 'gameboy-color': 'purple',
  advance: 'indigo', 'advance-sp': 'silver', micro: 'silver', ds: 'silver', 'ds-lite': 'white',
  dsi: 'black', 'dsi-xl': 'burgundy', '3ds': 'turquoise', '3ds-xl': 'blue', 'new-3ds': 'white',
  'new-3ds-xl': 'black', '2ds': 'blue', 'new-2ds-xl': 'black', 'switch-lite': 'turquoise',
  switch: 'black', psp: 'black', nes: 'grey', snes: 'grey', n64: 'black', gamecube: 'indigo', wii: 'white', 'wii-u': 'black',
  'controller-nes': 'grey', 'controller-snes': 'grey', 'controller-n64': 'grey', 'controller-gamecube': 'indigo',
  'controller-classic': 'white', 'controller-pro': 'black', 'wii-remote': 'white', nunchuk: 'white', 'wii-u-gamepad': 'black',
  'joy-con-left': 'blue', 'joy-con-right': 'red', 'joy-con-pair': 'black',
  playstation: 'grey', megadrive: 'black', dreamcast: 'white', gamegear: 'black',
};

function shade(hex: string, target: number, amount: number): string {
  const channels = [1, 3, 5].map(index => Math.round(parseInt(hex.slice(index, index + 2), 16) * (1 - amount) + target * amount));
  return '#' + channels.map(channel => channel.toString(16).padStart(2, '0')).join('');
}

export function consoleAppearance(item: ConsoleVisualItem): ConsoleAppearance {
  const kind = kindFor(item);
  const switch2 = /(^|[^a-z0-9])(?:switch|joy[ -]*con)[ -]*2(?=$|[^a-z0-9])/.test(normalized(item.model));
  const variantColors = mentionedColors(item.variant ?? '');
  const explicit = variantColors.length ? variantColors : mentionedColors(item.model);
  const primary = explicit[0] ?? colors[switch2 && kind.startsWith('joy-con-') ? 'black' : defaultColor[kind]];
  // The original DMG shell was warmer than a generic grey shell.
  const shell = kind === 'gameboy' && !explicit.length ? '#d6d5c7' : primary.hex;
  const controls = primary === colors.black ? '#657078' : '#35413e';
  let buttons = kind === 'gameboy' ? '#99556e' : controls;
  if (kind === 'switch-lite') buttons = '#edeae2';
  if (kind === 'controller-nes') buttons = colors.red.hex;
  if (kind === 'new-2ds-xl') buttons = explicit[1]?.hex ?? (explicit.length ? controls : colors.turquoise.hex);
  const monochrome = ['gameboy', 'gameboy-pocket', 'gameboy-light'].includes(kind);
  const appearance: ConsoleAppearance = {
    kind, shell, shellDark: shade(shell, 0, .19), shellLight: shade(shell, 255, .16), controls, buttons,
    colorLabel: explicit.length ? explicit.map(color => color.label).join(' et ') : primary.label,
    screen: monochrome ? (kind === 'gameboy-light' ? '#97c9a4' : '#a6b58b') : '#9fbbb3',
  };
  if (kind === 'switch' || kind === 'joy-con-pair') {
    appearance.left = explicit[0]?.hex ?? (switch2 ? colors.black.hex : '#56a5c5');
    appearance.right = explicit[1]?.hex ?? explicit[0]?.hex ?? (switch2 ? colors.black.hex : '#d96c61');
    if (!explicit.length) appearance.colorLabel = switch2 ? 'Noir' : kind==='switch' ? 'Joy-Con bleu et rouge' : 'Bleu et rouge';
  }
  return appearance;
}
