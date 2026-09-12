"use client";

import { useEffect, useMemo, useState } from "react";
import type { OpinionSource } from "@/lib/opinion/types";
import type { SceneInteractionMode } from "@/lib/opinion/planet-scene-spec";
import { ConditionExperiment } from "./condition-experiment";
import styles from "./fragment-interaction-overlay.module.css";

type FragmentKind = "claim" | "reason" | "evidence";

interface FragmentInteractionOverlayProps {
  mode: SceneInteractionMode;
  kind: FragmentKind;
  artifact: string;
  intent: string;
  claim: string;
  reason?: string;
  conditions: string[];
  sources: OpinionSource[];
  locale: "zh-CN" | "en-US";
  onSourceViewed?: (sourceId: string) => void;
  onComplete: () => void;
  onCancel: () => void;
}

const MODE_NAMES: Record<SceneInteractionMode, { zh: string; en: string }> = {
  observe: { zh: "观察", en: "OBSERVE" },
  experiment: { zh: "实验", en: "EXPERIMENT" },
  trace: { zh: "溯源", en: "TRACE" },
  compare: { zh: "对照", en: "COMPARE" },
  navigate: { zh: "航行", en: "NAVIGATE" },
  restore: { zh: "复原", en: "RESTORE" },
  listen: { zh: "倾听", en: "LISTEN" },
};

function sceneProgress(value: number, mode: SceneInteractionMode, kind: FragmentKind) {
  if (typeof document === "undefined") return;
  const runtime = document.querySelector<HTMLElement>('[data-el="world-runtime"]');
  if (!runtime) return;
  const normalized = Math.max(0, Math.min(1, value));
  runtime.dataset.fragmentInteraction = mode;
  runtime.dataset.fragmentInteractionKind = kind;
  runtime.style.setProperty("--fragment-interaction-progress", String(normalized));
  runtime.style.setProperty("--fragment-interaction-glow", `${5 + normalized * 14}px`);
}

function clearSceneProgress() {
  if (typeof document === "undefined") return;
  const runtime = document.querySelector<HTMLElement>('[data-el="world-runtime"]');
  if (!runtime) return;
  delete runtime.dataset.fragmentInteraction;
  delete runtime.dataset.fragmentInteractionKind;
  runtime.style.removeProperty("--fragment-interaction-progress");
  runtime.style.removeProperty("--fragment-interaction-glow");
}

export function FragmentInteractionOverlay({
  mode,
  kind,
  artifact,
  intent,
  claim,
  reason,
  conditions,
  sources,
  locale,
  onSourceViewed,
  onComplete,
  onCancel,
}: FragmentInteractionOverlayProps) {
  const zh = locale !== "en-US";
  const [seen, setSeen] = useState<number[]>([]);
  const [choice, setChoice] = useState<string | null>(null);
  const [routeIndex, setRouteIndex] = useState(0);
  const [restored, setRestored] = useState<number[]>([]);
  const [heard, setHeard] = useState<number[]>([]);
  const [openedSourceId, setOpenedSourceId] = useState<string | null>(null);

  useEffect(() => {
    sceneProgress(0.08, mode, kind);
    return clearSceneProgress;
  }, [kind, mode]);

  const clues = useMemo(() => [
    claim,
    reason || (zh ? "这里没有留下完整理由。" : "No complete reason was preserved here."),
    conditions[0] || (zh ? "适用边界仍然没有被写清。" : "Its boundary of application is still unclear."),
  ], [claim, conditions, reason, zh]);

  const routeStops = useMemo(() => [
    zh ? "近处信标" : "near beacon",
    zh ? "中继灯" : "relay light",
    sources.length ? (zh ? "来源坐标" : "source coordinate") : (zh ? "缺失坐标" : "missing coordinate"),
  ], [sources.length, zh]);

  const echoes = useMemo(() => [
    claim,
    reason || (zh ? "这里没有保存完整的解释。" : "No complete explanation was preserved."),
    conditions[0] || (zh ? "这里还有一部分没有被说出来。" : "Something here was left unsaid."),
  ], [claim, conditions, reason, zh]);

  const complete = () => {
    sceneProgress(1, mode, kind);
    window.setTimeout(() => {
      clearSceneProgress();
      onComplete();
    }, 180);
  };

  const cancel = () => {
    clearSceneProgress();
    onCancel();
  };

  const observeDone = seen.length >= 2;
  const compareDone = choice !== null;
  const navigateDone = routeIndex >= routeStops.length;
  const restoreDone = restored.length >= 3;
  const listenDone = heard.length >= 2;
  const traceDone = sources.length === 0 || openedSourceId !== null;

  return (
    <div className={styles.overlay} role="dialog" aria-label={zh ? `${artifact}交互` : `${artifact} interaction`}>
      <section className={styles.panel} data-mode={mode}>
        <header className={styles.header}>
          <div>
            <span>{MODE_NAMES[mode][zh ? "zh" : "en"]} · {artifact}</span>
            <h2>{intent}</h2>
          </div>
          <button type="button" className={styles.close} onClick={cancel} aria-label={zh ? "离开" : "leave"}>×</button>
        </header>

        {mode === "observe" && (
          <div className={styles.observeGrid}>
            {clues.map((clue, index) => {
              const active = seen.includes(index);
              return (
                <button
                  key={`${clue}-${index}`}
                  type="button"
                  data-active={active ? "true" : "false"}
                  onClick={() => {
                    const next = active ? seen : [...seen, index];
                    setSeen(next);
                    sceneProgress(next.length / 3, mode, kind);
                  }}
                >
                  <i aria-hidden>{index + 1}</i>
                  <span>{active ? clue : (zh ? "仔细观察这个细节" : "Inspect this detail")}</span>
                </button>
              );
            })}
          </div>
        )}

        {mode === "experiment" && (
          <ConditionExperiment
            conditions={conditions}
            locale={locale}
            onCueChange={(cue) => sceneProgress(cue, mode, kind)}
            onCancel={cancel}
            onComplete={complete}
          />
        )}

        {mode === "trace" && (
          <div className={styles.traceList}>
            {sources.length ? sources.slice(0, 3).map((source, index) => {
              const opened = openedSourceId === source.id;
              return (
                <button
                  key={source.id}
                  type="button"
                  data-opened={opened ? "true" : "false"}
                  onClick={() => {
                    setOpenedSourceId(source.id);
                    onSourceViewed?.(source.id);
                    sceneProgress(0.7 + index * 0.12, mode, kind);
                  }}
                >
                  <small>{zh ? `来源痕迹 ${index + 1}` : `source trace ${index + 1}`}</small>
                  <p>{opened ? source.excerpt : (zh ? "触碰档案，读取留下的原文痕迹" : "Touch the archive to reveal the preserved excerpt")}</p>
                </button>
              );
            }) : (
              <div className={styles.missing}>
                <strong>{zh ? "这里没有可以继续追溯的原文。" : "No further source can be traced here."}</strong>
                <p>{zh ? "空缺本身也是信息：这部分目前只能保持未知。" : "The gap itself is information; this part must remain unknown."}</p>
              </div>
            )}
          </div>
        )}

        {mode === "compare" && (
          <div className={styles.compare}>
            <article><small>{zh ? "主张" : "CLAIM"}</small><p>{claim}</p></article>
            <article><small>{zh ? "理由 / 条件" : "REASON / CONDITION"}</small><p>{reason || conditions[0] || (zh ? "材料不足" : "insufficient material")}</p></article>
            <div className={styles.choiceRow}>
              {(zh
                ? ["我想核对它们的共同前提", "我想找它们之间的断点", "我暂时无法判断关系"]
                : ["Check their shared assumption", "Look for the break between them", "I cannot judge the relation yet"]
              ).map((item) => (
                <button key={item} type="button" data-active={choice === item ? "true" : "false"} onClick={() => {
                  setChoice(item);
                  sceneProgress(0.72, mode, kind);
                }}>{item}</button>
              ))}
            </div>
          </div>
        )}

        {mode === "navigate" && (
          <div className={styles.navigate}>
            <div className={styles.routeLine} aria-hidden />
            {routeStops.map((stop, index) => {
              const reached = index < routeIndex;
              const next = index === routeIndex;
              return (
                <button
                  key={stop}
                  type="button"
                  disabled={!next}
                  data-reached={reached ? "true" : "false"}
                  data-next={next ? "true" : "false"}
                  onClick={() => {
                    const value = Math.min(routeStops.length, routeIndex + 1);
                    setRouteIndex(value);
                    sceneProgress(value / routeStops.length, mode, kind);
                  }}
                >
                  <i aria-hidden />
                  <span>{stop}</span>
                </button>
              );
            })}
          </div>
        )}

        {mode === "restore" && (
          <div className={styles.restore}>
            {[0, 1, 2].map((index) => {
              const placed = restored.includes(index);
              return (
                <button key={index} type="button" data-placed={placed ? "true" : "false"} onClick={() => {
                  if (placed) return;
                  const next = [...restored, index];
                  setRestored(next);
                  sceneProgress(next.length / 3, mode, kind);
                }}>
                  <i aria-hidden />
                  <span>{placed
                    ? (zh ? ["主张轮廓", "理由结构", "来源痕迹"][index] : ["claim outline", "reason structure", "source trace"][index])
                    : (zh ? "拾起遗迹碎片" : "recover relic fragment")}</span>
                </button>
              );
            })}
          </div>
        )}

        {mode === "listen" && (
          <div className={styles.listen}>
            {echoes.map((echo, index) => {
              const active = heard.includes(index);
              return (
                <button key={`${index}-${echo}`} type="button" data-heard={active ? "true" : "false"} onClick={() => {
                  const next = active ? heard : [...heard, index];
                  setHeard(next);
                  sceneProgress(next.length / 3, mode, kind);
                }}>
                  <i aria-hidden>◌</i>
                  <p>{active ? echo : (zh ? "停下来，听一段回声" : "Stay still and listen to an echo")}</p>
                </button>
              );
            })}
          </div>
        )}

        {mode !== "experiment" && (
          <footer className={styles.footer}>
            <button type="button" className={styles.secondary} onClick={cancel}>{zh ? "先离开" : "Leave for now"}</button>
            <button
              type="button"
              className={styles.primary}
              disabled={
                (mode === "observe" && !observeDone) ||
                (mode === "trace" && !traceDone) ||
                (mode === "compare" && !compareDone) ||
                (mode === "navigate" && !navigateDone) ||
                (mode === "restore" && !restoreDone) ||
                (mode === "listen" && !listenDone)
              }
              onClick={complete}
            >
              {zh ? "收下这块认知碎片" : "Keep this cognition fragment"}
            </button>
          </footer>
        )}
      </section>
    </div>
  );
}
