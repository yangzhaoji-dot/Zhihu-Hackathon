"use client";

import { useTranslation } from "react-i18next";
import type { Mode } from "./use-opinion-space";

const LEGEND: { cls: string; key: string }[] = [
  { cls: "l-support", key: "cosmos.legendSupport" },
  { cls: "l-refute", key: "cosmos.legendRefute" },
  { cls: "l-add", key: "cosmos.legendAdd" },
  { cls: "l-cond", key: "cosmos.legendCond" },
  { cls: "l-oppose", key: "cosmos.legendOppose" },
];

export function CosmosChrome({
  mode,
  title,
  hint,
  query,
  searching,
  railOn,
  onModeChange,
  onQueryChange,
  onSearch,
  onRail,
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
  const questionLabel = zh ? "问题星系" : "Question Galaxy";
  const planetLabel = zh ? "观点星球" : "Opinion Planets";
  const searchPlaceholder = zh ? "输入你想探索的问题，或粘贴知乎问题链接" : "Enter a question to explore, or paste a Zhihu question link";
  const searchAction = zh ? "探测星系" : "Probe galaxy";
  const searchingLabel = zh ? "正在探测知乎宇宙" : "Probing Zhihu Universe";
  const defaultQuestionHint = zh
    ? "输入一个问题探测星系，或点击已有星系进入"
    : "Probe a question, or enter an existing galaxy";
  const oldQuestionHint = t("cosmos.hintQuestion");
  const visibleHint = mode === "questions"
    ? (!hint || hint === oldQuestionHint ? defaultQuestionHint : hint)
    : hint;

  return (
    <>
      <div className="topbar">
        <div className="brand">
          <small>{zh ? "知乎宇宙" : "ZHIHU UNIVERSE"}</small>
          <h1 data-el="focus-question">{mode === "questions" ? questionLabel : title}</h1>
        </div>
        <div className="mode" role="tablist" aria-label="layer">
          <button
            className={mode === "questions" ? "active" : ""}
            onClick={() => onModeChange("questions")}
            role="tab"
            aria-selected={mode === "questions"}
          >
            {questionLabel}
          </button>
          {mode === "views" && (
            <button className="active" role="tab" aria-selected="true" disabled>
              {planetLabel}
            </button>
          )}
        </div>
      </div>

      {mode === "questions" && (
        <form className="search" onSubmit={onSearch} data-el="galaxy-search">
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

      {mode === "views" && (
        <div className="rail">
          <button className={railOn === "agentPath" ? "on" : ""} onClick={() => onRail("agentPath")}>{t("cosmos.railAgent")}</button>
          <button className={railOn === "gaps" ? "on" : ""} onClick={() => onRail("gaps")}>{t("cosmos.railGap")}</button>
          <button className={railOn === "match" ? "on" : ""} onClick={() => onRail("match")}>{t("cosmos.railMatch")}</button>
          <button className={railOn === "tint" ? "on" : ""} onClick={() => onRail("tint")}>{t("cosmos.railTint")}</button>
          <button className={railOn === "profile" ? "on" : ""} onClick={() => onRail("profile")}>{t("cosmos.railProfile")}</button>
        </div>
      )}
    </>
  );
}
