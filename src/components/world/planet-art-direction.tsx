"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { buildPlanetSceneSpec } from "@/lib/opinion/planet-scene-spec";
import { loadOpinionWorldEntry } from "@/lib/opinion/world-session";
import styles from "./planet-art-direction.module.css";

function ForestBackdrop() {
  return (
    <svg className={styles.backdrop} viewBox="0 0 1600 1000" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="forestSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#081712" />
          <stop offset="0.46" stopColor="#163127" />
          <stop offset="1" stopColor="#233f31" />
        </linearGradient>
        <linearGradient id="forestGround" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1b3428" />
          <stop offset="0.55" stopColor="#2c4937" />
          <stop offset="1" stopColor="#152b24" />
        </linearGradient>
        <linearGradient id="pathLight" x1="0" y1="1" x2="0.65" y2="0">
          <stop offset="0" stopColor="#7d8f63" stopOpacity="0.18" />
          <stop offset="0.58" stopColor="#a7b47c" stopOpacity="0.38" />
          <stop offset="1" stopColor="#d4c38b" stopOpacity="0.16" />
        </linearGradient>
        <radialGradient id="sanctuaryGlow">
          <stop offset="0" stopColor="#d3d993" stopOpacity="0.46" />
          <stop offset="0.42" stopColor="#94aa77" stopOpacity="0.16" />
          <stop offset="1" stopColor="#5f806b" stopOpacity="0" />
        </radialGradient>
        <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
        <filter id="mistBlur" x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="26" />
        </filter>
      </defs>

      <rect width="1600" height="1000" fill="url(#forestSky)" />
      <path d="M0 290 C160 188 305 208 428 265 C558 324 680 226 818 211 C970 194 1066 279 1197 249 C1348 215 1484 142 1600 190 L1600 0 L0 0 Z" fill="#07130f" opacity="0.96" />
      <path d="M0 365 C184 280 300 328 437 364 C608 408 710 280 889 292 C1062 303 1180 373 1344 311 C1450 270 1523 266 1600 292 L1600 118 L0 160 Z" fill="#0d211a" opacity="0.9" />
      <rect y="300" width="1600" height="700" fill="url(#forestGround)" />

      <g opacity="0.86">
        <ellipse cx="191" cy="480" rx="210" ry="180" fill="#173226" />
        <ellipse cx="1430" cy="430" rx="260" ry="218" fill="#122b23" />
        <ellipse cx="302" cy="790" rx="310" ry="220" fill="#1b392a" />
        <ellipse cx="1318" cy="812" rx="340" ry="246" fill="#183126" />
      </g>

      <path d="M770 1005 C765 895 729 835 755 744 C779 659 867 621 887 545 C903 482 874 429 909 359 C942 291 1016 259 1091 250"
        stroke="url(#pathLight)" strokeWidth="142" fill="none" strokeLinecap="round" opacity="0.48" />
      <path d="M767 1005 C760 894 741 839 767 753 C792 673 870 634 896 548 C916 485 894 425 923 365 C956 298 1014 273 1087 251"
        stroke="#6d805e" strokeWidth="48" fill="none" strokeLinecap="round" opacity="0.26" />
      <path d="M767 1005 C760 894 741 839 767 753 C792 673 870 634 896 548 C916 485 894 425 923 365 C956 298 1014 273 1087 251"
        stroke="#c8c48e" strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray="4 26" opacity="0.2" />

      <g transform="translate(1018 164)">
        <ellipse cx="89" cy="111" rx="178" ry="138" fill="url(#sanctuaryGlow)" filter="url(#softGlow)" />
        <path d="M-55 149 C-12 100 4 62 22 5 C46 58 60 81 89 104 C117 82 137 57 158 10 C170 77 192 113 232 148 C170 133 132 141 91 173 C50 142 9 134 -55 149 Z" fill="#162d22" />
        <path d="M27 152 C49 119 54 92 52 57 C82 88 103 102 128 109 C157 97 177 78 198 48 C195 91 201 119 220 151 C168 137 128 147 92 177 C73 157 50 148 27 152 Z" fill="#284736" />
        <path d="M72 160 C80 126 86 99 90 66 C100 100 110 125 126 159" stroke="#83906b" strokeWidth="8" fill="none" opacity="0.72" />
        <path d="M67 163 C48 177 28 188 2 194 M130 164 C153 177 179 184 205 191" stroke="#4b624c" strokeWidth="11" fill="none" strokeLinecap="round" />
        <ellipse cx="99" cy="164" rx="45" ry="16" fill="#78916a" opacity="0.16" />
        <circle cx="93" cy="117" r="7" fill="#d7d69b" opacity="0.8" />
        <circle cx="93" cy="117" r="24" fill="#c6cf8a" opacity="0.14" filter="url(#softGlow)" />
      </g>

      <g transform="translate(235 250)" opacity="0.78">
        <path d="M0 174 L18 53 L86 21 L164 39 L183 175 Z" fill="#26382f" />
        <path d="M23 169 L39 70 L87 48 L145 60 L158 170 Z" fill="#34473b" />
        <rect x="61" y="88" width="41" height="63" rx="4" fill="#17241f" />
        <path d="M32 78 L87 48 L151 62" stroke="#70836a" strokeWidth="5" opacity="0.45" />
        <path d="M26 164 C52 140 76 136 105 145 C126 151 148 146 167 134" stroke="#6e855e" strokeWidth="10" opacity="0.55" fill="none" />
        <circle cx="61" cy="80" r="13" fill="#587453" />
        <circle cx="136" cy="97" r="18" fill="#486548" />
      </g>

      <g opacity="0.86">
        <path d="M184 622 C229 588 273 583 322 607 C367 629 394 668 427 709 C355 676 300 676 246 700 C215 680 195 653 184 622 Z" fill="#244433" />
        <path d="M1283 588 C1345 548 1416 560 1484 615 C1522 646 1551 699 1600 733 L1600 865 C1544 828 1492 804 1425 807 C1370 762 1320 690 1283 588 Z" fill="#1e3a2d" />
      </g>

      <g fill="#b4c987" opacity="0.48">
        <circle cx="580" cy="612" r="4" /><circle cx="610" cy="588" r="2.7" /><circle cx="655" cy="630" r="3.2" />
        <circle cx="1180" cy="406" r="3.7" /><circle cx="1214" cy="435" r="2.2" /><circle cx="1247" cy="392" r="3" />
        <circle cx="420" cy="805" r="2.6" /><circle cx="466" cy="781" r="3.4" /><circle cx="505" cy="831" r="2" />
      </g>

      <g filter="url(#mistBlur)" fill="#9eb8a8" opacity="0.09">
        <ellipse cx="458" cy="497" rx="260" ry="82" />
        <ellipse cx="1129" cy="667" rx="310" ry="96" />
        <ellipse cx="872" cy="298" rx="235" ry="62" />
      </g>
    </svg>
  );
}

function ForestForeground() {
  return (
    <svg className={styles.foreground} viewBox="0 0 1600 1000" preserveAspectRatio="none" aria-hidden>
      <g fill="#07150f" opacity="0.92">
        <path d="M0 760 C103 697 174 710 242 772 C177 810 126 866 91 1000 L0 1000 Z" />
        <path d="M1600 699 C1493 675 1438 718 1388 789 C1443 834 1492 902 1514 1000 L1600 1000 Z" />
      </g>
      <g fill="none" stroke="#0a1d15" strokeLinecap="round">
        <path d="M-12 1004 C102 901 121 832 131 724 C161 803 201 854 276 907" strokeWidth="24" />
        <path d="M1608 1008 C1515 918 1482 824 1490 735 C1451 810 1412 864 1342 912" strokeWidth="26" />
      </g>
      <g fill="#183225" opacity="0.96">
        <ellipse cx="109" cy="830" rx="74" ry="32" transform="rotate(-28 109 830)" />
        <ellipse cx="172" cy="884" rx="85" ry="34" transform="rotate(16 172 884)" />
        <ellipse cx="1487" cy="823" rx="82" ry="33" transform="rotate(24 1487 823)" />
        <ellipse cx="1418" cy="891" rx="92" ry="38" transform="rotate(-18 1418 891)" />
      </g>
      <path d="M0 1000 L0 928 C194 904 308 944 403 1000 Z" fill="#091811" opacity="0.85" />
      <path d="M1600 1000 L1600 912 C1452 909 1337 947 1245 1000 Z" fill="#081710" opacity="0.88" />
    </svg>
  );
}

export function PlanetArtDirection({ opinionId }: { opinionId: string }) {
  const entry = useMemo(() => loadOpinionWorldEntry(opinionId), [opinionId]);
  const scene = useMemo(() => entry ? buildPlanetSceneSpec(entry.opinion) : null, [entry]);
  const [worldEl, setWorldEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (scene?.biome !== "forest" || typeof document === "undefined") return;
    let raf = 0;
    const findWorld = () => {
      const candidate = document.querySelector<HTMLElement>('[data-el="world-runtime"] [data-world-theme]');
      if (!candidate) {
        raf = window.requestAnimationFrame(findWorld);
        return;
      }
      candidate.classList.add(styles.forestWorld);
      setWorldEl(candidate);
    };
    raf = window.requestAnimationFrame(findWorld);
    return () => {
      window.cancelAnimationFrame(raf);
      worldEl?.classList.remove(styles.forestWorld);
    };
  }, [scene?.biome, worldEl]);

  if (!worldEl || scene?.biome !== "forest") return null;

  return createPortal(
    <>
      <ForestBackdrop />
      <div className={styles.groundLight} aria-hidden />
      <ForestForeground />
    </>,
    worldEl,
  );
}
