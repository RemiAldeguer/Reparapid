import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {readFileSync, readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createApplication} from '../server/application.mjs';
import {digest, token} from '../server/security.mjs';
import {emptyStore, createClient, moveRepair, validateStore} from './.compiled/domain.cjs';
import {createPublicRepair, faultSuggestions} from './.compiled/repair-intake-domain.cjs';
import {provisioningStatements, workshopPrefix} from '../server/workshop-scope.mjs';
import worker from '../cloudflare/worker.mjs';

const proposal = (overrides = {}) => ({kind: 'repair', description: 'Remplacement du connecteur de charge fictif.',
  repairAmount: 79.95, buybackAmount: null, returnFee: 12.5,
  bankInstructions: 'INSTRUCTIONS_BANCAIRES_FICTIVES réservées au retour de ce dossier.', ...overrides});
const unsafeKeys = ['diagnosis', 'payment', 'interventionCost', 'parts', 'worklogs', 'tests', 'photos', 'publicRequestId'];
function sampleStore() {
  const store = emptyStore();
  store.settings.owner = 'PRIVATE_OWNER'; store.settings.workshop = 'Atelier fictif';
  const clients = ['a', 'b'].map(suffix => createClient(store, {name: `Client fictif ${suffix}`, email: `${suffix}@example.invalid`,
    phone: '', address: '', notes: `PRIVATE_CLIENT_${suffix}`}));
  const entries = clients.map((client, index) => {
    const entry = createPublicRepair(store, client.id, {requestId: crypto.randomUUID(), modelId: 'ps5', customModel: '',
      selectedFaults: [faultSuggestions('ps5')[0]], description: `Panne fictive ${index}`, serial: '', accessories: ''});
    moveRepair(store, entry.repair.id, 'diagnostic');
    entry.repair.diagnosis = 'PRIVATE_DIAGNOSIS'; entry.console.notes = 'PRIVATE_CONSOLE_NOTE';
    entry.repair.interventionCost = 987.65;
    return entry;
  });
  store.repairs = entries.map(entry => entry.repair);
  validateStore(store);
  return {store, clients, entries};
}
async function fixture(t, platform) {
  const initial = sampleStore(), origin = platform === 'node' ? 'http://127.0.0.1:3041' : 'https://proposal.example';
  let sqlite, call, app, beforePublication, failAt = -1;
  if (platform === 'node') {
    app = createApplication({databasePath: ':memory:', origin, notificationPollingMs: 0}); sqlite = app.db;
    sqlite.prepare('UPDATE workshop SET data=?,revision=? WHERE id=1').run(JSON.stringify(initial.store), initial.store.revision);
    app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening');
    const base = `http://127.0.0.1:${app.server.address().port}`;
    call = (path, options) => fetch(base + path, options);
    t.after(() => new Promise(resolve => {app.server.closeAllConnections(); app.server.close(resolve);}));
  } else {
    sqlite = new DatabaseSync(':memory:'); t.after(() => sqlite.close());
    const migrations = new URL('../cloudflare/migrations/', import.meta.url);
    for (const name of readdirSync(migrations).filter(name => name.endsWith('.sql')).sort()) sqlite.exec(readFileSync(new URL(name, migrations), 'utf8'));
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
        const publication = statements.some(statement => /INSERT INTO workshop_chunks/.test(statement.sql));
        if (publication) {const hook = beforePublication; beforePublication = undefined; hook?.();}
        sqlite.exec('BEGIN IMMEDIATE');
        try {
          const result = statements.map((statement, index) => {
            if (publication && index === failAt) throw Error('Synthetic proposal transaction failure');
            return statement.execute();
          });
          sqlite.exec('COMMIT'); return result;
        } catch (error) {sqlite.exec('ROLLBACK'); throw error;}
      },
    };
    call = (path, options) => worker.fetch(new Request(origin + path, options), {DB: db});
  }
  sqlite.prepare("INSERT INTO admin(id,email,password_hash,role) VALUES(1,'admin@example.invalid','synthetic-no-login','admin')").run();
  const auth = (kind, clientId) => {
    const value = token(), csrf = token(), at = Date.now();
    if (kind === 'admin') sqlite.prepare('INSERT INTO sessions(token_hash,admin_id,csrf,expires_at,seen_at) VALUES(?,1,?,?,?)')
      .run(digest(value), csrf, at + 3600000, at);
    else {
      sqlite.prepare('INSERT INTO client_accounts(client_id,email,password_hash,enabled,created_at,updated_at) VALUES(?,?,?,1,?,?)')
        .run(clientId, initial.clients.find(client => client.id === clientId).email, 'synthetic-no-login', at, at);
      sqlite.prepare('INSERT INTO client_sessions(token_hash,client_id,csrf,expires_at,seen_at) VALUES(?,?,?,?,?)')
        .run(digest(value), clientId, csrf, at + 3600000, at);
    }
    const prefix = platform === 'worker' ? '__Host-' : '';
    return {cookie: `${prefix}clinique_${kind === 'admin' ? '' : 'client_'}session=${value}`, csrf, tokenHash: digest(value)};
  };
  const admin = auth('admin'), client = auth('client', initial.clients[0].id), other = auth('client', initial.clients[1].id);
  function read() {
    return platform === 'node' ? JSON.parse(sqlite.prepare('SELECT data FROM workshop WHERE id=1').get().data)
      : JSON.parse(sqlite.prepare('SELECT c.data FROM workshop w JOIN workshop_chunks c ON c.generation=w.generation ORDER BY c.position').all().map(row => row.data).join(''));
  }
  function replace(store) {
    if (platform === 'node') sqlite.prepare('UPDATE workshop SET data=?,revision=? WHERE id=1').run(JSON.stringify(store), store.revision);
    else {
      const generation = crypto.randomUUID();
      sqlite.prepare('INSERT INTO workshop_chunks(generation,position,data) VALUES(?,0,?)').run(generation, JSON.stringify(store));
      sqlite.prepare('UPDATE workshop SET generation=?,revision=? WHERE id=1').run(generation, store.revision);
    }
  }
  async function request(path, {method = 'GET', body, rawBody, cookie, csrf, headers = {}} = {}) {
    const response = await call(path, {method, headers: {Origin: origin,
      ...(body === undefined && rawBody === undefined ? {} : {'Content-Type': 'application/json'}),
      ...(cookie ? {Cookie: cookie} : {}), ...(csrf ? {'X-CSRF-Token': csrf} : {}), ...headers},
      ...(rawBody === undefined ? body === undefined ? {} : {body: JSON.stringify(body)} : {body: rawBody, ...(rawBody instanceof ReadableStream ? {duplex: 'half'} : {})})});
    return {status: response.status, data: await response.json(), headers: response.headers};
  }
  const repairId = initial.entries[0].repair.id;
  const adminPath = `/api/admin/repairs/${repairId}/proposal`, clientPath = `/api/client/repairs/${repairId}/proposal`;
  const publish = async (input = proposal()) => request(adminPath, {...admin, method: 'POST', body: {revision: read().revision, action: 'publish', ...input}});
  const choose = (action, proposalId = read().repairs[0].proposal?.id, credentials = client) => request(clientPath,
    {...credentials, method: 'POST', body: {proposalId, action}});
  const operate = (action, extra = {}) => request(adminPath, {...admin, method: 'POST', body: {revision: read().revision,
    proposalId: read().repairs[0].proposal?.id, action, ...extra}});
  async function duringBody(path, credentials, body, mutate) {
    let controller, finished = false;
    const json = JSON.stringify(body), encoder = new TextEncoder();
    const finish = () => {if (finished) return; finished = true; mutate(); controller.enqueue(encoder.encode(json.slice(-1))); controller.close();};
    const rawBody = new ReadableStream({start(value) {controller = value; value.enqueue(encoder.encode(json.slice(0, -1)));},
      ...(platform === 'worker' ? {pull() {finish();}} : {})});
    if (app) app.server.once('request', finish);
    return request(path, {...credentials, method: 'POST', rawBody});
  }
  return {sqlite, origin, request, read, replace, admin, client, other, adminPath, clientPath, repairId,
    publish, choose, operate, duringBody, ...initial, beforePublication(hook) {beforePublication = hook;}, failAt(index) {failAt = index;}};
}
const publicRepair = data => data.repairs.find(repair => repair.proposal);
function assertProjection(data, expectedTotal) {
  const repair = publicRepair(data); assert.ok(repair);
  assert.equal(repair.totalCost, expectedTotal);
  for (const key of unsafeKeys) assert.equal(Object.hasOwn(repair, key), false, key);
  assert.ok(!JSON.stringify(data).includes('PRIVATE_'));
  return repair;
}

for (const platform of ['node', 'worker']) {
  test(`${platform}: diagnostic publication and repair acceptance preserve billing and remain idempotent`, async t => {
    const f = await fixture(t, platform), before = f.read();
    const result = await f.publish(); assert.equal(result.status, 200, JSON.stringify(result.data));
    const saved = f.read(), offered = saved.repairs[0].proposal;
    assert.equal(saved.revision, before.revision + 1); assert.equal(offered.decision, 'pending');
    assert.equal(saved.repairs[0].interventionCost, before.repairs[0].interventionCost);
    assert.deepEqual(saved.parts, before.parts); assert.deepEqual(saved.clients, before.clients);
    const portal = await f.request('/api/client/portal', f.client); assert.equal(portal.status, 200);
    assert.equal(assertProjection(portal.data, 79.95).proposal.bankInstructions, '');
    assert.ok(!JSON.stringify(portal.data).includes('INSTRUCTIONS_BANCAIRES_FICTIVES'));
    const repeatedPublication = await f.publish(); assert.equal(repeatedPublication.status, 200); assert.deepEqual(f.read(), saved);
    const accepted = await f.choose('repair'); assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
    assert.equal(assertProjection(accepted.data, 79.95).proposal.decision, 'repair');
    assert.equal(publicRepair(accepted.data).stage, 'diagnostic');
    const decided = f.read(); assert.equal(decided.revision, saved.revision + 1);
    assert.deepEqual(decided.parts, saved.parts); assert.deepEqual(decided.repairs[1], saved.repairs[1]);
    assert.deepEqual(decided.repairs[0].payment, saved.repairs[0].payment);
    const repeated = await f.choose('repair'); assert.equal(repeated.status, 200); assert.deepEqual(f.read(), decided);
    assert.equal((await f.choose('return')).status, 409); assert.deepEqual(f.read(), decided);
    assert.equal((await f.publish(proposal({repairAmount: 89.95}))).status, 409); assert.deepEqual(f.read(), decided);
  });

  test(`${platform}: refused repair requires manual return-transfer confirmation before dispatch`, async t => {
    const f = await fixture(t, platform); assert.equal((await f.publish()).status, 200);
    const refused = await f.choose('return'); assert.equal(refused.status, 200);
    const view = assertProjection(refused.data, null); assert.equal(view.stage, 'abandonnee');
    assert.match(view.proposal.bankInstructions, /INSTRUCTIONS_BANCAIRES_FICTIVES/);
    assert.equal((await f.operate('dispatch-return', {tracking: 'SYNTHETIC-PARCEL-123'})).status, 409);
    assert.equal((await f.choose('declare-transfer')).status, 200);
    const declared = f.read(); assert.ok(declared.repairs[0].proposal.transferDeclaredAt); assert.equal(declared.repairs[0].proposal.returnPaidAt, '');
    assert.equal((await f.choose('declare-transfer')).status, 200); assert.deepEqual(f.read(), declared);
    assert.equal((await f.operate('dispatch-return', {tracking: 'SYNTHETIC-PARCEL-123'})).status, 409);
    assert.equal((await f.operate('confirm-return-payment')).status, 200);
    const paid = f.read(); assert.ok(paid.repairs[0].proposal.returnPaidAt); assert.deepEqual(paid.repairs[0].payment, declared.repairs[0].payment);
    assert.equal((await f.operate('confirm-return-payment')).status, 200); assert.deepEqual(f.read(), paid);
    assert.equal((await f.operate('dispatch-return', {tracking: 'SYNTHETIC-PARCEL-123'})).status, 200);
    const sent = f.read(); assert.ok(sent.repairs[0].proposal.returnedAt); assert.equal(sent.repairs[0].proposal.tracking, 'SYNTHETIC-PARCEL-123');
    assert.equal((await f.operate('dispatch-return', {tracking: 'SYNTHETIC-PARCEL-123'})).status, 200); assert.deepEqual(f.read(), sent);
    assert.equal((await f.operate('complete-buyback')).status, 409); assert.deepEqual(f.read(), sent);
  });

  test(`${platform}: irreparable devices support explicit buyback or free return without a repair receipt`, async t => {
    const f = await fixture(t, platform);
    assert.equal((await f.publish(proposal({kind: 'unrepairable', repairAmount: null, buybackAmount: 18.5}))).status, 200);
    assert.equal((await f.choose('repair')).status, 409);
    const accepted = await f.choose('buyback'); assert.equal(accepted.status, 200);
    const repair = assertProjection(accepted.data, null); assert.equal(repair.stage, 'irreparable'); assert.equal(repair.proposal.bankInstructions, '');
    assert.equal((await f.choose('return')).status, 409);
    assert.equal((await f.operate('complete-buyback')).status, 200); const bought = f.read();
    assert.ok(bought.repairs[0].proposal.buybackCompletedAt); assert.equal(bought.repairs[0].payment, null);
    assert.equal((await f.operate('complete-buyback')).status, 200); assert.deepEqual(f.read(), bought);
    const g = await fixture(t, platform);
    assert.equal((await g.publish(proposal({kind: 'unrepairable', repairAmount: null, buybackAmount: null, returnFee: 0, bankInstructions: ''}))).status, 200);
    assert.equal((await g.choose('buyback')).status, 409);
    const returned = await g.choose('return'); assert.equal(returned.status, 200);
    assert.equal(publicRepair(returned.data).proposal.returnFee, 0); assert.equal(publicRepair(returned.data).proposal.bankInstructions, '');
    assert.equal((await g.operate('dispatch-return', {tracking: 'SYNTHETIC-FREE-RETURN'})).status, 200);
    assert.ok(g.read().repairs[0].proposal.returnedAt);
  });

  test(`${platform}: stale offers and admin revisions never overwrite the latest diagnostic`, async t => {
    const f = await fixture(t, platform); const first = await f.publish(); assert.equal(first.status, 200);
    const oldId = f.read().repairs[0].proposal.id, oldRevision = f.read().revision;
    assert.equal((await f.publish(proposal({repairAmount: 99.5}))).status, 200);
    const current = f.read(); assert.notEqual(current.repairs[0].proposal.id, oldId);
    assert.equal((await f.choose('repair', oldId)).status, 409); assert.deepEqual(f.read(), current);
    assert.equal((await f.request(f.adminPath, {...f.admin, method: 'POST', body: {revision: oldRevision, action: 'publish', ...proposal()}})).status, 409);
    assert.deepEqual(f.read(), current);
    assert.equal((await f.choose('repair')).status, 200);
    assert.equal(publicRepair((await f.request('/api/client/portal', f.client)).data).totalCost, 99.5);
  });

  test(`${platform}: ownership and workshop context protect diagnostic choices and projections`, async t => {
    const f = await fixture(t, platform); assert.equal((await f.publish()).status, 200);
    const before = f.read(), id = before.repairs[0].proposal.id;
    const foreign = await f.choose('repair', id, f.other); assert.equal(foreign.status, 404);
    const missing = await f.request('/api/client/repairs/missing/proposal', {...f.client, method: 'POST', body: {proposalId: id, action: 'repair'}});
    assert.equal(missing.status, 404); assert.deepEqual(missing.data, foreign.data);
    assert.equal((await f.request('/api/client/repairs/%2F/proposal', {...f.client, method: 'POST', body: {proposalId: id, action: 'repair'}})).status, 404);
    const otherPortal = await f.request('/api/client/portal', f.other); assert.equal(otherPortal.data.repairs.length, 1);
    assert.equal(Object.hasOwn(otherPortal.data.repairs[0], 'proposal'), false);
    const fakeWorkshop = crypto.randomUUID();
    assert.equal((await f.request(f.clientPath, {...f.client, method: 'POST', body: {proposalId: id, action: 'repair'}, headers: {'X-Workshop-ID': fakeWorkshop}})).status, 401);
    assert.deepEqual(f.read(), before);
  });

  test(`${platform}: diagnostic actions require bounded strict JSON, role, origin and CSRF`, async t => {
    const f = await fixture(t, platform); assert.equal((await f.publish()).status, 200);
    const before = f.read(), body = {proposalId: before.repairs[0].proposal.id, action: 'repair'};
    for (const [credentials, status] of [[{}, 401], [f.admin, 401], [{cookie: f.client.cookie}, 403]]) {
      assert.equal((await f.request(f.clientPath, {...credentials, method: 'POST', body})).status, status);
    }
    assert.equal((await f.request(f.adminPath, {...f.client, method: 'POST', body: {revision: before.revision, action: 'publish', ...proposal()}})).status, 401);
    assert.equal((await f.request(f.clientPath, {...f.client, method: 'POST', body, headers: {Origin: 'https://evil.example'}})).status, 403);
    assert.equal((await f.request(f.clientPath, {...f.client, method: 'POST', body, headers: {'Sec-Fetch-Site': 'cross-site'}})).status, 403);
    assert.equal((await f.request(f.clientPath, f.client)).status, 405);
    assert.equal((await f.request(f.adminPath, f.admin)).status, 405);
    for (const bad of [null, [], {...body, returnPaidAt: new Date().toISOString()}, {...body, repairAmount: 0}, {...body, clientId: f.clients[1].id}, {...body, action: 'confirm-return-payment'}, {action: 'repair'}]) {
      assert.equal((await f.request(f.clientPath, {...f.client, method: 'POST', body: bad})).status, 400);
    }
    assert.equal((await f.request(f.clientPath, {...f.client, method: 'POST', body: {...body, extra: 'x'.repeat(2000)}})).status, 413);
    assert.equal((await f.request(f.adminPath, {...f.admin, method: 'POST', body: {revision: before.revision, action: 'publish', ...proposal(), decision: 'repair'}})).status, 400);
    assert.equal((await f.request(f.adminPath, {...f.admin, method: 'POST', body: {revision: before.revision, action: 'publish', ...proposal(), description: 'x'.repeat(50000)}})).status, 413);
    assert.equal((await f.operate('dispatch-return', {tracking: 'x'.repeat(301)})).status, 400);
    assert.deepEqual(f.read(), before);
  });

  test(`${platform}: maximum Unicode proposal text fits the bounded UTF-8 request and survives its public projection`, async t => {
    const f = await fixture(t, platform);
    const description = '🔧'.repeat(2500), bankInstructions = 'é'.repeat(1500) + '界'.repeat(1500);
    assert.equal(description.length, 5000); assert.equal(bankInstructions.length, 3000);
    assert.ok(Buffer.byteLength(JSON.stringify(proposal({description, bankInstructions}))) > 16 * 1024);
    const published = await f.publish(proposal({description, bankInstructions}));
    assert.equal(published.status, 200, JSON.stringify(published.data));
    assert.equal(f.read().repairs[0].proposal.description, description);
    assert.equal(f.read().repairs[0].proposal.bankInstructions, bankInstructions);
    const portal = await f.request('/api/client/portal', f.client);
    assert.equal(publicRepair(portal.data).proposal.description, description);
    assert.equal(publicRepair(portal.data).proposal.bankInstructions, '');
    const returned = await f.choose('return'); assert.equal(returned.status, 200);
    assert.equal(publicRepair(returned.data).proposal.bankInstructions, bankInstructions);
  });

  test(`${platform}: diagnostic proposals stay isolated between workshops even when dossier and client IDs collide`, async t => {
    const f = await fixture(t, platform); assert.equal((await f.publish()).status, 200);
    const rootBefore = f.read(), tenantId = crypto.randomUUID(), tenantStore = structuredClone(f.store);
    tenantStore.settings.workshop = 'Atelier distinct fictif';
    for (const statement of provisioningStatements({id: tenantId, email: 'tenant-admin@example.invalid',
      password_hash: 'synthetic-no-login', workshop_name: tenantStore.settings.workshop, name: 'Tenant fictif'},
    {at: Date.now(), guard: {sql: '1=1', values: []}, store: emptyStore()}, platform === 'node' ? 'node' : 'd1')) {
      f.sqlite.prepare(statement.sql).run(...statement.values);
    }
    const prefix = workshopPrefix(tenantId), at = Date.now();
    if (platform === 'node') f.sqlite.prepare(`UPDATE ${prefix}workshop SET data=? WHERE id=1`).run(JSON.stringify(tenantStore));
    else f.sqlite.prepare(`UPDATE ${prefix}workshop_chunks SET data=?`).run(JSON.stringify(tenantStore));
    const tenantAuth = kind => {
      const value = token(), key = digest(value), csrf = token();
      if (kind === 'admin') f.sqlite.prepare(`INSERT INTO ${prefix}sessions(token_hash,admin_id,csrf,expires_at,seen_at) VALUES(?,1,?,?,?)`)
        .run(key, csrf, at + 3600000, at);
      else {
        f.sqlite.prepare(`INSERT INTO ${prefix}client_accounts(client_id,email,password_hash,enabled,created_at,updated_at) VALUES(?,?,?,1,?,?)`)
          .run(f.clients[0].id, 'tenant-client@example.invalid', 'synthetic-no-login', at, at);
        f.sqlite.prepare(`INSERT INTO ${prefix}client_sessions(token_hash,client_id,csrf,expires_at,seen_at) VALUES(?,?,?,?,?)`)
          .run(key, f.clients[0].id, csrf, at + 3600000, at);
      }
      f.sqlite.prepare('INSERT INTO saas_session_index(token_hash,workshop_id,kind,expires_at) VALUES(?,?,?,?)').run(key, tenantId, kind, at + 3600000);
      return {cookie: `${platform === 'worker' ? '__Host-' : ''}clinique_${kind === 'admin' ? '' : 'client_'}session=${value}`, csrf};
    };
    const tenantAdmin = tenantAuth('admin'), tenantClient = tenantAuth('client');
    const offered = await f.request(f.adminPath, {...tenantAdmin, method: 'POST', body: {revision: 0, action: 'publish', ...proposal({repairAmount: 23.5})}});
    assert.equal(offered.status, 200, JSON.stringify(offered.data)); assert.equal(offered.data.settings.workshop, tenantStore.settings.workshop);
    const tenantProposalId = offered.data.repairs[0].proposal.id, rootProposalId = rootBefore.repairs[0].proposal.id;
    assert.notEqual(tenantProposalId, rootProposalId); assert.deepEqual(f.read(), rootBefore);
    assert.equal((await f.choose('repair', tenantProposalId)).status, 409);
    assert.equal((await f.request(f.clientPath, {...tenantClient, method: 'POST', body: {proposalId: rootProposalId, action: 'repair'}})).status, 409);
    const accepted = await f.request(f.clientPath, {...tenantClient, method: 'POST', body: {proposalId: tenantProposalId, action: 'repair'}});
    assert.equal(accepted.status, 200, JSON.stringify(accepted.data)); assert.equal(accepted.data.workshop.name, tenantStore.settings.workshop);
    assert.equal(publicRepair(accepted.data).proposal.decision, 'repair'); assert.equal(publicRepair(accepted.data).totalCost, 23.5);
    assert.deepEqual(f.read(), rootBefore);
    const declaredWrongWorkshop = await f.request(f.clientPath, {...f.client, method: 'POST',
      body: {proposalId: rootProposalId, action: 'repair'}, headers: {'X-Workshop-ID': tenantId}});
    assert.equal(declaredWrongWorkshop.status, 401); assert.deepEqual(f.read(), rootBefore);
  });

  test(`${platform}: normal Store saves cannot forge, change, or erase diagnostic decisions`, async t => {
    const f = await fixture(t, platform); assert.equal((await f.publish()).status, 200);
    const before = f.read();
    const save = (data, mode = 'edit') => f.request('/api/store', {...f.admin, method: 'PUT', body: {revision: f.read().revision, data, mode}});
    const old = structuredClone(before); delete old.repairs[0].proposal;
    assert.equal((await save(old)).status, 409); assert.deepEqual(f.read(), before);
    const replaced = structuredClone(before); replaced.repairs[0].proposal.repairAmount = 45;
    assert.equal((await save(replaced)).status, 409); assert.deepEqual(f.read(), before);
    const forged = structuredClone(before); forged.repairs[1].proposal = structuredClone(before.repairs[0].proposal); forged.repairs[1].proposal.id = crypto.randomUUID();
    assert.equal((await save(forged)).status, 409); assert.deepEqual(f.read(), before);
    const ordinary = structuredClone(before); ordinary.repairs[0].diagnosis = 'Autre note privée';
    const edited = await save(ordinary); assert.equal(edited.status, 200, JSON.stringify(edited.data));
    assert.deepEqual(f.read().repairs[0].proposal, before.repairs[0].proposal);
    assert.equal((await f.choose('return')).status, 200);
    const decided = f.read(), erased = structuredClone(decided); delete erased.repairs[0].proposal;
    assert.equal((await save(erased)).status, 409); assert.deepEqual(f.read(), decided);
    const restored = await save(old, 'restore'); assert.equal(restored.status, 200, JSON.stringify(restored.data));
    assert.equal(Object.hasOwn(f.read().repairs[0], 'proposal'), false);
  });

  test(`${platform}: an existing proposal cannot be transferred to another customer or console`, async t => {
    const f = await fixture(t, platform); assert.equal((await f.publish()).status, 200);
    assert.equal((await f.choose('repair')).status, 200);
    const before = f.read();
    const save = data => f.request('/api/store', {...f.admin, method: 'PUT', body: {revision: before.revision, data, mode: 'edit'}});
    const reassigned = structuredClone(before);
    reassigned.consoles.find(console => console.id === before.repairs[0].consoleId).clientId = f.clients[1].id;
    reassigned.events = [];
    const reassignedResponse = await save(reassigned);
    assert.equal(reassignedResponse.status, 409, JSON.stringify(reassignedResponse.data)); assert.deepEqual(f.read(), before);
    const moved = structuredClone(before);
    moved.repairs[0].consoleId = before.repairs[1].consoleId;
    moved.repairs[1].stage = 'abandonnee'; moved.repairs[1].completedAt = new Date().toISOString();
    moved.events = [];
    const movedResponse = await save(moved);
    assert.equal(movedResponse.status, 409, JSON.stringify(movedResponse.data)); assert.deepEqual(f.read(), before);
  });

  test(`${platform}: normal Store saves cannot bypass approval from the website diagnostic`, async t => {
    const f = await fixture(t, platform), before = f.read();
    for (const stage of ['attente-pieces', 'reparation', 'tests', 'terminee', 'irreparable', 'abandonnee']) {
      const invalid = structuredClone(before), repair = invalid.repairs[0], console = invalid.consoles.find(item => item.id === repair.consoleId);
      repair.stage = stage;
      if (['terminee', 'irreparable', 'abandonnee'].includes(stage)) {repair.completedAt = new Date().toISOString(); console.state = stage === 'terminee' ? 'fonctionnelle' : stage === 'irreparable' ? 'pour-pieces' : 'en-panne';}
      if (stage === 'terminee') repair.tests.forEach(item => item.result = 'pass');
      const response = await f.request('/api/store', {...f.admin, method: 'PUT', body: {revision: before.revision, data: invalid, mode: 'edit'}});
      assert.equal(response.status, 409, JSON.stringify(response.data)); assert.deepEqual(f.read(), before);
    }
  });

  test(`${platform}: historical pre-diagnostic receipts survive ordinary edits while new receipts require client approval`, async t => {
    const f = await fixture(t, platform), initial = f.read();
    const save = data => f.request('/api/store', {...f.admin, method: 'PUT', body: {revision: f.read().revision, data, mode: 'edit'}});
    const receipt = {amount: 26.5, paidAt: '2026-10-01T12:00:00.000Z'};
    const forged = structuredClone(initial); forged.repairs[0].payment = receipt;
    const rejected = await save(forged); assert.equal(rejected.status, 409, JSON.stringify(rejected.data));
    assert.deepEqual(f.read(), initial);
    const historical = structuredClone(initial); historical.repairs[0].payment = receipt; f.replace(historical);
    const loaded = await f.request('/api/store', f.admin);
    assert.equal(loaded.status, 200); assert.deepEqual(loaded.data.repairs[0].payment, receipt);
    const ordinary = structuredClone(loaded.data); ordinary.repairs[0].diagnosis = 'PRIVATE_HISTORICAL_RECEIPT_NOTE';
    const edited = await save(ordinary); assert.equal(edited.status, 200, JSON.stringify(edited.data));
    assert.deepEqual(f.read().repairs[0].payment, receipt);
    const repriced = f.read(); repriced.repairs[0].payment.amount = 99.5;
    assert.equal((await save(repriced)).status, 409); assert.deepEqual(f.read(), edited.data);
    assert.equal((await f.publish()).status, 409);
    const cancelled = f.read(); cancelled.repairs[0].payment = null;
    const cleared = await save(cancelled); assert.equal(cleared.status, 200, JSON.stringify(cleared.data));
    assert.equal(f.read().repairs[0].payment, null);
    const published = await f.publish(); assert.equal(published.status, 200, JSON.stringify(published.data));
    assert.equal(f.read().repairs[0].proposal.decision, 'pending');
  });

  test(`${platform}: client and admin access are rechecked after receiving request bodies`, async t => {
    const f = await fixture(t, platform); assert.equal((await f.publish()).status, 200);
    const before = f.read();
    const rejected = await f.duringBody(f.clientPath, f.client, {proposalId: before.repairs[0].proposal.id, action: 'repair'},
      () => f.sqlite.prepare('UPDATE client_accounts SET enabled=0 WHERE client_id=?').run(f.clients[0].id));
    assert.equal(rejected.status, 401); assert.deepEqual(f.read(), before);
    const adminRejected = await f.duringBody(f.adminPath, f.admin, {revision: before.revision, action: 'publish', ...proposal({repairAmount: 100})},
      () => f.sqlite.prepare('DELETE FROM sessions WHERE token_hash=?').run(f.admin.tokenHash));
    assert.equal(adminRejected.status, 401); assert.deepEqual(f.read(), before);
  });

  if (platform === 'worker') {
    for (const role of ['client', 'admin']) for (const revoke of ['session', 'csrf', 'expiry', 'idle', ...(role === 'client' ? ['account'] : [])]) {
      test(`worker: ${role} ${revoke} is rechecked atomically at proposal publication`, async t => {
        const f = await fixture(t, platform); assert.equal((await f.publish()).status, 200);
        const before = f.read(), credentials = role === 'client' ? f.client : f.admin, table = role === 'client' ? 'client_sessions' : 'sessions';
        f.beforePublication(() => {
          if (revoke === 'session') f.sqlite.prepare(`DELETE FROM ${table} WHERE token_hash=?`).run(credentials.tokenHash);
          if (revoke === 'csrf') f.sqlite.prepare(`UPDATE ${table} SET csrf='synthetic-rotated-csrf' WHERE token_hash=?`).run(credentials.tokenHash);
          if (revoke === 'expiry') f.sqlite.prepare(`UPDATE ${table} SET expires_at=? WHERE token_hash=?`).run(Date.now() - 1, credentials.tokenHash);
          if (revoke === 'idle') f.sqlite.prepare(`UPDATE ${table} SET seen_at=? WHERE token_hash=?`).run(Date.now() - 3600000, credentials.tokenHash);
          if (revoke === 'account') f.sqlite.prepare('UPDATE client_accounts SET enabled=0 WHERE client_id=?').run(f.clients[0].id);
        });
        const response = role === 'client' ? await f.choose('repair') : await f.publish(proposal({repairAmount: 100}));
        assert.equal(response.status, revoke === 'csrf' ? 403 : 401, JSON.stringify(response.data)); assert.deepEqual(f.read(), before);
        assert.equal(f.sqlite.prepare('SELECT count(DISTINCT generation) AS n FROM workshop_chunks').get().n, 1);
      });
    }
    test('worker: concurrent admin changes and failed D1 batches preserve decisions and fragments', async t => {
      const f = await fixture(t, platform); assert.equal((await f.publish()).status, 200);
      const concurrent = f.read(); concurrent.revision++; concurrent.repairs[1].diagnosis = 'PRIVATE_CONCURRENT_NOTE';
      f.beforePublication(() => f.replace(concurrent));
      assert.equal((await f.choose('repair')).status, 409); assert.deepEqual(f.read(), concurrent);
      const second = await fixture(t, platform); assert.equal((await second.publish()).status, 200);
      const before = second.read(); second.failAt(1);
      assert.equal((await second.choose('repair')).status, 500); assert.deepEqual(second.read(), before);
      assert.equal(second.sqlite.prepare('SELECT count(DISTINCT generation) AS n FROM workshop_chunks').get().n, 1);
    });
  }
}
