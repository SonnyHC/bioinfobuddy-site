import { useEffect, useState } from 'react';
import { platforms, readInstallers } from './desktop-release';

const platformIconPaths = {
  macos:
    'M16.5 1.8c.1 1.3-.5 2.6-1.3 3.5-.8.9-2.1 1.6-3.4 1.5-.2-1.3.5-2.6 1.3-3.5.8-.9 2.2-1.5 3.4-1.5ZM19 12.4c0-2 1.1-3.3 2.2-4.1-1.3-1.7-3.1-2.1-4.2-2.1-1.7-.1-3.2 1.1-4.2 1.1-1.1 0-2.4-1.1-4-1.1-2 0-3.9 1.2-4.9 3-2.1 3.6-.5 8.7 1.5 11.4.9 1.3 1.9 2.5 3.4 2.4 1.4 0 2-1 3.9-1s2.5 1 4 1c1.6 0 2.5-1.2 3.4-2.5 1-1.4 1.5-2.8 1.7-3.3-1.6-.7-2.8-2.3-2.8-4.8Z',
  windows: 'M2 2h9.2v9.2H2z M12.8 2H22v9.2h-9.2z M2 12.8h9.2V22H2z M12.8 12.8H22V22h-9.2z',
};

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
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
              focusable="false"
            >
              <path d={platformIconPaths[id]} />
            </svg>
            {label}
          </>
        );
        return installer ? (
          <a
            key={id}
            className="launch-download"
            data-platform={id}
            href={installer.href}
            download={installer.name}
            title={hint}
          >
            {content}
          </a>
        ) : (
          <button key={id} className="launch-download" data-platform={id} disabled>
            {content}
          </button>
        );
      })}
    </div>
  );
}
