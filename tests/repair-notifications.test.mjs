import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { NOTIFICATION_SCHEMA, repairNotifications, renderRepairNotification } from '../server/repair-notifications.mjs';

const options = { origin: 'https://clinique.example', now: 1780000000000 };
const fixture = () => ({
  revision: 4,
  settings: { workshop: 'La Clinique Rétro', owner: 'PRIVATE_OWNER', hourlyRate: 123 },
  admin: {email:'PRIVATE_ADMIN_EMAIL',passwordHash:'PRIVATE_ADMIN_PASSWORD_HASH'},
  session: {token:'PRIVATE_SESSION_TOKEN',csrf:'PRIVATE_SESSION_CSRF'},
  rawData: 'PRIVATE_RAW_STORE',
  clients: [
    { id: 'client-a', name: 'Camille', email: ' CAMILLE@EXAMPLE.INVALID ', notes: 'PRIVATE_CLIENT_NOTE' },
    { id: 'client-b', name: 'Alex', email: 'alex@example.invalid', notes: 'OTHER_CLIENT_PRIVATE' },
  ],
  consoles: [
    { id: 'console-a', clientId: 'client-a', code: 'CRT-001', brand: 'Nintendo', model: 'DS Lite', notes: 'PRIVATE_CONSOLE_NOTE', serial: 'PRIVATE_SERIAL', purchasePrice: 150, photos:[{caption:'PRIVATE_CONSOLE_PHOTO',data:'PRIVATE_IMAGE_DATA'}] },
    { id: 'console-a2', clientId: 'client-a', code: 'CRT-002', brand: 'Nintendo', model: 'Game Boy Color', notes: 'PRIVATE_CONSOLE_NOTE' },
    { id: 'console-b', clientId: 'client-b', code: 'CRT-003', brand: 'Nintendo', model: 'Switch Lite', notes: 'OTHER_CONSOLE_PRIVATE' },
  ],
  repairs: [
    { id: 'repair-a', consoleId: 'console-a', code: 'REP-001', stage: 'diagnostic', diagnosis: 'PRIVATE_DIAGNOSIS', symptoms: 'PRIVATE_SYMPTOMS', tests: [{id:'PRIVATE_TEST_ID',label:'PRIVATE_TEST_LABEL',result:'pass'}], parts: [{name:'PRIVATE_PART_NAME',unitCost:12}], worklogs: [{note:'PRIVATE_WORKLOG_NOTE'}], photos:[{caption:'PRIVATE_REPAIR_PHOTO',data:'PRIVATE_REPAIR_IMAGE'}], interventionCost:123.45, payment:{amount:42.5,paidAt:'2026-10-02T12:00:00.000Z',memo:'PRIVATE_PAYMENT_MEMO'} },
    { id: 'repair-a2', consoleId: 'console-a2', code: 'REP-002', stage: 'reparation', diagnosis: 'PRIVATE_DIAGNOSIS', tests: [] },
    { id: 'repair-b', consoleId: 'console-b', code: 'REP-003', stage: 'reception', diagnosis: 'OTHER_REPAIR_PRIVATE', tests: [] },
  ],
});
const changed = before => {
  const after = structuredClone(before);
  after.revision++;
  after.repairs[0].stage = 'reparation';
  return after;
};

test('An existing repair stage transition creates one deterministic, minimal notification', () => {
  const before = fixture(), after = changed(before);
  const [row] = repairNotifications(before, after, options);
  assert.deepEqual(row, {
    id: 'repair-status:5:repair-a', client_id: 'client-a', console_id: 'console-a', repair_id: 'repair-a',
    recipient: 'camille@example.invalid',
    payload: JSON.stringify({
      clientName: 'Camille', workshopName: 'La Clinique Rétro', consoleName: 'Nintendo DS Lite', consoleCode: 'CRT-001',
      repairCode: 'REP-001', oldStage: 'Diagnostic', newStage: 'Réparation en cours', portalUrl: 'https://clinique.example/#/espace-client',
    }),
    created_at: options.now, next_attempt_at: options.now,
  });
  assert.deepEqual(repairNotifications(before, after, options), [row]);
  assert.deepEqual(before, fixture(), 'event projection must not mutate either store');
  assert.deepEqual(after, changed(fixture()));
  assert.ok(!JSON.stringify(row).includes('PRIVATE'));
});

test('Multiple consoles and clients retain distinct repair events and correct recipients', () => {
  const before = fixture(), after = changed(before);
  after.repairs[1].stage = 'terminee'; after.repairs[2].stage = 'diagnostic';
  const rows = repairNotifications(before, after, options);
  assert.equal(new Set(rows.map(row => row.id)).size, 3);
  assert.deepEqual(rows.map(row => [row.client_id, row.recipient, JSON.parse(row.payload).repairCode]), [
    ['client-a', 'camille@example.invalid', 'REP-001'], ['client-a', 'camille@example.invalid', 'REP-002'],
    ['client-b', 'alex@example.invalid', 'REP-003'],
  ]);
  assert.equal(JSON.parse(rows[1].payload).newStage, 'Terminée');
  assert.ok(!rows[0].payload.includes('Alex'));
  assert.ok(!rows[2].payload.includes('Camille'));
});

test('Initialization, new repairs and ordinary edits do not create stage emails', () => {
  const before = fixture(), after = structuredClone(before);
  after.revision++;
  after.repairs[0].diagnosis = 'Changed diagnosis';
  after.repairs[0].tests = [{ result: 'pass' }];
  after.repairs[0].code = 'UPDATED-CODE';
  after.clients[0].email = 'other@example.invalid';
  assert.deepEqual(repairNotifications(before, after, options), []);
  after.repairs.push({ id: 'new-repair', consoleId: 'console-a', code: 'REP-004', stage: 'terminee' });
  assert.deepEqual(repairNotifications(before, after, options), []);
  assert.deepEqual(repairNotifications({ clients: [], consoles: [], repairs: [] }, after, options), []);
});

test('Legacy ordering aliases do not notify during migration and real transitions use the canonical label', () => {
  const before = fixture(); before.repairs[0].stage = 'a-commander';
  const migrated = structuredClone(before); migrated.repairs[0].stage = 'attente-pieces'; migrated.revision++;
  assert.deepEqual(repairNotifications(before, migrated, options), []);
  assert.deepEqual(repairNotifications(migrated, before, options), []);
  const changed = structuredClone(migrated); changed.repairs[0].stage = 'reparation'; changed.revision++;
  const [row] = repairNotifications(before, changed, options);
  assert.equal(JSON.parse(row.payload).oldStage, 'En attente de pièces');
  assert.equal(JSON.parse(row.payload).newStage, 'Réparation en cours');
  assert.equal(before.repairs[0].stage, 'a-commander', 'projection must leave the source untouched');
});

test('Changed ownership or repaired console cannot disclose the earlier client’s transition', () => {
  const before = fixture();
  for (const change of [
    after => { after.consoles[0].clientId = 'client-b'; },
    after => { after.repairs[0].consoleId = 'console-b'; },
    after => { after.consoles[0].clientId = ''; },
    after => { after.clients = after.clients.filter(client => client.id !== 'client-a'); },
  ]) {
    const after = changed(before); change(after);
    assert.deepEqual(repairNotifications(before, after, options), []);
  }
  const absentOwner = fixture(); absentOwner.clients = absentOwner.clients.filter(client => client.id !== 'client-a');
  assert.deepEqual(repairNotifications(absentOwner, changed(before), options), []);
});

test('Absent or malformed contact email is skipped without falling back to private account data', () => {
  const before = fixture();
  for (const email of ['', undefined, 'invalid', 'camille@example.invalid\r\nBcc: third@example.invalid', 'Camille <camille@example.invalid>']) {
    const after = changed(before); after.clients[0].email = email;
    assert.deepEqual(repairNotifications(before, after, options), []);
  }
});

test('Reopened repairs notify the new stage with an event ID specific to the accepted revision', () => {
  const before = fixture(); before.repairs[0].stage = 'terminee';
  const after = changed(before); after.repairs[0].stage = 'diagnostic';
  const [row] = repairNotifications(before, after, options);
  assert.equal(JSON.parse(row.payload).oldStage, 'Terminée');
  assert.equal(JSON.parse(row.payload).newStage, 'Diagnostic');
  after.revision++;
  assert.notEqual(repairNotifications(before, after, options)[0].id, row.id);
});

test('The portal link is constructed only from a validated configured origin', () => {
  const before = fixture(), after = changed(before);
  assert.equal(JSON.parse(repairNotifications(before, after, { ...options, origin: 'http://127.0.0.1:3040/' })[0].payload).portalUrl,
    'http://127.0.0.1:3040/#/espace-client');
  for (const origin of ['/relative', 'javascript:alert(1)', 'file:///tmp/private', 'https://user:password@clinique.example', 'https://clinique.example/admin', 'https://clinique.example?to=evil', 'https://clinique.example/#/admin']) {
    assert.throws(() => repairNotifications(before, after, { ...options, origin }), /Origine/);
  }
  assert.throws(() => repairNotifications(before, { ...after, revision: -1 }, options), /Révision/);
  assert.throws(() => repairNotifications(before, after, { ...options, now: NaN }), /date/);
});

test('The email renderer escapes customer text, clears header controls and excludes extra fields', () => {
  const payload = JSON.parse(repairNotifications(fixture(), changed(fixture()), options)[0].payload);
  Object.assign(payload, {
    clientName: '<script>alert("client")</script>', workshopName: 'Atelier\r\nBcc: secret@example.invalid',
    consoleName: '<img src=x onerror="alert(1)">', consoleCode: 'CRT-001 & "Référence"',
    diagnosis: 'PRIVATE_DIAGNOSIS', notes: 'PRIVATE_NOTE', password: 'PRIVATE_PASSWORD',
    tests:[{label:'PRIVATE_TEST_LABEL'}], parts:[{name:'PRIVATE_PART_NAME'}], photos:[{caption:'PRIVATE_PHOTO_CAPTION',data:'PRIVATE_IMAGE_DATA'}],
    worklogs:[{note:'PRIVATE_WORKLOG_NOTE'}], session:{token:'PRIVATE_SESSION_TOKEN'}, rawData:'PRIVATE_RAW_STORE',
  });
  const rendered = renderRepairNotification(payload);
  assert.ok(!/[\r\n\u0000]/.test(rendered.subject));
  assert.ok(rendered.text.includes('Nouveau statut : Réparation en cours'));
  assert.ok(rendered.text.includes('https://clinique.example/#/espace-client'));
  assert.ok(rendered.html.includes('&lt;script&gt;'));
  assert.ok(rendered.html.includes('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'));
  assert.ok(rendered.html.includes('CRT-001 &amp; &quot;Référence&quot;'));
  assert.ok(!rendered.html.includes('<script>'));
  assert.ok(!rendered.html.includes('<img src=x'));
  assert.ok(!JSON.stringify(rendered).includes('PRIVATE'));
  assert.ok(rendered.html.includes('href="https://clinique.example/#/espace-client"'));
});

test('The renderer rejects modified or unsafe links instead of placing them in a message', () => {
  const payload = JSON.parse(repairNotifications(fixture(), changed(fixture()), options)[0].payload);
  for (const portalUrl of ['javascript:alert(1)', 'https://clinique.example/private', 'https://clinique.example/#/admin',
    'https://user:password@clinique.example/#/espace-client', 'https://clinique.example/?to=other#/espace-client']) {
    assert.throws(() => renderRepairNotification({ ...payload, portalUrl }), /Lien/);
  }
});

test('The additive local schema and D1 migration have identical defaults and constraints', () => {
  const migration = readFileSync(new URL('../cloudflare/migrations/0003_email_notifications.sql', import.meta.url), 'utf8');
  assert.equal(migration.trim(), NOTIFICATION_SCHEMA.trim());
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(NOTIFICATION_SCHEMA); db.exec(NOTIFICATION_SCHEMA);
    assert.deepEqual({ ...db.prepare('SELECT * FROM notification_settings').get() }, { id: 1, enabled: 1 });
    db.prepare('UPDATE notification_settings SET enabled=0').run(); db.exec(NOTIFICATION_SCHEMA);
    assert.equal(db.prepare('SELECT enabled FROM notification_settings').get().enabled, 0);
    db.prepare(`INSERT INTO repair_notifications(id,client_id,console_id,repair_id,recipient,payload,created_at,next_attempt_at)
      VALUES('event','client','console','repair','test@example.invalid','{}',1,1)`).run();
    const row = db.prepare('SELECT * FROM repair_notifications').get();
    assert.equal(row.status, 'pending'); assert.equal(row.attempts, 0); assert.equal(row.lease_until, 0);
    assert.equal(row.claim_token, ''); assert.equal(row.sent_at, null); assert.equal(row.provider_id, ''); assert.equal(row.error, '');
    assert.throws(() => db.prepare("UPDATE repair_notifications SET status='sending'").run(), /CHECK/);
    assert.throws(() => db.prepare('UPDATE notification_settings SET id=2').run(), /CHECK/);
  } finally { db.close(); }
});
