"use client";

import { useEffect, useMemo, useState } from "react";
import type { CarrierActionKind, CarrierInteractionDefinition } from "@/lib/world/carrier-interactions";
import styles from "./carrier-interaction-stage.module.css";

const ACTION_LABELS: Record<CarrierActionKind, { "zh-CN": string; "en-US": string }> = {
  inspect: { "zh-CN": "观察", "en-US": "Inspect" },
  toggle: { "zh-CN": "调整", "en-US": "Adjust" },
  align: { "zh-CN": "对齐", "en-US": "Align" },
  follow: { "zh-CN": "前往", "en-US": "Follow" },
  restore: { "zh-CN": "复原", "en-US": "Restore" },
  listen: { "zh-CN": "倾听", "en-US": "Listen" },
  "open-source": { "zh-CN": "打开原文", "en-US": "Open source" },
  choose: { "zh-CN": "作出判断", "en-US": "Respond" },
};

function emitCarrierProgress(
  interaction: CarrierInteractionDefinition,
  step: number,
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("carrier:progress", {
    detail: {
      fragmentId: interaction.fragmentId,
      carrier: interaction.carrier,
      mode: interaction.mode,
      step,
      total: interaction.steps.length,
      progress: interaction.steps.length ? step / interaction.steps.length : 1,
    },
  }));
}

export function CarrierInteractionStage({
  interaction,
  locale,
  onSourceViewed,
  onCancel,
  onComplete,
}: {
  interaction: CarrierInteractionDefinition;
  locale: "zh-CN" | "en-US";
  onSourceViewed?: (sourceId: string) => void;
  onCancel: () => void;
  onComplete: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [revealed, setRevealed] = useState<string[]>([]);
  const current = interaction.steps[stepIndex] ?? null;
  const completed = stepIndex >= interaction.steps.length;
  const zh = locale !== "en-US";

  useEffect(() => {
    emitCarrierProgress(interaction, 0);
    return () => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("carrier:close", {
          detail: { fragmentId: interaction.fragmentId, carrier: interaction.carrier },
        }));
      }
    };
  }, [interaction]);

  const visibleReveals = useMemo(
    () => interaction.steps
      .filter((step) => revealed.includes(step.id) && step.reveal)
      .map((step) => ({ id: step.id, text: step.reveal! })),
    [interaction.steps, revealed],
  );

  const advance = () => {
    if (!current) return;
    if (current.action === "open-source" && current.sourceId) onSourceViewed?.(current.sourceId);
    if (current.reveal) setRevealed((items) => items.includes(current.id) ? items : [...items, current.id]);
    const next = stepIndex + 1;
    setStepIndex(next);
    emitCarrierProgress(interaction, next);
  };

  return (
    <div className={styles.overlay} data-mode={interaction.mode} role="dialog" aria-label={interaction.carrier}>
      <section className={styles.stage}>
        <header className={styles.header}>
          <div>
            <span>{zh ? "认知载体" : "COGNITION CARRIER"}</span>
            <h2>{interaction.carrier}</h2>
          </div>
          <strong>{Math.min(stepIndex + 1, interaction.steps.length)}/{interaction.steps.length}</strong>
        </header>

        <div className={styles.carrierWindow} aria-hidden>
          <div className={styles.carrierCore} data-mode={interaction.mode}>
            <i />
            <b />
            <em />
          </div>
          <div className={styles.pulse} style={{ "--carrier-progress": interaction.steps.length ? stepIndex / interaction.steps.length : 1 } as React.CSSProperties} />
        </div>

        {!completed && current ? (
          <div className={styles.step}>
            <small>{ACTION_LABELS[current.action][locale]}</small>
            <p>{current.prompt[locale]}</p>
            <button type="button" onClick={advance}>{ACTION_LABELS[current.action][locale]}</button>
          </div>
        ) : (
          <div className={styles.completion}>
            <p>{interaction.completionLine[locale]}</p>
            <button type="button" onClick={onComplete}>
              {zh ? "提炼认知碎片" : "Distill cognition shard"}
            </button>
          </div>
        )}

        {visibleReveals.length > 0 && (
          <div className={styles.reveals}>
            {visibleReveals.map((item) => <p key={item.id}>{item.text}</p>)}
          </div>
        )}

        <footer className={styles.footer}>
          <button type="button" onClick={onCancel}>{zh ? "先离开这个载体" : "Leave this carrier for now"}</button>
          <span>{zh ? "碎片只会在交互完成后生成" : "The shard appears only after the carrier interaction is complete"}</span>
        </footer>
      </section>
    </div>
  );
}
