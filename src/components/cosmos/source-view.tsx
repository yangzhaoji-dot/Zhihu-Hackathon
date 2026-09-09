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
  const relationCounts = related.reduce<Record<RelationType, number>>((counts, item) => {
    counts[item.type] = (counts[item.type] ?? 0) + 1;
    return counts;
  }, { support: 0, refute: 0, add: 0, cond: 0, oppose: 0 });

  return (
    <div>
      <div className="planet-profile" data-el="opinion-planet-profile">
        <div className="planet-kicker">{t("cosmos.planetKicker")}</div>
        <h3>{opinion.title}</h3>
        <p className="planet-summary">{opinion.summary}</p>
        <div className="planet-stats">
          <span><b>{sources.length}</b>{t("cosmos.planetSources")}</span>
          <span><b>{related.length}</b>{t("cosmos.planetRoutes")}</span>
          <span><b>{opinion.camp ?? t("cosmos.planetUnclassified")}</b>{t("cosmos.planetCamp")}</span>
        </div>
      </div>
      <p className="planet-provenance">
        {isAi ? t("cosmos.kindAiDesc") : t("cosmos.kindHumanDesc")}
      </p>
      {opinion.claim && (
        <div className="planet-fact">
          <div className="sec-label">{t("cosmos.planetClaim")}</div>
          <p>{opinion.claim}</p>
        </div>
      )}
      {opinion.reason && (
        <div className="planet-fact">
          <div className="sec-label">{t("cosmos.planetReason")}</div>
          <p>{opinion.reason}</p>
        </div>
      )}
      {opinion.conditions && opinion.conditions.length > 0 && (
        <div className="planet-fact">
          <div className="sec-label">{t("cosmos.planetConditions")}</div>
          <div className="analysis">
            {opinion.conditions.map((condition) => <div key={condition}>{condition}</div>)}
          </div>
        </div>
      )}
      {opinion.evidence && opinion.evidence.length > 0 && (
        <div className="planet-fact">
          <div className="sec-label">{t("cosmos.planetEvidence")}</div>
          <div className="evidence">
            {opinion.evidence.map((evidence) => <span key={evidence}>{evidence}</span>)}
          </div>
        </div>
      )}
      <div className="meta">
        <span className="chip">{t("cosmos.supportDeg", { n: opinion.support })}</span>
        <span className="chip">{t("cosmos.sourceCount", { n: sources.length })}</span>
        <span className={`chip ${isAi ? "ai" : "human"}`}>
          {isAi ? t("cosmos.ai") : t("cosmos.human")}
        </span>
      </div>
      {related.length > 0 && (
        <div className="planet-routes">
          <div className="sec-label">{t("cosmos.planetRoutesTitle")}</div>
          <div className="planet-route-chips">
            {(Object.keys(relationCounts) as RelationType[])
              .filter((type) => relationCounts[type] > 0)
              .map((type) => (
                <span key={type} className={`route-chip route-${type}`}>
                  {t(REL_LABEL[type])} · {relationCounts[type]}
                </span>
              ))}
          </div>
        </div>
      )}

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
          <div className="sec-label">{t("cosmos.planetMiningTitle")}</div>
          <p className="mining-hint">{t("cosmos.planetMiningHint")}</p>
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
