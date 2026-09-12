"use client";

import { useEffect, useMemo } from "react";
import { buildPlanetSceneSpec } from "@/lib/opinion/planet-scene-spec";
import { loadOpinionWorldEntry } from "@/lib/opinion/world-session";

export function PlanetBiomeSync({ opinionId }: { opinionId: string }) {
  const entry = useMemo(() => loadOpinionWorldEntry(opinionId), [opinionId]);
  const scene = useMemo(() => entry ? buildPlanetSceneSpec(entry.opinion) : null, [entry]);

  useEffect(() => {
    if (!scene || typeof document === "undefined") return;
    let observedRoot: HTMLElement | null = null;
    let observer: MutationObserver | null = null;

    const apply = () => {
      const root = document.querySelector<HTMLElement>('[data-el="world-runtime"]');
      const world = root?.querySelector<HTMLElement>("[data-world-theme]") ?? null;
      if (!world) return false;
      world.dataset.biome = scene.biome;
      world.dataset.semanticGrammar = scene.semanticGrammar;
      observedRoot = world;
      return true;
    };

    if (!apply()) {
      const runtime = document.querySelector<HTMLElement>('[data-el="world-runtime"]');
      if (runtime) {
        observer = new MutationObserver(() => {
          if (apply()) observer?.disconnect();
        });
        observer.observe(runtime, { childList: true, subtree: true });
      }
    }

    return () => {
      observer?.disconnect();
      observedRoot?.removeAttribute("data-biome");
      observedRoot?.removeAttribute("data-semantic-grammar");
    };
  }, [scene]);

  return null;
}
