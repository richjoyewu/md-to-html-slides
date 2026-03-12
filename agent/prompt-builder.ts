import { analyzeMarkdown, buildPlanningProfile } from './analysis.js';
import { preprocessMarkdown } from './preprocess.js';
import type { MarkdownAnalysis, OutlineResult, PlanContext, PlanningProfile } from './types.js';

// Planner prompt 只关注结构：标题、顺序、摘要、intent。
export const buildPlanPrompt = (markdown: string, context?: PlanContext): string => {
  const source = preprocessMarkdown(markdown);
  const analysis = analyzeMarkdown(markdown);
  const answers = context?.answers || {};
  const profile = buildPlanningProfile(analysis);
  return [
    '你是一个高质量中文演示文稿 Planner。',
    '先理解输入，再规划为适合上屏的页结构。',
    '只输出 JSON。',
    '格式: {"deck_title":"...","slides":[{"index":1,"title":"...","summary":"...","preview_points":["..."],"detail_points":["..."],"intent":"..."}] }',
    '关键规则:',
    '- 这一步只做页结构规划，不要生成正文段落',
    `- 目标页数尽量接近 ${analysis.suggested_slide_count} 页，允许上下浮动 1 页`,
    '- 一页只保留一个核心点',
    '- title 要短、像演示标题，不要像章节小节标题',
    '- 不要直接复述冗长原句，优先改写成更适合上屏的中文短标题',
    '- summary 每页一句话，描述该页要讲什么',
    '- detail_points 每页提供 3 到 5 条完整短要点，用于确认本页内容',
    '- preview_points 取 detail_points 的前 2 到 3 条，用于折叠态预览',
    '- detail_points 和 preview_points 都必须短句化，避免整段解释和原文照搬',
    '- intent 只能从 define, explain, compare, example, process, summary, cta 中选择',
    '- 如果有总结价值，最后一页优先做 summary',
    '- 如果 rewrite_strategy 是 aggressive_rewrite，优先重组原文，而不是复述原句',
    '- 粗糙输入要主动补结构、补过渡，不要把原始顺序原封不动搬上屏',
    '',
    '用户补充信息:',
    JSON.stringify(answers, null, 2),
    '',
    '输入分析:',
    JSON.stringify(analysis, null, 2),
    '',
    '规划策略:',
    JSON.stringify(profile, null, 2),
    '',
    '输入 sections:',
    JSON.stringify(source, null, 2)
  ].join('\n');
};

// Expander prompt 在大纲确认后补足可渲染内容，并根据内容类型控制改写力度。
export const buildExpandPrompt = ({
  markdown,
  outline,
  analysis,
  profile
}: {
  markdown: string;
  outline: OutlineResult;
  analysis: MarkdownAnalysis;
  profile: PlanningProfile;
}): string => {
  const source = preprocessMarkdown(markdown);
  return [
    '你是一个高质量中文演示文稿 Expander。',
    '根据用户原始内容和已确认大纲，为每页补充可直接上屏的展示内容。',
    '只输出 JSON。',
    '格式: {"deck_title":"...","slides":[{"index":1,"title":"...","format":"title-bullets","bullets":["..."],"body":""}] }',
    '要求:',
    '- format 只能使用 title-bullets, title-body, summary',
    '- 大多数页面使用 title-bullets',
    '- bullets 保持 3 到 5 条，必须是可上屏短句，不要复制原始长句',
    '- body 只在 title-body 或 summary 页面使用，且不超过两句',
    '- 不要改动已确认大纲顺序和页标题主旨',
    '- 如果 rewrite_strategy 不是 preserve，要主动把说明文改成结论式、展示式表达',
    '- course 内容强调教学顺序和概念清晰',
    '- report 内容强调结论、判断和建议',
    '- pitch 内容强调问题、价值、方案、优势',
    '- story 内容强调推进、转折和结果',
    '- 避免 bullet 之间重复表达',
    '- summary 页优先输出 3 条收束性 bullet 或 1 段很短 body',
    '',
    '输入分析:',
    JSON.stringify(analysis, null, 2),
    '',
    '扩展策略:',
    JSON.stringify(profile, null, 2),
    '',
    '已确认大纲:',
    JSON.stringify(outline, null, 2),
    '',
    '原始内容摘要:',
    JSON.stringify(source, null, 2)
  ].join('\n');
};
