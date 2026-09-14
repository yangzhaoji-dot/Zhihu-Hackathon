import type { Scene, Camera, Mesh } from "three";
import { CollisionEffect } from "./collision/collision-effect";
import { createFusionSphere } from "./fusion/fusion-spawn";
import type { InteractionState } from "./types";

/**
 * Controller for planet interactions: select, collision, fusion
 */
export class PlanetController {
  private selectedId: string | null = null;
  private state: InteractionState = "idle";
  private effect: CollisionEffect | null = null;
  private scene: Scene;
  private camera: Camera;

  constructor(scene: Scene, camera: Camera) {
    this.scene = scene;
    this.camera = camera;
  }

  /** Handle planet selection; on second click triggers collision */
  selectPlanet(id: string) {
    console.log("🔥 SELECT PLANET", id);
    if (!this.selectedId) {
      this.selectedId = id;
    } else if (this.selectedId !== id) {
      const idA = this.selectedId;
      const idB = id;
      this.triggerCollision(idA, idB);
      this.selectedId = null;
    }
  }

  /** Clear any selection */
  clearSelection() {
    this.selectedId = null;
    this.setState("idle");
  }

  /** Trigger collision between two planet meshes by opinionId */
  triggerCollision(idA: string, idB: string) {
      console.log("🔥 TRY COLLISION", idA, idB);
    const meshA = this.scene.getObjectByProperty("userData.opinionId", idA) as Mesh;
    const meshB = this.scene.getObjectByProperty("userData.opinionId", idB) as Mesh;
    if (meshA && meshB) {
      this.setState("collision");
      this.effect = new CollisionEffect(this.scene, meshA, meshB, this.onFusionComplete.bind(this));
      this.effect.start();
    }
  }

  /** Called when fusion effect completes */
  private onFusionComplete(position: { x: number; y: number; z: number }) {
    this.setState("fusion");
    console.log("🔥 FUSION SPAWN", position);
      createFusionSphere(this.scene, position);
  }

  /** Update per-frame animations */
  update(delta: number) {
    this.effect?.update(delta);
  }

  private setState(state: InteractionState) {
    this.state = state;
    console.log("PLANET STATE:", state);
  }
}
