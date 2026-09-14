"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GitMerge, Link2, LoaderCircle, Sparkles, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { collideOpinions } from "@/lib/api/opinion";
import { connectGalaxyOpinions, fuseGalaxyOpinions } from "@/lib/cognitive-galaxy/evolution";
import type { Galaxy } from "@/lib/cognitive-galaxy/model";
import type { CollisionAnalysis, OpinionGraph, RelationType } from "@/lib/opinion/types";
import type { PlanetInteractionEvent } from "./types";
import styles from "./collision-panel.module.css";

const RELATION_TYPES: RelationType[] = ["add", "cond", "oppose", "support", "refute"];

export function CollisionPanel({ galaxy, selectedIds, onRemove, onClear, onFused, onConnected, onInteractionStateChange, autoAnalyze = false }: {
  galaxy: Galaxy;
  selectedIds: string[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onFused: (graph: OpinionGraph, opinionId: string, parentIds: readonly [string, string]) => void;
  onConnected: (graph: OpinionGraph) => void;
  onInteractionStateChange?: (event: PlanetInteractionEvent) => void;
  autoAnalyze?: boolean;
}) {
  const { t } = useTranslation("galaxy");
  const [analysis, setAnalysis] = useState<CollisionAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bridgeType, setBridgeType] = useState<RelationType>("add");
  const developmentFusion = process.env.NODE_ENV === "development";
  const allowFallbackFusion = developmentFusion || galaxy.demo;
  const selected = useMemo(() => selectedIds.map((id) => galaxy.graph.opinions.find((opinion) => opinion.id === id)).filter(Boolean), [galaxy.graph.opinions, selectedIds]);

  const analyze = useCallback(async () => {
    if (selectedIds.length !== 2 || loading) return;
    setLoading(true); setError(null); setAnalysis(null);
    onInteractionStateChange?.({ state: "analysis", opinionIds: selectedIds });
    try { setAnalysis(await collideOpinions(selectedIds[0], selectedIds[1], galaxy.graph)); }
    catch { setError(t("interaction.panel.error")); }
    finally { setLoading(false); }
  }, [galaxy.graph, loading, onInteractionStateChange, selectedIds, t]);

  useEffect(() => {
    if (!autoAnalyze || selectedIds.length !== 2 || analysis || loading) return;
    const timer = window.setTimeout(() => { void analyze(); }, 90);
    return () => window.clearTimeout(timer);
  }, [analysis, analyze, autoAnalyze, loading, selectedIds.length]);

  const fuse = () => {
    if (!analysis || selectedIds.length !== 2 || (analysis.source === "fallback" && !allowFallbackFusion)) return;
    const mutation = fuseGalaxyOpinions({ graph: galaxy.graph, parentA: selectedIds[0], parentB: selectedIds[1], title: analysis.candidate.title, summary: analysis.candidate.summary, rationale: analysis.coreDisagreement });
    const parentIds: readonly [string, string] = [selectedIds[0], selectedIds[1]];
    onInteractionStateChange?.({ state: "fusion", opinionIds: parentIds });
    onFused(mutation.graph, mutation.opinionId, parentIds);
  };

  const connect = () => {
    if (!analysis || selectedIds.length !== 2) return;
    const next = connectGalaxyOpinions({ graph: galaxy.graph, from: selectedIds[0], to: selectedIds[1], type: bridgeType, rationale: analysis.source === "ai" ? analysis.coreDisagreement : t("interaction.panel.userBridgeRationale") });
    onConnected(next);
  };

  return <aside className={styles.panel} data-el="collision-panel">
    <header><div><span>{t("interaction.panel.title")}</span><strong>{selectedIds.length}/2</strong></div><button type="button" onClick={onClear} aria-label={t("interaction.panel.close")}><X size={15} /></button></header>
    <div className={styles.selected}>{selected.length ? selected.map((opinion, index) => opinion ? <article key={opinion.id}><small>{index === 0 ? "A" : "B"}</small><p>{opinion.title}</p><button type="button" onClick={() => onRemove(opinion.id)}>{t("interaction.panel.remove")}</button></article> : null) : <p className={styles.hint}>{t("interaction.panel.emptySelection")}</p>}</div>
    {selectedIds.length < 2 ? <p className={styles.hint}>{t("interaction.panel.needSelection", { count: 2 - selectedIds.length })}</p> : <button type="button" className={styles.analyze} onClick={() => void analyze()} disabled={loading}>{loading ? <><LoaderCircle className={styles.spin} size={15} />{t("interaction.panel.analyzing")}</> : <><Sparkles size={15} />{t(analysis ? "interaction.panel.reanalyze" : "interaction.panel.analyze")}</>}</button>}
    {error && <p className={styles.error}>{error}</p>}
    {analysis && <div className={styles.analysis} data-el="collision-analysis">
      <section><span>{t("interaction.panel.consensus")}</span><p>{analysis.consensus}</p></section>
      <section><span>{t("interaction.panel.disagreement")}</span><p>{analysis.coreDisagreement}</p></section>
      <div className={styles.two}><section><span>{t("interaction.panel.conditionA")}</span><p>{analysis.conditions.a}</p></section><section><span>{t("interaction.panel.conditionB")}</span><p>{analysis.conditions.b}</p></section></div>
      <section><span>{t("interaction.panel.evidence")}</span><p>{analysis.evidence.verdict}</p></section>
      {analysis.missing.length > 0 && <section><span>{t("interaction.panel.missing")}</span>{analysis.missing.slice(0, 3).map((item) => <p key={item}>· {item}</p>)}</section>}
      <div className={styles.bridge} data-el="bridge-builder"><span>{t("interaction.panel.bridgeTitle")}</span><p>{t("interaction.panel.bridgeDescription")}</p><div className={styles.bridgeTypes}>{RELATION_TYPES.map((type) => <button key={type} type="button" aria-pressed={bridgeType === type} data-active={bridgeType === type ? "true" : "false"} title={t(`interaction.relationDetails.${type}`)} onClick={() => setBridgeType(type)}>{t(`interaction.relations.${type}`)}</button>)}</div><button type="button" className={styles.bridgeAction} data-el="connect-planets" onClick={connect}><Link2 size={14} />{t("interaction.panel.connect")}</button></div>
      <div className={styles.candidate}><span>{t("interaction.panel.fusionTitle")}</span><h3>{analysis.candidate.title}</h3><p>{analysis.candidate.summary}</p>{analysis.source === "fallback" && !galaxy.demo && <p className={styles.error}>{t(developmentFusion ? "interaction.panel.developmentFusion" : "interaction.panel.fallbackWarning")}</p>}{analysis.source === "fallback" && galaxy.demo && <p className={styles.hint}>DEMO · 当前融合候选由离线降级逻辑生成，可继续体验完整闭环。</p>}<button type="button" data-el="fuse-planets" data-simulated={analysis.source === "fallback" ? "true" : undefined} disabled={analysis.source === "fallback" && !allowFallbackFusion} onClick={fuse}><GitMerge size={15} />{t("interaction.panel.fuse")}</button></div>
    </div>}
  </aside>;
}
