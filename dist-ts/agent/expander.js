import { analyzeMarkdown, buildPlanningProfile } from './analysis.js';
import { buildHeuristicExpanded } from './fallback.js';
import { normalizeExpanded } from './normalize.js';
import { buildExpandPrompt } from './prompt-builder.js';
import { callKimiJson } from './moonshot-client.js';
// Expander 阶段在已确认大纲基础上补足可上屏内容，并保持大纲顺序稳定。
export const requestKimiExpand = async (config, markdown, outline) => {
    const analysis = analyzeMarkdown(markdown);
    const profile = buildPlanningProfile(analysis);
    try {
        const payload = await callKimiJson({
            config,
            prompt: buildExpandPrompt({ markdown, outline, analysis, profile }),
            timeoutMs: 12000,
            maxTokens: 900
        });
        return { expanded: normalizeExpanded(payload), mode: 'llm' };
    }
    catch (error) {
        console.error('[expand-fallback]', error?.message || error);
        return { expanded: buildHeuristicExpanded(markdown, outline), mode: 'fallback' };
    }
};
