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
  const prompt = prompts[Math.min(index, prompts.length - 1)];
  const zh = locale !== "en-US";
  if (!prompt) return null;
  const last = index >= prompts.length - 1;

  const choose = (id: string) => {
    setChoiceId(id);
    window.setTimeout(() => {
      setChoiceId(null);
      setIndex((value) => Math.min(prompts.length - 1, value + 1));
    }, 180);
  };

  return (
    <div className={styles.overlay} role="dialog" aria-label={zh ? "刘看山引导" : "Liu Kanshan guide"}>
      <section className={styles.box}>
        <GuideAvatar accent={accent} label={zh ? "刘看山" : "Liu Kanshan"} />
        <div className={styles.body}>
          <header>
            <span>{zh ? "刘看山" : "LIU KANSHAN"}</span>
            <small>{carrier}</small>
          </header>
          <p>{prompt.line[locale]}</p>
          {prompt.choices?.length ? (
            <div className={styles.choices}>
              {prompt.choices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  data-selected={choiceId === choice.id ? "true" : "false"}
                  onClick={() => choose(choice.id)}
                >
                  {choice.label[locale]}
                </button>
              ))}
            </div>
          ) : (
            <button type="button" className={styles.investigate} onClick={onInvestigate}>
              {zh ? "开始调查这个载体" : "Investigate this carrier"}
            </button>
          )}
          <footer>
            <button type="button" onClick={onCancel}>{zh ? "先离开" : "Leave for now"}</button>
            <span>{last ? (zh ? "看山不会替你判断结论" : "Kanshan will not judge the conclusion for you") : `${index + 1}/${prompts.length}`}</span>
          </footer>
        </div>
      </section>
    </div>
  );
}
