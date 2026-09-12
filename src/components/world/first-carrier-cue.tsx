"use client";

import { useEffect, useState } from "react";
import { GuideAvatar } from "@/components/opinion-world/guide-avatar";
import styles from "./first-carrier-cue.module.css";

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
    let deadline = performance.now() + 45_000;
    const scan = () => {
      if (performance.now() > deadline) return;
      const root = document.querySelector<HTMLElement>('[data-el="world-runtime"]');
      const action = root
        ? Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find((button) => {
            const text = button.textContent?.trim() ?? "";
            return text.startsWith("E ·") && (text.includes("调查") || text.includes("Investigate"));
          })
        : null;

      if (!action) {
        raf = window.requestAnimationFrame(scan);
        return;
      }

      const text = action.textContent?.trim() ?? "";
      const name = text.split("·").at(-1)?.trim() || (zh ? "认知载体" : "cognition carrier");
      window.sessionStorage.setItem(storageKey, "seen");
      tactile(7);
      setCarrier(name);
      window.setTimeout(() => setLeaving(true), 3000);
      window.setTimeout(() => setCarrier(null), 3420);
    };

    raf = window.requestAnimationFrame(scan);
    return () => window.cancelAnimationFrame(raf);
  }, [opinionId, zh]);

  if (!carrier) return null;

  return (
    <aside className={styles.cue} data-leaving={leaving ? "true" : "false"} aria-live="polite">
      <GuideAvatar label={zh ? "刘看山" : "Liu Kanshan"} />
      <div className={styles.bubble}>
        <strong>{zh ? "刘看山" : "LIU KANSHAN"}</strong>
        <p>
          {zh
            ? `信号稳定了。眼前的「${carrier}」保存着一段认知。靠近后按 E，或者直接轻触它。`
            : `The signal is stable. The ${carrier} carries preserved cognition. Press E nearby, or tap it directly.`}
        </p>
      </div>
    </aside>
  );
}
