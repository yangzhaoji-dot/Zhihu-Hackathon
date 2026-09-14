"use client";

import { ArrowLeft, ExternalLink, Radar } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
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

export function PlanetObservationArchive({ opinionId }: { opinionId: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const observations = SOURCES.filter((source) => source.id === "s1" || source.id === "s2").map((source) => ({
    source,
    author: AUTHORS.find((author) => author.id === source.authorId) ?? null,
    meta: OBSERVATION_META[source.id],
  }));

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
        <span>ECHO ARCHIVE · 01</span>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroIcon}><Radar size={22} /></div>
        <div>
          <span className={styles.eyebrow}>人类纪元 · 遗声档案</span>
          <h1>这些声音来自一个已经远去的时代。</h1>
          <p>
            在人类纪元，人们曾把工作、疲惫、恢复、离开与犹豫写进一个名为“知乎”的公共知识档案。
            如今，我们沿着仍被保存的文字，重新听见他们。
          </p>
        </div>
      </section>

      <section className={styles.context}>
        <span>此星球保存的判断</span>
        <strong>长期消耗身心的工作，离开也可以是一种止损。</strong>
        <small>Planet Law · Saddle-node bifurcation</small>
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

              <blockquote>“{source.excerpt}”</blockquote>

              <div className={styles.authorLine}>
                <strong>{author?.name ?? "无名记录者"}</strong>
                {author?.title ? <span>{author.title}</span> : null}
              </div>

              {source.evidence?.length ? (
                <div className={styles.evidence}>
                  <span>随记录保存的依据</span>
                  <div>{source.evidence.map((item) => <em key={item}>{item}</em>)}</div>
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
          这些记录不会“证明”鞍结分岔适用于人生。法则提供结构，记录保留经验；两者只在相似的机制上彼此照亮。
          当前仓库使用演示材料验证体验，后续接入真实可追溯知乎回答时，这一层的结构无需改变。
        </p>
      </section>
    </main>
  );
}
