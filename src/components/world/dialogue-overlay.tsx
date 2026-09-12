"use client";

import { ExternalLink, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { GuideAvatar } from "@/components/opinion-world/guide-avatar";
import type { Author, DialogueAction, DialogueLine, OpinionSource } from "@/lib/opinion/types";
import { ConditionExperiment } from "./condition-experiment";
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
  surfaceMode?: "legacy" | "fragments";
  onConditionCueChange?: (cue: number) => void;
}

function extractConditionCandidates(lines: ResolvedDialogueLine[]) {
  const collected: string[] = [];
  for (const line of lines) {
    const text = line.text.replace(/\s+/g, " ").trim();
    const matches = [
      text.match(/(?:条件|前提)(?:是|包括|依赖|为)?[：:]\s*([^。！？!?]+)/),
      text.match(/(?:依赖这些条件)[：:]\s*([^。！？!?]+)/),
      text.match(/(?:conditions?|depends on)[：:]\s*([^.!?]+)/i),
    ].filter(Boolean) as RegExpMatchArray[];
    for (const match of matches) {
      for (const item of match[1].split(/[；;、，,]/)) {
        const value = item.trim().replace(/^这些?/, "");
        if (value.length >= 2 && value.length <= 90 && !collected.includes(value)) collected.push(value);
      }
    }
  }
  return collected.slice(0, 3);
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
  surfaceMode = "legacy",
  onConditionCueChange,
}: DialogueOverlayProps) {
  const { t, i18n } = useTranslation();
  const [index, setIndex] = useState(0);
  const [openedSourceId, setOpenedSourceId] = useState<string | null>(null);
  const [experimentAction, setExperimentAction] = useState<DialogueAction | null>(null);

  const line = lines[Math.min(index, lines.length - 1)];
  const isLast = index >= lines.length - 1;
  const locale = i18n.resolvedLanguage === "en-US" ? "en-US" : "zh-CN";
  const experimentConditions = useMemo(() => extractConditionCandidates(lines), [lines]);

  const advance = useCallback(() => {
    if (experimentAction) return;
    if (openedSourceId) {
      setOpenedSourceId(null);
      return;
    }
    if (isLast) onClose();
    else setIndex((value) => value + 1);
  }, [experimentAction, isLast, onClose, openedSourceId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        if (experimentAction) {
          onConditionCueChange?.(0);
          setExperimentAction(null);
          return;
        }
        if (openedSourceId) {
          setOpenedSourceId(null);
          return;
        }
        onClose();
        return;
      }
      if (experimentAction) return;
      event.preventDefault();
      advance();
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [advance, experimentAction, onClose, onConditionCueChange, openedSourceId]);

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
      return locale === "en-US" ? "Try the conditions" : "试一试条件";
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
                {t("cosmos.upvotes", { n: opened.source.upvotes.toLocaleString(locale) })}
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

          {visibleActions.length > 0 && !experimentAction && (
            <div className={styles.actions} onClick={(event) => event.stopPropagation()}>
              {visibleActions.map((action, actionIndex) => (
                <button
                  key={`${action.type}-${actionIndex}`}
                  type="button"
                  onClick={() => {
                    if (surfaceMode === "fragments" && action.type === "collect-opinion") {
                      setExperimentAction(action);
                      return;
                    }
                    if (action.type === "show-source") setOpenedSourceId(action.sourceId);
                    onAction(action);
                  }}
                >
                  {actionLabel(action)}
                </button>
              ))}
            </div>
          )}

          {experimentAction?.type === "collect-opinion" && (
            <div onClick={(event) => event.stopPropagation()}>
              <ConditionExperiment
                conditions={experimentConditions}
                locale={locale}
                onCueChange={onConditionCueChange}
                onCancel={() => setExperimentAction(null)}
                onComplete={() => {
                  onAction(experimentAction);
                  setExperimentAction(null);
                }}
              />
            </div>
          )}

          <div className={styles.footer}>
            <span className={styles.progress}>{index + 1} / {lines.length}</span>
            <span className={styles.hint}>
              {experimentAction
                ? (locale === "en-US" ? "Change at least one assumption" : "至少改变一个前提")
                : isLast ? t("world.dialogueUi.closeHint") : t("world.dialogueUi.nextHint")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
