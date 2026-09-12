import { DiscoverableCosmosEngine3D } from "./discoverable-cosmos-engine-3d";

/**
 * Narrative layer for the main galaxy.
 *
 * Orbit is for observing a planet and deciding whether to travel there. It must
 * not expose the reason / condition / evidence content that the seeker is meant
 * to recover on the surface. The planet title remains available through the
 * ordinary label + Kanshan guidance, while cognition details stay hidden until
 * the dedicated surface runtime takes over.
 */
export class NarrativeCosmosEngine3D extends DiscoverableCosmosEngine3D {
  override locate(id: string) {
    super.locate(id);
    const node = this.nodes.find((candidate) => candidate.id === id);
    if (!node || (node.nodeType && node.nodeType !== "opinion")) return;
    node.orbitGroup.visible = false;
    node.detailGroup.visible = false;
  }

  override enterSurface(id: string) {
    super.enterSurface(id);
    const node = this.nodes.find((candidate) => candidate.id === id);
    if (!node || (node.nodeType && node.nodeType !== "opinion")) return;
    node.orbitGroup.visible = false;
    node.detailGroup.visible = false;
  }
}
