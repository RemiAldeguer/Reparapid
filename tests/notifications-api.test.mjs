import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {readFileSync, readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createApplication} from '../server/application.mjs';
import {digest} from '../server/security.mjs';
import worker from '../cloudflare/worker.mjs';
import {emptyStore, createClient, createClientRepairs, validateStore, moveRepair, setRepairInterventionCost, setRepairPayment} from '../tests/.compiled/domain.cjs';

const fakeKey = 're_SYNTHETIC_NOT_A_REAL_EMAIL_CREDENTIAL';
const nativeFetch = globalThis.fetch;
function fixtureStore() {
  const store = emptyStore();
  const makeClient = (name, email) => createClient(store, {name, email, phone: '', address: '', notes: 'PRIVATE_CLIENT_NOTE'});
  const a = makeClient('Client A', 'a@example.invalid'), b = makeClient('Client B', 'b@example.invalid');
  const c = makeClient('Sans adresse', '');
  const makeRepairs = (client, models) => createClientRepairs(store, client.id, models.map(model => ({
    brand: 'Nintendo', model, serial: '', accessories: '', title: 'Réparation privée', symptoms: 'PRIVATE_SYMPTOMS', priority: 'normale', dueDate: '',
  })));
  const aRepairs = makeRepairs(a, ['DS Lite', 'Game Boy Color']);
  const bRepair = makeRepairs(b, ['Switch Lite'])[0];
  const cRepairs = makeRepairs(c, ['Game Boy', 'Nintendo DS']);
  store.consoles.find(item => item.id === cRepairs[1].consoleId).clientId = '';
  for (const event of store.events) if (event.consoleId === cRepairs[1].consoleId) delete event.clientId;
  for (const console of store.consoles) {console.notes = 'PRIVATE_CONSOLE_NOTE'; console.location = 'PRIVATE_LOCATION';}
  for (const repair of store.repairs) repair.diagnosis = 'PRIVATE_DIAGNOSIS';
  validateStore(store);
  return {store, a, b, c, aRepairs, bRepair, cRepairs};
}

async function fixture(t, platform, {configured = true, legacyStage = false} = {}) {
  const source = fixtureStore(), origin = platform === 'node' ? 'http://127.0.0.1:3041' : 'https://clinique.example';
  if (legacyStage) {
    setRepairInterventionCost(source.store, source.aRepairs[0].id, 42.5);
    setRepairPayment(source.store, source.aRepairs[0].id, true);
    source.store.repairs.find(repair => repair.id === source.aRepairs[0].id).stage = 'a-commander';
  }
  const mailEnv = configured ? {RESEND_API_KEY: fakeKey, MAIL_FROM: 'sender@atelier.example', MAIL_PORTAL_ORIGIN: origin} : {};
  const sent = [], jobs = [];
  let providerStatus = 200, sqlite, call, app;
  const provider = async (url, options) => {
    assert.equal(String(url), 'https://api.resend.com/emails', 'only the synthetic provider endpoint is allowed');
    sent.push({headers: new Headers(options.headers), body: JSON.parse(options.body)});
    return Response.json(providerStatus === 200 ? {id: `synthetic-${sent.length}`} : {message: `PRIVATE_PROVIDER_RESPONSE ${fakeKey}`}, {status: providerStatus});
  };
  if (platform === 'node') {
    app = createApplication({databasePath: ':memory:', origin, notificationEnv: mailEnv, notificationFetch: provider, notificationPollingMs: 0});
    sqlite = app.db;
    sqlite.prepare('UPDATE workshop SET data=? WHERE id=1').run(JSON.stringify(source.store));
    app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening');
    const base = `http://127.0.0.1:${app.server.address().port}`;
    call = (path, options) => nativeFetch(base + path, options);
    t.after(async () => {
      await app.processNotifications();
      await new Promise(resolve => {app.server.closeAllConnections(); app.server.close(resolve);});
    });
  } else {
    sqlite = new DatabaseSync(':memory:');
    const migrations = new URL('../cloudflare/migrations/', import.meta.url);
    for (const name of readdirSync(migrations).filter(name => name.endsWith('.sql')).sort()) sqlite.exec(readFileSync(new URL(name, migrations), 'utf8'));
    sqlite.prepare("UPDATE workshop SET generation='fixture' WHERE id=1").run();
    sqlite.prepare("INSERT INTO workshop_chunks(generation,position,data) VALUES('fixture',0,?)").run(JSON.stringify(source.store));
    const db = {
      prepare(sql) {
        const statement = (values = []) => ({
          bind(...bindings) {return statement(bindings);},
          execute() {const results = sqlite.prepare(sql).all(...values); return {results, success: true, meta: sqlite.prepare('SELECT changes() AS changes').get()};},
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
    t.mock.method(globalThis, 'fetch', provider);
    call = (path, options) => worker.fetch(new Request(origin + path, options), {DB: db, ...mailEnv}, {waitUntil(job) {jobs.push(job);}});
    t.after(async () => {await Promise.all(jobs); sqlite.close();});
  }
  const at = Date.now(), adminToken = 'A'.repeat(43), clientToken = 'B'.repeat(43), csrf = 'synthetic-admin-csrf';
  sqlite.prepare("INSERT INTO admin(id,email,password_hash,role) VALUES(1,'admin@example.invalid','synthetic-password-hash','admin')").run();
  sqlite.prepare('INSERT INTO sessions(token_hash,admin_id,csrf,expires_at,seen_at) VALUES(?,1,?,?,?)')
    .run(digest(adminToken), csrf, at + 3600000, at);
  sqlite.prepare('INSERT INTO client_accounts(client_id,email,password_hash,enabled,created_at,updated_at) VALUES(?,?,?,1,?,?)')
    .run(source.a.id, source.a.email, 'synthetic-client-hash', at, at);
  sqlite.prepare('INSERT INTO client_sessions(token_hash,client_id,csrf,expires_at,seen_at) VALUES(?,?,?,?,?)')
    .run(digest(clientToken), source.a.id, 'synthetic-client-csrf', at + 3600000, at);
  const auth = {cookie: `${platform === 'node' ? 'clinique_session' : '__Host-clinique_session'}=${adminToken}`, csrf};
  const client = {cookie: `${platform === 'node' ? 'clinique_client_session' : '__Host-clinique_client_session'}=${clientToken}`, csrf: 'synthetic-client-csrf'};
  async function request(path, {method = 'GET', body, cookie = '', csrf = '', headers = {}} = {}) {
    const response = await call(path, {method, headers: {Origin: origin, ...(body === undefined ? {} : {'Content-Type': 'application/json'}), ...(cookie ? {Cookie: cookie} : {}), ...(csrf ? {'X-CSRF-Token': csrf} : {}), ...headers}, ...(body === undefined ? {} : {body: JSON.stringify(body)})});
    return {status: response.status, data: await response.json()};
  }
  async function drain() {
    if (app) await app.processNotifications();
    while (jobs.length) await Promise.all(jobs.splice(0));
  }
  const save = (data, revision, mode = 'edit') => request('/api/store', {...auth, method: 'PUT', body: {revision, data, ...(mode === undefined ? {} : {mode})}});
  const storedStore = () => platform === 'node'
    ? JSON.parse(sqlite.prepare('SELECT data FROM workshop WHERE id=1').get().data)
    : JSON.parse(sqlite.prepare('SELECT c.data FROM workshop w JOIN workshop_chunks c ON c.generation=w.generation WHERE w.id=1 ORDER BY c.position').all().map(row => row.data).join(''));
  return {...source, auth, client, sqlite, sent, request, drain, save, storedStore, setProviderStatus(status) {providerStatus = status;}};
}

for (const platform of ['node', 'worker']) {
  test(`${platform}: legacy ordering stages read as waiting for parts without writes or migration emails`, async t => {
    const f = await fixture(t, platform, {legacyStage: true});
    const source = structuredClone(f.store), id = f.aRepairs[0].id;
    const read = await f.request('/api/store', f.auth); assert.equal(read.status, 200);
    assert.equal(read.data.revision, 0);
    assert.equal(read.data.repairs.find(repair => repair.id === id).stage, 'attente-pieces');
    assert.deepEqual(read.data.repairs.find(repair => repair.id === id).payment, source.repairs.find(repair => repair.id === id).payment);
    assert.deepEqual(read.data.events, source.events);
    assert.deepEqual(f.storedStore(), source, 'a read must not persist normalization or consume a revision');
    const portal = await f.request('/api/client/portal', f.client); assert.equal(portal.status, 200);
    assert.equal(portal.data.repairs.find(repair => repair.id === id).stage, 'attente-pieces');
    for (const secret of ['PRIVATE_DIAGNOSIS', 'PRIVATE_CONSOLE_NOTE', 'PRIVATE_CLIENT_NOTE', 'PRIVATE_LOCATION']) {
      assert.ok(!JSON.stringify(portal.data).includes(secret));
    }
    assert.ok(portal.data.repairs.every(repair => !('payment' in repair) && !('diagnosis' in repair)));
    assert.deepEqual(f.storedStore(), source);
    const ordinary = structuredClone(read.data); ordinary.repairs.find(repair => repair.id === id).diagnosis = 'Only a diagnostic note changed';
    const saved = await f.save(ordinary, read.data.revision); assert.equal(saved.status, 200); await f.drain();
    assert.equal(saved.data.revision, 1);
    assert.equal(f.storedStore().repairs.find(repair => repair.id === id).stage, 'attente-pieces');
    assert.deepEqual(saved.data.repairs.find(repair => repair.id === id).payment, source.repairs.find(repair => repair.id === id).payment);
    assert.equal(f.sent.length, 0);
    assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM repair_notifications').get().n, 0);
    const realChange = structuredClone(saved.data); moveRepair(realChange, id, 'reparation');
    const moved = await f.save(realChange, saved.data.revision); assert.equal(moved.status, 200); await f.drain();
    assert.equal(moved.data.revision, 2); assert.equal(f.sent.length, 1);
    const payload = JSON.parse(f.sqlite.prepare('SELECT payload FROM repair_notifications').get().payload);
    assert.equal(payload.oldStage, 'En attente de pièces'); assert.equal(payload.newStage, 'Réparation en cours');
  });

  test(`${platform}: importing an older backup canonicalizes ordering stages without a notification`, async t => {
    const f = await fixture(t, platform), legacy = structuredClone(f.store), id = f.aRepairs[0].id;
    legacy.repairs.find(repair => repair.id === id).stage = 'a-commander';
    const imported = await f.save(legacy, 0, 'restore'); assert.equal(imported.status, 200); await f.drain();
    assert.equal(imported.data.revision, 1);
    assert.equal(imported.data.repairs.find(repair => repair.id === id).stage, 'attente-pieces');
    assert.equal(f.storedStore().repairs.find(repair => repair.id === id).stage, 'attente-pieces');
    assert.equal(legacy.repairs.find(repair => repair.id === id).stage, 'a-commander');
    assert.equal(f.sent.length, 0);
    assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM repair_notifications').get().n, 0);
  });

  test(`${platform}: an older editor saving an alias for the same waiting stage causes no status email`, async t => {
    const f = await fixture(t, platform), id = f.aRepairs[0].id;
    const waiting = structuredClone(f.store); moveRepair(waiting, id, 'attente-pieces');
    const installed = await f.save(waiting, 0, 'restore'); assert.equal(installed.status, 200); await f.drain();
    const legacy = structuredClone(installed.data); legacy.repairs.find(repair => repair.id === id).stage = 'a-commander';
    const edited = await f.save(legacy, installed.data.revision); assert.equal(edited.status, 200); await f.drain();
    assert.equal(edited.data.revision, 2);
    assert.equal(edited.data.repairs.find(repair => repair.id === id).stage, 'attente-pieces');
    assert.equal(f.sent.length, 0);
    assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM repair_notifications').get().n, 0);
  });

  test(`${platform}: accepted status changes send isolated emails and CAS replay sends nothing`, async t => {
    const f = await fixture(t, platform);
    const initial = await f.request('/api/admin/notifications', f.auth);
    assert.equal(initial.status, 200); assert.equal(initial.data.configured, true);
    assert.ok(!JSON.stringify(initial.data).includes(fakeKey));
    const first = structuredClone(f.store); moveRepair(first, f.aRepairs[0].id, 'terminee');
    const result = await f.save(first, 0); assert.equal(result.status, 200); await f.drain();
    assert.equal(f.sent.length, 1); assert.deepEqual(f.sent[0].body.to, [f.a.email]);
    assert.ok(f.sent[0].body.text.includes('Terminée'));
    assert.ok(f.sent[0].body.text.includes('Nintendo DS Lite'));
    assert.ok(!JSON.stringify(f.sent[0].body).includes('PRIVATE'));
    assert.ok(!JSON.stringify(f.sent[0].body).includes('Switch Lite'));
    assert.equal((await f.save(first, 0)).status, 409); await f.drain(); assert.equal(f.sent.length, 1);
    const second = structuredClone(result.data); moveRepair(second, f.aRepairs[1].id, 'diagnostic'); moveRepair(second, f.bRepair.id, 'diagnostic');
    assert.equal((await f.save(second, 1)).status, 200); await f.drain();
    assert.equal(f.sent.length, 3);
    assert.equal(f.sent.filter(message => message.body.to[0] === f.a.email).length, 2);
    assert.equal(f.sent.filter(message => message.body.to[0] === f.b.email).length, 1);
    assert.equal(new Set(f.sent.map(message => message.headers.get('Idempotency-Key'))).size, 3);
    const statusA = await f.request(`/api/admin/notifications?clientId=${f.a.id}`, f.auth);
    const statusB = await f.request(`/api/admin/notifications?clientId=${f.b.id}`, f.auth);
    assert.equal(statusA.data.counts.sent, 2); assert.equal(statusB.data.counts.sent, 1);
    assert.ok(statusA.data.recent.every(row => row.clientId === f.a.id));
    assert.ok(!JSON.stringify(statusA.data).includes(fakeKey)); assert.ok(!JSON.stringify(statusA.data).includes('PRIVATE'));
    assert.ok(statusA.data.recent.every(row => !('payload' in row) && !('claimToken' in row) && !('providerId' in row)));
  });

  test(`${platform}: ordinary edits, new repairs, console collection and missing emails produce no queue`, async t => {
    const f = await fixture(t, platform), draft = structuredClone(f.store);
    draft.repairs.find(repair => repair.id === f.aRepairs[0].id).diagnosis = 'Changed private diagnosis';
    createClientRepairs(draft, f.a.id, [{brand: 'Nintendo', model: 'Game Boy Advance', serial: '', accessories: '', title: 'Nouveau dossier', symptoms: '', priority: 'normale', dueDate: ''}]);
    moveRepair(draft, f.cRepairs[0].id, 'diagnostic'); moveRepair(draft, f.cRepairs[1].id, 'diagnostic');
    assert.equal((await f.save(draft, 0)).status, 200); await f.drain();
    assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM repair_notifications').get().n, 0);
    assert.equal(f.sent.length, 0);
  });

  test(`${platform}: recording and cancelling a payment leaves repair stages unchanged and never sends status emails`, async t => {
    const f = await fixture(t, platform), paid = structuredClone(f.store);
    const id = f.aRepairs[0].id, initialStage = paid.repairs.find(repair => repair.id === id).stage;
    setRepairInterventionCost(paid, id, 42.5); setRepairPayment(paid, id, true);
    const result = await f.save(paid, 0); assert.equal(result.status, 200); await f.drain();
    assert.equal(result.data.repairs.find(repair => repair.id === id).stage, initialStage);
    assert.equal(result.data.repairs.find(repair => repair.id === id).payment.amount, 42.5);
    assert.equal(f.sent.length, 0);
    assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM repair_notifications').get().n, 0);
    const unpaid = structuredClone(result.data); setRepairPayment(unpaid, id, false);
    const cancelled = await f.save(unpaid, result.data.revision); assert.equal(cancelled.status, 200); await f.drain();
    assert.equal(cancelled.data.repairs.find(repair => repair.id === id).stage, initialStage);
    assert.equal(cancelled.data.repairs.find(repair => repair.id === id).payment, null);
    assert.equal(f.sent.length, 0);
    assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM repair_notifications').get().n, 0);
  });

  for (const mode of ['restore', 'reset']) {
    test(`${platform}: ${mode} cancels queued emails and does not notify imported stage differences`, async t => {
      const f = await fixture(t, platform); f.setProviderStatus(503);
      const draft = structuredClone(f.store); moveRepair(draft, f.aRepairs[0].id, 'diagnostic');
      const first = await f.save(draft, 0); assert.equal(first.status, 200); await f.drain();
      assert.equal(f.sqlite.prepare('SELECT status FROM repair_notifications').get().status, 'pending');
      const replacement = structuredClone(first.data); moveRepair(replacement, f.aRepairs[0].id, 'terminee');
      assert.equal((await f.save(replacement, 1, mode)).status, 200); await f.drain();
      assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM repair_notifications').get().n, 1);
      assert.equal(f.sqlite.prepare('SELECT status FROM repair_notifications').get().status, 'cancelled');
      assert.equal(f.sent.length, 1);
    });
  }

  test(`${platform}: admin notification controls enforce CSRF, origin, client isolation and pause`, async t => {
    const f = await fixture(t, platform), path = '/api/admin/notifications';
    assert.equal((await f.request(path)).status, 401);
    assert.equal((await f.request(path, f.client)).status, 401);
    assert.equal((await f.request(path, {...f.client, method: 'PUT', body: {enabled: false}})).status, 401);
    assert.equal((await f.request(path, {cookie: f.auth.cookie, method: 'PUT', body: {enabled: false}})).status, 403);
    assert.equal((await f.request(path, {...f.auth, method: 'PUT', body: {enabled: false}, headers: {Origin: 'https://evil.example'}})).status, 403);
    assert.equal((await f.request(path, {...f.auth, method: 'PUT', body: {enabled: 'false'}})).status, 400);
    assert.equal((await f.request(path + '?clientId=../other', f.auth)).status, 400);
    f.setProviderStatus(503);
    const draft = structuredClone(f.store); moveRepair(draft, f.aRepairs[0].id, 'diagnostic');
    const first = await f.save(draft, 0); assert.equal(first.status, 200); await f.drain();
    assert.equal((await f.request(path, {...f.auth, method: 'PUT', body: {enabled: false}})).status, 200);
    assert.equal(f.sqlite.prepare('SELECT status FROM repair_notifications').get().status, 'cancelled');
    const paused = structuredClone(first.data); moveRepair(paused, f.aRepairs[0].id, 'reparation');
    const second = await f.save(paused, 1); assert.equal(second.status, 200); await f.drain();
    assert.equal(f.sent.length, 1); assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM repair_notifications').get().n, 1);
    assert.equal((await f.request(path, {...f.auth, method: 'PUT', body: {enabled: true}})).status, 200);
    f.setProviderStatus(200);
    const resumed = structuredClone(second.data); moveRepair(resumed, f.aRepairs[0].id, 'tests');
    assert.equal((await f.save(resumed, 2)).status, 200); await f.drain();
    assert.equal(f.sent.length, 2); assert.equal(f.sqlite.prepare("SELECT count(*) AS n FROM repair_notifications WHERE status='sent'").get().n, 1);
  });

  test(`${platform}: configured service rejects old bundles and invalid save modes before any publication`, async t => {
    const f = await fixture(t, platform), draft = structuredClone(f.store); moveRepair(draft, f.aRepairs[0].id, 'diagnostic');
    assert.equal((await f.request('/api/store', {...f.auth, method: 'PUT', body: {revision: 0, data: draft}})).status, 409);
    assert.equal((await f.save(draft, 0, 'unknown')).status, 400); await f.drain();
    assert.equal(f.sqlite.prepare('SELECT revision FROM workshop').get().revision, 0);
    assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM repair_notifications').get().n, 0);
    assert.equal(f.sent.length, 0);
  });

  test(`${platform}: a cancellation failure rolls back the pause setting and all queued statuses`, async t => {
    const f = await fixture(t, platform); f.setProviderStatus(503);
    const draft = structuredClone(f.store); moveRepair(draft, f.aRepairs[0].id, 'diagnostic');
    assert.equal((await f.save(draft, 0)).status, 200); await f.drain();
    f.sqlite.exec(`CREATE TEMP TRIGGER fail_notification_pause BEFORE UPDATE OF status ON repair_notifications
      WHEN NEW.status='cancelled' BEGIN SELECT RAISE(ABORT, 'Synthetic pause failure'); END`);
    assert.equal((await f.request('/api/admin/notifications', {...f.auth, method: 'PUT', body: {enabled: false}})).status, 500);
    assert.equal(f.sqlite.prepare('SELECT enabled FROM notification_settings').get().enabled, 1);
    assert.equal(f.sqlite.prepare('SELECT status FROM repair_notifications').get().status, 'pending');
    f.sqlite.exec('DROP TRIGGER fail_notification_pause');
    assert.equal((await f.request('/api/admin/notifications', {...f.auth, method: 'PUT', body: {enabled: false}})).status, 200);
    assert.equal(f.sqlite.prepare('SELECT enabled FROM notification_settings').get().enabled, 0);
    assert.equal(f.sqlite.prepare('SELECT status FROM repair_notifications').get().status, 'cancelled');
  });

  test(`${platform}: an unconfigured service reports missing setup and preserves normal editing without queueing`, async t => {
    const f = await fixture(t, platform, {configured: false});
    const status = await f.request('/api/admin/notifications', f.auth);
    assert.equal(status.status, 200); assert.equal(status.data.configured, false); assert.ok(status.data.issue);
    assert.ok(!JSON.stringify(status.data).includes('apiKey'));
    assert.equal((await f.request('/api/admin/notifications', {...f.auth, method: 'PUT', body: {enabled: true}})).status, 503);
    const draft = structuredClone(f.store); moveRepair(draft, f.aRepairs[0].id, 'terminee');
    assert.equal((await f.request('/api/store', {...f.auth, method: 'PUT', body: {revision: 0, data: draft}})).status, 200);
    await f.drain(); assert.equal(f.sent.length, 0);
    assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM repair_notifications').get().n, 0);
  });

  test(`${platform}: retrying a failed notification requires admin CSRF and keeps the provider idempotency key`, async t => {
    const f = await fixture(t, platform); f.setProviderStatus(400);
    const draft = structuredClone(f.store); moveRepair(draft, f.aRepairs[0].id, 'diagnostic');
    assert.equal((await f.save(draft, 0)).status, 200); await f.drain();
    const row = f.sqlite.prepare('SELECT * FROM repair_notifications').get(); assert.equal(row.status, 'failed');
    const path = '/api/admin/notifications/retry';
    assert.equal((await f.request(path, {cookie: f.auth.cookie, method: 'POST', body: {id: row.id}})).status, 403);
    assert.equal((await f.request(path, {...f.client, method: 'POST', body: {id: row.id}})).status, 401);
    assert.equal((await f.request(path, {...f.auth, method: 'POST', body: {id: 'invalid'}})).status, 400);
    assert.equal((await f.request(path, {...f.auth, method: 'POST', body: {id: 'repair-status:1:missing'}})).status, 409);
    f.setProviderStatus(200);
    assert.equal((await f.request(path, {...f.auth, method: 'POST', body: {id: row.id}})).status, 200); await f.drain();
    assert.equal(f.sent.length, 2); assert.equal(f.sent[0].headers.get('Idempotency-Key'), f.sent[1].headers.get('Idempotency-Key'));
    assert.equal(f.sqlite.prepare('SELECT status FROM repair_notifications').get().status, 'sent');
    assert.equal((await f.request(path, {...f.auth, method: 'POST', body: {id: row.id}})).status, 409);
    const status = await f.request('/api/admin/notifications', f.auth);
    assert.ok(!JSON.stringify(status.data).includes('PRIVATE_PROVIDER_RESPONSE'));
    assert.ok(!JSON.stringify(status.data).includes(fakeKey));
  });
}
