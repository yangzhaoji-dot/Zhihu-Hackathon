"use client";

import { motion } from "framer-motion";
import type { GalaxyNode } from "@/lib/cognitive-galaxy/model";
import type { PlanetCollision } from "./types";

export function CollisionBurst({
  collision,
  reducedMotion,
}: {
  collision: PlanetCollision;
  reducedMotion: boolean;
}) {
  const duration = reducedMotion ? .01 : .75;
  return <motion.g key={collision.key} aria-hidden="true">
    <motion.circle
      cx={collision.center.x}
      cy={collision.center.y}
      r="18"
      fill="none"
      stroke="var(--cg-accent)"
      strokeWidth="3"
      initial={{ opacity: .95, scale: .2 }}
      animate={{ opacity: 0, scale: 4.4 }}
      transition={{ duration, ease: "easeOut" }}
      style={{ transformOrigin: `${collision.center.x}px ${collision.center.y}px` }}
    />
    <motion.circle
      cx={collision.center.x}
      cy={collision.center.y}
      r="9"
      fill="var(--cg-accent)"
      initial={{ opacity: .9, scale: .1 }}
      animate={{ opacity: 0, scale: 3 }}
      transition={{ duration: duration * .72, ease: "easeOut" }}
      style={{ transformOrigin: `${collision.center.x}px ${collision.center.y}px` }}
    />
    {Array.from({ length: 16 }, (_, index) => {
      const angle = index * Math.PI / 8;
      const distance = 34 + index % 3 * 11;
      return <motion.circle
        key={index}
        r={index % 3 === 0 ? 2.2 : 1.35}
        fill={index % 2 ? "var(--cg-growth)" : "var(--cg-accent)"}
        initial={{ cx: collision.center.x, cy: collision.center.y, opacity: 1 }}
        animate={{
          cx: collision.center.x + Math.cos(angle) * distance,
          cy: collision.center.y + Math.sin(angle) * distance,
          opacity: 0,
        }}
        transition={{ duration, delay: index * .012, ease: "easeOut" }}
      />;
    })}
  </motion.g>;
}

export function FusionBirthEffect({
  candidate,
  parents,
  color,
  reducedMotion,
}: {
  candidate: GalaxyNode;
  parents: readonly GalaxyNode[];
  color: string;
  reducedMotion: boolean;
}) {
  const duration = reducedMotion ? .01 : 1.25;
  return <g aria-hidden="true">
    {parents.map((parent) => <motion.path
      key={parent.opinion.id}
      d={`M${parent.x} ${parent.y} Q${(parent.x + candidate.x) / 2} ${(parent.y + candidate.y) / 2 - 20} ${candidate.x} ${candidate.y}`}
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeDasharray="3 5"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: [.1, .9, .5] }}
      transition={{ duration, ease: [.22, 1, .36, 1] }}
    />)}
    <motion.circle
      cx={candidate.x}
      cy={candidate.y}
      r={candidate.radius + 7}
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      initial={{ scale: .05, opacity: 1 }}
      animate={{ scale: [1, 2.2, 1.55], opacity: [1, 0, .3] }}
      transition={{ duration }}
      style={{ transformOrigin: `${candidate.x}px ${candidate.y}px` }}
    />
    <motion.g
      initial={{ rotate: 0, opacity: 0 }}
      animate={{ rotate: 360, opacity: 1 }}
      transition={{ rotate: { duration: 5, repeat: Infinity, ease: "linear" }, opacity: { duration: .4 } }}
      style={{ transformOrigin: `${candidate.x}px ${candidate.y}px` }}
    >
      {Array.from({ length: 10 }, (_, index) => {
        const angle = index * Math.PI / 5;
        const distance = candidate.radius + 11 + index % 2 * 7;
        return <circle
          key={index}
          cx={candidate.x + Math.cos(angle) * distance}
          cy={candidate.y + Math.sin(angle) * distance}
          r={index % 3 === 0 ? 1.8 : .9}
          fill={index % 2 ? color : "var(--cg-accent)"}
          opacity={.55 + index % 3 * .16}
        />;
      })}
    </motion.g>
  </g>;
}
