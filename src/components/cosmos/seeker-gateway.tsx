"use client";

import { useEffect, useState } from "react";
import { Compass, Radio, Sparkles } from "lucide-react";
import styles from "./seeker-gateway.module.css";

type GatewayStage = "dormant" | "scanning" | "ready";

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
      window.setTimeout(onEnter, 820);
    }, 920);
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
      <div className={styles.space} aria-hidden>
        <div className={styles.stars} />
        <div className={styles.signalRing} />
        <div className={styles.signalRing2} />
        <div className={styles.archiveCore}><span /></div>
      </div>

      <section className={styles.panel}>
        <div className={styles.eyebrow}>
          <Radio size={13} aria-hidden />
          <span>{zh ? "旧文明认知导航系统" : "LEGACY COGNITION NAVIGATION"}</span>
        </div>

        <h1>{zh ? "知乎宇宙" : "Zhihu Universe"}</h1>
        <p className={styles.lead}>
          {zh
            ? "地球消失之后，人类留下的观点成为了星辰。"
            : "After Earth disappeared, human opinions became stars."}
        </p>

        <div className={styles.identity} data-active={stage !== "dormant" ? "true" : "false"}>
          <Compass size={18} aria-hidden />
          <div>
            <small>{zh ? "身份" : "IDENTITY"}</small>
            <strong>{zh ? "寻知者" : "Seeker"}</strong>
          </div>
        </div>

        {stage === "dormant" ? (
          <button type="button" className={styles.primary} onClick={awaken}>
            <Sparkles size={16} aria-hidden />
            {zh ? "唤醒认知导航" : "Awaken cognition navigation"}
          </button>
        ) : stage === "scanning" ? (
          <div className={styles.scanning} role="status">
            <span />
            {zh ? "正在恢复知乎宇宙坐标……" : "Recovering Zhihu Universe coordinates…"}
          </div>
        ) : (
          <div className={styles.ready} role="status">
            <p>
              {zh
                ? "坐标恢复完成。知乎宇宙正在展开……"
                : "Coordinates restored. Zhihu Universe is unfolding…"}
            </p>
          </div>
        )}

        <footer>
          {zh
            ? "你的任务不是证明谁正确，而是让曾经存在过的思考不被遗忘。"
            : "Your task is not to prove who was right, but to keep human thought from disappearing."}
        </footer>
      </section>
    </main>
  );
}
