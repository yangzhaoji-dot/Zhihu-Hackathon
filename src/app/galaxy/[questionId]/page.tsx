"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronRight, GitMerge, RotateCcw } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { memory } from "@eazo/sdk";
import {
  CollisionPanel,
  PlanetRelationOverlay,
  type FusionPresentation,
  type InteractionState,
  type PlanetCollision,
  type PlanetInteractionEvent,
} from "@/components/planet-interaction";
import { SpaceShell } from "@/components/cognitive-galaxy/space-shell";
import { GalaxyStage } from "@/components/cognitive-galaxy/galaxy-stage";
import { PlanetFocus } from "@/components/cognitive-galaxy/planet-focus";
import { buildGalaxy } from "@/lib/cognitive-galaxy/model";
import { DEMO_ASSIGNMENTS, DEMO_ID } from "@/lib/cognitive-galaxy/demo";
import { galaxyUrl, readGalaxy, resetGalaxy, saveGalaxy } from "@/lib/cognitive-galaxy/session";
import { loadGalaxy } from "@/lib/api/cognitive-galaxy";
import type { OpinionGraph } from "@/lib/opinion/types";
import styles from "@/components/cognitive-galaxy/galaxy.module.css";

export default function GalaxyPage() {
  const { t } = useTranslation("galaxy");
  const { questionId } = useParams<{ questionId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const [record, setRecord] = useState<{ id: string; graph: OpinionGraph | null; failed: boolean } | null>(null);
  const [collisionIds, setCollisionIds] = useState<string[]>([]);
  const [collisionAuto, setCollisionAuto] = useState(false);
  const [collisionCenter, setCollisionCenter] = useState<{ x: number; y: number } | null>(null);
  const [fusionPresentation, setFusionPresentation] = useState<FusionPresentation | null>(null);
  const [interactionNotice, setInteractionNotice] = useState<string | null>(null);
  const [interactionState, setInteractionState] = useState<InteractionState>("idle");
  const interactionTimer = useRef<number | null>(null);
  const fusionNavigationTimer = useRef<number | null>(null);

  const changeInteractionState = useCallback((event: PlanetInteractionEvent) => {
    if (interactionTimer.current !== null && event.state === "idle") return;
    if (process.env.NODE_ENV === "development") {
      console.log("[planet-interaction]", {
        state: event.state,
        aId: event.opinionIds[0] ?? null,
        bId: event.opinionIds[1] ?? null,
      });
    }
    setInteractionState(event.state);
  }, []);

  const pulseInteractionState = useCallback((event: PlanetInteractionEvent, duration = 1500) => {
    if (interactionTimer.current !== null) window.clearTimeout(interactionTimer.current);
    setInteractionState(event.state);
    interactionTimer.current = window.setTimeout(() => {
      setInteractionState("idle");
      interactionTimer.current = null;
    }, duration);
  }, []);

  useEffect(() => {
    const abort = new AbortController();
    const timeout = window.setTimeout(() => abort.abort(), 18000);
    let alive = true;
    void (async () => {
      try {
        const graph = readGalaxy(questionId) ?? await loadGalaxy(questionId,abort.signal);
        await Promise.resolve();
        if (!alive) return;
        saveGalaxy(graph); setRecord({ id:questionId,graph,failed:false });
      } catch { if (alive) setRecord({ id:questionId,graph:null,failed:true }); }
      finally { clearTimeout(timeout); }
    })();
    return () => { alive=false; clearTimeout(timeout); abort.abort(); };
  }, [questionId]);

  useEffect(() => () => {
    if (interactionTimer.current !== null) window.clearTimeout(interactionTimer.current);
    if (fusionNavigationTimer.current !== null) window.clearTimeout(fusionNavigationTimer.current);
  }, []);

  const graph = record?.id === questionId ? record.graph : null;
  const galaxy = useMemo(() => graph ? buildGalaxy(graph,questionId === DEMO_ID ? DEMO_ASSIGNMENTS : {}) : null, [graph,questionId]);
  const cluster = galaxy?.clusters.find((item) => item.id === search.get("cluster")) ?? null;
  const selected = cluster?.nodes.find((node) => node.opinion.id === search.get("opinion")) ?? null;
  const navigate = (clusterId?: string | null, opinionId?: string | null) => {
    if (opinionId || clusterId !== cluster?.id) { setCollisionIds([]); setCollisionAuto(false); }
    setCollisionCenter(null);
    setFusionPresentation(null);
    setInteractionNotice(null);
    router.push(galaxyUrl(questionId,clusterId,opinionId),{ scroll:false });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (collisionIds.length) { setCollisionIds([]); setCollisionAuto(false); return; }
      const current = new URLSearchParams(window.location.search);
      if (current.has("opinion")) router.push(galaxyUrl(questionId,current.get("cluster")),{ scroll:false });
      else if (current.has("cluster")) router.push(galaxyUrl(questionId),{ scroll:false });
    };
    window.addEventListener("keydown",onKey);
    return () => window.removeEventListener("keydown",onKey);
  }, [router,questionId,collisionIds.length]);

  const toggleCollision = (id: string) => {
    setCollisionAuto(false);
    setCollisionCenter(null);
    setInteractionNotice(null);
    setCollisionIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length < 2) return [...current,id];
      return [current[1],id];
    });
  };

  const startPhysicalCollision = useCallback((collision: PlanetCollision) => {
    setInteractionNotice(null);
    setCollisionCenter(collision.center);
    setCollisionIds([collision.aId,collision.bId]);
    setCollisionAuto(true);
  },[]);

  const acceptGraphMutation = (
    nextGraph: OpinionGraph,
    opinionId: string,
    parentIds: readonly [string, string],
  ) => {
    if (!galaxy) return;
    saveGalaxy(nextGraph);
    setRecord({ id:questionId,graph:nextGraph,failed:false });
    const built = buildGalaxy(nextGraph,questionId === DEMO_ID ? DEMO_ASSIGNMENTS : {});
    const nextCluster = built.clusters.find((group) => group.nodes.some((node) => node.opinion.id === opinionId));
    const parentNodes = galaxy.clusters.flatMap((group) => group.nodes).filter((node) => parentIds.includes(node.opinion.id));
    const origin = collisionCenter ?? (parentNodes.length === 2
      ? { x:(parentNodes[0].x + parentNodes[1].x) / 2, y:(parentNodes[0].y + parentNodes[1].y) / 2 }
      : { x:nextCluster?.x ?? 720, y:nextCluster?.y ?? 450 });
    setCollisionIds([]); setCollisionAuto(false);
    setFusionPresentation({ candidateId:opinionId, parentIds, origin });
    pulseInteractionState({ state:"fusion", opinionIds:parentIds });
    void memory.reportAction({
      content: "User fused two opinions into a new planet",
      event_type: "create",
      page: "galaxy",
      metadata: { type: "opinion_fusion", questionId, opinionId },
    }).catch(() => {});
    router.push(galaxyUrl(questionId,nextCluster?.id),{ scroll:false });
    if (fusionNavigationTimer.current !== null) window.clearTimeout(fusionNavigationTimer.current);
    fusionNavigationTimer.current = window.setTimeout(() => {
      setFusionPresentation(null);
      router.push(galaxyUrl(questionId,nextCluster?.id,opinionId),{ scroll:false });
      fusionNavigationTimer.current = null;
    }, 1650);
  };

  const acceptConnection = (nextGraph:OpinionGraph) => {
    saveGalaxy(nextGraph);
    setRecord({ id:questionId,graph:nextGraph,failed:false });
    setCollisionIds([]); setCollisionAuto(false);
    setCollisionCenter(null);
    changeInteractionState({ state:"idle", opinionIds:[] });
    setInteractionNotice(t("interaction.bridgeCreated"));
    void memory.reportAction({
      content: "User connected two opinion planets",
      event_type: "create",
      page: "galaxy",
      metadata: { type: "opinion_bridge", questionId },
    }).catch(() => {});
  };

  const resetEvolution = () => {
    const pristine = resetGalaxy(questionId);
    if (!pristine) return;
    saveGalaxy(pristine);
    setRecord({ id:questionId,graph:pristine,failed:false });
    setCollisionIds([]); setCollisionAuto(false); setCollisionCenter(null);
    setFusionPresentation(null); setInteractionNotice(null);
    router.push(galaxyUrl(questionId),{ scroll:false });
  };

  const pending = record?.id !== questionId;
  if (!galaxy) return <SpaceShell><main className={styles.status} aria-live="polite"><h1>{t(pending ? "loadingGalaxy" : "unavailable")}</h1>{!pending && <><p>{t("unavailableDetail")}</p><Link href="/">{t("home")}</Link></>}</main></SpaceShell>;

  return <SpaceShell map><main className={styles.page} data-el="galaxy-exploration" data-interaction-state={interactionState}>
    <div className={styles.toolbar}>
      <div>
        <nav className={styles.eyebrow} aria-label={t("progressTitle")}><Link href="/">{t("brand")}</Link><ChevronRight size={11}/>{cluster ? <button type="button" onClick={() => navigate()}>{t("overview")}</button> : <span>{t("overviewKicker")}</span>}{cluster && <><ChevronRight size={11}/><span>{t(`dimensions.${cluster.id}.title`)}</span></>}{galaxy.demo && <span className={styles.badge}>{t("demo")}</span>}</nav>
        <h1>{cluster ? t(`dimensions.${cluster.id}.title`) : galaxy.graph.questionTitle}</h1>
        <p>{cluster ? `${galaxy.graph.questionTitle} · ${t(`dimensions.${cluster.id}.description`)}` : t("chooseDirection")}</p>
        {cluster && !selected && <p style={{color:"var(--cg-accent)",opacity:.72}}>{t("interaction.instructions")}</p>}
        {interactionNotice && <p role="status" style={{color:"var(--cg-accent)"}}>{interactionNotice}</p>}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:16}}>
        {galaxy.demo && <button type="button" data-el="reset-galaxy" onClick={resetEvolution} style={{border:"1px solid var(--cg-line)",background:"var(--cg-panel)",color:"var(--cg-muted)",borderRadius:8,padding:"9px 11px",display:"flex",alignItems:"center",gap:7,fontSize:10}}><RotateCcw size={13}/>{t("interaction.resetEvolution")}</button>}
        <div className={styles.scale}><span data-active={!cluster}>{t("scaleQuestion")}</span><ChevronRight size={11}/><span data-active={!!cluster && !selected}>{t("scaleCluster")}</span><ChevronRight size={11}/><span data-active={!!selected}>{t("scaleOpinion")}</span></div>
      </div>
    </div>
    <div style={{position:"relative"}}>
      {galaxy.count ? <GalaxyStage galaxy={galaxy} cluster={cluster} selected={selected} fusion={fusionPresentation} onCluster={(id) => navigate(id)} onOpinion={(id) => navigate(cluster?.id,id)} onPlanetPair={startPhysicalCollision} onInteractionStateChange={changeInteractionState}/> : <div className={styles.status}><p>{t("emptyGalaxy")}</p><Link href="/">{t("home")}</Link></div>}
      {cluster && !selected && <PlanetRelationOverlay graph={galaxy.graph} nodes={cluster.nodes} enabled clusterId={cluster.id}/>} 
    </div>
    <AnimatePresence mode="wait">{selected && <PlanetFocus key={selected.opinion.id} node={selected} galaxy={galaxy} onClose={() => navigate(cluster?.id)}/>}</AnimatePresence>
    {!cluster && <div className={styles.directionStrip} aria-label={t("directions",{ count:galaxy.clusters.length })}>{galaxy.clusters.map((group) => <button type="button" className={styles.direction} key={group.id} style={{ "--cluster-color":`var(--cg-${group.id})` } as CSSProperties} onClick={() => navigate(group.id)} data-el="cluster-shortcut"><strong><i/>{t(`dimensions.${group.id}.title`)} <ChevronRight size={12}/></strong><small>{t(`dimensions.${group.id}.description`)}</small></button>)}</div>}
    {cluster && !selected && <section className={styles.opinions} style={{ "--cluster-color":`var(--cg-${cluster.id})` } as CSSProperties}>
      <h2>{t("opinionsList")} · {t("nodes",{ count:cluster.nodes.length })} <span style={{marginLeft:12,color:"var(--cg-muted)",fontWeight:400}}>{t("interaction.listHint")}</span></h2>
      <div className={styles.opinionList}>{cluster.nodes.map((node,i) => {
        const collisionSelected = collisionIds.includes(node.opinion.id);
        const relationCount = galaxy.graph.relations.filter((relation) => relation.from===node.opinion.id || relation.to===node.opinion.id).length;
        return <div key={node.opinion.id} style={{display:"grid",gridTemplateColumns:"1fr auto",gap:6}} data-collision-selected={collisionSelected ? "true" : "false"}>
          <button type="button" onClick={() => navigate(cluster.id,node.opinion.id)} data-el="opinion-shortcut"><small>{String(i+1).padStart(2,"0")}</small><span>{node.opinion.title}{relationCount>0 && <small style={{display:"block",marginTop:4}}>↔ {t("interaction.relationCount", { count: relationCount })}</small>}</span></button>
          <button type="button" data-el="collision-select" aria-pressed={collisionSelected} onClick={() => toggleCollision(node.opinion.id)} style={{width:58,padding:8,borderColor:collisionSelected ? "var(--cluster-color)" : "var(--cg-line)",color:collisionSelected ? "var(--cg-ink)" : "var(--cg-dim)",justifyContent:"center",alignItems:"center",display:"flex"}}><GitMerge size={12}/>{t(collisionSelected ? "interaction.selected" : "interaction.collide")}</button>
        </div>;
      })}</div>
    </section>}
    {cluster && !selected && collisionIds.length > 0 && <CollisionPanel
      key={collisionIds.join(":")}
      galaxy={galaxy}
      selectedIds={collisionIds}
      autoAnalyze={collisionAuto}
      onRemove={(id) => {
        setCollisionAuto(false);
        setCollisionCenter(null);
        setCollisionIds((current) => current.filter((item) => item !== id));
      }}
      onClear={() => {
        setCollisionIds([]);
        setCollisionAuto(false);
        setCollisionCenter(null);
        changeInteractionState({ state:"idle", opinionIds:[] });
      }}
      onConnected={acceptConnection}
      onFused={acceptGraphMutation}
      onInteractionStateChange={changeInteractionState}
    />}
    <footer className={styles.bottom}>
      <div className={styles.notice}>
        {cluster && <button type="button" className={styles.direction} style={{ padding:"0 0 12px",border:0 }} onClick={() => selected ? navigate(cluster.id) : navigate()}><ArrowLeft size={12} style={{ display:"inline",marginRight:8 }}/>{t("back")}</button>}
        <p>{t("nodes",{ count:galaxy.count })} · {t("directions",{ count:galaxy.clusters.length })} — {t(galaxy.demo ? "demoNotice" : "liveNotice")}</p>
        {!galaxy.demo && <p>{t("groupingNotice")}</p>}
        {galaxy.excludedCount > 0 && <p>{t("aiExcluded",{ count:galaxy.excludedCount })}</p>}
      </div>
      <details className={styles.legend}><summary>{t("legend")}</summary><div><p>{t("legendColor")}</p><p>{t("legendSize")}</p><p>{t("legendDust")}</p></div></details>
    </footer>
  </main></SpaceShell>;
}
