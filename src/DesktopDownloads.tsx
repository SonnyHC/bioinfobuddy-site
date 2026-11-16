import { useEffect, useState } from 'react';
import { ArrowDownToLine, ChevronDown } from 'lucide-react';

const platforms = [
  { id: 'macos', label: 'macOS', systems: 'macOS 13+ · Apple 芯片' },
  { id: 'windows', label: 'Windows', systems: 'Windows 10 / 11 · x64' },
] as const;

type Platform = typeof platforms[number]['id'];
interface Asset { name: string; bytes: number; sha256: string }
interface Release { version: string; assets: Record<Platform, Asset> }

function isRelease(value: unknown): value is Release {
  if (!value || typeof value !== 'object' || !('version' in value) || !('assets' in value)) return false;
  const { version, assets } = value;
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version) || !assets || typeof assets !== 'object') return false;
  const expected = { macos: `BioInfoBuddy-${version}-macOS-arm64.dmg`, windows: `BioInfoBuddy-${version}-Windows-x64-Setup.exe` };
  return platforms.every(({ id }) => {
    const asset = (assets as Record<string, Partial<Asset>>)[id];
    return asset?.name === expected[id] && typeof asset.bytes === 'number' && Number.isSafeInteger(asset.bytes) &&
      asset.bytes > 0 && typeof asset.sha256 === 'string' && /^[a-f0-9]{64}$/.test(asset.sha256);
  });
}

export default function DesktopDownloads() {
  const [release, setRelease] = useState<Release | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      const response = await fetch('/downloads/latest.json', { signal: controller.signal, cache: 'no-cache' });
      if (!response.ok) throw new Error('release');
      const data: unknown = await response.json();
      if (!isRelease(data)) throw new Error('release');
      if (!controller.signal.aborted) setRelease(data);
    })().catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [attempt]);

  if (!release) return <div className="release-status" role="status">
    {failed ? <>暂时未能读取下载信息。 <button onClick={() => { setFailed(false); setAttempt(n => n + 1); }}>重试</button></> : '正在读取安装包信息…'}
  </div>;

  return <section className="release-downloads" aria-label="桌面版下载">
    <div className="release-version">当前版本 {release.version}</div>
    <div className="release-platforms">{platforms.map(({ id, label, systems }) => {
      const asset = release.assets[id];
      return <div className="release-platform" key={id}>
        <a className="release-download" href={`/downloads/${release.version}/${asset.name}`} download={asset.name}>
          <span>下载 {label} 版</span><ArrowDownToLine size={18} aria-hidden="true"/>
        </a>
        <small>{systems} · {Math.round(asset.bytes / 1_000_000)} MB</small>
      </div>;
    })}</div>
    <details className="release-help">
      <summary>安装说明与文件校验<ChevronDown size={14} aria-hidden="true"/></summary>
      <p><strong>macOS</strong> 打开 DMG，将 BioInfoBuddy 拖入「应用程序」。</p>
      <p><strong>Windows</strong> 双击 Setup.exe，按向导完成安装。</p>
      <dl>{platforms.map(({ id, label }) => <div key={id}><dt>{label} SHA-256</dt><dd><code>{release.assets[id].sha256}</code></dd></div>)}</dl>
    </details>
  </section>;
}
