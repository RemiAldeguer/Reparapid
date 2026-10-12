import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {nodeNotificationRepository} from '../server/notification-storage.mjs';
import {REGISTRATION_SCHEMA, RegistrationError, validateRegistrationRequest,
  submitRegistrationRequest, listRegistrationRequests, reviewRegistrationRequest,
  registrationView} from '../server/registration-requests.mjs';

const valid = {name: 'Rémi Atelier', email: 'candidate@example.invalid', workshopName: 'Atelier portable',
  message: 'Réparation de consoles.\nUn atelier indépendant.', password: 'Une phrase synthétique 2026!'};
const viewKeys = ['createdAt', 'email', 'id', 'message', 'name', 'reviewNote', 'reviewedAt',
  'reviewedBy', 'status', 'updatedAt', 'workshopName'];

function fixture(t) {
  const db = new DatabaseSync(':memory:');
  db.exec(REGISTRATION_SCHEMA);
  db.exec('CREATE TABLE synthetic_accounts(id TEXT PRIMARY KEY,email TEXT UNIQUE,password_hash TEXT NOT NULL,workshop TEXT NOT NULL)');
  t.after(() => db.close());
  const repo = nodeNotificationRepository(db);
  let index = 0, at = 1800000000000, hashes = 0;
  const uuid = () => `00000000-0000-4000-8000-${(++index).toString(16).padStart(12, '0')}`;
  const now = () => ++at;
  const hashPassword = async password => {hashes++; return `synthetic-hash:${password}`;};
  const submit = (input = valid) => submitRegistrationRequest(repo, input, {hashPassword, uuid, now});
  const latest = () => db.prepare('SELECT * FROM registration_requests ORDER BY created_at DESC LIMIT 1').get();
  const approvalStatements = (row, {guard}) => [{
    sql: `INSERT INTO synthetic_accounts(id,email,password_hash,workshop)
      SELECT ?,?,?,? WHERE ${guard.sql}`,
    values: [row.id, row.email, row.password_hash, row.workshop_name, ...guard.values],
  }];
  const review = (id, input, options = {}) => reviewRegistrationRequest(repo, id, input, {
    now, uuid, reviewer: 'super-admin@example.invalid', approvalStatements, ...options,
  });
  return {db, repo, submit, latest, review, approvalStatements, hashes: () => hashes};
}

function errorStatus(status) {
  return error => error instanceof RegistrationError && error.status === status;
}

test('request validation trims public fields, normalizes email and preserves the password', () => {
  const password = '  Phrase de passe volontairement espacée  ';
  assert.deepEqual(validateRegistrationRequest({...valid, name: '  Rémi Atelier  ',
    email: ' CANDIDATE@EXAMPLE.INVALID ', workshopName: ' Atelier portable ', message: ' Bonjour. ', password}),
  {...valid, message: 'Bonjour.', password});
  assert.equal(validateRegistrationRequest({...valid, message: undefined}).message, '');
  assert.equal(validateRegistrationRequest({...valid, password: '🕹'.repeat(15)}).password, '🕹'.repeat(15));
});

test('invalid registration fields are rejected before hashing or inserting', async t => {
  const f = fixture(t);
  const invalid = [null, [], 'text', {...valid, name: 'A'}, {...valid, name: 'x'.repeat(121)},
    {...valid, name: 'Name\nInjected'}, {...valid, workshopName: ''}, {...valid, workshopName: 42},
    {...valid, email: 'invalid'}, {...valid, email: 'a\u0000@example.invalid'},
    {...valid, email: `x${'a'.repeat(250)}@example.invalid`}, {...valid, password: 'x'.repeat(14)},
    {...valid, password: 'x'.repeat(129)}, {...valid, password: `123456789012345\u0000`},
    {...valid, password: undefined}, {...valid, message: null}, {...valid, message: 'x'.repeat(2001)},
    {...valid, message: 'Message\u0001'}];
  for (const input of invalid) await assert.rejects(f.submit(input), errorStatus(400));
  assert.equal(f.hashes(), 0);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM registration_requests').get().n, 0);
});

test('workshop and email UTF-16 bounds match domain storage and login normalization', () => {
  assert.equal(validateRegistrationRequest({...valid, workshopName: '🕹'.repeat(60)}).workshopName.length, 120);
  assert.throws(() => validateRegistrationRequest({...valid, workshopName: '🕹'.repeat(61)}), errorStatus(400));
  assert.throws(() => validateRegistrationRequest({...valid, email: `${'🕹'.repeat(120)}@example.invalid`}), errorStatus(400));
});

test('registration body limit counts UTF-8 bytes rather than characters', async t => {
  const f = fixture(t);
  await assert.rejects(f.submit({...valid, message: '🕹'.repeat(2000), extra: 'x'.repeat(500)}), errorStatus(413));
  await assert.rejects(f.submit({...valid, extra: 'x'.repeat(8192)}), errorStatus(413));
  assert.equal(f.hashes(), 0);
});

test('new request stores only the server hash and projects no credential or review token', async t => {
  const f = fixture(t);
  assert.deepEqual(await f.submit({...valid, role: 'super_admin', status: 'approved', password_hash: 'attacker'}), {accepted: true});
  const row = f.latest();
  assert.equal(row.status, 'pending');
  assert.equal(row.password_hash, `synthetic-hash:${valid.password}`);
  assert.equal(row.reviewed_at, null);
  assert.equal(row.created_at, row.updated_at);
  assert.equal(row.reviewed_by, '');
  const list = await listRegistrationRequests(f.repo);
  assert.deepEqual(Object.keys(list.requests[0]).sort(), viewKeys);
  assert.deepEqual(list.counts, {total: 1, pending: 1, approved: 0, rejected: 0});
  assert.ok(!JSON.stringify(list).includes(valid.password));
  assert.ok(!('password_hash' in registrationView({...row, extraSecret: 'hidden'})));
  assert.ok(!JSON.stringify(registrationView({...row, extraSecret: 'hidden'})).includes('hidden'));
});

test('pending duplicate address has the same response and keeps the first applicant and password', async t => {
  const f = fixture(t);
  const result = await f.submit(), before = f.latest();
  assert.deepEqual(await f.submit({...valid, email: ' CANDIDATE@EXAMPLE.INVALID ',
    name: 'Second applicant', password: 'Another synthetic phrase 2026!'}), result);
  assert.deepEqual(f.latest(), before);
  assert.equal(f.hashes(), 2, 'duplicates follow the same hashing path');
});

test('approval atomically creates one isolated account then removes the queued hash', async t => {
  const f = fixture(t); await f.submit();
  const row = f.latest();
  const response = await f.review(row.id, {decision: 'approve', note: '  Atelier accepté.  '});
  assert.equal(response.request.status, 'approved');
  assert.equal(response.request.reviewNote, 'Atelier accepté.');
  assert.equal(response.request.reviewedBy, 'super-admin@example.invalid');
  assert.deepEqual(Object.keys(response.request).sort(), viewKeys);
  assert.equal(f.latest().password_hash, null);
  const account = f.db.prepare('SELECT * FROM synthetic_accounts WHERE id=?').get(row.id);
  assert.equal(account.email, valid.email);
  assert.equal(account.password_hash, row.password_hash);
  assert.equal(account.workshop, valid.workshopName);
  assert.deepEqual(await f.submit({...valid, password: 'Attacker replacement phrase 2026!'}), {accepted: true});
  assert.equal(f.latest().id, row.id);
  assert.equal(f.latest().status, 'approved');
  assert.deepEqual(f.db.prepare('SELECT * FROM synthetic_accounts WHERE id=?').get(row.id), account);
});

test('same terminal decision is idempotent and contradictory decisions fail without changing it', async t => {
  const f = fixture(t); await f.submit(); const id = f.latest().id;
  const response = await f.review(id, {decision: 'reject', note: 'Pas pour le moment.'});
  const before = f.latest();
  assert.equal(before.password_hash, null);
  assert.deepEqual(await f.review(id, {decision: 'reject', note: 'Overwrite attempt'}), response);
  assert.deepEqual(f.latest(), before);
  await assert.rejects(f.review(id, {decision: 'approve'}), errorStatus(409));
  assert.deepEqual(f.latest(), before);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM synthetic_accounts').get().n, 0);
});

test('rejected applicant may submit a fresh request with a new ID and cleared review', async t => {
  const f = fixture(t); await f.submit(); const oldId = f.latest().id;
  await f.review(oldId, {decision: 'reject', note: 'Review of original request'});
  assert.deepEqual(await f.submit({...valid, workshopName: 'Nouvel atelier', password: 'Nouvelle phrase synthétique 2026!'}), {accepted: true});
  const row = f.latest();
  assert.notEqual(row.id, oldId);
  assert.equal(row.status, 'pending');
  assert.equal(row.workshop_name, 'Nouvel atelier');
  assert.equal(row.password_hash, 'synthetic-hash:Nouvelle phrase synthétique 2026!');
  assert.equal(row.reviewed_at, null);
  assert.equal(row.reviewed_by, ''); assert.equal(row.review_note, ''); assert.equal(row.review_token, '');
  await assert.rejects(f.review(oldId, {decision: 'approve'}), errorStatus(404));
});

test('missing provisioning callback refuses approval instead of approving access to a shared workshop', async t => {
  const f = fixture(t); await f.submit(); const before = f.latest();
  await assert.rejects(f.review(before.id, {decision: 'approve'}, {approvalStatements: undefined}), errorStatus(503));
  assert.deepEqual(f.latest(), before);
});

test('provisioning failure rolls back both the account and review decision', async t => {
  const f = fixture(t); await f.submit(); const before = f.latest();
  await assert.rejects(f.review(before.id, {decision: 'approve'}, {approvalStatements(row, context) {
    return [...f.approvalStatements(row, context), {sql: 'INSERT INTO nonexistent_table VALUES(?)', values: ['failure']}];
  }}), /nonexistent_table/);
  assert.deepEqual(f.latest(), before);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM synthetic_accounts').get().n, 0);
});

test('concurrent approvals provision once and return the committed decision', async t => {
  const f = fixture(t); await f.submit(); const id = f.latest().id;
  const results = await Promise.all([f.review(id, {decision: 'approve', note: 'First'}), f.review(id, {decision: 'approve', note: 'Second'})]);
  assert.deepEqual(results[0], results[1]);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM synthetic_accounts').get().n, 1);
  assert.equal(f.latest().review_note, 'First');
});

test('session guard failing at commit leaves the request pending and creates no account', async t => {
  const f = fixture(t); await f.submit(); const before = f.latest();
  await assert.rejects(f.review(before.id, {decision: 'approve'}, {guard: {sql: '0', values: []}}), errorStatus(401));
  assert.deepEqual(f.latest(), before);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM synthetic_accounts').get().n, 0);
});

test('idempotent terminal review still rechecks a session revoked while receiving its body', async t => {
  const f = fixture(t); await f.submit(); const id = f.latest().id;
  await f.review(id, {decision: 'reject'});
  const before = f.latest();
  await assert.rejects(f.review(id, {decision: 'reject'}, {guard: {sql: '0', values: []}}), errorStatus(401));
  await assert.rejects(f.review(id, {decision: 'approve'}, {guard: {sql: '0', values: []}}), errorStatus(401));
  assert.deepEqual(f.latest(), before);
  assert.equal((await f.review(id, {decision: 'reject'}, {guard: {sql: '1', values: []}})).request.status, 'rejected');
});

test('review validates IDs, decisions and note bounds before writing', async t => {
  const f = fixture(t); await f.submit(); const before = f.latest();
  await assert.rejects(f.review('../request', {decision: 'approve'}), errorStatus(400));
  await assert.rejects(f.review(before.id, {decision: 'approved'}), errorStatus(400));
  await assert.rejects(f.review(before.id, {decision: 'reject', note: 'x'.repeat(1001)}), errorStatus(400));
  await assert.rejects(f.review(before.id, {decision: 'reject', note: 3}), errorStatus(400));
  await assert.rejects(f.review('00000000-0000-4000-8000-999999999999', {decision: 'reject'}), errorStatus(404));
  assert.deepEqual(f.latest(), before);
});

test('list filters statuses while counts retain all requests and pending appears first', async t => {
  const f = fixture(t); await f.submit();
  await f.review(f.latest().id, {decision: 'approve'});
  await f.submit({...valid, email: 'second@example.invalid'});
  await f.review(f.latest().id, {decision: 'reject'});
  await f.submit({...valid, email: 'pending@example.invalid'});
  const all = await listRegistrationRequests(f.repo);
  assert.deepEqual(all.counts, {total: 3, pending: 1, approved: 1, rejected: 1});
  assert.equal(all.requests[0].status, 'pending');
  for (const status of ['pending', 'approved', 'rejected']) {
    const filtered = await listRegistrationRequests(f.repo, status);
    assert.equal(filtered.requests.length, 1);
    assert.equal(filtered.requests[0].status, status);
    assert.deepEqual(filtered.counts, all.counts);
  }
  await assert.rejects(listRegistrationRequests(f.repo, "pending' OR 1=1"), errorStatus(400));
});

test('migration and exported local schema enforce the same registration lifecycle', t => {
  const local = fixture(t).db, migrated = new DatabaseSync(':memory:');
  t.after(() => migrated.close());
  migrated.exec(readFileSync(new URL('../cloudflare/migrations/0004_saas_registrations.sql', import.meta.url), 'utf8'));
  assert.deepEqual(migrated.prepare("SELECT sql FROM sqlite_master WHERE type IN ('table','index') AND sql IS NOT NULL AND name LIKE 'registration_requests%' ORDER BY name").all(),
    local.prepare("SELECT sql FROM sqlite_master WHERE type IN ('table','index') AND sql IS NOT NULL AND name LIKE 'registration_requests%' ORDER BY name").all());
  for (const db of [local, migrated]) {
    assert.throws(() => db.prepare(`INSERT INTO registration_requests
      (id,name,email,workshop_name,status,created_at,updated_at)
      VALUES('invalid','Name','test@example.invalid','Workshop','pending',1,1)`).run(), /CHECK constraint/);
  }
});
