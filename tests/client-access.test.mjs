import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {readFileSync, readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createApplication} from '../server/application.mjs';
import {hashPassword as nodeHash} from '../server/security.mjs';
import {hashPassword as workerHash} from '../cloudflare/security.mjs';
import worker from '../cloudflare/worker.mjs';
import {clientPortal} from '../server/client-portal.mjs';
import {emptyStore, createClient, createClientRepairs, createRepair, validateStore, moveRepair, repairTotalCost, setRepairTotalCost, setRepairInterventionCost, setRepairPayment, addClientPartRequest, updateClientPartRequest, setClientPartRequestStatus, removeClientPartRequest, deleteRepair, deleteConsole} from '../tests/.compiled/domain.cjs';
import {repairNotifications} from '../server/repair-notifications.mjs';

const adminEmail = 'admin@example.invalid';
const password = 'Synthetic access testing phrase 2026!';
const nextPassword = 'Replacement synthetic testing phrase 2026!';
const hashes = {};
const fixtureStore = () => {
  const store = emptyStore();
  const a = createClient(store, {name: 'Client A', email: 'a@example.invalid', phone: '', address: '', notes: 'PRIVATE_CLIENT_NOTE'});
  const b = createClient(store, {name: 'Client B', email: 'b@example.invalid', phone: '', address: '', notes: 'OTHER_CLIENT_NOTE'});
  createClientRepairs(store, a.id, [{brand: 'Nintendo', model: 'DS Lite', serial: 'A-123', accessories: 'Chargeur', title: 'Écran A', symptoms: 'Image instable', priority: 'normale', dueDate: ''}]);
  createClientRepairs(store, b.id, [{brand: 'Nintendo', model: 'Game Boy', serial: 'B-456', accessories: '', title: 'Réparation B privée', symptoms: 'B seulement', priority: 'normale', dueDate: ''}]);
  const console = store.consoles.find(c => c.clientId === a.id);
  console.notes = 'PRIVATE_CONSOLE_NOTE'; console.location = 'PRIVATE_LOCATION'; console.purchasePrice = 123.45;
  console.source = 'PRIVATE_SOURCE'; console.condition = 'PRIVATE_CONDITION';
  const stamp = new Date().toISOString();
  console.photos = [{id:'PRIVATE_CONSOLE_PHOTO',data:'data:image/png;base64,UFJJVkFURV9JTUFHRV9CWVRFUw==',caption:'PRIVATE_PHOTO_CAPTION',createdAt:stamp}];
  const repair = store.repairs.find(r => r.consoleId === console.id);
  repair.diagnosis = 'PRIVATE_DIAGNOSIS'; repair.tests[0].id = 'PRIVATE_TEST_ID'; repair.tests[0].label = 'PRIVATE_TEST_LABEL';
  repair.photos = [{id:'PRIVATE_REPAIR_PHOTO',data:'data:image/png;base64,UFJJVkFURV9JTUFHRV9CWVRFUw==',caption:'PRIVATE_REPAIR_PHOTO_CAPTION',createdAt:stamp}];
  repair.worklogs = [{id:'PRIVATE_WORKLOG_ID',minutes:0,note:'PRIVATE_WORKLOG_NOTE',createdAt:stamp}];
  store.parts.push({id:'PRIVATE_PART_ID',reference:'PRIVATE_PART_REFERENCE',name:'PRIVATE_PART_NAME',category:'',compatibility:'',quantity:4,threshold:1,unitCost:0,location:'PRIVATE_PART_LOCATION',supplier:'PRIVATE_SUPPLIER'});
  repair.parts = [{id:'PRIVATE_USAGE_ID',partId:'PRIVATE_PART_ID',name:'PRIVATE_PART_NAME',quantity:1,unitCost:0,usedAt:stamp}];
  store.settings.owner = 'PRIVATE_OWNER'; a.address = 'PRIVATE_CLIENT_ADDRESS'; a.phone = 'PRIVATE_CLIENT_PHONE';
  store.events.unshift({id:'PRIVATE_ACTIVITY_ID',kind:'note',text:'PRIVATE_ACTIVITY_TEXT',createdAt:stamp,consoleId:console.id,repairId:repair.id,clientId:a.id});
  // Future store fields must also remain outside the explicit client projection.
  store.admin = {email:'PRIVATE_ADMIN_EMAIL',passwordHash:'PRIVATE_ADMIN_PASSWORD_HASH'};
  store.session = {token:'PRIVATE_SESSION_TOKEN',csrf:'PRIVATE_SESSION_CSRF'};
  store.rawData = 'PRIVATE_RAW_STORE'; repair.privateExtra = 'PRIVATE_REPAIR_EXTRA';
  // Model a workshop saved before client-supplied part requests were introduced.
  for (const item of store.repairs) delete item.clientParts;
  validateStore(store);
  return {store, a, b};
};

function assertPortalProjection(data) {
  assert.deepEqual(Object.keys(data).sort(), ['client','consoles','repairs','workshop']);
  assert.deepEqual(Object.keys(data.workshop), ['name']); assert.equal(typeof data.workshop.name, 'string');
  assert.deepEqual(Object.keys(data.client), ['name']);
  for (const console of data.consoles)assert.deepEqual(Object.keys(console).sort(), ['accessories','brand','code','id','model','serial','state','variant']);
  const owned = new Set(data.consoles.map(console=>console.id));
  for (const repair of data.repairs) {
    const expected = ['code','completedAt','consoleId','createdAt','dueDate','id','stage','symptoms','title','totalCost','updatedAt'];
    if (repair.clientParts !== undefined) {
      expected.push('clientParts'); assert.ok(Array.isArray(repair.clientParts));
      for (const part of repair.clientParts) assert.deepEqual(Object.keys(part).sort(), ['id','name','note','quantity','status']);
    }
    assert.deepEqual(Object.keys(repair).sort(), expected.sort());
    assert.equal(typeof repair.totalCost, 'number'); assert.ok(Number.isFinite(repair.totalCost) && repair.totalCost >= 0);
    for (const field of ['interventionCost','payment','parts','unitCost','worklogs','timerStartedAt','tests','photos','privateExtra']) assert.equal(field in repair, false);
    assert.ok(owned.has(repair.consoleId));
  }
  assert.ok(!JSON.stringify(data).includes('PRIVATE_'));
}

test('Client projection is minimal and leaves private workshop data untouched',()=>{
  const {store,a,b}=fixtureStore(),before=structuredClone(store);
  const portal=clientPortal(store,a.id,repairTotalCost);assertPortalProjection(portal);
  assert.equal(portal.workshop.name,store.settings.workshop); assert.equal(portal.repairs[0].totalCost,0);
  assert.equal(portal.client.name,a.name);assert.ok(!JSON.stringify(portal).includes(b.id));assert.ok(!JSON.stringify(portal).includes('B-456'));
  assert.equal(clientPortal(store,'missing-client',repairTotalCost),null);assert.deepEqual(store,before);
});

test('Client-supplied parts expose only their display fields to their owner, including explicit empty lists',()=>{
  const {store,a,b}=fixtureStore(),stamp=new Date().toISOString();
  const owned=store.repairs.find(repair=>store.consoles.find(item=>item.id===repair.consoleId).clientId===a.id);
  const other=store.repairs.find(repair=>repair.id!==owned.id);
  owned.clientParts=[{id:'client-part-a',name:'Écran fourni',quantity:2,note:'Modèle compatible DS Lite',status:'en-attente',createdAt:stamp,updatedAt:stamp,price:123.45,supplier:'PRIVATE_SUPPLIER',internalNotes:'PRIVATE_PART_INSTRUCTIONS',privateExtra:{token:'PRIVATE_FUTURE_TOKEN'}}];
  other.clientParts=[{id:'client-part-b',name:'Autre client : coque',quantity:1,note:'Autre console',status:'livree',createdAt:stamp,updatedAt:stamp}];
  const before=structuredClone(store),portal=clientPortal(store,a.id,repairTotalCost);assertPortalProjection(portal);
  assert.deepEqual(portal.repairs[0].clientParts,[{id:'client-part-a',name:'Écran fourni',quantity:2,note:'Modèle compatible DS Lite',status:'en-attente'}]);
  assert.equal(portal.repairs[0].totalCost,0,'client-supplied parts do not become billed stock parts');
  assert.ok(!JSON.stringify(portal).includes('client-part-b'));assert.ok(!JSON.stringify(portal).includes('Autre client : coque'));
  assert.deepEqual(store,before);
  owned.clientParts=[];assert.deepEqual(clientPortal(store,a.id,repairTotalCost).repairs[0].clientParts,[]);
  delete owned.clientParts;assert.equal('clientParts' in clientPortal(store,a.id,repairTotalCost).repairs[0],false);
});

async function fixture(t, platform) {
  const {store, a, b} = fixtureStore();
  hashes[platform] ??= await (platform === 'node' ? nodeHash : workerHash)(password);
  const origin = platform === 'node' ? 'http://127.0.0.1:3041' : 'https://clinique.example';
  let sqlite, call, nodeServer, beforeBatch;
  if (platform === 'node') {
    const app = createApplication({databasePath: ':memory:', origin});
    nodeServer = app.server;
    sqlite = app.db;
    sqlite.prepare("INSERT INTO admin(id,email,password_hash,role) VALUES(1,?,?,'admin')").run(adminEmail, hashes[platform]);
    sqlite.prepare('UPDATE workshop SET data=? WHERE id=1').run(JSON.stringify(store));
    app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening');
    const base = `http://127.0.0.1:${app.server.address().port}`;
    t.after(() => new Promise(resolve => {app.server.closeAllConnections(); app.server.close(resolve);}));
    call = (path, options) => fetch(base + path, options);
  } else {
    sqlite = new DatabaseSync(':memory:'); t.after(() => sqlite.close());
    const migrations = new URL('../cloudflare/migrations/', import.meta.url);
    for (const name of readdirSync(migrations).filter(n => n.endsWith('.sql')).sort()) sqlite.exec(readFileSync(new URL(name, migrations), 'utf8'));
    sqlite.prepare("INSERT INTO admin(id,email,password_hash,role) VALUES(1,?,?,'admin')").run(adminEmail, hashes[platform]);
    sqlite.prepare("UPDATE workshop SET generation='fixture' WHERE id=1").run();
    sqlite.prepare("INSERT INTO workshop_chunks(generation,position,data) VALUES('fixture',0,?)").run(JSON.stringify(store));
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
        const hook = beforeBatch; beforeBatch = undefined; if (hook) hook();
        sqlite.exec('BEGIN IMMEDIATE');
        try {const results = statements.map(s => s.execute()); sqlite.exec('COMMIT'); return results;}
        catch (error) {sqlite.exec('ROLLBACK'); throw error;}
      },
    };
    call = (path, options) => worker.fetch(new Request(origin + path, options), {DB: db, ASSETS: {fetch: async () => new Response('asset')}});
  }
  async function request(path, {method = 'GET', body, rawBody, cookie = '', csrf = '', headers = {}} = {}) {
    const response = await call(path, {method, headers: {Origin: origin, ...(body === undefined && rawBody === undefined ? {} : {'Content-Type': 'application/json'}), ...(cookie ? {Cookie: cookie} : {}), ...(csrf ? {'X-CSRF-Token': csrf} : {}), ...headers}, ...(rawBody === undefined ? body === undefined ? {} : {body: JSON.stringify(body)} : {body: rawBody, ...(rawBody instanceof ReadableStream ? {duplex: 'half'} : {})})});
    return {status: response.status, response, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] || ''};
  }
  async function loginAdmin() {const result = await request('/api/auth/login', {method: 'POST', body: {email: adminEmail, password}}); assert.equal(result.status, 200); return {cookie: result.cookie, csrf: result.data.csrfToken};}
  async function loginClient(email = a.email, phrase = password) {return request('/api/client/auth/login', {method: 'POST', body: {email, password: phrase}});}
  async function createAccess(auth, client = a, phrase = password) {const result = await request(`/api/admin/client-access/${client.id}`, {...auth, method: 'POST', body: {email: client.email, password: phrase}}); assert.equal(result.status, 200, JSON.stringify(result.data)); return result;}
  function replaceStore(next) {
    if (platform === 'node') sqlite.prepare('UPDATE workshop SET revision=?,data=? WHERE id=1').run(next.revision, JSON.stringify(next));
    else {
      const generation = `concurrent-${next.revision}`;
      sqlite.prepare('INSERT INTO workshop_chunks(generation,position,data) VALUES(?,0,?)').run(generation, JSON.stringify(next));
      sqlite.prepare('UPDATE workshop SET revision=?,generation=? WHERE id=1').run(next.revision, generation);
    }
  }
  async function requestDuringBody(path, auth, mutate) {
    let controller;
    const encoder = new TextEncoder();
    const finish = () => {mutate(); controller.enqueue(encoder.encode('}')); controller.close();};
    const rawBody = new ReadableStream({start(value) {controller = value; value.enqueue(encoder.encode('{'));},
      ...(platform === 'worker' ? {pull() {finish();}} : {})});
    if (nodeServer) nodeServer.once('request', finish);
    return request(path, {...auth, method: 'POST', rawBody});
  }
  return {request, requestDuringBody, replaceStore, onBeforeBatch(hook) {beforeBatch = hook;}, loginAdmin, loginClient, createAccess, sqlite, store, a, b};
}

async function availablePartFixture(t, platform) {
  const f = await fixture(t, platform), admin = await f.loginAdmin();
  await f.createAccess(admin);
  const repair = f.store.repairs.find(item => f.store.consoles.find(console => console.id === item.consoleId).clientId === f.a.id);
  const otherRepair = f.store.repairs.find(item => item.id !== repair.id);
  const part = addClientPartRequest(f.store, repair.id, {name: 'Écran DS Lite fourni', quantity: 2, note: 'Avec deux nappes compatibles'});
  const foreignPart = addClientPartRequest(f.store, otherRepair.id, {name: 'Autre client : coque', quantity: 1, note: ''});
  setRepairInterventionCost(f.store, repair.id, 42.5); setRepairPayment(f.store, repair.id, true);
  const saved = await f.request('/api/store', {...admin, method: 'PUT', body: {revision: 0, data: f.store, mode: 'edit'}});
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  const login = await f.loginClient(); assert.equal(login.status, 200);
  const client = {cookie: login.cookie, csrf: login.data.csrfToken};
  const path = `/api/client/repairs/${repair.id}/parts/${part.id}/available`;
  return {...f, admin, client, repair, otherRepair, part, foreignPart, path, saved: saved.data};
}

for (const platform of ['node', 'worker']) {
  test(`${platform}: client part availability updates its owner's request and journal without changing repair billing or stock`, async t => {
    const f = await availablePartFixture(t, platform);
    const result = await f.request(f.path, {...f.client, method: 'POST', body: {}});
    assert.equal(result.status, 200, JSON.stringify(result.data)); assertPortalProjection(result.data);
    assert.equal(result.data.repairs.find(item => item.id === f.repair.id).clientParts[0].status, 'disponible');
    assert.equal(result.data.repairs.find(item => item.id === f.repair.id).totalCost, 42.5);
    const current = (await f.request('/api/store', f.admin)).data;
    assert.equal(current.revision, f.saved.revision + 1);
    const repair = current.repairs.find(item => item.id === f.repair.id), previous = f.saved.repairs.find(item => item.id === f.repair.id);
    for (const field of ['stage', 'interventionCost', 'payment', 'parts', 'worklogs', 'tests', 'photos']) assert.deepEqual(repair[field], previous[field]);
    assert.deepEqual(current.parts, f.saved.parts); assert.deepEqual(current.consoles, f.saved.consoles);
    assert.deepEqual(current.repairs.find(item => item.id === f.otherRepair.id), f.saved.repairs.find(item => item.id === f.otherRepair.id));
    assert.equal(current.events.length, f.saved.events.length + 1);
    const event = current.events[0]; assert.equal(event.clientId, f.a.id); assert.equal(event.consoleId, f.repair.consoleId); assert.equal(event.repairId, f.repair.id); assert.match(event.text, /signalé.*disponible/);
    assert.deepEqual(repairNotifications(f.saved, current, {origin: 'https://clinique.example', now: Date.now()}), []);
    assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM repair_notifications').get().n, 0);
    const repeated = await f.request(f.path, {...f.client, method: 'POST', body: {}});
    assert.equal(repeated.status, 200); assert.deepEqual(repeated.data, result.data);
    assert.deepEqual((await f.request('/api/store', f.admin)).data, current, 'idempotence must preserve revision, timestamps and journal');
    const stale = await f.request('/api/store', {...f.admin, method: 'PUT', body: {revision: f.saved.revision, data: f.saved, mode: 'edit'}});
    assert.equal(stale.status, 409); assert.deepEqual((await f.request('/api/store', f.admin)).data, current);
  });

  test(`${platform}: client part availability rejects foreign, missing and personal identifiers uniformly`, async t => {
    const f = await availablePartFixture(t, platform);
    const paths = [
      `/api/client/repairs/${f.otherRepair.id}/parts/${f.foreignPart.id}/available`,
      `/api/client/repairs/${f.repair.id}/parts/${f.foreignPart.id}/available`,
      `/api/client/repairs/missing-repair/parts/${f.part.id}/available`,
      `/api/client/repairs/${f.repair.id}/parts/missing-part/available`,
      `/api/client/repairs/%2F/parts/${f.part.id}/available`,
    ];
    const responses = [];
    for (const path of paths) {const response = await f.request(path, {...f.client, method: 'POST', body: {}}); assert.equal(response.status, 404); responses.push(response.data);}
    assert.ok(responses.every(data => JSON.stringify(data) === JSON.stringify(responses[0])));
    assert.deepEqual((await f.request('/api/store', f.admin)).data, f.saved);
    const personal = structuredClone(f.saved);
    delete personal.consoles.find(item => item.id === f.otherRepair.consoleId).clientId;
    personal.events = personal.events.filter(item => item.consoleId !== f.otherRepair.consoleId && item.repairId !== f.otherRepair.id);
    const saved = await f.request('/api/store', {...f.admin, method: 'PUT', body: {revision: personal.revision, data: personal, mode: 'edit'}});
    assert.equal(saved.status, 200, JSON.stringify(saved.data));
    const response = await f.request(paths[0], {...f.client, method: 'POST', body: {}}); assert.equal(response.status, 404); assert.deepEqual(response.data, responses[0]);
    assert.deepEqual((await f.request('/api/store', f.admin)).data, saved.data);
  });

  test(`${platform}: client part availability requires client auth, origin, CSRF and an empty bounded JSON object`, async t => {
    const f = await availablePartFixture(t, platform);
    assert.equal((await f.request(f.path, {method: 'POST', body: {}})).status, 401);
    assert.equal((await f.request(f.path, {...f.admin, method: 'POST', body: {}})).status, 401);
    assert.equal((await f.request(f.path, {cookie: f.client.cookie, method: 'POST', body: {}})).status, 403);
    assert.equal((await f.request(f.path, {...f.client, method: 'POST', body: {}, headers: {Origin: 'https://evil.example'}})).status, 403);
    assert.equal((await f.request(f.path, {...f.client, method: 'POST', body: {}, headers: {'Sec-Fetch-Site': 'cross-site'}})).status, 403);
    assert.equal((await f.request(f.path, {...f.client, method: 'POST', body: {}, headers: {'Content-Type': 'text/plain'}})).status, 415);
    assert.equal((await f.request(f.path, f.client)).status, 405);
    for (const body of [null, [], {status: 'installee'}, {clientId: f.b.id}, {name: 'injected'}, {quantity: 100}, {workshopId: 'foreign-workshop'}]) {
      assert.equal((await f.request(f.path, {...f.client, method: 'POST', body})).status, 400);
    }
    assert.equal((await f.request(f.path, {...f.client, method: 'POST', body: {extra: 'x'.repeat(1100)}})).status, 413);
    assert.deepEqual((await f.request('/api/store', f.admin)).data, f.saved);
  });

  for (const status of ['livree', 'installee']) test(`${platform}: client cannot move a ${status} supplied part backwards`, async t => {
    const f = await availablePartFixture(t, platform), delivered = structuredClone(f.saved);
    setClientPartRequestStatus(delivered, f.repair.id, f.part.id, status);
    const saved = await f.request('/api/store', {...f.admin, method: 'PUT', body: {revision: delivered.revision, data: delivered, mode: 'edit'}});
    assert.equal(saved.status, 200);
    const rejected = await f.request(f.path, {...f.client, method: 'POST', body: {}});
    assert.equal(rejected.status, 409); assert.match(rejected.data.error, /déjà.*livrée.*installée/);
    assert.deepEqual((await f.request('/api/store', f.admin)).data, saved.data);
  });

  test(`${platform}: client can signal a waiting part in a closed dossier without reopening it`, async t => {
    const f = await availablePartFixture(t, platform), closed = structuredClone(f.saved);
    moveRepair(closed, f.repair.id, 'terminee');
    const saved = await f.request('/api/store', {...f.admin, method: 'PUT', body: {revision: closed.revision, data: closed, mode: 'edit'}});
    assert.equal(saved.status, 200);
    const response = await f.request(f.path, {...f.client, method: 'POST', body: {}});
    assert.equal(response.status, 200); assert.equal(response.data.repairs[0].stage, 'terminee'); assert.equal(response.data.repairs[0].clientParts[0].status, 'disponible');
    assert.equal(response.data.repairs[0].completedAt, saved.data.repairs.find(item => item.id === f.repair.id).completedAt);
  });

  for (const state of ['disabled', 'expired', 'idle']) test(`${platform}: ${state} client sessions cannot signal part availability`, async t => {
    const f = await availablePartFixture(t, platform);
    if (state === 'disabled') f.sqlite.prepare('UPDATE client_accounts SET enabled=0 WHERE client_id=?').run(f.a.id);
    if (state === 'expired') f.sqlite.prepare('UPDATE client_sessions SET expires_at=? WHERE client_id=?').run(Date.now() - 1, f.a.id);
    if (state === 'idle') f.sqlite.prepare('UPDATE client_sessions SET seen_at=? WHERE client_id=?').run(Date.now() - 60 * 60 * 1000, f.a.id);
    assert.equal((await f.request(f.path, {...f.client, method: 'POST', body: {}})).status, 401);
    assert.deepEqual((await f.request('/api/store', f.admin)).data, f.saved);
  });

  test(`${platform}: client availability rechecks access after a request body is received`, async t => {
    const f = await availablePartFixture(t, platform);
    const result = await f.requestDuringBody(f.path, f.client, () => f.sqlite.prepare('UPDATE client_accounts SET enabled=0 WHERE client_id=?').run(f.a.id));
    assert.equal(result.status, 401, JSON.stringify(result.data));
    assert.deepEqual((await f.request('/api/store', f.admin)).data, f.saved);
  });

  test(`${platform}: an admin change arriving during the client request is preserved in the fresh snapshot`, async t => {
    const f = await availablePartFixture(t, platform), concurrent = structuredClone(f.saved);
    setRepairInterventionCost(concurrent, f.repair.id, 87.25); concurrent.revision++;
    const result = await f.requestDuringBody(f.path, f.client, () => f.replaceStore(concurrent));
    assert.equal(result.status, 200, JSON.stringify(result.data)); assert.equal(result.data.repairs[0].totalCost, 87.25);
    const current = (await f.request('/api/store', f.admin)).data;
    assert.equal(current.revision, concurrent.revision + 1);
    assert.equal(current.repairs.find(item => item.id === f.repair.id).clientParts[0].status, 'disponible');
    assert.equal(current.repairs.find(item => item.id === f.repair.id).interventionCost, 87.25);
  });

  if (platform === 'worker') {
    test('worker: a concurrent admin publication wins the client revision CAS without losing its data', async t => {
      const f = await availablePartFixture(t, platform), concurrent = structuredClone(f.saved);
      setRepairInterventionCost(concurrent, f.repair.id, 93.75); concurrent.revision++;
      f.onBeforeBatch(() => f.replaceStore(concurrent));
      const response = await f.request(f.path, {...f.client, method: 'POST', body: {}});
      assert.equal(response.status, 409, JSON.stringify(response.data));
      assert.deepEqual((await f.request('/api/store', f.admin)).data, concurrent);
      assert.equal(f.sqlite.prepare('SELECT count(DISTINCT generation) AS n FROM workshop_chunks').get().n, 1);
    });
    for (const revoked of ['account', 'session', 'csrf', 'expiry', 'idle']) test(`worker: client publication rechecks ${revoked} at commit`, async t => {
      const f = await availablePartFixture(t, platform);
      f.onBeforeBatch(() => {
        if (revoked === 'account') f.sqlite.prepare('UPDATE client_accounts SET enabled=0 WHERE client_id=?').run(f.a.id);
        if (revoked === 'session') f.sqlite.prepare('DELETE FROM client_sessions WHERE client_id=?').run(f.a.id);
        if (revoked === 'csrf') f.sqlite.prepare("UPDATE client_sessions SET csrf='rotated-synthetic-csrf' WHERE client_id=?").run(f.a.id);
        if (revoked === 'expiry') f.sqlite.prepare('UPDATE client_sessions SET expires_at=? WHERE client_id=?').run(Date.now() - 1, f.a.id);
        if (revoked === 'idle') f.sqlite.prepare('UPDATE client_sessions SET seen_at=? WHERE client_id=?').run(Date.now() - 60 * 60 * 1000, f.a.id);
      });
      const response = await f.request(f.path, {...f.client, method: 'POST', body: {}});
      assert.equal(response.status, revoked === 'csrf' ? 403 : 401, JSON.stringify(response.data));
      assert.deepEqual((await f.request('/api/store', f.admin)).data, f.saved);
      assert.equal(f.sqlite.prepare('SELECT count(DISTINCT generation) AS n FROM workshop_chunks').get().n, 1);
    });
  }

  test(`${platform}: accounts are administered with origin/CSRF protection and keep secrets out of responses`, async t => {
    const f = await fixture(t, platform), auth = await f.loginAdmin(), path = `/api/admin/client-access/${f.a.id}`;
    assert.equal((await f.request(path)).status, 401);
    assert.deepEqual((await f.request(path, auth)).data, {access: null});
    const body = {email: f.a.email, password};
    assert.equal((await f.request(path, {cookie: auth.cookie, method: 'POST', body})).status, 403);
    assert.equal((await f.request(path, {...auth, method: 'POST', body, headers: {Origin: 'https://evil.example'}})).status, 403);
    assert.equal((await f.request(path, {...auth, method: 'POST', body: {...body, password: 'short'}})).status, 400);
    const created = await f.createAccess(auth);
    assert.equal(created.data.access.email, f.a.email); assert.equal(created.data.access.enabled, true);
    assert.equal(JSON.stringify(created.data).includes(password), false);
    const account = f.sqlite.prepare('SELECT * FROM client_accounts WHERE client_id=?').get(f.a.id);
    assert.ok(account.password_hash.startsWith('scrypt$')); assert.notEqual(account.password_hash, password);
    const read = await f.request(path, auth); assert.deepEqual(read.data, created.data);
  });

  test(`${platform}: client sessions are isolated from admin and expose only their current consoles/repairs`, async t => {
    const f = await fixture(t, platform), admin = await f.loginAdmin(); await f.createAccess(admin); await f.createAccess(admin, f.b);
    const login = await f.loginClient(); assert.equal(login.status, 200);
    assert.equal(login.data.user.role, 'client'); assert.equal(login.data.user.clientId, f.a.id);
    assert.match(login.response.headers.get('set-cookie'), /clinique_client_session=.*HttpOnly.*SameSite=Strict/);
    const client = {cookie: login.cookie, csrf: login.data.csrfToken};
    const me = await f.request('/api/client/auth/me', client); assert.equal(me.status, 200); assert.equal(me.data.user.name, f.a.name);
    assert.equal((await f.request('/api/auth/me', client)).status, 401);
    assert.equal((await f.request('/api/store', client)).status, 401);
    assert.equal((await f.request('/api/store', {...client, method: 'PUT', body: {revision: 0, data: f.store}})).status, 401);
    assert.equal((await f.request(`/api/admin/client-access/${f.b.id}`, client)).status, 401);
    assert.equal((await f.request('/api/client/portal')).status, 401);
    assert.equal((await f.request('/api/client/portal', admin)).status, 401);
    const otherConsole = f.store.consoles.find(console=>console.clientId===f.b.id),otherRepair = f.store.repairs.find(repair=>repair.consoleId===otherConsole.id);
    const result = await f.request(`/api/client/portal?clientId=${f.b.id}&consoleId=${otherConsole.id}&repairId=${otherRepair.id}`, client); assert.equal(result.status, 200);
    assert.equal(result.data.client.name, f.a.name); assert.equal(result.data.consoles.length, 1); assert.equal(result.data.repairs.length, 1);
    assert.equal(result.data.consoles[0].serial, 'A-123'); assert.equal(result.data.repairs[0].title, 'Écran A');
    assert.equal(result.data.consoles[0].accessories,'Chargeur');assert.equal(result.data.repairs[0].symptoms,'Image instable');assert.ok(result.data.repairs[0].createdAt);
    assertPortalProjection(result.data);
    assert.ok(!JSON.stringify(result.data).includes('PRIVATE_')); assert.ok(!JSON.stringify(result.data).includes('OTHER_CLIENT')); assert.ok(!JSON.stringify(result.data).includes('B-456'));
    for (const secret of [password,nextPassword,adminEmail,admin.csrf,login.data.csrfToken,login.cookie.split('=')[1],admin.cookie.split('=')[1],hashes[platform],f.sqlite.prepare('SELECT password_hash FROM client_accounts WHERE client_id=?').get(f.a.id).password_hash])assert.ok(!JSON.stringify(result.data).includes(secret));
    const foreignPath = await f.request(`/api/client/portal/${f.b.id}`,client);assert.equal(foreignPath.status,404);assert.ok(!JSON.stringify(foreignPath.data).includes(f.b.email));
    const bLogin = await f.loginClient(f.b.email); assert.equal(bLogin.status, 200);
    const bPortal = await f.request('/api/client/portal', {cookie: bLogin.cookie}); assert.equal(bPortal.data.client.name, f.b.name); assert.equal(bPortal.data.consoles[0].serial, 'B-456');assertPortalProjection(bPortal.data);
    assert.notEqual(login.cookie, bLogin.cookie);
    const both = {cookie: admin.cookie + '; ' + login.cookie, csrf: admin.csrf};
    assert.equal((await f.request('/api/auth/me', both)).status, 200); assert.equal((await f.request('/api/client/auth/me', both)).status, 200);
    assert.equal((await f.request('/api/client/portal', {...client, method: 'PUT', body: {}})).status >= 400, true);
  });

  test(`${platform}: client-supplied parts persist through their lifecycle and are visible only to their owner`, async t => {
    const f=await fixture(t,platform),auth=await f.loginAdmin();await f.createAccess(auth);await f.createAccess(auth,f.b);
    const login=await f.loginClient(),otherLogin=await f.loginClient(f.b.email);assert.equal(login.status,200);assert.equal(otherLogin.status,200);
    const repair=f.store.repairs.find(item=>f.store.consoles.find(console=>console.id===item.consoleId).clientId===f.a.id);
    const other=f.store.repairs.find(item=>item.id!==repair.id);
    setRepairInterventionCost(f.store,repair.id,42.5);setRepairPayment(f.store,repair.id,true);
    const unchanged=structuredClone({stage:repair.stage,parts:repair.parts,worklogs:repair.worklogs,tests:repair.tests,payment:repair.payment,stock:f.store.parts});
    const before=structuredClone(f.store);
    const requested=addClientPartRequest(f.store,repair.id,{name:'Écran pour DS Lite',quantity:2,note:'À fournir avec sa nappe'});
    addClientPartRequest(f.store,other.id,{name:'Coque de l’autre client',quantity:1,note:'Game Boy'});
    const first=await f.request('/api/store',{...auth,method:'PUT',body:{revision:0,data:f.store,mode:'edit'}});
    assert.equal(first.status,200,JSON.stringify(first.data));assert.equal(first.data.revision,1);
    assert.deepEqual(repairNotifications(before,first.data,{origin:'https://clinique.example',now:Date.now()}),[]);
    const ownPortal=await f.request(`/api/client/portal?clientId=${f.b.id}`,{cookie:login.cookie});
    assert.equal(ownPortal.status,200);assertPortalProjection(ownPortal.data);
    assert.deepEqual(ownPortal.data.repairs[0].clientParts,[{id:requested.id,name:'Écran pour DS Lite',quantity:2,note:'À fournir avec sa nappe',status:'en-attente'}]);
    assert.ok(!JSON.stringify(ownPortal.data).includes('Coque de l’autre client'));
    const otherPortal=await f.request('/api/client/portal',{cookie:otherLogin.cookie});assert.equal(otherPortal.status,200);assertPortalProjection(otherPortal.data);
    assert.equal(otherPortal.data.repairs[0].clientParts[0].name,'Coque de l’autre client');
    assert.ok(!JSON.stringify(otherPortal.data).includes('Écran pour DS Lite'));
    assert.deepEqual((await f.request('/api/store',auth)).data,first.data);
    const delivered=structuredClone(first.data);
    updateClientPartRequest(delivered,repair.id,requested.id,{name:'Écran DS Lite compatible',quantity:3,note:'Livré avec trois nappes'});
    setClientPartRequestStatus(delivered,repair.id,requested.id,'livree');
    const second=await f.request('/api/store',{...auth,method:'PUT',body:{revision:first.data.revision,data:delivered,mode:'edit'}});
    assert.equal(second.status,200,JSON.stringify(second.data));
    assert.deepEqual(repairNotifications(first.data,second.data,{origin:'https://clinique.example',now:Date.now()}),[]);
    const installed=structuredClone(second.data);setClientPartRequestStatus(installed,repair.id,requested.id,'installee');
    const third=await f.request('/api/store',{...auth,method:'PUT',body:{revision:second.data.revision,data:installed,mode:'edit'}});
    assert.equal(third.status,200,JSON.stringify(third.data));
    assert.deepEqual(repairNotifications(second.data,third.data,{origin:'https://clinique.example',now:Date.now()}),[]);
    const saved=third.data.repairs.find(item=>item.id===repair.id);
    assert.deepEqual({stage:saved.stage,parts:saved.parts,worklogs:saved.worklogs,tests:saved.tests,payment:saved.payment,stock:third.data.parts},unchanged);
    const finalPortal=await f.request('/api/client/portal',{cookie:login.cookie});assert.equal(finalPortal.status,200);assertPortalProjection(finalPortal.data);
    assert.deepEqual(finalPortal.data.repairs[0].clientParts,[{id:requested.id,name:'Écran DS Lite compatible',quantity:3,note:'Livré avec trois nappes',status:'installee'}]);
    const backup=validateStore(JSON.parse(JSON.stringify(third.data)));
    const restored=await f.request('/api/store',{...auth,method:'PUT',body:{revision:third.data.revision,data:backup,mode:'restore'}});
    assert.equal(restored.status,200,JSON.stringify(restored.data));
    assert.deepEqual(restored.data.repairs.find(item=>item.id===repair.id).clientParts,saved.clientParts);
    assert.deepEqual((await f.request('/api/store',auth)).data,restored.data);
    assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM repair_notifications').get().n,0);
  });

  test(`${platform}: the portal exposes the current total, including consumed parts and free or legacy hourly interventions`, async t => {
    const f=await fixture(t,platform),auth=await f.loginAdmin();await f.createAccess(auth);
    const login=await f.loginClient();assert.equal(login.status,200);
    const console=f.store.consoles.find(item=>item.clientId===f.a.id);
    const repairId=f.store.repairs.find(item=>item.consoleId===console.id).id;
    const otherId=f.store.repairs.find(item=>item.id!==repairId).id;
    let current=structuredClone(f.store);
    current.settings.hourlyRate=35;
    const repair=current.repairs.find(item=>item.id===repairId);
    repair.worklogs[0].minutes=30;
    repair.parts[0].quantity=2;repair.parts[0].unitCost=6.25;
    current.parts[0].unitCost=999;
    // A running timer must not add unfinished time to the public amount.
    repair.timerStartedAt='2000-01-01T00:00:00.000Z';
    repair.payment={amount:999.99,paidAt:'2024-01-01T12:00:00.000Z'};
    setRepairInterventionCost(current,repairId,35);
    setRepairInterventionCost(current,otherId,987.65);
    async function saveAndRead(expected,mode='edit') {
      const saved=await f.request('/api/store',{...auth,method:'PUT',body:{revision:current.revision,data:current,mode}});
      assert.equal(saved.status,200,JSON.stringify(saved.data));current=saved.data;
      const portal=await f.request('/api/client/portal',{cookie:login.cookie});assert.equal(portal.status,200);assertPortalProjection(portal.data);
      assert.equal(portal.data.workshop.name,current.settings.workshop);
      assert.equal(portal.data.repairs.length,1);assert.equal(portal.data.repairs[0].id,repairId);
      assert.equal(portal.data.repairs[0].totalCost,expected);
      assert.ok(!JSON.stringify(portal.data).includes('Réparation B privée'));
      assert.deepEqual((await f.request('/api/store',auth)).data,current,'reading a total must not update timer, stock or payments');
      assert.equal(current.repairs.find(item=>item.id===repairId).payment.amount,999.99);
    }
    await saveAndRead(47.5); // 35 € intervention + 2 consumed parts at 6.25 €.
    setRepairInterventionCost(current,repairId,0);await saveAndRead(12.5);
    setRepairInterventionCost(current,repairId,null);await saveAndRead(30); // 30 min × 35 €/h + parts.
    delete current.repairs.find(item=>item.id===repairId).interventionCost;await saveAndRead(30);
    setRepairTotalCost(current,repairId,67.25);await saveAndRead(67.25);
    current.repairs.find(item=>item.id===repairId).parts[0].unitCost=7.75;await saveAndRead(70.25);
    setRepairInterventionCost(current,repairId,null);
    current.repairs.find(item=>item.id===repairId).worklogs[0].minutes=31;await saveAndRead(33.58);
  });

  test(`${platform}: invalid client-supplied part requests are rejected before advancing the workshop revision`, async t => {
    const f=await fixture(t,platform),auth=await f.loginAdmin();
    const repair=f.store.repairs.find(item=>f.store.consoles.find(console=>console.id===item.consoleId).clientId===f.a.id);
    const requested=addClientPartRequest(f.store,repair.id,{name:'Écran à fournir',quantity:1,note:''});
    const first=await f.request('/api/store',{...auth,method:'PUT',body:{revision:0,data:f.store,mode:'edit'}});assert.equal(first.status,200);
    const changes=[
      item=>{item.quantity=0;},item=>{item.quantity=1.5;},item=>{item.quantity=1001;},item=>{item.quantity='2';},
      item=>{item.name='';},item=>{item.note='x'.repeat(1001);},item=>{item.status='unknown';},
      item=>{item.createdAt='2026-02-31T12:00:00.000Z';},item=>{item.updatedAt='yesterday';},
    ];
    for(const change of changes) {
      const invalid=structuredClone(first.data);change(invalid.repairs.find(item=>item.id===repair.id).clientParts[0]);
      const rejected=await f.request('/api/store',{...auth,method:'PUT',body:{revision:first.data.revision,data:invalid,mode:'edit'}});
      assert.equal(rejected.status,400,JSON.stringify(rejected.data));assert.deepEqual((await f.request('/api/store',auth)).data,first.data);
    }
    for(const value of [null,{},Array.from({length:101},(_,index)=>({...requested,id:`too-many-${index}`}))]) {
      const invalid=structuredClone(first.data);invalid.repairs.find(item=>item.id===repair.id).clientParts=value;
      assert.equal((await f.request('/api/store',{...auth,method:'PUT',body:{revision:first.data.revision,data:invalid,mode:'edit'}})).status,400);
      assert.deepEqual((await f.request('/api/store',auth)).data,first.data);
    }
    const duplicate=structuredClone(first.data);duplicate.repairs.find(item=>item.id!==repair.id).clientParts=[structuredClone(requested)];
    assert.equal((await f.request('/api/store',{...auth,method:'PUT',body:{revision:first.data.revision,data:duplicate,mode:'edit'}})).status,400);
    assert.deepEqual((await f.request('/api/store',auth)).data,first.data);
  });

  for(const mode of ['restore','reset']) {
    test(`${platform}: client part metadata is protected from old editors while explicit clearing, ${mode} and dossier deletion remain available`, async t => {
      const f=await fixture(t,platform),auth=await f.loginAdmin();await f.createAccess(auth);
      const login=await f.loginClient();assert.equal(login.status,200);
      const repair=f.store.repairs.find(item=>f.store.consoles.find(console=>console.id===item.consoleId).clientId===f.a.id);
      const legacyRead=await f.request('/api/store',auth);assert.equal(legacyRead.data.repairs.find(item=>item.id===repair.id).clientParts,undefined);
      const legacyPortal=await f.request('/api/client/portal',{cookie:login.cookie});assert.equal('clientParts' in legacyPortal.data.repairs[0],false);
      const save=(data,revision,saveMode='edit')=>f.request('/api/store',{...auth,method:'PUT',body:{revision,data,mode:saveMode}});
      addClientPartRequest(f.store,repair.id,{name:'Coque à fournir',quantity:1,note:''});
      const first=await save(f.store,0);assert.equal(first.status,200);
      const omitted=structuredClone(first.data);delete omitted.repairs.find(item=>item.id===repair.id).clientParts;
      const blocked=await save(omitted,first.data.revision);assert.equal(blocked.status,409);assert.match(blocked.data.error,/Rechargez.*pièces demandées au client/);
      assert.deepEqual((await f.request('/api/store',auth)).data,first.data);
      const cleared=structuredClone(first.data);removeClientPartRequest(cleared,repair.id,cleared.repairs.find(item=>item.id===repair.id).clientParts[0].id);
      const second=await save(cleared,first.data.revision);assert.equal(second.status,200,JSON.stringify(second.data));
      assert.deepEqual(second.data.repairs.find(item=>item.id===repair.id).clientParts,[]);
      assert.deepEqual((await f.request('/api/client/portal',{cookie:login.cookie})).data.repairs[0].clientParts,[]);
      const requestedAgain=structuredClone(second.data);addClientPartRequest(requestedAgain,repair.id,{name:'Coque à fournir',quantity:1,note:''});
      const third=await save(requestedAgain,second.data.revision);assert.equal(third.status,200);
      const oldBackup=structuredClone(third.data);delete oldBackup.repairs.find(item=>item.id===repair.id).clientParts;
      const replaced=await save(oldBackup,third.data.revision,mode);assert.equal(replaced.status,200,JSON.stringify(replaced.data));
      assert.equal(replaced.data.repairs.find(item=>item.id===repair.id).clientParts,undefined);
      assert.equal('clientParts' in (await f.request('/api/client/portal',{cookie:login.cookie})).data.repairs[0],false);
      const withParts=structuredClone(replaced.data);addClientPartRequest(withParts,repair.id,{name:'Coque à fournir',quantity:1,note:''});
      const fourth=await save(withParts,replaced.data.revision);assert.equal(fourth.status,200);
      const deleted=structuredClone(fourth.data);deleteRepair(deleted,repair.id);
      const removed=await save(deleted,fourth.data.revision);assert.equal(removed.status,200,JSON.stringify(removed.data));
      assert.equal(removed.data.repairs.some(item=>item.id===repair.id),false);
      const portal=await f.request('/api/client/portal',{cookie:login.cookie});assert.equal(portal.status,200);assert.deepEqual(portal.data.repairs,[]);
      assert.equal(portal.data.consoles.length,1);assert.deepEqual((await f.request('/api/store',auth)).data,removed.data);
    });
  }

  test(`${platform}: recorded receipts persist as snapshots, stay private and can be cancelled explicitly`, async t => {
    const f = await fixture(t, platform), auth = await f.loginAdmin();
    await f.createAccess(auth);
    const login = await f.loginClient(); assert.equal(login.status, 200);
    const console = f.store.consoles.find(item => item.clientId === f.a.id);
    const repair = f.store.repairs.find(item => item.consoleId === console.id);
    setRepairInterventionCost(f.store, repair.id, 42.5);
    setRepairPayment(f.store, repair.id, true);
    const snapshot = structuredClone(repair.payment);
    const paid = await f.request('/api/store', {...auth, method: 'PUT', body: {revision: 0, data: f.store, mode: 'edit'}});
    assert.equal(paid.status, 200, JSON.stringify(paid.data));
    assert.deepEqual(paid.data.repairs.find(item => item.id === repair.id).payment, snapshot);
    assert.equal(snapshot.amount, 42.5); assert.ok(snapshot.paidAt);
    const changedPrice = structuredClone(paid.data);
    setRepairInterventionCost(changedPrice, repair.id, 63.75);
    changedPrice.settings.hourlyRate = 150;
    const repriced = await f.request('/api/store', {...auth, method: 'PUT', body: {revision: paid.data.revision, data: changedPrice, mode: 'edit'}});
    assert.equal(repriced.status, 200, JSON.stringify(repriced.data));
    const reloaded = await f.request('/api/store', auth);
    assert.deepEqual(reloaded.data.repairs.find(item => item.id === repair.id).payment, snapshot);
    assert.equal(reloaded.data.repairs.find(item => item.id === repair.id).interventionCost, 63.75);
    const portal = await f.request('/api/client/portal', {cookie: login.cookie});
    assert.equal(portal.status, 200);
    assert.equal(portal.data.repairs[0].stage, repair.stage);
    assert.equal(portal.data.repairs[0].totalCost,63.75,'the current price must differ from the earlier payment snapshot');
    assert.ok(!('payment' in portal.data.repairs[0]));
    assert.ok(!('interventionCost' in portal.data.repairs[0]));
    assert.ok(!('amount' in portal.data.repairs[0]));
    assert.ok(!('paidAt' in portal.data.repairs[0]));
    const cancelled = structuredClone(reloaded.data); setRepairPayment(cancelled, repair.id, false);
    const unpaid = await f.request('/api/store', {...auth, method: 'PUT', body: {revision: reloaded.data.revision, data: cancelled, mode: 'edit'}});
    assert.equal(unpaid.status, 200, JSON.stringify(unpaid.data));
    assert.equal(unpaid.data.repairs.find(item => item.id === repair.id).payment, null);
    assert.equal((await f.request('/api/store', auth)).data.repairs.find(item => item.id === repair.id).payment, null);
    const stale = await f.request('/api/store', {...auth, method: 'PUT', body: {revision: repriced.data.revision, data: repriced.data, mode: 'edit'}});
    assert.equal(stale.status, 409);
    assert.deepEqual((await f.request('/api/store', auth)).data, unpaid.data);
  });

  test(`${platform}: legacy editors cannot erase a payment and malformed receipts leave the workshop intact`, async t => {
    const f = await fixture(t, platform), auth = await f.loginAdmin();
    const console = f.store.consoles.find(item => item.clientId === f.a.id);
    const repair = f.store.repairs.find(item => item.consoleId === console.id);
    setRepairInterventionCost(f.store, repair.id, 42.5); setRepairPayment(f.store, repair.id, true);
    const paid = await f.request('/api/store', {...auth, method: 'PUT', body: {revision: 0, data: f.store, mode: 'edit'}});
    assert.equal(paid.status, 200);
    const legacy = structuredClone(paid.data); delete legacy.repairs.find(item => item.id === repair.id).payment;
    const blocked = await f.request('/api/store', {...auth, method: 'PUT', body: {revision: paid.data.revision, data: legacy, mode: 'edit'}});
    assert.equal(blocked.status, 409); assert.match(blocked.data.error, /Rechargez.*paiements/);
    assert.deepEqual((await f.request('/api/store', auth)).data, paid.data);
    for (const payment of [
      {amount: 42.501, paidAt: repair.payment.paidAt},
      {amount: -1, paidAt: repair.payment.paidAt},
      {amount: 42.5, paidAt: 'yesterday'},
      {amount: '42.50', paidAt: repair.payment.paidAt},
      [],
    ]) {
      const invalid = structuredClone(paid.data); invalid.repairs.find(item => item.id === repair.id).payment = payment;
      const rejected = await f.request('/api/store', {...auth, method: 'PUT', body: {revision: paid.data.revision, data: invalid, mode: 'edit'}});
      assert.equal(rejected.status, 400, JSON.stringify(rejected.data));
      assert.deepEqual((await f.request('/api/store', auth)).data, paid.data);
    }
  });

  for (const mode of ['restore', 'reset']) {
    test(`${platform}: ${mode} accepts an older backup without payment metadata`, async t => {
      const f = await fixture(t, platform), auth = await f.loginAdmin();
      const console = f.store.consoles.find(item => item.clientId === f.a.id);
      const repair = f.store.repairs.find(item => item.consoleId === console.id);
      setRepairInterventionCost(f.store, repair.id, 42.5); setRepairPayment(f.store, repair.id, true);
      const paid = await f.request('/api/store', {...auth, method: 'PUT', body: {revision: 0, data: f.store, mode: 'edit'}});
      assert.equal(paid.status, 200);
      const legacy = structuredClone(paid.data); delete legacy.repairs.find(item => item.id === repair.id).payment;
      const restored = await f.request('/api/store', {...auth, method: 'PUT', body: {revision: paid.data.revision, data: legacy, mode}});
      assert.equal(restored.status, 200, JSON.stringify(restored.data));
      assert.equal(restored.data.repairs.find(item => item.id === repair.id).payment, undefined);
      assert.deepEqual((await f.request('/api/store', auth)).data, restored.data);
    });
  }

  test(`${platform}: reset and disable immediately revoke client sessions`, async t => {
    const f = await fixture(t, platform), auth = await f.loginAdmin(); await f.createAccess(auth);
    const first = await f.loginClient(); assert.equal(first.status, 200);
    await f.createAccess(auth, f.a, nextPassword);
    assert.equal((await f.request('/api/client/portal', {cookie: first.cookie})).status, 401);
    assert.equal((await f.loginClient()).status, 401);
    const second = await f.loginClient(f.a.email, nextPassword); assert.equal(second.status, 200);
    assert.equal((await f.request(`/api/admin/client-access/${f.a.id}`, {...auth, method: 'DELETE'})).status, 200);
    assert.equal((await f.request('/api/client/auth/me', {cookie: second.cookie})).status, 401);
    assert.equal((await f.loginClient(f.a.email, nextPassword)).status, 401);
    assert.equal((await f.request(`/api/admin/client-access/${f.a.id}`, auth)).data.access.enabled, false);
    await f.createAccess(auth);
    assert.equal((await f.loginClient()).status, 200);
  });

  test(`${platform}: logout requires client CSRF and revokes only that client session`, async t => {
    const f = await fixture(t, platform), auth = await f.loginAdmin(); await f.createAccess(auth);
    const login = await f.loginClient(); const client = {cookie: login.cookie, csrf: login.data.csrfToken};
    assert.equal((await f.request('/api/client/auth/logout', {cookie: client.cookie, method: 'POST'})).status, 403);
    assert.equal((await f.request('/api/client/auth/logout', {...client, method: 'POST'})).status, 200);
    assert.equal((await f.request('/api/client/auth/me', client)).status, 401);
    assert.equal((await f.request('/api/auth/me', auth)).status, 200);
  });

  test(`${platform}: duplicate/admin identities and nonexistent client creation are refused`, async t => {
    const f = await fixture(t, platform), auth = await f.loginAdmin(); await f.createAccess(auth);
    assert.equal((await f.request(`/api/admin/client-access/${f.b.id}`, {...auth, method: 'POST', body: {email: f.a.email.toUpperCase(), password}})).status, 409);
    assert.equal((await f.request(`/api/admin/client-access/${f.b.id}`, {...auth, method: 'POST', body: {email: adminEmail, password}})).status, 400);
    assert.equal((await f.request('/api/admin/client-access/missing', {...auth, method: 'POST', body: {email: 'missing@example.invalid', password}})).status, 404);
    const known = await f.loginClient(f.a.email, 'bad'); const unknown = await f.loginClient('missing@example.invalid', 'bad');
    assert.equal(known.status, 401); assert.deepEqual(known.data, unknown.data);
    assert.equal((await f.request('/api/client/portal', {cookie: (await f.loginClient()).cookie + '; ' + (await f.loginClient()).cookie})).status, 401);
  });

  test(`${platform}: removing a client revokes access and portal follows current ownership`, async t => {
    const f = await fixture(t, platform), auth = await f.loginAdmin(); await f.createAccess(auth);
    const login = await f.loginClient(); assert.equal(login.status, 200);
    // A legitimate administrator can restore a different workshop. Client accounts
    // must not survive a removal and later reappearance of the same identifier.
    const removed = emptyStore();
    const save = await f.request('/api/store', {...auth, method: 'PUT', body: {revision: 0, data: removed}}); assert.equal(save.status, 200);
    assert.equal((await f.request('/api/client/portal', {cookie: login.cookie})).status, 401);
    f.store.revision = 2;
    assert.equal((await f.request('/api/store', {...auth, method: 'PUT', body: {revision: 1, data: f.store}})).status, 200);
    assert.equal((await f.loginClient()).status, 401);
    await f.createAccess(auth);
    const newLogin = await f.loginClient(); assert.equal(newLogin.status, 200);
    const c = f.store.consoles.find(c => c.clientId === f.a.id); c.clientId = f.b.id;
    f.store.events = f.store.events.filter(e => !e.consoleId && !e.repairId);
    f.store.revision = 3;
    assert.equal((await f.request('/api/store', {...auth, method: 'PUT', body: {revision: 2, data: f.store}})).status, 200);
    const portal = await f.request('/api/client/portal', {cookie: newLogin.cookie}); assert.equal(portal.status, 200); assert.equal(portal.data.consoles.length, 0); assert.equal(portal.data.repairs.length, 0);
  });

  test(`${platform}: client session polling does not extend idle lifetime and expired sessions are rejected`, async t => {
    const f = await fixture(t, platform), auth = await f.loginAdmin(); await f.createAccess(auth);
    const login = await f.loginClient(); assert.equal(login.status, 200);
    const before = f.sqlite.prepare('SELECT seen_at FROM client_sessions').get().seen_at;
    assert.equal((await f.request('/api/client/auth/me', {cookie: login.cookie})).status, 200);
    assert.equal(f.sqlite.prepare('SELECT seen_at FROM client_sessions').get().seen_at, before);
    f.sqlite.prepare('UPDATE client_sessions SET seen_at=?').run(Date.now() - 1800001);
    assert.equal((await f.request('/api/client/auth/me', {cookie: login.cookie})).status, 401);
    const renewed = await f.loginClient(); assert.equal(renewed.status, 200);
    f.sqlite.prepare('UPDATE client_sessions SET expires_at=?').run(Date.now() - 1);
    assert.equal((await f.request('/api/client/portal', {cookie: renewed.cookie})).status, 401);
  });

  test(`${platform}: deleting a priced dossier persists without removing its equipment, client access or other repairs`, async t => {
    const f = await fixture(t, platform), auth = await f.loginAdmin();
    await f.createAccess(auth); await f.createAccess(auth, f.b);
    const login = await f.loginClient(), otherLogin = await f.loginClient(f.b.email);
    assert.equal(login.status, 200); assert.equal(otherLogin.status, 200);
    const console = f.store.consoles.find(c => c.clientId === f.a.id);
    const repair = f.store.repairs.find(r => r.consoleId === console.id);
    const otherRepair = f.store.repairs.find(r => r.id !== repair.id);
    setRepairInterventionCost(f.store, repair.id, 42.5);
    setRepairPayment(f.store, repair.id, true);
    setRepairInterventionCost(f.store, otherRepair.id, 63.75);
    const priced = await f.request('/api/store', {...auth, method: 'PUT', body: {revision: 0, data: f.store, mode: 'edit'}});
    assert.equal(priced.status, 200);
    const deleted = structuredClone(priced.data), preservedOther = structuredClone(deleted.repairs.find(r => r.id === otherRepair.id));
    deleteRepair(deleted, repair.id);
    const result = await f.request('/api/store', {...auth, method: 'PUT', body: {revision: priced.data.revision, data: deleted, mode: 'edit'}});
    assert.equal(result.status, 200, JSON.stringify(result.data));
    assert.equal(result.data.revision, priced.data.revision + 1);
    assert.equal(result.data.repairs.some(r => r.id === repair.id), false);
    assert.equal(result.data.events.some(e => e.repairId === repair.id), false);
    assert.deepEqual(result.data.repairs.find(r => r.id === otherRepair.id), preservedOther);
    const reloaded = await f.request('/api/store', auth);
    assert.deepEqual(reloaded.data, result.data);
    const portal = await f.request('/api/client/portal', {cookie: login.cookie});
    assert.equal(portal.status, 200);
    assert.equal(portal.data.client.name, f.a.name);
    assert.deepEqual(portal.data.consoles.map(c => c.id), [console.id]);
    assert.deepEqual(portal.data.repairs, []);
    assert.equal(f.sqlite.prepare('SELECT enabled FROM client_accounts WHERE client_id=?').get(f.a.id).enabled, 1);
    const otherPortal = await f.request('/api/client/portal', {cookie: otherLogin.cookie});
    assert.equal(otherPortal.status, 200);
    assert.deepEqual(otherPortal.data.repairs.map(r => r.id), [otherRepair.id]);
    const stale = await f.request('/api/store', {...auth, method: 'PUT', body: {revision: priced.data.revision, data: priced.data, mode: 'edit'}});
    assert.equal(stale.status, 409);
    assert.deepEqual((await f.request('/api/store', auth)).data, reloaded.data);
  });

  test(`${platform}: deleting equipment and all its priced dossiers preserves client access and other clients' equipment`, async t => {
    const f = await fixture(t, platform), auth = await f.loginAdmin();
    await f.createAccess(auth); await f.createAccess(auth, f.b);
    const login = await f.loginClient(), otherLogin = await f.loginClient(f.b.email);
    assert.equal(login.status, 200); assert.equal(otherLogin.status, 200);
    const console = f.store.consoles.find(c => c.clientId === f.a.id);
    const closedRepair = f.store.repairs.find(r => r.consoleId === console.id);
    moveRepair(f.store, closedRepair.id, 'terminee');
    setRepairInterventionCost(f.store, closedRepair.id, 42.5);
    setRepairPayment(f.store, closedRepair.id, true);
    const openRepair = createRepair(f.store, {consoleId: console.id, title: 'Second dossier A', symptoms: 'Nouvelle panne', priority: 'normale', dueDate: ''});
    setRepairInterventionCost(f.store, openRepair.id, 18.75);
    const otherConsole = f.store.consoles.find(c => c.clientId === f.b.id);
    const otherRepair = f.store.repairs.find(r => r.consoleId === otherConsole.id);
    setRepairInterventionCost(f.store, otherRepair.id, 63.75);
    const priced = await f.request('/api/store', {...auth, method: 'PUT', body: {revision: 0, data: f.store, mode: 'edit'}});
    assert.equal(priced.status, 200);
    const deleted = structuredClone(priced.data);
    const preservedClients = structuredClone(deleted.clients);
    const preservedConsole = structuredClone(deleted.consoles.find(c => c.id === otherConsole.id));
    const preservedRepair = structuredClone(deleted.repairs.find(r => r.id === otherRepair.id));
    const preservedEvents = structuredClone(deleted.events.filter(e => e.consoleId === otherConsole.id || e.repairId === otherRepair.id));
    deleteConsole(deleted, console.id);
    const result = await f.request('/api/store', {...auth, method: 'PUT', body: {revision: priced.data.revision, data: deleted, mode: 'edit'}});
    assert.equal(result.status, 200, JSON.stringify(result.data));
    assert.equal(result.data.revision, priced.data.revision + 1);
    validateStore(result.data);
    assert.deepEqual(result.data.clients, preservedClients);
    assert.equal(result.data.consoles.some(c => c.id === console.id), false);
    assert.equal(result.data.repairs.some(r => r.consoleId === console.id), false);
    assert.equal(result.data.events.some(e => e.consoleId === console.id || e.repairId === closedRepair.id || e.repairId === openRepair.id), false);
    assert.deepEqual(result.data.consoles.find(c => c.id === otherConsole.id), preservedConsole);
    assert.deepEqual(result.data.repairs.find(r => r.id === otherRepair.id), preservedRepair);
    assert.deepEqual(result.data.events.filter(e => e.consoleId === otherConsole.id || e.repairId === otherRepair.id), preservedEvents);
    const reloaded = await f.request('/api/store', auth);
    assert.deepEqual(reloaded.data, result.data);
    const portal = await f.request('/api/client/portal', {cookie: login.cookie});
    assert.equal(portal.status, 200);
    assert.equal(portal.data.client.name, f.a.name);
    assert.deepEqual(portal.data.consoles, []);
    assert.deepEqual(portal.data.repairs, []);
    assert.equal((await f.request('/api/client/auth/me', {cookie: login.cookie})).status, 200);
    assert.equal(f.sqlite.prepare('SELECT enabled FROM client_accounts WHERE client_id=?').get(f.a.id).enabled, 1);
    assert.equal((await f.loginClient()).status, 200);
    const otherPortal = await f.request('/api/client/portal', {cookie: otherLogin.cookie});
    assert.equal(otherPortal.status, 200);
    assert.deepEqual(otherPortal.data.consoles.map(c => c.id), [otherConsole.id]);
    assert.deepEqual(otherPortal.data.repairs.map(r => r.id), [otherRepair.id]);
    const stale = await f.request('/api/store', {...auth, method: 'PUT', body: {revision: priced.data.revision, data: priced.data, mode: 'edit'}});
    assert.equal(stale.status, 409);
    assert.deepEqual((await f.request('/api/store', auth)).data, reloaded.data);
  });

  test(`${platform}: client login rejects foreign origins and throttles repeated failures`, async t => {
    const f = await fixture(t, platform);
    const body = {email: 'unknown@example.invalid', password: 'bad'};
    assert.equal((await f.request('/api/client/auth/login', {method: 'POST', body, headers: {Origin: 'https://evil.example'}})).status, 403);
    assert.equal((await f.request('/api/client/auth/login', {method: 'POST', body, headers: {'Sec-Fetch-Site': 'cross-site'}})).status, 403);
    for (let i = 0; i < 5; i++) assert.equal((await f.loginClient(body.email, body.password)).status, 401);
    const limited = await f.loginClient(body.email, body.password); assert.equal(limited.status, 429); assert.ok(Number(limited.response.headers.get('retry-after')) > 0);
  });

  test(`${platform}: direct completion keeps every test OK in admin storage while the client sees only the completed stage`, async t => {
    const f = await fixture(t, platform), auth = await f.loginAdmin(); await f.createAccess(auth);
    const login = await f.loginClient(); assert.equal(login.status, 200);
    const console = f.store.consoles.find(c => c.clientId === f.a.id), repair = f.store.repairs.find(r => r.consoleId === console.id);
    repair.tests[0].result = 'fail';
    moveRepair(f.store, repair.id, 'terminee'); f.store.revision = 1;
    assert.equal((await f.request('/api/store', {...auth, method: 'PUT', body: {revision: 0, data: f.store}})).status, 200);
    const adminStore = await f.request('/api/store',auth);assert.equal(adminStore.status,200);
    assert.ok(adminStore.data.repairs.find(item=>item.id===repair.id).tests.every(test=>test.result==='pass'));
    const result = await f.request('/api/client/portal', {cookie: login.cookie}); assert.equal(result.status, 200);
    assert.equal(result.data.consoles[0].state, 'fonctionnelle'); assert.equal(result.data.repairs[0].stage, 'terminee');
    assert.ok(result.data.repairs[0].completedAt); assert.ok(!('tests' in result.data.repairs[0]));assertPortalProjection(result.data);
    assert.ok(!JSON.stringify(result.data).includes('PRIVATE_DIAGNOSIS'));
  });
}
