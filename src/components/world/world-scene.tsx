"use client";

import { Flag, Landmark, Lock, Rocket } from "lucide-react";
import Image from "next/image";
import type { CSSProperties, RefObject } from "react";
import type { WorldNpcView } from "@/lib/api/opinion";
import type { Poi, WorldConfig, Zone } from "@/lib/opinion/types";
import {
  getOpinionWorldTheme,
  type OpinionWorldId,
  type OpinionWorldTheme,
} from "@/lib/opinion/world-theme";
import { TILE_SIZE, type GridPos } from "@/lib/world/geometry";
import { isPoiRequirementMet, type WalkContext } from "@/lib/world/walkability";
import fragmentStyles from "./fragment-state.module.css";
import grammarStyles from "./world-grammar.module.css";
import artifactStyles from "./planet-artifacts.module.css";
import resonanceStyles from "./world-resonance.module.css";
import styles from "./world-scene.module.css";

interface WorldSceneProps {
  config: WorldConfig;
  npcs: WorldNpcView[];
  theme: OpinionWorldTheme;
  locale: "zh-CN" | "en-US";
  walkCtx: WalkContext;
  runtimeFogs?: { id: string; pos: GridPos }[];
  resonant?: boolean;
  worldElRef: RefObject<HTMLDivElement | null>;
  playerElRef: RefObject<HTMLDivElement | null>;
  highlightId: string | null;
  onTap: (pos: GridPos, npcId: string | null) => void;
}

type EnvironmentObjectKind =
  | "resignation-box"
  | "ledger-desk"
  | "workbench"
  | "ticket-machine"
  | "archive-cabinet"
  | "quiet-bench"
  | "departure-board"
  | "threshold-gate"
  | "title-stone"
  | "index-desk"
  | "spotlight-marker"
  | "statement-seat"
  | "evidence-plinth"
  | "echo-stone"
  | "condition-spring"
  | "trace-tree"
  | "core-terminal"
  | "control-console"
  | "data-vault";

type FragmentKind = "claim" | "reason" | "evidence";

const ENVIRONMENT_OBJECTS: Record<string, EnvironmentObjectKind> = {
  npc_stoploss: "resignation-box",
  npc_cashflow: "ledger-desk",
  npc_inwork: "workbench",
  npc_transform: "ticket-machine",
  npc_legal: "archive-cabinet",
  npc_inner: "quiet-bench",
  npc_window: "departure-board",
  npc_threshold: "threshold-gate",
};

const FRAGMENT_OBJECTS: Record<OpinionWorldId, Record<FragmentKind, EnvironmentObjectKind>> = {
  crossroads: {
    claim: "threshold-gate",
    reason: "workbench",
    evidence: "archive-cabinet",
  },
  archive: {
    claim: "title-stone",
    reason: "index-desk",
    evidence: "archive-cabinet",
  },
  theater: {
    claim: "spotlight-marker",
    reason: "statement-seat",
    evidence: "evidence-plinth",
  },
  forest: {
    claim: "echo-stone",
    reason: "condition-spring",
    evidence: "trace-tree",
  },
  machine: {
    claim: "core-terminal",
    reason: "control-console",
    evidence: "data-vault",
  },
};

function fragmentKindFromId(id: string): FragmentKind | null {
  if (id.startsWith("fragment_claim_")) return "claim";
  if (id.startsWith("fragment_reason_")) return "reason";
  if (id.startsWith("fragment_evidence_")) return "evidence";
  return null;
}

function environmentObjectKind(
  config: WorldConfig,
  npc: WorldNpcView,
  themeId: OpinionWorldId,
): EnvironmentObjectKind | null {
  if (config.tileset !== "diorama-v1") return null;
  if (!npc.role.startsWith("看山 ·")) return null;
  const fragmentKind = fragmentKindFromId(npc.id);
  if (fragmentKind) return FRAGMENT_OBJECTS[themeId][fragmentKind];
  return ENVIRONMENT_OBJECTS[npc.id] ?? null;
}

function environmentObjectLabel(role: string) {
  return role.replace(/^看山\s*·\s*/, "");
}

function zoneBackground(terrain: Zone["terrain"], theme: OpinionWorldTheme): string {
  switch (terrain) {
    case "plaza": return `${theme.accent}24`;
    case "road": return `${theme.road}59`;
    case "bridge": return `${theme.road}8c`;
    case "station": return `${theme.accent}3d`;
    case "fog": return `${theme.mist}4d`;
    case "ruin": return "rgba(8, 10, 13, 0.45)";
    case "monument": return `${theme.accent}52`;
  }
}

function PoiGlyph({ poi, locked }: { poi: Poi; locked: boolean }) {
  switch (poi.kind) {
    case "rocket": return <Rocket size={26} aria-hidden />;
    case "monument": return <Landmark size={24} aria-hidden />;
    case "observatory": return <Flag size={22} aria-hidden />;
    case "bridge":
    case "gate":
      return locked ? <Lock size={18} aria-hidden /> : <span className={styles.bridgeDeck} aria-hidden />;
    case "chest": return <span className={styles.chest} aria-hidden />;
    default: return null;
  }
}

function EnvironmentObject({ kind, collected }: { kind: EnvironmentObjectKind; collected: boolean }) {
  return (
    <span
      className={`${styles.environmentArtifact} ${artifactStyles.artifact} ${collected ? fragmentStyles.artifact : ""}`}
      data-kind={kind}
      aria-hidden
    >
      <span className={styles.artifactTop} data-artifact-part="top" />
      <span className={styles.artifactBody} data-artifact-part="body" />
      <span className={styles.artifactDetail} data-artifact-part="detail" />
    </span>
  );
}

function ExplorationRoutes({
  config,
  npcs,
}: {
  config: WorldConfig;
  npcs: WorldNpcView[];
}) {
  const fragmentSites = npcs
    .map((npc) => ({ npc, kind: fragmentKindFromId(npc.id) }))
    .filter((item): item is { npc: WorldNpcView; kind: FragmentKind } => Boolean(item.kind));
  if (!fragmentSites.length) return null;

  const center = {
    x: (config.spawn.x + 0.5) * TILE_SIZE,
    y: (config.spawn.y + 0.5) * TILE_SIZE,
  };
  const rocket = config.pois.find((poi) => poi.kind === "rocket");
  const width = config.size.w * TILE_SIZE;
  const height = config.size.h * TILE_SIZE;

  return (
    <svg
      className={grammarStyles.routeVeins}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden
    >
      {fragmentSites.map(({ npc, kind }, index) => {
        const endX = (npc.pos.x + 0.5) * TILE_SIZE;
        const endY = (npc.pos.y + 0.5) * TILE_SIZE;
        const bend = index === 0 ? -58 : index === 1 ? 72 : 46;
        const midX = (center.x + endX) / 2 + bend;
        const midY = (center.y + endY) / 2 - bend * 0.28;
        return (
          <path
            key={npc.id}
            data-route-kind={kind}
            d={`M ${center.x} ${center.y} Q ${midX} ${midY} ${endX} ${endY}`}
          />
        );
      })}
      {rocket ? (
        <path
          data-route-kind="return"
          d={`M ${center.x} ${center.y} Q ${(center.x + (rocket.pos.x + 0.5) * TILE_SIZE) / 2} ${center.y + 180} ${(rocket.pos.x + 0.5) * TILE_SIZE} ${(rocket.pos.y + 0.5) * TILE_SIZE}`}
        />
      ) : null}
    </svg>
  );
}

export function WorldScene({
  config,
  npcs,
  theme,
  locale,
  walkCtx,
  runtimeFogs,
  resonant = false,
  worldElRef,
  playerElRef,
  highlightId,
  onTap,
}: WorldSceneProps) {
  const activeTheme = npcs[0]?.opinion ? getOpinionWorldTheme(npcs[0].opinion) : theme;
  const planetMode = npcs.some((npc) => npc.id.startsWith("fragment_"));
  const fogLifted = (zone: Zone) =>
    Boolean(zone.stateKey && walkCtx.worldState && walkCtx.worldState[zone.stateKey]);
  const ruinMarked = (zone: Zone) =>
    Boolean(walkCtx.worldState && walkCtx.worldState[`ruin:${zone.id}`]);

  const groundZones = config.zones.filter((zone) => zone.terrain !== "fog");
  const fogZones = config.zones.filter((zone) => zone.terrain === "fog");

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const worldEl = worldElRef.current;
    if (!worldEl) return;
    const rect = worldEl.getBoundingClientRect();
    const pos = {
      x: (event.clientX - rect.left) / TILE_SIZE,
      y: (event.clientY - rect.top) / TILE_SIZE,
    };
    const npc = npcs.find(
      (candidate) => Math.hypot(pos.x - (candidate.pos.x + 0.5), pos.y - (candidate.pos.y + 0.5)) <= 1,
    );
    onTap(pos, npc?.id ?? null);
  };

  const worldStyle = {
    width: config.size.w * TILE_SIZE,
    height: config.size.h * TILE_SIZE,
    backgroundSize: `${TILE_SIZE}px ${TILE_SIZE}px`,
    "--world-sky": activeTheme.sky,
    "--world-ground": activeTheme.ground,
    "--world-road": activeTheme.road,
    "--world-accent": activeTheme.accent,
    "--world-mist": activeTheme.mist,
  } as CSSProperties;

  return (
    <div className={styles.viewport} aria-label="world scene">
      <div
        ref={worldElRef}
        className={`${styles.worldGrid} ${grammarStyles.grammar} ${resonant ? resonanceStyles.resonant : ""}`}
        data-tileset={config.tileset}
        data-world-theme={activeTheme.id}
        data-scene-motif={activeTheme.surface.motif}
        data-scene-density={activeTheme.surface.density}
        data-scene-fog={activeTheme.surface.fog}
        data-resonance-type={activeTheme.resonance}
        data-resonant={resonant ? "true" : "false"}
        style={worldStyle}
        onClick={handleClick}
      >
        {planetMode && (
          <>
            <div className={grammarStyles.scenicBackdrop} aria-hidden />
            <ExplorationRoutes config={config} npcs={npcs} />
            <div className={grammarStyles.scenicAtmosphere} aria-hidden />
            <div className={grammarStyles.scenicForeground} aria-hidden />
          </>
        )}

        {groundZones.map((zone) => (
          <div
            key={zone.id}
            className={styles.zone}
            data-terrain={zone.terrain}
            style={{
              left: zone.rect.x * TILE_SIZE,
              top: zone.rect.y * TILE_SIZE,
              width: zone.rect.w * TILE_SIZE,
              height: zone.rect.h * TILE_SIZE,
              background: zoneBackground(zone.terrain, activeTheme),
            }}
          >
            <span className={styles.zoneLabel}>{zone.label[locale] ?? zone.label["zh-CN"]}</span>
            {ruinMarked(zone) && <span className={styles.ruinMark} aria-hidden />}
          </div>
        ))}

        {(runtimeFogs ?? []).map((fog) => (
          <div
            key={fog.id}
            className={`${styles.zone} ${styles.fog} ${styles.runtimeFog}`}
            data-terrain="fog"
            style={{
              left: (fog.pos.x - 1.5) * TILE_SIZE,
              top: (fog.pos.y - 0.5) * TILE_SIZE,
              width: 4 * TILE_SIZE,
              height: 2 * TILE_SIZE,
              background: zoneBackground("fog", activeTheme),
            }}
            aria-hidden
          />
        ))}

        {fogZones.map((zone) => (
          <div
            key={zone.id}
            className={`${styles.zone} ${styles.fog} ${fogLifted(zone) ? styles.fogLifted : ""}`}
            data-terrain="fog"
            style={{
              left: zone.rect.x * TILE_SIZE,
              top: zone.rect.y * TILE_SIZE,
              width: zone.rect.w * TILE_SIZE,
              height: zone.rect.h * TILE_SIZE,
              background: zoneBackground("fog", activeTheme),
            }}
          >
            <span className={styles.zoneLabel}>{zone.label[locale] ?? zone.label["zh-CN"]}</span>
          </div>
        ))}

        {config.pois.map((poi) => {
          if (poi.kind === "fog") return null;
          const locked = Boolean(poi.requires) && !isPoiRequirementMet(poi, walkCtx);
          return (
            <div
              key={poi.id}
              className={`${styles.poi} ${styles[`poi_${poi.kind}`] ?? ""} ${locked ? styles.poiLocked : ""} ${
                highlightId === poi.id ? styles.highlight : ""
              }`}
              style={{ left: poi.pos.x * TILE_SIZE, top: poi.pos.y * TILE_SIZE }}
              title={poi.label?.[locale] ?? poi.label?.["zh-CN"]}
            >
              <PoiGlyph poi={poi} locked={locked} />
            </div>
          );
        })}

        {npcs.map((npc) => {
          const objectKind = environmentObjectKind(config, npc, activeTheme.id);
          const fragmentKind = fragmentKindFromId(npc.id);
          const collected = Boolean(
            fragmentKind && walkCtx.worldState?.[`fragment:${npc.opinion.id}:${fragmentKind}`],
          );
          return (
            <button
              key={npc.id}
              type="button"
              className={`${styles.npc} ${objectKind ? styles.environmentObject : ""} ${
                npc.translucent ? styles.translucent : ""
              } ${collected ? fragmentStyles.collected : ""} ${highlightId === npc.id ? styles.highlight : ""}`}
              data-object-kind={objectKind ?? undefined}
              data-planet-object={objectKind ? undefined : "true"}
              data-fragment-kind={fragmentKind ?? undefined}
              data-fragment-collected={collected ? "true" : "false"}
              style={{ left: npc.pos.x * TILE_SIZE, top: npc.pos.y * TILE_SIZE }}
              onClick={(event) => {
                event.stopPropagation();
                onTap({ x: npc.pos.x + 0.5, y: npc.pos.y + 0.5 }, npc.id);
              }}
              aria-label={npc.role}
            >
              {objectKind ? (
                <EnvironmentObject kind={objectKind} collected={collected} />
              ) : npc.sprite ? (
                <Image className={styles.npcSprite} src={npc.sprite} alt="" width={64} height={96} sizes="64px" />
              ) : (
                <span
                  className={styles.npcBlob}
                  style={{ "--blob-color": activeTheme.accent } as CSSProperties}
                  aria-hidden
                >
                  {npc.role.slice(0, 1)}
                </span>
              )}
              {collected && <span className={fragmentStyles.mark} aria-hidden>✓</span>}
              <span className={styles.npcName}>{objectKind ? environmentObjectLabel(npc.role) : npc.role}</span>
            </button>
          );
        })}

        <div ref={playerElRef} className={styles.player} aria-hidden>
          <Image src="/worlds/crossroads/player-explorer-v1.png" alt="" width={46} height={69} sizes="46px" priority />
          {planetMode && (
            <Image
              src="/worlds/crossroads/guide-fox-v1.png"
              alt=""
              width={34}
              height={51}
              sizes="34px"
              style={{
                position: "absolute",
                left: 34,
                top: -4,
                width: 34,
                height: 51,
                margin: 0,
                opacity: 0.9,
                objectFit: "contain",
                filter: `drop-shadow(0 0 8px ${activeTheme.accent}55) drop-shadow(4px 6px 5px rgba(0,0,0,.36))`,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
