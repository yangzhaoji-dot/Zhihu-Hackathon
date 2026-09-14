"use client";

import { ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { GuideAvatar } from "@/components/opinion-world/guide-avatar";
import type { Author, DialogueAction, DialogueLine, OpinionSource } from "@/lib/opinion/types";
import styles from "./dialogue-overlay.module.css";

// 对话 UI 容器（world-design-v0.2 §5.6 / M2）：
// - 逐行显示、任意键/点击快进、Esc 关闭；
// - actions：show-source 弹原文卡（直接读 OpinionSource 数据，不经 AI）；
//   collect-opinion / open-compare / open-stance 在 M2 由 onAction 上抛
//   （页面层显示"即将上线" toast，M3/M4 实现）；
// - 对话期间页面层状态机处于 dialogue，移动被锁定。

export interface ResolvedDialogueLine extends DialogueLine {
  /** 插值后的最终文本（页面层负责填 Opinion/OpinionSource 数据）。 */
  text: string;
}

export interface SourceCardData {
  source: OpinionSource;
  author?: Author;
}

interface DialogueOverlayProps {
  lines: ResolvedDialogueLine[];
  /** npc 台词的说话人展示名（角色身份，如「车站管理员」）。 */
  npcLabel: string;
  /** 副标题（观点标题 / 世界名）。 */
  subtitle?: string;
  /** npc 立绘（无立绘传空串，画占位圆块）。 */
  npcSprite?: string;
  accent?: string;
  onAction: (action: DialogueAction) => void;
  onClose: () => void;
  /** 按 sourceId 解析来源卡数据；返回 null 的动作按钮不渲染。 */
  resolveSource: (sourceId: string) => SourceCardData | null;
}

export function DialogueOverlay({
  lines,
  npcLabel,
  subtitle,
  npcSprite,
  accent,
  onAction,
  onClose,
  resolveSource,
}: DialogueOverlayProps) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [openedSourceId, setOpenedSourceId] = useState<string | null>(null);

  const line = lines[Math.min(index, lines.length - 1)];
  const isLast = index >= lines.length - 1;

  const advance = useCallback(() => {
    if (openedSourceId) {
      setOpenedSourceId(null);
      return;
    }
    if (isLast) onClose();
    else setIndex((i) => i + 1);
  }, [isLast, onClose, openedSourceId]);

  const rewind = useCallback(() => {
    if (openedSourceId) {
      setOpenedSourceId(null);
      return;
    }
    setIndex((i) => Math.max(0, i - 1));
  }, [openedSourceId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        rewind();
        return;
      }
      event.preventDefault();
      advance();
    };
    // capture 阶段接管键盘，避免世界页的移动键监听同时响应。
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [advance, onClose, rewind]);

  const visibleActions = useMemo(
    () =>
      (line?.actions ?? []).filter(
        (action) => action.type !== "show-source" || resolveSource(action.sourceId) !== null,
      ),
    [line, resolveSource],
  );

  const opened = openedSourceId ? resolveSource(openedSourceId) : null;

  if (!line) return null;

  const speakerLabel =
    line.speaker === "guide"
      ? t("world.guideName")
      : line.speaker === "player"
        ? t("world.dialogueUi.you")
        : npcLabel;

  return (
    <div className={styles.overlay} role="dialog" aria-label={speakerLabel} onClick={advance}>
      {opened && (
        <div className={styles.sourcePop} onClick={(e) => e.stopPropagation()}>
          <div className={styles.sourceCard}>
            <div className={styles.sourceHead}>
              <span className={styles.sourceAvatar} aria-hidden>
                {opened.author?.name?.replace(/^@/, "").slice(0, 1) ?? "?"}
              </span>
              <span className={styles.sourceWho}>
                <b>{opened.author?.name ?? "—"}</b>
                <small>{opened.author?.title ?? ""}</small>
              </span>
              <span className={styles.sourceUp}>
                {t("cosmos.upvotes", { n: opened.source.upvotes.toLocaleString("zh-CN") })}
              </span>
              <button
                type="button"
                className={styles.sourceClose}
                onClick={() => setOpenedSourceId(null)}
                aria-label={t("world.dialogueUi.close")}
              >
                <X size={14} aria-hidden />
              </button>
            </div>
            <p className={styles.sourceExcerpt}>{opened.source.excerpt}</p>
            {opened.source.evidence && opened.source.evidence.length > 0 && (
              <div className={styles.sourceEvidence}>
                {opened.source.evidence.map((e) => (
                  <span key={e}>{e}</span>
                ))}
              </div>
            )}
            <a className={styles.sourceLink} href={opened.source.url} target="_blank" rel="noreferrer">
              {t("world.openSource")}
              <ExternalLink size={13} aria-hidden />
            </a>
          </div>
        </div>
      )}

      <div className={styles.box}>
        {line.speaker === "guide" ? (
          <GuideAvatar accent={accent} label={t("world.guideAvatarLabel")} />
        ) : line.speaker === "npc" && npcSprite ? (
          <Image className={styles.speakerSprite} src={npcSprite} alt="" width={52} height={78} sizes="52px" />
        ) : line.speaker === "npc" ? (
          <span className={styles.speakerBlob} style={accent ? { background: accent } : undefined} aria-hidden>
            {npcLabel.slice(0, 1)}
          </span>
        ) : null}

        <div className={styles.body}>
          <span className={styles.speaker}>
            {speakerLabel}
            {subtitle ? <em>{subtitle}</em> : null}
          </span>
          <p className={styles.text}>{line.text}</p>

          {visibleActions.length > 0 && (
            <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
              {visibleActions.map((action, i) => (
                <button
                  key={`${action.type}-${i}`}
                  type="button"
                  onClick={() => {
                    if (action.type === "show-source") setOpenedSourceId(action.sourceId);
                    onAction(action);
                  }}
                >
                  {t(`world.actions.${action.type}`)}
                </button>
              ))}
            </div>
          )}

          <div className={styles.footer}>
            <span className={styles.progress}>{index + 1} / {lines.length}</span>
            <div className={styles.pager} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className={styles.pageButton}
                onClick={rewind}
                disabled={index === 0}
                aria-label={t("world.dialogueUi.previous")}
              >
                <ChevronLeft size={15} aria-hidden />
                {t("world.dialogueUi.previous")}
              </button>
              <button
                type="button"
                className={`${styles.pageButton} ${styles.pageButtonPrimary}`}
                onClick={advance}
                aria-label={isLast ? t("world.dialogueUi.finish") : t("world.dialogueUi.next")}
              >
                {isLast ? t("world.dialogueUi.finish") : t("world.dialogueUi.next")}
                <ChevronRight size={15} aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
