"use client";

import { ArrowLeft, ArrowRight, BookOpen, Telescope } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./planet-law-mvp.module.css";

const LAW_STEPS = [
  {
    index: "01",
    law: "变化可以是缓慢的",
    math: "r ↑",
    lawCopy: "控制参数可以一点点改变，系统却仍然维持原来的状态。",
    projectionTitle: "灾难，并不总是突然降临。",
    projection:
      "工作压力可能只是每天多一点，睡眠每天少一点，情绪每天差一点。单独看任何一天，都不像必须离开的理由。",
  },
  {
    index: "02",
    law: "稳定存在边界",
    math: "r < 0",
    lawCopy: "在临界点之前，稳定态仍然存在。受到扰动之后，系统仍有机会回到原来的平衡。",
    projectionTitle: "恢复，是稳定仍然存在的证据。",
    projection:
      "累的时候休息一个周末还能恢复，压力增加后仍能重新建立节奏——此时，继续留下仍然是一种可维持的状态。",
  },
  {
    index: "03",
    law: "临界点不会提前宣告自己",
    math: "r → 0",
    lawCopy: "稳定态与不稳定态逐渐靠近。表面仍可维持，但系统能够承受扰动的余量正在消失。",
    projectionTitle: "最危险的时候，世界可能仍然看起来正常。",
    projection:
      "真正重要的并不是‘今天是不是更累了’，而是：这个环境是否还允许你恢复。",
  },
  {
    index: "04",
    law: "有些状态不是变差，而是消失",
    math: "r > 0",
    lawCopy: "越过临界点后，原来的平衡解不再存在。继续施加同样的恢复方式，也无法让系统回到那个状态。",
    projectionTitle: "有些平衡，一旦失去，便不再等待你回来。",
    projection:
      "当长期失眠、焦虑或身体损耗已经让‘休息以后恢复正常’不再发生，问题可能已经从‘还能不能坚持’变成‘原来的平衡是否还存在’。",
  },
] as const;

type MythicSceneProps = {
  label?: string;
  title?: ReactNode;
  math?: string;
  children?: ReactNode;
  tone?: "default" | "law" | "projection" | "climax";
};

function MythicScene({ label, title, math, children, tone = "default" }: MythicSceneProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      {
        rootMargin: "-24% 0px -24% 0px",
        threshold: 0.08,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const toneClass =
    tone === "law"
      ? styles.sceneLaw
      : tone === "projection"
        ? styles.sceneProjection
        : tone === "climax"
          ? styles.sceneClimax
          : "";

  return (
    <section ref={ref} className={`${styles.scene} ${toneClass} ${active ? styles.sceneActive : ""}`}>
      <div className={styles.sceneAura} aria-hidden />
      <div className={styles.sceneContent}>
        {label ? <span className={`${styles.sceneLabel} ${styles.sceneLine}`}>{label}</span> : null}
        {math ? <div className={`${styles.sceneMath} ${styles.sceneLine}`}>{math}</div> : null}
        {title ? <h2 className={`${styles.sceneTitle} ${styles.sceneLine}`}>{title}</h2> : null}
        {children ? <div className={`${styles.sceneCopy} ${styles.sceneLine}`}>{children}</div> : null}
      </div>
    </section>
  );
}

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

      <MythicScene label="观点星球 · 身心与边界" tone="climax">
        <h1 className={styles.opinionTitle}>长期消耗身心的工作，离开也可以是一种止损。</h1>
        <p className={styles.opinionPrelude}>每颗星球都由一条法则支配。这里的法则，决定一种稳定何时仍被世界允许，又何时从世界中消失。</p>
      </MythicScene>

      <MythicScene label="第一法则 · 临界消失" math="ẋ = r + x²" tone="law">
        <p className={styles.lawIdentity}>Saddle-node bifurcation · 鞍结分岔</p>
      </MythicScene>

      <MythicScene label="法则原义" title="两种状态，在临界点相遇。" tone="law">
        <p>鞍结分岔是动力系统中的经典临界现象：随着控制参数缓慢变化，一个稳定态与一个不稳定态逐渐靠近，最终在临界点相遇，并同时消失。</p>
      </MythicScene>

      {LAW_STEPS.flatMap((step) => [
        <MythicScene key={`${step.index}-law`} label={`第 ${step.index} 律`} title={step.law} math={step.math} tone="law">
          <p>{step.lawCopy}</p>
        </MythicScene>,
        <MythicScene key={`${step.index}-projection`} label="现实投影" title={step.projectionTitle} tone="projection">
          <p>{step.projection}</p>
        </MythicScene>,
      ])}

      <MythicScene label="LAW INFERENCE · 法则推论" title="稳定态消失了。" tone="climax">
        <p className={styles.climaxLine}>不是它变得更差。</p>
        <p className={styles.climaxLine}>而是原来那个可以恢复的状态，已经失去了继续存在的条件。</p>
      </MythicScene>

      <MythicScene label="这颗星球因此相信" tone="climax">
        <blockquote className={styles.finalBelief}>长期消耗身心的工作，离开也可以是一种止损。</blockquote>
        <p>离开未必意味着放弃一个仍然稳定的世界。有时，它只是承认：旧的平衡，已经不再存在。</p>
      </MythicScene>

      <MythicScene label="OBSERVATIONS · 观测档案" title="法则之外，还有真实世界留下的记录。">
        <p>这些记录不负责证明公式。它们让我们看到，这个数学结构能够照亮哪些真实经验，又有哪些地方无法解释。</p>
        <button type="button" onClick={openObservations} className={styles.archiveButton}>
          <Telescope size={17} />
          <BookOpen size={16} />
          进入观测档案
          <ArrowRight size={16} />
        </button>
      </MythicScene>

      <footer className={styles.disclaimer}>
        数学法则在这里是一种结构化理解工具，不是对人生处境的定量预测模型。
      </footer>
    </main>
  );
}
