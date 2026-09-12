"use client";

import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import formationStyles from "./galaxy-formation.module.css";
import type { Mode } from "./use-opinion-space";

const LEGEND: { cls: string; key: string }[] = [
  { cls: "l-support", key: "cosmos.legendSupport" },
  { cls: "l-refute", key: "cosmos.legendRefute" },
  { cls: "l-add", key: "cosmos.legendAdd" },
  { cls: "l-cond", key: "cosmos.legendCond" },
  { cls: "l-oppose", key: "cosmos.legendOppose" },
];

const FORMATION_SIGNALS = [
  ["-82px", "-34px", "0ms"],
  ["72px", "-46px", "210ms"],
  ["94px", "24px", "420ms"],
  ["-69px", "38px", "610ms"],
  ["17px", "-74px", "830ms"],
  ["-8px", "66px", "1040ms"],
] as const;

export function CosmosChrome({
  mode,
  title,
  hint,
  query,
  searching,
  onModeChange,
  onQueryChange,
  onSearch,
  onZoom,
}: {
  mode: Mode;
  title: string;
  hint: string;
  query: string;
  searching: boolean;
  railOn: string | null;
  onModeChange: (m: Mode) => void;
  onQueryChange: (v: string) => void;
  onSearch: (e: React.FormEvent) => void;
  onRail: (which: "agentPath" | "gaps" | "profile" | "match" | "tint") => void;
  onZoom: (factor: number) => void;
}) {
  const { t, i18n } = useTranslation();
  const zh = i18n.resolvedLanguage !== "en-US";
  const questionLabel = zh ? "问题宇宙" : "Question Universe";
  const planetLabel = zh ? "观点星系" : "Opinion System";
  const searchPlaceholder = zh ? "搜索一个你想进入的问题……" : "Search for a question to enter…";
  const searchAction = zh ? "定位" : "Locate";
  const searchingLabel = zh ? "定位中" : "Locating";
  const defaultQuestionHint = zh
    ? "点击一个问题星系进入 · 拖动观察宇宙"
    : "Enter a question galaxy · drag to explore";
  const oldQuestionHint = t("cosmos.hintQuestion");
  const visibleHint = mode === "questions"
    ? (!hint || hint === oldQuestionHint ? defaultQuestionHint : hint)
    : hint;

  return (
    <>
      <div className="topbar">
        <button className="brand" type="button" onClick={() => onModeChange("questions")}>
          <small>{zh ? "知乎宇宙" : "ZHIHU UNIVERSE"}</small>
          <span>{mode === "questions" ? questionLabel : planetLabel}</span>
        </button>

        {mode === "views" && (
          <div className="current-system">
            <small>{zh ? "当前问题星系" : "CURRENT QUESTION GALAXY"}</small>
            <strong data-el="focus-question">{title}</strong>
          </div>
        )}
      </div>

      {mode === "questions" && (
        <form className="search" onSubmit={onSearch} data-el="galaxy-search">
          <Search size={15} aria-hidden />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            aria-label={searchPlaceholder}
            placeholder={searchPlaceholder}
          />
          <button type="submit" disabled={searching}>
            {searching ? searchingLabel : searchAction}
          </button>
        </form>
      )}

      {visibleHint && <div className="hint">{visibleHint}</div>}

      {mode === "views" && (
        <div className="legend" aria-hidden>
          {LEGEND.map((l) => (
            <span key={l.cls} className={l.cls}>
              <i />
              {t(l.key)}
            </span>
          ))}
        </div>
      )}

      {mode === "views" && (
        <div className="zoom">
          <button onClick={() => onZoom(1.15)} aria-label={t("cosmos.zoomIn")}>+</button>
          <button onClick={() => onZoom(1 / 1.15)} aria-label={t("cosmos.zoomOut")}>−</button>
        </div>
      )}

      {searching && mode === "questions" && (
        <div className={formationStyles.overlay} role="status" aria-live="polite" data-el="galaxy-formation">
          <div className={formationStyles.core}>
            <div className={formationStyles.orbit} aria-hidden />
            <div className={formationStyles.orbit2} aria-hidden />
            <div className={formationStyles.orbit3} aria-hidden />
            <div className={formationStyles.star} aria-hidden />
            <div className={formationStyles.signals} aria-hidden>
              {FORMATION_SIGNALS.map(([x, y, delay], index) => (
                <i
                  key={index}
                  style={{
                    "--sx": x,
                    "--sy": y,
                    "--delay": delay,
                  } as React.CSSProperties}
                />
              ))}
            </div>
            <div className={formationStyles.copy}>
              <strong>{zh ? "正在从旧知乎档案恢复问题星系" : "Recovering a question galaxy from the old Zhihu archive"}</strong>
              <span>{query || (zh ? "正在锁定问题信号" : "Locking question signal")}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
