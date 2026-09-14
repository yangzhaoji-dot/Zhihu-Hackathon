"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchOpinionGraph,
  fetchQuestionNetwork,
  fetchStanceProfile,
  buildOpinionSpace,
  markStance as apiMarkStance,
  type StanceProfile,
} from "@/lib/api/opinion";
import type {
  Opinion,
  OpinionGraph,
  QuestionNetwork,
  Stance,
} from "@/lib/opinion/types";

const CORE_ID = "q_luoci";

export type Mode = "views" | "questions";

const INIT_TIMEOUT_MS = 8_000;

async function settleWithin<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), INIT_TIMEOUT_MS)),
  ]);
}

/**
 * Data + high-level state for the opinion space. Physics (drag, collision,
 * particles) live imperatively inside the canvas component; this hook owns the
 * graph data, the question network, the viewer's stance profile, and the
 * API-backed stance mutation. Keeping them apart keeps each file reviewable.
 */
export function useOpinionSpace() {
  // The product hierarchy is Universe -> question galaxy -> opinion planets.
  // Therefore a fresh entry begins at the question-galaxy layer, never inside
  // a demo opinion planet system.
  const [mode, setMode] = useState<Mode>("questions");
  const [loading, setLoading] = useState(true);
  const [graph, setGraph] = useState<OpinionGraph | null>(null);
  const [network, setNetwork] = useState<QuestionNetwork | null>(null);
  const [profile, setProfile] = useState<StanceProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [g, n, p] = await Promise.all([
          settleWithin(fetchOpinionGraph(CORE_ID), null),
          settleWithin(fetchQuestionNetwork(), null),
          settleWithin(fetchStanceProfile().catch(() => null), null),
        ]);
        if (!alive) return;
        if (g) setGraph(g);
        if (n) setNetwork(n);
        setProfile(p);
        if (!g || !n) setLoadError("initial_load_timeout");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const loadProfile = useCallback(async () => {
    const p = await fetchStanceProfile().catch(() => null);
    if (p) setProfile(p);
  }, []);

  const markStance = useCallback(async (opinionId: string, stance: Stance) => {
    const next = await apiMarkStance(opinionId, stance).catch(() => null);
    if (next) setProfile(next);
    return next;
  }, []);

  const buildFromZhihu = useCallback(async (
    query: string,
    questionUrl?: string,
    questionTitle?: string,
  ) => {
    setLoading(true);
    try {
      const result = await buildOpinionSpace(query, questionUrl, questionTitle);
      if (result.selectionRequired) return result;
      setGraph(result.graph);
      setNetwork({
        coreQuestionId: result.graph.questionId,
        questions: [{
          id: result.graph.questionId,
          title: result.graph.questionTitle,
          x: 0.5,
          y: 0.5,
          core: true,
          answerCount: result.retrieval.itemCount,
        }],
        relations: [],
      });
      // A concrete question has now been resolved; its human opinions can form
      // the visible main galaxy.
      setMode("views");
      setProfile(null);
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  const addCandidateToGraph = useCallback((
    candidate: Opinion,
    parentA: string,
    parentB: string,
  ) => {
    setGraph((current) => current ? {
      ...current,
      opinions: [
        ...current.opinions,
        {
          ...candidate,
          questionId: current.questionId,
          origin: "ai-derived",
        },
      ],
      relations: [
        ...current.relations,
        { from: parentA, to: candidate.id, type: "add" },
        { from: parentB, to: candidate.id, type: "add" },
      ],
    } : current);
  }, []);

  return {
    mode,
    setMode,
    loading,
    graph,
    network,
    profile,
    loadError,
    loadProfile,
    markStance,
    buildFromZhihu,
    addCandidateToGraph,
  };
}
