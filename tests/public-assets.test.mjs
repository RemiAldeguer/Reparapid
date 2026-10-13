import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {request as httpRequest} from 'node:http';
import {mkdtemp, mkdir, writeFile, symlink, rm, lstat, realpath} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {publicAsset} from '../server/public-assets.mjs';
import {verifyPublicAssets} from '../scripts/verify-public-assets.mjs';
import {createApplication} from '../server/application.mjs';
import worker from '../cloudflare/worker.mjs';
import {build} from 'vite';

const publicFiles = [
  ['index.html', 'text/html; charset=utf-8'],
  ['reparapid-logo-original.webp', 'image/webp'],
  ['favicon-reparapid.png', 'image/png'],
  ['logo-clinique-retro.svg', 'image/svg+xml'],
  ['fonts/oxanium.ttf', 'font/ttf'],
  ['fonts/oxanium-OFL.txt', 'text/plain; charset=utf-8'],
  ['assets/index-Abcd1234.js', 'text/javascript; charset=utf-8'],
  ['assets/index-Abcd1234.css', 'text/css; charset=utf-8'],
];
const privateFiles = [
  '.env', '.env.production', 'clients.json', 'workshop.sqlite', 'workshop.db',
  'export.sql', 'backup.html', 'index.html.bak', 'internal.js', 'internal.css',
  'assets/index-Abcd1234.js.map', 'assets/clients.json', 'fonts/notes.txt',
];
const aliases = [
  '/%69ndex.html', '/%2findex.html', '/%252findex.html', '/index.html%00',
  '/fonts%2foxanium.ttf', '/fonts%5coxanium.ttf', '/%2e/index.html',
  '/%252e/index.html', '/assets/../index.html', '/./index.html',
  '/assets/./index-Abcd1234.js', '/fonts\\oxanium.ttf', '//index.html',
];
const malformed = ['/%', '/%GG', '/%FF', '/%E0%A4', '/fonts/%C0%AFoxanium.ttf'];

async function directory(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'reparapid-public-assets-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  return root;
}

async function populate(root, files = publicFiles.map(([filename]) => filename)) {
  for (const filename of files) {
    await mkdir(path.dirname(path.join(root, filename)), {recursive: true});
    await writeFile(path.join(root, filename), `SYNTHETIC_ASSET:${filename}`);
  }
}

test('public allowlist accepts the actual interface files, hashed bundles and root document', () => {
  for (const [filename, contentType] of publicFiles) {
    for (const target of ['/' + filename, `https://assets.example/${filename}?v=1`]) {
      assert.deepEqual(publicAsset(target), {pathname: '/' + filename, filename, contentType});
    }
  }
  assert.deepEqual(publicAsset('/?v=1'), publicAsset('/index.html'));
  assert.ok(publicAsset('/assets/lazy-chunk-_-aB1234.js'), 'Vite URL-safe hashes are supported');
});

test('public allowlist refuses private files, extra browser assets and ambiguous path aliases', () => {
  for (const target of [...privateFiles.map(filename => '/' + filename), ...aliases,
    '/assets/app.js', '/assets/app-short.js', '/assets/index-Abcd1234.js/extra',
    '/assets/sub/index-Abcd1234.js', '/favicon.ico', '/other.svg', '/index.html/',
    '/INDEX.HTML', '/fonts/oxanium.ttf/', '/assets/index-Abcd1234.css.bak']) {
    assert.equal(publicAsset(target), null, target);
    assert.equal(publicAsset('https://assets.example' + target), null, target);
  }
});

test('malformed path decoding stays distinguishable from an ordinary missing file', () => {
  for (const target of malformed) assert.throws(() => publicAsset(target), URIError, target);
});

test('build guard accepts only regular files used by the interface', async t => {
  const root = await directory(t);
  await populate(root);
  assert.deepEqual((await verifyPublicAssets(root)).sort(), publicFiles.map(([filename]) => filename).sort());
});

test('source guard accepts fixed brand assets and refuses copied HTML or bundle lookalikes', async t => {
  const root = await directory(t);
  const fixedFiles = publicFiles.map(([filename]) => filename).filter(filename => filename !== 'index.html' && !filename.startsWith('assets/'));
  await populate(root, fixedFiles);
  assert.deepEqual((await verifyPublicAssets(root, {source: true})).sort(), fixedFiles.sort());
  await populate(root, ['index.html']);
  await assert.rejects(verifyPublicAssets(root, {source: true}), /non autorisé/);
  await rm(path.join(root, 'index.html'));
  await populate(root, ['assets/backup-Abcd1234.js']);
  await assert.rejects(verifyPublicAssets(root, {source: true}), /non autorisé/);
});

test('source guard stops private symlinks before Vite dereferences them into regular public bundles', async t => {
  const root = await directory(t), source = path.join(root, 'public');
  await mkdir(path.join(source, 'assets'), {recursive: true});
  await writeFile(path.join(root, 'index.html'), '<!doctype html><title>Synthetic only</title>');
  await writeFile(path.join(root, 'private.json'), 'SYNTHETIC_PRIVATE_CONTENT');
  await symlink(path.join(root, 'private.json'), path.join(source, 'assets', 'backup-Abcd1234.js'));
  // Reproduce the actual copy boundary on a disposable fixture. A post-build
  // check alone loses provenance, so the source check must run before Vite.
  await build({root: await realpath(root), configFile: false, logLevel: 'silent'});
  assert.equal((await lstat(path.join(root, 'dist', 'assets', 'backup-Abcd1234.js'))).isSymbolicLink(), false);
  assert.ok((await verifyPublicAssets(path.join(root, 'dist'))).includes('assets/backup-Abcd1234.js'));
  await assert.rejects(verifyPublicAssets(source, {source: true}), /non autorisé/);
  await rm(path.join(source, 'assets'), {recursive: true});
  await symlink(path.join(root, 'private.json'), path.join(source, 'favicon-reparapid.png'));
  await assert.rejects(verifyPublicAssets(source, {source: true}), /Lien symbolique/);
});

test('build guard refuses accidental exports, databases, environment files, source maps and HTML backups', async t => {
  for (const filename of [...privateFiles, 'index.html?backup', 'index.html#backup']) {
    await t.test(filename, async child => {
      const root = await directory(child);
      await populate(root, ['index.html', filename]);
      await assert.rejects(verifyPublicAssets(root), /non autorisé/);
    });
  }
});

test('build guard refuses unknown and nested folders, even when empty', async t => {
  for (const folder of ['.backups', 'data', 'assets/nested']) {
    const root = await directory(t);
    await populate(root, ['index.html']);
    await mkdir(path.join(root, folder), {recursive: true});
    await assert.rejects(verifyPublicAssets(root), /Dossier public non autorisé/);
  }
});

test('build guard refuses file, directory and root symlinks without following their contents', async t => {
  const outside = await directory(t);
  await populate(outside, ['index.html']);
  const fileRoot = await directory(t);
  await symlink(path.join(outside, 'index.html'), path.join(fileRoot, 'index.html'));
  await assert.rejects(verifyPublicAssets(fileRoot), /Lien symbolique interdit/);
  const directoryRoot = await directory(t);
  await populate(directoryRoot, ['index.html']);
  await symlink(outside, path.join(directoryRoot, 'fonts'));
  await assert.rejects(verifyPublicAssets(directoryRoot), /Lien symbolique interdit/);
  const rootParent = await directory(t), rootLink = path.join(rootParent, 'dist');
  await symlink(outside, rootLink);
  await assert.rejects(verifyPublicAssets(rootLink), /sans lien symbolique/);
});

test('build guard refuses missing HTML or a directory posing as an allowed file', async t => {
  const empty = await directory(t);
  await assert.rejects(verifyPublicAssets(empty), /contenir index.html/);
  const root = await directory(t);
  await mkdir(path.join(root, 'index.html'));
  await assert.rejects(verifyPublicAssets(root), /Dossier public non autorisé/);
});

async function staticFixture(t, platform) {
  if (platform === 'worker') {
    const calls = [], assets = new Map([...publicFiles.map(([filename]) => ['/' + filename, `SYNTHETIC_ASSET:${filename}`]),
      ...privateFiles.map(filename => ['/' + filename, 'SYNTHETIC_PRIVATE_CONTENT'])]);
    const env = {ASSETS: {fetch: async request => {
      calls.push(request.url);
      const pathname = new URL(request.url).pathname, target = pathname === '/' ? '/index.html' : pathname;
      return new Response(assets.get(target), {headers: {'Content-Type': publicFiles.find(([filename]) => '/' + filename === target)?.[1] ?? 'text/plain'}});
    }}};
    return {calls, request: (route, method = 'GET') => worker.fetch(new Request('https://assets.example' + route, {method}), env)};
  }
  const root = await directory(t);
  await populate(root, [...publicFiles.map(([filename]) => filename), ...privateFiles]);
  const app = createApplication({databasePath: ':memory:', origin: 'http://127.0.0.1', distPath: root, notificationPollingMs: 0});
  app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening');
  t.after(() => new Promise(resolve => {app.server.closeAllConnections(); app.server.close(resolve);}));
  // Native HTTP preserves raw targets that fetch/URL would otherwise normalize.
  const request = (route, method = 'GET') => new Promise((resolve, reject) => {
    const req = httpRequest({hostname: '127.0.0.1', port: app.server.address().port, path: route, method}, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(new Response(method === 'HEAD' ? null : Buffer.concat(chunks), {status: res.statusCode, headers: res.headers})));
    });
    req.on('error', reject); req.end();
  });
  return {root, request};
}

for (const platform of ['node', 'worker']) {
  test(`${platform}: actual logo, font, license, document and bundles stay available in GET and HEAD`, async t => {
    const f = await staticFixture(t, platform);
    for (const [filename, contentType] of [...publicFiles, ['', 'text/html; charset=utf-8']]) {
      for (const method of ['GET', 'HEAD']) {
        const response = await f.request('/' + filename, method);
        assert.equal(response.status, 200, filename);
        assert.equal(response.headers.get('Content-Type'), contentType, filename);
        assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
        assert.equal(await response.text(), method === 'HEAD' ? '' : `SYNTHETIC_ASSET:${filename || 'index.html'}`);
      }
    }
  });

  test(`${platform}: private files and encoded aliases are denied before public asset access`, async t => {
    const f = await staticFixture(t, platform);
    // WHATWG Request normalizes literal dot/backslash segments before Worker
    // receives them. Node still sees the original target and must reject it.
    const targets = [...privateFiles.map(filename => '/' + filename), ...aliases.filter(target => platform === 'node' || !target.includes('\\') && !target.includes('/./') && !target.includes('/../') && !target.includes('%2e/'))];
    for (const route of targets) for (const method of ['GET', 'HEAD']) {
      const response = await f.request(route, method);
      assert.equal(response.status, 404, `${method} ${route}`);
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
      assert.ok(!(await response.text()).includes('SYNTHETIC_PRIVATE_CONTENT'));
    }
    if (f.calls) assert.equal(f.calls.length, 0, 'unlisted paths must never reach the ASSETS provider');
    for (const route of malformed) assert.equal((await f.request(route)).status, 400, route);
    if (f.calls) assert.equal(f.calls.length, 0);
    assert.equal((await f.request('/index.html', 'POST')).status, 405);
    if (f.calls) assert.equal(f.calls.length, 0);
  });
}

test('Node realpath containment refuses an allowed filename symlinked outside dist', async t => {
  const f = await staticFixture(t, 'node'), outside = await directory(t);
  await populate(outside, ['private.txt']);
  const filename = path.join(f.root, 'assets', 'index-Abcd1234.js');
  await rm(filename); await symlink(path.join(outside, 'private.txt'), filename);
  for (const method of ['GET', 'HEAD']) {
    const response = await f.request('/assets/index-Abcd1234.js', method);
    assert.equal(response.status, 404);
    assert.ok(!(await response.text()).includes('SYNTHETIC_ASSET:private.txt'));
  }
});

test('Node refuses allowed file and directory symlinks even when their targets stay inside dist', async t => {
  const f = await staticFixture(t, 'node');
  const bundle = path.join(f.root, 'assets', 'index-Abcd1234.js');
  await rm(bundle); await symlink(path.join(f.root, 'clients.json'), bundle);
  for (const method of ['GET', 'HEAD']) {
    const response = await f.request('/assets/index-Abcd1234.js', method);
    assert.equal(response.status, 404);
    assert.ok(!(await response.text()).includes('SYNTHETIC_ASSET:clients.json'));
  }
  await mkdir(path.join(f.root, 'private-fonts'));
  await writeFile(path.join(f.root, 'private-fonts', 'oxanium.ttf'), 'SYNTHETIC_PRIVATE_CONTENT');
  await rm(path.join(f.root, 'fonts'), {recursive: true});
  await symlink(path.join(f.root, 'private-fonts'), path.join(f.root, 'fonts'));
  for (const method of ['GET', 'HEAD']) {
    const response = await f.request('/fonts/oxanium.ttf', method);
    assert.equal(response.status, 404);
    assert.ok(!(await response.text()).includes('SYNTHETIC_PRIVATE_CONTENT'));
  }
});
