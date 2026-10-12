import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { openDatabase, limit } from './database.mjs';
import { token, digest, equal, email, checkPassword, hashPassword, verifyPassword } from './security.mjs';
import { validateStore, normalizeRepairStages, emptyStore, repairTotalCost, markClientPartAvailable } from '../tests/.compiled/domain.cjs';
import { clientPortal, clientAccess, clientUser } from './client-portal.mjs';
import {ClientPartAvailabilityError, availablePartRequest, assertAvailablePart} from './client-part-availability.mjs';
import { repairNotifications } from './repair-notifications.mjs';
import { notificationConfiguration, deliverNotifications } from './notification-delivery.mjs';
import { nodeNotificationRepository, notificationBatches, insertNotificationsSQL } from './notification-storage.mjs';
import { notificationAdminRequest, NotificationError } from './notification-admin.mjs';
import { responseSecurityHeaders } from './response-security.mjs';
import {REGISTRATION_BODY_LIMIT, RegistrationError, validateRegistrationRequest, submitRegistrationRequest, listRegistrationRequests, reviewRegistrationRequest} from './registration-requests.mjs';
import {scopedDatabase, provisioningStatements, workshopId as validateWorkshopId} from './workshop-scope.mjs';
const HOUR = 3600000;
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}
function readJSON(req, max) {
  if ((req.headers['content-type'] || '').split(';')[0].trim() !== 'application/json') {
    throw new HttpError(415, 'Le format JSON est requis.');
  }
  if (req.headers['content-encoding'] && req.headers['content-encoding'] !== 'identity') {
    throw new HttpError(415, 'Le contenu compressé n’est pas accepté.');
  }
  return new Promise((resolve, reject) => {
    let size = 0, chunks = [], failed = false;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > max && !failed) { failed = true; chunks = []; reject(new HttpError(413, 'Requête trop volumineuse.')); }
      if (!failed) chunks.push(chunk);
    });
    req.on('error', reject);
    req.on('aborted', () => reject(new HttpError(400, 'Requête interrompue.')));
    req.on('end', () => {
      if (failed) return;
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!body || Array.isArray(body) || typeof body !== 'object') throw new Error();
        resolve(body);
      } catch { reject(new HttpError(400, 'JSON invalide.')); }
    });
  });
}
export function createApplication({ databasePath, origin, distPath, production = false, now = Date.now,
  sessionMs = 8 * HOUR, idleMs = HOUR / 2, notificationEnv = {}, notificationFetch = globalThis.fetch,
  notificationPollingMs = 60000, database, platformDatabase, workshopId = null, hashLimiter } = {}) {
  const url = new URL(origin);
  if (url.origin !== origin || url.username || url.password) throw new Error('APP_ORIGIN doit être une origine, sans chemin ni slash final.');
  const secure = url.protocol === 'https:';
  if (!secure && (production || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))) {
    throw new Error('HTTPS est obligatoire hors développement sur localhost.');
  }
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Origine HTTP(S) requise.');
  const db = database || openDatabase(databasePath);
  const platformDB = platformDatabase || db, children = new Map();
  function child(id) {
    if (!children.has(id)) children.set(id, createApplication({origin, distPath, production, now, sessionMs, idleMs, notificationEnv, notificationFetch, notificationPollingMs: 0, database: scopedDatabase(platformDB, id, {kind: 'node'}), platformDatabase: platformDB, workshopId: id, hashLimiter: withHash}));
    return children.get(id);
  }
  const notificationRepo = nodeNotificationRepository(db);
  const mailConfig = notificationConfiguration(notificationEnv);
  let notificationJob, notificationTimer, platformNotificationJob;
  const processOwnNotifications = () => {
    if (!notificationJob) notificationJob = deliverNotifications(notificationRepo, {
      config: mailConfig, readStore: () => workshop(),
      fetch: notificationFetch, now,
    }).finally(() => {notificationJob = undefined;});
    return notificationJob;
  };
  const processNotifications = () => {
    if (workshopId) return processOwnNotifications();
    if (!platformNotificationJob) platformNotificationJob = (async () => {
      await processOwnNotifications();
      if (mailConfig.configured) for (const row of platformDB.prepare('SELECT id FROM saas_workshops ORDER BY created_at').all()) await child(row.id).processNotifications();
    })().finally(() => {platformNotificationJob = undefined;});
    return platformNotificationJob;
  };
  const dispatchNotifications = () => {
    void processNotifications().catch(error => console.error('Traitement des notifications interrompu.', error.name));
  };
  const cookieName = secure ? '__Host-clinique_session' : 'clinique_session';
  const cookie = (value, seconds) => `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${secure ? '; Secure' : ''}`;
  const clientCookieName = secure ? '__Host-clinique_client_session' : 'clinique_client_session';
  const clientCookie = (value, seconds) => `${clientCookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${secure ? '; Secure' : ''}`;
  let hashing = 0;
  function throttle(key, max, windowMs, res) {
    const seconds = limit(db, key, max, windowMs, now());
    if (seconds) { res.setHeader('Retry-After', String(seconds)); throw new HttpError(429, 'Trop de tentatives. Réessayez plus tard.'); }
  }
  async function withHash(fn) {
    if (hashLimiter) return hashLimiter(fn);
    if (hashing >= 2) throw new HttpError(429, 'Le service est occupé. Réessayez dans un instant.');
    hashing++;
    try { return await fn(); } finally { hashing--; }
  }
  function session(req, touch = true) {
    const cookies = (req.headers.cookie || '').split(';').map(x => x.trim());
    const candidates = cookies.filter(x => x.startsWith(cookieName + '='));
    if (candidates.length !== 1) throw new HttpError(401, 'Connexion administrateur requise.');
    const value = candidates[0].slice(cookieName.length + 1);
    if (!/^[A-Za-z0-9_-]{43}$/.test(value)) throw new HttpError(401, 'Session invalide.');
    const key = digest(value);
    const row = db.prepare(`SELECT s.*, a.email, a.role FROM sessions s
      JOIN admin a ON a.id = s.admin_id WHERE token_hash = ?`).get(key);
    if (!row || row.expires_at <= now() || row.seen_at + idleMs <= now()) {
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(key);
      throw new HttpError(401, 'Votre session a expiré. Reconnectez-vous.');
    }
    if (row.role !== 'admin') throw new HttpError(403, 'Accès administrateur requis.');
    if (touch) db.prepare('UPDATE sessions SET seen_at = ? WHERE token_hash = ?').run(now(), key);
    return row;
  }
  const userView = row => ({ user: { email: row.email, role: workshopId ? 'admin' : 'super_admin', workshopId }, csrfToken: row.csrf, expiresAt: row.expires_at });
  const workshop = () => normalizeRepairStages(JSON.parse(db.prepare('SELECT data FROM workshop WHERE id = 1').get().data));
  function clientSession(req, touch = true) {
    const candidates = (req.headers.cookie || '').split(';').map(value => value.trim())
      .filter(value => value.startsWith(clientCookieName + '='));
    if (candidates.length !== 1) throw new HttpError(401, 'Connexion client requise.');
    const value = candidates[0].slice(clientCookieName.length + 1);
    if (!/^[A-Za-z0-9_-]{43}$/.test(value)) throw new HttpError(401, 'Session invalide.');
    const key = digest(value);
    const row = db.prepare(`SELECT s.*, a.email, a.enabled FROM client_sessions s
      JOIN client_accounts a ON a.client_id = s.client_id WHERE s.token_hash = ?`).get(key);
    const current = workshop();
    const client = (current.clients || []).find(item => item.id === row?.client_id);
    if (!row || !row.enabled || !client || row.expires_at <= now() || row.seen_at + idleMs <= now()) {
      db.prepare('DELETE FROM client_sessions WHERE token_hash = ?').run(key);
      throw new HttpError(401, 'Votre accès client a expiré ou a été désactivé.');
    }
    if (touch) db.prepare('UPDATE client_sessions SET seen_at = ? WHERE token_hash = ?').run(now(), key);
    return { row, client, store: current };
  }
  const handleRequest = async (req, res, parsedBody) => {
    for (const [name, value] of responseSecurityHeaders(secure)) res.setHeader(name, value);
    try {
      const pathname = new URL(req.url || '/', origin).pathname;
      if (!pathname.startsWith('/api/')) {
        if (!['GET', 'HEAD'].includes(req.method)) throw new HttpError(405, 'Méthode non autorisée.');
        if (!distPath) throw new HttpError(404, 'Interface indisponible.');
        const root = await realpath(distPath);
        let decoded;
        try { decoded = decodeURIComponent(pathname); } catch { throw new HttpError(400, 'Chemin invalide.'); }
        let filename = path.resolve(root, '.' + (decoded === '/' ? '/index.html' : decoded));
        if (!filename.startsWith(root + path.sep) || decoded.includes('\0')) throw new HttpError(404, 'Fichier introuvable.');
        try { filename = await realpath(filename); } catch { throw new HttpError(404, 'Fichier introuvable.'); }
        if (!filename.startsWith(root + path.sep) || !(await stat(filename)).isFile()) throw new HttpError(404, 'Fichier introuvable.');
        const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
        const type = types[path.extname(filename)];
        if (!type) throw new HttpError(404, 'Fichier introuvable.');
        const body = await readFile(filename);
        res.writeHead(200, { 'Content-Type': type, 'Content-Length': body.length });
        return res.end(req.method === 'HEAD' ? undefined : body);
      }
      if (req.headers['sec-fetch-site'] === 'cross-site') throw new HttpError(403, 'Requête intersite refusée.');
      const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
      if (mutation && req.headers.origin !== origin) throw new HttpError(403, 'Origine non autorisée.');
      if (!workshopId && pathname === '/api/public/registrations' && req.method === 'POST') {
        throttle('signup-ip:' + digest(req.socket.remoteAddress || 'unknown'), 5, HOUR, res);
        throttle('signup-global', 30, HOUR, res);
        const body = await readJSON(req, REGISTRATION_BODY_LIMIT), input = validateRegistrationRequest(body);
        throttle('signup-email:' + digest(input.email), 3, HOUR, res);
        // Keep existing platform and workshop accounts unchanged, with the same public answer.
        const reserved = platformDB.prepare('SELECT 1 FROM admin WHERE email=? UNION ALL SELECT 1 FROM saas_workshops WHERE email=?').get(input.email, input.email);
        if (reserved) {await withHash(() => hashPassword(input.password)); return json(res, 202, {accepted: true});}
        return json(res, 202, await submitRegistrationRequest(nodeNotificationRepository(platformDB), body, {hashPassword: value => withHash(() => hashPassword(value)), now}));
      }
      if (!workshopId) {
        let target = null;
        if (pathname === '/api/auth/login' && req.method === 'POST') {
          throttle('saas-login-global', 60, 60000, res);
          parsedBody = await readJSON(req, 4096);
          target = platformDB.prepare('SELECT id FROM saas_workshops WHERE email=?').get(email(parsedBody.email))?.id;
        } else if (pathname === '/api/client/auth/login' && req.method === 'POST') {
          parsedBody = await readJSON(req, 4096);
          if (parsedBody.workshopId != null) {
            try {target = validateWorkshopId(parsedBody.workshopId);} catch {throw new HttpError(401, 'Identifiants incorrects.');}
            if (!platformDB.prepare('SELECT 1 FROM saas_workshops WHERE id=?').get(target)) throw new HttpError(401, 'Identifiants incorrects.');
          }
        } else {
          const kind = pathname.startsWith('/api/client/') ? 'client' : 'admin';
          const name = kind === 'client' ? clientCookieName : cookieName;
          const candidates = (req.headers.cookie || '').split(';').map(x => x.trim()).filter(x => x.startsWith(name + '='));
          if (candidates.length === 1 && /^[A-Za-z0-9_-]{43}$/.test(candidates[0].slice(name.length + 1))) {
            target = platformDB.prepare('SELECT workshop_id FROM saas_session_index WHERE token_hash=? AND kind=? AND expires_at>?').get(digest(candidates[0].slice(name.length + 1)), kind, now())?.workshop_id;
          }
        }
        if (pathname.startsWith('/api/client/') && pathname !== '/api/client/auth/login' && req.headers['x-workshop-id']) {
          let declared;
          try {declared = validateWorkshopId(req.headers['x-workshop-id']);} catch {throw new HttpError(401, 'Connexion à cet atelier requise.');}
          if (declared !== target) throw new HttpError(401, 'Connexion à cet atelier requise.');
        }
        if (target) return child(target).handleRequest(req, res, parsedBody);
      }
      if (pathname === '/api/auth/login' && req.method === 'POST') {
        const ip = req.socket.remoteAddress || 'unknown'; // Do not trust arbitrary X-Forwarded-For headers.
        throttle('ip:' + digest(ip), 30, HOUR / 4, res);
        throttle('global', 60, 60000, res);
        const body = parsedBody || await readJSON(req, 4096), address = email(body.email);
        throttle('email:' + digest(address || 'invalid'), 5, HOUR / 4, res);
        const admin = db.prepare('SELECT * FROM admin WHERE id = 1').get();
        if (!admin) throw new HttpError(503, 'Le compte administrateur doit être initialisé sur le serveur.');
        const match = address === admin.email;
        const valid = await withHash(() => verifyPassword(body.password, match ? admin.password_hash : undefined));
        const current = db.prepare('SELECT password_hash FROM admin WHERE id = 1').get();
        if (!valid || !match || !current || current.password_hash !== admin.password_hash) throw new HttpError(401, 'Identifiants incorrects.');
        db.prepare('DELETE FROM limits WHERE key = ?').run('email:' + digest(address));
        db.prepare('DELETE FROM sessions WHERE expires_at <= ? OR seen_at <= ?').run(now(), now() - idleMs);
        // Bound session count without invalidating ordinary concurrent devices.
        db.prepare('DELETE FROM sessions WHERE token_hash IN (SELECT token_hash FROM sessions ORDER BY seen_at DESC LIMIT -1 OFFSET 9)').run();
        const value = token(), csrf = token(), expires = now() + sessionMs;
        db.exec('BEGIN IMMEDIATE');
        try {
        db.prepare('INSERT INTO sessions(token_hash, admin_id, csrf, expires_at, seen_at) VALUES(?, 1, ?, ?, ?)')
          .run(digest(value), csrf, expires, now());
        if (workshopId) platformDB.prepare("INSERT INTO saas_session_index(token_hash,workshop_id,kind,expires_at) VALUES(?,?,'admin',?)").run(digest(value), workshopId, expires);
        platformDB.prepare('DELETE FROM saas_session_index WHERE expires_at<=?').run(now());
        db.exec('COMMIT');
        } catch (error) {db.exec('ROLLBACK'); throw error;}
        res.setHeader('Set-Cookie', cookie(value, Math.floor(sessionMs / 1000)));
        return json(res, 200, userView({ ...admin, csrf, expires_at: expires }));
      }
      if (pathname === '/api/auth/me' && req.method === 'GET') return json(res, 200, userView(session(req, false)));
      if (pathname === '/api/client/auth/login' && req.method === 'POST') {
        const ip = req.socket.remoteAddress || 'unknown';
        throttle('client-ip:' + digest(ip), 30, HOUR / 4, res);
        throttle('client-global', 60, 60000, res);
        const body = parsedBody || await readJSON(req, 4096), address = email(body.email);
        const emailKey = 'client-email:' + digest(address || 'invalid');
        throttle(emailKey, 5, HOUR / 4, res);
        const account = db.prepare('SELECT * FROM client_accounts WHERE email = ? AND enabled = 1').get(address);
        const valid = await withHash(() => verifyPassword(body.password, account?.password_hash));
        if (!valid || !account) throw new HttpError(401, 'Identifiants incorrects.');
        db.exec('BEGIN IMMEDIATE');
        let client, value, csrf, expires;
        try {
          const current = db.prepare('SELECT * FROM client_accounts WHERE client_id = ? AND enabled = 1').get(account.client_id);
          client = (workshop().clients || []).find(item => item.id === account.client_id);
          if (!current || current.password_hash !== account.password_hash || current.email !== address || !client) {
            throw new HttpError(401, 'Identifiants incorrects.');
          }
          value = token(); csrf = token(); expires = now() + sessionMs;
          db.prepare('DELETE FROM limits WHERE key = ?').run(emailKey);
          db.prepare('DELETE FROM client_sessions WHERE expires_at <= ? OR seen_at <= ?').run(now(), now() - idleMs);
          db.prepare(`DELETE FROM client_sessions WHERE token_hash IN (SELECT token_hash FROM client_sessions
            WHERE client_id = ? ORDER BY seen_at DESC LIMIT -1 OFFSET 9)`).run(account.client_id);
          db.prepare('INSERT INTO client_sessions(token_hash, client_id, csrf, expires_at, seen_at) VALUES(?, ?, ?, ?, ?)')
            .run(digest(value), account.client_id, csrf, expires, now());
          if (workshopId) platformDB.prepare("INSERT INTO saas_session_index(token_hash,workshop_id,kind,expires_at) VALUES(?,?,'client',?)").run(digest(value), workshopId, expires);
          platformDB.prepare('DELETE FROM saas_session_index WHERE expires_at<=?').run(now());
          db.exec('COMMIT');
        } catch (error) { db.exec('ROLLBACK'); throw error; }
        res.setHeader('Set-Cookie', clientCookie(value, Math.floor(sessionMs / 1000)));
        return json(res, 200, clientUser({ ...account, csrf, expires_at: expires }, client.name));
      }
      if (pathname.startsWith('/api/client/')) {
        const clientAuth = clientSession(req, pathname !== '/api/client/auth/me');
        if (mutation && !equal(req.headers['x-csrf-token'], clientAuth.row.csrf)) {
          throw new HttpError(403, 'Jeton de protection invalide. Rechargez la page.');
        }
        if (pathname === '/api/client/auth/me' && req.method === 'GET') {
          return json(res, 200, clientUser(clientAuth.row, clientAuth.client.name));
        }
        if (pathname === '/api/client/auth/logout' && req.method === 'POST') {
          db.prepare('DELETE FROM client_sessions WHERE token_hash = ?').run(clientAuth.row.token_hash);
          platformDB.prepare('DELETE FROM saas_session_index WHERE token_hash=?').run(clientAuth.row.token_hash);
          res.setHeader('Set-Cookie', clientCookie('', 0));
          return json(res, 200, { ok: true });
        }
        if (pathname === '/api/client/portal' && req.method === 'GET') {
          return json(res, 200, clientPortal(clientAuth.store, clientAuth.row.client_id, repairTotalCost));
        }
        const availability = pathname.match(/^\/api\/client\/repairs\/([^/]+)\/parts\/([^/]+)\/available$/);
        if (availability) {
          if (req.method !== 'POST') throw new HttpError(405, 'Méthode non autorisée.');
          const body = await readJSON(req, 1024);
          const {repairId, partId} = availablePartRequest(availability[1], availability[2], body);
          let current;
          db.exec('BEGIN IMMEDIATE');
          try {
            // Re-read both the session and workshop after receiving the body.
            // The synchronous transaction also excludes concurrent admin saves.
            const fresh = clientSession(req, false);
            if (!equal(req.headers['x-csrf-token'], fresh.row.csrf)) throw new HttpError(403, 'Jeton de protection invalide. Rechargez la page.');
            current = fresh.store;
            assertAvailablePart(current, fresh.row.client_id, repairId, partId);
            if (markClientPartAvailable(current, fresh.row.client_id, repairId, partId)) {
              const previousRevision = current.revision;
              if (!Number.isSafeInteger(previousRevision) || previousRevision >= 1e9) throw new HttpError(409, 'L’atelier ne peut pas être modifié.');
              current.revision++;
              const saved = db.prepare('UPDATE workshop SET revision=?,data=? WHERE id=1 AND revision=?').run(current.revision, JSON.stringify(current), previousRevision);
              if (!saved.changes) throw new HttpError(409, 'L’atelier a changé. Actualisez votre espace client puis réessayez.');
            }
            db.exec('COMMIT');
          } catch (error) {db.exec('ROLLBACK'); throw error;}
          return json(res, 200, clientPortal(current, clientAuth.row.client_id, repairTotalCost));
        }
        throw new HttpError(404, 'Route introuvable.');
      }
      const auth = session(req, !(pathname === '/api/admin/notifications' && req.method === 'GET'));
      if (mutation && !equal(req.headers['x-csrf-token'], auth.csrf)) throw new HttpError(403, 'Jeton de protection invalide. Rechargez la page.');
      if (pathname === '/api/admin/invoice-source' && req.method === 'GET') {
        if (!equal(req.headers['x-csrf-token'], auth.csrf)) throw new HttpError(403, 'Jeton de protection invalide. Rechargez la page.');
        return json(res, 200, workshop());
      }
      if (pathname.startsWith('/api/super-admin/')) {
        if (workshopId) throw new HttpError(403, 'Accès super administrateur requis.');
        const repo = nodeNotificationRepository(platformDB);
        if (pathname === '/api/super-admin/registrations' && req.method === 'GET') {
          return json(res, 200, await listRegistrationRequests(repo, new URL(req.url, origin).searchParams.get('status') || 'all'));
        }
        const review = pathname.match(/^\/api\/super-admin\/registrations\/([^/]+)\/review$/);
        if (review && req.method === 'POST') {
          const body = await readJSON(req, 4096), at = now();
          const result = await reviewRegistrationRequest(repo, review[1], body, {now, reviewer: auth.email,
            guard: {sql: "EXISTS(SELECT 1 FROM sessions s JOIN admin a ON a.id=s.admin_id WHERE s.token_hash=? AND s.csrf=? AND s.expires_at>? AND s.seen_at>? AND a.role='admin')", values: [auth.token_hash, auth.csrf, at, at - idleMs]},
            approvalStatements: (row, approval) => {
              if (platformDB.prepare('SELECT 1 FROM admin WHERE email=?').get(row.email)) throw new HttpError(409, 'Cette adresse possède déjà un compte.');
              const store = emptyStore(); store.settings.workshop = row.workshop_name; store.settings.owner = row.name.slice(0,80);
              return provisioningStatements(row, {...approval, store}, 'node');
            },
          });
          return json(res, 200, result);
        }
        throw new HttpError(404, 'Route introuvable.');
      }
      if (pathname === '/api/auth/logout' && req.method === 'POST') {
        db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(auth.token_hash);
        platformDB.prepare('DELETE FROM saas_session_index WHERE token_hash=?').run(auth.token_hash);
        res.setHeader('Set-Cookie', cookie('', 0));
        return json(res, 200, { ok: true });
      }
      if (pathname === '/api/auth/password' && req.method === 'POST') {
        throttle('password:' + auth.admin_id, 5, HOUR / 4, res);
        const body = await readJSON(req, 4096);
        try { checkPassword(body.newPassword); } catch (error) { throw new HttpError(400, error.message); }
        const admin = db.prepare('SELECT password_hash FROM admin WHERE id = 1').get();
        const encoded = await withHash(async () => {
          if (!await verifyPassword(body.currentPassword, admin.password_hash)) throw new HttpError(400, 'Mot de passe actuel incorrect.');
          return hashPassword(body.newPassword);
        });
        db.exec('BEGIN IMMEDIATE');
        try {
          // Recheck the session and old hash after the asynchronous password computation.
          session(req, false);
          const changed = db.prepare('UPDATE admin SET password_hash = ? WHERE id = 1 AND password_hash = ?').run(encoded, admin.password_hash);
          if (!changed.changes) throw new HttpError(409, 'Le compte a changé. Reconnectez-vous.');
          db.prepare('DELETE FROM sessions').run();
          db.exec('COMMIT');
        } catch (error) { db.exec('ROLLBACK'); throw error; }
        res.setHeader('Set-Cookie', cookie('', 0));
        return json(res, 200, { ok: true });
      }
      const accessRoute = pathname.match(/^\/api\/admin\/client-access\/([^/]+)$/);
      if (accessRoute) {
        let clientId;
        try { clientId = decodeURIComponent(accessRoute[1]); } catch { throw new HttpError(400, 'Client invalide.'); }
        if (!(workshop().clients || []).some(item => item.id === clientId)) throw new HttpError(404, 'Client introuvable.');
        if (req.method === 'GET') {
          return json(res, 200, { access: clientAccess(db.prepare('SELECT * FROM client_accounts WHERE client_id = ?').get(clientId)) });
        }
        if (req.method === 'POST') {
          throttle('client-access:' + auth.admin_id, 30, HOUR / 4, res);
          const body = parsedBody || await readJSON(req, 4096), address = email(body.email);
          if (!address) throw new HttpError(400, 'Adresse e-mail invalide.');
          if (address === db.prepare('SELECT email FROM admin WHERE id = 1').get()?.email) {
            throw new HttpError(400, 'L’adresse administrateur ne peut pas servir d’accès client.');
          }
          try { checkPassword(body.password); } catch (error) { throw new HttpError(400, error.message); }
          const encoded = await withHash(() => hashPassword(body.password));
          db.exec('BEGIN IMMEDIATE');
          try {
            session(req, false);
            if (!(workshop().clients || []).some(item => item.id === clientId)) throw new HttpError(404, 'Client introuvable.');
            if (address === db.prepare('SELECT email FROM admin WHERE id = 1').get()?.email) throw new HttpError(400, 'Adresse administrateur réservée.');
            const duplicate = db.prepare('SELECT client_id FROM client_accounts WHERE email = ? AND client_id != ?').get(address, clientId);
            if (duplicate) throw new HttpError(409, 'Cette adresse possède déjà un accès client.');
            db.prepare(`INSERT INTO client_accounts(client_id,email,password_hash,enabled,created_at,updated_at) VALUES(?,?,?,1,?,?)
              ON CONFLICT(client_id) DO UPDATE SET email=excluded.email,password_hash=excluded.password_hash,enabled=1,updated_at=excluded.updated_at`)
              .run(clientId, address, encoded, now(), now());
            db.prepare('DELETE FROM client_sessions WHERE client_id = ?').run(clientId);
            db.exec('COMMIT');
          } catch (error) { db.exec('ROLLBACK'); throw error; }
          return json(res, 200, { access: clientAccess(db.prepare('SELECT * FROM client_accounts WHERE client_id = ?').get(clientId)) });
        }
        if (req.method === 'DELETE') {
          db.exec('BEGIN IMMEDIATE');
          try {
            session(req, false);
            db.prepare('UPDATE client_accounts SET enabled=0,updated_at=? WHERE client_id=?').run(now(), clientId);
            db.prepare('DELETE FROM client_sessions WHERE client_id = ?').run(clientId);
            db.exec('COMMIT');
          } catch (error) { db.exec('ROLLBACK'); throw error; }
          return json(res, 200, { access: clientAccess(db.prepare('SELECT * FROM client_accounts WHERE client_id = ?').get(clientId)) });
        }
        throw new HttpError(405, 'Méthode non autorisée.');
      }
      if (pathname === '/api/store' && req.method === 'GET') {
        return json(res, 200, workshop());
      }
      const notificationResponse = await notificationAdminRequest({
        pathname, method: req.method, searchParams: new URL(req.url, origin).searchParams,
        readJSON: max => readJSON(req, max), repo: notificationRepo, config: mailConfig,
        tokenHash: auth.token_hash, idleMs, now, dispatch: dispatchNotifications,
      });
      if (notificationResponse) return json(res, 200, notificationResponse);
      if (pathname === '/api/store' && req.method === 'PUT') {
        const body = await readJSON(req, 20 * 1024 * 1024);
        session(req, false); // Authentication may expire while a large upload is arriving.
        if (!Number.isSafeInteger(body.revision) || body.revision < 0 || body.revision >= 1e9) throw new HttpError(400, 'Révision invalide.');
        let data;
        try { data = validateStore(body.data); } catch (error) { throw new HttpError(400, error.message); }
        // Older bundles discard client fields during normalization; never let them overwrite the new model.
        if (!Array.isArray(body.data?.clients) || (mailConfig.configured && body.mode === undefined)) throw new HttpError(409, 'Votre version de l’atelier est ancienne. Rechargez la page avant de modifier les données.');
        const mode = body.mode === undefined ? 'edit' : body.mode;
        if (!['edit', 'restore', 'reset'].includes(mode)) throw new HttpError(400, 'Mode de sauvegarde invalide.');
        data.revision = body.revision + 1;
        db.exec('BEGIN IMMEDIATE');
        try {
          session(req, false);
          const before = workshop();
          // Legacy bundles strip the new price field; a deliberate reset uses null.
          const missingInterventionCosts = new Set(data.repairs.filter(repair => repair.interventionCost === undefined).map(repair => repair.id));
          if (mode === 'edit' && before.repairs.some(repair => repair.interventionCost != null
            && missingInterventionCosts.has(repair.id))) {
            throw new HttpError(409, 'Votre version de l’atelier est ancienne. Rechargez la page avant de modifier les coûts d’intervention.');
          }
          // A payment is cleared explicitly with null, never by a bundle that omits the field.
          const missingPayments = new Set(data.repairs.filter(repair => repair.payment === undefined).map(repair => repair.id));
          if (mode === 'edit' && before.repairs.some(repair => repair.payment != null
            && missingPayments.has(repair.id))) {
            throw new HttpError(409, 'Votre version de l’atelier est ancienne. Rechargez la page avant de modifier les paiements.');
          }
          // Clearing client-supplied parts is explicit with []; older editors omit the field.
          const missingClientParts = new Set(data.repairs.filter(repair => repair.clientParts === undefined).map(repair => repair.id));
          if (mode === 'edit' && before.repairs.some(repair => repair.clientParts?.length
            && missingClientParts.has(repair.id))) {
            throw new HttpError(409, 'Votre version de l’atelier est ancienne. Rechargez la page avant de modifier les pièces demandées au client.');
          }
          const notifications = mode === 'edit' && mailConfig.configured
            ? repairNotifications(before, data, {origin: mailConfig.portalOrigin, workshopId, now: now()}) : [];
          const changed = db.prepare('UPDATE workshop SET revision = ?, data = ? WHERE id = 1 AND revision = ?')
            .run(data.revision, JSON.stringify(data), body.revision);
          if (!changed.changes) throw new HttpError(409, 'L’atelier a changé dans une autre session. Rechargez les données avant de réessayer.');
          for (const batch of notificationBatches(notifications)) db.prepare(insertNotificationsSQL).run(batch);
          if (mode !== 'edit') db.prepare(`UPDATE repair_notifications SET status='cancelled',claim_token='',lease_until=0,
            error='L’atelier a été restauré ou réinitialisé.' WHERE status='pending'`).run();
          db.prepare(`UPDATE client_accounts SET enabled=0,updated_at=? WHERE enabled=1
            AND client_id NOT IN (SELECT value FROM json_each(?))`).run(now(), JSON.stringify(data.clients.map(client => client.id)));
          db.prepare('DELETE FROM client_sessions WHERE client_id IN (SELECT client_id FROM client_accounts WHERE enabled=0)').run();
          db.exec('COMMIT');
        } catch (error) { db.exec('ROLLBACK'); throw error; }
        dispatchNotifications();
        return json(res, 200, data);
      }
      throw new HttpError(404, 'Route introuvable.');
    } catch (error) {
      const status = error instanceof HttpError || error instanceof NotificationError || error instanceof RegistrationError || error instanceof ClientPartAvailabilityError ? error.status : 500;
      if (status === 500) console.error('Erreur interne de l’API', error.code || error.name); // Never log request bodies, passwords or cookies.
      if (!res.headersSent && !res.destroyed) json(res, status, { error: status === 500 ? 'Erreur interne du serveur.' : error.message });
    }
  };
  const server = createServer((req,res) => handleRequest(req,res));
  server.requestTimeout = 30000;
  server.headersTimeout = 10000;
  server.on('listening', () => {
    if (mailConfig.configured && notificationPollingMs > 0) {
      dispatchNotifications();
      notificationTimer = setInterval(dispatchNotifications, notificationPollingMs);
      notificationTimer.unref();
    }
  });
  server.on('close', () => {
    clearInterval(notificationTimer);
    if (database) return;
    const pendingJob = platformNotificationJob || notificationJob;
    if (pendingJob) void pendingJob.finally(() => db.close()).catch(() => {});
    else db.close();
  });
  return { server, db, processNotifications, handleRequest };
}
