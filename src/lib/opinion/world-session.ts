"use client";

import type { Author, Opinion, OpinionSource, RelationType } from "./types";

export interface OpinionWorldEntry {
  opinion: Opinion;
  questionTitle: string;
  sources: OpinionSource[];
  authors: Author[];
  related: { type: RelationType; opinion: Opinion }[];
}

const PREFIX = "opinion-space:world:";

export function saveOpinionWorldEntry(entry: OpinionWorldEntry) {
  window.sessionStorage.setItem(`${PREFIX}${entry.opinion.id}`, JSON.stringify(entry));
}

export function loadOpinionWorldEntry(opinionId: string): OpinionWorldEntry | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(`${PREFIX}${opinionId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OpinionWorldEntry;
  } catch {
    return null;
  }
}
