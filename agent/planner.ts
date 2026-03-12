import { buildHeuristicOutline } from './fallback.js';
import { polishOutline } from './polisher.js';
import { normalizeOutline } from './normalize.js';
import { buildPlanPrompt } from './prompt-builder.js';
import { callKimiJson } from './moonshot-client.js';
import type { KimiConfig, OutlineResult, PlanContext } from './types.js';

// Planner 阶段优先使用 LLM，但必须保证通过 fallback 返回可用大纲。
export const requestKimiPlan = async (
  config: KimiConfig,
  markdown: string,
  context?: PlanContext
): Promise<{ outline: OutlineResult; mode: 'llm' | 'fallback' }> => {
  try {
    const payload = await callKimiJson({
      config,
      prompt: buildPlanPrompt(markdown, context),
      timeoutMs: 6000,
      maxTokens: 500
    });
    return { outline: polishOutline(normalizeOutline(payload)), mode: 'llm' };
  } catch (error) {
    console.error('[plan-fallback]', (error as Error)?.message || error);
    return { outline: polishOutline(buildHeuristicOutline(markdown)), mode: 'fallback' };
  }
};
