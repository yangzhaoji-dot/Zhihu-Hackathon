"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Search, RotateCcw, LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SpaceShell } from "@/components/cognitive-galaxy/space-shell";
import { Opening } from "@/components/cognitive-galaxy/opening";
import { searchGalaxy } from "@/lib/api/cognitive-galaxy";
import type { ZhihuQuestionCandidate } from "@/lib/api/opinion";
import { galaxyUrl, saveGalaxy } from "@/lib/cognitive-galaxy/session";
import { DEMO_ID } from "@/lib/cognitive-galaxy/demo";
import styles from "@/components/cognitive-galaxy/home.module.css";

const INTRO_KEY = "cognitive-galaxy:intro:v1";
const RECOMMENDATIONS = [
  { key:"aiTitle", query:"AI 会取代程序员吗", type:"02" },
  { key:"studyTitle", query:"读研真的值得吗", type:"03" },
  { key:"gradeTitle", query:"大学应该卷绩点还是做项目", type:"04" },
];

export default function Home() {
  const { t } = useTranslation("galaxy");
  const router = useRouter();
  const reduced = useReducedMotion();
  const [intro, setIntro] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<ZhihuQuestionCandidate[]>([]);
  const [resolvedQuery, setResolvedQuery] = useState("");
  const controller = useRef<AbortController | null>(null);
  const searchInput = useRef<HTMLInputElement | null>(null);
  const requestId = useRef(0);
  const invalidateRequests = useCallback(() => {
    requestId.current += 1;
    controller.current?.abort();
    controller.current = null;
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try { if (!localStorage.getItem(INTRO_KEY) && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) setIntro(true); } catch { /* Still allow use when storage is blocked. */ }
    });
    return () => { cancelAnimationFrame(frame); invalidateRequests(); };
  }, [invalidateRequests]);
  const finishIntro = useCallback(() => {
    try { localStorage.setItem(INTRO_KEY, "seen"); } catch { /* Optional preference. */ }
    setIntro(false);
    window.setTimeout(() => searchInput.current?.focus({ preventScroll:true }), 80);
  }, []);

  const runSearch = async (text: string, candidate?: ZhihuQuestionCandidate) => {
    const clean = text.trim();
    if (!clean) { setError("emptySearch"); searchInput.current?.focus(); return; }
    controller.current?.abort();
    const abort = new AbortController(); controller.current = abort;
    const id = ++requestId.current;
    setBusy(true); setError(null); setQuery(clean);
    if (!candidate) setCandidates([]);
    let timedOut = false;
    const timeout = window.setTimeout(() => { timedOut = true; abort.abort(); }, 65000);
    try {
      const result = await searchGalaxy(clean, candidate?.url, candidate?.title, abort.signal);
      if (id !== requestId.current) return;
      if (result.selectionRequired) {
        setResolvedQuery(result.query); setCandidates(result.questions);
        if (!result.questions.length) setError("noCandidates");
      } else {
        saveGalaxy(result.graph);
        router.push(galaxyUrl(result.graph.questionId));
      }
    } catch (cause) {
      if (id !== requestId.current) return;
      if (abort.signal.aborted && !timedOut) return;
      const code = cause instanceof Error ? cause.message : "";
      setError(timedOut ? "searchTimeout" : /auth|cli_unavailable/.test(code) ? "searchUnavailable" : /rate_limited/.test(code) ? "searchLimited" : /no_zhihu|not_enough|no_question/.test(code) ? "searchEmpty" : "searchFailed");
    } finally {
      clearTimeout(timeout);
      if (id === requestId.current) { setBusy(false); controller.current = null; }
    }
  };
  const cancelSearch = () => { invalidateRequests(); setBusy(false); };

  return <SpaceShell extra={<button type="button" onClick={() => setIntro(true)}><RotateCcw size={13}/>{t("replay")}</button>}>
    <div inert={intro}>
      <main className={styles.home} data-el="galaxy-home">
        <div className={styles.celestial} aria-hidden="true"><div className={styles.orbitA}/><div className={styles.orbitB}/><div className={styles.rim}/><div className={styles.globe}/><div className={styles.smallMoon}/></div>
        <motion.section className={styles.hero} initial={{ opacity:0, y:18 }} animate={{ opacity:1, y:0 }} transition={{ duration:reduced ? 0 : .8 }}>
          <p className={styles.kicker}><span/>{t("heroKicker")}</p>
          <h1>{t("heroTitle")}</h1>
          <p className={styles.description}>{t("heroDescription")}</p>
          <form className={styles.search} onSubmit={(event) => { event.preventDefault(); void runSearch(query); }}>
            <Search size={19} strokeWidth={1.5} aria-hidden="true"/>
            <input ref={searchInput} value={query} onChange={(event) => setQuery(event.target.value)} aria-label={t("searchLabel")} placeholder={t("searchPlaceholder")} maxLength={240} disabled={busy} autoComplete="off"/>
            <button type="submit" disabled={busy} aria-label={t("search")}>{busy ? <LoaderCircle size={19} className={styles.spinner}/> : <ArrowRight size={21}/>}</button>
          </form>
          <div className={styles.feedback} aria-live="polite">
            {busy && <p>{t("searching")} <button type="button" onClick={cancelSearch}>{t("cancel")}</button></p>}
            {error && <p role="alert">{t(error)}</p>}
          </div>
          {candidates.length > 0 && <section className={styles.candidates} aria-label={t("selectQuestion")}><h2>{t("selectQuestion")}</h2>{candidates.map((candidate) => <button type="button" key={candidate.url} disabled={busy} onClick={() => void runSearch(resolvedQuery, candidate)}><span>{candidate.title}</span><ArrowUpRight size={15}/></button>)}</section>}
        </motion.section>
        <section className={styles.recommendations} aria-label={t("recommendations")}>
          <div className={styles.sectionLabel}><span>{t("recommendations")}</span><i/></div>
          <div className={styles.cards}>
            <Link href={galaxyUrl(DEMO_ID)} className={`${styles.card} ${styles.demoCard}`} data-el="enter-demo"><span className={styles.cardIndex}>01 / <b>{t("demo")}</b></span><h2>{t("demoTitle")}</h2><small>{t("demoMeta")}</small><ArrowUpRight className={styles.cardArrow} size={17}/></Link>
            {RECOMMENDATIONS.map((item) => <button type="button" className={styles.card} key={item.key} disabled={busy} onClick={() => void runSearch(item.query)}><span className={styles.cardIndex}>{item.type} /</span><h2>{t(item.key)}</h2><small>{t("liveRecommendation")}</small><ArrowUpRight className={styles.cardArrow} size={17}/></button>)}
          </div>
        </section>
      </main>
      <footer className={styles.footer}><span>{t("homeFootnote")}</span><small>{t("phase")}</small></footer>
    </div>
    <AnimatePresence>{intro && <Opening onDone={finishIntro}/>}</AnimatePresence>
  </SpaceShell>;
}
