import type {GuideDeviceType, RepairGuideFamily} from './repair-guides-types';

export const guideFamilies: Record<RepairGuideFamily, {brand: string; label: string; deviceType: GuideDeviceType}> = {
  PlayStation: {brand: 'Sony', label: 'PlayStation', deviceType: 'console'},
  Nintendo: {brand: 'Nintendo', label: 'Nintendo', deviceType: 'console'},
  Xbox: {brand: 'Microsoft', label: 'Xbox', deviceType: 'console'},
  Sega: {brand: 'Sega', label: 'Consoles Sega', deviceType: 'console'},
  'Steam Deck': {brand: 'Valve', label: 'Steam Deck', deviceType: 'console'},
  iPhone: {brand: 'Apple', label: 'iPhone', deviceType: 'smartphone'},
  'Samsung Galaxy': {brand: 'Samsung', label: 'Samsung Galaxy', deviceType: 'smartphone'},
  'Google Pixel': {brand: 'Google', label: 'Google Pixel', deviceType: 'smartphone'},
  Xiaomi: {brand: 'Xiaomi', label: 'Xiaomi · Redmi · Poco', deviceType: 'smartphone'},
  Motorola: {brand: 'Motorola', label: 'Motorola', deviceType: 'smartphone'},
};
export const guideFamilyId = (family: RepairGuideFamily) => family.toLowerCase().replaceAll(' ', '-');
