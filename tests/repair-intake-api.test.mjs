import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {readFileSync, readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createApplication} from '../server/application.mjs';
import {digest, token} from '../server/security.mjs';
import {emptyStore, createClient, setRepairInterventionCost, moveRepair, repairTotalCost, deleteRepair} from '../tests/.compiled/domain.cjs';
import {faultSuggestions, createPublicRepair, publicIntakeSettings} from '../tests/.compiled/repair-intake-domain.cjs';
import {provisioningStatements, workshopPrefix} from '../server/workshop-scope.mjs';
import {clientPortal} from '../server/client-portal.mjs';
import worker from '../cloudflare/worker.mjs';

const password = 'Synthetic repair intake test phrase 2026!';
const customer = {name: 'Client fictif', email: 'intake@example.invalid', phone: '0600000000', address: '1 rue du Test, 75000 Paris'};
const intake = (overrides = {}) => ({requestId: crypto.randomUUID(), modelId: 'ps5', customModel: '',
  selectedFaults: [faultSuggestions('ps5')[0]], description: 'Panne décrite par le client fictif.', serial: 'SYNTHETIC-SERIAL', accessories: 'Câble secteur', ...overrides});
const registration = (overrides = {}) => ({customer: {...customer}, password, intake: intake(), ...overrides});

async function fixture(t, platform, {store = emptyStore()} = {}) {
  const origin = platform === 'node' ? 'http://127.0.0.1:3041' : 'https://repair.example';
  let sqlite, call, beforePublication, failAt = -1;
  if (platform === 'node') {
    const app = createApplication({databasePath: ':memory:', origin, notificationPollingMs: 0});
    sqlite = app.db;
    sqlite.prepare('UPDATE workshop SET data=?,revision=? WHERE id=1').run(JSON.stringify(store), store.revision);
    app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening');
    const base = `http://127.0.0.1:${app.server.address().port}`;
    call = (url, options) => fetch(base + url, options);
    t.after(() => new Promise(resolve => {app.server.closeAllConnections(); app.server.close(resolve);}));
  } else {
    sqlite = new DatabaseSync(':memory:'); t.after(() => sqlite.close());
    const migrations = new URL('../cloudflare/migrations/', import.meta.url);
    for (const name of readdirSync(migrations).filter(name => name.endsWith('.sql')).sort()) sqlite.exec(readFileSync(new URL(name, migrations), 'utf8'));
    sqlite.prepare("UPDATE workshop SET generation='fixture',revision=? WHERE id=1").run(store.revision);
    sqlite.prepare("INSERT INTO workshop_chunks(generation,position,data) VALUES('fixture',0,?)").run(JSON.stringify(store));
    const db = {
      prepare(sql) {
        const statement = (values = []) => ({sql,
          bind(...bindings) {return statement(bindings);},
          execute() {
            assert.ok(values.length <= 100);
            for (const value of values) if (typeof value === 'string') assert.ok(Buffer.byteLength(value) <= 2000000);
            const results = sqlite.prepare(sql).all(...values);
            return {success: true, results, meta: sqlite.prepare('SELECT changes() AS changes').get()};
          },
          async run() {return this.execute();}, async all() {return this.execute();},
          async first(column) {const row = this.execute().results[0] ?? null; return column && row ? row[column] : row;},
        });
        return statement();
      },
      async batch(statements) {
        assert.ok(statements.length <= 50);
        if (statements.some(statement => /INSERT INTO workshop_chunks/.test(statement.sql))) {
          const hook = beforePublication; beforePublication = undefined; hook?.();
        }
        sqlite.exec('BEGIN IMMEDIATE');
        try {
          const results = statements.map((statement, index) => {
            if (statements.some(statement => /INSERT INTO workshop_chunks/.test(statement.sql)) && index === failAt) throw Error('Synthetic signup transaction failure');
            return statement.execute();
          });
          sqlite.exec('COMMIT'); return results;
        } catch (error) {sqlite.exec('ROLLBACK'); throw error;}
      },
    };
    call = (url, options) => worker.fetch(new Request(origin + url, options), {DB: db});
  }
  sqlite.prepare("INSERT INTO admin(id,email,password_hash,role) VALUES(1,'admin@example.invalid','synthetic-not-a-real-hash','admin')").run();
  const read = () => platform === 'node'
    ? JSON.parse(sqlite.prepare('SELECT data FROM workshop WHERE id=1').get().data)
    : JSON.parse(sqlite.prepare('SELECT c.data FROM workshop w JOIN workshop_chunks c ON c.generation=w.generation ORDER BY c.position').all().map(row => row.data).join(''));
  function replace(next) {
    if (platform === 'node') sqlite.prepare('UPDATE workshop SET revision=?,data=? WHERE id=1').run(next.revision, JSON.stringify(next));
    else {
      const generation = crypto.randomUUID();
      sqlite.prepare('INSERT INTO workshop_chunks(generation,position,data) VALUES(?,0,?)').run(generation, JSON.stringify(next));
      sqlite.prepare('UPDATE workshop SET revision=?,generation=? WHERE id=1').run(next.revision, generation);
    }
  }
  async function request(path, {method = 'GET', body, rawBody, cookie, csrf, headers = {}} = {}) {
    const response = await call(path, {method,
      headers: {Origin: origin, ...(body === undefined && rawBody === undefined ? {} : {'Content-Type': 'application/json'}), ...(cookie ? {Cookie: cookie} : {}), ...(csrf ? {'X-CSRF-Token': csrf} : {}), ...headers},
      ...(rawBody === undefined ? body === undefined ? {} : {body: JSON.stringify(body)} : {body: rawBody, ...(rawBody instanceof ReadableStream ? {duplex: 'half'} : {})}),
    });
    return {status: response.status, data: await response.json(), headers: response.headers, cookie: response.headers.get('set-cookie')?.split(';')[0]};
  }
  const signup = async (body = registration(), options = {}) => {
    const result = await request('/api/public/repair-intake/register', {method: 'POST', body, ...options});
    return {...result, auth: {cookie: result.cookie, csrf: result.data.session?.csrfToken}};
  };
  return {request, signup, read, replace, sqlite, origin, beforePublication(hook) {beforePublication = hook;}, failPublicationAt(index) {failAt = index;}};
}

for (const platform of ['node', 'worker']) {
  test(`${platform}: public signup creates an isolated customer, authenticated order and printable summary`, async t => {
    const store = emptyStore();
    const old = createClient(store, {...customer, name: 'Identité privée préexistante', notes: 'PRIVATE_OLD_NOTE'});
    store.settings.owner = 'PRIVATE_OWNER'; store.settings.hourlyRate = 999;
    const oldRepair = createPublicRepair(store, old.id, intake());
    oldRepair.repair.diagnosis = 'PRIVATE_DIAGNOSIS'; oldRepair.console.notes = 'PRIVATE_CONSOLE_NOTE';
    const f = await fixture(t, platform, {store});
    const publicResponse = await f.request('/api/public/repair-intake');
    assert.equal(publicResponse.status, 200);
    assert.deepEqual(publicResponse.data, {shop: publicIntakeSettings(store)});
    assert.ok(!JSON.stringify(publicResponse.data).includes('PRIVATE'));
    const input = registration(), result = await f.signup(input);
    assert.equal(result.status, 201, JSON.stringify(result.data));
    assert.equal(result.data.session.user.role, 'client');
    assert.notEqual(result.data.session.user.clientId, old.id);
    assert.match(result.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
    if (platform === 'worker') assert.match(result.headers.get('set-cookie'), /__Host-.*; Secure/);
    const saved = f.read(), account = f.sqlite.prepare('SELECT * FROM client_accounts').get();
    assert.equal(saved.clients.length, 2); assert.equal(saved.revision, 1);
    assert.equal(saved.repairs.find(repair => repair.id === result.data.repairId).stage, 'attente-envoi');
    assert.equal(account.client_id, result.data.session.user.clientId); assert.match(account.password_hash, /^scrypt\$/);
    assert.notEqual(account.password_hash, password);
    const portal = await f.request('/api/client/portal', result.auth);
    assert.equal(portal.status, 200); assert.equal(portal.data.repairs.length, 1);
    assert.equal((await f.request('/api/client/repair-intake/session', result.auth)).data.user.clientId, account.client_id);
    assert.equal(portal.data.repairs[0].intakeSubmitted, true); assert.equal(portal.data.repairs[0].totalCost, null);
    assert.ok(!JSON.stringify(portal.data).includes('PRIVATE')); assert.ok(!JSON.stringify(portal.data).includes(old.id));
    const sheetPath = `/api/client/repair-intake/${result.data.repairId}/sheet`;
    assert.equal((await f.request(sheetPath)).status, 401);
    const sheet = await f.request(sheetPath, result.auth);
    assert.equal(sheet.status, 200);
    assert.deepEqual(Object.keys(sheet.data).sort(), ['console', 'customer', 'repair', 'shop']);
    assert.deepEqual(sheet.data.customer, customer);
    assert.deepEqual(Object.keys(sheet.data.repair).sort(), ['code', 'createdAt', 'id', 'stage', 'symptoms', 'title']);
    assert.equal(sheet.data.repair.stage, 'attente-envoi'); assert.ok(!JSON.stringify(sheet.data).includes('PRIVATE'));
    assert.equal((await f.request(`/api/client/repair-intake/${oldRepair.repair.id}/sheet`, result.auth)).status, 404);
    assert.equal((await f.request('/api/client/auth/logout', {...result.auth, method: 'POST', body: {}})).status, 200);
    assert.equal((await f.request(sheetPath, result.auth)).status, 401);
    const login = await f.request('/api/client/auth/login', {method: 'POST', body: {email: customer.email, password}});
    assert.equal(login.status, 200); assert.equal(login.data.user.clientId, account.client_id);
    const auth = {cookie: login.cookie, csrf: login.data.csrfToken}, nextInput = intake();
    const next = await f.request('/api/client/repair-intake', {...auth, method: 'POST', body: {intake: nextInput}});
    assert.equal(next.status, 200); assert.notEqual(next.data.repairId, result.data.repairId);
    const revision = f.read().revision;
    const retry = await f.request('/api/client/repair-intake', {...auth, method: 'POST', body: {intake: {...nextInput, description: 'Changed retry must preserve the original'}}});
    assert.equal(retry.status, 200); assert.deepEqual(retry.data, next.data);
    assert.equal(f.read().revision, revision); assert.equal(f.read().consoles.filter(console => console.clientId === account.client_id).length, 2);
    assert.ok(!f.read().repairs.find(repair => repair.id === next.data.repairId).symptoms.includes('Changed retry'));
    const updated = f.read(); setRepairInterventionCost(updated, result.data.repairId, 0); moveRepair(updated, result.data.repairId, 'reception');
    updated.revision++; f.replace(updated);
    const estimated = await f.request('/api/client/portal', auth);
    assert.equal(estimated.data.repairs.find(repair => repair.id === result.data.repairId).totalCost, 0);
    assert.equal(estimated.data.repairs.find(repair => repair.id === result.data.repairId).intakeSubmitted, true);
    assert.equal((await f.request(sheetPath, auth)).data.repair.stage, 'reception');
  });

  test(`${platform}: signup cannot reset an existing account, claim a reserved admin or introduce forged fields`, async t => {
    const f = await fixture(t, platform), result = await f.signup();
    assert.equal(result.status, 201);
    const before = f.read(), account = {...f.sqlite.prepare('SELECT * FROM client_accounts').get()};
    const duplicate = await f.signup(registration({password: 'Different synthetic attacker phrase!'}));
    assert.equal(duplicate.status, 409); assert.deepEqual(f.read(), before);
    assert.deepEqual({...f.sqlite.prepare('SELECT * FROM client_accounts').get()}, account);
    f.sqlite.prepare('UPDATE client_accounts SET enabled=0').run();
    const disabled = await f.signup(); assert.equal(disabled.status, 409);
    assert.equal(f.sqlite.prepare('SELECT enabled FROM client_accounts').get().enabled, 0);
    assert.equal(f.sqlite.prepare('SELECT password_hash FROM client_accounts').get().password_hash, account.password_hash);
    const reserved = await f.signup(registration({customer: {...customer, email: 'admin@example.invalid'}}));
    assert.equal(reserved.status, 409); assert.deepEqual(f.read(), before);
    assert.equal((await f.signup(registration({workshopId: crypto.randomUUID()}))).status, 400);
    // Each malformed case uses a fresh fixture, so the IP limiter doesn't hide validation.
  });

  test(`${platform}: a website request persists through reception and completion with isolated customer tracking`, async t => {
    const store = emptyStore(); store.settings.owner = 'PRIVATE_STORE_OWNER';
    const f = await fixture(t, platform, {store}), input = registration();
    const registered = await f.signup(input); assert.equal(registered.status, 201);
    // The same retry key belongs to different requests when the owners differ.
    const other = await f.signup(registration({customer: {...customer, name: 'Autre client fictif', email: 'other-intake@example.invalid'},
      intake: {...input.intake, description: 'OTHER_CLIENT_DESCRIPTION', serial: 'OTHER_CLIENT_SERIAL'}}));
    assert.equal(other.status, 201); assert.notEqual(other.data.repairId, registered.data.repairId);
    const repairId = registered.data.repairId, clientId = registered.data.session.user.clientId;
    const initial = f.read(), original = initial.repairs.find(repair => repair.id === repairId);
    const consoleId = original.consoleId;
    assert.equal(original.publicRequestId, input.intake.requestId);
    assert.equal(original.stage, 'attente-envoi');
    assert.equal(initial.consoles.find(console => console.id === consoleId).clientId, clientId);
    const otherRepair = structuredClone(initial.repairs.find(repair => repair.id === other.data.repairId)),
      otherConsole = structuredClone(initial.consoles.find(console => console.id === otherRepair.consoleId)),
      otherClient = structuredClone(initial.clients.find(client => client.id === other.data.session.user.clientId));
    const otherProjection = await f.request('/api/client/portal', other.auth);
    assert.equal(otherProjection.status, 200);

    const value = token(), csrf = token(), expires = Date.now() + 3600000;
    f.sqlite.prepare('INSERT INTO sessions(token_hash,admin_id,csrf,expires_at,seen_at) VALUES(?,1,?,?,?)')
      .run(digest(value), csrf, expires, Date.now());
    const admin = {cookie: `${platform === 'node' ? 'clinique_session' : '__Host-clinique_session'}=${value}`, csrf};
    const sheetPath = `/api/client/repair-intake/${repairId}/sheet`;
    async function verifyTracking(stage) {
      const current = f.read(), repair = current.repairs.find(item => item.id === repairId),
        console = current.consoles.find(item => item.id === consoleId);
      assert.equal(repair.publicRequestId, input.intake.requestId);
      assert.equal(repair.consoleId, consoleId); assert.equal(console.clientId, clientId);
      assert.equal(repair.code, original.code); assert.equal(repair.createdAt, original.createdAt);
      assert.equal(repair.symptoms, original.symptoms); assert.equal(repair.stage, stage);
      assert.equal(current.repairs.length, 2); assert.equal(current.consoles.length, 2);
      assert.deepEqual(current.repairs.find(item => item.id === otherRepair.id), otherRepair);
      assert.deepEqual(current.consoles.find(item => item.id === otherConsole.id), otherConsole);
      assert.deepEqual(current.clients.find(item => item.id === otherClient.id), otherClient);
      const portal = await f.request('/api/client/portal', registered.auth);
      assert.equal(portal.status, 200); assert.equal(portal.data.repairs.length, 1); assert.equal(portal.data.consoles.length, 1);
      const projected = portal.data.repairs[0];
      assert.equal(projected.id, repairId); assert.equal(projected.consoleId, consoleId);
      assert.equal(projected.stage, stage); assert.equal(projected.intakeSubmitted, true);
      assert.equal(projected.createdAt, original.createdAt); assert.equal(projected.completedAt, repair.completedAt);
      for (const key of ['publicRequestId', 'diagnosis', 'tests', 'photos', 'worklogs', 'payment']) assert.equal(Object.hasOwn(projected, key), false);
      for (const key of ['notes', 'location', 'clientId']) assert.equal(Object.hasOwn(portal.data.consoles[0], key), false);
      const publicJSON = JSON.stringify(portal.data);
      for (const hidden of ['PRIVATE_', 'OTHER_CLIENT_', otherRepair.id, otherConsole.id, otherClient.id, input.intake.requestId]) {
        assert.ok(!publicJSON.includes(hidden), `Unexpected customer projection field: ${hidden}`);
      }
      const sheet = await f.request(sheetPath, registered.auth);
      assert.equal(sheet.status, 200); assert.equal(sheet.data.repair.id, repairId); assert.equal(sheet.data.repair.stage, stage);
      assert.ok(!JSON.stringify(sheet.data).includes('PRIVATE_'));
      assert.ok(!JSON.stringify(sheet.data).includes(input.intake.requestId));
      assert.equal((await f.request(sheetPath, other.auth)).status, 404);
      assert.equal((await f.request(`/api/client/repair-intake/${otherRepair.id}/sheet`, registered.auth)).status, 404);
      assert.deepEqual((await f.request('/api/client/portal', other.auth)).data, otherProjection.data);
    }
    async function retryOriginalRequest() {
      const before = f.read(), retry = await f.request('/api/client/repair-intake', {...registered.auth, method: 'POST',
        body: {intake: {...input.intake, description: 'Changed retry must not reopen or replace this request.'}}});
      assert.equal(retry.status, 200); assert.equal(retry.data.repairId, repairId); assert.equal(retry.data.repairCode, original.code);
      assert.deepEqual(f.read(), before);
    }
    await verifyTracking('attente-envoi');
    const blocked = await f.request('/api/store', {...admin, csrf: undefined, method: 'PUT',
      body: {data: initial, revision: initial.revision, mode: 'edit'}});
    assert.equal(blocked.status, 403); assert.deepEqual(f.read(), initial);
    for (const stage of ['reception', 'diagnostic', 'reparation', 'tests', 'terminee']) {
      const loaded = await f.request('/api/store', admin); assert.equal(loaded.status, 200);
      const draft = structuredClone(loaded.data);
      if (stage === 'reception') {
        draft.repairs.find(repair => repair.id === repairId).diagnosis = 'PRIVATE_DIAGNOSIS';
        draft.repairs.find(repair => repair.id === repairId).tests[0].label = 'PRIVATE_INTERNAL_CHECK';
        draft.consoles.find(console => console.id === consoleId).notes = 'PRIVATE_CONSOLE_NOTE';
        draft.clients.find(client => client.id === clientId).notes = 'PRIVATE_CLIENT_NOTE';
      }
      moveRepair(draft, repairId, stage); draft.revision = loaded.data.revision + 1;
      const body = {data: draft, revision: loaded.data.revision, mode: 'edit'};
      const saved = await f.request('/api/store', {...admin, method: 'PUT', body});
      assert.equal(saved.status, 200, JSON.stringify(saved.data));
      assert.equal(saved.data.revision, loaded.data.revision + 1); assert.deepEqual(f.read(), saved.data);
      const console = saved.data.consoles.find(item => item.id === consoleId);
      assert.equal(console.location, 'À l’atelier');
      assert.equal(console.state, stage === 'terminee' ? 'fonctionnelle' : 'en-reparation');
      const repair = saved.data.repairs.find(item => item.id === repairId);
      assert.equal(repair.diagnosis, 'PRIVATE_DIAGNOSIS');
      assert.equal(repair.tests[0].label, 'PRIVATE_INTERNAL_CHECK');
      if (stage === 'terminee') {
        assert.ok(repair.completedAt); assert.ok(repair.tests.length > 0);
        assert.ok(repair.tests.every(check => check.result === 'pass'));
      } else assert.equal(repair.completedAt, '');
      await verifyTracking(stage);
      if (stage === 'reception' || stage === 'terminee') {
        assert.equal((await f.request('/api/store', {...admin, method: 'PUT', body})).status, 409);
        assert.deepEqual(f.read(), saved.data);
        await retryOriginalRequest();
      }
    }
  });

  test(`${platform}: intake enforces origin, CSRF, request bounds and canonical ownership`, async t => {
    const f = await fixture(t, platform);
    assert.equal((await f.signup(registration(), {headers: {Origin: 'https://attacker.example'}})).status, 403);
    assert.equal((await f.signup(registration(), {headers: {'Sec-Fetch-Site': 'cross-site'}})).status, 403);
    assert.equal((await f.signup(registration(), {headers: {'X-Workshop-ID': crypto.randomUUID()}})).status, 403);
    assert.equal((await f.signup(registration({customer: {...customer, notes: 'forged internal notes'}}))).status, 400);
    assert.equal((await f.signup(registration({intake: intake({interventionCost: 0, stage: 'terminee'})}))).status, 400);
    assert.equal((await f.signup(registration({customer: {...customer, email: 'oversize@example.invalid'}, intake: intake({description: 'x'.repeat(50000)})}))).status, 413);
    const registered = await f.signup(); assert.equal(registered.status, 201);
    const path = '/api/client/repair-intake';
    assert.equal((await f.request(path, {method: 'POST', body: {intake: intake()}})).status, 401);
    assert.equal((await f.request(path, {...registered.auth, csrf: 'forged', method: 'POST', body: {intake: intake()}})).status, 403);
    assert.equal((await f.request(path, {...registered.auth, method: 'POST', body: {customer: {...customer, name: 'forged identity'}, intake: intake()}})).status, 400);
    assert.equal((await f.request(path, {...registered.auth, method: 'POST', body: {intake: intake({clientId: 'other-client', totalCost: 0})}})).status, 400);
    assert.equal((await f.request(path, {...registered.auth, method: 'POST', body: {intake: intake()}, headers: {'X-Workshop-ID': crypto.randomUUID()}})).status, 401);
    assert.equal(f.read().repairs.length, 1);
  });

  test(`${platform}: repeated authenticated retries are idempotent and bounded`, async t => {
    const f = await fixture(t, platform), registered = await f.signup();
    const input = intake(), options = {...registered.auth, method: 'POST', body: {intake: input}};
    const first = await f.request('/api/client/repair-intake', options); assert.equal(first.status, 200);
    for (let index = 0; index < 9; index++) {
      const retry = await f.request('/api/client/repair-intake', options); assert.equal(retry.status, 200); assert.deepEqual(retry.data, first.data);
    }
    const limited = await f.request('/api/client/repair-intake', options);
    assert.equal(limited.status, 429); assert.ok(Number(limited.headers.get('Retry-After')) > 0);
    assert.equal(f.read().repairs.length, 2); assert.equal(f.read().revision, 2);
  });

  test(`${platform}: intake cannot escape a tenant and public cookies do not redirect signup`, async t => {
    const f = await fixture(t, platform), tenantId = crypto.randomUUID(), tenantStore = emptyStore();
    tenantStore.settings.workshop = 'PRIVATE_TENANT';
    const tenantEmail = 'tenant-admin@example.invalid';
    for (const statement of provisioningStatements({id: tenantId, email: tenantEmail, password_hash: 'synthetic', workshop_name: 'PRIVATE_TENANT', name: 'Tenant admin'},
      {at: Date.now(), guard: {sql: '1=1', values: []}, store: tenantStore}, platform === 'node' ? 'node' : 'd1')) f.sqlite.prepare(statement.sql).run(...statement.values);
    const prefix = workshopPrefix(tenantId), client = createClient(tenantStore, {...customer, name: 'Private tenant client', notes: 'PRIVATE_TENANT_NOTE'});
    const tenantRepair = createPublicRepair(tenantStore, client.id, intake());
    if (platform === 'node') f.sqlite.prepare(`UPDATE ${prefix}workshop SET data=? WHERE id=1`).run(JSON.stringify(tenantStore));
    else {
      f.sqlite.prepare(`UPDATE ${prefix}workshop_chunks SET data=?`).run(JSON.stringify(tenantStore));
    }
    f.sqlite.prepare(`INSERT INTO ${prefix}client_accounts(client_id,email,password_hash,enabled,created_at,updated_at) VALUES(?,?,?,1,?,?)`)
      .run(client.id, customer.email, 'synthetic', Date.now(), Date.now());
    const value = token(), csrf = token(), key = digest(value), expires = Date.now() + 3600000;
    f.sqlite.prepare(`INSERT INTO ${prefix}client_sessions(token_hash,client_id,csrf,expires_at,seen_at) VALUES(?,?,?,?,?)`).run(key, client.id, csrf, expires, Date.now());
    f.sqlite.prepare("INSERT INTO saas_session_index(token_hash,workshop_id,kind,expires_at) VALUES(?,?,'client',?)").run(key, tenantId, expires);
    const auth = {cookie: `${platform === 'node' ? 'clinique_client_session' : '__Host-clinique_client_session'}=${value}`, csrf};
    const tenantPortal = await f.request('/api/client/portal', auth); assert.equal(tenantPortal.status, 200); assert.equal(tenantPortal.data.workshop.name, 'PRIVATE_TENANT');
    assert.equal((await f.request('/api/client/repair-intake/session', auth)).status, 401);
    assert.equal((await f.request('/api/client/repair-intake', {...auth, method: 'POST', body: {intake: intake()}})).status, 404);
    assert.equal((await f.request(`/api/client/repair-intake/${tenantRepair.repair.id}/sheet`, auth)).status, 404);
    assert.deepEqual((await f.request('/api/public/repair-intake', auth)).data, {shop: publicIntakeSettings(emptyStore())});
    const registered = await f.signup(registration(), auth); assert.equal(registered.status, 201);
    assert.equal(f.read().clients.length, 1); assert.notEqual(registered.data.session.user.clientId, client.id);
    assert.equal(f.sqlite.prepare(`SELECT count(*) AS n FROM ${prefix}client_accounts`).get().n, 1);
  });

  test(`${platform}: old admin editors cannot erase intake identifiers or shipping settings, while deletion and restore remain explicit`, async t => {
    const f = await fixture(t, platform), registered = await f.signup(); assert.equal(registered.status, 201);
    const current = f.read(); moveRepair(current, registered.data.repairId, 'reception');
    current.settings.publicIntake = publicIntakeSettings(current); current.revision++; f.replace(current);
    const value = token(), csrf = token(), expires = Date.now() + 3600000;
    f.sqlite.prepare('INSERT INTO sessions(token_hash,admin_id,csrf,expires_at,seen_at) VALUES(?,1,?,?,?)').run(digest(value), csrf, expires, Date.now());
    const auth = {cookie: `${platform === 'node' ? 'clinique_session' : '__Host-clinique_session'}=${value}`, csrf};
    for (const field of ['requestId', 'changedRequestId', 'shipping']) {
      const oldBundle = structuredClone(current);
      if (field === 'requestId') delete oldBundle.repairs[0].publicRequestId;
      if (field === 'changedRequestId') oldBundle.repairs[0].publicRequestId = crypto.randomUUID();
      if (field === 'shipping') delete oldBundle.settings.publicIntake;
      const response = await f.request('/api/store', {...auth, method: 'PUT', body: {data: oldBundle, revision: current.revision, mode: 'edit'}});
      assert.equal(response.status, 409); assert.deepEqual(f.read(), current);
    }
    const deleted = structuredClone(current); deleteRepair(deleted, registered.data.repairId);
    assert.equal((await f.request('/api/store', {...auth, method: 'PUT', body: {data: deleted, revision: current.revision, mode: 'edit'}})).status, 200);
    const legacyBackup = structuredClone(current); delete legacyBackup.repairs[0].publicRequestId; delete legacyBackup.settings.publicIntake;
    assert.equal((await f.request('/api/store', {...auth, method: 'PUT', body: {data: legacyBackup, revision: f.read().revision, mode: 'restore'}})).status, 200);
    assert.equal(f.read().repairs[0].publicRequestId, undefined); assert.equal(f.read().settings.publicIntake, undefined);
  });
}

test('Node: concurrent registration with one email creates one account/order and preserves the winning identity', async t => {
  const f = await fixture(t, 'node');
  const results = await Promise.all([f.signup(), f.signup(registration({customer: {...customer, name: 'Second synthetic identity'}}))]);
  assert.deepEqual(results.map(result => result.status).sort(), [201, 409]);
  assert.equal(f.read().clients.length, 1); assert.equal(f.read().repairs.length, 1); assert.equal(f.read().revision, 1);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM client_accounts').get().n, 1);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM client_sessions').get().n, 1);
  assert.equal(f.read().clients[0].id, results.find(result => result.status === 201).data.session.user.clientId);
});

test('Worker: a concurrent signup account or revision rejects all fragments, identity and session writes', async t => {
  for (const kind of ['revision', 'duplicate']) {
    const f = await fixture(t, 'worker');
    f.beforePublication(() => {
      if (kind === 'revision') {const next = f.read(); next.revision++; next.settings.owner = 'Concurrent private owner'; f.replace(next);}
      else f.sqlite.prepare('INSERT INTO client_accounts(client_id,email,password_hash,enabled,created_at,updated_at) VALUES(?,?,?,1,?,?)')
        .run('concurrent-account', customer.email, 'unchanged-concurrent-hash', Date.now(), Date.now());
    });
    const result = await f.signup(); assert.equal(result.status, 409);
    assert.equal(f.read().clients.length, 0); assert.equal(f.read().repairs.length, 0);
    assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM client_sessions').get().n, 0);
    assert.equal(f.sqlite.prepare('SELECT count(DISTINCT generation) AS n FROM workshop_chunks').get().n, 1);
    if (kind === 'duplicate') assert.equal(f.sqlite.prepare('SELECT password_hash FROM client_accounts').get().password_hash, 'unchanged-concurrent-hash');
    else assert.equal(f.read().settings.owner, 'Concurrent private owner');
  }
});

test('Worker: failure after account insertion rolls back the entire registration', async t => {
  const f = await fixture(t, 'worker'); f.failPublicationAt(3);
  const result = await f.signup(); assert.equal(result.status, 500);
  assert.deepEqual(f.read(), emptyStore());
  assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM client_accounts').get().n, 0);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM client_sessions').get().n, 0);
  assert.equal(f.sqlite.prepare('SELECT count(DISTINCT generation) AS n FROM workshop_chunks').get().n, 1);
});

test('Worker: session revocation and stale admin revision are enforced at intake publication', async t => {
  for (const kind of ['revoked', 'expired', 'csrf', 'revision']) {
    const f = await fixture(t, 'worker'), registered = await f.signup(); assert.equal(registered.status, 201);
    f.beforePublication(() => {
      if (kind === 'revoked') f.sqlite.exec('DELETE FROM client_sessions');
      if (kind === 'expired') f.sqlite.prepare('UPDATE client_sessions SET expires_at=0').run();
      if (kind === 'csrf') f.sqlite.prepare("UPDATE client_sessions SET csrf='changed-csrf'").run();
      if (kind === 'revision') {const changed = f.read(); changed.revision++; changed.settings.owner = 'Concurrent admin edit'; f.replace(changed);}
    });
    const result = await f.request('/api/client/repair-intake', {...registered.auth, method: 'POST', body: {intake: intake()}});
    assert.equal(result.status, kind === 'revision' ? 409 : kind === 'csrf' ? 403 : 401);
    assert.equal(f.read().repairs.length, 1); assert.equal(f.read().consoles.length, 1);
    assert.equal(f.sqlite.prepare('SELECT count(DISTINCT generation) AS n FROM workshop_chunks').get().n, 1);
  }
});

test('Node: session is checked again after receiving an intake body', async t => {
  const f = await fixture(t, 'node'), registered = await f.signup(); assert.equal(registered.status, 201);
  const encoded = new TextEncoder().encode(JSON.stringify({intake: intake()}));
  const stream = new ReadableStream({start(controller) {
    controller.enqueue(encoded.slice(0, 1));
    setTimeout(() => {f.sqlite.exec('DELETE FROM client_sessions'); controller.enqueue(encoded.slice(1)); controller.close();}, 50);
  }});
  const result = await f.request('/api/client/repair-intake', {...registered.auth, method: 'POST', rawBody: stream});
  assert.equal(result.status, 401); assert.equal(f.read().repairs.length, 1); assert.equal(f.read().revision, 1);
});

test('Client projection preserves absent quotes only for empty public intake dossiers', () => {
  const store = emptyStore(), client = createClient(store, {...customer, notes: ''});
  const {repair} = createPublicRepair(store, client.id, intake());
  assert.equal(clientPortal(store, client.id, repairTotalCost).repairs[0].totalCost, null);
  setRepairInterventionCost(store, repair.id, 0);
  assert.equal(clientPortal(store, client.id, repairTotalCost).repairs[0].totalCost, 0);
  delete repair.interventionCost; repair.worklogs.push({id: crypto.randomUUID(), minutes: 2, note: '', createdAt: new Date().toISOString()});
  assert.equal(typeof clientPortal(store, client.id, repairTotalCost).repairs[0].totalCost, 'number');
  delete repair.publicRequestId;
  assert.equal(clientPortal(store, client.id, repairTotalCost).repairs[0].intakeSubmitted, undefined);
});
