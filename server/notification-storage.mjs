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
  WHERE EXISTS (SELECT 1 FROM notification_settings WHERE id=1 AND enabled=1)`;
