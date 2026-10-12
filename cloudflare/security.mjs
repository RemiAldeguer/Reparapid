import nodeCrypto from 'node:crypto';
import { promisify } from 'node:util';

// OWASP's N=2^15, r=8, p=3 profile uses 32 MiB instead of the local
// server's 128 MiB profile, while retaining its recommended minimum defense.
// https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt
const cost = Object.freeze({ N: 32768, r: 8, p: 3, maxmem: 96 * 1024 * 1024 });
const prefix = 'scrypt$32768$8$3$';
const encodedPattern = /^scrypt\$32768\$8\$3\$([0-9a-f]{32})\$([0-9a-f]{128})$/;
const encoder = new TextEncoder();
const dummy = `${prefix}${'0'.repeat(32)}$${'0'.repeat(128)}`;

function hex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function token() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function digest(value) {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
}

export function equal(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x = encoder.encode(a), y = encoder.encode(b);
  if (x.length !== y.length) return false;
  return nodeCrypto.timingSafeEqual(x, y);
}

export function email(value) {
  if (typeof value !== 'string') return '';
  const result = value.trim().toLowerCase();
  return result.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result) ? result : '';
}

export function checkPassword(value) {
  const length = typeof value === 'string' ? [...value].length : 0;
  if (length < 15 || length > 128) throw new Error('Choisissez une phrase de passe de 15 à 128 caractères.');
}

async function derive(value, salt) {
  return promisify(nodeCrypto.scrypt)(value, salt, 64, cost);
}

export async function hashPassword(value) {
  checkPassword(value);
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  return `${prefix}${salt}$${hex(await derive(value, salt))}`;
}

export async function verifyPassword(value, encoded = dummy) {
  if (typeof value !== 'string' || [...value].length > 128 || typeof encoded !== 'string') return false;
  const parts = encodedPattern.exec(encoded);
  if (!parts || parts[0] !== encoded) return false;
  const derived = await derive(value, parts[1]);
  // Unknown emails still run the complete derivation, but cannot authenticate.
  return equal(hex(derived), parts[2]) && encoded !== dummy;
}
