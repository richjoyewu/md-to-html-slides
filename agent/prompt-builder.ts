import { analyzeMarkdown } from './analysis.js';
import { preprocessMarkdown } from './preprocess.js';
import type { MarkdownAnalysis, OutlineResult, PlanContext } from './types.js';
import { getDeckProfile } from '../shared/deck-profiles.js';

// Planner prompt：系统只提供结构事实和最少边界，内容意图、取舍和拆页决策交给 LLM。
export const buildPlanPrompt = (markdown: string, context?: PlanContext): string => {
  const source = preprocessMarkdown(markdown);
  const analysis = analyzeMarkdown(markdown);
  const answers = context?.answers || {};
  const profile = getDeckProfile(context?.profile);

  return [
    '你是一个高质量中文演示文稿 Planner。',
    '你的任务是理解输入内容，并把它规划成可确认的页面大纲。',
    '只输出 JSON。',
    '格式: {"deck_title":"...","profile":"...","default_theme":"...","content_intent":"...","audience_guess":"...","deck_goal":"...","core_message":"...","omitted_topics":["..."],"planning_confidence":0.0,"uncertainties":["..."],"slides":[{"index":1,"title":"...","summary":"...","preview_points":["..."],"detail_points":["..."],"intent":"..."}] }',
    '',
    '你必须先完成这四个内部步骤，再输出 JSON：',
    '1. 判断这份内容最终想让受众理解什么，并写成 deck_goal。',
    '2. 提炼整份内容最重要的一句核心结论，并写成 core_message。',
    '3. 判断哪些内容值得上屏，哪些内容应该被合并、后置或舍弃，并写进 omitted_topics。',
    '4. 再决定页结构，不要机械沿用原文顺序。',
    '',
    '核心要求：',
    '- deck_goal 必须是面向受众的结果目标，而不是泛泛的“介绍主题”或重复标题。',
    '- core_message 必须是一句可以单独成立的核心结论，不能只是 deck_title 的改写。',
    `- profile 固定返回 ${profile.name}。`,
    `- default_theme 固定返回 ${profile.default_theme}。`,
    '- omitted_topics 记录被主动舍弃、合并或后置的次要主题；如果没有明确舍弃项，返回空数组。',
    '- 先理解内容主线，再决定页结构，不要机械沿用原文顺序。',
    '- 允许舍弃细节，只保留适合上屏的核心内容。',
    `- 目标页数尽量接近 ${analysis.suggested_slide_count} 页，允许上下浮动 1 页。`,
    '- 一页只讲一个核心点。',
    '- title 必须像演示标题：短、清楚、可上屏，优先名词短语或结论式短句。',
    '- summary 只用一句话概括本页。',
    '- preview_points 提供 2 到 3 条核心内容，用于折叠态确认。',
    '- detail_points 提供 3 到 5 条完整短要点，用于展开态确认。',
    '- preview_points 和 detail_points 都必须短句化，不能照搬原文长句。',
    '- intent 只能从 define, explain, compare, example, process, summary, cta 中选择。',
    '- 你必须自己判断 content_intent 与 audience_guess。',
    '- 如果你对内容意图、受众、页数或重点不确定，就降低 planning_confidence，并把真正影响规划的不确定点写进 uncertainties。',
    '- uncertainties 最多 3 条；没有明显不确定就返回空数组。',
    '- 如果输入是草稿或零散笔记，应先提炼主线，再重组页面。',
    '- 如果内容有明显收束价值，最后一页优先做 summary。',
    '- 如果无法明确判断哪些内容应被省略，也要在 uncertainties 中承认这一点，而不是假装确定。',
    '',
    '当前 deck profile：',
    JSON.stringify({
      name: profile.name,
      description: profile.description,
      default_theme: profile.default_theme,
      planner_rules: profile.planner_rules,
      format_guidance: profile.format_guidance
    }, null, 2),
    '',
    '可参考的 profile 示例大纲：',
    JSON.stringify(profile.outline_example, null, 2),
    '',
    '用户补充信息：',
    JSON.stringify(answers, null, 2),
    '',
    '输入结构事实（仅供参考，不代表最终语义判断）：',
    JSON.stringify(analysis, null, 2),
    '',
    '输入 sections：',
    JSON.stringify(source, null, 2)
  ].join('\n');
};

// Expander prompt：在已确认大纲基础上，补成可上屏内容；重点是改写质量，不是扩写长度。
export const buildExpandPrompt = ({
  markdown,
  outline,
  analysis,
  context
}: {
  markdown: string;
  outline: OutlineResult;
  analysis: MarkdownAnalysis;
  context?: PlanContext;
}): string => {
  const source = preprocessMarkdown(markdown);
  const intentHint = outline.meta?.content_intent || 'general presentation';
  const audienceHint = outline.meta?.audience_guess || '未指定受众';
  const rewriteHint = analysis.rewrite_strategy;
  const profile = getDeckProfile(outline.meta?.profile);
  const answers = context?.answers || {};

  return [
    '你是一个高质量中文演示文稿 Expander。',
    '你的任务不是补更多字，而是把已确认大纲改写成能直接上屏的页面内容。',
    '只输出 JSON。',
    '格式: {"deck_title":"...","meta":{"profile":"...","rewrite_quality":0.0,"tone":"presentation","review_issues":["..."],"actions_taken":["..."]},"slides":[{"index":1,"title":"...","format":"hero","bullets":["..."],"body":"..."}] }',
    '',
    '硬性要求：',
    '- meta.profile 固定返回当前 profile 名称。',
    '- format 只能使用 hero, title-bullets, title-body, compare, metrics, process, summary, cta。',
    '- 大多数常规解释页使用 title-bullets。',
    '- bullets 必须是可直接上屏的短句，优先 8 到 18 个字，不得复述原始长句。',
    '- bullets 之间必须平行，避免一条是结论、一条是过程、一条是备注。',
    '- 先提炼本页想让观众记住的结论，再写 bullets。',
    '- 优先“结论先行”，不要保留讲稿腔、笔记腔、任务说明腔。',
    '- 避免使用“帮助理解、可以看到、需要注意、然后、比如、后面、另外”这类讲稿提示语，直接输出可展示内容。',
    '- body 只在 title-body 或 summary 页面使用，且不超过两句。',
    '- 不要改动已确认大纲顺序和页标题主旨。',
    '- 如果 rewrite_strategy 不是 preserve，必须主动重写表达，而不是压缩原文。',
    '- 如果某页 detail_points 已经足够清楚，就围绕它重写，不要回去拼贴原始文稿。',
    '- 如果原始内容里存在“比如、然后、后面、可能、顺便、也可以、差不多”这类草稿语气，要改成正式演示表达，但不要机械列词替换。',
    '- hero 页优先输出 2 到 3 条高密度主张，并保留一句短 body。',
    '- compare 页优先输出 4 条 bullet，按 左列前两条 + 右列后两条 的顺序组织；body 用“左标签 | 右标签”的形式。',
    '- metrics 页优先输出 3 条 bullet，并把数字、倍率、百分比放在每条最前面。',
    '- process 页输出 3 到 5 条顺序清晰的步骤，避免泛泛的过渡词。',
    '- summary 页优先输出 3 条收束性 bullet 或 1 段很短 body。',
    '- cta 页必须像收尾页，body 给一句主张，bullets 给合作方向或下一步动作。',
    '- 输出 meta.rewrite_quality，范围 0 到 1。',
    '- 如果输出仍然保留草稿痕迹或某页表达不够上屏，要把问题写进 meta.review_issues。',
    '- actions_taken 简要说明你做了哪些改写动作，例如“压缩长句”“改成结论式要点”“合并重复表达”。',
    '',
    '当前 deck profile：',
    JSON.stringify({
      name: profile.name,
      description: profile.description,
      default_theme: profile.default_theme,
      expansion_rules: profile.expansion_rules,
      format_guidance: profile.format_guidance
    }, null, 2),
    '',
    '当前内容意图：',
    intentHint,
    '',
    '当前目标受众：',
    audienceHint,
    '',
    '当前改写策略：',
    rewriteHint,
    '',
    '用户补充信息：',
    JSON.stringify(answers, null, 2),
    '',
    '可参考的 profile 示例成稿：',
    JSON.stringify(profile.expanded_example, null, 2),
    '',
    '结构分析（仅供参考）：',
    JSON.stringify(analysis, null, 2),
    '',
    '已确认大纲：',
    JSON.stringify(outline, null, 2),
    '',
    '原始内容摘要：',
    JSON.stringify(source, null, 2)
  ].join('\n');
};
