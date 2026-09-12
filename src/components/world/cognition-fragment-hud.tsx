"use client";

import type { ResonanceFragmentKind } from "@/lib/world/resonance";
import { CORE_RESONANCE_FRAGMENTS } from "@/lib/world/resonance";
import styles from "./cognition-fragment-hud.module.css";

const LABELS: Record<ResonanceFragmentKind, { zh: string; en: string }> = {
  claim: { zh: "主张", en: "claim" },
  reason: { zh: "理由", en: "reason" },
  condition: { zh: "条件", en: "condition" },
  evidence: { zh: "依据", en: "evidence" },
  boundary: { zh: "边界", en: "boundary" },
};

export function CognitionFragmentHud({
  collected,
  locale,
  flashKind,
}: {
  collected: readonly ResonanceFragmentKind[];
  locale: "zh-CN" | "en-US";
  flashKind?: ResonanceFragmentKind | null;
}) {
  const zh = locale !== "en-US";
  const collectedSet = new Set(collected);
  return (
    <aside className={styles.hud} aria-label={zh ? "认知碎片" : "cognition fragments"}>
      <div className={styles.shards} aria-hidden>
        {CORE_RESONANCE_FRAGMENTS.map((kind, index) => (
          <span
            key={kind}
            className={styles.shard}
            data-collected={collectedSet.has(kind) ? "true" : "false"}
            data-flash={flashKind === kind ? "true" : "false"}
            style={{ "--shard-index": index } as React.CSSProperties}
          >
            <i />
          </span>
        ))}
      </div>
      <div className={styles.copy}>
        <strong>{collected.length}/{CORE_RESONANCE_FRAGMENTS.length}</strong>
        <span>{zh ? "认知碎片" : "cognition fragments"}</span>
        {flashKind ? <small>{zh ? LABELS[flashKind].zh : LABELS[flashKind].en}</small> : null}
      </div>
    </aside>
  );
}
