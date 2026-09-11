"use client";

import { request } from "@/lib/api/request";
import { getViewerId } from "@/lib/opinion/viewer-id";
import type { DialogueLine, WorldDialogueReply } from "@/lib/opinion/types";

export interface PlanetDialogueRequestInput {
  questionId: string;
  opinionId: string;
  trigger: "inspect";
  locale: string;
  history: { speaker: string; text: string }[];
  worldState?: Record<string, unknown>;
}

export async function postPlanetDialogue(
  input: PlanetDialogueRequestInput,
): Promise<{ lines: DialogueLine[]; source: WorldDialogueReply["source"] } | null> {
  try {
    const res = await request("/api/opinion/world/dialogue", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-viewer-id": getViewerId() },
      body: JSON.stringify(input),
    });
    const data = (await res.json()) as { reply?: WorldDialogueReply };
    if (!res.ok || !data.reply?.lines?.length) return null;
    return data.reply;
  } catch {
    return null;
  }
}
