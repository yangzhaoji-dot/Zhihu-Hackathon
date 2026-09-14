"use client";

import { ArrowLeft, ExternalLink, Radar } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { AUTHORS, SOURCES } from "@/lib/opinion/seed-sources";
import styles from "./planet-observation-archive.module.css";

const OBSERVATION_META: Record<string, { label: string; note: string }> = {
  s1: {
    label: "恢复能力发生变化",
    note: "这条旧人类记录留下了一个关键转折：离开原环境之后，睡眠明显恢复。它与这颗星球所讨论的“恢复能力存在边界”发生了回响。",
  },
  s2: {
    label: "损耗由个体承担",
    note: "另一位旧人类观察者记录了更残酷的一面：损耗发生在系统之中，后果却可能最终落在个体身上。这不能证明法则，却解释了为什么“继续留在原环境”值得被重新判断。",
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
        <span>LOST HUMAN ARCHIVE · 01</span>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroIcon}><Radar size={25} /></div>
        <div>
          <span className={styles.eyebrow}>失落人类档案</span>
          <h1>这里保存着旧人类世界留下的声音。</h1>
          <p>
            很久以前，人类曾把自己的工作、疲惫、恢复、离开与犹豫写进一个名为“知乎”的公共知识档案。
            我们不把这些文字改写成法则，只把它们从时间的尘埃里重新读出来。
          </p>
        </div>
      </section>

      <section className={styles.context}>
        <span>此星球保存的旧人类判断</span>
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
                  <span className={styles.number}>HUMAN RECORD {String(index + 1).padStart(2, "0")}</span>
                  <h2>{meta?.label ?? "旧人类观测"}</h2>
                </div>
                <span className={styles.upvotes}>{source.upvotes.toLocaleString()} 赞同 · 知乎档案</span>
              </div>

              <blockquote>“{source.excerpt}”</blockquote>

              <div className={styles.authorLine}>
                <strong>{author?.name ?? "旧人类记录者"}</strong>
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
                  <span className={styles.demoBadge}>演示档案 · 尚未接入真实知乎原记录</span>
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
          这些记录不会“证明”鞍结分岔适用于人生。星球法则只是提供一个理解结构；旧人类留下的经历，则告诉我们这个结构能照亮什么，又会遗漏什么。
          当前仓库使用演示材料验证体验，后续接入真实可追溯知乎回答时，这一层的叙事结构可以保持不变。
        </p>
      </section>
    </main>
  );
}
