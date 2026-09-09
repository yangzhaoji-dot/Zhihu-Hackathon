"use client";

import { useTranslation } from "react-i18next";
import type { CollisionAnalysis } from "@/lib/opinion/types";

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

export function CollisionView({
  aTitle,
  bTitle,
  analysis,
  analyzing,
  fusing,
  onFuse,
}: {
  aTitle: string;
  bTitle: string;
  analysis: CollisionAnalysis | null;
  analyzing: boolean;
  fusing: boolean;
  onFuse: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <p>{t("cosmos.collideVs", { a: aTitle, b: bTitle })}</p>
      {analyzing || !analysis ? (
        <Loading label={t("cosmos.analyzing")} />
      ) : (
        <>
          <div className="analysis">
            <div>
              <b>{t("cosmos.consensus")}</b>
              {analysis.consensus}
            </div>
            <div>
              <b>{t("cosmos.coreDisagreement")}</b>
              {analysis.coreDisagreement}
            </div>
            <div>
              <b>{t("cosmos.conditions")}</b>
              {t("cosmos.condA")}: {analysis.conditions.a}
              <br />
              {t("cosmos.condB")}: {analysis.conditions.b}
            </div>
            <div>
              <b>{t("cosmos.evidence")}</b>
              A: {analysis.evidence.a}
              <br />
              B: {analysis.evidence.b}
              <br />
              {t("cosmos.evidenceVerdict")}: {analysis.evidence.verdict}
            </div>
            <div>
              <b>{t("cosmos.missing")}</b>
              <div className="missing-list">
                {analysis.missing.map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="actions">
            <button className="primary" onClick={onFuse} disabled={fusing}>
              {fusing ? t("cosmos.fusing") : t("cosmos.fuse")}
            </button>
          </div>
          <p className="ai-source-flag">
            {analysis.source === "ai" ? t("cosmos.aiSourceAi") : t("cosmos.aiSourceFallback")}
          </p>
        </>
      )}
    </div>
  );
}
