"use client";

import { useEffect, useRef, useState } from "react";
import type { CarrierActionKind, CarrierInteractionStep } from "@/lib/world/carrier-interactions";
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
  const [observedSpots, setObservedSpots] = useState<number[]>([]);
  const [toggle, setToggle] = useState<"neutral" | "left" | "right">("neutral");
  const [alignedSides, setAlignedSides] = useState<Array<"left" | "right">>([]);
  const [beacon, setBeacon] = useState(0);
  const [restored, setRestored] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [holding, setHolding] = useState(false);

  useEffect(() => () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
  }, []);

  if (action === "inspect") {
    const spots = ["A", "B", "C"];
    return (
      <div className={styles.inspect} data-action="inspect">
        <div className={styles.inspectObject} data-turn={observedSpots.length}>
          <span />
          {spots.map((spot, index) => (
            <button
              key={spot}
              type="button"
              className={styles.hotspot}
              data-seen={observedSpots.includes(index) ? "true" : "false"}
              style={{ "--spot-index": index } as React.CSSProperties}
              aria-label={`${zh ? "观察点" : "inspection point"} ${spot}`}
              onClick={() => {
                if (observedSpots.includes(index)) return;
                tactile(6);
                const next = [...observedSpots, index];
                setObservedSpots(next);
                if (next.length >= 2) {
                  tactile([6, 18, 10]);
                  window.setTimeout(onAdvance, 220);
                }
              }}
            >
              {spot}
            </button>
          ))}
        </div>
        <small>{zh ? `已观察 ${Math.min(observedSpots.length, 2)}/2 个不同细节` : `${Math.min(observedSpots.length, 2)}/2 distinct details inspected`}</small>
      </div>
    );
  }

  if (action === "toggle") {
    const moveLever = (nextState: "left" | "right") => {
      tactile([7, 20, 8]);
      setToggle(nextState);
      window.setTimeout(onAdvance, 260);
    };
    return (
      <div className={styles.toggleRig} data-state={toggle}>
        <div className={styles.routePreview} aria-hidden>
          <i />
          <b />
        </div>
        <div className={styles.leverRow}>
          <button type="button" aria-label={zh ? "假设不满足" : "assume absent"} onClick={() => moveLever("left")}>−</button>
          <span className={styles.lever}><i /></span>
          <button type="button" aria-label={zh ? "假设满足" : "assume present"} onClick={() => moveLever("right")}>＋</button>
        </div>
        <small>{zh ? "拨动前提，观察路线怎样响应" : "Move the assumption and watch the route respond"}</small>
      </div>
    );
  }

  if (action === "align") {
    const align = (side: "left" | "right") => {
      if (alignedSides.includes(side)) return;
      tactile(7);
      const next = [...alignedSides, side];
      setAlignedSides(next);
      if (next.length >= 2) {
        tactile([8, 20, 10]);
        window.setTimeout(onAdvance, 260);
      }
    };
    return (
      <div
        className={styles.alignGame}
        data-left={alignedSides.includes("left") ? "true" : "false"}
        data-right={alignedSides.includes("right") ? "true" : "false"}
        data-aligned={alignedSides.length >= 2 ? "true" : "false"}
      >
        <button type="button" className={styles.plateLeft} onClick={() => align("left")}>A</button>
        <div className={styles.alignAxis}><i /></div>
        <button type="button" className={styles.plateRight} onClick={() => align("right")}>B</button>
        <small>{zh ? "分别推动两份材料，让它们落到同一条基准线" : "Move both materials onto the same axis"}</small>
      </div>
    );
  }

  if (action === "follow") {
    return (
      <div className={styles.beaconField}>
        {[0, 1, 2, 3].map((index) => (
          <button
            key={index}
            type="button"
            data-active={index === beacon ? "true" : "false"}
            data-passed={index < beacon ? "true" : "false"}
            style={{ "--beacon-index": index } as React.CSSProperties}
            onClick={() => {
              if (index !== beacon) return;
              tactile(index === 3 ? [7, 18, 10] : 6);
              const next = beacon + 1;
              setBeacon(next);
              if (next >= 4) window.setTimeout(onAdvance, 240);
            }}
            aria-label={`${zh ? "信标" : "beacon"} ${index + 1}`}
          />
        ))}
        <svg viewBox="0 0 100 56" aria-hidden><path d="M7 44 C26 8 42 42 60 16 S84 18 94 8" /></svg>
        <small>{zh ? "只跟随当前亮起的信标" : "Follow only the currently lit beacon"}</small>
      </div>
    );
  }

  if (action === "restore") {
    return (
      <div className={styles.restoreGame} data-restored={restored}>
        {[0, 1, 2].map((index) => (
          <button
            key={index}
            type="button"
            style={{ "--piece-index": index } as React.CSSProperties}
            data-fixed={index < restored ? "true" : "false"}
            onClick={() => {
              if (index !== restored) return;
              tactile(index === 2 ? [9, 18, 12] : 8);
              const next = restored + 1;
              setRestored(next);
              if (next >= 3) window.setTimeout(onAdvance, 260);
            }}
            aria-label={`${zh ? "遗迹碎片" : "ruin piece"} ${index + 1}`}
          />
        ))}
        <div className={styles.restoreGap} aria-hidden />
        <small>{zh ? "按残留边缘复原，不填补空白" : "Restore surviving edges without filling the gap"}</small>
      </div>
    );
  }

  if (action === "listen") {
    const stop = () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
      holdTimer.current = null;
      setHolding(false);
    };
    const start = () => {
      if (holding) return;
      tactile(5);
      setHolding(true);
      holdTimer.current = setTimeout(() => {
        tactile([8, 30, 12]);
        setHolding(false);
        onAdvance();
      }, 900);
    };
    return (
      <div className={styles.listenGame} data-holding={holding ? "true" : "false"}>
        <button
          type="button"
          onPointerDown={start}
          onPointerUp={stop}
          onPointerCancel={stop}
          onPointerLeave={stop}
        >
          <span />
        </button>
        <i /><b /><em />
        <small>{zh ? "按住不动，直到回声完整出现" : "Hold still until the echo fully emerges"}</small>
      </div>
    );
  }

  if (action === "open-source") {
    const excerpt = step.sourceExcerpt?.trim();
    return (
      <div className={styles.sourceReading}>
        <article className={styles.sourcePaper}>
          <header>
            <span>{zh ? "知乎原文片段" : "ZHIHU SOURCE EXCERPT"}</span>
            {typeof step.sourceUpvotes === "number" ? <small>{step.sourceUpvotes.toLocaleString()} {zh ? "赞同" : "upvotes"}</small> : null}
          </header>
          {excerpt ? <blockquote>“{excerpt}”</blockquote> : <p>{zh ? "这份来源没有留下可展示的原文片段。" : "No displayable excerpt survived for this source."}</p>}
          {step.sourceUrl ? (
            <a href={step.sourceUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
              {zh ? "在新标签页查看原回答 ↗" : "Open original answer ↗"}
            </a>
          ) : null}
        </article>
        <button
          type="button"
          className={styles.readContinue}
          onClick={() => {
            tactile([8, 20, 10]);
            onAdvance();
          }}
        >
          {zh ? "我读完了，继续" : "I have read it — continue"}
        </button>
        <small>{zh ? "先读原文，再看系统如何提炼这段材料" : "Read the source before seeing how the system distills it"}</small>
      </div>
    );
  }

  const configuredChoices = step.choices?.map((item) => ({
    id: item.id,
    label: item.label[locale],
    feedback: item.feedback?.[locale],
    grounded: item.grounded,
  }));
  const fallbackChoices = zh
    ? ["它提供了支撑", "它限定了适用范围", "现在还无法判断"]
    : ["It supports the claim", "It limits the claim", "I still cannot tell"];
  const options = configuredChoices ?? fallbackChoices.map((label) => ({ id: label, label }));

  return (
    <div className={styles.choiceGame} data-mode={step.choiceMode ?? "interpretive"}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          data-selected={choice === option.id ? "true" : "false"}
          disabled={choice !== null}
          onClick={() => {
            tactile(option.grounded ? [7, 16, 11] : 7);
            setChoice(option.id);
            setFeedback(option.feedback ?? null);
            window.setTimeout(onAdvance, option.feedback ? 1150 : 420);
          }}
        >{option.label}</button>
      ))}
      {feedback ? <p className={styles.choiceFeedback} aria-live="polite">{feedback}</p> : null}
      <small>
        {step.choiceMode === "grounded"
          ? (zh ? "这一步区分“原文留下了什么”和“我们推断了什么”" : "This step separates what the source says from what we infer")
          : (zh ? "这里记录的是你的当前判断，不是标准答案" : "This records your current reading; it is not a scored answer")}
      </small>
    </div>
  );
}
