"use client";

import { ArrowLeft, BookOpen, ExternalLink, LoaderCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { readGalaxy } from "@/lib/cognitive-galaxy/session";
import type { OpinionGraph } from "@/lib/opinion/types";
import type { LawVisual, PlanetLawDefinition } from "@/lib/opinion/law-catalog";
import { DynamicArchivePanel } from "./dynamic-archive-panel";
import styles from "./planet-interior-v3.module.css";

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
type ViewMode = "model" | "mapping" | "evidence";

function compact(value: string, limit = 210) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > limit ? `${clean.slice(0, limit)}…` : clean;
}

function safeZhihuUrl(value: string) {
  return /^https:\/\/(www\.)?zhihu\.com\//i.test(value) ? value : null;
}

function qualityLabel(match: Match) {
  const quality = match.quality ?? (match.confidence >= 0.72 ? "strong" : match.confidence >= 0.48 ? "plausible" : "exploratory");
  if (quality === "strong") return "高结构匹配";
  if (quality === "plausible") return "可解释匹配";
  return "探索性匹配";
}

function humanLegacy(law: PlanetLawDefinition) {
  const known: Record<string, string> = {
    saddle_node:
      "在人类纪元，研究者用这条规范形研究一个系统如何在临界点附近失去原有的稳定状态。它曾属于非线性动力系统、工程稳定性与分岔理论；如今我们保留下来的，不是它对现实人生的答案，而是它关于“稳定会消失”的结构。",
    bayes:
      "在人类纪元，人们用贝叶斯更新处理诊断、科学推断与信号判断：新证据到来以后，原先的相信程度应该被重新计算。它提醒我们，判断不是一次性完成的，而应随着证据改变。",
    pareto:
      "在人类纪元，这个概念被用来描述多目标选择中的边界：有些方案已经无法在不牺牲另一目标的情况下继续改进。它让“哪个最好”转化成了“愿意交换什么”。",
    nash:
      "在人类纪元，纳什均衡被用来理解经济、竞争与战略互动中的稳定局面。它最重要的遗产之一，是让人们看到：一个状态可以稳定，却并不意味着它对所有人都理想。",
    optimal_stopping:
      "在人类纪元，最优停止问题被用于搜索、交易、招聘与随机决策：真正困难的不是会不会继续，而是什么时候继续等待已经不再值得。",
    bellman:
      "在人类纪元，贝尔曼思想曾进入运筹学、自动控制、机器人与强化学习。它把长期选择拆成当前结果与未来状态，让人们能够讨论一个动作如何改变之后还能做什么。",
    logistic:
      "在人类纪元，人们用 Logistic 方程描述种群、资源与容量约束下的增长。它留下的核心直觉是：增长并不会永远保持早期速度，越接近承载上限，新增投入带来的变化越小。",
    entropy:
      "在人类纪元，香农熵帮助人们建立现代信息论与通信系统。它把“不确定”变成可以计算的量，让通信、编码与信息压缩第一次共享同一种语言。",
    little_law:
      "在人类纪元，Little 定律被用于排队系统、通信网络与运营流程。它用极简关系连接堆积、到达与等待，说明系统中的拥堵往往不是感受，而是结构性的结果。",
    exponential:
      "在人类纪元，人们在种群增长、连锁反应、复利与许多自然过程中反复遇到指数结构。它告诉他们：长期结果常常不是线性累加，而是比例变化被时间不断复合。",
    prospect_theory:
      "在人类纪元，前景理论被提出用来解释真实人的风险选择为何偏离简单的期望效用。它记录下一个很顽固的现象：同样大小的损失，往往比收益更能改变人的选择。",
    hyperbolic_discounting:
      "在人类纪元，双曲折扣被用来刻画人对未来价值的非一致折扣。它保存下一个常见矛盾：远处看起来合理的长期计划，在临近行动时可能突然被眼前诱因推翻。",
  };

  return known[law.id]
    ?? `在人类纪元，${law.name}曾被用于${law.field}中的分析与建模。我们在这里保存的不是一个可以直接套在人生上的答案，而是这个模型经过长期使用后留下来的结构：${law.mechanism}`;
}

function ModelDiagram({ law }: { law: PlanetLawDefinition }) {
  const visual: LawVisual = law.visual;
  const curveAxes = [
    "bifurcation",
    "belief",
    "pareto",
    "entropy",
    "growth",
    "exponential",
    "loss_aversion",
    "discount",
    "diffusion",
  ].includes(visual);

  return (
    <div className={styles.diagramBox} aria-hidden>
      <svg viewBox="0 0 520 280">
        {curveAxes ? (
          <>
            <line className={styles.axis} x1="52" y1="236" x2="470" y2="236" />
            <line className={styles.axis} x1="52" y1="236" x2="52" y2="44" />
          </>
        ) : null}

        {visual === "bifurcation" ? (
          <>
            <path className={styles.secondaryLine} d="M72 72 C170 78 282 118 350 154" />
            <path className={styles.primaryLine} d="M72 222 C170 216 282 188 350 154" />
            <line className={styles.axis} x1="350" y1="64" x2="350" y2="236" />
            <circle className={styles.point} cx="268" cy="190" r="6" />
          </>
        ) : null}

        {visual === "belief" ? (
          <>
            <rect x="124" y="142" width="78" height="94" rx="10" fill="rgba(146,176,235,.22)" />
            <rect x="318" y="78" width="78" height="158" rx="10" fill="rgba(226,202,149,.38)" />
            <path className={styles.secondaryLine} d="M214 170 C252 139 284 118 310 104" />
          </>
        ) : null}

        {visual === "pareto" ? (
          <>
            <path className={styles.primaryLine} d="M88 72 C164 84 252 112 326 164 C372 196 405 218 446 232" />
            {[0, 1, 2, 3].map((index) => (
              <circle key={index} className={styles.point} cx={120 + index * 82} cy={84 + index * 38} r="5" />
            ))}
          </>
        ) : null}

        {visual === "game" ? (
          <>
            <rect x="132" y="54" width="270" height="182" rx="20" fill="none" stroke="rgba(184,202,234,.14)" />
            <line className={styles.axis} x1="267" y1="54" x2="267" y2="236" />
            <line className={styles.axis} x1="132" y1="145" x2="402" y2="145" />
            <circle className={styles.point} cx="335" cy="192" r="8" />
            <text x="301" y="218" fill="rgba(226,202,149,.58)" fontSize="11">均衡</text>
          </>
        ) : null}

        {visual === "decision" || visual === "value" ? (
          <>
            <circle className={styles.point} cx="98" cy="150" r="7" />
            <path className={styles.primaryLine} d="M106 150 C162 150 188 92 254 92" />
            <path className={styles.secondaryLine} d="M106 150 C162 150 188 212 254 212" />
            <path className={styles.primaryLine} d="M262 92 C322 92 352 70 430 70" />
            <path className={styles.secondaryLine} d="M262 92 C322 92 352 126 430 126" />
            <text x="276" y="82" fill="rgba(204,218,244,.5)" fontSize="11">继续</text>
            <text x="276" y="226" fill="rgba(226,202,149,.58)" fontSize="11">停止 / 改道</text>
          </>
        ) : null}

        {visual === "entropy"
          ? [52, 118, 82, 146, 68, 126].map((height, index) => (
              <rect
                key={index}
                x={92 + index * 58}
                y={236 - height}
                width="32"
                height={height}
                rx="6"
                fill={index === 3 ? "rgba(226,202,149,.42)" : "rgba(148,177,235,.22)"}
              />
            ))
          : null}

        {visual === "queue" ? (
          <>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <circle
                key={index}
                cx={76 + index * 48}
                cy="150"
                r="13"
                fill="rgba(148,177,235,.2)"
                stroke="rgba(190,207,238,.28)"
              />
            ))}
            <path className={styles.primaryLine} d="M344 150 L382 150" />
            <rect x="386" y="105" width="70" height="90" rx="10" fill="rgba(226,202,149,.08)" stroke="rgba(226,202,149,.28)" />
          </>
        ) : null}

        {visual === "growth" || visual === "exponential" ? (
          <path
            className={styles.primaryLine}
            d={visual === "growth"
              ? "M58 226 C106 222 152 204 188 168 C238 118 280 76 382 76 C420 76 445 77 466 77"
              : "M58 228 C158 226 242 207 300 164 C356 122 401 80 462 48"}
          />
        ) : null}

        {visual === "loss_aversion" ? (
          <>
            <line className={styles.axis} x1="260" y1="42" x2="260" y2="238" />
            <line className={styles.axis} x1="62" y1="142" x2="468" y2="142" />
            <path className={styles.primaryLine} d="M260 142 C304 112 350 90 458 66" />
            <path className={styles.secondaryLine} d="M260 142 C220 176 176 208 82 236" />
            <text x="372" y="56" fill="rgba(204,218,244,.5)" fontSize="11">收益</text>
            <text x="82" y="218" fill="rgba(226,202,149,.58)" fontSize="11">损失侧更陡</text>
          </>
        ) : null}

        {visual === "load" ? (
          <>
            <rect x="120" y="76" width="280" height="130" rx="22" fill="rgba(145,174,232,.06)" stroke="rgba(187,204,235,.2)" />
            <rect x="140" y="96" width="112" height="90" rx="12" fill="rgba(145,174,232,.2)" />
            <rect x="260" y="96" width="92" height="90" rx="12" fill="rgba(226,202,149,.22)" />
            <rect x="360" y="96" width="58" height="90" rx="12" fill="rgba(219,147,147,.15)" stroke="rgba(219,147,147,.24)" />
            <text x="154" y="145" fill="rgba(218,228,244,.6)" fontSize="11">任务本身</text>
            <text x="270" y="145" fill="rgba(232,214,174,.65)" fontSize="11">外在干扰</text>
            <text x="365" y="145" fill="rgba(226,177,177,.6)" fontSize="11">溢出</text>
            <text x="195" y="226" fill="rgba(204,218,244,.42)" fontSize="11">有限工作记忆容量</text>
          </>
        ) : null}

        {visual === "selection" ? (
          <>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((index) => (
              <circle key={index} cx={84 + (index % 4) * 38} cy={86 + Math.floor(index / 4) * 48} r="8" fill="rgba(151,179,234,.22)" />
            ))}
            <rect x="250" y="62" width="32" height="160" rx="12" fill="rgba(226,202,149,.08)" stroke="rgba(226,202,149,.25)" />
            <path className={styles.secondaryLine} d="M210 142 L248 142" />
            {[0, 1, 2, 3].map((index) => (
              <circle key={index} className={styles.point} cx={346 + (index % 2) * 46} cy={112 + Math.floor(index / 2) * 58} r="8" />
            ))}
            <text x="72" y="236" fill="rgba(204,218,244,.42)" fontSize="11">原始总体</text>
            <text x="332" y="208" fill="rgba(226,202,149,.58)" fontSize="11">可见样本</text>
          </>
        ) : null}

        {visual === "discount" ? (
          <>
            <path className={styles.primaryLine} d="M64 64 C100 96 128 142 166 176 C214 218 292 230 462 232" />
            <line className={styles.secondaryLine} x1="64" y1="64" x2="462" y2="232" />
            <circle className={styles.point} cx="124" cy="136" r="6" />
          </>
        ) : null}

        {visual === "feedback" ? (
          <>
            <circle cx="150" cy="140" r="42" fill="rgba(147,176,234,.08)" stroke="rgba(187,204,235,.2)" />
            <circle cx="370" cy="140" r="42" fill="rgba(226,202,149,.08)" stroke="rgba(226,202,149,.22)" />
            <path className={styles.primaryLine} d="M192 120 C240 70 310 70 328 120" />
            <path className={styles.secondaryLine} d="M328 160 C286 214 220 214 192 160" />
            <text x="124" y="145" fill="rgba(215,225,242,.6)" fontSize="11">状态 A</text>
            <text x="344" y="145" fill="rgba(232,214,174,.66)" fontSize="11">状态 B</text>
            <text x="208" y="66" fill="rgba(204,218,244,.42)" fontSize="11">结果反过来改变条件</text>
          </>
        ) : null}

        {visual === "diffusion" ? (
          <>
            <path className={styles.primaryLine} d="M58 226 C132 224 164 214 198 184 C238 148 244 96 302 72 C344 54 398 52 462 52" />
            {[0, 1, 2, 3].map((index) => (
              <circle key={index} className={styles.point} cx={116 + index * 88} cy={[220, 182, 92, 56][index]} r="5" />
            ))}
          </>
        ) : null}
      </svg>
      <div className={styles.diagramNote}>{law.mechanism}</div>
    </div>
  );
}

export function DynamicPlanetLawV2({ opinionId }: { opinionId: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const galaxyId = search.get("galaxy");
  const originId = search.get("origin") || opinionId;
  const [graph, setGraph] = useState<OpinionGraph | null | undefined>(undefined);
  const [result, setResult] = useState<Result | null>(null);
  const [failed, setFailed] = useState(false);
  const [mode, setMode] = useState<ViewMode>("model");
  const [archiveOpen, setArchiveOpen] = useState(false);

  useEffect(() => {
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
  const sourceKey = sourceTexts.join("\u241E");

  useEffect(() => {
    if (!opinion) return;
    const controller = new AbortController();
    setResult(null);
    setFailed(false);
    setMode("model");
    setArchiveOpen(false);

    void fetch("/api/opinion/law", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: opinion.title, summary: opinion.summary, sources: sourceTexts }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || data?.ok !== true) throw new Error(data?.error || "model_match_failed");
        setResult({ law: data.law, match: data.match });
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") setFailed(true);
      });

    return () => controller.abort();
  }, [opinion, sourceKey]);

  const back = () => {
    if (!galaxyId) {
      router.back();
      return;
    }
    const params = new URLSearchParams();
    const cluster = search.get("cluster");
    if (cluster) params.set("cluster", cluster);
    params.set("focus", originId);
    router.push(`/galaxy/${encodeURIComponent(galaxyId)}?${params.toString()}`);
  };

  if (graph === undefined || (opinion && !result && !failed)) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <header className={styles.topbar}>
            <button type="button" className={styles.backButton} onClick={back}><ArrowLeft size={15} />返回主星系</button>
            <span className={styles.coordinates}>PLANET INTERIOR · RESOLVING</span>
          </header>
          <section className={styles.loading}>
            <div className={styles.loadingCore}>
              <LoaderCircle className={styles.spin} size={38} />
              <h1>正在从人类留下的科学法则中寻找回响。</h1>
              <p>候选来自数学、物理、化学、生物、信息科学、经济与决策科学；只从真实存在的公式、定律与形式模型中选择，不现场发明。</p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (!opinion || !result || failed || !graph) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <header className={styles.topbar}>
            <button type="button" className={styles.backButton} onClick={back}><ArrowLeft size={15} />返回主星系</button>
            <span className={styles.coordinates}>PLANET INTERIOR · UNRESOLVED</span>
          </header>
          <section className={styles.loading}>
            <div className={styles.loadingCore}>
              <h1>这颗星球暂时没有可靠的科学回响。</h1>
              <p>观点仍然保留。没有足够强的结构匹配时，不用一个看似漂亮的公式强行覆盖现实。</p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const { law, match } = result;

  if (archiveOpen) {
    return (
      <DynamicArchivePanel
        graph={graph}
        opinionId={opinionId}
        originId={originId}
        lawName={law.name}
        onBack={() => setArchiveOpen(false)}
      />
    );
  }

  const visibleRecords = sources.slice(0, 3);
  const conceptual = !law.formula;

  return (
    <main className={styles.page} data-el="dynamic-planet-interior">
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <button type="button" onClick={back} className={styles.backButton}><ArrowLeft size={15} />返回主星系</button>
          <span className={styles.coordinates}>PLANET INTERIOR · {law.kindLabel.toUpperCase()}</span>
        </header>

        <section className={styles.hero}>
          <article className={styles.opinionPanel}>
            <span className={styles.kicker}>观点星球 · {graph.questionTitle}</span>
            <h1>{opinion.title}</h1>
            <p className={styles.summary}>{opinion.summary}</p>
            <div className={styles.metaRow}>
              {opinion.camp ? <span>{opinion.camp}</span> : null}
              <span>观点强度 {opinion.support}</span>
              <span>{sources.length} 条知乎来源</span>
              <span>{opinion.kind === "ai" ? "AI 推导" : "知乎观点"}</span>
            </div>
          </article>

          <article className={styles.lawPanel}>
            <div className={styles.lawIdentity}>
              <div>
                <span className={styles.kicker}>HUMAN LEGACY · {law.kindLabel}</span>
                <h2 className={styles.lawName}>{law.name}</h2>
                <div className={styles.lawField}>{law.field}</div>
                <div
                  className={styles.formula}
                  style={conceptual ? { fontSize: "clamp(24px, 2.7vw, 42px)", lineHeight: 1.28, letterSpacing: "-.012em" } : undefined}
                >
                  {law.formula ?? law.signature}
                </div>
                {law.formula ? <div className={styles.lawField}>{law.signature}</div> : null}
                <div className={styles.lawField}>{law.provenance}</div>
              </div>
              <div className={styles.confidence}>
                <span>{qualityLabel(match)}</span>
                <strong>{Math.round(match.confidence * 100)}%</strong>
                <div className={styles.confidenceTrack}><i style={{ width: `${Math.round(match.confidence * 100)}%` }} /></div>
              </div>
            </div>
            <ModelDiagram law={law} />
          </article>
        </section>

        <section className={styles.workspace}>
          <nav className={styles.tabBar} aria-label="星球内部视图">
            <button type="button" className={`${styles.tab} ${mode === "model" ? styles.tabActive : ""}`} onClick={() => setMode("model")}>人类法则</button>
            <button type="button" className={`${styles.tab} ${mode === "mapping" ? styles.tabActive : ""}`} onClick={() => setMode("mapping")}>结构映射</button>
            <button type="button" className={`${styles.tab} ${mode === "evidence" ? styles.tabActive : ""}`} onClick={() => setMode("evidence")}>人类证据</button>
          </nav>

          {mode === "model" ? (
            <div className={styles.contentGrid}>
              <article
                className={styles.card}
                style={{ gridColumn: "1 / -1", minHeight: 0, background: "linear-gradient(120deg, rgba(31, 28, 24, .48), rgba(12, 17, 27, .62))", borderColor: "rgba(226, 202, 149, .16)" }}
              >
                <span className={styles.cardLabel}>HUMAN LEGACY · 人类纪元遗留法则</span>
                <h2>在很久以前，人们曾用它理解世界的一部分。</h2>
                <p>{humanLegacy(law)}</p>
              </article>
              <article className={styles.card}>
                <span className={styles.cardLabel}>ORIGINAL MEANING</span>
                <h2>{law.formula ? "这条公式原本在解释什么" : "这个形式原本在解释什么"}</h2>
                <p>{law.definition}</p>
              </article>
              <article className={styles.card}>
                <span className={styles.cardLabel}>CORE MECHANISM</span>
                <h2>{law.mechanism}</h2>
                <p>{match.reason}</p>
              </article>
              <article className={styles.card}>
                <span className={styles.cardLabel}>MODEL RANGE</span>
                <h2>它可以照亮什么，也不能解释什么</h2>
                <div className={styles.chipList}>{law.goodFor.map((item) => <span className={styles.chip} key={item}>{item}</span>)}</div>
                <div className={styles.chipList}>{law.badFor.map((item) => <span className={styles.chip} key={item}>边界 · {item}</span>)}</div>
              </article>
            </div>
          ) : null}

          {mode === "mapping" ? (
            <div className={styles.contentGrid}>
              <article className={styles.bridge}>
                <div className={styles.bridgeSide}>
                  <span className={styles.cardLabel}>在人类科学中</span>
                  <h2>{law.mechanism}</h2>
                  <p>{law.definition}</p>
                </div>
                <div className={styles.bridgeArrow} aria-hidden />
                <div className={styles.bridgeSide}>
                  <span className={styles.cardLabel}>在这颗观点星球上</span>
                  <h2>{match.mechanism}</h2>
                  <p>{match.mapping}</p>
                </div>
              </article>
              <article className={styles.boundaryCard}>
                <span className={styles.cardLabel}>MODEL BOUNDARY</span>
                <h2>回响到这里为止</h2>
                <p>{match.boundary}</p>
              </article>
            </div>
          ) : null}

          {mode === "evidence" ? (
            <div className={styles.contentGrid}>
              <div className={styles.recordsGrid}>
                {visibleRecords.length ? visibleRecords.map((source, index) => {
                  const author = graph.authors.find((item) => item.id === source.authorId) ?? null;
                  const url = safeZhihuUrl(source.url);
                  return (
                    <article className={styles.recordCard} key={source.id}>
                      <div className={styles.recordHead}>
                        <span className={styles.recordLabel}>ECHO {String(index + 1).padStart(2, "0")}</span>
                        <span>{source.upvotes.toLocaleString()} 赞同</span>
                      </div>
                      <blockquote>“{compact(source.excerpt)}”</blockquote>
                      <div className={styles.recordAuthor}>
                        <span>{author?.name ?? "知乎回答作者"}</span>
                        {url ? <a className={styles.recordLink} href={url} target="_blank" rel="noreferrer">原回答 <ExternalLink size={11} /></a> : null}
                      </div>
                    </article>
                  );
                }) : <div className={styles.emptyRecord}>这颗星球暂时没有可展示的原始知乎记录。</div>}
              </div>
            </div>
          ) : null}
        </section>

        <div className={styles.bottomDock}>
          <div className={styles.dockCopy}>
            这些法则曾帮助人类描述自然、系统与选择。现在我们只借用它们留下的结构，去重新观察一条观点；它们不是判决，也不替现实下结论。
          </div>
          <button type="button" className={styles.archiveButton} onClick={() => setArchiveOpen(true)}>
            <BookOpen size={16} />展开完整遗声档案
          </button>
        </div>
      </div>
    </main>
  );
}
