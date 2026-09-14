"use client";

import { useEffect, useState } from "react";
import { GuideAvatar } from "@/components/opinion-world/guide-avatar";
import styles from "./first-carrier-cue.module.css";

type CallingCarrierDetail = {
  opinionId?: string;
  carrier?: string;
};

function tactile(pattern: number | number[] = 6) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
}

export function FirstCarrierCue({ opinionId }: { opinionId: string }) {
  const [carrier, setCarrier] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [locale] = useState<"zh-CN" | "en-US">(() => {
    if (typeof document === "undefined") return "zh-CN";
    return document.documentElement.lang.toLowerCase().startsWith("en") ? "en-US" : "zh-CN";
  });
  const zh = locale === "zh-CN";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storageKey = `seeker:first-carrier:${opinionId}`;
    if (window.sessionStorage.getItem(storageKey) === "seen") return;

    let raf = 0;
    let hideTimer = 0;
    let clearTimer = 0;
    let pendingCarrier: string | null = null;
    const deadline = performance.now() + 45_000;

    const showWhenArrivalEnds = () => {
      if (!pendingCarrier || performance.now() > deadline) return;
      if (document.querySelector('[data-el="planet-arrival-guide"]')) {
        raf = window.requestAnimationFrame(showWhenArrivalEnds);
        return;
      }

      const nextCarrier = pendingCarrier;
      pendingCarrier = null;
      window.sessionStorage.setItem(storageKey, "seen");
      tactile(7);
      setCarrier(nextCarrier);
      hideTimer = window.setTimeout(() => setLeaving(true), 3000);
      clearTimer = window.setTimeout(() => setCarrier(null), 3420);
    };

    const onCalling = (event: Event) => {
      const detail = (event as CustomEvent<CallingCarrierDetail>).detail ?? {};
      if (detail.opinionId && detail.opinionId !== opinionId) return;
      if (!detail.carrier || window.sessionStorage.getItem(storageKey) === "seen") return;
      pendingCarrier = detail.carrier;
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(showWhenArrivalEnds);
    };

    window.addEventListener("carrier:calling", onCalling);
    return () => {
      window.removeEventListener("carrier:calling", onCalling);
      window.cancelAnimationFrame(raf);
      window.clearTimeout(hideTimer);
      window.clearTimeout(clearTimer);
    };
  }, [opinionId]);

  if (!carrier) return null;

  return (
    <aside className={styles.cue} data-leaving={leaving ? "true" : "false"} aria-live="polite">
      <GuideAvatar label={zh ? "刘看山" : "Liu Kanshan"} />
      <div className={styles.bubble}>
        <strong>{zh ? "刘看山" : "LIU KANSHAN"}</strong>
        <p>
          {zh
            ? `信号稳定了。「${carrier}」正在回应你。沿着较亮的那段路径靠近它，按 E 或直接轻触即可调查。`
            : `The signal is stable. The ${carrier} is answering you. Follow the brighter route, then press E nearby or tap it directly.`}
        </p>
      </div>
    </aside>
  );
}
