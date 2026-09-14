"use client";

import { ArrowLeft, ArrowRight, BookOpen, Telescope } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import styles from "./planet-law-mvp.module.css";

type DiagramStage = "overview" | "stable" | "approach" | "critical" | "gone" | "records";

type LawSlide = {
  label: string;
  title: string;
  math?: string;
  lawCopy?: string;
  reality?: string;
  tone?: "default" | "law" | "climax";
  diagram: DiagramStage;
};

const SLIDES: LawSlide[] = [
  {
    label: "观点星球 · 身心与边界",
    title: "长期消耗身心的工作，离开也可以是一种止损。",
    lawCopy:
      "这颗星球讨论的不是“累了就走”。它真正追问的是：一个人原本能够休息、恢复、再回到正常节奏的状态，会不会也存在一条边界。",
    reality:
      "接下来，我们借用动力系统里真实存在的“鞍结分岔”来看这件事。不是让公式替人做决定，而是借它解释：为什么一个看似还能维持的状态，会在某个时刻失去继续存在的条件。",
    tone: "climax",
    diagram: "overview",
  },
  {
    label: "第一法则 · 临界消失",
    title: "一个稳定态，如何从世界里消失。",
    math: "ẋ = r + x²",
    lawCopy:
      "在连续动力系统里，ẋ 表示系统状态随时间变化的速度。当 ẋ = 0，系统处在平衡态。对这条方程来说，r < 0 时存在两个平衡点 x = ±√(-r)：一个稳定，一个不稳定。随着 r 缓慢增大，它们逐渐靠近；到 r = 0 时在同一点相遇；再越过这个点，实数范围内不再存在平衡解。这个“两个平衡态相遇并同时消失”的过程，就是鞍结分岔。",
    reality:
      "把这条法则放回这颗星球，我们只借它的一件事：一种原本能够维持的状态，并不一定只是越来越差。它也可能先保持很久，然后在越过边界以后，再也找不到原来的平衡。",
    tone: "law",
    diagram: "overview",
  },
  {
    label: "第 01 律 · 稳定仍然存在",
    title: "受到扰动之后，系统还能回去。",
    math: "r < 0   ·   x = ±√(-r)",
    lawCopy:
      "在临界点到来之前，稳定平衡仍然存在。系统被轻轻推开以后，会有一种力量把它重新拉回原来的位置；这就是“稳定”的含义。",
    reality:
      "放到工作状态里，可以理解成：一段时间虽然很累，但休息仍然有效。加班一晚，睡两晚能缓回来；项目冲刺一周，过完周末还能重新睡好、重新集中注意力。这里并不是说工作没有问题，而是说“休息以后还能回到原来的自己”这件事仍然成立。",
    tone: "law",
    diagram: "stable",
  },
  {
    label: "第 02 律 · 恢复余量收窄",
    title: "表面仍在运行，回去却越来越难。",
    math: "r → 0⁻",
    lawCopy:
      "当 r 向临界值逼近，稳定态和不稳定态之间的距离越来越小。系统还没有失去平衡，但能承受扰动、再回到原状态的余量正在缩小。",
    reality:
      "对应到现实，变化往往很具体：以前一次加班睡一晚就能缓过来，后来需要两三天；以前周末能恢复，后来周一仍然疲惫、心烦；以前休假能解决的问题，现在只能减轻一点。人可能仍然照常上班、开会、交付，但“恢复所需要的代价”已经越来越大。",
    tone: "law",
    diagram: "approach",
  },
  {
    label: "第 03 律 · 临界点",
    title: "原来的两种状态，在这里相遇。",
    math: "r = 0",
    lawCopy:
      "在临界点，稳定态与不稳定态合并成同一个平衡点。这里是边界：再向前一点，原来那个能够把系统拉回去的稳定解就会消失。",
    reality:
      "对一个长期被消耗的人来说，这个时刻未必是一场突然崩溃。它可能只是第一次清楚地发现：请假了，睡了几天，状态仍然没有回到过去；一回到原来的工作节奏，失眠、心悸或强烈焦虑又重新出现。真正改变的，是“休息以后还能恢复”这个前提开始站不住了。",
    tone: "climax",
    diagram: "critical",
  },
  {
    label: "第 04 律 · 稳定态消失",
    title: "不是更难回去，而是已经没有那个地方可回。",
    math: "r > 0   ·   r + x² = 0 无实数平衡解",
    lawCopy:
      "越过临界点以后，这条方程不再给出原来的实数平衡状态。继续沿用之前的恢复方式，并不会把系统送回一个已经不存在的稳定点。",
    reality:
      "这就把“止损”解释得更具体：如果一个人反复休息仍无法恢复，而离开原环境后状态才明显缓解，那么问题可能已经不只是“今天是不是太累”。此时需要重新判断的是——继续留在这个环境里，同时保持原来的身心状态，是否还可能长期成立。",
    tone: "climax",
    diagram: "gone",
  },
  {
    label: "LAW INFERENCE · 法则推论",
    title: "所以，离开有时不是放弃稳定，而是承认旧的稳定已经失效。",
    lawCopy:
      "鞍结分岔没有告诉任何人“应该裸辞”。它只提供了一个更锋利的判断框架：面对长期消耗时，不要只问今天还能不能坚持，还要问恢复机制本身是否仍然存在。",
    reality:
      "于是“长期消耗身心的工作，离开也可以是一种止损”就不再只是情绪判断。它指向一个具体问题：你面对的是一次还能恢复的扰动，还是一个已经让原有平衡无法维持的环境？",
    tone: "climax",
    diagram: "gone",
  },
  {
    label: "OBSERVATIONS · 观测档案",
    title: "公式讲完结构以后，回到真实的人。",
    lawCopy:
      "下一层不再继续推演数学。我们去看真实回答里，人们究竟经历了什么：什么情况下休息仍然有效，什么情况下恢复开始失灵，又有哪些反例说明这条数学视角并不足以解释全部现实。",
    reality:
      "这些回答不是公式的“证明”。它们是观测记录。公式负责提供一种理解结构，真实经验负责告诉我们：这个结构在现实里到底能照亮什么。",
    diagram: "records",
  },
];

function BifurcationDiagram({ stage }: { stage: DiagramStage }) {
  if (stage === "records") {
    return (
      <div className={styles.recordsVisual} aria-hidden>
        <span className={styles.recordOrbit} />
        <div className={`${styles.recordCard} ${styles.recordOne}`}><i />OBS-01</div>
        <div className={`${styles.recordCard} ${styles.recordTwo}`}><i />OBS-02</div>
        <div className={`${styles.recordCard} ${styles.recordThree}`}><i />OBS-03</div>
        <div className={styles.recordCore}>OBSERVATIONS</div>
      </div>
    );
  }

  const marker = {
    overview: { x: 174, y: 224 },
    stable: { x: 132, y: 244 },
    approach: { x: 246, y: 194 },
    critical: { x: 328, y: 160 },
    gone: { x: 388, y: 160 },
  }[stage];

  return (
    <div className={styles.diagramWrap} aria-hidden>
      <div className={styles.diagramCaption}>SADDLE-NODE BIFURCATION</div>
      <svg className={styles.diagram} viewBox="0 0 460 320" role="img">
        <defs>
          <linearGradient id="stableLine" x1="0" x2="1">
            <stop offset="0" stopColor="rgba(148,181,255,.22)" />
            <stop offset="1" stopColor="rgba(218,229,255,.9)" />
          </linearGradient>
          <linearGradient id="unstableLine" x1="0" x2="1">
            <stop offset="0" stopColor="rgba(207,181,121,.2)" />
            <stop offset="1" stopColor="rgba(235,209,150,.66)" />
          </linearGradient>
          <radialGradient id="markerGlow">
            <stop offset="0" stopColor="rgba(255,247,221,1)" />
            <stop offset=".25" stopColor="rgba(216,228,255,.88)" />
            <stop offset="1" stopColor="rgba(216,228,255,0)" />
          </radialGradient>
        </defs>

        <line className={styles.axis} x1="56" y1="160" x2="414" y2="160" />
        <line className={styles.axis} x1="328" y1="40" x2="328" y2="282" />
        <text className={styles.axisLabel} x="417" y="154">r</text>
        <text className={styles.axisLabel} x="336" y="43">x</text>
        <text className={styles.zeroLabel} x="317" y="181">0</text>

        <path className={styles.unstableBranch} d="M72 74 C160 78 271 113 328 160" />
        <path className={styles.stableBranch} d="M72 246 C160 242 271 207 328 160" />

        <text className={styles.branchLabel} x="86" y="58">不稳定态</text>
        <text className={styles.branchLabel} x="86" y="270">稳定态</text>
        <text className={styles.thresholdLabel} x="298" y="298">临界点</text>

        <line className={styles.thresholdLine} x1="328" y1="66" x2="328" y2="258" />
        <circle className={styles.markerHalo} cx={marker.x} cy={marker.y} r="30" fill="url(#markerGlow)" />
        <circle className={styles.marker} cx={marker.x} cy={marker.y} r="6" />

        {stage === "gone" ? (
          <>
            <path className={styles.escapeArrow} d="M346 160 C365 160 381 160 402 160" />
            <text className={styles.goneLabel} x="349" y="135">无平衡解</text>
          </>
        ) : null}
      </svg>

      <div className={styles.diagramNote}>
        {stage === "stable" ? "离临界点还远，稳定态仍有明显余量。" : null}
        {stage === "approach" ? "两条分支越来越近，恢复余量正在收窄。" : null}
        {stage === "critical" ? "稳定态与不稳定态在这里相遇。" : null}
        {stage === "gone" ? "越过临界点后，原来的平衡态不再存在。" : null}
        {stage === "overview" ? "一条稳定分支，一条不稳定分支，最终在临界点汇合。" : null}
      </div>
    </div>
  );
}

export function PlanetLawMvp({ opinionId }: { opinionId: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const slide = SLIDES[index];
  const last = index === SLIDES.length - 1;

  const returnToGalaxy = () => {
    const galaxy = search.get("galaxy");
    const origin = search.get("origin") || opinionId;
    const cluster = search.get("cluster");
    if (!galaxy) {
      router.back();
      return;
    }
    const params = new URLSearchParams();
    if (cluster) params.set("cluster", cluster);
    if (origin) params.set("focus", origin);
    router.push(`/galaxy/${encodeURIComponent(galaxy)}${params.size ? `?${params.toString()}` : ""}`);
  };

  const openObservations = () => {
    const params = new URLSearchParams(search.toString());
    router.push(`/world/${encodeURIComponent(opinionId)}/observations${params.size ? `?${params.toString()}` : ""}`);
  };

  const changeSlide = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= SLIDES.length || transitioning) return;
    setTransitioning(true);
    setLeaving(true);
    window.setTimeout(() => {
      setIndex(nextIndex);
      setLeaving(false);
    }, 720);
    window.setTimeout(() => setTransitioning(false), 1780);
  };

  return (
    <main className={styles.page} data-el="planet-law-mvp">
      <div className={styles.glow} aria-hidden />

      <header className={styles.topbar}>
        <button type="button" onClick={returnToGalaxy} className={styles.backButton}>
          <ArrowLeft size={15} />
          返回主星系
        </button>
        <span className={styles.coordinates}>PLANET LAW · {String(index + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}</span>
      </header>

      <section className={`${styles.stage} ${slide.tone === "climax" ? styles.stageClimax : ""} ${leaving ? styles.stageLeaving : styles.stageEntering}`}>
        <div className={styles.aura} aria-hidden />

        <div className={styles.stageInner} key={index}>
          <div className={styles.narrativeSide}>
            <span className={`${styles.label} ${styles.revealLine}`}>{slide.label}</span>
            {slide.math ? <div className={`${styles.formula} ${styles.revealLine}`}>{slide.math}</div> : null}
            <h1 className={`${styles.title} ${styles.revealLine}`}>{slide.title}</h1>
            {slide.lawCopy ? <p className={`${styles.lawCopy} ${styles.revealLine}`}>{slide.lawCopy}</p> : null}
            {slide.reality ? <p className={`${styles.realityCopy} ${styles.revealLine}`}>{slide.reality}</p> : null}
          </div>

          <aside className={`${styles.visualSide} ${styles.revealVisual}`}>
            <BifurcationDiagram stage={slide.diagram} />
          </aside>
        </div>
      </section>

      <div className={styles.controls}>
        <div className={styles.progress} aria-label={`第 ${index + 1} 幕，共 ${SLIDES.length} 幕`}>
          {SLIDES.map((_, dotIndex) => (
            <button
              key={dotIndex}
              type="button"
              aria-label={`切换到第 ${dotIndex + 1} 幕`}
              className={`${styles.dot} ${dotIndex === index ? styles.dotActive : ""}`}
              onClick={() => changeSlide(dotIndex)}
              disabled={transitioning}
            />
          ))}
        </div>

        {index > 0 ? (
          <button type="button" className={styles.previousButton} onClick={() => changeSlide(index - 1)} disabled={transitioning}>
            <ArrowLeft size={16} />
            上一幕
          </button>
        ) : <span />}

        <button
          type="button"
          className={styles.nextButton}
          disabled={transitioning}
          onClick={() => (last ? openObservations() : changeSlide(index + 1))}
        >
          {last ? <BookOpen size={17} /> : null}
          {last ? "进入观测档案" : "下一幕"}
          {last ? <Telescope size={16} /> : <ArrowRight size={17} />}
        </button>
      </div>

      <footer className={styles.disclaimer}>数学法则在这里是一种结构化理解工具，不是对人生处境的定量预测模型。</footer>
    </main>
  );
}
