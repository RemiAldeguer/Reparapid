import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {readFileSync, readdirSync} from 'node:fs';
import {mkdtemp, writeFile, rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {createApplication} from '../server/application.mjs';
import {hashPassword as nodeHash} from '../server/security.mjs';
import {hashPassword as workerHash} from '../cloudflare/security.mjs';
import worker from '../cloudflare/worker.mjs';
import {emptyStore, createClient, createClientRepairs, setRepairInterventionCost, setRepairPayment} from './.compiled/domain.cjs';

const origin = 'https://security-fixture.example';
const adminEmail = 'security-admin@example.invalid';
const phrase = 'Synthetic response security testing phrase!';
const hashes = {};
const publicDocument = '<!doctype html><link rel="stylesheet" href="/app.css"><div id="root"></div><script src="/app.js" defer></script>';

function assertResponseSecurity(response, {secure = true, upstreamVary = false} = {}) {
  const headers = response.headers;
  assert.equal(headers.get('Cache-Control'), 'no-store');
  assert.equal(headers.get('Pragma'), 'no-cache');
  assert.equal(headers.get('Expires'), '0');
  const vary = headers.get('Vary').toLowerCase().split(',').map(value => value.trim());
  assert.ok(vary.includes('cookie')); assert.ok(vary.includes('origin'));
  if (upstreamVary) assert.ok(vary.includes('accept-encoding'));
  assert.equal(headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(headers.get('X-Frame-Options'), 'DENY');
  assert.equal(headers.get('Referrer-Policy'), 'no-referrer');
  assert.equal(headers.get('Strict-Transport-Security'), secure ? 'max-age=31536000' : null);
  assert.equal(headers.get('Clear-Site-Data'), null, 'do not purge the other role or saved local backups');
  assert.equal(headers.get('Access-Control-Allow-Origin'), null);
  const policy = new Map(headers.get('Content-Security-Policy').split(';').map(part => {
    const [directive, ...sources] = part.trim().split(/\s+/); return [directive, sources];
  }));
  assert.deepEqual(policy.get('script-src'), ["'self'"]);
  assert.deepEqual(policy.get('script-src-attr'), ["'none'"]);
  assert.deepEqual(policy.get('style-src-elem'), ["'self'"]);
  assert.deepEqual(policy.get('style-src-attr'), ["'unsafe-inline'"]);
  for (const directive of ['object-src', 'base-uri', 'frame-ancestors', 'frame-src', 'media-src', 'worker-src']) {
    assert.deepEqual(policy.get(directive), ["'none'"]);
  }
  assert.deepEqual(policy.get('connect-src'), ["'self'"]);
  assert.deepEqual(policy.get('img-src'), ["'self'", 'data:', 'blob:']);
}

async function fixture(t, platform) {
  const store = emptyStore(), client = createClient(store, {name: 'Synthetic client', email: 'security-client@example.invalid', phone: '', address: '', notes: 'INTERNAL_CLIENT_NOTE'});
  const [repair] = createClientRepairs(store, client.id, [{brand: 'Nintendo', model: 'DS Lite', serial: 'SYNTHETIC-ONLY', accessories: '', title: 'Synthetic repair', symptoms: 'Screen', priority: 'normale', dueDate: ''}]);
  repair.diagnosis = 'INTERNAL_DIAGNOSIS';
  setRepairInterventionCost(store, repair.id, 42.5); setRepairPayment(store, repair.id, true);
  hashes[platform] ??= await (platform === 'node' ? nodeHash : workerHash)(phrase);
  let sqlite, call;
  if (platform === 'node') {
    const distPath = await mkdtemp(path.join(os.tmpdir(), 'clinique-response-security-'));
    t.after(() => rm(distPath, {recursive: true, force: true}));
    await Promise.all([
      writeFile(path.join(distPath, 'index.html'), publicDocument),
      writeFile(path.join(distPath, 'app.js'), 'document.documentElement.dataset.fixture="public";'),
      writeFile(path.join(distPath, 'app.css'), '#root{display:block}'),
      writeFile(path.join(distPath, '.env'), 'SYNTHETIC_PRIVATE_CONTENT'),
      writeFile(path.join(distPath, 'app.js.map'), 'SYNTHETIC_PRIVATE_CONTENT'),
      writeFile(path.join(distPath, 'workshop.sqlite'), 'SYNTHETIC_PRIVATE_CONTENT'),
    ]);
    const app = createApplication({databasePath: ':memory:', origin, distPath, notificationPollingMs: 0});
    sqlite = app.db;
    sqlite.prepare('UPDATE workshop SET data=? WHERE id=1').run(JSON.stringify(store));
    app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening');
    const base = `http://127.0.0.1:${app.server.address().port}`;
    t.after(() => new Promise(resolve => {app.server.closeAllConnections(); app.server.close(resolve);}));
    call = (route, options) => fetch(base + route, options);
  } else {
    sqlite = new DatabaseSync(':memory:'); t.after(() => sqlite.close());
    const migrations = new URL('../cloudflare/migrations/', import.meta.url);
    for (const name of readdirSync(migrations).filter(name => name.endsWith('.sql')).sort()) sqlite.exec(readFileSync(new URL(name, migrations), 'utf8'));
    sqlite.prepare("UPDATE workshop SET generation='security-fixture' WHERE id=1").run();
    sqlite.prepare("INSERT INTO workshop_chunks(generation,position,data) VALUES('security-fixture',0,?)").run(JSON.stringify(store));
    const db = {
      prepare(sql) {
        const statement = (values = []) => ({
          bind(...values) {return statement(values);},
          execute() {const results = sqlite.prepare(sql).all(...values); return {success: true, results, meta: sqlite.prepare('SELECT changes() AS changes').get()};},
          async run() {return this.execute();}, async all() {return this.execute();}, async first() {return this.execute().results[0] ?? null;},
        });
        return statement();
      },
      async batch(statements) {
        sqlite.exec('BEGIN IMMEDIATE');
        try {const results = statements.map(statement => statement.execute()); sqlite.exec('COMMIT'); return results;}
        catch (error) {sqlite.exec('ROLLBACK'); throw error;}
      },
    };
    const assets = new Map([['/', publicDocument], ['/app.css', '#root{display:block}'], ['/app.js', 'document.documentElement.dataset.fixture="public";']]);
    call = (route, options) => worker.fetch(new Request(origin + route, options), {DB: db, ASSETS: {fetch: async request => {
      const url = new URL(request.url), body = assets.get(url.pathname);
      return new Response(body || 'Missing asset', {status: body ? 200 : 404, headers: {
        'Content-Type': url.pathname.endsWith('.js') ? 'text/javascript' : url.pathname.endsWith('.css') ? 'text/css' : 'text/html',
        'Cache-Control': 'public, max-age=86400', 'Vary': 'Accept-Encoding, cookie',
        'Content-Security-Policy': "default-src * 'unsafe-inline'",
      }});
    }}});
  }
  const at = Date.now();
  sqlite.prepare("INSERT INTO admin(id,email,password_hash,role) VALUES(1,?,?,'admin')").run(adminEmail, hashes[platform]);
  sqlite.prepare('INSERT INTO client_accounts(client_id,email,password_hash,enabled,created_at,updated_at) VALUES(?,?,?,1,?,?)').run(client.id, client.email, hashes[platform], at, at);
  async function request(route, {method = 'GET', body, cookie = '', csrf = '', headers = {}} = {}) {
    const response = await call(route, {method, headers: {Origin: origin, ...(body === undefined ? {} : {'Content-Type': 'application/json'}), ...(cookie ? {Cookie: cookie} : {}), ...(csrf ? {'X-CSRF-Token': csrf} : {}), ...headers}, ...(body === undefined ? {} : {body: JSON.stringify(body)})});
    const text = await response.text(); let data;
    try {data = JSON.parse(text);} catch {}
    return {response, text, data, status: response.status, cookie: response.headers.get('Set-Cookie')?.split(';')[0] || ''};
  }
  const login = (role = 'admin') => request(role === 'admin' ? '/api/auth/login' : '/api/client/auth/login', {method: 'POST', body: {email: role === 'admin' ? adminEmail : client.email, password: phrase}});
  return {request, login};
}

for (const platform of ['node', 'worker']) {
  test(`${platform}: public documents and bundled assets receive the restrictive policy without private data`, async t => {
    const f = await fixture(t, platform);
    for (const route of ['/', '/app.js', '/app.css']) {
      const result = await f.request(route); assert.equal(result.status, 200);
      assertResponseSecurity(result.response, {upstreamVary: platform === 'worker'});
      assert.ok(!result.text.includes('INTERNAL_')); assert.ok(!result.text.includes('42.5'));
    }
    const head = await f.request('/', {method: 'HEAD'}); assert.equal(head.status, 200); assert.equal(head.text, ''); assertResponseSecurity(head.response);
    if (platform === 'node') for (const route of ['/.env', '/app.js.map', '/workshop.sqlite']) {
      const denied = await f.request(route); assert.equal(denied.status, 404); assertResponseSecurity(denied.response);
      assert.ok(!denied.text.includes('SYNTHETIC_PRIVATE_CONTENT'));
    }
  });

  test(`${platform}: anonymous and cross-site API errors retain privacy and cache protections`, async t => {
    const f = await fixture(t, platform);
    for (const route of ['/api/store', '/api/auth/me', '/api/client/portal']) {
      const denied = await f.request(route); assert.equal(denied.status, 401); assertResponseSecurity(denied.response);
      assert.ok(!denied.text.includes('INTERNAL_')); assert.ok(!denied.text.includes('SYNTHETIC-ONLY'));
    }
    const blocked = await f.request('/api/store', {headers: {'Sec-Fetch-Site': 'cross-site'}});
    assert.equal(blocked.status, 403); assertResponseSecurity(blocked.response);
  });

  test(`${platform}: authenticated responses preserve protected cookies, role isolation, CSRF and the other role on logout`, async t => {
    const f = await fixture(t, platform), admin = await f.login(), client = await f.login('client');
    for (const [role, result] of [['admin', admin], ['client', client]]) {
      assert.equal(result.status, 200); assertResponseSecurity(result.response);
      const cookie = result.response.headers.get('Set-Cookie');
      assert.match(cookie, role === 'admin' ? /^__Host-clinique_session=/ : /^__Host-clinique_client_session=/);
      assert.match(cookie, /; HttpOnly/); assert.match(cookie, /; SameSite=Strict/); assert.match(cookie, /; Secure/);
      assert.ok(!cookie.includes('Domain='));
      assert.ok(!result.text.includes(result.cookie.split('=')[1]));
    }
    const both = {cookie: `${admin.cookie}; ${client.cookie}`};
    const store = await f.request('/api/store', both); assert.equal(store.status, 200); assertResponseSecurity(store.response);
    assert.equal(store.data.repairs[0].payment.amount, 42.5);
    const portal = await f.request('/api/client/portal', both); assert.equal(portal.status, 200); assertResponseSecurity(portal.response);
    assert.ok(!portal.text.includes('INTERNAL_')); assert.ok(!('payment' in portal.data.repairs[0]));
    assert.equal((await f.request('/api/store', {cookie: client.cookie})).status, 401);
    assert.equal((await f.request('/api/client/portal', {cookie: admin.cookie})).status, 401);
    for (const headers of [{'X-CSRF-Token': 'incorrect'}, {'X-CSRF-Token': admin.data.csrfToken, Origin: 'https://foreign.example'}, {'X-CSRF-Token': admin.data.csrfToken, 'Sec-Fetch-Site': 'cross-site'}]) {
      const rejected = await f.request('/api/auth/logout', {...both, method: 'POST', headers});
      assert.equal(rejected.status, 403); assertResponseSecurity(rejected.response);
    }
    const logout = await f.request('/api/auth/logout', {...both, method: 'POST', csrf: admin.data.csrfToken});
    assert.equal(logout.status, 200); assertResponseSecurity(logout.response);
    assert.match(logout.response.headers.get('Set-Cookie'), /^__Host-clinique_session=.*Max-Age=0/);
    assert.ok(!logout.response.headers.get('Set-Cookie').includes('clinique_client_session'));
    assert.equal((await f.request('/api/auth/me', both)).status, 401);
    const stillClient = await f.request('/api/client/portal', both); assert.equal(stillClient.status, 200); assertResponseSecurity(stillClient.response);
    const clientLogout = await f.request('/api/client/auth/logout', {...both, method: 'POST', csrf: client.data.csrfToken});
    assert.equal(clientLogout.status, 200); assertResponseSecurity(clientLogout.response);
    assert.match(clientLogout.response.headers.get('Set-Cookie'), /^__Host-clinique_client_session=.*Max-Age=0/);
    assert.equal((await f.request('/api/client/portal', both)).status, 401);
  });
}

test('Worker rejects production HTTP while loopback development stays available without HSTS', async () => {
  const env = {ASSETS: {fetch: async () => new Response(publicDocument, {headers: {'Content-Type': 'text/html'}})}};
  const blocked = await worker.fetch(new Request('http://public.example/'), env);
  assert.equal(blocked.status, 403); assertResponseSecurity(blocked, {secure: false});
  const local = await worker.fetch(new Request('http://127.0.0.1:8787/'), {...env, LOCAL_DEV: 'true'});
  assert.equal(local.status, 200); assertResponseSecurity(local, {secure: false});
});
