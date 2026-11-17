export const platforms = [
  {
    id: 'macos',
    label: '下载 macOS 版',
    hint: 'macOS · Apple 芯片 · DMG',
    suffix: 'macOS-arm64.dmg',
  },
  {
    id: 'windows',
    label: '下载 Windows 版',
    hint: 'Windows · x64 · EXE',
    suffix: 'Windows-x64-Setup.exe',
  },
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function installerUrl(value: unknown, pageUrl: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Invalid installer URL');
  const base = new URL(pageUrl);
  const url = new URL(value, base);
  const sameSiteHttp = url.protocol === 'http:' && url.origin === base.origin;
  if ((url.protocol !== 'https:' && !sameSiteHttp) || url.username || url.password) {
    throw new Error('Invalid installer URL');
  }
  return url.href;
}

export function readInstallers(manifest: unknown, pageUrl: string) {
  if (
    !isObject(manifest) ||
    typeof manifest.version !== 'string' ||
    !/^\d+\.\d+\.\d+$/.test(manifest.version) ||
    !isObject(manifest.assets)
  ) {
    throw new Error('Invalid release manifest');
  }
  const { version, assets } = manifest;
  return platforms.map(({ id, suffix }) => {
    const name = `BioInfoBuddy-${version}-${suffix}`;
    const asset = assets[id];
    if (!isObject(asset) || asset.name !== name) throw new Error(`Missing ${id} installer`);
    const href =
      asset.url == null || asset.url === ''
        ? `/downloads/${version}/${name}`
        : installerUrl(asset.url, pageUrl);
    return { name, href };
  });
}
