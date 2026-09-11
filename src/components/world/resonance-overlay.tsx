"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { ResonanceChapter } from "@/lib/world/resonance";
import styles from "./resonance-overlay.module.css";

type ResonanceStage = "scroll" | "mantra" | "dissolve" | "world";

interface ResonanceOverlayProps {
  title: string;
  chapters: ResonanceChapter[];
  mantra: string;
  scrollLabel: string;
  unresolvedLabel: string;
  onTransform: () => void;
  onComplete: () => void;
}

const PARTICLES = Array.from({ length: 18 }, (_, index) => ({
  x: ((index * 37) % 83) - 41,
  y: ((index * 53) % 71) - 35,
  delay: (index % 6) * 70,
}));

export function ResonanceOverlay({
  title,
  chapters,
  mantra,
  scrollLabel,
  unresolvedLabel,
  onTransform,
  onComplete,
}: ResonanceOverlayProps) {
  const [stage, setStage] = useState<ResonanceStage>("scroll");
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    const timings = reducedMotion
      ? { scroll: 900, mantra: 1100, dissolve: 550, world: 850 }
      : { scroll: 4100, mantra: 2500, dissolve: 1250, world: 1900 };
    const timers: number[] = [];
    timers.push(window.setTimeout(() => setStage("mantra"), timings.scroll));
    timers.push(window.setTimeout(() => setStage("dissolve"), timings.scroll + timings.mantra));
    timers.push(
      window.setTimeout(() => {
        setStage("world");
        onTransform();
      }, timings.scroll + timings.mantra + timings.dissolve),
    );
    timers.push(
      window.setTimeout(
        onComplete,
        timings.scroll + timings.mantra + timings.dissolve + timings.world,
      ),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [onComplete, onTransform, reducedMotion]);

  const particleStyles = useMemo(
    () =>
      PARTICLES.map((particle) => ({
        "--particle-x": `${particle.x}vw`,
        "--particle-y": `${particle.y}vh`,
        "--particle-delay": `${particle.delay}ms`,
      }) as CSSProperties),
    [],
  );

  return (
    <div
      className={styles.overlay}
      data-stage={stage}
      role="dialog"
      aria-modal="true"
      aria-label={scrollLabel}
      data-el="resonance-overlay"
    >
      <div className={styles.veil} aria-hidden />

      <section className={styles.scroll} aria-hidden={stage !== "scroll"}>
        <div className={styles.scrollHeader}>
          <span>{scrollLabel}</span>
          <h2>{title}</h2>
        </div>
        <div className={styles.inkLine} aria-hidden />
        <div className={styles.chapters}>
          {chapters.map((chapter, index) => (
            <article
              key={chapter.id}
              className={`${styles.chapter} ${chapter.unresolved ? styles.unresolved : ""}`}
              style={{ "--chapter-index": index } as CSSProperties}
            >
              <span className={styles.kicker}>{chapter.kicker}</span>
              <h3>{chapter.title}</h3>
              <p>{chapter.body}</p>
              {chapter.unresolved && <small>{unresolvedLabel}</small>}
            </article>
          ))}
        </div>
      </section>

      <div className={styles.mantraWrap} aria-live="polite">
        <p className={styles.mantra}>{mantra}</p>
        <div className={styles.particles} aria-hidden>
          {particleStyles.map((style, index) => (
            <span key={index} style={style} />
          ))}
        </div>
      </div>
    </div>
  );
}
