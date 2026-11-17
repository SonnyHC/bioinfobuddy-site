import { useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import umap from './media/pbmc-umap.webp';
import spatial from './media/gbm1-clusters.webp';
import markers from './media/pbmc-markers.webp';
import workbench from './media/workbench.webp';

const examples = [
  {
    sample: 'PBMC2700',
    type: '单细胞 RNA 测序',
    title: '细胞分群',
    image: umap,
    alt: 'PBMC2700 单细胞 UMAP，按 Seurat 聚类着色',
    description: '每个点代表一个细胞。通过 UMAP，可以观察不同细胞簇在二维空间中的分布。',
    caseId: 'single-cell',
  },
  {
    sample: 'GBM1',
    type: '空间转录组',
    title: '组织中的空间分布',
    image: spatial,
    alt: 'GBM1 切片上按空间聚类着色的采样位点',
    description: '把各个采样位点的聚类结果叠加到组织切片上，查看细胞群与组织结构的位置关系。',
    caseId: 'spatial',
  },
  {
    sample: 'PBMC2700',
    type: '标记基因',
    title: '标记基因表达',
    image: markers,
    alt: 'PBMC2700 各细胞簇的标记基因表达点图',
    description: '比较各个细胞簇的标记基因。点的大小表示表达细胞的比例，颜色表示平均表达水平。',
    caseId: 'single-cell',
  },
];

type Example = (typeof examples)[number];
function CaseLink({ item, base }: { item: Example; base?: string }) {
  if (!base) return null;
  const url = new URL(base);
  url.searchParams.set('case', item.caseId);
  return (
    <a className="inline-action" href={url.href} target="_blank" rel="noreferrer">
      查看完整案例 <ArrowUpRight size={15} />
    </a>
  );
}
export function Cases({ caseUrl }: { caseUrl?: string }) {
  const [selected, setSelected] = useState(0);
  const item = examples[selected];
  return (
    <section className="cases section-shell" id="cases" aria-labelledby="case-title">
      <div className="section-heading">
        <div>
          <p className="section-kicker">分析案例</p>
          <h2 id="case-title">走进真实数据</h2>
        </div>
        <span className="section-note">单细胞与空间转录组</span>
      </div>
      <div className="case-screen">
        <div className="case-info" aria-live="polite">
          <span className="dataset">
            {item.sample} / {item.type}
          </span>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
          <CaseLink item={item} base={caseUrl} />
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
        <div className="case-print">
          <img key={item.image} src={item.image} alt={item.alt} loading="lazy" />
        </div>
      </div>
    </section>
  );
}
export function Workbench({ href }: { href?: string }) {
  return (
    <section id="workbench" className="workbench section-shell" aria-labelledby="work-title">
      <div className="work-copy">
        <p className="section-kicker">工作台</p>
        <h2 id="work-title">从图表回到分析</h2>
        <p>在同一个案例里查看参数、原始图表和复现脚本。</p>
        {href && (
          <a className="inline-action" href={href} target="_blank" rel="noreferrer">
            浏览案例与图表 <ArrowUpRight size={16} />
          </a>
        )}
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
