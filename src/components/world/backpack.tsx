"use client";

import { Backpack as BackpackIcon, FileText, Swords, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Opinion } from "@/lib/opinion/types";
import styles from "./backpack.module.css";

// 观点卡背包（world-design-v0.2 §5.3，M3）：
// - 右下常驻入口 + 已收集计数徽标；
// - 卡片：title / camp / support / 来源数 / kind（AI 卡半透明描边）；
// - 单卡"查看原文"；勾选两张卡出现"碰撞比较"按钮（§5.4 入口）。

export interface BackpackCard {
  opinion: Opinion;
  sourceCount: number;
}

interface BackpackPanelProps {
  open: boolean;
  onToggleOpen: () => void;
  cards: BackpackCard[];
  selected: string[];
  onToggleSelect: (opinionId: string) => void;
  onViewSource: (opinionId: string) => void;
  onCompare: (aId: string, bId: string) => void;
}

export function WorldBackpack({
  open,
  onToggleOpen,
  cards,
  selected,
  onToggleSelect,
  onViewSource,
  onCompare,
}: BackpackPanelProps) {
  const { t } = useTranslation();
  const canCompare = selected.length === 2;

  return (
    <>
      <button
        type="button"
        className={styles.fab}
        onClick={onToggleOpen}
        aria-label={t("world.backpack.open")}
        data-el="world-backpack-fab"
      >
        <BackpackIcon size={20} aria-hidden />
        <span className={styles.badge}>{cards.length}</span>
      </button>

      {open && (
        <section
          className={styles.panel}
          aria-label={t("world.backpack.title")}
          data-el="world-backpack"
        >
          <header className={styles.panelHead}>
            <h2>{t("world.backpack.title")}</h2>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onToggleOpen}
              aria-label={t("world.backpack.close")}
            >
              <X size={15} aria-hidden />
            </button>
          </header>

          {cards.length === 0 ? (
            <p className={styles.empty}>{t("world.backpack.empty")}</p>
          ) : (
            <ul className={styles.cards}>
              {cards.map(({ opinion, sourceCount }) => {
                const checked = selected.includes(opinion.id);
                return (
                  <li
                    key={opinion.id}
                    className={`${styles.card} ${opinion.kind === "ai" ? styles.cardAi : ""} ${
                      checked ? styles.cardSelected : ""
                    }`}
                  >
                    <label className={styles.cardCheck}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleSelect(opinion.id)}
                      />
                      <span className={styles.cardTitle}>{opinion.title}</span>
                    </label>
                    <div className={styles.cardMeta}>
                      {opinion.camp && <span className={styles.camp}>{opinion.camp}</span>}
                      <span>{t("world.backpack.support", { support: opinion.support })}</span>
                      <span>{t("world.backpack.sources", { count: sourceCount })}</span>
                      <span className={opinion.kind === "ai" ? styles.kindAi : undefined}>
                        {t(opinion.kind === "ai" ? "world.backpack.aiKind" : "world.backpack.humanKind")}
                      </span>
                    </div>
                    <div className={styles.cardActions}>
                      <button type="button" onClick={() => onViewSource(opinion.id)}>
                        <FileText size={13} aria-hidden />
                        {t("world.backpack.viewSource")}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <footer className={styles.panelFoot}>
            <button
              type="button"
              className={styles.compareBtn}
              disabled={!canCompare}
              onClick={() => canCompare && onCompare(selected[0], selected[1])}
            >
              <Swords size={15} aria-hidden />
              {t("world.backpack.compare")}
            </button>
            {!canCompare && cards.length > 0 && (
              <small>{t("world.backpack.compareHint")}</small>
            )}
          </footer>
        </section>
      )}
    </>
  );
}
