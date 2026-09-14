"use client";

import { useTranslation } from "react-i18next";
import type { ZhihuQuestionCandidate } from "@/lib/api/opinion";
import styles from "./question-picker-view.module.css";

function tactile(pattern: number | number[] = 8) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
}

export function QuestionPickerView({
  questions,
  loading,
  onSelect,
}: {
  questions: ZhihuQuestionCandidate[];
  loading: boolean;
  onSelect: (question: ZhihuQuestionCandidate) => void;
}) {
  const { t, i18n } = useTranslation();
  const zh = i18n.resolvedLanguage !== "en-US";
  return (
    <div className={styles.picker}>
      <p className={styles.intro}>{t("cosmos.questionPickerIntro")}</p>
      <div className={styles.list}>
        {questions.map((question) => (
          <button
            key={question.url}
            disabled={loading}
            onClick={() => {
              tactile([8, 28, 12]);
              onSelect(question);
            }}
            data-el="question-choice"
            className={styles.signal}
          >
            <span className={styles.pulse} aria-hidden><span /></span>
            <span className={styles.copy}>
              <b>{question.title}</b>
              <small>{t("cosmos.questionPickerSource", { n: question.sourceCount })}</small>
            </span>
            <span className={styles.lock}>{zh ? "锁定星系" : "Lock galaxy"}</span>
          </button>
        ))}
      </div>
      {loading && <p className={styles.loading}>{t("cosmos.questionBuilding")}</p>}
    </div>
  );
}
