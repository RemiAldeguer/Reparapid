export type ShopConsoleItem = {brand: string; model: string; variant?: string};
const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Shared classification for the storefront and workshop's product silhouettes. */
export function shopConsoleKind(item: ShopConsoleItem): string {
  const model = normalized(item.model);
  if (/playstation\s*5|ps\s*5/.test(model)) return /pro/.test(model) ? 'ps5-pro' : /slim/.test(model) ? 'ps5-slim' : /digital/.test(model) ? 'ps5-digital' : 'ps5';
  if (/playstation\s*4|ps\s*4/.test(model)) return /pro/.test(model) ? 'ps4-pro' : /slim/.test(model) ? 'ps4-slim' : 'ps4';
  if (/playstation\s*3|ps\s*3/.test(model)) return 'ps3';
  if (/playstation\s*2|ps\s*2/.test(model)) return 'ps2';
  if (/vita/.test(model)) return 'vita';
  if (/psp|playstation portable/.test(model)) return 'psp';
  if (/playstation|ps\s*1/.test(model)) return 'ps1';
  if (/switch/.test(model)) return /lite/.test(model) ? 'switch-lite' : /oled/.test(model) ? 'switch-oled' : /switch\s*2/.test(model) ? 'switch-2' : 'switch';
  if (/xbox/.test(model)) return /series\s*s/.test(model) ? 'xbox-series-s' : /series\s*x/.test(model) ? 'xbox-series-x' : /360/.test(model) ? 'xbox-360' : /one\s*s/.test(model) ? 'xbox-one-s' : /one\s*x/.test(model) ? 'xbox-one-x' : 'xbox-one';
  if (/wii\s*u/.test(model)) return 'wii-u';
  if (/wii/.test(model)) return 'wii';
  if (/game\s*cube/.test(model)) return 'gamecube';
  if (/nintendo\s*64|n64/.test(model)) return 'n64';
  if (/super nintendo|snes|super famicom/.test(model)) return 'snes';
  if (/\bnes\b|nintendo entertainment/.test(model)) return 'nes';
  if (/2ds/.test(model)) return /new 2ds/.test(model) && !model.includes('/') ? '2ds-xl' : '2ds';
  if (/3ds/.test(model)) return /xl/.test(model) ? '3ds-xl' : '3ds';
  if (/\bds\b|\bdsi\b/.test(model)) return 'ds';
  if (/game boy advance|gba/.test(model)) return /(?:advance|gba)\s*sp/.test(model) && !model.includes('/') ? 'advance-sp' : 'advance';
  if (/game\s*boy/.test(model)) return /color/.test(model) && !model.includes('/') ? 'gameboy-color' : 'gameboy';
  if (/mega\s*drive|genesis/.test(model)) return 'megadrive';
  if (/dreamcast/.test(model)) return 'dreamcast';
  if (/game\s*gear/.test(model)) return 'gamegear';
  return 'other';
}
