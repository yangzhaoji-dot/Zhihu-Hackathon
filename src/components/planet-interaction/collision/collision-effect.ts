import type { Material, Mesh, Scene } from "three";
import {
  BufferGeometry,
  Float32BufferAttribute,
  Mesh as ThreeMesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Points,
  PointsMaterial,
  RingGeometry,
} from "three";

function setEmissiveIntensity(material: Material | Material[], value: number) {
  const materials = Array.isArray(material) ? material : [material];
  for (const item of materials) {
    if (item instanceof MeshStandardMaterial) item.emissiveIntensity = value;
  }
}

/**
 * Simple collision effect between two meshes
 */
export class CollisionEffect {
  private scene: Scene;
  private meshA: Mesh;
  private meshB: Mesh;
  private callback: (pos: { x: number; y: number; z: number }) => void;
  private state: number = 0;
  private timer: number = 0;

  constructor(scene: Scene, meshA: Mesh, meshB: Mesh, callback: (pos: { x: number; y: number; z: number }) => void) {
    this.scene = scene;
    this.meshA = meshA;
    this.meshB = meshB;
    this.callback = callback;
  }

  /** Start the effect */
  start() {
    this.state = 1;
    this.timer = 0;
  }

  /** Update effect per frame */
  update(delta: number) {
    if (this.state === 1) {
      // Phase 1: approach
      this.timer += delta;
      const t = Math.min(this.timer, 1);
      const center = {
        x: (this.meshA.position.x + this.meshB.position.x) / 2,
        y: (this.meshA.position.y + this.meshB.position.y) / 2,
        z: (this.meshA.position.z + this.meshB.position.z) / 2,
      };
      this.meshA.position.lerpVectors(this.meshA.position, center, t);
      this.meshB.position.lerpVectors(this.meshB.position, center, t);
      if (t >= 1) {
        this.state = 2;
        this.timer = 0;
      }
    } else if (this.state === 2) {
      // Phase 2: impact
      this.timer += delta;
      const pulse = 1 + 0.5 * Math.sin(this.timer * Math.PI * 4);
      this.meshA.scale.setScalar(pulse);
      this.meshB.scale.setScalar(pulse);
      setEmissiveIntensity(this.meshA.material, pulse);
      setEmissiveIntensity(this.meshB.material, pulse);
      if (this.timer > 0.5) {
        // shockwave
        const ring = new ThreeMesh(
          new RingGeometry(1, 1.2, 32),
          new MeshBasicMaterial({ color: 0xffffff, side: 2, transparent: true, opacity: 0.5 })
        );
        ring.position.copy(this.meshA.position);
        this.scene.add(ring);
        // particles
        const particles = new Points(new BufferGeometry(), new PointsMaterial({ color: 0xffff00, size: 0.1 }));
        const verts: number[] = [];
        for (let i = 0; i < 100; i++) {
          verts.push((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);
        }
        particles.geometry.setAttribute("position", new Float32BufferAttribute(verts, 3));
        particles.position.copy(this.meshA.position);
        this.scene.add(particles);
        this.state = 3;
        this.timer = 0;
      }
    } else if (this.state === 3) {
      // Phase 3: fusion
      this.timer += delta;
      if (this.timer > 0.5) {
        const pos = this.meshA.position;
        // remove both
        this.scene.remove(this.meshA);
        this.scene.remove(this.meshB);
        this.callback({ x: pos.x, y: pos.y, z: pos.z });
        this.state = 0;
      }
    }
  }

  /** Clean up if needed */
  dispose() {
    // no-op
  }
}
