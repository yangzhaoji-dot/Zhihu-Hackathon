import type { Opinion, Relation, Stance } from "@/lib/opinion/types";
import { bounce, isColliding, nodeSize, nodeWeight, sparkCount } from "@/lib/opinion/physics";

export interface EngineNode extends Opinion {
  cx: number;
  cy: number;
  vx: number;
  vy: number;
  locked: boolean;
  stance?: Stance;
}

export interface EngineCallbacks {
  onTap: (node: EngineNode) => void;
  onLongPress: (node: EngineNode) => void;
  onCollision: (a: EngineNode, b: EngineNode, mx: number, my: number) => void;
}

const TRAIL_CYAN = "#1bc2c2";
const TRAIL_VIOLET = "#7a4dff";

/**
 * Imperative renderer + physics for the opinion cosmos. React owns high-level
 * state; this engine owns the 60fps drag / collision / particle loop and direct
 * DOM writes so interactions stay smooth on mobile.
 */
export class CosmosEngine {
  private canvas: HTMLElement;
  private root: HTMLElement;
  private cb: EngineCallbacks;
  nodes: EngineNode[] = [];
  private relations: Relation[] = [];
  private els = new Map<string, HTMLButtonElement>();
  private linkEls: HTMLElement[] = [];
  scale = 1;
  pan = { x: 0, y: 0 };
  private drag: {
    node: EngineNode;
    startX: number;
    startY: number;
    ox: number;
    oy: number;
    lx: number;
    ly: number;
    pointerId: number;
    moved: boolean;
  } | null = null;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private lastCollisionAt = 0;
  selectedId: string | null = null;

  constructor(canvas: HTMLElement, root: HTMLElement, cb: EngineCallbacks) {
    this.canvas = canvas;
    this.root = root;
    this.cb = cb;
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
  }

  destroy() {
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    if (this.longPressTimer) clearTimeout(this.longPressTimer);
  }

  // ── setup / render ────────────────────────────────────────────────────
  setData(opinions: Opinion[], relations: Relation[], stances: Record<string, Stance>) {
    this.relations = relations;
    this.nodes = opinions.map((o) => ({
      ...o,
      cx: 0,
      cy: 0,
      vx: 0,
      vy: 0,
      locked: false,
      stance: stances[o.id],
    }));
    this.render();
    this.layout();
  }

  private w() {
    return this.canvas.clientWidth || window.innerWidth;
  }
  private h() {
    return this.canvas.clientHeight || window.innerHeight;
  }

  private render() {
    this.canvas.innerHTML = "";
    this.els.clear();
    this.linkEls = [];
    // links first (behind nodes)
    for (const r of this.relations) {
      const e = document.createElement("div");
      e.className = `link ${r.type}`;
      e.dataset.a = r.from;
      e.dataset.b = r.to;
      this.canvas.appendChild(e);
      this.linkEls.push(e);
    }
    // nodes
    for (const n of this.nodes) this.mountNode(n);
  }

  private mountNode(n: EngineNode) {
    const b = document.createElement("button");
    b.className = this.nodeClass(n);
    b.style.width = b.style.height = `${nodeSize(n.support)}px`;
    b.dataset.id = n.id;
    const label = document.createElement("span");
    label.className = "label";
    label.textContent = n.title;
    b.appendChild(label);
    if (n.kind === "ai") {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = "AI";
      b.appendChild(tag);
    }
    b.addEventListener("pointerdown", (ev) => this.onPointerDown(ev, n));
    this.canvas.appendChild(b);
    this.els.set(n.id, b);
    this.decorateStance(n);
  }

  private nodeClass(n: EngineNode) {
    return [
      "node",
      n.kind === "ai" ? "ai" : "",
      n.nodeType ?? "opinion",
      n.stance ?? "",
      n.id === this.selectedId ? "selected" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  private decorateStance(n: EngineNode) {
    const el = this.els.get(n.id);
    if (!el) return;
    el.className = this.nodeClass(n);
    let mark = el.querySelector<HTMLElement>(".stance-mark");
    if (n.stance) {
      if (!mark) {
        mark = document.createElement("span");
        mark.className = "stance-mark";
        el.appendChild(mark);
      }
      mark.textContent = n.stance === "agree" ? "✓" : n.stance === "disagree" ? "✕" : "○";
    } else if (mark) {
      mark.remove();
    }
  }

  setStance(id: string, stance: Stance) {
    const n = this.nodes.find((x) => x.id === id);
    if (!n) return;
    n.stance = stance;
    this.decorateStance(n);
  }

  // ── layout / draw ─────────────────────────────────────────────────────
  layout() {
    const w = this.w();
    const h = this.h();
    for (const n of this.nodes) {
      if (!n.locked) {
        n.cx = n.x * w;
        n.cy = n.y * h;
      }
    }
    this.draw();
  }

  draw() {
    for (const n of this.nodes) {
      const el = this.els.get(n.id);
      if (!el) continue;
      const r = nodeSize(n.support) / 2;
      el.style.transform = `translate(${n.cx - r + this.pan.x}px, ${n.cy - r + this.pan.y}px) scale(${this.scale})`;
    }
    for (const e of this.linkEls) {
      const a = this.nodes.find((n) => n.id === e.dataset.a);
      const b = this.nodes.find((n) => n.id === e.dataset.b);
      if (a && b) {
        this.placeLine(
          e,
          a.cx + this.pan.x,
          a.cy + this.pan.y,
          b.cx + this.pan.x,
          b.cy + this.pan.y,
        );
      }
    }
  }

  private placeLine(e: HTMLElement, x1: number, y1: number, x2: number, y2: number) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    e.style.left = `${x1}px`;
    e.style.top = `${y1}px`;
    e.style.width = `${Math.hypot(dx, dy)}px`;
    e.style.transform = `rotate(${Math.atan2(dy, dx)}rad) scale(${this.scale})`;
    e.style.transformOrigin = "left center";
  }

  zoom(factor: number) {
    this.scale = Math.min(1.8, Math.max(0.5, this.scale * factor));
    this.draw();
  }

  // ── drag ──────────────────────────────────────────────────────────────
  private onPointerDown(ev: PointerEvent, n: EngineNode) {
    ev.stopPropagation();
    this.selectedId = n.id;
    this.els.forEach((el) => el.classList.remove("selected"));
    this.els.get(n.id)?.classList.add("selected");
    this.drag = {
      node: n,
      startX: ev.clientX,
      startY: ev.clientY,
      ox: n.cx,
      oy: n.cy,
      lx: ev.clientX,
      ly: ev.clientY,
      pointerId: ev.pointerId,
      moved: false,
    };
    try {
      (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    } catch {
      /* ignore */
    }
    // long-press → source trace
    if (this.longPressTimer) clearTimeout(this.longPressTimer);
    this.longPressTimer = setTimeout(() => {
      if (this.drag && !this.drag.moved) {
        this.cb.onLongPress(n);
        this.drag = null;
      }
    }, 480);
  }

  private onPointerMove(ev: PointerEvent) {
    if (!this.drag) return;
    const d = this.drag;
    const dist = Math.hypot(ev.clientX - d.startX, ev.clientY - d.startY);
    if (dist > 5) d.moved = true;
    // heavier nodes accelerate a little slower — the "weight" of support
    const weight = nodeWeight(d.node.support);
    d.node.cx = d.ox + (ev.clientX - d.startX) / weight;
    d.node.cy = d.oy + (ev.clientY - d.startY) / weight;
    d.node.locked = true;
    d.node.vx = ev.clientX - d.lx;
    d.node.vy = ev.clientY - d.ly;
    d.lx = ev.clientX;
    d.ly = ev.clientY;
    if (d.moved) {
      this.trail(ev.clientX, ev.clientY, d.node.kind === "ai" ? TRAIL_VIOLET : TRAIL_CYAN);
    }
    this.draw();
  }

  private onPointerUp() {
    if (this.longPressTimer) clearTimeout(this.longPressTimer);
    const drag = this.drag;
    if (drag && !drag.moved) {
      this.cb.onTap(drag.node);
    } else if (drag?.moved) {
      // Let nodes overlap during dragging; release confirms the final collision.
      this.checkCollision(drag.node);
    }
    this.drag = null;
  }

  // ── collision / particles ─────────────────────────────────────────────
  private checkCollision(a: EngineNode) {
    for (const b of this.nodes) {
      if (a === b) continue;
      if (
        isColliding(
          a as EngineNode & { x: number; y: number },
          b as EngineNode & { x: number; y: number },
        )
      ) {
        this.collide(a, b);
        break;
      }
    }
  }

  private collide(a: EngineNode, b: EngineNode) {
    const now = Date.now();
    if (now - this.lastCollisionAt < 900) return;
    this.lastCollisionAt = now;
    const mx = (a.cx + b.cx) / 2;
    const my = (a.cy + b.cy) / 2;
    // momentum-conserving bounce — neither node disappears
    const push = bounce({ x: a.cx, y: a.cy }, { x: b.cx, y: b.cy });
    a.cx += push.a.x;
    a.cy += push.a.y;
    b.cx += push.b.x;
    b.cy += push.b.y;
    a.locked = b.locked = true;
    // screen shake
    this.root.classList.add("shake");
    setTimeout(() => this.root.classList.remove("shake"), 280);
    // particles scaled by combined support
    const count = sparkCount(a.support, b.support);
    for (let i = 0; i < count; i++) this.spark(mx, my, a.support + b.support);
    this.draw();
    this.cb.onCollision(a, b, mx, my);
  }

  private trail(x: number, y: number, color: string) {
    const p = document.createElement("i");
    p.className = "trail";
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.background = color;
    this.canvas.appendChild(p);
    setTimeout(() => p.remove(), 560);
  }

  private spark(x: number, y: number, intensity: number) {
    const p = document.createElement("i");
    p.className = "particle";
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.setProperty("--dx", `${Math.random() * 150 - 75}px`);
    p.style.setProperty("--dy", `${Math.random() * 150 - 75}px`);
    // brighter for higher combined support
    if (intensity > 150) p.style.background = "#ffd27a";
    this.canvas.appendChild(p);
    setTimeout(() => p.remove(), 700);
  }

  // ── fusion (snake-like winding) ───────────────────────────────────────
  fuse(aId: string, bId: string, candidate: Opinion): Promise<void> {
    return new Promise((resolve) => {
      const a = this.nodes.find((n) => n.id === aId);
      const b = this.nodes.find((n) => n.id === bId);
      if (!a || !b) return resolve();
      const tx = (a.cx + b.cx) / 2;
      const ty = (a.cy + b.cy) / 2;
      // add the candidate node + links now (so it exists to wind toward)
      const node: EngineNode = {
        ...candidate,
        cx: tx,
        cy: ty,
        vx: 0,
        vy: 0,
        locked: true,
      };
      this.nodes.push(node);
      for (const parent of [aId, bId]) {
        const e = document.createElement("div");
        e.className = "link add";
        e.dataset.a = parent;
        e.dataset.b = node.id;
        this.canvas.insertBefore(e, this.canvas.firstChild);
        this.linkEls.push(e);
      }
      this.mountNode(node);
      const el = this.els.get(node.id);
      if (el) el.style.opacity = "0";
      const oax = a.cx;
      const oay = a.cy;
      const obx = b.cx;
      const oby = b.cy;
      let step = 0;
      const total = 34;
      const timer = setInterval(() => {
        step++;
        const k = step / total;
        const spin = Math.sin(k * Math.PI * 6) * 18;
        a.cx = oax + (tx - oax) * k + spin;
        a.cy = oay + (ty - oay) * k;
        b.cx = obx + (tx - obx) * k - spin;
        b.cy = oby + (ty - oby) * k;
        if (el) el.style.opacity = `${k}`;
        this.draw();
        if (step >= total) {
          clearInterval(timer);
          // parents settle back near their origins, candidate stays
          a.cx = oax;
          a.cy = oay;
          b.cx = obx;
          b.cy = oby;
          if (el) el.style.opacity = "1";
          this.draw();
          resolve();
        }
      }, 16);
    });
  }

  // ── search locate ─────────────────────────────────────────────────────
  locate(id: string) {
    const n = this.nodes.find((x) => x.id === id);
    if (!n) return;
    this.selectedId = id;
    this.scale = Math.max(this.scale, 1.35);
    this.pan.x = this.w() / 2 - n.cx;
    this.pan.y = this.h() / 2 - n.cy;
    this.root.classList.add("planet-focus");
    this.els.forEach((el) => el.classList.remove("selected"));
    const el = this.els.get(id);
    if (el) el.classList.add("selected");
    // dim the rest briefly to spotlight the match
    this.els.forEach((e, key) => {
      if (key !== id) e.classList.add("dim");
    });
    this.linkEls.forEach((e) => e.classList.add("dim"));
    setTimeout(() => {
      this.els.forEach((e) => e.classList.remove("dim"));
      this.linkEls.forEach((e) => e.classList.remove("dim"));
    }, 1600);
  }

  launchTo(id: string) {
    const node = this.nodes.find((item) => item.id === id);
    if (!node) return Promise.resolve();
    const rocket = document.createElement("i");
    rocket.className = "launch-rocket";
    rocket.style.left = `${this.w() / 2}px`;
    rocket.style.top = `${this.h() - 70}px`;
    this.canvas.appendChild(rocket);
    const dx = node.cx - this.w() / 2;
    const dy = node.cy - (this.h() - 70);
    const animation = rocket.animate([
      { transform: "translate(-50%, -50%) scale(0.45)", opacity: 0 },
      { transform: "translate(-50%, -50%) scale(1)", opacity: 1, offset: 0.12 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.22)`, opacity: 0.25 },
    ], { duration: 900, easing: "cubic-bezier(.2,.7,.2,1)" });
    return animation.finished.catch(() => undefined).then(() => rocket.remove());
  }

  enterSurface(id: string) {
    this.locate(id);
    this.root.classList.add("planet-surface");
  }

  resetFocus() {
    this.selectedId = null;
    this.scale = 1;
    this.pan = { x: 0, y: 0 };
    this.els.forEach((el) => el.classList.remove("selected", "dim"));
    this.linkEls.forEach((el) => el.classList.remove("dim"));
    this.root.classList.remove("planet-focus");
    this.root.classList.remove("planet-surface");
    this.draw();
  }

  getNode(id: string) {
    return this.nodes.find((n) => n.id === id) ?? null;
  }
}
