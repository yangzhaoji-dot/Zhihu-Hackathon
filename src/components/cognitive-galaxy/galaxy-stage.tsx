"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Minus, Plus, Scan } from "lucide-react";
import { useTranslation } from "react-i18next";
import { hash, OVERVIEW, viewportString, type Galaxy, type GalaxyCluster, type GalaxyNode, type Viewport } from "@/lib/cognitive-galaxy/model";
import styles from "./galaxy.module.css";

function keyActivate(event: KeyboardEvent<SVGGElement>, action: () => void) {
  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); action(); }
}
function titleLines(value: string, max = 16): string[] {
  const chars = Array.from(value);
  return [chars.slice(0,max).join(""),chars.slice(max,max*2).join("") + (chars.length > max * 2 ? "…" : "")].filter(Boolean);
}
function labelIds(nodes: readonly GalaxyNode[]): Set<string> {
  const boxes: { x:number; y:number; w:number; h:number }[] = [];
  const visible = new Set<string>();
  for (const node of [...nodes].sort((a,b) => b.radius-a.radius)) {
    const box = { x:node.x-34, y:node.y+node.radius+4, w:68, h:18 };
    const overlaps = boxes.some((b) => box.x < b.x+b.w && box.x+box.w > b.x && box.y < b.y+b.h && box.y+box.h > b.y);
    const coversPlanet = nodes.some((n) => n!==node && n.x+n.radius>box.x && n.x-n.radius<box.x+box.w && n.y+n.radius>box.y && n.y-n.radius<box.y+box.h);
    if (!overlaps && !coversPlanet) { visible.add(node.opinion.id); boxes.push(box); }
    if (visible.size === 3) break;
  }
  return visible;
}
function variant(node: GalaxyNode) { return hash(`visual-${node.opinion.id}`) % 5; }

export function GalaxyStage({ galaxy, cluster, selected, onCluster, onOpinion }: {
  galaxy: Galaxy; cluster: GalaxyCluster | null; selected: GalaxyNode | null;
  onCluster: (id: string) => void; onOpinion: (id: string) => void;
}) {
  const { t } = useTranslation("galaxy");
  const reduced = useReducedMotion();
  const prefix = useId().replace(/:/g, "");
  const svg = useRef<SVGSVGElement | null>(null);
  const drag = useRef<{ x: number; y: number; view: Viewport; ratio: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const target = useMemo<Viewport>(() => selected ? { x:selected.x-94, y:selected.y-110, width:330, height:220 } : cluster?.bounds ?? OVERVIEW, [selected,cluster]);
  const [view, setView] = useState(target);
  const labels = useMemo(() => labelIds(cluster?.nodes ?? []), [cluster]);
  useEffect(() => { const frame = requestAnimationFrame(() => { setView(target); setHovered(null); }); return () => cancelAnimationFrame(frame); }, [target]);
  const pointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0 || (event.target as Element).closest("[data-clickable]")) return;
    const matrix = svg.current?.getScreenCTM();
    if (!matrix) return;
    const current = svg.current!.viewBox.baseVal;
    drag.current = { x:event.clientX, y:event.clientY, view:{ x:current.x,y:current.y,width:current.width,height:current.height }, ratio:1 / matrix.a };
    event.currentTarget.setPointerCapture(event.pointerId); setDragging(true);
  };
  const pointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const start = drag.current;
    if (!start) return;
    const dx = (event.clientX-start.x) * start.ratio, dy = (event.clientY-start.y) * start.ratio;
    setView({ ...start.view, x:Math.max(-600,Math.min(1800,start.view.x-dx)), y:Math.max(-400,Math.min(1300,start.view.y-dy)) });
  };
  const pointerUp = () => { drag.current = null; setDragging(false); };
  const zoom = (factor: number) => setView((v) => {
    const width = Math.max(170,Math.min(2100,v.width * factor)), height = width * v.height/v.width;
    return { x:v.x+(v.width-width)/2,y:v.y+(v.height-height)/2,width,height };
  });
  return <div className={styles.stage} data-level={selected ? "opinion" : cluster ? "cluster" : "overview"}>
    <motion.svg ref={svg} className={styles.map} initial={false} animate={{ viewBox:viewportString(view) }} transition={{ duration:reduced || dragging ? 0 : .9, ease:[.22,1,.36,1] }} preserveAspectRatio="xMidYMid meet" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onLostPointerCapture={pointerUp} aria-label={galaxy.graph.questionTitle}>
      <defs>
        <radialGradient id={`${prefix}-core`} cx="31%" cy="25%"><stop stopColor="#fff9dc"/><stop offset=".09" stopColor="var(--cg-accent)"/><stop offset=".34" stopColor="var(--cg-growth)" stopOpacity=".82"/><stop offset=".72" stopColor="#162a43"/><stop offset="1" stopColor="var(--cg-bg-deep)"/></radialGradient>
        <radialGradient id={`${prefix}-core-glow`}><stop stopColor="var(--cg-growth)" stopOpacity=".25"/><stop offset=".4" stopColor="var(--cg-values)" stopOpacity=".09"/><stop offset="1" stopColor="var(--cg-growth)" stopOpacity="0"/></radialGradient>
        {galaxy.clusters.map((g) => <radialGradient key={g.id} id={`${prefix}-${g.id}`} cx="27%" cy="22%"><stop stopColor="#f5fbff" stopOpacity=".92"/><stop offset=".15" stopColor={`var(--cg-${g.id})`} stopOpacity=".96"/><stop offset=".56" stopColor={`var(--cg-${g.id})`} stopOpacity=".46"/><stop offset="1" stopColor="#07101c"/></radialGradient>)}
        <filter id={`${prefix}-mist`} x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="34"/></filter>
        <filter id={`${prefix}-soft`} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="7"/></filter>
        <filter id={`${prefix}-glow`} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <g aria-hidden="true" opacity={cluster ? .12 : .4}>
        <path d="M110 710 C350 570 500 615 720 450 C950 280 1120 250 1370 330" fill="none" stroke="var(--cg-growth)" strokeOpacity=".16" strokeWidth="18" filter={`url(#${prefix}-soft)`}/>
        <path d="M80 190 C360 340 525 230 720 450 C930 685 1165 620 1390 500" fill="none" stroke="var(--cg-values)" strokeOpacity=".09" strokeWidth="12" filter={`url(#${prefix}-soft)`}/>
      </g>
      <motion.g animate={{ opacity:cluster ? .08 : 1 }} transition={{ duration:.65 }} aria-hidden="true">
        <ellipse cx="720" cy="450" rx="548" ry="326" fill="none" stroke="var(--cg-line)" strokeWidth=".7" strokeDasharray="2 11" transform="rotate(-8 720 450)"/>
        <ellipse cx="720" cy="450" rx="618" ry="369" fill="none" stroke="var(--cg-line)" strokeWidth=".5" opacity=".5" transform="rotate(-8 720 450)"/>
        <circle cx="720" cy="450" r="205" fill={`url(#${prefix}-core-glow)`} filter={`url(#${prefix}-soft)`}/>
        <circle cx="720" cy="450" r="118" fill="none" stroke="var(--cg-growth)" strokeOpacity=".14" strokeWidth="1"/>
        <circle cx="720" cy="450" r="92" fill="none" stroke="var(--cg-accent)" strokeOpacity=".2" strokeWidth=".7" strokeDasharray="1 5"/>
        <circle cx="720" cy="450" r="70" fill={`url(#${prefix}-core)`} stroke="var(--cg-accent)" strokeOpacity=".48" strokeWidth=".75" filter={`url(#${prefix}-glow)`}/>
        <ellipse cx="720" cy="450" rx="119" ry="33" fill="none" stroke="var(--cg-accent)" strokeWidth=".85" opacity=".42" transform="rotate(-30 720 450)"/>
        <ellipse cx="720" cy="450" rx="145" ry="44" fill="none" stroke="var(--cg-growth)" strokeWidth=".45" opacity=".18" transform="rotate(24 720 450)"/>
        <circle cx="690" cy="422" r="8" fill="#fff7d6" opacity=".28" filter={`url(#${prefix}-soft)`}/>
        <text x="720" y="565" textAnchor="middle" fill="var(--cg-muted)" fontSize="9" letterSpacing="3">{t("coreLabel")}</text>
        {titleLines(galaxy.graph.questionTitle,18).map((line,i) => <text key={i} x="720" y={592+i*23} textAnchor="middle" fill="var(--cg-ink)" fontSize="16">{line}</text>)}
      </motion.g>
      {galaxy.clusters.map((group) => {
        const active = cluster?.id === group.id, focus = hovered === group.id;
        const angle = Math.atan2(group.y-450,group.x-720);
        const bridgeX = 720 + Math.cos(angle) * 145, bridgeY = 450 + Math.sin(angle) * 112;
        return <motion.g key={group.id} animate={{ opacity:cluster && !active ? .025 : 1 }} transition={{ duration:.65 }}>
          {!cluster && <path d={`M${bridgeX} ${bridgeY} Q${(group.x+720)/2} ${(group.y+450)/2-26} ${group.x} ${group.y}`} fill="none" stroke={`var(--cg-${group.id})`} strokeOpacity={focus ? .21 : .085} strokeWidth={focus ? 1.25 : .7} strokeDasharray="2 9"/>}
          <g aria-hidden="true" fill={`var(--cg-${group.id})`} filter={`url(#${prefix}-mist)`} opacity={active ? .25 : focus ? .26 : .17}>
            <ellipse cx={group.x} cy={group.y} rx={active ? 170 : 148} ry={active ? 94 : 77} transform={`rotate(-20 ${group.x} ${group.y})`}/>
            <ellipse cx={group.x-42} cy={group.y+24} rx={active ? 130 : 101} ry={active ? 63 : 51}/>
            <ellipse cx={group.x+54} cy={group.y-28} rx={active ? 108 : 82} ry={active ? 56 : 43}/>
          </g>
          {active && <g aria-hidden="true" opacity=".24">
            <ellipse cx={group.x} cy={group.y} rx="176" ry="101" fill="none" stroke={`var(--cg-${group.id})`} strokeWidth=".65" strokeDasharray="2 8" transform={`rotate(-13 ${group.x} ${group.y})`}/>
            <ellipse cx={group.x} cy={group.y} rx="138" ry="72" fill="none" stroke={`var(--cg-${group.id})`} strokeWidth=".45" transform={`rotate(18 ${group.x} ${group.y})`}/>
          </g>}
          {!cluster && <g role="button" tabIndex={0} data-clickable="true" data-el="galaxy-cluster" aria-label={t(`dimensions.${group.id}.title`)} className={styles.clusterTarget} onClick={() => onCluster(group.id)} onKeyDown={(event) => keyActivate(event,() => onCluster(group.id))} onMouseEnter={() => setHovered(group.id)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(group.id)} onBlur={() => setHovered(null)}>
            <ellipse cx={group.x} cy={group.y+15} rx="170" ry="150" fill="transparent"/>
            <text x={group.x} y={group.y+128} textAnchor="middle" fill={focus ? "var(--cg-ink)" : `var(--cg-${group.id})`} fontSize="17" letterSpacing="1">{t(`dimensions.${group.id}.title`)}</text>
            <text x={group.x} y={group.y+151} textAnchor="middle" fill="var(--cg-muted)" fontSize="10">{t("nodes",{ count:group.nodes.length })} <tspan dx="8">↗</tspan></text>
          </g>}
          <g style={{ pointerEvents:active ? "auto" : "none" }}>
            {group.nodes.map((node) => {
              const isSelected = selected?.opinion.id === node.opinion.id;
              const isHovered = hovered === node.opinion.id;
              const visual = variant(node), r = node.radius;
              const showTitle = active && !selected && (hovered ? isHovered : labels.has(node.opinion.id));
              return <g key={node.opinion.id} transform={`translate(${node.x} ${node.y})`} opacity={selected && !isSelected ? .13 : 1}>
                <motion.g animate={{ scale:isSelected ? 1.82 : isHovered ? 1.08 : 1 }} style={{ transformOrigin:"0px 0px" }} transition={{ duration:reduced ? 0 : .58, ease:[.22,1,.36,1] }} role={active ? "button" : undefined} tabIndex={active && !selected ? 0 : -1} data-clickable={active ? "true" : undefined} data-el="opinion-planet" aria-label={active ? node.opinion.title : undefined} aria-hidden={!active} onClick={() => active && onOpinion(node.opinion.id)} onKeyDown={(event) => active && keyActivate(event,() => onOpinion(node.opinion.id))} onMouseEnter={() => active && setHovered(node.opinion.id)} onMouseLeave={() => setHovered(null)} className={styles.planetTarget}>
                  <circle r={r+10} fill="transparent"/>
                  <circle r={r+7} fill={`var(--cg-${group.id})`} opacity={isSelected || isHovered ? .16 : .055} filter={`url(#${prefix}-soft)`}/>
                  {(isSelected || isHovered) && <circle r={r+5} fill="none" stroke={`var(--cg-${group.id})`} strokeOpacity=".65" strokeWidth=".45" strokeDasharray={isSelected ? "1.5 2.5" : undefined}/>} 
                  <circle r={r} fill={`url(#${prefix}-${group.id})`} stroke={`var(--cg-${group.id})`} strokeOpacity=".62" strokeWidth=".55" filter={isSelected || isHovered ? `url(#${prefix}-glow)` : undefined}/>
                  <ellipse cx={-r*.2} cy={-r*.26} rx={r*.38} ry={r*.18} fill="#fff" opacity=".12" transform="rotate(-25)"/>
                  {visual === 0 && <><path d={`M${-r*.72} ${-r*.12} Q${-r*.05} ${-r*.62} ${r*.85} ${r*.08}`} fill="none" stroke="#f7fbff" strokeWidth=".38" opacity=".2"/><path d={`M${-r*.55} ${r*.42} Q0 ${r*.08} ${r*.62} ${r*.35}`} fill="none" stroke={`var(--cg-${group.id})`} strokeWidth=".6" opacity=".4"/></>}
                  {visual === 1 && <><ellipse rx={r*1.55} ry={r*.31} transform="rotate(-28)" fill="none" stroke={`var(--cg-${group.id})`} strokeOpacity=".72" strokeWidth=".55"/><ellipse rx={r*1.18} ry={r*.18} transform="rotate(-28)" fill="none" stroke="#eef8ff" strokeOpacity=".18" strokeWidth=".3"/></>}
                  {visual === 2 && <><path d={`M${-r*.9} 0 A${r*.9} ${r*.9} 0 0 1 ${r*.55} ${-r*.7}`} fill="none" stroke="#f7f4ff" strokeWidth=".65" opacity=".34"/><path d={`M${-r*.7} ${r*.4} A${r*.82} ${r*.82} 0 0 0 ${r*.8} ${r*.18}`} fill="none" stroke={`var(--cg-${group.id})`} strokeWidth=".8" opacity=".65"/></>}
                  {visual === 3 && <><circle cx={r*1.52} cy={-r*.62} r={Math.max(1.4,r*.18)} fill={`var(--cg-${group.id})`} opacity=".8"/><path d={`M${r*.7} ${-r*.25} L${r*1.37} ${-r*.56}`} stroke={`var(--cg-${group.id})`} strokeWidth=".35" opacity=".45"/></>}
                  {visual === 4 && <><ellipse rx={r*.68} ry={r*.92} fill="none" stroke="#f9fbff" strokeWidth=".38" opacity=".2" transform="rotate(34)"/><ellipse rx={r*1.44} ry={r*.27} fill="none" stroke={`var(--cg-${group.id})`} strokeWidth=".45" opacity=".5" transform="rotate(24)"/></>}
                  {(isHovered || isSelected) && Array.from({ length:6 },(_,i) => { const a=i*Math.PI/3+.35, rr=r+9+(i%2)*3; return <circle key={i} cx={Math.cos(a)*rr} cy={Math.sin(a)*rr} r={i%2 ? .55 : .85} fill={`var(--cg-${group.id})`} opacity={.45+i*.05}/>; })}
                </motion.g>
                {showTitle && <text className={styles.planetLabel} y={r+13} textAnchor="middle" fill="var(--cg-ink)" fontSize="6.4" onClick={() => onOpinion(node.opinion.id)}>{titleLines(node.opinion.title,10).map((line,i) => <tspan key={i} x="0" dy={i ? 9 : 0}>{line}</tspan>)}</text>}
              </g>;
            })}
          </g>
        </motion.g>;
      })}
    </motion.svg>
    <div className={styles.mapControls}><button type="button" onClick={() => zoom(.8)} aria-label={t("zoomIn")}><Plus size={16}/></button><button type="button" onClick={() => zoom(1.25)} aria-label={t("zoomOut")}><Minus size={16}/></button><button type="button" onClick={() => setView(target)} aria-label={t("reset")}><Scan size={15}/></button></div>
    <p className={styles.mapHint}>{t("drag")}</p>
  </div>;
}
