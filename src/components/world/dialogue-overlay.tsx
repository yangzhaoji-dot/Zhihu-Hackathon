"use client";

import { ExternalLink, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { GuideAvatar } from "@/components/opinion-world/guide-avatar";
import type { Author, DialogueAction, DialogueLine, OpinionSource } from "@/lib/opinion/types";
import styles from "./dialogue-overlay.module.css";

export interface ResolvedDialogueLine extends DialogueLine {
  text: string;
}

export interface SourceCardData {
  source: OpinionSource;
  author?: Author;
}

interface DialogueOverlayProps {
  lines: ResolvedDialogueLine[];
  npcLabel: string;
  subtitle?: string;
  npcSprite?: string;
  accent?: string;
  onAction: (action: DialogueAction) => void;
  onClose: () => void;
  resolveSource: (sourceId: string) => SourceCardData | null;
  /** 地表碎片主线只改用户可见标签；底层兼容动作类型暂不破坏。 */
  surfaceMode?: "legacy" | "fragments";
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
  surfaceMode = "fragments",
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
    else setIndex((value) => value + 1);
  }, [isLast, onClose, openedSourceId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      event.preventDefault();
      advance();
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [advance, onClose]);

  const visibleActions = useMemo(
    () =>
      (line?.actions ?? []).filter((action) => {
        if (action.type === "show-source") return resolveSource(action.sourceId) !== null;
        if (surfaceMode === "fragments" && (action.type === "open-compare" || action.type === "open-stance")) return false;
        return true;
      }),
    [line, resolveSource, surfaceMode],
  );

  const opened = openedSourceId ? resolveSource(openedSourceId) : null;
  if (!line) return null;

  const speakerLabel =
    line.speaker === "guide"
      ? t("world.guideName")
      : line.speaker === "player"
        ? t("world.dialogueUi.you")
        : npcLabel;

  const actionLabel = (action: DialogueAction) => {
    if (surfaceMode === "fragments" && action.type === "collect-opinion") {
      return t("world.resonance.takeReasonFragment", { defaultValue: "收下理由碎片" });
    }
    return t(`world.actions.${action.type}`);
  };

  return (
    <div className={styles.overlay} role="dialog" aria-label={speakerLabel} onClick={advance}>
      {opened && (
        <div className={styles.sourcePop} onClick={(event) => event.stopPropagation()}>
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
            {opened.source.evidence?.length ? (
              <div className={styles.sourceEvidence}>
                {opened.source.evidence.map((evidence) => <span key={evidence}>{evidence}</span>)}
              </div>
            ) : null}
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
            <div className={styles.actions} onClick={(event) => event.stopPropagation()}>
              {visibleActions.map((action, actionIndex) => (
                <button
                  key={`${action.type}-${actionIndex}`}
                  type="button"
                  onClick={() => {
                    if (action.type === "show-source") setOpenedSourceId(action.sourceId);
                    onAction(action);
                  }}
                >
                  {actionLabel(action)}
                </button>
              ))}
            </div>
          )}

          <div className={styles.footer}>
            <span className={styles.progress}>{index + 1} / {lines.length}</span>
            <span className={styles.hint}>
              {isLast ? t("world.dialogueUi.closeHint") : t("world.dialogueUi.nextHint")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
