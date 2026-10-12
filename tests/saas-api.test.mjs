import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {readFileSync, readdirSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createApplication} from '../server/application.mjs';
import {openDatabase} from '../server/database.mjs';
import {hashPassword as nodeHash, digest} from '../server/security.mjs';
import {hashPassword as workerHash} from '../cloudflare/security.mjs';
import worker from '../cloudflare/worker.mjs';
import {repairNotifications, renderRepairNotification} from '../server/repair-notifications.mjs';
import {emptyStore, createClient, createClientRepairs, validateStore, moveRepair, setRepairInterventionCost, addClientPartRequest} from '../tests/.compiled/domain.cjs';

const rootEmail = 'root@example.invalid';
const rootPassword = 'Synthetic root password phrase 2026!';
const tenantPassword = 'Synthetic applicant password phrase 2026!';
const replacementPassword = 'Synthetic duplicate password phrase 2026!';
const clientPassword = 'Synthetic client password phrase 2026!';
const nativeFetch = globalThis.fetch;
const hashes = {};
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const namespace = id => `tenant_${id.replaceAll('-', '')}_`;

function rootStore() {
  const store = emptyStore(); store.settings.workshop = 'ROOT_PRIVATE_WORKSHOP';
  const client = createClient(store, {name: 'Root private client', email: 'root-client@example.invalid', phone: '', address: '', notes: 'ROOT_PRIVATE_NOTE'});
  createClientRepairs(store, client.id, [{brand: 'Nintendo', model: 'Root private console', serial: '', accessories: '', title: 'Root private repair', symptoms: '', priority: 'normale', dueDate: ''}]);
  validateStore(store);
  return {store, client};
}

async function fixture(t, platform) {
  const initial = rootStore(), origin = platform === 'node' ? 'http://127.0.0.1:3041' : 'https://clinique.example';
  hashes[platform] ??= await (platform === 'node' ? nodeHash : workerHash)(rootPassword);
  const jobs = []; let sqlite, call, app, directory;
  if (platform === 'node') {
    directory = mkdtempSync(path.join(tmpdir(), 'clinique-saas-api-'));
    const filename = path.join(directory, 'fixture.sqlite');
    const seed = openDatabase(filename);
    seed.prepare("INSERT INTO admin(id,email,password_hash,role) VALUES(1,?,?,'admin')").run(rootEmail, hashes[platform]);
    seed.prepare('UPDATE workshop SET data=? WHERE id=1').run(JSON.stringify(initial.store)); seed.close();
    app = createApplication({databasePath: filename, origin, notificationPollingMs: 0,
      notificationFetch: async () => {throw new Error('No real email transport is allowed in SaaS API tests.');}});
    sqlite = app.db;
    app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening');
    const base = `http://127.0.0.1:${app.server.address().port}`;
    call = (url, options) => nativeFetch(base + url, options);
    t.after(async () => {
      if (app.processNotifications) await app.processNotifications();
      await new Promise(resolve => {app.server.closeAllConnections(); app.server.close(resolve);});
      rmSync(directory, {recursive: true, force: true});
    });
  } else {
    sqlite = new DatabaseSync(':memory:');
    const migrations = new URL('../cloudflare/migrations/', import.meta.url);
    for (const name of readdirSync(migrations).filter(name => name.endsWith('.sql')).sort()) sqlite.exec(readFileSync(new URL(name, migrations), 'utf8'));
    sqlite.prepare("INSERT INTO admin(id,email,password_hash,role) VALUES(1,?,?,'admin')").run(rootEmail, hashes[platform]);
    sqlite.prepare("UPDATE workshop SET generation='root-fixture' WHERE id=1").run();
    sqlite.prepare("INSERT INTO workshop_chunks(generation,position,data) VALUES('root-fixture',0,?)").run(JSON.stringify(initial.store));
    const db = {
      prepare(sql) {
        const statement = (values = []) => ({
          bind(...bindings) {return statement(bindings);},
          execute() {const results = sqlite.prepare(sql).all(...values); return {results, success: true, meta: sqlite.prepare('SELECT changes() AS changes').get()};},
          async run() {return this.execute();}, async all() {return this.execute();}, async first(column) {
            const row = this.execute().results[0] ?? null; return column && row ? row[column] : row;
          },
        });
        return statement();
      },
      async batch(statements) {
        sqlite.exec('BEGIN IMMEDIATE');
        try {const results = statements.map(statement => statement.execute()); sqlite.exec('COMMIT'); return results;}
        catch (error) {sqlite.exec('ROLLBACK'); throw error;}
      },
    };
    t.mock.method(globalThis, 'fetch', async () => {throw new Error('No external requests are allowed in SaaS API tests.');});
    call = (url, options) => worker.fetch(new Request(origin + url, options), {DB: db}, {waitUntil(job) {jobs.push(job);}});
    t.after(async () => {await Promise.all(jobs); sqlite.close();});
  }
  async function request(url, {method = 'GET', body, rawBody, cookie = '', csrf = '', headers = {}} = {}) {
    const response = await call(url, {method, headers: {Origin: origin, ...(body === undefined && rawBody === undefined ? {} : {'Content-Type': 'application/json'}),
      ...(cookie ? {Cookie: cookie} : {}), ...(csrf ? {'X-CSRF-Token': csrf} : {}), ...headers},
      ...(rawBody === undefined ? body === undefined ? {} : {body: JSON.stringify(body)} : {body: rawBody})});
    return {status: response.status, data: await response.json(), cookie: response.headers.get('Set-Cookie')?.split(';')[0] || '', response};
  }
  async function login(email, password = tenantPassword) {
    const response = await request('/api/auth/login', {method: 'POST', body: {email, password}});
    if (response.status !== 200) return response;
    return {...response, auth: {cookie: response.cookie, csrf: response.data.csrfToken}};
  }
  const rootLogin = await login(rootEmail, rootPassword);
  assert.equal(rootLogin.status, 200, JSON.stringify(rootLogin.data));
  const root = rootLogin.auth;
  let applicantIndex = 0;
  const applicant = (name = `Applicant ${++applicantIndex}`) => ({name, email: `${name.toLowerCase().replaceAll(' ', '-')}@example.invalid`,
    workshopName: `${name} workshop`, message: 'A synthetic workshop application.', password: tenantPassword});
  const list = (status = 'all', auth = root) => request(`/api/super-admin/registrations?status=${status}`, auth);
  async function submit(input = applicant()) {
    const response = await request('/api/public/registrations', {method: 'POST', body: input});
    assert.equal(response.status, 202, JSON.stringify(response.data)); assert.deepEqual(response.data, {accepted: true});
    assert.equal(response.cookie, '', 'submitting an application must not create a session');
    const listed = await list(); assert.equal(listed.status, 200, JSON.stringify(listed.data));
    const row = listed.data.requests.find(item => item.email === input.email.trim().toLowerCase());
    assert.ok(row, 'submitted request must be visible to the super admin'); assert.match(row.id, uuidPattern);
    return {input, row};
  }
  const review = (id, decision = 'approve', auth = root, extra = {}) => request(`/api/super-admin/registrations/${id}/review`, {...auth,
    method: 'POST', body: {decision, note: 'Synthetic administrative review.', ...extra}});
  async function approve(name) {
    const candidate = await submit(applicant(name)), response = await review(candidate.row.id);
    assert.equal(response.status, 200, JSON.stringify(response.data)); assert.equal(response.data.request.status, 'approved');
    const session = await login(candidate.input.email); assert.equal(session.status, 200, JSON.stringify(session.data));
    assert.equal(session.data.user.role, 'admin'); assert.equal(session.data.user.workshopId, candidate.row.id);
    return {...candidate, auth: session.auth, session};
  }
  const getStore = async auth => {const response = await request('/api/store', auth); assert.equal(response.status, 200, JSON.stringify(response.data)); return response.data;};
  const save = (auth, data, revision, {url = '/api/store', extra = {}, headers = {}} = {}) => request(url, {...auth, method: 'PUT', headers,
    body: {revision, data, mode: 'edit', ...extra}});
  return {request, login, root, rootLogin, initial, sqlite, applicant, submit, list, review, approve, getStore, save};
}

function populateTenant(store, name, model = 'DS Lite') {
  const shared = {id: 'shared-client-id', code: 'CLI-001', name: `${name} client`, email: 'shared-client@example.invalid',
    phone: '', address: '', notes: `${name}_PRIVATE_CLIENT_NOTE`, createdAt: new Date().toISOString()};
  const other = {...shared, id: 'other-client-id', code: 'CLI-002', name: `${name} other private client`, email: 'other-client@example.invalid'};
  store.clients.push(shared, other);
  createClientRepairs(store, shared.id, [{brand: 'Nintendo', model, serial: '', accessories: '', title: `${name} repair`, symptoms: `${name} public symptoms`, priority: 'normale', dueDate: ''}]);
  createClientRepairs(store, other.id, [{brand: 'Other', model: `${name} PRIVATE_OTHER_CONSOLE`, serial: '', accessories: '', title: `${name} other repair`, symptoms: '', priority: 'normale', dueDate: ''}]);
  validateStore(store);
  return shared;
}

test('Tenant notification links and idempotency keys remain distinct across identical repair IDs', () => {
  const before = rootStore().store, after = structuredClone(before);
  after.revision = 1; moveRepair(after, before.repairs[0].id, 'diagnostic');
  const a = '11111111-1111-4111-8111-111111111111', b = '22222222-2222-4222-8222-222222222222';
  const options = {origin: 'https://clinique.example', now: 1800000000000};
  const rowA = repairNotifications(before, after, {...options, workshopId: a})[0];
  const rowB = repairNotifications(before, after, {...options, workshopId: b})[0];
  assert.notEqual(rowA.id, rowB.id);
  assert.equal(repairNotifications(before, after, {...options, workshopId: a})[0].id, rowA.id);
  const payload = JSON.parse(rowA.payload);
  assert.equal(payload.portalUrl, `https://clinique.example/?atelier=${a}#/espace-client`);
  assert.ok(renderRepairNotification(payload).text.includes(payload.portalUrl));
  for (const portalUrl of [`https://clinique.example/?atelier=${a}&extra=1#/espace-client`,
    'https://clinique.example/?atelier=invalid#/espace-client', `https://clinique.example/?atelier=${a}#/admin`]) {
    assert.throws(() => renderRepairNotification({...payload, portalUrl}));
  }
});

for (const platform of ['node', 'worker']) {
  test(`${platform}: public applications await review, normalize contacts and disclose no session or credential`, async t => {
    const f = await fixture(t, platform), input = {...f.applicant('Pending owner'), email: ' PENDING@example.invalid ', role: 'super_admin', status: 'approved'};
    assert.equal(f.rootLogin.data.user.role, 'super_admin'); assert.equal(f.rootLogin.data.user.workshopId ?? null, null);
    const candidate = await f.submit(input);
    assert.equal(candidate.row.status, 'pending'); assert.equal(candidate.row.email, 'pending@example.invalid');
    assert.equal((await f.login('pending@example.invalid')).status, 401);
    const listed = await f.list('pending'); assert.equal(listed.status, 200);
    assert.deepEqual(listed.data.counts, {total: 1, pending: 1, approved: 0, rejected: 0});
    assert.ok(!JSON.stringify(listed.data).includes(tenantPassword));
    assert.ok(!JSON.stringify(listed.data).includes('scrypt$'));
    assert.ok(listed.data.requests.every(row => !('password_hash' in row) && !('passwordHash' in row) && !('review_token' in row) && !('token' in row)));
    assert.equal((await f.review(candidate.row.id, 'reject')).status, 200);
    assert.equal((await f.login('pending@example.invalid')).status, 401);
    assert.equal((await f.list('rejected')).data.requests[0].status, 'rejected');
    assert.equal((await f.list('invalid')).status, 400);
    assert.deepEqual(await f.getStore(f.root), f.initial.store);
  });

  test(`${platform}: only the super admin can review, with origin and CSRF enforced`, async t => {
    const f = await fixture(t, platform), tenant = await f.approve('Tenant reviewer'), candidate = await f.submit(f.applicant('Review target'));
    const url = `/api/super-admin/registrations/${candidate.row.id}/review`;
    assert.equal((await f.request('/api/super-admin/registrations')).status, 401);
    assert.equal((await f.list('all', tenant.auth)).status, 403);
    assert.equal((await f.review(candidate.row.id, 'approve', tenant.auth)).status, 403);
    assert.equal((await f.request(url, {method: 'POST', body: {decision: 'approve'}})).status, 401);
    assert.equal((await f.request(url, {cookie: f.root.cookie, method: 'POST', body: {decision: 'approve'}})).status, 403);
    assert.equal((await f.request(url, {...f.root, method: 'POST', body: {decision: 'approve'}, headers: {Origin: 'https://evil.example'}})).status, 403);
    assert.equal((await f.review(candidate.row.id, 'unknown')).status, 400);
    assert.equal((await f.review(candidate.row.id, 'approve', f.root, {note: 'x'.repeat(1001)})).status, 400);
    assert.equal((await f.review('not-a-uuid')).status, 400);
    const clientEmail = f.initial.client.email;
    const access = await f.request(`/api/admin/client-access/${f.initial.client.id}`, {...f.root, method: 'POST', body: {email: clientEmail, password: clientPassword}});
    assert.equal(access.status, 200, JSON.stringify(access.data));
    const clientLogin = await f.request('/api/client/auth/login', {method: 'POST', body: {email: clientEmail, password: clientPassword}});
    assert.equal(clientLogin.status, 200, JSON.stringify(clientLogin.data));
    const client = {cookie: clientLogin.cookie, csrf: clientLogin.data.csrfToken};
    assert.equal((await f.list('all', client)).status, 401);
    assert.equal((await f.review(candidate.row.id, 'approve', client)).status, 401);
    assert.equal((await f.list('pending')).data.requests[0].status, 'pending');
    assert.deepEqual(await f.getStore(f.root), f.initial.store);
  });

  test(`${platform}: duplicate submissions keep the first password both before and after approval`, async t => {
    const f = await fixture(t, platform), candidate = await f.submit(f.applicant('Duplicate owner'));
    const original = f.sqlite.prepare('SELECT * FROM registration_requests WHERE id=?').get(candidate.row.id);
    const duplicate = await f.submit({...candidate.input, name: 'Duplicate replacement', password: replacementPassword});
    assert.equal(duplicate.row.id, candidate.row.id);
    assert.deepEqual(f.sqlite.prepare('SELECT * FROM registration_requests WHERE id=?').get(candidate.row.id), original);
    assert.equal((await f.review(candidate.row.id)).status, 200);
    assert.equal((await f.login(candidate.input.email)).status, 200);
    assert.equal((await f.login(candidate.input.email, replacementPassword)).status, 401);
    assert.equal((await f.submit({...candidate.input, password: replacementPassword})).row.status, 'approved');
    assert.equal((await f.login(candidate.input.email)).status, 200);
    assert.equal((await f.login(candidate.input.email, replacementPassword)).status, 401);
    assert.equal(f.sqlite.prepare('SELECT password_hash FROM registration_requests WHERE id=?').get(candidate.row.id).password_hash, null);
    assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM saas_workshops').get().n, 1);
  });

  test(`${platform}: approved tenants start empty and reads/writes cannot select a different workshop`, async t => {
    const f = await fixture(t, platform), a = await f.approve('Tenant A'), b = await f.approve('Tenant B');
    const aInitial = await f.getStore(a.auth), bInitial = await f.getStore(b.auth);
    assert.equal(aInitial.settings.workshop, a.input.workshopName); assert.equal(bInitial.settings.workshop, b.input.workshopName);
    for (const store of [aInitial, bInitial]) {assert.equal(store.clients.length, 0); assert.equal(store.consoles.length, 0); assert.equal(store.repairs.length, 0); assert.ok(!JSON.stringify(store).includes('ROOT_PRIVATE'));}
    populateTenant(aInitial, 'A');
    const savedA = await f.save(a.auth, aInitial, 0, {url: `/api/store?atelier=${b.row.id}`, extra: {workshopId: b.row.id}, headers: {'X-Workshop-Id': b.row.id}});
    assert.equal(savedA.status, 200, JSON.stringify(savedA.data));
    assert.deepEqual(await f.getStore(b.auth), bInitial);
    const chosen = await f.request(`/api/store?atelier=${b.row.id}&workshopId=${b.row.id}`, a.auth);
    assert.equal(chosen.status, 200); assert.deepEqual(chosen.data, savedA.data);
    assert.equal((await f.save(a.auth, aInitial, 0)).status, 409);
    const counterfeitSelection = await f.request('/api/auth/login', {method: 'POST', body: {email: a.input.email, password: tenantPassword, workshopId: b.row.id, role: 'super_admin'}});
    assert.equal(counterfeitSelection.status, 200); assert.equal(counterfeitSelection.data.user.workshopId, a.row.id);
    assert.equal(counterfeitSelection.data.user.role, 'admin');
    populateTenant(bInitial, 'B', 'Game Boy Color');
    const savedB = await f.save(b.auth, bInitial, 0); assert.equal(savedB.status, 200);
    const prefix = namespace(a.row.id), trigger = 'fail_tenant_save';
    f.sqlite.exec(`CREATE TEMP TRIGGER ${trigger} BEFORE UPDATE ON "${prefix}workshop" BEGIN SELECT RAISE(ABORT, 'Synthetic tenant save failure'); END`);
    const failed = structuredClone(savedA.data); failed.settings.workshop = 'Must roll back';
    assert.equal((await f.save(a.auth, failed, 1)).status, 500);
    f.sqlite.exec(`DROP TRIGGER ${trigger}`);
    assert.deepEqual(await f.getStore(a.auth), savedA.data); assert.deepEqual(await f.getStore(b.auth), savedB.data);
    assert.deepEqual(await f.getStore(f.root), f.initial.store);
  });

  test(`${platform}: failed approval rolls back its decision and account, then can be approved once`, async t => {
    const f = await fixture(t, platform), candidate = await f.submit(f.applicant('Rollback owner'));
    f.sqlite.exec(`CREATE TEMP TRIGGER fail_saas_approval BEFORE INSERT ON saas_workshops WHEN NEW.id='${candidate.row.id}' BEGIN SELECT RAISE(ABORT, 'Synthetic approval failure'); END`);
    assert.equal((await f.review(candidate.row.id)).status, 500);
    const pending = f.sqlite.prepare('SELECT * FROM registration_requests WHERE id=?').get(candidate.row.id);
    assert.equal(pending.status, 'pending'); assert.ok(pending.password_hash); assert.equal(pending.reviewed_at, null);
    assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM saas_workshops WHERE id=?').get(candidate.row.id).n, 0);
    assert.equal((await f.login(candidate.input.email)).status, 401);
    assert.deepEqual(await f.getStore(f.root), f.initial.store);
    f.sqlite.exec('DROP TRIGGER fail_saas_approval');
    assert.equal((await f.review(candidate.row.id)).status, 200);
    assert.equal((await f.review(candidate.row.id)).status, 200);
    assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM saas_workshops WHERE id=?').get(candidate.row.id).n, 1);
    assert.equal((await f.login(candidate.input.email)).data.user.workshopId, candidate.row.id);
  });

  test(`${platform}: client availability stays inside its workshop even when repair and part identifiers coincide`, async t => {
    const f = await fixture(t, platform), a = await f.approve('Availability A'), b = await f.approve('Availability B');
    const initial = await f.getStore(f.root), savedStores = new Map();
    for (const [tenant, name, price] of [[a, 'A', 72.5], [b, 'B', 145]]) {
      const store = await f.getStore(tenant.auth), client = populateTenant(store, name);
      const repair = store.repairs.find(item => store.consoles.find(console => console.id === item.consoleId).clientId === client.id);
      const console = store.consoles.find(item => item.id === repair.consoleId);
      const previousConsole = console.id, previousRepair = repair.id;
      console.id = 'shared-console-id'; repair.id = 'shared-repair-id'; repair.consoleId = console.id;
      for (const event of store.events) {
        if (event.consoleId === previousConsole) event.consoleId = console.id;
        if (event.repairId === previousRepair) event.repairId = repair.id;
      }
      const part = addClientPartRequest(store, repair.id, {name: `${name} supplied screen`, quantity: 1, note: `${name} public part note`}); part.id = 'shared-supplied-part-id';
      setRepairInterventionCost(store, repair.id, price); validateStore(store);
      const saved = await f.save(tenant.auth, store, 0); assert.equal(saved.status, 200, JSON.stringify(saved.data)); savedStores.set(tenant.row.id, saved.data);
      const access = await f.request(`/api/admin/client-access/${client.id}`, {...tenant.auth, method: 'POST', body: {email: client.email, password: clientPassword}});
      assert.equal(access.status, 200);
    }
    const login = async tenant => {
      const response = await f.request('/api/client/auth/login', {method: 'POST', body: {email: 'shared-client@example.invalid', password: clientPassword, workshopId: tenant.row.id}});
      assert.equal(response.status, 200, JSON.stringify(response.data)); return {cookie: response.cookie, csrf: response.data.csrfToken};
    };
    const authA = await login(a), authB = await login(b);
    const path = '/api/client/repairs/shared-repair-id/parts/shared-supplied-part-id/available';
    assert.equal((await f.request(path, {...authA, method: 'POST', body: {}, headers: {'X-Workshop-ID': b.row.id}})).status, 401);
    const availableA = await f.request(`${path}?workshopId=${b.row.id}&clientId=other-client-id`, {...authA, method: 'POST', body: {}});
    assert.equal(availableA.status, 200, JSON.stringify(availableA.data)); assert.deepEqual(availableA.data.workshop, {name: a.input.workshopName});
    const projectedA = availableA.data.repairs.find(item => item.id === 'shared-repair-id');
    assert.equal(projectedA.clientParts[0].status, 'disponible'); assert.equal(projectedA.totalCost, 72.5); assert.ok(!JSON.stringify(availableA.data).includes('PRIVATE'));
    const changedA = await f.getStore(a.auth), unchangedB = await f.getStore(b.auth);
    assert.equal(changedA.revision, 2); assert.deepEqual(unchangedB, savedStores.get(b.row.id)); assert.deepEqual(await f.getStore(f.root), initial);
    const availableB = await f.request(path, {...authB, method: 'POST', body: {}}); assert.equal(availableB.status, 200); assert.equal(availableB.data.repairs.find(item => item.id === 'shared-repair-id').totalCost, 145);
    assert.deepEqual(await f.getStore(a.auth), changedA);
    assert.equal((await f.request(path, {...authA, method: 'POST', body: {}})).status, 200); assert.deepEqual(await f.getStore(a.auth), changedA);
    const stale = await f.save(a.auth, savedStores.get(a.row.id), 1); assert.equal(stale.status, 409); assert.deepEqual(await f.getStore(a.auth), changedA);
  });

  test(`${platform}: client portal sessions use the chosen workshop and expose only their own client`, async t => {
    const f = await fixture(t, platform), a = await f.approve('Portal A'), b = await f.approve('Portal B');
    for (const [tenant, name, model] of [[a, 'A', 'DS Lite'], [b, 'B', 'Game Boy Color']]) {
      const store = await f.getStore(tenant.auth), client = populateTenant(store, name, model);
      const own=store.repairs.find(repair=>store.consoles.find(console=>console.id===repair.consoleId).clientId===client.id);
      setRepairInterventionCost(store,own.id,name==='A'?35:82.5);
      own.payment={amount:name==='A'?111:222,paidAt:'2024-01-01T12:00:00.000Z'};
      assert.equal((await f.save(tenant.auth, store, 0)).status, 200);
      const access = await f.request(`/api/admin/client-access/${client.id}`, {...tenant.auth, method: 'POST', body: {email: client.email, password: clientPassword}});
      assert.equal(access.status, 200, JSON.stringify(access.data));
    }
    const clientLogin = async workshopId => f.request('/api/client/auth/login', {method: 'POST', body: {email: 'shared-client@example.invalid', password: clientPassword, ...(workshopId ? {workshopId} : {})}});
    assert.equal((await clientLogin()).status, 401);
    const expiredHash = digest('E'.repeat(43));
    f.sqlite.prepare("INSERT INTO saas_session_index(token_hash,workshop_id,kind,expires_at) VALUES(?,?,'client',?)")
      .run(expiredHash, a.row.id, Date.now() - 1000);
    const loginA = await clientLogin(a.row.id), loginB = await clientLogin(b.row.id);
    assert.equal(loginA.status, 200, JSON.stringify(loginA.data)); assert.equal(loginB.status, 200, JSON.stringify(loginB.data));
    assert.equal(f.sqlite.prepare('SELECT 1 FROM saas_session_index WHERE token_hash=?').get(expiredHash), undefined);
    const authA = {cookie: loginA.cookie, csrf: loginA.data.csrfToken}, authB = {cookie: loginB.cookie, csrf: loginB.data.csrfToken};
    const portalA = await f.request(`/api/client/portal?atelier=${b.row.id}&clientId=other-client-id`, authA), portalB = await f.request('/api/client/portal', authB);
    assert.equal(portalA.status, 200); assert.equal(portalB.status, 200);
    assert.equal((await f.request('/api/client/auth/me', {...authA, headers: {'X-Workshop-ID': b.row.id}})).status, 401);
    assert.equal((await f.request('/api/client/portal', {...authA, headers: {'X-Workshop-ID': b.row.id}})).status, 401);
    const canonicalHeader = await f.request('/api/client/portal', {...authA, headers: {'X-Workshop-ID': a.row.id.toUpperCase()}});
    assert.equal(canonicalHeader.status, 200); assert.equal(canonicalHeader.data.client.name, 'A client');
    assert.equal(portalA.data.client.name, 'A client'); assert.equal(portalB.data.client.name, 'B client');
    assert.deepEqual(portalA.data.workshop,{name:a.input.workshopName});assert.deepEqual(portalB.data.workshop,{name:b.input.workshopName});
    assert.equal(portalA.data.repairs[0].totalCost,35);assert.equal(portalB.data.repairs[0].totalCost,82.5);
    for(const portal of [portalA.data,portalB.data]) {
      assert.deepEqual(Object.keys(portal).sort(),['client','consoles','repairs','workshop']);
      for(const repair of portal.repairs)for(const key of ['interventionCost','payment','parts','worklogs','timerStartedAt','tests'])assert.equal(key in repair,false);
    }
    assert.ok(!JSON.stringify(portalA.data).includes(b.input.workshopName));assert.ok(!JSON.stringify(portalB.data).includes(a.input.workshopName));
    assert.equal(portalA.data.consoles.length, 1); assert.equal(portalB.data.consoles.length, 1);
    assert.equal(portalA.data.consoles[0].model, 'DS Lite'); assert.equal(portalB.data.consoles[0].model, 'Game Boy Color');
    assert.ok(!JSON.stringify(portalA.data).includes('PRIVATE')); assert.ok(!JSON.stringify(portalA.data).includes('B public symptoms'));
    assert.ok(!JSON.stringify(portalB.data).includes('A public symptoms'));
    assert.equal((await f.request('/api/store', authA)).status, 401);
    assert.equal((await f.list('all', authA)).status, 401);
    assert.equal((await f.request('/api/client/auth/logout', {...authA, method: 'POST', body: {workshopId: b.row.id}})).status, 200);
    assert.equal((await f.request('/api/client/portal', authA)).status, 401);
    assert.equal((await f.request('/api/client/portal', authB)).status, 200);
  });

  test(`${platform}: a global session index without its local session grants no tenant or super admin access`, async t => {
    const f = await fixture(t, platform), tenant = await f.approve('Orphan session');
    const hash = digest(tenant.auth.cookie.slice(tenant.auth.cookie.indexOf('=') + 1));
    assert.ok(f.sqlite.prepare('SELECT 1 FROM saas_session_index WHERE token_hash=?').get(hash));
    f.sqlite.prepare(`DELETE FROM "${namespace(tenant.row.id)}sessions" WHERE token_hash=?`).run(hash);
    assert.equal((await f.request('/api/auth/me', tenant.auth)).status, 401);
    assert.equal((await f.request('/api/store', tenant.auth)).status, 401);
    assert.equal((await f.list('all', tenant.auth)).status, 401);
    const fakeToken = 'Z'.repeat(43), fake = {cookie: `${platform === 'node' ? 'clinique_session' : '__Host-clinique_session'}=${fakeToken}`, csrf: 'counterfeit'};
    f.sqlite.prepare("INSERT INTO saas_session_index(token_hash,workshop_id,kind,expires_at) VALUES(?,?,'admin',?)").run(digest(fakeToken), tenant.row.id, Date.now() + 3600000);
    assert.equal((await f.request('/api/auth/me', fake)).status, 401);
    assert.equal((await f.list('all', fake)).status, 401);
    assert.deepEqual(await f.getStore(f.root), f.initial.store);
  });

  test(`${platform}: public registration applies origin, content type and body bounds before insertion`, async t => {
    const f = await fixture(t, platform), input = f.applicant('Invalid owner');
    assert.equal((await f.request('/api/public/registrations', {method: 'POST', body: input, headers: {Origin: 'https://evil.example'}})).status, 403);
    assert.equal((await f.request('/api/public/registrations', {method: 'POST', body: input, headers: {'Content-Type': 'text/plain'}})).status, 415);
    for (const body of [{...input, password: 'short'}, {...input, password: 'x'.repeat(129)}, {...input, email: 'invalid'}, {...input, name: 'x'.repeat(121)}, {...input, workshopName: 'x'.repeat(121)}, {...input, message: 'x'.repeat(2001)}]) {
      f.sqlite.exec('DELETE FROM limits');
      assert.equal((await f.request('/api/public/registrations', {method: 'POST', body})).status, 400);
    }
    f.sqlite.exec('DELETE FROM limits');
    assert.equal((await f.request('/api/public/registrations', {method: 'POST', body: {...input, extra: 'x'.repeat(8192)}})).status, 413);
    assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM registration_requests').get().n, 0);
    assert.deepEqual(await f.getStore(f.root), f.initial.store);
  });
}
