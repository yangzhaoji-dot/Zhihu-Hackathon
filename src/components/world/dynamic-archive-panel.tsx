"use client";

import { ArrowLeft, ExternalLink, Radar } from "lucide-react";
import type { OpinionGraph } from "@/lib/opinion/types";
import styles from "./planet-observation-archive.module.css";

function compact(value: string, limit = 240) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > limit ? `${clean.slice(0, limit)}…` : clean;
}

function safeZhihuUrl(url: string) {
  return /^https:\/\/(www\.)?zhihu\.com\//i.test(url) ? url : null;
}

export function DynamicArchivePanel({
  graph,
  opinionId,
  originId,
  lawName,
  onBack,
}: {
  graph: OpinionGraph;
  opinionId: string;
  originId: string;
  lawName: string;
  onBack: () => void;
}) {
  const opinion = graph.opinions.find((item) => item.id === originId || item.id === opinionId);
  const records = opinion
    ? graph.sources.filter((source) => opinion.sourceIds.includes(source.id)).slice(0, 3)
    : [];

  return (
    <main className={styles.page} data-el="dynamic-archive-inline">
      <header className={styles.topbar}>
        <button type="button" onClick={onBack} className={styles.backButton}>
          <ArrowLeft size={15} />
          返回星球内部
        </button>
        <span>ECHO ARCHIVE · LIVE</span>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroIcon}><Radar size={22} /></div>
        <div>
          <span className={styles.eyebrow}>纪元遗声 · 知乎档案</span>
          <h1>模型之外，留下的是人的声音。</h1>
          <p>
            这些回答参与形成了这颗观点星球。解释模型负责暴露结构，而这里保留真实经验、条件、反例与无法被模型压缩的细节。
          </p>
        </div>
      </section>

      <section className={styles.context}>
        <span>此星球保存的判断</span>
        <strong>{opinion?.title ?? "未命名观点"}</strong>
        <small>{lawName} · REAL ZHIHU · {opinion?.sourceIds.length ?? records.length} 条来源</small>
      </section>

      <section className={styles.list}>
        {records.map((source, index) => {
          const author = graph.authors.find((item) => item.id === source.authorId) ?? null;
          const url = safeZhihuUrl(source.url);
          return (
            <article className={styles.card} key={source.id}>
              <div className={styles.cardHead}>
                <div>
                  <span className={styles.number}>ECHO RECORD {String(index + 1).padStart(2, "0")}</span>
                  <h2>{index === 0 ? "最先被捕获的声音" : index === 1 ? "另一条留下来的声音" : "第三条现实切面"}</h2>
                </div>
                <span className={styles.upvotes}>{source.upvotes.toLocaleString()} 赞同 · 知乎记录</span>
              </div>

              <blockquote>“{compact(source.excerpt)}”</blockquote>

              <div className={styles.authorLine}>
                <strong>{author?.name ?? "知乎回答作者"}</strong>
                {author?.title ? <span>{author.title}</span> : null}
              </div>

              {source.evidence?.length ? (
                <div className={styles.evidence}>
                  <span>记录中保留下来的线索</span>
                  <div>{source.evidence.slice(0, 2).map((item) => <em key={item}>{item}</em>)}</div>
                </div>
              ) : null}

              <div className={styles.interpretation}>
                <span>与解释模型的回响</span>
                <p>这条回答参与形成了当前观点。保留它，是为了检查模型是否真正照到了现实机制，以及它遗漏了哪些条件和例外。</p>
              </div>

              <div className={styles.cardFoot}>
                {url ? (
                  <a href={url} target="_blank" rel="noreferrer">
                    打开原始知乎档案 <ExternalLink size={13} />
                  </a>
                ) : (
                  <span className={styles.demoBadge}>原始链接暂不可用</span>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <section className={styles.note}>
        <span>档案注记</span>
        <p>
          解释模型不是观点的证明。模型提供结构，知乎回答保留人的经验、条件和反例；当两者冲突时，应优先回到原始材料，而不是强迫现实服从模型。
        </p>
      </section>
    </main>
  );
}
