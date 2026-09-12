"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, ExternalLink, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { fetchSourceTrace } from "@/lib/api/opinion";
import type { Author, OpinionSource } from "@/lib/opinion/types";
import { loadOpinionWorldEntry, type OpinionWorldEntry } from "@/lib/opinion/world-session";
import styles from "./planet-story-mvp.module.css";

type FragmentId = "claim" | "evidence" | "boundary";

type FragmentState = Record<FragmentId, boolean>;

const INITIAL_FRAGMENTS: FragmentState = {
  claim: false,
  evidence: false,
  boundary: false,
};

function isPlaceholderSource(source: OpinionSource) {
  return /question\/0+\/answer\//.test(source.url) || source.url.includes("example");
}

function authorFor(source: OpinionSource, authors: readonly Author[]) {
  return authors.find((author) => author.id === source.authorId) ?? null;
}

function ForestHeroArt({ dawn }: { dawn: boolean }) {
  return (
    <div className={styles.heroArt} data-dawn={dawn ? "true" : "false"} aria-hidden>
      <div className={styles.heroMoon} />
      <div className={styles.heroMountainA} />
      <div className={styles.heroMountainB} />
      <div className={styles.heroMistA} />
      <div className={styles.heroMistB} />
      <div className={styles.heroCanopyLeft} />
      <div className={styles.heroCanopyRight} />
      <div className={styles.heroTrunkLeft} />
      <div className={styles.heroTrunkRight} />
      <div className={styles.heroPath} />
      <div className={styles.heroSanctuary}>
        <i /><b /><em />
      </div>
      <div className={styles.heroSpores}>{Array.from({ length: 18 }, (_, index) => <i key={index} style={{ "--i": index } as React.CSSProperties} />)}</div>
    </div>
  );
}

function SanctuaryArt() {
  return (
    <div className={styles.sanctuaryArt} aria-hidden>
      <div className={styles.sanctuaryGlow} />
      <div className={styles.rootArchLeft} />
      <div className={styles.rootArchRight} />
      <div className={styles.ruinRoof} />
      <div className={styles.ruinWall} />
      <div className={styles.ruinDoor} />
      <div className={styles.ruinPaper} />
      <div className={styles.foregroundGrassA} />
      <div className={styles.foregroundGrassB} />
    </div>
  );
}

function MirrorArt() {
  return (
    <div className={styles.mirrorArt} aria-hidden>
      <div className={styles.mirrorTreeLeft} />
      <div className={styles.mirrorTreeRight} />
      <div className={styles.mirrorWater} />
      <div className={styles.mirrorRippleA} />
      <div className={styles.mirrorRippleB} />
      <div className={styles.mirrorPaperA} />
      <div className={styles.mirrorPaperB} />
    </div>
  );
}

function BoundaryArt({ dawn }: { dawn: boolean }) {
  return (
    <div className={styles.boundaryArt} data-dawn={dawn ? "true" : "false"} aria-hidden>
      <div className={styles.boundaryMist} />
      <div className={styles.boundaryCrown} />
      <div className={styles.boundaryTrunk} />
      <div className={styles.boundaryRootA} />
      <div className={styles.boundaryRootB} />
      <div className={styles.boundaryRootC} />
      <div className={styles.boundaryBroken} />
    </div>
  );
}

export function PlanetStoryMvp({ opinionId }: { opinionId: string }) {
  const router = useRouter();
  const [entry, setEntry] = useState<OpinionWorldEntry | null>(() => loadOpinionWorldEntry(opinionId));
  const [loading, setLoading] = useState(!entry);
  const [error, setError] = useState<string | null>(null);
  const [fragments, setFragments] = useState<FragmentState>(INITIAL_FRAGMENTS);
  const [readSources, setReadSources] = useState<string[]>([]);
  const [evidenceChoice, setEvidenceChoice] = useState<string | null>(null);
  const [boundaryChoice, setBoundaryChoice] = useState<string | null>(null);
  const [resonating, setResonating] = useState(false);
  const [resonated, setResonated] = useState(false);
  const evidenceRef = useRef<HTMLElement | null>(null);
  const boundaryRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (entry) return;
    let alive = true;
    void fetchSourceTrace(opinionId)
      .then((trace) => {
        if (!alive) return;
        setEntry({ ...trace, questionTitle: trace.opinion.questionId });
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setError("没有找到这颗观点星球的材料。");
        setLoading(false);
      });
    return () => { alive = false; };
  }, [entry, opinionId]);

  const sources = useMemo(() => entry?.sources.filter((source) => entry.opinion.sourceIds.includes(source.id)).slice(0, 2) ?? [], [entry]);
  const fragmentCount = Object.values(fragments).filter(Boolean).length;
  const allFragments = fragmentCount === 3;

  const collect = useCallback((id: FragmentId) => {
    setFragments((current) => current[id] ? current : { ...current, [id]: true });
  }, []);

  const startResonance = useCallback(() => {
    if (!allFragments || resonating || resonated) return;
    setResonating(true);
    window.setTimeout(() => {
      setResonating(false);
      setResonated(true);
    }, 3000);
  }, [allFragments, resonated, resonating]);

  if (loading) {
    return <main className={styles.loading}><span>正在进入观点星球…</span></main>;
  }

  if (!entry || error) {
    return <main className={styles.loading}><span>{error ?? "观点星球暂时不可达。"}</span><button type="button" onClick={() => router.back()}>返回</button></main>;
  }

  const claim = entry.opinion.claim?.trim() || entry.opinion.title;
  const placeholderMaterial = sources.some(isPlaceholderSource);

  return (
    <main className={styles.story} data-dawn={resonated ? "true" : "false"}>
      <div className={styles.fixedAtmosphere} aria-hidden />

      <header className={styles.topbar}>
        <button type="button" className={styles.backButton} onClick={() => router.back()}><ArrowLeft size={15} /> 返回主星系</button>
        <div className={styles.progress}><span>认知碎片</span><strong>{fragmentCount}/3</strong></div>
      </header>

      <section className={styles.hero}>
        <ForestHeroArt dawn={resonated} />
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>观点星球 · 森林圣所</span>
          <h1>{entry.opinion.title}</h1>
          <p>{entry.opinion.summary}</p>
          <div className={styles.kanshanLine}><span>刘看山</span><p>先别急着判断。去看看这里留下了什么。</p></div>
          <button type="button" className={styles.scrollCue} onClick={() => document.getElementById("story-claim")?.scrollIntoView({ behavior: "smooth" })}>开始探索 <ChevronDown size={15} /></button>
        </div>
      </section>

      <section id="story-claim" className={`${styles.chapter} ${styles.claimChapter}`}>
        <div className={styles.chapterVisual}><SanctuaryArt /></div>
        <div className={styles.chapterContent}>
          <span className={styles.chapterIndex}>01 · 根系庇护所</span>
          <h2>先看见这条观点</h2>
          <p className={styles.sceneCopy}>巨大的根系把一座废弃庇护所重新包裹起来。墙面已经开裂，但仍有一句话没有被植物覆盖。</p>
          <blockquote className={styles.claimQuote}>“{claim}”</blockquote>
          <div className={styles.kanshanSmall}>刘看山：这不是结论。先把它当作一条留下来的主张。</div>
          {!fragments.claim ? (
            <button type="button" className={styles.primaryAction} onClick={() => { collect("claim"); window.setTimeout(() => evidenceRef.current?.scrollIntoView({ behavior: "smooth" }), 320); }}>我看到了这条主张</button>
          ) : <div className={styles.fragmentEarned}><Sparkles size={15} /> 主张碎片 · 1/3</div>}
        </div>
      </section>

      <section ref={evidenceRef} className={`${styles.chapter} ${styles.evidenceChapter}`}>
        <div className={styles.chapterVisual}><MirrorArt /></div>
        <div className={styles.chapterContent}>
          <span className={styles.chapterIndex}>02 · 对照水镜</span>
          <h2>读原话，再判断它支持到哪里</h2>
          <p className={styles.sceneCopy}>水镜两侧各留下了一段回答。先读，不要急着把一个人的经历外推给所有人。</p>
          {placeholderMaterial ? <div className={styles.demoNotice}>当前为演示摘录。正式接入知乎真实来源后，这里会展示可追溯原回答。</div> : null}
          <div className={styles.sourceGrid}>
            {sources.length ? sources.map((source, index) => {
              const author = authorFor(source, entry.authors);
              const read = readSources.includes(source.id);
              const placeholder = isPlaceholderSource(source);
              return (
                <article key={source.id} className={styles.sourceCard} data-read={read ? "true" : "false"}>
                  <div className={styles.sourceMeta}><span>原文 {index + 1}</span><small>{source.upvotes.toLocaleString("zh-CN")} 赞同</small></div>
                  <blockquote>{source.excerpt}</blockquote>
                  <footer>
                    <span>{author?.name ?? "知乎答主"}{author?.title ? ` · ${author.title}` : ""}</span>
                    {!placeholder ? <a href={source.url} target="_blank" rel="noreferrer">原回答 <ExternalLink size={11} /></a> : null}
                  </footer>
                  <button type="button" onClick={() => setReadSources((current) => current.includes(source.id) ? current : [...current, source.id])}>{read ? "已读" : "读完这段"}</button>
                </article>
              );
            }) : <div className={styles.demoNotice}>这条观点目前没有可追溯原文，保持缺失，不生成替代材料。</div>}
          </div>

          {sources.length > 0 && readSources.length >= sources.length ? (
            <div className={styles.questionBlock}>
              <p>把这些材料放在一起，最谨慎的理解是什么？</p>
              {[
                ["cost", "持续消耗身心的环境本身也有成本，离开可能是一种止损"],
                ["always", "只要工作让人不舒服，就应该立刻裸辞"],
                ["proof", "这些经历已经证明裸辞对所有人都是最优选择"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  data-selected={evidenceChoice === id ? "true" : "false"}
                  data-correct={evidenceChoice === id && id === "cost" ? "true" : undefined}
                  onClick={() => {
                    setEvidenceChoice(id);
                    if (id === "cost") {
                      collect("evidence");
                      window.setTimeout(() => boundaryRef.current?.scrollIntoView({ behavior: "smooth" }), 650);
                    }
                  }}
                >{label}</button>
              ))}
              {evidenceChoice && evidenceChoice !== "cost" ? <small>这一步外推得太远。回到原话，只判断材料明确能支持到哪里。</small> : null}
              {fragments.evidence ? <div className={styles.fragmentEarned}><Sparkles size={15} /> 依据碎片 · 2/3</div> : null}
            </div>
          ) : null}
        </div>
      </section>

      <section ref={boundaryRef} className={`${styles.chapter} ${styles.boundaryChapter}`}>
        <div className={styles.chapterVisual}><BoundaryArt dawn={resonated} /></div>
        <div className={styles.chapterContent}>
          <span className={styles.chapterIndex}>03 · 断根边界</span>
          <h2>理解一条观点，也要知道它停在哪里</h2>
          <p className={styles.sceneCopy}>越往森林深处，根系越不完整。留下来的材料能说明一部分事情，但有些问题仍然没有答案。</p>
          <div className={styles.kanshanSmall}>刘看山：这两份材料还不能替我们回答什么？</div>
          <div className={styles.boundaryChoices}>
            {[
              ["universal", "它是否适用于所有人、所有工作环境"],
              ["longterm", "裸辞之后的长期结果一定会怎样"],
              ["conditions", "经济储备、行业周期等条件会不会改变结论"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                data-selected={boundaryChoice === id ? "true" : "false"}
                onClick={() => { setBoundaryChoice(id); collect("boundary"); }}
              >{label}</button>
            ))}
          </div>
          {fragments.boundary ? <><div className={styles.fragmentEarned}><Sparkles size={15} /> 边界碎片 · 3/3</div><button type="button" className={styles.primaryAction} onClick={startResonance}>开始共鸣</button></> : null}
        </div>
      </section>

      <section className={styles.afterglow} data-visible={resonated ? "true" : "false"}>
        <div><span>共鸣完成</span><h2>你理解了这条观点，但没有被要求相信它。</h2><p>森林亮了一些，雾退了一些。没有被材料回答的问题仍然留在远处。</p><button type="button" onClick={() => router.back()}>返回主星系</button></div>
      </section>

      {resonating ? (
        <div className={styles.resonanceOverlay} role="dialog" aria-label="共鸣">
          <div className={styles.shardCluster} aria-hidden><i /><i /><i /></div>
          <div className={styles.scroll}>
            <span>观点共鸣</span>
            <section><small>主张</small><p>{claim}</p></section>
            <section><small>依据</small><p>已有材料显示，持续的身心消耗本身存在现实代价；离开可以是一种止损选择。</p></section>
            <section><small>边界</small><p>这些经历不能证明裸辞适用于所有人，也没有回答长期结果与不同条件下的差异。</p></section>
          </div>
          <p className={styles.signature}>共鸣意味着理解了观点，不意味着证明了观点。</p>
        </div>
      ) : null}
    </main>
  );
}
