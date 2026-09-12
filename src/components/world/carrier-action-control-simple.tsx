"use client";

import { useState } from "react";
import type { CarrierActionKind, CarrierChoice, CarrierInteractionStep } from "@/lib/world/carrier-interactions";
import { CarrierActionControl as LegacyCarrierActionControl } from "./carrier-action-control";
import styles from "./carrier-action-control.module.css";

function tactile(pattern: number | number[] = 7) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
}

export function CarrierActionControl({
  action,
  step,
  locale,
  onAdvance,
}: {
  action: CarrierActionKind;
  step: CarrierInteractionStep;
  locale: "zh-CN" | "en-US";
  onAdvance: () => void;
}) {
  const zh = locale !== "en-US";
  const [choice, setChoice] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (action === "continue") {
    return (
      <div className={styles.sourceReading}>
        {step.reveal ? (
          <div className={styles.sourcePaper}>
            <div className={styles.sourceHead}>
              <span>{zh ? "场景留下的认知" : "COGNITION IN THE SCENE"}</span>
            </div>
            <blockquote>{step.reveal}</blockquote>
          </div>
        ) : null}
        <button
          type="button"
          className={styles.readDone}
          onClick={() => {
            tactile([7, 16, 9]);
            onAdvance();
          }}
        >
          {zh ? "继续探索" : "Continue exploring"}
        </button>
      </div>
    );
  }

  if (action === "open-source") {
    return (
      <div className={styles.sourceReading}>
        <div className={styles.sourcePaper}>
          <div className={styles.sourceHead}>
            <span>{zh ? "知乎原文片段" : "ZHIHU SOURCE EXCERPT"}</span>
            {typeof step.sourceUpvotes === "number" ? (
              <small>{zh ? `${step.sourceUpvotes.toLocaleString("zh-CN")} 赞同` : `${step.sourceUpvotes.toLocaleString("en-US")} upvotes`}</small>
            ) : null}
          </div>
          <blockquote>{step.sourceExcerpt || (zh ? "原文片段缺失" : "Source excerpt unavailable")}</blockquote>
          <div className={styles.sourceFoot}>
            <span>{zh ? "先读原话，再判断它能支持到哪里。" : "Read the original words before judging their reach."}</span>
            {step.sourceUrl ? <a href={step.sourceUrl} target="_blank" rel="noreferrer">{zh ? "查看原回答 ↗" : "Open source ↗"}</a> : null}
          </div>
        </div>
        <button
          type="button"
          className={styles.readDone}
          onClick={() => {
            tactile([8, 20, 10]);
            onAdvance();
          }}
        >
          {zh ? "我读完了" : "I finished reading"}
        </button>
      </div>
    );
  }

  if (action === "choose") {
    const fallbackOptions: CarrierChoice[] = [
      { id: "understand", label: { "zh-CN": "先理解它", "en-US": "Understand it first" } },
      { id: "question", label: { "zh-CN": "保留疑问", "en-US": "Keep a question open" } },
      { id: "boundary", label: { "zh-CN": "继续找边界", "en-US": "Look for its boundary" } },
    ];
    const options = step.choices?.length ? step.choices : fallbackOptions;

    return (
      <div className={styles.choiceGame} data-mode={step.choiceMode ?? "interpretive"}>
        <div className={styles.choiceList}>
          {options.map((option) => {
            const selected = choice === option.id;
            const wrong = selected && step.choiceMode === "grounded" && !option.grounded;
            const correct = selected && step.choiceMode === "grounded" && option.grounded;
            return (
              <button
                key={option.id}
                type="button"
                data-selected={selected ? "true" : "false"}
                data-correct={correct ? "true" : undefined}
                data-wrong={wrong ? "true" : undefined}
                onClick={() => {
                  tactile(option.grounded ? [7, 18, 10] : 7);
                  setChoice(option.id);
                  setFeedback(option.feedback?.[locale] ?? null);
                  if (step.choiceMode === "grounded" && !option.grounded) return;
                  window.setTimeout(onAdvance, step.choiceMode === "grounded" ? 420 : 260);
                }}
              >
                {option.label[locale]}
              </button>
            );
          })}
        </div>
        {feedback ? <p className={styles.choiceFeedback}>{feedback}</p> : null}
        <small>
          {step.choiceMode === "grounded"
            ? (zh ? "这里只检查材料能明确支持什么。" : "This only checks what the material clearly supports.")
            : (zh ? "这不是考试，只记录你当前的理解。" : "This is not a test; it records your current reading.")}
        </small>
      </div>
    );
  }

  return <LegacyCarrierActionControl action={action} step={step} locale={locale} onAdvance={onAdvance} />;
}
