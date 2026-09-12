"use client";

import { useMemo, useState } from "react";
import styles from "./condition-experiment.module.css";

type ConditionState = "unknown" | "fits" | "breaks";

interface ConditionExperimentProps {
  conditions: string[];
  locale: "zh-CN" | "en-US";
  onComplete: () => void;
  onCancel: () => void;
  /** 只驱动本地场景反馈，不代表现实概率或观点置信度。 */
  onCueChange?: (cue: number) => void;
}

const NEXT_STATE: Record<ConditionState, ConditionState> = {
  unknown: "fits",
  fits: "breaks",
  breaks: "unknown",
};

function cueFromStates(states: readonly ConditionState[], count: number) {
  if (!count) return 0;
  const fits = states.filter((state) => state === "fits").length;
  const breaks = states.filter((state) => state === "breaks").length;
  return Math.max(0.15, Math.min(1, (fits + (count - fits - breaks) * 0.18) / count));
}

function reflectCueInScene(cue: number) {
  if (typeof document === "undefined") return;
  const runtime = document.querySelector<HTMLElement>('[data-el="world-runtime"]');
  if (!runtime) return;
  runtime.style.setProperty("--condition-cue", String(Math.max(0, Math.min(1, cue))));
  runtime.style.setProperty("--condition-route-opacity", String(0.16 + cue * 0.54));
  runtime.style.setProperty("--condition-route-glow", String(4 + cue * 12));
}

export function ConditionExperiment({
  conditions,
  locale,
  onComplete,
  onCancel,
  onCueChange,
}: ConditionExperimentProps) {
  const normalized = useMemo(
    () => conditions.map((value) => value.trim()).filter(Boolean).slice(0, 3),
    [conditions],
  );
  const [states, setStates] = useState<ConditionState[]>(() => normalized.map(() => "unknown"));
  const touched = states.filter((state) => state !== "unknown").length;
  const fits = states.filter((state) => state === "fits").length;
  const ratio = normalized.length ? fits / normalized.length : 0;
  const zh = locale !== "en-US";

  const publishCue = (cue: number) => {
    reflectCueInScene(cue);
    onCueChange?.(cue);
  };

  const stateLabel = (state: ConditionState) => {
    if (state === "fits") return zh ? "假设满足" : "assume present";
    if (state === "breaks") return zh ? "假设不满足" : "assume absent";
    return zh ? "尚未设置" : "not set";
  };

  return (
    <section className={styles.panel} aria-label={zh ? "条件实验" : "condition experiment"}>
      <header className={styles.header}>
        <span>{zh ? "条件实验" : "CONDITION EXPERIMENT"}</span>
        <strong>{zh ? "改变前提，看看这条观点的适用线索如何变化" : "Change assumptions and watch the claim's applicability cue change"}</strong>
      </header>

      <div className={styles.route} aria-hidden>
        <span className={styles.routeOrigin} />
        <span className={styles.routeTrack}>
          <span className={styles.routeLight} style={{ width: `${18 + ratio * 82}%` }} />
        </span>
        <span className={styles.routeGate} data-open={ratio >= 0.66 ? "true" : "false"} />
      </div>

      {normalized.length ? (
        <div className={styles.conditions}>
          {normalized.map((condition, index) => (
            <button
              key={`${condition}-${index}`}
              type="button"
              className={styles.condition}
              data-state={states[index]}
              onClick={() => {
                const next = states.map((state, stateIndex) =>
                  stateIndex === index ? NEXT_STATE[state] : state,
                );
                setStates(next);
                publishCue(cueFromStates(next, normalized.length));
              }}
              aria-label={`${condition} · ${stateLabel(states[index])}`}
            >
              <span className={styles.conditionText}>{condition}</span>
              <small>{stateLabel(states[index])}</small>
            </button>
          ))}
        </div>
      ) : (
        <div className={styles.missing}>
          <strong>{zh ? "这里没有结构化的成立条件。" : "No structured conditions were supplied."}</strong>
          <p>{zh ? "缺少条件本身就是这条观点目前的边界；不要为了完成实验替它编一个。" : "The missing condition is itself a boundary of the current material. Do not invent one to finish the experiment."}</p>
        </div>
      )}

      <p className={styles.disclaimer}>
        {zh
          ? "亮起的路线只表示：在这条观点自己声明的前提下，它看起来更适用。它不是现实结果预测，也不证明观点正确。"
          : "The lit route only represents applicability under the claim's own stated assumptions. It is not a real-world forecast or proof."}
      </p>

      <footer className={styles.actions}>
        <button
          type="button"
          className={styles.secondary}
          onClick={() => {
            publishCue(0);
            onCancel();
          }}
        >
          {zh ? "先不判断" : "Not yet"}
        </button>
        <button
          type="button"
          className={styles.primary}
          disabled={normalized.length > 0 && touched === 0}
          onClick={onComplete}
        >
          {normalized.length
            ? (zh ? "我看懂了条件如何影响这条观点" : "I understand how the conditions shape this claim")
            : (zh ? "记录这个条件缺口" : "Record this missing condition")}
        </button>
      </footer>
    </section>
  );
}
