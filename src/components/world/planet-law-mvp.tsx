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
    label: "观点星球 · 身心与边界 · 第一法则：临界消失",
    title: "长期消耗身心的工作，离开也可以是一种止损。",
    math: "ẋ = r + x²",
    lawCopy:
      "这颗星球由“临界消失”支配。鞍结分岔描述一种边界：原本能够维持的稳定状态，会随着条件变化逐渐逼近临界点，并在越过临界点后失去继续存在的条件。",
    tone: "climax",
    diagram: "overview",
  },
  {
    label: "法则原义 · 鞍结分岔",
    title: "稳定，可以存在；也可以消失。",
    math: "ẋ = r + x²",
    lawCopy:
      "当系统还有稳定平衡时，受到扰动后会重新回去。随着参数 r 增大，稳定态与不稳定态越来越接近；在临界点相遇以后，原来的平衡不再存在。这个过程，就是鞍结分岔。",
    reality:
      "这颗星球借用的正是这个结构：真正值得注意的，不只是状态变差了多少，而是那个原本还能恢复的状态，是否仍然存在。",
    tone: "law",
    diagram: "overview",
  },
  {
    label: "第 01 律 · 稳定仍然存在",
    title: "受到扰动之后，系统还能回去。",
    math: "r < 0   ·   x = ±√(-r)",
    lawCopy:
      "在临界点到来之前，稳定平衡仍然存在。系统被轻轻推开以后，会有一种趋势把它重新拉回去。数学里，这就是“稳定”的含义。",
    reality:
      "在人类纪元，人们有一个很朴素的说法：还能缓过来。一次熬夜以后睡两晚，精神会回来；一个项目冲刺结束，过完周末还能重新集中注意力。疲惫已经出现，但“休息以后还能回到原来的自己”这件事仍然成立。",
    tone: "law",
    diagram: "stable",
  },
  {
    label: "第 02 律 · 恢复余量收窄",
    title: "表面仍在运行，回去却越来越难。",
    math: "r → 0⁻",
    lawCopy:
      "当 r 逐渐逼近临界值，稳定态与不稳定态之间的距离不断缩短。系统表面上仍然维持着平衡，但它能承受扰动、再回到原状态的余量越来越小。",
    reality:
      "在遗留下来的记录里，这种变化很少以灾难的样子出现。它更像是：以前睡一晚就能缓过来，后来需要两三天；以前一个周末足够，后来到了周一仍然疲惫；以前请一次假可以重整状态，后来只能短暂减轻。人仍然上班、开会、交付，只有“恢复所需要的代价”在悄悄变大。",
    tone: "law",
    diagram: "approach",
  },
  {
    label: "第 03 律 · 临界点",
    title: "原来的两种状态，在这里相遇。",
    math: "r = 0",
    lawCopy:
      "在临界点，稳定态与不稳定态合并成同一个平衡点。这里不是灾难本身，而是一条边界：再向前一点，那个原本能够把系统拉回去的稳定解就会消失。",
    reality:
      "没有人会在某一天收到“你已到达临界点”的通知。它可能只是某次休假之后，第一次发现自己没有真正恢复；也可能是重新回到原来的工作节奏时，失眠、心悸或强烈焦虑立刻卷土重来。真正改变的，不是某一天突然更累，而是“休息以后还能回来”这个前提开始失去支撑。",
    tone: "climax",
    diagram: "critical",
  },
  {
    label: "第 04 律 · 稳定态消失",
    title: "不是更难回去，而是已经没有那个地方可回。",
    math: "r > 0   ·   r + x² = 0 无实数平衡解",
    lawCopy:
      "越过临界点以后，这条方程不再拥有原来的实数平衡状态。继续沿用之前的恢复方式，也无法把系统送回一个已经不存在的稳定点。",
    reality:
      "这也是这颗星球所说的“止损”真正开始获得重量的时刻。档案里留下过这样的经验：反复休息仍无法恢复，而离开原来的环境之后，睡眠、情绪或身体反应才明显缓解。此时需要重新判断的，不再只是“今天还能不能撑住”，而是——继续留在这里，同时保持过去那个自己，是否仍然可能长期成立。",
    tone: "climax",
    diagram: "gone",
  },
  {
    label: "LAW INFERENCE · 法则推论",
    title: "于是，这颗星球留下了那句判断。",
    lawCopy:
      "“长期消耗身心的工作，离开也可以是一种止损。”鞍结分岔并没有替任何人作出选择。它只是把这句话照得更清楚：长期消耗真正值得警惕的，不只是损耗在增加，而是恢复机制本身可能正在失去存在条件。",
    reality:
      "因此，离开有时并不是放弃一个仍然稳定的世界。它可能只是承认：旧的平衡已经无法继续维持。法则能把这个结构揭示出来，但它仍然不知道，那些人究竟是怎样一步步走到这里的。",
    tone: "climax",
    diagram: "gone",
  },
  {
    label: "ARCHIVE SIGNAL · 纪元遗声",
    title: "法则沉默以后，人的声音开始抵达。",
    lawCopy:
      "在那个已经远去的人类纪元，有人经历过加班、失眠、心悸、恢复、离开；也有人发现，离开并没有解决全部问题。他们曾把这些经历写进一个名为“知乎”的公共知识档案。如今，留下来的文字像微弱信号一样，仍在这颗星球周围回响。",
    reality:
      "下一层不再继续推演数学。我们沿着这些遗声进入档案：去看是谁写下了这些话，他们究竟经历了什么，哪些记录与这条法则产生回响，又有哪些记录提醒我们——任何一条法则，都无法囊括一个完整的人类世界。",
    diagram: "records",
  },
];

function BifurcationDiagram({ stage }: { stage: DiagramStage }) {
  if (stage === "records") {
    return (
      <div className={styles.recordsVisual} aria-hidden>
        <span className={styles.recordOrbit} />
        <div className={`${styles.recordCard} ${styles.recordOne}`}><i />E-001</div>
        <div className={`${styles.recordCard} ${styles.recordTwo}`}><i />E-002</div>
        <div className={`${styles.recordCard} ${styles.recordThree}`}><i />E-003</div>
        <div className={styles.recordCore}>ECHO ARCHIVE</div>
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
          {last ? "进入遗声档案" : "下一幕"}
          {last ? <Telescope size={16} /> : <ArrowRight size={17} />}
        </button>
      </div>

      <footer className={styles.disclaimer}>数学法则在这里是一种结构化理解工具，不是对人生处境的定量预测模型。</footer>
    </main>
  );
}