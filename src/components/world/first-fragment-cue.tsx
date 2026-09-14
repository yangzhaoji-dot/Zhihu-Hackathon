"use client";

import { useEffect, useState } from "react";
import { GuideAvatar } from "@/components/opinion-world/guide-avatar";
import styles from "./first-fragment-cue.module.css";

export function FirstFragmentCue({ opinionId }: { opinionId: string }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [countLabel, setCountLabel] = useState("1/?");
  const [locale] = useState<"zh-CN" | "en-US">(() => {
    if (typeof document === "undefined") return "zh-CN";
    return document.documentElement.lang.toLowerCase().startsWith("en") ? "en-US" : "zh-CN";
  });
  const zh = locale === "zh-CN";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `seeker:first-fragment:${opinionId}`;
    if (window.sessionStorage.getItem(key) === "seen") return;

    const onSfx = (event: Event) => {
      if (String((event as CustomEvent<unknown>).detail ?? "") !== "sfx.fragment.found") return;
      const root = document.querySelector<HTMLElement>('[data-el="world-runtime"]');
      const total = root?.dataset.fragmentTotal ?? "?";
      const recovered = root?.dataset.fragments
        ? root.dataset.fragments.split(",").filter(Boolean).length
        : 1;
      setCountLabel(`${Math.max(1, recovered)}/${total}`);
      window.sessionStorage.setItem(key, "seen");
      setVisible(true);
      window.setTimeout(() => setLeaving(true), 3600);
      window.setTimeout(() => setVisible(false), 4040);
      window.removeEventListener("sfx", onSfx);
    };

    window.addEventListener("sfx", onSfx);
    return () => window.removeEventListener("sfx", onSfx);
  }, [opinionId]);

  if (!visible) return null;

  return (
    <aside className={styles.cue} data-leaving={leaving ? "true" : "false"} aria-live="polite">
      <GuideAvatar label={zh ? "刘看山" : "Liu Kanshan"} />
      <div className={styles.bubble}>
        <div className={styles.head}>
          <strong>{zh ? "刘看山" : "LIU KANSHAN"}</strong>
          <span>{countLabel}</span>
        </div>
        <p>
          {zh
            ? "看到了吗？你带走的不是那个实物，而是从它里面读出来的一段认知。不同载体，最后都会提炼成这种统一的认知碎片。"
            : "See that? You did not take the object itself. You recovered cognition from it. Different carriers distill into the same shard language."}
        </p>
      </div>
    </aside>
  );
}
