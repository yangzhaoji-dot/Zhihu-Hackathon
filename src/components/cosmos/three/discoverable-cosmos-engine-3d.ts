import * as THREE from "three";
import type { Opinion, Relation, Stance } from "@/lib/opinion/types";
import {
  loadDiscoveredOpinionIds,
  markOpinionDiscovered,
} from "@/lib/opinion/opinion-discovery";
import { getOpinionWorldTheme } from "@/lib/opinion/world-theme";
import { ThemedCosmosEngine3D } from "./themed-cosmos-engine-3d";

/**
 * Galaxy-level discovery layer.
 * Only traceable HUMAN opinions can become faint signals. AI stations are
 * excluded. "Buried" means structurally easy to overlook in the retrieved
 * graph, never an accusation that Zhihu intentionally suppressed content.
 */
export class DiscoverableCosmosEngine3D extends ThemedCosmosEngine3D {
  private signalIds = new Set<string>();
  private questionId = "";

  override setData(opinions: Opinion[], relations: Relation[], stances: Record<string, Stance>) {
    super.setData(opinions, relations, stances);
    this.questionId = opinions.find((opinion) => opinion.questionId)?.questionId ?? "";
    const discovered = this.questionId ? loadDiscoveredOpinionIds(this.questionId) : new Set<string>();
    this.signalIds = chooseGalaxySignals(opinions, relations, discovered);
    for (const node of this.nodes) {
      if (this.signalIds.has(node.id)) applySignalAppearance(node);
      else clearSignalAppearance(node);
    }
  }

  override locate(id: string) {
    if (this.signalIds.has(id)) {
      if (this.questionId) markOpinionDiscovered(this.questionId, id);
      this.signalIds.delete(id);
      const node = this.nodes.find((candidate) => candidate.id === id);
      if (node) revealDiscoveredPlanet(node);
      window.dispatchEvent(new CustomEvent("opinion:discovered", { detail: { opinionId: id } }));
    }
    super.locate(id);
  }

  override resetFocus() {
    super.resetFocus();
    for (const node of this.nodes) {
      if (this.signalIds.has(node.id)) applySignalAppearance(node);
    }
  }
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
