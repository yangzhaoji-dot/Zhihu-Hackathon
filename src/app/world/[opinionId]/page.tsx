"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowLeft, ExternalLink, Rocket } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { GuideAvatar } from "@/components/opinion-world/guide-avatar";
import { fetchSourceTrace } from "@/lib/api/opinion";
import { getOpinionWorldTheme } from "@/lib/opinion/world-theme";
import { loadOpinionWorldEntry, type OpinionWorldEntry } from "@/lib/opinion/world-session";
import styles from "./page.module.css";

type HotspotKind = "guide" | "archive" | "barren" | "crossroads" | "rocket";

interface Hotspot {
  id: HotspotKind;
  x: number;
  y: number;
}

const HOTSPOTS: Hotspot[] = [
  { id: "guide", x: 26, y: 68 },
  { id: "archive", x: 36, y: 30 },
  { id: "barren", x: 73, y: 25 },
  { id: "crossroads", x: 67, y: 70 },
  { id: "rocket", x: 12, y: 82 },
];

const ENTITY_ASSETS: Partial<Record<HotspotKind, string>> = {
  guide: "/worlds/crossroads/guide-fox-v1.png",
  archive: "/worlds/crossroads/npc-archivist-v1.png",
  barren: "/worlds/crossroads/npc-field-observer-v1.png",
  crossroads: "/worlds/crossroads/npc-crossroads-traveler-v1.png",
};

const STEP = 4;

export default function OpinionWorldPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ opinionId: string }>();
  const opinionId = decodeURIComponent(params.opinionId);
  const [entry, setEntry] = useState<OpinionWorldEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [player, setPlayer] = useState({ x: 19, y: 76 });
  const [active, setActive] = useState<HotspotKind>("guide");

  useEffect(() => {
    let alive = true;
    const hydrate = async () => {
      await Promise.resolve();
      const cached = loadOpinionWorldEntry(opinionId);
      if (cached) {
        if (alive) {
          setEntry(cached);
          setLoading(false);
        }
        return;
      }
      try {
        const trace = await fetchSourceTrace(opinionId);
        if (alive) setEntry({ ...trace, questionTitle: trace.opinion.questionId });
      } catch {
        // The not-found state below offers a route back to the universe.
      } finally {
        if (alive) setLoading(false);
      }
    };
    void hydrate();
    return () => { alive = false; };
  }, [opinionId]);

  const theme = useMemo(
    () => entry ? getOpinionWorldTheme(entry.opinion) : null,
    [entry],
  );

  const nearest = useMemo(() => HOTSPOTS.reduce((best, hotspot) => {
    const distance = Math.hypot(player.x - hotspot.x, player.y - hotspot.y);
    return distance < best.distance ? { hotspot, distance } : best;
  }, { hotspot: HOTSPOTS[0], distance: Number.POSITIVE_INFINITY }), [player]);

  const move = useCallback((dx: number, dy: number) => {
    setPlayer((current) => ({
      x: Math.max(7, Math.min(93, current.x + dx)),
      y: Math.max(9, Math.min(88, current.y + dy)),
    }));
  }, []);

  const interact = useCallback(() => {
    if (nearest.distance <= 14) setActive(nearest.hotspot.id);
  }, [nearest]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "e", " "].includes(event.key)) {
        event.preventDefault();
      }
      if (event.key === "ArrowUp" || event.key === "w") move(0, -STEP);
      if (event.key === "ArrowDown" || event.key === "s") move(0, STEP);
      if (event.key === "ArrowLeft" || event.key === "a") move(-STEP, 0);
      if (event.key === "ArrowRight" || event.key === "d") move(STEP, 0);
      if (event.key === "e" || event.key === " ") interact();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [interact, move]);

  if (loading) {
    return <main className={styles.loading}>{t("world.loading")}</main>;
  }

  if (!entry || !theme) {
    return (
      <main className={styles.loading}>
        <p>{t("world.notFound")}</p>
        <button type="button" onClick={() => router.push("/")}>{t("cosmos.returnUniverse")}</button>
      </main>
    );
  }

  const source = entry.sources[0];
  const condition = entry.opinion.conditions?.[0];
  const worldStyle = {
    "--world-sky": theme.sky,
    "--world-ground": theme.ground,
    "--world-road": theme.road,
    "--world-accent": theme.accent,
    "--world-mist": theme.mist,
  } as CSSProperties;

  const dialogue: Record<HotspotKind, string> = {
    guide: t("world.dialogue.guide", { title: entry.opinion.title }),
    archive: source
      ? t("world.dialogue.archive", { count: entry.sources.length })
      : t("world.dialogue.archiveEmpty"),
    barren: t("world.dialogue.barren", { count: entry.sources.length }),
    crossroads: condition
      ? t("world.dialogue.crossroadsCondition", { condition })
      : t("world.dialogue.crossroads", { reason: entry.opinion.reason || entry.opinion.summary }),
    rocket: t("world.dialogue.rocket"),
  };

  return (
    <main className={styles.world} style={worldStyle} data-theme={theme.id}>
      <header className={styles.header}>
        <button type="button" onClick={() => router.push("/")}>
          <ArrowLeft size={16} aria-hidden />
          {t("cosmos.returnUniverse")}
        </button>
        <div>
          <span>{t(`world.themes.${theme.id}.name`)}</span>
          <h1>{entry.opinion.title}</h1>
        </div>
        <small>{t(`world.themes.${theme.id}.hint`)}</small>
      </header>

      <section className={styles.map} aria-label={t("world.mapLabel")}>
        <div className={styles.horizon} aria-hidden />
        <div className={styles.ground} aria-hidden>
          <span className={styles.roadOne} />
          <span className={styles.roadTwo} />
          <span className={styles.roadThree} />
        </div>

        {HOTSPOTS.map((hotspot) => {
          const entityAsset = ENTITY_ASSETS[hotspot.id];
          return (
            <button
              key={hotspot.id}
              type="button"
              className={`${styles.landmark} ${styles[hotspot.id]} ${active === hotspot.id ? styles.active : ""}`}
              style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
              onClick={() => setActive(hotspot.id)}
              aria-label={t(`world.hotspots.${hotspot.id}`)}
            >
              {entityAsset ? (
                <Image
                  className={styles.entity}
                  src={entityAsset}
                  alt=""
                  width={92}
                  height={138}
                  sizes="92px"
                />
              ) : (
                <span className={styles.structure} aria-hidden />
              )}
              <b>{t(`world.hotspots.${hotspot.id}`)}</b>
            </button>
          );
        })}

        <div className={styles.player} style={{ left: `${player.x}%`, top: `${player.y}%` }} aria-label={t("world.playerLabel")}>
          <Image src="/worlds/crossroads/player-explorer-v1.png" alt="" width={46} height={69} sizes="46px" priority />
        </div>

        {nearest.distance <= 14 && (
          <button type="button" className={styles.interact} onClick={interact}>
            {t("world.interact", { place: t(`world.hotspots.${nearest.hotspot.id}`) })}
          </button>
        )}
      </section>

      <aside className={styles.dialogue} data-el="world-guide-dialogue">
        <GuideAvatar accent={theme.accent} label={t("world.guideAvatarLabel")} />
        <div>
          <span>{t("world.guideName")} · {t("world.guidePlaceholder")}</span>
          <p>{dialogue[active]}</p>
          {active === "archive" && source && (
            <a href={source.url} target="_blank" rel="noreferrer">
              {t("world.openSource")}
              <ExternalLink size={14} aria-hidden />
            </a>
          )}
          {active === "rocket" && (
            <button type="button" onClick={() => router.push("/")}>
              <Rocket size={14} aria-hidden />
              {t("world.leavePlanet")}
            </button>
          )}
        </div>
      </aside>

      <nav className={styles.controls} aria-label={t("world.controlsLabel")}>
        <button type="button" onClick={() => move(0, -STEP)} aria-label={t("world.moveUp")}>↑</button>
        <button type="button" onClick={() => move(-STEP, 0)} aria-label={t("world.moveLeft")}>←</button>
        <button type="button" onClick={interact} aria-label={t("world.interactButton")}>E</button>
        <button type="button" onClick={() => move(STEP, 0)} aria-label={t("world.moveRight")}>→</button>
        <button type="button" onClick={() => move(0, STEP)} aria-label={t("world.moveDown")}>↓</button>
      </nav>
    </main>
  );
}
