/**
 * AI Call Logger — wraps generateText to track token usage and costs
 *
 * Logs every AI API call with model, tokens, estimated cost, and source.
 * Works with the existing api_call_log table using provider='openai' or 'anthropic'.
 */

import { generateText } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { logApiCall } from "@/lib/api-call-logger";

// Token pricing per 1M tokens (as of 2026)
const TOKEN_PRICING: Record<string, { input: number; output: number }> = {
  "openai/gpt-4o-mini": { input: 0.15, output: 0.60 },
  "openai/gpt-4o": { input: 2.50, output: 10.00 },
  "openai/gpt-4-turbo": { input: 10.00, output: 30.00 },
  "anthropic/claude-opus-4": { input: 15.00, output: 75.00 },
  "anthropic/claude-sonnet-4": { input: 3.00, output: 15.00 },
  "anthropic/claude-haiku-4": { input: 0.80, output: 4.00 },
};

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = TOKEN_PRICING[model] || TOKEN_PRICING["openai/gpt-4o-mini"];
  return (promptTokens * pricing.input + completionTokens * pricing.output) / 1_000_000;
}

/**
 * Tracked version of generateText that logs token usage and estimated cost.
 * Drop-in replacement for `generateText` from the `ai` package.
 */
export async function trackedGenerateText(params: {
  model: string; // e.g., "openai/gpt-4o-mini"
  system?: string;
  prompt?: string;
  messages?: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
  maxOutputTokens?: number;
  source?: string; // e.g., "chat-prequalifier", "sms-assistant", "briefing"
  agentId?: string;
}): Promise<{
  text: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  estimatedCost?: number;
}> {
  const modelId = params.model;
  const start = Date.now();

  const result = await generateText({
    model: gateway(modelId),
    system: params.system,
    prompt: params.prompt,
    messages: params.messages,
    temperature: params.temperature,
    maxTokens: params.maxTokens || params.maxOutputTokens,
  });

  const responseTimeMs = Date.now() - start;
  const usage = result.usage;
  const promptTokens = usage?.promptTokens || 0;
  const completionTokens = usage?.completionTokens || 0;
  const totalTokens = promptTokens + completionTokens;
  const cost = estimateCost(modelId, promptTokens, completionTokens);

  // Log to api_call_log
  logApiCall({
    provider: modelId.startsWith("anthropic") ? "anthropic" : "openai",
    endpoint: modelId,
    method: "POST",
    statusCode: 200,
    responseTimeMs,
    source: params.source,
    agentId: params.agentId,
  });

  // Also log detailed token usage
  logAiUsage({
    model: modelId,
    promptTokens,
    completionTokens,
    totalTokens,
    estimatedCost: cost,
    responseTimeMs,
    source: params.source,
    agentId: params.agentId,
  });

  return {
    text: result.text,
    usage: { promptTokens, completionTokens, totalTokens },
    estimatedCost: cost,
  };
}

// ── AI Usage Buffer (writes to a separate tracking mechanism) ────────────

interface AiUsageEntry {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  responseTimeMs: number;
  source?: string;
  agentId?: string;
}

let aiBuffer: AiUsageEntry[] = [];
let aiFlushTimer: ReturnType<typeof setTimeout> | null = null;

function logAiUsage(entry: AiUsageEntry): void {
  aiBuffer.push(entry);

  if (aiBuffer.length >= 10) {
    flushAiBuffer();
  }

  if (!aiFlushTimer) {
    aiFlushTimer = setTimeout(flushAiBuffer, 5000);
  }
}

async function flushAiBuffer(): Promise<void> {
  if (aiFlushTimer) {
    clearTimeout(aiFlushTimer);
    aiFlushTimer = null;
  }

  if (aiBuffer.length === 0) return;

  const entries = [...aiBuffer];
  aiBuffer = [];

  try {
    const { supabaseAdmin } = await import("@/lib/supabase/admin");

    // Write to ai_token_usage table (detailed token tracking)
    const tokenRows = entries.map(e => ({
      model: e.model,
      prompt_tokens: e.promptTokens,
      completion_tokens: e.completionTokens,
      total_tokens: e.totalTokens,
      estimated_cost: e.estimatedCost,
      response_time_ms: e.responseTimeMs,
      source: e.source || null,
      agent_id: e.agentId || null,
    }));

    await supabaseAdmin.from("ai_token_usage").insert(tokenRows);
  } catch {
    // Silent fail
  }
}
