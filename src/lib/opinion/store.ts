import "server-only";

import type {
  Opinion,
  OpinionGraph,
  QuestionNetwork,
  Stance,
} from "./types";
import { getStancesByUser, upsertStance } from "@/lib/db/queries/stances";
import { AUTHORS, SOURCES } from "./seed-sources";
import {
  CORE_QUESTION_ID,
  CORE_QUESTION_TITLE,
  OPINIONS,
  QUESTION_RELATIONS,
  QUESTIONS,
  RELATIONS,
} from "./seed";

// In-memory store for the opinion graph. Seed data is immutable; runtime
// additions (fused AI candidate opinions) live in module-level maps. Per-user
// stances are persisted to the stances table when DATABASE_URL is configured,
// with the module-level map kept as a graceful-degradation fallback.
// This is intentionally swappable for a real Zhihu-backed data source without
// changing the API surface.

// Runtime opinions added by fusion, keyed by opinion id.
const runtimeOpinions = new Map<string, Opinion>();
// Runtime relations added by fusion (always the "add" type: parent → candidate).
const fusedRelations: { from: string; to: string; type: "add" }[] = [];
// Per-user stance: userId -> (opinionId -> stance).
const stanceByUser = new Map<string, Map<string, Stance>>();

function allOpinions(): Opinion[] {
  return [...OPINIONS, ...runtimeOpinions.values()];
}

export function getQuestionNetwork(): QuestionNetwork {
  return {
    coreQuestionId: CORE_QUESTION_ID,
    questions: QUESTIONS,
    relations: QUESTION_RELATIONS,
  };
}

export function getOpinionGraph(questionId: string): OpinionGraph | null {
  // The demo ships one fully-populated opinion space (the core question).
  if (questionId !== CORE_QUESTION_ID) return null;
  const opinions = allOpinions().filter((o) => o.questionId === questionId);
  const opinionIds = new Set(opinions.map((o) => o.id));
  const relations = [
    ...RELATIONS,
    ...fusedRelations.map((r) => ({ from: r.from, to: r.to, type: "add" as const })),
  ].filter((r) => opinionIds.has(r.from) && opinionIds.has(r.to));
  return {
    questionId,
    questionTitle: CORE_QUESTION_TITLE,
    opinions,
    relations,
    authors: AUTHORS,
    sources: SOURCES,
  };
}

export function getOpinion(opinionId: string): Opinion | null {
  return allOpinions().find((o) => o.id === opinionId) ?? null;
}

export function getSourcesForOpinion(opinionId: string) {
  const opinion = getOpinion(opinionId);
  if (!opinion) return null;
  const sources = SOURCES.filter((s) => opinion.sourceIds.includes(s.id));
  const authorIds = new Set(sources.map((s) => s.authorId));
  const authors = AUTHORS.filter((a) => authorIds.has(a.id));
  // Related opposing / supplementing opinions for the side panel.
  const related = RELATIONS.filter(
    (r) => r.from === opinionId || r.to === opinionId,
  ).map((r) => {
    const otherId = r.from === opinionId ? r.to : r.from;
    return { type: r.type, opinion: getOpinion(otherId) };
  }).filter((r) => r.opinion);
  return { opinion, sources, authors, related };
}

// ── Personal stance ────────────────────────────────────────────────────────
// Persistence: the stances table is the source of truth (world-design-v0.2
// §3.3 / D7). The in-memory map below remains as a fallback layer so the local
// no-database demo keeps working: when DATABASE_URL is not configured, or a
// database call throws, reads/writes degrade to memory with a console.warn.
// When the database works, its rows win over the cache.
function isStanceDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function setStanceInMemory(userId: string, opinionId: string, stance: Stance) {
  let map = stanceByUser.get(userId);
  if (!map) {
    map = new Map();
    stanceByUser.set(userId, map);
  }
  map.set(opinionId, stance);
}

function getStancesFromMemory(userId: string): Record<string, Stance> {
  const map = stanceByUser.get(userId);
  if (!map) return {};
  return Object.fromEntries(map.entries());
}

export async function setStance(
  userId: string,
  opinionId: string,
  stance: Stance,
) {
  if (!getOpinion(opinionId) && !/^o_live_\d+$/.test(opinionId)) return null;
  // Keep the fallback cache warm so a later DB outage still serves this write.
  setStanceInMemory(userId, opinionId, stance);
  if (isStanceDbConfigured()) {
    try {
      await upsertStance({ userId, opinionId, stance });
    } catch (err) {
      console.warn(
        "[opinion/store] stance DB write failed; falling back to memory",
        err,
      );
    }
  }
  return getStanceProfile(userId);
}

export async function getStances(
  userId: string,
): Promise<Record<string, Stance>> {
  if (isStanceDbConfigured()) {
    try {
      const rows = await getStancesByUser(userId);
      return Object.fromEntries(rows.map((r) => [r.opinionId, r.stance]));
    } catch (err) {
      console.warn(
        "[opinion/store] stance DB read failed; falling back to memory",
        err,
      );
    }
  }
  return getStancesFromMemory(userId);
}

/** A lightweight "opinion profile" derived from the user's marked stances. */
export async function getStanceProfile(userId: string) {
  const stances = await getStances(userId);
  const entries = Object.entries(stances);
  const agree = entries.filter(([, s]) => s === "agree").map(([id]) => id);
  const disagree = entries.filter(([, s]) => s === "disagree").map(([id]) => id);
  const neutral = entries.filter(([, s]) => s === "neutral").map(([id]) => id);
  // Aggregate which camps the user leans toward.
  const campScore = new Map<string, number>();
  for (const id of agree) {
    const camp = getOpinion(id)?.camp;
    if (camp) campScore.set(camp, (campScore.get(camp) ?? 0) + 1);
  }
  const leaning =
    [...campScore.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return { stances, agree, disagree, neutral, leaning };
}

// ── Fusion: materialize an AI candidate opinion from a collision ────────────
export function addCandidateOpinion(input: {
  parentA: string;
  parentB: string;
  title: string;
  summary: string;
  x: number;
  y: number;
}): Opinion {
  const id = `o_ai_${Date.now().toString(36)}`;
  const a = getOpinion(input.parentA);
  const b = getOpinion(input.parentB);
  const support = Math.round(((a?.support ?? 55) + (b?.support ?? 55)) / 2);
  const opinion: Opinion = {
    id,
    questionId: CORE_QUESTION_ID,
    title: input.title,
    summary: input.summary,
    kind: "ai",
    support,
    x: input.x,
    y: input.y,
    sourceIds: [],
    derivedFrom: [input.parentA, input.parentB],
  };
  runtimeOpinions.set(id, opinion);
  fusedRelations.push({ from: input.parentA, to: id, type: "add" });
  fusedRelations.push({ from: input.parentB, to: id, type: "add" });
  return opinion;
}
