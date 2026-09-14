"use client";

import { ArrowLeft, Rocket } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { ErrorPageShell } from "@/components/errors/error-page-shell";
import { CarrierInteractionStage } from "@/components/world/carrier-interaction-stage";
import { CognitionFragmentHud } from "@/components/world/cognition-fragment-hud";
import { DynamicCarrierLayer, type DynamicCarrierSite } from "@/components/world/dynamic-carrier-layer";
import { KanshanCarrierOverlay } from "@/components/world/kanshan-carrier-overlay";
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
import { buildPlanetSceneSpec } from "@/lib/opinion/planet-scene-spec";
import type { ExplorationProgressDto, Poi, WorldConfig } from "@/lib/opinion/types";
import { getViewerId } from "@/lib/opinion/viewer-id";
import { getOpinionWorldTheme } from "@/lib/opinion/world-theme";
import { loadLocalWorldProgress, saveLocalWorldProgress } from "@/lib/opinion/world-progress-cache";
import { loadOpinionWorldEntry, type OpinionWorldEntry } from "@/lib/opinion/world-session";
import { buildCarrierInteraction, type CarrierInteractionDefinition } from "@/lib/world/carrier-interactions";
import {
  buildCognitionFragmentPlan,
  cognitionFragmentKey,
  collectedCognitionFragments,
  isCognitionPlanComplete,
  type CognitionFragmentSpec,
} from "@/lib/world/cognition-fragment-plan";
import { buildCognitionResonanceChapters } from "@/lib/world/cognition-resonance";
import { layoutCognitionSites, type CognitionSiteLayout } from "@/lib/world/cognition-site-layout";
import { distance, TILE_SIZE, type GridPos } from "@/lib/world/geometry";
import { buildKanshanCarrierPrompts, type KanshanPrompt } from "@/lib/world/kanshan-carrier-guide";
import { emptyProgress, mergeProgressPatch } from "@/lib/world/progress-merge";
import { hasResonated, resonanceCompleteKey } from "@/lib/world/resonance";
import { resolveSpawn } from "@/lib/world/spawn";
import { canTransition, type WorldPhase } from "@/lib/world/state-machine";
import { isWalkable, type BlockReason, type WalkContext } from "@/lib/world/walkability";
import styles from "./page.module.css";

const SPEED = 5.2;
const PLAYER_RADIUS = 0.3;
const INTERACT_RANGE = 1.55;
const LANDING_MS = 1100;
const LEAVING_MS = 1000;
const TOAST_MS = 2600;

type RuntimeSite = CognitionSiteLayout & { interaction: CarrierInteractionDefinition };

type InteractTarget =
  | { type: "carrier"; id: string; site: RuntimeSite }
  | { type: "poi"; id: string; poi: Poi };

type GuideState = {
  site: RuntimeSite;
  prompts: KanshanPrompt[];
};

function emitSfx(name: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("sfx", { detail: name }));
}

function surfaceConfig(config: WorldConfig): WorldConfig {
  return {
    ...config,
    npcs: [],
    pois: config.pois.filter((poi) => poi.kind === "rocket" || poi.kind === "fog"),
  };
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
    ) fogs.push({ id: key, pos: value as GridPos });
  }
  return fogs;
}

function comparedPairsFromWorldState(worldState: Record<string, unknown>): [string, string][] {
  return Object.keys(worldState)
    .filter((key) => key.startsWith("bridge:") && Boolean(worldState[key]))
    .map((key) => key.slice("bridge:".length).split(":") as [string, string])
    .filter((pair) => pair.length === 2 && Boolean(pair[0]) && Boolean(pair[1]));
}

function isCoreCarrier(fragment: CognitionFragmentSpec) {
  return fragment.role === "claim" || fragment.role === "reason" || fragment.role === "evidence";
}

function worldNpcForSite(site: RuntimeSite, entry: OpinionWorldEntry): WorldNpcView {
  const coreKind = site.fragment.role === "claim"
    ? "claim"
    : site.fragment.role === "reason"
      ? "reason"
      : "evidence";
  return {
    id: `fragment_${coreKind}_${entry.opinion.id}`,
    opinion: entry.opinion,
    sourceCount: entry.opinion.sourceIds.length,
    pos: site.pos,
    sprite: "",
    role: `看山 · ${site.fragment.carrier}`,
    translucent: entry.opinion.kind === "ai" && coreKind === "evidence",
  };
}

function planetDialogueTrigger(fragment: CognitionFragmentSpec): PlanetDialogueTrigger {
  if (fragment.role === "claim") return "inspect-claim";
  if (fragment.role === "reason" || fragment.role === "condition") return "inspect-reason";
  return "inspect-evidence";
}

export default function PlanetRuntimeV2() {
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
  const [guide, setGuide] = useState<GuideState | null>(null);
  const [carrierSite, setCarrierSite] = useState<RuntimeSite | null>(null);
  const [hint, setHint] = useState<InteractTarget | null>(null);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [flashFragmentId, setFlashFragmentId] = useState<string | null>(null);

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
  const sceneSpec = useMemo(
    () => entry && theme ? (theme.sceneSpec ?? buildPlanetSceneSpec(entry.opinion)) : null,
    [entry, theme],
  );
  const config = useMemo(() => world ? surfaceConfig(world.config) : null, [world]);
  const spawn = useMemo(
    () => config && entry ? resolveSpawn(config, opinionId, { camp: entry.opinion.camp }) : null,
    [config, entry, opinionId],
  );
  const plan = useMemo(
    () => entry && sceneSpec ? buildCognitionFragmentPlan(entry.opinion, sceneSpec) : [],
    [entry, sceneSpec],
  );
  const sites = useMemo<RuntimeSite[]>(() => {
    if (!config || !spawn || !entry) return [];
    return layoutCognitionSites(config, spawn, plan).map((site) => ({
      ...site,
      interaction: buildCarrierInteraction(site.fragment, entry.opinion, entry.sources),
    }));
  }, [config, entry, plan, spawn]);
  const coreSites = useMemo(() => sites.filter((site) => isCoreCarrier(site.fragment)), [sites]);
  const coreNpcs = useMemo(() => entry ? coreSites.map((site) => worldNpcForSite(site, entry)) : [], [coreSites, entry]);
  const extraSites = useMemo<DynamicCarrierSite[]>(
    () => sites.filter((site) => !isCoreCarrier(site.fragment)).map(({ id, pos, fragment }) => ({ id, pos, fragment })),
    [sites],
  );
  const runtimeFogs = useMemo(() => runtimeFogsFromWorldState(worldState), [worldState]);
  const comparedPairs = useMemo(() => comparedPairsFromWorldState(worldState), [worldState]);
  const walkCtx = useMemo<WalkContext>(
    () => ({ worldState, foundSourceIds, comparedPairs, stanceCount: 0 }),
    [comparedPairs, foundSourceIds, worldState],
  );
  const collected = useMemo(
    () => collectedCognitionFragments(worldState, opinionId, plan),
    [opinionId, plan, worldState],
  );
  const collectedIds = useMemo(() => collected.map((fragment) => fragment.id), [collected]);
  const resonant = useMemo(() => hasResonated(worldState, opinionId), [opinionId, worldState]);
  const resonanceChapters = useMemo(
    () => entry ? buildCognitionResonanceChapters(entry.opinion, entry.sources, foundSourceIds, plan) : [],
    [entry, foundSourceIds, plan],
  );

  const enterExplore = useCallback(() => {
    if (phaseRef.current !== "landing" || !entry || !sceneSpec) return;
    goto("explore");
    emitSfx("sfx.rocket.land");
    pushToast(
      locale === "en-US"
        ? `Kanshan: ${sceneSpec.kanshanOpeningQuestion}`
        : `刘看山：${sceneSpec.kanshanOpeningQuestion}`,
    );
  }, [entry, goto, locale, pushToast, sceneSpec]);

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

  const sourceViewed = useCallback((sourceId: string) => {
    if (!entry || !entry.opinion.sourceIds.includes(sourceId)) return;
    setFoundSourceIds((current) => {
      if (current.includes(sourceId)) return current;
      persistProgress({ addFoundSource: [sourceId] });
      return [...current, sourceId];
    });
    emitSfx("sfx.source.found");
  }, [entry, persistProgress]);

  const markFragment = useCallback((fragment: CognitionFragmentSpec) => {
    if (!entry) return false;
    const key = cognitionFragmentKey(entry.opinion.id, fragment.id);
    if (worldStateRef.current[key]) return isCognitionPlanComplete(worldStateRef.current, entry.opinion.id, plan);
    const next = { ...worldStateRef.current, [key]: true };
    worldStateRef.current = next;
    setWorldState(next);
    persistProgress({ setWorldState: { [key]: true } });
    setFlashFragmentId(fragment.id);
    window.setTimeout(() => setFlashFragmentId((value) => value === fragment.id ? null : value), 900);
    pushToast(locale === "en-US" ? `Cognition shard · ${fragment.label[locale]}` : `获得认知碎片 · ${fragment.label[locale]}`);
    emitSfx("sfx.fragment.found");
    return isCognitionPlanComplete(next, entry.opinion.id, plan) && !hasResonated(next, entry.opinion.id);
  }, [entry, locale, persistProgress, plan, pushToast]);

  const openSite = useCallback((site: RuntimeSite) => {
    if (!entry || phaseRef.current !== "explore") return;
    tapTargetRef.current = null;
    const prompts = buildKanshanCarrierPrompts(site.fragment, site.interaction);
    setGuide({ site, prompts });
    goto("dialogue");
    emitSfx("sfx.guide.appear");

    void postPlanetDialogue({
      questionId: entry.opinion.questionId,
      opinionId: entry.opinion.id,
      trigger: planetDialogueTrigger(site.fragment),
      locale,
      history: [],
      worldState: worldStateRef.current,
    }).then((reply) => {
      const first = reply?.source === "ai" ? reply.lines.find((line) => line.text?.trim()) : null;
      if (!first) return;
      setGuide((current) => {
        if (!current || current.site.id !== site.id) return current;
        const [head, ...rest] = current.prompts;
        if (!head) return current;
        return {
          ...current,
          prompts: [{ ...head, line: { ...head.line, [locale]: first.text } }, ...rest],
        };
      });
    }).catch(() => {});
  }, [entry, goto, locale]);

  const nearestInteractable = useCallback((): InteractTarget | null => {
    if (!config) return null;
    const center = { x: posRef.current.x + 0.5, y: posRef.current.y + 0.5 };
    let best: { target: InteractTarget; d: number } | null = null;
    for (const site of sites) {
      const d = distance(center, { x: site.pos.x + 0.5, y: site.pos.y + 0.5 });
      if (d <= INTERACT_RANGE && (!best || d < best.d)) best = { target: { type: "carrier", id: site.id, site }, d };
    }
    for (const poi of config.pois) {
      if (poi.kind !== "rocket") continue;
      const d = distance(center, { x: poi.pos.x + 0.5, y: poi.pos.y + 0.5 });
      if (d <= INTERACT_RANGE && (!best || d < best.d)) best = { target: { type: "poi", id: poi.id, poi }, d };
    }
    return best?.target ?? null;
  }, [config, sites]);

  const startLeave = useCallback(() => {
    if (phaseRef.current === "explore") goto("leaving");
  }, [goto]);

  const interactRef = useRef<() => void>(() => {});
  useEffect(() => {
    interactRef.current = () => {
      if (phaseRef.current !== "explore") return;
      const target = nearestInteractable();
      if (!target) return;
      if (target.type === "carrier") openSite(target.site);
      else startLeave();
    };
  }, [nearestInteractable, openSite, startLeave]);

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

  const closeOverlay = useCallback(() => {
    setGuide(null);
    setCarrierSite(null);
    if (phaseRef.current === "dialogue") goto("explore");
  }, [goto]);

  const completeCarrier = useCallback(() => {
    if (!carrierSite) return;
    const ready = markFragment(carrierSite.fragment);
    setCarrierSite(null);
    setGuide(null);
    if (phaseRef.current === "dialogue") goto("explore");
    if (ready) {
      window.setTimeout(() => {
        if (phaseRef.current === "explore") goto("resonance");
      }, 420);
    }
  }, [carrierSite, goto, markFragment]);

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
  if (!world || !entry || !theme || !sceneSpec || !config) return <main className={styles.loading}>{t("world.loading")}</main>;

  const worldStyle = {
    "--world-sky": theme.sky,
    "--world-ground": theme.ground,
    "--world-road": theme.road,
    "--world-accent": theme.accent,
    "--world-mist": theme.mist,
  } as CSSProperties;
  const hintLabel = hint?.type === "carrier"
    ? (locale === "en-US" ? `Investigate · ${hint.site.fragment.carrier}` : `调查 · ${hint.site.fragment.carrier}`)
    : hint?.type === "poi"
      ? (locale === "en-US" ? "Return to rocket" : "返回火箭")
      : null;
  const mantra = locale === "en-US"
    ? "Resonance means understanding an opinion — not proving it."
    : "共鸣意味着理解了观点，不意味着证明了观点。";

  return (
    <main
      className={styles.world}
      style={worldStyle}
      data-el="world-runtime"
      data-phase={phase}
      data-fragments={collectedIds.join(",")}
      data-fragment-total={plan.length}
      data-resonant={resonant ? "true" : "false"}
    >
      <header className={styles.header}>
        <button type="button" onClick={() => router.back()}><ArrowLeft size={16} aria-hidden />{t("cosmos.returnUniverse")}</button>
        <div>
          <span>{sceneSpec.semanticGrammar} · {sceneSpec.biome}</span>
          <h1>{entry.opinion.title}</h1>
        </div>
        <small>{collected.length} / {plan.length} · {locale === "en-US" ? "cognition fragments" : "认知碎片"}</small>
      </header>

      <div ref={viewportElRef} className={styles.sceneViewport}>
        <WorldScene
          config={config}
          npcs={coreNpcs}
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
              const site = coreSites.find((candidate) => {
                const kind = candidate.fragment.role === "claim" ? "claim" : candidate.fragment.role === "reason" ? "reason" : "evidence";
                return `fragment_${kind}_${entry.opinion.id}` === npcId;
              });
              if (site) openSite(site);
              return;
            }
            tapTargetRef.current = {
              x: Math.max(0, Math.min(config.size.w, pos.x)),
              y: Math.max(0, Math.min(config.size.h, pos.y)),
            };
          }}
        />
        <DynamicCarrierLayer
          worldElRef={worldElRef}
          sites={extraSites}
          opinionId={entry.opinion.id}
          worldState={worldState}
          accent={theme.accent}
          onTap={(extraSite) => {
            if (phaseRef.current !== "explore") return;
            const site = sites.find((candidate) => candidate.id === extraSite.id);
            if (site) openSite(site);
          }}
        />
      </div>

      <CognitionFragmentHud
        plan={plan}
        collectedIds={collectedIds}
        locale={locale}
        flashId={flashFragmentId}
      />

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

      {phase === "dialogue" && guide && !carrierSite && (
        <KanshanCarrierOverlay
          key={`guide:${guide.site.id}`}
          prompts={guide.prompts}
          carrier={guide.site.fragment.carrier}
          accent={theme.accent}
          locale={locale}
          onCancel={closeOverlay}
          onInvestigate={() => setCarrierSite(guide.site)}
        />
      )}

      {phase === "dialogue" && carrierSite && (
        <CarrierInteractionStage
          key={`carrier:${carrierSite.id}`}
          interaction={carrierSite.interaction}
          locale={locale}
          onSourceViewed={sourceViewed}
          onCancel={closeOverlay}
          onComplete={completeCarrier}
        />
      )}

      {phase === "resonance" && (
        <ResonanceOverlay
          title={entry.opinion.title}
          chapters={resonanceChapters}
          fragmentCount={plan.length}
          mantra={mantra}
          scrollLabel={locale === "en-US" ? "Opinion resonance · cognition scroll" : "观点共鸣 · 认知画卷"}
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
