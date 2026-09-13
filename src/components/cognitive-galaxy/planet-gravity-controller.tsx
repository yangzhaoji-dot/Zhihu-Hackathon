"use client";

import { useEffect, useRef, useState } from "react";
import type { GalaxyNode } from "@/lib/cognitive-galaxy/model";
import styles from "./planet-gravity.module.css";

type Entry = { id:string; title:string; el:SVGGElement; parent:SVGGElement };
type DragState = {
  entry: Entry;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startSvgX: number;
  startSvgY: number;
  originX: number;
  originY: number;
  originalTransform: string;
  moved: boolean;
  target: Entry | null;
  ready: boolean;
};
type Hint = { source:string; target:string | null; ready:boolean } | null;

function parseTranslate(value: string | null) {
  const match = value?.match(/translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)\s*\)/);
  return match ? { x:Number(match[1]),y:Number(match[2]) } : { x:0,y:0 };
}

function toSvgPoint(svg: SVGSVGElement, clientX:number, clientY:number) {
  const matrix = svg.getScreenCTM();
  if (!matrix) return null;
  const point = svg.createSVGPoint();
  point.x=clientX; point.y=clientY;
  return point.matrixTransform(matrix.inverse());
}

/**
 * Adds a transient physical interaction layer to the existing SVG galaxy.
 * React still owns the canonical layout; this controller only moves the outer
 * SVG group while a pointer is held, then restores it. Releasing two touching
 * planets emits a semantic collision pair to the page.
 */
export function PlanetGravityController({ nodes, enabled, onPair }: {
  nodes: readonly GalaxyNode[];
  enabled: boolean;
  onPair: (aId:string,bId:string) => void;
}) {
  const drag = useRef<DragState | null>(null);
  const [hint,setHint] = useState<Hint>(null);
  const nodeKey = nodes.map((node) => `${node.opinion.id}:${node.opinion.title}`).join("|");

  useEffect(() => {
    if (!enabled) return;
    const root = document.querySelector<HTMLElement>('[data-el="galaxy-exploration"]');
    if (!root) return;
    const byTitle = new Map(nodes.map((node) => [node.opinion.title,node.opinion.id]));
    const entries: Entry[] = [...root.querySelectorAll<SVGGElement>('[data-el="opinion-planet"]')]
      .filter((el) => el.getAttribute("aria-hidden") !== "true")
      .map((el) => {
        const title=el.getAttribute("aria-label") ?? "";
        const id=byTitle.get(title);
        const parent=el.parentElement as SVGGElement | null;
        return id && parent ? { id,title,el,parent } : null;
      })
      .filter((entry): entry is Entry => Boolean(entry));

    const clearTargets = () => {
      for (const entry of entries) {
        delete entry.el.dataset.gravityTarget;
        delete entry.el.dataset.gravityDragging;
      }
    };

    const onDown = (event: globalThis.PointerEvent) => {
      if (event.button !== 0 || drag.current) return;
      const source = entries.find((entry) => entry.el === event.currentTarget);
      if (!source) return;
      const svg=source.el.ownerSVGElement;
      if (!svg) return;
      const point=toSvgPoint(svg,event.clientX,event.clientY);
      if (!point) return;
      const originalTransform=source.parent.getAttribute("transform") ?? "";
      const origin=parseTranslate(originalTransform);
      drag.current={
        entry:source,pointerId:event.pointerId,
        startClientX:event.clientX,startClientY:event.clientY,
        startSvgX:point.x,startSvgY:point.y,
        originX:origin.x,originY:origin.y,originalTransform,
        moved:false,target:null,ready:false,
      };
      source.el.dataset.gravityDragging="true";
      source.el.setPointerCapture?.(event.pointerId);
      setHint({source:source.title,target:null,ready:false});
    };

    const onMove = (event: globalThis.PointerEvent) => {
      const current=drag.current;
      if (!current || event.pointerId !== current.pointerId) return;
      const svg=current.entry.el.ownerSVGElement;
      if (!svg) return;
      const point=toSvgPoint(svg,event.clientX,event.clientY);
      if (!point) return;
      if (Math.hypot(event.clientX-current.startClientX,event.clientY-current.startClientY)>5) current.moved=true;
      const x=current.originX+(point.x-current.startSvgX),y=current.originY+(point.y-current.startSvgY);
      current.entry.parent.setAttribute("transform",`translate(${x} ${y})`);

      const sourceRect=current.entry.el.getBoundingClientRect();
      const sx=sourceRect.left+sourceRect.width/2,sy=sourceRect.top+sourceRect.height/2;
      let nearest:Entry | null=null,nearestDistance=Infinity,ready=false;
      for (const candidate of entries) {
        if (candidate.id===current.entry.id) continue;
        const rect=candidate.el.getBoundingClientRect();
        const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
        const distance=Math.hypot(sx-cx,sy-cy);
        if (distance<nearestDistance) { nearest=candidate; nearestDistance=distance; }
      }
      const targetRect=nearest?.el.getBoundingClientRect();
      const gravityLimit=targetRect ? Math.max(86,(sourceRect.width+targetRect.width)*1.15) : 0;
      if (!nearest || nearestDistance>gravityLimit) nearest=null;
      if (nearest) {
        const rect=nearest.el.getBoundingClientRect();
        ready=nearestDistance <= Math.max(34,(sourceRect.width+rect.width)*.48);
      }
      if (current.target?.id!==nearest?.id) clearTargets();
      current.entry.el.dataset.gravityDragging="true";
      if (nearest) nearest.el.dataset.gravityTarget=ready ? "collision" : "near";
      current.target=nearest; current.ready=ready;
      setHint({source:current.entry.title,target:nearest?.title ?? null,ready});
    };

    const finish = (event: globalThis.PointerEvent, cancelled=false) => {
      const current=drag.current;
      if (!current || event.pointerId!==current.pointerId) return;
      current.entry.parent.setAttribute("transform",current.originalTransform);
      clearTargets();
      if (current.moved) {
        const blockClick=(click:Event) => { click.preventDefault(); click.stopPropagation(); };
        current.entry.el.addEventListener("click",blockClick,{capture:true,once:true});
      }
      const pair=!cancelled && current.moved && current.ready && current.target
        ? [current.entry.id,current.target.id] as const : null;
      drag.current=null; setHint(null);
      if (pair) onPair(pair[0],pair[1]);
    };

    for (const entry of entries) entry.el.addEventListener("pointerdown",onDown);
    const move=(event:globalThis.PointerEvent)=>onMove(event);
    const up=(event:globalThis.PointerEvent)=>finish(event,false);
    const cancel=(event:globalThis.PointerEvent)=>finish(event,true);
    window.addEventListener("pointermove",move,{capture:true});
    window.addEventListener("pointerup",up,{capture:true});
    window.addEventListener("pointercancel",cancel,{capture:true});
    return () => {
      const current=drag.current;
      if (current) current.entry.parent.setAttribute("transform",current.originalTransform);
      drag.current=null; clearTargets();
      for (const entry of entries) entry.el.removeEventListener("pointerdown",onDown);
      window.removeEventListener("pointermove",move,{capture:true});
      window.removeEventListener("pointerup",up,{capture:true});
      window.removeEventListener("pointercancel",cancel,{capture:true});
    };
  }, [enabled,nodeKey,nodes,onPair]);

  if (!enabled || !hint) return null;
  return <div className={styles.hint} data-ready={hint.ready ? "true" : "false"} aria-live="polite">
    <span>{hint.ready ? "COLLISION" : "GRAVITY"}</span>
    <strong>{hint.target ? (hint.ready ? "松手，让两个观点发生碰撞" : "检测到认知引力，继续靠近") : "拖向另一颗观点星球"}</strong>
    {hint.target && <small>{hint.source} ↔ {hint.target}</small>}
  </div>;
}
