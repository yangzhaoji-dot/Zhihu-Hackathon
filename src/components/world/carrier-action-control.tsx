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
        <div className={styles.routePreview} aria-hidden><i /><b /></div>
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
        <button type="button" onPointerDown={start} onPointerUp={stop} onPointerCancel={stop} onPointerLeave={stop}>
          <span />
        </button>
        <i /><b /><em />
        <small>{zh ? "按住不动，直到回声完整出现" : "Hold still until the echo fully emerges"}</small>
      </div>
    );
  }

  if (action === "open-source") {
    return (
      <div className={styles.sourceReading}>
        <div className={styles.sourcePaper}>
          <div className={styles.sourceHead}>
            <span>{zh ? "知乎原文片段" : "ZHIHU SOURCE EXCERPT"}</span>
            {typeof step.sourceUpvotes === "number" && (
              <small>{zh ? `${step.sourceUpvotes.toLocaleString("zh-CN")} 赞同` : `${step.sourceUpvotes.toLocaleString("en-US")} upvotes`}</small>
            )}
          </div>
          <blockquote>{step.sourceExcerpt || step.reveal || (zh ? "原文片段缺失" : "Source excerpt unavailable")}</blockquote>
          <div className={styles.sourceFoot}>
            <span>{zh ? "先读原话，再判断它能支持到哪里。" : "Read the original words before judging how far they support the claim."}</span>
            {step.sourceUrl ? (
              <a href={step.sourceUrl} target="_blank" rel="noreferrer">{zh ? "查看原回答 ↗" : "Open source ↗"}</a>
            ) : null}
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

  const fallbackOptions = zh
    ? [
        { id: "support", label: { "zh-CN": "它提供了支撑", "en-US": "It provides support" } },
        { id: "boundary", label: { "zh-CN": "它限定了适用范围", "en-US": "It limits the scope" } },
        { id: "uncertain", label: { "zh-CN": "现在还无法判断", "en-US": "I still cannot tell" } },
      ]
    : [
        { id: "support", label: { "zh-CN": "它提供了支撑", "en-US": "It provides support" } },
        { id: "boundary", label: { "zh-CN": "它限定了适用范围", "en-US": "It limits the scope" } },
        { id: "uncertain", label: { "zh-CN": "现在还无法判断", "en-US": "I still cannot tell" } },
      ];
  const options = step.choices?.length ? step.choices : fallbackOptions;

  return (
    <div className={styles.choiceGame} data-mode={step.choiceMode ?? "interpretive"}>
      <div className={styles.choiceList}>
        {options.map((option) => {
          const selected = choice === option.id;
          const wrongGrounded = selected && step.choiceMode === "grounded" && !option.grounded;
          const correctGrounded = selected && step.choiceMode === "grounded" && option.grounded;
          return (
            <button
              key={option.id}
              type="button"
              data-selected={selected ? "true" : "false"}
              data-correct={correctGrounded ? "true" : undefined}
              data-wrong={wrongGrounded ? "true" : undefined}
              onClick={() => {
                tactile(option.grounded ? [7, 18, 10] : 7);
                setChoice(option.id);
                setFeedback(option.feedback?.[locale] ?? null);
                if (step.choiceMode === "grounded" && !option.grounded) return;
                window.setTimeout(onAdvance, step.choiceMode === "grounded" ? 520 : 360);
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
          ? (zh ? "这一步只判断原文明确能支持什么；选错可以继续重试。" : "This step checks only what the source explicitly supports; retry is allowed.")
          : (zh ? "这里没有唯一答案；记录你当前的理解。" : "There is no single right answer here; this records your current reading.")}
      </small>
    </div>
  );
}
