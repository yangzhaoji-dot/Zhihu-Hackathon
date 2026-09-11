"use client";

import { ArrowLeft, Rocket } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { ErrorPageShell } from "@/components/errors/error-page-shell";
import { DialogueOverlay, type ResolvedDialogueLine } from "@/components/world/dialogue-overlay";
import { ResonanceOverlay } from "@/components/world/resonance-overlay";
import { WorldScene } from "@/components/world/world-scene";
import { getResolvedLocale } from "@/i18n";
import {
  fetchSourceTrace,
  fetchWorldConfig,
  fetchWorldProgress,
  patchWorldProgress,
  type WorldNpcView,
  type WorldProgressPatch,
  type WorldView,
} from "@/lib/api/opinion";
import { postPlanetDialogue } from "@/lib/api/planet-dialogue";
import type { DialogueAction, ExplorationProgressDto, OpinionSource, Poi } from "@/lib/opinion/types";
import { getViewerId } from "@/lib/opinion/viewer-id";
import { loadLocalWorldProgress, saveLocalWorldProgress } from "@/lib/opinion/world-progress-cache";
import { loadOpinionWorldEntry, type OpinionWorldEntry } from "@/lib/opinion/world-session";
import { OPINION_WORLD_THEMES } from "@/lib/opinion/world-theme";
import { distance, TILE_SIZE, type GridPos } from "@/lib/world/geometry";
import { emptyProgress, mergeProgressPatch } from "@/lib/world/progress-merge";
import {
  buildResonanceChapters,
  collectedResonanceFragments,
  hasResonated,
  isResonanceReady,
  resonanceCompleteKey,
  resonanceFragmentKey,
  type ResonanceFragmentKind,
} from "@/lib/world/resonance";
import { resolveSpawn } from "@/lib/world/spawn";
import { canTransition, type WorldPhase } from "@/lib/world/state-machine";
import {
  isPoiRequirementMet,
  isWalkable,
  poiRequirementReason,
  type BlockReason,
  type WalkContext,
} from "@/lib/world/walkability";
import styles from "./page.module.css";

const SPEED = 5.2;
const PLAYER_RADIUS = 0.3;
const INTERACT_RANGE = 1.5;
const LANDING_MS = 1100;
const LEAVING_MS = 1000;
const TOAST_MS = 2600;

type InteractTarget =
  | { type: "object"; id: string; object: WorldNpcView }
  | { type: "poi"; id: string; poi: Poi };

type DialogueState = {
  lines: ResolvedDialogueLine[];
  openedAt: number;
};

function emitSfx(name: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("sfx", { detail: name }));
  }
}

function runtimeFogsFromWorldState(worldState: Record<string, unknown>) {
  const fogs: { id: string; pos: GridPos }[] = [];
  for (const [key, value] of Object.entries(worldState)) {
    if (!key.startsWith("fog_rt:")) continue;
    if (
      value &&
      typeof value === "object" &&
      typeof (value as GridPos).x === "number" &&
      typeof (value as GridPos).y === "number"
    ) {
      fogs.push({ id: key, pos: value as GridPos });
    }
  }
  return fogs;
}

function comparedPairsFromWorldState(worldState: Record<string, unknown>): [string, string][] {
  return Object.keys(worldState)
    .filter((key) => key.startsWith("bridge:") && Boolean(worldState[key]))
    .map((key) => key.slice("bridge:".length).split(":") as [string, string])
    .filter((pair) => pair.length === 2 && pair[0] && pair[1]);
}

function currentSource(entry: OpinionWorldEntry): OpinionSource | null {
  return (
    entry.sources.find((source) => entry.opinion.sourceIds.includes(source.id)) ??
    null
  );
}

function localKanshanLines(entry: OpinionWorldEntry, locale: "zh-CN" | "en-US"): ResolvedDialogueLine[] {
  const source = currentSource(entry);
  const opinion = entry.opinion;
  if (locale === "en-US") {
    return [
      {
        speaker: "guide",
        text: `Look at this place first. This planet formed around one claim: “${opinion.title}”. What in the scene feels most connected to that claim?`,
      },
      {
        speaker: "guide",
        text: opinion.reason
          ? `The supplied reason is: ${opinion.reason}`
          : "The material does not yet contain a complete reason, so this part should remain unresolved.",
      },
      ...(source
        ? [{
            speaker: "guide" as const,
            text: "There is an original excerpt here. Read it before deciding how much the claim can support.",
            actions: [{ type: "show-source" as const, sourceId: source.id }],
          }]
        : [{
            speaker: "guide" as const,
            text: "No traceable original excerpt is attached yet. The scenery cannot replace missing evidence.",
          }]),
      {
        speaker: "guide",
        text: "One more question: what condition would have to change before you stopped applying this claim?",
        actions: [{ type: "collect-opinion", opinionId: opinion.id }],
      },
    ];
  }

  return [
    {
      speaker: "guide",
      text: `先看看这里。整颗星球只围绕一条观点形成：「${opinion.title}」。你觉得眼前的环境最想提醒你什么？`,
    },
    {
      speaker: "guide",
      text: opinion.reason
        ? `材料里明确留下的理由是：${opinion.reason}`
        : "目前材料没有留下完整理由，这一块先不要替它补齐。",
    },
    ...(source
      ? [{
          speaker: "guide" as const,
          text: "这里还留着一份原文。先读它，再判断这条经历究竟能支撑多大的结论。",
          actions: [{ type: "show-source" as const, sourceId: source.id }],
        }]
      : [{
          speaker: "guide" as const,
          text: "目前没有能回到原文的来源，所以依据这一块仍然应该留在雾里。",
        }]),
    {
      speaker: "guide",
      text: "最后想一个问题：什么条件一旦改变，你就不会再把这条观点直接套用到那个情境？",
      actions: [{ type: "collect-opinion", opinionId: opinion.id }],
    },
  ];
}

export default function ResonancePlanetPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ opinionId: string }>();
  const opinionId = decodeURIComponent(params.opinionId);
  const locale = getResolvedLocale();

  const [phase, setPhaseState] = useState<WorldPhase>("loading");
  const [entry, setEntry] = useState<OpinionWorldEntry | null>(null);
  const [world, setWorld] = useState<WorldView | null>(null);
  const [dialogue, setDialogue] = useState<DialogueState | null>(null);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [hint, setHint] = useState<InteractTarget | null>(null);
  const [foundSourceIds, setFoundSourceIds] = useState<string[]>([]);
  const [wsVersion, setWsVersion] = useState(0);

  const phaseRef = useRef<WorldPhase>("loading");
  const posRef = useRef<GridPos>({ x: 0, y: 0 });
  const keysRef = useRef<Set<string>>(new Set());
  const tapTargetRef = useRef<GridPos | null>(null);
  const camRef = useRef({ x: 0, y: 0 });
  const worldStateRef = useRef<Record<string, unknown>>({});
  const progressRef = useRef<ExplorationProgressDto | null>(null);
  const progressOfflineNotifiedRef = useRef(false);
  const lastBlockedToastRef = useRef(0);
  const hintIdRef = useRef<string | null>(null);
  const toastSeqRef = useRef(0);
  const worldElRef = useRef<HTMLDivElement | null>(null);
  const playerElRef = useRef<HTMLDivElement | null>(null);
  const viewportElRef = useRef<HTMLDivElement | null>(null);

  const goto = useCallback((to: WorldPhase) => {
    if (!canTransition(phaseRef.current, to)) return;
    phaseRef.current = to;
    setPhaseState(to);
  }, []);

  const pushToast = useCallback((text: string) => {
    const id = ++toastSeqRef.current;
    setToasts((list) => [...list.slice(-2), { id, text }]);
    window.setTimeout(() => setToasts((list) => list.filter((item) => item.id !== id)), TOAST_MS);
  }, []);

  const applyProgressPatch = useCallback((patch: WorldProgressPatch) => {
    const questionId = entry?.opinion.questionId;
    if (!questionId) return;
    const base = progressRef.current ?? emptyProgress(questionId);
    const optimistic = mergeProgressPatch(base, patch);
    progressRef.current = optimistic;
    patchWorldProgress(questionId, patch)
      .then((server) => {
        progressRef.current = server;
        saveLocalWorldProgress(getViewerId(), server);
      })
      .catch(() => {
        saveLocalWorldProgress(getViewerId(), optimistic);
        if (!progressOfflineNotifiedRef.current) {
          progressOfflineNotifiedRef.current = true;
          pushToast(t("world.progressLocal"));
        }
      });
  }, [entry, pushToast, t]);

  const markFragment = useCallback((kind: ResonanceFragmentKind) => {
    if (!entry) return;
    const key = resonanceFragmentKey(entry.opinion.id, kind);
    if (worldStateRef.current[key]) return;
    const patch = { [key]: true };
    Object.assign(worldStateRef.current, patch);
    setWsVersion((value) => value + 1);
    applyProgressPatch({ setWorldState: patch });
    const label = kind === "claim" ? "主张" : kind === "reason" ? "理由" : "依据";
    pushToast(t("world.resonance.fragmentFound", { defaultValue: `获得观点碎片 · ${label}`, label }));
    emitSfx("sfx.fragment.found");
  }, [applyProgressPatch, entry, pushToast, t]);

  useEffect(() => {
    let alive = true;
    phaseRef.current = "loading";
    setPhaseState("loading");
    const hydrate = async () => {
      try {
        let loadedEntry = loadOpinionWorldEntry(opinionId);
        if (!loadedEntry) {
          const trace = await fetchSourceTrace(opinionId);
          if (!trace?.opinion) throw new Error("opinion_not_found");
          loadedEntry = { ...trace, questionTitle: trace.opinion.questionId };
        }
        const loadedWorld = await fetchWorldConfig(loadedEntry.opinion.questionId);
        const viewerId = getViewerId();
        const questionId = loadedEntry.opinion.questionId;
        let progress: ExplorationProgressDto | null = null;
        try {
          progress = await fetchWorldProgress(questionId);
          saveLocalWorldProgress(viewerId, progress);
        } catch {
          progress = loadLocalWorldProgress(viewerId, questionId);
        }
        progress ??= emptyProgress(questionId);
        if (!alive) return;
        progressRef.current = progress;
        worldStateRef.current = { ...progress.worldState };
        setFoundSourceIds(progress.foundSourceIds);
        setWsVersion((value) => value + 1);
        setEntry(loadedEntry);
        setWorld(loadedWorld);
        posRef.current = resolveSpawn(loadedWorld.config, opinionId, { camp: loadedEntry.opinion.camp });
        goto("landing");
      } catch {
        if (alive) goto("error");
      }
    };
    void hydrate();
    return () => { alive = false; };
  }, [goto, opinionId]);

  const theme = world ? OPINION_WORLD_THEMES[world.config.worldType] : null;
  const comparedPairs = useMemo(() => comparedPairsFromWorldState(worldStateRef.current), [wsVersion]);
  const walkCtx = useMemo<WalkContext>(() => ({
    worldState: worldStateRef.current,
    foundSourceIds,
    comparedPairs,
    stanceCount: 0,
  }), [comparedPairs, foundSourceIds, wsVersion]);

  const planetObjects = useMemo(() => {
    const configured = (world?.npcs ?? []).filter((object) => object.opinion.id === opinionId);
    if (configured.length || !entry || !world) return configured;
    const spawn = world.config.spawn;
    return [{
      id: `planet_object_${opinionId}`,
      opinion: entry.opinion,
      sourceCount: entry.opinion.sourceIds.length,
      pos: { x: Math.min(world.config.size.w - 2, spawn.x + 2), y: spawn.y },
      sprite: "",
      role: entry.opinion.kind === "ai" ? "看山 · 推演装置" : "看山 · 观点遗迹",
      translucent: entry.opinion.kind === "ai",
    } satisfies WorldNpcView];
  }, [entry, opinionId, world]);

  const runtimeFogs = useMemo(() => runtimeFogsFromWorldState(worldStateRef.current), [wsVersion]);
  const fragments = useMemo(() => collectedResonanceFragments(worldStateRef.current, opinionId), [opinionId, wsVersion]);
  const resonant = useMemo(() => hasResonated(worldStateRef.current, opinionId), [opinionId, wsVersion]);
  const resonanceReady = useMemo(() => isResonanceReady(worldStateRef.current, opinionId), [opinionId, wsVersion]);
  const resonanceChapters = useMemo(
    () => entry ? buildResonanceChapters(entry.opinion, entry.sources, foundSourceIds) : [],
    [entry, foundSourceIds],
  );

  useEffect(() => {
    if (phase !== "explore" || !resonanceReady || resonant) return;
    keysRef.current.clear();
    tapTargetRef.current = null;
    goto("resonance");
  }, [goto, phase, resonanceReady, resonant]);

  const enterExplore = useCallback(() => {
    if (phaseRef.current !== "landing" || !entry) return;
    goto("explore");
    emitSfx("sfx.rocket.land");
    const lines: ResolvedDialogueLine[] = [
      {
        speaker: "guide",
        text: t("world.resonance.planetIntro", {
          defaultValue: `我们到了。这颗星球围绕「${entry.opinion.title}」形成。先别急着赞同它，看看这里为什么变成这样。`,
          title: entry.opinion.title,
        }),
      },
      {
        speaker: "guide",
        text: t("world.resonance.fragmentIntro", {
          defaultValue: "找到主张、理由和依据三块核心碎片后，这颗星球会与你产生共鸣。共鸣不是判定对错。",
        }),
      },
    ];
    window.setTimeout(() => {
      if (phaseRef.current !== "explore") return;
      setDialogue({ lines, openedAt: Date.now() });
      goto("dialogue");
    }, 180);
  }, [entry, goto, t]);

  useEffect(() => {
    if (phase !== "landing") return;
    const timer = window.setTimeout(enterExplore, LANDING_MS);
    const onKeyDown = () => enterExplore();
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [enterExplore, phase]);

  useEffect(() => {
    if (phase !== "leaving") return;
    emitSfx("sfx.rocket.launch");
    const timer = window.setTimeout(() => router.back(), LEAVING_MS);
    return () => window.clearTimeout(timer);
  }, [phase, router]);

  const resolveSource = useCallback((sourceId: string) => {
    if (!entry) return null;
    const source = entry.sources.find((candidate) => candidate.id === sourceId && entry.opinion.sourceIds.includes(candidate.id));
    if (!source) return null;
    return { source, author: entry.authors.find((candidate) => candidate.id === source.authorId) };
  }, [entry]);

  const nearestInteractable = useCallback((): InteractTarget | null => {
    if (!world) return null;
    const center = { x: posRef.current.x + 0.5, y: posRef.current.y + 0.5 };
    let best: { target: InteractTarget; d: number } | null = null;
    for (const object of planetObjects) {
      const d = distance(center, { x: object.pos.x + 0.5, y: object.pos.y + 0.5 });
      if (d <= INTERACT_RANGE && (!best || d < best.d)) best = { target: { type: "object", id: object.id, object }, d };
    }
    for (const poi of world.config.pois) {
      if (poi.kind === "fog" || poi.kind === "chest") continue;
      const d = distance(center, { x: poi.pos.x + 0.5, y: poi.pos.y + 0.5 });
      if (d <= INTERACT_RANGE && (!best || d < best.d)) best = { target: { type: "poi", id: poi.id, poi }, d };
    }
    return best?.target ?? null;
  }, [planetObjects, world]);

  const openObjectDialogue = useCallback((object: WorldNpcView) => {
    if (!entry) return;
    tapTargetRef.current = null;
    markFragment("claim");
    const fallbackLines = localKanshanLines(entry, locale);
    const openedAt = Date.now();
    setDialogue({ lines: fallbackLines, openedAt });
    goto("dialogue");
    emitSfx("sfx.guide.appear");
    applyProgressPatch({ addVisitedNpc: [object.id] });

    postPlanetDialogue({
      questionId: entry.opinion.questionId,
      opinionId: entry.opinion.id,
      trigger: "inspect",
      locale,
      history: [],
      worldState: worldStateRef.current,
    }).then((reply) => {
      if (!reply || reply.source !== "ai") return;
      setDialogue((current) => {
        if (!current || current.openedAt !== openedAt || Date.now() - openedAt > 6000) return current;
        return { ...current, lines: reply.lines };
      });
    }).catch(() => {});
  }, [applyProgressPatch, entry, goto, locale, markFragment]);

  const startLeave = useCallback(() => {
    if (phaseRef.current !== "explore") return;
    goto("leaving");
  }, [goto]);

  const blockedText = useCallback((reason: BlockReason | null) => {
    if (!reason) return t("world.blocked.generic");
    if (reason.kind === "requires-sources") return t("world.blocked.sources", { count: reason.missing.length });
    if (reason.kind === "requires-compare") return t("world.blocked.compare", { a: reason.pair[0], b: reason.pair[1] });
    if (reason.kind === "requires-stance") return t("world.blocked.stance", { count: reason.count });
    return t("world.blocked.generic");
  }, [t]);

  const interactWithPoi = useCallback((poi: Poi) => {
    if (poi.kind === "rocket") {
      startLeave();
      return;
    }
    if ((poi.kind === "bridge" || poi.kind === "gate") && !isPoiRequirementMet(poi, walkCtx)) {
      emitSfx("sfx.blocked");
      pushToast(blockedText(poiRequirementReason(poi, walkCtx)));
      return;
    }
    pushToast(t("world.resonance.keepExploring", { defaultValue: "先继续观察这颗星球；这里还没有绑定新的碎片交互。" }));
  }, [blockedText, pushToast, startLeave, t, walkCtx]);

  const interactRef = useRef<() => void>(() => {});
  useEffect(() => {
    interactRef.current = () => {
      if (phaseRef.current !== "explore") return;
      const target = nearestInteractable();
      if (!target) return;
      if (target.type === "object") openObjectDialogue(target.object);
      else interactWithPoi(target.poi);
    };
  });

  useEffect(() => {
    const MOVE_KEYS = new Set(["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"]);
    const onKeyDown = (event: KeyboardEvent) => {
      if (phaseRef.current !== "explore") return;
      const key = event.key.toLowerCase();
      if (MOVE_KEYS.has(key) || key === " ") event.preventDefault();
      if (MOVE_KEYS.has(key)) keysRef.current.add(key);
      if (key === "e" || key === " ") interactRef.current();
    };
    const onKeyUp = (event: KeyboardEvent) => keysRef.current.delete(event.key.toLowerCase());
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    if (phase !== "explore" || !world) return;
    const config = world.config;
    const ctx = walkCtx;
    const blockedAt = (position: GridPos): BlockReason | null => {
      const r = PLAYER_RADIUS;
      for (const corner of [
        { x: position.x - r, y: position.y - r },
        { x: position.x + r, y: position.y - r },
        { x: position.x - r, y: position.y + r },
        { x: position.x + r, y: position.y + r },
      ]) {
        const result = isWalkable(config, ctx, corner);
        if (result.blocked) return result.reason ?? null;
      }
      return null;
    };
    const notifyBlocked = (reason: BlockReason | null) => {
      if (!reason) return;
      const now = performance.now();
      if (now - lastBlockedToastRef.current < 1600) return;
      lastBlockedToastRef.current = now;
      emitSfx("sfx.blocked");
      pushToast(blockedText(reason));
    };

    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const pos = posRef.current;
      let dx = 0;
      let dy = 0;
      const keys = keysRef.current;
      if (keys.has("w") || keys.has("arrowup")) dy -= 1;
      if (keys.has("s") || keys.has("arrowdown")) dy += 1;
      if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
      if (keys.has("d") || keys.has("arrowright")) dx += 1;
      if (dx !== 0 || dy !== 0) {
        tapTargetRef.current = null;
        const length = Math.hypot(dx, dy);
        dx = (dx / length) * SPEED * dt;
        dy = (dy / length) * SPEED * dt;
      } else if (tapTargetRef.current) {
        const center = { x: pos.x + 0.5, y: pos.y + 0.5 };
        const target = tapTargetRef.current;
        const vx = target.x - center.x;
        const vy = target.y - center.y;
        const length = Math.hypot(vx, vy);
        if (length < 0.18) tapTargetRef.current = null;
        else {
          dx = (vx / length) * SPEED * dt;
          dy = (vy / length) * SPEED * dt;
        }
      }
      if (dx !== 0 || dy !== 0) {
        const tryX = { x: pos.x + dx, y: pos.y };
        const reasonX = blockedAt(tryX);
        if (!reasonX) posRef.current = tryX;
        else notifyBlocked(reasonX);
        const tryY = { x: posRef.current.x, y: posRef.current.y + dy };
        const reasonY = blockedAt(tryY);
        if (!reasonY) posRef.current = tryY;
        else notifyBlocked(reasonY);
        if (tapTargetRef.current && reasonX && reasonY) tapTargetRef.current = null;
      }

      if (playerElRef.current) {
        playerElRef.current.style.transform = `translate(${posRef.current.x * TILE_SIZE}px, ${posRef.current.y * TILE_SIZE}px)`;
      }
      const viewportEl = viewportElRef.current;
      const worldEl = worldElRef.current;
      if (viewportEl && worldEl) {
        const vw = viewportEl.clientWidth;
        const vh = viewportEl.clientHeight;
        const worldW = config.size.w * TILE_SIZE;
        const worldH = config.size.h * TILE_SIZE;
        const px = (posRef.current.x + 0.5) * TILE_SIZE;
        const py = (posRef.current.y + 0.5) * TILE_SIZE;
        const cam = camRef.current;
        let targetX = cam.x;
        let targetY = cam.y;
        if (worldW <= vw) targetX = (worldW - vw) / 2;
        else {
          if (px - targetX < vw * 0.2) targetX = px - vw * 0.2;
          if (px - targetX > vw * 0.8) targetX = px - vw * 0.8;
          targetX = Math.max(0, Math.min(worldW - vw, targetX));
        }
        if (worldH <= vh) targetY = (worldH - vh) / 2;
        else {
          if (py - targetY < vh * 0.2) targetY = py - vh * 0.2;
          if (py - targetY > vh * 0.8) targetY = py - vh * 0.8;
          targetY = Math.max(0, Math.min(worldH - vh, targetY));
        }
        const lerp = Math.min(1, dt * 9);
        cam.x += (targetX - cam.x) * lerp;
        cam.y += (targetY - cam.y) * lerp;
        worldEl.style.transform = `translate3d(${-cam.x}px, ${-cam.y}px, 0)`;
      }
      const target = nearestInteractable();
      const targetId = target ? `${target.type}:${target.id}` : null;
      if (targetId !== hintIdRef.current) {
        hintIdRef.current = targetId;
        setHint(target);
      }
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [blockedText, nearestInteractable, phase, pushToast, walkCtx, world]);

  const closeDialogue = useCallback(() => {
    setDialogue(null);
    goto("explore");
  }, [goto]);

  const handleDialogueAction = useCallback((action: DialogueAction) => {
    if (!entry) return;
    if (action.type === "show-source") {
      setFoundSourceIds((ids) => {
        if (ids.includes(action.sourceId)) return ids;
        applyProgressPatch({ addFoundSource: [action.sourceId] });
        return [...ids, action.sourceId];
      });
      if (entry.opinion.sourceIds.includes(action.sourceId)) markFragment("evidence");
      emitSfx("sfx.source.found");
      return;
    }
    if (action.type === "collect-opinion" && action.opinionId === entry.opinion.id) {
      markFragment("reason");
    }
  }, [applyProgressPatch, entry, markFragment]);

  const completeResonance = useCallback(() => {
    if (phaseRef.current === "resonance") goto("explore");
  }, [goto]);

  const transformWorld = useCallback(() => {
    if (!entry) return;
    const key = resonanceCompleteKey(entry.opinion.id);
    if (worldStateRef.current[key]) return;
    const patch = { [key]: "understood" };
    Object.assign(worldStateRef.current, patch);
    setWsVersion((value) => value + 1);
    applyProgressPatch({ setWorldState: patch });
    emitSfx("sfx.resonance.world");
  }, [applyProgressPatch, entry]);

  if (phase === "error") {
    return (
      <ErrorPageShell>
        <div className={styles.errorCard}>
          <h1>{t("world.notFound")}</h1>
          <button type="button" onClick={() => router.push("/")}>{t("cosmos.returnUniverse")}</button>
        </div>
      </ErrorPageShell>
    );
  }
  if (!world || !entry || !theme) return <main className={styles.loading}>{t("world.loading")}</main>;

  const worldStyle = {
    "--world-sky": theme.sky,
    "--world-ground": theme.ground,
    "--world-road": theme.road,
    "--world-accent": theme.accent,
    "--world-mist": theme.mist,
  } as CSSProperties;

  const hintLabel = hint?.type === "object"
    ? t("world.hud.inspect", { name: hint.object.role.replace(/^看山\s*·\s*/, "") })
    : hint?.type === "poi" && hint.poi.kind === "rocket"
      ? t("world.hud.board")
      : hint?.type === "poi"
        ? t("world.hud.inspect", { name: hint.poi.label?.[locale] ?? hint.poi.label?.["zh-CN"] ?? hint.poi.id })
        : null;

  const mantra = t("world.resonance.mantra", {
    defaultValue: locale === "en-US"
      ? "Resonance means understanding an opinion — not proving it."
      : "共鸣意味着理解了观点，不意味着证明了观点。",
  });

  return (
    <main className={styles.world} style={worldStyle} data-el="world-runtime" data-phase={phase} data-fragments={fragments.join(",")} data-resonant={resonant ? "true" : "false"}>
      <header className={styles.header}>
        <button type="button" onClick={() => router.back()}><ArrowLeft size={16} aria-hidden />{t("cosmos.returnUniverse")}</button>
        <div><span>{world.config.name}</span><h1>{entry.opinion.title}</h1></div>
        <small>{fragments.length} / 3 · {t("world.resonance.fragments", { defaultValue: "核心碎片" })}</small>
      </header>

      <div ref={viewportElRef} className={styles.sceneViewport}>
        <WorldScene
          config={world.config}
          npcs={planetObjects}
          theme={theme}
          locale={locale}
          walkCtx={walkCtx}
          runtimeFogs={runtimeFogs}
          resonant={resonant}
          worldElRef={worldElRef}
          playerElRef={playerElRef}
          highlightId={hint?.id ?? null}
          onTap={(pos, npcId) => {
            if (phaseRef.current !== "explore") return;
            if (npcId) {
              const object = planetObjects.find((candidate) => candidate.id === npcId);
              if (object) openObjectDialogue(object);
              return;
            }
            tapTargetRef.current = {
              x: Math.max(0, Math.min(world.config.size.w, pos.x)),
              y: Math.max(0, Math.min(world.config.size.h, pos.y)),
            };
          }}
        />
      </div>

      {phase === "landing" && (
        <div className={styles.landing} onClick={enterExplore} data-el="world-landing">
          <div className={styles.landingRocket} aria-hidden><Rocket size={44} /></div>
          <p>{entry.opinion.title}</p>
          <small>{t("world.landingHint")}</small>
        </div>
      )}

      {phase === "leaving" && (
        <div className={styles.leaving} data-el="world-leaving">
          <div className={styles.leavingRocket} aria-hidden><Rocket size={44} /></div>
          <p>{t("world.leavingHint")}</p>
        </div>
      )}

      {phase === "explore" && hint && hintLabel && (
        <button type="button" className={styles.interact} onClick={() => interactRef.current()}>E · {hintLabel}</button>
      )}

      {phase === "dialogue" && dialogue && dialogue.lines.length > 0 && (
        <DialogueOverlay
          key={`guide:${dialogue.openedAt}`}
          lines={dialogue.lines}
          npcLabel={t("world.guideName")}
          subtitle={entry.opinion.title}
          accent={theme.accent}
          onAction={handleDialogueAction}
          onClose={closeDialogue}
          resolveSource={resolveSource}
          surfaceMode="fragments"
        />
      )}

      {phase === "resonance" && (
        <ResonanceOverlay
          title={entry.opinion.title}
          chapters={resonanceChapters}
          mantra={mantra}
          scrollLabel={t("world.resonance.scrollLabel", { defaultValue: "观点共鸣 · 探索画卷" })}
          unresolvedLabel={t("world.resonance.unresolved", { defaultValue: "仍然未知" })}
          onTransform={transformWorld}
          onComplete={completeResonance}
        />
      )}

      <div className={styles.toasts} aria-live="polite">
        {toasts.map((toast) => <div key={toast.id} className={styles.toast}>{toast.text}</div>)}
      </div>
    </main>
  );
}
