"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchOpinionGraph,
  fetchQuestionNetwork,
  fetchStanceProfile,
  markStance as apiMarkStance,
  type StanceProfile,
} from "@/lib/api/opinion";
import type {
  OpinionGraph,
  QuestionNetwork,
  Stance,
} from "@/lib/opinion/types";

const CORE_ID = "q_luoci";

export type Mode = "views" | "questions";

/**
 * Data + high-level state for the opinion space. Physics (drag, collision,
 * particles) live imperatively inside the canvas component; this hook owns the
 * graph data, the question network, the viewer's stance profile, and the
 * API-backed stance mutation. Keeping them apart keeps each file reviewable.
 */
export function useOpinionSpace() {
  const [mode, setMode] = useState<Mode>("views");
  const [loading, setLoading] = useState(true);
  const [graph, setGraph] = useState<OpinionGraph | null>(null);
  const [network, setNetwork] = useState<QuestionNetwork | null>(null);
  const [profile, setProfile] = useState<StanceProfile | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [g, n, p] = await Promise.all([
          fetchOpinionGraph(CORE_ID),
          fetchQuestionNetwork(),
          fetchStanceProfile().catch(() => null),
        ]);
        if (!alive) return;
        setGraph(g);
        setNetwork(n);
        setProfile(p);
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

  return {
    mode,
    setMode,
    loading,
    graph,
    network,
    profile,
    loadProfile,
    markStance,
  };
}
