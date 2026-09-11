"use client";

import { request } from "@/lib/api/request";
import { getViewerId } from "@/lib/opinion/viewer-id";
import type {
  CollisionAnalysis,
  DialogueLine,
  ExplorationProgressDto,
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
  WorldConfig,
  WorldDialogueReply,
  Zone,
} from "@/lib/opinion/types";

export interface ZhihuQuestionCandidate {
  url: string;
  title: string;
  sourceCount: number;
}

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

// ── 世界运行时视图（world-design-v0.2 §4.1，M2） ───────────────────────────

export interface WorldNpcView {
  id: string;
  opinion: Opinion;
  sourceCount: number;
  pos: { x: number; y: number };
  sprite: string;
  role: string;
  translucent: boolean;
}

export interface WorldZoneView {
  id: string;
  camp?: string;
  opinionCount: number;
  terrain: Zone["terrain"];
  label: { "zh-CN": string; "en-US": string };
}

export interface WorldView {
  config: WorldConfig;
  npcs: WorldNpcView[];
  zones: WorldZoneView[];
  unconfigured: boolean;
}

export interface BuildOpinionSpaceSelection {
  selectionRequired: true;
  query: string;
  questions: ZhihuQuestionCandidate[];
}

export interface BuildOpinionSpaceSuccess {
  selectionRequired: false;
  graph: OpinionGraph;
  retrieval: {
    itemCount: number;
    hasMore: boolean;
    scope: "zhihu-question-answers";
    buildSource?: "zhihu-zhida" | "eazo" | "fallback";
    buildModel?: string;
  };
}

export type BuildOpinionSpaceResult = BuildOpinionSpaceSelection | BuildOpinionSpaceSuccess;

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

export async function fetchWorldConfig(questionId: string): Promise<WorldView> {
  const res = await request(
    `/api/opinion/world/config?questionId=${encodeURIComponent(questionId)}`,
  );
  const data = await json<{ world: WorldView } & { error?: string }>(res);
  if (!res.ok) throw new Error(data.error || "world_config_failed");
  return data.world;
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

export async function buildOpinionSpace(query: string, questionUrl?: string, questionTitle?: string): Promise<BuildOpinionSpaceResult> {
  const res = await request("/api/opinion/build", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, questionUrl, questionTitle }),
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

// ── M3：世界进度 / 世界对话 ─────────────────────────────────────────────────

/** 世界进度增量补丁（与 §4.4 POST 体同形）。 */
export interface WorldProgressPatch {
  addVisitedNpc?: string[];
  addCollectedOpinion?: string[];
  addFoundSource?: string[];
  addFiredTrigger?: string[];
  setWorldState?: Record<string, unknown>;
}

export async function fetchWorldProgress(
  questionId: string,
): Promise<ExplorationProgressDto> {
  const res = await request(
    `/api/opinion/world/progress?questionId=${encodeURIComponent(questionId)}`,
    { headers: { "x-viewer-id": getViewerId() } },
  );
  const data = await json<{ progress: ExplorationProgressDto } & { error?: string }>(res);
  if (!res.ok) throw new Error(data.error || "world_progress_failed");
  return data.progress;
}

/** 增量写进度；失败（网络/500）时抛错，由调用方降级 localStorage。 */
export async function patchWorldProgress(
  questionId: string,
  patch: WorldProgressPatch,
): Promise<ExplorationProgressDto> {
  const res = await request("/api/opinion/world/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-viewer-id": getViewerId() },
    body: JSON.stringify({ questionId, ...patch }),
  });
  const data = await json<{ progress: ExplorationProgressDto } & { error?: string }>(res);
  if (!res.ok) throw new Error(data.error || "world_progress_failed");
  return data.progress;
}

export interface WorldDialogueRequestInput {
  npcId: string;
  trigger: "talk" | `guide-${string}`;
  locale: string;
  history: { speaker: string; text: string }[];
  worldState?: Record<string, unknown>;
}

/** AI 对话增强；402/404/网络错误返回 null，调用方回退本地静态模板。 */
export async function postWorldDialogue(
  input: WorldDialogueRequestInput,
): Promise<{ lines: DialogueLine[]; source: WorldDialogueReply["source"] } | null> {
  try {
    const res = await request("/api/opinion/world/dialogue", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-viewer-id": getViewerId() },
      body: JSON.stringify(input),
    });
    const data = await json<{ reply: WorldDialogueReply }>(res);
    if (!res.ok || !data.reply?.lines?.length) return null;
    return data.reply;
  } catch {
    return null;
  }
}
