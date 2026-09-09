"use client";

import { useTranslation } from "react-i18next";
import type {
  SourceTrace,
  StanceProfile,
  ZhihuQuestionCandidate,
} from "@/lib/api/opinion";
import type {
  CollisionAnalysis,
  MatchResult,
  Stance,
  TintAnalysis,
} from "@/lib/opinion/types";
import { SourceView } from "./source-view";
import { CollisionView } from "./collision-view";
import { AgentTextView, ProfileView } from "./agent-views";
import { MatchView } from "./match-view";
import { TintView } from "./tint-view";
import { QuestionPickerView } from "./question-picker-view";

export type PanelData =
  | { type: "source"; trace: SourceTrace }
  | {
      type: "collision";
      aId: string;
      bId: string;
      aTitle: string;
      bTitle: string;
      analysis: CollisionAnalysis | null;
      analyzing: boolean;
      fusing: boolean;
    }
  | { type: "agentPath"; body: string; source: "ai" | "fallback" }
  | { type: "gaps"; items: string[]; source: "ai" | "fallback" }
  | { type: "profile" }
  | { type: "match"; result: MatchResult | null; loading: boolean }
  | { type: "tint"; result: TintAnalysis | null; loading: boolean }
  | {
      type: "questionPicker";
      query: string;
      questions: ZhihuQuestionCandidate[];
      loading: boolean;
    };

export function DetailPanel({
  data,
  profile,
  titleOf,
  onClose,
  onStance,
  onOpenRelated,
  onFuse,
  onAnalyzeTint,
  onSelectQuestion,
}: {
  data: PanelData | null;
  profile: StanceProfile | null;
  titleOf: (id: string) => string;
  onClose: () => void;
  onStance: (opinionId: string, stance: Stance) => void;
  onOpenRelated: (opinionId: string) => void;
  onFuse: () => void;
  onAnalyzeTint: (text: string, url: string) => void;
  onSelectQuestion: (question: ZhihuQuestionCandidate) => void;
}) {
  const { t } = useTranslation();

  const heading = data
    ? {
        source: data.type === "source" ? data.trace.opinion.title : "",
        collision: t("cosmos.collideTitle"),
        agentPath: t("cosmos.agentPathTitle"),
        gaps: t("cosmos.gapTitle"),
        profile: t("cosmos.profileTitle"),
        match: t("cosmos.matchTitle"),
        tint: t("cosmos.tintTitle"),
        questionPicker: t("cosmos.questionPickerTitle"),
      }[data.type]
    : "";

  return (
    <aside
      className={`panel ${data ? "open" : ""} ${data?.type === "source" ? "planet-panel" : ""} ${data?.type === "questionPicker" ? "question-picker-panel" : ""}`}
      aria-live="polite"
      data-el="detail-panel"
    >
      {data && (
        <>
          <div className="panel-head">
            <h2>{heading}</h2>
            <button className="close" onClick={onClose} aria-label={t("common.close")}>
              ×
            </button>
          </div>

          {data.type === "source" && (
            <SourceView
              trace={data.trace}
              profile={profile}
              onStance={(s) => onStance(data.trace.opinion.id, s)}
              onOpenRelated={onOpenRelated}
            />
          )}

          {data.type === "collision" && (
            <CollisionView
              aTitle={data.aTitle}
              bTitle={data.bTitle}
              analysis={data.analysis}
              analyzing={data.analyzing}
              fusing={data.fusing}
              onFuse={onFuse}
            />
          )}

          {data.type === "agentPath" && (
            <AgentTextView body={data.body} source={data.source} />
          )}

          {data.type === "gaps" && (
            <AgentTextView items={data.items} source={data.source} />
          )}

          {data.type === "profile" && (
            <ProfileView profile={profile} titleOf={titleOf} />
          )}

          {data.type === "match" && (
            <MatchView result={data.result} loading={data.loading} />
          )}

          {data.type === "tint" && (
            <TintView
              result={data.result}
              loading={data.loading}
              onAnalyze={onAnalyzeTint}
            />
          )}

          {data.type === "questionPicker" && (
            <QuestionPickerView
              questions={data.questions}
              loading={data.loading}
              onSelect={onSelectQuestion}
            />
          )}
        </>
      )}
    </aside>
  );
}
