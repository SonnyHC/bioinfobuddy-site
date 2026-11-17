import { useEffect, useState } from 'react';
import { Archive, ArrowDownToLine, ArrowUpRight, ChevronDown, Globe2 } from 'lucide-react';

import { platforms, readRelease, type Release } from './desktop-release';

export default function DesktopDownloads({ webUrl }: { webUrl?: string }) {
  const [release, setRelease] = useState<Release | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      const response = await fetch('/downloads/latest.json', {
        signal: controller.signal,
        cache: 'no-cache',
      });
      if (!response.ok) throw new Error('release');
      const data = readRelease(await response.json(), window.location.href);
      if (!controller.signal.aborted) setRelease(data);
    })().catch(() => {
      if (!controller.signal.aborted) setFailed(true);
    });
    return () => controller.abort();
  }, [attempt]);

  const webLink = webUrl && (
    <a className="web-link" href={webUrl} target="_blank" rel="noreferrer">
      <Globe2 size={15} /> 打开网页版 <ArrowUpRight size={13} />
    </a>
  );
  if (!release)
    return (
      <div className="release-status" role="status">
        {failed ? (
          <>
            暂时未能读取下载信息。{' '}
            <button
              onClick={() => {
                setFailed(false);
                setAttempt((n) => n + 1);
              }}
            >
              重试
            </button>
          </>
        ) : (
          '正在读取安装包信息…'
        )}
        {webLink}
      </div>
    );

  const { installers, zip } = release;
  const zipLink = zip && (
    <a className={installers ? 'web-link' : 'release-download'} href={zip.href} download={zip.name}>
      <Archive size={16} aria-hidden="true" />
      <span>下载双平台 ZIP</span>
      {!installers && <ArrowDownToLine size={18} aria-hidden="true" />}
    </a>
  );
  const checksums: { label: string; hash: string }[] = installers
    ? platforms.map(({ id, label }) => ({ label, hash: installers[id].sha256 }))
    : [];
  if (zip?.metadata) checksums.push({ label: 'ZIP', hash: zip.metadata.sha256 });

  return (
    <section className="release-downloads" aria-label="桌面版下载">
      <div className="release-version">
        当前版本 <span>{release.version}</span>
      </div>
      {installers ? (
        <div className="release-platforms">
          {platforms.map(({ id, label, systems }) => {
            const asset = installers[id];
            return (
              <div className="release-platform" key={id}>
                <a
                  className="release-download"
                  href={`/downloads/${release.version}/${asset.name}`}
                  download={asset.name}
                >
                  <span>下载 {label} 版</span>
                  <ArrowDownToLine size={18} aria-hidden="true" />
                </a>
                <small>
                  {systems} · {Math.round(asset.bytes / 1_000_000)} MB
                </small>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="release-platform release-bundle">
          {zipLink}
          <small>
            内含 macOS 和 Windows 安装包
            {zip?.metadata && ` · ${Math.round(zip.metadata.bytes / 1_000_000)} MB`}
          </small>
        </div>
      )}
      <div className="secondary-actions">
        {webLink}
        {installers && zipLink}
        <details className="release-help">
          <summary>
            {checksums.length ? '安装说明与文件校验' : '安装说明'}
            <ChevronDown size={14} aria-hidden="true" />
          </summary>
          {zip && (
            <p>
              <strong>ZIP</strong> 解压后，在版本目录中选择自己系统的安装包。
            </p>
          )}
          <p>
            <strong>macOS</strong> 打开 DMG，将 BioInfoBuddy 拖入「应用程序」。
          </p>
          <p>
            <strong>Windows</strong> 双击 Setup.exe，按向导完成安装。
          </p>
          <dl>
            {checksums.map(({ label, hash }) => (
              <div key={label}>
                <dt>{label} SHA-256</dt>
                <dd>
                  <code>{hash}</code>
                </dd>
              </div>
            ))}
          </dl>
        </details>
      </div>
    </section>
  );
}
