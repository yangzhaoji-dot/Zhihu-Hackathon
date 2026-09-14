"use client";

import { useTranslation } from "react-i18next";
import type { GalaxyNode } from "@/lib/cognitive-galaxy/model";
import type { PlanetMotion } from "./types";

export function GravityGuide({ motion, target }: {
  motion: PlanetMotion;
  target: GalaxyNode;
}) {
  const { t } = useTranslation("galaxy");
  const centerX = (motion.x + target.x) / 2;
  const centerY = (motion.y + target.y) / 2;

  return <g aria-hidden="true" pointerEvents="none">
    <line x1={motion.x} y1={motion.y} x2={target.x} y2={target.y} stroke="var(--cg-accent)" strokeOpacity={motion.collisionReady ? .9 : .45} strokeWidth={motion.collisionReady ? 1.15 : .6} strokeDasharray={motion.collisionReady ? undefined : "3 5"} />
    <circle cx={target.x} cy={target.y} r={target.radius + 15} fill="none" stroke="var(--cg-accent)" strokeOpacity={motion.collisionReady ? .82 : .34} strokeWidth=".8" strokeDasharray="2 4" />
    <text x={centerX} y={centerY - 10} textAnchor="middle" fill={motion.collisionReady ? "var(--cg-accent)" : "var(--cg-muted)"} fontSize="6" paintOrder="stroke" stroke="color-mix(in srgb, var(--cg-bg-deep) 92%, transparent)" strokeWidth="2">
      {t(motion.collisionReady ? "interaction.collisionRelease" : "interaction.gravityContinue")}
    </text>
  </g>;
}
