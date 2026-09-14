"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Pause, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { hash } from "@/lib/cognitive-galaxy/model";
import styles from "./opening.module.css";

const DURATIONS = [2800, 3000, 2200, 3000, 4700, 3600];
const POINTS = Array.from({ length: 128 }, (_, i) => {
  const seed = hash(`thought-${i}`), angle = i * 2.39996, r = 32 + Math.sqrt(i / 128) * 204;
  return { id:i, x:450 + Math.cos(angle) * r, y:235 + Math.sin(angle) * r * .63, randomX:70 + seed % 760, randomY:35 + hash(`thought-y-${i}`) % 390 };
});
const CITY = Array.from({ length: 24 }, (_, i) => ({
  x:72 + i * 34,
  height:36 + hash(`city-${i}`) % 126,
  width:18 + hash(`city-w-${i}`) % 17,
}));
const FINAL_CLUSTERS = [
  { color:"var(--cg-health)", x:275, y:180 },
  { color:"var(--cg-resources)", x:610, y:142 },
  { color:"var(--cg-growth)", x:684, y:294 },
  { color:"var(--cg-values)", x:500, y:360 },
  { color:"var(--cg-context)", x:248, y:326 },
  { color:"var(--cg-reasoning)", x:170, y:224 },
];

export function Opening({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation("galaxy");
  const reduced = useReducedMotion();
  const [beat, setBeat] = useState(0);
  const [paused, setPaused] = useState(false);
  const scenes = t("intro", { returnObjects: true }) as { line: string; detail: string }[];
  const words = t("dimensionWords", { returnObjects: true }) as string[];
  useEffect(() => {
    if (paused || reduced) return;
    const timer = window.setTimeout(() => beat < 5 ? setBeat(beat + 1) : onDone(), DURATIONS[beat]);
    return () => window.clearTimeout(timer);
  }, [beat, onDone, paused, reduced]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") onDone(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onDone]);

  return <motion.section className={styles.opening} aria-label={t("introLabel")} data-el="galaxy-opening" data-beat={beat} initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:reduced ? 0 : .7 }}>
    <div className={styles.openingGlow} aria-hidden="true" />
    <div className={styles.chapter}>0{beat + 1} <span>/ 06</span></div>
    <div className={styles.art} data-beat={beat}>
      <svg viewBox="0 0 900 480" aria-hidden="true">
        <defs>
          <radialGradient id="intro-earth" cx="31%" cy="24%"><stop stopColor="#e6f7ff" stopOpacity=".75"/><stop offset=".13" stopColor="var(--cg-growth)" stopOpacity=".62"/><stop offset=".55" stopColor="#13243a"/><stop offset="1" stopColor="#050a14"/></radialGradient>
          <radialGradient id="intro-halo"><stop stopColor="var(--cg-growth)" stopOpacity=".32"/><stop offset=".48" stopColor="var(--cg-values)" stopOpacity=".08"/><stop offset="1" stopColor="var(--cg-growth)" stopOpacity="0"/></radialGradient>
          <radialGradient id="intro-core"><stop stopColor="#fff8d8"/><stop offset=".16" stopColor="var(--cg-accent)"/><stop offset=".5" stopColor="var(--cg-growth)" stopOpacity=".72"/><stop offset="1" stopColor="#07111f"/></radialGradient>
          <filter id="intro-soft" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="10"/></filter>
          <filter id="intro-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <clipPath id="intro-globe-clip"><circle cx="450" cy="226" r="112"/></clipPath>
        </defs>

        <motion.g animate={{ opacity:beat === 0 ? .82 : beat === 1 ? .2 : 0 }} transition={{ duration:.75 }}>
          {[90,150,210,270,330,390].map((y) => <path key={y} d={`M40 ${y} H860`} stroke="var(--cg-growth)" strokeWidth=".45" opacity=".16" strokeDasharray="2 12"/>)}
          {[140,260,380,500,620,740].map((x) => <path key={x} d={`M${x} 40 V420`} stroke="var(--cg-growth)" strokeWidth=".45" opacity=".12" strokeDasharray="2 14"/>)}
          {CITY.map((building,i) => <motion.rect key={i} x={building.x} y={420-building.height} width={building.width} height={building.height} rx="1" fill="var(--cg-growth)" opacity={.04 + (i%5)*.018} initial={{ scaleY:0 }} animate={{ scaleY:1 }} style={{ transformOrigin:`${building.x}px 420px` }} transition={{ duration:reduced ? 0 : .8, delay:reduced ? 0 : i*.025 }}/>) }
          {POINTS.filter((_,i) => i % 4 === 0).map((p,i) => <motion.path key={p.id} d={`M${p.randomX} ${p.randomY} Q450 ${170 + i%5*26} ${POINTS[(i*7+19)%POINTS.length].randomX} ${POINTS[(i*7+19)%POINTS.length].randomY}`} fill="none" stroke={i%3 ? "var(--cg-growth)" : "var(--cg-accent)"} strokeWidth=".55" opacity=".28" initial={{ pathLength:0 }} animate={{ pathLength:1 }} transition={{ duration:reduced ? 0 : 1.8, delay:reduced ? 0 : i*.02 }}/>) }
        </motion.g>

        <motion.g animate={{ opacity:beat === 1 ? 1 : beat === 2 ? .78 : 0, scale:beat === 2 ? .055 : 1 }} style={{ transformOrigin:"450px 226px" }} transition={{ duration:reduced ? 0 : 1.18, ease:[.4,0,.15,1] }}>
          <circle cx="450" cy="226" r="208" fill="url(#intro-halo)" filter="url(#intro-soft)"/>
          <circle cx="450" cy="226" r="112" fill="url(#intro-earth)" stroke="var(--cg-growth)" strokeOpacity=".65" filter="url(#intro-glow)"/>
          <g clipPath="url(#intro-globe-clip)" stroke="var(--cg-growth)" strokeWidth=".65" fill="none" opacity=".55">
            <ellipse cx="450" cy="226" rx="58" ry="112"/><ellipse cx="450" cy="226" rx="112" ry="36"/><path d="M338 226h224M450 114v224"/>
            <path d="M370 151l37 7 13 27-14 13 10 31-25 8-8-24-25-5m94-68 19 30 35-3 27 28-17 23-29 8-8 35-21 29-13-22 8-29-21-21 6-38" strokeWidth="2.1"/>
          </g>
          <ellipse cx="450" cy="226" rx="156" ry="42" fill="none" stroke="var(--cg-accent)" strokeOpacity=".18" transform="rotate(-24 450 226)"/>
        </motion.g>

        {beat === 2 && <motion.g initial={{ opacity:1 }} animate={{ opacity:0 }} transition={{ duration:reduced ? 0 : 1.6 }}>
          {[80,125,170].map((r,i) => <motion.circle key={r} cx="450" cy="226" fill="none" stroke={i===1 ? "var(--cg-accent)" : "var(--cg-growth)"} strokeWidth="1" initial={{ r:22,opacity:.65 }} animate={{ r:r+90,opacity:0 }} transition={{ duration:reduced ? 0 : 1.45,delay:reduced ? 0 : i*.14 }}/>) }
          <circle cx="450" cy="226" r="27" fill="var(--cg-accent)" opacity=".35" filter="url(#intro-soft)"/>
        </motion.g>}

        <motion.g animate={{ opacity:beat === 3 ? .95 : beat === 4 ? .38 : 0 }} transition={{ duration:.7 }}>
          {words.map((word,i) => <motion.text key={`${word}-${i}`} x={[188,704,315,584,125,764][i%6]} y={[180,170,76,390,320,330][i%6]} fill={i%2 ? "var(--cg-muted)" : "var(--cg-accent)"} fontSize={i%2 ? 12 : 13} textAnchor="middle" initial={{ opacity:0,y:8 }} animate={{ opacity:beat === 3 ? .72 : .3,y:0 }} transition={{ duration:reduced ? 0 : .7,delay:reduced ? 0 : i*.09 }}>{word}</motion.text>)}
          {POINTS.filter((_,i) => i%11===0).map((p,i) => <circle key={p.id} cx={p.x} cy={p.y} r={i%3===0 ? 3.2 : 1.7} fill={i%2 ? "var(--cg-growth)" : "var(--cg-accent)"} opacity=".48"/>)}
        </motion.g>

        <motion.g animate={{ opacity:beat === 4 ? .88 : beat === 5 ? .2 : 0 }} transition={{ duration:.7 }}>
          {[0,55,-55,88].map((a,i) => <motion.ellipse key={a} cx="450" cy="238" rx={205+i*15} ry={68+i*8} stroke={i%2 ? "var(--cg-growth)" : "var(--cg-accent)"} strokeWidth=".7" fill="none" opacity={.4-i*.055} animate={{ rotate:beat >= 4 ? a : 0,scaleY:beat >= 4 ? 1 : .02 }} style={{ transformOrigin:"450px 238px" }} transition={{ duration:reduced ? 0 : 2.1 }}/>) }
          <circle cx="450" cy="238" r="42" fill="url(#intro-core)" opacity=".88" filter="url(#intro-glow)"/>
          <circle cx="450" cy="238" r="84" fill="url(#intro-halo)" opacity=".46" filter="url(#intro-soft)"/>
        </motion.g>

        <motion.g animate={{ opacity:beat === 5 ? 1 : 0 }} transition={{ duration:.9 }}>
          <circle cx="450" cy="238" r="128" fill="url(#intro-halo)" opacity=".5" filter="url(#intro-soft)"/>
          <circle cx="450" cy="238" r="49" fill="url(#intro-core)" stroke="var(--cg-accent)" strokeOpacity=".54" filter="url(#intro-glow)"/>
          <ellipse cx="450" cy="238" rx="92" ry="25" fill="none" stroke="var(--cg-accent)" strokeOpacity=".44" transform="rotate(-28 450 238)"/>
          {FINAL_CLUSTERS.map((cluster,i) => <g key={i}>
            <circle cx={cluster.x} cy={cluster.y} r="72" fill={cluster.color} opacity=".07" filter="url(#intro-soft)"/>
            <circle cx={cluster.x} cy={cluster.y} r={13+i%3*2} fill={cluster.color} opacity=".72" filter="url(#intro-glow)"/>
            <circle cx={cluster.x-24} cy={cluster.y+16} r="4" fill={cluster.color} opacity=".52"/>
            <circle cx={cluster.x+31} cy={cluster.y-13} r="3" fill={cluster.color} opacity=".46"/>
          </g>)}
        </motion.g>

        {POINTS.map((p,i) => {
          const group=i%6, target=FINAL_CLUSTERS[group], scatterAngle=i*2.39996;
          const x=beat===0?p.randomX:beat===2?450:beat===3?450+Math.cos(scatterAngle)*(92+(i%9)*13):beat===5?target.x+Math.cos(scatterAngle)*(18+(i%5)*7):p.x;
          const y=beat===0?p.randomY:beat===2?226:beat===3?226+Math.sin(scatterAngle)*(58+(i%7)*9):beat===5?target.y+Math.sin(scatterAngle)*(12+(i%5)*5):p.y;
          const opacity=beat===1?.18:beat===2?.08:beat===5?.38+(i%5)*.1:.25+(i%6)*.08;
          return <motion.circle key={p.id} r={i%17===0?3.1:i%7===0?1.9:1.05} fill={i%5===0?"var(--cg-accent)":FINAL_CLUSTERS[group].color} initial={{ cx:p.randomX,cy:p.randomY,opacity:0 }} animate={{ cx:x,cy:y,opacity }} transition={{ duration:reduced?0:1.35,delay:reduced?0:i%11*.018,ease:[.22,1,.36,1] }}/>;
        })}
      </svg>
    </div>
    <div className={styles.copy} aria-live="polite"><AnimatePresence mode="wait"><motion.div key={beat} initial={{ opacity:0,y:reduced?0:14 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:reduced?0:-6 }} transition={{ duration:reduced?0:.48 }}><h1>{scenes[beat]?.line}</h1><p>{scenes[beat]?.detail}</p></motion.div></AnimatePresence></div>
    <footer className={styles.footer}>
      <div className={styles.timeline}>{DURATIONS.map((_,i) => <span key={i} data-filled={i<=beat}/>)}</div>
      <div className={styles.controls}>
        {!reduced && <button type="button" onClick={() => setPaused(!paused)} aria-label={t(paused?"play":"pause")}>{paused?<Play size={15}/>:<Pause size={15}/>}</button>}
        {reduced && <button type="button" onClick={() => beat<5?setBeat(beat+1):onDone()}>{t("continue")}</button>}
        <button type="button" onClick={onDone} data-el="skip-opening" autoFocus>{t("skip")} <ArrowRight size={15}/></button>
      </div>
    </footer>
  </motion.section>;
}
