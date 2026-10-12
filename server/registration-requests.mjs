export class RegistrationError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export const REGISTRATION_BODY_LIMIT = 8192;
export const REGISTRATION_SCHEMA = `
CREATE TABLE IF NOT EXISTS registration_requests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  workshop_name TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  password_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  reviewed_at INTEGER,
  reviewed_by TEXT NOT NULL DEFAULT '',
  review_note TEXT NOT NULL DEFAULT '',
  review_token TEXT NOT NULL DEFAULT '',
  CHECK ((status = 'pending' AND password_hash IS NOT NULL AND reviewed_at IS NULL)
    OR (status <> 'pending' AND password_hash IS NULL AND reviewed_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS registration_requests_status_created
  ON registration_requests(status, created_at DESC);
`;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const statusValues = new Set(['pending', 'approved', 'rejected']);
const encoder = new TextEncoder();
const publicResult = () => ({accepted: true});

function object(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RegistrationError(400, 'Formulaire invalide.');
  }
}

function text(value, {label, minimum = 0, maximum, multiline = false, optional = false}) {
  if (value === undefined && optional) return '';
  if (typeof value !== 'string') throw new RegistrationError(400, `${label} invalide.`);
  const result = value.trim(), size = [...result].length;
  const controls = multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/ : /[\u0000-\u001f\u007f]/;
  if (size < minimum || size > maximum || controls.test(result)) {
    throw new RegistrationError(400, `${label} doit contenir entre ${minimum} et ${maximum} caractères.`);
  }
  return result;
}

export function validateRegistrationRequest(body) {
  object(body);
  let size;
  try {size = encoder.encode(JSON.stringify(body)).byteLength;} catch {
    throw new RegistrationError(400, 'Formulaire invalide.');
  }
  if (size > REGISTRATION_BODY_LIMIT) throw new RegistrationError(413, 'Requête trop volumineuse.');
  const name = text(body.name, {label: 'Le nom', minimum: 2, maximum: 120});
  const workshopName = text(body.workshopName, {label: 'Le nom de l’atelier', minimum: 2, maximum: 120});
  if (workshopName.length > 120) throw new RegistrationError(400, 'Le nom de l’atelier ne peut pas dépasser 120 caractères.');
  const email = text(body.email, {label: 'L’adresse e-mail', minimum: 3, maximum: 254}).toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new RegistrationError(400, 'Adresse e-mail invalide.');
  const message = text(body.message, {label: 'La présentation', maximum: 2000, multiline: true, optional: true});
  const password = body.password;
  const passwordLength = typeof password === 'string' ? [...password].length : 0;
  if (passwordLength < 15 || passwordLength > 128 || /\u0000/.test(password)) {
    throw new RegistrationError(400, 'Choisissez une phrase de passe de 15 à 128 caractères.');
  }
  return {name, email, workshopName, message, password};
}

function timestamp(clock) {
  const at = clock();
  if (!Number.isSafeInteger(at) || at < 0) throw new Error('Horloge d’inscription invalide.');
  return at;
}

function identifier(uuid) {
  const id = uuid();
  if (typeof id !== 'string' || !uuidPattern.test(id)) throw new Error('Identifiant d’inscription invalide.');
  return id;
}

// The host applies request-origin checks and public rate limits before this
// function. Hashing also runs for duplicate addresses, so the public response
// neither reveals the account nor replaces an earlier applicant's password.
export async function submitRegistrationRequest(repo, body, {hashPassword, now = Date.now,
  uuid = () => crypto.randomUUID()} = {}) {
  const input = validateRegistrationRequest(body);
  if (typeof hashPassword !== 'function') throw new Error('Hachage d’inscription non configuré.');
  const passwordHash = await hashPassword(input.password);
  if (typeof passwordHash !== 'string' || !passwordHash || passwordHash === input.password) {
    throw new Error('Hachage d’inscription invalide.');
  }
  const at = timestamp(now), id = identifier(uuid);
  await repo.run(`INSERT INTO registration_requests
      (id,name,email,workshop_name,message,password_hash,status,created_at,updated_at)
    VALUES(?,?,?,?,?,?,'pending',?,?)
    ON CONFLICT(email) DO UPDATE SET id=excluded.id,name=excluded.name,
      workshop_name=excluded.workshop_name,message=excluded.message,
      password_hash=excluded.password_hash,status='pending',created_at=excluded.created_at,
      updated_at=excluded.updated_at,reviewed_at=NULL,reviewed_by='',review_note='',review_token=''
    WHERE registration_requests.status='rejected'`,
  [id, input.name, input.email, input.workshopName, input.message, passwordHash, at, at]);
  return publicResult();
}

export function registrationView(row) {
  return {
    id: row.id, name: row.name, email: row.email, workshopName: row.workshop_name,
    message: row.message, status: row.status, createdAt: row.created_at,
    updatedAt: row.updated_at, reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by, reviewNote: row.review_note,
  };
}

export async function listRegistrationRequests(repo, status = 'all') {
  if (status !== 'all' && !statusValues.has(status)) {
    throw new RegistrationError(400, 'Statut de demande invalide.');
  }
  const rows = await repo.all(`SELECT id,name,email,workshop_name,message,status,
      created_at,updated_at,reviewed_at,reviewed_by,review_note
    FROM registration_requests ${status === 'all' ? '' : 'WHERE status=?'}
    ORDER BY CASE WHEN status='pending' THEN 0 ELSE 1 END,created_at DESC,id
    LIMIT 500`, status === 'all' ? [] : [status]);
  const totals = await repo.all('SELECT status,COUNT(*) AS amount FROM registration_requests GROUP BY status');
  const counts = {total: 0, pending: 0, approved: 0, rejected: 0};
  for (const item of totals) {counts[item.status] = item.amount; counts.total += item.amount;}
  return {requests: rows.map(registrationView), counts};
}

function validateReview(input) {
  object(input);
  if (input.decision !== 'approve' && input.decision !== 'reject') {
    throw new RegistrationError(400, 'Choisissez une approbation ou un refus.');
  }
  return {status: input.decision === 'approve' ? 'approved' : 'rejected',
    note: text(input.note, {label: 'La note de revue', maximum: 1000, multiline: true, optional: true})};
}

// Origin, CSRF and super-admin authentication belong to the host. A supplied
// SQL guard rechecks that session in the same atomic batch as the decision.
// Provisioning statements must use approval.guard: the unique review token
// prevents a losing concurrent approval from creating a second workspace.
export async function reviewRegistrationRequest(repo, id, input, {now = Date.now,
  uuid = () => crypto.randomUUID(), reviewer, guard, approvalStatements} = {}) {
  if (typeof id !== 'string' || !uuidPattern.test(id)) throw new RegistrationError(400, 'Demande invalide.');
  const review = validateReview(input);
  const reviewerName = text(reviewer, {label: 'Le responsable de la revue', minimum: 1, maximum: 254});
  const row = await repo.first('SELECT * FROM registration_requests WHERE id=?', [id]);
  if (!row) throw new RegistrationError(404, 'Demande introuvable.');
  if (row.status !== 'pending') {
    if (guard && !await repo.first(`SELECT 1 AS allowed WHERE (${guard.sql})`, guard.values || [])) {
      throw new RegistrationError(401, 'Votre session a expiré. Reconnectez-vous.');
    }
    if (row.status === review.status) return {request: registrationView(row)};
    throw new RegistrationError(409, 'Cette demande a déjà été traitée.');
  }
  if (review.status === 'approved' && typeof approvalStatements !== 'function') {
    throw new RegistrationError(503, 'La création des ateliers doit être configurée avant de valider les inscriptions.');
  }
  const at = timestamp(now), reviewToken = identifier(uuid);
  const approval = {at, reviewToken, guard: {
    sql: "EXISTS(SELECT 1 FROM registration_requests WHERE id=? AND status='approved' AND review_token=?)",
    values: [id, reviewToken],
  }};
  const statements = [{sql: `UPDATE registration_requests SET status=?,password_hash=NULL,
      updated_at=?,reviewed_at=?,reviewed_by=?,review_note=?,review_token=?
    WHERE id=? AND status='pending'${guard ? ` AND (${guard.sql})` : ''}`,
    values: [review.status, at, at, reviewerName, review.note, reviewToken, id, ...(guard?.values || [])]}];
  if (review.status === 'approved') {
    const provision = await approvalStatements(row, approval);
    if (!Array.isArray(provision) || !provision.length || provision.some(item =>
      !item || typeof item.sql !== 'string' || !Array.isArray(item.values))) {
      throw new Error('Création des ateliers invalide.');
    }
    statements.push(...provision);
  }
  const result = await repo.batch(statements);
  const current = await repo.first('SELECT * FROM registration_requests WHERE id=?', [id]);
  if (!current) throw new RegistrationError(404, 'Demande introuvable.');
  if (!result[0]?.changes && current.status === 'pending') {
    throw new RegistrationError(401, 'Votre session a expiré. Reconnectez-vous.');
  }
  if (current.status !== review.status) throw new RegistrationError(409, 'Cette demande a déjà été traitée.');
  return {request: registrationView(current)};
}
