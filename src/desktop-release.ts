export const platforms = [
  { id: 'macos', label: 'macOS', systems: 'macOS 13+ · Apple 芯片' },
  { id: 'windows', label: 'Windows', systems: 'Windows 10 / 11 · x64' },
] as const;

type Platform = (typeof platforms)[number]['id'];
interface Asset {
  name: string;
  bytes: number;
  sha256: string;
}

export interface Release {
  version: string;
  installers?: Record<Platform, Asset>;
  zip?: { href: string; name: string; metadata?: Asset };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readAsset(value: unknown, name: string): Asset {
  if (
    !isObject(value) ||
    value.name !== name ||
    typeof value.bytes !== 'number' ||
    !Number.isSafeInteger(value.bytes) ||
    value.bytes <= 0 ||
    typeof value.sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(value.sha256)
  ) {
    throw new Error(`Invalid release asset: ${name}`);
  }
  return { name, bytes: value.bytes, sha256: value.sha256 };
}

function downloadUrl(value: unknown, pageUrl: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Invalid ZIP URL');
  const url = new URL(value, pageUrl);
  const localHttp = url.protocol === 'http:' && url.origin === new URL(pageUrl).origin;
  if ((url.protocol !== 'https:' && !localHttp) || url.username || url.password) {
    throw new Error('Invalid ZIP URL');
  }
  return url.href;
}

export function readRelease(value: unknown, pageUrl: string): Release {
  if (
    !isObject(value) ||
    typeof value.version !== 'string' ||
    !/^\d+\.\d+\.\d+$/.test(value.version)
  ) {
    throw new Error('Invalid release version');
  }
  const version = value.version;
  const prefix = `BioInfoBuddy-${version}`;
  const name = `${prefix}.zip`;
  const assets = isObject(value.assets) ? value.assets : {};
  const metadata = assets.zip === undefined ? undefined : readAsset(assets.zip, name);
  if (value.zipUrl !== undefined && value.zipUrl !== '') {
    return { version, zip: { href: downloadUrl(value.zipUrl, pageUrl), name, metadata } };
  }
  return {
    version,
    installers: {
      macos: readAsset(assets.macos, `${prefix}-macOS-arm64.dmg`),
      windows: readAsset(assets.windows, `${prefix}-Windows-x64-Setup.exe`),
    },
    zip: metadata && { href: `/downloads/${version}/${name}`, name, metadata },
  };
}
