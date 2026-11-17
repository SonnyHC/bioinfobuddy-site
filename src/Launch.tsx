import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Dna,
  Moon,
  Sun,
  Pause,
  Play,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import DesktopDownloads from './DesktopDownloads';
import './launch.css';

function workbenchLink(view: 'chat' | 'skills' | 'omics') {
  const defaultUrl = 'https://bioinfobuddy.com.cn/';
  let url = new URL(defaultUrl);
  try {
    const configured = new URL(import.meta.env.VITE_WORKBENCH_URL || defaultUrl);
    if (configured.protocol === 'https:' && !configured.username && !configured.password)
      url = configured;
  } catch {
    // Use the public workbench when the configured address is invalid.
  }
  url.searchParams.set('view', view);
  return url.href;
}

interface ParticleOwner {
  dispose(): void;
  pause(value?: boolean): void;
  refresh(): void;
  next(): void;
  configure(value: {
    brush?: number;
    projection?: string;
    materials?: Record<string, number[]>;
  }): void;
}
interface ParticleModule {
  mountHelix(
    canvas: HTMLCanvasElement,
    options: {
      theme: string;
      onState: (state: string) => void;
      onScene: (scene: 'double-helix' | 'protein') => void;
    },
  ): ParticleOwner | null;
  themes: Record<string, Record<string, number[]>>;
}

export default function Launch() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const owner = useRef<ParticleOwner | null>(null);
  const module = useRef<ParticleModule | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [state, setState] = useState('loading');
  const [scene, setScene] = useState<'double-helix' | 'protein'>('double-helix');
  const [brush, setBrush] = useState(true);
  const [projection, setProjection] = useState('perspective');
  const [settings, setSettings] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    document.title = 'BioInfoBuddy · 让数据，显现生命的线索';
    let disposed = false;
    void import('./particle/scene.js')
      .then((runtime: ParticleModule) => {
        if (disposed || !canvas.current) return;
        module.current = runtime;
        owner.current = runtime.mountHelix(canvas.current, {
          theme: 'light',
          onState: setState,
          onScene: setScene,
        });
      })
      .catch(() => {
        if (!disposed) setState('unsupported');
      });
    return () => {
      disposed = true;
      owner.current?.dispose();
      owner.current = null;
    };
  }, []);
  useEffect(() => {
    if (module.current) owner.current?.configure({ materials: module.current.themes[theme] });
  }, [theme, state === 'loading']);
  useEffect(() => {
    owner.current?.configure({ brush: brush ? 1.1 : 0, projection });
  }, [brush, projection, state === 'loading']);
  useEffect(() => {
    if (settings) dialog.current?.showModal();
    else dialog.current?.close();
  }, [settings]);
  const unavailable = state === 'loading' || state === 'unsupported';
  return (
    <div className="launch" data-theme={theme}>
      <header className="launch-header">
        <a href="/" className="launch-brand" aria-label="BioInfoBuddy 首页">
          <Dna size={27} />
          <span>
            BioinfoBuddy<span className="launch-brand-dot">.</span>
          </span>
        </a>
        <div className="launch-header-actions">
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label={theme === 'light' ? '切换深色' : '切换浅色'}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>
      <main>
        <section className="launch-hero" aria-labelledby="launch-title">
          <div className="launch-copy">
            <p className="launch-kicker">
              <span /> YOUR BIOINFORMATICS COMPANION
            </p>
            <h1 id="launch-title">
              让数据，
              <br />
              显现生命的
              <span className="launch-title-end">
                线索<span className="launch-title-dot">。</span>
              </span>
            </h1>
            <p className="launch-intro">
              从一个问题，到一份清晰的结果。
              <br />与 AI 一起整理实验数据、探索分析技能，
              <br className="launch-desktop-break" />
              让科研中的下一步，更容易开始。
            </p>
            <div className="launch-cta">
              <a href={workbenchLink('chat')} className="launch-primary">
                开始探索
                <ArrowRight size={19} />
              </a>
              <DesktopDownloads />
            </div>
          </div>
          <figure className="launch-sculpture">
            <div className="launch-scene-label">
              <span>
                {scene === 'double-helix' ? '01 / DNA DOUBLE HELIX' : '02 / PROTEIN FOLD'}
              </span>
              <span>{scene === 'double-helix' ? 'DNA 双螺旋' : '蛋白质折叠'}</span>
            </div>
            <canvas
              ref={canvas}
              role="button"
              tabIndex={unavailable ? -1 : 0}
              aria-disabled={unavailable}
              aria-label={
                scene === 'double-helix'
                  ? 'DNA 双螺旋粒子造型，点击切换为蛋白质'
                  : '蛋白质粒子造型，点击切换为 DNA 双螺旋'
              }
              aria-describedby="particle-interaction"
              data-motion={state}
              onKeyDown={(event) => {
                if (!unavailable && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  if (!event.repeat) owner.current?.next();
                }
              }}
            >
              粒子构成的 DNA 双螺旋与蛋白质三维造型。点击或按 Enter、空格键切换造型。
            </canvas>
            {state === 'unsupported' && (
              <div className="launch-fallback">
                <Dna size={112} strokeWidth={0.7} />
                <p>从生命的线索，开始探索。</p>
              </div>
            )}
            <figcaption>
              <span id="particle-interaction">
                {state === 'reduced'
                  ? '减少动态效果 · 点击切换静态造型'
                  : state === 'paused'
                    ? '已暂停 · 点击切换静态造型'
                    : state === 'loading'
                      ? '正在构建粒子造型…'
                      : state === 'unsupported'
                        ? '生命的形状 · 静态示意'
                        : ''}
              </span>
              <div>
                <button
                  disabled={unavailable || state === 'reduced'}
                  onClick={() => owner.current?.pause()}
                  aria-label={state === 'paused' ? '播放动画' : '暂停动画'}
                >
                  {state === 'paused' ? <Play size={15} /> : <Pause size={15} />}
                </button>
                <button onClick={() => setSettings(true)} aria-label="造型显示设置">
                  <SlidersHorizontal size={15} />
                </button>
              </div>
            </figcaption>
          </figure>
        </section>
        <section className="launch-pathways" aria-label="开始你的科研工作">
          <a href={workbenchLink('chat')}>
            <span className="launch-path-number">01</span>
            <div>
              <h2>从问题开始</h2>
              <p>把分析需求，变成可检查的步骤。</p>
            </div>
            <ArrowUpRight size={20} />
          </a>
          <a href={workbenchLink('skills')}>
            <span className="launch-path-number">02</span>
            <div>
              <h2>找到合适的技能</h2>
              <p>按任务选择流程，让 AI 有章可循。</p>
            </div>
            <ArrowUpRight size={20} />
          </a>
          <a href={workbenchLink('omics')}>
            <span className="launch-path-number">03</span>
            <div>
              <h2>学习与复现案例</h2>
              <p>查看附件原图、数据与复现代码。</p>
            </div>
            <ArrowUpRight size={20} />
          </a>
        </section>
      </main>
      <footer className="launch-footer">
        <span>为好奇心，留出更多时间。</span>
        <span>SCIENCE STARTS WITH A QUESTION.</span>
        <a href="/particle/NOTICE" target="_blank" rel="noopener noreferrer">
          粒子引擎 · 开源说明
        </a>
      </footer>
      <dialog
        ref={dialog}
        className="launch-dialog"
        onCancel={() => setSettings(false)}
        onClose={() => setSettings(false)}
        aria-labelledby="particle-settings-title"
      >
        <header>
          <h2 id="particle-settings-title">造型显示</h2>
          <button aria-label="关闭显示设置" onClick={() => setSettings(false)}>
            <X size={20} />
          </button>
        </header>
        <p>选择你喜欢的观看方式。</p>
        <label>
          <span>镜头</span>
          <select value={projection} onChange={(e) => setProjection(e.target.value)}>
            <option value="perspective">固定透视 · 呈现纵深</option>
            <option value="orthographic">正交视角 · 保持比例</option>
          </select>
        </label>
        <label className="launch-check">
          <input type="checkbox" checked={brush} onChange={(e) => setBrush(e.target.checked)} />
          <span>指针互动</span>
        </label>
        <button
          className="launch-static"
          disabled={unavailable || state === 'reduced'}
          onClick={() => owner.current?.pause(state !== 'paused')}
        >
          {state === 'paused' ? '恢复自动动画' : '切换为静态造型'}
        </button>
        <small>DNA 双螺旋与蛋白质造型均为艺术化示意。</small>
      </dialog>
    </div>
  );
}
