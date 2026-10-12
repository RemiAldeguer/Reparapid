// Export only the workshop and administrator, never local sessions or limits.
import { DatabaseSync } from 'node:sqlite';
import { mkdir, writeFile, chmod } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { emitKeypressEvents } from 'node:readline';
import { verifyPassword } from '../server/security.mjs';
import { hashPassword } from '../cloudflare/security.mjs';
import { validateStore } from '../tests/.compiled/domain.cjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
function password() {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) return reject(new Error('Utilisez un terminal interactif.'));
    process.stdout.write('Mot de passe administrateur local (saisie masquée) : ');
    emitKeypressEvents(process.stdin);
    const wasRaw = process.stdin.isRaw;
    process.stdin.setRawMode(true); process.stdin.resume();
    let value = '';
    function finish(error) {
      process.stdin.off('keypress', onKey); process.stdin.setRawMode(wasRaw);
      process.stdin.pause(); process.stdout.write('\n');
      if (error) reject(error); else resolve(value);
    }
    function onKey(char, key = {}) {
      if (key.ctrl && ['c', 'd'].includes(key.name)) return finish(new Error('Export annulé.'));
      if (key.name === 'return' || key.name === 'enter') return finish();
      if (key.name === 'backspace') { value = [...value].slice(0, -1).join(''); return; }
      if (!key.ctrl && !key.meta && char && !/[\x00-\x1f\x7f]/.test(char)) value += char;
    }
    process.stdin.on('keypress', onKey);
  });
}

try {
  process.umask(0o077);
  const db = new DatabaseSync(path.resolve(root, process.env.DATABASE_PATH || 'data/clinique.sqlite'), { readOnly: true });
  let admin, row;
  try {
    db.exec('BEGIN');
    admin = db.prepare('SELECT email, password_hash FROM admin WHERE id = 1').get();
    row = db.prepare('SELECT revision, data FROM workshop WHERE id = 1').get();
    db.exec('COMMIT');
  } finally { db.close(); }
  if (!admin || !row) throw new Error('Initialisez le compte administrateur local avant l’export.');
  const secret = await password();
  if (!await verifyPassword(secret, admin.password_hash)) throw new Error('Mot de passe local incorrect.');
  const encoded = await hashPassword(secret);
  const data = validateStore(JSON.parse(row.data));
  data.revision = row.revision;
  const text = JSON.stringify(data);
  if (Buffer.byteLength(text) > 20 * 1024 * 1024) throw new Error('L’atelier dépasse 20 Mio.');
  const generation = crypto.randomUUID();
  const statements = [
    '-- PRIVATE: account password hash and workshop. Do not publish this file.',
    '-- Import only into a fresh database after 0001_initial.sql.',
    // A remote database with an administrator fails here before any workshop writes.
    `INSERT INTO admin(id,email,password_hash,role) VALUES(1,${quote(admin.email)},${quote(encoded)},'admin');`,
  ];
  for (let start = 0, position = 0; start < text.length; position++) {
    let end = Math.min(start + 250000, text.length);
    if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1]) && /[\uDC00-\uDFFF]/.test(text[end])) end--;
    statements.push(`INSERT INTO workshop_chunks(generation,position,data) VALUES(${quote(generation)},${position},${quote(text.slice(start, end))});`);
    start = end;
  }
  // Publish only after every fragment is present. A partial import is recoverable
  // by removing the freshly created cloud database and repeating from migration.
  statements.push(`UPDATE workshop SET revision=${data.revision},generation=${quote(generation)} WHERE id=1 AND revision=0 AND generation IS NULL;`);
  const output = path.resolve(root, process.argv[2] || '.backups/cloudflare-transfer.sql');
  if (output === path.join(root, 'dist') || output.startsWith(path.join(root, 'dist') + path.sep)) {
    throw new Error('Le fichier privé ne peut pas être écrit dans dist.');
  }
  await mkdir(path.dirname(output), { recursive: true, mode: 0o700 });
  await writeFile(output, statements.join('\n') + '\n', { mode: 0o600 });
  await chmod(output, 0o600);
  console.log(`Export privé créé : ${output}\nLe mot de passe reste identique. Les sessions locales ne sont pas transférées.`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
