import type { Scene } from "three";
import { Mesh, SphereGeometry, MeshStandardMaterial } from "three";

/**
 * Create and add a fusion sphere at the given position
 */
export function createFusionSphere(scene: Scene, pos: { x: number; y: number; z: number }): Mesh {
  const geom = new SphereGeometry(0.5, 32, 32);
  const mat = new MeshStandardMaterial({
    color: 0x00ffcc,
    emissive: 0x00ffcc,
    emissiveIntensity: 1.5,
  });
  const mesh = new Mesh(geom, mat);
  mesh.position.set(pos.x, pos.y, pos.z);
  // mark as fusion
  mesh.userData.isFusion = true;
  scene.add(mesh);
  return mesh;
}
