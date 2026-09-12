"use client";

import { request } from "@/lib/api/request";
import type { PlanetSynthesisResult, SelectedExcerptInput } from "@/lib/planet-synthesis/model";

export async function synthesizePlanetViewpoint(input: {
  opinionId: string;
  selections: SelectedExcerptInput[];
}): Promise<PlanetSynthesisResult> {
  const response = await request("/api/opinion/synthesize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await response.json() as { result?: PlanetSynthesisResult; error?: string };
  if (!response.ok || !data.result) throw new Error(data.error || "synthesis_failed");
  return data.result;
}
