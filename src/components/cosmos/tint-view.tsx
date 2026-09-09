"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TintAnalysis, TintedOpinion, TintStance } from "@/lib/opinion/types";

const STANCE_CLASS: Record<TintStance, string> = {
  for: "s-for",
  against: "s-against",
  conditional: "s-cond",
  neutral: "s-neutral",
};

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

function TintOpinion({ o }: { o: TintedOpinion }) {
  const { t } = useTranslation();
  return (
    <div className={`tint-op ${STANCE_CLASS[o.stance]}`}>
      <div className="tint-op-head">
        <span className="tint-stance">{t(`cosmos.tintStance_${o.stance}`)}</span>
        <span className="tint-type">{o.type}</span>
        {o.relation && (
          <span className="tint-rel">{t(`cosmos.legend${cap(o.relation)}`)}</span>
        )}
        <span className="tint-strength" aria-label={t("cosmos.tintStrength")}>
          {o.strength}
        </span>
      </div>
      <p className="tint-text">{o.text}</p>
      {o.evidence.length > 0 && (
        <div className="evidence">
          {o.evidence.map((e) => (
            <span key={e}>{e}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function TintView({
  result,
  loading,
  onAnalyze,
}: {
  result: TintAnalysis | null;
  loading: boolean;
  onAnalyze: (text: string, url: string) => void;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");

  return (
    <div className="tint">
      <p>{t("cosmos.tintIntro")}</p>
      <textarea
        className="tint-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("cosmos.tintTextPlaceholder")}
        rows={4}
        aria-label={t("cosmos.tintTextPlaceholder")}
      />
      <input
        className="tint-url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={t("cosmos.tintUrlPlaceholder")}
        aria-label={t("cosmos.tintUrlPlaceholder")}
      />
      <div className="actions">
        <button
          className="primary"
          disabled={loading || text.trim().length < 10}
          onClick={() => onAnalyze(text.trim(), url.trim())}
        >
          {loading ? t("cosmos.tintAnalyzing") : t("cosmos.tintAnalyze")}
        </button>
      </div>

      {loading && <Loading label={t("cosmos.tintAnalyzing")} />}

      {result && !loading && (
        <div className="tint-result">
          <div className="sec-label">{t("cosmos.tintQuestion")}</div>
          <p className="quote">{result.question}</p>
          <p>{result.stanceSummary}</p>

          {result.camps.length > 0 && (
            <div className="tint-camps">
              {result.camps.map((c) => (
                <span key={c.label} className={`tint-camp ${STANCE_CLASS[c.stance]}`}>
                  {c.label} · {c.count}
                </span>
              ))}
            </div>
          )}

          <div className="sec-label">{t("cosmos.tintOpinions")}</div>
          {result.opinions.map((o) => (
            <TintOpinion key={o.id} o={o} />
          ))}

          {result.blindSpots.length > 0 && (
            <>
              <div className="sec-label">{t("cosmos.tintBlindSpots")}</div>
              <div className="missing-list">
                {result.blindSpots.map((b) => (
                  <span key={b}>{b}</span>
                ))}
              </div>
            </>
          )}

          <p className="ai-source-flag">
            {result.source === "ai"
              ? t("cosmos.aiSourceAi")
              : t("cosmos.aiSourceFallback")}
          </p>
        </div>
      )}
    </div>
  );
}
