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
    <motion.svg ref={svg} className={styles.map} initial={false} animate={{ viewBox:viewportString(view) }} transition={{ duration:reduced || dragging ? 0 : .85, ease:[.22,1,.36,1] }} preserveAspectRatio="xMidYMid meet" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onLostPointerCapture={pointerUp} aria-label={galaxy.graph.questionTitle}>
      <defs>
        <radialGradient id={`${prefix}-core`} cx="35%" cy="28%"><stop stopColor="var(--cg-ink)"/><stop offset=".1" stopColor="var(--cg-accent)"/><stop offset=".44" stopColor="var(--cg-resources)" stopOpacity=".6"/><stop offset="1" stopColor="var(--cg-bg)"/></radialGradient>
        <radialGradient id={`${prefix}-core-glow`}><stop stopColor="var(--cg-accent)" stopOpacity=".12"/><stop offset="1" stopColor="var(--cg-accent)" stopOpacity="0"/></radialGradient>
        {galaxy.clusters.map((g) => <radialGradient key={g.id} id={`${prefix}-${g.id}`} cx="28%" cy="22%"><stop stopColor="var(--cg-ink)" stopOpacity=".86"/><stop offset=".3" stopColor={`var(--cg-${g.id})`}/><stop offset="1" stopColor="var(--cg-bg)"/></radialGradient>)}
        <filter id={`${prefix}-mist`} x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="27"/></filter>
      </defs>
      <motion.g animate={{ opacity:cluster ? .035 : 1 }} transition={{ duration:.6 }} aria-hidden="true">
        <ellipse cx="720" cy="450" rx="540" ry="322" fill="none" stroke="var(--cg-line)" strokeWidth=".7" strokeDasharray="2 11" transform="rotate(-8 720 450)"/>
        <ellipse cx="720" cy="450" rx="605" ry="361" fill="none" stroke="var(--cg-line)" strokeWidth=".5" opacity=".45" transform="rotate(-8 720 450)"/>
        <circle cx="720" cy="450" r="161" fill={`url(#${prefix}-core-glow)`}/>
        <circle cx="720" cy="450" r="88" fill="none" stroke="var(--cg-accent)" strokeOpacity=".12" strokeWidth=".65"/>
        <circle cx="720" cy="450" r="65" fill={`url(#${prefix}-core)`} stroke="var(--cg-accent)" strokeOpacity=".22" strokeWidth=".7"/>
        <ellipse cx="720" cy="450" rx="104" ry="29" fill="none" stroke="var(--cg-accent)" strokeWidth=".7" opacity=".3" transform="rotate(-30 720 450)"/>
        <text x="720" y="555" textAnchor="middle" fill="var(--cg-muted)" fontSize="9" letterSpacing="3">{t("coreLabel")}</text>
        {titleLines(galaxy.graph.questionTitle,18).map((line,i) => <text key={i} x="720" y={582+i*23} textAnchor="middle" fill="var(--cg-ink)" fontSize="16">{line}</text>)}
      </motion.g>
      {galaxy.clusters.map((group) => {
        const active = cluster?.id === group.id, focus = hovered === group.id;
        return <motion.g key={group.id} animate={{ opacity:cluster && !active ? .025 : 1 }} transition={{ duration:.6 }}>
          <g aria-hidden="true" fill={`var(--cg-${group.id})`} filter={`url(#${prefix}-mist)`} opacity={focus ? .2 : .12}>
            <ellipse cx={group.x} cy={group.y} rx="123" ry="66" transform={`rotate(-20 ${group.x} ${group.y})`}/>
            <ellipse cx={group.x-30} cy={group.y+20} rx="89" ry="48"/>
          </g>
          {!cluster && <g role="button" tabIndex={0} data-clickable="true" data-el="galaxy-cluster" aria-label={t(`dimensions.${group.id}.title`)} className={styles.clusterTarget} onClick={() => onCluster(group.id)} onKeyDown={(event) => keyActivate(event,() => onCluster(group.id))} onMouseEnter={() => setHovered(group.id)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(group.id)} onBlur={() => setHovered(null)}>
            <ellipse cx={group.x} cy={group.y+15} rx="160" ry="145" fill="transparent"/>
            <text x={group.x} y={group.y+122} textAnchor="middle" fill={focus ? "var(--cg-ink)" : `var(--cg-${group.id})`} fontSize="17" letterSpacing="1">{t(`dimensions.${group.id}.title`)}</text>
            <text x={group.x} y={group.y+145} textAnchor="middle" fill="var(--cg-muted)" fontSize="10">{t("nodes",{ count:group.nodes.length })} <tspan dx="8">↗</tspan></text>
          </g>}
          <g style={{ pointerEvents:active ? "auto" : "none" }}>
            {group.nodes.map((node) => {
              const isSelected = selected?.opinion.id === node.opinion.id;
              const showTitle = active && !selected && (hovered ? hovered === node.opinion.id : labels.has(node.opinion.id));
              return <g key={node.opinion.id} transform={`translate(${node.x} ${node.y})`} opacity={selected && !isSelected ? .16 : 1}>
                <motion.g animate={{ scale:isSelected ? 1.8 : 1 }} style={{ transformOrigin:"0px 0px" }} transition={{ duration:reduced ? 0 : .65 }} role={active ? "button" : undefined} tabIndex={active && !selected ? 0 : -1} data-clickable={active ? "true" : undefined} data-el="opinion-planet" aria-label={active ? node.opinion.title : undefined} aria-hidden={!active} onClick={() => active && onOpinion(node.opinion.id)} onKeyDown={(event) => active && keyActivate(event,() => onOpinion(node.opinion.id))} onMouseEnter={() => active && setHovered(node.opinion.id)} onMouseLeave={() => setHovered(null)} className={styles.planetTarget}>
                  <circle r={node.radius+7} fill="transparent"/>
                  {(isSelected || hovered === node.opinion.id) && <circle r={node.radius+5} fill="none" stroke={`var(--cg-${group.id})`} strokeOpacity=".5" strokeWidth=".4"/>}
                  <circle r={node.radius} fill={`url(#${prefix}-${group.id})`} stroke={`var(--cg-${group.id})`} strokeOpacity=".42" strokeWidth=".5"/>
                  <path d={`M${-node.radius*.7} ${-node.radius*.15} Q0 ${-node.radius*.6} ${node.radius*.85} ${node.radius*.1}`} fill="none" stroke="var(--cg-ink)" strokeWidth=".35" opacity=".13"/>
                  {hash(node.opinion.id)%4 === 0 && <ellipse rx={node.radius*1.48} ry={node.radius*.29} transform="rotate(-28)" fill="none" stroke={`var(--cg-${group.id})`} strokeOpacity=".5" strokeWidth=".4"/>}
                </motion.g>
                {showTitle && <text className={styles.planetLabel} y={node.radius+12} textAnchor="middle" fill="var(--cg-ink)" fontSize="6.4" onClick={() => onOpinion(node.opinion.id)}>{titleLines(node.opinion.title,10).map((line,i) => <tspan key={i} x="0" dy={i ? 9 : 0}>{line}</tspan>)}</text>}
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
