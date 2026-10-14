import { token, digest, equal, email, checkPassword, hashPassword, verifyPassword } from './security.mjs';
import { initWorkshop, limit, readWorkshop as readStoredWorkshop, saveWorkshop, saveClientWorkshop, saveRegistrationWorkshop, StoreSizeError } from './database.mjs';
import { validateStore, normalizeRepairStages, emptyStore, repairTotalCost, markClientPartAvailable, createClient } from '../src/domain.ts';
import {validateIntakeInput, createPublicRepair, publicIntakeSettings, publicRepairPackages} from '../src/repair-intake-domain.ts';
import {REPAIR_INTAKE_BODY_LIMIT, RepairIntakeError, registrationIntakeRequest, intakeRequest, repairIntakeId, repairIntakeSheet, assertIntakeMetadataPreserved} from '../server/repair-intake.mjs';
import { clientPortal, clientAccess, clientUser } from '../server/client-portal.mjs';
import {ClientPartAvailabilityError, availablePartRequest, assertAvailablePart} from '../server/client-part-availability.mjs';
import { repairNotifications } from '../server/repair-notifications.mjs';
import { notificationConfiguration, deliverNotifications } from '../server/notification-delivery.mjs';
import { d1NotificationRepository } from '../server/notification-storage.mjs';
import { notificationAdminRequest, NotificationError } from '../server/notification-admin.mjs';
import { responseSecurityHeaders } from '../server/response-security.mjs';
import { publicAsset, publicPageRedirect } from '../server/public-assets.mjs';

import {REGISTRATION_BODY_LIMIT, RegistrationError, validateRegistrationRequest, submitRegistrationRequest, listRegistrationRequests, reviewRegistrationRequest} from '../server/registration-requests.mjs';
import {scopedDatabase, provisioningStatements, workshopId as validateWorkshopId} from '../server/workshop-scope.mjs';

const HOUR = 3600000;
const SESSION_MS = 8 * HOUR;
const IDLE_MS = HOUR / 2;
let hashing = 0;

// Normalize legacy repair stages without writing or incrementing the stored revision.
const readWorkshop = async db => normalizeRepairStages(await readStoredWorkshop(db));

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function json(headers, status, data) {
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data), { status, headers });
}

async function readJSON(request, max) {
  const type = (request.headers.get('Content-Type') || '').split(';');
  if (type[0].trim().toLowerCase() !== 'application/json' ||
      type.slice(1).some(part => /^\s*charset\s*=/i.test(part) &&
        !/^\s*charset\s*=\s*(?:utf-8|"utf-8")\s*$/i.test(part))) {
    throw new HttpError(415, 'Le format JSON UTF-8 est requis.');
  }
  const encoding = request.headers.get('Content-Encoding');
  if (encoding && encoding.trim().toLowerCase() !== 'identity') {
    throw new HttpError(415, 'Le contenu compressé n’est pas accepté.');
  }
  const length = request.headers.get('Content-Length');
  if (length !== null && (!/^\d+$/.test(length) || !Number.isSafeInteger(Number(length)))) {
    throw new HttpError(400, 'Taille de requête invalide.');
  }
  if (length !== null && Number(length) > max) throw new HttpError(413, 'Requête trop volumineuse.');
  if (!request.body) throw new HttpError(400, 'JSON invalide.');
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel().catch(() => {});
        throw new HttpError(413, 'Requête trop volumineuse.');
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'Requête interrompue.');
  } finally {
    reader.releaseLock();
  }
  try {
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!body || Array.isArray(body) || typeof body !== 'object') throw new Error();
    return body;
  } catch {
    throw new HttpError(400, 'JSON invalide.');
  }
}

function validateOrigin(url, env) {
  const secure = url.protocol === 'https:';
  if (!secure && !(url.protocol === 'http:' && env.LOCAL_DEV === 'true' &&
      ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))) {
    throw new HttpError(403, 'HTTPS est obligatoire.');
  }
  let configured;
  if (env.APP_ORIGIN) {
    const app = new URL(env.APP_ORIGIN);
    if (app.origin !== env.APP_ORIGIN || app.username || app.password ||
        !['https:', 'http:'].includes(app.protocol) ||
        (app.protocol !== 'https:' && !(env.LOCAL_DEV === 'true' &&
          ['127.0.0.1', 'localhost', '[::1]'].includes(app.hostname)))) {
      throw new Error('Invalid application origin configuration.');
    }
    configured = app.origin;
  }
  return { secure, configured };
}

async function withHash(fn) {
  // One memory-hard hash at a time fits the Workers isolate memory budget.
  if (hashing >= 1) throw new HttpError(429, 'Le service est occupé. Réessayez dans un instant.');
  hashing++;
  try { return await fn(); } finally { hashing--; }
}

const userView = (row, workshopId) => ({
  user: { email: row.email, role: workshopId ? 'admin' : 'super_admin', workshopId }, csrfToken: row.csrf, expiresAt: row.expires_at,
});

async function handle(request, env, headers, url, secure, configured, context) {
  const pathname = url.pathname;
  if (!pathname.startsWith('/api/')) {
    if (!['GET', 'HEAD'].includes(request.method)) throw new HttpError(405, 'Méthode non autorisée.');
    let permitted, redirect;
    try { redirect = publicPageRedirect(request.url); permitted = publicAsset(request.url); } catch { throw new HttpError(400, 'Chemin invalide.'); }
    if (redirect) return new Response(null, {status: 308, headers: responseSecurityHeaders(secure, {Location: redirect})});
    if (!permitted) throw new HttpError(404, 'Fichier introuvable.');
    if (!env.ASSETS) throw new HttpError(404, 'Interface indisponible.');
    // Assets HTML handling is disabled. The shared manifest chooses the exact
    // filename, so canonical clean URLs never depend on provider redirects.
    const assetUrl = new URL(request.url);
    assetUrl.pathname = permitted.pathname;
    const asset = await env.ASSETS.fetch(new Request(assetUrl, request));
    const assetHeaders = responseSecurityHeaders(secure, asset.headers);
    if (asset.status === 200) assetHeaders.set('Content-Type', permitted.contentType);
    return new Response(request.method === 'HEAD' ? null : asset.body, {
      status: asset.status, statusText: asset.statusText, headers: assetHeaders,
    });
  }

  if (request.headers.get('Sec-Fetch-Site') === 'cross-site') {
    throw new HttpError(403, 'Requête intersite refusée.');
  }
  const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
  // The platform request URL is authoritative; forwarded Host headers are never used.
  const origin = request.headers.get('Origin');
  if (mutation && (origin !== url.origin || (configured && origin !== configured))) {
    throw new HttpError(403, 'Origine non autorisée.');
  }
  if (!env.DB) throw new HttpError(503, 'Service indisponible.');
  const platformDB = env.DB;
  let db = platformDB, workshopId = null, parsedBody;
  const adminCookieName = secure ? '__Host-clinique_session' : 'clinique_session';
  const portalCookieName = secure ? '__Host-clinique_client_session' : 'clinique_client_session';
  const globalThrottle = async (key, max, windowMs) => {
    const seconds = await limit(platformDB, key, max, windowMs, Date.now());
    if (seconds) {headers.set('Retry-After', String(seconds)); throw new HttpError(429, 'Trop de tentatives. Réessayez plus tard.');}
  };
  if (pathname === '/api/public/registrations' && request.method === 'POST') {
    const ip = env.LOCAL_DEV !== 'true' && request.cf && typeof request.cf === 'object' ? request.headers.get('CF-Connecting-IP') || 'unknown' : 'unknown';
    await globalThrottle('signup-ip:' + await digest(ip), 5, HOUR);
    await globalThrottle('signup-global', 30, HOUR);
    const body = await readJSON(request, REGISTRATION_BODY_LIMIT), input = validateRegistrationRequest(body);
    await globalThrottle('signup-email:' + await digest(input.email), 3, HOUR);
    const reserved = await platformDB.prepare('SELECT 1 FROM admin WHERE email=? UNION ALL SELECT 1 FROM saas_workshops WHERE email=?').bind(input.email, input.email).first();
    if (reserved) {await withHash(() => hashPassword(input.password)); return json(headers, 202, {accepted: true});}
    return json(headers, 202, await submitRegistrationRequest(d1NotificationRepository(platformDB), body, {hashPassword: value => withHash(() => hashPassword(value))}));
  }
  if (pathname === '/api/auth/login' && request.method === 'POST') {
    await globalThrottle('saas-login-global', 60, 60000);
    parsedBody = await readJSON(request, 4096);
    workshopId = (await platformDB.prepare('SELECT id FROM saas_workshops WHERE email=?').bind(email(parsedBody.email)).first())?.id || null;
  } else if (pathname === '/api/client/auth/login' && request.method === 'POST') {
    parsedBody = await readJSON(request, 4096);
    if (parsedBody.workshopId != null) {
      try {workshopId = validateWorkshopId(parsedBody.workshopId);} catch {throw new HttpError(401, 'Identifiants incorrects.');}
      if (!await platformDB.prepare('SELECT 1 FROM saas_workshops WHERE id=?').bind(workshopId).first()) throw new HttpError(401, 'Identifiants incorrects.');
    }
  } else if (!pathname.startsWith('/api/public/repair-intake')) {
    const kind = pathname.startsWith('/api/client/') ? 'client' : 'admin', name = kind === 'client' ? portalCookieName : adminCookieName;
    const candidates = (request.headers.get('Cookie') || '').split(';').map(x => x.trim()).filter(x => x.startsWith(name + '='));
    if (candidates.length === 1 && /^[A-Za-z0-9_-]{43}$/.test(candidates[0].slice(name.length + 1))) {
      workshopId = (await platformDB.prepare('SELECT workshop_id FROM saas_session_index WHERE token_hash=? AND kind=? AND expires_at>?').bind(await digest(candidates[0].slice(name.length + 1)), kind, Date.now()).first())?.workshop_id || null;
    }
  }
  if (pathname.startsWith('/api/client/') && pathname !== '/api/client/auth/login' && request.headers.get('X-Workshop-ID')) {
    let declared;
    try {declared = validateWorkshopId(request.headers.get('X-Workshop-ID'));} catch {throw new HttpError(401, 'Connexion à cet atelier requise.');}
    if (declared !== workshopId) throw new HttpError(401, 'Connexion à cet atelier requise.');
  }
  if (workshopId) db = scopedDatabase(platformDB, workshopId, {kind: 'd1'});
  await initWorkshop(db);
  const notificationRepo = d1NotificationRepository(db);
  const mailConfig = notificationConfiguration(env);
  const dispatchNotifications = () => {
    const task = deliverNotifications(notificationRepo, {config: mailConfig, readStore: () => readWorkshop(db), limit: 2})
      .catch(error => console.error('Traitement des notifications interrompu.', error.name));
    if (context?.waitUntil) context.waitUntil(task);
  };

  const cookieName = secure ? '__Host-clinique_session' : 'clinique_session';
  const cookie = (value, seconds) => `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${secure ? '; Secure' : ''}`;
  const clientCookieName = secure ? '__Host-clinique_client_session' : 'clinique_client_session';
  const clientCookie = (value, seconds) => `${clientCookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${secure ? '; Secure' : ''}`;
  const throttle = async (key, max, windowMs) => {
    const seconds = await limit(db, key, max, windowMs, Date.now());
    if (seconds) {
      headers.set('Retry-After', String(seconds));
      throw new HttpError(429, 'Trop de tentatives. Réessayez plus tard.');
    }
  };
  async function session(touch = true) {
    const candidates = (request.headers.get('Cookie') || '').split(';')
      .map(value => value.trim()).filter(value => value.startsWith(cookieName + '='));
    if (candidates.length !== 1) throw new HttpError(401, 'Connexion administrateur requise.');
    const value = candidates[0].slice(cookieName.length + 1);
    if (!/^[A-Za-z0-9_-]{43}$/.test(value)) throw new HttpError(401, 'Session invalide.');
    const key = await digest(value);
    const row = await db.prepare(`SELECT s.*, a.email, a.role FROM sessions s
      JOIN admin a ON a.id = s.admin_id WHERE s.token_hash = ?`).bind(key).first();
    const at = Date.now();
    if (!row || row.expires_at <= at || row.seen_at + IDLE_MS <= at) {
      await db.prepare('DELETE FROM sessions WHERE token_hash = ? AND (expires_at <= ? OR seen_at <= ?)')
        .bind(key, at, at - IDLE_MS).run();
      throw new HttpError(401, 'Votre session a expiré. Reconnectez-vous.');
    }
    if (row.role !== 'admin') throw new HttpError(403, 'Accès administrateur requis.');
    if (touch) {
      const changed = await db.prepare(`UPDATE sessions SET seen_at = MAX(seen_at, ?)
        WHERE token_hash = ? AND expires_at > ? AND seen_at > ?
        AND EXISTS (SELECT 1 FROM admin WHERE admin.id = sessions.admin_id AND role = 'admin')`)
        .bind(at, key, at, at - IDLE_MS).run();
      if (changed.meta?.changes !== 1) throw new HttpError(401, 'Votre session a expiré. Reconnectez-vous.');
    }
    return row;
  }
  async function clientSession(touch = true) {
    const candidates = (request.headers.get('Cookie') || '').split(';').map(value => value.trim())
      .filter(value => value.startsWith(clientCookieName + '='));
    if (candidates.length !== 1) throw new HttpError(401, 'Connexion client requise.');
    const value = candidates[0].slice(clientCookieName.length + 1);
    if (!/^[A-Za-z0-9_-]{43}$/.test(value)) throw new HttpError(401, 'Session invalide.');
    const key = await digest(value), at = Date.now();
    const row = await db.prepare(`SELECT s.*, a.email, a.enabled FROM client_sessions s
      JOIN client_accounts a ON a.client_id = s.client_id WHERE s.token_hash = ?`).bind(key).first();
    if (!row || !row.enabled || row.expires_at <= at || row.seen_at + IDLE_MS <= at) {
      await db.prepare('DELETE FROM client_sessions WHERE token_hash = ? AND (expires_at <= ? OR seen_at <= ? OR client_id IN (SELECT client_id FROM client_accounts WHERE enabled=0))')
        .bind(key, at, at - IDLE_MS).run();
      throw new HttpError(401, 'Votre accès client a expiré ou a été désactivé.');
    }
    const store = await readWorkshop(db), client = (store.clients || []).find(item => item.id === row.client_id);
    if (!client) {
      await db.prepare('DELETE FROM client_sessions WHERE token_hash = ?').bind(key).run();
      throw new HttpError(401, 'Votre accès client a été désactivé.');
    }
    // Recheck after reading the workshop: reset and disable requests revoke
    // existing sessions in the same transaction as the account change.
    const checkedAt = Date.now();
    if (touch) {
      const changed = await db.prepare(`UPDATE client_sessions SET seen_at = MAX(seen_at, ?)
        WHERE token_hash=? AND expires_at>? AND seen_at>?
        AND EXISTS (SELECT 1 FROM client_accounts a WHERE a.client_id=client_sessions.client_id AND a.enabled=1)`)
        .bind(checkedAt, key, checkedAt, checkedAt - IDLE_MS).run();
      if (changed.meta?.changes !== 1) throw new HttpError(401, 'Votre accès client a été désactivé.');
    } else {
      const current = await db.prepare(`SELECT 1 FROM client_sessions s JOIN client_accounts a ON a.client_id=s.client_id
        WHERE s.token_hash=? AND s.expires_at>? AND s.seen_at>? AND a.enabled=1`).bind(key, checkedAt, checkedAt - IDLE_MS).first();
      if (!current) throw new HttpError(401, 'Votre accès client a été désactivé.');
    }
    return { row, client, store };
  }

  if (pathname.startsWith('/api/public/repair-intake')) {
    if (request.headers.get('X-Workshop-ID')) throw new HttpError(403, 'Origine de la demande invalide.');
    if (pathname === '/api/public/repair-intake' && request.method === 'GET') {
      const current = await readWorkshop(db);
      return json(headers, 200, {shop: publicIntakeSettings(current), repairPackages: publicRepairPackages(current)});
    }
    if (pathname === '/api/public/repair-intake/register' && request.method === 'POST') {
      const ip = env.LOCAL_DEV !== 'true' && request.cf && typeof request.cf === 'object' ? request.headers.get('CF-Connecting-IP') || 'unknown' : 'unknown';
      await globalThrottle('repair-signup-ip:' + await digest(ip), 5, HOUR);
      await globalThrottle('repair-signup-global', 30, HOUR);
      const input = registrationIntakeRequest(await readJSON(request, REPAIR_INTAKE_BODY_LIMIT), {validateIntakeInput, email, checkPassword});
      await globalThrottle('repair-signup-email:' + await digest(input.customer.email), 3, HOUR);
      const encoded = await withHash(() => hashPassword(input.password));
      const current = await readWorkshop(db), previousRevision = current.revision;
      const reserved = await db.prepare('SELECT 1 FROM client_accounts WHERE email=? UNION ALL SELECT 1 FROM admin WHERE email=? UNION ALL SELECT 1 FROM saas_workshops WHERE email=?')
        .bind(input.customer.email, input.customer.email, input.customer.email).first();
      if (reserved) throw new HttpError(409, 'Cette adresse possède déjà un accès. Connectez-vous avec votre compte existant.');
      const client = createClient(current, input.customer);
      const {repair} = createPublicRepair(current, client.id, input.intake);
      validateStore(current);
      const value = token(), csrf = token(), key = await digest(value), at = Date.now(), expires = at + SESSION_MS;
      const changed = await saveRegistrationWorkshop(db, {expectedRevision: previousRevision, data: current, tokenHash: key, now: at,
        registration: {clientId: client.id, email: input.customer.email, passwordHash: encoded, csrf, expiresAt: expires}});
      if (!changed) {
        const duplicate = await db.prepare('SELECT 1 FROM client_accounts WHERE email=? UNION ALL SELECT 1 FROM admin WHERE email=? UNION ALL SELECT 1 FROM saas_workshops WHERE email=?')
          .bind(input.customer.email, input.customer.email, input.customer.email).first();
        if (duplicate) throw new HttpError(409, 'Cette adresse possède déjà un accès. Connectez-vous avec votre compte existant.');
        throw new HttpError(409, 'L’atelier a changé. Réessayez votre demande.');
      }
      headers.set('Set-Cookie', clientCookie(value, Math.floor(SESSION_MS / 1000)));
      return json(headers, 201, {session: clientUser({email: input.customer.email, client_id: client.id, csrf, expires_at: expires}, client.name), repairId: repair.id, repairCode: repair.code});
    }
    throw new HttpError(404, 'Route introuvable.');
  }

  if (pathname === '/api/auth/login' && request.method === 'POST') {
    // CF-Connecting-IP is trusted only when the request has Cloudflare platform metadata.
    const ip = env.LOCAL_DEV !== 'true' && request.cf && typeof request.cf === 'object'
      ? request.headers.get('CF-Connecting-IP') || 'unknown' : 'unknown';
    await throttle('ip:' + await digest(ip), 30, HOUR / 4);
    await throttle('global', 60, 60000);
    const body = parsedBody || await readJSON(request, 4096);
    const address = email(body.email);
    const emailKey = 'email:' + await digest(address || 'invalid');
    await throttle(emailKey, 5, HOUR / 4);
    const admin = await db.prepare('SELECT * FROM admin WHERE id = 1').first();
    if (!admin) throw new HttpError(503, 'Le compte administrateur doit être initialisé sur le serveur.');
    const match = address === admin.email;
    const valid = await withHash(() => verifyPassword(body.password, match ? admin.password_hash : undefined));
    if (!valid || !match || admin.role !== 'admin') throw new HttpError(401, 'Identifiants incorrects.');
    const value = token(), csrf = token(), key = await digest(value);
    const at = Date.now(), expires = at + SESSION_MS;
    const results = await db.batch([
      // A concurrent password change cannot issue a session for the previous hash.
      db.prepare(`INSERT INTO sessions(token_hash, admin_id, csrf, expires_at, seen_at)
        SELECT ?, id, ?, ?, ? FROM admin WHERE id = 1 AND password_hash = ? AND role = 'admin'`)
        .bind(key, csrf, expires, at, admin.password_hash),
      ...(workshopId ? [db.prepare("INSERT INTO saas_session_index(token_hash,workshop_id,kind,expires_at) SELECT ?,?,'admin',? WHERE EXISTS(SELECT 1 FROM sessions WHERE token_hash=?)").bind(key, workshopId, expires, key)] : []),
      platformDB.prepare('DELETE FROM saas_session_index WHERE expires_at<=?').bind(at),
      db.prepare('DELETE FROM limits WHERE key = ? AND EXISTS (SELECT 1 FROM sessions WHERE token_hash = ?)')
        .bind(emailKey, key),
      db.prepare('DELETE FROM sessions WHERE expires_at <= ? OR seen_at <= ?').bind(at, at - IDLE_MS),
      db.prepare(`DELETE FROM sessions WHERE token_hash IN (
        SELECT token_hash FROM sessions ORDER BY (token_hash = ?) DESC, seen_at DESC LIMIT -1 OFFSET 10
      ) AND EXISTS (SELECT 1 FROM sessions WHERE token_hash = ?)`).bind(key, key),
    ]);
    if (results[0].meta?.changes !== 1) throw new HttpError(401, 'Identifiants incorrects.');
    headers.set('Set-Cookie', cookie(value, Math.floor(SESSION_MS / 1000)));
    return json(headers, 200, userView({ ...admin, csrf, expires_at: expires }, workshopId));
  }
  if (pathname === '/api/auth/me' && request.method === 'GET') {
    return json(headers, 200, userView(await session(false), workshopId));
  }
  if (pathname === '/api/client/auth/login' && request.method === 'POST') {
    const ip = env.LOCAL_DEV !== 'true' && request.cf && typeof request.cf === 'object'
      ? request.headers.get('CF-Connecting-IP') || 'unknown' : 'unknown';
    await throttle('client-ip:' + await digest(ip), 30, HOUR / 4);
    await throttle('client-global', 60, 60000);
    const body = parsedBody || await readJSON(request, 4096), address = email(body.email);
    const emailKey = 'client-email:' + await digest(address || 'invalid');
    await throttle(emailKey, 5, HOUR / 4);
    const account = await db.prepare('SELECT * FROM client_accounts WHERE email=? AND enabled=1').bind(address).first();
    const valid = await withHash(() => verifyPassword(body.password, account?.password_hash));
    if (!valid || !account) throw new HttpError(401, 'Identifiants incorrects.');
    const store = await readWorkshop(db), client = (store.clients || []).find(item => item.id === account.client_id);
    if (!client) throw new HttpError(401, 'Identifiants incorrects.');
    const value = token(), csrf = token(), key = await digest(value), at = Date.now(), expires = at + SESSION_MS;
    const results = await db.batch([
      db.prepare(`INSERT INTO client_sessions(token_hash,client_id,csrf,expires_at,seen_at)
        SELECT ?,client_id,?,?,? FROM client_accounts WHERE client_id=? AND email=? AND password_hash=? AND enabled=1
        AND EXISTS (SELECT 1 FROM workshop WHERE id=1 AND revision=?)`)
        .bind(key, csrf, expires, at, account.client_id, address, account.password_hash, store.revision),
      ...(workshopId ? [db.prepare("INSERT INTO saas_session_index(token_hash,workshop_id,kind,expires_at) SELECT ?,?,'client',? WHERE EXISTS(SELECT 1 FROM client_sessions WHERE token_hash=?)").bind(key, workshopId, expires, key)] : []),
      platformDB.prepare('DELETE FROM saas_session_index WHERE expires_at<=?').bind(at),
      db.prepare('DELETE FROM limits WHERE key=? AND EXISTS (SELECT 1 FROM client_sessions WHERE token_hash=?)').bind(emailKey, key),
      db.prepare('DELETE FROM client_sessions WHERE expires_at<=? OR seen_at<=?').bind(at, at - IDLE_MS),
      db.prepare(`DELETE FROM client_sessions WHERE token_hash IN (SELECT token_hash FROM client_sessions WHERE client_id=?
        ORDER BY (token_hash=?) DESC,seen_at DESC LIMIT -1 OFFSET 10)
        AND EXISTS (SELECT 1 FROM client_sessions WHERE token_hash=?)`).bind(account.client_id, key, key),
    ]);
    if (results[0].meta?.changes !== 1) throw new HttpError(401, 'Identifiants incorrects.');
    headers.set('Set-Cookie', clientCookie(value, Math.floor(SESSION_MS / 1000)));
    return json(headers, 200, clientUser({ ...account, csrf, expires_at: expires }, client.name));
  }
  if (pathname.startsWith('/api/client/')) {
    const clientAuth = await clientSession(!['/api/client/auth/me', '/api/client/repair-intake/session'].includes(pathname));
    if (mutation && !equal(request.headers.get('X-CSRF-Token'), clientAuth.row.csrf)) {
      throw new HttpError(403, 'Jeton de protection invalide. Rechargez la page.');
    }
    if (pathname === '/api/client/auth/me' && request.method === 'GET') {
      return json(headers, 200, clientUser(clientAuth.row, clientAuth.client.name));
    }
    if (pathname === '/api/client/repair-intake/session' && request.method === 'GET') {
      if (workshopId) throw new HttpError(401, 'Connexion au compte client RépaRapid requise.');
      return json(headers, 200, clientUser(clientAuth.row, clientAuth.client.name));
    }
    if (pathname === '/api/client/auth/logout' && request.method === 'POST') {
      await db.batch([db.prepare('DELETE FROM client_sessions WHERE token_hash=?').bind(clientAuth.row.token_hash), db.prepare('DELETE FROM saas_session_index WHERE token_hash=?').bind(clientAuth.row.token_hash)]);
      headers.set('Set-Cookie', clientCookie('', 0));
      return json(headers, 200, { ok: true });
    }
    if (pathname === '/api/client/portal' && request.method === 'GET') {
      return json(headers, 200, clientPortal(clientAuth.store, clientAuth.row.client_id, repairTotalCost));
    }
    if (pathname === '/api/client/repair-intake' && request.method === 'POST') {
      if (workshopId) throw new HttpError(404, 'Route introuvable.');
      await throttle('repair-intake-client:' + await digest(clientAuth.row.client_id), 10, HOUR);
      const input = intakeRequest(await readJSON(request, REPAIR_INTAKE_BODY_LIMIT), validateIntakeInput);
      const fresh = await clientSession(false);
      if (!equal(request.headers.get('X-CSRF-Token'), fresh.row.csrf)) throw new HttpError(403, 'Jeton de protection invalide. Rechargez la page.');
      const current = fresh.store, previousCount = current.repairs.length;
      const {repair} = createPublicRepair(current, fresh.row.client_id, input);
      if (current.repairs.length !== previousCount) {
        validateStore(current);
        const changed = await saveClientWorkshop(db, {expectedRevision: current.revision, data: current,
          tokenHash: fresh.row.token_hash, clientId: fresh.row.client_id, csrf: fresh.row.csrf, now: Date.now(), idleMs: IDLE_MS});
        if (!changed) {
          const checked = await clientSession(false);
          if (!equal(request.headers.get('X-CSRF-Token'), checked.row.csrf)) throw new HttpError(403, 'Jeton de protection invalide. Rechargez la page.');
          throw new HttpError(409, 'L’atelier a changé. Actualisez votre espace client puis réessayez.');
        }
      }
      return json(headers, 200, {repairId: repair.id, repairCode: repair.code});
    }
    const sheet = pathname.match(/^\/api\/client\/repair-intake\/([^/]+)\/sheet$/);
    if (sheet && request.method === 'GET') {
      if (workshopId) throw new HttpError(404, 'Route introuvable.');
      return json(headers, 200, repairIntakeSheet(clientAuth.store, clientAuth.row.client_id, repairIntakeId(sheet[1]), publicIntakeSettings));
    }
    const availability = pathname.match(/^\/api\/client\/repairs\/([^/]+)\/parts\/([^/]+)\/available$/);
    if (availability) {
      if (request.method !== 'POST') throw new HttpError(405, 'Méthode non autorisée.');
      const body = await readJSON(request, 1024);
      const {repairId, partId} = availablePartRequest(availability[1], availability[2], body);
      const fresh = await clientSession(false);
      if (!equal(request.headers.get('X-CSRF-Token'), fresh.row.csrf)) throw new HttpError(403, 'Jeton de protection invalide. Rechargez la page.');
      const current = fresh.store;
      assertAvailablePart(current, fresh.row.client_id, repairId, partId);
      if (markClientPartAvailable(current, fresh.row.client_id, repairId, partId)) {
        const changed = await saveClientWorkshop(db, {expectedRevision: current.revision, data: current,
          tokenHash: fresh.row.token_hash, clientId: fresh.row.client_id, csrf: fresh.row.csrf, now: Date.now(), idleMs: IDLE_MS});
        if (!changed) {
          const checked = await clientSession(false);
          if (!equal(request.headers.get('X-CSRF-Token'), checked.row.csrf)) throw new HttpError(403, 'Jeton de protection invalide. Rechargez la page.');
          throw new HttpError(409, 'L’atelier a changé. Actualisez votre espace client puis réessayez.');
        }
      }
      return json(headers, 200, clientPortal(current, fresh.row.client_id, repairTotalCost));
    }
    throw new HttpError(404, 'Route introuvable.');
  }
  const auth = await session(!(pathname === '/api/admin/notifications' && request.method === 'GET'));
  if (mutation && !equal(request.headers.get('X-CSRF-Token'), auth.csrf)) {
    throw new HttpError(403, 'Jeton de protection invalide. Rechargez la page.');
  }
  if (pathname === '/api/admin/invoice-source' && request.method === 'GET') {
    if (!equal(request.headers.get('X-CSRF-Token'), auth.csrf)) throw new HttpError(403, 'Jeton de protection invalide. Rechargez la page.');
    return json(headers, 200, await readWorkshop(db));
  }
  if (pathname.startsWith('/api/super-admin/')) {
    if (workshopId) throw new HttpError(403, 'Accès super administrateur requis.');
    const repo = d1NotificationRepository(platformDB);
    if (pathname === '/api/super-admin/registrations' && request.method === 'GET') return json(headers, 200, await listRegistrationRequests(repo, url.searchParams.get('status') || 'all'));
    const review = pathname.match(/^\/api\/super-admin\/registrations\/([^/]+)\/review$/);
    if (review && request.method === 'POST') {
      const body = await readJSON(request, 4096), at = Date.now();
      const result = await reviewRegistrationRequest(repo, review[1], body, {reviewer: auth.email,
        guard: {sql: "EXISTS(SELECT 1 FROM sessions s JOIN admin a ON a.id=s.admin_id WHERE s.token_hash=? AND s.csrf=? AND s.expires_at>? AND s.seen_at>? AND a.role='admin')", values: [auth.token_hash, auth.csrf, at, at - IDLE_MS]},
        approvalStatements: async (row, approval) => {
          if (await platformDB.prepare('SELECT 1 FROM admin WHERE email=?').bind(row.email).first()) throw new HttpError(409, 'Cette adresse possède déjà un compte.');
          const store = emptyStore(); store.settings.workshop = row.workshop_name; store.settings.owner = row.name.slice(0,80);
          return provisioningStatements(row, {...approval, store}, 'd1');
        },
      });
      return json(headers, 200, result);
    }
    throw new HttpError(404, 'Route introuvable.');
  }
  if (pathname === '/api/auth/logout' && request.method === 'POST') {
    await db.batch([db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(auth.token_hash), db.prepare('DELETE FROM saas_session_index WHERE token_hash=?').bind(auth.token_hash)]);
    headers.set('Set-Cookie', cookie('', 0));
    return json(headers, 200, { ok: true });
  }
  if (pathname === '/api/auth/password' && request.method === 'POST') {
    await throttle('password:' + auth.admin_id, 5, HOUR / 4);
    const body = await readJSON(request, 4096);
    try { checkPassword(body.newPassword); } catch (error) { throw new HttpError(400, error.message); }
    const admin = await db.prepare("SELECT password_hash FROM admin WHERE id = 1 AND role = 'admin'").first();
    if (!admin) throw new HttpError(409, 'Le compte a changé. Reconnectez-vous.');
    const encoded = await withHash(async () => {
      if (!await verifyPassword(body.currentPassword, admin.password_hash)) {
        throw new HttpError(400, 'Mot de passe actuel incorrect.');
      }
      return hashPassword(body.newPassword);
    });
    const at = Date.now();
    const results = await db.batch([
      db.prepare(`UPDATE admin SET password_hash = ? WHERE id = 1 AND password_hash = ?
        AND EXISTS (SELECT 1 FROM sessions WHERE token_hash = ? AND admin_id = admin.id
          AND csrf = ? AND expires_at > ? AND seen_at > ?)`)
        .bind(encoded, admin.password_hash, auth.token_hash, auth.csrf, at, at - IDLE_MS),
      // The new salted hash uniquely identifies a successful update in this transaction.
      db.prepare('DELETE FROM sessions WHERE EXISTS (SELECT 1 FROM admin WHERE id = 1 AND password_hash = ?)')
        .bind(encoded),
    ]);
    if (results[0].meta?.changes !== 1) {
      await session(false);
      throw new HttpError(409, 'Le compte a changé. Reconnectez-vous.');
    }
    headers.set('Set-Cookie', cookie('', 0));
    return json(headers, 200, { ok: true });
  }
  const accessRoute = pathname.match(/^\/api\/admin\/client-access\/([^/]+)$/);
  if (accessRoute) {
    let clientId;
    try { clientId = decodeURIComponent(accessRoute[1]); } catch { throw new HttpError(400, 'Client invalide.'); }
    const store = await readWorkshop(db);
    if (!(store.clients || []).some(item => item.id === clientId)) throw new HttpError(404, 'Client introuvable.');
    if (request.method === 'GET') {
      return json(headers, 200, { access: clientAccess(await db.prepare('SELECT * FROM client_accounts WHERE client_id=?').bind(clientId).first()) });
    }
    const authGuard = `EXISTS (SELECT 1 FROM sessions s JOIN admin a ON a.id=s.admin_id
      WHERE s.token_hash=? AND s.csrf=? AND s.expires_at>? AND s.seen_at>? AND a.role='admin')
      AND EXISTS (SELECT 1 FROM workshop WHERE id=1 AND revision=?)`;
    if (request.method === 'POST') {
      await throttle('client-access:' + auth.admin_id, 30, HOUR / 4);
      const body = parsedBody || await readJSON(request, 4096), address = email(body.email);
      if (!address) throw new HttpError(400, 'Adresse e-mail invalide.');
      const admin = await db.prepare('SELECT email FROM admin WHERE id=1').first();
      if (address === admin?.email) throw new HttpError(400, 'L’adresse administrateur ne peut pas servir d’accès client.');
      const duplicate = await db.prepare('SELECT client_id FROM client_accounts WHERE email=? AND client_id!=?').bind(address, clientId).first();
      if (duplicate) throw new HttpError(409, 'Cette adresse possède déjà un accès client.');
      try { checkPassword(body.password); } catch (error) { throw new HttpError(400, error.message); }
      const encoded = await withHash(() => hashPassword(body.password)), at = Date.now();
      let results;
      try {
        results = await db.batch([
          db.prepare(`INSERT INTO client_accounts(client_id,email,password_hash,enabled,created_at,updated_at)
            SELECT ?,?,?,1,?,? WHERE ${authGuard} AND NOT EXISTS (SELECT 1 FROM admin WHERE email=?)
            ON CONFLICT(client_id) DO UPDATE SET email=excluded.email,password_hash=excluded.password_hash,
              enabled=1,updated_at=excluded.updated_at`)
            .bind(clientId, address, encoded, at, at, auth.token_hash, auth.csrf, at, at - IDLE_MS, store.revision, address),
          db.prepare(`DELETE FROM client_sessions WHERE client_id=?
            AND EXISTS (SELECT 1 FROM client_accounts WHERE client_id=? AND password_hash=?)`).bind(clientId, clientId, encoded),
        ]);
      } catch (error) {
        if (/UNIQUE constraint failed: client_accounts.email/.test(error.message || '')) {
          throw new HttpError(409, 'Cette adresse possède déjà un accès client.');
        }
        throw error;
      }
      if (results[0].meta?.changes !== 1) {
        await session(false);
        throw new HttpError(409, 'Le client ou l’atelier a changé. Rechargez la page.');
      }
      return json(headers, 200, { access: clientAccess(await db.prepare('SELECT * FROM client_accounts WHERE client_id=?').bind(clientId).first()) });
    }
    if (request.method === 'DELETE') {
      const at = Date.now();
      const results = await db.batch([
        db.prepare(`UPDATE client_accounts SET enabled=0,updated_at=? WHERE client_id=? AND ${authGuard}`)
          .bind(at, clientId, auth.token_hash, auth.csrf, at, at - IDLE_MS, store.revision),
        db.prepare(`DELETE FROM client_sessions WHERE client_id=?
          AND EXISTS (SELECT 1 FROM client_accounts WHERE client_id=? AND enabled=0)`).bind(clientId, clientId),
      ]);
      // Missing accounts have no access to revoke; the operation is idempotent.
      if (results[0].meta?.changes !== 1) {
        await session(false);
        const current = await readWorkshop(db);
        if (current.revision !== store.revision) throw new HttpError(409, 'L’atelier a changé. Rechargez la page.');
      }
      return json(headers, 200, { access: clientAccess(await db.prepare('SELECT * FROM client_accounts WHERE client_id=?').bind(clientId).first()) });
    }
    throw new HttpError(405, 'Méthode non autorisée.');
  }
  if (pathname === '/api/store' && request.method === 'GET') {
    return json(headers, 200, await readWorkshop(db));
  }
  const notificationResponse = await notificationAdminRequest({
    pathname, method: request.method, searchParams: url.searchParams,
    readJSON: max => readJSON(request, max), repo: notificationRepo, config: mailConfig,
    tokenHash: auth.token_hash, idleMs: IDLE_MS, dispatch: dispatchNotifications,
  });
  if (notificationResponse) return json(headers, 200, notificationResponse);
  if (pathname === '/api/store' && request.method === 'PUT') {
    const body = await readJSON(request, 20 * 1024 * 1024);
    await session(false);
    if (!Number.isSafeInteger(body.revision) || body.revision < 0 || body.revision >= 1e9) {
      throw new HttpError(400, 'Révision invalide.');
    }
    let data;
    try { data = validateStore(body.data); } catch (error) { throw new HttpError(400, error.message); }
    // Older bundles cannot distinguish ordinary edits from backup restores.
    if (!Array.isArray(body.data?.clients) || (mailConfig.configured && body.mode === undefined)) {
      throw new HttpError(409, 'Votre version de l’atelier est ancienne. Rechargez la page avant de modifier les données.');
    }
    const mode = body.mode === undefined ? 'edit' : body.mode;
    if (!['edit', 'restore', 'reset'].includes(mode)) throw new HttpError(400, 'Mode de sauvegarde invalide.');
    data.revision = body.revision + 1;
    const at = Date.now();
    const before = await readWorkshop(db);
    if (before.revision !== body.revision) throw new HttpError(409, 'L’atelier a changé dans une autre session. Rechargez les données.');
    assertIntakeMetadataPreserved(before, data, mode);
    // A legacy editor must not silently erase an existing manual intervention price.
    const missingInterventionCosts = new Set(data.repairs.filter(repair => repair.interventionCost === undefined).map(repair => repair.id));
    if (mode === 'edit' && before.repairs.some(repair => repair.interventionCost != null
      && missingInterventionCosts.has(repair.id))) {
      throw new HttpError(409, 'Votre version de l’atelier est ancienne. Rechargez la page avant de modifier les coûts d’intervention.');
    }
    // Payment cancellation is explicit; legacy editors must not erase recorded receipts.
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
    let notifications = [];
    if (mode === 'edit' && mailConfig.configured) {
      notifications = repairNotifications(before, data, {origin: mailConfig.portalOrigin, workshopId, now: at});
    }
    const changed = await saveWorkshop(db, {
      expectedRevision: body.revision, data, tokenHash: auth.token_hash, now: at, idleMs: IDLE_MS,
      notifications, cancelNotifications: mode !== 'edit',
    });
    if (!changed) {
      await session(false);
      throw new HttpError(409, 'L’atelier a changé dans une autre session. Rechargez les données avant de réessayer.');
    }
    dispatchNotifications();
    return json(headers, 200, data);
  }
  throw new HttpError(404, 'Route introuvable.');
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    const headers = responseSecurityHeaders(url.protocol === 'https:');
    try {
      const { secure, configured } = validateOrigin(url, env);
      return await handle(request, env, headers, url, secure, configured, context);
    } catch (error) {
      const status = error instanceof HttpError || error instanceof NotificationError || error instanceof RegistrationError || error instanceof ClientPartAvailabilityError || error instanceof RepairIntakeError ? error.status : error instanceof StoreSizeError ? 413 : 500;
      return json(headers, status, { error: status === 500 ? 'Erreur interne du serveur.' : error.message });
    }
  },
  async scheduled(_controller, env) {
    const config = notificationConfiguration(env);
    if (!env.DB || !config.configured) return;
    await deliverNotifications(d1NotificationRepository(env.DB), {config, readStore: () => readWorkshop(env.DB)});
    const rows = (await env.DB.prepare('SELECT id FROM saas_workshops ORDER BY created_at').all()).results;
    for (const row of rows) {const db = scopedDatabase(env.DB, row.id, {kind: 'd1'}); await deliverNotifications(d1NotificationRepository(db), {config, readStore: () => readWorkshop(db), limit: 2});}
  },
};
