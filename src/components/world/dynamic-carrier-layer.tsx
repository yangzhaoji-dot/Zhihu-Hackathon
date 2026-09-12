"use client";

import { createPortal } from "react-dom";
import type { RefObject } from "react";
import type { CognitionFragmentSpec } from "@/lib/world/cognition-fragment-plan";
import { cognitionFragmentKey } from "@/lib/world/cognition-fragment-plan";
import { TILE_SIZE, type GridPos } from "@/lib/world/geometry";
import styles from "./dynamic-carrier-layer.module.css";

export interface DynamicCarrierSite {
  id: string;
  pos: GridPos;
  fragment: CognitionFragmentSpec;
}

export function DynamicCarrierLayer({
  worldElRef,
  sites,
  opinionId,
  worldState,
  accent,
  onTap,
}: {
  worldElRef: RefObject<HTMLDivElement | null>;
  sites: readonly DynamicCarrierSite[];
  opinionId: string;
  worldState: Record<string, unknown>;
  accent: string;
  onTap: (site: DynamicCarrierSite) => void;
}) {
  const worldEl = worldElRef.current;
  if (!worldEl || sites.length === 0) return null;

  return createPortal(
    <>
      {sites.map((site) => {
        const collected = Boolean(worldState[cognitionFragmentKey(opinionId, site.fragment.id)]);
        return (
          <button
            key={site.id}
            type="button"
            className={styles.carrier}
            data-role={site.fragment.role}
            data-mode={site.fragment.mode}
            data-collected={collected ? "true" : "false"}
            style={{
              left: site.pos.x * TILE_SIZE,
              top: site.pos.y * TILE_SIZE,
              "--carrier-accent": accent,
            } as React.CSSProperties}
            onClick={(event) => {
              event.stopPropagation();
              onTap(site);
            }}
            aria-label={site.fragment.carrier}
          >
            <span className={styles.object} aria-hidden>
              <i />
              <b />
              <em />
            </span>
            <span className={styles.label}>{site.fragment.carrier}</span>
          </button>
        );
      })}
    </>,
    worldEl,
  );
}
