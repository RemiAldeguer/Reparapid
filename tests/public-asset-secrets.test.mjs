import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {verifyPublicAssets} from '../scripts/verify-public-assets.mjs';

async function publicFixture(t, files) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'reparapid-public-secrets-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  for (const [relative, content] of Object.entries({'index.html': '<!doctype html><title>Atelier</title>', ...files})) {
    const filename = path.join(root, relative);
    await mkdir(path.dirname(filename), {recursive: true});
    await writeFile(filename, content);
  }
  return root;
}

test('Public HTML, CSS, JavaScript and nested guide pages reject recognizable provider credentials', async t => {
  const examples = [
    ['index.html', 're_' + 'a'.repeat(32)],
    ['assets/app-12345678.js', 'sk-proj-' + 'b'.repeat(64)],
    ['assets/app-12345678.css', 'ghp_' + 'c'.repeat(36)],
    ['guides/index.html', 'github_pat_' + 'd'.repeat(22) + '_' + 'e'.repeat(59)],
  ];
  for (const [filename, credential] of examples) await t.test(filename, async child => {
    const root = await publicFixture(child, {[filename]: `/* SYNTHETIC fixture, not an exemption for its contents */\n${credential}`});
    await assert.rejects(verifyPublicAssets(root, {env: {}}), /secret|clé privée/i);
  });
});

test('Every configured server credential is rejected even when its value has no recognizable provider shape', async t => {
  for (const name of ['RESEND_API_KEY', 'CLOUDFLARE_API_TOKEN', 'CF_API_TOKEN', 'OPENAI_API_KEY', 'GITHUB_TOKEN']) {
    await t.test(name, async child => {
      const credential = `opaque-fixture-${name.toLowerCase()}-value`;
      const root = await publicFixture(child, {'assets/app-12345678.js': `const exposed = ${JSON.stringify(credential)};`});
      await assert.rejects(verifyPublicAssets(root, {env: {[name]: credential}}), error => {
        assert.match(error.message, /secret/i);
        assert.ok(!error.message.includes(credential));
        assert.ok(!error.stack.includes(credential));
        return true;
      });
    });
  }
});

test('Private key PEM data is refused without disclosing its contents', async t => {
  const body = Buffer.from('isolated private-key fixture only').toString('base64');
  const pem = `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----`;
  const root = await publicFixture(t, {'index.html': `<pre>${pem}</pre>`});
  await assert.rejects(verifyPublicAssets(root, {env: {}}), error => {
    assert.match(error.message, /clé privée/i);
    assert.ok(!error.message.includes(body));
    return true;
  });
});

test('Public identifiers, password instructions and explicitly marked dummy values remain publishable', async t => {
  const root = await publicFixture(t, {'index.html': [
    'database_id="11111111-2222-3333-4444-555555555555"',
    'Mot de passe : utilisez au moins quinze caractères.',
    're_SYNTHETIC_' + 'a'.repeat(32),
    'sk-proj-DUMMY_' + 'b'.repeat(64),
    'ghp_DUMMY_' + 'c'.repeat(30),
  ].join('\n')});
  const files = await verifyPublicAssets(root, {env: {RESEND_API_KEY: 'DUMMY_MAIL_KEY', GITHUB_TOKEN: 'SYNTHETIC_GITHUB_TOKEN'}});
  assert.deepEqual(files, ['index.html']);
});

test('Modern service-account and legacy provider tokens are rejected independently of process environment', async t => {
  const examples = [
    'sk-svcacct-' + 'a'.repeat(80),
    'sk-' + 'b'.repeat(48),
    ...['gho_', 'ghu_', 'ghs_', 'ghr_'].map(prefix => prefix + 'c'.repeat(36)),
  ];
  for (const [index, credential] of examples.entries()) await t.test(`provider variant ${index + 1}`, async child => {
    const root = await publicFixture(child, {'assets/app-12345678.js': JSON.stringify({credential})});
    await assert.rejects(verifyPublicAssets(root, {env: {}}), /secret/i);
  });
});

test('Quoted or multiline configured values are rejected after JSON serialization', async t => {
  const credential = 'opaque-fixture-"quoted"-value\nsecond-line';
  const root = await publicFixture(t, {'assets/app-12345678.js': `const value=${JSON.stringify(credential)};`});
  await assert.rejects(verifyPublicAssets(root, {env: {RESEND_API_KEY: credential}}), /secret/i);
});

test('A configured credential is never exempted by a dummy-looking substring', async t => {
  const credential = 'opaque-DUMMY-configured-key-value';
  const root = await publicFixture(t, {'index.html': '<p>' + credential + '</p>'});
  await assert.rejects(verifyPublicAssets(root, {env: {RESEND_API_KEY: credential}}), /secret/i);
});

test('Serialized RSA and OpenSSH private key blocks remain detectable', async t => {
  for (const kind of ['RSA PRIVATE KEY', 'OPENSSH PRIVATE KEY', 'ENCRYPTED PRIVATE KEY']) await t.test(kind, async child => {
    const body = Buffer.from('isolated encoded private-key fixture').toString('base64');
    const root = await publicFixture(child, {'assets/app-12345678.js': JSON.stringify(`-----BEGIN ${kind}-----\n${body}\n-----END ${kind}-----`)});
    await assert.rejects(verifyPublicAssets(root, {env: {}}), /clé privée/i);
  });
});

test('Legacy encrypted PEM metadata cannot hide a private key block', async t => {
  const body = Buffer.from('isolated legacy private-key fixture').toString('base64');
  const pem = ['-----BEGIN RSA PRIVATE KEY-----', 'Proc-Type: 4,ENCRYPTED',
    'DEK-Info: AES-256-CBC,0123456789ABCDEF', '', body, '-----END RSA PRIVATE KEY-----'].join('\n');
  const root = await publicFixture(t, {'assets/app-12345678.js': JSON.stringify(pem)});
  await assert.rejects(verifyPublicAssets(root, {env: {}}), /clé privée/i);
});

test('An arbitrary unconfigured value has no guarantee of secret detection', async t => {
  const root = await publicFixture(t, {'assets/app-12345678.js': 'const label="opaque-fixture-unknown-value";'});
  assert.deepEqual(await verifyPublicAssets(root, {env: {}}), ['assets/app-12345678.js', 'index.html']);
});

test('Source asset verification keeps its existing image and font contract', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'reparapid-source-secrets-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  await writeFile(path.join(root, 'favicon-reparapid.png'), 'isolated non-image bytes, not decoded');
  assert.deepEqual(await verifyPublicAssets(root, {source: true, env: {}}), ['favicon-reparapid.png']);
});
