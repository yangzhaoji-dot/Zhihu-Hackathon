import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

import type { QuestionNetwork, Question } from "@/lib/opinion/types";
import { colorGold, colorGoldBright, relationColor, CY, VI, GOLD } from "./palette";
import { createStarfield, type Starfield } from "./starfield";
import { makeLabel } from "./text-sprite";
import { prefersReducedMotion, type PerfProfile } from "./webgl-support";

interface QNode {
  q: Question;
  group: THREE.Group;
  core: THREE.Mesh;
  glow: THREE.Sprite;
  home: THREE.Vector3;
}

export interface QuestionSpaceCallbacks {
  /** Fired after the dive-in animation completes. */
  onEnter: (questionId: string, title: string) => void;
}

const GALAXY_R = 34;

/**
 * Layer-1 as a 3D question galaxy: the core question is a bright central star,
 * related questions orbit it, and tapping one flies the camera *into* that
 * question — a dive that hands off to the opinion space (creating the
 * "swoop from the question galaxy down into the opinion starfield" feel).
 */
export class QuestionSpace3D {
  private mount: HTMLElement;
  private cb: QuestionSpaceCallbacks;
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
  private profile: PerfProfile;
  private reduced: boolean;

  private qnodes: QNode[] = [];
  private byId = new Map<string, QNode>();
  private linkGroup = new THREE.Group();
  private links: Array<{ line: THREE.Line; from: string; to: string }> = [];

  private raf = 0;
  private disposed = false;
  private diving = false;
  private hoverId: string | null = null;
  private ro: ResizeObserver | null = null;
  private downXY: { x: number; y: number } | null = null;

  constructor(
    mount: HTMLElement,
    network: QuestionNetwork,
    cb: QuestionSpaceCallbacks,
    profile: PerfProfile,
  ) {
    this.mount = mount;
    this.cb = cb;
    this.profile = profile;
    this.reduced = prefersReducedMotion();
    this.initScene();
    this.build(network);
    this.bindEvents();
    this.animate();
  }

  private w() {
    return this.mount.clientWidth || window.innerWidth;
  }
  private h() {
    return this.mount.clientHeight || window.innerHeight;
  }

  private initScene() {
    const w = this.w();
    const h = this.h();
    this.renderer = new THREE.WebGLRenderer({
      antialias: this.profile.tier !== "low",
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.profile.dpr));
    this.renderer.setSize(w, h);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.domElement.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;";
    this.mount.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0b0f1a, 0.007);

    this.camera = new THREE.PerspectiveCamera(54, w / h, 0.1, 600);
    this.camera.position.set(0, 6, 58);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.5;
    this.controls.minDistance = 22;
    this.controls.maxDistance = 110;
    this.controls.maxPolarAngle = Math.PI * 0.9;
    this.controls.minPolarAngle = Math.PI * 0.1;

    const ambient = new THREE.AmbientLight(0x33405a, 1.5);
    this.scene.add(ambient);
    const key = new THREE.DirectionalLight(0xbfe0ff, 1.0);
    key.position.set(10, 20, 40);
    this.scene.add(key);
    const warm = new THREE.PointLight(0xffd9a0, 1.6, 200, 1.4);
    warm.position.set(0, 0, 8);
    this.scene.add(warm);

    this.starfield = createStarfield(this.profile.starCount, 240, this.profile.nebula);
    this.scene.add(this.starfield.group);
    this.scene.add(this.linkGroup);

    if (this.profile.bloom) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(w, h),
        0.6,
        0.7,
        0.78,
      );
      this.composer.addPass(this.bloomPass);
      this.composer.addPass(new OutputPass());
    }
  }

  private build(network: QuestionNetwork) {
    const core = network.questions.find((q) => q.core) ?? network.questions[0];
    const others = network.questions.filter((q) => q.id !== core?.id);

    // core star at center
    if (core) this.mountQuestion(core, new THREE.Vector3(0, 0, 0), true);

    // others on a loose orbit ring, using their normalized x/y for angle + a
    // little depth variety so it reads as a galaxy, not a flat wheel
    others.forEach((q, i) => {
      const ang = (i / Math.max(1, others.length)) * Math.PI * 2;
      const rr = GALAXY_R * (0.7 + (q.x + q.y) * 0.15);
      const pos = new THREE.Vector3(
        Math.cos(ang) * rr,
        (q.y - 0.5) * 22,
        Math.sin(ang) * rr,
      );
      this.mountQuestion(q, pos, false);
    });

    // relation lines from network
    for (const r of network.relations) {
      const a = this.byId.get(r.from);
      const b = this.byId.get(r.to);
      if (!a || !b) continue;
      const geo = new THREE.BufferGeometry().setFromPoints([a.home, b.home]);
      const mat = new THREE.LineBasicMaterial({
        color: relationColor(r.type),
        transparent: true,
        opacity: 0.28,
      });
      const line = new THREE.Line(geo, mat);
      this.linkGroup.add(line);
      this.links.push({ line, from: r.from, to: r.to });
    }
  }

  private mountQuestion(q: Question, pos: THREE.Vector3, isCore: boolean) {
    const group = new THREE.Group();
    const radius = isCore ? 4.2 : 2.4 + (q.answerCount ? Math.min(1.6, q.answerCount / 4000) : 0);

    // core question = warm gold star; others = cool blue-violet orbs
    const color = isCore ? colorGold.clone() : new THREE.Color(q.kind === "temporal" ? VI : CY);
    const geo = new THREE.SphereGeometry(radius, 32, 24);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color.clone().multiplyScalar(isCore ? 0.9 : 0.5),
      emissiveIntensity: isCore ? 1.3 : 0.8,
      metalness: 0.3,
      roughness: 0.4,
    });
    const core = new THREE.Mesh(geo, mat);
    core.userData.qid = q.id;
    group.add(core);

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: qGlowTexture(),
        color: isCore ? colorGoldBright : color,
        transparent: true,
        opacity: isCore ? 0.7 : 0.45,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    glow.scale.setScalar(radius * (isCore ? 5 : 4));
    group.add(glow);

    // label
    const label = makeLabel(q.title, {
      color: isCore ? "#f6e3c3" : "#f2ede1",
      font: isCore ? "600 48px" : "600 38px",
      maxWidth: 520,
    });
    label.scale.multiplyScalar(isCore ? 3 : 2.3);
    // Position from the sprite's actual rendered height. Titles can wrap to
    // several lines, so a fixed center offset lets them overlap nearby copy.
    label.position.set(0, radius + (isCore ? 1.2 : 0.8) + label.scale.y / 2, 0);
    group.add(label);

    // count sub-label for non-core
    if (!isCore && typeof q.answerCount === "number") {
      const sub = makeLabel(`${q.answerCount.toLocaleString("zh-CN")} 回答`, {
        color: "#a9bdc8",
        font: "500 30px",
        maxWidth: 300,
      });
      sub.scale.multiplyScalar(1.6);
      // Keep the count on the opposite side of the planet. This guarantees a
      // clear gap even when the question title wraps to two or three lines.
      sub.position.set(0, -radius - 0.45 - sub.scale.y / 2, 0);
      group.add(sub);
    }

    group.position.copy(pos);
    this.scene.add(group);
    const node: QNode = { q, group, core, glow, home: pos.clone() };
    this.qnodes.push(node);
    this.byId.set(q.id, node);
  }

  private bindEvents() {
    const el = this.renderer.domElement;
    el.style.touchAction = "none";
    el.addEventListener("pointerdown", this.onDown);
    el.addEventListener("pointermove", this.onMove);
    el.addEventListener("pointerup", this.onUp);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.mount);
  }

  private setPointer(ev: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private pick(): QNode | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(
      this.qnodes.map((n) => n.core),
      false,
    );
    if (!hits.length) return null;
    return this.byId.get(hits[0].object.userData.qid as string) ?? null;
  }

  private onDown = (ev: PointerEvent) => {
    this.downXY = { x: ev.clientX, y: ev.clientY };
  };

  private onMove = (ev: PointerEvent) => {
    this.setPointer(ev);
    if (this.diving) return;
    const hovered = this.pick();
    const id = hovered?.q.id ?? null;
    if (id !== this.hoverId) {
      this.hoverId = id;
      this.renderer.domElement.style.cursor = id ? "pointer" : "default";
    }
  };

  private onUp = (ev: PointerEvent) => {
    if (!this.downXY) return;
    const moved = Math.hypot(ev.clientX - this.downXY.x, ev.clientY - this.downXY.y);
    this.downXY = null;
    if (moved > 6 || this.diving) return; // it was an orbit drag, not a tap
    this.setPointer(ev);
    const node = this.pick();
    if (node) this.diveInto(node);
  };

  /** Fly the camera *into* the tapped question, then hand off to opinion space. */
  private diveInto(node: QNode) {
    this.diving = true;
    this.controls.enabled = false;
    if (this.reduced) {
      // no animation: hand off immediately
      this.cb.onEnter(node.q.id, node.q.title);
      return;
    }
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    // aim slightly past the node so we "pass through" it
    const dir = node.home.clone().sub(startPos).normalize();
    const endPos = node.home.clone().addScaledVector(dir, -2);
    const endTarget = node.home.clone().addScaledVector(dir, 6);
    const t0 = performance.now();
    const dur = 780;
    const ease = (x: number) => x * x * (3 - 2 * x);
    const tick = () => {
      if (this.disposed) return;
      const k = Math.min(1, (performance.now() - t0) / dur);
      const e = ease(k);
      this.camera.position.lerpVectors(startPos, endPos, e);
      this.controls.target.lerpVectors(startTarget, endTarget, e);
      // accelerate FOV a touch for a warp feel
      this.camera.fov = 54 + e * 26;
      this.camera.updateProjectionMatrix();
      this.controls.update();
      if (k < 1) requestAnimationFrame(tick);
      else this.cb.onEnter(node.q.id, node.q.title);
    };
    tick();
  }

  private animate = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.animate);
    this.timer.update();
    const t = this.timer.getElapsed();
    if (!this.reduced) {
      this.starfield.update(t);
      for (const n of this.qnodes) {
        n.core.rotation.y = t * 0.15;
        const hover = n.q.id === this.hoverId ? 1.12 : 1;
        const s = n.group.scale.x + (hover - n.group.scale.x) * 0.2;
        n.group.scale.setScalar(s);
      }
    }
    this.controls.update();
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  };

  private resize() {
    const w = this.w();
    const h = this.h();
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer?.setSize(w, h);
    this.bloomPass?.setSize(w, h);
  }

  destroy() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    const el = this.renderer.domElement;
    el.removeEventListener("pointerdown", this.onDown);
    el.removeEventListener("pointermove", this.onMove);
    el.removeEventListener("pointerup", this.onUp);
    this.ro?.disconnect();
    for (const n of this.qnodes) {
      this.scene.remove(n.group);
      n.group.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        } else if (o instanceof THREE.Sprite) {
          (o.material as THREE.SpriteMaterial).map?.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
    }
    for (const l of this.links) {
      l.line.geometry.dispose();
      (l.line.material as THREE.Material).dispose();
    }
    this.starfield.dispose();
    this.controls.dispose();
    this.composer?.dispose?.();
    this.renderer.dispose();
    el.remove();
  }
}

let _qGlow: THREE.CanvasTexture | null = null;
function qGlowTexture(): THREE.CanvasTexture {
  if (_qGlow) return _qGlow;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.3, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  _qGlow = new THREE.CanvasTexture(canvas);
  _qGlow.colorSpace = THREE.SRGBColorSpace;
  return _qGlow;
}

export { GOLD };
