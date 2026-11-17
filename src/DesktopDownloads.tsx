import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { platforms, readInstallers } from './desktop-release';

export default function DesktopDownloads() {
  const [downloads, setDownloads] = useState<ReturnType<typeof readInstallers>>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const response = await fetch('/downloads/latest.json', {
        signal: controller.signal,
        cache: 'no-cache',
      });
      if (!response.ok) throw new Error('Release unavailable');
      const installers = readInstallers(await response.json(), window.location.href);
      if (!controller.signal.aborted) setDownloads(installers);
    }
    load().catch(() => {
      if (!controller.signal.aborted) setFailed(true);
    });
    return () => controller.abort();
  }, [attempt]);

  if (failed) {
    return (
      <button
        className="launch-download"
        onClick={() => {
          setFailed(false);
          setAttempt((n) => n + 1);
        }}
      >
        重新获取下载链接
      </button>
    );
  }

  return (
    <div className="launch-installers" role="group" aria-label="桌面版下载">
      {platforms.map(({ id, label, hint }, index) => {
        const installer = downloads?.[index];
        const content = (
          <>
            <Download size={16} aria-hidden="true" />
            {label}
          </>
        );
        return installer ? (
          <a
            key={id}
            className="launch-download"
            href={installer.href}
            download={installer.name}
            title={hint}
          >
            {content}
          </a>
        ) : (
          <button key={id} className="launch-download" disabled>
            {content}
          </button>
        );
      })}
    </div>
  );
}
