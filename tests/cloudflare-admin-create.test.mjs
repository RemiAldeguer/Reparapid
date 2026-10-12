import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {initialAdminSQL, parseProductionConfig, wranglerArguments} from '../scripts/cloudflare-admin-create.mjs';

const fakeDatabaseId = '00000000-0000-4000-8000-000000000001';
const fixtureConfig = overrides => ({name: 'reparapid', d1_databases: [{binding: 'DB', database_name: 'reparapid', database_id: fakeDatabaseId}], ...overrides});
const fakeHash = 'scrypt$32768$8$3$' + '1'.repeat(32) + '$' + '2'.repeat(128);

test('Admin bootstrap validates the dedicated production target and rejects placeholder or ambiguous configurations', () => {
  assert.equal(parseProductionConfig(JSON.stringify(fixtureConfig())).name, 'reparapid');
  for (const config of [
    fixtureConfig({name: 'another-worker'}),
    fixtureConfig({d1_databases: [{binding: 'DB', database_name: 'another-database', database_id: fakeDatabaseId}]}),
    fixtureConfig({d1_databases: [{binding: 'DB', database_name: 'reparapid', database_id: '00000000-0000-0000-0000-000000000000'}]}),
    fixtureConfig({d1_databases: [{binding: 'DB', database_name: 'reparapid', database_id: 'invalid'}]}),
    fixtureConfig({d1_databases: [{binding: 'DB', database_name: 'reparapid', database_id: fakeDatabaseId}, {binding: 'SECOND', database_name: 'reparapid', database_id: fakeDatabaseId}]}),
    fixtureConfig({d1_databases: []}),
  ]) assert.throws(() => parseProductionConfig(JSON.stringify(config)), /configuration doit viser/i);
});

test('JSONC parsing preserves strings and handles comments plus trailing commas without evaluating code', () => {
  const source = `// Header\n{"name":"reparapid","vars":{"APP_ORIGIN":"https://test.example/a//b/*c*/,}",},
    "d1_databases":[{"binding":"DB","database_name":"reparapid","database_id":"${fakeDatabaseId}", /* comment */},],}`;
  const config = parseProductionConfig(source);
  assert.equal(config.vars.APP_ORIGIN, 'https://test.example/a//b/*c*/,}');
  assert.throws(() => parseProductionConfig('/* unterminated'), /JSONC invalide/);
  assert.throws(() => parseProductionConfig('{"name":"reparapid"}; process.exit()'), /JSONC invalide/);
});

test('The first-admin statement escapes email, never overwrites a prior account and leaves workshop, clients and sessions intact', t => {
  const db = new DatabaseSync(':memory:'); t.after(() => db.close());
  db.exec(`CREATE TABLE admin(id INTEGER PRIMARY KEY CHECK(id=1),email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,role TEXT NOT NULL CHECK(role='admin'));
    CREATE TABLE workshop(id INTEGER PRIMARY KEY,data TEXT);INSERT INTO workshop VALUES(1,'synthetic workshop');
    CREATE TABLE client_accounts(client_id TEXT PRIMARY KEY,email TEXT);INSERT INTO client_accounts VALUES('synthetic-client','client@example.invalid');
    CREATE TABLE sessions(token_hash TEXT PRIMARY KEY);INSERT INTO sessions VALUES('synthetic-session');`);
  const sql = initialAdminSQL(" O'Reilly@Example.invalid ", fakeHash);
  assert.ok(!/UPDATE|REPLACE|DELETE|ON CONFLICT/i.test(sql));
  db.exec(sql);
  assert.deepEqual({...db.prepare('SELECT id,email,password_hash,role FROM admin').get()}, {id: 1, email: "o'reilly@example.invalid", password_hash: fakeHash, role: 'admin'});
  assert.throws(() => db.exec(initialAdminSQL('replacement@example.invalid', fakeHash.slice(0, -128) + '3'.repeat(128))), /UNIQUE constraint failed/);
  assert.equal(db.prepare('SELECT email FROM admin').get().email, "o'reilly@example.invalid");
  assert.equal(db.prepare('SELECT data FROM workshop').get().data, 'synthetic workshop');
  assert.equal(db.prepare('SELECT count(*) AS n FROM client_accounts').get().n, 1);
  assert.equal(db.prepare('SELECT count(*) AS n FROM sessions').get().n, 1);
  assert.throws(() => initialAdminSQL('invalid', fakeHash), /administrateur invalide/);
  assert.throws(() => initialAdminSQL('test@example.invalid', 'plain synthetic password'), /administrateur invalide/);
});

test('Wrangler receives only file paths and target options, and bootstrap help is safe without a terminal', () => {
  const args = wranglerArguments('/private/synthetic.production.jsonc', '/private/synthetic-admin.sql');
  assert.ok(args.includes('--remote')); assert.ok(args.includes('--file')); assert.ok(!args.includes('--command'));
  assert.ok(!args.join(' ').includes(fakeHash));
  assert.equal(args[args.indexOf('--env') + 1], '');
  const script = fileURLToPath(new URL('../scripts/cloudflare-admin-create.mjs', import.meta.url));
  const help = spawnSync(process.execPath, [script, '--help'], {encoding: 'utf8'});
  assert.equal(help.status, 0); assert.match(help.stdout, /Usage/); assert.equal(help.stderr, '');
  const nonInteractive = spawnSync(process.execPath, [script], {encoding: 'utf8'});
  assert.equal(nonInteractive.status, 1); assert.match(nonInteractive.stderr, /terminal interactif/);
  assert.ok(!nonInteractive.stdout.includes(fakeDatabaseId));
});
