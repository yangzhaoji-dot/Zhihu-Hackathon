"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GitMerge, Link2, LoaderCircle, Sparkles, X } from "lucide-react";
import { collideOpinions } from "@/lib/api/opinion";
import { connectGalaxyOpinions, fuseGalaxyOpinions } from "@/lib/cognitive-galaxy/evolution";
import type { Galaxy } from "@/lib/cognitive-galaxy/model";
import type { CollisionAnalysis, OpinionGraph, RelationType } from "@/lib/opinion/types";
import styles from "./collision.module.css";

const RELATION_OPTIONS: { type: RelationType; label: string; detail: string }[] = [
  { type: "add", label: "补充", detail: "两者关注不同部分，可以并存" },
  { type: "cond", label: "条件", detail: "一方为另一方补充成立条件" },
  { type: "oppose", label: "对立", detail: "两者在关键判断上方向相反" },
  { type: "support", label: "支持", detail: "一方为另一方增加支撑" },
  { type: "refute", label: "反驳", detail: "一方直接挑战另一方的核心判断" },
];

export function CollisionPanel({ galaxy, selectedIds, onRemove, onClear, onFused, onConnected, autoAnalyze = false }: {
  galaxy: Galaxy;
  selectedIds: string[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onFused: (graph: OpinionGraph, opinionId: string) => void;
  onConnected: (graph: OpinionGraph) => void;
  autoAnalyze?: boolean;
}) {
  const [analysis, setAnalysis] = useState<CollisionAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bridgeType, setBridgeType] = useState<RelationType>("add");
  const selected = useMemo(() => selectedIds.map((id) => galaxy.graph.opinions.find((opinion) => opinion.id === id)).filter(Boolean), [galaxy.graph.opinions, selectedIds]);

  const analyze = useCallback(async () => {
    if (selectedIds.length !== 2 || loading) return;
    setLoading(true); setError(null); setAnalysis(null);
    try {
      const next = await collideOpinions(selectedIds[0], selectedIds[1], galaxy.graph);
      setAnalysis(next);
    } catch {
      setError("碰撞分析暂时不可用，已保留你的选择。");
    } finally { setLoading(false); }
  }, [galaxy.graph, loading, selectedIds]);

  useEffect(() => {
    if (!autoAnalyze || selectedIds.length !== 2 || analysis || loading) return;
    const timer = window.setTimeout(() => { void analyze(); }, 90);
    return () => window.clearTimeout(timer);
  }, [analysis, analyze, autoAnalyze, loading, selectedIds.length]);

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

  const connect = () => {
    if (!analysis || selectedIds.length !== 2) return;
    const next = connectGalaxyOpinions({
      graph: galaxy.graph,
      from: selectedIds[0],
      to: selectedIds[1],
      type: bridgeType,
      rationale: analysis.source === "ai" ? analysis.coreDisagreement : "由用户在观点碰撞后建立的关系",
    });
    onConnected(next);
  };

  return <aside className={styles.panel} data-el="collision-panel">
    <header><div><span>观点碰撞</span><strong>{selectedIds.length}/2</strong></div><button type="button" onClick={onClear} aria-label="关闭碰撞"><X size={15}/></button></header>
    <div className={styles.selected}>
      {selected.length ? selected.map((opinion, index) => opinion ? <article key={opinion.id}><small>{index === 0 ? "A" : "B"}</small><p>{opinion.title}</p><button type="button" onClick={() => onRemove(opinion.id)}>移除</button></article> : null) : <p className={styles.hint}>把两颗星球拖到一起，或从列表中手动选择两个观点。</p>}
    </div>
    {selectedIds.length < 2 ? <p className={styles.hint}>还需要选择 {2 - selectedIds.length} 颗观点星球。</p> : <button type="button" className={styles.analyze} onClick={() => void analyze()} disabled={loading}>{loading ? <><LoaderCircle className={styles.spin} size={15}/>正在解析碰撞…</> : <><Sparkles size={15}/>{analysis ? "重新分析" : "分析观点碰撞"}</>}</button>}
    {error && <p className={styles.error}>{error}</p>}
    {analysis && <div className={styles.analysis} data-el="collision-analysis">
      <section><span>共识</span><p>{analysis.consensus}</p></section>
      <section><span>核心分歧</span><p>{analysis.coreDisagreement}</p></section>
      <div className={styles.two}><section><span>A 成立条件</span><p>{analysis.conditions.a}</p></section><section><span>B 成立条件</span><p>{analysis.conditions.b}</p></section></div>
      <section><span>证据比较</span><p>{analysis.evidence.verdict}</p></section>
      {analysis.missing.length ? <section><span>仍缺少</span>{analysis.missing.slice(0,3).map((item) => <p key={item}>· {item}</p>)}</section> : null}

      <div className={styles.bridge} data-el="bridge-builder">
        <span>保留两颗星球 · 建立认知桥</span>
        <p>如果两个观点都值得保留，不必融合。选择它们之间最准确的关系。</p>
        <div className={styles.bridgeTypes}>{RELATION_OPTIONS.map((option) => <button key={option.type} type="button" aria-pressed={bridgeType === option.type} data-active={bridgeType === option.type ? "true" : "false"} title={option.detail} onClick={() => setBridgeType(option.type)}>{option.label}</button>)}</div>
        <button type="button" className={styles.bridgeAction} data-el="connect-planets" onClick={connect}><Link2 size={14}/>建立关系桥</button>
      </div>

      <div className={styles.candidate}><span>让两个观点产生第三种判断</span><h3>{analysis.candidate.title}</h3><p>{analysis.candidate.summary}</p>{analysis.source === "fallback" ? <p className={styles.error}>AI 当前不可用，这只是降级分析，不会据此创建新星球。</p> : <button type="button" data-el="fuse-planets" onClick={fuse}><GitMerge size={15}/>融合成新星球</button>}</div>
    </div>}
  </aside>;
}
