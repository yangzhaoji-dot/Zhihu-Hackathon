"use client";

import { useTranslation } from "react-i18next";
import type { MatchResult, OpinionMatch } from "@/lib/opinion/types";

function Loading({ label }: { label: string }) {
  return (
    <span className="loading" aria-live="polite">
      <i />
      <i />
      <i />
      {label}
    </span>
  );
}

function MatchCard({ m }: { m: OpinionMatch }) {
  const { t } = useTranslation();
  const initial = m.explorer.name.replace(/^@/, "").slice(0, 1);
  return (
    <div className={`match-card ${m.kind}`}>
      <div className="match-head">
        <span className="avatar" aria-hidden>
          {initial}
        </span>
        <span className="who">
          <b>{m.explorer.name}</b>
          <small>{m.explorer.tagline}</small>
        </span>
        <span className="match-score" aria-label={t("cosmos.matchScore")}>
          {m.score}
        </span>
      </div>
      <p className="match-blurb">{m.blurb}</p>
      <div className="match-meta">
        {m.explorer.leaning && (
          <span className="chip">{m.explorer.leaning}</span>
        )}
        {m.overlap.length > 0 && (
          <span className="chip human">
            {t("cosmos.matchOverlap", { n: m.overlap.length })}
          </span>
        )}
        {m.clash.length > 0 && (
          <span className="chip clash">
            {t("cosmos.matchClash", { n: m.clash.length })}
          </span>
        )}
      </div>
    </div>
  );
}

export function MatchView({
  result,
  loading,
}: {
  result: MatchResult | null;
  loading: boolean;
}) {
  const { t } = useTranslation();

  if (loading || !result) {
    return <Loading label={t("cosmos.matching")} />;
  }

  if (result.markedCount === 0) {
    return <p>{t("cosmos.matchEmpty")}</p>;
  }

  const nothing =
    result.resonate.length === 0 && result.spar.length === 0;
  if (nothing) {
    return <p>{t("cosmos.matchNone")}</p>;
  }

  return (
    <div>
      <p>{t("cosmos.matchIntro", { n: result.markedCount })}</p>

      {result.resonate.length > 0 && (
        <>
          <div className="sec-label">{t("cosmos.matchResonate")}</div>
          {result.resonate.map((m) => (
            <MatchCard key={m.explorer.id} m={m} />
          ))}
        </>
      )}

      {result.spar.length > 0 && (
        <>
          <div className="sec-label">{t("cosmos.matchSpar")}</div>
          {result.spar.map((m) => (
            <MatchCard key={`spar_${m.explorer.id}`} m={m} />
          ))}
        </>
      )}

      <p className="ai-source-flag">
        {result.source === "ai"
          ? t("cosmos.aiSourceAi")
          : t("cosmos.aiSourceFallback")}
      </p>
    </div>
  );
}
