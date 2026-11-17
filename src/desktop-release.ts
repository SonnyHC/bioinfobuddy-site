function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function readZipDownload(manifest: unknown, pageUrl: string) {
  if (
    !isObject(manifest) ||
    typeof manifest.version !== 'string' ||
    !/^\d+\.\d+\.\d+$/.test(manifest.version)
  ) {
    throw new Error('Invalid release version');
  }
  const name = `BioInfoBuddy-${manifest.version}.zip`;
  if (typeof manifest.zipUrl === 'string' && manifest.zipUrl.trim()) {
    const base = new URL(pageUrl);
    const url = new URL(manifest.zipUrl, base);
    const sameSiteHttp = url.protocol === 'http:' && url.origin === base.origin;
    if ((url.protocol !== 'https:' && !sameSiteHttp) || url.username || url.password) {
      throw new Error('Invalid ZIP URL');
    }
    return { name, href: url.href };
  }
  const archive = isObject(manifest.assets) && manifest.assets.zip;
  if (!isObject(archive) || archive.name !== name) throw new Error('No release ZIP');
  return { name, href: `/downloads/${manifest.version}/${name}` };
}
