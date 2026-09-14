"use client";

import { ArrowLeft, ArrowRight, BookOpen, ExternalLink, LoaderCircle, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { readGalaxy } from "@/lib/cognitive-galaxy/session";
import type { OpinionGraph } from "@/lib/opinion/types";
import type { LawVisual, PlanetLawDefinition } from "@/lib/opinion/law-catalog";
import { DynamicArchivePanel } from "./dynamic-archive-panel";
import styles from "./planet-story-v4.module.css";

type MatchQuality = "strong" | "plausible" | "exploratory";
type Match = {
  confidence: number;
  quality?: MatchQuality;
  mechanism: string;
  reason: string;
  mapping: string;
  boundary: string;
  source: "ai" | "fallback";
  model?: string;
};
type Result = { law: PlanetLawDefinition; match: Match };
type StoryPage = { eyebrow: string; title: string; body?: string; note?: string };

function compact(value: string, limit = 230) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > limit ? `${clean.slice(0, limit)}…` : clean;
}
function safeZhihuUrl(value: string) {
  return /^https:\/\/(www\.)?zhihu\.com\//i.test(value) ? value : null;
}
function qualityLabel(match: Match) {
  const value = match.quality ?? (match.confidence >= 0.72 ? "strong" : match.confidence >= 0.48 ? "plausible" : "exploratory");
  return value === "strong" ? "高结构匹配" : value === "plausible" ? "可解释匹配" : "探索性匹配";
}

function humanLegacy(law: PlanetLawDefinition) {
  const known: Record<string, string> = {
    saddle_node: "在人类纪元，研究者用这条规范形研究系统如何在临界点附近失去原有稳定状态。它进入过非线性动力学、工程稳定性与分岔理论。留下来的不是对人生的答案，而是一个关于“稳定何时会消失”的结构。",
    bayes: "在人类纪元，人们用贝叶斯更新处理诊断、科学推断与信号判断。新证据到来以后，原先的相信程度需要重新计算；判断因此不再是一次性的结论，而成为持续修正的过程。",
    pareto: "在人类纪元，人们用帕累托前沿描述多目标选择的边界：有些方案已经无法在不牺牲另一目标的情况下继续改进。它把“哪个最好”改写成“愿意交换什么”。",
    nash: "在人类纪元，纳什均衡被用来理解经济、竞争与战略互动中的稳定局面。它留下一个重要提醒：一个状态可以非常稳定，却不一定对所有参与者都理想。",
    optimal_stopping: "在人类纪元，最优停止问题被用于搜索、交易、招聘与随机决策。它研究的不是抽象的坚持或放弃，而是继续等待何时已经不再值得。",
    bellman: "在人类纪元，贝尔曼思想进入运筹学、自动控制、机器人与强化学习。它让人们把一次选择拆成“现在得到什么”与“它把未来变成什么”。",
    logistic: "在人类纪元，人们用 Logistic 方程描述种群、资源与容量约束下的增长。它让人看到：增长不会永远保持早期速度，越接近承载上限，新增投入带来的变化越小。",
    entropy: "在人类纪元，香农熵帮助人们建立现代信息论与通信系统。它把“不确定”变成可以计算的量，让通信、编码与信息压缩第一次共享同一种语言。",
    little_law: "在人类纪元，Little 定律被用于排队系统、通信网络与运营流程。它用极简关系连接堆积、到达与等待，说明拥堵往往不是主观感受，而是结构性的结果。",
    exponential: "在人类纪元，人们在种群增长、连锁反应、复利与许多自然过程中反复遇到指数结构。它告诉他们：长期结果常常不是线性累加，而是比例变化被时间持续复合。",
    prospect_theory: "在人类纪元，前景理论被提出解释真实人的风险选择为何偏离简单期望效用。它记录下一个顽固现象：同样大小的损失，通常比收益更能改变人的选择。",
    hyperbolic_discounting: "在人类纪元，双曲折扣被用来刻画人对未来价值的非一致折扣。它保存下一种常见矛盾：远处看起来合理的长期计划，在临近行动时会被眼前诱因重新改写。",
    arrhenius: "在人类纪元，Arrhenius 方程帮助化学家理解温度为什么会如此强烈地改变反应速率。温度进入指数项，使一点条件变化也可能被放大成明显不同的结果。",
    michaelis_menten: "在人类纪元，Michaelis–Menten 方程被用来理解酶如何处理底物。它让研究者看到：更多投入最初很有效，但处理能力被逐渐占满以后，系统会进入饱和区。",
    newton_cooling: "在人类纪元，人们用牛顿冷却定律描述物体如何向环境温度靠近。变化不是匀速的：差距大时变化快，接近新平衡以后，速度会自然放慢。",
    fick_diffusion: "在人类纪元，Fick 定律帮助人们描述物质如何沿浓度梯度扩散。它把“差异会驱动流动”写进了一条简洁关系，并进入化学、材料与生命科学。",
    hooke: "在人类纪元，胡克定律被用来描述弹性系统的恢复力。偏离平衡越远，恢复作用越强；但这条关系只在弹性范围内成立，越过边界以后旧规律会失效。",
    sir: "在人类纪元，SIR 模型被用来理解传染病如何在人群中传播。传播强弱不只取决于病原本身，还取决于接触、易感者规模与退出传播状态的速度。",
  };
  return known[law.id] ?? `在人类纪元，${law.name}曾被用于${law.field}中的分析与建模。如今留下来的不是一个能直接套在现实上的答案，而是它经过长期使用后沉淀出的结构：${law.mechanism}`;
}

function ScientificVisual({ law }: { law: PlanetLawDefinition }) {
  const visual: LawVisual = law.visual;
  const axes = ["bifurcation", "belief", "pareto", "entropy", "growth", "exponential", "loss_aversion", "discount", "diffusion"].includes(visual);
  return (
    <div className={styles.visualCard} aria-hidden>
      <div className={styles.visualHeader}><span>{law.field}</span><strong>{law.kindLabel}</strong></div>
      <svg viewBox="0 0 520 300" className={styles.diagram}>
        {axes ? <><line className={styles.axis} x1="52" y1="246" x2="470" y2="246"/><line className={styles.axis} x1="52" y1="246" x2="52" y2="42"/></> : null}
        {visual === "bifurcation" ? <><path className={styles.secondaryLine} d="M76 76 C170 80 282 120 352 156"/><path className={styles.primaryLine} d="M76 228 C170 220 282 190 352 156"/><line className={styles.axis} x1="352" y1="62" x2="352" y2="246"/><circle className={styles.point} cx="268" cy="193" r="6"/></> : null}
        {visual === "belief" ? <><rect x="120" y="150" width="82" height="96" rx="10" className={styles.softBar}/><rect x="318" y="78" width="82" height="168" rx="10" className={styles.goldBar}/><path className={styles.secondaryLine} d="M216 175 C250 142 285 118 310 105"/></> : null}
        {visual === "pareto" ? <><path className={styles.primaryLine} d="M88 74 C164 84 252 114 326 166 C372 198 405 220 446 234"/>{[0,1,2,3].map((i)=><circle key={i} className={styles.point} cx={120+i*82} cy={86+i*38} r="5"/>)}</> : null}
        {visual === "game" ? <><rect x="128" y="56" width="278" height="188" rx="20" className={styles.frame}/><line className={styles.axis} x1="267" y1="56" x2="267" y2="244"/><line className={styles.axis} x1="128" y1="150" x2="406" y2="150"/><circle className={styles.point} cx="338" cy="198" r="8"/></> : null}
        {visual === "decision" || visual === "value" ? <><circle className={styles.point} cx="98" cy="152" r="7"/><path className={styles.primaryLine} d="M106 152 C164 152 190 92 256 92"/><path className={styles.secondaryLine} d="M106 152 C164 152 190 214 256 214"/><path className={styles.primaryLine} d="M264 92 C326 92 356 72 432 72"/><path className={styles.secondaryLine} d="M264 92 C326 92 356 128 432 128"/></> : null}
        {visual === "entropy" ? [52,118,82,146,68,126].map((h,i)=><rect key={i} x={92+i*58} y={246-h} width="32" height={h} rx="6" className={i===3?styles.goldBar:styles.softBar}/>) : null}
        {visual === "queue" ? <><g>{[0,1,2,3,4,5].map((i)=><circle key={i} cx={76+i*48} cy="154" r="13" className={styles.queueDot}/>)}</g><path className={styles.primaryLine} d="M344 154 L382 154"/><rect x="386" y="109" width="70" height="90" rx="10" className={styles.frame}/></> : null}
        {visual === "growth" || visual === "exponential" ? <path className={styles.primaryLine} d={visual === "growth" ? "M58 232 C106 226 152 208 188 170 C238 118 280 76 382 76 C420 76 445 77 466 77" : "M58 234 C158 230 242 210 300 166 C356 124 401 82 462 50"}/> : null}
        {visual === "loss_aversion" ? <><line className={styles.axis} x1="260" y1="42" x2="260" y2="246"/><line className={styles.axis} x1="62" y1="144" x2="468" y2="144"/><path className={styles.primaryLine} d="M260 144 C306 114 352 92 458 68"/><path className={styles.secondaryLine} d="M260 144 C220 178 176 212 82 240"/></> : null}
        {visual === "discount" ? <><path className={styles.primaryLine} d="M64 64 C100 96 128 142 166 178 C214 222 292 236 462 238"/><line className={styles.secondaryLine} x1="64" y1="64" x2="462" y2="238"/></> : null}
        {visual === "feedback" ? <><circle cx="150" cy="150" r="44" className={styles.frame}/><circle cx="370" cy="150" r="44" className={styles.goldFrame}/><path className={styles.primaryLine} d="M194 128 C242 76 308 76 326 128"/><path className={styles.secondaryLine} d="M326 172 C286 224 220 224 194 172"/></> : null}
        {visual === "selection" ? <><g>{[0,1,2,3,4,5,6,7,8,9,10,11].map((i)=><circle key={i} cx={84+(i%4)*38} cy={86+Math.floor(i/4)*48} r="8" className={styles.queueDot}/>)}</g><rect x="250" y="64" width="32" height="162" rx="12" className={styles.goldFrame}/><path className={styles.secondaryLine} d="M210 144 L248 144"/>{[0,1,2,3].map((i)=><circle key={i} className={styles.point} cx={346+(i%2)*46} cy={112+Math.floor(i/2)*58} r="8"/>)}</> : null}
        {visual === "load" ? <><rect x="118" y="78" width="284" height="136" rx="22" className={styles.frame}/><rect x="138" y="98" width="112" height="94" rx="12" className={styles.softBar}/><rect x="258" y="98" width="94" height="94" rx="12" className={styles.goldBar}/><rect x="360" y="98" width="62" height="94" rx="12" className={styles.warnBar}/></> : null}
        {visual === "diffusion" ? <><path className={styles.primaryLine} d="M58 232 C132 230 164 218 198 186 C238 148 244 96 302 72 C344 54 398 52 462 52"/>{[0,1,2,3].map((i)=><circle key={i} className={styles.point} cx={116+i*88} cy={[226,184,92,56][i]} r="5"/>)}</> : null}
      </svg>
      <div className={styles.visualCaption}>{law.mechanism}</div>
    </div>
  );
}

export function DynamicPlanetStoryV5({ opinionId }: { opinionId: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const galaxyId = search.get("galaxy");
  const originId = search.get("origin") || opinionId;
  const [graph, setGraph] = useState<OpinionGraph | null | undefined>(undefined);
  const [result, setResult] = useState<Result | null>(null);
  const [failed, setFailed] = useState(false);
  const [page, setPage] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  useEffect(() => {
    // Client sessionStorage is an external store; hydrate it after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGraph(galaxyId ? readGalaxy(galaxyId) : null);
  }, [galaxyId]);

  const opinion = useMemo(
    () => graph?.opinions.find((item) => item.id === originId || item.id === opinionId) ?? null,
    [graph, originId, opinionId],
  );
  const sources = useMemo(
    () => (graph && opinion ? graph.sources.filter((source) => opinion.sourceIds.includes(source.id)) : []),
    [graph, opinion],
  );
  const sourceTexts = useMemo(() => sources.map((source) => source.excerpt).slice(0, 5), [sources]);

  useEffect(() => {
    if (!opinion || !graph) return;
    const controller = new AbortController();
    void fetch("/api/opinion/law-v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        opinionId: originId,
        title: opinion.title,
        summary: opinion.summary,
        sources: sourceTexts,
        demo: graph.sourceScope === "demo",
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || data?.ok !== true) throw new Error(data?.error || "law_match_failed");
        setResult({ law: data.law, match: data.match });
        setFailed(false);
        setPage(0);
        setArchiveOpen(false);
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") setFailed(true);
      });
    return () => controller.abort();
  }, [graph, opinion, originId, sourceTexts]);

  const back = () => {
    if (!galaxyId) return router.back();
    const params = new URLSearchParams();
    const cluster = search.get("cluster");
    if (cluster) params.set("cluster", cluster);
    params.set("opinion", originId);
    router.push(`/galaxy/${encodeURIComponent(galaxyId)}?${params.toString()}`);
  };

  if (graph === undefined || (opinion && !result && !failed)) {
    return <main className={styles.page}><header className={styles.topbar}><button type="button" onClick={back} className={styles.backButton}><ArrowLeft size={15}/>返回主星系</button><span>PLANET INTERIOR · RESOLVING</span></header><section className={styles.loading}><LoaderCircle className={styles.spin} size={40}/><h1>正在从人类留下的科学法则中寻找回响。</h1><p>只从已有的科学公式、定律与形式模型中选择，不现场发明。</p></section></main>;
  }
  if (!opinion || !result || failed || !graph) {
    return <main className={styles.page}><header className={styles.topbar}><button type="button" onClick={back} className={styles.backButton}><ArrowLeft size={15}/>返回主星系</button><span>PLANET INTERIOR · UNRESOLVED</span></header><section className={styles.loading}><h1>这颗星球暂时没有可靠的科学回响。</h1><p>没有足够强的结构匹配时，不强行套一个漂亮公式。</p></section></main>;
  }

  const { law, match } = result;
  if (archiveOpen) return <DynamicArchivePanel graph={graph} opinionId={opinionId} originId={originId} lawName={law.name} onBack={() => setArchiveOpen(false)}/>;

  const pages: StoryPage[] = [
    { eyebrow: `观点星球 · ${graph.questionTitle}`, title: opinion.title, body: opinion.summary, note: `${law.name} · ${law.formula ?? law.signature}` },
    { eyebrow: "HUMAN LEGACY · 人类遗留法则", title: "在很久以前，人们曾用它理解世界的一部分。", body: humanLegacy(law), note: `${law.provenance} · ${law.field}` },
    { eyebrow: "SCIENTIFIC PROPERTY · 法则本身", title: law.mechanism, body: law.definition, note: law.formula ? `经典形式：${law.formula}` : law.signature },
    { eyebrow: "STRUCTURAL ECHO · 结构回响", title: match.mechanism, body: match.mapping, note: `${qualityLabel(match)} · ${Math.round(match.confidence * 100)}%` },
    { eyebrow: "MODEL BOUNDARY · 法则边界", title: "相似的结构，不等于相同的世界。", body: match.boundary, note: "公式负责暴露结构，不负责替现实下结论。" },
    { eyebrow: "ECHO ARCHIVE · 人类证据", title: sources.length ? "法则沉默以后，人的声音开始抵达。" : "这颗演示星球没有绑定真实知乎来源。", body: sources.length ? `这颗星球由 ${sources.length} 条知乎记录支撑。它们不是公式的证明，而是观点在真实讨论里留下的经验、条件与反例。` : "演示只负责展示观点、科学法则与碰撞机制。通过搜索框进入真实问题后，这里会出现可追溯的知乎回答。", note: sources.length ? "阅读原始回答，再判断这个结构是否真的照到了现实。" : "DEMO MODE · NO FAKE SOURCES" },
  ];
  const current = pages[page];
  const records = sources.slice(0, 2);
  const changePage = (next: number) => {
    if (transitioning || next < 0 || next >= pages.length) return;
    setTransitioning(true);
    window.setTimeout(() => { setPage(next); setTransitioning(false); }, 360);
  };

  return (
    <main className={styles.page} data-el="dynamic-planet-story-v5">
      <header className={styles.topbar}><button type="button" onClick={back} className={styles.backButton}><ArrowLeft size={15}/>返回主星系</button><span>PLANET INTERIOR · {String(page + 1).padStart(2, "0")} / {String(pages.length).padStart(2, "0")}</span></header>
      <section className={`${styles.stage} ${transitioning ? styles.stageLeaving : styles.stageEntering}`}>
        <div className={styles.narrative}>
          <span className={styles.eyebrow}>{current.eyebrow}</span>
          {page === 0 ? <div className={styles.formulaBlock}><span>{law.kindLabel}</span><strong>{law.formula ?? law.signature}</strong><small>{law.name} · {law.field}</small></div> : null}
          <h1>{current.title}</h1>
          {current.body ? <p className={styles.body}>{current.body}</p> : null}
          {current.note ? <p className={styles.note}>{current.note}</p> : null}
          {page === 2 ? <div className={styles.chips}>{law.goodFor.slice(0, 3).map((item) => <span key={item}>{item}</span>)}</div> : null}
          {page === 5 && records.length ? <div className={styles.records}>{records.map((source, index) => {
            const author = graph.authors.find((item) => item.id === source.authorId) ?? null;
            const url = safeZhihuUrl(source.url);
            return <article key={source.id}><div><span>ECHO {String(index + 1).padStart(2, "0")}</span><strong>{source.upvotes.toLocaleString()} 赞同</strong></div><blockquote>“{compact(source.excerpt)}”</blockquote><footer><span>{author?.name ?? "知乎回答作者"}</span>{url ? <a href={url} target="_blank" rel="noreferrer">原回答 <ExternalLink size={11}/></a> : null}</footer></article>;
          })}</div> : null}
        </div>
        <aside className={styles.visualSide}><ScientificVisual law={law}/><div className={styles.matchBadge}><Sparkles size={14}/><span>{qualityLabel(match)}</span><strong>{Math.round(match.confidence * 100)}%</strong></div></aside>
      </section>
      <div className={styles.controls}>
        <div className={styles.progress}>{pages.map((_, index) => <button key={index} type="button" aria-label={`第 ${index + 1} 页`} className={index === page ? styles.dotActive : styles.dot} onClick={() => changePage(index)} disabled={transitioning}/>)}</div>
        <div className={styles.navButtons}>
          {page > 0 ? <button type="button" onClick={() => changePage(page - 1)} disabled={transitioning}><ArrowLeft size={16}/>上一页</button> : <span/>}
          {page < pages.length - 1 ? <button type="button" onClick={() => changePage(page + 1)} disabled={transitioning}>下一页<ArrowRight size={16}/></button> : <button type="button" onClick={() => setArchiveOpen(true)} disabled={!sources.length}><BookOpen size={16}/>{sources.length ? "展开遗声档案" : "演示星球无原始档案"}</button>}
        </div>
      </div>
    </main>
  );
}
