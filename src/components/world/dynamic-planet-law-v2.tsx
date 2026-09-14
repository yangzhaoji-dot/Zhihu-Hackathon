"use client";

import { ArrowLeft, BookOpen, ExternalLink, LoaderCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { readGalaxy } from "@/lib/cognitive-galaxy/session";
import type { OpinionGraph } from "@/lib/opinion/types";
import type { LawVisual, PlanetLawDefinition } from "@/lib/opinion/law-catalog";
import { DynamicArchivePanel } from "./dynamic-archive-panel";
import styles from "./planet-interior-v3.module.css";

type Match = {
  confidence: number;
  mechanism: string;
  reason: string;
  mapping: string;
  boundary: string;
  source: "ai" | "fallback";
};

type Result = { law: PlanetLawDefinition; match: Match };
type ViewMode = "law" | "mapping" | "evidence";

function compact(value: string, limit = 210) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > limit ? `${clean.slice(0, limit)}…` : clean;
}

function safeZhihuUrl(value: string) {
  return /^https:\/\/(www\.)?zhihu\.com\//i.test(value) ? value : null;
}

function LawDiagram({ law }: { law: PlanetLawDefinition }) {
  const visual: LawVisual = law.visual;
  return (
    <div className={styles.diagramBox} aria-hidden>
      <svg viewBox="0 0 520 280">
        <line className={styles.axis} x1="52" y1="236" x2="470" y2="236" />
        <line className={styles.axis} x1="52" y1="236" x2="52" y2="44" />

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
            <rect x="132" y="62" width="270" height="174" rx="20" fill="none" stroke="rgba(184,202,234,.14)" />
            <line className={styles.axis} x1="267" y1="62" x2="267" y2="236" />
            <line className={styles.axis} x1="132" y1="149" x2="402" y2="149" />
            <circle className={styles.point} cx="335" cy="194" r="8" />
          </>
        ) : null}

        {visual === "decision" || visual === "value" ? (
          <>
            <circle className={styles.point} cx="98" cy="150" r="7" />
            <path className={styles.primaryLine} d="M106 150 C162 150 188 92 254 92" />
            <path className={styles.secondaryLine} d="M106 150 C162 150 188 212 254 212" />
            <path className={styles.primaryLine} d="M262 92 C322 92 352 70 430 70" />
            <path className={styles.secondaryLine} d="M262 92 C322 92 352 126 430 126" />
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
                cx={86 + index * 50}
                cy="150"
                r="13"
                fill="rgba(148,177,235,.2)"
                stroke="rgba(190,207,238,.28)"
              />
            ))}
            <rect x="390" y="106" width="62" height="88" rx="10" fill="rgba(226,202,149,.08)" stroke="rgba(226,202,149,.28)" />
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
  const [mode, setMode] = useState<ViewMode>("law");
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
    setMode("law");
    setArchiveOpen(false);

    void fetch("/api/opinion/law", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: opinion.title, summary: opinion.summary, sources: sourceTexts }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || data?.ok !== true) throw new Error(data?.error || "law_match_failed");
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
              <h1>正在校准这颗星球的法则。</h1>
              <p>只从已经校验的数学原型中匹配，不现场发明公式。</p>
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
              <h1>这颗星球暂时没有可靠法则。</h1>
              <p>观点仍然保留。没有足够强的结构匹配时，不强行给它套一个公式。</p>
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

  return (
    <main className={styles.page} data-el="dynamic-planet-interior">
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <button type="button" onClick={back} className={styles.backButton}><ArrowLeft size={15} />返回主星系</button>
          <span className={styles.coordinates}>PLANET INTERIOR · {law.name.toUpperCase()}</span>
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
                <span className={styles.kicker}>PLANET LAW</span>
                <h2 className={styles.lawName}>{law.name}</h2>
                <div className={styles.lawField}>{law.field}</div>
                <div className={styles.formula}>{law.formula}</div>
              </div>
              <div className={styles.confidence}>
                <span>结构匹配</span>
                <strong>{Math.round(match.confidence * 100)}%</strong>
                <div className={styles.confidenceTrack}><i style={{ width: `${Math.round(match.confidence * 100)}%` }} /></div>
              </div>
            </div>
            <LawDiagram law={law} />
          </article>
        </section>

        <section className={styles.workspace}>
          <nav className={styles.tabBar} aria-label="星球内部视图">
            <button type="button" className={`${styles.tab} ${mode === "law" ? styles.tabActive : ""}`} onClick={() => setMode("law")}>法则</button>
            <button type="button" className={`${styles.tab} ${mode === "mapping" ? styles.tabActive : ""}`} onClick={() => setMode("mapping")}>结构映射</button>
            <button type="button" className={`${styles.tab} ${mode === "evidence" ? styles.tabActive : ""}`} onClick={() => setMode("evidence")}>知乎证据</button>
          </nav>

          {mode === "law" ? (
            <div className={styles.contentGrid}>
              <article className={styles.card}>
                <span className={styles.cardLabel}>法则原义</span>
                <h2>这个公式本来在说什么</h2>
                <p>{law.definition}</p>
              </article>
              <article className={styles.card}>
                <span className={styles.cardLabel}>数学机制</span>
                <h2>{law.mechanism}</h2>
                <p>{match.reason}</p>
              </article>
              <article className={styles.card}>
                <span className={styles.cardLabel}>适用范围</span>
                <h2>适合观察这些结构</h2>
                <div className={styles.chipList}>{law.goodFor.map((item) => <span className={styles.chip} key={item}>{item}</span>)}</div>
                <div className={styles.chipList}>{law.badFor.map((item) => <span className={styles.chip} key={item}>不适合 · {item}</span>)}</div>
              </article>
            </div>
          ) : null}

          {mode === "mapping" ? (
            <div className={styles.contentGrid}>
              <article className={styles.bridge}>
                <div className={styles.bridgeSide}>
                  <span className={styles.cardLabel}>数学里</span>
                  <h2>{law.mechanism}</h2>
                  <p>{law.definition}</p>
                </div>
                <div className={styles.bridgeArrow} aria-hidden />
                <div className={styles.bridgeSide}>
                  <span className={styles.cardLabel}>这个观点里</span>
                  <h2>{match.mechanism}</h2>
                  <p>{match.mapping}</p>
                </div>
              </article>
              <article className={styles.boundaryCard}>
                <span className={styles.cardLabel}>LAW BOUNDARY</span>
                <h2>法则到这里为止</h2>
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
            公式负责暴露结构，知乎回答负责保留经验与反例。两者不会互相替代。
          </div>
          <button type="button" className={styles.archiveButton} onClick={() => setArchiveOpen(true)}>
            <BookOpen size={16} />展开完整遗声档案
          </button>
        </div>
      </div>
    </main>
  );
}
