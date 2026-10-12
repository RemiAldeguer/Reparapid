import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import nodeCrypto, { scryptSync } from 'node:crypto';
import { checkPassword, digest, email, equal, hashPassword, token, verifyPassword } from '../cloudflare/security.mjs';

// Synthetic fixtures only; no real administrator credentials are stored here.
const password = 'Synthetic Cloudflare passphrase 🛠️';
let encoded;
before(async () => { encoded = await hashPassword(password); });

test('Password hashes use random 16-byte salts and OWASP scrypt N32768 r8 p3', async () => {
  assert.match(encoded, /^scrypt\$32768\$8\$3\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  const second = await hashPassword(password);
  assert.notEqual(second, encoded);
  assert.notEqual(second.split('$')[4], encoded.split('$')[4]);
  assert.ok(!encoded.includes(password));
  // An independent native implementation checks the exact algorithm and byte format.
  const [, N, r, p, salt, expected] = encoded.split('$');
  assert.equal(scryptSync(password, salt, 64, { N: Number(N), r: Number(r), p: Number(p), maxmem: 96 * 1024 * 1024 }).toString('hex'), expected);
  assert.equal(await verifyPassword(password, encoded), true);
  assert.equal(await verifyPassword('Wrong synthetic phrase', encoded), false);
});

test('Password policy counts Unicode code points and accepts the complete length range', async () => {
  for (const value of ['a'.repeat(15), 'a'.repeat(128), '🛠'.repeat(15), '🛠'.repeat(128), 'nul\0included okay']) {
    assert.doesNotThrow(() => checkPassword(value));
  }
  for (const value of [null, undefined, 123, '', 'a'.repeat(14), 'a'.repeat(129), '🛠'.repeat(14), '🛠'.repeat(129)]) {
    assert.throws(() => checkPassword(value), /15 à 128/);
  }
  await assert.rejects(hashPassword('too short'), /15 à 128/);
  const unicode = '🛠'.repeat(128);
  assert.equal(await verifyPassword(unicode, await hashPassword(unicode)), true);
  assert.equal(await verifyPassword('🛠'.repeat(129), encoded), false);
});

test('Malformed and unsupported password hash formats cannot authenticate', async () => {
  const [, , , , salt, hash] = encoded.split('$');
  const malformed = [null, 42, '', 'invalid', `${encoded}$extra`, `${encoded}\n`, `${encoded}\r\n`,
    `scrypt$131072$8$1$${salt}$${hash}`, `scrypt$32768$8$1$${salt}$${hash}`,
    `scrypt$032768$8$3$${salt}$${hash}`, `scrypt$16384$8$3$${salt}$${hash}`,
    `scrypt$32768$8$3$${salt.slice(2)}$${hash}`, `scrypt$32768$8$3$${salt}$${hash.slice(2)}`,
    `scrypt$32768$8$3$${'g'.repeat(32)}$${hash}`,
    `scrypt$32768$8$3$${salt}$${'g'.repeat(128)}`];
  for (const value of malformed) assert.equal(await verifyPassword(password, value), false);
  assert.equal(await verifyPassword(null, encoded), false);
});

test('Unknown emails execute the same complete derivation as an existing account', async t => {
  const calls = [];
  const nativeScrypt = nodeCrypto.scrypt;
  t.mock.method(nodeCrypto, 'scrypt', (value, salt, length, cost, callback) => {
    calls.push({ value, saltLength: salt.length, length, ...cost });
    return nativeScrypt(value, salt, length, cost, callback);
  });
  assert.equal(await verifyPassword('Wrong synthetic phrase', encoded), false);
  assert.equal(await verifyPassword('Wrong synthetic phrase'), false);
  const expected = { value: 'Wrong synthetic phrase', saltLength: 32, length: 64, N: 32768, r: 8, p: 3, maxmem: 96 * 1024 * 1024 };
  assert.deepEqual(calls, [expected, expected]);
});

test('Unknown accounts never authenticate even if the dummy comparison matches', async t => {
  t.mock.method(nodeCrypto, 'scrypt', (value, salt, length, cost, callback) => callback(null, new Uint8Array(64)));
  assert.equal(await verifyPassword(password), false);
});

test('Tokens contain 32 random bytes and digests use SHA256', async () => {
  const first = token(), second = token();
  assert.match(first, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(Buffer.from(first, 'base64url').length, 32);
  assert.notEqual(first, second);
  assert.equal(await digest('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('Comparisons use UTF8 bytes and reject nonstrings and mismatches', () => {
  assert.equal(equal('é🛠', 'é🛠'), true);
  assert.equal(equal('', ''), true);
  assert.equal(equal('same length', 'same lengtx'), false);
  assert.equal(equal('é', 'e'), false);
  assert.equal(equal('a', 'aa'), false);
  assert.equal(equal(null, ''), false);
  assert.equal(equal('', undefined), false);
});

test('Email normalization matches the existing administrator policy', () => {
  assert.equal(email(' Synthetic.Admin@EXAMPLE.invalid '), 'synthetic.admin@example.invalid');
  for (const value of [null, 123, 'invalid', 'a@@example.invalid', 'a @example.invalid', `a${'x'.repeat(254)}@example.invalid`]) {
    assert.equal(email(value), '');
  }
});
