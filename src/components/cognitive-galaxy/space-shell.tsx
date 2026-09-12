"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, Orbit } from "lucide-react";
import { changeLocale } from "@/i18n";
import { hash } from "@/lib/cognitive-galaxy/model";
import styles from "./space.module.css";

export function SpaceBackdrop() {
  return <div className={styles.backdrop} aria-hidden="true">
    <div className={styles.nebula} />
    <svg className={styles.stars} viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
      {Array.from({ length: 180 }, (_, i) => {
        const h = hash(`background-${i}`);
        return <circle key={i} cx={h % 1600} cy={hash(`y-${i}`) % 1000} r={i % 23 === 0 ? 1.3 : .55} fill="currentColor" opacity={.12 + h % 45 / 100} />;
      })}
    </svg>
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
