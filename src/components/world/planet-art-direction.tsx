"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { buildPlanetSceneSpec } from "@/lib/opinion/planet-scene-spec";
import { loadOpinionWorldEntry } from "@/lib/opinion/world-session";
import styles from "./planet-art-direction.module.css";

function ForestBackdrop() {
  return (
    <svg className={styles.backdrop} viewBox="0 0 1920 1152" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#07110f" />
          <stop offset=".44" stopColor="#13251f" />
          <stop offset="1" stopColor="#27382f" />
        </linearGradient>
        <linearGradient id="ground" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#26392f" />
          <stop offset=".48" stopColor="#31473a" />
          <stop offset="1" stopColor="#1b3028" />
        </linearGradient>
        <linearGradient id="clearing" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#71806a" stopOpacity=".15" />
          <stop offset="1" stopColor="#9d9b72" stopOpacity=".035" />
        </linearGradient>
        <linearGradient id="trunk" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#243027" />
          <stop offset=".45" stopColor="#44503d" />
          <stop offset="1" stopColor="#202a23" />
        </linearGradient>
        <filter id="mist" x="-25%" y="-60%" width="150%" height="220%">
          <feGaussianBlur stdDeviation="32" />
        </filter>
        <filter id="soft" x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
      </defs>

      <rect width="1920" height="1152" fill="url(#sky)" />

      {/* very distant forest */}
      <path d="M0 308 C152 239 281 247 408 284 C538 321 640 225 781 237 C925 250 1014 313 1154 280 C1296 248 1424 191 1556 227 C1682 261 1788 223 1920 194 L1920 0 L0 0 Z" fill="#06100d" opacity=".96" />
      <path d="M0 405 C165 334 292 357 431 400 C566 442 702 321 858 334 C1006 347 1123 429 1272 382 C1415 337 1534 297 1671 331 C1768 355 1846 334 1920 319 L1920 126 L0 154 Z" fill="#0c1d17" opacity=".9" />

      {/* distant trunks create a real vertical forest rhythm */}
      <g opacity=".54" fill="#101f19">
        <path d="M98 96 L147 86 L173 456 L118 478 Z" />
        <path d="M332 55 L383 63 L401 446 L346 463 Z" />
        <path d="M602 110 L646 94 L663 432 L617 449 Z" />
        <path d="M902 46 L955 50 L963 428 L913 445 Z" />
        <path d="M1194 91 L1238 76 L1254 445 L1207 457 Z" />
        <path d="M1482 39 L1539 49 L1546 430 L1494 452 Z" />
        <path d="M1748 92 L1798 79 L1816 438 L1763 461 Z" />
      </g>

      <rect y="382" width="1920" height="770" fill="url(#ground)" />

      {/* open pockets of forest floor: readable places to walk */}
      <ellipse cx="517" cy="675" rx="405" ry="236" fill="#3c5544" opacity=".28" />
      <ellipse cx="1105" cy="795" rx="520" ry="286" fill="#435a48" opacity=".22" />
      <ellipse cx="1588" cy="617" rx="326" ry="246" fill="#31483b" opacity=".24" />
      <path d="M293 1116 C431 928 574 891 735 835 C917 772 1038 662 1167 548 C1290 438 1439 414 1598 430 C1458 516 1352 611 1264 731 C1170 859 1057 942 902 995 C695 1066 494 1101 293 1116 Z" fill="url(#clearing)" />

      {/* rock and root masses to break the green plane */}
      <g opacity=".62">
        <path d="M73 686 C161 603 267 592 360 651 C320 715 260 753 177 760 C132 746 98 722 73 686 Z" fill="#25382f" />
        <path d="M1427 742 C1501 654 1612 634 1719 692 C1775 723 1818 785 1869 844 C1772 805 1680 808 1599 846 C1523 835 1462 801 1427 742 Z" fill="#20372d" />
        <path d="M729 555 C785 507 852 505 911 543 C881 585 836 611 779 617 C756 599 739 578 729 555 Z" fill="#283c31" />
      </g>

      {/* old civilization fragments: scenery, not interaction */}
      <g opacity=".4" fill="#596258">
        <path d="M246 530 L274 468 L328 445 L365 473 L382 548 L338 550 L328 492 L285 500 L278 548 Z" />
        <rect x="306" y="492" width="21" height="56" fill="#253129" />
        <path d="M1299 492 L1320 439 L1387 426 L1431 457 L1447 530 L1402 533 L1392 475 L1348 479 L1341 533 L1298 531 Z" />
        <rect x="1357" y="474" width="21" height="59" fill="#253129" />
      </g>

      {/* soft atmosphere bands */}
      <g filter="url(#mist)" fill="#a8b7a7" opacity=".08">
        <ellipse cx="523" cy="489" rx="338" ry="82" />
        <ellipse cx="1140" cy="576" rx="452" ry="108" />
        <ellipse cx="1607" cy="423" rx="285" ry="74" />
        <ellipse cx="957" cy="963" rx="533" ry="104" />
      </g>

      {/* navigation warmth, intentionally local rather than moral coding */}
      <g filter="url(#soft)" opacity=".11">
        <ellipse cx="684" cy="713" rx="155" ry="92" fill="#d0ca90" />
        <ellipse cx="1315" cy="606" rx="130" ry="78" fill="#c1c789" />
      </g>

      {/* tiny forest life */}
      <g fill="#c0c98b" opacity=".32">
        <circle cx="427" cy="610" r="3" /><circle cx="463" cy="583" r="2" /><circle cx="496" cy="624" r="2.8" />
        <circle cx="976" cy="675" r="2.4" /><circle cx="1013" cy="650" r="3" /><circle cx="1042" cy="695" r="2" />
        <circle cx="1513" cy="564" r="2.6" /><circle cx="1547" cy="532" r="2.1" /><circle cx="1581" cy="579" r="3" />
      </g>
    </svg>
  );
}

function ForestForeground() {
  return (
    <svg className={styles.foreground} viewBox="0 0 1920 1152" preserveAspectRatio="none" aria-hidden>
      {/* close trunks create occlusion and depth around the walkable middle */}
      <g fill="url(#trunk)" opacity=".96">
        <path d="M-25 250 C23 220 77 233 111 278 L144 1152 L-30 1152 Z" />
        <path d="M1783 187 C1838 160 1894 178 1935 228 L1952 1152 L1791 1152 Z" />
      </g>
      <g fill="#102219" opacity=".92">
        <ellipse cx="65" cy="306" rx="176" ry="104" transform="rotate(-17 65 306)" />
        <ellipse cx="125" cy="432" rx="156" ry="91" transform="rotate(13 125 432)" />
        <ellipse cx="1844" cy="301" rx="188" ry="107" transform="rotate(20 1844 301)" />
        <ellipse cx="1801" cy="443" rx="166" ry="94" transform="rotate(-16 1801 443)" />
      </g>

      {/* low foliage frames the bottom without hiding the player */}
      <path d="M0 1152 L0 1017 C165 974 294 1004 418 1152 Z" fill="#0b1c14" opacity=".9" />
      <path d="M1920 1152 L1920 1000 C1760 981 1637 1034 1523 1152 Z" fill="#091a13" opacity=".92" />
      <g fill="#193326" opacity=".9">
        <ellipse cx="176" cy="1034" rx="107" ry="40" transform="rotate(-13 176 1034)" />
        <ellipse cx="302" cy="1093" rx="124" ry="44" transform="rotate(9 302 1093)" />
        <ellipse cx="1729" cy="1042" rx="117" ry="43" transform="rotate(17 1729 1042)" />
        <ellipse cx="1608" cy="1094" rx="133" ry="47" transform="rotate(-10 1608 1094)" />
      </g>

      {/* hanging branches above camera edges */}
      <g fill="none" stroke="#0b1a13" strokeLinecap="round">
        <path d="M0 87 C170 123 254 180 336 258" strokeWidth="29" />
        <path d="M1920 69 C1778 111 1679 172 1587 254" strokeWidth="31" />
      </g>
      <g fill="#142a20">
        <ellipse cx="244" cy="192" rx="84" ry="31" transform="rotate(27 244 192)" />
        <ellipse cx="1644" cy="185" rx="90" ry="33" transform="rotate(-24 1644 185)" />
      </g>
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
    let active: HTMLElement | null = null;
    const findWorld = () => {
      const candidate = document.querySelector<HTMLElement>('[data-el="world-runtime"] [data-world-theme]');
      if (!candidate) {
        raf = window.requestAnimationFrame(findWorld);
        return;
      }
      active = candidate;
      candidate.classList.add(styles.forestWorld);
      setWorldEl(candidate);
    };
    raf = window.requestAnimationFrame(findWorld);
    return () => {
      window.cancelAnimationFrame(raf);
      active?.classList.remove(styles.forestWorld);
    };
  }, [scene?.biome]);

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
