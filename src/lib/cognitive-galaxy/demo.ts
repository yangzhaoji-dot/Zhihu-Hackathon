export * from "./demo-data";
import { DEMO_GRAPHS } from "./demo-data";
import { getCuratedDemoLawPreset, type CuratedDemoLawPreset } from "./demo-law-curation";

/**
 * Homepage demos use deterministic, curated science matches so the showcase
 * remains complete even when external AI services are unavailable.
 */
export function getDemoLawPreset(opinionId: string): CuratedDemoLawPreset | null {
  for (const graph of Object.values(DEMO_GRAPHS)) {
    const opinion = graph.opinions.find((item) => item.id === opinionId);
    if (opinion) return getCuratedDemoLawPreset(opinion.id, opinion.title);
  }
  return null;
}
