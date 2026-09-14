"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent, RefObject } from "react";
import type { GalaxyNode } from "@/lib/cognitive-galaxy/model";
import { resolvePlanetProximity } from "./geometry";
import type {
  InteractionState,
  PlanetCollision,
  PlanetInteractionEvent,
  PlanetMotion,
} from "./types";

type ActiveDrag = {
  id: string;
  offsetX: number;
  offsetY: number;
  startClientX: number;
  startClientY: number;
  moved: boolean;
  targetId: string | null;
  collisionReady: boolean;
  x: number;
  y: number;
};

export function usePlanetDrag(input: {
  svgRef: RefObject<SVGSVGElement | null>;
  nodes: readonly GalaxyNode[];
  enabled: boolean;
  onPlanetPair?: (collision: PlanetCollision) => void;
  onInteractionStateChange?: (event: PlanetInteractionEvent) => void;
}) {
  const {
    svgRef,
    nodes,
    enabled,
    onPlanetPair,
    onInteractionStateChange,
  } = input;
  const active = useRef<ActiveDrag | null>(null);
  const suppressClick = useRef<string | null>(null);
  const stateRef = useRef<InteractionState>("idle");
  const timers = useRef<Set<number>>(new Set());
  const impactSequence = useRef(0);
  const [motion, setMotion] = useState<PlanetMotion | null>(null);
  const [impact, setImpact] = useState<PlanetCollision | null>(null);
  const [state, setState] = useState<InteractionState>("idle");

  const bodies = useMemo(
    () => nodes.map((node) => ({
      id: node.opinion.id,
      x: node.x,
      y: node.y,
      radius: node.radius,
    })),
    [nodes],
  );
  const nodeById = useMemo(
    () => new Map(nodes.map((node) => [node.opinion.id, node])),
    [nodes],
  );

  const emit = useCallback((state: InteractionState, opinionIds: readonly string[] = []) => {
    if (stateRef.current === state) return;
    stateRef.current = state;
    setState(state);
    onInteractionStateChange?.({ state, opinionIds });
  }, [onInteractionStateChange]);

  const later = useCallback((action: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      timers.current.delete(timer);
      action();
    }, delay);
    timers.current.add(timer);
  }, []);

  const reset = useCallback(() => {
    active.current = null;
    setMotion(null);
    setImpact(null);
    emit("idle");
  }, [emit]);

  useEffect(() => () => {
    for (const timer of timers.current) window.clearTimeout(timer);
    timers.current.clear();
  }, []);

  const toSvgPoint = useCallback((event: PointerEvent<Element>) => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(matrix.inverse());
  }, [svgRef]);

  const start = useCallback((event: PointerEvent<SVGGElement>, node: GalaxyNode) => {
    if (!enabled || event.button !== 0) return;
    const point = toSvgPoint(event);
    if (!point) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    active.current = {
      id: node.opinion.id,
      offsetX: point.x - node.x,
      offsetY: point.y - node.y,
      startClientX: event.clientX,
      startClientY: event.clientY,
      moved: false,
      targetId: null,
      collisionReady: false,
      x: node.x,
      y: node.y,
    };
    emit("idle");
    setMotion({ id: node.opinion.id, x: node.x, y: node.y, targetId: null, collisionReady: false });
  }, [emit, enabled, toSvgPoint]);

  const move = useCallback((event: PointerEvent<SVGSVGElement>): boolean => {
    const current = active.current;
    if (!current) return false;
    const point = toSvgPoint(event);
    const source = bodies.find((body) => body.id === current.id);
    if (!point || !source) return true;
    const x = point.x - current.offsetX;
    const y = point.y - current.offsetY;
    if (Math.hypot(event.clientX - current.startClientX, event.clientY - current.startClientY) > 5) {
      current.moved = true;
    }
    const proximity = resolvePlanetProximity(source, bodies, { x, y });
    const target = proximity.targetId
      ? bodies.find((body) => body.id === proximity.targetId)
      : undefined;
    const distance = target ? Math.hypot(x - target.x, y - target.y) : 0;
    const gravityRange = target ? source.radius + target.radius + 55 : 1;
    const closeness = Math.max(0, 1 - distance / gravityRange);
    const pull = proximity.collisionReady
      ? .28
      : proximity.state === "gravity"
        ? .06 + closeness * .16
        : 0;
    const attracted = target
      ? { x: x + (target.x - x) * pull, y: y + (target.y - y) * pull }
      : { x, y };
    current.targetId = proximity.targetId;
    current.collisionReady = proximity.collisionReady;
    current.x = attracted.x;
    current.y = attracted.y;
    setMotion({
      id: current.id,
      ...attracted,
      targetId: proximity.targetId,
      collisionReady: proximity.collisionReady,
    });
    emit(proximity.state, proximity.targetId ? [current.id, proximity.targetId] : [current.id]);
    return true;
  }, [bodies, emit, toSvgPoint]);

  const finish = useCallback((): boolean => {
    const current = active.current;
    if (!current) return false;
    if (current.moved) {
      suppressClick.current = current.id;
      later(() => {
        if (suppressClick.current === current.id) suppressClick.current = null;
      }, 120);
      if (current.targetId && current.collisionReady) {
        const target = nodeById.get(current.targetId);
        const collision: PlanetCollision = {
          key: `${current.id}:${current.targetId}:${impactSequence.current++}`,
          aId: current.id,
          bId: current.targetId,
          center: target
            ? { x: (current.x + target.x) / 2, y: (current.y + target.y) / 2 }
            : { x: current.x, y: current.y },
        };
        setImpact(collision);
        emit("collision", [current.id, current.targetId]);
        later(() => onPlanetPair?.(collision), 420);
        later(() => {
          setImpact((value) => value?.key === collision.key ? null : value);
        }, 1100);
      } else {
        emit("idle");
      }
    } else {
      emit("idle");
    }
    active.current = null;
    setMotion(null);
    return true;
  }, [emit, later, nodeById, onPlanetPair]);

  const target = motion?.targetId ? nodeById.get(motion.targetId) ?? null : null;
  return {
    state,
    motion,
    impact,
    target,
    start,
    move,
    finish,
    cancel: reset,
    reset,
    shouldSuppressClick: (id: string) => suppressClick.current === id,
  };
}
