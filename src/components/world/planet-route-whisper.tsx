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
import styles from "./planet-route-whisper.module.css";

function surfaceConfig(config: WorldConfig): WorldConfig {
  return {
    ...config,
    npcs: [],
    pois: config.pois.filter((poi) => poi.kind === "rocket" || poi.kind === "fog"),
  };
}

function point(pos: GridPos) {
  return {
    x: (pos.x + 0.5) * TILE_SIZE,
    y: (pos.y + 0.5) * TILE_SIZE,
  };
}

function curve(from: GridPos, to: GridPos, index: number) {
  const a = point(from);
  const b = point(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const bend = (index % 2 === 0 ? 1 : -1) * Math.min(34, 10 + length * 0.08);
  const cx = (a.x + b.x) / 2 + nx * bend;
  const cy = (a.y + b.y) / 2 + ny * bend;
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
}

export function PlanetRouteWhisper({ opinionId }: { opinionId: string }) {
  const entry = useMemo(() => loadOpinionWorldEntry(opinionId), [opinionId]);
  const [config, setConfig] = useState<WorldConfig | null>(null);
  const [worldEl, setWorldEl] = useState<HTMLElement | null>(null);
  const [collectedIds, setCollectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!entry) return;
    let alive = true;
    void fetchWorldConfig(entry.opinion.questionId)
      .then((view) => {
        if (alive) setConfig(surfaceConfig(view.config));
      })
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

  useEffect(() => {
    if (typeof document === "undefined") return;
    const runtime = document.querySelector<HTMLElement>('[data-el="world-runtime"]');
    if (!runtime) return;
    const read = () => {
      setCollectedIds((runtime.dataset.fragments ?? "").split(",").filter(Boolean));
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(runtime, { attributes: true, attributeFilter: ["data-fragments"] });
    return () => observer.disconnect();
  }, [worldEl]);

  const route = useMemo(() => {
    if (!entry || !config) return null;
    const scene = buildPlanetSceneSpec(entry.opinion);
    const plan = buildCognitionFragmentPlan(entry.opinion, scene);
    const spawn = resolveSpawn(config, opinionId, { camp: entry.opinion.camp });
    const sites = layoutCognitionSites(config, spawn, plan);
    const rocket = config.pois.find((poi) => poi.kind === "rocket")?.pos ?? null;
    return { spawn, sites, rocket };
  }, [config, entry, opinionId]);

  if (!worldEl || !config || !route || route.sites.length === 0) return null;

  const collected = new Set(collectedIds);
  const width = config.size.w * TILE_SIZE;
  const height = config.size.h * TILE_SIZE;
  let previous = route.spawn;
  let firstUncollectedSeen = false;

  const segments = route.sites.map((site, index) => {
    const done = collected.has(site.fragment.id);
    const state = done ? "understood" : firstUncollectedSeen ? "distant" : "calling";
    if (!done && !firstUncollectedSeen) firstUncollectedSeen = true;
    const d = curve(previous, site.pos, index);
    previous = site.pos;
    return { id: site.id, d, state, role: site.fragment.role };
  });

  const allRecovered = route.sites.every((site) => collected.has(site.fragment.id));
  const returnPath = route.rocket
    ? curve(previous, route.rocket, route.sites.length + 1)
    : null;

  return createPortal(
    <svg
      className={styles.routes}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden
      style={{ "--route-count": route.sites.length } as CSSProperties}
    >
      {segments.map((segment) => (
        <path
          key={segment.id}
          d={segment.d}
          data-state={segment.state}
          data-role={segment.role}
        />
      ))}
      {returnPath ? <path d={returnPath} data-state={allRecovered ? "return" : "return-hidden"} /> : null}
    </svg>,
    worldEl,
  );
}
