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

/**
 * The fixed chrome around the canvas: brand + mode switch, semantic search,
 * live Zhihu topic builder, relation legend, agent rail, and zoom controls. Kept separate from the
 * stateful CosmosApp so each file stays reviewable.
 */
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
  const { t } = useTranslation();

  return (
    <>
      <div className="topbar">
        <div className="brand">
          <small>{t("cosmos.brand")}</small>
          <h1 data-el="focus-question">{title}</h1>
        </div>
        <div className="mode" role="tablist" aria-label="layer">
          <button
            className={mode === "questions" ? "active" : ""}
            onClick={() => onModeChange("questions")}
            role="tab"
            aria-selected={mode === "questions"}
          >
            {t("cosmos.modeQuestion")}
          </button>
          <button
            className={mode === "views" ? "active" : ""}
            onClick={() => onModeChange("views")}
            role="tab"
            aria-selected={mode === "views"}
          >
            {t("cosmos.modeView")}
          </button>
        </div>
      </div>

      {mode === "views" && (
        <form className="search" onSubmit={onSearch} data-el="opinion-search">
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            aria-label={t("cosmos.searchPlaceholder")}
            placeholder={t("cosmos.searchPlaceholder")}
          />
          <button type="submit" disabled={searching}>
            {searching ? t("cosmos.searching") : t("cosmos.searchBtn")}
          </button>
        </form>
      )}

      {hint && <div className="hint">{hint}</div>}

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
          <button onClick={() => onZoom(1.15)} aria-label={t("cosmos.zoomIn")}>
            +
          </button>
          <button onClick={() => onZoom(1 / 1.15)} aria-label={t("cosmos.zoomOut")}>
            −
          </button>
        </div>
      )}

      <div className="rail">
        <button
          className={railOn === "agentPath" ? "on" : ""}
          onClick={() => onRail("agentPath")}
        >
          {t("cosmos.railAgent")}
        </button>
        <button className={railOn === "gaps" ? "on" : ""} onClick={() => onRail("gaps")}>
          {t("cosmos.railGap")}
        </button>
        <button
          className={railOn === "match" ? "on" : ""}
          onClick={() => onRail("match")}
        >
          {t("cosmos.railMatch")}
        </button>
        <button
          className={railOn === "tint" ? "on" : ""}
          onClick={() => onRail("tint")}
        >
          {t("cosmos.railTint")}
        </button>
        <button
          className={railOn === "profile" ? "on" : ""}
          onClick={() => onRail("profile")}
        >
          {t("cosmos.railProfile")}
        </button>
      </div>
    </>
  );
}
