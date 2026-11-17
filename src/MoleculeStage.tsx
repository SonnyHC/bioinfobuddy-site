import { useEffect, useRef, useState } from 'react';
import { Dna, Pause, Play, RotateCw, SlidersHorizontal, X } from 'lucide-react';
import type { mountHelix as mount } from './particle/scene.js';

type Owner = ReturnType<typeof mount>;
export default function MoleculeStage() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const owner = useRef<Owner>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState('loading');
  const [scene, setScene] = useState<'double-helix' | 'protein'>('double-helix');
  const [brush, setBrush] = useState(true);
  const [projection, setProjection] = useState('perspective');
  const [settings, setSettings] = useState(false);
  useEffect(() => {
    let ended = false;
    import('./particle/scene.js')
      .then(({ mountHelix }) => {
        if (ended || !canvas.current) return;
        owner.current = mountHelix(canvas.current, {
          theme: 'dark',
          onState: setState,
          onScene: setScene,
        });
        if (!owner.current) setState('unsupported');
      })
      .catch(() => {
        if (!ended) setState('unsupported');
      });
    return () => {
      ended = true;
      owner.current?.dispose();
      owner.current = null;
    };
  }, []);
  useEffect(() => {
    owner.current?.configure({ brush: brush ? 1.1 : 0, projection });
  }, [brush, projection]);
  useEffect(() => {
    if (settings) dialog.current?.showModal();
    else dialog.current?.close();
  }, [settings]);
  const disabled = state === 'loading' || state === 'unsupported';
  const name = scene === 'double-helix' ? 'DNA 双螺旋' : '蛋白质折叠';
  const label = scene === 'double-helix' ? '01 / DNA DOUBLE HELIX' : '02 / PROTEIN FOLD';
  const switchLabel =
    scene === 'double-helix'
      ? 'DNA 双螺旋粒子造型，点击切换为蛋白质'
      : '蛋白质粒子造型，点击切换为 DNA 双螺旋';
  const status: Record<string, string> = {
    reduced: '减少动态效果 · 点击切换静态造型',
    paused: '已暂停 · 点击切换静态造型',
    loading: '正在构建粒子造型…',
    unsupported: '生命的形状 · 静态示意',
  };
  return (
    <figure className="molecule-stage">
      <div className="molecular-field">
        <div className="orbit orbit-a" />
        <div className="orbit orbit-b" />
        <div className="molecule-object">
          <canvas
            ref={canvas}
            tabIndex={disabled ? -1 : 0}
            role="button"
            aria-label={switchLabel}
            aria-describedby="particle-interaction"
            aria-disabled={disabled}
            onKeyDown={(e) => {
              if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                if (!e.repeat) owner.current?.next();
              }
            }}
          >
            粒子构成的 DNA 双螺旋与蛋白质三维造型。点击或按 Enter、空格键切换造型。
          </canvas>
        </div>
        {state === 'unsupported' && (
          <div className="molecule-fallback">
            <div>
              <Dna size={128} strokeWidth={1} />
              <p>从生命的线索，开始探索。</p>
            </div>
          </div>
        )}
      </div>
      <figcaption>
        <span className="molecule-name">
          <i />
          {name}
          <small>{label}</small>
        </span>
        <span className="motion-actions">
          <button
            disabled={disabled}
            aria-label="切换分子造型"
            title="切换分子造型"
            onClick={() => owner.current?.next()}
          >
            <RotateCw size={16} />
          </button>
          <button
            disabled={disabled || state === 'reduced'}
            aria-label={state === 'paused' ? '播放动画' : '暂停动画'}
            title={state === 'paused' ? '播放动画' : '暂停动画'}
            onClick={() => owner.current?.pause()}
          >
            {state === 'paused' ? <Play size={15} /> : <Pause size={15} />}
          </button>
          <button aria-label="造型显示设置" title="造型显示设置" onClick={() => setSettings(true)}>
            <SlidersHorizontal size={16} />
          </button>
        </span>
        <span className="particle-interaction" id="particle-interaction">
          {status[state]}
        </span>
      </figcaption>
      <dialog
        ref={dialog}
        onClose={() => setSettings(false)}
        onCancel={() => setSettings(false)}
        aria-labelledby="scene-settings"
      >
        <header>
          <h2 id="scene-settings">造型显示</h2>
          <button aria-label="关闭显示设置" onClick={() => setSettings(false)}>
            <X size={18} />
          </button>
        </header>
        <p>选择你喜欢的观看方式。</p>
        <label>
          镜头
          <select value={projection} onChange={(e) => setProjection(e.target.value)}>
            <option value="perspective">固定透视 · 呈现纵深</option>
            <option value="orthographic">正交视角 · 保持比例</option>
          </select>
        </label>
        <label>
          <span>指针互动</span>
          <input type="checkbox" checked={brush} onChange={(e) => setBrush(e.target.checked)} />
        </label>
        <button
          className="static-toggle"
          disabled={disabled || state === 'reduced'}
          onClick={() => owner.current?.pause(state !== 'paused')}
        >
          {state === 'paused' ? '恢复自动动画' : '切换为静态造型'}
        </button>
        <small>DNA 双螺旋与蛋白质造型均为艺术化示意。</small>
      </dialog>
    </figure>
  );
}
