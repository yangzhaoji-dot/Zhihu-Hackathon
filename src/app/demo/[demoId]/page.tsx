"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { SpaceShell } from "@/components/cognitive-galaxy/space-shell";
import { HOME_DEMOS } from "@/lib/cognitive-galaxy/demo";
import { searchGalaxy, searchQuestionNetwork } from "@/lib/api/cognitive-galaxy";
import { saveGalaxy, saveQuestionNetwork, universeUrl } from "@/lib/cognitive-galaxy/session";
import type { Question, QuestionNetwork, QuestionRelation } from "@/lib/opinion/types";

function normalized(value: string) {
  return value.replace(/[\s?？!！,，.。:：;；、“”‘’\"'《》【】()（）]/g, "").toLocaleLowerCase("zh-CN");
}

const RELATED_BY_DEMO: Record<string, Array<{ title: string; kind: NonNullable<Question["kind"]>; type: QuestionRelation["type"]; label: string }>> = {
  "demo-luoci": [
    { title: "裸辞前应该准备多少存款？", kind: "sub", type: "add", label: "分叉问题" },
    { title: "职场压力到什么程度应该离开？", kind: "prerequisite", type: "cond", label: "前置追问" },
    { title: "裸辞后的空窗期会影响求职吗？", kind: "extension", type: "add", label: "延伸追问" },
    { title: "应该先找到下家再辞职吗？", kind: "related", type: "support", label: "相邻问题" },
    { title: "转行需要先辞职吗？", kind: "related", type: "support", label: "相邻问题" },
  ],
  "demo-ai-programmers": [
    { title: "AI 会先替代程序员的哪些工作？", kind: "sub", type: "add", label: "分叉问题" },
    { title: "程序员应该如何学习 AI？", kind: "extension", type: "add", label: "延伸追问" },
    { title: "软件工程师未来最需要哪些能力？", kind: "related", type: "support", label: "相邻问题" },
    { title: "AI 提高效率会减少程序员岗位吗？", kind: "prerequisite", type: "cond", label: "前置追问" },
    { title: "初级程序员会更容易被 AI 替代吗？", kind: "related", type: "support", label: "相邻问题" },
  ],
  "demo-study-value": [
    { title: "什么情况下读研值得？", kind: "sub", type: "add", label: "分叉问题" },
    { title: "读研和工作三年哪个成长更快？", kind: "related", type: "support", label: "相邻问题" },
    { title: "硕士学历对求职帮助有多大？", kind: "extension", type: "add", label: "延伸追问" },
    { title: "工作后再读研值得吗？", kind: "temporal", type: "cond", label: "跨越阶段" },
    { title: "导师和研究方向应该怎么选？", kind: "prerequisite", type: "cond", label: "前置追问" },
  ],
  "demo-grade-project": [
    { title: "保研到底有多看重绩点？", kind: "prerequisite", type: "cond", label: "前置追问" },
    { title: "做项目对找实习有多大帮助？", kind: "extension", type: "add", label: "延伸追问" },
    { title: "本科生应该什么时候开始做科研？", kind: "sub", type: "add", label: "分叉问题" },
    { title: "绩点和科研项目应该如何平衡？", kind: "related", type: "support", label: "相邻问题" },
    { title: "大学阶段最值得培养什么能力？", kind: "related", type: "support", label: "相邻问题" },
  ],
};

function localDemoNetwork(demoId: string, title: string): QuestionNetwork {
  const positions = [
    { x: .15, y: .28 }, { x: .46, y: .16 }, { x: .82, y: .27 }, { x: .20, y: .76 }, { x: .79, y: .73 },
  ];
  const related = RELATED_BY_DEMO[demoId] ?? [];
  const questions: Question[] = [
    { id: demoId, title, x: .5, y: .49, core: true },
    ...related.map((item, index) => ({
      id: `demo-related:${demoId}:${index}`,
      title: item.title,
      kind: item.kind,
      x: positions[index]?.x ?? .5,
      y: positions[index]?.y ?? .5,
    })),
  ];
  const relations: QuestionRelation[] = related.map((item, index) => ({
    from: demoId,
    to: `demo-related:${demoId}:${index}`,
    type: item.type,
    label: item.label,
  }));
  if (related.length >= 4) {
    relations.push(
      { from: `demo-related:${demoId}:0`, to: `demo-related:${demoId}:3`, type: "add", label: "回响" },
      { from: `demo-related:${demoId}:1`, to: `demo-related:${demoId}:4`, type: "cond", label: "条件关联" },
    );
  }
  return { coreQuestionId: demoId, questions, relations };
}

export default function DemoGroundingPage() {
  const { demoId: rawId } = useParams<{ demoId: string }>();
  const demoId = decodeURIComponent(rawId);
  const router = useRouter();
  const demo = useMemo(() => HOME_DEMOS.find((item) => item.id === demoId), [demoId]);

  useEffect(() => {
    if (!demo) {
      router.replace("/");
      return;
    }
    const abort = new AbortController();
    const timeout = window.setTimeout(() => abort.abort(), 35_000);
    void (async () => {
      try {
        const discovery = await searchGalaxy(demo.title, undefined, undefined, abort.signal);
        if (!discovery.selectionRequired || discovery.questions.length === 0) throw new Error("demo_question_not_found");
        const targetTitle = normalized(demo.title);
        const candidate = discovery.questions.find((item) => normalized(item.title) === targetTitle)
          ?? discovery.questions.find((item) => normalized(item.title).includes(targetTitle) || targetTitle.includes(normalized(item.title)))
          ?? discovery.questions[0];
        const built = await searchGalaxy(demo.title, candidate.url, candidate.title, abort.signal);
        if (built.selectionRequired) throw new Error("demo_question_unresolved");
        saveGalaxy(built.graph);

        try {
          const network = await searchQuestionNetwork({
            query: demo.title,
            coreQuestionId: built.graph.questionId,
            coreTitle: built.graph.questionTitle,
            coreUrl: built.graph.questionUrl || candidate.url,
          }, abort.signal);
          saveQuestionNetwork(network);
          router.replace(universeUrl(built.graph.questionId));
        } catch {
          saveQuestionNetwork(localDemoNetwork(demo.id, demo.title));
          router.replace(universeUrl(demo.id));
        }
      } catch {
        saveQuestionNetwork(localDemoNetwork(demo.id, demo.title));
        router.replace(universeUrl(demo.id));
      } finally {
        window.clearTimeout(timeout);
      }
    })();
    return () => {
      window.clearTimeout(timeout);
      abort.abort();
    };
  }, [demo, router]);

  return <SpaceShell map><main style={{minHeight:"calc(100dvh - 104px)",display:"grid",placeItems:"center",textAlign:"center",padding:32}}>
    <div style={{display:"grid",gap:14,justifyItems:"center",maxWidth:620}}>
      <LoaderCircle size={30} style={{animation:"spin 1s linear infinite"}}/>
      <h1 style={{fontSize:"clamp(24px,3vw,40px)",fontWeight:400}}>正在从知乎残存档案恢复这片星系</h1>
      <p style={{color:"var(--cg-muted)",lineHeight:1.8}}>优先读取真实知乎问题与回答来源；若信号暂时不可达，仍会保留问题之间的追问网络并进入本地演示。</p>
    </div>
  </main></SpaceShell>;
}
