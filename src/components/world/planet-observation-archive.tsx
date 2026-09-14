"use client";

import { ArrowLeft, ExternalLink, Radar } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { AUTHORS, SOURCES } from "@/lib/opinion/seed-sources";
import styles from "./planet-observation-archive.module.css";

const OBSERVATION_META: Record<string, { label: string; note: string }> = {
  s1: {
    label: "恢复能力发生变化",
    note: "这条记录关注长期压力之后，身体与睡眠是否仍能回到原来的状态。",
  },
  s2: {
    label: "损耗由个体承担",
    note: "这条记录补充了一个现实边界：系统造成的健康损耗，并不一定由系统本身承担后果。",
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
        <span>OBSERVATION ARCHIVE · 01</span>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroIcon}><Radar size={25} /></div>
        <div>
          <span className={styles.eyebrow}>观测档案</span>
          <h1>从法则返回真实世界。</h1>
          <p>
            法则提供一种理解结构，观测记录则保留真实经验本身。这里不把回答改写成公式，也不要求它们“证明”公式。
          </p>
        </div>
      </section>

      <section className={styles.context}>
        <span>对应观点</span>
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
                  <span className={styles.number}>OBSERVATION {String(index + 1).padStart(2, "0")}</span>
                  <h2>{meta?.label ?? "现实观测"}</h2>
                </div>
                <span className={styles.upvotes}>{source.upvotes.toLocaleString()} 赞同</span>
              </div>

              <blockquote>“{source.excerpt}”</blockquote>

              <div className={styles.authorLine}>
                <strong>{author?.name ?? "知乎答主"}</strong>
                {author?.title ? <span>{author.title}</span> : null}
              </div>

              {source.evidence?.length ? (
                <div className={styles.evidence}>
                  <span>记录中提到的依据</span>
                  <div>{source.evidence.map((item) => <em key={item}>{item}</em>)}</div>
                </div>
              ) : null}

              <div className={styles.interpretation}>
                <span>与法则的对应</span>
                <p>{meta?.note}</p>
              </div>

              <div className={styles.cardFoot}>
                {placeholder ? (
                  <span className={styles.demoBadge}>当前仓库中的演示观测材料</span>
                ) : (
                  <a href={source.url} target="_blank" rel="noreferrer">
                    查看知乎原回答 <ExternalLink size={13} />
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <section className={styles.note}>
        <span>第一版说明</span>
        <p>当前只验证“法则 → 现实观测”的页面结构。仓库现有 source URL 为演示占位数据；后续接入真实可追溯知乎回答时，这一层无需改变交互结构。</p>
      </section>
    </main>
  );
}
