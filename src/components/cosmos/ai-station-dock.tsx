"use client";

import { useEffect, useState } from "react";
import { Orbit, RadioTower, Sparkles, X } from "lucide-react";
import styles from "./ai-station-dock.module.css";

type StationPayload = {
  id: string;
  title: string;
  summary?: string;
  reason?: string;
  conditions?: string[];
  derivedFrom?: string[];
  derivedSource?: "ai" | "fallback";
};

function tactile(pattern: number | number[] = 7) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
}

export function AiStationDock() {
  const [station, setStation] = useState<StationPayload | null>(null);
  const [locale] = useState<"zh-CN" | "en-US">(() => {
    if (typeof document === "undefined") return "zh-CN";
    return document.documentElement.lang.toLowerCase().startsWith("en") ? "en-US" : "zh-CN";
  });
  const zh = locale === "zh-CN";

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<StationPayload>).detail;
      if (!detail?.id) return;
      tactile([6, 28, 7]);
      setStation(detail);
      window.dispatchEvent(new CustomEvent("sfx", { detail: "sfx.station.open" }));
    };
    window.addEventListener("station:open", onOpen);
    return () => window.removeEventListener("station:open", onOpen);
  }, []);

  if (!station) return null;

  const close = () => {
    tactile(5);
    setStation(null);
  };
  const parentCount = station.derivedFrom?.length ?? 0;
  const synthesis = station.reason?.trim() || station.summary?.trim() || (zh
    ? "这个中转站保存的是 AI 对已知真人观点关系的整理与推演。"
    : "This station preserves AI synthesis over known human-opinion relations.");

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={zh ? "AI 认知中转站" : "AI cognition transit station"}>
      <div className={styles.space} aria-hidden>
        <span className={styles.orbitA} />
        <span className={styles.orbitB} />
        <span className={styles.core}><Sparkles size={22} /></span>
      </div>

      <section className={styles.dock}>
        <header className={styles.header}>
          <div className={styles.kicker}>
            <RadioTower size={14} aria-hidden />
            <span>{zh ? "AI 认知中转站" : "AI COGNITION TRANSIT STATION"}</span>
          </div>
          <button type="button" className={styles.close} onClick={close} aria-label={zh ? "返回主星系" : "Return to main galaxy"}>
            <X size={17} aria-hidden />
          </button>
        </header>

        <div className={styles.badge}>{zh ? "AI 推演 · 非知乎原文" : "AI-DERIVED · NOT ORIGINAL ZHIHU TEXT"}</div>
        <h2>{station.title}</h2>
        {station.summary ? <p className={styles.summary}>{station.summary}</p> : null}

        <div className={styles.section}>
          <span>{zh ? "当前综合信号" : "SYNTHESIZED SIGNAL"}</span>
          <p>{synthesis}</p>
        </div>

        <div className={styles.route}>
          <Orbit size={17} aria-hidden />
          <div>
            <strong>{zh ? `${parentCount} 条认知航线接入` : `${parentCount} cognition routes connected`}</strong>
            <small>
              {zh
                ? "中转站帮助你看见观点之间的关系，但它本身不是先人留下的观点星球。"
                : "The station helps expose relations between opinions, but it is not a human opinion planet."}
            </small>
          </div>
        </div>

        {station.conditions?.length ? (
          <div className={styles.conditions}>
            {station.conditions.slice(0, 3).map((condition) => <span key={condition}>{condition}</span>)}
          </div>
        ) : null}

        <footer>
          <button type="button" onClick={close}>{zh ? "返回主星系" : "Return to main galaxy"}</button>
          <span>{zh ? "这里没有“登陆星球”动作" : "There is no planet-landing action here"}</span>
        </footer>
      </section>
    </div>
  );
}
