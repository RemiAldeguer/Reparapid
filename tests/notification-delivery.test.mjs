import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {NOTIFICATION_SCHEMA} from '../server/repair-notifications.mjs';
import {notificationConfiguration, deliverNotifications, notificationStatus} from '../server/notification-delivery.mjs';

const env = {RESEND_API_KEY: 'synthetic-secret-for-tests', MAIL_FROM: 'La Clinique Rétro <reparations@clinic.example>', MAIL_REPLY_TO: 'atelier@example.invalid', MAIL_PORTAL_ORIGIN: 'https://clinic.example'};
const config = notificationConfiguration(env);
const start = Date.UTC(2026, 9, 6, 10);

function fixture(t, count = 1) {
  const db = new DatabaseSync(':memory:'); db.exec(NOTIFICATION_SCHEMA); t.after(() => db.close());
  const repo = {
    async run(sql, parameters = []) {return {changes: Number(db.prepare(sql).run(...parameters).changes)};},
    async first(sql, parameters = []) {return db.prepare(sql).get(...parameters);},
    async all(sql, parameters = []) {return db.prepare(sql).all(...parameters);},
  };
  const store = {
    clients: [{id: 'client-a', name: '<Client A>', email: 'client.a@example.invalid', notes: 'PRIVATE_CLIENT_NOTE'}, {id: 'client-b', email: 'client.b@example.invalid'}],
    consoles: [{id: 'console-a', clientId: 'client-a', brand: 'Nintendo', model: 'DS Lite', notes: 'PRIVATE_CONSOLE_NOTE'}],
    repairs: [{id: 'repair-a', consoleId: 'console-a', stage: 'diagnostic', diagnosis: 'PRIVATE_DIAGNOSIS'}],
  };
  const payload = {clientName: '<Client A>', workshopName: 'La Clinique Rétro', consoleName: 'Nintendo DS Lite', consoleCode: 'CON-001', repairCode: 'REP-001', oldStage: 'À faire', newStage: 'Diagnostic', portalUrl: 'https://clinic.example/#/espace-client'};
  function insert(id, {clientId = 'client-a', recipient = 'client.a@example.invalid', createdAt = start, attempts = 0, status = 'pending', contents = payload} = {}) {
    db.prepare(`INSERT INTO repair_notifications(id,client_id,console_id,repair_id,recipient,payload,status,attempts,created_at,next_attempt_at,claim_token,lease_until,provider_id,error)
      VALUES(?,?, 'console-a','repair-a',?,?, ?,?,?,?,'',0,'','')`).run(id, clientId, recipient, typeof contents === 'string' ? contents : JSON.stringify(contents), status, attempts, createdAt, createdAt);
  }
  for (let i = 0; i < count; i++) insert(`event-${i + 1}`);
  let time = start;
  const send = (options = {}) => deliverNotifications(repo, {config, readStore: async () => store, now: () => time, ...options});
  return {db, repo, store, payload, insert, send, advance(ms) {time += ms;}, get(id = 'event-1') {return db.prepare('SELECT * FROM repair_notifications WHERE id=?').get(id);}};
}

test('notification configuration validates sender, reply address and portal origin without exposing credentials in status', async t => {
  assert.equal(config.configured, true); assert.equal(config.portalOrigin, 'https://clinic.example');
  assert.equal(notificationConfiguration({}).configured, false);
  for (const patch of [{MAIL_FROM: 'Someone\nBcc: leak@example.invalid'}, {MAIL_FROM: 'not-an-address'}, {MAIL_REPLY_TO: 'bad-address'}, {MAIL_PORTAL_ORIGIN: 'https://clinic.example/path'}, {MAIL_PORTAL_ORIGIN: 'http://clinic.example'}, {MAIL_PORTAL_ORIGIN: 'https://user:password@clinic.example'}, {RESEND_API_KEY: 'invalid key'}]) {
    assert.equal(notificationConfiguration({...env, ...patch}).configured, false);
  }
  assert.equal(notificationConfiguration({...env, MAIL_PORTAL_ORIGIN: '', APP_ORIGIN: 'http://127.0.0.1:3040'}).configured, true);
  const f = fixture(t);
  const status = await notificationStatus(f.repo, config);
  assert.equal(status.configured, true); assert.equal(status.provider, 'resend'); assert.equal(status.sender, env.MAIL_FROM);
  assert.ok(!JSON.stringify(status).includes(env.RESEND_API_KEY)); assert.ok(!Object.hasOwn(status, 'apiKey'));
});

test('unconfigured and disabled delivery never contacts the mail provider or consumes an attempt', async t => {
  const f = fixture(t); let calls = 0;
  const fetch = async () => {calls++; throw new Error('Unexpected send');};
  assert.equal((await f.send({config: notificationConfiguration({}), fetch})).claimed, 0);
  f.db.prepare('UPDATE notification_settings SET enabled=0 WHERE id=1').run();
  assert.equal((await f.send({fetch})).claimed, 0);
  assert.equal(calls, 0); assert.equal(f.get().attempts, 0); assert.equal(f.get().claim_token, '');
});

test('successful delivery sends only customer-facing contents and records the provider receipt', async t => {
  const f = fixture(t); let request;
  const counts = await f.send({fetch: async (url, options) => {request = {url, options}; return Response.json({id: 'receipt-a'});}});
  assert.deepEqual(counts, {claimed: 1, sent: 1, failed: 0, cancelled: 0, pending: 0});
  assert.equal(request.url, 'https://api.resend.com/emails'); assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers['Idempotency-Key'], 'event-1'); assert.equal(request.options.headers.Authorization, `Bearer ${env.RESEND_API_KEY}`);
  assert.ok(request.options.signal instanceof AbortSignal);
  const body = JSON.parse(request.options.body);
  assert.deepEqual(body.to, ['client.a@example.invalid']); assert.equal(body.reply_to, env.MAIL_REPLY_TO);
  assert.match(body.text, /Diagnostic/); assert.match(body.html, /&lt;Client A&gt;/); assert.ok(!request.options.body.includes('PRIVATE_'));
  const row = f.get(); assert.equal(row.status, 'sent'); assert.equal(row.attempts, 1); assert.equal(row.provider_id, 'receipt-a'); assert.equal(row.sent_at, start); assert.equal(row.lease_until, 0);
});

test('concurrent dispatchers serialize provider calls and do not send the same event twice', async t => {
  const f = fixture(t, 2); let release, entered, inflight = 0, maximum = 0, calls = 0;
  const gate = new Promise(resolve => {release = resolve;}); const firstStarted = new Promise(resolve => {entered = resolve;});
  const fetch = async () => {
    inflight++; maximum = Math.max(maximum, inflight); calls++;
    if (calls === 1) {entered(); await gate;}
    inflight--; return Response.json({id: `receipt-${calls}`});
  };
  const first = f.send({fetch}); await firstStarted;
  const second = await f.send({fetch}); assert.equal(second.claimed, 0);
  release(); const result = await first;
  assert.equal(result.sent, 2); assert.equal(calls, 2); assert.equal(maximum, 1);
  assert.equal((await f.send({fetch})).claimed, 0);
});

for (const mode of ['rate-limit', 'server-error', 'timeout', 'missing-confirmation']) {
  test(`delivery retries ${mode} with the same idempotency key and payload`, async t => {
    const f = fixture(t); const requests = [];
    const fetch = async (_url, options) => {
      requests.push(options);
      if (requests.length > 1) return Response.json({id: 'retry-receipt'});
      if (mode === 'timeout') throw new DOMException('sensitive provider details', 'TimeoutError');
      if (mode === 'missing-confirmation') return Response.json({unexpected: 'sensitive provider details'});
      return new Response('sensitive provider details', {status: mode === 'rate-limit' ? 429 : 503});
    };
    assert.equal((await f.send({fetch})).pending, 1); assert.equal(f.get().status, 'pending'); assert.equal(f.get().attempts, 1);
    assert.equal(f.get().next_attempt_at, start + 60_000); assert.ok(!f.get().error.includes('sensitive'));
    assert.equal((await f.send({fetch})).claimed, 0);
    f.advance(60_000); assert.equal((await f.send({fetch})).sent, 1);
    assert.equal(requests.length, 2); assert.equal(requests[0].headers['Idempotency-Key'], requests[1].headers['Idempotency-Key']); assert.equal(requests[0].body, requests[1].body);
    assert.equal(f.get().attempts, 2);
  });
}

test('permanent provider rejection is terminal and its body is never saved or returned', async t => {
  const f = fixture(t); let calls = 0;
  const fetch = async () => {calls++; return new Response(`secret=${env.RESEND_API_KEY}, private provider response`, {status: 403});};
  assert.equal((await f.send({fetch})).failed, 1); assert.equal(f.get().status, 'failed');
  assert.equal((await f.send({fetch})).claimed, 0); assert.equal(calls, 1);
  const status = await notificationStatus(f.repo, config); assert.ok(!JSON.stringify(status).includes(env.RESEND_API_KEY)); assert.ok(!JSON.stringify(status).includes('private provider response'));
});

test('Resend only retries concurrent idempotent requests, and fails changed-payload conflicts', async t => {
  for (const name of ['concurrent_idempotent_requests', 'invalid_idempotent_request']) await t.test(name, async child => {
    const f = fixture(child);
    const result = await f.send({fetch: async () => Response.json({name, message: 'private provider detail'}, {status: 409})});
    assert.equal(result[name === 'concurrent_idempotent_requests' ? 'pending' : 'failed'], 1);
    assert.equal(f.get().status, name === 'concurrent_idempotent_requests' ? 'pending' : 'failed');
    assert.ok(!f.get().error.includes('private provider detail'));
  });
});

test('retries stop after six attempts and before provider idempotence expires', async t => {
  const f = fixture(t, 0);
  f.insert('exhausted', {attempts: 5});
  assert.equal((await f.send({fetch: async () => new Response('', {status: 503})})).failed, 1);
  assert.equal(f.get('exhausted').attempts, 6);
  f.insert('expired', {attempts: 1, createdAt: start - 23 * 60 * 60 * 1000});
  let calls = 0;
  assert.equal((await f.send({fetch: async () => {calls++; return Response.json({id: 'unexpected'});}})).failed, 1);
  assert.equal(calls, 0); assert.match(f.get('expired').error, /délai/);
});

test('delivery cancels stale ownership and recipient records before contacting the provider', async t => {
  const mutations = {
    'client removed': store => {store.clients = [];},
    'email changed': store => {store.clients[0].email = 'new@example.invalid';},
    'console transferred': store => {store.consoles[0].clientId = 'client-b';},
    'console removed': store => {store.consoles = [];},
    'repair removed': store => {store.repairs = [];},
    'repair belongs to another console': store => {store.repairs[0].consoleId = 'other-console';},
  };
  for (const [name, mutate] of Object.entries(mutations)) await t.test(name, async child => {
    const f = fixture(child); mutate(f.store); let calls = 0;
    assert.equal((await f.send({fetch: async () => {calls++; throw new Error('unexpected');}})).cancelled, 1);
    assert.equal(calls, 0); assert.equal(f.get().attempts, 0); assert.equal(f.get().status, 'cancelled');
  });
});

test('a later repair stage does not erase a previously queued status change', async t => {
  const f = fixture(t); f.store.repairs[0].stage = 'terminee';
  const sent = await f.send({fetch: async (_url, options) => {assert.match(JSON.parse(options.body).text, /Diagnostic/); return Response.json({id: 'receipt-old-stage'});}});
  assert.equal(sent.sent, 1);
});

test('invalid persisted payload fails safely before sending', async t => {
  const f = fixture(t, 0); f.insert('broken', {contents: '{broken json'}); let calls = 0;
  assert.equal((await f.send({fetch: async () => {calls++; throw new Error('unexpected');}})).failed, 1);
  assert.equal(calls, 0); assert.equal(f.get('broken').attempts, 0); assert.match(f.get('broken').error, /invalide/);
});

test('settings disabled after a claim release it without sending', async t => {
  const f = fixture(t); let calls = 0;
  const result = await f.send({readStore: async () => {f.db.prepare('UPDATE notification_settings SET enabled=0 WHERE id=1').run(); return f.store;}, fetch: async () => {calls++; throw new Error('unexpected');}});
  assert.equal(result.claimed, 1); assert.equal(calls, 0); assert.equal(f.get().claim_token, ''); assert.equal(f.get().attempts, 0);
});

test('a temporary workshop read failure preserves the notification for retry', async t => {
  const f = fixture(t); let calls = 0;
  assert.equal((await f.send({readStore: async () => {throw new Error('private database detail');}, fetch: async () => {calls++; throw new Error('unexpected');}})).pending, 1);
  assert.equal(calls, 0); assert.equal(f.get().attempts, 0); assert.equal(f.get().next_attempt_at, start + 60_000); assert.ok(!f.get().error.includes('private database'));
});

test('a dispatcher that lost its lease cannot overwrite a newer claim', async t => {
  const f = fixture(t);
  const result = await f.send({fetch: async () => {f.db.prepare("UPDATE repair_notifications SET claim_token='new-owner',lease_until=? WHERE id='event-1'").run(start + 60_000); return Response.json({id: 'stale-receipt'});}});
  assert.equal(result.sent, 0); assert.equal(f.get().status, 'pending'); assert.equal(f.get().claim_token, 'new-owner'); assert.equal(f.get().provider_id, '');
});

test('status is scoped, limited to the latest twenty events and sanitizes arbitrary stored errors', async t => {
  const f = fixture(t, 0);
  for (let i = 0; i < 23; i++) f.insert(`recent-${i}`, {createdAt: start + i, status: i < 2 ? 'sent' : 'pending'});
  f.insert('other-client', {clientId: 'client-b', recipient: 'client.b@example.invalid', status: 'failed'});
  f.db.prepare("UPDATE repair_notifications SET error=? WHERE id='recent-22'").run(env.RESEND_API_KEY);
  const status = await notificationStatus(f.repo, config, {clientId: 'client-a'});
  assert.deepEqual(status.counts, {pending: 21, sent: 2, failed: 0, cancelled: 0}); assert.equal(status.recent.length, 20);
  assert.equal(status.recent[0].id, 'recent-22'); assert.equal(status.recent[0].consoleName, 'Nintendo DS Lite'); assert.equal(status.recent[0].stage, 'Diagnostic');
  assert.ok(status.recent.every(row => row.clientId === 'client-a')); assert.ok(!JSON.stringify(status).includes(env.RESEND_API_KEY)); assert.ok(!JSON.stringify(status).includes('PRIVATE_'));
});

test('status preserves the known cancellation reasons written by pause and workshop restoration', async t => {
  const f = fixture(t, 0);
  const reasons = ['Les notifications ont été mises en pause.', 'L’atelier a été restauré ou réinitialisé.'];
  reasons.forEach((reason, index) => {
    const id = `cancelled-${index}`;
    f.insert(id, {status: 'cancelled'});
    f.db.prepare('UPDATE repair_notifications SET error=? WHERE id=?').run(reason, id);
  });
  const status = await notificationStatus(f.repo, config);
  assert.equal(status.counts.cancelled, 2);
  assert.deepEqual(status.recent.map(row => row.error).sort(), [...reasons].sort());
});
