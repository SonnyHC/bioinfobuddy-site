import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { Unzip, UnzipInflate } from 'fflate';

// Stream the release archive, including its two installers, without loading them into memory.
export async function describeDesktopZip(file, version, installers) {
  const expected = new Map(
    Object.values(installers).map((asset) => [`downloads/${version}/${asset.name}`, asset]),
  );
  const completed = new Set();
  const reader = new Unzip((entry) => {
    const asset = expected.get(entry.name);
    if (!asset) return;
    if (completed.has(entry.name)) throw new Error(`Duplicate installer in ZIP: ${entry.name}`);
    const hash = createHash('sha256');
    let size = 0;
    entry.ondata = (error, data, final) => {
      if (error) throw error;
      size += data.length;
      if (size > asset.bytes) throw new Error(`Unexpected installer size in ZIP: ${entry.name}`);
      hash.update(data);
      if (final) {
        if (size !== asset.bytes || hash.digest('hex') !== asset.sha256)
          throw new Error(`Wrong installer in ZIP: ${entry.name}`);
        completed.add(entry.name);
      }
    };
    entry.start();
  });
  reader.register(UnzipInflate);
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const chunk of createReadStream(file)) {
    bytes += chunk.length;
    hash.update(chunk);
    reader.push(chunk);
  }
  reader.push(new Uint8Array(), true);
  if (completed.size !== expected.size)
    throw new Error(`ZIP must contain both installers under downloads/${version}/`);
  return { name: `BioInfoBuddy-${version}.zip`, bytes, sha256: hash.digest('hex') };
}
