import type { Opinion, OpinionGraph } from "./types";
import {
  analyzeOpinionDiscovery,
  loadDiscoveredOpinionIds,
  type OpinionDiscoveryProfile,
} from "./opinion-discovery";

export type OpinionWithDiscovery = Opinion & {
  discovery?: OpinionDiscoveryProfile;
};

/** Client-side presentation view; source graph stays untouched. */
export function decorateOpinionsForDiscovery(graph: OpinionGraph): OpinionWithDiscovery[] {
  const discovered = loadDiscoveredOpinionIds(graph.questionId);
  const profiles = analyzeOpinionDiscovery(graph, discovered);
  return graph.opinions.map((opinion) => ({
    ...opinion,
    discovery: profiles[opinion.id],
  }));
}
