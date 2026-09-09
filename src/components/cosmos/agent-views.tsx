"use client";

import { useTranslation } from "react-i18next";
import type { StanceProfile } from "@/lib/api/opinion";

export function AgentTextView({
  body,
  items,
  source,
}: {
  body?: string;
  items?: string[];
  source?: "ai" | "fallback";
}) {
  const { t } = useTranslation();
  return (
    <div>
      {body && <p>{body}</p>}
      {items && items.length > 0 && (
        <div className="analysis">
          {items.map((g) => (
            <div key={g}>{g}</div>
          ))}
        </div>
      )}
      {source && (
        <p className="ai-source-flag">
          {source === "ai" ? t("cosmos.aiSourceAi") : t("cosmos.aiSourceFallback")}
        </p>
      )}
    </div>
  );
}

export function ProfileView({
  profile,
  titleOf,
}: {
  profile: StanceProfile | null;
  titleOf: (id: string) => string;
}) {
  const { t } = useTranslation();
  if (!profile || (!profile.agree.length && !profile.disagree.length && !profile.neutral.length)) {
    return <p>{t("cosmos.profileEmpty")}</p>;
  }
  return (
    <div>
      {profile.leaning && (
        <div className="profile-line">
          <span className="pf">
            {t("cosmos.profileLeaning")}: {profile.leaning}
          </span>
          <span className="pf">{t("cosmos.profileAgree", { n: profile.agree.length })}</span>
          <span className="pf">{t("cosmos.profileDisagree", { n: profile.disagree.length })}</span>
          <span className="pf">{t("cosmos.profileNeutral", { n: profile.neutral.length })}</span>
        </div>
      )}
      {profile.agree.length > 0 && (
        <>
          <div className="sec-label">{t("cosmos.stanceAgree")}</div>
          <div className="analysis">
            {profile.agree.map((id) => (
              <div key={id}>{titleOf(id)}</div>
            ))}
          </div>
        </>
      )}
      {profile.disagree.length > 0 && (
        <>
          <div className="sec-label">{t("cosmos.stanceDisagree")}</div>
          <div className="analysis">
            {profile.disagree.map((id) => (
              <div key={id}>{titleOf(id)}</div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
