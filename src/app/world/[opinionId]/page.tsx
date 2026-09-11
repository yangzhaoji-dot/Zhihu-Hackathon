"use client";

import { ArrowLeft, Rocket } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { ErrorPageShell } from "@/components/errors/error-page-shell";
import { WorldBackpack } from "@/components/world/backpack";
import { CompareOverlay } from "@/components/world/compare-overlay";
import { DialogueOverlay, type ResolvedDialogueLine } from "@/components/world/dialogue-overlay";
import { WorldScene } from "@/components/world/world-scene";
import { getResolvedLocale } from "@/i18n";
import {
  collideOpinions,
  fetchSourceTrace,
  fetchStanceProfile,
  fetchWorldConfig,
  fetchWorldProgress,
  fuseOpinions,
  markStance,
  patchWorldProgress,
  postWorldDialogue,
  type SourceTrace,
  type WorldNpcView,
  type WorldProgressPatch,
  type WorldView,
} from "@/lib/api/opinion";
import { buildGenericDialogue, getDialogueScript } from "@/lib/opinion/dialogue";
import type {
  CollisionAnalysis,
  DialogueAction,
  DialogueScript,
  ExplorationProgressDto,
  Opinion,
  Poi,
  Stance,
  WorldTrigger,
} from "@/lib/opinion/types";
import { getViewerId } from "@/lib/opinion/viewer-id";
import {
  loadLocalWorldProgress,
  saveLocalWorldProgress,
} from "@/lib/opinion/world-progress-cache";
import { loadOpinionWorldEntry, type OpinionWorldEntry } from "@/lib/opinion/world-session";
import { OPINION_WORLD_THEMES } from "@/lib/opinion/world-theme";
import { distance, zonesAt, TILE_SIZE, type GridPos } from "@/lib/world/geometry";
import { interpolateDialogueText } from "@/lib/world/interpolate";
import { emptyProgress, mergeProgressPatch } from "@/lib/world/progress-merge";
import { deriveSceneFeedback } from "@/lib/world/scene-feedback";
import { nearestWalkable, resolveSpawn } from "@/lib/world/spawn";
import { canTransition, type WorldPhase } from "@/lib/world/state-machine";
import {
  isPoiRequirementMet,
  isWalkable,
  poiRequirementReason,
  type BlockReason,
  type WalkContext,
} from "@/lib/world/walkability";
import styles from "./page.module.css";

// /world/[opinionId] —— M2 世界运行时（world-design-v0.2 §5.1/§5.2）。
// 状态机：loading → landing → explore ⇄ dialogue → leaving → router.back()。
// M3 落地：compare 面板 + 场景反馈（§5.4）、观点卡背包（§5.3）、
// collect-opinion / open-compare / open-stance 动作、world/progress 读写
// （§4.4，提前自 M4；服务器不可用 → localStorage → 内存 三级降级）。
// judgement 面板仍在 M4 实现。

const SPEED = 5.2; // 格 / 秒
const PLAYER_RADIUS = 0.3; // 碰撞盒半径（格）
const INTERACT_RANGE = 1.5; // 交互半径（格）
const LANDING_MS = 1100; // 降落动画 ≤1.2s
const LEAVING_MS = 1000; // 火箭返回动画
const TOAST_MS = 2600;

type InteractTarget =
  | { type: "npc"; id: string; npc: WorldNpcView }
  | { type: "poi"; id: string; poi: Poi };

type DialogueState = {
  kind: "npc" | "guide";
  npc?: WorldNpcView;
  script?: DialogueScript;
  lines?: ResolvedDialogueLine[];
  /** AI 增强台词（M3）：到达后替换静态模板并重挂载播放器。 */
  aiLines?: ResolvedDialogueLine[];
  openedAt?: number;
  after?: () => void;
};

type CompareState = {
  aId: string;
  bId: string;
  analysis: CollisionAnalysis | null;
  analyzing: boolean;
  fusing: boolean;
  /** deriveSceneFeedback().applied 标签（"bridge" | "fog" | "ruin:<zoneId>"）。 */
  feedback: string[];
  /** 比较是否已成功完成（决定关闭时是否触发看山 compare-done 钩子）。 */
  completed: boolean;
};

/** 声音触发点（§8）：渲染层统一派发，音频模块后接。 */
function emitSfx(name: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("sfx", { detail: name }));
  }
}

/** 从 worldState 键还原运行时迷雾标记（fog_rt:<a>:<b> = {x,y}）。 */
function runtimeFogsFromWorldState(
  worldState: Record<string, unknown>,
): { id: string; pos: GridPos }[] {
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

/** 从 worldState 键还原已完成比较对（bridge:<a>:<b> = "built"）。 */
function comparedPairsFromWorldState(
  worldState: Record<string, unknown>,
): [string, string][] {
  return Object.keys(worldState)
    .filter((key) => key.startsWith("bridge:") && Boolean(worldState[key]))
    .map((key) => key.slice("bridge:".length).split(":") as [string, string])
    .filter((pair) => pair.length === 2 && pair[0] && pair[1]);
}

export default function OpinionWorldPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ opinionId: string }>();
  const opinionId = decodeURIComponent(params.opinionId);

  const [phase, setPhaseState] = useState<WorldPhase>("loading");
  const [entry, setEntry] = useState<OpinionWorldEntry | null>(null);
  const [world, setWorld] = useState<WorldView | null>(null);
  const [dialogue, setDialogue] = useState<DialogueState | null>(null);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [hint, setHint] = useState<InteractTarget | null>(null);
  const [foundSourceIds, setFoundSourceIds] = useState<string[]>([]);
  const [traceCache, setTraceCache] = useState<Record<string, SourceTrace>>({});

  // M3：背包 / 比较 / 态度 / 融合 NPC / 进度
  const [collectedIds, setCollectedIds] = useState<string[]>([]);
  const [backpackOpen, setBackpackOpen] = useState(false);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [compare, setCompare] = useState<CompareState | null>(null);
  const [stanceFor, setStanceFor] = useState<string | null>(null);
  const [stanceSaving, setStanceSaving] = useState(false);
  const [extraNpcs, setExtraNpcs] = useState<WorldNpcView[]>([]);
  const [sourceViewFor, setSourceViewFor] = useState<string | null>(null);
  const [comparedPairs, setComparedPairs] = useState<[string, string][]>([]);
  const [stanceCount, setStanceCount] = useState(0);
  const [wsVersion, setWsVersion] = useState(0); // worldStateRef 变更计数（驱动渲染）

  const phaseRef = useRef<WorldPhase>("loading");
  const posRef = useRef<GridPos>({ x: 0, y: 0 });
  const keysRef = useRef<Set<string>>(new Set());
  const tapTargetRef = useRef<GridPos | null>(null);
  const camRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const zoneIdsRef = useRef<Set<string>>(new Set());
  const firedTriggersRef = useRef<Set<string>>(new Set());
  const worldStateRef = useRef<Record<string, unknown>>({});
  const progressRef = useRef<ExplorationProgressDto | null>(null);
  const dialogueRef = useRef<DialogueState | null>(null);
  const progressOfflineNotifiedRef = useRef(false);
  const lastBlockedToastRef = useRef(0);
  const hintIdRef = useRef<string | null>(null);
  const toastSeqRef = useRef(0);

  const worldElRef = useRef<HTMLDivElement | null>(null);
  const playerElRef = useRef<HTMLDivElement | null>(null);
  const viewportElRef = useRef<HTMLDivElement | null>(null);

  const goto = useCallback((to: WorldPhase) => {
    if (canTransition(phaseRef.current, to)) {
      phaseRef.current = to;
      setPhaseState(to);
    }
  }, []);

  const pushToast = useCallback((text: string) => {
    const id = ++toastSeqRef.current;
    setToasts((list) => [...list.slice(-2), { id, text }]);
    window.setTimeout(() => {
      setToasts((list) => list.filter((item) => item.id !== id));
    }, TOAST_MS);
  }, []);

  // ── 加载顺序（§5.1）：sessionStorage entry（缺失回退 fetchSourceTrace）→ config ──
  //   → progress（§4.4，失败降级 localStorage → 内存）；stance 画像异步预取。
  useEffect(() => {
    let alive = true;
    phaseRef.current = "loading";
    setPhaseState("loading");
    const hydrate = async () => {
      try {
        let e = loadOpinionWorldEntry(opinionId);
        if (!e) {
          const trace = await fetchSourceTrace(opinionId);
          if (!trace || !trace.opinion) throw new Error("opinion_not_found");
          e = { ...trace, questionTitle: trace.opinion.questionId };
        }
        const w = await fetchWorldConfig(e.opinion.questionId);

        // 进度恢复（§4.4）：服务器优先，失败降级 localStorage，再降级空内存。
        const questionId = e.opinion.questionId;
        const viewerId = getViewerId();
        let progress: ExplorationProgressDto | null = null;
        try {
          progress = await fetchWorldProgress(questionId);
          saveLocalWorldProgress(viewerId, progress); // 服务器为真源，同步本地备份
        } catch {
          progress = loadLocalWorldProgress(viewerId, questionId);
        }
        progress ??= emptyProgress(questionId);

        if (!alive) return;
        progressRef.current = progress;
        worldStateRef.current = { ...progress.worldState };
        firedTriggersRef.current = new Set(progress.firedTriggerIds);
        setFoundSourceIds(progress.foundSourceIds);
        setCollectedIds(progress.collectedOpinionIds);
        setComparedPairs(comparedPairsFromWorldState(progress.worldState));
        setWsVersion((v) => v + 1);

        setEntry(e);
        setWorld(w);
        posRef.current = resolveSpawn(w.config, opinionId, { camp: e.opinion.camp });
        goto("landing");

        // 异步预取 stance 画像（条件桥 requires-stance / 观测站摘要用）
        fetchStanceProfile()
          .then((profile) => {
            if (alive) setStanceCount(profile.agree.length + profile.disagree.length + profile.neutral.length);
          })
          .catch(() => {});
      } catch {
        if (alive) goto("error");
      }
    };
    void hydrate();
    return () => {
      alive = false;
    };
  }, [opinionId, goto]);

  const theme = world ? OPINION_WORLD_THEMES[world.config.worldType] : null;
  const walkCtx = useMemo<WalkContext>(
    () => ({
      worldState: worldStateRef.current,
      foundSourceIds,
      comparedPairs,
      stanceCount,
    }),
    // wsVersion 变化说明 worldStateRef.current 被写入（桥点亮/迷雾/废墟标记）
    [foundSourceIds, comparedPairs, stanceCount, wsVersion],
  );

  const opinionsById = useMemo(() => {
    const map = new Map<string, Opinion>();
    if (entry) map.set(entry.opinion.id, entry.opinion);
    for (const npc of world?.npcs ?? []) map.set(npc.opinion.id, npc.opinion);
    for (const npc of extraNpcs) map.set(npc.opinion.id, npc.opinion);
    return map;
  }, [entry, world, extraNpcs]);

  /** 场景内全部 NPC = 配置 NPC + 融合生成的运行时半透明 NPC（§5.4 第 4 步）。 */
  const allNpcs = useMemo<WorldNpcView[]>(
    () => [...(world?.npcs ?? []), ...extraNpcs],
    [world, extraNpcs],
  );

  const runtimeFogs = useMemo(
    () => runtimeFogsFromWorldState(worldStateRef.current),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wsVersion],
  );

  // ── 进度写入（§4.4）：乐观合并 → POST；失败降级 localStorage（一次性提示） ──
  const applyProgressPatch = useCallback(
    (patch: WorldProgressPatch) => {
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
    },
    [entry, pushToast, t],
  );

  // ── 触发器（§5.6）：once 语义 + §4.4 firedTriggerIds 落库 ───────────────
  const fireTrigger = useCallback(
    (
      trigger: WorldTrigger,
      after?: () => void,
      params?: Record<string, unknown>,
    ): boolean => {
      if (!world) return false;
      if (trigger.once && firedTriggersRef.current.has(trigger.id)) return false;
      firedTriggersRef.current.add(trigger.id);
      if (trigger.once) applyProgressPatch({ addFiredTrigger: [trigger.id] });
      const raw = t(trigger.guideLineKey, {
        returnObjects: true,
        name: world.config.name,
        ...params,
      }) as unknown;
      const arr = Array.isArray(raw) ? raw : [String(raw)];
      setDialogue({
        kind: "guide",
        openedAt: Date.now(),
        lines: arr.map((text) => ({ speaker: "guide" as const, text: String(text) })),
        after,
      });
      emitSfx("sfx.guide.appear");
      goto("dialogue");
      return true;
    },
    [world, t, goto, applyProgressPatch],
  );

  const enterExplore = useCallback(() => {
    if (phaseRef.current !== "landing" || !world) return;
    goto("explore");
    emitSfx("sfx.rocket.land");
    const firstLand = world.config.triggers.find((tr) => tr.on === "first-land");
    if (firstLand) fireTrigger(firstLand);
  }, [world, goto, fireTrigger]);

  // landing：≤1.2s 自动结束，任意键/点击跳过
  useEffect(() => {
    if (phase !== "landing") return;
    const timer = window.setTimeout(enterExplore, LANDING_MS);
    const onKeyDown = () => enterExplore();
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [phase, enterExplore]);

  // leaving：火箭动画后返回宇宙
  useEffect(() => {
    if (phase !== "leaving") return;
    emitSfx("sfx.rocket.launch");
    const timer = window.setTimeout(() => router.back(), LEAVING_MS);
    return () => window.clearTimeout(timer);
  }, [phase, router]);

  // ── 来源数据：landing 观点直接用 entry，其余 NPC 懒加载 SourceTrace ──────
  const resolveTrace = useCallback(
    (opId: string): { sources: OpinionWorldEntry["sources"]; authors: OpinionWorldEntry["authors"] } | null => {
      if (entry && opId === entry.opinion.id) return { sources: entry.sources, authors: entry.authors };
      const cached = traceCache[opId];
      return cached ? { sources: cached.sources, authors: cached.authors } : null;
    },
    [entry, traceCache],
  );

  useEffect(() => {
    if (dialogue?.kind !== "npc" || !dialogue.npc || !entry) return;
    const opId = dialogue.npc.opinion.id;
    if (opId === entry.opinion.id || traceCache[opId]) return;
    let alive = true;
    fetchSourceTrace(opId)
      .then((trace) => {
        if (alive && trace?.opinion) {
          setTraceCache((cache) => ({ ...cache, [opId]: trace }));
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [dialogue, entry, traceCache]);

  // ── 对话文本插值（{excerpt}/{author}/{upvotes} 等） ─────────────────────
  const dialogueLines = useMemo<ResolvedDialogueLine[]>(() => {
    if (!dialogue) return [];
    if (dialogue.kind === "guide") return dialogue.lines ?? [];
    const npc = dialogue.npc;
    if (!npc) return [];
    const trace = resolveTrace(npc.opinion.id);
    const source =
      trace?.sources.find((s) => npc.opinion.sourceIds.includes(s.id)) ??
      trace?.sources[0] ??
      null;
    const author = source
      ? trace?.authors.find((a) => a.id === source.authorId) ?? null
      : null;
    // M3：AI 台词到达后替换静态模板（同样过插值与来源白名单过滤，双保险）。
    const baseLines = dialogue.aiLines ?? dialogue.script?.lines ?? [];
    return baseLines.map((line) => ({
      ...line,
      text: interpolateDialogueText(line.text, { opinion: npc.opinion, source, author }),
      actions: line.actions
        ?.map((action) =>
          action.type === "show-source" && action.sourceId === "__first__" && source
            ? { ...action, sourceId: source.id }
            : action,
        )
        .filter(
          (action) =>
            action.type !== "show-source" ||
            action.sourceId === "__first__" ||
            (trace?.sources.some((s) => s.id === action.sourceId) ?? false),
        ),
    }));
  }, [dialogue, resolveTrace]);

  const resolveSource = useCallback(
    (sourceId: string) => {
      if (!dialogue?.npc) return null;
      const trace = resolveTrace(dialogue.npc.opinion.id);
      const source = trace?.sources.find((s) => s.id === sourceId);
      if (!source) return null;
      return { source, author: trace?.authors.find((a) => a.id === source.authorId) };
    },
    [dialogue, resolveTrace],
  );

  // ── 阻挡条件文案（i18n） ────────────────────────────────────────────────
  const blockedText = useCallback(
    (reason: BlockReason | null): string => {
      if (!reason) return t("world.blocked.generic");
      switch (reason.kind) {
        case "requires-sources":
          return t("world.blocked.sources", { count: reason.missing.length });
        case "requires-compare":
          return t("world.blocked.compare", {
            a: opinionsById.get(reason.pair[0])?.title ?? reason.pair[0],
            b: opinionsById.get(reason.pair[1])?.title ?? reason.pair[1],
          });
        case "requires-stance":
          return t("world.blocked.stance", { count: reason.count });
        default:
          return t("world.blocked.generic");
      }
    },
    [t, opinionsById],
  );

  // ── 交互目标：1.5 格内最近可交互对象 ────────────────────────────────────
  const nearestInteractable = useCallback((): InteractTarget | null => {
    if (!world) return null;
    const center = { x: posRef.current.x + 0.5, y: posRef.current.y + 0.5 };
    let best: { target: InteractTarget; d: number } | null = null;
    for (const npc of allNpcs) {
      const d = distance(center, { x: npc.pos.x + 0.5, y: npc.pos.y + 0.5 });
      if (d <= INTERACT_RANGE && (!best || d < best.d)) {
        best = { target: { type: "npc", id: npc.id, npc }, d };
      }
    }
    for (const poi of world.config.pois) {
      if (poi.kind === "fog" || poi.kind === "chest") continue;
      const d = distance(center, { x: poi.pos.x + 0.5, y: poi.pos.y + 0.5 });
      if (d <= INTERACT_RANGE && (!best || d < best.d)) {
        best = { target: { type: "poi", id: poi.id, poi }, d };
      }
    }
    return best?.target ?? null;
  }, [world, allNpcs]);

  // ── NPC 对话：静态模板立即播（断网/无 AI 完整体验），AI 增强异步替换 ──
  const openNpcDialogue = useCallback(
    (npc: WorldNpcView) => {
      if (!world) return;
      const cfgNpc = world.config.npcs.find((n) => n.id === npc.id);
      const script =
        (cfgNpc && getDialogueScript(cfgNpc.dialogueId)) ??
        buildGenericDialogue(npc.id, npc.opinion.id);
      tapTargetRef.current = null;
      const opened: DialogueState = { kind: "npc", npc, script, openedAt: Date.now() };
      dialogueRef.current = opened;
      setDialogue(opened);
      goto("dialogue");
      emitSfx("sfx.npc.talk");
      applyProgressPatch({ addVisitedNpc: [npc.id] });

      // AI 增强（§4.2）：模板优先，AI 到达且对话仍停在前几行时整段替换。
      postWorldDialogue({
        npcId: npc.id,
        trigger: "talk",
        locale: getResolvedLocale(),
        history: [],
        worldState: worldStateRef.current,
      }).then((reply) => {
        if (!reply || reply.source !== "ai") return;
        const current = dialogueRef.current;
        if (
          !current ||
          current.kind !== "npc" ||
          current.npc?.id !== npc.id ||
          Date.now() - (current.openedAt ?? 0) > 6000 // 玩家已开始翻页就不打断
        ) {
          return;
        }
        const next: DialogueState = { ...current, aiLines: reply.lines };
        dialogueRef.current = next;
        setDialogue(next);
      });
    },
    [world, goto, applyProgressPatch],
  );

  const startLeave = useCallback(() => {
    if (!world) return;
    const beforeLeave = world.config.triggers.find((tr) => tr.on === "before-leave");
    const shown = beforeLeave ? fireTrigger(beforeLeave, () => goto("leaving")) : false;
    if (!shown) goto("leaving");
  }, [world, fireTrigger, goto]);

  const interactWithPoi = useCallback(
    (poi: Poi) => {
      if (!world) return;
      switch (poi.kind) {
        case "rocket":
          startLeave();
          return;
        case "bridge":
        case "gate":
          if (!isPoiRequirementMet(poi, walkCtx)) {
            emitSfx("sfx.blocked");
            pushToast(blockedText(poiRequirementReason(poi, walkCtx)));
          }
          return;
        case "monument": {
          const top = [...world.npcs].sort(
            (a, b) => b.opinion.support - a.opinion.support,
          )[0];
          if (top) {
            pushToast(
              t("world.monumentToast", {
                title: top.opinion.title,
                support: top.opinion.support,
              }),
            );
          }
          return;
        }
        case "observatory":
          pushToast(t("world.comingSoon", { feature: t("world.features.observatory") }));
          return;
        default:
          return;
      }
    },
    [world, walkCtx, blockedText, pushToast, startLeave, t],
  );

  const interactRef = useRef<() => void>(() => {});
  useEffect(() => {
    interactRef.current = () => {
      if (phaseRef.current !== "explore") return;
      const target = nearestInteractable();
      if (!target) return;
      if (target.type === "npc") openNpcDialogue(target.npc);
      else interactWithPoi(target.poi);
    };
  });

  // ── 键盘：WASD/方向键持续移动（keyup 释放），E/空格交互 ─────────────────
  useEffect(() => {
    const MOVE_KEYS = new Set(["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"]);
    const onKeyDown = (event: KeyboardEvent) => {
      if (phaseRef.current !== "explore") return;
      const key = event.key.toLowerCase();
      if (MOVE_KEYS.has(key) || key === " ") event.preventDefault();
      if (MOVE_KEYS.has(key)) keysRef.current.add(key);
      if (key === "e" || key === " ") interactRef.current();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(event.key.toLowerCase());
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // ── 主循环：移动（轴分离碰撞）、相机（20% 死区）、区域触发器、交互提示 ──
  useEffect(() => {
    if (phase !== "explore" || !world) return;
    const config = world.config;
    const ctx = walkCtx;

    const blockedAt = (p: GridPos): BlockReason | null => {
      const r = PLAYER_RADIUS;
      for (const c of [
        { x: p.x - r, y: p.y - r },
        { x: p.x + r, y: p.y - r },
        { x: p.x - r, y: p.y + r },
        { x: p.x + r, y: p.y + r },
      ]) {
        const res = isWalkable(config, ctx, c);
        if (res.blocked) return res.reason ?? null;
      }
      return null;
    };

    const notifyBlocked = (reason: BlockReason | null) => {
      if (!reason) return;
      if (
        reason.kind !== "requires-sources" &&
        reason.kind !== "requires-compare" &&
        reason.kind !== "requires-stance"
      ) {
        return;
      }
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

      // 输入向量
      let dx = 0;
      let dy = 0;
      const keys = keysRef.current;
      if (keys.has("w") || keys.has("arrowup")) dy -= 1;
      if (keys.has("s") || keys.has("arrowdown")) dy += 1;
      if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
      if (keys.has("d") || keys.has("arrowright")) dx += 1;

      if (dx !== 0 || dy !== 0) {
        tapTargetRef.current = null;
        const len = Math.hypot(dx, dy);
        dx = (dx / len) * SPEED * dt;
        dy = (dy / len) * SPEED * dt;
      } else if (tapTargetRef.current) {
        // 移动端点按：直线走向目的地，遇阻挡停
        const center = { x: pos.x + 0.5, y: pos.y + 0.5 };
        const target = tapTargetRef.current;
        const vx = target.x - center.x;
        const vy = target.y - center.y;
        const len = Math.hypot(vx, vy);
        if (len < 0.18) {
          tapTargetRef.current = null;
        } else {
          dx = (vx / len) * SPEED * dt;
          dy = (vy / len) * SPEED * dt;
        }
      }

      if (dx !== 0 || dy !== 0) {
        // 轴分离：先 x 后 y，贴着阻挡滑动
        const tryX = { x: pos.x + dx, y: pos.y };
        const reasonX = blockedAt(tryX);
        if (!reasonX) posRef.current = tryX;
        else if (tapTargetRef.current || dx !== 0) notifyBlocked(reasonX);
        const afterX = posRef.current;
        const tryY = { x: afterX.x, y: afterX.y + dy };
        const reasonY = blockedAt(tryY);
        if (!reasonY) posRef.current = tryY;
        else if (tapTargetRef.current || dy !== 0) notifyBlocked(reasonY);
        // 点按移动被完全挡住时放弃目的地
        if (tapTargetRef.current && reasonX && reasonY) tapTargetRef.current = null;
      }

      // 渲染：玩家 + 相机（直接写 DOM，避免 60fps setState）
      const playerEl = playerElRef.current;
      if (playerEl) {
        playerEl.style.transform = `translate(${posRef.current.x * TILE_SIZE}px, ${posRef.current.y * TILE_SIZE}px)`;
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
        // 世界小于视口时居中；否则 20% 边缘死区跟随
        let targetX: number;
        let targetY: number;
        if (worldW <= vw) targetX = (worldW - vw) / 2;
        else {
          targetX = cam.x;
          if (px - targetX < vw * 0.2) targetX = px - vw * 0.2;
          if (px - targetX > vw * 0.8) targetX = px - vw * 0.8;
          targetX = Math.max(0, Math.min(worldW - vw, targetX));
        }
        if (worldH <= vh) targetY = (worldH - vh) / 2;
        else {
          targetY = cam.y;
          if (py - targetY < vh * 0.2) targetY = py - vh * 0.2;
          if (py - targetY > vh * 0.8) targetY = py - vh * 0.8;
          targetY = Math.max(0, Math.min(worldH - vh, targetY));
        }
        const lerp = Math.min(1, dt * 9);
        cam.x += (targetX - cam.x) * lerp;
        cam.y += (targetY - cam.y) * lerp;
        worldEl.style.transform = `translate3d(${-cam.x}px, ${-cam.y}px, 0)`;
      }

      // 区域进入触发器（enter-zone，once 语义在 fireTrigger 内判定）
      const center = { x: posRef.current.x + 0.5, y: posRef.current.y + 0.5 };
      const currentZoneIds = new Set(zonesAt(config.zones, center).map((z) => z.id));
      for (const zoneId of currentZoneIds) {
        if (!zoneIdsRef.current.has(zoneId)) {
          const trigger = config.triggers.find(
            (tr) => tr.on === "enter-zone" && tr.zoneId === zoneId,
          );
          if (trigger) fireTrigger(trigger);
        }
      }
      zoneIdsRef.current = currentZoneIds;

      // 交互提示（id 变化才 setState）
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
  }, [phase, world, walkCtx, nearestInteractable, fireTrigger, pushToast, blockedText]);

  const closeDialogue = useCallback(() => {
    const after = dialogue?.after;
    dialogueRef.current = null;
    setDialogue(null);
    goto("explore");
    after?.();
  }, [dialogue, goto]);

  // ── 对话动作（§5.3/§5.4/M3 落地） ───────────────────────────────────────
  const handleDialogueAction = useCallback(
    (action: DialogueAction) => {
      if (action.type === "show-source") {
        setFoundSourceIds((ids) => {
          if (ids.includes(action.sourceId)) return ids;
          applyProgressPatch({ addFoundSource: [action.sourceId] });
          return [...ids, action.sourceId];
        });
        emitSfx("sfx.source.found");
        return;
      }
      if (action.type === "collect-opinion") {
        const opinion = opinionsById.get(action.opinionId);
        setCollectedIds((ids) => {
          if (ids.includes(action.opinionId)) {
            pushToast(t("world.backpack.alreadyCollected"));
            return ids;
          }
          applyProgressPatch({ addCollectedOpinion: [action.opinionId] });
          pushToast(
            t("world.backpack.collected", {
              title: opinion?.title ?? action.opinionId,
            }),
          );
          return [...ids, action.opinionId];
        });
        return;
      }
      if (action.type === "open-compare") {
        // 打开背包选卡（比较需要两张卡）；从对话跳过时先关对话。
        closeDialogue();
        setBackpackOpen(true);
        pushToast(t("world.backpack.compareHint"));
        return;
      }
      // open-stance：关对话后弹出态度选择（M0 stance 端点已 DB 化）。
      setStanceFor(action.opinionId);
      closeDialogue();
    },
    [t, pushToast, applyProgressPatch, opinionsById, closeDialogue],
  );

  // ── 世界内比较（§5.4）：选 2 卡 → /collide → 场景反馈 → 看山 compare-done ──
  const openCompare = useCallback(
    (aId: string, bId: string) => {
      if (!world) return;
      setBackpackOpen(false);
      setSelectedCards([]);
      setCompare({
        aId,
        bId,
        analysis: null,
        analyzing: true,
        fusing: false,
        feedback: [],
        completed: false,
      });
      goto("compare");

      collideOpinions(aId, bId)
        .then((analysis) => {
          const a = opinionsById.get(aId);
          const b = opinionsById.get(bId);
          let feedback: string[] = [];
          if (a && b) {
            const cfg = world.config;
            const npcA = cfg.npcs.find((n) => n.opinionId === aId);
            const npcB = cfg.npcs.find((n) => n.opinionId === bId);
            const posOf = (npc: typeof npcA, o: Opinion): GridPos =>
              npc?.pos ?? { x: o.x * cfg.size.w, y: o.y * cfg.size.h };
            const result = deriveSceneFeedback(analysis, a, b, {
              zoneIds: { a: npcA?.zoneId, b: npcB?.zoneId },
              positions: { a: posOf(npcA, a), b: posOf(npcB, b) },
            });
            feedback = result.applied;
            if (Object.keys(result.worldState).length > 0) {
              Object.assign(worldStateRef.current, result.worldState);
              setWsVersion((v) => v + 1);
              applyProgressPatch({ setWorldState: result.worldState });
              if (feedback.includes("bridge")) emitSfx("sfx.relation.discover");
            }
            setComparedPairs((pairs) =>
              pairs.some(
                ([x, y]) =>
                  [x, y].sort().join(":") === result.comparedPair.join(":"),
              )
                ? pairs
                : [...pairs, result.comparedPair],
            );
          }
          setCompare((c) =>
            c ? { ...c, analysis, analyzing: false, feedback, completed: true } : c,
          );
        })
        .catch(() => {
          pushToast(t("world.compare.failed"));
          setCompare(null);
          goto("explore");
        });
    },
    [world, opinionsById, goto, applyProgressPatch, pushToast, t],
  );

  const closeCompare = useCallback(() => {
    const done = compare;
    setCompare(null);
    goto("explore");
    // 看山 compare-done 台词钩子（§5.4/§5.6）：仅在比较成功完成后触发。
    if (done?.completed && done.analysis && world) {
      const trigger = world.config.triggers.find((tr) => tr.on === "compare-done");
      if (trigger) {
        fireTrigger(trigger, undefined, {
          consensus: done.analysis.consensus,
          disagreement: done.analysis.coreDisagreement,
        });
      }
    }
  }, [compare, world, goto, fireTrigger]);

  // 融合为新观点（§5.4 第 4 步）：/fuse，x/y 用玩家当前世界内归一化坐标。
  const handleFuse = useCallback(() => {
    if (!compare?.analysis || !world || compare.fusing) return;
    const { aId, bId, analysis } = compare;
    setCompare({ ...compare, fusing: true });
    fuseOpinions({
      parentA: aId,
      parentB: bId,
      title: analysis.candidate.title,
      summary: analysis.candidate.summary,
      x: Math.min(1, Math.max(0, (posRef.current.x + 0.5) / world.config.size.w)),
      y: Math.min(1, Math.max(0, (posRef.current.y + 0.5) / world.config.size.h)),
    })
      .then((opinion) => {
        // 生成的 AI 观点以半透明 NPC 出现在玩家身旁（运行时追加，不占格阻挡）。
        const near = nearestWalkable(world.config, walkCtx, {
          x: Math.round(posRef.current.x),
          y: Math.round(posRef.current.y) + 1,
        }) ?? { x: Math.round(posRef.current.x), y: Math.round(posRef.current.y) + 1 };
        setExtraNpcs((list) => [
          ...list,
          {
            id: `npc_${opinion.id}`,
            opinion,
            sourceCount: 0,
            pos: near,
            sprite: "",
            role: t("world.fusedRole"),
            translucent: true,
          },
        ]);
        pushToast(t("world.compare.fused"));
        closeCompare();
      })
      .catch(() => {
        pushToast(t("world.compare.failed"));
        setCompare((c) => (c ? { ...c, fusing: false } : c));
      });
  }, [compare, world, walkCtx, closeCompare, pushToast, t]);

  // ── 态度标记（open-stance 动作 → M0 stance 端点） ───────────────────────
  const handleStancePick = useCallback(
    (stance: Stance) => {
      if (!stanceFor || stanceSaving) return;
      setStanceSaving(true);
      markStance(stanceFor, stance)
        .then((profile) => {
          setStanceCount(profile.agree.length + profile.disagree.length + profile.neutral.length);
          pushToast(t("world.stancePicker.saved"));
        })
        .catch(() => pushToast(t("world.stancePicker.failed")))
        .finally(() => {
          setStanceSaving(false);
          setStanceFor(null);
        });
    },
    [stanceFor, stanceSaving, pushToast, t],
  );

  // ── 渲染 ────────────────────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <ErrorPageShell>
        <div className={styles.errorCard}>
          <h1>{t("world.notFound")}</h1>
          <button type="button" onClick={() => router.push("/")}>
            {t("cosmos.returnUniverse")}
          </button>
        </div>
      </ErrorPageShell>
    );
  }

  if (!world || !entry || !theme) {
    return <main className={styles.loading}>{t("world.loading")}</main>;
  }

  const worldStyle = {
    "--world-sky": theme.sky,
    "--world-ground": theme.ground,
    "--world-road": theme.road,
    "--world-accent": theme.accent,
    "--world-mist": theme.mist,
  } as CSSProperties;

  const hintLabel =
    hint?.type === "npc"
      ? t("world.hud.talkTo", { name: hint.npc.role })
      : hint?.type === "poi" && hint.poi.kind === "rocket"
        ? t("world.hud.board")
        : hint?.type === "poi"
          ? t("world.hud.inspect", {
              name: hint.poi.label?.[getResolvedLocale()] ?? hint.poi.label?.["zh-CN"] ?? hint.poi.id,
            })
          : null;

  return (
    <main
      className={styles.world}
      style={worldStyle}
      data-el="world-runtime"
      data-phase={phase}
    >
      <header className={styles.header}>
        <button type="button" onClick={() => router.back()}>
          <ArrowLeft size={16} aria-hidden />
          {t("cosmos.returnUniverse")}
        </button>
        <div>
          <span>{world.config.name}</span>
          <h1>{entry.opinion.title}</h1>
        </div>
        <small>{t("world.hud.controlsHint")}</small>
      </header>

      <div ref={viewportElRef} className={styles.sceneViewport}>
        <WorldScene
          config={world.config}
          npcs={allNpcs}
          theme={theme}
          locale={getResolvedLocale()}
          walkCtx={walkCtx}
          runtimeFogs={runtimeFogs}
          worldElRef={worldElRef}
          playerElRef={playerElRef}
          highlightId={hint?.id ?? null}
          onTap={(pos, npcId) => {
            if (phaseRef.current !== "explore") return;
            if (npcId) {
              const npc = allNpcs.find((n) => n.id === npcId);
              if (npc) openNpcDialogue(npc);
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
          <div className={styles.landingRocket} aria-hidden>
            <Rocket size={44} />
          </div>
          <p>{world.config.name}</p>
          <small>{t("world.landingHint")}</small>
        </div>
      )}

      {phase === "leaving" && (
        <div className={styles.leaving} data-el="world-leaving">
          <div className={styles.leavingRocket} aria-hidden>
            <Rocket size={44} />
          </div>
          <p>{t("world.leavingHint")}</p>
        </div>
      )}

      {phase === "explore" && hint && hintLabel && (
        <button type="button" className={styles.interact} onClick={() => interactRef.current()}>
          E · {hintLabel}
        </button>
      )}

      {phase === "dialogue" && dialogue && dialogueLines.length > 0 && (
        <DialogueOverlay
          key={`${dialogue.kind}:${dialogue.npc?.id ?? "guide"}:${dialogue.aiLines ? "ai" : "static"}`}
          lines={dialogueLines}
          npcLabel={dialogue.npc?.role ?? ""}
          subtitle={dialogue.npc?.opinion.title}
          npcSprite={dialogue.npc?.sprite}
          accent={theme.accent}
          onAction={handleDialogueAction}
          onClose={closeDialogue}
          resolveSource={resolveSource}
        />
      )}

      {phase === "compare" && compare && (
        <CompareOverlay
          aTitle={opinionsById.get(compare.aId)?.title ?? compare.aId}
          bTitle={opinionsById.get(compare.bId)?.title ?? compare.bId}
          analysis={compare.analysis}
          analyzing={compare.analyzing}
          fusing={compare.fusing}
          feedbackApplied={compare.feedback}
          onFuse={handleFuse}
          onClose={closeCompare}
        />
      )}

      {(phase === "explore" || phase === "dialogue") && (
        <WorldBackpack
          open={backpackOpen && phase === "explore"}
          onToggleOpen={() => setBackpackOpen((v) => !v)}
          cards={collectedIds.flatMap((id) => {
            const opinion = opinionsById.get(id);
            return opinion
              ? [{ opinion, sourceCount: opinion.sourceIds.length }]
              : [];
          })}
          selected={selectedCards}
          onToggleSelect={(id) =>
            setSelectedCards((sel) =>
              sel.includes(id)
                ? sel.filter((x) => x !== id)
                : sel.length >= 2
                  ? [sel[1], id]
                  : [...sel, id],
            )
          }
          onViewSource={(id) => {
            setSourceViewFor(id);
            const cached = traceCache[id];
            if (!cached) {
              fetchSourceTrace(id)
                .then((trace) => {
                  if (trace?.opinion) {
                    setTraceCache((cache) => ({ ...cache, [id]: trace }));
                  }
                })
                .catch(() => {});
            }
          }}
          onCompare={openCompare}
        />
      )}

      {sourceViewFor && (
        <div className={styles.sourceModal} onClick={() => setSourceViewFor(null)}>
          <div className={styles.sourceModalCard} onClick={(e) => e.stopPropagation()}>
            <h2>{opinionsById.get(sourceViewFor)?.title ?? sourceViewFor}</h2>
            {resolveTrace(sourceViewFor)?.sources.length ? (
              resolveTrace(sourceViewFor)!.sources.map((s) => (
                <blockquote key={s.id}>
                  <p>{s.excerpt}</p>
                  <small>
                    {resolveTrace(sourceViewFor)?.authors.find((a) => a.id === s.authorId)?.name ??
                      "—"}{" "}
                    · {t("cosmos.upvotes", { n: s.upvotes.toLocaleString("zh-CN") })}
                  </small>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {t("world.openSource")}
                  </a>
                </blockquote>
              ))
            ) : (
              <p className={styles.sourceModalEmpty}>{t("world.dialogue.archiveEmpty")}</p>
            )}
          </div>
        </div>
      )}

      {phase === "explore" && stanceFor && (
        <div className={styles.stanceModal} onClick={() => setStanceFor(null)}>
          <div className={styles.stanceCard} onClick={(e) => e.stopPropagation()}>
            <p>{t("world.stancePicker.prompt", { title: opinionsById.get(stanceFor)?.title ?? stanceFor })}</p>
            <div className={styles.stanceButtons}>
              {(["agree", "disagree", "neutral"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={stanceSaving}
                  onClick={() => handleStancePick(s)}
                >
                  {t(`world.stancePicker.${s}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={styles.toasts} aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={styles.toast}>
            {toast.text}
          </div>
        ))}
      </div>
    </main>
  );
}
