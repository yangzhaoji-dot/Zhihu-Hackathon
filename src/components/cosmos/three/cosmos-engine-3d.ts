import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

import type { Opinion, Relation, Stance } from "@/lib/opinion/types";
import { nodeSize, nodeWeight, sparkCount } from "@/lib/opinion/physics";
import {
  colorGoldBright,
  nodeColor,
  relationColor,
  relationDashed,
  stanceColor,
  GOLD_BRIGHT,
} from "./palette";
import { createStarfield, type Starfield } from "./starfield";
import { makeLabel } from "./text-sprite";
import { FpsGovernor, prefersReducedMotion, type PerfProfile } from "./webgl-support";

/**
 * A node living in the 3D opinion cosmos. Mirrors the 2D EngineNode contract
 * (`cx/cy` retained for API compatibility with cosmos-app) while adding the
 * real 3D position that the WebGL scene uses.
 */
export interface Node3D extends Opinion {
  cx: number; // screen-projected x (for collision callback parity)
  cy: number; // screen-projected y
  pos: THREE.Vector3; // true world position
  home: THREE.Vector3; // rest position for spring-back
  vel: THREE.Vector3;
  locked: boolean;
  stance?: Stance;
  group: THREE.Group; // holds core mesh + glow + rings + label
  core: THREE.Mesh;
  glow: THREE.Sprite;
  ring?: THREE.Mesh; // stance ring
  selRing?: THREE.Mesh; // selection ring
  label: THREE.Sprite;
  baseColor: THREE.Color;
  radius: number; // world-space radius
}

export interface Engine3DCallbacks {
  onTap: (node: Node3D) => void;
  onLongPress: (node: Node3D) => void;
  onCollision: (a: Node3D, b: Node3D, mx: number, my: number) => void;
}

const SPACE_DEPTH = 46; // world half-extent the nodes are spread across
const NODE_UNIT = 0.055; // px→world scale for node radius (nodeSize px * this)

/**
 * WebGL renderer + 3D physics for the opinion cosmos. Exposes the SAME public
 * surface as the 2D CosmosEngine (setData / setStance / zoom / locate / fuse /
 * layout / getNode / destroy, plus `nodes` and `selectedId`) so cosmos-app can
 * swap engines without knowing which one it holds.
 */
export class CosmosEngine3D {
  private mount: HTMLElement;
  private root: HTMLElement;
  private cb: Engine3DCallbacks;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private starfield!: Starfield;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private timer = new THREE.Timer();
  private governor = new FpsGovernor();
  private profile: PerfProfile;
  private reduced: boolean;

  private linkGroup = new THREE.Group();
  private linkLines = new Map<string, { line: THREE.Line; from: string; to: string }>();
  private sparkSystem: SparkSystem | null = null;

  nodes: Node3D[] = [];
  private relations: Relation[] = [];
  private nodeById = new Map<string, Node3D>();
  selectedId: string | null = null;

  private raf = 0;
  private disposed = false;

  // interaction state
  private drag: {
    node: Node3D;
    plane: THREE.Plane;
    offset: THREE.Vector3;
    pointerId: number;
    moved: boolean;
    startX: number;
    startY: number;
  } | null = null;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private hoverId: string | null = null;
  private lastCollisionAt = 0;
  private ro: ResizeObserver | null = null;

  constructor(
    mount: HTMLElement,
    root: HTMLElement,
    cb: Engine3DCallbacks,
    profile: PerfProfile,
  ) {
    this.mount = mount;
    this.root = root;
    this.cb = cb;
    this.profile = profile;
    this.reduced = prefersReducedMotion();
    this.initScene();
    this.bindEvents();
    this.animate();
  }

  // ── scene bootstrap ─────────────────────────────────────────────────────
  private initScene() {
    const w = this.mount.clientWidth || window.innerWidth;
    const h = this.mount.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: this.profile.tier !== "low",
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.profile.dpr));
    this.renderer.setSize(w, h);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
    this.mount.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0b0f1a, 0.0075);

    this.camera = new THREE.PerspectiveCamera(52, w / h, 0.1, 600);
    this.camera.position.set(0, 4, 62);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.55;
    this.controls.zoomSpeed = 0.8;
    this.controls.panSpeed = 0.6;
    this.controls.minDistance = 18;
    this.controls.maxDistance = 130;
    this.controls.maxPolarAngle = Math.PI * 0.92;
    this.controls.minPolarAngle = Math.PI * 0.08;
    // don't let orbit steal the drag gesture on nodes — we manage that manually
    this.controls.enabled = true;

    // lighting: cool key + warm gold rim, echoing the archive palette
    const ambient = new THREE.AmbientLight(0x33405a, 1.4);
    this.scene.add(ambient);
    const key = new THREE.DirectionalLight(0xbfe0ff, 1.1);
    key.position.set(20, 30, 40);
    this.scene.add(key);
    const rim = new THREE.PointLight(0xffd9a0, 1.2, 260, 1.6);
    rim.position.set(-40, 10, -20);
    this.scene.add(rim);

    // starfield backdrop
    this.starfield = createStarfield(this.profile.starCount, 240, this.profile.nebula);
    this.scene.add(this.starfield.group);

    this.scene.add(this.linkGroup);

    // sparks (collision particles)
    this.sparkSystem = new SparkSystem(this.profile.sparkBudget);
    this.scene.add(this.sparkSystem.points);

    // post-processing bloom (optional, perf-gated)
    if (this.profile.bloom) this.setupComposer(w, h);
  }

  private setupComposer(w: number, h: number) {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(w, h),
      this.profile.tier === "high" ? 0.62 : 0.5, // strength
      0.72, // radius
      0.82, // threshold — only bright emitters bloom
    );
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());
  }

  private w() {
    return this.mount.clientWidth || window.innerWidth;
  }
  private h() {
    return this.mount.clientHeight || window.innerHeight;
  }

  // ── data → scene ────────────────────────────────────────────────────────
  setData(opinions: Opinion[], relations: Relation[], stances: Record<string, Stance>) {
    this.clearNodes();
    this.relations = relations;
    for (const o of opinions) this.mountNode(o, stances[o.id]);
    this.buildLinks();
    this.layout();
  }

  /** Map normalized 0-1 layout coords to a world position with depth spread. */
  private homeFor(o: Opinion): THREE.Vector3 {
    // x,y are 0-1 screen-plane coords; derive a stable pseudo-random depth from id
    const seed = hashId(o.id);
    const z = (frac(seed) - 0.5) * 2 * SPACE_DEPTH * 0.62;
    return new THREE.Vector3(
      (o.x - 0.5) * 2 * SPACE_DEPTH,
      (0.5 - o.y) * 2 * SPACE_DEPTH * 0.62, // invert y (screen→world up)
      z,
    );
  }

  private mountNode(o: Opinion, stance?: Stance) {
    const radius = nodeSize(o.support) * NODE_UNIT;
    const baseColor = nodeColor(o.kind);
    const group = new THREE.Group();

    // core gem — icosahedron reads as a faceted "archive gem"
    const coreGeo = new THREE.IcosahedronGeometry(radius, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: baseColor,
      emissive: baseColor.clone().multiplyScalar(0.55),
      emissiveIntensity: 0.9,
      metalness: 0.45,
      roughness: 0.32,
      flatShading: true,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.userData.nodeId = o.id;
    group.add(core);

    // gold inner shell (thin faceted skin catching the rim light)
    const shellGeo = new THREE.IcosahedronGeometry(radius * 1.06, 1);
    const shellMat = new THREE.MeshBasicMaterial({
      color: colorGoldBright,
      transparent: true,
      opacity: 0.1,
      wireframe: true,
    });
    const shell = new THREE.Mesh(shellGeo, shellMat);
    group.add(shell);

    // soft additive glow sprite
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture(),
        color: baseColor,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    glow.scale.setScalar(radius * 4.2);
    group.add(glow);

    // AI tag / label
    const label = makeLabel(o.title, {
      color: "#f2ede1",
      font: "600 40px",
      maxWidth: 460,
    });
    label.position.set(0, radius + 0.9, 0);
    const labelScale = Math.min(1, 0.5 + o.support / 160);
    label.scale.multiplyScalar(2.1 * labelScale);
    group.add(label);

    const node: Node3D = {
      ...o,
      cx: 0,
      cy: 0,
      pos: new THREE.Vector3(),
      home: this.homeFor(o),
      vel: new THREE.Vector3(),
      locked: false,
      stance,
      group,
      core,
      glow,
      label,
      baseColor,
      radius,
    };
    node.pos.copy(node.home);
    group.position.copy(node.pos);
    this.scene.add(group);
    this.nodes.push(node);
    this.nodeById.set(o.id, node);
    this.decorateStance(node);
  }

  private buildLinks() {
    for (const [, l] of this.linkLines) {
      this.linkGroup.remove(l.line);
      l.line.geometry.dispose();
      (l.line.material as THREE.Material).dispose();
    }
    this.linkLines.clear();
    for (const r of this.relations) {
      this.addLink(r.from, r.to, r.type);
    }
  }

  private addLink(from: string, to: string, type: Relation["type"]) {
    const geo = new THREE.BufferGeometry();
    geo.setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const dashed = relationDashed(type);
    const col = relationColor(type);
    const mat = dashed
      ? new THREE.LineDashedMaterial({
          color: col,
          transparent: true,
          opacity: 0.42,
          dashSize: 1.1,
          gapSize: 0.8,
        })
      : new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.34 });
    const line = new THREE.Line(geo, mat);
    if (dashed) line.computeLineDistances();
    line.userData.link = { from, to };
    this.linkGroup.add(line);
    this.linkLines.set(`${from}->${to}`, { line, from, to });
  }

  private updateLinks() {
    for (const [, l] of this.linkLines) {
      const a = this.nodeById.get(l.from);
      const b = this.nodeById.get(l.to);
      if (!a || !b) continue;
      const pos = l.line.geometry.getAttribute("position") as THREE.BufferAttribute;
      pos.setXYZ(0, a.pos.x, a.pos.y, a.pos.z);
      pos.setXYZ(1, b.pos.x, b.pos.y, b.pos.z);
      pos.needsUpdate = true;
      l.line.geometry.computeBoundingSphere();
      if (l.line.material instanceof THREE.LineDashedMaterial) l.line.computeLineDistances();
    }
  }

  // ── stance decoration ───────────────────────────────────────────────────
  private decorateStance(n: Node3D) {
    if (n.ring) {
      n.group.remove(n.ring);
      n.ring.geometry.dispose();
      (n.ring.material as THREE.Material).dispose();
      n.ring = undefined;
    }
    if (!n.stance) return;
    const ringGeo = new THREE.TorusGeometry(n.radius * 1.5, n.radius * 0.09, 8, 40);
    const ringMat = new THREE.MeshBasicMaterial({
      color: stanceColor(n.stance),
      transparent: true,
      opacity: 0.92,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    n.ring = ring;
    n.group.add(ring);
  }

  setStance(id: string, stance: Stance) {
    const n = this.nodeById.get(id);
    if (!n) return;
    n.stance = stance;
    this.decorateStance(n);
  }

  // ── selection ───────────────────────────────────────────────────────────
  private setSelected(id: string | null) {
    // remove old selection ring
    for (const n of this.nodes) {
      if (n.selRing && n.id !== id) {
        n.group.remove(n.selRing);
        n.selRing.geometry.dispose();
        (n.selRing.material as THREE.Material).dispose();
        n.selRing = undefined;
      }
    }
    this.selectedId = id;
    if (!id) return;
    const n = this.nodeById.get(id);
    if (!n || n.selRing) return;
    const geo = new THREE.TorusGeometry(n.radius * 1.85, n.radius * 0.12, 10, 48);
    const mat = new THREE.MeshBasicMaterial({
      color: colorGoldBright,
      transparent: true,
      opacity: 0.95,
    });
    const selRing = new THREE.Mesh(geo, mat);
    n.selRing = selRing;
    n.group.add(selRing);
  }

  // ── layout / render loop ────────────────────────────────────────────────
  layout() {
    // recompute homes (e.g. on resize the depth spread stays; nothing to do
    // beyond ensuring aspect is current — handled in resize()).
    this.resize();
  }

  private animate = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.animate);
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.05);
    const t = this.timer.getElapsed();

    // perf governor: shed bloom if frames sustain low
    if (this.bloomPass && this.governor.sample(performance.now())) {
      this.disableBloom();
    }

    if (!this.reduced) this.starfield.update(t);
    this.controls.update();
    this.stepPhysics(dt);
    this.updateNodeVisuals(t);
    this.updateLinks();
    this.sparkSystem?.update(dt);
    this.projectNodes();

    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  };

  /** Gentle spring-back + separation so the cloud stays legible and alive. */
  private stepPhysics(dt: number) {
    const k = 2.2; // spring stiffness toward home
    const damp = 0.86;
    for (const n of this.nodes) {
      if (this.drag?.node === n) continue;
      if (n.locked) {
        // locked nodes still drift home slowly after being dragged
        const toHome = n.home.clone().sub(n.pos);
        if (toHome.length() < 0.4) {
          n.locked = false;
        } else {
          n.vel.addScaledVector(toHome, k * dt * 0.4);
        }
      } else {
        const toHome = n.home.clone().sub(n.pos);
        n.vel.addScaledVector(toHome, k * dt);
      }
      // idle bob for life (skipped under reduced motion)
      if (!this.reduced && !n.locked) {
        const bob = Math.sin(t01(n.id) + this.timer.getElapsed() * 0.6) * 0.06 * dt;
        n.vel.y += bob;
      }
      n.vel.multiplyScalar(damp);
      n.pos.addScaledVector(n.vel, dt * 6);
      n.group.position.copy(n.pos);
    }
  }

  private updateNodeVisuals(t: number) {
    for (const n of this.nodes) {
      // slow spin gives the gem facets life
      if (!this.reduced) n.core.rotation.y = t * 0.25 + hashId(n.id);
      // orient rings to face the camera plane loosely
      if (n.ring) n.ring.lookAt(this.camera.position);
      if (n.selRing) {
        n.selRing.lookAt(this.camera.position);
        const pulse = 0.9 + Math.sin(t * 3) * 0.12;
        (n.selRing.material as THREE.MeshBasicMaterial).opacity = pulse;
      }
      // hover lift
      const isHover = n.id === this.hoverId;
      const target = isHover ? 1.14 : 1;
      const s = n.group.scale.x + (target - n.group.scale.x) * 0.2;
      n.group.scale.setScalar(s);
    }
  }

  /** Project world positions to screen px for the collision callback parity. */
  private projectNodes() {
    const w = this.w();
    const h = this.h();
    const v = new THREE.Vector3();
    for (const n of this.nodes) {
      v.copy(n.pos).project(this.camera);
      n.cx = ((v.x + 1) / 2) * w;
      n.cy = ((1 - v.y) / 2) * h;
    }
  }

  zoom(factor: number) {
    // dolly the camera along its view direction
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const dist = this.camera.position.distanceTo(this.controls.target);
    const next = THREE.MathUtils.clamp(
      dist / factor,
      this.controls.minDistance,
      this.controls.maxDistance,
    );
    const newPos = this.controls.target.clone().addScaledVector(dir, -next);
    this.camera.position.copy(newPos);
    this.controls.update();
  }

  private disableBloom() {
    if (!this.composer) return;
    this.composer.dispose?.();
    this.composer = null;
    this.bloomPass = null;
    this.profile = { ...this.profile, bloom: false };
  }

  // ── interaction: raycasting drag / tap / long-press / hover ─────────────
  private bindEvents() {
    const el = this.renderer.domElement;
    el.style.touchAction = "none";
    el.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    // resize
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.mount);
  }

  private updatePointer(ev: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private pickNode(): Node3D | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const cores = this.nodes.map((n) => n.core);
    const hits = this.raycaster.intersectObjects(cores, false);
    if (!hits.length) return null;
    const id = hits[0].object.userData.nodeId as string;
    return this.nodeById.get(id) ?? null;
  }

  private onPointerDown = (ev: PointerEvent) => {
    this.updatePointer(ev);
    const node = this.pickNode();
    if (!node) return; // let OrbitControls handle empty-space drag (camera orbit)
    ev.stopPropagation();
    // suspend orbit while dragging a node
    this.controls.enabled = false;
    this.setSelected(node.id);

    // drag on a plane facing the camera through the node
    const normal = new THREE.Vector3();
    this.camera.getWorldDirection(normal);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, node.pos);
    const hit = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, hit);
    const offset = node.pos.clone().sub(hit);

    this.drag = {
      node,
      plane,
      offset,
      pointerId: ev.pointerId,
      moved: false,
      startX: ev.clientX,
      startY: ev.clientY,
    };
    try {
      this.renderer.domElement.setPointerCapture(ev.pointerId);
    } catch {
      /* ignore */
    }
    if (this.longPressTimer) clearTimeout(this.longPressTimer);
    this.longPressTimer = setTimeout(() => {
      if (this.drag && !this.drag.moved) {
        this.cb.onLongPress(node);
        this.endDrag();
      }
    }, 480);
  };

  private onPointerMove = (ev: PointerEvent) => {
    this.updatePointer(ev);
    if (!this.drag) {
      // hover highlight
      const hovered = this.pickNode();
      const id = hovered?.id ?? null;
      if (id !== this.hoverId) {
        this.hoverId = id;
        this.renderer.domElement.style.cursor = id ? "grab" : "default";
      }
      return;
    }
    const d = this.drag;
    const dist = Math.hypot(ev.clientX - d.startX, ev.clientY - d.startY);
    if (dist > 5) d.moved = true;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(d.plane, hit)) {
      hit.add(d.offset);
      // heavier nodes lag a touch — the "weight" of support
      const weight = nodeWeight(d.node.support);
      d.node.vel.copy(hit.clone().sub(d.node.pos)).multiplyScalar(1 / weight);
      d.node.pos.lerp(hit, 1 / weight);
      d.node.locked = true;
      d.node.group.position.copy(d.node.pos);
    }
    if (d.moved) this.checkCollision(d.node);
  };

  private onPointerUp = () => {
    if (this.longPressTimer) clearTimeout(this.longPressTimer);
    if (this.drag && !this.drag.moved) {
      this.cb.onTap(this.drag.node);
    }
    this.endDrag();
  };

  private endDrag() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    if (this.drag) {
      try {
        this.renderer.domElement.releasePointerCapture(this.drag.pointerId);
      } catch {
        /* ignore */
      }
    }
    this.drag = null;
    this.controls.enabled = true;
  }

  // ── 3D collision → sparks + callback ────────────────────────────────────
  private checkCollision(a: Node3D) {
    for (const b of this.nodes) {
      if (a === b) continue;
      const d = a.pos.distanceTo(b.pos);
      if (d < (a.radius + b.radius) * 1.35) {
        this.collide(a, b);
        break;
      }
    }
  }

  private collide(a: Node3D, b: Node3D) {
    const now = Date.now();
    if (now - this.lastCollisionAt < 900) return;
    this.lastCollisionAt = now;

    // momentum-conserving push in 3D so neither node disappears
    const normal = a.pos.clone().sub(b.pos);
    if (normal.lengthSq() < 1e-4) normal.set(1, 0, 0);
    normal.normalize();
    a.vel.addScaledVector(normal, 6);
    b.vel.addScaledVector(normal, -6);
    a.locked = b.locked = true;

    const mid = a.pos.clone().add(b.pos).multiplyScalar(0.5);
    const count = Math.min(sparkCount(a.support, b.support), this.profile.sparkBudget);
    this.sparkSystem?.burst(mid, count, a.support + b.support);

    // screen shake on the root DOM (reuses existing .shake CSS)
    this.root.classList.add("shake");
    setTimeout(() => this.root.classList.remove("shake"), 280);

    // project midpoint to screen px for the panel anchor / fusion coords
    const v = mid.clone().project(this.camera);
    const mx = ((v.x + 1) / 2) * this.w();
    const my = ((1 - v.y) / 2) * this.h();
    this.cb.onCollision(a, b, mx, my);
  }

  // ── search locate: fly camera to the node + spotlight ───────────────────
  locate(id: string) {
    const n = this.nodeById.get(id);
    if (!n) return;
    this.setSelected(id);
    // dim others briefly
    for (const other of this.nodes) {
      if (other.id !== id) {
        (other.core.material as THREE.MeshStandardMaterial).opacity = 0.25;
        (other.core.material as THREE.MeshStandardMaterial).transparent = true;
      }
    }
    this.flyTo(n.pos, n.radius * 8 + 14);
    setTimeout(() => {
      for (const other of this.nodes) {
        const m = other.core.material as THREE.MeshStandardMaterial;
        m.opacity = 1;
        m.transparent = false;
      }
    }, 1600);
  }

  /** Smoothly move the camera to look at `target` from `dist` away. */
  private flyTo(target: THREE.Vector3, dist: number, duration = 900) {
    const startTarget = this.controls.target.clone();
    const startPos = this.camera.position.clone();
    const dir = startPos.clone().sub(startTarget).normalize();
    const endPos = target.clone().addScaledVector(dir, dist);
    const t0 = performance.now();
    const ease = (x: number) => 1 - Math.pow(1 - x, 3);
    const tick = () => {
      if (this.disposed) return;
      const k = Math.min(1, (performance.now() - t0) / duration);
      const e = ease(k);
      this.controls.target.lerpVectors(startTarget, target, e);
      this.camera.position.lerpVectors(startPos, endPos, e);
      this.controls.update();
      if (k < 1) requestAnimationFrame(tick);
    };
    tick();
  }

  getNode(id: string): Node3D | null {
    return this.nodeById.get(id) ?? null;
  }

  // ── fusion: two parents wind toward a materializing candidate ───────────
  fuse(aId: string, bId: string, candidate: Opinion): Promise<void> {
    return new Promise((resolve) => {
      const a = this.nodeById.get(aId);
      const b = this.nodeById.get(bId);
      if (!a || !b) return resolve();
      const mid = a.pos.clone().add(b.pos).multiplyScalar(0.5);

      // mount the candidate node at the midpoint, initially invisible
      this.mountNode({ ...candidate }, undefined);
      const node = this.nodeById.get(candidate.id);
      if (!node) return resolve();
      node.home.copy(mid);
      node.pos.copy(mid);
      node.group.position.copy(mid);
      node.group.scale.setScalar(0.01);
      // link parents → candidate
      this.addLink(aId, candidate.id, "add");
      this.addLink(bId, candidate.id, "add");

      const oa = a.pos.clone();
      const ob = b.pos.clone();
      a.locked = b.locked = true;
      const total = 42;
      let step = 0;
      const timer = setInterval(() => {
        step++;
        const k = step / total;
        const spin = Math.sin(k * Math.PI * 6) * 3.2;
        // parents spiral inward toward the midpoint
        a.pos.lerpVectors(oa, mid, k);
        a.pos.x += spin;
        b.pos.lerpVectors(ob, mid, k);
        b.pos.x -= spin;
        a.group.position.copy(a.pos);
        b.group.position.copy(b.pos);
        // candidate grows in
        node.group.scale.setScalar(Math.min(1, k * 1.2));
        // a few sparks along the way
        if (step % 6 === 0) this.sparkSystem?.burst(mid, 6, node.support + 40);
        if (step >= total) {
          clearInterval(timer);
          // parents ease back to their homes; candidate settles
          a.pos.copy(oa);
          b.pos.copy(ob);
          a.group.position.copy(a.pos);
          b.group.position.copy(b.pos);
          a.locked = b.locked = false;
          node.group.scale.setScalar(1);
          resolve();
        }
      }, 16);
    });
  }

  // ── resize / teardown ───────────────────────────────────────────────────
  private resize() {
    const w = this.w();
    const h = this.h();
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer?.setSize(w, h);
    this.bloomPass?.setSize(w, h);
  }

  private clearNodes() {
    for (const n of this.nodes) {
      this.scene.remove(n.group);
      n.core.geometry.dispose();
      (n.core.material as THREE.Material).dispose();
      (n.glow.material as THREE.SpriteMaterial).map?.dispose();
      (n.glow.material as THREE.Material).dispose();
      (n.label.material as THREE.SpriteMaterial).map?.dispose();
      (n.label.material as THREE.Material).dispose();
      n.ring?.geometry.dispose();
      if (n.ring) (n.ring.material as THREE.Material).dispose();
      n.selRing?.geometry.dispose();
      if (n.selRing) (n.selRing.material as THREE.Material).dispose();
      n.group.traverse((o) => {
        if (o instanceof THREE.Mesh && o !== n.core) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
    }
    this.nodes = [];
    this.nodeById.clear();
  }

  destroy() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    if (this.longPressTimer) clearTimeout(this.longPressTimer);
    this.renderer.domElement.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    this.ro?.disconnect();
    this.clearNodes();
    for (const [, l] of this.linkLines) {
      l.line.geometry.dispose();
      (l.line.material as THREE.Material).dispose();
    }
    this.linkLines.clear();
    this.starfield.dispose();
    this.sparkSystem?.dispose();
    this.controls.dispose();
    this.composer?.dispose?.();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

// ── collision spark particle system ────────────────────────────────────────
class SparkSystem {
  points: THREE.Points;
  private geo: THREE.BufferGeometry;
  private mat: THREE.ShaderMaterial;
  private cap: number;
  private pos: Float32Array;
  private vel: Float32Array;
  private life: Float32Array;
  private size: Float32Array;
  private cursor = 0;

  constructor(cap: number) {
    // total pool is a few bursts' worth
    this.cap = Math.max(60, cap * 3);
    this.pos = new Float32Array(this.cap * 3);
    this.vel = new Float32Array(this.cap * 3);
    this.life = new Float32Array(this.cap);
    this.size = new Float32Array(this.cap);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute("aLife", new THREE.BufferAttribute(this.life, 1));
    this.geo.setAttribute("aSize", new THREE.BufferAttribute(this.size, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) } },
      vertexShader: /* glsl */ `
        attribute float aLife;
        attribute float aSize;
        varying float vLife;
        uniform float uPixelRatio;
        void main() {
          vLife = aLife;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * aLife * uPixelRatio * (300.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vLife;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          float a = smoothstep(0.5, 0.0, d) * vLife;
          // warm gold core → fading amber, matching the 2D spark color
          vec3 col = mix(vec3(1.0, 0.62, 0.28), vec3(1.0, 0.85, 0.5), vLife);
          gl_FragColor = vec4(col, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
  }

  burst(at: THREE.Vector3, count: number, intensity: number) {
    for (let i = 0; i < count; i++) {
      const idx = this.cursor % this.cap;
      this.cursor++;
      this.pos[idx * 3] = at.x;
      this.pos[idx * 3 + 1] = at.y;
      this.pos[idx * 3 + 2] = at.z;
      // random outward burst velocity
      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      ).normalize();
      const speed = 4 + Math.random() * 8;
      this.vel[idx * 3] = dir.x * speed;
      this.vel[idx * 3 + 1] = dir.y * speed;
      this.vel[idx * 3 + 2] = dir.z * speed;
      this.life[idx] = 1;
      this.size[idx] = intensity > 150 ? 3.4 : 2.4;
    }
  }

  update(dt: number) {
    const decay = dt * 1.6;
    for (let i = 0; i < this.cap; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= decay;
      if (this.life[i] < 0) this.life[i] = 0;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      // slight drag
      this.vel[i * 3] *= 0.94;
      this.vel[i * 3 + 1] *= 0.94;
      this.vel[i * 3 + 2] *= 0.94;
    }
    (this.geo.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (this.geo.getAttribute("aLife") as THREE.BufferAttribute).needsUpdate = true;
    (this.geo.getAttribute("aSize") as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose() {
    this.geo.dispose();
    this.mat.dispose();
  }
}

// ── shared helpers ──────────────────────────────────────────────────────────
let _glowTex: THREE.CanvasTexture | null = null;
function glowTexture(): THREE.CanvasTexture {
  if (_glowTex) return _glowTex;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.3, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  _glowTex = new THREE.CanvasTexture(canvas);
  _glowTex.colorSpace = THREE.SRGBColorSpace;
  return _glowTex;
}

/** Deterministic hash of an id → a float in a wide range. */
function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296 * 6.283;
}

/** Fractional part helper. */
function frac(x: number): number {
  return x - Math.floor(x);
}

/** id → stable phase in [0, 2π) for idle animation offsets. */
function t01(id: string): number {
  return hashId(id);
}

export { GOLD_BRIGHT };
