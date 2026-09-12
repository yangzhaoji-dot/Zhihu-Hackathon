"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, Orbit } from "lucide-react";
import { changeLocale } from "@/i18n";
import { hash } from "@/lib/cognitive-galaxy/model";
import styles from "./space.module.css";

const FAR_STARS = Array.from({ length: 260 }, (_, i) => {
  const h = hash(`background-${i}`);
  return {
    id:i,
    x:h % 1600,
    y:hash(`background-y-${i}`) % 1000,
    r:i % 41 === 0 ? 1.7 : i % 13 === 0 ? 1 : .48,
    opacity:.16 + h % 52 / 100,
  };
});
const NEAR_MOTES = Array.from({ length: 38 }, (_, i) => ({
  id:i,
  x:hash(`near-x-${i}`) % 1600,
  y:hash(`near-y-${i}`) % 1000,
  r:i % 7 === 0 ? 2.3 : 1.15,
  delay:(hash(`near-delay-${i}`) % 70) / 10,
}));

export function SpaceBackdrop() {
  return <div className={styles.backdrop} aria-hidden="true">
    <div className={styles.deepField} />
    <div className={`${styles.nebulaField} ${styles.nebulaBlue}`} />
    <div className={`${styles.nebulaField} ${styles.nebulaViolet}`} />
    <div className={`${styles.nebulaField} ${styles.nebulaGold}`} />
    <div className={`${styles.nebulaField} ${styles.nebulaTeal}`} />
    <svg className={styles.lightBands} viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="cg-band-a" x1="0" x2="1"><stop stopColor="var(--cg-growth)" stopOpacity="0"/><stop offset=".48" stopColor="var(--cg-growth)" stopOpacity=".2"/><stop offset="1" stopColor="var(--cg-values)" stopOpacity="0"/></linearGradient>
        <linearGradient id="cg-band-b" x1="0" x2="1"><stop stopColor="var(--cg-resources)" stopOpacity="0"/><stop offset=".55" stopColor="var(--cg-resources)" stopOpacity=".13"/><stop offset="1" stopColor="var(--cg-health)" stopOpacity="0"/></linearGradient>
        <filter id="cg-band-blur"><feGaussianBlur stdDeviation="8"/></filter>
      </defs>
      <path d="M-120 760 C260 520 520 620 790 470 S1310 180 1740 350" fill="none" stroke="url(#cg-band-a)" strokeWidth="32" filter="url(#cg-band-blur)"/>
      <path d="M-80 830 C330 690 520 740 910 590 S1320 370 1690 430" fill="none" stroke="url(#cg-band-b)" strokeWidth="14" filter="url(#cg-band-blur)"/>
      <path d="M80 125 C420 250 565 145 890 235 S1370 510 1590 420" fill="none" stroke="var(--cg-line)" strokeWidth=".7" strokeDasharray="3 17" opacity=".5"/>
    </svg>
    <svg className={styles.stars} viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
      {FAR_STARS.map((star) => <circle key={star.id} cx={star.x} cy={star.y} r={star.r} fill="currentColor" opacity={star.opacity} />)}
    </svg>
    <svg className={styles.motes} viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
      {NEAR_MOTES.map((mote) => <circle key={mote.id} cx={mote.x} cy={mote.y} r={mote.r} fill="currentColor" style={{ animationDelay:`-${mote.delay}s` }} />)}
    </svg>
    <div className={styles.haze} />
    <div className={styles.grain} />
  </div>;
}

export function SpaceShell({ children, extra, map = false }: { children: ReactNode; extra?: ReactNode; map?: boolean }) {
  const { t, i18n } = useTranslation("galaxy");
  return <div className={styles.shell} data-map={map} data-el="cognitive-galaxy-root">
    <SpaceBackdrop />
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label={t("home")}><Orbit size={24} strokeWidth={1.1} /><span>{t("brand")}<small>{t("archive")}</small></span></Link>
      <div className={styles.headerActions}>{extra}<button type="button" onClick={() => void changeLocale(i18n.resolvedLanguage === "zh-CN" ? "en-US" : "zh-CN")}>{t("language")} <ArrowUpRight size={12} /></button></div>
    </header>
    {children}
  </div>;
}
