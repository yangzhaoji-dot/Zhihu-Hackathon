export const VIEWPOINT_RELATIONS = [
  "refinement",
  "extension",
  "revision",
  "counterpoint",
  "new_dimension",
] as const;

export type ViewpointRelation = (typeof VIEWPOINT_RELATIONS)[number];
export type SynthesisAction = "merge" | "fork";

export interface SelectedExcerptInput {
  sourceId: string;
  text: string;
}

export interface SynthesisScores {
  grounding: number;
  coherence: number;
  specificity: number;
  boundary: number;
  novelty: number;
  overall: number;
}

export interface PlanetSynthesisResult {
  viewpoint: string;
  summary: string;
  relation: ViewpointRelation;
  action: SynthesisAction;
  reason: string;
  additions: string[];
  gaps: string[];
  scores: SynthesisScores;
  provider?: string;
  model?: string;
}

export function selectionBelongsToSource(selection: string, sourceText: string): boolean {
  const text = selection.trim();
  if (text.length < 6 || text.length > 600) return false;
  return sourceText.includes(text);
}

function score(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function cleanList(value: unknown, max = 4): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, max);
}

export function normalizePlanetSynthesis(value: unknown): Omit<PlanetSynthesisResult, "provider" | "model"> | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const viewpoint = typeof raw.viewpoint === "string" ? raw.viewpoint.trim() : "";
  const summary = typeof raw.summary === "string" ? raw.summary.trim() : "";
  const reason = typeof raw.reason === "string" ? raw.reason.trim() : "";
  const relation = VIEWPOINT_RELATIONS.includes(raw.relation as ViewpointRelation)
    ? raw.relation as ViewpointRelation
    : null;
  const action = raw.action === "merge" || raw.action === "fork" ? raw.action : null;
  const scores = raw.scores && typeof raw.scores === "object"
    ? raw.scores as Record<string, unknown>
    : {};
  if (!viewpoint || !summary || !reason || !relation || !action) return null;
  return {
    viewpoint: viewpoint.slice(0, 180),
    summary: summary.slice(0, 280),
    relation,
    action,
    reason: reason.slice(0, 260),
    additions: cleanList(raw.additions),
    gaps: cleanList(raw.gaps),
    scores: {
      grounding: score(scores.grounding),
      coherence: score(scores.coherence),
      specificity: score(scores.specificity),
      boundary: score(scores.boundary),
      novelty: score(scores.novelty),
      overall: score(scores.overall),
    },
  };
}
