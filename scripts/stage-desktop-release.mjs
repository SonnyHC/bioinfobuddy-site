import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, link, mkdir, mkdtemp, open, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describeDesktopZip } from './describe-desktop-zip.mjs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const sourceArg = process.argv[2];
if (!sourceArg) throw new Error('Usage: npm run stage:release -- INSTALLER_DIR [VERSION] [ZIP_FILE]');
const source = path.resolve(sourceArg);
const target = path.join(root, 'public/downloads');
const versions = new Set((await readdir(source)).flatMap(name => {
  const match = /^BioInfoBuddy-(\d+\.\d+\.\d+)-(?:macOS-arm64\.dmg|Windows-x64-Setup\.exe)$/.exec(name);
  return match ? [match[1]] : [];
}));
const requested = process.argv[3];
if (requested && !versions.has(requested)) throw new Error('The requested version is missing from the installer directory.');
if (!requested && versions.size !== 1) throw new Error('Supply one installer version or specify the version after the directory.');
const version = requested ?? [...versions][0];
const names = {
  macos: `BioInfoBuddy-${version}-macOS-arm64.dmg`,
  windows: `BioInfoBuddy-${version}-Windows-x64-Setup.exe`,
};

async function describe(file, platform) {
  const handle = await open(file);
  const bytes = (await handle.stat()).size;
  try {
    const mac = platform === 'macos';
    const marker = Buffer.alloc(mac ? 4 : 2);
    await handle.read(marker, 0, marker.length, mac ? Math.max(0, bytes - 512) : 0);
    if (marker.toString('ascii') !== (mac ? 'koly' : 'MZ')) throw new Error(`Invalid installer: ${file}`);
  } finally { await handle.close(); }
  const hash = createHash('sha256');
  for await (const buffer of createReadStream(file)) hash.update(buffer);
  return { name: path.basename(file), bytes, sha256: hash.digest('hex') };
}

await mkdir(target, { recursive: true });
const stage = await mkdtemp(path.join(target, '.staging-'));
try {
  const assets = {};
  for (const [platform, name] of Object.entries(names)) {
    const stagedFile = path.join(stage, name);
    await copyFile(path.join(source, name), stagedFile);
    assets[platform] = await describe(stagedFile, platform);
  }
  const zipName = `BioInfoBuddy-${version}.zip`;
  const zipSource = process.argv[4] ? path.resolve(process.argv[4]) : path.join(source, zipName);
  const stagedZip = path.join(stage, zipName);
  let hasNewZip = true;
  try {
    await copyFile(zipSource, stagedZip);
  } catch (error) {
    if (process.argv[4] || error.code !== 'ENOENT') throw error;
    hasNewZip = false;
  }
  if (hasNewZip) assets.zip = await describeDesktopZip(stagedZip, version, assets);

  const destination = path.join(target, version);
  try {
    await rename(stage, destination);
  } catch (error) {
    if (!['EEXIST', 'ENOTEMPTY'].includes(error.code)) throw error;
    for (const platform of Object.keys(names)) {
      const asset = assets[platform];
      const current = await describe(path.join(destination, asset.name), platform);
      if (current.sha256 !== asset.sha256) throw new Error(`Version ${version} already contains a different ${platform} installer.`);
    }
    // Add a ZIP to an existing immutable release without replacing an existing file.
    const publishedZip = path.join(destination, zipName);
    let verifyExistingZip = !hasNewZip;
    if (hasNewZip) {
      try { await link(stagedZip, publishedZip); }
      catch (error) { if (error.code !== 'EEXIST') throw error; verifyExistingZip = true; }
    }
    if (verifyExistingZip) {
      const installers = { macos: assets.macos, windows: assets.windows };
      const existing = await describeDesktopZip(publishedZip, version, installers).catch(error => {
        if (error.code !== 'ENOENT' || hasNewZip) throw error;
      });
      if (hasNewZip && existing.sha256 !== assets.zip.sha256) throw new Error(`Version ${version} already contains a different ZIP.`);
      if (existing) assets.zip = existing;
    }
  }
  const previous = await readFile(path.join(target, 'latest.json'), 'utf8').catch(error => {
    if (error.code !== 'ENOENT') throw error;
  });
  const current = previous ? JSON.parse(previous) : null;
  const zipUrl = current?.version === version ? current.zipUrl ?? '' : '';
  const manifest = JSON.stringify({ version, zipUrl, assets }, null, 2) + '\n';
  const temp = path.join(target, `.latest-${process.pid}.json`);
  await writeFile(temp, manifest);
  await rename(temp, path.join(target, 'latest.json'));
  console.log(manifest);
} finally {
  await rm(stage, { recursive: true, force: true });
}
