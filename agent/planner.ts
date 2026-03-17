import { buildHeuristicOutline } from './fallback.js';
import { polishOutline } from './polisher.js';
import { normalizeOutline } from './normalize.js';
import { buildPlanPrompt } from './prompt-builder.js';
import type { LlmJsonProvider, OutlineResult, PlanContext } from './types.js';

interface PlanRequestOptions {
  allowFallback?: boolean;
  timeoutMs?: number;
  maxTokens?: number;
}

// Planner 阶段优先使用 provider，但必须保证通过 fallback 返回可用大纲。
export const requestPlan = async (
  provider: LlmJsonProvider,
  markdown: string,
  context?: PlanContext,
  options: PlanRequestOptions = {}
): Promise<{ outline: OutlineResult; mode: 'llm' | 'fallback' }> => {
  try {
    const payload = await provider.callJson({
      prompt: buildPlanPrompt(markdown, context),
      timeoutMs: options.timeoutMs ?? 6000,
      maxTokens: options.maxTokens ?? 500
    });
    return { outline: polishOutline(normalizeOutline(payload)), mode: 'llm' };
  } catch (error) {
    if (options.allowFallback === false) {
      throw error;
    }
    console.error('[plan-fallback]', (error as Error)?.message || error);
    return { outline: polishOutline(buildHeuristicOutline(markdown, context)), mode: 'fallback' };
  }
};
