"use client";

import { useEffect, useState } from "react";
import { Compass, Sparkles } from "lucide-react";
import styles from "./seeker-gateway.module.css";

type GatewayStage = "dormant" | "scanning" | "ready";

const ORBIT_SYSTEMS = [
  { x: "21%", y: "24%", size: 8, delay: "-1.2s" },
  { x: "77%", y: "18%", size: 11, delay: "-3.1s" },
  { x: "84%", y: "61%", size: 7, delay: "-2.2s" },
  { x: "25%", y: "72%", size: 10, delay: "-4.4s" },
  { x: "67%", y: "78%", size: 6, delay: "-5.1s" },
] as const;

function tactile(pattern: number | number[] = 8) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
}

export function SeekerGateway({ onEnter }: { onEnter: () => void }) {
  const [stage, setStage] = useState<GatewayStage>("dormant");
  const [locale] = useState<"zh-CN" | "en-US">(() => {
    if (typeof document === "undefined") return "zh-CN";
    return document.documentElement.lang.toLowerCase().startsWith("en") ? "en-US" : "zh-CN";
  });
  const zh = locale === "zh-CN";

  const awaken = () => {
    if (stage !== "dormant") return;
    tactile(10);
    setStage("scanning");
    window.setTimeout(() => {
      tactile([8, 36, 12]);
      setStage("ready");
      window.setTimeout(onEnter, 1050);
    }, 1050);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.key === "Enter" || event.key === " ") && stage === "dormant") {
        event.preventDefault();
        awaken();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <main className={styles.gateway} data-stage={stage} data-el="seeker-gateway">
      <div className={styles.deepSpace} aria-hidden>
        <div className={styles.starFieldA} />
        <div className={styles.starFieldB} />
        <div className={styles.nebula} />
        <div className={styles.archiveHalo} />
        <div className={styles.archiveHalo2} />
        <div className={styles.archiveHalo3} />
        <div className={styles.archiveCore}>
          <i />
          <b />
          <em />
        </div>
        {ORBIT_SYSTEMS.map((system, index) => (
          <div
            key={index}
            className={styles.distantSystem}
            style={{
              left: system.x,
              top: system.y,
              width: system.size,
              height: system.size,
              "--delay": system.delay,
            } as React.CSSProperties}
          />
        ))}
        <div className={styles.archiveDust} />
      </div>

      <div className={styles.topline}>
        <span>{zh ? "人类认知档案 · 失落纪元之后" : "HUMAN COGNITION ARCHIVE · AFTER THE LOST ERA"}</span>
        <span>{zh ? "坐标 00 · 未展开" : "COORDINATE 00 · DORMANT"}</span>
      </div>

      <section className={styles.copy}>
        <div className={styles.identity} data-active={stage !== "dormant" ? "true" : "false"}>
          <Compass size={14} aria-hidden />
          <span>{zh ? "寻知者" : "SEEKER"}</span>
        </div>

        <p className={styles.kicker}>{zh ? "问题成为星系，观点成为星球。" : "Questions became galaxies. Opinions became planets."}</p>
        <h1>{zh ? "知乎宇宙" : "Zhihu Universe"}</h1>
        <p className={styles.lead}>
          {zh
            ? "地球消失之后，人类留下的问题、观点与争论被保存成一片仍可航行的认知宇宙。"
            : "After Earth disappeared, human questions, opinions and debates survived as a navigable cognition universe."}
        </p>

        <div className={styles.actionRow}>
          {stage === "dormant" ? (
            <button type="button" className={styles.primary} onClick={awaken}>
              <Sparkles size={15} aria-hidden />
              {zh ? "进入宇宙" : "Enter the universe"}
            </button>
          ) : stage === "scanning" ? (
            <div className={styles.scanning} role="status">
              <span />
              {zh ? "正在恢复问题星系坐标……" : "Recovering question-galaxy coordinates…"}
            </div>
          ) : (
            <div className={styles.ready} role="status">
              {zh ? "坐标恢复完成。开始航行。" : "Coordinates restored. Navigation begins."}
            </div>
          )}
        </div>
      </section>

      <footer className={styles.mission}>
        <span>{zh ? "任务" : "MISSION"}</span>
        <p>
          {zh
            ? "不是证明谁正确，而是让曾经存在过的思考不被遗忘。"
            : "Not to prove who was right, but to keep human thought from disappearing."}
        </p>
      </footer>
    </main>
  );
}
