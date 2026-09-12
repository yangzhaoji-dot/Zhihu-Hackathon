"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ExternalLink, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { safeSourceUrl, type Galaxy, type GalaxyNode } from "@/lib/cognitive-galaxy/model";
import styles from "./galaxy.module.css";

const INTERACTIVE_PLANETS = new Set(["o_stoploss"]);

export function PlanetFocus({ node, galaxy, onClose }: { node: GalaxyNode; galaxy: Galaxy; onClose: () => void }) {
  const { t } = useTranslation("galaxy");
  const router = useRouter();
  const reduced = useReducedMotion();
  const [landed, setLanded] = useState(false);
  const opinion = node.opinion;
  const sources = galaxy.graph.sources.filter((source) => opinion.sourceIds.includes(source.id));
  const related = galaxy.graph.relations.filter((relation) => relation.from === opinion.id || relation.to === opinion.id);
  const land = () => {
    if (INTERACTIVE_PLANETS.has(opinion.id)) {
      router.push(`/world/${encodeURIComponent(opinion.id)}`);
      return;
    }
    setLanded(true);
  };
  return <motion.aside className={styles.focus} aria-label={t("focusSummary")} data-el="planet-focus" initial={{ opacity:0, y:reduced ? 0 : 12 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:reduced ? 0 : .35 }}>
    <button type="button" className={styles.focusClose} onClick={onClose} aria-label={t("close")}><X size={16}/></button>
    <span className={styles.eyebrow}>{t("focusKicker")}</span>
    <h2>{opinion.title}</h2>
    {opinion.summary !== opinion.title && <p className={styles.summary}>{opinion.summary}</p>}
    <div className={styles.metadata}><span>{node.sourceCount ? t("sourceCount",{ count:node.sourceCount }) : t("sourceMissing")}</span>{related.length > 0 && <span>{t("relatedCount",{ count:related.length })}</span>}</div>
    {sources.slice(0,3).map((source,index) => {
      const url = safeSourceUrl(source.url);
      return url ? <a key={source.id} className={styles.sourceLink} href={url} target="_blank" rel="noopener noreferrer">{t("sourceRead")} {index+1} <ExternalLink size={11} style={{ display:"inline" }}/></a> : null;
    })}
    {galaxy.demo && <p className={styles.notice}>{t("demoNotice")}</p>}
    {!landed ? <button type="button" className={styles.landing} onClick={land} data-el="land-planet">{t("landing")}<ArrowRight size={16}/></button> : <div className={styles.endNote} role="status"><h3>{t("landingSoon")}</h3><p>{t("landingDetail")}</p><button type="button" onClick={onClose}>{t("backToCluster")} →</button></div>}
  </motion.aside>;
}
