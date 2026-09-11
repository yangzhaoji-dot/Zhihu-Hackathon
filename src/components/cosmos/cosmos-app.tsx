"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Pickaxe, Rocket } from "lucide-react";
import {
  collideOpinions,
  fetchGaps,
  fetchMatch,
  fetchNavigation,
  fetchSourceTrace,
  fuseOpinions,
  tintZhihu,
  type SourceTrace,
  type ZhihuQuestionCandidate,
} from "@/lib/api/opinion";
import type { CollisionAnalysis, Stance } from "@/lib/opinion/types";
import { useOpinionSpace } from "./use-opinion-space";
import { QuestionLayer } from "./question-layer";
import { DetailPanel, type PanelData } from "./detail-panel";
import { CosmosChrome } from "./cosmos-chrome";
import { CosmosGuide } from "./cosmos-guide";
import type { OpinionEngine, OpinionNodeLike } from "./three/engine-contract";
import { createOpinionEngine } from "./three/create-opinion-engine";
import { createQuestionSpace, type QuestionEngineHandle } from "./three/create-question-space";
import { saveOpinionWorldEntry } from "@/lib/opinion/world-session";

export function CosmosApp() {
  const { t } = useTranslation();
  const router = useRouter();
  const space = useOpinionSpace();
  const {
    mode,
    setMode,
    loading,
    graph,
    network,
    profile,
    loadError,
    markStance,
    loadProfile,
    buildFromZhihu,
    addCandidateToGraph,
  } = space;

  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<OpinionEngine | null>(null);
  const qSpaceRef = useRef<QuestionEngineHandle | null>(null);
  const qMountRef = useRef<HTMLDivElement>(null);
  const [use3DQuestions, setUse3DQuestions] = useState(true);

  const [panel, setPanel] = useState<PanelData | null>(null);
  const panelRef = useRef<PanelData | null>(null);
  useEffect(() => {
    panelRef.current = panel;
  }, [panel]);
  const [title, setTitle] = useState("");
  const [hint, setHint] = useState("");
  const [railOn, setRailOn] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [focusStage, setFocusStage] = useState<"orbit" | "launching" | "surface" | null>(null);
  const focusedIdRef = useRef<string | null>(null);
  const focusStageRef = useRef<"orbit" | "launching" | "surface" | null>(null);
  useEffect(() => {
    focusedIdRef.current = focusedId;
  }, [focusedId]);
  useEffect(() => {
    focusStageRef.current = focusStage;
  }, [focusStage]);

  const collisionRef = useRef<{ aId: string; bId: string; mx: number; my: number } | null>(null);

  const titleOf = useCallback(
    (id: string) => graph?.opinions.find((o) => o.id === id)?.title ?? id,
    [graph],
  );

  // ── enter a question's opinion space (from the 3D galaxy dive-in) ───────
  const enterQuestion = useCallback(
    (_questionId: string, qTitle: string) => {
      setTitle(qTitle);
      setMode("views");
      setPanel(null);
    },
    [setMode],
  );

  // ── source trace (tap / long-press) ────────────────────────────────────
  const openSource = useCallback(async (opinionId: string) => {
    const liveOpinion = graph?.opinions.find((opinion) => opinion.id === opinionId);
    if (liveOpinion && graph?.questionId.startsWith("q_live_")) {
      const sourceIds = new Set(liveOpinion.sourceIds);
      const sources = graph.sources.filter((source) => sourceIds.has(source.id));
      const authorIds = new Set(sources.map((source) => source.authorId));
      const related = graph.relations
        .filter((relation) => relation.from === opinionId || relation.to === opinionId)
        .map((relation) => ({
          type: relation.type,
          opinion: graph.opinions.find((opinion) =>
            opinion.id === (relation.from === opinionId ? relation.to : relation.from)),
        }))
        .filter((item): item is SourceTrace["related"][number] => Boolean(item.opinion));
      setPanel({
        type: "source",
        trace: {
          opinion: liveOpinion,
          sources,
          authors: graph.authors.filter((author) => authorIds.has(author.id)),
          related,
        },
      });
      return;
    }
    try {
      const trace = await fetchSourceTrace(opinionId);
      setPanel({ type: "source", trace });
    } catch {
      /* ignore */
    }
  }, [graph]);

  const launchIntoPlanet = useCallback(async (opinionId: string) => {
    const engine = engineRef.current;
    if (!engine || focusStageRef.current === "launching") return;
    const currentGraph = graph;
    if (!currentGraph) return;
    const opinion = currentGraph.opinions.find((item) => item.id === opinionId);
    if (!opinion) return;
    const sourceIds = new Set(opinion.sourceIds);
    const sources = currentGraph.sources.filter((source) => sourceIds.has(source.id));
    const authorIds = new Set(sources.map((source) => source.authorId));
    const related = currentGraph.relations
      .filter((relation) => relation.from === opinionId || relation.to === opinionId)
      .flatMap((relation) => {
        const relatedOpinion = currentGraph.opinions.find((item) =>
          item.id === (relation.from === opinionId ? relation.to : relation.from));
        return relatedOpinion ? [{ type: relation.type, opinion: relatedOpinion }] : [];
      });
    saveOpinionWorldEntry({
      opinion,
      questionTitle: currentGraph.questionTitle,
      sources,
      authors: currentGraph.authors.filter((author) => authorIds.has(author.id)),
      related,
    });
    focusedIdRef.current = opinionId;
    focusStageRef.current = "launching";
    setFocusedId(opinionId);
    setFocusStage("launching");
    setPanel(null);
    setRailOn(null);
    setHint(t("cosmos.rocketLaunching"));
    await engine.launchTo(opinionId);
    if (focusedIdRef.current !== opinionId) return;
    engine.enterSurface(opinionId);
    focusStageRef.current = "surface";
    setFocusStage("surface");
    setHint(t("cosmos.planetSurfaceHint"));
    router.push(`/world/${encodeURIComponent(opinionId)}`);
  }, [graph, router, t]);

  // ── collision → AI analysis ─────────────────────────────────────────────
  const runCollision = useCallback(
    async (a: OpinionNodeLike, b: OpinionNodeLike, mx: number, my: number) => {
      collisionRef.current = { aId: a.id, bId: b.id, mx, my };
      setPanel({
        type: "collision",
        aId: a.id,
        bId: b.id,
        aTitle: a.title,
        bTitle: b.title,
        analysis: null,
        analyzing: true,
        fusing: false,
      });
      let analysis: CollisionAnalysis | null = null;
      try {
        analysis = await collideOpinions(a.id, b.id, graph ?? undefined);
      } catch {
        analysis = null;
      }
      setPanel((prev) =>
        prev && prev.type === "collision"
          ? { ...prev, analysis, analyzing: false }
          : prev,
      );
    },
    [graph],
  );

  // ── engine lifecycle ────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || !graph || mode !== "views") return;
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;

    let engine: OpinionEngine | null = null;
    let cancelled = false;

    createOpinionEngine(canvas, root, {
      onTap: (n) => {
        if (focusedIdRef.current === n.id) {
          setHint(t("cosmos.planetOrbitHint"));
          return;
        }
        focusedIdRef.current = n.id;
        focusStageRef.current = "orbit";
        setFocusedId(n.id);
        setFocusStage("orbit");
        setPanel(null);
        setRailOn(null);
        engineRef.current?.locate(n.id);
        setHint(t("cosmos.planetOrbitHint"));
      },
      onLongPress: (n) => {
        launchIntoPlanet(n.id);
      },
      onCollision: (a, b, mx, my) => runCollision(a, b, mx, my),
    }).then((handle) => {
      if (cancelled) {
        handle.engine.destroy();
        return;
      }
      engine = handle.engine;
      engine.setData(graph.opinions, graph.relations, profile?.stances ?? {});
      engineRef.current = engine;
      setHint(t(handle.is3D ? "cosmos.hintDrag3D" : "cosmos.hintDrag"));
    });

    const onResize = () => engine?.layout();
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      engine?.destroy();
      engineRef.current = null;
    };
    // re-create when graph identity or mode changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, graph, mode]);

  // ── question galaxy (layer 1) lifecycle ─────────────────────────────────
  useEffect(() => {
    if (loading || !network || mode !== "questions") return;
    const mount = qMountRef.current;
    if (!mount) return;

    let handle: QuestionEngineHandle | null = null;
    let cancelled = false;

    createQuestionSpace(mount, network, {
      onEnter: (qId, qTitle) => enterQuestion(qId, qTitle),
    }).then((h) => {
      if (cancelled) {
        h?.destroy();
        return;
      }
      if (h) {
        handle = h;
        qSpaceRef.current = h;
        setUse3DQuestions(true);
      } else {
        // no WebGL → render declarative 2D QuestionLayer
        setUse3DQuestions(false);
      }
    });

    return () => {
      cancelled = true;
      handle?.destroy();
      qSpaceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, network, mode]);

  // ── stance ──────────────────────────────────────────────────────────────
  const onStance = useCallback(
    async (opinionId: string, stance: Stance) => {
      engineRef.current?.setStance(opinionId, stance);
      await markStance(opinionId, stance);
    },
    [markStance],
  );

  // ── fusion ────────────────────────────────────────────────────────────
  const onFuse = useCallback(async () => {
    const engine = engineRef.current;
    const pair = collisionRef.current;
    const current = panelRef.current;
    if (!engine || !pair || !current || current.type !== "collision" || !current.analysis) return;
    setPanel({ ...current, fusing: true });
    try {
      const w = canvasRef.current?.clientWidth ?? window.innerWidth;
      const h = canvasRef.current?.clientHeight ?? window.innerHeight;
      const candidate = await fuseOpinions({
        parentA: pair.aId,
        parentB: pair.bId,
        title: current.analysis.candidate.title,
        summary: current.analysis.candidate.summary,
        x: pair.mx / w,
        y: pair.my / h,
      });
      await engine.fuse(pair.aId, pair.bId, candidate);
      addCandidateToGraph(candidate, pair.aId, pair.bId);
      setHint(t("cosmos.fused"));
      setPanel(null);
    } catch {
      setPanel({ ...current, fusing: false });
    }
  }, [t, addCandidateToGraph]);

  // ── build a traceable space from live Zhihu search results ───────────
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const buildSuccessHint = useCallback((result: {
    retrieval: { itemCount: number; buildSource?: "zhihu-zhida" | "eazo" | "fallback" };
  }) => {
    const source = result.retrieval.buildSource === "zhihu-zhida"
      ? t("cosmos.modelZhihuZhida")
      : result.retrieval.buildSource === "eazo"
        ? t("cosmos.modelEazo")
        : t("cosmos.modelFallback");
    return t("cosmos.buildSuccessWithModel", {
      n: result.retrieval.itemCount,
      model: source,
    });
  }, [t]);
  const onSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!query.trim() || searching) return;
      setSearching(true);
      try {
        const result = await buildFromZhihu(query.trim());
        if (result.selectionRequired) {
          setPanel({
            type: "questionPicker",
            query: result.query,
            questions: result.questions,
            loading: false,
          });
          setRailOn(null);
          setHint(t("cosmos.questionPickerHint"));
          return;
        }
        setTitle(result.graph.questionTitle);
        focusedIdRef.current = null;
        focusStageRef.current = null;
        setFocusedId(null);
        setFocusStage(null);
        rootRef.current?.classList.remove("planet-focus");
        setPanel(null);
        setRailOn(null);
        setHint(buildSuccessHint(result));
      } catch (error) {
        const code = error instanceof Error ? error.message : "build_failed";
        const key = code === "no_zhihu_results"
          ? "cosmos.buildNoResults"
          : code === "no_question_candidates"
            ? "cosmos.buildNoQuestionCandidates"
            : code === "zhihu_not_enough_answers"
              ? "cosmos.buildNotEnoughAnswers"
          : code === "zhihu_rate_limited"
            ? "cosmos.buildRateLimited"
            : code === "zhihu_auth_not_configured" || code === "zhihu_cli_unavailable"
              ? "cosmos.buildAuthRequired"
              : "cosmos.buildFailed";
        setHint(t(key));
      } finally {
        setSearching(false);
      }
    },
    [query, searching, buildFromZhihu, buildSuccessHint, t],
  );

  const onSelectQuestion = useCallback(async (question: ZhihuQuestionCandidate) => {
    const current = panelRef.current;
    if (!current || current.type !== "questionPicker" || current.loading) return;
    setPanel({ ...current, loading: true });
    try {
      const result = await buildFromZhihu(current.query, question.url, question.title);
      if (result.selectionRequired) return;
      setTitle(result.graph.questionTitle);
      focusedIdRef.current = null;
      focusStageRef.current = null;
      setFocusedId(null);
      setFocusStage(null);
      rootRef.current?.classList.remove("planet-focus");
      setPanel(null);
      setRailOn(null);
      setHint(buildSuccessHint(result));
    } catch (error) {
      const code = error instanceof Error ? error.message : "build_failed";
      setPanel({ ...current, loading: false });
      setHint(code === "zhihu_not_enough_answers" ? t("cosmos.buildNotEnoughAnswers") : t("cosmos.buildFailed"));
    }
  }, [buildFromZhihu, buildSuccessHint, t]);

  // ── tint: analyze pasted Zhihu content ──────────────────────────────────
  const onAnalyzeTint = useCallback(async (text: string, url: string) => {
    setPanel({ type: "tint", result: null, loading: true });
    try {
      const result = await tintZhihu(text, url || undefined);
      setPanel({ type: "tint", result, loading: false });
    } catch {
      setPanel({ type: "tint", result: null, loading: false });
    }
  }, []);

  // ── rail actions (agent path / gaps / match / tint / profile) ───────────
  const toggleRail = useCallback(
    async (which: "agentPath" | "gaps" | "profile" | "match" | "tint") => {
      if (railOn === which && panel) {
        setPanel(null);
        setRailOn(null);
        return;
      }
      setRailOn(which);
      if (which === "profile") {
        await loadProfile();
        setPanel({ type: "profile" });
        return;
      }
      if (which === "match") {
        setPanel({ type: "match", result: null, loading: true });
        try {
          const result = await fetchMatch();
          setPanel({ type: "match", result, loading: false });
        } catch {
          setPanel({ type: "match", result: null, loading: false });
        }
        return;
      }
      if (which === "tint") {
        // Opens the paste-and-analyze panel; analysis is triggered from within.
        setPanel({ type: "tint", result: null, loading: false });
        return;
      }
      if (which === "agentPath") {
        setPanel({ type: "agentPath", body: t("cosmos.gapMining"), source: "fallback" });
        const nav = await fetchNavigation(graph ?? undefined);
        const pathTitles = nav.path.map(titleOf).join(" → ");
        setPanel({
          type: "agentPath",
          body: `${pathTitles}。${nav.rationale}`,
          source: nav.source,
        });
        return;
      }
      // gaps
      setPanel({ type: "gaps", items: [], source: "fallback" });
      const g = await fetchGaps(graph ?? undefined);
      setPanel({ type: "gaps", items: g.gaps, source: g.source });
    },
    [railOn, panel, loadProfile, t, titleOf, graph],
  );

  const closePanel = useCallback(() => {
    setPanel(null);
    setRailOn(null);
  }, []);

  const returnToUniverse = useCallback(() => {
    focusedIdRef.current = null;
    focusStageRef.current = null;
    setFocusedId(null);
    setFocusStage(null);
    setPanel(null);
    setRailOn(null);
    engineRef.current?.resetFocus();
    setHint(t("cosmos.hintDrag3D"));
  }, [t]);

  const selectedOpinion = focusedId
    ? graph?.opinions.find((opinion) => opinion.id === focusedId) ?? null
    : null;

  return (
    <div className="cosmos" ref={rootRef} data-el="cosmos-root">
      <div className="bg" aria-hidden />
      <div className="scrim" aria-hidden />
      <main className="stage">
        <CosmosChrome
          mode={mode}
          title={title || graph?.questionTitle || ""}
          hint={hint}
          query={query}
          searching={searching}
          railOn={railOn}
          onModeChange={(m) => {
            focusedIdRef.current = null;
            focusStageRef.current = null;
            setFocusedId(null);
            setFocusStage(null);
            engineRef.current?.resetFocus();
            setMode(m);
            setPanel(null);
            setRailOn(null);
            setHint(m === "questions" ? t("cosmos.hintQuestion") : t("cosmos.hintDrag"));
          }}
          onQueryChange={setQuery}
          onSearch={onSearch}
          onRail={toggleRail}
          onZoom={(f) => engineRef.current?.zoom(f)}
        />

        {mode === "views" && <div className="canvas" ref={canvasRef} aria-label="观点空间" />}

        {mode === "views" && focusedId && (
          <div className="focus-controls" data-el="planet-focus-controls">
            <button onClick={returnToUniverse}>
              <ArrowLeft size={16} aria-hidden />
              {t("cosmos.returnUniverse")}
            </button>
            <button
              className="primary"
              disabled={focusStage === "launching"}
              onClick={() => focusStage === "surface"
                ? openSource(focusedId)
                : launchIntoPlanet(focusedId)}
            >
              {focusStage === "surface"
                ? <Pickaxe size={16} aria-hidden />
                : <Rocket size={16} aria-hidden />}
              {focusStage === "surface"
                ? t("cosmos.mineSources")
                : focusStage === "launching"
                  ? t("cosmos.rocketInFlight")
                  : t("cosmos.landPlanet")}
            </button>
          </div>
        )}

        {mode === "questions" && network && (
          <>
            <div className="canvas q-galaxy" ref={qMountRef} aria-label="问题网络" />
            {!use3DQuestions && <QuestionLayer network={network} onEnter={enterQuestion} />}
          </>
        )}

        {mode === "views" && !loading && (
          <CosmosGuide
            selectedTitle={selectedOpinion?.title ?? null}
            launching={focusStage === "launching"}
            onLaunch={selectedOpinion ? () => launchIntoPlanet(selectedOpinion.id) : null}
          />
        )}

        <DetailPanel
          data={panel}
          profile={profile}
          titleOf={titleOf}
          onClose={closePanel}
          onStance={onStance}
          onOpenRelated={openSource}
          onFuse={onFuse}
          onAnalyzeTint={onAnalyzeTint}
          onSelectQuestion={onSelectQuestion}
        />

        {loading && (
          <div className="boot">
            <div className="halo" />
            <p>{t("cosmos.booting")}</p>
          </div>
        )}
        {!loading && loadError && !graph && (
          <div className="boot boot-error">
            <div className="halo" />
            <p>{t("cosmos.initialLoadFailed")}</p>
          </div>
        )}
      </main>
    </div>
  );
}
