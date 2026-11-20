import {REPAIR_STAGE_LABELS, NOTIFICATION_EVENTS} from './repair-notifications.mjs';

// Static SQL only; event names are read from the immutable message snapshot.
// Legacy rows have neither audience nor eventType and remain client messages.
export function notificationPreferenceSQL(payloadExpression = 'repair_notifications.payload') {
  const safe = `(CASE WHEN json_valid(${payloadExpression}) THEN ${payloadExpression} ELSE '{}' END)`;
  const legacy = `CASE json_extract(${safe},'$.newStage') ${Object.entries(REPAIR_STAGE_LABELS)
    .map(([key, label]) => `WHEN '${label.replaceAll("'", "''")}' THEN '${key}'`).join(' ')} ELSE '' END`;
  // Never place arbitrary persisted strings in a JSON path: malformed metadata
  // must fail only its own message, rather than abort the delivery queue.
  const audience = `CASE WHEN json_extract(${safe},'$.version')=2 AND json_extract(${safe},'$.audience')='shop' THEN 'shop' ELSE 'client' END`;
  const event = `CASE WHEN json_extract(${safe},'$.version') IS NULL THEN ${legacy}
    ELSE CASE json_extract(${safe},'$.eventType') ${NOTIFICATION_EVENTS.map(({key}) => `WHEN '${key}' THEN '${key}'`).join(' ')} ELSE '' END END`;
  return `COALESCE((SELECT json_extract(p.payload, '$.' || (${audience})
    || '."' || (${event}) || '"')
    FROM notification_preferences p WHERE p.id=1),1) <> 0`;
}

export const notificationEnabledSQL = `EXISTS (SELECT 1 FROM notification_settings WHERE id=1 AND enabled=1)
  AND ${notificationPreferenceSQL()}`;

// These adapters let the same delivery code run against local SQLite and D1.
export function nodeNotificationRepository(db) {
  return {
    async run(sql, values = []) { return db.prepare(sql).run(...values); },
    async first(sql, values = []) { return db.prepare(sql).get(...values); },
    async all(sql, values = []) { return db.prepare(sql).all(...values); },
    async batch(statements) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const results = statements.map(({sql, values = []}) => db.prepare(sql).run(...values));
        db.exec('COMMIT'); return results;
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
  };
}

export function d1NotificationRepository(db) {
  return {
    async run(sql, values = []) { return (await db.prepare(sql).bind(...values).run()).meta; },
    async first(sql, values = []) { return db.prepare(sql).bind(...values).first(); },
    async all(sql, values = []) { return (await db.prepare(sql).bind(...values).all()).results; },
    async batch(statements) {
      return (await db.batch(statements.map(({sql, values = []}) => db.prepare(sql).bind(...values)))).map(result => result.meta);
    },
  };
}

// A batch is one bound TEXT value: leave space below D1's 2 MB limit even
// when names contain multibyte characters. Never split an individual event.
export function notificationBatches(events) {
  const encoder = new TextEncoder(), batches = [];
  let group = [], bytes = 2;
  for (const event of events) {
    const item = JSON.stringify(event), size = encoder.encode(item).byteLength + 1;
    if (group.length && bytes + size > 1000000) {
      batches.push('[' + group.join(',') + ']'); group = []; bytes = 2;
    }
    group.push(item); bytes += size;
  }
  if (group.length) batches.push('[' + group.join(',') + ']');
  return batches;
}

export const insertNotificationsSQL = `INSERT OR IGNORE INTO repair_notifications
  (id,client_id,console_id,repair_id,recipient,payload,created_at,next_attempt_at)
  SELECT json_extract(value,'$.id'),json_extract(value,'$.client_id'),
    json_extract(value,'$.console_id'),json_extract(value,'$.repair_id'),
    json_extract(value,'$.recipient'),json_extract(value,'$.payload'),
    json_extract(value,'$.created_at'),json_extract(value,'$.next_attempt_at')
  FROM json_each(?)
  WHERE EXISTS (SELECT 1 FROM notification_settings WHERE id=1 AND enabled=1)
    AND ${notificationPreferenceSQL("json_extract(value,'$.payload')")}`;
