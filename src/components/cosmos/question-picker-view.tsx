"use client";

import { useTranslation } from "react-i18next";
import type { ZhihuQuestionCandidate } from "@/lib/api/opinion";

export function QuestionPickerView({
  questions,
  loading,
  onSelect,
}: {
  questions: ZhihuQuestionCandidate[];
  loading: boolean;
  onSelect: (question: ZhihuQuestionCandidate) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="question-picker">
      <p>{t("cosmos.questionPickerIntro")}</p>
      <div className="question-choice-list">
        {questions.map((question, index) => (
          <button
            key={question.url}
            disabled={loading}
            onClick={() => onSelect(question)}
            data-el="question-choice"
          >
            <span className="question-choice-index">{index + 1}</span>
            <span>
              <b>{question.title}</b>
              <small>{t("cosmos.questionPickerSource", { n: question.sourceCount })}</small>
            </span>
          </button>
        ))}
      </div>
      {loading && <p className="question-picker-loading">{t("cosmos.questionBuilding")}</p>}
    </div>
  );
}
