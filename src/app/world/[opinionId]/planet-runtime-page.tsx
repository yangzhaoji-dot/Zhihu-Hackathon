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
import { postPlanetDialogue, type PlanetDialogueTrigger } from "@/lib/api/planet-dialogue";
import type { DialogueAction, ExplorationProgressDto, Opinion, Poi, WorldConfig } from "@/lib/opinion/types";
import { getViewerId } from "@/lib/opinion/viewer-id";
import { loadLocalWorldProgress, saveLocalWorldProgress } from "@/lib/opinion/world-progress-cache";
import { loadOpinionWorldEntry, type OpinionWorldEntry } from "@/lib/opinion/world-session";
import { getOpinionWorldTheme, type OpinionWorldTheme, type OpinionWorldId } from "@/lib/opinion/world-theme";
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
import { nearestWalkable, resolveSpawn } from "@/lib/world/spawn";
import { canTransition, type WorldPhase } from "@/lib/world/state-machine";
import { isWalkable, type BlockReason, type WalkContext } from "@/lib/world/walkability";
import styles from "./page.module.css";

const SPEED = 5.2;
const PLAYER_RADIUS = 0.3;
const INTERACT_RANGE = 1.5;
const LANDING_MS = 1100;
const LEAVING_MS = 1000;
const TOAST_MS = 2600;

interface FragmentSite extends WorldNpcView {
  fragmentKind: ResonanceFragmentKind;
  interaction: "observe" | "experiment" | "trace";
}

type InteractTarget =
  | { type: "fragment"; id: string; site: FragmentSite }
  | { type: "poi"; id: string; poi: Poi };

type DialogueState = {
  lines: ResolvedDialogueLine[];
  openedAt: number;
  fragmentKind: ResonanceFragmentKind;
};

const SITE_NAMES: Record<OpinionWorldId, Record<ResonanceFragmentKind, string>> = {
  crossroads: { claim: "岔路石碑", reason: "条件闸机", evidence: "旅行档案" },
  archive: { claim: "题签石", reason: "索引台", evidence: "原文档案柜" },
  theater: { claim: "聚光标记", reason: "陈述席", evidence: "证物台" },
  forest: { claim: "回声石", reason: "条件泉", evidence: "留痕树" },
  machine: { claim: "核心终端", reason: "运行控制台", evidence: "数据舱" },
};

function emitSfx(name: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("sfx", { detail: name }));
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
    .filter((pair) => pair.length === 2 && Boolean(pair[0]) && Boolean(pair[1]));
}

function surfaceConfig(config: WorldConfig): WorldConfig {
  return {
    ...config,
    // A planet is one selected opinion. Question-level residents and gates do not belong here.
    npcs: [],
    pois: config.pois.filter((poi) => poi.kind === "rocket" || poi.kind === "fog"),
  };
}

function siteCandidates(spawn: GridPos) {
  return {
    claim: { x: spawn.x + 3, y: spawn.y },
    reason: { x: spawn.x - 3, y: spawn.y + 3 },
    evidence: { x: spawn.x + 3, y: spawn.y + 5 },
  } satisfies Record<ResonanceFragmentKind, GridPos>;
}

function buildFragmentSites(
  config: WorldConfig,
  opinion: Opinion,
  theme: OpinionWorldTheme,
  spawn: GridPos,
): FragmentSite[] {
  const candidates = siteCandidates(spawn);
  const names = SITE_NAMES[theme.id];
  const kinds: ResonanceFragmentKind[] = ["claim", "reason", "evidence"];
  return kinds.map((kind) => {
    const pos = nearestWalkable(config, {}, candidates[kind]) ?? candidates[kind];
    return {
      id: `fragment_${kind}_${opinion.id}`,
      opinion,
      sourceCount: opinion.sourceIds.length,
      pos,
      sprite: "",
      role: `看山 · ${names[kind]}`,
      translucent: opinion.kind === "ai" && kind === "evidence",
      fragmentKind: kind,
      interaction: kind === "claim" ? "observe" : kind === "reason" ? "experiment" : "trace",
    };
  });
}

function localLines(entry: OpinionWorldEntry, kind: ResonanceFragmentKind, locale: "zh-CN" | "en-US"): ResolvedDialogueLine[] {
  const opinion = entry.opinion;
  const source = entry.sources.find((candidate) => opinion.sourceIds.includes(candidate.id));
  if (locale === "en-US") {
    if (kind === "claim") return [
      { speaker: "guide", text: `Why do you think this place formed around “${opinion.title}”?` },
      { speaker: "guide", text: `The claim we can actually read is: ${opinion.claim || opinion.title}` },
      { speaker: "guide", text: "Understanding what it claims comes before agreeing with it." },
    ];
    if (kind === "reason") return [
      { speaker: "guide", text: "Which condition would have to change before this route changed?" },
      { speaker: "guide", text: opinion.reason ? `The supplied reason is: ${opinion.reason}` : "The supplied material does not contain a complete reason." },
      { speaker: "guide", text: "Take the reasoning with you, not a verdict.", actions: [{ type: "collect-opinion", opinionId: opinion.id }] },
    ];
    return source ? [
      { speaker: "guide", text: "This is a trace back to source material. How much can one excerpt really support?" },
      { speaker: "guide", text: "Read it before deciding.", actions: [{ type: "show-source", sourceId: source.id }] },
    ] : [
      { speaker: "guide", text: "This archive slot is empty. That does not refute the claim; it marks a gap we cannot currently trace." },
    ];
  }

  if (kind === "claim") return [
    { speaker: "guide", text: `先别急着判断。你觉得这里为什么会围绕「${opinion.title}」形成？` },
    { speaker: "guide", text: `当前材料里能确认的主张是：${opinion.claim || opinion.title}` },
    { speaker: "guide", text: "先弄清它在说什么；要不要赞同，等看完理由和依据再说。" },
  ];
  if (kind === "reason") return [
    { speaker: "guide", text: "如果眼前的装置会改变路线，你觉得哪一个条件最可能让结果发生变化？" },
    { speaker: "guide", text: opinion.reason ? `材料里明确留下的理由是：${opinion.reason}` : "这里缺了一块：目前材料没有留下完整理由。" },
    ...(opinion.conditions?.length ? [{ speaker: "guide" as const, text: `它还依赖这些条件：${opinion.conditions.join("；")}` }] : []),
    { speaker: "guide", text: "带走这段推理，而不是把它当成正确答案。", actions: [{ type: "collect-opinion", opinionId: opinion.id }] },
  ];
  return source ? [
    { speaker: "guide", text: "这里留下了一份能回到原文的痕迹。你觉得一份经历最多能支撑多大的结论？" },
    { speaker: "guide", text: "先打开原文，再决定它能支撑观点里的哪一部分。", actions: [{ type: "show-source", sourceId: source.id }] },
    { speaker: "guide", text: "读过它以后，仍然看不见的地方就继续留在雾里。" },
  ] : [
    { speaker: "guide", text: "你找到的是一个空档案位。没有原文不代表观点错误，只代表这一块目前无法核对。" },
    { speaker: "guide", text: "把这个缺口记下来。理解未知，也是理解这颗星球的一部分。" },
  ];
}

function triggerFor(kind: ResonanceFragmentKind): PlanetDialogueTrigger {
  return kind === "claim" ? "inspect-claim" : kind === "reason" ? "inspect-reason" : "inspect-evidence";
}

export default function PlanetRuntimePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ opinionId: string }>();
  const opinionId = decodeURIComponent(params.opinionId);
  const locale = getResolvedLocale();

  const [phase, setPhase] = useState<WorldPhase>("loading");
  const [entry, setEntry] = useState<OpinionWorldEntry | null>(null);
  const [world, setWorld] = useState<WorldView | null>(null);
  const [worldState, setWorldState] = useState<Record<string, unknown>>({});
  const [foundSourceIds, setFoundSourceIds] = useState<string[]>([]);
  const [dialogue, setDialogue] = useState<DialogueState | null>(null);
  const [hint, setHint] = useState<InteractTarget | null>(null);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);

  const phaseRef = useRef<WorldPhase>("loading");
  const worldStateRef = useRef<Record<string, unknown>>({});
  const progressRef = useRef<ExplorationProgressDto | null>(null);
  const posRef = useRef<GridPos>({ x: 0, y: 0 });
  const camRef = useRef({ x: 0, y: 0 });
  const keysRef = useRef<Set<string>>(new Set());
  const tapTargetRef = useRef<GridPos | null>(null);
  const worldElRef = useRef<HTMLDivElement | null>(null);
  const playerElRef = useRef<HTMLDivElement | null>(null);
  const viewportElRef = useRef<HTMLDivElement | null>(null);
  const hintIdRef = useRef<string | null>(null);
  const lastBlockedToastRef = useRef(0);
  const toastSeqRef = useRef(0);
  const progressOfflineNotifiedRef = useRef(false);

  const goto = useCallback((next: WorldPhase) => {
    if (!canTransition(phaseRef.current, next)) return;
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const pushToast = useCallback((text: string) => {
    const id = ++toastSeqRef.current;
    setToasts((list) => [...list.slice(-2), { id, text }]);
    window.setTimeout(() => setToasts((list) => list.filter((item) => item.id !== id)), TOAST_MS);
  }, []);

  const persistProgress = useCallback((patch: WorldProgressPatch) => {
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

  const applyWorldPatch = useCallback((patch: Record<string, unknown>) => {
    worldStateRef.current = { ...worldStateRef.current, ...patch };
    setWorldState((current) => ({ ...current, ...patch }));
    persistProgress({ setWorldState: patch });
  }, [persistProgress]);

  const markFragment = useCallback((kind: ResonanceFragmentKind) => {
    if (!entry) return;
    const key = resonanceFragmentKey(entry.opinion.id, kind);
    if (worldStateRef.current[key]) return;
    const next = { ...worldStateRef.current, [key]: true };
    worldStateRef.current = next;
    setWorldState(next);
    persistProgress({ setWorldState: { [key]: true } });
    const label = kind === "claim" ? "主张" : kind === "reason" ? "理由" : "依据";
    pushToast(locale === "en-US" ? `Fragment found · ${label}` : `获得观点碎片 · ${label}`);
    emitSfx("sfx.fragment.found");
    if (isResonanceReady(next, entry.opinion.id) && !hasResonated(next, entry.opinion.id)) {
      window.setTimeout(() => {
        if (phaseRef.current === "explore") goto("resonance");
      }, 260);
    }
  }, [entry, goto, locale, persistProgress, pushToast]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        let loadedEntry = loadOpinionWorldEntry(opinionId);
        if (!loadedEntry) {
          const trace = await fetchSourceTrace(opinionId);
          if (!trace?.opinion) throw new Error("opinion_not_found");
          loadedEntry = { ...trace, questionTitle: trace.opinion.questionId };
        }
        const loadedWorld = await fetchWorldConfig(loadedEntry.opinion.questionId);
        const questionId = loadedEntry.opinion.questionId;
        const viewerId = getViewerId();
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
        setWorldState({ ...progress.worldState });
        setFoundSourceIds(progress.foundSourceIds);
        setEntry(loadedEntry);
        setWorld(loadedWorld);
        posRef.current = resolveSpawn(loadedWorld.config, opinionId, { camp: loadedEntry.opinion.camp });
        goto("landing");
      } catch {
        if (alive) goto("error");
      }
    })();
    return () => { alive = false; };
  }, [goto, opinionId]);

  const theme = useMemo(() => entry ? getOpinionWorldTheme(entry.opinion) : null, [entry]);
  const config = useMemo(() => world ? surfaceConfig(world.config) : null, [world]);
  const spawn = useMemo(() => config && entry ? resolveSpawn(config, opinionId, { camp: entry.opinion.camp }) : null, [config, entry, opinionId]);
  const sites = useMemo(
    () => config && entry && theme && spawn ? buildFragmentSites(config, entry.opinion, theme, spawn) : [],
    [config, entry, spawn, theme],
  );
  const runtimeFogs = useMemo(() => runtimeFogsFromWorldState(worldState), [worldState]);
  const comparedPairs = useMemo(() => comparedPairsFromWorldState(worldState), [worldState]);
  const walkCtx = useMemo<WalkContext>(() => ({ worldState, foundSourceIds, comparedPairs, stanceCount: 0 }), [comparedPairs, foundSourceIds, worldState]);
  const fragments = useMemo(() => collectedResonanceFragments(worldState, opinionId), [opinionId, worldState]);
  const resonant = useMemo(() => hasResonated(worldState, opinionId), [opinionId, worldState]);
  const resonanceChapters = useMemo(
    () => entry ? buildResonanceChapters(entry.opinion, entry.sources, foundSourceIds) : [],
    [entry, foundSourceIds],
  );

  const enterExplore = useCallback(() => {
    if (phaseRef.current !== "landing" || !entry) return;
    goto("explore");
    emitSfx("sfx.rocket.land");
    const intro: ResolvedDialogueLine[] = [
      {
        speaker: "guide",
        text: locale === "en-US"
          ? `We made it. This planet formed around “${entry.opinion.title}”. Look before you agree.`
          : `我们到了。这颗星球围绕「${entry.opinion.title}」形成。先别急着赞同它，看看这里为什么会变成这样。`,
      },
      {
        speaker: "guide",
        text: locale === "en-US"
          ? "Three places matter here: the claim, its reasoning, and what can be traced back to source."
          : "这里有三处值得调查：它到底主张什么、为什么这样判断、以及哪些东西真的能回到原文。",
      },
    ];
    window.setTimeout(() => {
      if (phaseRef.current !== "explore") return;
      setDialogue({ lines: intro, openedAt: Date.now(), fragmentKind: "claim" });
      goto("dialogue");
    }, 180);
  }, [entry, goto, locale]);

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
    if (!config) return null;
    const center = { x: posRef.current.x + 0.5, y: posRef.current.y + 0.5 };
    let best: { target: InteractTarget; d: number } | null = null;
    for (const site of sites) {
      const d = distance(center, { x: site.pos.x + 0.5, y: site.pos.y + 0.5 });
      if (d <= INTERACT_RANGE && (!best || d < best.d)) best = { target: { type: "fragment", id: site.id, site }, d };
    }
    for (const poi of config.pois) {
      if (poi.kind !== "rocket") continue;
      const d = distance(center, { x: poi.pos.x + 0.5, y: poi.pos.y + 0.5 });
      if (d <= INTERACT_RANGE && (!best || d < best.d)) best = { target: { type: "poi", id: poi.id, poi }, d };
    }
    return best?.target ?? null;
  }, [config, sites]);

  const openFragmentSite = useCallback((site: FragmentSite) => {
    if (!entry) return;
    tapTargetRef.current = null;
    if (site.fragmentKind === "claim") markFragment("claim");
    if (site.fragmentKind === "evidence" && entry.opinion.sourceIds.length === 0) markFragment("evidence");
    const openedAt = Date.now();
    setDialogue({ lines: localLines(entry, site.fragmentKind, locale), openedAt, fragmentKind: site.fragmentKind });
    goto("dialogue");
    emitSfx("sfx.guide.appear");

    postPlanetDialogue({
      questionId: entry.opinion.questionId,
      opinionId: entry.opinion.id,
      trigger: triggerFor(site.fragmentKind),
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
  }, [entry, goto, locale, markFragment]);

  const startLeave = useCallback(() => {
    if (phaseRef.current === "explore") goto("leaving");
  }, [goto]);

  const interactRef = useRef<() => void>(() => {});
  useEffect(() => {
    interactRef.current = () => {
      if (phaseRef.current !== "explore") return;
      const target = nearestInteractable();
      if (!target) return;
      if (target.type === "fragment") openFragmentSite(target.site);
      else startLeave();
    };
  }, [nearestInteractable, openFragmentSite, startLeave]);

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
    if (phase !== "explore" || !config) return;
    const blockedAt = (position: GridPos): BlockReason | null => {
      const r = PLAYER_RADIUS;
      for (const corner of [
        { x: position.x - r, y: position.y - r },
        { x: position.x + r, y: position.y - r },
        { x: position.x - r, y: position.y + r },
        { x: position.x + r, y: position.y + r },
      ]) {
        const result = isWalkable(config, walkCtx, corner);
        if (result.blocked) return result.reason ?? null;
      }
      return null;
    };
    const notifyBlocked = (reason: BlockReason | null) => {
      if (!reason) return;
      const now = performance.now();
      if (now - lastBlockedToastRef.current < 1600) return;
      lastBlockedToastRef.current = now;
      pushToast(t("world.blocked.generic"));
      emitSfx("sfx.blocked");
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
  }, [config, nearestInteractable, phase, pushToast, t, walkCtx]);

  const closeDialogue = useCallback(() => {
    setDialogue(null);
    goto("explore");
  }, [goto]);

  const handleDialogueAction = useCallback((action: DialogueAction) => {
    if (!entry) return;
    if (action.type === "show-source") {
      setFoundSourceIds((ids) => {
        if (ids.includes(action.sourceId)) return ids;
        persistProgress({ addFoundSource: [action.sourceId] });
        return [...ids, action.sourceId];
      });
      if (entry.opinion.sourceIds.includes(action.sourceId)) markFragment("evidence");
      emitSfx("sfx.source.found");
      return;
    }
    if (action.type === "collect-opinion" && action.opinionId === entry.opinion.id) markFragment("reason");
  }, [entry, markFragment, persistProgress]);

  const transformWorld = useCallback(() => {
    if (!entry) return;
    const key = resonanceCompleteKey(entry.opinion.id);
    if (worldStateRef.current[key]) return;
    applyWorldPatch({ [key]: "understood" });
    emitSfx("sfx.resonance.world");
  }, [applyWorldPatch, entry]);

  const completeResonance = useCallback(() => {
    if (phaseRef.current === "resonance") goto("explore");
  }, [goto]);

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
  if (!world || !entry || !theme || !config) return <main className={styles.loading}>{t("world.loading")}</main>;

  const worldStyle = {
    "--world-sky": theme.sky,
    "--world-ground": theme.ground,
    "--world-road": theme.road,
    "--world-accent": theme.accent,
    "--world-mist": theme.mist,
  } as CSSProperties;
  const hintLabel = hint?.type === "fragment"
    ? t("world.hud.inspect", { name: hint.site.role.replace(/^看山\s*·\s*/, "") })
    : hint?.type === "poi"
      ? t("world.hud.board")
      : null;
  const mantra = locale === "en-US"
    ? "Resonance means understanding an opinion — not proving it."
    : "共鸣意味着理解了观点，不意味着证明了观点。";

  return (
    <main className={styles.world} style={worldStyle} data-el="world-runtime" data-phase={phase} data-fragments={fragments.join(",")} data-resonant={resonant ? "true" : "false"}>
      <header className={styles.header}>
        <button type="button" onClick={() => router.back()}><ArrowLeft size={16} aria-hidden />{t("cosmos.returnUniverse")}</button>
        <div><span>{theme.id}</span><h1>{entry.opinion.title}</h1></div>
        <small>{fragments.length} / 3 · {locale === "en-US" ? "core fragments" : "核心碎片"}</small>
      </header>

      <div ref={viewportElRef} className={styles.sceneViewport}>
        <WorldScene
          config={config}
          npcs={sites}
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
              const site = sites.find((candidate) => candidate.id === npcId);
              if (site) openFragmentSite(site);
              return;
            }
            tapTargetRef.current = {
              x: Math.max(0, Math.min(config.size.w, pos.x)),
              y: Math.max(0, Math.min(config.size.h, pos.y)),
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

      {phase === "dialogue" && dialogue && (
        <DialogueOverlay
          key={`${dialogue.fragmentKind}:${dialogue.openedAt}`}
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
          scrollLabel={locale === "en-US" ? "Opinion resonance · travel scroll" : "观点共鸣 · 探索画卷"}
          unresolvedLabel={locale === "en-US" ? "still unknown" : "仍然未知"}
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
