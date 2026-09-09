"use client";

import { useTranslation } from "react-i18next";
import type { SourceTrace, StanceProfile } from "@/lib/api/opinion";
import type { RelationType, Stance } from "@/lib/opinion/types";
import { SourceCard } from "./source-card";

const REL_LABEL: Record<RelationType, string> = {
  support: "cosmos.legendSupport",
  refute: "cosmos.legendRefute",
  add: "cosmos.legendAdd",
  cond: "cosmos.legendCond",
  oppose: "cosmos.legendOppose",
};

export function SourceView({
  trace,
  profile,
  onStance,
  onOpenRelated,
}: {
  trace: SourceTrace;
  profile: StanceProfile | null;
  onStance: (stance: Stance) => void;
  onOpenRelated: (opinionId: string) => void;
}) {
  const { t } = useTranslation();
  const { opinion, sources, authors, related } = trace;
  const isAi = opinion.kind === "ai";
  const current = profile?.stances?.[opinion.id];
  const authorOf = (id: string) => authors.find((a) => a.id === id);

  return (
    <div>
      <p>{isAi ? t("cosmos.kindAiDesc") : t("cosmos.kindHumanDesc")}</p>
      <div className="meta">
        <span className="chip">{t("cosmos.supportDeg", { n: opinion.support })}</span>
        <span className="chip">{t("cosmos.sourceCount", { n: sources.length })}</span>
        <span className={`chip ${isAi ? "ai" : "human"}`}>
          {isAi ? t("cosmos.ai") : t("cosmos.human")}
        </span>
      </div>
      <p className="quote">“{opinion.summary}”</p>

      {/* personal stance */}
      <div className="actions">
        {(["agree", "disagree", "neutral"] as Stance[]).map((s) => (
          <button
            key={s}
            className={current === s ? `on-${s}` : ""}
            onClick={() => onStance(s)}
          >
            {t(`cosmos.stance${s[0].toUpperCase()}${s.slice(1)}`)}
          </button>
        ))}
      </div>

      {sources.length > 0 && (
        <>
          <div className="sec-label">{t("cosmos.secSources")}</div>
          {sources.map((s) => (
            <SourceCard key={s.id} source={s} author={authorOf(s.authorId)} />
          ))}
        </>
      )}

      {related.length > 0 && (
        <>
          <div className="sec-label">{t("cosmos.secRelated")}</div>
          <div className="related-row">
            {related.map((r) => (
              <button key={r.opinion.id} onClick={() => onOpenRelated(r.opinion.id)}>
                <span className="rel-tag">{t(REL_LABEL[r.type])}</span>
                {r.opinion.title}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
