import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {readFileSync, readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createApplication} from '../server/application.mjs';
import {digest, token} from '../server/security.mjs';
import {provisioningStatements, workshopPrefix} from '../server/workshop-scope.mjs';
import {emptyStore, createClient, createClientRepairs, moveRepair, validateStore} from './.compiled/domain.cjs';
import {createPublicRepair, faultSuggestions, publicIntakeSettings} from './.compiled/repair-intake-domain.cjs';
import worker from '../cloudflare/worker.mjs';

const nativeFetch = globalThis.fetch;
const shopEmail = 'shop@example.invalid';
const fakeKey = 're_SYNTHETIC_LIFECYCLE_TEST_NOT_A_CREDENTIAL';
const password = 'Synthetic lifecycle test phrase 2026!';
const eventKeys = ['created', 'attente-envoi', 'reception', 'diagnostic', 'attente-pieces', 'reparation', 'tests',
  'terminee', 'irreparable', 'abandonnee', 'proposal-published', 'proposal-decided', 'return-transfer-declared',
  'return-payment-confirmed', 'return-dispatched', 'buyback-completed'];
const customer = {name: 'Client fictif', email: 'intake@example.invalid', phone: '0600000000', address: '1 rue Fictive, 75000 Paris'};
const intake = () => ({requestId: crypto.randomUUID(), modelId: 'ps5', customModel: '',
  selectedFaults: [faultSuggestions('ps5')[0]], description: 'PRIVATE_SYMPTOMS', serial: 'PRIVATE_SERIAL', accessories: ''});
const offer = (overrides = {}) => ({kind: 'repair', description: 'Proposition publique fictive.', repairAmount: 79.95,
  buybackAmount: null, returnFee: 12.5, bankInstructions: 'PRIVATE_BANK_INSTRUCTIONS', ...overrides});
const repairInput = {brand: 'Nintendo', model: 'DS Lite', serial: '', accessories: '', title: 'Dossier fictif',
  symptoms: 'PRIVATE_SYMPTOMS', priority: 'normale', dueDate: ''};

function sampleStore() {
  const store = emptyStore();
  store.settings.workshop = 'Atelier fictif'; store.settings.owner = 'PRIVATE_OWNER';
  store.settings.publicIntake = {...publicIntakeSettings(store), email: shopEmail};
  const clients = ['a', 'b'].map(suffix => createClient(store, {name: `Client fictif ${suffix}`,
    email: `${suffix}@example.invalid`, phone: '', address: '', notes: 'PRIVATE_CLIENT_NOTE'}));
  const legacyId = createClientRepairs(store, clients[0].id, [repairInput])[0].id;
  const publicIds = clients.map(client => {
    const id = createPublicRepair(store, client.id, intake()).repair.id;
    moveRepair(store, id, 'diagnostic'); return id;
  });
  for (const repair of store.repairs) repair.diagnosis = 'PRIVATE_DIAGNOSIS';
  for (const console of store.consoles) console.notes = 'PRIVATE_CONSOLE_NOTE';
  validateStore(store);
  return {store, clients, legacyId, publicIds};
}

async function fixture(t, platform, {configured = true} = {}) {
  const initial = sampleStore(), origin = platform === 'node' ? 'http://127.0.0.1:3041' : 'https://lifecycle.example';
  const mailEnv = configured ? {RESEND_API_KEY: fakeKey, MAIL_FROM: 'sender@example.invalid', MAIL_PORTAL_ORIGIN: origin} : {};
  const sent = [], jobs = [];
  let sqlite, app, call, beforePublication, providerStatus = 200;
  const provider = async (url, options) => {
    assert.equal(String(url), 'https://api.resend.com/emails', 'no external request may escape the synthetic mail provider');
    sent.push({body: JSON.parse(options.body), headers: new Headers(options.headers)});
    return Response.json(providerStatus === 200 ? {id: `synthetic-${sent.length}`} : {message: 'PRIVATE_PROVIDER_RESPONSE'}, {status: providerStatus});
  };
  if (platform === 'node') {
    app = createApplication({databasePath: ':memory:', origin, notificationEnv: mailEnv,
      notificationFetch: provider, notificationPollingMs: 0});
    sqlite = app.db;
    sqlite.prepare('UPDATE workshop SET data=?,revision=? WHERE id=1').run(JSON.stringify(initial.store), initial.store.revision);
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
    for (const name of readdirSync(migrations).filter(name => name.endsWith('.sql')).sort()) {
      sqlite.exec(readFileSync(new URL(name, migrations), 'utf8'));
    }
    sqlite.prepare("UPDATE workshop SET generation='fixture',revision=? WHERE id=1").run(initial.store.revision);
    sqlite.prepare("INSERT INTO workshop_chunks(generation,position,data) VALUES('fixture',0,?)").run(JSON.stringify(initial.store));
    const db = {
      prepare(sql) {
        const statement = (values = []) => ({sql,
          bind(...bindings) {return statement(bindings);},
          execute() {
            assert.ok(values.length <= 100);
            const results = sqlite.prepare(sql).all(...values);
            return {success: true, results, meta: sqlite.prepare('SELECT changes() AS changes').get()};
          },
          async run() {return this.execute();}, async all() {return this.execute();},
          async first(column) {const row = this.execute().results[0] ?? null; return column && row ? row[column] : row;},
        }); return statement();
      },
      async batch(statements) {
        if (statements.some(statement => /INSERT INTO workshop_chunks/.test(statement.sql))) {
          const hook = beforePublication; beforePublication = undefined; hook?.();
        }
        sqlite.exec('BEGIN IMMEDIATE');
        try {const result = statements.map(statement => statement.execute()); sqlite.exec('COMMIT'); return result;}
        catch (error) {sqlite.exec('ROLLBACK'); throw error;}
      },
    };
    t.mock.method(globalThis, 'fetch', provider);
    call = (path, options) => worker.fetch(new Request(origin + path, options), {DB: db, ...mailEnv},
      {waitUntil(job) {jobs.push(job);}});
    t.after(async () => {while (jobs.length) await Promise.all(jobs.splice(0)); sqlite.close();});
  }
  sqlite.prepare("INSERT INTO admin(id,email,password_hash,role) VALUES(1,'admin@example.invalid','synthetic-no-login','admin')").run();
  function session(kind, client = initial.clients[0], prefix = '', workshopId) {
    const value = token(), csrf = token(), at = Date.now();
    if (kind === 'admin') sqlite.prepare(`INSERT INTO ${prefix}sessions(token_hash,admin_id,csrf,expires_at,seen_at) VALUES(?,1,?,?,?)`)
      .run(digest(value), csrf, at + 3600000, at);
    else {
      sqlite.prepare(`INSERT INTO ${prefix}client_accounts(client_id,email,password_hash,enabled,created_at,updated_at) VALUES(?,?,?,1,?,?)`)
        .run(client.id, client.email, 'synthetic-no-login', at, at);
      sqlite.prepare(`INSERT INTO ${prefix}client_sessions(token_hash,client_id,csrf,expires_at,seen_at) VALUES(?,?,?,?,?)`)
        .run(digest(value), client.id, csrf, at + 3600000, at);
    }
    if (workshopId) sqlite.prepare('INSERT INTO saas_session_index(token_hash,workshop_id,kind,expires_at) VALUES(?,?,?,?)')
      .run(digest(value), workshopId, kind, at + 3600000);
    return {cookie: `${platform === 'worker' ? '__Host-' : ''}clinique_${kind === 'admin' ? '' : 'client_'}session=${value}`, csrf};
  }
  const admin = session('admin'), client = session('client'), other = session('client', initial.clients[1]);
  function read(prefix = '') {
    return platform === 'node' ? JSON.parse(sqlite.prepare(`SELECT data FROM ${prefix}workshop WHERE id=1`).get().data)
      : JSON.parse(sqlite.prepare(`SELECT c.data FROM ${prefix}workshop w JOIN ${prefix}workshop_chunks c ON c.generation=w.generation WHERE w.id=1 ORDER BY c.position`)
        .all().map(row => row.data).join(''));
  }
  function replace(store, prefix = '') {
    if (platform === 'node') sqlite.prepare(`UPDATE ${prefix}workshop SET data=?,revision=? WHERE id=1`).run(JSON.stringify(store), store.revision);
    else {
      const generation = crypto.randomUUID();
      sqlite.prepare(`INSERT INTO ${prefix}workshop_chunks(generation,position,data) VALUES(?,0,?)`).run(generation, JSON.stringify(store));
      sqlite.prepare(`UPDATE ${prefix}workshop SET generation=?,revision=? WHERE id=1`).run(generation, store.revision);
    }
  }
  async function request(path, {method = 'GET', body, cookie, csrf, headers = {}} = {}) {
    const response = await call(path, {method, headers: {Origin: origin,
      ...(body === undefined ? {} : {'Content-Type': 'application/json'}), ...(cookie ? {Cookie: cookie} : {}),
      ...(csrf ? {'X-CSRF-Token': csrf} : {}), ...headers}, ...(body === undefined ? {} : {body: JSON.stringify(body)})});
    return {status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0]};
  }
  const rows = (prefix = '') => sqlite.prepare(`SELECT * FROM ${prefix}repair_notifications ORDER BY created_at,id`).all()
    .map(row => ({...row, payload: JSON.parse(row.payload)}));
  const drain = async () => {
    if (app) await app.processNotifications();
    while (jobs.length) await Promise.all(jobs.splice(0));
  };
  const save = (data, revision = read().revision, credentials = admin, mode = 'edit') => request('/api/store',
    {...credentials, method: 'PUT', body: {revision, data, mode}});
  const publicId = initial.publicIds[0], adminPath = `/api/admin/repairs/${publicId}/proposal`, clientPath = `/api/client/repairs/${publicId}/proposal`;
  const publish = (input = offer(), credentials = admin, revision = read().revision) => request(adminPath,
    {...credentials, method: 'POST', body: {revision, action: 'publish', ...input}});
  const choose = (action, proposalId = read().repairs.find(repair => repair.id === publicId).proposal?.id, credentials = client) => request(clientPath,
    {...credentials, method: 'POST', body: {proposalId, action}});
  const operate = (action, extra = {}) => request(adminPath, {...admin, method: 'POST', body: {revision: read().revision,
    proposalId: read().repairs.find(repair => repair.id === publicId).proposal?.id, action, ...extra}});
  const preferences = value => request('/api/admin/notifications', {...admin, method: 'PUT', body: {preferences: value}});
  const provision = () => {
    const id = crypto.randomUUID(), prefix = workshopPrefix(id), at = Date.now(), store = emptyStore();
    store.settings.workshop = 'Autre atelier fictif';
    for (const {sql, values} of provisioningStatements({id, email: 'tenant-admin@example.invalid', password_hash: 'synthetic-no-login',
      workshop_name: store.settings.workshop, name: 'Responsable fictif'}, {at, guard: {sql: '1=1', values: []}, store}, platform === 'node' ? 'node' : 'd1')) {
      sqlite.prepare(sql).run(...values);
    }
    const content = structuredClone(initial.store); content.settings.workshop = store.settings.workshop;
    content.settings.publicIntake.email = 'tenant-shop@example.invalid'; replace(content, prefix);
    return {id, prefix, admin: session('admin', undefined, prefix, id), client: session('client', initial.clients[0], prefix, id)};
  };
  return {...initial, sqlite, admin, client, other, sent, read, replace, request, rows, drain, save, publish, choose,
    operate, preferences, provision, adminPath, clientPath, publicId, setProviderStatus(value) {providerStatus = value;},
    beforePublication(hook) {beforePublication = hook;}};
}

function assertPair(f, revision, repairId, eventType, {prefix = '', workshopId, clientEmail = f.clients[0].email,
  storeEmail = shopEmail} = {}) {
  const rows = f.rows(prefix).filter(row => row.repair_id === repairId && row.payload.eventType === eventType &&
    row.id.includes(`repair-event:${revision}:${repairId}:`));
  assert.equal(rows.length, 2, `one ${eventType} email per audience at revision ${revision}`);
  for (const audience of ['client', 'shop']) {
    const row = rows.find(item => item.payload.audience === audience); assert.ok(row, `${eventType}: ${audience}`);
    assert.equal(row.payload.version, 2);
    assert.equal(row.id, `${workshopId ? workshopId + ':' : ''}repair-event:${revision}:${repairId}:${eventType}:${audience}`);
    assert.equal(row.recipient, audience === 'client' ? clientEmail : storeEmail);
    assert.ok(!JSON.stringify(row.payload).includes('PRIVATE_'));
    assert.ok(!JSON.stringify(row.payload).includes(fakeKey));
  }
  return rows;
}
async function successful(f, result) {assert.equal(result.status, 200, JSON.stringify(result.data)); await f.drain(); return result.data;}

export function registerLifecycleMailTests(platform) {
  test(`${platform}: the root shop uses the same canonical public contact before settings are saved`, async t => {
    const f = await fixture(t, platform), store = f.read();
    delete store.settings.publicIntake; f.replace(store);
    const contact = publicIntakeSettings(store).email;
    const status = await f.request('/api/admin/notifications', f.admin);
    assert.equal(status.status, 200); assert.equal(status.data.shopRecipient, contact);
    assert.equal(status.data.shopRecipientMissing, false);
    const publicSettings = await f.request('/api/public/repair-intake');
    assert.equal(publicSettings.data.shop.email, contact);
    await successful(f, await f.publish());
    assertPair(f, 1, f.publicId, 'proposal-published', {storeEmail: contact});
    assert.equal(f.sent.length, 2);
    assert.equal(Object.hasOwn(f.read().settings, 'publicIntake'), false, 'notification projection never persists defaults');
  });

  test(`${platform}: a tenant without a saved contact never inherits the root shop contact`, async t => {
    const f = await fixture(t, platform), tenant = f.provision(), store = f.read(tenant.prefix);
    delete store.settings.publicIntake; f.replace(store, tenant.prefix);
    const status = await f.request('/api/admin/notifications', tenant.admin);
    assert.equal(status.status, 200); assert.equal(status.data.shopRecipient, '');
    assert.equal(status.data.shopRecipientMissing, true);
    await successful(f, await f.publish(offer(), tenant.admin, store.revision));
    const rows = f.rows(tenant.prefix);
    assert.equal(rows.length, 1); assert.equal(rows[0].payload.audience, 'client');
    assert.equal(rows[0].recipient, f.clients[0].email);
    assert.equal(f.rows().length, 0);
  });

  test(`${platform}: signup and a second public request each notify client and shop once`, async t => {
    const f = await fixture(t, platform), firstIntake = intake();
    const input = {customer, password, intake: firstIntake};
    const signup = await f.request('/api/public/repair-intake/register', {method: 'POST', body: input});
    assert.equal(signup.status, 201, JSON.stringify(signup.data)); await f.drain();
    assertPair(f, 1, signup.data.repairId, 'created', {clientEmail: customer.email});
    assert.equal(f.rows().length, 2);
    assert.equal((await f.request('/api/public/repair-intake/register', {method: 'POST', body: input})).status, 409);
    const auth = {cookie: signup.cookie, csrf: signup.data.session.csrfToken}, nextIntake = intake();
    const second = await f.request('/api/client/repair-intake', {...auth, method: 'POST', body: {intake: nextIntake}});
    assert.equal(second.status, 200, JSON.stringify(second.data)); await f.drain();
    assertPair(f, 2, second.data.repairId, 'created', {clientEmail: customer.email});
    const replay = await f.request('/api/client/repair-intake', {...auth, method: 'POST', body: {intake: nextIntake}});
    assert.equal(replay.status, 200, JSON.stringify(replay.data)); await f.drain();
    assert.equal(f.rows().length, 4); assert.equal(f.sent.length, 4);
    assert.equal(new Set(f.sent.map(item => item.headers.get('Idempotency-Key'))).size, 4);
    assert.ok(f.sent.every(item => !JSON.stringify(item.body).includes('PRIVATE_')));
  });

  test(`${platform}: ordinary creation and every repair stage emit one pair only after a successful save`, async t => {
    const f = await fixture(t, platform), created = f.read();
    const newId = createClientRepairs(created, f.clients[0].id, [{...repairInput, model: 'Game Boy Color'}])[0].id;
    await successful(f, await f.save(created)); assertPair(f, 1, newId, 'created');
    let revision = 1;
    for (const stage of ['attente-envoi', 'reception', 'diagnostic', 'attente-pieces', 'reparation', 'tests', 'terminee', 'irreparable', 'abandonnee']) {
      const draft = f.read(); moveRepair(draft, f.legacyId, stage);
      await successful(f, await f.save(draft)); revision++; assertPair(f, revision, f.legacyId, stage);
      const count = f.rows().length;
      assert.equal((await f.save(draft, revision - 1)).status, 409); await f.drain(); assert.equal(f.rows().length, count);
    }
    const privateEdit = f.read(); privateEdit.repairs[0].diagnosis = 'PRIVATE_NEW_DIAGNOSIS';
    await successful(f, await f.save(privateEdit)); assert.equal(f.rows().length, 20);
    const history = await f.request(`/api/admin/notifications?clientId=${f.clients[0].id}`, f.admin);
    assert.equal(history.status, 200); assert.equal(history.data.counts.sent, 10);
    assert.ok(history.data.recent.every(row => row.audience === 'client' && row.clientId === f.clients[0].id));
    assert.ok(!JSON.stringify(history.data).includes('PRIVATE_'));
  });

  test(`${platform}: publishing, replacing and accepting a proposal notify once and reject stale choices`, async t => {
    const f = await fixture(t, platform);
    await successful(f, await f.publish()); assertPair(f, 1, f.publicId, 'proposal-published');
    const oldId = f.read().repairs.find(repair => repair.id === f.publicId).proposal.id;
    await successful(f, await f.publish()); assert.equal(f.rows().length, 2);
    await successful(f, await f.publish(offer({repairAmount: 99.95})));
    assertPair(f, 2, f.publicId, 'proposal-published');
    assert.equal((await f.choose('repair', oldId)).status, 409);
    assert.equal((await f.publish(offer({repairAmount: 100}), f.admin, 1)).status, 409);
    assert.equal((await f.choose('repair', undefined, f.other)).status, 404);
    await successful(f, await f.choose('repair')); assertPair(f, 3, f.publicId, 'proposal-decided');
    await successful(f, await f.choose('repair')); assert.equal(f.rows().length, 6);
    assert.ok(f.sent.every(item => !JSON.stringify(item.body).includes('PRIVATE_')));
  });

  test(`${platform}: refusal, transfer, payment confirmation and dispatch each notify both audiences without duplicate stage messages`, async t => {
    const f = await fixture(t, platform); await successful(f, await f.publish());
    await successful(f, await f.choose('return')); assertPair(f, 2, f.publicId, 'proposal-decided');
    assert.equal(f.read().repairs.find(repair => repair.id === f.publicId).stage, 'abandonnee');
    assert.equal(f.rows().length, 4, 'the automatic abandonment is represented by the decision event only');
    assert.equal((await f.operate('dispatch-return', {tracking: 'SYNTHETIC-PARCEL'})).status, 409);
    await successful(f, await f.choose('declare-transfer')); assertPair(f, 3, f.publicId, 'return-transfer-declared');
    await successful(f, await f.choose('declare-transfer')); assert.equal(f.rows().length, 6);
    await successful(f, await f.operate('confirm-return-payment')); assertPair(f, 4, f.publicId, 'return-payment-confirmed');
    await successful(f, await f.operate('confirm-return-payment')); assert.equal(f.rows().length, 8);
    await successful(f, await f.operate('dispatch-return', {tracking: 'SYNTHETIC-PARCEL'})); assertPair(f, 5, f.publicId, 'return-dispatched');
    await successful(f, await f.operate('dispatch-return', {tracking: 'SYNTHETIC-PARCEL'})); assert.equal(f.rows().length, 10);
    assert.ok(f.sent.every(item => !JSON.stringify(item.body).includes('PRIVATE_')));
  });

  test(`${platform}: accepting and completing an unrepairable buyback each notify once per audience`, async t => {
    const f = await fixture(t, platform);
    await successful(f, await f.publish(offer({kind: 'unrepairable', repairAmount: null, buybackAmount: 18.5})));
    await successful(f, await f.choose('buyback')); assertPair(f, 2, f.publicId, 'proposal-decided');
    assert.equal(f.rows().length, 4, 'the automatic irreparable stage does not duplicate the decision message');
    await successful(f, await f.operate('complete-buyback')); assertPair(f, 3, f.publicId, 'buyback-completed');
    await successful(f, await f.operate('complete-buyback')); assert.equal(f.rows().length, 6);
  });

  test(`${platform}: preference controls expose complete defaults and enforce admin, CSRF, origin and strict booleans`, async t => {
    const f = await fixture(t, platform), path = '/api/admin/notifications';
    const initial = await f.request(path, f.admin); assert.equal(initial.status, 200);
    assert.deepEqual(initial.data.events.map(item => item.key).sort(), [...eventKeys].sort());
    assert.equal(initial.data.shopRecipient, shopEmail); assert.equal(initial.data.shopRecipientMissing, false);
    for (const audience of ['client', 'shop']) assert.deepEqual(initial.data.preferences[audience], Object.fromEntries(eventKeys.map(key => [key, true])));
    const body = {preferences: {shop: {'proposal-published': false}}};
    assert.equal((await f.request(path, {method: 'PUT', body})).status, 401);
    assert.equal((await f.request(path, {...f.client, method: 'PUT', body})).status, 401);
    assert.equal((await f.request(path, {cookie: f.admin.cookie, method: 'PUT', body})).status, 403);
    assert.equal((await f.request(path, {...f.admin, method: 'PUT', body, headers: {Origin: 'https://evil.example'}})).status, 403);
    for (const preferences of [null, [], {other: {}}, {client: {'unknown-event': false}}, {client: {created: 'false'}}, {shop: false}]) {
      assert.equal((await f.preferences(preferences)).status, 400, JSON.stringify(preferences));
    }
    const changed = await f.preferences(body.preferences); assert.equal(changed.status, 200, JSON.stringify(changed.data));
    const saved = await f.request(path, f.admin);
    assert.equal(saved.data.enabled, true); assert.equal(saved.data.preferences.shop['proposal-published'], false);
    assert.equal(saved.data.preferences.client['proposal-published'], true); assert.equal(saved.data.preferences.shop.created, true);
    assert.ok(!JSON.stringify(saved.data).includes(fakeKey));
  });

  test(`${platform}: disabling one event audience cancels its pending email and filters future changes independently of global pause`, async t => {
    const f = await fixture(t, platform); f.setProviderStatus(503); await successful(f, await f.publish());
    assert.equal(f.rows().filter(row => row.status === 'pending').length, 2);
    await successful(f, await f.preferences({shop: {'proposal-published': false}}));
    assert.equal(f.rows().find(row => row.payload.audience === 'shop').status, 'cancelled');
    assert.equal(f.rows().find(row => row.payload.audience === 'client').status, 'pending');
    await successful(f, await f.publish(offer({repairAmount: 80})));
    assert.equal(f.rows().length, 3); assert.equal(f.rows().filter(row => row.payload.audience === 'client').length, 2);
    assert.equal((await f.request('/api/admin/notifications', f.admin)).data.enabled, true);
    await successful(f, await f.request('/api/admin/notifications', {...f.admin, method: 'PUT', body: {enabled: false}}));
    assert.ok(f.rows().every(row => row.status === 'cancelled'));
    await successful(f, await f.preferences({shop: {'proposal-published': true}}));
    assert.equal((await f.request('/api/admin/notifications', f.admin)).data.enabled, false);
    await successful(f, await f.publish(offer({repairAmount: 81}))); assert.equal(f.rows().length, 3);
  });

  test(`${platform}: changing the shop contact cancels stale recipients and uses the new public contact`, async t => {
    const f = await fixture(t, platform); f.setProviderStatus(503); await successful(f, await f.publish());
    const draft = f.read(); draft.settings.publicIntake.email = 'new-shop@example.invalid';
    await successful(f, await f.save(draft));
    const shop = f.rows().find(row => row.payload.audience === 'shop'); assert.ok(shop);
    f.sqlite.prepare('UPDATE repair_notifications SET next_attempt_at=0 WHERE id=?').run(shop.id);
    f.setProviderStatus(200);
    await successful(f, await f.request('/api/admin/notifications', {...f.admin, method: 'PUT', body: {enabled: true}}));
    await successful(f, await f.publish(offer({repairAmount: 80})));
    assert.equal(f.rows().find(row => row.id === shop.id).status, 'cancelled');
    assertPair(f, 3, f.publicId, 'proposal-published', {storeEmail: 'new-shop@example.invalid'});
    assert.ok(!f.sent.slice(2).some(item => item.body.to.includes(shopEmail)));
  });

  test(`${platform}: a missing recipient skips only its audience and reports the missing shop contact`, async t => {
    const f = await fixture(t, platform), draft = f.read();
    draft.settings.publicIntake.email = ''; f.replace(draft);
    const status = await f.request('/api/admin/notifications', f.admin);
    assert.equal(status.data.shopRecipient, ''); assert.equal(status.data.shopRecipientMissing, true);
    await successful(f, await f.publish());
    assert.equal(f.rows().length, 1); assert.equal(f.rows()[0].payload.audience, 'client');
    const changed = f.read(); changed.settings.publicIntake.email = shopEmail;
    changed.clients.find(item => item.id === f.clients[0].id).email = ''; f.replace(changed);
    await successful(f, await f.publish(offer({repairAmount: 80})));
    const latest = f.rows().filter(row => row.id.includes('repair-event:2:'));
    assert.equal(latest.length, 1); assert.equal(latest[0].payload.audience, 'shop'); assert.equal(latest[0].recipient, shopEmail);
  });

  test(`${platform}: a notification insert failure rolls back the repair publication and its complete outbox`, async t => {
    const f = await fixture(t, platform), before = f.read();
    f.sqlite.exec("CREATE TEMP TRIGGER fail_lifecycle_mail BEFORE INSERT ON repair_notifications WHEN json_extract(NEW.payload,'$.audience')='shop' BEGIN SELECT RAISE(ABORT, 'Synthetic lifecycle outbox failure'); END");
    const rejected = await f.publish(); assert.equal(rejected.status, 500, rejected.data.error);
    await f.drain(); assert.deepEqual(f.read(), before); assert.equal(f.rows().length, 0); assert.equal(f.sent.length, 0);
    f.sqlite.exec('DROP TRIGGER fail_lifecycle_mail');
    await successful(f, await f.publish()); assertPair(f, 1, f.publicId, 'proposal-published');
  });

  test(`${platform}: a failed initial intake outbox leaves no customer, account or session behind`, async t => {
    const f = await fixture(t, platform), before = f.read();
    const accounts = f.sqlite.prepare('SELECT count(*) AS n FROM client_accounts').get().n;
    const sessions = f.sqlite.prepare('SELECT count(*) AS n FROM client_sessions').get().n;
    f.sqlite.exec("CREATE TEMP TRIGGER fail_lifecycle_signup BEFORE INSERT ON repair_notifications WHEN json_extract(NEW.payload,'$.audience')='shop' BEGIN SELECT RAISE(ABORT, 'Synthetic signup outbox failure'); END");
    const response = await f.request('/api/public/repair-intake/register', {method: 'POST', body: {customer, password, intake: intake()}});
    assert.equal(response.status, 500, response.data.error); await f.drain();
    assert.deepEqual(f.read(), before); assert.equal(f.rows().length, 0); assert.equal(f.sent.length, 0);
    assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM client_accounts').get().n, accounts);
    assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM client_sessions').get().n, sessions);
  });

  test(`${platform}: preference cancellation failure rolls back both preferences and all pending audiences`, async t => {
    const f = await fixture(t, platform); f.setProviderStatus(503); await successful(f, await f.publish());
    const before = await f.request('/api/admin/notifications', f.admin);
    f.sqlite.exec("CREATE TEMP TRIGGER fail_lifecycle_preference BEFORE UPDATE OF status ON repair_notifications WHEN NEW.status='cancelled' BEGIN SELECT RAISE(ABORT, 'Synthetic preference cancellation failure'); END");
    assert.equal((await f.preferences({shop: {'proposal-published': false}})).status, 500);
    const after = await f.request('/api/admin/notifications', f.admin);
    assert.deepEqual(after.data.preferences, before.data.preferences); assert.equal(after.data.enabled, true);
    assert.equal(f.rows().length, 2); assert.ok(f.rows().every(row => row.status === 'pending'));
  });

  test(`${platform}: tenant preferences and mail use isolated tables, shop contacts and audience IDs`, async t => {
    const f = await fixture(t, platform), tenant = f.provision();
    await successful(f, await f.preferences({shop: {'proposal-published': false}}));
    const tenantStatus = await f.request('/api/admin/notifications', tenant.admin); assert.equal(tenantStatus.status, 200);
    assert.equal(tenantStatus.data.preferences.shop['proposal-published'], true);
    assert.equal(tenantStatus.data.shopRecipient, 'tenant-shop@example.invalid');
    const published = await f.publish(offer({repairAmount: 23.5}), tenant.admin, 0);
    await successful(f, published);
    assertPair(f, 1, f.publicId, 'proposal-published', {prefix: tenant.prefix, workshopId: tenant.id, storeEmail: 'tenant-shop@example.invalid'});
    assert.equal(f.rows().length, 0); assert.equal(f.read().revision, 0);
    await successful(f, await f.publish());
    assert.equal(f.rows().length, 1); assert.equal(f.rows()[0].payload.audience, 'client');
    assert.equal(f.rows(tenant.prefix).length, 2);
    const otherHistory = await f.request(`/api/admin/notifications?clientId=${f.clients[0].id}`, tenant.admin);
    assert.equal(otherHistory.data.counts.sent, 1); assert.ok(otherHistory.data.recent.every(row => row.audience === 'client'));
  });

  test(`${platform}: incomplete mail configuration keeps lifecycle actions working without an outbox`, async t => {
    const f = await fixture(t, platform, {configured: false}); await successful(f, await f.publish());
    await successful(f, await f.choose('return'));
    const signup = await f.request('/api/public/repair-intake/register', {method: 'POST', body: {customer, password, intake: intake()}});
    assert.equal(signup.status, 201, JSON.stringify(signup.data)); await f.drain();
    assert.equal(f.rows().length, 0); assert.equal(f.sent.length, 0);
  });

  if (platform === 'worker') test('worker: a concurrent revision rejects both a proposal decision and its lifecycle emails atomically', async t => {
    const f = await fixture(t, platform); await successful(f, await f.publish());
    const concurrent = f.read(); concurrent.revision++; concurrent.repairs[0].diagnosis = 'PRIVATE_CONCURRENT_DIAGNOSIS';
    f.beforePublication(() => f.replace(concurrent));
    const rejected = await f.choose('repair'); assert.equal(rejected.status, 409, JSON.stringify(rejected.data));
    await f.drain(); assert.deepEqual(f.read(), concurrent); assert.equal(f.rows().length, 2); assert.equal(f.sent.length, 2);
  });
}
