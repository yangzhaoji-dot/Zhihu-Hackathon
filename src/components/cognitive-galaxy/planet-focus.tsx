"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ExternalLink, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { safeSourceUrl, type Galaxy, type GalaxyNode } from "@/lib/cognitive-galaxy/model";
import type { RelationType } from "@/lib/opinion/types";
import styles from "./galaxy.module.css";

const INTERACTIVE_PLANET_ROUTES: Record<string, string> = {
  o_stoploss: "o_stoploss",
  // The first health opinion in the authored demo is the visual stand-in for
  // the grounded stop-loss sample. Its evolution is still written back to
  // demo-health-0 in the originating demo galaxy.
  "demo-health-0": "o_stoploss",
};

function relationLabel(type:RelationType) {
  return ({ support:"支持",refute:"反驳",add:"补充",cond:"条件",oppose:"对立" } as const)[type];
}

export function PlanetFocus({ node, galaxy, onClose }: { node: GalaxyNode; galaxy: Galaxy; onClose: () => void }) {
  const { t } = useTranslation("galaxy");
  const router = useRouter();
  const search = useSearchParams();
  const reduced = useReducedMotion();
  const [landed, setLanded] = useState(false);
  const opinion = node.opinion;
  const sources = galaxy.graph.sources.filter((source) => opinion.sourceIds.includes(source.id));
  const related = galaxy.graph.relations.filter((relation) => relation.from === opinion.id || relation.to === opinion.id);
  const relatedViews = related.map((relation) => {
    const otherId=relation.from===opinion.id ? relation.to : relation.from;
    const other=galaxy.graph.opinions.find((item) => item.id===otherId);
    return other ? {relation,other} : null;
  }).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const mapped = INTERACTIVE_PLANET_ROUTES[opinion.id];
  const canLand = Boolean(mapped || opinion.sourceIds.length > 0);
  const land = () => {
    if (canLand) {
      const targetOpinionId = mapped ?? opinion.id;
      const params = new URLSearchParams({ galaxy: galaxy.graph.questionId, origin: opinion.id });
      const cluster = search.get("cluster");
      if (cluster) params.set("cluster", cluster);
      router.push(`/world/${encodeURIComponent(targetOpinionId)}?${params.toString()}`);
      return;
    }
    setLanded(true);
  };
  return <motion.aside className={styles.focus} aria-label={t("focusSummary")} data-el="planet-focus" initial={{ opacity:0, y:reduced ? 0 : 12 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:reduced ? 0 : .35 }}>
    <button type="button" className={styles.focusClose} onClick={onClose} aria-label={t("close")}><X size={16}/></button>
    <span className={styles.eyebrow}>{t("focusKicker")}</span>
    <h2>{opinion.title}</h2>
    {opinion.summary !== opinion.title && <p className={styles.summary}>{opinion.summary}</p>}
    <div className={styles.metadata}>
      <span>{node.sourceCount ? t("sourceCount",{ count:node.sourceCount }) : t("sourceMissing")}</span>
      {related.length > 0 && <span>{t("relatedCount",{ count:related.length })}</span>}
      {opinion.derivedFrom?.length ? <span>AI 辅助形成</span> : null}
    </div>
    {relatedViews.length > 0 && <div data-el="planet-relations" style={{display:"grid",gap:7,margin:"0 0 18px"}}>
      <span style={{fontSize:9,letterSpacing:".13em",color:"var(--cg-dim)"}}>与其他观点的关系</span>
      {relatedViews.slice(0,4).map(({relation,other}) => <div key={`${relation.from}-${relation.to}`} style={{display:"grid",gridTemplateColumns:"44px 1fr",gap:8,alignItems:"start",padding:"8px 10px",border:"1px solid var(--cg-line)",borderRadius:8,background:"rgba(13,29,47,.42)"}}><strong style={{fontSize:9,fontWeight:500,color:"var(--cg-accent)"}}>{relationLabel(relation.type)}</strong><span style={{fontSize:10,lineHeight:1.55,color:"var(--cg-muted)"}}>{other.title}</span></div>)}
    </div>}
    {sources.slice(0,3).map((source,index) => {
      const url = safeSourceUrl(source.url);
      return url ? <a key={source.id} className={styles.sourceLink} href={url} target="_blank" rel="noopener noreferrer">{t("sourceRead")} {index+1} <ExternalLink size={11} style={{ display:"inline" }}/></a> : null;
    })}
    {galaxy.demo && <p className={styles.notice}>{t("demoNotice")}</p>}
    {!landed ? <button type="button" className={styles.landing} onClick={land} data-el="land-planet">{t("landing")}<ArrowRight size={16}/></button> : <div className={styles.endNote} role="status"><h3>{t("landingSoon")}</h3><p>{t("landingDetail")}</p><button type="button" onClick={onClose}>{t("backToCluster")} →</button></div>}
  </motion.aside>;
}
