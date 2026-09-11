"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CollisionView } from "@/components/cosmos/collision-view";
import type { CollisionAnalysis } from "@/lib/opinion/types";
import styles from "./compare-overlay.module.css";

// 世界内比较面板（world-design-v0.2 §5.4，M3）：
// - 四段式（共识/核心分歧/各自成立条件/证据缺口）复用宇宙层 CollisionView；
// - 世界场景反馈：把 deriveSceneFeedback 命中的规则（桥/迷雾/停工建筑）
//   以提示条形式告知玩家（实际写入 worldStateRef + progress 由页面层完成）；
// - 底部"融合为新观点"由 CollisionView 自带按钮触发 onFuse；
// - Esc 关闭；面板期间页面状态机处于 compare（锁定移动）。

interface CompareOverlayProps {
  aTitle: string;
  bTitle: string;
  analysis: CollisionAnalysis | null;
  analyzing: boolean;
  fusing: boolean;
  /** deriveSceneFeedback().applied 的标签（"bridge" | "fog" | "ruin:<zoneId>"）。 */
  feedbackApplied: string[];
  onFuse: () => void;
  onClose: () => void;
}

export function CompareOverlay({
  aTitle,
  bTitle,
  analysis,
  analyzing,
  fusing,
  feedbackApplied,
  onFuse,
  onClose,
}: CompareOverlayProps) {
  const { t } = useTranslation();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [onClose]);

  const hasBridge = feedbackApplied.includes("bridge");
  const hasFog = feedbackApplied.includes("fog");
  const hasRuin = feedbackApplied.some((tag) => tag.startsWith("ruin:"));

  return (
    <div className={styles.overlay} role="dialog" aria-label={t("world.compare.title")}>
      <div className={styles.panel} data-el="world-compare">
        <header className={styles.head}>
          <h2>{t("world.compare.title")}</h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label={t("world.compare.close")}
          >
            <X size={16} aria-hidden />
          </button>
        </header>

        <div className={styles.body}>
          <CollisionView
            aTitle={aTitle}
            bTitle={bTitle}
            analysis={analysis}
            analyzing={analyzing}
            fusing={fusing}
            onFuse={onFuse}
          />
        </div>

        {(hasBridge || hasFog || hasRuin) && (
          <footer className={styles.feedback}>
            {hasBridge && <p>{t("world.compare.feedbackBridge")}</p>}
            {hasFog && <p>{t("world.compare.feedbackFog")}</p>}
            {hasRuin && <p>{t("world.compare.feedbackRuin")}</p>}
          </footer>
        )}
      </div>
    </div>
  );
}
