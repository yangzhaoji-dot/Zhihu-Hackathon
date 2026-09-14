"use client";

import { ArrowLeft, ArrowRight, BookOpen, Telescope } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./planet-law-mvp.module.css";

const LAW_STEPS = [
  {
    index: "01",
    law: "变化可以是缓慢的",
    math: "r ↑",
    lawCopy: "控制参数可以一点点改变，系统却仍然维持原来的状态。",
    projection:
      "工作压力可能只是每天多一点，睡眠每天少一点，情绪每天差一点。单独看任何一天，都不像必须离开的理由。",
  },
  {
    index: "02",
    law: "稳定存在边界",
    math: "r < 0",
    lawCopy: "在临界点之前，稳定态仍然存在；受到扰动之后，系统仍有机会回到原来的平衡。",
    projection:
      "累的时候休息一个周末还能恢复，压力增加后仍能重新建立节奏——此时，继续留下仍然是一种可维持的状态。",
  },
  {
    index: "03",
    law: "临界点不会提前宣告自己",
    math: "r → 0",
    lawCopy: "稳定态与不稳定态逐渐靠近，直到它们在临界点相遇。",
    projection:
      "真正重要的并不是‘今天是不是更累了’，而是：这个环境是否还允许你恢复。",
  },
  {
    index: "04",
    law: "有些状态不是变差，而是消失",
    math: "r > 0",
    lawCopy: "越过临界点后，原来的平衡解不再存在。继续施加同样的恢复方式，也无法让系统回到那个状态。",
    projection:
      "当长期失眠、焦虑或身体损耗已经让‘休息以后恢复正常’不再发生，问题可能已经从‘还能不能坚持’变成‘原来的平衡是否还存在’。",
  },
] as const;

export function PlanetLawMvp({ opinionId }: { opinionId: string }) {
  const router = useRouter();
  const search = useSearchParams();

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

  return (
    <main className={styles.page} data-el="planet-law-mvp">
      <div className={styles.glow} aria-hidden />

      <header className={styles.topbar}>
        <button type="button" onClick={returnToGalaxy} className={styles.backButton}>
          <ArrowLeft size={15} />
          返回主星系
        </button>
        <span className={styles.coordinates}>PLANET LAW · 01</span>
      </header>

      <section className={`${styles.hero} ${styles.reveal}`} style={{ animationDelay: "80ms" }}>
        <span className={styles.eyebrow}>观点星球 · 身心与边界</span>
        <h1>长期消耗身心的工作，离开也可以是一种止损。</h1>
        <p className={styles.heroLead}>每颗星球都由一条法则支配。这里的法则，决定一个稳定状态何时仍然存在，又何时彻底消失。</p>
      </section>

      <section className={`${styles.lawCard} ${styles.reveal}`} style={{ animationDelay: "240ms" }}>
        <div className={styles.lawMeta}>
          <span>第一法则</span>
          <strong>临界消失</strong>
          <small>Saddle-node bifurcation · 鞍结分岔</small>
        </div>

        <div className={styles.formula} aria-label="x dot equals r plus x squared">
          <span className={styles.xdot}>ẋ</span>
          <span>=</span>
          <span>r</span>
          <span>+</span>
          <span>x²</span>
        </div>

        <div className={styles.originalMeaning}>
          <span>这条法则原本描述什么？</span>
          <p>
            鞍结分岔是动力系统中的经典临界现象：随着控制参数缓慢变化，一个稳定态和一个不稳定态会逐渐靠近，在临界点相遇并消失。
          </p>
        </div>
      </section>

      <section className={styles.derivation}>
        <div className={`${styles.sectionTitle} ${styles.reveal}`} style={{ animationDelay: "380ms" }}>
          <span>LAW → REALITY</span>
          <h2>法则如何投影到这个观点</h2>
          <p>不从变量开始解释。先看这条方程真正有意思的行为，再把这种结构投回现实。</p>
        </div>

        <div className={styles.steps}>
          {LAW_STEPS.map((step, index) => (
            <article
              key={step.index}
              className={`${styles.step} ${styles.reveal}`}
              style={{ animationDelay: `${520 + index * 170}ms` }}
            >
              <div className={styles.stepIndex}>{step.index}</div>
              <div className={styles.stepBody}>
                <div className={styles.stepLaw}>
                  <div>
                    <span>法则</span>
                    <h3>{step.law}</h3>
                  </div>
                  <code>{step.math}</code>
                </div>
                <p className={styles.lawCopy}>{step.lawCopy}</p>
                <div className={styles.projection}>
                  <span>现实投影</span>
                  <p>{step.projection}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.conclusion} ${styles.reveal}`} style={{ animationDelay: "1240ms" }}>
        <span className={styles.conclusionLabel}>LAW INFERENCE</span>
        <h2>这颗星球因此相信</h2>
        <blockquote>长期消耗身心的工作，离开也可以是一种止损。</blockquote>
        <p>
          离开并不一定意味着放弃一个仍然稳定的状态。有时，真正发生的是：原来的稳定状态已经失去了继续存在的条件。
        </p>
      </section>

      <section className={`${styles.observationGate} ${styles.reveal}`} style={{ animationDelay: "1400ms" }}>
        <div className={styles.observationIcon} aria-hidden>
          <Telescope size={24} />
        </div>
        <div className={styles.observationCopy}>
          <span>OBSERVATIONS</span>
          <h2>法则之外，还有真实世界留下的观测。</h2>
          <p>这些记录不负责“证明”公式。它们让我们看到，这个数学结构能够照亮哪些真实经验，又有哪些地方无法解释。</p>
        </div>
        <button type="button" onClick={openObservations} className={styles.archiveButton}>
          <BookOpen size={17} />
          进入观测档案
          <ArrowRight size={16} />
        </button>
      </section>

      <footer className={styles.disclaimer}>
        数学法则在这里是一种结构化理解工具，不是对人生处境的定量预测模型。
      </footer>
    </main>
  );
}
