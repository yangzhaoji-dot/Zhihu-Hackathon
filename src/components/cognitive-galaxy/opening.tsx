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
const CITY_BLOCKS = [
  { x: 18, w: 54, h: 118, roof: "flat" }, { x: 76, w: 38, h: 82, roof: "step" },
  { x: 118, w: 62, h: 146, roof: "flat" }, { x: 184, w: 32, h: 96, roof: "step" },
  { x: 220, w: 68, h: 128, roof: "flat" }, { x: 294, w: 42, h: 78, roof: "step" },
  { x: 342, w: 58, h: 108, roof: "flat" }, { x: 406, w: 44, h: 86, roof: "step" },
  { x: 456, w: 64, h: 132, roof: "flat" }, { x: 526, w: 36, h: 76, roof: "step" },
  { x: 568, w: 70, h: 118, roof: "flat" }, { x: 644, w: 42, h: 92, roof: "step" },
  { x: 692, w: 64, h: 142, roof: "flat" }, { x: 762, w: 38, h: 84, roof: "step" },
  { x: 804, w: 62, h: 112, roof: "flat" },
];
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
          {/* One continuous, uniform skyline. The whole band is compressed and
              lowered so it never intrudes into the central thought field. */}
          <g transform="translate(0 160) scale(1 .62)" opacity=".42">
            {CITY_BLOCKS.map((building, i) => (
              <motion.g
                key={`city-block-${i}`}
                initial={{ scaleY: 0, opacity: 0.15 }}
                animate={{
                  // On beat 1 the skyline retracts toward its ground line,
                  // making the city visibly descend out of the scene.
                  scaleY: beat === 0 ? 1 : 0,
                  opacity: beat === 0 ? 1 : 0,
                }}
                transition={{
                  duration: reduced ? 0 : 0.72,
                  delay: reduced ? 0 : beat === 0 ? 0.08 + i * 0.075 : (CITY_BLOCKS.length - i) * 0.045,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{ transformOrigin: `${building.x + building.w / 2}px 420px` }}
              >
                <path
                  d={building.roof === "step"
                    ? `M${building.x} 420V${420 - building.h + 16}h10v-16h${building.w - 20}v16h10v${building.h - 16}Z`
                    : `M${building.x} 420V${420 - building.h}h${building.w}v${building.h}Z`}
                  fill={i % 3 === 0 ? "var(--cg-accent)" : "var(--cg-growth)"}
                />
                {Array.from({ length: Math.max(2, Math.floor(building.h / 26)) }, (_, row) => (
                  <path
                    key={`windows-${i}-${row}`}
                    d={`M${building.x + 8} ${420 - building.h + 18 + row * 23}h${Math.max(10, building.w - 16)}m-${Math.max(10, building.w - 16)} 0`}
                    stroke="rgba(216,239,250,.44)"
                    strokeWidth="3"
                    strokeDasharray="4 8"
                    fill="none"
                  />
                ))}
              </motion.g>
            ))}
            <motion.path
              d="M0 420H900"
              stroke="var(--cg-accent)"
              strokeWidth="5"
              initial={{ opacity: 0 }}
              animate={{ opacity: beat === 0 ? 0.7 : 0 }}
              transition={{ duration: reduced ? 0 : 0.55, delay: reduced ? 0 : beat === 0 ? 1.05 : 0 }}
            />
          </g>
          {/* AI chip and human-thought relation: a luminous silicon core
              broadcasts through circuit traces into cool human nodes. */}
          <g opacity=".78">
            <circle cx="450" cy="224" r="43" fill="rgba(88,150,193,.1)" filter="url(#intro-soft)" />
            <rect x="427" y="201" width="46" height="46" rx="7" fill="rgba(84,158,210,.2)" stroke="#b9e8ff" strokeWidth="1.4" />
            <rect x="435" y="209" width="30" height="30" rx="3" fill="rgba(17,57,92,.74)" stroke="var(--cg-growth)" strokeWidth=".8" />
            <text x="450" y="229" textAnchor="middle" fill="#e9f8ff" fontSize="13" fontWeight="700" fontFamily="system-ui, sans-serif">AI</text>
            {[{ x:258, y:156 }, { x:314, y:322 }, { x:646, y:154 }, { x:600, y:324 }].map((node, i) => (
              <g key={`ai-link-${i}`}>
                <path d={`M${node.x < 450 ? 427 : 473} 224 Q${(450 + node.x) / 2} ${node.y - 36} ${node.x} ${node.y}`} fill="none" stroke={i % 2 ? "var(--cg-values)" : "var(--cg-growth)"} strokeWidth=".8" strokeDasharray="3 8" opacity=".7" />
                <motion.circle
                  r="2.8"
                  fill={i % 2 ? "var(--cg-values)" : "var(--cg-growth)"}
                  animate={{ cx: [node.x < 450 ? 427 : 473, node.x], cy: [224, node.y], opacity: [0, 1, 0] }}
                  transition={{ duration: reduced ? 0 : 2.3, delay: reduced ? 0 : i * 0.38, repeat: Infinity, ease: "linear" }}
                />
                <circle cx={node.x} cy={node.y} r="5" fill="var(--cg-growth)" opacity=".75" />
              </g>
            ))}
          </g>
          {POINTS.filter((_,i) => i % 4 === 0).map((p,i) => <motion.path key={p.id} d={`M${p.randomX} ${p.randomY} Q450 ${170 + i%5*26} ${POINTS[(i*7+19)%POINTS.length].randomX} ${POINTS[(i*7+19)%POINTS.length].randomY}`} fill="none" stroke={i%3 ? "var(--cg-growth)" : "var(--cg-accent)"} strokeWidth=".55" opacity=".28" initial={{ pathLength:0 }} animate={{ pathLength:1 }} transition={{ duration:reduced ? 0 : 1.8, delay:reduced ? 0 : i*.02 }}/>) }
        </motion.g>

        <motion.g animate={{ opacity:beat === 1 ? 1 : beat === 2 ? .78 : 0, scale:beat === 2 ? .055 : 1 }} style={{ transformOrigin:"450px 226px" }} transition={{ duration:reduced ? 0 : 1.18, ease:[.4,0,.15,1] }}>
          <circle cx="450" cy="226" r="208" fill="url(#intro-halo)" filter="url(#intro-soft)"/>
          <circle cx="450" cy="226" r="112" fill="url(#intro-earth)" stroke="var(--cg-growth)" strokeOpacity=".65" filter="url(#intro-glow)"/>
          <g clipPath="url(#intro-globe-clip)" fill="none">
            <ellipse cx="450" cy="226" rx="58" ry="112" stroke="var(--cg-growth)" strokeWidth=".65" opacity=".42" />
            <ellipse cx="450" cy="226" rx="112" ry="36" stroke="var(--cg-growth)" strokeWidth=".65" opacity=".42" />
            <path d="M338 226h224M450 114v224" stroke="var(--cg-growth)" strokeWidth=".65" opacity=".35" />
            {/* glowing, circuit-like continental borders */}
            {[
              "M365 190l18-18 27 5 13 18-8 14 18 13-13 19-28-4-12 18-19-13 7-21-18-14Z",
              "M476 151l23 12 10 24 23 7 12 22-17 17-28-5-10 19-23-10 4-24-15-15 8-26Z",
              "M470 260l22-11 18 10 8 25-13 18-22-5-13-20Z",
            ].map((d, i) => (
              <motion.path
                key={`continent-${i}`}
                d={d}
                stroke={i === 1 ? "var(--cg-accent)" : "#aee8ff"}
                strokeWidth="1.8"
                strokeLinejoin="round"
                strokeDasharray="4 4"
                initial={{ opacity: 0.28, pathLength: 0.2 }}
                animate={{ opacity: [0.28, 0.95, 0.28], pathLength: [0.35, 1, 0.35] }}
                transition={{ duration: reduced ? 0 : DURATIONS[1] / 1000, delay: reduced ? 0 : i * 0.28, repeat: Infinity, ease: "easeInOut" }}
              />
            ))}
            {/* raised infrastructure on the globe surface */}
            <g transform="translate(388 181)" stroke="#d8f5ff" strokeWidth="1.2" fill="rgba(83,154,203,.5)">
              <path d="M0 29L5 8l5 21Z" /><path d="M5 8V0M5 8L-4 3M5 8l10-5" fill="none" />
              <motion.circle cx="5" cy="8" r="2" fill="var(--cg-accent)" animate={{ opacity: [0.35, 1, 0.35] }} transition={{ duration: reduced ? 0 : 1.5, repeat: Infinity }} />
            </g>
            <g transform="translate(512 204) rotate(12)" stroke="#d8f5ff" strokeWidth="1.1">
              <path d="M0 0h27v15H0Z" fill="rgba(76,139,195,.65)" /><path d="M4 4h19M4 8h19M4 12h19" />
              <path d="M13 15v9" />
            </g>
            <g transform="translate(462 290)" stroke="#d8f5ff" strokeWidth="1.1" fill="rgba(84,158,210,.55)">
              <path d="M0 18V3h28v15M-4 18h36M5 3V-5h18v8" />
              <path d="M6 9h4m5 0h4m5 0h4M6 13h4m5 0h4m5 0h4" />
            </g>
          </g>
          {/* Saturn-like cognition rings: wide enough to read as a system,
              with small orbital fragments travelling inside the band. */}
          <g transform="rotate(-24 450 226)" fill="none" opacity=".98">
            <ellipse cx="450" cy="226" rx="198" ry="58" stroke="#8edcff" strokeWidth="16" strokeOpacity=".08" filter="url(#intro-soft)" />
            <ellipse cx="450" cy="226" rx="198" ry="58" stroke="#d9f7ff" strokeWidth="5" strokeOpacity=".3" filter="url(#intro-glow)" />
            {[{ rx: 166, ry: 42, opacity: 0.72, width: 3.8 }, { rx: 190, ry: 54, opacity: 0.6, width: 2.6 }, { rx: 218, ry: 68, opacity: 0.34, width: 1.8 }].map((ring, i) => (
              <motion.ellipse
                key={`earth-ring-${i}`}
                cx="450"
                cy="226"
                rx={ring.rx}
                ry={ring.ry}
                stroke={i === 1 ? "var(--cg-accent)" : "var(--cg-growth)"}
                strokeOpacity={ring.opacity}
                strokeWidth={ring.width}
                strokeDasharray={i === 1 ? "9 7" : "4 8"}
                animate={{ strokeOpacity: [ring.opacity * 0.55, ring.opacity, ring.opacity * 0.55] }}
                transition={{ duration: reduced ? 0 : DURATIONS[1] / 1000, delay: reduced ? 0 : i * 0.16, repeat: Infinity, ease: "easeInOut" }}
              />
            ))}
            {[{ x: 286, y: 222, r: 3.8 }, { x: 304, y: 202, r: 2 }, { x: 318, y: 187, r: 2.6 }, { x: 354, y: 170, r: 1.6 }, { x: 594, y: 264, r: 3.4 }, { x: 616, y: 247, r: 2 }, { x: 638, y: 228, r: 2.7 }, { x: 666, y: 204, r: 1.8 }, { x: 514, y: 164, r: 2.6 }, { x: 389, y: 289, r: 2.4 }, { x: 420, y: 300, r: 1.5 }, { x: 548, y: 150, r: 1.5 }].map((rock, i) => (
              <motion.circle
                key={`ring-asteroid-${i}`}
                cx={rock.x}
                cy={rock.y}
                r={rock.r}
                fill={i % 2 ? "var(--cg-growth)" : "var(--cg-accent)"}
                stroke="none"
                animate={{ opacity: [0.28, 0.9, 0.28], scale: [0.82, 1.18, 0.82] }}
                transition={{ duration: reduced ? 0 : DURATIONS[1] / 1000, delay: reduced ? 0 : i * 0.19, repeat: Infinity, ease: "easeInOut" }}
              />
            ))}
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const angle = -1.02 + i * 0.43;
              const cx = 450 + Math.cos(angle) * 194;
              const cy = 226 + Math.sin(angle) * 56;
              return (
                <motion.g key={`ring-star-${i}`} transform={`translate(${cx} ${cy})`}>
                  <circle r="7" fill="#bceeff" opacity=".18" filter="url(#intro-soft)" />
                  <path d="M0 -5V5M-5 0H5" stroke="#effcff" strokeWidth="1.2" opacity=".85" />
                  <motion.circle r="2" fill="#ffffff" animate={{ opacity: [0.25, 1, 0.25], scale: [0.7, 1.4, 0.7] }} transition={{ duration: reduced ? 0 : DURATIONS[1] / 1000, delay: reduced ? 0 : i * 0.22, repeat: Infinity }} />
                </motion.g>
              );
            })}
          </g>
        </motion.g>

        {beat === 2 && <motion.g initial={{ opacity:1 }} animate={{ opacity:0 }} transition={{ duration:reduced ? 0 : 1.6 }}>
          {[80,125,170].map((r,i) => <motion.circle key={r} cx="450" cy="226" fill="none" stroke={i===1 ? "var(--cg-accent)" : "var(--cg-growth)"} strokeWidth="1" initial={{ r:22,opacity:.65 }} animate={{ r:r+90,opacity:0 }} transition={{ duration:reduced ? 0 : 1.45,delay:reduced ? 0 : i*.14 }}/>) }
          <circle cx="450" cy="226" r="27" fill="var(--cg-accent)" opacity=".35" filter="url(#intro-soft)"/>
        </motion.g>}

        {beat === 3 && <motion.g initial={{ opacity:0 }} animate={{ opacity:.98 }} exit={{ opacity:0 }} transition={{ duration:.45 }}>
          {[{ x: 275, y: 132 }, { x: 625, y: 132 }, { x: 275, y: 232 }, { x: 625, y: 232 }].map((cluster, i) => (
            <g key={`dimension-cluster-${i}`}>
              {/* Irregular nebula made from overlapping soft clouds, rather than a single circle. */}
              <ellipse cx={cluster.x - 18} cy={cluster.y + 5} rx="74" ry="38" fill={i % 2 ? "var(--cg-values)" : "var(--cg-growth)"} opacity=".10" filter="url(#intro-soft)" />
              <ellipse cx={cluster.x + 22} cy={cluster.y - 10} rx="58" ry="30" fill={i % 2 ? "var(--cg-growth)" : "var(--cg-accent)"} opacity=".09" filter="url(#intro-soft)" />
              <motion.path d={`M${cluster.x-70} ${cluster.y+8} Q${cluster.x-28} ${cluster.y-32} ${cluster.x+8} ${cluster.y-5} T${cluster.x+70} ${cluster.y+4}`} fill="none" stroke={i % 2 ? "var(--cg-values)" : "var(--cg-accent)"} strokeWidth="1.2" strokeOpacity=".42" strokeDasharray="3 8" animate={{ strokeOpacity: [0.18, 0.55, 0.18] }} transition={{ duration: reduced ? 0 : 3.4, repeat: Infinity, delay: i * 0.2 }} />
              <motion.text
                x={cluster.x}
                y={cluster.y + 8}
                fill={i % 2 ? "var(--cg-muted)" : "var(--cg-accent)"}
                fontSize="25"
                fontWeight="600"
                textAnchor="middle"
                initial={{ opacity: 0, y: cluster.y + 14 }}
                animate={{ opacity: 1, y: cluster.y + 8 }}
                transition={{ duration: reduced ? 0 : 0.75, delay: reduced ? 0 : i * 0.12 }}
              >{words[i] ?? ""}</motion.text>
            </g>
          ))}
          {/* A small galaxy between the four dimension clouds. */}
          <ellipse cx="450" cy="236" rx="210" ry="88" fill="none" stroke="var(--cg-growth)" strokeWidth="1.4" strokeOpacity=".42" strokeDasharray="3 10" />
          {[0,1,2,3,4,5,6,7].map((i) => {
            const a = i * Math.PI / 4;
            const cx = 450 + Math.cos(a) * (150 + (i % 3) * 22);
            const cy = 236 + Math.sin(a) * (58 + (i % 2) * 18);
            return <motion.circle key={`galaxy-star-${i}`} cx={cx} cy={cy} r={i % 3 === 0 ? 4.2 : 2.2} fill={i % 2 ? "var(--cg-growth)" : "var(--cg-accent)"} filter="url(#intro-glow)" animate={{ opacity: [0.45, 1, 0.45], scale: [0.8, 1.35, 0.8] }} transition={{ duration: reduced ? 0 : 2.8, delay: reduced ? 0 : i * 0.14, repeat: Infinity }} />;
          })}
          {[0,1,2].map((i) => <motion.path key={`meteor-${i}`} d={`M${150 + i * 210} ${90 + i * 52}l${54 + i * 16} ${18 + i * 7}`} stroke={i % 2 ? "var(--cg-values)" : "var(--cg-accent)"} strokeWidth="1.5" strokeLinecap="round" strokeOpacity=".65" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: [0, 1, 0], opacity: [0, .8, 0] }} transition={{ duration: reduced ? 0 : 2.4, delay: reduced ? 0 : i * 0.7, repeat: Infinity, ease: "easeOut" }} />)}
          {POINTS.filter((_,i) => i%11===0).map((p,i) => <circle key={p.id} cx={p.x} cy={p.y} r={i%3===0 ? 3.2 : 1.7} fill={i%2 ? "var(--cg-growth)" : "var(--cg-accent)"} opacity=".48"/>)}
        </motion.g>}

        <motion.g animate={{ opacity:beat === 4 ? .88 : beat === 5 ? .2 : 0 }} transition={{ duration:.7 }}>
          {[0,55,-55,88].map((a,i) => <motion.ellipse key={a} cx="450" cy="238" rx={205+i*15} ry={68+i*8} stroke={i%2 ? "var(--cg-growth)" : "var(--cg-accent)"} strokeWidth=".7" fill="none" opacity={.4-i*.055} animate={{ rotate:beat >= 4 ? a : 0,scaleY:beat >= 4 ? 1 : .02 }} style={{ transformOrigin:"450px 238px" }} transition={{ duration:reduced ? 0 : 2.1 }}/>) }
          {/* Slow guide stars orbit the four conceptual dimensions. Each star has a soft halo and a gentle pulse. */}
          {[{rx:205,ry:68,start:18,duration:18,size:2.4,color:"var(--cg-accent)"},{rx:220,ry:76,start:142,duration:23,size:1.8,color:"var(--cg-growth)"},{rx:235,ry:84,start:258,duration:20,size:2.1,color:"var(--cg-values)"},{rx:250,ry:92,start:326,duration:27,size:1.6,color:"var(--cg-accent)"},{rx:265,ry:100,start:74,duration:24,size:1.9,color:"var(--cg-growth)"}].map((star,i) => {
            const radians = star.start * Math.PI / 180;
            const x = 450 + Math.cos(radians) * star.rx;
            const y = 238 + Math.sin(radians) * star.ry;
            return <motion.g key={`guide-star-${i}`} initial={{ opacity:0 }} animate={{ opacity:beat === 4 ? 1 : 0 }} transition={{ duration:.6, delay:i*.08 }}>
              <motion.g animate={{ rotate:beat === 4 && !reduced ? [star.start, star.start + 360] : star.start }} transition={{ duration:reduced ? 0 : star.duration, repeat:reduced ? 0 : Infinity, ease:"linear" }} style={{ transformOrigin:"450px 238px" }}>
                <circle cx={x} cy={y} r={star.size * 3.4} fill={star.color} opacity=".13" filter="url(#intro-soft)" />
                <motion.circle cx={x} cy={y} r={star.size} fill={star.color} animate={{ opacity:reduced ? .8 : [.35,1,.35], scale:reduced ? 1 : [.8,1.3,.8] }} transition={{ duration:reduced ? 0 : 2.4 + i*.35, repeat:reduced ? 0 : Infinity, delay:i*.2 }} />
              </motion.g>
            </motion.g>;
          })}
          <circle cx="450" cy="238" r="42" fill="url(#intro-core)" opacity=".88" filter="url(#intro-glow)"/>
          <circle cx="450" cy="238" r="84" fill="url(#intro-halo)" opacity=".46" filter="url(#intro-soft)"/>
        </motion.g>

        <motion.g animate={{ opacity:beat === 5 ? 1 : 0 }} transition={{ duration:.9 }}>
          <circle cx="450" cy="238" r="128" fill="url(#intro-halo)" opacity=".5" filter="url(#intro-soft)"/>
          <circle cx="450" cy="238" r="49" fill="url(#intro-core)" stroke="var(--cg-accent)" strokeOpacity=".54" filter="url(#intro-glow)"/>
          <ellipse cx="450" cy="238" rx="92" ry="25" fill="none" stroke="var(--cg-accent)" strokeOpacity=".44" transform="rotate(-28 450 238)"/>
          {[{rx:118,ry:38,duration:7,delay:0,color:"var(--cg-accent)"},{rx:150,ry:52,duration:10,delay:1.4,color:"var(--cg-growth)"},{rx:182,ry:68,duration:13,delay:2.8,color:"var(--cg-values)"}].map((orbit,i) => <g key={`final-orbit-${i}`}>
            <ellipse cx="450" cy="238" rx={orbit.rx} ry={orbit.ry} fill="none" stroke={orbit.color} strokeOpacity=".3" strokeWidth="1" strokeDasharray="2 9" transform={`rotate(${i*34-20} 450 238)`}/>
            <motion.g animate={{ rotate:[0,360] }} transition={{ duration:orbit.duration, delay:orbit.delay, repeat:Infinity, ease:"linear" }} style={{ transformOrigin:"450px 238px" }}>
              <motion.circle cx={450 + orbit.rx} cy="238" r={i===0 ? 6 : 4.5} fill={orbit.color} filter="url(#intro-glow)" animate={{ opacity:[.35,1,.35], scale:[.75,1.25,.75] }} transition={{ duration:2.2+i*.4, repeat:Infinity, ease:"easeInOut" }}/>
            </motion.g>
          </g>)}
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
