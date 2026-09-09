import "server-only";

import { appAi } from "@/lib/eazo-ai-billing";

/** A single chat message for the App AI text model. */
export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
  [key: string]: unknown;
}

type ChatCompletionLike = {
  choices?: Array<{ message?: { content?: string } }>;
};

/**
 * Call the configured App AI text model and return the raw completion string.
 * Throws AppAIUnavailableError (from the billing helper) when AI is unavailable;
 * callers own the fallback.
 */
export async function aiComplete(messages: AiMessage[]): Promise<string> {
  const completion = (await appAi.chat({
    capability: "text",
    messages,
  })) as ChatCompletionLike;
  return completion.choices?.[0]?.message?.content?.trim() ?? "";
}

/**
 * Extract the first JSON object from a model response that may include prose or
 * ```json fences. Returns null when nothing parses.
 */
export function parseJsonLoose<T>(raw: string): T | null {
  if (!raw) return null;
  // Strip code fences.
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : raw;
  // Find the outermost object.
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

/** Call the model and parse a JSON object, or return null on any failure. */
export async function aiJson<T>(messages: AiMessage[]): Promise<T | null> {
  try {
    const raw = await aiComplete(messages);
    return parseJsonLoose<T>(raw);
  } catch {
    return null;
  }
}
