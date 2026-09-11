"use client";

import { ArrowLeft, Rocket } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { ErrorPageShell } from "@/components/errors/error-page-shell";
import { DialogueOverlay, type ResolvedDialogueLine } from "@/components/world/dialogue-overlay";
import { WorldScene } from "@/components/world/world-scene";
import { getResolvedLocale } from "@/i18n";
import {
  fetchSourceTrace,
  fetchWorldConfig,
  type SourceTrace,
  type WorldNpcView,
  type WorldView,
} from "@/lib/api/opinion";
import { buildGenericDialogue, getDialogueScript } from "@/lib/opinion/dialogue";
import type {
  DialogueAction,
  DialogueScript,
  Opinion,
  Poi,
  WorldTrigger,
} from "@/lib/opinion/types";
import { loadOpinionWorldEntry, type OpinionWorldEntry } from "@/lib/opinion/world-session";
import { OPINION_WORLD_THEMES } from "@/lib/opinion/world-theme";
import { distance, zonesAt, TILE_SIZE, type GridPos } from "@/lib/world/geometry";
import { interpolateDialogueText } from "@/lib/world/interpolate";
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

// /world/[opinionId] —— M2 世界运行时（world-design-v0.2 §5.1/§5.2）。
// 状态机：loading → landing → explore ⇄ dialogue → leaving → router.back()。
// compare / judgement 在状态机里占位（M3/M4 实现）。
// 触发记录（firedTriggerIds）与世界动态状态（worldState）M2 存内存，M4 落库。

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
  after?: () => void;
};

/** 声音触发点（§8）：渲染层统一派发，音频模块后接。 */
function emitSfx(name: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("sfx", { detail: name }));
  }
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

  const phaseRef = useRef<WorldPhase>("loading");
  const posRef = useRef<GridPos>({ x: 0, y: 0 });
  const keysRef = useRef<Set<string>>(new Set());
  const tapTargetRef = useRef<GridPos | null>(null);
  const camRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const zoneIdsRef = useRef<Set<string>>(new Set());
  const firedTriggersRef = useRef<Set<string>>(new Set());
  const worldStateRef = useRef<Record<string, unknown>>({});
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
        if (!alive) return;
        setEntry(e);
        setWorld(w);
        posRef.current = resolveSpawn(w.config, opinionId, { camp: e.opinion.camp });
        goto("landing");
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
      comparedPairs: [], // M3 比较上线后接入
      stanceCount: 0, // M4 立场持久化后接入
    }),
    [foundSourceIds],
  );

  const opinionsById = useMemo(() => {
    const map = new Map<string, Opinion>();
    if (entry) map.set(entry.opinion.id, entry.opinion);
    for (const npc of world?.npcs ?? []) map.set(npc.opinion.id, npc.opinion);
    return map;
  }, [entry, world]);

  // ── 触发器（§5.6）：once 记录暂存内存（M4 落库） ─────────────────────────
  const fireTrigger = useCallback(
    (trigger: WorldTrigger, after?: () => void): boolean => {
      if (!world) return false;
      if (trigger.once && firedTriggersRef.current.has(trigger.id)) return false;
      firedTriggersRef.current.add(trigger.id);
      const raw = t(trigger.guideLineKey, {
        returnObjects: true,
        name: world.config.name,
      }) as unknown;
      const arr = Array.isArray(raw) ? raw : [String(raw)];
      setDialogue({
        kind: "guide",
        lines: arr.map((text) => ({ speaker: "guide" as const, text: String(text) })),
        after,
      });
      emitSfx("sfx.guide.appear");
      goto("dialogue");
      return true;
    },
    [world, t, goto],
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
    const script = dialogue.script;
    if (!npc || !script) return [];
    const trace = resolveTrace(npc.opinion.id);
    const source =
      trace?.sources.find((s) => npc.opinion.sourceIds.includes(s.id)) ??
      trace?.sources[0] ??
      null;
    const author = source
      ? trace?.authors.find((a) => a.id === source.authorId) ?? null
      : null;
    return script.lines.map((line) => ({
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
    for (const npc of world.npcs) {
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
  }, [world]);

  const openNpcDialogue = useCallback(
    (npc: WorldNpcView) => {
      if (!world) return;
      const cfgNpc = world.config.npcs.find((n) => n.id === npc.id);
      const script =
        (cfgNpc && getDialogueScript(cfgNpc.dialogueId)) ??
        buildGenericDialogue(npc.id, npc.opinion.id);
      tapTargetRef.current = null;
      setDialogue({ kind: "npc", npc, script });
      goto("dialogue");
      emitSfx("sfx.npc.talk");
    },
    [world, goto],
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

  // ── 对话动作 ────────────────────────────────────────────────────────────
  const handleDialogueAction = useCallback(
    (action: DialogueAction) => {
      if (action.type === "show-source") {
        setFoundSourceIds((ids) =>
          ids.includes(action.sourceId) ? ids : [...ids, action.sourceId],
        );
        return;
      }
      const feature =
        action.type === "collect-opinion"
          ? t("world.features.collect")
          : action.type === "open-compare"
            ? t("world.features.compare")
            : t("world.features.stance");
      pushToast(t("world.comingSoon", { feature }));
    },
    [t, pushToast],
  );

  const closeDialogue = useCallback(() => {
    const after = dialogue?.after;
    setDialogue(null);
    goto("explore");
    after?.();
  }, [dialogue, goto]);

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
          npcs={world.npcs}
          theme={theme}
          locale={getResolvedLocale()}
          walkCtx={walkCtx}
          worldElRef={worldElRef}
          playerElRef={playerElRef}
          highlightId={hint?.id ?? null}
          onTap={(pos, npcId) => {
            if (phaseRef.current !== "explore") return;
            if (npcId) {
              const npc = world.npcs.find((n) => n.id === npcId);
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
