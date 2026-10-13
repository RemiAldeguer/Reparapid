import test from 'node:test';
import assert from 'node:assert/strict';
import {consoleAppearance, workshopConsoleArtItem} from '../src/console-appearance.ts';
import {shopConsoleKind} from '../src/shop-console-kind.ts';
import {INTAKE_MODELS} from '../src/repair-intake-domain.ts';

test('Nintendo handheld revisions resolve to their own silhouette', () => {
  const models = {
    'Game Boy': 'gameboy', 'Game Boy Pocket': 'gameboy-pocket', 'Game Boy Light': 'gameboy-light',
    'Game Boy Color': 'gameboy-color', 'Game Boy Advance': 'advance', 'Game Boy Advance SP': 'advance-sp',
    'Game Boy Micro': 'micro', 'Nintendo DS': 'ds', 'DS Lite': 'ds-lite', 'DSi': 'dsi', 'DSi XL': 'dsi-xl',
    '3DS': '3ds', 'Nintendo 3DS XL': '3ds-xl', 'New 3DS': 'new-3ds', 'New 3DS XL': 'new-3ds-xl',
    'Nintendo 2DS': '2ds', 'New 2DS XL': 'new-2ds-xl', 'Switch Lite': 'switch-lite', 'Nintendo Switch OLED': 'switch',
  };
  for (const [model, kind] of Object.entries(models)) assert.equal(consoleAppearance({model, illustration: 'gameboy'}).kind, kind, model);
});

test('A known model overrides a legacy family illustration and abbreviations are accepted', () => {
  assert.equal(consoleAppearance({model: 'PSP', illustration: 'switch'}).kind, 'psp');
  assert.equal(consoleAppearance({model: 'Sony PlayStation Portable'}).kind, 'psp');
  assert.equal(consoleAppearance({model: 'GBA SP'}).kind, 'advance-sp');
  assert.equal(consoleAppearance({model: 'GameBoy Color'}).kind, 'gameboy-color');
  assert.equal(consoleAppearance({model: 'New Nintendo 3DS XL'}).kind, 'new-3ds-xl');
});

test('Unrecognised models preserve the saved family while known home consoles resolve reliably', () => {
  for (const [model, kind] of [['Super Nintendo', 'snes'], ['PlayStation 2', 'playstation'], ['Mega Drive II', 'megadrive'], ['Dreamcast', 'dreamcast'], ['Game Gear', 'gamegear']]) {
    assert.equal(consoleAppearance({model, illustration: 'gameboy'}).kind, kind);
  }
  assert.equal(consoleAppearance({model: 'Atari 2600', illustration: 'megadrive'}).kind, 'megadrive');
  assert.equal(consoleAppearance({model: 'Prototype'}).kind, 'gameboy');
});

test('Colour names are insensitive to accents and case and variant colour wins over model colour', () => {
  const blue = consoleAppearance({model: 'DS Lite BLEUE'});
  assert.equal(blue.colorLabel, 'Bleu');
  const red = consoleAppearance({model: 'DS Lite blue', variant: 'ROUGE'});
  assert.equal(red.colorLabel, 'Rouge');
  assert.notEqual(red.shell, blue.shell);
  assert.equal(consoleAppearance({model: 'DS Lite', variant: 'Dorée'}).colorLabel, 'Doré');
  assert.equal(consoleAppearance({model: 'DS Lite', variant: 'argentée'}).colorLabel, 'Argent');
});

test('Official colour names in existing variants resolve without inferring colour from model codes', () => {
  assert.equal(consoleAppearance({model: 'Game Boy Color', variant: 'CGB-001 · Grape'}).colorLabel, 'Violet');
  assert.equal(consoleAppearance({model: 'PSP', variant: 'PSP-1004 · Piano Black'}).colorLabel, 'Noir');
  assert.equal(consoleAppearance({model: 'Game Boy Advance', variant: 'Atomic Purple'}).colorLabel, 'Violet transparent');
  assert.equal(consoleAppearance({model: 'Game Boy Advance', variant: 'Glacier'}).colorLabel, 'Bleu glacier');
  assert.equal(consoleAppearance({model: 'Game Boy Advance', variant: 'Bleu glacier'}).colorLabel, 'Bleu glacier');
  assert.equal(consoleAppearance({model: 'Game Boy Color', variant: 'Kiwi'}).colorLabel, 'Vert');
  assert.equal(consoleAppearance({model: 'DS Lite', variant: 'SNSP-001A'}).colorLabel, 'Blanc');
});

test('Opaque strings and partial words cannot accidentally choose a colour', () => {
  for (const variant of ['Blue123456', 'CRT-BLUE-001', 'Redesign', 'blueberry', 'blue_serial', 'Model X']) {
    assert.equal(consoleAppearance({model: 'DS Lite', variant}).colorLabel, 'Blanc', variant);
  }
  assert.equal(consoleAppearance({model: 'DS Lite Blue', variant: 'PAL · USG-001'}).colorLabel, 'Bleu');
});

test('Switch controllers have useful distinct defaults and respect explicit two-colour shells', () => {
  const defaults = consoleAppearance({model: 'Switch'});
  assert.notEqual(defaults.left, defaults.right);
  const pair = consoleAppearance({model: 'Switch', variant: 'Rouge et bleu'});
  assert.equal(pair.colorLabel, 'Rouge et Bleu');
  assert.equal(pair.left, consoleAppearance({model: 'DS Lite', variant: 'Rouge'}).shell);
  assert.equal(pair.right, consoleAppearance({model: 'DS Lite', variant: 'Bleu'}).shell);
  const white = consoleAppearance({model: 'Switch OLED', variant: 'Blanc'});
  assert.equal(white.left, white.right);
});

test('Screen palette distinguishes monochrome consoles and every appearance returns valid safe colours', () => {
  assert.notEqual(consoleAppearance({model: 'Game Boy'}).screen, consoleAppearance({model: 'Game Boy Color'}).screen);
  const monochrome = consoleAppearance({model: 'Game Boy'});
  const red = consoleAppearance({model: 'Game Boy', variant: 'rouge'});
  assert.equal(monochrome.buttons, red.buttons);
  for (const model of ['Game Boy', 'Game Boy Light', 'DS Lite', 'New 2DS XL', 'Switch', 'PSP']) {
    const appearance = consoleAppearance({model, variant: '<script>unknown</script>'});
    for (const field of ['shell', 'shellDark', 'shellLight', 'controls', 'buttons', 'screen']) assert.match(appearance[field], /^#[a-f0-9]{6}$/);
  }
});

test('Controllers take precedence over the console names and saved illustrations', () => {
  for (const [model, kind] of [
    ['Manette Pro Nintendo Switch', 'controller-pro'], ['Switch 2 Pro Controller', 'controller-pro'],
    ['Manette NES', 'controller-nes'], ['Super NES Controller', 'controller-snes'],
    ['Nintendo 64 Controller', 'controller-n64'], ['Manette GameCube', 'controller-gamecube'],
    ['Wii U GamePad', 'wii-u-gamepad'], ['Wii U Pro Controller', 'controller-pro'],
    ['Manette classique Pro Wii', 'controller-classic'], ['Télécommande Wii', 'wii-remote'],
    ['Nunchuck Wii', 'nunchuk'],
  ]) assert.equal(consoleAppearance({model, illustration: 'switch'}).kind, kind, model);
  assert.equal(consoleAppearance({model: 'Nintendo Switch 2'}).kind, 'switch');
  assert.equal(consoleAppearance({model: 'Wii U'}).kind, 'wii-u');
});

test('Joy-Con sides and pairs resolve independently of a Switch console mention', () => {
  assert.equal(consoleAppearance({model: 'Joy-Con Switch gauche'}).kind, 'joy-con-left');
  assert.equal(consoleAppearance({model: 'Nintendo Switch Joy-Con (R)'}).kind, 'joy-con-right');
  assert.equal(consoleAppearance({model: 'Paire de Joy-Con 2'}).kind, 'joy-con-pair');
  const pair = consoleAppearance({model: 'Paire de Joy-Con', variant: 'Rose et vert'});
  assert.equal(pair.left, consoleAppearance({model: 'Joy-Con gauche', variant: 'Rose'}).shell);
  assert.equal(pair.right, consoleAppearance({model: 'Joy-Con droit', variant: 'Vert'}).shell);
  assert.notEqual(consoleAppearance({model: 'Joy-Con gauche'}).shell, consoleAppearance({model: 'Joy-Con droit'}).shell);
  const secondGeneration = consoleAppearance({model: 'Paire de Joy-Con 2'});
  assert.equal(secondGeneration.left, secondGeneration.right);
  assert.equal(secondGeneration.colorLabel, 'Noir');
});

test('Nintendo home consoles and their controllers preserve independent colours and silhouettes', () => {
  assert.equal(consoleAppearance({model: 'NES'}).kind, 'nes');
  assert.equal(consoleAppearance({model: 'Nintendo 64'}).kind, 'n64');
  assert.equal(consoleAppearance({model: 'GameCube'}).kind, 'gamecube');
  assert.equal(consoleAppearance({model: 'Wii'}).kind, 'wii');
  const controller = consoleAppearance({model: 'Manette GameCube', variant: 'Orange'});
  assert.equal(controller.colorLabel, 'Orange');
  assert.equal(controller.shell, consoleAppearance({model: 'GameCube', variant: 'Orange'}).shell);
  assert.notEqual(controller.kind, consoleAppearance({model: 'GameCube', variant: 'Orange'}).kind);
  assert.equal(consoleAppearance({model: 'Wii Remote', variant: 'Noire'}).colorLabel, 'Noir');
});

test('Every intake catalogue model uses the same product silhouette in the workshop and storefront', () => {
  assert.equal(INTAKE_MODELS.length, 38);
  for (const item of INTAKE_MODELS) {
    const mapped = workshopConsoleArtItem(item);
    assert.ok(mapped, item.id);
    assert.equal(shopConsoleKind(mapped), shopConsoleKind(item), item.id);
  }
});

test('Workshop model aliases resolve to storefront art without losing brand or variant', () => {
  for (const [model, expected] of [
    ['PS 5 Digital Edition', 'ps5-digital'], ['PS5 Slim', 'ps5-slim'], ['PlayStation 5 Pro', 'ps5-pro'],
    ['PS4 Pro', 'ps4-pro'], ['PS2', 'ps2'], ['PS Vita', 'vita'], ['Sony PlayStation Portable', 'psp'],
    ['Microsoft Xbox Series X', 'xbox-series-x'], ['Xbox Series S', 'xbox-series-s'], ['Xbox One S', 'xbox-one-s'],
    ['Nintendo Switch OLED', 'switch-oled'], ['Switch 2', 'switch-2'], ['GameBoy Color', 'gameboy-color'],
    ['GBA SP', 'advance-sp'], ['New Nintendo 2DS XL', '2ds-xl'], ['New 3DS LL', '3ds-xl'],
    ['DS Lite', 'ds'], ['DSi XL', 'ds'], ['Super NES', 'snes'], ['Mega Drive II', 'megadrive'],
  ]) {
    const item = {model, brand: 'Marque saisie', variant: 'Édition saisie'};
    const mapped = workshopConsoleArtItem(item);
    assert.ok(mapped, model);
    assert.equal(shopConsoleKind(mapped), expected, model);
    assert.equal(mapped.brand, item.brand);
    assert.equal(mapped.variant, item.variant);
  }
});

test('Accessories, unsupported revisions and unknown models retain their existing workshop drawings', () => {
  for (const model of [
    'Manette Pro Nintendo Switch', 'Switch Pro', 'Joy-Con Switch gauche', 'Wii U GamePad', 'Télécommande Wii',
    'Manette Xbox One', 'DualSense PS5', 'Game Boy Pocket', 'Game Boy Light', 'Game Boy Micro',
    'Atari 2600', 'Prototype', 'Xbox originale',
  ]) assert.equal(workshopConsoleArtItem({model, illustration: 'switch'}), null, model);
  assert.equal(consoleAppearance({model: 'Atari 2600', illustration: 'megadrive'}).kind, 'megadrive');
});
