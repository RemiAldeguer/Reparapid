import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../cloudflare/worker.mjs';
import { hashPassword, verifyPassword, digest, token } from '../cloudflare/security.mjs';
import {provisioningStatements} from '../server/workshop-scope.mjs';
import { emptyStore, createClient, createClientRepairs, validateStore, setRepairInterventionCost } from '../src/domain.ts';
import { demoStore } from './.compiled/seed.cjs';

const origin = 'https://clinique.example';
const password = 'Synthetic password for tests only';
let passwordHash;

async function fixture(t) {
  passwordHash ??= await hashPassword(password);
  const sqlite = new DatabaseSync(':memory:');
  t.after(() => sqlite.close());
  sqlite.exec(readFileSync(new URL('../cloudflare/migrations/0001_initial.sql', import.meta.url), 'utf8'));
  sqlite.exec(readFileSync(new URL('../cloudflare/migrations/0002_client_accounts.sql', import.meta.url), 'utf8'));
  sqlite.exec(readFileSync(new URL('../cloudflare/migrations/0003_email_notifications.sql', import.meta.url), 'utf8'));
  sqlite.exec(readFileSync(new URL('../cloudflare/migrations/0004_saas_registrations.sql', import.meta.url), 'utf8'));
  sqlite.prepare("INSERT INTO admin(id,email,password_hash,role) VALUES(1,'admin@example.invalid',?,'admin')").run(passwordHash);
  const db = {
    beforeBatch: undefined,
    prepare(sql) {
      function statement(values = []) {
        return {
          sql,
          bind(...values) { return statement(values); },
          execute() {
            const results = sqlite.prepare(sql).all(...values);
            return { success: true, results, meta: sqlite.prepare('SELECT changes() AS changes').get() };
          },
          async run() { return this.execute(); },
          async all() { return this.execute(); },
          async first() { return this.execute().results[0] ?? null; },
        };
      }
      return statement();
    },
    async batch(statements) {
      db.beforeBatch?.(statements);
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const results = statements.map(statement => statement.execute());
        sqlite.exec('COMMIT');
        return results;
      } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  const env = { DB: db, ASSETS: { fetch: async () => new Response('Synthetic asset') } };
  const call = (path, method = 'GET', body, headers = {}, target = origin) => worker.fetch(new Request(target + path, {
    method, headers: { ...(method === 'GET' ? {} : { Origin: target, 'Content-Type': 'application/json' }), ...headers },
    ...(body === undefined ? {} : { body: typeof body === 'string' || body instanceof Uint8Array ? body : JSON.stringify(body) }),
  }), env);
  async function login() {
    const result = await call('/api/auth/login', 'POST', { email: 'admin@example.invalid', password });
    assert.equal(result.status, 200);
    const cookie = result.headers.get('Set-Cookie').split(';')[0];
    return { cookie, csrf: (await result.json()).csrfToken };
  }
  return { db, sqlite, env, call, login };
}

test('Assets receive security headers without initializing D1; production requires HTTPS', async t => {
  const f = await fixture(t);
  f.env.DB = { prepare() { throw new Error('Assets must not access D1'); } };
  const asset = await f.call('/');
  assert.equal(asset.status, 200);
  assert.equal(asset.headers.get('Cache-Control'), 'no-store');
  assert.equal(asset.headers.get('X-Frame-Options'), 'DENY');
  assert.equal(asset.headers.get('Strict-Transport-Security'), 'max-age=31536000');
  assert.equal((await f.call('/', 'GET', undefined, {}, 'http://localhost:8787')).status, 403);
  f.env.LOCAL_DEV = 'true';
  assert.equal((await f.call('/', 'GET', undefined, {}, 'http://localhost:8787')).status, 200);
  assert.equal((await f.call('/', 'GET', undefined, {}, 'http://public.example')).status, 403);
});

test('Login issues the expected secure cookie and me does not extend idle life', async t => {
  const f = await fixture(t), auth = await f.login();
  assert.match(auth.cookie, /^__Host-clinique_session=[A-Za-z0-9_-]{43}$/);
  const before = f.sqlite.prepare('SELECT seen_at FROM sessions').get().seen_at;
  const me = await f.call('/api/auth/me', 'GET', undefined, { Cookie: auth.cookie });
  assert.equal(me.status, 200);
  assert.deepEqual((await me.json()).user, { email: 'admin@example.invalid', role: 'super_admin', workshopId: null });
  assert.equal(f.sqlite.prepare('SELECT seen_at FROM sessions').get().seen_at, before);
  assert.equal((await f.call('/api/auth/me', 'GET', undefined, { Cookie: auth.cookie + '; ' + auth.cookie })).status, 401);
  f.sqlite.prepare('UPDATE sessions SET seen_at = ?').run(Date.now() - 1800000);
  assert.equal((await f.call('/api/auth/me', 'GET', undefined, { Cookie: auth.cookie })).status, 401);
});

test('Cross-site, mismatched origins and invalid CSRF cannot mutate data', async t => {
  const f = await fixture(t), auth = await f.login();
  const body = { revision: 0, data: emptyStore() };
  const headers = { Cookie: auth.cookie, 'X-CSRF-Token': auth.csrf };
  assert.equal((await f.call('/api/store', 'PUT', body, { ...headers, 'Sec-Fetch-Site': 'cross-site' })).status, 403);
  assert.equal((await f.call('/api/store', 'PUT', body, { ...headers, Origin: 'https://evil.example', Host: 'evil.example' })).status, 403);
  assert.equal((await f.call('/api/store', 'PUT', body, { ...headers, 'X-CSRF-Token': 'bad' })).status, 403);
  f.env.APP_ORIGIN = 'https://configured.example';
  assert.equal((await f.call('/api/store', 'PUT', body, headers)).status, 403);
  f.env.APP_ORIGIN = origin;
  assert.equal((await f.call('/api/store', 'PUT', body, headers)).status, 200);
});

test('D1 invoice source requires the current admin cookie and matching CSRF even for GET', async t => {
  const f = await fixture(t), first = await f.login();
  const before = f.sqlite.prepare('SELECT revision, generation FROM workshop WHERE id=1').get();
  assert.equal((await f.call('/api/admin/invoice-source')).status, 401);
  assert.equal((await f.call('/api/admin/invoice-source', 'GET', undefined, {'X-CSRF-Token': first.csrf})).status, 401);
  for (const csrf of ['', 'wrong']) assert.equal((await f.call('/api/admin/invoice-source', 'GET', undefined, {Cookie: first.cookie, 'X-CSRF-Token': csrf})).status, 403);
  const result = await f.call('/api/admin/invoice-source', 'GET', undefined, {Cookie: first.cookie, 'X-CSRF-Token': first.csrf});
  assert.equal(result.status, 200); assert.equal(result.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await result.json(), await (await f.call('/api/store', 'GET', undefined, {Cookie: first.cookie})).json());
  const second = await f.login(); assert.notEqual(first.csrf, second.csrf);
  assert.equal((await f.call('/api/admin/invoice-source', 'GET', undefined, {Cookie: second.cookie, 'X-CSRF-Token': first.csrf})).status, 403);
  assert.equal((await f.call('/api/admin/invoice-source', 'GET', undefined, {Cookie: second.cookie, 'X-CSRF-Token': second.csrf})).status, 200);
  assert.deepEqual(f.sqlite.prepare('SELECT revision, generation FROM workshop WHERE id=1').get(), before);
});

test('D1 valid client-only sessions cannot read the private invoice source', async t => {
  const f = await clientAccessFixture(t), at = Date.now(), value = token(), csrf = token();
  f.sqlite.prepare('INSERT INTO client_accounts(client_id,email,password_hash,enabled,created_at,updated_at) VALUES(?,?,?,1,?,?)').run(f.client.id, f.client.email, passwordHash, at, at);
  f.sqlite.prepare('INSERT INTO client_sessions(token_hash,client_id,csrf,expires_at,seen_at) VALUES(?,?,?,?,?)').run(await digest(value), f.client.id, csrf, at + 60000, at);
  const headers = {Cookie: `__Host-clinique_client_session=${value}`, 'X-CSRF-Token': csrf};
  assert.equal((await f.call('/api/client/auth/me', 'GET', undefined, headers)).status, 200);
  assert.equal((await f.call('/api/admin/invoice-source', 'GET', undefined, headers)).status, 401);
});

test('D1 expired admin sessions cannot read invoice source with an old CSRF', async t => {
  const f = await fixture(t), auth = await f.login();
  f.sqlite.prepare('UPDATE sessions SET expires_at=?').run(Date.now() - 1);
  assert.equal((await f.call('/api/admin/invoice-source', 'GET', undefined, {Cookie: auth.cookie, 'X-CSRF-Token': auth.csrf})).status, 401);
});

test('D1 invoice source stays in the cookie atelier and rejects another atelier CSRF', async t => {
  const f = await fixture(t), root = await f.login(), store = emptyStore();
  store.settings.workshop = 'PRIVATE_INVOICE_TENANT';
  const registration = {id: '11111111-1111-4111-8111-111111111111', email: 'invoice-tenant@example.invalid', password_hash: passwordHash, workshop_name: store.settings.workshop, name: 'Synthetic tenant'};
  for (const statement of provisioningStatements(registration, {at: Date.now(), guard: {sql: '1', values: []}, store}, 'd1')) f.sqlite.prepare(statement.sql).run(...statement.values);
  const logged = await f.call('/api/auth/login', 'POST', {email: registration.email, password});
  assert.equal(logged.status, 200);
  const tenant = {cookie: logged.headers.get('Set-Cookie').split(';')[0], csrf: (await logged.json()).csrfToken};
  const source = await f.call('/api/admin/invoice-source', 'GET', undefined, {Cookie: tenant.cookie, 'X-CSRF-Token': tenant.csrf});
  assert.equal(source.status, 200); const data = await source.json(); assert.equal(data.settings.workshop, store.settings.workshop);
  const rootSource = await f.call('/api/admin/invoice-source', 'GET', undefined, {Cookie: root.cookie, 'X-CSRF-Token': root.csrf});
  assert.equal(rootSource.status, 200); const rootData = await rootSource.json(); assert.notEqual(rootData.settings.workshop, store.settings.workshop);
  assert.equal(rootData.revision, data.revision);
  assert.equal((await f.call('/api/admin/invoice-source', 'GET', undefined, {Cookie: tenant.cookie, 'X-CSRF-Token': root.csrf})).status, 403);
  assert.equal((await f.call('/api/admin/invoice-source', 'GET', undefined, {Cookie: root.cookie, 'X-CSRF-Token': tenant.csrf})).status, 403);
});

test('Store saves use revision CAS and revoked sessions cannot publish', async t => {
  const f = await fixture(t), auth = await f.login();
  const headers = { Cookie: auth.cookie, 'X-CSRF-Token': auth.csrf };
  const first = await f.call('/api/store', 'PUT', { revision: 0, data: emptyStore() }, headers);
  assert.equal(first.status, 200); assert.equal((await first.json()).revision, 1);
  assert.equal((await f.call('/api/store', 'PUT', { revision: 0, data: emptyStore() }, headers)).status, 409);
  f.db.beforeBatch = statements => {
    if (statements[0].sql.includes('INSERT INTO workshop_chunks')) f.sqlite.exec('DELETE FROM sessions');
  };
  assert.equal((await f.call('/api/store', 'PUT', { revision: 1, data: emptyStore() }, headers)).status, 401);
  assert.equal(f.sqlite.prepare('SELECT revision FROM workshop').get().revision, 1);
});

test('D1 preserves direct intervention prices and only allows explicit resets or legacy backup restores', async t => {
  const f = await fixture(t), auth = await f.login();
  const headers = { Cookie: auth.cookie, 'X-CSRF-Token': auth.csrf }, store = demoStore();
  setRepairInterventionCost(store, store.repairs[0].id, 42.5);
  const saved = await f.call('/api/store', 'PUT', { revision: 0, data: store, mode: 'edit' }, headers);
  assert.equal(saved.status, 200);
  const read = await (await f.call('/api/store', 'GET', undefined, headers)).json();
  assert.equal(read.repairs[0].interventionCost, 42.5);
  const invalid = structuredClone(read); invalid.repairs[0].interventionCost = 42.501;
  assert.equal((await f.call('/api/store', 'PUT', { revision: read.revision, data: invalid, mode: 'edit' }, headers)).status, 400);
  const legacy = structuredClone(read); delete legacy.repairs[0].interventionCost;
  const rejected = await f.call('/api/store', 'PUT', { revision: read.revision, data: legacy, mode: 'edit' }, headers);
  assert.equal(rejected.status, 409); assert.match((await rejected.json()).error, /version.*ancienne/i);
  assert.deepEqual(await (await f.call('/api/store', 'GET', undefined, headers)).json(), read);
  const restored = await f.call('/api/store', 'PUT', { revision: read.revision, data: legacy, mode: 'restore' }, headers);
  assert.equal(restored.status, 200);
  const priced = await restored.json(); assert.equal(priced.repairs[0].interventionCost, undefined);
  priced.repairs[0].interventionCost = 0;
  const free = await f.call('/api/store', 'PUT', { revision: priced.revision, data: priced, mode: 'edit' }, headers);
  assert.equal(free.status, 200);
  const automatic = await free.json(); assert.equal(automatic.repairs[0].interventionCost, 0);
  automatic.repairs[0].interventionCost = null;
  const reset = await f.call('/api/store', 'PUT', { revision: automatic.revision, data: automatic, mode: 'edit' }, headers);
  assert.equal(reset.status, 200);
  assert.equal((await (await f.call('/api/store', 'GET', undefined, headers)).json()).repairs[0].interventionCost, null);
});
test('D1 keeps client requests and legacy data private, and rejects old bundles or missing client links', async t => {
  const f = await fixture(t), auth = await f.login();
  const headers = { Cookie: auth.cookie, 'X-CSRF-Token': auth.csrf };
  const legacy = demoStore(); delete legacy.clients;
  legacy.consoles.forEach(console => { delete console.clientId; });
  f.sqlite.prepare("UPDATE workshop SET revision=0,generation='legacy' WHERE id=1").run();
  f.sqlite.prepare("INSERT INTO workshop_chunks(generation,position,data) VALUES('legacy',0,?)").run(JSON.stringify(legacy));
  const oldRead = await f.call('/api/store', 'GET', undefined, headers);
  assert.equal(oldRead.status, 200);
  const oldData = await oldRead.json();
  assert.equal(oldData.clients, undefined);
  const oldSave = await f.call('/api/store', 'PUT', { revision: 0, data: oldData }, headers);
  assert.equal(oldSave.status, 409);
  assert.match((await oldSave.json()).error, /version.*ancienne/i);
  const store = validateStore(oldData);
  assert.deepEqual(store.clients, []);
  const client = createClient(store, { name: 'Client synthétique', email: 'client@example.invalid', phone: '0600000000', address: 'Adresse de test', notes: 'Deux consoles déposées' });
  const requests = createClientRepairs(store, client.id, [
    { brand: 'Nintendo', model: 'Game Boy', serial: 'SYNTHETIC-GB', accessories: 'Console seule', title: 'Réparer le son', symptoms: 'Son absent', priority: 'normale', dueDate: '' },
    { brand: 'Sega', model: 'Mega Drive', serial: 'SYNTHETIC-MD', accessories: 'Alimentation', title: 'Réparer la vidéo', symptoms: 'Écran noir', priority: 'haute', dueDate: '' },
  ]);
  const saved = await f.call('/api/store', 'PUT', { revision: 0, data: store }, headers);
  assert.equal(saved.status, 200);
  const read = await (await f.call('/api/store', 'GET', undefined, headers)).json();
  assert.deepEqual(read.clients, [client]);
  assert.equal(read.consoles.filter(console => console.clientId === client.id).length, 2);
  assert.deepEqual(requests.map(request => read.repairs.find(repair => repair.id === request.id)), requests);
  assert.deepEqual(read.consoles.filter(console => !console.clientId), validateStore(legacy).consoles);
  assert.deepEqual(read.parts, legacy.parts);
  assert.deepEqual(read.repairs.filter(repair => legacy.repairs.some(existing => existing.id === repair.id)), legacy.repairs);
  const stale = structuredClone(store); stale.clients[0].phone = 'STALE';
  assert.equal((await f.call('/api/store', 'PUT', { revision: 0, data: stale }, headers)).status, 409);
  const invalid = structuredClone(read); invalid.consoles.find(console => console.clientId === client.id).clientId = 'client-missing';
  assert.equal((await f.call('/api/store', 'PUT', { revision: read.revision, data: invalid }, headers)).status, 400);
  assert.deepEqual(await (await f.call('/api/store', 'GET', undefined, headers)).json(), read);
  assert.equal((await f.call('/api/store')).status, 401);
  assert.equal((await f.call('/api/store', 'PUT', { revision: read.revision, data: read })).status, 401);
});

test('Bounded JSON streams enforce format, compression, UTF-8 and actual bytes', async t => {
  const f = await fixture(t);
  assert.equal((await f.call('/api/auth/login', 'POST', '{}', { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await f.call('/api/auth/login', 'POST', '{}', { 'Content-Type': 'application/json; charset=iso-8859-1' })).status, 415);
  assert.equal((await f.call('/api/auth/login', 'POST', '{}', { 'Content-Encoding': 'gzip' })).status, 415);
  assert.equal((await f.call('/api/auth/login', 'POST', new Uint8Array([0xff]))).status, 400);
  assert.equal((await f.call('/api/auth/login', 'POST', 'x'.repeat(4097), { 'Content-Length': '1' })).status, 413);
});

test('Login CAS rejects a password change during hashing and keeps email throttling', async t => {
  const f = await fixture(t);
  f.db.beforeBatch = statements => {
    if (statements[0].sql.includes('INSERT INTO sessions')) {
      f.sqlite.prepare('UPDATE admin SET password_hash = ?').run('changed-snapshot');
    }
  };
  const result = await f.call('/api/auth/login', 'POST', { email: 'admin@example.invalid', password });
  assert.equal(result.status, 401);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS count FROM sessions').get().count, 0);
  assert.equal(f.sqlite.prepare('SELECT hits FROM limits WHERE key = ?').get('email:' + await digest('admin@example.invalid')).hits, 1);
});

test('Password CAS rechecks session at commit and leaves password unchanged on expiry', async t => {
  const f = await fixture(t), auth = await f.login();
  f.db.beforeBatch = statements => {
    if (statements[0].sql.includes('UPDATE admin SET password_hash')) {
      f.sqlite.prepare('UPDATE sessions SET expires_at = ?').run(Date.now() - 1);
    }
  };
  const result = await f.call('/api/auth/password', 'POST', { currentPassword: password, newPassword: 'Another synthetic password for tests' },
    { Cookie: auth.cookie, 'X-CSRF-Token': auth.csrf });
  assert.equal(result.status, 401);
  assert.equal(f.sqlite.prepare('SELECT password_hash FROM admin').get().password_hash, passwordHash);
});

test('Password CAS detects a concurrent hash change without revoking unrelated sessions', async t => {
  const f = await fixture(t), auth = await f.login();
  f.db.beforeBatch = statements => {
    if (statements[0].sql.includes('UPDATE admin SET password_hash')) f.sqlite.prepare('UPDATE admin SET password_hash = ?').run('concurrent-change');
  };
  const result = await f.call('/api/auth/password', 'POST', { currentPassword: password, newPassword: 'Another synthetic password for tests' },
    { Cookie: auth.cookie, 'X-CSRF-Token': auth.csrf });
  assert.equal(result.status, 409);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS count FROM sessions').get().count, 1);
});

test('Successful password change revokes all sessions; logout clears the cookie', async t => {
  const f = await fixture(t), auth = await f.login();
  const other = token();
  f.sqlite.prepare('INSERT INTO sessions(token_hash,admin_id,csrf,expires_at,seen_at) VALUES(?,1,?,?,?)')
    .run(await digest(other), token(), Date.now() + 100000, Date.now());
  const result = await f.call('/api/auth/password', 'POST', { currentPassword: password, newPassword: 'Another synthetic password for tests' },
    { Cookie: auth.cookie, 'X-CSRF-Token': auth.csrf });
  assert.equal(result.status, 200);
  assert.match(result.headers.get('Set-Cookie'), /Max-Age=0; Secure/);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS count FROM sessions').get().count, 0);
  assert.equal(await verifyPassword('Another synthetic password for tests', f.sqlite.prepare('SELECT password_hash FROM admin').get().password_hash), true);
  f.sqlite.prepare('UPDATE admin SET password_hash = ?').run(passwordHash);
  const newAuth = await f.login();
  const logout = await f.call('/api/auth/logout', 'POST', undefined, { Cookie: newAuth.cookie, 'X-CSRF-Token': newAuth.csrf });
  assert.equal(logout.status, 200); assert.match(logout.headers.get('Set-Cookie'), /Max-Age=0/);
});

test('Unknown accounts cannot authenticate and repeated failures return Retry-After', async t => {
  const f = await fixture(t);
  for (let index = 0; index < 5; index++) {
    assert.equal((await f.call('/api/auth/login', 'POST', { email: 'unknown@example.invalid', password })).status, 401);
  }
  const blocked = await f.call('/api/auth/login', 'POST', { email: 'unknown@example.invalid', password });
  assert.equal(blocked.status, 429); assert.ok(Number(blocked.headers.get('Retry-After')) > 0);
});

async function clientAccessFixture(t) {
  const f = await fixture(t), auth = await f.login(), store = emptyStore();
  const client = createClient(store, { name: 'Client de test de concurrence', email: 'race-client@example.invalid', phone: '', address: '', notes: '' });
  f.sqlite.prepare("UPDATE workshop SET generation='client-fixture' WHERE id=1").run();
  f.sqlite.prepare("INSERT INTO workshop_chunks(generation,position,data) VALUES('client-fixture',0,?)").run(JSON.stringify(store));
  return { ...f, store, client, path: `/api/admin/client-access/${client.id}`,
    headers: { Cookie: auth.cookie, 'X-CSRF-Token': auth.csrf } };
}

test('Client account creation rechecks the admin session after hashing, inside its transaction', async t => {
  const f = await clientAccessFixture(t);
  f.db.beforeBatch = statements => {
    if (statements[0].sql.includes('INSERT INTO client_accounts')) f.sqlite.exec('DELETE FROM sessions');
  };
  const result = await f.call(f.path, 'POST', { email: f.client.email, password }, f.headers);
  assert.equal(result.status, 401);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS count FROM client_accounts').get().count, 0);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS count FROM client_sessions').get().count, 0);
});

test('Client account creation cannot outlive a concurrent workshop change or client removal', async t => {
  for (const remove of [false, true]) {
    await t.test(remove ? 'removed client' : 'changed workshop revision', async child => {
      const f = await clientAccessFixture(child);
      f.db.beforeBatch = statements => {
        if (!statements[0].sql.includes('INSERT INTO client_accounts')) return;
        const current = structuredClone(f.store); current.revision = 1;
        if (remove) { current.clients = []; current.events = []; }
        f.sqlite.prepare('UPDATE workshop SET revision=1 WHERE id=1').run();
        f.sqlite.prepare("UPDATE workshop_chunks SET data=? WHERE generation='client-fixture' AND position=0").run(JSON.stringify(current));
      };
      const result = await f.call(f.path, 'POST', { email: f.client.email, password }, f.headers);
      assert.equal(result.status, 409);
      assert.equal(f.sqlite.prepare('SELECT count(*) AS count FROM client_accounts').get().count, 0);
      assert.equal(f.sqlite.prepare('SELECT count(*) AS count FROM client_sessions').get().count, 0);
      assert.equal(f.sqlite.prepare('SELECT revision FROM workshop').get().revision, 1);
    });
  }
});

test('A concurrent client password reset cannot issue a session for the previous password', async t => {
  const f = await clientAccessFixture(t);
  assert.equal((await f.call(f.path, 'POST', { email: f.client.email, password }, f.headers)).status, 200);
  f.db.beforeBatch = statements => {
    if (statements[0].sql.includes('INSERT INTO client_sessions')) {
      f.sqlite.prepare('UPDATE client_accounts SET password_hash=? WHERE client_id=?').run('concurrent-password-reset', f.client.id);
    }
  };
  const result = await f.call('/api/client/auth/login', 'POST', { email: f.client.email, password });
  assert.equal(result.status, 401);
  assert.equal(result.headers.get('Set-Cookie'), null);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS count FROM client_sessions').get().count, 0);
  assert.equal(f.sqlite.prepare('SELECT password_hash FROM client_accounts WHERE client_id=?').get(f.client.id).password_hash, 'concurrent-password-reset');
  assert.equal(f.sqlite.prepare('SELECT hits FROM limits WHERE key=?').get('client-email:' + await digest(f.client.email)).hits, 1);
});
