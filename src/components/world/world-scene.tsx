"use client";

import { Flag, Landmark, Lock, Rocket } from "lucide-react";
import Image from "next/image";
import type { CSSProperties, RefObject } from "react";
import type { WorldNpcView } from "@/lib/api/opinion";
import type { Poi, WorldConfig, Zone } from "@/lib/opinion/types";
import type { OpinionWorldTheme } from "@/lib/opinion/world-theme";
import { TILE_SIZE, type GridPos } from "@/lib/world/geometry";
import { isPoiRequirementMet, type WalkContext } from "@/lib/world/walkability";
import styles from "./world-scene.module.css";

// 灰盒渲染层（world-design-v0.2 §7.1 灰盒约定）：
// - Zone = 半透明色块（颜色从 world-theme 色板按 terrain 派生）+ label 动态渲染；
// - fog 区渲染为灰白叠加层（在其他区域之上、实体之下）；
// - NPC 有 sprite 显示立绘，空串画纯色圆块 + 名字；translucent 半透明显示；
// - 玩家与相机 transform 由页面 rAF 循环直接写 DOM（playerElRef / worldElRef）。

interface WorldSceneProps {
  config: WorldConfig;
  npcs: WorldNpcView[];
  theme: OpinionWorldTheme;
  locale: "zh-CN" | "en-US";
  walkCtx: WalkContext;
  worldElRef: RefObject<HTMLDivElement | null>;
  playerElRef: RefObject<HTMLDivElement | null>;
  highlightId: string | null;
  onTap: (pos: GridPos, npcId: string | null) => void;
}

function zoneBackground(terrain: Zone["terrain"], theme: OpinionWorldTheme): string {
  switch (terrain) {
    case "plaza": return `${theme.accent}24`;
    case "road": return `${theme.road}59`;
    case "bridge": return `${theme.road}8c`;
    case "station": return `${theme.accent}3d`;
    case "fog": return "rgba(225, 233, 231, 0.30)"; // 灰白叠加层
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
    default: return null; // fog Poi 不单独渲染（迷雾由 Zone 叠加层表达）
  }
}

export function WorldScene({
  config,
  npcs,
  theme,
  locale,
  walkCtx,
  worldElRef,
  playerElRef,
  highlightId,
  onTap,
}: WorldSceneProps) {
  const fogLifted = (zone: Zone) =>
    Boolean(zone.stateKey && walkCtx.worldState && walkCtx.worldState[zone.stateKey]);

  const groundZones = config.zones.filter((z) => z.terrain !== "fog");
  const fogZones = config.zones.filter((z) => z.terrain === "fog");

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const worldEl = worldElRef.current;
    if (!worldEl) return;
    const rect = worldEl.getBoundingClientRect();
    const pos = {
      x: (event.clientX - rect.left) / TILE_SIZE,
      y: (event.clientY - rect.top) / TILE_SIZE,
    };
    // 点按 NPC（≈自身 1 格内）直接对话，其余作为移动目的地。
    const npc = npcs.find(
      (n) => Math.hypot(pos.x - (n.pos.x + 0.5), pos.y - (n.pos.y + 0.5)) <= 1,
    );
    onTap(pos, npc?.id ?? null);
  };

  return (
    <div className={styles.viewport} aria-label="world scene">
      <div
        ref={worldElRef}
        className={styles.worldGrid}
        style={{
          width: config.size.w * TILE_SIZE,
          height: config.size.h * TILE_SIZE,
          backgroundSize: `${TILE_SIZE}px ${TILE_SIZE}px`,
        }}
        onClick={handleClick}
      >
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
              background: zoneBackground(zone.terrain, theme),
            }}
          >
            <span className={styles.zoneLabel}>{zone.label[locale] ?? zone.label["zh-CN"]}</span>
          </div>
        ))}

        {fogZones.map((zone) => (
          <div
            key={zone.id}
            className={`${styles.zone} ${styles.fog} ${fogLifted(zone) ? styles.fogLifted : ""}`}
            style={{
              left: zone.rect.x * TILE_SIZE,
              top: zone.rect.y * TILE_SIZE,
              width: zone.rect.w * TILE_SIZE,
              height: zone.rect.h * TILE_SIZE,
              background: zoneBackground("fog", theme),
            }}
          >
            <span className={styles.zoneLabel}>{zone.label[locale] ?? zone.label["zh-CN"]}</span>
          </div>
        ))}

        {config.pois.map((poi) => {
          if (poi.kind === "fog") return null;
          const locked =
            Boolean(poi.requires) && !isPoiRequirementMet(poi, walkCtx);
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

        {npcs.map((npc) => (
          <button
            key={npc.id}
            type="button"
            className={`${styles.npc} ${npc.translucent ? styles.translucent : ""} ${
              highlightId === npc.id ? styles.highlight : ""
            }`}
            style={{ left: npc.pos.x * TILE_SIZE, top: npc.pos.y * TILE_SIZE }}
            onClick={(event) => {
              event.stopPropagation();
              onTap({ x: npc.pos.x + 0.5, y: npc.pos.y + 0.5 }, npc.id);
            }}
            aria-label={npc.role}
          >
            {npc.sprite ? (
              <Image
                className={styles.npcSprite}
                src={npc.sprite}
                alt=""
                width={64}
                height={96}
                sizes="64px"
              />
            ) : (
              <span
                className={styles.npcBlob}
                style={{ "--blob-color": theme.accent } as CSSProperties}
                aria-hidden
              >
                {npc.role.slice(0, 1)}
              </span>
            )}
            <span className={styles.npcName}>{npc.role}</span>
          </button>
        ))}

        <div ref={playerElRef} className={styles.player} aria-hidden>
          <Image
            src="/worlds/crossroads/player-explorer-v1.png"
            alt=""
            width={46}
            height={69}
            sizes="46px"
            priority
          />
        </div>
      </div>
    </div>
  );
}
