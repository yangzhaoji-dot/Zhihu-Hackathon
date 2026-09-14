"use client";

import { ArrowLeft, ArrowRight, BookOpen, LoaderCircle, Telescope } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { readGalaxy } from "@/lib/cognitive-galaxy/session";
import type { LawVisual, PlanetLawDefinition } from "@/lib/opinion/law-catalog";
import styles from "./planet-law-mvp.module.css";

type LawMatch = {
  confidence: number;
  mechanism: string;
  reason: string;
  mapping: string;
  boundary: string;
  source: "ai" | "fallback";
  model?: string;
};

type LawResponse = { ok: true; law: PlanetLawDefinition; match: LawMatch };

type Slide = {
  label: string;
  title: string;
  math?: string;
  lawCopy?: string;
  reality?: string;
  tone?: "default" | "climax";
  visual: LawVisual | "records";
};

function linePath(visual: LawVisual) {
  if (visual === "growth") return "M54 246 C96 242 126 222 152 188 C187 141 215 92 306 84 C345 81 374 83 408 84";
  if (visual === "exponential") return "M54 250 C145 248 224 230 277 188 C326 149 361 99 407 56";
  return "M54 244 C138 230 222 184 315 100 C348 72 378 58 408 52";
}

function LawDiagram({ law, records }: { law: PlanetLawDefinition; records: number }) {
  if (law.visual === "bifurcation") {
    return (
      <div className={styles.diagramWrap} aria-hidden>
        <div className={styles.diagramCaption}>SADDLE-NODE BIFURCATION</div>
        <svg className={styles.diagram} viewBox="0 0 460 320">
          <line className={styles.axis} x1="56" y1="160" x2="414" y2="160" />
          <line className={styles.axis} x1="328" y1="40" x2="328" y2="282" />
          <path className={styles.unstableBranch} d="M72 74 C160 78 271 113 328 160" />
          <path className={styles.stableBranch} d="M72 246 C160 242 271 207 328 160" />
          <line className={styles.thresholdLine} x1="328" y1="66" x2="328" y2="258" />
          <circle className={styles.marker} cx="248" cy="198" r="6" />
          <text className={styles.branchLabel} x="86" y="58">不稳定态</text>
          <text className={styles.branchLabel} x="86" y="270">稳定态</text>
          <text className={styles.thresholdLabel} x="298" y="298">临界点</text>
        </svg>
        <div className={styles.diagramNote}>稳定分支与不稳定分支在临界点汇合。</div>
      </div>
    );
  }

  if (law.visual === "belief") {
    return (
      <div className={styles.diagramWrap} aria-hidden>
        <div className={styles.diagramCaption}>BAYESIAN UPDATE</div>
        <svg className={styles.diagram} viewBox="0 0 460 320">
          <line className={styles.axis} x1="60" y1="258" x2="408" y2="258" />
          <rect x="100" y="154" width="72" height="104" rx="8" fill="rgba(144,172,230,.22)" />
          <rect x="288" y="82" width="72" height="176" rx="8" fill="rgba(226,202,149,.42)" />
          <path d="M182 170 C220 138 244 118 278 106" fill="none" stroke="rgba(220,230,247,.42)" strokeWidth="2" strokeDasharray="6 7" />
          <text className={styles.branchLabel} x="110" y="286">先验</text>
          <text className={styles.thresholdLabel} x="298" y="286">后验</text>
          <text className={styles.branchLabel} x="192" y="130">新证据 E</text>
        </svg>
        <div className={styles.diagramNote}>证据进入以后，原来的相信程度被重新分配。</div>
      </div>
    );
  }

  if (law.visual === "pareto") {
    return (
      <div className={styles.diagramWrap} aria-hidden>
        <div className={styles.diagramCaption}>PARETO FRONTIER</div>
        <svg className={styles.diagram} viewBox="0 0 460 320">
          <line className={styles.axis} x1="62" y1="258" x2="410" y2="258" />
          <line className={styles.axis} x1="62" y1="258" x2="62" y2="48" />
          <path d="M92 82 C166 92 246 128 304 178 C341 210 367 232 398 248" fill="none" stroke="rgba(217,198,151,.64)" strokeWidth="3" />
          {[0,1,2,3].map((i) => <circle key={i} cx={118 + i * 70} cy={92 + i * 35} r="5" fill="rgba(226,232,244,.72)" />)}
          <text className={styles.branchLabel} x="260" y="92">帕累托前沿</text>
          <text className={styles.branchLabel} x="360" y="283">目标 A</text>
          <text className={styles.branchLabel} x="24" y="62">目标 B</text>
        </svg>
        <div className={styles.diagramNote}>沿着前沿继续改善一个目标，就必须交换另一个目标。</div>
      </div>
    );
  }

  if (law.visual === "game") {
    return (
      <div className={styles.diagramWrap} aria-hidden>
        <div className={styles.diagramCaption}>STRATEGIC EQUILIBRIUM</div>
        <svg className={styles.diagram} viewBox="0 0 460 320">
          <rect x="105" y="65" width="250" height="190" rx="18" fill="none" stroke="rgba(176,195,226,.16)" />
          <line className={styles.axis} x1="230" y1="65" x2="230" y2="255" />
          <line className={styles.axis} x1="105" y1="160" x2="355" y2="160" />
          <circle cx="292" cy="207" r="10" fill="rgba(226,202,149,.72)" />
          <circle cx="167" cy="112" r="5" fill="rgba(177,197,234,.38)" />
          <text className={styles.thresholdLabel} x="272" y="234">均衡</text>
          <text className={styles.branchLabel} x="148" y="292">任何一方单独改变都未必更好</text>
        </svg>
        <div className={styles.diagramNote}>稳定不等于理想；均衡只意味着单独偏离缺乏动力。</div>
      </div>
    );
  }

  if (law.visual === "decision" || law.visual === "value") {
    return (
      <div className={styles.diagramWrap} aria-hidden>
        <div className={styles.diagramCaption}>{law.visual === "decision" ? "STOP OR CONTINUE" : "LONG-HORIZON VALUE"}</div>
        <svg className={styles.diagram} viewBox="0 0 460 320">
          <circle cx="92" cy="160" r="8" fill="rgba(230,234,244,.82)" />
          <path d="M100 160 C160 160 176 96 238 96" fill="none" stroke="rgba(151,178,232,.42)" strokeWidth="3" />
          <path d="M100 160 C160 160 176 224 238 224" fill="none" stroke="rgba(215,193,145,.5)" strokeWidth="3" />
          <path d="M246 96 C300 96 328 70 392 70" fill="none" stroke="rgba(151,178,232,.26)" strokeWidth="2" />
          <path d="M246 96 C300 96 328 132 392 132" fill="none" stroke="rgba(151,178,232,.26)" strokeWidth="2" />
          <circle cx="238" cy="96" r="7" fill="rgba(182,202,241,.72)" />
          <circle cx="238" cy="224" r="7" fill="rgba(226,202,149,.72)" />
          <text className={styles.branchLabel} x="260" y="88">继续</text>
          <text className={styles.thresholdLabel} x="260" y="232">现在停止</text>
        </svg>
        <div className={styles.diagramNote}>比较的不是两个标签，而是它们通向的后续状态。</div>
      </div>
    );
  }

  if (law.visual === "entropy") {
    const heights = [56, 118, 88, 142, 74, 126];
    return (
      <div className={styles.diagramWrap} aria-hidden>
        <div className={styles.diagramCaption}>INFORMATION UNCERTAINTY</div>
        <svg className={styles.diagram} viewBox="0 0 460 320">
          <line className={styles.axis} x1="60" y1="250" x2="410" y2="250" />
          {heights.map((h, i) => <rect key={i} x={86 + i * 50} y={250 - h} width="28" height={h} rx="5" fill={i === 3 ? "rgba(226,202,149,.48)" : "rgba(147,175,231,.24)"} />)}
          <text className={styles.branchLabel} x="148" y="286">可能性分布越分散，不确定性越高</text>
        </svg>
        <div className={styles.diagramNote}>熵关注的是未知如何分布，而不是单纯有多少信息。</div>
      </div>
    );
  }

  if (law.visual === "queue") {
    return (
      <div className={styles.diagramWrap} aria-hidden>
        <div className={styles.diagramCaption}>LITTLE&apos;S LAW</div>
        <svg className={styles.diagram} viewBox="0 0 460 320">
          {[0,1,2,3,4,5].map((i) => <circle key={i} cx={72 + i * 44} cy="160" r="12" fill="rgba(151,178,232,.24)" stroke="rgba(188,205,235,.28)" />)}
          <path d="M332 112 L398 112 L398 208 L332 208 Z" fill="rgba(216,194,147,.08)" stroke="rgba(216,194,147,.28)" />
          <path d="M300 160 L330 160" stroke="rgba(225,231,242,.42)" strokeWidth="2" />
          <text className={styles.branchLabel} x="82" y="206">L：系统中的平均在途数量</text>
          <text className={styles.thresholdLabel} x="343" y="166">处理</text>
        </svg>
        <div className={styles.diagramNote}>到达持续发生时，堆积会直接体现在平均等待时间上。</div>
      </div>
    );
  }

  return (
    <div className={styles.diagramWrap} aria-hidden>
      <div className={styles.diagramCaption}>{law.visual === "growth" ? "SATURATING GROWTH" : "COMPOUND GROWTH"}</div>
      <svg className={styles.diagram} viewBox="0 0 460 320">
        <line className={styles.axis} x1="54" y1="256" x2="412" y2="256" />
        <line className={styles.axis} x1="54" y1="256" x2="54" y2="42" />
        <path d={linePath(law.visual)} fill="none" stroke="rgba(205,218,246,.62)" strokeWidth="4" strokeLinecap="round" />
        {law.visual === "growth" ? <line x1="54" y1="84" x2="410" y2="84" stroke="rgba(216,194,147,.24)" strokeDasharray="6 7" /> : null}
      </svg>
      <div className={styles.diagramNote}>{law.visual === "growth" ? "增长逐渐接近承载上限。" : "固定比例差异被时间持续复合。"}</div>
    </div>
  );
}

function RecordDiagram({ count }: { count: number }) {
  return (
    <div className={styles.recordsVisual} aria-hidden>
      <span className={styles.recordOrbit} />
      <div className={`${styles.recordCard} ${styles.recordOne}`}><i />E-001</div>
      <div className={`${styles.recordCard} ${styles.recordTwo}`}><i />E-002</div>
      {count > 2 ? <div className={`${styles.recordCard} ${styles.recordThree}`}><i />E-003</div> : null}
      <div className={styles.recordCore}>ECHO ARCHIVE</div>
    </div>
  );
}

export function DynamicPlanetLaw({ opinionId }: { opinionId: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const galaxyId = search.get("galaxy");
  const originId = search.get("origin") || opinionId;
  const graph = useMemo(() => (galaxyId ? readGalaxy(galaxyId) : null), [galaxyId]);
  const opinion = graph?.opinions.find((item) => item.id === originId || item.id === opinionId) ?? null;
  const sources = graph && opinion ? graph.sources.filter((source) => opinion.sourceIds.includes(source.id)) : [];

  const [lawResult, setLawResult] = useState<LawResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    if (!opinion) return;
    const controller = new AbortController();
    setLawResult(null);
    setFailed(false);
    void fetch("/api/opinion/law", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: opinion.title,
        summary: opinion.summary,
        sources: sources.map((source) => source.excerpt).slice(0, 5),
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || data?.ok !== true) throw new Error(data?.error || "law_match_failed");
        setLawResult(data as LawResponse);
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") setFailed(true);
      });
    return () => controller.abort();
  }, [opinion, sources]);

  const returnToGalaxy = () => {
    if (!galaxyId) return router.back();
    const params = new URLSearchParams();
    const cluster = search.get("cluster");
    if (cluster) params.set("cluster", cluster);
    params.set("focus", originId);
    router.push(`/galaxy/${encodeURIComponent(galaxyId)}?${params.toString()}`);
  };

  const openObservations = () => {
    const params = new URLSearchParams(search.toString());
    router.push(`/world/${encodeURIComponent(opinionId)}/observations${params.size ? `?${params.toString()}` : ""}`);
  };

  if (!opinion) {
    return (
      <main className={styles.page}>
        <div className={styles.glow} aria-hidden />
        <header className={styles.topbar}><button className={styles.backButton} onClick={returnToGalaxy}><ArrowLeft size={15}/>返回主星系</button></header>
        <section className={styles.stage}><div className={styles.stageInner}><div className={styles.narrativeSide}><span className={styles.label}>PLANET SIGNAL LOST</span><h1 className={styles.title}>这颗星球的记录没有留在当前会话里。</h1><p className={styles.lawCopy}>请从主星系重新进入这颗星球。</p></div></div></section>
      </main>
    );
  }

  if (!lawResult && !failed) {
    return (
      <main className={styles.page}>
        <div className={styles.glow} aria-hidden />
        <header className={styles.topbar}><button className={styles.backButton} onClick={returnToGalaxy}><ArrowLeft size={15}/>返回主星系</button><span className={styles.coordinates}>PLANET LAW · RESOLVING</span></header>
        <section className={styles.stage}><div className={styles.stageInner}><div className={styles.narrativeSide}><span className={styles.label}>LAW RESOLVER</span><h1 className={styles.title}>正在解析这颗星球的法则。</h1><p className={styles.lawCopy}>AI 只会从已经校验过的真实数学原型中选择，不会现场发明公式。</p></div><aside className={styles.visualSide}><LoaderCircle size={46} className={styles.markerHalo}/></aside></div></section>
      </main>
    );
  }

  if (!lawResult || failed) {
    return (
      <main className={styles.page}>
        <div className={styles.glow} aria-hidden />
        <header className={styles.topbar}><button className={styles.backButton} onClick={returnToGalaxy}><ArrowLeft size={15}/>返回主星系</button></header>
        <section className={styles.stage}><div className={styles.stageInner}><div className={styles.narrativeSide}><span className={styles.label}>LAW UNRESOLVED</span><h1 className={styles.title}>这颗星球的法则暂时无法解析。</h1><p className={styles.lawCopy}>观点和真实回答仍然保留，但当前没有可靠的公式匹配结果。</p></div></div></section>
      </main>
    );
  }

  const { law, match } = lawResult;
  const slides: Slide[] = [
    {
      label: `观点星球 · 法则已解析 · ${law.name}`,
      title: opinion.title,
      math: law.formula,
      lawCopy: law.definition,
      tone: "climax",
      visual: law.visual,
    },
    {
      label: `法则原义 · ${law.field}`,
      title: law.mechanism,
      math: law.formula,
      lawCopy: match.reason,
      reality: "这一步只解释数学结构本身。公式不负责替观点判对错，它只提供一种已经被研究过的结构。",
      visual: law.visual,
    },
    {
      label: "结构映射 · 从法则到观点",
      title: match.mechanism,
      lawCopy: match.mapping,
      reality: `匹配置信度 ${Math.round(match.confidence * 100)}%。这里寻找的是机制上的相似，而不是用数学给现实结论盖章。`,
      visual: law.visual,
    },
    {
      label: "LAW BOUNDARY · 法则边界",
      title: "它能照亮结构，却不能替现实作决定。",
      lawCopy: match.boundary,
      reality: "因此，这颗星球仍需要回到那些真正写下经历的人。模型给出结构，人的记录保留条件、反例与细节。",
      tone: "climax",
      visual: law.visual,
    },
    {
      label: "ARCHIVE SIGNAL · 纪元遗声",
      title: "法则沉默以后，人的声音开始抵达。",
      lawCopy: `这颗星球由 ${sources.length} 条真实知乎记录支撑。它们不是公式的“证明”，而是这条观点在现实讨论中留下的声音。`,
      reality: "下一层进入遗声档案：重新阅读原始回答、作者与赞同信息，并检查这条法则究竟照亮了什么，又遗漏了什么。",
      visual: "records",
    },
  ];

  const slide = slides[index];
  const last = index === slides.length - 1;
  const changeSlide = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= slides.length || transitioning) return;
    setTransitioning(true);
    setLeaving(true);
    window.setTimeout(() => { setIndex(nextIndex); setLeaving(false); }, 720);
    window.setTimeout(() => setTransitioning(false), 1780);
  };

  return (
    <main className={styles.page} data-el="dynamic-planet-law">
      <div className={styles.glow} aria-hidden />
      <header className={styles.topbar}>
        <button type="button" onClick={returnToGalaxy} className={styles.backButton}><ArrowLeft size={15}/>返回主星系</button>
        <span className={styles.coordinates}>PLANET LAW · {String(index + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</span>
      </header>

      <section className={`${styles.stage} ${slide.tone === "climax" ? styles.stageClimax : ""} ${leaving ? styles.stageLeaving : styles.stageEntering}`}>
        <div className={styles.aura} aria-hidden />
        <div className={styles.stageInner} key={index}>
          <div className={styles.narrativeSide}>
            <span className={`${styles.label} ${styles.revealLine}`}>{slide.label}</span>
            {slide.math ? <div className={`${styles.formula} ${styles.revealLine}`}>{slide.math}</div> : null}
            <h1 className={`${styles.title} ${styles.revealLine}`}>{slide.title}</h1>
            {slide.lawCopy ? <p className={`${styles.lawCopy} ${styles.revealLine}`}>{slide.lawCopy}</p> : null}
            {slide.reality ? <p className={`${styles.realityCopy} ${styles.revealLine}`}>{slide.reality}</p> : null}
          </div>
          <aside className={`${styles.visualSide} ${styles.revealVisual}`}>
            {slide.visual === "records" ? <RecordDiagram count={sources.length} /> : <LawDiagram law={law} records={sources.length} />}
          </aside>
        </div>
      </section>

      <div className={styles.controls}>
        <div className={styles.progress} aria-label={`第 ${index + 1} 幕，共 ${slides.length} 幕`}>
          {slides.map((_, dotIndex) => <button key={dotIndex} type="button" aria-label={`切换到第 ${dotIndex + 1} 幕`} className={`${styles.dot} ${dotIndex === index ? styles.dotActive : ""}`} onClick={() => changeSlide(dotIndex)} disabled={transitioning} />)}
        </div>
        {index > 0 ? <button type="button" className={styles.previousButton} onClick={() => changeSlide(index - 1)} disabled={transitioning}><ArrowLeft size={16}/>上一幕</button> : <span />}
        <button type="button" className={styles.nextButton} disabled={transitioning} onClick={() => (last ? openObservations() : changeSlide(index + 1))}>
          {last ? <BookOpen size={17}/> : null}{last ? "进入遗声档案" : "下一幕"}{last ? <Telescope size={16}/> : <ArrowRight size={17}/>} 
        </button>
      </div>
      <footer className={styles.disclaimer}>数学法则在这里是一种结构化理解工具，不是对人生处境的定量预测模型。</footer>
    </main>
  );
}
