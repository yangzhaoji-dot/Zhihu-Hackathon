import "server-only";

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { appAi } from "@/lib/eazo-ai-billing";

const execFileAsync = promisify(execFile);
const ZHIDA_ENDPOINT = "https://developer.zhihu.com/v1/chat/completions";
const DEFAULT_ZHIDA_MODEL = "zhida-thinking-1p5";

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
  [key: string]: unknown;
}

type ChatCompletionLike = {
  choices?: Array<{ message?: { content?: string } }>;
};

export type AiProvider = "zhihu-zhida" | "eazo" | "none";

export interface AiCompletion {
  content: string;
  provider: AiProvider;
  model?: string;
}

export interface AiJsonResult<T> {
  value: T;
  provider: Exclude<AiProvider, "none">;
  model?: string;
}

function configuredZhihuModel() {
  return process.env.ZHIHU_ZHIDA_MODEL?.trim() || DEFAULT_ZHIDA_MODEL;
}

function promptForCli(messages: AiMessage[]) {
  return messages
    .map((message) => `${message.role.toUpperCase()}:\n${message.content}`)
    .join("\n\n");
}

async function completeWithZhihuHttp(messages: AiMessage[]): Promise<AiCompletion> {
  const secret = process.env.ZHIHU_ACCESS_SECRET?.trim();
  if (!secret) throw new Error("zhihu_secret_not_configured");
  const model = configuredZhihuModel();
  const response = await fetch(ZHIDA_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
      "X-Request-Timestamp": String(Math.floor(Date.now() / 1000)),
    },
    body: JSON.stringify({ model, messages, stream: false }),
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`zhida_http_${response.status}`);
  const payload = await response.json() as ChatCompletionLike;
  const content = payload.choices?.[0]?.message?.content?.trim() || "";
  if (!content) throw new Error("zhida_empty_response");
  return { content, provider: "zhihu-zhida", model };
}

async function completeWithZhihuCli(messages: AiMessage[]): Promise<AiCompletion> {
  if (process.platform !== "win32" || !process.env.LOCALAPPDATA) {
    throw new Error("zhihu_cli_unavailable");
  }
  const cli = `${process.env.LOCALAPPDATA}\\ZhihuCLI\\current\\zhihu-cli.exe`;
  const model = configuredZhihuModel();
  const { stdout } = await execFileAsync(
    cli,
    [
      "answer",
      "--query",
      promptForCli(messages),
      "--model",
      model,
      "--output",
      "json",
      "--timeout",
      "60s",
    ],
    { windowsHide: true, timeout: 65_000, maxBuffer: 4 * 1024 * 1024 },
  );
  const payload = JSON.parse(stdout) as ChatCompletionLike;
  const content = payload.choices?.[0]?.message?.content?.trim() || "";
  if (!content) throw new Error("zhida_empty_response");
  return { content, provider: "zhihu-zhida", model };
}

function completeWithZhihu(messages: AiMessage[]) {
  return process.env.ZHIHU_ACCESS_SECRET?.trim()
    ? completeWithZhihuHttp(messages)
    : completeWithZhihuCli(messages);
}

async function completeWithEazo(messages: AiMessage[]): Promise<AiCompletion> {
  const completion = (await appAi.chat({
    capability: "text",
    messages,
  })) as ChatCompletionLike;
  const content = completion.choices?.[0]?.message?.content?.trim() || "";
  if (!content) throw new Error("eazo_empty_response");
  return { content, provider: "eazo" };
}

export async function aiCompleteWithProvider(messages: AiMessage[]): Promise<AiCompletion> {
  const preferred = (process.env.OPINION_AI_PROVIDER || "zhihu").trim().toLowerCase();
  if (preferred === "eazo") {
    try {
      return await completeWithEazo(messages);
    } catch {
      try {
        return await completeWithZhihu(messages);
      } catch {
        return { content: "", provider: "none" };
      }
    }
  }
  try {
    return await completeWithZhihu(messages);
  } catch {
    try {
      return await completeWithEazo(messages);
    } catch {
      return { content: "", provider: "none" };
    }
  }
}

export async function aiComplete(messages: AiMessage[]): Promise<string> {
  return (await aiCompleteWithProvider(messages)).content;
}

export function parseJsonLoose<T>(raw: string): T | null {
  if (!raw) return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : raw;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

export async function aiJsonWithProvider<T>(messages: AiMessage[]): Promise<AiJsonResult<T> | null> {
  const completion = await aiCompleteWithProvider(messages);
  if (completion.provider === "none") return null;
  const value = parseJsonLoose<T>(completion.content);
  return value ? { value, provider: completion.provider, model: completion.model } : null;
}

export async function aiJson<T>(messages: AiMessage[]): Promise<T | null> {
  return (await aiJsonWithProvider<T>(messages))?.value ?? null;
}
