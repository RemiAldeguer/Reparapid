import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {openDatabase} from '../server/database.mjs';
import {nodeNotificationRepository} from '../server/notification-storage.mjs';
import {REGISTRATION_SCHEMA, submitRegistrationRequest, reviewRegistrationRequest} from '../server/registration-requests.mjs';
import {SAAS_SCHEMA, workshopId, workshopPrefix, scopedSQL, scopedDatabase,
  provisioningStatements} from '../server/workshop-scope.mjs';
import {emptyStore} from './.compiled/domain.cjs';

const firstId = '00000000-0000-4000-8000-111111111111';
const secondId = '00000000-0000-4000-8000-222222222222';
const input = {name: 'Owner synthetic', email: 'first@example.invalid', workshopName: 'First synthetic workshop',
  message: '', password: 'Synthetic registration phrase 2026!'};

function storeFor(row) {
  const store = emptyStore(); store.settings.workshop = row.workshop_name;
  store.settings.owner = row.name.slice(0, 80); return store;
}

function fixture(t, kind) {
  const db = kind === 'node' ? openDatabase(':memory:') : new DatabaseSync(':memory:');
  if (kind === 'd1') {
    const folder = new URL('../cloudflare/migrations/', import.meta.url);
    for (const file of readdirSync(folder).filter(name => name.endsWith('.sql')).sort()) {
      db.exec(readFileSync(new URL(file, folder), 'utf8'));
    }
    db.exec('PRAGMA foreign_keys=ON');
  } else db.exec(REGISTRATION_SCHEMA + SAAS_SCHEMA);
  t.after(() => db.close());
  db.prepare("INSERT INTO admin(id,email,password_hash,role) VALUES(1,'original@example.invalid','ORIGINAL_HASH','admin')").run();
  const original = emptyStore(); original.settings.workshop = 'Original workshop';
  if (kind === 'node') db.prepare('UPDATE workshop SET data=? WHERE id=1').run(JSON.stringify(original));
  else {
    db.prepare("UPDATE workshop SET generation='original' WHERE id=1").run();
    db.prepare("INSERT INTO workshop_chunks(generation,position,data) VALUES('original',0,?)").run(JSON.stringify(original));
  }
  const repo = nodeNotificationRepository(db);
  let token = 0, at = 1800000000000;
  const hashPassword = async password => `synthetic-hash:${password}`;
  const now = () => ++at;
  async function register(id = firstId, fields = input) {
    await submitRegistrationRequest(repo, fields, {hashPassword, now, uuid: () => id});
    return db.prepare('SELECT * FROM registration_requests WHERE id=?').get(id);
  }
  const approvalStatements = (row, context) => provisioningStatements(row, {...context, store: storeFor(row)}, kind);
  const approve = (id, options = {}) => reviewRegistrationRequest(repo, id, {decision: 'approve'}, {
    now, uuid: () => `00000000-0000-4000-8000-${(++token).toString(16).padStart(12, '0')}`,
    reviewer: 'original@example.invalid', approvalStatements, ...options,
  });
  const rootData = () => kind === 'node' ? db.prepare('SELECT data FROM workshop WHERE id=1').get().data
    : db.prepare('SELECT data FROM workshop_chunks WHERE generation=\'original\' ORDER BY position').all().map(row => row.data).join('');
  return {db, repo, register, approve, approvalStatements, rootData};
}

function d1Adapter(sqlite) {
  return {
    prepare(sql) {
      const build = (values = []) => ({
        bind(...bound) {return build(bound);},
        execute() {const results = sqlite.prepare(sql).all(...values);
          return {results, success: true, meta: sqlite.prepare('SELECT changes() AS changes').get()};},
        async run() {return this.execute();}, async all() {return this.execute();},
        async first() {return this.execute().results[0] ?? null;},
      }); return build();
    },
    async exec(sql) {sqlite.exec(sql);},
    async batch(statements) {
      sqlite.exec('BEGIN IMMEDIATE');
      try {const result = statements.map(statement => statement.execute()); sqlite.exec('COMMIT'); return result;}
      catch (error) {sqlite.exec('ROLLBACK'); throw error;}
    },
  };
}

test('workshop IDs are strictly bounded UUIDs, normalized before namespace creation', () => {
  assert.equal(workshopId('ABCDEF12-3456-4000-8000-111111111111'), 'abcdef12-3456-4000-8000-111111111111');
  assert.equal(workshopPrefix(firstId), 'tenant_00000000000040008000111111111111_');
  for (const id of ['workshop', '', null, '../admin', `${firstId};DROP TABLE admin`, `${firstId} `]) {
    assert.throws(() => workshopId(id), /Identifiant/);
    assert.throws(() => scopedSQL('SELECT * FROM admin', id), /Identifiant/);
  }
});

test('SQL lexer rewrites whole identifiers while preserving strings, comments and bind names', () => {
  const p = workshopPrefix(firstId);
  const source = `SELECT admin.email, 'admin ''workshop'' sessions', :workshop, @sessions, $admin,
    'tenant_other_admin', json_extract(payload,'$.client_accounts')
    FROM ADMIN JOIN sessions ON sessions.admin_id=admin.id
    -- admin workshop sessions
    /* FROM repair_notifications */
    WHERE admin.email=? AND limits.hits>0 AND admin_email='admin'`;
  assert.equal(scopedSQL(source, firstId), `SELECT ${p}admin.email, 'admin ''workshop'' sessions', :workshop, @sessions, $admin,
    'tenant_other_admin', json_extract(payload,'$.client_accounts')
    FROM ${p}admin JOIN ${p}sessions ON ${p}sessions.admin_id=${p}admin.id
    -- admin workshop sessions
    /* FROM repair_notifications */
    WHERE ${p}admin.email=? AND ${p}limits.hits>0 AND admin_email='admin'`);
  assert.equal(scopedSQL('SELECT * FROM registration_requests JOIN saas_workshops JOIN saas_session_index', firstId),
    'SELECT * FROM registration_requests JOIN saas_workshops JOIN saas_session_index');
});

test('quoted identifiers and all explicit indexes use the workshop namespace', () => {
  const p = workshopPrefix(firstId);
  assert.equal(scopedSQL('SELECT * FROM "ADMIN" JOIN `sessions` JOIN [workshop] AS unchanged', firstId),
    `SELECT * FROM "${p}admin" JOIN \`${p}sessions\` JOIN [${p}workshop] AS unchanged`);
  assert.equal(scopedSQL('SELECT "quoted""name", `tick``name` FROM client_accounts', firstId),
    `SELECT "quoted""name", \`tick\`\`name\` FROM ${p}client_accounts`);
  for (const name of ['sessions_expires_at', 'sessions_seen_at', 'limits_expires_at',
    'client_sessions_client_id', 'client_sessions_expires_at', 'client_sessions_seen_at',
    'repair_notifications_delivery', 'repair_notifications_client_created']) {
    assert.equal(scopedSQL(`DROP INDEX IF EXISTS ${name}`, firstId), `DROP INDEX IF EXISTS ${p}${name}`);
  }
});

test('SQL lexer fails closed on malformed quotes, comments, NUL and another namespace', () => {
  for (const sql of ["SELECT 'unfinished", 'SELECT "unfinished', 'SELECT [unfinished', 'SELECT `unfinished',
    'SELECT /* unfinished', 'SELECT\0admin', `SELECT * FROM ${workshopPrefix(secondId)}admin`]) {
    assert.throws(() => scopedSQL(sql, firstId));
  }
  const alreadyScoped = `SELECT * FROM ${workshopPrefix(firstId)}admin`;
  assert.equal(scopedSQL(alreadyScoped, firstId), alreadyScoped);
  assert.equal(scopedSQL('-- final comment admin', firstId), '-- final comment admin');
});

for (const kind of ['node', 'd1']) {
  test(`${kind}: provisioning creates two independent workshops while preserving the original`, async t => {
    const f = fixture(t, kind), original = f.rootData();
    await f.register(); await f.approve(firstId);
    await f.register(secondId, {...input, name: 'Other owner', email: 'second@example.invalid', workshopName: 'Second workshop'});
    await f.approve(secondId);
    assert.equal(f.rootData(), original);
    assert.equal(f.db.prepare('SELECT password_hash FROM admin WHERE id=1').get().password_hash, 'ORIGINAL_HASH');
    assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM saas_workshops').get().n, 2);
    const raw = kind === 'node' ? f.db : d1Adapter(f.db);
    const a = scopedDatabase(raw, firstId, {kind}), b = scopedDatabase(raw, secondId, {kind});
    const first = kind === 'node' ? sql => a.prepare(sql).get() : sql => a.prepare(sql).first();
    const second = kind === 'node' ? sql => b.prepare(sql).get() : sql => b.prepare(sql).first();
    assert.equal((await first('SELECT * FROM admin')).email, input.email);
    assert.equal((await second('SELECT * FROM admin')).email, 'second@example.invalid');
    assert.equal((await first('SELECT * FROM admin')).role, 'admin');
    const table = kind === 'node' ? 'workshop' : 'workshop_chunks';
    const firstStore = JSON.parse((await first(`SELECT data FROM ${table}`)).data);
    const secondStore = JSON.parse((await second(`SELECT data FROM ${table}`)).data);
    assert.equal(firstStore.settings.workshop, input.workshopName);
    assert.equal(secondStore.settings.workshop, 'Second workshop');
    for (const store of [firstStore, secondStore]) {
      for (const field of ['clients', 'consoles', 'repairs', 'parts', 'events']) assert.deepEqual(store[field], []);
      assert.equal(store.revision, 0);
    }
    const encodedLiteral = 'sessions admin workshop tenant_other_admin';
    if (kind === 'node') a.prepare('INSERT INTO limits(key,hits,expires_at) VALUES(?,1,1)').run(encodedLiteral);
    else await a.prepare('INSERT INTO limits(key,hits,expires_at) VALUES(?,1,1)').bind(encodedLiteral).run();
    assert.equal((await first('SELECT * FROM limits')).key, encodedLiteral);
    assert.equal((await second('SELECT COUNT(*) AS n FROM limits')).n, 0);
    const indexes = f.db.prepare('SELECT name FROM sqlite_master WHERE type=\'index\' AND name LIKE ?').all(workshopPrefix(firstId) + '%').map(row => row.name);
    assert.ok(indexes.includes(workshopPrefix(firstId) + 'client_sessions_client_id'));
    assert.ok(indexes.includes(workshopPrefix(firstId) + 'repair_notifications_delivery'));
    a.close(); assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM admin').get().n, 1);
  });

  test(`${kind}: session guard rejected at commit creates neither workshop account nor tenant data`, async t => {
    const f = fixture(t, kind); const row = await f.register();
    await assert.rejects(f.approve(firstId, {guard: {sql: '0', values: []}}), error => error.status === 401);
    assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM saas_workshops').get().n, 0);
    assert.equal(f.db.prepare(`SELECT COUNT(*) AS n FROM ${workshopPrefix(firstId)}admin`).get().n, 0);
    assert.equal(f.db.prepare(`SELECT COUNT(*) AS n FROM ${workshopPrefix(firstId)}workshop`).get().n, 0);
    assert.equal(f.db.prepare(`SELECT COUNT(*) AS n FROM ${workshopPrefix(firstId)}notification_settings`).get().n, 0);
    assert.equal(f.db.prepare('SELECT * FROM registration_requests WHERE id=?').get(firstId).password_hash, row.password_hash);
    assert.equal(f.db.prepare('SELECT * FROM registration_requests WHERE id=?').get(firstId).status, 'pending');
  });

  test(`${kind}: failed tenant provisioning rolls back DDL, registration decision and global metadata`, async t => {
    const f = fixture(t, kind), original = f.rootData(); await f.register();
    await assert.rejects(f.approve(firstId, {approvalStatements(row, context) {
      return [...f.approvalStatements(row, context), {sql: 'INSERT INTO nonexistent_table VALUES(?)', values: ['FAIL']}];
    }}), /nonexistent_table/);
    assert.equal(f.db.prepare('SELECT status FROM registration_requests WHERE id=?').get(firstId).status, 'pending');
    assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM saas_workshops').get().n, 0);
    assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM sqlite_master WHERE name LIKE ?').get(workshopPrefix(firstId) + '%').n, 0);
    assert.equal(f.rootData(), original);
  });
}

test('node scoped batches remain atomic inside and outside an existing transaction', async t => {
  const f = fixture(t, 'node'); await f.register(); await f.approve(firstId);
  const scoped = scopedDatabase(f.db, firstId, {kind: 'node'});
  const insert = key => ({sql: 'INSERT INTO limits(key,hits,expires_at) VALUES(?,1,1)', values: [key]});
  scoped.batch([insert('first'), insert('second')]);
  assert.equal(scoped.prepare('SELECT COUNT(*) AS n FROM limits').get().n, 2);
  assert.throws(() => scoped.batch([insert('rolled-back'), insert('first')]), /UNIQUE/);
  assert.equal(scoped.prepare('SELECT COUNT(*) AS n FROM limits').get().n, 2);
  f.db.exec('BEGIN IMMEDIATE');
  scoped.batch([insert('inside-transaction')]);
  assert.equal(f.db.isTransaction, true);
  assert.throws(() => scoped.batch([insert('nested-rolled-back'), insert('first')]), /UNIQUE/);
  assert.equal(f.db.isTransaction, true);
  assert.equal(scoped.prepare('SELECT COUNT(*) AS n FROM limits').get().n, 3);
  f.db.exec('ROLLBACK');
  assert.equal(scoped.prepare('SELECT COUNT(*) AS n FROM limits').get().n, 2);
});

test('D1 scoped prepare/bind/batch delegates correctly and never affects another workshop', async t => {
  const f = fixture(t, 'd1'); await f.register(); await f.approve(firstId);
  const d1 = scopedDatabase(d1Adapter(f.db), firstId, {kind: 'd1'});
  const result = await d1.batch([
    d1.prepare('INSERT INTO limits(key,hits,expires_at) VALUES(?,1,1)').bind('first'),
    d1.prepare('UPDATE limits SET hits=hits+1 WHERE key=? RETURNING hits').bind('first'),
  ]);
  assert.equal(result[1].results[0].hits, 2);
  assert.equal((await d1.prepare('SELECT hits FROM limits WHERE key=?').bind('first').first()).hits, 2);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM limits').get().n, 0);
  await assert.rejects(d1.batch([
    d1.prepare('INSERT INTO limits(key,hits,expires_at) VALUES(?,1,1)').bind('rollback'),
    d1.prepare('INSERT INTO limits(key,hits,expires_at) VALUES(?,1,1)').bind('first'),
  ]), /UNIQUE/);
  assert.equal((await d1.prepare('SELECT COUNT(*) AS n FROM limits').first()).n, 1);
});

test('provisioning rejects a nonempty or untrusted initial store instead of copying the original', () => {
  const row = {...input, id: firstId, workshop_name: input.workshopName, password_hash: 'synthetic-hash'};
  const options = {at: 1800000000000, guard: {sql: '1', values: []}, store: storeFor(row)};
  for (const store of [undefined, {...options.store, clients: [{id: 'original-private-client'}]},
    {...options.store, revision: 7}, {...options.store, extraSecret: 'PRIVATE_ORIGINAL'},
    {...options.store, settings: {...options.store.settings, extraSecret: 'PRIVATE_ORIGINAL'}}]) {
    assert.throws(() => provisioningStatements(row, {...options, store}, 'node'), /stockage vide/);
  }
  assert.throws(() => provisioningStatements(row, {...options, guard: undefined}, 'd1'), /Création/);
});

test('global migration matches the local SaaS schema and session index cannot point to a nonexistent tenant', t => {
  const db = new DatabaseSync(':memory:'), local = new DatabaseSync(':memory:');
  t.after(() => {db.close(); local.close();});
  db.exec('PRAGMA foreign_keys=ON');
  db.exec(readFileSync(new URL('../cloudflare/migrations/0004_saas_registrations.sql', import.meta.url), 'utf8'));
  local.exec(SAAS_SCHEMA);
  const query = "SELECT sql FROM sqlite_master WHERE sql IS NOT NULL AND name LIKE 'saas_%' ORDER BY name";
  assert.deepEqual(db.prepare(query).all(), local.prepare(query).all());
  assert.throws(() => db.prepare('INSERT INTO saas_session_index(token_hash,workshop_id,kind,expires_at) VALUES(?,?,?,?)')
    .run('token', firstId, 'admin', 1800000000000), /FOREIGN KEY/);
  db.prepare('INSERT INTO saas_workshops(id,email,name,owner_name,created_at) VALUES(?,?,?,?,?)')
    .run(firstId, input.email, input.workshopName, input.name, 1800000000000);
  assert.throws(() => db.prepare('INSERT INTO saas_session_index(token_hash,workshop_id,kind,expires_at) VALUES(?,?,?,?)')
    .run('token', firstId, 'super_admin', 1800000000000), /CHECK/);
  db.prepare('INSERT INTO saas_session_index(token_hash,workshop_id,kind,expires_at) VALUES(?,?,?,?)')
    .run('token', firstId, 'admin', 1800000000000);
  db.prepare('DELETE FROM saas_workshops WHERE id=?').run(firstId);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM saas_session_index').get().n, 0);
});
