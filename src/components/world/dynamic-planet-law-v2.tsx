"use client";

import { ArrowLeft, ArrowRight, BookOpen, LoaderCircle, Telescope } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { readGalaxy } from "@/lib/cognitive-galaxy/session";
import type { OpinionGraph } from "@/lib/opinion/types";
import type { LawVisual, PlanetLawDefinition } from "@/lib/opinion/law-catalog";
import styles from "./planet-law-mvp.module.css";

type Match = {
  confidence: number;
  mechanism: string;
  reason: string;
  mapping: string;
  boundary: string;
  source: "ai" | "fallback";
};

type Result = { law: PlanetLawDefinition; match: Match };
type Slide = { label: string; title: string; math?: string; body?: string; note?: string; visual: LawVisual | "records"; climax?: boolean };

function CurveVisual({ law }: { law: PlanetLawDefinition }) {
  const visual = law.visual;
  return (
    <div className={styles.diagramWrap} aria-hidden>
      <div className={styles.diagramCaption}>{law.name.toUpperCase()} · {law.field}</div>
      <svg className={styles.diagram} viewBox="0 0 460 320">
        {visual === "bifurcation" ? <>
          <line className={styles.axis} x1="56" y1="160" x2="414" y2="160"/><line className={styles.axis} x1="328" y1="40" x2="328" y2="282"/>
          <path className={styles.unstableBranch} d="M72 74 C160 78 271 113 328 160"/><path className={styles.stableBranch} d="M72 246 C160 242 271 207 328 160"/>
          <line className={styles.thresholdLine} x1="328" y1="66" x2="328" y2="258"/><circle className={styles.marker} cx="242" cy="201" r="6"/>
          <text className={styles.branchLabel} x="86" y="58">不稳定态</text><text className={styles.branchLabel} x="86" y="270">稳定态</text><text className={styles.thresholdLabel} x="298" y="298">临界点</text>
        </> : null}

        {visual === "belief" ? <>
          <line className={styles.axis} x1="60" y1="258" x2="408" y2="258"/>
          <rect x="100" y="154" width="72" height="104" rx="8" fill="rgba(144,172,230,.22)"/><rect x="288" y="82" width="72" height="176" rx="8" fill="rgba(226,202,149,.42)"/>
          <path d="M182 170 C220 138 244 118 278 106" fill="none" stroke="rgba(220,230,247,.42)" strokeWidth="2" strokeDasharray="6 7"/>
          <text className={styles.branchLabel} x="110" y="286">先验</text><text className={styles.thresholdLabel} x="298" y="286">后验</text><text className={styles.branchLabel} x="192" y="130">新证据</text>
        </> : null}

        {visual === "pareto" ? <>
          <line className={styles.axis} x1="62" y1="258" x2="410" y2="258"/><line className={styles.axis} x1="62" y1="258" x2="62" y2="48"/>
          <path d="M92 82 C166 92 246 128 304 178 C341 210 367 232 398 248" fill="none" stroke="rgba(217,198,151,.64)" strokeWidth="3"/>
          {[0,1,2,3].map((i)=><circle key={i} cx={118+i*70} cy={92+i*35} r="5" fill="rgba(226,232,244,.72)"/>)}
          <text className={styles.branchLabel} x="260" y="92">帕累托前沿</text>
        </> : null}

        {visual === "game" ? <>
          <rect x="105" y="65" width="250" height="190" rx="18" fill="none" stroke="rgba(176,195,226,.16)"/><line className={styles.axis} x1="230" y1="65" x2="230" y2="255"/><line className={styles.axis} x1="105" y1="160" x2="355" y2="160"/>
          <circle cx="292" cy="207" r="10" fill="rgba(226,202,149,.72)"/><text className={styles.thresholdLabel} x="272" y="234">均衡</text>
        </> : null}

        {(visual === "decision" || visual === "value") ? <>
          <circle cx="92" cy="160" r="8" fill="rgba(230,234,244,.82)"/>
          <path d="M100 160 C160 160 176 96 238 96" fill="none" stroke="rgba(151,178,232,.42)" strokeWidth="3"/><path d="M100 160 C160 160 176 224 238 224" fill="none" stroke="rgba(215,193,145,.5)" strokeWidth="3"/>
          <path d="M246 96 C300 96 328 70 392 70" fill="none" stroke="rgba(151,178,232,.26)" strokeWidth="2"/><path d="M246 96 C300 96 328 132 392 132" fill="none" stroke="rgba(151,178,232,.26)" strokeWidth="2"/>
          <text className={styles.branchLabel} x="260" y="88">继续</text><text className={styles.thresholdLabel} x="260" y="232">停止 / 改道</text>
        </> : null}

        {visual === "entropy" ? <>
          <line className={styles.axis} x1="60" y1="250" x2="410" y2="250"/>
          {[56,118,88,142,74,126].map((h,i)=><rect key={i} x={86+i*50} y={250-h} width="28" height={h} rx="5" fill={i===3?"rgba(226,202,149,.48)":"rgba(147,175,231,.24)"}/>)}
        </> : null}

        {visual === "queue" ? <>
          {[0,1,2,3,4,5].map((i)=><circle key={i} cx={72+i*44} cy="160" r="12" fill="rgba(151,178,232,.24)" stroke="rgba(188,205,235,.28)"/>)}
          <rect x="332" y="112" width="66" height="96" rx="8" fill="rgba(216,194,147,.08)" stroke="rgba(216,194,147,.28)"/><text className={styles.thresholdLabel} x="343" y="166">处理</text>
        </> : null}

        {(visual === "growth" || visual === "exponential") ? <>
          <line className={styles.axis} x1="54" y1="256" x2="412" y2="256"/><line className={styles.axis} x1="54" y1="256" x2="54" y2="42"/>
          <path d={visual === "growth" ? "M54 246 C96 242 126 222 152 188 C187 141 215 92 306 84 C345 81 374 83 408 84" : "M54 250 C145 248 224 230 277 188 C326 149 361 99 407 56"} fill="none" stroke="rgba(205,218,246,.62)" strokeWidth="4" strokeLinecap="round"/>
          {visual === "growth" ? <line x1="54" y1="84" x2="410" y2="84" stroke="rgba(216,194,147,.24)" strokeDasharray="6 7"/> : null}
        </> : null}
      </svg>
      <div className={styles.diagramNote}>{law.mechanism}</div>
    </div>
  );
}

function ArchiveVisual({ count }: { count: number }) {
  return <div className={styles.recordsVisual} aria-hidden>
    <span className={styles.recordOrbit}/><div className={`${styles.recordCard} ${styles.recordOne}`}><i/>E-001</div><div className={`${styles.recordCard} ${styles.recordTwo}`}><i/>E-002</div>
    {count > 2 ? <div className={`${styles.recordCard} ${styles.recordThree}`}><i/>E-003</div> : null}<div className={styles.recordCore}>ECHO ARCHIVE</div>
  </div>;
}

export function DynamicPlanetLawV2({ opinionId }: { opinionId: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const galaxyId = search.get("galaxy");
  const originId = search.get("origin") || opinionId;
  const [graph, setGraph] = useState<OpinionGraph | null | undefined>(undefined);
  const [result, setResult] = useState<Result | null>(null);
  const [failed, setFailed] = useState(false);
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => { setGraph(galaxyId ? readGalaxy(galaxyId) : null); }, [galaxyId]);

  const opinion = useMemo(() => graph?.opinions.find((item)=>item.id===originId || item.id===opinionId) ?? null, [graph, originId, opinionId]);
  const sources = useMemo(() => graph && opinion ? graph.sources.filter((source)=>opinion.sourceIds.includes(source.id)) : [], [graph, opinion]);
  const sourceTexts = useMemo(() => sources.map((source)=>source.excerpt).slice(0,5), [sources]);
  const sourceKey = sourceTexts.join("\u241E");

  useEffect(() => {
    if (!opinion) return;
    const controller = new AbortController();
    setResult(null); setFailed(false); setIndex(0);
    void fetch("/api/opinion/law", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({title:opinion.title,summary:opinion.summary,sources:sourceTexts}), signal:controller.signal })
      .then(async (response)=>{ const data=await response.json(); if(!response.ok || data?.ok!==true) throw new Error(data?.error||"law_match_failed"); setResult({law:data.law,match:data.match}); })
      .catch((error)=>{ if((error as Error).name!=="AbortError") setFailed(true); });
    return ()=>controller.abort();
    // sourceKey deliberately represents the stable source text payload.
  }, [opinion, sourceKey]);

  const back = () => {
    if (!galaxyId) { router.back(); return; }
    const params = new URLSearchParams(); const cluster=search.get("cluster"); if(cluster) params.set("cluster",cluster); params.set("focus",originId);
    router.push(`/galaxy/${encodeURIComponent(galaxyId)}?${params.toString()}`);
  };
  const archive = () => { const params=new URLSearchParams(search.toString()); router.push(`/world/${encodeURIComponent(opinionId)}/observations${params.size?`?${params.toString()}`:""}`); };

  if (graph === undefined || (opinion && !result && !failed)) return <main className={styles.page}><div className={styles.glow} aria-hidden/><header className={styles.topbar}><button className={styles.backButton} onClick={back}><ArrowLeft size={15}/>返回主星系</button><span className={styles.coordinates}>PLANET LAW · RESOLVING</span></header><section className={styles.stage}><div className={styles.stageInner}><div className={styles.narrativeSide}><span className={styles.label}>LAW RESOLVER</span><h1 className={styles.title}>正在解析这颗星球的法则。</h1><p className={styles.lawCopy}>只从已经校验的真实数学原型中选择，不现场发明公式。</p></div><aside className={styles.visualSide}><LoaderCircle size={48}/></aside></div></section></main>;

  if (!opinion || !result || failed) return <main className={styles.page}><div className={styles.glow} aria-hidden/><header className={styles.topbar}><button className={styles.backButton} onClick={back}><ArrowLeft size={15}/>返回主星系</button></header><section className={styles.stage}><div className={styles.stageInner}><div className={styles.narrativeSide}><span className={styles.label}>LAW UNRESOLVED</span><h1 className={styles.title}>这颗星球的法则暂时无法解析。</h1><p className={styles.lawCopy}>观点仍然保留，但当前没有可靠的法则匹配结果。</p></div></div></section></main>;

  const { law, match } = result;
  const slides: Slide[] = [
    { label:`观点星球 · ${law.name}`, title:opinion.title, math:law.formula, body:law.definition, visual:law.visual, climax:true },
    { label:`法则原义 · ${law.field}`, title:law.mechanism, math:law.formula, body:match.reason, note:"这里先解释数学结构本身。公式不负责替观点判对错，它只是提供一种已经被研究过的结构。", visual:law.visual },
    { label:"结构映射 · 从法则到观点", title:match.mechanism, body:match.mapping, note:`匹配置信度 ${Math.round(match.confidence*100)}%。我们匹配的是机制，不是关键词。`, visual:law.visual },
    { label:"LAW BOUNDARY · 法则边界", title:"它能照亮结构，却不能替现实作决定。", body:match.boundary, note:"所以还要回到真实回答：模型给出结构，人留下条件、反例和细节。", visual:law.visual, climax:true },
    { label:"ARCHIVE SIGNAL · 纪元遗声", title:"法则沉默以后，人的声音开始抵达。", body:`这颗星球由 ${sources.length} 条真实知乎记录支撑。它们不是公式的证明，而是这条观点在讨论中留下的声音。`, note:"下一层进入遗声档案，重新阅读原始回答与作者。", visual:"records" },
  ];
  const slide=slides[index]; const last=index===slides.length-1;
  const change=(next:number)=>{ if(next<0||next>=slides.length||transitioning)return; setTransitioning(true);setLeaving(true);window.setTimeout(()=>{setIndex(next);setLeaving(false);},720);window.setTimeout(()=>setTransitioning(false),1780); };

  return <main className={styles.page} data-el="dynamic-planet-law"><div className={styles.glow} aria-hidden/>
    <header className={styles.topbar}><button type="button" onClick={back} className={styles.backButton}><ArrowLeft size={15}/>返回主星系</button><span className={styles.coordinates}>PLANET LAW · {String(index+1).padStart(2,"0")} / {String(slides.length).padStart(2,"0")}</span></header>
    <section className={`${styles.stage} ${slide.climax?styles.stageClimax:""} ${leaving?styles.stageLeaving:styles.stageEntering}`}><div className={styles.aura} aria-hidden/><div className={styles.stageInner} key={index}>
      <div className={styles.narrativeSide}><span className={`${styles.label} ${styles.revealLine}`}>{slide.label}</span>{slide.math?<div className={`${styles.formula} ${styles.revealLine}`}>{slide.math}</div>:null}<h1 className={`${styles.title} ${styles.revealLine}`}>{slide.title}</h1>{slide.body?<p className={`${styles.lawCopy} ${styles.revealLine}`}>{slide.body}</p>:null}{slide.note?<p className={`${styles.realityCopy} ${styles.revealLine}`}>{slide.note}</p>:null}</div>
      <aside className={`${styles.visualSide} ${styles.revealVisual}`}>{slide.visual==="records"?<ArchiveVisual count={sources.length}/>:<CurveVisual law={law}/>}</aside>
    </div></section>
    <div className={styles.controls}><div className={styles.progress}>{slides.map((_,i)=><button key={i} type="button" className={`${styles.dot} ${i===index?styles.dotActive:""}`} onClick={()=>change(i)} disabled={transitioning} aria-label={`第 ${i+1} 幕`}/>)}</div>{index>0?<button type="button" className={styles.previousButton} onClick={()=>change(index-1)} disabled={transitioning}><ArrowLeft size={16}/>上一幕</button>:<span/>}<button type="button" className={styles.nextButton} onClick={()=>last?archive():change(index+1)} disabled={transitioning}>{last?<BookOpen size={17}/>:null}{last?"进入遗声档案":"下一幕"}{last?<Telescope size={16}/>:<ArrowRight size={17}/>}</button></div>
    <footer className={styles.disclaimer}>数学法则在这里是一种结构化理解工具，不是对人生处境的定量预测模型。</footer>
  </main>;
}
