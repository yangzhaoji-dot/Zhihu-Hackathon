"use client";

import { useEffect, useMemo, useState } from "react";
import { CarrierActionControl } from "./carrier-action-control";
import type { CarrierInteractionDefinition } from "@/lib/world/carrier-interactions";
import styles from "./carrier-interaction-stage.module.css";

const MODE_LABELS: Record<CarrierInteractionDefinition["mode"], { "zh-CN": string; "en-US": string }> = {
  observe: { "zh-CN": "观察", "en-US": "OBSERVE" },
  experiment: { "zh-CN": "实验", "en-US": "EXPERIMENT" },
  trace: { "zh-CN": "溯源", "en-US": "TRACE" },
  compare: { "zh-CN": "对照", "en-US": "COMPARE" },
  navigate: { "zh-CN": "航行", "en-US": "NAVIGATE" },
  restore: { "zh-CN": "复原", "en-US": "RESTORE" },
  listen: { "zh-CN": "倾听", "en-US": "LISTEN" },
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
            <span>{zh ? "认知载体" : "COGNITION CARRIER"} · {MODE_LABELS[interaction.mode][locale]}</span>
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
            <small>{zh ? "当前观察" : "CURRENT CUE"}</small>
            <p>{current.prompt[locale]}</p>
            <CarrierActionControl
              key={current.id}
              action={current.action}
              step={current}
              locale={locale}
              onAdvance={advance}
            />
          </div>
        ) : (
          <div className={styles.completion}>
            <div className={styles.distillPreview} aria-hidden><i /><b /><em /></div>
            <p>{interaction.completionLine[locale]}</p>
            <button type="button" onClick={onComplete}>
              {zh ? "让认知从载体中析出" : "Distill cognition from this carrier"}
            </button>
          </div>
        )}

        {visibleReveals.length > 0 && (
          <div className={styles.reveals} aria-live="polite">
            {visibleReveals.map((item) => <p key={item.id}>{item.text}</p>)}
          </div>
        )}

        <footer className={styles.footer}>
          <button type="button" onClick={onCancel}>{zh ? "先离开这个载体" : "Leave this carrier for now"}</button>
          <span>{zh ? "交互完成之前，不会生成认知碎片" : "No cognition shard exists until the carrier interaction is complete"}</span>
        </footer>
      </section>
    </div>
  );
}
