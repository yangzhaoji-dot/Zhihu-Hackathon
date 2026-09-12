import * as THREE from "three";
import type { Opinion, Relation, Stance } from "@/lib/opinion/types";
import {
  loadDiscoveredOpinionIds,
  markOpinionDiscovered,
} from "@/lib/opinion/opinion-discovery";
import { getViewerId } from "@/lib/opinion/viewer-id";
import { loadLocalWorldProgress } from "@/lib/opinion/world-progress-cache";
import { getOpinionWorldTheme } from "@/lib/opinion/world-theme";
import { resonanceCompleteKey } from "@/lib/world/resonance";
import { ThemedCosmosEngine3D } from "./themed-cosmos-engine-3d";

/**
 * Two-stage galaxy exploration.
 *
 * Stage A — normal question galaxy:
 *   show the higher-visibility opinions normally. Low-visibility candidates are
 *   not rendered yet, so the opening view is not a universe full of dim stars.
 *
 * Stage B — deep view:
 *   after the seeker resonates with one initially visible human opinion, the
 *   camera pulls back and a few traceable low-visibility opinions enter the
 *   outer field as weak signals. Focusing one reveals its title and records it
 *   as discovered.
 *
 * "Buried" here only means structurally easy to overlook inside the CURRENT
 * retrieved graph. It never claims that Zhihu intentionally suppressed it.
 */
export class DiscoverableCosmosEngine3D extends ThemedCosmosEngine3D {
  private signalIds = new Set<string>();
  private questionId = "";
  private deepView = false;

  override setData(opinions: Opinion[], relations: Relation[], stances: Record<string, Stance>) {
    this.questionId = opinions.find((opinion) => opinion.questionId)?.questionId ?? "";
    const discovered = this.questionId ? loadDiscoveredOpinionIds(this.questionId) : new Set<string>();
    const candidateSignals = chooseGalaxySignals(opinions, relations, discovered);
    const progress = this.questionId
      ? loadLocalWorldProgress(getViewerId(), this.questionId)
      : null;
    const worldState = progress?.worldState ?? {};

    this.deepView = hasUnlockedDeepView(opinions, candidateSignals, worldState);

    if (!this.deepView) {
      // Opening galaxy: only the main visible field exists. Weak signals are
      // deliberately outside the current observable field, not merely dimmed.
      const visibleOpinions = opinions.filter((opinion) => !candidateSignals.has(opinion.id));
      const visibleRelations = relations.filter(
        (relation) => !candidateSignals.has(relation.from) && !candidateSignals.has(relation.to),
      );
      this.signalIds.clear();
      super.setData(visibleOpinions, visibleRelations, stances);
      return;
    }

    // Deep view: restore the complete retrieved graph and reveal only a small
    // number of outer weak signals so exploration remains legible.
    super.setData(opinions, relations, stances);
    this.signalIds = candidateSignals;
    for (const node of this.nodes) {
      if (this.signalIds.has(node.id)) {
        moveSignalToOuterField(node);
        applySignalAppearance(node);
      } else {
        clearSignalAppearance(node);
      }
    }

    if (this.signalIds.size > 0) {
      // Public zoom API keeps this layer independent of private camera fields.
      // factor < 1 means pull the camera back to expose a larger galaxy field.
      this.zoom(0.78);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("galaxy:deep-view", {
          detail: { questionId: this.questionId, signalCount: this.signalIds.size },
        }));
      }
    }
  }

  override locate(id: string) {
    if (this.signalIds.has(id)) {
      if (this.questionId) markOpinionDiscovered(this.questionId, id);
      this.signalIds.delete(id);
      const node = this.nodes.find((candidate) => candidate.id === id);
      if (node) revealDiscoveredPlanet(node);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("opinion:discovered", {
          detail: { opinionId: id, questionId: this.questionId },
        }));
      }
    }
    super.locate(id);
  }

  override resetFocus() {
    super.resetFocus();
    if (!this.deepView) return;
    for (const node of this.nodes) {
      if (this.signalIds.has(node.id)) applySignalAppearance(node);
    }
  }
}

/**
 * Deep view is earned by understanding one opinion in the INITIAL visible
 * field. Since signal candidates are absent before unlock, this produces the
 * intended loop: mainstream exploration -> resonance -> larger galaxy view.
 */
function hasUnlockedDeepView(
  opinions: Opinion[],
  signalCandidates: ReadonlySet<string>,
  worldState: Record<string, unknown>,
) {
  return opinions.some((opinion) => {
    if (signalCandidates.has(opinion.id)) return false;
    if (opinion.kind !== "human") return false;
    if (opinion.nodeType && opinion.nodeType !== "opinion") return false;
    return Boolean(worldState[resonanceCompleteKey(opinion.id)]);
  });
}

function chooseGalaxySignals(
  opinions: Opinion[],
  relations: Relation[],
  discovered: ReadonlySet<string>,
) {
  const traceable = opinions.filter(
    (opinion) =>
      opinion.kind === "human" &&
      (!opinion.nodeType || opinion.nodeType === "opinion") &&
      opinion.sourceIds.length > 0 &&
      !discovered.has(opinion.id),
  );
  if (traceable.length < 4) return new Set<string>();

  const maxSupport = Math.max(1, ...traceable.map((opinion) => opinion.support));
  const maxSourceCount = Math.max(1, ...traceable.map((opinion) => opinion.sourceIds.length));
  const degree = (id: string) => relations.reduce(
    (count, relation) => count + (relation.from === id || relation.to === id ? 1 : 0),
    0,
  );
  const maxDegree = Math.max(1, ...traceable.map((opinion) => degree(opinion.id)));
  const campSize = (camp?: string) => camp
    ? traceable.filter((opinion) => opinion.camp === camp).length
    : traceable.length;
  const maxCamp = Math.max(1, ...traceable.map((opinion) => campSize(opinion.camp)));

  const ranked = traceable.map((opinion) => {
    const visibility =
      (opinion.support / maxSupport) * 0.32 +
      (opinion.sourceIds.length / maxSourceCount) * 0.24 +
      (degree(opinion.id) / maxDegree) * 0.26 +
      (campSize(opinion.camp) / maxCamp) * 0.18;
    return { id: opinion.id, buriedness: 1 - visibility };
  }).sort((left, right) => right.buriedness - left.buriedness);

  const count = Math.min(2, Math.max(1, Math.floor(ranked.length * 0.22)));
  return new Set(ranked.slice(0, count).map((item) => item.id));
}

function moveSignalToOuterField(
  node: InstanceType<typeof ThemedCosmosEngine3D>["nodes"][number],
) {
  // Push weak signals beyond the original main cluster so "larger view" has a
  // spatial meaning, not just a cosmetic opacity change.
  const direction = node.home.clone();
  if (direction.lengthSq() < 0.01) {
    const seed = stableAngle(node.id);
    direction.set(Math.cos(seed), Math.sin(seed * 0.7) * 0.4, Math.sin(seed));
  }
  direction.normalize();
  const outerDistance = Math.max(node.home.length() * 1.42, 34);
  node.home.copy(direction.multiplyScalar(outerDistance));
  node.pos.copy(node.home);
  node.group.position.copy(node.pos);
}

function stableAngle(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) / 0xffffffff) * Math.PI * 2;
}

function signalName(opinionId: string) {
  return `buried-opinion-signal:${opinionId}`;
}

function applySignalAppearance(node: InstanceType<typeof ThemedCosmosEngine3D>["nodes"][number]) {
  node.label.visible = false;
  node.orbitGroup.visible = false;
  node.detailGroup.visible = false;
  const material = node.core.material;
  if (material instanceof THREE.MeshStandardMaterial) {
    material.transparent = true;
    material.opacity = 0.2;
    material.emissiveIntensity = 0.22;
  }
  node.glow.material.opacity = 0.12;
  if (node.group.getObjectByName(signalName(node.id))) return;

  const theme = getOpinionWorldTheme(node);
  const signal = new THREE.Group();
  signal.name = signalName(node.id);
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(node.radius * 1.42, node.radius * 0.018, 6, 54, Math.PI * 1.55),
    new THREE.MeshBasicMaterial({
      color: theme.mist,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  halo.rotation.x = Math.PI * 0.57;
  halo.rotation.z = Math.PI * 0.18;
  signal.add(halo);

  for (let index = 0; index < 3; index += 1) {
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(node.radius * 0.03, 7, 5),
      new THREE.MeshBasicMaterial({ color: theme.accent, transparent: true, opacity: 0.5 }),
    );
    const angle = 0.9 + index * 2.05;
    dot.position.set(
      Math.cos(angle) * node.radius * 1.55,
      Math.sin(index * 1.7) * node.radius * 0.35,
      Math.sin(angle) * node.radius * 1.55,
    );
    signal.add(dot);
  }
  node.group.add(signal);
}

function revealDiscoveredPlanet(node: InstanceType<typeof ThemedCosmosEngine3D>["nodes"][number]) {
  clearSignalAppearance(node);
  const material = node.core.material;
  if (material instanceof THREE.MeshStandardMaterial) {
    material.transparent = false;
    material.opacity = 1;
    material.emissiveIntensity = 0.72;
  }
  node.glow.material.opacity = 0.5;
  node.label.visible = true;
}

function clearSignalAppearance(node: InstanceType<typeof ThemedCosmosEngine3D>["nodes"][number]) {
  const signal = node.group.getObjectByName(signalName(node.id));
  if (!signal) return;
  signal.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const material = child.material;
      if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
      else material.dispose();
    }
  });
  node.group.remove(signal);
}
