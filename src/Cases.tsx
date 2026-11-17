import { useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import umap from './media/pbmc-umap.webp';
import spatial from './media/gbm1-clusters.webp';
import markers from './media/pbmc-markers.webp';
import workbench from './media/workbench.webp';

const examples = [
  {
    image: umap,
    alt: 'PBMC2700 单细胞 UMAP，按 Seurat 聚类着色',
    caseId: 'single-cell',
  },
  {
    image: spatial,
    alt: 'GBM1 切片上按空间聚类着色的采样位点',
    caseId: 'spatial',
  },
  {
    image: markers,
    alt: 'PBMC2700 各细胞簇的标记基因表达点图',
    caseId: 'single-cell',
  },
];

export function Cases({ caseUrl }: { caseUrl?: string }) {
  const [selected, setSelected] = useState(0);
  const item = examples[selected];
  const url = caseUrl ? new URL(caseUrl) : undefined;
  url?.searchParams.set('case', item.caseId);
  return (
    <section className="cases section-shell" id="cases" aria-labelledby="case-title">
      <div className="case-screen">
        <div className="case-info">
          <h2 id="case-title">
            {url ? (
              <a href={url.href} target="_blank" rel="noreferrer">
                案例与图表 <ArrowUpRight size={20} />
              </a>
            ) : (
              '案例与图表'
            )}
          </h2>
          <p>查看案例原图、数据与复现代码。</p>
          <div className="case-controls">
            <button
              aria-label="上一张案例图"
              onClick={() => setSelected((selected + examples.length - 1) % examples.length)}
            >
              <ArrowLeft size={18} />
            </button>
            <span>
              {selected + 1} / {examples.length}
            </span>
            <button
              aria-label="下一张案例图"
              onClick={() => setSelected((selected + 1) % examples.length)}
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
        <div className="case-print" aria-live="polite" aria-atomic="true">
          <img key={item.image} src={item.image} alt={item.alt} loading="lazy" />
        </div>
      </div>
    </section>
  );
}
export function Workbench({
  skillsUrl,
  tutorialUrl,
}: {
  skillsUrl?: string;
  tutorialUrl?: string;
}) {
  const features = [
    { title: '数据分析技能', description: '查看表格检查、绘图和单细胞分析流程。', href: skillsUrl },
    {
      title: '使用教程',
      description: '阅读质控、细胞注释、差异表达与富集教程。',
      href: tutorialUrl,
    },
  ];
  return (
    <section id="workbench" className="workbench section-shell" aria-label="工作台功能">
      <div className="work-features">
        {features.map(({ title, description, href }) => (
          <div className="work-copy" key={title}>
            <h2>
              {href ? (
                <a href={href} target="_blank" rel="noreferrer">
                  {title} <ArrowUpRight size={20} />
                </a>
              ) : (
                title
              )}
            </h2>
            <p>{description}</p>
          </div>
        ))}
      </div>
      <figure className="app-shot">
        <img
          src={workbench}
          loading="lazy"
          alt="当前 BioInfoBuddy 工作台，左侧导航与 PBMC2700 案例的四张分析图"
        />
      </figure>
    </section>
  );
}
