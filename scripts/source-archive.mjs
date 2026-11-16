import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { zipSync } from 'fflate';

const root = fileURLToPath(new URL('../', import.meta.url));
const entries = {};
async function add(file) {
  entries[file] = [new Uint8Array(await readFile(path.join(root, file))), { mtime: new Date(2020, 0, 1) }];
}
async function addTree(folder) {
  const files = await readdir(path.join(root, folder), { withFileTypes: true });
  for (const entry of files.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const name = `${folder}/${entry.name}`;
    if (entry.isDirectory()) await addTree(name);
    if (entry.isFile()) await add(name);
  }
}
// Only publish source for this release page. Installers remain separate downloads.
for (const file of ['README.md', 'package.json', 'package-lock.json', 'index.html', 'tsconfig.json', 'vite.config.ts', 'vercel.json',
  '.gitignore', 'public/downloads/latest.json', 'public/favicon.svg', 'public/particle/NOTICE',
  'public/particle/LICENSE', 'public/particle/THREE-LICENSE']) await add(file);
await addTree('src');
await addTree('scripts');
await addTree('public/licenses');
await writeFile(path.join(root, 'public/particle/release-site-source.zip'), zipSync(entries, {level: 6}));
