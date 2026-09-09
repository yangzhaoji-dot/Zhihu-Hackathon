"use client";

import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { QuestionNetwork } from "@/lib/opinion/types";

const KIND_LABEL: Record<string, string> = {
  related: "相关问题",
  sub: "子问题",
  prerequisite: "前置问题",
  extension: "延伸问题",
  temporal: "同源议题",
};

/**
 * Layer 1 — the global question network. Rendered declaratively (no drag
 * physics needed here); tapping a question enters its opinion space.
 */
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

  // draw relation lines between core and each question
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

  return (
    <div ref={wrapRef} style={{ position: "absolute", inset: 0 }}>
      <div ref={lineRef} style={{ position: "absolute", inset: 0 }} aria-hidden />
      {network.questions.map((q) => (
        <button
          key={q.id}
          className={`question-node ${q.core ? "core" : ""}`}
          style={{
            left: `calc(${q.x * 100}% - ${q.core ? 98 : 84}px)`,
            top: `calc(${q.y * 100}% - 36px)`,
          }}
          onClick={() => onEnter(q.id, q.title)}
        >
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
      ))}
    </div>
  );
}
