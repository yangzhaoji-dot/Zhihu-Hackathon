"use client";

import { request } from "./request";
import type { BuildOpinionSpaceResult } from "./opinion";
import type { OpinionGraph, QuestionNetwork } from "../opinion/types";
import { isOpinionGraph } from "../cognitive-galaxy/session";

async function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  let stop: () => void = () => {};
  const cancelled = new Promise<never>((_, reject) => {
    stop = () => reject(new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", stop, { once:true });
  });
  try { return await Promise.race([promise,cancelled]); }
  finally { signal.removeEventListener("abort",stop); }
}

/** Reuses the existing authenticated/locale-aware request boundary and build endpoint. */
export async function searchGalaxy(query: string, questionUrl?: string, questionTitle?: string, signal?: AbortSignal): Promise<BuildOpinionSpaceResult> {
  const response = await abortable(request("/api/opinion/build", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, questionUrl, questionTitle }), signal,
  }),signal);
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "build_failed");
  if (data.selectionRequired === true && Array.isArray(data.questions)) {
    return { ...data, questions: data.questions.filter((q: { title?: unknown; url?: unknown }) => typeof q?.title === "string" && typeof q?.url === "string" && /^https:\/\/(www\.)?zhihu\.com\/question\/\d+\/?$/.test(q.url)) };
  }
  if (data.selectionRequired === false && isOpinionGraph(data.graph)) return data;
  throw new Error("invalid_graph");
}

export async function searchQuestionNetwork(input: {
  query: string;
  coreQuestionId: string;
  coreTitle: string;
  coreUrl: string;
}, signal?: AbortSignal): Promise<QuestionNetwork> {
  const response = await abortable(request("/api/opinion/question-network", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  }), signal);
  const data = await response.json() as { network?: QuestionNetwork; error?: string };
  if (!response.ok || !data.network || !Array.isArray(data.network.questions) || !Array.isArray(data.network.relations)) {
    throw new Error(data.error || "question_network_failed");
  }
  return data.network;
}

export async function loadGalaxy(id: string, signal?: AbortSignal): Promise<OpinionGraph> {
  const response = await abortable(request(`/api/opinion/graph?questionId=${encodeURIComponent(id)}`, { signal }),signal);
  const data = await response.json();
  // Existing server may return a default graph. Never display it under another title/id.
  if (!response.ok || !isOpinionGraph(data.graph) || data.graph.questionId !== id) throw new Error("galaxy_unavailable");
  return data.graph;
}
