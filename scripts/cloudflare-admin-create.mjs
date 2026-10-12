// First-account initialization is a human terminal operation, never a public API.
import {emitKeypressEvents} from 'node:readline';
import {spawn} from 'node:child_process';
import {readFile, mkdtemp, writeFile, chmod, rm, stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {email, checkPassword, hashPassword} from '../cloudflare/security.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultConfig = '.wrangler/reparapid.production.jsonc';
class SafeError extends Error {}

// JSONC comments and trailing commas are removed only outside JSON strings.
export function parseProductionConfig(source) {
  let json = '', inString = false, escaped = false;
  for (let index = 0; index < source.length; index++) {
    const char = source[index], next = source[index + 1];
    if (inString) {
      json += char;
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {inString = true; json += char; continue;}
    if (char === '/' && next === '/') {
      while (index < source.length && !['\n', '\r'].includes(source[index])) index++;
      json += '\n'; continue;
    }
    if (char === '/' && next === '*') {
      const end = source.indexOf('*/', index + 2);
      if (end === -1) throw new SafeError('Configuration JSONC invalide.');
      index = end + 1; json += ' '; continue;
    }
    json += char;
  }
  let cleaned = ''; inString = false; escaped = false;
  for (let index = 0; index < json.length; index++) {
    const char = json[index];
    if (inString) {
      cleaned += char;
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {inString = true; cleaned += char; continue;}
    if (char === ',') {
      let look = index + 1;
      while (look < json.length && /\s/.test(json[look])) look++;
      if (json[look] === '}' || json[look] === ']') continue;
    }
    cleaned += char;
  }
  let config;
  try {config = JSON.parse(cleaned);} catch {throw new SafeError('Configuration JSONC invalide.');}
  const database = config?.d1_databases?.[0];
  if (config?.name !== 'reparapid' || !Array.isArray(config.d1_databases) || config.d1_databases.length !== 1
    || database?.binding !== 'DB' || database.database_name !== 'reparapid'
    || typeof database.database_id !== 'string'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(database.database_id)
    || database.database_id === '00000000-0000-0000-0000-000000000000') {
    throw new SafeError('La configuration doit viser le Worker reparapid et une seule D1 reparapid dédiée, avec un identifiant configuré.');
  }
  return config;
}

export function initialAdminSQL(address, encoded) {
  const normalized = email(address);
  if (!normalized || /[\u0000-\u001f\u007f]/.test(normalized)
    || !/^scrypt\$32768\$8\$3\$[0-9a-f]{32}\$[0-9a-f]{128}$/.test(encoded)) {
    throw new SafeError('Compte administrateur invalide.');
  }
  const quote = value => `'${value.replaceAll("'", "''")}'`;
  // The singleton and email constraints reject every existing account. No
  // UPDATE, replacement, workshop transfer or session deletion is permitted.
  return `INSERT INTO admin(id,email,password_hash,role) VALUES(1,${quote(normalized)},${quote(encoded)},'admin');\n`;
}

export function wranglerArguments(configPath, sqlPath) {
  return [path.join(root, 'node_modules/wrangler/bin/wrangler.js'), 'd1', 'execute', 'reparapid',
    '--config', configPath, '--env', '', '--remote', '--file', sqlPath, '--yes', '--json'];
}

function hiddenInput(prompt, max) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY || !process.stdout.isTTY) return reject(new SafeError('Utilisez un terminal interactif pour la saisie masquée.'));
    process.stdout.write(prompt);
    emitKeypressEvents(process.stdin);
    const wasRaw = process.stdin.isRaw;
    process.stdin.setRawMode(true); process.stdin.resume();
    let value = '', finished = false;
    function finish(error) {
      if (finished) return; finished = true;
      process.stdin.off('keypress', onKey); process.stdin.off('end', onEnd);
      process.stdin.setRawMode(wasRaw); process.stdin.pause(); process.stdout.write('\n');
      if (error) reject(error); else resolve(value);
    }
    const onEnd = () => finish(new SafeError('Initialisation annulée.'));
    function onKey(char, key = {}) {
      if (key.ctrl && ['c', 'd'].includes(key.name)) return onEnd();
      if (key.name === 'return' || key.name === 'enter') return finish();
      if (key.name === 'backspace') {value = [...value].slice(0, -1).join(''); return;}
      if (!key.ctrl && !key.meta && char && !/[\x00-\x1f\x7f]/.test(char)) {
        if ([...value + char].length > max) return finish(new SafeError('Saisie trop longue.'));
        value += char;
      }
    }
    process.stdin.on('keypress', onKey); process.stdin.once('end', onEnd);
  });
}

function executeWrangler(configPath, sqlPath, directory) {
  return new Promise((resolve, reject) => {
    const environment = {...process.env, WRANGLER_WRITE_LOGS: 'false', WRANGLER_LOG_SANITIZE: 'true',
      WRANGLER_LOG_PATH: path.join(directory, 'logs'), WRANGLER_SEND_METRICS: 'false'};
    delete environment.CLOUDFLARE_ENV;
    // Credentials stay in the private file. Never inherit Wrangler's output:
    // provider errors can contain SQL text or account/resource identifiers.
    const child = spawn(process.execPath, wranglerArguments(configPath, sqlPath), {
      cwd: root, env: environment, stdio: ['ignore', 'pipe', 'pipe'],
    });
    const interrupt = () => child.kill('SIGTERM');
    process.on('SIGINT', interrupt); process.on('SIGTERM', interrupt);
    const removeSignals = () => {process.off('SIGINT', interrupt); process.off('SIGTERM', interrupt);};
    let output = '', errorOutput = '', size = 0;
    const capture = channel => chunk => {
      size += chunk.length;
      if (size > 1024 * 1024) {child.kill(); return;}
      if (channel === 'out') output += chunk.toString(); else errorOutput += chunk.toString();
    };
    child.stdout.on('data', capture('out')); child.stderr.on('data', capture('err'));
    child.once('error', () => {removeSignals(); reject(new SafeError('Wrangler n’a pas pu démarrer. Vérifiez les dépendances installées.'));});
    child.once('close', code => {
      removeSignals();
      if (code !== 0) {
        const duplicate = /UNIQUE constraint failed:\s*admin\.(?:id|email)/i.test(output + errorOutput);
        return reject(new SafeError(duplicate ? 'Un administrateur existe déjà. Aucune modification.'
          : 'Cloudflare a refusé l’initialisation. Vérifiez votre connexion, les migrations et la configuration avant de réessayer.'));
      }
      let result;
      try {result = JSON.parse(output);} catch {return reject(new SafeError('La réponse Cloudflare n’a pas pu être vérifiée. Vérifiez l’existence du compte avant de réessayer.'));}
      if (!Array.isArray(result) || !result.length || result.some(item => item.success !== true)) {
        return reject(new SafeError('Cloudflare n’a pas confirmé la création. Vérifiez l’existence du compte avant de réessayer.'));
      }
      resolve();
    });
  });
}

export async function main(args = process.argv.slice(2)) {
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
    process.stdout.write(`Usage : npm run cloudflare:admin:create -- [--config chemin]\n\nCrée uniquement le premier compte administrateur du magasin Reparapid.\nL’adresse e-mail et la phrase de passe sont saisies dans un terminal, sans affichage.\nConfiguration par défaut : ${defaultConfig}\nUn compte existant provoque un refus ; aucune réinitialisation n’est proposée.\n`);
    return;
  }
  if (args.length && (args.length !== 2 || args[0] !== '--config' || !args[1] || args[1].startsWith('-'))) {
    throw new SafeError('Arguments invalides. Utilisez --help ; les identifiants ne doivent pas être transmis en arguments.');
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new SafeError('Utilisez un terminal interactif pour la saisie masquée.');
  const configPath = path.resolve(root, args[1] || defaultConfig);
  const source = await readFile(configPath, 'utf8').catch(() => {throw new SafeError('Configuration de production introuvable ou inaccessible.');});
  parseProductionConfig(source);
  await stat(path.join(root, 'node_modules/wrangler/bin/wrangler.js')).catch(() => {throw new SafeError('Wrangler n’est pas installé. Installez les dépendances du projet.');});
  process.stdout.write('Cible validée : Reparapid, base de production dédiée.\n');
  const address = email(await hiddenInput('Adresse e-mail administrateur (saisie masquée) : ', 254));
  if (!address || /[\u0000-\u001f\u007f]/.test(address)) throw new SafeError('Adresse e-mail invalide.');
  let secret = await hiddenInput('Phrase de passe (15 à 128 caractères, saisie masquée) : ', 128);
  try {checkPassword(secret);} catch (error) {throw new SafeError(error.message);}
  let confirmation = await hiddenInput('Confirmez la phrase de passe (saisie masquée) : ', 128);
  if (secret !== confirmation) throw new SafeError('Les phrases de passe ne correspondent pas.');
  const encoded = await hashPassword(secret); secret = ''; confirmation = '';
  if (await readFile(configPath, 'utf8') !== source) throw new SafeError('La configuration a changé pendant la saisie. Relancez l’opération.');
  const directory = await mkdtemp(path.join(tmpdir(), 'reparapid-admin-'));
  try {
    await chmod(directory, 0o700);
    const sqlPath = path.join(directory, 'first-admin.sql');
    await writeFile(sqlPath, initialAdminSQL(address, encoded), {mode: 0o600, flag: 'wx'});
    await chmod(sqlPath, 0o600);
    process.stdout.write('Création du compte administrateur…\n');
    await executeWrangler(configPath, sqlPath, directory);
    process.stdout.write('Compte administrateur créé. Vous pouvez vous connecter à l’application.\n');
  } finally {await rm(directory, {recursive: true, force: true});}
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof SafeError ? error.message : 'Initialisation interrompue. Aucun détail privé n’est affiché.');
    process.exitCode = 1;
  });
}
