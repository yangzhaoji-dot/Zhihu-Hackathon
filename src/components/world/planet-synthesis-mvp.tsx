"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent, TouchEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Combine, ExternalLink, GitBranch, LoaderCircle, Orbit, RotateCcw, Sparkles, X } from "lucide-react";
import { fetchOpinionGraph, fetchSourceTrace, type SourceTrace } from "@/lib/api/opinion";
import { synthesizePlanetViewpoint } from "@/lib/api/planet-synthesis";
import { DEMO_ASSIGNMENTS, DEMO_ID } from "@/lib/cognitive-galaxy/demo";
import { attachGrounding, evolveGraphFromSynthesis } from "@/lib/cognitive-galaxy/evolution";
import { buildGalaxy } from "@/lib/cognitive-galaxy/model";
import { galaxyUrl, readGalaxy, saveGalaxy } from "@/lib/cognitive-galaxy/session";
import type { Author, Opinion, OpinionGraph, OpinionSource, RelationType } from "@/lib/opinion/types";
import type { PlanetSynthesisResult, SelectedExcerptInput, SynthesisAction } from "@/lib/planet-synthesis/model";
import styles from "./planet-synthesis-mvp.module.css";

type Material = {
  source: OpinionSource;
  author: Author | null;
  opinionId: string;
  opinionTitle: string;
  relation: RelationType | "origin";
};

type SavedExcerpt = SelectedExcerptInput & {
  author: string;
  opinionTitle: string;
};

type PendingSelection = SavedExcerpt;
type ViewpointRelationLabel = PlanetSynthesisResult["relation"];

const RELATION_LABEL: Record<ViewpointRelationLabel, string> = {
  refinement: "补充 / 边界修正",
  extension: "延伸",
  revision: "关键修正",
  counterpoint: "反向观点",
  new_dimension: "新维度",
};

function isPlaceholder(source: OpinionSource) {
  return /question\/0+\/answer\//.test(source.url) || source.url.includes("example");
}

function findAuthor(trace: SourceTrace, source: OpinionSource) {
  return trace.authors.find((author) => author.id === source.authorId) ?? null;
}

function scoreLabel(key: keyof PlanetSynthesisResult["scores"]) {
  return ({ grounding: "材料支撑", coherence: "自洽", specificity: "具体性", boundary: "边界意识", novelty: "新增内容", overall: "综合" } as const)[key];
}

function traceFromGraph(graph: OpinionGraph, opinionId: string): SourceTrace | null {
  const opinion = graph.opinions.find((item) => item.id === opinionId);
  if (!opinion) return null;
  const sources = graph.sources.filter((source) => opinion.sourceIds.includes(source.id));
  const authorIds = new Set(sources.map((source) => source.authorId));
  const authors = graph.authors.filter((author) => authorIds.has(author.id));
  const related = graph.relations
    .filter((relation) => relation.from === opinionId || relation.to === opinionId)
    .map((relation) => {
      const otherId = relation.from === opinionId ? relation.to : relation.from;
      const other = graph.opinions.find((item) => item.id === otherId);
      return other ? { type: relation.type, opinion: other } : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  return { opinion, sources, authors, related };
}

function materialsFromGraph(graph: OpinionGraph, opinionId: string): Material[] {
  const root = graph.opinions.find((item) => item.id === opinionId);
  if (!root) return [];
  const authorById = new Map(graph.authors.map((author) => [author.id, author]));
  const sourceById = new Map(graph.sources.map((source) => [source.id, source]));
  const collected: Material[] = [];
  const addOpinion = (opinion: Opinion, relation: RelationType | "origin") => {
    for (const sourceId of opinion.sourceIds) {
      const source = sourceById.get(sourceId);
      if (!source) continue;
      collected.push({ source, author: authorById.get(source.authorId) ?? null, opinionId: opinion.id, opinionTitle: opinion.title, relation });
    }
  };
  addOpinion(root, "origin");
  for (const relation of graph.relations) {
    if (relation.from !== opinionId && relation.to !== opinionId) continue;
    const otherId = relation.from === opinionId ? relation.to : relation.from;
    const other = graph.opinions.find((item) => item.id === otherId);
    if (other) addOpinion(other, relation.type);
  }
  return [...new Map(collected.map((item) => [item.source.id, item])).values()].slice(0, 10);
}

export function PlanetSynthesisMvp({ opinionId }: { opinionId: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const galaxyId = search.get("galaxy");
  const originId = search.get("origin") || opinionId;
  const clusterHint = search.get("cluster");
  const [trace, setTrace] = useState<SourceTrace | null>(null);
  const [baseGraph, setBaseGraph] = useState<OpinionGraph | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingSelection | null>(null);
  const [saved, setSaved] = useState<SavedExcerpt[]>([]);
  const [result, setResult] = useState<PlanetSynthesisResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [outcomePreview, setOutcomePreview] = useState(false);
  const resultRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        let graph = galaxyId ? readGalaxy(galaxyId) : null;
        let rootTrace = graph ? traceFromGraph(graph, opinionId) : null;
        let collected = graph && rootTrace ? materialsFromGraph(graph, opinionId) : [];

        // Demo stand-ins (and direct legacy entry) can point at a grounded source
        // opinion that does not itself live in the originating graph.
        if (!rootTrace) {
          rootTrace = await fetchSourceTrace(opinionId);
          const related = await Promise.all(
            rootTrace.related.slice(0, 6).map(async (item) => {
              try { return { relation: item.type, trace: await fetchSourceTrace(item.opinion.id) }; }
              catch { return null; }
            }),
          );
          collected = rootTrace.sources.map((source) => ({
            source,
            author: findAuthor(rootTrace!, source),
            opinionId: rootTrace!.opinion.id,
            opinionTitle: rootTrace!.opinion.title,
            relation: "origin" as const,
          }));
          for (const item of related) {
            if (!item) continue;
            for (const source of item.trace.sources) {
              collected.push({
                source,
                author: findAuthor(item.trace, source),
                opinionId: item.trace.opinion.id,
                opinionTitle: item.trace.opinion.title,
                relation: item.relation,
              });
            }
          }
          collected = [...new Map(collected.map((item) => [item.source.id, item])).values()].slice(0, 10);
        }

        if (!graph) {
          try { graph = await fetchOpinionGraph(rootTrace.opinion.questionId); }
          catch { graph = null; }
        }
        if (!alive) return;
        setTrace(rootTrace);
        setBaseGraph(graph);
        setMaterials(collected);
        if (!collected.length) setLoadError("这颗星球暂时没有可读取的来源材料。");
      } catch {
        if (alive) setLoadError("这颗星球暂时没有可读取的来源材料。");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [galaxyId, opinionId]);

  const sourceIndex = useMemo(() => new Map(materials.map((material) => [material.source.id, material])), [materials]);
  const displayOpinion = useMemo(() => {
    return baseGraph?.opinions.find((opinion) => opinion.id === originId) ?? trace?.opinion ?? null;
  }, [baseGraph, originId, trace]);

  const graphForSynthesis = useMemo(() => {
    if (!baseGraph || !displayOpinion) return null;
    const sources = materials.map((material) => material.source);
    const authors = materials.map((material) => material.author).filter((author): author is Author => Boolean(author));
    const grounded = attachGrounding(baseGraph, sources, authors);
    const materialSourceIds = sources.map((source) => source.id);
    return {
      ...grounded,
      opinions: grounded.opinions.map((opinion) => opinion.id === displayOpinion.id
        ? { ...opinion, sourceIds: [...new Set([...opinion.sourceIds, ...materialSourceIds])] }
        : opinion),
    };
  }, [baseGraph, displayOpinion, materials]);

  const captureSelection = (material: Material, container: HTMLElement) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
    const anchor = selection.anchorNode;
    const focus = selection.focusNode;
    if (!anchor || !focus || !container.contains(anchor) || !container.contains(focus)) return;
    const text = selection.toString().trim();
    if (text.length < 6) return;
    setPending({
      sourceId: material.source.id,
      text: text.slice(0, 600),
      author: material.author?.name ?? "知乎答主",
      opinionTitle: material.opinionTitle,
    });
  };

  const savePending = () => {
    if (!pending) return;
    const duplicate = saved.some((item) => item.sourceId === pending.sourceId && item.text === pending.text);
    if (!duplicate) setSaved((current) => [...current, pending].slice(0, 8));
    setPending(null);
    window.getSelection()?.removeAllRanges();
  };

  const removeSaved = (index: number) => {
    setSaved((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setResult(null);
    setOutcomePreview(false);
  };

  const generate = async () => {
    if (saved.length < 2 || generating || !displayOpinion) return;
    setGenerating(true);
    setGenerationError(null);
    setResult(null);
    setOutcomePreview(false);
    try {
      const next = await synthesizePlanetViewpoint({
        opinionId: displayOpinion.id,
        selections: saved.map(({ sourceId, text }) => ({ sourceId, text })),
        graph: graphForSynthesis ?? undefined,
      });
      setResult(next);
      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      setGenerationError(code === "ai_unavailable" ? "AI 当前不可用。你选中的原文已经保留，可以稍后再生成。" : "这次观点生成失败了，请稍后重试。");
    } finally {
      setGenerating(false);
    }
  };

  const returnToGalaxy = () => {
    const targetId = galaxyId ?? baseGraph?.questionId;
    if (!targetId) { router.back(); return; }
    router.push(galaxyUrl(targetId, clusterHint, originId));
  };

  const commitEvolution = (action: SynthesisAction) => {
    if (!result || !graphForSynthesis || !displayOpinion || committing) return;
    setCommitting(true);
    try {
      const selectedSourceIds = new Set(saved.map((item) => item.sourceId));
      const selectedMaterials = materials.filter((material) => selectedSourceIds.has(material.source.id));
      const mutation = evolveGraphFromSynthesis({
        graph: graphForSynthesis,
        parentId: displayOpinion.id,
        result,
        selections: saved.map(({ sourceId, text }) => ({ sourceId, text })),
        action,
        sources: selectedMaterials.map((material) => material.source),
        authors: selectedMaterials.map((material) => material.author).filter((author): author is Author => Boolean(author)),
      });
      saveGalaxy(mutation.graph);
      const built = buildGalaxy(mutation.graph, mutation.graph.questionId === DEMO_ID ? DEMO_ASSIGNMENTS : {});
      const nextCluster = built.clusters.find((group) => group.nodes.some((node) => node.opinion.id === mutation.opinionId));
      router.push(galaxyUrl(mutation.graph.questionId, nextCluster?.id ?? clusterHint, mutation.opinionId));
    } finally {
      setCommitting(false);
    }
  };

  if (loading) return <main className={styles.loading}><Orbit className={styles.spin} />正在登陆观点星球…</main>;
  if (!trace || !displayOpinion || loadError) return <main className={styles.loading}><p>{loadError ?? "星球材料不可达。"}</p><button onClick={returnToGalaxy}>返回主星系</button></main>;

  return (
    <main className={styles.page} data-el="planet-synthesis-mvp">
      <div className={styles.sky} aria-hidden><i/><i/><i/><i/></div>
      <header className={styles.topbar}>
        <button type="button" onClick={returnToGalaxy}><ArrowLeft size={15}/> 返回主星系</button>
        <div><span>已收下</span><strong>{saved.length}</strong><small>/ 8</small></div>
      </header>

      <section className={styles.hero}>
        <div className={styles.planetVisual} aria-hidden><span/><i/><b/></div>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>观点星球 · 内部探索</span>
          <h1>{displayOpinion.title}</h1>
          <p>{displayOpinion.summary}</p>
          <div className={styles.challenge}><Sparkles size={16}/><div><strong>这次不是来找标准答案。</strong><span>阅读与这颗星球相关的知乎原文，划出真正影响你判断的句子。至少收下两段后，让 AI 根据你的选择形成一个新观点。</span></div></div>
        </div>
      </section>

      <section className={styles.workspace}>
        <div className={styles.reader}>
          <div className={styles.sectionHead}><span>01</span><div><h2>阅读原文</h2><p>直接拖选文字。我们不会先替你把材料拆成“证据 / 反例 / 条件”。</p></div></div>
          <div className={styles.materials}>
            {materials.map((material, index) => {
              const placeholder = isPlaceholder(material.source);
              const alreadyUsed = saved.some((item) => item.sourceId === material.source.id);
              return (
                <article key={material.source.id} className={styles.materialCard} data-used={alreadyUsed ? "true" : "false"} data-el="planet-material">
                  <header><span>{index + 1 < 10 ? `0${index + 1}` : index + 1}</span><div><strong>{material.author?.name ?? "知乎答主"}</strong><small>{material.author?.title ?? material.opinionTitle}</small></div><em>{material.relation === "origin" ? "原观点来源" : "相关观点材料"}</em></header>
                  <p className={styles.context}>关联观点：{material.opinionTitle}</p>
                  <blockquote
                    data-el="selectable-excerpt"
                    onMouseUp={(event: MouseEvent<HTMLElement>) => captureSelection(material, event.currentTarget)}
                    onTouchEnd={(event: TouchEvent<HTMLElement>) => captureSelection(material, event.currentTarget)}
                  >{material.source.excerpt}</blockquote>
                  <footer><span>{material.source.upvotes.toLocaleString("zh-CN")} 赞同</span>{!placeholder && <a href={material.source.url} target="_blank" rel="noreferrer">原回答 <ExternalLink size={11}/></a>}{alreadyUsed && <b><Check size={12}/>已摘取</b>}</footer>
                </article>
              );
            })}
          </div>
        </div>

        <aside className={styles.tray}>
          <div className={styles.sectionHead}><span>02</span><div><h2>我的认知片段</h2><p>你留下什么，本身就在表达你关注什么。</p></div></div>
          {saved.length === 0 ? <div className={styles.emptyTray}>在左侧原文中拖选一句或一段文字，然后「收下这段」。</div> : <div className={styles.savedList}>{saved.map((item, index) => <article key={`${item.sourceId}-${index}`}><button type="button" onClick={() => removeSaved(index)} aria-label="移除"><X size={13}/></button><small>{item.author}</small><blockquote>“{item.text}”</blockquote><span>{sourceIndex.get(item.sourceId)?.opinionTitle ?? item.opinionTitle}</span></article>)}</div>}
          <button type="button" className={styles.generate} data-el="generate-viewpoint" disabled={saved.length < 2 || generating} onClick={() => void generate()}>{generating ? <><LoaderCircle className={styles.spin} size={16}/>正在形成观点…</> : <><Sparkles size={16}/>形成我的观点</>}</button>
          {saved.length < 2 && <p className={styles.trayHint}>至少需要 2 段你亲自选中的原文。</p>}
          {generationError && <p className={styles.error}>{generationError}</p>}
        </aside>
      </section>

      {result && <section ref={resultRef} className={styles.result} data-el="synthesis-result">
        <div className={styles.sectionHead}><span>03</span><div><h2>观点已经形成</h2><p>AI 只根据你选中的原文合成观点，再与原星球比较。</p></div></div>
        <div className={styles.resultGrid}>
          <article className={styles.generated}><span>你的新观点</span><h3>{result.viewpoint}</h3><p>{result.summary}</p><div className={styles.relation}><strong>{RELATION_LABEL[result.relation]}</strong><span>{result.reason}</span></div></article>
          <article className={styles.scorePanel}><div className={styles.overall}><span>观点质量</span><strong>{result.scores.overall}</strong></div><div className={styles.scores}>{(["grounding","coherence","specificity","boundary","novelty"] as const).map((key) => <div key={key}><span>{scoreLabel(key)}</span><i><b style={{ width: `${result.scores[key]}%` }}/></i><strong>{result.scores[key]}</strong></div>)}</div></article>
        </div>
        <div className={styles.analysisGrid}><article><span>相比原观点，新增加了</span>{result.additions.length ? result.additions.map((item) => <p key={item}>＋ {item}</p>) : <p>没有识别到明确新增内容。</p>}</article><article><span>仍然缺少</span>{result.gaps.length ? result.gaps.map((item) => <p key={item}>· {item}</p>) : <p>当前材料已经相对完整。</p>}</article></div>
        <div className={styles.outcome} data-action={result.action}>
          <div>{result.action === "merge" ? <Combine size={24}/> : <GitBranch size={24}/>}<span>AI 建议</span><h3>{result.action === "merge" ? "合并回原星球" : "分叉成一颗新星球"}</h3><p>{result.action === "merge" ? "这个观点更像是在补足原观点的条件和边界，不必制造一个近似重复的新节点。" : "这个观点已经拥有足够独立的判断，适合保留为新的观点节点并与原星球建立关系。"}</p></div>
          <button type="button" onClick={() => setOutcomePreview(true)}>{result.action === "merge" ? "预览合并" : "预览新星球"}</button>
        </div>
        {outcomePreview && <div className={styles.preview} data-action={result.action} data-el="evolution-preview"><div className={styles.previewOrbit} aria-hidden><i/><b/></div><div><span>{result.action === "merge" ? "MERGE PREVIEW" : "FORK PREVIEW"}</span><h3>{result.action === "merge" ? result.viewpoint : result.viewpoint}</h3><p>{result.action === "merge" ? `原星球会吸收这次形成的新条件与表达：${result.additions.join("；") || result.summary}` : "新星球会保留你选中的材料作为来源，并和原星球建立关系。"}</p><small>AI 给出建议，但最终由你决定是合并还是分叉。</small><div className={styles.commitActions}><button type="button" data-recommended={result.action === "merge"} disabled={committing} onClick={() => commitEvolution("merge")}><Combine size={14}/>合并到原星球</button><button type="button" data-recommended={result.action === "fork"} disabled={committing} onClick={() => commitEvolution("fork")}><GitBranch size={14}/>生成新星球</button></div></div></div>}
        <button type="button" className={styles.reset} onClick={() => { setSaved([]); setResult(null); setOutcomePreview(false); setGenerationError(null); }}><RotateCcw size={14}/>重新探索</button>
      </section>}

      {pending && <div className={styles.selectionDock} role="dialog" aria-label="收下选中文本"><button type="button" className={styles.selectionClose} onClick={() => setPending(null)}><X size={14}/></button><small>{pending.author} · 已选中</small><blockquote>“{pending.text}”</blockquote><button type="button" className={styles.keep} data-el="keep-excerpt" onClick={savePending}>收下这段 <Check size={14}/></button></div>}
    </main>
  );
}
