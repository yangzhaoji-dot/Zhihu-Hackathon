"use client";

import type { CSSProperties } from "react";
import type { CognitionFragmentSpec } from "@/lib/world/cognition-fragment-plan";
import styles from "./cognition-fragment-hud.module.css";

export function CognitionFragmentHud({
  plan,
  collectedIds,
  locale,
  flashId,
}: {
  plan: readonly CognitionFragmentSpec[];
  collectedIds: readonly string[];
  locale: "zh-CN" | "en-US";
  flashId?: string | null;
}) {
  const zh = locale !== "en-US";
  const collectedSet = new Set(collectedIds);
  const flash = plan.find((fragment) => fragment.id === flashId) ?? null;
  return (
    <aside className={styles.hud} aria-label={zh ? "认知碎片" : "cognition fragments"}>
      {flash ? (
        <span className={styles.flight} key={`flight:${flash.id}`} aria-hidden>
          <i />
        </span>
      ) : null}
      <div className={styles.shards} aria-hidden>
        {plan.map((fragment, index) => (
          <span
            key={fragment.id}
            className={styles.shard}
            data-collected={collectedSet.has(fragment.id) ? "true" : "false"}
            data-flash={flashId === fragment.id ? "true" : "false"}
            style={{ "--shard-index": index } as CSSProperties}
          >
            <i />
          </span>
        ))}
      </div>
      <div className={styles.copy}>
        <strong>{collectedIds.length}/{plan.length}</strong>
        <span>{zh ? "认知碎片" : "cognition fragments"}</span>
        {flash ? <small>{flash.label[locale]}</small> : null}
      </div>
    </aside>
  );
}
