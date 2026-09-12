"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import type { QuestionNetwork } from "@/lib/opinion/types";
import styles from "./question-layer.module.css";

const KIND_LABEL: Record<string, string> = {
  related: "相关问题",
  sub: "子问题",
  prerequisite: "前置问题",
  extension: "延伸问题",
  temporal: "同源议题",
};

export function QuestionLayer({
  network,
  onEnter,
}: {
  network: QuestionNetwork;
  onEnter: (questionId: string, title: string) => void;
}) {
  const { i18n } = useTranslation();
  const wrapRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const layer = lineRef.current;
    if (!wrap || !layer) return;
    const draw = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      layer.innerHTML = "";
      const byId = new Map(network.questions.map((q) => [q.id, q]));
      for (const r of network.relations) {
        const a = byId.get(r.from);
        const b = byId.get(r.to);
        if (!a || !b) continue;
        const x1 = a.x * w;
        const y1 = a.y * h;
        const x2 = b.x * w;
        const y2 = b.y * h;
        const e = document.createElement("div");
        e.className = `link ${r.type}`;
        e.style.left = `${x1}px`;
        e.style.top = `${y1}px`;
        e.style.width = `${Math.hypot(x2 - x1, y2 - y1)}px`;
        e.style.transform = `rotate(${Math.atan2(y2 - y1, x2 - x1)}rad)`;
        e.style.transformOrigin = "left center";
        layer.appendChild(e);
      }
    };
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [network]);

  const isZh = i18n.language.startsWith("zh");
  const maxAnswers = Math.max(1, ...network.questions.map((q) => q.answerCount ?? 0));

  return (
    <div ref={wrapRef} style={{ position: "absolute", inset: 0 }}>
      <div ref={lineRef} style={{ position: "absolute", inset: 0 }} aria-hidden />
      {network.questions.map((q) => {
        const answerGlow = Math.min(.68, .16 + ((q.answerCount ?? 0) / maxAnswers) * .42);
        return (
          <button
            key={q.id}
            className={`question-node ${styles.galaxy} ${q.core ? `core ${styles.coreGalaxy}` : ""}`}
            style={{
              left: `calc(${q.x * 100}% - ${q.core ? 98 : 84}px)`,
              top: `calc(${q.y * 100}% - 36px)`,
              "--answer-glow": answerGlow,
            } as CSSProperties}
            onClick={() => {
              if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate([7, 24, 10]);
              onEnter(q.id, q.title);
            }}
          >
            <span className={styles.visual} aria-hidden><i /><b /><em /><span className={styles.arm} /></span>
            <span className={styles.answerGlow} aria-hidden />
            {q.kind && (
              <span className="q-kind">
                {KIND_LABEL[q.kind] ?? ""}
                {q.era ? ` · ${q.era}` : ""}
              </span>
            )}
            {q.title}
            {typeof q.answerCount === "number" && (
              <span className="q-count">
                {isZh
                  ? `${q.answerCount.toLocaleString("zh-CN")} 个回答`
                  : `${q.answerCount.toLocaleString("en-US")} answers`}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
