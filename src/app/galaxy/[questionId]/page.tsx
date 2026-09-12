"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { SpaceShell } from "@/components/cognitive-galaxy/space-shell";
import { GalaxyStage } from "@/components/cognitive-galaxy/galaxy-stage";
import { PlanetFocus } from "@/components/cognitive-galaxy/planet-focus";
import { buildGalaxy } from "@/lib/cognitive-galaxy/model";
import { DEMO_ASSIGNMENTS, DEMO_ID } from "@/lib/cognitive-galaxy/demo";
import { galaxyUrl, readGalaxy, saveGalaxy } from "@/lib/cognitive-galaxy/session";
import { loadGalaxy } from "@/lib/api/cognitive-galaxy";
import type { OpinionGraph } from "@/lib/opinion/types";
import styles from "@/components/cognitive-galaxy/galaxy.module.css";

export default function GalaxyPage() {
  const { t } = useTranslation("galaxy");
  const { questionId } = useParams<{ questionId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const [record, setRecord] = useState<{ id: string; graph: OpinionGraph | null; failed: boolean } | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    const timeout = window.setTimeout(() => abort.abort(), 18000);
    let alive = true;
    void (async () => {
      try {
        const graph = readGalaxy(questionId) ?? await loadGalaxy(questionId,abort.signal);
        // Yield also for the synchronous cache path, so effects don't synchronously set state.
        await Promise.resolve();
        if (!alive) return;
        saveGalaxy(graph); setRecord({ id:questionId,graph,failed:false });
      } catch { if (alive) setRecord({ id:questionId,graph:null,failed:true }); }
      finally { clearTimeout(timeout); }
    })();
    return () => { alive=false; clearTimeout(timeout); abort.abort(); };
  }, [questionId]);
  const graph = record?.id === questionId ? record.graph : null;
  const galaxy = useMemo(() => graph ? buildGalaxy(graph,questionId === DEMO_ID ? DEMO_ASSIGNMENTS : {}) : null, [graph,questionId]);
  const cluster = galaxy?.clusters.find((item) => item.id === search.get("cluster")) ?? null;
  const selected = cluster?.nodes.find((node) => node.opinion.id === search.get("opinion")) ?? null;
  const navigate = (clusterId?: string | null, opinionId?: string | null) => router.push(galaxyUrl(questionId,clusterId,opinionId),{ scroll:false });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (selected) router.push(galaxyUrl(questionId,cluster?.id),{ scroll:false });
      else if (cluster) router.push(galaxyUrl(questionId),{ scroll:false });
    };
    window.addEventListener("keydown",onKey);
    return () => window.removeEventListener("keydown",onKey);
  }, [selected,cluster,router,questionId]);

  const pending = record?.id !== questionId;
  if (!galaxy) return <SpaceShell><main className={styles.status} aria-live="polite"><h1>{t(pending ? "loadingGalaxy" : "unavailable")}</h1>{!pending && <><p>{t("unavailableDetail")}</p><Link href="/">{t("home")}</Link></>}</main></SpaceShell>;

  return <SpaceShell map><main className={styles.page} data-el="galaxy-exploration">
    <div className={styles.toolbar}>
      <div>
        <nav className={styles.eyebrow} aria-label={t("progressTitle")}><Link href="/">{t("brand")}</Link><ChevronRight size={11}/>{cluster ? <button type="button" onClick={() => navigate()}>{t("overview")}</button> : <span>{t("overviewKicker")}</span>}{cluster && <><ChevronRight size={11}/><span>{t(`dimensions.${cluster.id}.title`)}</span></>}{galaxy.demo && <span className={styles.badge}>{t("demo")}</span>}</nav>
        <h1>{cluster ? t(`dimensions.${cluster.id}.title`) : galaxy.graph.questionTitle}</h1>
        <p>{cluster ? `${galaxy.graph.questionTitle} · ${t(`dimensions.${cluster.id}.description`)}` : t("chooseDirection")}</p>
      </div>
      <div className={styles.scale}><span data-active={!cluster}>{t("scaleQuestion")}</span><ChevronRight size={11}/><span data-active={!!cluster && !selected}>{t("scaleCluster")}</span><ChevronRight size={11}/><span data-active={!!selected}>{t("scaleOpinion")}</span></div>
    </div>
    {galaxy.count ? <GalaxyStage galaxy={galaxy} cluster={cluster} selected={selected} onCluster={(id) => navigate(id)} onOpinion={(id) => navigate(cluster?.id,id)}/> : <div className={styles.status}><p>{t("emptyGalaxy")}</p><Link href="/">{t("home")}</Link></div>}
    <AnimatePresence mode="wait">{selected && <PlanetFocus key={selected.opinion.id} node={selected} galaxy={galaxy} onClose={() => navigate(cluster?.id)}/>}</AnimatePresence>
    {!cluster && <div className={styles.directionStrip} aria-label={t("directions",{ count:galaxy.clusters.length })}>{galaxy.clusters.map((group) => <button type="button" className={styles.direction} key={group.id} style={{ "--cluster-color":`var(--cg-${group.id})` } as CSSProperties} onClick={() => navigate(group.id)} data-el="cluster-shortcut"><strong><i/>{t(`dimensions.${group.id}.title`)} <ChevronRight size={12}/></strong><small>{t(`dimensions.${group.id}.description`)}</small></button>)}</div>}
    {cluster && !selected && <section className={styles.opinions} style={{ "--cluster-color":`var(--cg-${cluster.id})` } as CSSProperties}><h2>{t("opinionsList")} · {t("nodes",{ count:cluster.nodes.length })}</h2><div className={styles.opinionList}>{cluster.nodes.map((node,i) => <button type="button" key={node.opinion.id} onClick={() => navigate(cluster.id,node.opinion.id)} data-el="opinion-shortcut"><small>{String(i+1).padStart(2,"0")}</small><span>{node.opinion.title}</span></button>)}</div></section>}
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
