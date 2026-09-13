"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { GalaxyNode } from "@/lib/cognitive-galaxy/model";
import type { OpinionGraph, RelationType } from "@/lib/opinion/types";
import styles from "./planet-relations.module.css";

type Point = { x:number;y:number };
type Line = { key:string;a:Point;b:Point;type:RelationType;label:string };

function label(type:RelationType) {
  return ({ support:"支持",refute:"反驳",add:"补充",cond:"条件",oppose:"对立" } as const)[type];
}
function dash(type:RelationType) {
  if (type==="cond") return "7 5";
  if (type==="oppose" || type==="refute") return "2 5";
  return undefined;
}

/** Draws persistent relation bridges in screen space above the existing SVG. */
export function PlanetRelationOverlay({ graph,nodes,enabled,clusterId }: {
  graph:OpinionGraph;
  nodes:readonly GalaxyNode[];
  enabled:boolean;
  clusterId:string;
}) {
  const [lines,setLines]=useState<Line[]>([]);
  const ids=useMemo(()=>new Set(nodes.map((node)=>node.opinion.id)),[nodes]);
  const relationKey=graph.relations.map((r)=>`${r.from}:${r.to}:${r.type}`).join("|");
  const nodeKey=nodes.map((n)=>`${n.opinion.id}:${n.opinion.title}`).join("|");

  useEffect(()=>{
    if(!enabled) return;
    const root=document.querySelector<HTMLElement>('[data-el="galaxy-exploration"]');
    const stage=root?.querySelector<HTMLElement>('[data-level="cluster"]');
    const map=stage?.querySelector<SVGSVGElement>("svg");
    if(!root || !stage || !map) return;
    let frame=0;
    const measure=()=>{
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        const stageRect=stage.getBoundingClientRect();
        const byTitle=new Map(nodes.map((node)=>[node.opinion.title,node.opinion.id]));
        const pointById=new Map<string,Point>();
        for(const el of root.querySelectorAll<SVGGElement>('[data-el="opinion-planet"]')){
          if(el.getAttribute("aria-hidden")==="true") continue;
          const id=byTitle.get(el.getAttribute("aria-label")??"");
          if(!id) continue;
          const rect=el.getBoundingClientRect();
          pointById.set(id,{x:rect.left+rect.width/2-stageRect.left,y:rect.top+rect.height/2-stageRect.top});
        }
        const next:Line[]=graph.relations.flatMap((relation,index)=>{
          if(!ids.has(relation.from)||!ids.has(relation.to)) return [];
          const a=pointById.get(relation.from),b=pointById.get(relation.to);
          if(!a||!b) return [];
          return [{key:`${relation.from}-${relation.to}-${index}`,a,b,type:relation.type,label:label(relation.type)}];
        });
        setLines(next);
      });
    };
    measure();
    const resize=new ResizeObserver(measure);resize.observe(stage);
    const mutation=new MutationObserver(measure);mutation.observe(map,{attributes:true,subtree:true,attributeFilter:["viewBox","transform"]});
    window.addEventListener("resize",measure);
    return()=>{cancelAnimationFrame(frame);resize.disconnect();mutation.disconnect();window.removeEventListener("resize",measure);};
  },[enabled,graph.relations,ids,nodeKey,nodes,relationKey]);

  if(!enabled||!lines.length)return null;
  return <svg className={styles.overlay} aria-hidden="true" style={{"--relation-color":`var(--cg-${clusterId})`} as CSSProperties}>
    {lines.map((line)=>{
      const mx=(line.a.x+line.b.x)/2,my=(line.a.y+line.b.y)/2;
      const distance=Math.hypot(line.a.x-line.b.x,line.a.y-line.b.y);
      const bend=Math.min(34,Math.max(12,distance*.12));
      const path=`M ${line.a.x} ${line.a.y} Q ${mx} ${my-bend} ${line.b.x} ${line.b.y}`;
      return <g key={line.key} className={styles.bridge} data-type={line.type}>
        <path d={path} strokeDasharray={dash(line.type)}/>
        <circle cx={mx} cy={my-bend/2} r="2.2"/>
        <text x={mx} y={my-bend/2-7}>{line.label}</text>
      </g>;
    })}
  </svg>;
}
