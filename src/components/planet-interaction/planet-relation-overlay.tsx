"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import type { GalaxyNode } from "@/lib/cognitive-galaxy/model";
import type { OpinionGraph, RelationType } from "@/lib/opinion/types";
import styles from "./planet-relation-overlay.module.css";

type Point = { x: number; y: number };
type Line = { key: string; a: Point; b: Point; type: RelationType; label: string };

function dash(type: RelationType) {
  if (type === "cond") return "7 5";
  if (type === "oppose" || type === "refute") return "2 5";
  return undefined;
}

/** Draw persistent semantic bridges in screen space above the galaxy SVG. */
export function PlanetRelationOverlay({ graph, nodes, enabled, clusterId }: {
  graph: OpinionGraph;
  nodes: readonly GalaxyNode[];
  enabled: boolean;
  clusterId: string;
}) {
  const { t } = useTranslation("galaxy");
  const [lines, setLines] = useState<Line[]>([]);
  const ids = useMemo(() => new Set(nodes.map((node) => node.opinion.id)), [nodes]);
  const relationKey = graph.relations.map((relation) => `${relation.from}:${relation.to}:${relation.type}`).join("|");
  const nodeKey = nodes.map((node) => `${node.opinion.id}:${node.x}:${node.y}`).join("|");

  useEffect(() => {
    if (!enabled) return;
    const root = document.querySelector<HTMLElement>('[data-el="galaxy-exploration"]');
    const stage = root?.querySelector<HTMLElement>('[data-level="cluster"]');
    const map = stage?.querySelector<SVGSVGElement>("svg");
    if (!root || !stage || !map) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const stageRect = stage.getBoundingClientRect();
        const pointById = new Map<string, Point>();
        for (const element of root.querySelectorAll<SVGGElement>('[data-el="opinion-planet"]')) {
          if (element.getAttribute("aria-hidden") === "true") continue;
          const id = element.dataset.opinionId;
          if (!id) continue;
          const rect = element.getBoundingClientRect();
          pointById.set(id, {
            x: rect.left + rect.width / 2 - stageRect.left,
            y: rect.top + rect.height / 2 - stageRect.top,
          });
        }
        setLines(graph.relations.flatMap((relation, index) => {
          if (!ids.has(relation.from) || !ids.has(relation.to)) return [];
          const a = pointById.get(relation.from);
          const b = pointById.get(relation.to);
          if (!a || !b) return [];
          return [{
            key: `${relation.from}-${relation.to}-${index}`,
            a,
            b,
            type: relation.type,
            label: t(`interaction.relations.${relation.type}`),
          }];
        }));
      });
    };
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(stage);
    const mutation = new MutationObserver(measure);
    mutation.observe(map, { attributes: true, subtree: true, attributeFilter: ["viewBox", "transform"] });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutation.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [enabled, graph.relations, ids, nodeKey, relationKey, t]);

  if (!enabled || !lines.length) return null;
  return <svg className={styles.overlay} aria-hidden="true" style={{ "--relation-color": `var(--cg-${clusterId})` } as CSSProperties}>
    {lines.map((line) => {
      const mx = (line.a.x + line.b.x) / 2;
      const my = (line.a.y + line.b.y) / 2;
      const distance = Math.hypot(line.a.x - line.b.x, line.a.y - line.b.y);
      const bend = Math.min(34, Math.max(12, distance * .12));
      const path = `M ${line.a.x} ${line.a.y} Q ${mx} ${my - bend} ${line.b.x} ${line.b.y}`;
      return <g key={line.key} className={styles.bridge} data-type={line.type}>
        <path d={path} strokeDasharray={dash(line.type)} />
        <circle cx={mx} cy={my - bend / 2} r="2.2" />
        <text x={mx} y={my - bend / 2 - 7}>{line.label}</text>
      </g>;
    })}
  </svg>;
}
