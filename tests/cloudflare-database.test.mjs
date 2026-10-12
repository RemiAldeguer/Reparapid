import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { emptyStore } from '../src/domain.ts';
import { initWorkshop, limit, readWorkshop, saveWorkshop } from '../cloudflare/database.mjs';

// Test-only D1 adapter: atomic batches plus D1's relevant value, parameter and
// invocation-query limits. All fixtures are synthetic and remain in memory.
function fixture(t) {
  const sqlite = new DatabaseSync(':memory:');
  t.after(() => sqlite.close());
  sqlite.exec(readFileSync(new URL('../cloudflare/migrations/0001_initial.sql', import.meta.url), 'utf8'));
  sqlite.exec(readFileSync(new URL('../cloudflare/migrations/0002_client_accounts.sql', import.meta.url), 'utf8'));
  sqlite.exec(readFileSync(new URL('../cloudflare/migrations/0003_email_notifications.sql', import.meta.url), 'utf8'));
  const db = {
    batches: [],
    reads: [],
    failAt: -1,
    beforeBatch: undefined,
    prepare(sql) {
      function statement(values = []) {
        return {
          bind(...bindings) { return statement(bindings); },
          execute() {
            assert.ok(values.length <= 100, 'D1 bound-parameter limit');
            for (const value of values) {
              if (typeof value === 'string') assert.ok(Buffer.byteLength(value) <= 2000000, 'D1 TEXT size limit');
            }
            const results = sqlite.prepare(sql).all(...values);
            const meta = sqlite.prepare('SELECT changes() AS changes, last_insert_rowid() AS last_row_id').get();
            return { results, success: true, meta };
          },
          async run() { return this.execute(); },
          async all() { db.reads.push(sql); return this.execute(); },
          async first(column) {
            const row = this.execute().results[0] ?? null;
            return column && row ? row[column] : row;
          },
        };
      }
      return statement();
    },
    async batch(statements) {
      assert.ok(statements.length <= 50, 'Free-plan query limit');
      db.batches.push(statements.length);
      db.beforeBatch?.();
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const results = statements.map((statement, index) => {
          if (index === db.failAt) throw new Error('Synthetic D1 batch failure');
          return statement.execute();
        });
        sqlite.exec('COMMIT');
        return results;
      } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  const now = 1000000, idleMs = 60000, tokenHash = 'synthetic-session-hash';
  sqlite.prepare("INSERT INTO admin(id,email,password_hash,role) VALUES(1,?,'synthetic-hash','admin')")
    .run('test-admin@example.invalid');
  sqlite.prepare('INSERT INTO sessions(token_hash,admin_id,csrf,expires_at,seen_at) VALUES(?,1,?,?,?)')
    .run(tokenHash, 'synthetic-csrf', now + 600000, now);
  return { db, sqlite, now, idleMs, tokenHash,
    save: (data, expectedRevision = 0, overrides = {}) => saveWorkshop(db,
      { data, expectedRevision, now, idleMs, tokenHash, ...overrides }) };
}

test('Initial workshop is empty and repeated initialization preserves saved data', async t => {
  const f = fixture(t);
  assert.deepEqual(await readWorkshop(f.db), emptyStore());
  const store = { ...emptyStore(), settings: { ...emptyStore().settings, workshop: 'Synthetic workshop' } };
  assert.equal(await f.save(store), true);
  await initWorkshop(f.db); await initWorkshop(f.db);
  assert.deepEqual(await readWorkshop(f.db), { ...store, revision: 1 });
});

test('Unicode JSON larger than 2 MB is split without breaking surrogate pairs and read in one query', async t => {
  const f = fixture(t);
  const prefixLength = JSON.stringify({ ...emptyStore(), large: '', revision: 1 }).indexOf('"large":"') + 9;
  const unicode = 'x'.repeat(250000 - prefixLength - 1) + '🎮'.repeat(600000);
  const store = { ...emptyStore(), large: unicode };
  assert.ok(Buffer.byteLength(JSON.stringify(store)) > 2000000);
  assert.equal(await f.save(store), true);
  const rows = f.sqlite.prepare('SELECT data FROM workshop_chunks ORDER BY position').all();
  assert.ok(rows.length > 1);
  for (const row of rows) {
    assert.ok(row.data.length <= 250000);
    assert.ok(Buffer.byteLength(row.data) < 2000000);
    assert.ok(!/^[\uDC00-\uDFFF]/.test(row.data), 'chunk must not begin with a low surrogate');
    assert.ok(!/[\uD800-\uDBFF]$/.test(row.data), 'chunk must not end with a high surrogate');
  }
  f.db.reads.length = 0;
  assert.deepEqual(await readWorkshop(f.db), { ...store, revision: 1 });
  assert.equal(f.db.reads.length, 1);
});

test('A near-20 MiB store remains below D1 parameter and Free-plan query limits', async t => {
  const f = fixture(t);
  const store = { ...emptyStore(), large: 'a'.repeat(20 * 1024 * 1024 - 1000) };
  assert.equal(await f.save(store), true);
  assert.ok(f.db.batches[0] <= 7);
  assert.deepEqual(await readWorkshop(f.db), { ...store, revision: 1 });
  await assert.rejects(f.save({ ...store, large: store.large + 'a'.repeat(2000) }, 1), /20 Mio/);
});

test('Stale and concurrent revisions never overwrite a saved generation or leave orphan chunks', async t => {
  const f = fixture(t);
  const one = { ...emptyStore(), marker: 'first' };
  const two = { ...emptyStore(), marker: 'second' };
  assert.deepEqual(await Promise.all([f.save(one), f.save(two)]), [true, false]);
  assert.deepEqual(await readWorkshop(f.db), { ...one, revision: 1 });
  assert.equal(await f.save(two, 0), false);
  assert.equal(await f.save(two, 1), true);
  assert.deepEqual(await readWorkshop(f.db), { ...two, revision: 2 });
  const generations = f.sqlite.prepare('SELECT count(DISTINCT generation) AS n FROM workshop_chunks').get();
  assert.equal(generations.n, 1);
});

test('Authorization is rechecked inside the save SQL after the earlier request checks', async t => {
  for (const revoke of [
    f => f.sqlite.prepare('UPDATE sessions SET expires_at = ?').run(f.now),
    f => f.sqlite.prepare('UPDATE sessions SET seen_at = ?').run(f.now - f.idleMs),
    f => f.sqlite.exec('DELETE FROM sessions'),
  ]) {
    const f = fixture(t);
    f.db.beforeBatch = () => revoke(f);
    assert.equal(await f.save({ ...emptyStore(), marker: 'must not publish' }), false);
    assert.deepEqual(await readWorkshop(f.db), emptyStore());
    assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM workshop_chunks').get().n, 0);
  }
});

test('A batch failure rolls back fragments and publication together', async t => {
  const f = fixture(t);
  const initial = { ...emptyStore(), marker: 'original' };
  assert.equal(await f.save(initial), true);
  f.db.failAt = 1; // Fail after the fragments were inserted, before publication.
  await assert.rejects(f.save({ ...initial, marker: 'replacement' }, 1), /Synthetic D1/);
  assert.deepEqual(await readWorkshop(f.db), { ...initial, revision: 1 });
  assert.equal(f.sqlite.prepare('SELECT count(DISTINCT generation) AS n FROM workshop_chunks').get().n, 1);
});

const notification = (index, revision = 1, now = 1000000) => ({
  id: `repair-status:${revision}:repair-${index}`, client_id: 'synthetic-client', console_id: `console-${index}`,
  repair_id: `repair-${index}`, recipient: 'synthetic@example.invalid',
  payload: JSON.stringify({clientName: '🎮'.repeat(40), workshopName: 'Synthetic workshop', consoleName: 'Nintendo DS Lite',
    consoleCode: `CRT-${index}`, repairCode: `REP-${index}`, oldStage: 'Diagnostic', newStage: 'Terminée', portalUrl: 'https://clinique.example/#/espace-client'}),
  created_at: now, next_attempt_at: now,
});

test('Notification insertion and cancellation share the revision and authorization guard', async t => {
  for (const rejection of ['stale', 'revoked', 'expired', 'idle']) {
    const f = fixture(t), first = notification(1);
    assert.equal(await f.save(emptyStore(), 0, {notifications: [first]}), true);
    if (rejection !== 'stale') f.db.beforeBatch = () => {
      if (rejection === 'revoked') f.sqlite.exec('DELETE FROM sessions');
      if (rejection === 'expired') f.sqlite.prepare('UPDATE sessions SET expires_at=?').run(f.now);
      if (rejection === 'idle') f.sqlite.prepare('UPDATE sessions SET seen_at=?').run(f.now - f.idleMs);
    };
    assert.equal(await f.save({...emptyStore(), marker: 'rejected'}, rejection === 'stale' ? 0 : 1,
      {notifications: [notification(2, 2)], cancelNotifications: true}), false);
    assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM repair_notifications').get().n, 1);
    assert.equal(f.sqlite.prepare('SELECT status FROM repair_notifications').get().status, 'pending');
    assert.deepEqual(await readWorkshop(f.db), {...emptyStore(), revision: 1});
    assert.equal(f.sqlite.prepare('SELECT count(DISTINCT generation) AS n FROM workshop_chunks').get().n, 1);
  }
});

test('An error after enqueue and cancellation rolls back the whole outbox publication', async t => {
  const f = fixture(t), first = notification(1);
  assert.equal(await f.save(emptyStore(), 0, {notifications: [first]}), true);
  // One fragment insert, publication, enqueue and cancellation execute first.
  f.db.failAt = 4;
  await assert.rejects(f.save({...emptyStore(), marker: 'rolled back'}, 1,
    {notifications: [notification(2, 2)], cancelNotifications: true}), /Synthetic D1/);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM repair_notifications').get().n, 1);
  assert.equal(f.sqlite.prepare('SELECT status FROM repair_notifications').get().status, 'pending');
  assert.deepEqual(await readWorkshop(f.db), {...emptyStore(), revision: 1});
  assert.equal(f.sqlite.prepare('SELECT count(DISTINCT generation) AS n FROM workshop_chunks').get().n, 1);
});

test('Duplicate notification IDs preserve sent history while a new revision enqueues a new event', async t => {
  const f = fixture(t), first = notification(1);
  assert.equal(await f.save(emptyStore(), 0, {notifications: [first]}), true);
  f.sqlite.prepare("UPDATE repair_notifications SET status='sent',provider_id='synthetic-confirmation',sent_at=?").run(f.now);
  assert.equal(await f.save(emptyStore(), 1, {notifications: [{...first, payload: 'must not replace sent history'}, notification(1, 2)]}), true);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM repair_notifications').get().n, 2);
  const old = f.sqlite.prepare('SELECT * FROM repair_notifications WHERE id=?').get(first.id);
  assert.equal(old.status, 'sent'); assert.equal(old.payload, first.payload); assert.equal(old.provider_id, 'synthetic-confirmation');
});

test('Large Unicode notification batches and a near-20 MiB store stay within D1 limits atomically', async t => {
  const f = fixture(t), events = Array.from({length: 5000}, (_, index) => notification(index));
  const store = {...emptyStore(), large: 'a'.repeat(20 * 1024 * 1024 - 1000)};
  assert.equal(await f.save(store, 0, {notifications: events}), true);
  assert.ok(f.db.batches[0] > 7, 'notifications must use additional bounded TEXT batches');
  assert.ok(f.db.batches[0] <= 50);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM repair_notifications').get().n, events.length);
  assert.deepEqual(await readWorkshop(f.db), {...store, revision: 1});
});

test('Rate limits atomically increment, reset at expiry, and preserve active windows', async t => {
  const f = fixture(t), max = 2, windowMs = 60000;
  assert.equal(await limit(f.db, 'synthetic-key', max, windowMs, f.now), 0);
  assert.equal(await limit(f.db, 'synthetic-key', max, windowMs, f.now + 1000), 0);
  assert.equal(await limit(f.db, 'synthetic-key', max, windowMs, f.now + 2000), 58);
  assert.equal(await limit(f.db, 'synthetic-key', max, windowMs, f.now + windowMs), 0);
  const row = f.sqlite.prepare('SELECT * FROM limits WHERE key = ?').get('synthetic-key');
  assert.equal(row.hits, 1); assert.equal(row.expires_at, f.now + 2 * windowMs);
});

test('Expired limiter-key cleanup is bounded and leaves active keys intact', async t => {
  const f = fixture(t);
  const insert = f.sqlite.prepare('INSERT INTO limits(key,hits,expires_at) VALUES(?,1,?)');
  for (let index = 0; index < 250; index++) insert.run('expired-' + index, f.now - 1);
  insert.run('active', f.now + 60000);
  await limit(f.db, 'current', 5, 60000, f.now);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM limits WHERE expires_at <= ?').get(f.now).n, 150);
  assert.equal(f.sqlite.prepare("SELECT count(*) AS n FROM limits WHERE key IN ('active','current')").get().n, 2);
});
