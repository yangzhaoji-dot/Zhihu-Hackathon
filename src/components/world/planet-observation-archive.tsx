"use client";

import { ArrowLeft, ExternalLink, Radar } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { readGalaxy } from "@/lib/cognitive-galaxy/session";
import type { OpinionGraph } from "@/lib/opinion/types";
import { AUTHORS, SOURCES } from "@/lib/opinion/seed-sources";
import styles from "./planet-observation-archive.module.css";

const OBSERVATION_META: Record<string, { label: string; note: string }> = {
  s1: {
    label: "恢复能力发生变化",
    note: "这条记录留下了一个关键转折：离开原环境之后，睡眠明显恢复。它与这颗星球关于“恢复存在边界”的法则产生了回响。",
  },
  s2: {
    label: "损耗由个体承担",
    note: "另一条记录指出了更残酷的一面：损耗发生在系统之中，后果却可能最终落在个体身上。它不能证明法则，却解释了为什么“继续留在原环境”值得被重新判断。",
  },
};

function isPlaceholder(url: string) {
  return /question\/0+\/answer\//.test(url) || url.includes("example");
}

function excerpt(value: string) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > 220 ? `${clean.slice(0, 220)}…` : clean;
}

export function PlanetObservationArchive({ opinionId }: { opinionId: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const galaxyId = search.get("galaxy");
  const originId = search.get("origin") || opinionId;
  const [graph, setGraph] = useState<OpinionGraph | null | undefined>(undefined);

  useEffect(() => {
    setGraph(galaxyId ? readGalaxy(galaxyId) : null);
  }, [galaxyId]);

  const liveOpinion = useMemo(
    () => graph?.opinions.find((item) => item.id === originId || item.id === opinionId) ?? null,
    [graph, opinionId, originId],
  );

  const liveObservations = useMemo(() => {
    if (!graph || !liveOpinion) return [];
    return graph.sources
      .filter((source) => liveOpinion.sourceIds.includes(source.id))
      .slice(0, 2)
      .map((source, index) => ({
        source,
        author: graph.authors.find((author) => author.id === source.authorId) ?? null,
        meta: {
          label: index === 0 ? "这颗星球最先捕获的声音" : "另一条留下来的声音",
          note: "这条知乎记录参与形成了当前观点。它不是数学法则的证明，而是帮助我们判断这条法则是否真正照到现实细节的一块原始材料。",
        },
      }));
  }, [graph, liveOpinion]);

  const demoObservations = SOURCES.filter((source) => source.id === "s1" || source.id === "s2").map((source) => ({
    source,
    author: AUTHORS.find((author) => author.id === source.authorId) ?? null,
    meta: OBSERVATION_META[source.id],
  }));

  const observations = liveObservations.length ? liveObservations : demoObservations;
  const live = liveObservations.length > 0;
  const opinionTitle = liveOpinion?.title ?? "长期消耗身心的工作，离开也可以是一种止损。";
  const totalLiveSources = liveOpinion?.sourceIds.length ?? observations.length;

  const backToLaw = () => {
    const params = new URLSearchParams(search.toString());
    router.push(`/world/${encodeURIComponent(opinionId)}${params.size ? `?${params.toString()}` : ""}`);
  };

  return (
    <main className={styles.page} data-el="planet-observation-archive">
      <header className={styles.topbar}>
        <button type="button" onClick={backToLaw} className={styles.backButton}>
          <ArrowLeft size={15} />
          返回星球法则
        </button>
        <span>ECHO ARCHIVE · {live ? "LIVE" : "01"}</span>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroIcon}><Radar size={22} /></div>
        <div>
          <span className={styles.eyebrow}>人类纪元 · 遗声档案</span>
          <h1>这些声音曾经真实地回答过这个问题。</h1>
          <p>
            法则只负责揭示结构。到了这里，我们重新回到那些被保留下来的知乎回答：看是谁写下它们，
            他们怎样描述自己的经验，以及这些细节是否真的与星球法则产生回响。
          </p>
        </div>
      </section>

      <section className={styles.context}>
        <span>此星球保存的判断</span>
        <strong>{opinionTitle}</strong>
        <small>{live ? `REAL ZHIHU · ${totalLiveSources} 条来源` : "Planet Law · Saddle-node bifurcation"}</small>
      </section>

      <section className={styles.list}>
        {observations.map(({ source, author, meta }, index) => {
          const placeholder = isPlaceholder(source.url);
          return (
            <article className={styles.card} key={source.id}>
              <div className={styles.cardHead}>
                <div>
                  <span className={styles.number}>ECHO RECORD {String(index + 1).padStart(2, "0")}</span>
                  <h2>{meta?.label ?? "遗留记录"}</h2>
                </div>
                <span className={styles.upvotes}>{source.upvotes.toLocaleString()} 赞同 · 知乎记录</span>
              </div>

              <blockquote>“{excerpt(source.excerpt)}”</blockquote>

              <div className={styles.authorLine}>
                <strong>{author?.name ?? "知乎回答作者"}</strong>
                {author?.title ? <span>{author.title}</span> : null}
              </div>

              {source.evidence?.length ? (
                <div className={styles.evidence}>
                  <span>随记录保存的依据</span>
                  <div>{source.evidence.slice(0, 2).map((item) => <em key={item}>{item}</em>)}</div>
                </div>
              ) : null}

              <div className={styles.interpretation}>
                <span>与星球法则的回响</span>
                <p>{meta?.note}</p>
              </div>

              <div className={styles.cardFoot}>
                {placeholder ? (
                  <span className={styles.demoBadge}>演示记录 · 尚未接入原始知乎档案</span>
                ) : (
                  <a href={source.url} target="_blank" rel="noreferrer">
                    打开原始知乎档案 <ExternalLink size={13} />
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <section className={styles.note}>
        <span>档案注记</span>
        <p>
          记录不会证明数学模型适用于人生。法则提供结构，知乎回答保留经验、条件与反例；两者只在相似机制上彼此照亮。
          {live && totalLiveSources > observations.length ? ` 当前单屏先展示 ${observations.length}/${totalLiveSources} 条代表记录。` : ""}
        </p>
      </section>
    </main>
  );
}
