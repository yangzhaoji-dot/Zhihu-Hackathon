"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { SpaceShell } from "@/components/cognitive-galaxy/space-shell";
import { HOME_DEMOS } from "@/lib/cognitive-galaxy/demo";
import { searchGalaxy, searchQuestionNetwork } from "@/lib/api/cognitive-galaxy";
import { galaxyUrl, saveGalaxy, saveQuestionNetwork, universeUrl } from "@/lib/cognitive-galaxy/session";

function normalized(value: string) {
  return value.replace(/[\s?？!！,，.。:：;；、“”‘’"'《》【】()（）]/g, "").toLocaleLowerCase("zh-CN");
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
          router.replace(galaxyUrl(built.graph.questionId));
        }
      } catch {
        router.replace(galaxyUrl(demo.id));
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
      <p style={{color:"var(--cg-muted)",lineHeight:1.8}}>优先读取真实知乎问题与回答来源；若信号暂时不可达，将自动进入本地策展演示。</p>
    </div>
  </main></SpaceShell>;
}
