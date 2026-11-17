import { useEffect, useRef } from 'react';
import { Dna } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import DesktopDownloads from './DesktopDownloads';
import MoleculeStage from './MoleculeStage';
import { Cases, Workbench } from './Cases';
import './launch.css';

gsap.registerPlugin(ScrollTrigger);

function workbenchUrl(view: string) {
  try {
    const url = new URL(import.meta.env.VITE_WORKBENCH_URL || 'https://bioinfobuddy.com.cn/');
    if (url.protocol !== 'https:' || url.username || url.password) return;
    if (url.origin === location.origin && url.pathname === location.pathname) return;
    url.searchParams.set('view', view);
    return url.href;
  } catch {
    return;
  }
}

export default function Launch() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const motion = gsap.matchMedia();
    motion.add('(prefers-reduced-motion: no-preference)', () => {
      const ctx = gsap.context(() => {
        gsap.to('.molecule-object', {
          scale: 0.78,
          yPercent: -7,
          ease: 'none',
          scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
        });
        gsap.utils.toArray<HTMLElement>('.case-screen, .app-shot').forEach((el) => {
          gsap.from(el, {
            y: 24,
            duration: 0.65,
            ease: 'power2.out',
            scrollTrigger: { trigger: el, start: 'top 93%', once: true },
          });
        });
      }, root);
      return () => ctx.revert();
    });
    return () => motion.revert();
  }, []);
  const caseUrl = workbenchUrl('omics');
  return (
    <div className="launch" ref={root}>
      <header className="topbar">
        <div className="header-inner section-shell">
          <a className="brand" href="/" aria-label="BioInfoBuddy 首页">
            <span className="brand-mark">
              <Dna size={25} strokeWidth={1.7} />
            </span>
            BioInfoBuddy<span className="brand-dot">.</span>
          </a>
          <nav className="page-nav" aria-label="页内导航">
            <a href="#cases">案例与图表</a>
            <a href="#workbench">工作台功能</a>
          </nav>
        </div>
      </header>
      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-inner section-shell">
            <div className="hero-copy">
              <h1 id="hero-title">
                <span>让数据，</span>
                <em>显现生命的线索。</em>
              </h1>
              <DesktopDownloads webUrl={workbenchUrl('chat')} />
            </div>
            <MoleculeStage />
          </div>
        </section>
        <Cases caseUrl={caseUrl} />
        <Workbench skillsUrl={workbenchUrl('skills')} tutorialUrl={workbenchUrl('tutorial')} />
      </main>
      <footer className="section-shell">
        <span>BioInfoBuddy</span>
        <nav aria-label="发布页开源资料">
          <a href="/particle/NOTICE" target="_blank" rel="noreferrer">
            开源说明
          </a>
          <a href="/particle/release-site-source.zip" download>
            发布页源码
          </a>
        </nav>
      </footer>
    </div>
  );
}
