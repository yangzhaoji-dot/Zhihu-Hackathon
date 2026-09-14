export * from "./demo-data";
import {
  DEMO_GRAPH as RAW_DEMO_GRAPH,
  AI_DEMO_GRAPH as RAW_AI_DEMO_GRAPH,
  STUDY_DEMO_GRAPH as RAW_STUDY_DEMO_GRAPH,
  GRADE_DEMO_GRAPH as RAW_GRADE_DEMO_GRAPH,
  DEMO_ID,
  AI_DEMO_ID,
  STUDY_DEMO_ID,
  GRADE_DEMO_ID,
} from "./demo-data";
import { getCuratedDemoLawPreset, type CuratedDemoLawPreset } from "./demo-law-curation";
import { withDemoRelations } from "./demo-relations";

export const DEMO_GRAPH = withDemoRelations(RAW_DEMO_GRAPH);
export const AI_DEMO_GRAPH = withDemoRelations(RAW_AI_DEMO_GRAPH);
export const STUDY_DEMO_GRAPH = withDemoRelations(RAW_STUDY_DEMO_GRAPH);
export const GRADE_DEMO_GRAPH = withDemoRelations(RAW_GRADE_DEMO_GRAPH);

export const DEMO_GRAPHS = {
  [DEMO_ID]: DEMO_GRAPH,
  [AI_DEMO_ID]: AI_DEMO_GRAPH,
  [STUDY_DEMO_ID]: STUDY_DEMO_GRAPH,
  [GRADE_DEMO_ID]: GRADE_DEMO_GRAPH,
};

export function getDemoGraph(id: string) {
  return DEMO_GRAPHS[id as keyof typeof DEMO_GRAPHS] ?? null;
}

/** Homepage demos use deterministic science matches and do not require AI. */
export function getDemoLawPreset(opinionId: string): CuratedDemoLawPreset | null {
  for (const graph of Object.values(DEMO_GRAPHS)) {
    const opinion = graph.opinions.find((item) => item.id === opinionId);
    if (opinion) return getCuratedDemoLawPreset(opinion.id, opinion.title);
  }
  return null;
}
