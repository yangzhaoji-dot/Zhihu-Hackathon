"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, Orbit, Radio, Sparkles } from "lucide-react";
import { SpaceShell } from "@/components/cognitive-galaxy/space-shell";
import { searchGalaxy } from "@/lib/api/cognitive-galaxy";
import { galaxyUrl, readQuestionNetwork, saveGalaxy } from "@/lib/cognitive-galaxy/session";
import type { Question, QuestionNetwork, QuestionRelation } from "@/lib/opinion/types";
import styles from "./page.module.css";

const KIND_LABEL: Record<string, string> = {
  related: "相邻追问",
  sub: "分叉问题",
  prerequisite: "前置追问",
  extension: "延伸追问",
  temporal: "跨越年代",
};

function questionUrl(question: Question) {
  if (!question.id.startsWith("zhihu:")) return null;
  const id = question.id.slice("zhihu:".length);
  return /^\d+$/.test(id) ? `https://www.zhihu.com/question/${id}` : null;
}

function relationClass(relation: QuestionRelation) {
  return relation.type === "oppose" ? styles.lineOppose : relation.type === "cond" ? styles.lineCond : relation.type === "support" ? styles.lineSupport : styles.lineAdd;
}

export default function LostUniversePage() {
  const { questionId: rawId } = useParams<{ questionId: string }>();
  const questionId = decodeURIComponent(rawId);
  const router = useRouter();
  const [network, setNetwork] = useState<QuestionNetwork | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setNetwork(readQuestionNetwork(questionId));
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [questionId]);

  const byId = useMemo(() => new Map(network?.questions.map((question) => [question.id, question]) ?? []), [network]);

  const enter = async (question: Question) => {
    setError(null);
    if (question.id === questionId) {
      router.push(galaxyUrl(questionId));
      return;
    }
    const url = questionUrl(question);
    if (!url) { setError("这处星系的原始坐标已经损坏。"); return; }
    setBusyId(question.id);
    try {
      const result = await searchGalaxy(question.title, url, question.title);
      if (result.selectionRequired) throw new Error("question_unresolved");
      saveGalaxy(result.graph);
      router.push(galaxyUrl(result.graph.questionId));
    } catch {
      setError("这段旧文明信号暂时无法还原。你仍可以沿其他连线继续追问。");
    } finally {
      setBusyId(null);
    }
  };

  if (!hydrated) {
    return <SpaceShell map><main className={styles.missing}><Radio size={24}/><h1>正在校准旧文明坐标</h1><p>残存的认知信号正在重新进入可观测范围。</p></main></SpaceShell>;
  }

  if (!network) {
    return <SpaceShell map><main className={styles.missing}><Radio size={24}/><h1>信号已经消散</h1><p>这片问题星系没有保存在当前航行记录中。</p><button onClick={() => router.push("/")}>返回可观测区域</button></main></SpaceShell>;
  }

  return <SpaceShell map>
    <main className={styles.page} data-el="lost-universe-network">
      <header className={styles.lore}>
        <span className={styles.kicker}><Radio size={12}/> LOST UNIVERSE · ARCHIVE SIGNAL</span>
        <h1>这里曾经属于人类的追问。</h1>
        <p>旧文明消失后，知乎留下的数字认知档案与现实世界的残骸发生了无法解释的重合。问题不再只是文字——它们彼此牵引，形成一座座沉默的星系。</p>
        <p className={styles.whisper}>你看到的连线，是旧人类思考留下的微弱引力。沿着它们继续追问；进入任意星系，仍能找到围绕它运行的观点星球。</p>
      </header>

      <section className={styles.stage} aria-label="问题星系网络">
        <div className={styles.voidGlow} aria-hidden/>
        <svg className={styles.links} viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden>
          {network.relations.map((relation, index) => {
            const from = byId.get(relation.from), to = byId.get(relation.to);
            if (!from || !to) return null;
            const x1 = from.x * 1000, y1 = from.y * 600, x2 = to.x * 1000, y2 = to.y * 600;
            return <g key={`${relation.from}-${relation.to}-${index}`}>
              <line className={`${styles.line} ${relationClass(relation)}`} x1={x1} y1={y1} x2={x2} y2={y2}/>
              <text className={styles.lineLabel} x={(x1+x2)/2} y={(y1+y2)/2 - 7} textAnchor="middle">{relation.label}</text>
            </g>;
          })}
        </svg>

        {network.questions.map((question) => {
          const core = question.id === network.coreQuestionId;
          const busy = busyId === question.id;
          return <button
            key={question.id}
            className={`${styles.question} ${core ? styles.core : ""}`}
            style={{ left:`${question.x*100}%`, top:`${question.y*100}%` }}
            onClick={() => void enter(question)}
            disabled={Boolean(busyId)}
            data-el={core ? "core-question-galaxy" : "related-question-galaxy"}
          >
            <span className={styles.orbit} aria-hidden><i/><b/><em/></span>
            <span className={styles.kind}>{core ? "核心问题星系" : KIND_LABEL[question.kind ?? "related"]}</span>
            <strong>{question.title}</strong>
            <small>{busy ? <><LoaderCircle size={12} className={styles.spin}/> 正在恢复旧文明档案</> : <>{core ? <Sparkles size={12}/> : <Orbit size={12}/>} 进入星系 <ArrowRight size={12}/></>}</small>
          </button>;
        })}
      </section>

      <footer className={styles.footer}>
        <span>{network.questions.length} 座可观测问题星系 · {network.relations.length} 条残存关系</span>
        {error && <p role="status">{error}</p>}
        <small>“我可以告诉你这里留下了什么，但我不能替你决定他们谁是对的。”</small>
      </footer>
    </main>
  </SpaceShell>;
}
