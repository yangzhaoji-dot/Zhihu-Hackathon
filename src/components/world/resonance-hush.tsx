"use client";

import { useEffect, useState } from "react";
import styles from "./resonance-hush.module.css";

export function ResonanceHush({ opinionId }: { opinionId: string }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `seeker:resonance-hush:${opinionId}`;

    const onSfx = (event: Event) => {
      if (String((event as CustomEvent<unknown>).detail ?? "") !== "sfx.fragment.found") return;
      window.setTimeout(() => {
        const root = document.querySelector<HTMLElement>('[data-el="world-runtime"]');
        if (!root) return;
        const total = Number(root.dataset.fragmentTotal ?? 0);
        const recovered = (root.dataset.fragments ?? "").split(",").filter(Boolean).length;
        if (total <= 0 || recovered < total) return;
        if (window.sessionStorage.getItem(key) === "seen") return;

        window.sessionStorage.setItem(key, "seen");
        setActive(true);
        window.dispatchEvent(new CustomEvent("sfx", { detail: "sfx.resonance.prepare" }));
        window.setTimeout(() => setActive(false), 1250);
      }, 80);
    };

    window.addEventListener("sfx", onSfx);
    return () => window.removeEventListener("sfx", onSfx);
  }, [opinionId]);

  if (!active) return null;

  return (
    <div className={styles.hush} aria-hidden data-el="resonance-hush">
      <span className={styles.center} />
      <span className={styles.ring} />
      <span className={styles.ring2} />
    </div>
  );
}
