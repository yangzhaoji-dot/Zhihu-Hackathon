"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { fetchWorldConfig } from "@/lib/api/opinion";
import { buildPlanetSceneSpec } from "@/lib/opinion/planet-scene-spec";
import type { WorldConfig } from "@/lib/opinion/types";
import { loadOpinionWorldEntry } from "@/lib/opinion/world-session";
import { buildCognitionFragmentPlan } from "@/lib/world/cognition-fragment-plan";
import { layoutCognitionSites } from "@/lib/world/cognition-site-layout";
import { TILE_SIZE, type GridPos } from "@/lib/world/geometry";
import { resolveSpawn } from "@/lib/world/spawn";
import styles from "./forest-story-landmarks.module.css";

function surfaceConfig(config: WorldConfig): WorldConfig {
  return {
    ...config,
    npcs: [],
    pois: config.pois.filter((poi) => poi.kind === "rocket" || poi.kind === "fog"),
  };
}

function px(pos: GridPos) {
  return {
    left: (pos.x + 0.5) * TILE_SIZE,
    top: (pos.y + 0.5) * TILE_SIZE,
  };
}

function midpoint(a: GridPos, b: GridPos): GridPos {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function ForestStoryLandmarks({ opinionId }: { opinionId: string }) {
  const entry = useMemo(() => loadOpinionWorldEntry(opinionId), [opinionId]);
  const [config, setConfig] = useState<WorldConfig | null>(null);
  const [worldEl, setWorldEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!entry) return;
    let alive = true;
    void fetchWorldConfig(entry.opinion.questionId)
      .then((view) => { if (alive) setConfig(surfaceConfig(view.config)); })
      .catch(() => {});
    return () => { alive = false; };
  }, [entry]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    let raf = 0;
    const findWorld = () => {
      const candidate = document.querySelector<HTMLElement>('[data-el="world-runtime"] [data-world-theme]');
      if (candidate) {
        setWorldEl(candidate);
        return;
      }
      raf = window.requestAnimationFrame(findWorld);
    };
    raf = window.requestAnimationFrame(findWorld);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  const scene = useMemo(() => entry ? buildPlanetSceneSpec(entry.opinion) : null, [entry]);
  const layout = useMemo(() => {
    if (!entry || !config || !scene || scene.biome !== "forest") return null;
    const plan = buildCognitionFragmentPlan(entry.opinion, scene);
    const spawn = resolveSpawn(config, opinionId, { camp: entry.opinion.camp });
    const sites = layoutCognitionSites(config, spawn, plan);
    const evidence = sites.find((site) => site.fragment.role === "evidence") ?? sites[1] ?? null;
    const boundary = sites.find((site) => site.fragment.role === "boundary") ?? sites.at(-1) ?? null;
    return { spawn, sites, evidence, boundary };
  }, [config, entry, opinionId, scene]);

  if (!worldEl || !scene || scene.biome !== "forest" || !layout || layout.sites.length === 0) return null;

  const claim = layout.sites[0];
  const evidence = layout.evidence;
  const boundary = layout.boundary;
  const mirror = evidence && boundary ? midpoint(evidence.pos, boundary.pos) : claim.pos;

  return createPortal(
    <div className={styles.layer} aria-hidden>
      <div className={`${styles.landmark} ${styles.arrivalGate}`} style={px(layout.spawn) as CSSProperties}>
        <i className={styles.archLeft} />
        <i className={styles.archRight} />
        <i className={styles.archTop} />
        <b className={styles.moss} />
      </div>

      <div className={`${styles.landmark} ${styles.rootShelter}`} style={px(claim.pos) as CSSProperties}>
        <div className={styles.shelterWall} />
        <div className={styles.shelterDoor} />
        <div className={styles.rootA} />
        <div className={styles.rootB} />
        <div className={styles.rootC} />
        <div className={styles.shelterPaper}><span /><span /><span /></div>
        <div className={styles.shelterLamp} />
      </div>

      {evidence ? (
        <div className={`${styles.landmark} ${styles.answerWall}`} style={px(evidence.pos) as CSSProperties}>
          <div className={styles.wallSlab} />
          <div className={styles.paper} data-paper="1"><span /><span /><span /><span /></div>
          <div className={styles.paper} data-paper="2"><span /><span /><span /></div>
          <div className={styles.wallVine} />
          <div className={styles.wallLamp} />
        </div>
      ) : null}

      <div className={`${styles.landmark} ${styles.waterMirror}`} style={px(mirror) as CSSProperties}>
        <i /><i /><i />
        <b />
      </div>

      {boundary ? (
        <div className={`${styles.landmark} ${styles.boundaryTree}`} style={px(boundary.pos) as CSSProperties}>
          <div className={styles.trunk} />
          <div className={styles.crownA} />
          <div className={styles.crownB} />
          <div className={styles.rootLeft} />
          <div className={styles.rootRight} />
          <div className={styles.rootFront} />
          <div className={styles.treeMarker} />
        </div>
      ) : null}
    </div>,
    worldEl,
  );
}
