import * as THREE from "three";
import type { Opinion, Relation, Stance } from "@/lib/opinion/types";
import { getOpinionWorldTheme } from "@/lib/opinion/world-theme";
import { CosmosEngine3D } from "./cosmos-engine-3d";

/**
 * Small semantic skin over the stable 3D engine.
 * The base engine still owns physics/interaction; this layer only makes a
 * planet's space appearance reflect the same grammar used after landing.
 */
export class ThemedCosmosEngine3D extends CosmosEngine3D {
  override setData(opinions: Opinion[], relations: Relation[], stances: Record<string, Stance>) {
    super.setData(opinions, relations, stances);
    for (const node of this.nodes) {
      if (node.nodeType && node.nodeType !== "opinion") continue;
      applyOpinionPlanetGrammar(node);
    }
  }
}

function geometryFor(themeId: ReturnType<typeof getOpinionWorldTheme>["id"], radius: number) {
  switch (themeId) {
    case "crossroads":
      return new THREE.IcosahedronGeometry(radius, 0);
    case "archive":
      return new THREE.DodecahedronGeometry(radius, 1);
    case "theater":
      return new THREE.OctahedronGeometry(radius, 2);
    case "forest":
      return new THREE.IcosahedronGeometry(radius, 3);
    case "machine":
      return new THREE.DodecahedronGeometry(radius, 0);
  }
}

function applyOpinionPlanetGrammar(node: InstanceType<typeof CosmosEngine3D>["nodes"][number]) {
  const theme = getOpinionWorldTheme(node);
  const markerName = "opinion-planet-grammar";
  const old = node.group.getObjectByName(markerName);
  if (old) {
    disposeObject(old);
    node.group.remove(old);
  }

  node.core.geometry.dispose();
  node.core.geometry = geometryFor(theme.id, node.radius);
  const material = node.core.material;
  if (material instanceof THREE.MeshStandardMaterial) {
    material.color.set(theme.planet);
    material.emissive.set(theme.planet).multiplyScalar(0.42);
    material.roughness = theme.cosmos.roughness;
    material.metalness = theme.cosmos.metalness;
    material.needsUpdate = true;
  }
  node.baseColor.set(theme.planet);

  const grammar = new THREE.Group();
  grammar.name = markerName;

  // Atmospheric haze mirrors fog density on the surface without obscuring provenance glow.
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(node.radius * 1.18, 28, 20),
    new THREE.MeshBasicMaterial({
      color: theme.mist,
      transparent: true,
      opacity: theme.cosmos.atmosphere,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  grammar.add(atmosphere);

  if (theme.cosmos.surfaceLines > 0) {
    const lines = new THREE.Mesh(
      geometryFor(theme.id, node.radius * 1.045),
      new THREE.MeshBasicMaterial({
        color: theme.accent,
        transparent: true,
        opacity: theme.cosmos.surfaceLines,
        wireframe: true,
        depthWrite: false,
      }),
    );
    grammar.add(lines);
  }

  // A subtle orbital structure previews the dominant surface grammar.
  if (theme.cosmos.rings > 0) {
    const ringCount = theme.id === "machine" ? 2 : 1;
    for (let index = 0; index < ringCount; index += 1) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(node.radius * (1.38 + index * 0.16), node.radius * 0.025, 7, 56),
        new THREE.MeshBasicMaterial({
          color: theme.accent,
          transparent: true,
          opacity: Math.min(0.72, 0.28 + theme.cosmos.rings),
          depthWrite: false,
        }),
      );
      ring.rotation.x = Math.PI * (0.37 + index * 0.18);
      ring.rotation.z = theme.id === "crossroads" ? Math.PI * 0.25 : index * 0.46;
      grammar.add(ring);
    }
  }

  if (theme.id === "forest") addOrganicLandmarks(grammar, node.radius, theme.accent);
  if (theme.id === "archive") addArchiveLayers(grammar, node.radius, theme.accent);
  if (theme.id === "crossroads") addCrossroadsSeam(grammar, node.radius, theme.accent);

  node.group.add(grammar);
}

function addOrganicLandmarks(group: THREE.Group, radius: number, color: string) {
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2;
    const bud = new THREE.Mesh(
      new THREE.IcosahedronGeometry(radius * 0.055, 1),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 }),
    );
    bud.position.set(
      Math.cos(angle) * radius * 0.88,
      Math.sin(angle * 1.7) * radius * 0.42,
      Math.sin(angle) * radius * 0.88,
    );
    group.add(bud);
  }
}

function addArchiveLayers(group: THREE.Group, radius: number, color: string) {
  for (const scale of [1.12, 1.28]) {
    const shell = new THREE.Mesh(
      new THREE.DodecahedronGeometry(radius * scale, 0),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: scale === 1.12 ? 0.08 : 0.035,
        wireframe: true,
        depthWrite: false,
      }),
    );
    group.add(shell);
  }
}

function addCrossroadsSeam(group: THREE.Group, radius: number, color: string) {
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55 });
  const lines = [
    [new THREE.Vector3(-radius, 0, 0), new THREE.Vector3(radius, 0, 0)],
    [new THREE.Vector3(0, -radius * 0.82, 0), new THREE.Vector3(0, radius * 0.82, 0)],
  ];
  for (const points of lines) group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material.clone()));
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
      child.geometry.dispose();
      const material = child.material;
      if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
      else material.dispose();
    }
  });
}
