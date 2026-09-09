import * as THREE from "three";
import type { OpinionKind, RelationType, Stance } from "@/lib/opinion/types";

/**
 * Single source of truth for the 3D scene's colors, mirroring the semantic
 * tokens in cosmos.css so the WebGL universe and the 2D chrome stay in visual
 * lockstep. Semantic meaning is preserved: cyan = human opinion, violet = AI,
 * gold = selection/focus, and each relation type keeps its established hue.
 */

// ── base tokens (match cosmos.css :root) ────────────────────────────────────
export const CY = "#1bc2c2"; // 真人观点 / support relation
export const BL = "#3a6bff"; // add relation
export const VI = "#7a4dff"; // AI 观点 / oppose relation
export const OR = "#ff7a3c"; // refute relation
export const GOLD = "#e6cfa0";
export const GOLD_BRIGHT = "#f6e3c3";
export const GOLD_DEEP = "#c8a86f";
export const INK = "#0b0f1a";
export const INK_DEEP = "#05070f";
export const COND_WHITE = "#e8ecf2"; // conditional relation (neutral白)

export const colorCy = new THREE.Color(CY);
export const colorVi = new THREE.Color(VI);
export const colorGold = new THREE.Color(GOLD);
export const colorGoldBright = new THREE.Color(GOLD_BRIGHT);
export const colorInk = new THREE.Color(INK);
export const colorInkDeep = new THREE.Color(INK_DEEP);

/** Node core color by provenance — the human/AI distinction is load-bearing. */
export function nodeColor(kind: OpinionKind): THREE.Color {
  return kind === "ai" ? colorVi.clone() : colorCy.clone();
}

/** Relation line color by type, matching the CSS legend exactly. */
export function relationColor(type: RelationType): THREE.Color {
  switch (type) {
    case "support":
      return new THREE.Color(CY);
    case "refute":
      return new THREE.Color(OR);
    case "add":
      return new THREE.Color(BL);
    case "cond":
      return new THREE.Color(COND_WHITE);
    case "oppose":
      return new THREE.Color(VI);
    default:
      return new THREE.Color(GOLD);
  }
}

/** Whether a relation should render as a dashed line (refute / oppose). */
export function relationDashed(type: RelationType): boolean {
  return type === "refute" || type === "oppose";
}

/** Stance ring color — agree=cyan, disagree=orange, neutral=white. */
export function stanceColor(stance: Stance): THREE.Color {
  if (stance === "agree") return new THREE.Color(CY);
  if (stance === "disagree") return new THREE.Color(OR);
  return new THREE.Color(COND_WHITE);
}
