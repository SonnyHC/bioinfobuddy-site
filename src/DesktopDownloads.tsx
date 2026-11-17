import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { readZipDownload } from './desktop-release';

export default function DesktopDownloads() {
  const [zip, setZip] = useState<ReturnType<typeof readZipDownload>>();
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
      const download = readZipDownload(await response.json(), window.location.href);
      if (!controller.signal.aborted) setZip(download);
    }
    load().catch(() => {
      if (!controller.signal.aborted) setFailed(true);
    });
    return () => controller.abort();
  }, [attempt]);

  if (zip) {
    return (
      <a className="launch-download" href={zip.href} download={zip.name}>
        <Download size={16} aria-hidden="true" /> 下载压缩包
      </a>
    );
  }
  return (
    <button
      className="launch-download"
      disabled={!failed}
      onClick={() => {
        setFailed(false);
        setAttempt((n) => n + 1);
      }}
    >
      <Download size={16} aria-hidden="true" /> {failed ? '重新获取下载链接' : '下载压缩包'}
    </button>
  );
}
