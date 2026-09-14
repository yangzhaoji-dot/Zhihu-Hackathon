"use client";

import { ArrowLeft, ArrowRight, BookOpen, Telescope } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import styles from "./planet-law-mvp.module.css";

type LawSlide = {
  label: string;
  title: string;
  math?: string;
  lawCopy?: string;
  realityTitle?: string;
  reality?: string;
  tone?: "default" | "law" | "climax";
};

const SLIDES: LawSlide[] = [
  {
    label: "观点星球 · 身心与边界",
    title: "长期消耗身心的工作，离开也可以是一种止损。",
    lawCopy: "每颗星球都由一条法则支配。这里，我们借一条真实的动力系统法则，理解“还能恢复”这件事为什么会有边界。",
    tone: "climax",
  },
  {
    label: "第一法则 · 临界消失",
    title: "鞍结分岔",
    math: "ẋ = r + x²",
    lawCopy: "在动力系统里，鞍结分岔描述的是：随着控制参数缓慢变化，一个稳定态和一个不稳定态逐渐靠近，最后在临界点相遇并消失。",
    realityTitle: "先说人话：它关心的不是“越来越差”，而是“原来的稳定状态还在不在”。",
    reality: "放到这个观点里，我们不把 x 或 r 生硬地等同于某个具体指标。我们只借这个结构理解一件事：一个人可以在一段时间里虽然很累，却还能恢复；但“还能恢复”的状态本身，也可能被持续消耗推到边界。",
    tone: "law",
  },
  {
    label: "第 01 律 · 稳定仍然存在",
    title: "系统被扰动后，还能回去。",
    math: "r < 0   ·   x = ±√(-r)",
    lawCopy: "当 r 还在临界点的一侧时，系统里仍然存在平衡状态。其中有一个是稳定的：受到小扰动之后，系统会被拉回去。",
    realityTitle: "现实里就是：工作虽然累，但你休息以后还能回来。",
    reality: "加班一晚，第二天还能补回来；项目冲刺一周，周末休息后还能恢复睡眠和情绪；压力增加了，但人仍然能重新建立节奏。这个阶段，“继续留下”至少还是一种可以维持的状态。",
    tone: "law",
  },
  {
    label: "第 02 律 · 恢复余量正在缩小",
    title: "表面没崩，不等于和以前一样稳定。",
    math: "r → 0⁻",
    lawCopy: "随着控制参数逼近临界点，稳定态和不稳定态越来越近。系统还没有崩溃，但它能够承受扰动、再回到原状态的余量越来越小。",
    realityTitle: "现实里就是：以前睡一晚能缓过来，后来要一个周末，再后来请假也恢复不全。",
    reality: "你可能仍然能上班、开会、交付任务，所以看起来“一切正常”。但真正发生变化的是恢复能力：同样一次加班，以前一天能恢复，现在要三天；以前周末能恢复，现在周一仍然疲惫。",
    tone: "law",
  },
  {
    label: "第 03 律 · 临界点",
    title: "“还能恢复”这件事，到达了边界。",
    math: "r = 0",
    lawCopy: "在临界点，稳定态和不稳定态相遇。再往前一点，原来那个稳定解就不再存在。",
    realityTitle: "现实里不是某一天突然比昨天更累很多，而是：你第一次发现，休息已经不能把自己带回原来的状态。",
    reality: "可能是连续几个周末都睡不回来，可能是请假后心悸和焦虑仍然持续，也可能是回到工位就重新出现明显的身体反应。变化看起来仍然是连续的，但“恢复以后还能继续”的前提已经被逼到边界。",
    tone: "climax",
  },
  {
    label: "第 04 律 · 稳定态消失",
    title: "不是更难恢复，而是原来的恢复状态已经不存在。",
    math: "r > 0   ·   r + x² = 0 无实数平衡解",
    lawCopy: "越过临界点后，原来的平衡解消失。继续用之前那套方式，并不会把系统重新带回那个旧状态。",
    realityTitle: "现实里就是：睡一觉、休个周末、咬牙坚持，都不再把你带回“原来那个自己”。",
    reality: "这并不自动推出“必须裸辞”。它真正提醒的是：此时问题已经不只是“还能不能坚持”，而是“当前环境里，原来的恢复机制是否还成立”。如果恢复条件已经不存在，离开才开始获得“止损”的意义。",
    tone: "climax",
  },
  {
    label: "LAW INFERENCE · 法则推论",
    title: "这颗星球因此相信：离开，有时不是放弃，而是承认旧的平衡已经不存在。",
    lawCopy: "“长期消耗身心的工作，离开也可以是一种止损。”这句话被重新解释为：判断是否该离开，不只看今天有多累，还要看这个环境是否仍然允许你恢复。",
    realityTitle: "这条数学法则没有替你做决定。",
    reality: "它只给了一个更精确的问题：你面对的是暂时的扰动，还是一个已经失去恢复条件的系统？",
    tone: "climax",
  },
  {
    label: "OBSERVATIONS · 观测档案",
    title: "公式给出一种理解结构，真实回答告诉我们：人们究竟经历了什么。",
    lawCopy: "下一层不再继续讲数学。我们回到真实世界，查看这颗星球背后的回答、经历、数据与反例。",
    realityTitle: "法则是解释器，回答是观测记录。",
    reality: "它们不会证明这条公式“适用于人生”，但会告诉我们：这套数学结构究竟照亮了哪些真实经验，又遗漏了什么。",
  },
];

export function PlanetLawMvp({ opinionId }: { opinionId: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);
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
    if (nextIndex < 0 || nextIndex >= SLIDES.length || leaving) return;
    setLeaving(true);
    window.setTimeout(() => {
      setIndex(nextIndex);
      setLeaving(false);
    }, 260);
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
          <div className={styles.lawSide}>
            <span className={styles.label}>{slide.label}</span>
            {slide.math ? <div className={styles.formula}>{slide.math}</div> : null}
            <h1 className={styles.title}>{slide.title}</h1>
            {slide.lawCopy ? <p className={styles.lawCopy}>{slide.lawCopy}</p> : null}
          </div>

          {slide.realityTitle || slide.reality ? (
            <aside className={styles.realitySide}>
              <span className={styles.realityLabel}>现实投影 · 说人话</span>
              {slide.realityTitle ? <h2>{slide.realityTitle}</h2> : null}
              {slide.reality ? <p>{slide.reality}</p> : null}
            </aside>
          ) : null}
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
            />
          ))}
        </div>

        {index > 0 ? (
          <button type="button" className={styles.previousButton} onClick={() => changeSlide(index - 1)} disabled={leaving}>
            <ArrowLeft size={16} />
            上一幕
          </button>
        ) : <span />}

        <button
          type="button"
          className={styles.nextButton}
          disabled={leaving}
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
