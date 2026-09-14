"use client";

import type { KeyboardEvent, PointerEvent } from "react";
import { motion } from "framer-motion";
import type { GalaxyNode } from "@/lib/cognitive-galaxy/model";
import { hash } from "@/lib/cognitive-galaxy/model";
import type { PlanetCollision, PlanetMotion } from "./types";
import styles from "./opinion-planet.module.css";

function titleLines(value: string, max = 12): string[] {
  const chars = Array.from(value);
  return [
    chars.slice(0, max).join(""),
    chars.slice(max, max * 2).join("") + (chars.length > max * 2 ? "…" : ""),
  ].filter(Boolean);
}

function keyActivate(event: KeyboardEvent<SVGGElement>, action: () => void) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  action();
}

export function OpinionPlanet({
  node,
  clusterId,
  gradientPrefix,
  active,
  interactive,
  selected,
  dimmed,
  hovered,
  dragged,
  target,
  showTitle,
  reducedMotion,
  motionState,
  impact,
  fusionOrigin,
  onPointerDown,
  onSelect,
  onHover,
}: {
  node: GalaxyNode;
  clusterId: string;
  gradientPrefix: string;
  active: boolean;
  interactive: boolean;
  selected: boolean;
  dimmed: boolean;
  hovered: boolean;
  dragged: boolean;
  target: boolean;
  showTitle: boolean;
  reducedMotion: boolean;
  motionState: PlanetMotion | null;
  impact: PlanetCollision | null;
  fusionOrigin?: { x: number; y: number };
  onPointerDown: (event: PointerEvent<SVGGElement>, node: GalaxyNode) => void;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const radius = node.radius;
  const visual = hash(`visual-${node.opinion.id}`) % 5;
  const position = dragged && motionState ? motionState : node;
  const color = `var(--cg-${clusterId})`;
  const impacted = Boolean(
    impact && (impact.aId === node.opinion.id || impact.bId === node.opinion.id),
  );
  const displayPosition = impacted && impact
    ? {
        x: position.x + (impact.center.x - position.x) * .3,
        y: position.y + (impact.center.y - position.y) * .3,
      }
    : position;
  const fusionBirth = Boolean(fusionOrigin);
  const emphasized = selected || hovered || dragged || target || impacted || fusionBirth;
  const scale = impacted && !reducedMotion
    ? [1.12, 1.3, .92, 1.08]
    : fusionBirth && !reducedMotion
      ? [.02, 1.32, .9, 1]
      : selected ? 1.82 : target ? 1.16 : dragged ? 1.1 : hovered ? 1.08 : 1;
  const lines = titleLines(node.opinion.title);
  const longest = Math.max(...lines.map((line) => Array.from(line).length), 1);
  const labelWidth = Math.max(72, Math.min(112, longest * 7.4 + 18));
  const labelHeight = lines.length > 1 ? 31 : 22;
  const labelY = radius + 8;
  const labelVisible = showTitle || (active && !dimmed);

  return <motion.g
    initial={fusionOrigin ? { x: fusionOrigin.x, y: fusionOrigin.y } : false}
    animate={{ x: displayPosition.x, y: displayPosition.y }}
    transition={{ duration: fusionBirth && !reducedMotion ? .9 : impacted && !reducedMotion ? .2 : 0, ease: [.22, 1, .36, 1] }}
    opacity={dimmed ? .13 : 1}
  >
    <motion.g
      animate={{
        scale,
        rotate: impacted && !reducedMotion ? [0, -4, 5, -3, 0] : 0,
      }}
      style={{ transformOrigin: "0px 0px" }}
      transition={{ duration: reducedMotion || dragged ? 0 : impacted ? .48 : fusionBirth ? .9 : .4, ease: [.22, 1, .36, 1] }}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : -1}
      data-clickable={interactive ? "true" : undefined}
      data-el="opinion-planet"
      data-opinion-id={node.opinion.id}
      data-dragging={dragged ? "true" : undefined}
      data-impact={impacted ? "true" : undefined}
      data-fusion-birth={fusionBirth ? "true" : undefined}
      data-gravity-target={target ? (motionState?.collisionReady ? "collision" : "near") : undefined}
      aria-label={active ? node.opinion.title : undefined}
      aria-hidden={!active}
      onPointerDown={(event) => interactive && onPointerDown(event, node)}
      onClick={() => active && onSelect(node.opinion.id)}
      onKeyDown={(event) => active && keyActivate(event, () => onSelect(node.opinion.id))}
      onMouseEnter={() => active && onHover(node.opinion.id)}
      onMouseLeave={() => !motionState && onHover(null)}
      className={styles.planetTarget}
    >
      <circle r={radius + 12} fill="transparent" />
      <circle r={radius + (impacted || fusionBirth ? 14 : 8)} fill={color} opacity={impacted ? .48 : fusionBirth ? .38 : target ? .25 : dragged ? .18 : selected || hovered ? .16 : .055} filter={`url(#${gradientPrefix}-soft)`} />
      {emphasized && <circle r={radius + (impacted || fusionBirth ? 11 : target ? 8 : 5)} fill="none" stroke={impacted ? "var(--cg-accent)" : color} strokeOpacity={impacted ? 1 : target ? .9 : .65} strokeWidth={impacted ? 1.6 : target ? .8 : .45} strokeDasharray={target || selected || fusionBirth ? "1.5 2.5" : undefined} />}
      <circle r={radius} fill={`url(#${gradientPrefix}-${clusterId})`} stroke={color} strokeOpacity=".62" strokeWidth=".55" filter={emphasized ? `url(#${gradientPrefix}-glow)` : undefined} />
      <ellipse cx={-radius * .2} cy={-radius * .26} rx={radius * .38} ry={radius * .18} fill="currentColor" opacity=".12" transform="rotate(-25)" />
      {visual === 0 && <><path d={`M${-radius*.72} ${-radius*.12} Q${-radius*.05} ${-radius*.62} ${radius*.85} ${radius*.08}`} fill="none" stroke="currentColor" strokeWidth=".38" opacity=".2" /><path d={`M${-radius*.55} ${radius*.42} Q0 ${radius*.08} ${radius*.62} ${radius*.35}`} fill="none" stroke={color} strokeWidth=".6" opacity=".4" /></>}
      {visual === 1 && <><ellipse rx={radius*1.55} ry={radius*.31} transform="rotate(-28)" fill="none" stroke={color} strokeOpacity=".72" strokeWidth=".55" /><ellipse rx={radius*1.18} ry={radius*.18} transform="rotate(-28)" fill="none" stroke="currentColor" strokeOpacity=".18" strokeWidth=".3" /></>}
      {visual === 2 && <><path d={`M${-radius*.9} 0 A${radius*.9} ${radius*.9} 0 0 1 ${radius*.55} ${-radius*.7}`} fill="none" stroke="currentColor" strokeWidth=".65" opacity=".34" /><path d={`M${-radius*.7} ${radius*.4} A${radius*.82} ${radius*.82} 0 0 0 ${radius*.8} ${radius*.18}`} fill="none" stroke={color} strokeWidth=".8" opacity=".65" /></>}
      {visual === 3 && <><circle cx={radius*1.52} cy={-radius*.62} r={Math.max(1.4,radius*.18)} fill={color} opacity=".8" /><path d={`M${radius*.7} ${-radius*.25} L${radius*1.37} ${-radius*.56}`} stroke={color} strokeWidth=".35" opacity=".45" /></>}
      {visual === 4 && <><ellipse rx={radius*.68} ry={radius*.92} fill="none" stroke="currentColor" strokeWidth=".38" opacity=".2" transform="rotate(34)" /><ellipse rx={radius*1.44} ry={radius*.27} fill="none" stroke={color} strokeWidth=".45" opacity=".5" transform="rotate(24)" /></>}
      {emphasized && Array.from({ length: 6 }, (_, index) => {
        const angle = index * Math.PI / 3 + .35;
        const distance = radius + 9 + (index % 2) * 3;
        return <circle key={index} cx={Math.cos(angle) * distance} cy={Math.sin(angle) * distance} r={index % 2 ? .55 : .85} fill={color} opacity={.45 + index * .05} />;
      })}
    </motion.g>
    {labelVisible && <g
      className={styles.planetLabelGroup}
      data-clickable="true"
      data-emphasized={emphasized ? "true" : "false"}
      onClick={() => onSelect(node.opinion.id)}
      onMouseEnter={() => active && onHover(node.opinion.id)}
      onMouseLeave={() => !motionState && onHover(null)}
    >
      <rect
        className={styles.planetLabelPlate}
        x={-labelWidth / 2}
        y={labelY}
        width={labelWidth}
        height={labelHeight}
        rx="5.5"
        fill="var(--cg-bg-deep)"
        stroke={color}
      />
      <text
        className={styles.planetLabel}
        y={labelY + 13}
        textAnchor="middle"
        fill="var(--cg-ink)"
        fontSize="7.4"
      >
        {lines.map((line, index) => <tspan key={index} x="0" dy={index ? 10 : 0}>{line}</tspan>)}
      </text>
    </g>}
  </motion.g>;
}
