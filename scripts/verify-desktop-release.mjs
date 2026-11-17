import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../public/downloads/', import.meta.url));
const { version, assets } = JSON.parse(await readFile(path.join(root, 'latest.json'), 'utf8'));
if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Invalid release version');
const names = {
  macos: `BioInfoBuddy-${version}-macOS-arm64.dmg`,
  windows: `BioInfoBuddy-${version}-Windows-x64-Setup.exe`,
};
if (assets?.zip) names.zip = `BioInfoBuddy-${version}.zip`;
for (const [platform, name] of Object.entries(names)) {
  const asset = assets?.[platform];
  if (asset?.name !== name || !Number.isSafeInteger(asset.bytes) || asset.bytes < 1 || !/^[a-f0-9]{64}$/.test(asset.sha256)) {
    throw new Error(`Invalid release manifest: ${platform}`);
  }
  const file = path.join(root, version, name);
  const info = await stat(file);
  if (!info.isFile() || info.size !== asset.bytes) throw new Error(`Missing installer bytes for ${name}. Copy the installers from the release handoff into the version directory.`);
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  if (hash.digest('hex') !== asset.sha256) throw new Error(`Installer checksum mismatch: ${name}`);
  console.log(`Verified ${name} (${info.size} bytes)`);
}
