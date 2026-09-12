"use client";

import { useState } from "react";
import { GuideAvatar } from "@/components/opinion-world/guide-avatar";
import type { KanshanPrompt } from "@/lib/world/kanshan-carrier-guide";
import styles from "./kanshan-carrier-overlay.module.css";

export function KanshanCarrierOverlay({
  prompts,
  carrier,
  accent,
  locale,
  onInvestigate,
  onCancel,
}: {
  prompts: readonly KanshanPrompt[];
  carrier: string;
  accent: string;
  locale: "zh-CN" | "en-US";
  onInvestigate: () => void;
  onCancel: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [choiceId, setChoiceId] = useState<string | null>(null);
  const [reaction, setReaction] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const prompt = prompts[Math.min(index, prompts.length - 1)];
  const zh = locale !== "en-US";
  if (!prompt) return null;
  const last = index >= prompts.length - 1;

  const choose = (id: string) => {
    const choice = prompt.choices?.find((item) => item.id === id);
    setChoiceId(id);
    setReaction(choice?.response?.[locale] ?? null);
    window.setTimeout(() => {
      setChoiceId(null);
      setReaction(null);
      setIndex((value) => Math.min(prompts.length - 1, value + 1));
    }, choice?.response ? 820 : 220);
  };

  const investigate = () => {
    if (transitioning) return;
    setTransitioning(true);
    window.dispatchEvent(new CustomEvent("carrier:focus", { detail: { carrier } }));
    window.setTimeout(onInvestigate, 320);
  };

  return (
    <div
      className={styles.overlay}
      data-transitioning={transitioning ? "true" : "false"}
      role="dialog"
      aria-label={zh ? "刘看山引导" : "Liu Kanshan guide"}
    >
      <div className={styles.focusWash} aria-hidden />
      <section className={styles.box}>
        <GuideAvatar accent={accent} label={zh ? "刘看山" : "Liu Kanshan"} />
        <div className={styles.body}>
          <header>
            <span>{zh ? "刘看山" : "LIU KANSHAN"}</span>
            <small>{carrier}</small>
          </header>
          <p>{prompt.line[locale]}</p>
          {reaction ? (
            <div className={styles.reaction} aria-live="polite">{reaction}</div>
          ) : prompt.choices?.length ? (
            <div className={styles.choices}>
              {prompt.choices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  data-selected={choiceId === choice.id ? "true" : "false"}
                  disabled={choiceId !== null || transitioning}
                  onClick={() => choose(choice.id)}
                >
                  {choice.label[locale]}
                </button>
              ))}
            </div>
          ) : (
            <button type="button" className={styles.investigate} disabled={transitioning} onClick={investigate}>
              {transitioning
                ? (zh ? "靠近载体…" : "Approaching carrier…")
                : (zh ? "靠近并操作这个载体" : "Approach and interact with this carrier")}
            </button>
          )}
          <footer>
            <button type="button" disabled={transitioning} onClick={onCancel}>{zh ? "先离开" : "Leave for now"}</button>
            <span>{last ? (zh ? "看山不会替你判断结论" : "Kanshan will not judge the conclusion for you") : `${index + 1}/${prompts.length}`}</span>
          </footer>
        </div>
      </section>
    </div>
  );
}
