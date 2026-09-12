"use client";

import { useMemo, useState } from "react";
import { GitMerge, LoaderCircle, Sparkles, X } from "lucide-react";
import { collideOpinions } from "@/lib/api/opinion";
import { fuseGalaxyOpinions } from "@/lib/cognitive-galaxy/evolution";
import type { Galaxy } from "@/lib/cognitive-galaxy/model";
import type { CollisionAnalysis, OpinionGraph } from "@/lib/opinion/types";
import styles from "./collision.module.css";

export function CollisionPanel({ galaxy, selectedIds, onRemove, onClear, onFused }: {
  galaxy: Galaxy;
  selectedIds: string[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onFused: (graph: OpinionGraph, opinionId: string) => void;
}) {
  const [analysis, setAnalysis] = useState<CollisionAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = useMemo(() => selectedIds.map((id) => galaxy.graph.opinions.find((opinion) => opinion.id === id)).filter(Boolean), [galaxy.graph.opinions, selectedIds]);

  const analyze = async () => {
    if (selectedIds.length !== 2 || loading) return;
    setLoading(true); setError(null); setAnalysis(null);
    try {
      const next = await collideOpinions(selectedIds[0], selectedIds[1], galaxy.graph);
      setAnalysis(next);
    } catch {
      setError("碰撞分析暂时不可用，已保留你的选择。");
    } finally { setLoading(false); }
  };

  const fuse = () => {
    if (!analysis || analysis.source === "fallback" || selectedIds.length !== 2) return;
    const mutation = fuseGalaxyOpinions({
      graph: galaxy.graph,
      parentA: selectedIds[0],
      parentB: selectedIds[1],
      title: analysis.candidate.title,
      summary: analysis.candidate.summary,
      rationale: analysis.coreDisagreement,
    });
    onFused(mutation.graph, mutation.opinionId);
  };

  return <aside className={styles.panel} data-el="collision-panel">
    <header><div><span>观点碰撞</span><strong>{selectedIds.length}/2</strong></div><button type="button" onClick={onClear} aria-label="关闭碰撞"><X size={15}/></button></header>
    <div className={styles.selected}>
      {selected.length ? selected.map((opinion, index) => opinion ? <article key={opinion.id}><small>{index === 0 ? "A" : "B"}</small><p>{opinion.title}</p><button type="button" onClick={() => { onRemove(opinion.id); setAnalysis(null); }}>移除</button></article> : null) : <p className={styles.hint}>从当前星群中选择两个观点，看看它们真正在哪里一致、冲突或互补。</p>}
    </div>
    {selectedIds.length < 2 ? <p className={styles.hint}>还需要选择 {2 - selectedIds.length} 颗观点星球。</p> : <button type="button" className={styles.analyze} onClick={() => void analyze()} disabled={loading}>{loading ? <><LoaderCircle className={styles.spin} size={15}/>正在分析…</> : <><Sparkles size={15}/>分析观点碰撞</>}</button>}
    {error && <p className={styles.error}>{error}</p>}
    {analysis && <div className={styles.analysis} data-el="collision-analysis">
      <section><span>共识</span><p>{analysis.consensus}</p></section>
      <section><span>核心分歧</span><p>{analysis.coreDisagreement}</p></section>
      <div className={styles.two}><section><span>A 成立条件</span><p>{analysis.conditions.a}</p></section><section><span>B 成立条件</span><p>{analysis.conditions.b}</p></section></div>
      <section><span>证据比较</span><p>{analysis.evidence.verdict}</p></section>
      {analysis.missing.length ? <section><span>仍缺少</span>{analysis.missing.slice(0,3).map((item) => <p key={item}>· {item}</p>)}</section> : null}
      <div className={styles.candidate}><span>可融合出的新观点</span><h3>{analysis.candidate.title}</h3><p>{analysis.candidate.summary}</p>{analysis.source === "fallback" ? <p className={styles.error}>AI 当前不可用，这只是降级分析，不会据此创建新星球。</p> : <button type="button" data-el="fuse-planets" onClick={fuse}><GitMerge size={15}/>融合成新星球</button>}</div>
    </div>}
  </aside>;
}
