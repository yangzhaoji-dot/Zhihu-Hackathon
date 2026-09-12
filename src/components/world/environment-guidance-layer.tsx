"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { fetchWorldConfig } from "@/lib/api/opinion";
import { buildPlanetSceneSpec } from "@/lib/opinion/planet-scene-spec";
import type { WorldConfig } from "@/lib/opinion/types";
import { loadOpinionWorldEntry } from "@/lib/opinion/world-session";
import { buildCognitionFragmentPlan, type CognitionFragmentRole } from "@/lib/world/cognition-fragment-plan";
import { layoutCognitionSites } from "@/lib/world/cognition-site-layout";
import { TILE_SIZE, type GridPos } from "@/lib/world/geometry";
import { resolveSpawn } from "@/lib/world/spawn";
import styles from "./environment-guidance-layer.module.css";

const SIGN_COPY: Record<CognitionFragmentRole, { title: string; hint: string }> = {
  claim: { title: "认知入口", hint: "先看见，再下判断" },
  reason: { title: "理由路径", hint: "问它为什么这样想" },
  condition: { title: "边界实验区", hint: "改变条件，看哪些路仍成立" },
  evidence: { title: "原话记录区", hint: "先读原话，再判断它支持什么" },
  boundary: { title: "观点边界", hint: "到这里为止，还有什么不知道" },
};

function surfaceConfig(config: WorldConfig): WorldConfig {
  return {
    ...config,
    npcs: [],
    pois: config.pois.filter((poi) => poi.kind === "rocket" || poi.kind === "fog"),
  };
}

function point(pos: GridPos) {
  return { x: (pos.x + 0.5) * TILE_SIZE, y: (pos.y + 0.5) * TILE_SIZE };
}

function curve(from: GridPos, to: GridPos, index: number) {
  const a = point(from);
  const b = point(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const bend = (index % 2 === 0 ? 1 : -1) * Math.min(28, 8 + length * 0.07);
  const cx = (a.x + b.x) / 2 + nx * bend;
  const cy = (a.y + b.y) / 2 + ny * bend;
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
}

export function EnvironmentGuidanceLayer({ opinionId }: { opinionId: string }) {
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

  const layout = useMemo(() => {
    if (!entry || !config) return null;
    const scene = buildPlanetSceneSpec(entry.opinion);
    const plan = buildCognitionFragmentPlan(entry.opinion, scene);
    const spawn = resolveSpawn(config, opinionId, { camp: entry.opinion.camp });
    const sites = layoutCognitionSites(config, spawn, plan);
    return { scene, spawn, sites };
  }, [config, entry, opinionId]);

  if (!worldEl || !config || !layout || layout.sites.length === 0) return null;

  const width = config.size.w * TILE_SIZE;
  const height = config.size.h * TILE_SIZE;
  const segments = layout.sites.map((site, index) => ({
    id: site.id,
    d: curve(index === 0 ? layout.spawn : layout.sites[index - 1].pos, site.pos, index),
  }));

  return createPortal(
    <>
      <svg className={styles.guidance} viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden>
        {segments.map((segment, index) => (
          <g key={segment.id} data-depth={index}>
            <path className={styles.stonePathShadow} d={segment.d} />
            <path className={styles.stonePath} d={segment.d} />
            <path className={styles.traces} d={segment.d} />
          </g>
        ))}
      </svg>

      <div
        className={`${styles.sign} ${styles.landingSign}`}
        style={{ left: (layout.spawn.x + 1.25) * TILE_SIZE, top: (layout.spawn.y - 1.05) * TILE_SIZE }}
        data-kind="landing"
      >
        <i aria-hidden />
        <div><strong>{layout.scene.biome === "forest" ? "圣所边缘" : "认知落点"}</strong><span>沿留下的痕迹进入这颗观点星球</span></div>
      </div>

      {layout.sites.map((site, index) => {
        const copy = SIGN_COPY[site.fragment.role];
        return (
          <div
            key={`sign-${site.id}`}
            className={styles.sign}
            data-role={site.fragment.role}
            style={{
              left: (site.pos.x + (index % 2 === 0 ? -1.5 : 1.15)) * TILE_SIZE,
              top: (site.pos.y - 1.65) * TILE_SIZE,
            }}
          >
            <i aria-hidden />
            <div><strong>{copy.title}</strong><span>{copy.hint}</span></div>
          </div>
        );
      })}
    </>,
    worldEl,
  );
}
