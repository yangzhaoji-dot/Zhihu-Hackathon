"use client";

import { useEffect, useMemo, useState } from "react";
import { GuideAvatar } from "@/components/opinion-world/guide-avatar";
import { buildPlanetSceneSpec } from "@/lib/opinion/planet-scene-spec";
import { loadOpinionWorldEntry } from "@/lib/opinion/world-session";
import styles from "./planet-arrival-guide.module.css";

type Stage = "hidden" | "question" | "response" | "leaving";

function tactile(pattern: number | number[] = 7) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
}

export function PlanetArrivalGuide({ opinionId }: { opinionId: string }) {
  const [stage, setStage] = useState<Stage>("hidden");
  const [choice, setChoice] = useState<"observe" | "hypothesis" | null>(null);
  const [locale] = useState<"zh-CN" | "en-US">(() => {
    if (typeof document === "undefined") return "zh-CN";
    return document.documentElement.lang.toLowerCase().startsWith("en") ? "en-US" : "zh-CN";
  });
  const zh = locale === "zh-CN";

  const entry = useMemo(() => loadOpinionWorldEntry(opinionId), [opinionId]);
  const scene = useMemo(() => entry ? buildPlanetSceneSpec(entry.opinion) : null, [entry]);

  useEffect(() => {
    if (!scene || typeof window === "undefined") return;
    const key = `seeker:planet-arrival:${opinionId}`;
    if (window.sessionStorage.getItem(key) === "seen") return;
    const timer = window.setTimeout(() => {
      tactile(6);
      setStage("question");
      window.sessionStorage.setItem(key, "seen");
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [opinionId, scene]);

  if (!entry || !scene || stage === "hidden") return null;

  const respond = (nextChoice: "observe" | "hypothesis") => {
    tactile(8);
    setChoice(nextChoice);
    setStage("response");
    window.setTimeout(() => setStage("leaving"), 1450);
    window.setTimeout(() => setStage("hidden"), 1880);
  };

  const response = choice === "hypothesis"
    ? (zh
        ? "先把这个猜想留着。别急着把它当答案——去找一个能承载这段认知的东西，看看材料会不会支持你。"
        : "Keep that hypothesis for now. Do not turn it into an answer yet—find a carrier and see whether the surviving material supports it.")
    : (zh
        ? `好。先看环境，不看结论。远处的「${scene.signatureLandmark}」和附近不自然的结构，会告诉你第一步该往哪里走。`
        : `Good. Read the environment before the conclusion. The ${scene.signatureLandmark} and the structures that feel out of place will tell you where to begin.`);

  return (
    <aside className={styles.guide} data-stage={stage} aria-live="polite" data-el="planet-arrival-guide">
      <GuideAvatar accent={scene ? undefined : undefined} label={zh ? "刘看山" : "Liu Kanshan"} />
      <section className={styles.bubble}>
        <header>
          <span>{zh ? "刘看山" : "LIU KANSHAN"}</span>
          <small>{zh ? "登陆观察" : "ARRIVAL OBSERVATION"}</small>
        </header>
        {stage === "question" ? (
          <>
            <p>{scene.kanshanOpeningQuestion}</p>
            <div className={styles.actions}>
              <button type="button" onClick={() => respond("observe")}>
                {zh ? "先让我看看四周" : "Let me look around first"}
              </button>
              <button type="button" onClick={() => respond("hypothesis")}>
                {zh ? "我已经有一个猜想" : "I already have a hypothesis"}
              </button>
            </div>
          </>
        ) : (
          <p className={styles.response}>{response}</p>
        )}
      </section>
    </aside>
  );
}
