"use client";

import { useEffect, useRef, useState } from "react";
import type { CarrierActionKind, CarrierInteractionStep } from "@/lib/world/carrier-interactions";
import styles from "./carrier-action-control.module.css";

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
  const [count, setCount] = useState(0);
  const [toggle, setToggle] = useState<"neutral" | "left" | "right">("neutral");
  const [aligned, setAligned] = useState(0);
  const [beacon, setBeacon] = useState(0);
  const [restored, setRestored] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [holding, setHolding] = useState(false);

  useEffect(() => () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
  }, []);

  if (action === "inspect") {
    const spots = ["A", "B", "C"];
    return (
      <div className={styles.inspect} data-action="inspect">
        <div className={styles.inspectObject} data-turn={count}>
          <span />
          {spots.map((spot, index) => (
            <button
              key={spot}
              type="button"
              className={styles.hotspot}
              style={{ "--spot-index": index } as React.CSSProperties}
              aria-label={`${zh ? "观察点" : "inspection point"} ${spot}`}
              onClick={() => {
                const next = count + 1;
                setCount(next);
                if (next >= 2) window.setTimeout(onAdvance, 220);
              }}
            >
              {spot}
            </button>
          ))}
        </div>
        <small>{zh ? `已观察 ${Math.min(count, 2)}/2 个细节` : `${Math.min(count, 2)}/2 details inspected`}</small>
      </div>
    );
  }

  if (action === "toggle") {
    return (
      <div className={styles.toggleRig} data-state={toggle}>
        <div className={styles.routePreview} aria-hidden>
          <i />
          <b />
        </div>
        <div className={styles.leverRow}>
          <button
            type="button"
            aria-label={zh ? "假设不满足" : "assume absent"}
            onClick={() => {
              setToggle("left");
              window.setTimeout(onAdvance, 260);
            }}
          >−</button>
          <span className={styles.lever}><i /></span>
          <button
            type="button"
            aria-label={zh ? "假设满足" : "assume present"}
            onClick={() => {
              setToggle("right");
              window.setTimeout(onAdvance, 260);
            }}
          >＋</button>
        </div>
        <small>{zh ? "拨动前提，观察路线怎样响应" : "Move the assumption and watch the route respond"}</small>
      </div>
    );
  }

  if (action === "align") {
    return (
      <div className={styles.alignGame} data-aligned={aligned >= 2 ? "true" : "false"}>
        <button
          type="button"
          className={styles.plateLeft}
          onClick={() => setAligned((value) => Math.min(2, value + 1))}
        >A</button>
        <div className={styles.alignAxis}><i /></div>
        <button
          type="button"
          className={styles.plateRight}
          onClick={() => {
            const next = Math.min(2, aligned + 1);
            setAligned(next);
            if (next >= 2) window.setTimeout(onAdvance, 260);
          }}
        >B</button>
        <small>{zh ? "让两份材料靠近同一条基准线" : "Bring both materials onto the same axis"}</small>
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
      setHolding(true);
      holdTimer.current = setTimeout(() => {
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
    return (
      <div className={styles.archiveDrawer}>
        <button type="button" onClick={onAdvance}>
          <span />
          <i />
          <b />
        </button>
        <small>{zh ? "拉开档案抽屉，核对可追溯材料" : "Open the archive drawer and inspect the traceable record"}</small>
      </div>
    );
  }

  const options = zh
    ? ["它提供了支撑", "它限定了适用范围", "现在还无法判断"]
    : ["It supports the claim", "It limits the claim", "I still cannot tell"];
  return (
    <div className={styles.choiceGame}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          data-selected={choice === option ? "true" : "false"}
          onClick={() => {
            setChoice(option);
            window.setTimeout(onAdvance, 220);
          }}
        >{option}</button>
      ))}
      <small>{zh ? "这里没有标准答案；这是你当前的理解" : "There is no scored answer here; this records your current reading"}</small>
    </div>
  );
}
