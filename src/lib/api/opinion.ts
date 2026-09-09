"use client";

import { request } from "@/lib/api/request";
import { getViewerId } from "@/lib/opinion/viewer-id";
import type {
  CollisionAnalysis,
  GapAnalysis,
  MatchResult,
  NavigationHint,
  Opinion,
  OpinionGraph,
  OpinionSource,
  Author,
  QuestionNetwork,
  RelationType,
  SearchResult,
  Stance,
  TintAnalysis,
} from "@/lib/opinion/types";

export interface StanceProfile {
  stances: Record<string, Stance>;
  agree: string[];
  disagree: string[];
  neutral: string[];
  leaning: string | null;
}

export interface SourceTrace {
  opinion: Opinion;
  sources: OpinionSource[];
  authors: Author[];
  related: { type: RelationType; opinion: Opinion }[];
}

export interface BuildOpinionSpaceResult {
  graph: OpinionGraph;
  retrieval: {
    itemCount: number;
    hasMore: boolean;
    searchHashId?: string;
    scope: "zhihu_search_results";
  };
}

async function json<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { ok?: boolean };
  return data;
}

export async function fetchQuestionNetwork(): Promise<QuestionNetwork> {
  const res = await request("/api/opinion/questions");
  const data = await json<{ network: QuestionNetwork }>(res);
  return data.network;
}

export async function fetchOpinionGraph(questionId: string): Promise<OpinionGraph> {
  const res = await request(`/api/opinion/graph?questionId=${encodeURIComponent(questionId)}`);
  const data = await json<{ graph: OpinionGraph }>(res);
  return data.graph;
}

export async function fetchSourceTrace(opinionId: string): Promise<SourceTrace> {
  const res = await request(`/api/opinion/opinions/${encodeURIComponent(opinionId)}/source`);
  return json<SourceTrace>(res);
}

export async function fetchStanceProfile(): Promise<StanceProfile> {
  const res = await request("/api/opinion/stance", {
    headers: { "x-viewer-id": getViewerId() },
  });
  const data = await json<{ profile: StanceProfile }>(res);
  return data.profile;
}

export async function markStance(opinionId: string, stance: Stance): Promise<StanceProfile> {
  const res = await request("/api/opinion/stance", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-viewer-id": getViewerId() },
    body: JSON.stringify({ opinionId, stance }),
  });
  const data = await json<{ profile: StanceProfile }>(res);
  return data.profile;
}

export async function collideOpinions(
  aId: string,
  bId: string,
  graph?: OpinionGraph,
): Promise<CollisionAnalysis> {
  const res = await request("/api/opinion/collide", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ aId, bId, graph }),
  });
  const data = await json<{ analysis: CollisionAnalysis }>(res);
  return data.analysis;
}

export async function fuseOpinions(input: {
  parentA: string;
  parentB: string;
  title: string;
  summary: string;
  x: number;
  y: number;
}): Promise<Opinion> {
  const res = await request("/api/opinion/fuse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await json<{ opinion: Opinion }>(res);
  return data.opinion;
}

export async function searchOpinions(query: string): Promise<SearchResult> {
  const res = await request("/api/opinion/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const data = await json<{ result: SearchResult }>(res);
  return data.result;
}

export async function buildOpinionSpace(query: string): Promise<BuildOpinionSpaceResult> {
  const res = await request("/api/opinion/build", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const data = await json<BuildOpinionSpaceResult & { error?: string }>(res);
  if (!res.ok) throw new Error(data.error || "build_failed");
  return data;
}

export async function fetchGaps(graph?: OpinionGraph): Promise<GapAnalysis> {
  const res = await request("/api/opinion/gaps", graph ? {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ graph }),
  } : undefined);
  return json<GapAnalysis>(res);
}

export async function fetchNavigation(graph?: OpinionGraph): Promise<NavigationHint> {
  const res = await request("/api/opinion/navigate", graph ? {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ graph }),
  } : undefined);
  return json<NavigationHint>(res);
}

export async function fetchMatch(): Promise<MatchResult> {
  const res = await request("/api/opinion/match", {
    headers: { "x-viewer-id": getViewerId() },
  });
  const data = await json<{ result: MatchResult }>(res);
  return data.result;
}

export async function tintZhihu(text: string, url?: string): Promise<TintAnalysis> {
  const res = await request("/api/opinion/tint", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, url }),
  });
  const data = await json<{ result: TintAnalysis }>(res);
  return data.result;
}
