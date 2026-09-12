"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Pause, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { hash } from "@/lib/cognitive-galaxy/model";
import styles from "./opening.module.css";

const DURATIONS = [2500, 2800, 1900, 2800, 4600, 3400];
const POINTS = Array.from({ length: 72 }, (_, i) => {
  const seed = hash(`thought-${i}`), angle = i * 2.39996, r = 26 + Math.sqrt(i / 72) * 168;
  return { id: i, x: 450 + Math.cos(angle) * r, y: 260 + Math.sin(angle) * r * .64, randomX: 140 + seed % 620, randomY: 50 + hash(`thought-y-${i}`) % 360 };
});

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
  return <motion.section className={styles.opening} aria-label={t("introLabel")} data-el="galaxy-opening" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .6 }}>
    <div className={styles.chapter}>0{beat + 1} <span>/ 06</span></div>
    <div className={styles.art} data-beat={beat}>
      <svg viewBox="0 0 900 480" aria-hidden="true">
        <defs>
          <radialGradient id="intro-earth"><stop stopColor="var(--cg-growth)" stopOpacity=".64"/><stop offset=".55" stopColor="var(--cg-bg)"/><stop offset="1" stopColor="var(--cg-bg)"/></radialGradient>
          <radialGradient id="intro-halo"><stop stopColor="var(--cg-growth)" stopOpacity=".22"/><stop offset="1" stopColor="var(--cg-growth)" stopOpacity="0"/></radialGradient>
          <clipPath id="intro-globe-clip"><circle cx="450" cy="230" r="107"/></clipPath>
        </defs>
        <motion.g animate={{ opacity: beat === 2 ? 0 : beat < 3 ? .6 : .16 }} transition={{ duration: .8 }}>
          {POINTS.filter((_, i) => i % 3 === 0).map((p, i) => <motion.path key={p.id} d={`M${p.randomX} ${p.randomY} L${POINTS[(i * 3 + 13) % 72].randomX} ${POINTS[(i * 3 + 13) % 72].randomY}`} stroke="var(--cg-growth)" strokeWidth=".5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduced ? 0 : 2, delay: reduced ? 0 : i * .025 }}/>) }
        </motion.g>
        <motion.g animate={{ opacity: beat === 1 ? .95 : 0, scale: beat === 2 ? .04 : 1 }} style={{ transformOrigin: "450px 230px" }} transition={{ duration: reduced ? 0 : 1.05 }}>
          <circle cx="450" cy="230" r="190" fill="url(#intro-halo)"/>
          <circle cx="450" cy="230" r="107" fill="url(#intro-earth)" stroke="var(--cg-growth)" strokeOpacity=".6"/>
          <g clipPath="url(#intro-globe-clip)" stroke="var(--cg-growth)" strokeWidth=".6" fill="none" opacity=".5">
            <ellipse cx="450" cy="230" rx="55" ry="107"/><ellipse cx="450" cy="230" rx="107" ry="34"/><path d="M343 230h214M450 123v214"/>
            <path d="M373 157l35 7 12 25-13 12 9 30-24 7-7-23-23-5m89-65 18 29 34-3 25 27-16 22-27 8-8 34-20 28-12-21 8-28-20-20 5-36" strokeWidth="2"/>
          </g>
        </motion.g>
        <motion.g animate={{ opacity: beat === 4 ? .7 : 0 }} transition={{ duration: .6 }}>
          {[0, 55, -55].map((a) => <motion.ellipse key={a} cx="450" cy="248" rx="215" ry="70" stroke="var(--cg-accent)" strokeWidth=".7" fill="none" animate={{ rotate: beat === 4 ? a : 0, scaleY: beat === 4 ? 1 : .02 }} style={{ transformOrigin:"450px 248px" }} transition={{ duration: reduced ? 0 : 2 }}/>) }
          {words.map((word, i) => <text key={word} x={[208, 678, 328, 578][i]} y={[250, 250, 64, 444][i]} fill="var(--cg-muted)" fontSize="12" textAnchor="middle">{word}</text>)}
        </motion.g>
        {POINTS.map((p, i) => {
          const group = i % 6, angle = group * Math.PI / 3 - .5;
          const x = beat === 0 ? p.randomX : beat === 2 ? 450 : beat >= 5 ? 450 + Math.cos(angle) * 180 + (p.x - 450) * .3 : p.x;
          const y = beat === 0 ? p.randomY : beat === 2 ? 230 : beat >= 5 ? 230 + Math.sin(angle) * 105 + (p.y - 260) * .3 : p.y;
          return <motion.circle key={p.id} r={i % 9 === 0 ? 2.8 : 1.25} fill={i % 3 === 0 ? "var(--cg-accent)" : "var(--cg-growth)"} initial={{ cx:p.randomX, cy:p.randomY, opacity:0 }} animate={{ cx:x, cy:y, opacity:beat === 1 ? .2 : beat === 2 ? 0 : .3 + i % 6 / 10 }} transition={{ duration:reduced ? 0 : 1.25, delay:reduced ? 0 : i % 7 * .025 }}/>;
        })}
      </svg>
    </div>
    <div className={styles.copy} aria-live="polite"><AnimatePresence mode="wait"><motion.div key={beat} initial={{ opacity:0, y:reduced ? 0 : 12 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:reduced ? 0 : .4 }}><h1>{scenes[beat]?.line}</h1><p>{scenes[beat]?.detail}</p></motion.div></AnimatePresence></div>
    <footer className={styles.footer}>
      <div className={styles.timeline}>{DURATIONS.map((_, i) => <span key={i} data-filled={i <= beat}/>)}</div>
      <div className={styles.controls}>
        {!reduced && <button type="button" onClick={() => setPaused(!paused)} aria-label={t(paused ? "play" : "pause")}>{paused ? <Play size={15}/> : <Pause size={15}/>}</button>}
        {reduced && <button type="button" onClick={() => beat < 5 ? setBeat(beat + 1) : onDone()}>{t("continue")}</button>}
        <button type="button" onClick={onDone} data-el="skip-opening" autoFocus>{t("skip")} <ArrowRight size={15}/></button>
      </div>
    </footer>
  </motion.section>;
}
