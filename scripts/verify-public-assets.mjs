import {lstat, readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {publicAsset, publicSourceAsset, publicAssetDirectories, publicSourceDirectories} from '../server/public-assets.mjs';

export async function verifyPublicAssets(distPath, {source = false} = {}) {
  const root = path.resolve(distPath), info = await lstat(root);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('Le build public doit être un dossier sans lien symbolique.');
  const files = [];
  const directories = source ? publicSourceDirectories : publicAssetDirectories;
  const lookup = source ? publicSourceAsset : publicAsset;
  async function inspect(directory, relative = '') {
    for (const name of (await readdir(directory)).sort()) {
      const filename = path.join(directory, name), entry = await lstat(filename);
      const relativePath = relative ? `${relative}/${name}` : name;
      if (entry.isSymbolicLink()) throw new Error(`Lien symbolique interdit dans le build public : ${relativePath}`);
      if (entry.isDirectory()) {
        if (!directories.includes(relativePath)) throw new Error(`Dossier public non autorisé : ${relativePath}`);
        await inspect(filename, relativePath);
      } else {
        const asset = lookup('/' + relativePath);
        if (!entry.isFile() || asset?.filename !== relativePath) throw new Error(`Fichier public non autorisé : ${relativePath}`);
        files.push(relativePath);
      }
    }
  }
  await inspect(root);
  if (!source && !files.includes('index.html')) throw new Error('Le build public doit contenir index.html.');
  return files;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length && (args.length !== 1 || args[0] !== '--source')) throw new Error('Argument invalide.');
    const source = args[0] === '--source';
    const files = await verifyPublicAssets(fileURLToPath(new URL(source ? '../public/' : '../dist/', import.meta.url)), {source});
    console.log(`${source ? 'Sources publiques vérifiées' : 'Build public vérifié'} : ${files.length} fichiers autorisés.`);
  } catch (error) {
    console.error(`Build public refusé. ${error.message}`);
    process.exitCode = 1;
  }
}
