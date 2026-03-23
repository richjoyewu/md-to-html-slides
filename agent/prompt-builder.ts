import { buildAnalysisResult, buildIngestArtifact } from './analysis.js';
import type { AnalysisResult, IngestArtifact, OutlineResult, PlanContext } from './types.js';
import { getSkill } from '../shared/skills.js';

const buildPlanQualityGuidance = (focuses: string[]): string[] => {
  const guidance: string[] = [];

  if (focuses.includes('strong_opening')) {
    guidance.push('- 如果内容适合做开场主张，第一页优先给出结论式 opening，不要先铺背景。');
  }

  if (focuses.includes('clear_cta') || focuses.includes('clear_ask')) {
    guidance.push('- 如果内容存在明确收尾动作空间，最后一页优先形成清楚的 ask / action。');
  }

  return guidance;
};

const buildExpandQualityGuidance = (focuses: string[]): string[] => {
  const guidance: string[] = [];

  if (focuses.includes('strong_opening')) {
    guidance.push('- 第一页表达必须像主张，不像摘要；优先给出一句能单独成立的 opening。');
  }

  if (focuses.includes('proof_with_numbers')) {
    guidance.push('- 如果内容包含指标或业务证据，优先把数字、倍率、百分比前置，不要把证据埋进解释句。');
  }

  if (focuses.includes('clear_cta') || focuses.includes('clear_ask')) {
    guidance.push('- 如果最后一页承担收尾职责，必须给出明确动作、合作请求或下一步安排。');
  }

  return guidance;
};

export const buildAnalysisPrompt = ({
  markdown,
  context,
  ingest
}: {
  markdown: string;
  context?: PlanContext;
  ingest?: IngestArtifact;
}): string => {
  const ingestArtifact = ingest || buildIngestArtifact(markdown);
  const skill = getSkill(context?.skill || context?.profile);
  const answers = context?.answers || {};

  return [
    '你是一个演示内容分析器。',
    '你的职责不是直接写页面，而是先理解内容，再输出稳定的 analysis JSON。',
    '用户输入可能是纯文本、演讲稿、随手笔记、半结构化 Markdown 或规范 Markdown。',
    '不要因为输入不规范而拒绝分析。',
    '只输出 JSON。',
    '',
    '你的任务：',
    '1. 理解内容主题、受众和目标。',
    '2. 判断内容更像 pitch、tutorial、report、notes 等哪一类。',
    '3. 把输入合并成若干语义 section，而不是机械按原文段落逐条照搬。',
    '4. 判断每个 section 在演示中的角色、重要性和最适合的视觉机会。',
    '5. 判断哪些内容可以舍弃或后置。',
    '6. 判断是否需要先向用户追问 1 到 2 个关键问题。',
    '',
    '重要原则：',
    '- 优先理解内容意图，而不是表面格式。',
    '- 只问会显著改变规划结果的问题，例如 audience、goal、slide_count、must_keep。',
    '- 不要问系统本应自己判断的问题，例如 section role、intent 或 visual opportunity。',
    '- 如果能先做出可信分析，就不要追问。',
    '- questions 最多 2 个。',
    '',
    '输出格式：',
    '必须输出 analysis@1 JSON：',
    '{"contract_version":"analysis@1","deck_title":"...","meta":{"skill":"...","profile":"...","audience_hint":"...","goal_hint":"..."},"document":{"input_shape":"...","doc_type":"...","density":"...","roughness":"...","rewrite_strategy":"...","heading_depth":2,"section_count":3,"point_count":12,"avg_sentence_length":24,"suggested_slide_count":8,"needs_rewrite":true,"source_features":{"heading_1_count":0,"heading_2_count":0,"bullet_count":0,"image_count":0,"code_block_count":0,"table_count":0,"quote_count":0,"link_count":0}},"structure":{"notes":["..."],"omitted_topics":["..."],"sections":[{"id":"section-1","index":1,"title":"...","point_count":3,"role":"opening","intent":"explain","signals":["question"],"visual_candidates":["hero","title-body"],"key_points":["..."],"summary_hint":"..."}]},"recommendations":{"preferred_opening_format":"hero","preferred_ending_format":"summary","must_keep_sections":["section-1"],"watchouts":["..."]},"clarification":{"required":false,"confidence":0.78,"message":"...","trigger_rule_ids":["..."],"reasons":["..."],"assumptions":["..."],"missing_dimensions":["audience"],"questions":[{"id":"audience","label":"这份内容主要给谁看？","placeholder":"例如：投资人、客户、内部团队","why_it_matters":"会影响表达密度和页面风格"}]}}',
    '',
    '字段要求：',
    `- meta.skill 固定返回 ${skill.name}。`,
    '- deck_title 应该是可工作的演讲标题；如果原始标题很弱，可以重写。',
    '- section id 使用稳定短标识，例如 section-1、problem、solution，不要太长。',
    '- role 只能从 opening, context, problem, solution, evidence, comparison, process, example, summary, cta, detail 中选择。',
    '- intent 只能从 define, explain, compare, example, process, summary, cta 中选择。',
    '- visual_candidates 只能从 hero, title-bullets, title-body, compare, metrics, process, summary, cta 中选择，给 1 到 3 个。',
    '- 如果 clarification.required 为 true，questions 最多 2 个，且必须是高杠杆问题。',
    '- clarification.confidence 范围 0 到 1。',
    '',
    '当前 skill：',
    JSON.stringify({
      name: skill.name,
      description: skill.description,
      default_theme: skill.default_theme,
      planner_rules: skill.planner_rules,
      expansion_rules: skill.expansion_rules,
      quality_focus: skill.quality?.focus || []
    }, null, 2),
    '',
    '用户补充信息：',
    JSON.stringify(answers, null, 2),
    '',
    '输入 ingest artifact：',
    JSON.stringify(ingestArtifact, null, 2)
  ].join('\n');
};

// Planner prompt：系统只提供结构事实和最少边界，内容意图、取舍和拆页决策交给 LLM。
export const buildPlanPrompt = (markdown: string, context?: PlanContext, analysisArtifact?: AnalysisResult): string => {
  const analysis = analysisArtifact || buildAnalysisResult(markdown, context);
  const analysisDocument = analysis.document;
  const answers = context?.answers || {};
  const skill = getSkill(context?.skill || context?.profile);
  const qualityGuidance = buildPlanQualityGuidance(skill.quality?.focus || []);

  return [
    '你是一个高质量中文演示文稿 Planner。',
    '你的任务是理解输入内容，并把它规划成可确认的页面大纲。',
    '只输出 JSON。',
    '格式: {"deck_title":"...","skill":"...","profile":"...","default_theme":"...","content_intent":"...","audience_guess":"...","deck_goal":"...","core_message":"...","omitted_topics":["..."],"planning_confidence":0.0,"uncertainties":["..."],"slides":[{"index":1,"title":"...","summary":"...","preview_points":["..."],"detail_points":["..."],"intent":"..."}] }',
    '',
    '你必须先完成这四个内部步骤，再输出 JSON：',
    '1. 判断这份内容最终想让受众理解什么，并写成 deck_goal。',
    '2. 提炼整份内容最重要的一句核心结论，并写成 core_message。',
    '3. 判断哪些内容值得上屏，哪些内容应该被合并、后置或舍弃，并写进 omitted_topics。',
    '4. 再决定页结构，不要机械沿用原文顺序。',
    '',
    '核心要求：',
    '- deck_goal 必须是面向受众的结果目标，用一句简短的话表达，不超过 30 个字。示例：「让听众理解这个产品解决什么问题、怎么解决、为什么值得做」。',
    '- core_message 必须是一句可以单独成立的核心结论，不超过 30 个字，不能只是 deck_title 的改写。示例：「我们做的不是格式工具，而是把文字语言转成演讲视觉语言的表达转译引擎」。',
    `- skill 固定返回 ${skill.name}。`,
    `- profile 作为兼容字段时与 skill 保持相同值。`,
    `- default_theme 固定返回 ${skill.default_theme}。`,
    '- omitted_topics 记录被主动舍弃、合并或后置的次要主题；如果没有明确舍弃项，返回空数组。',
    '- 先理解内容主线，再决定页结构，不要机械沿用原文顺序。',
    '- 允许舍弃细节，只保留适合上屏的核心内容。',
    '- 每一页都应先定义“讲什么”，再决定最适合的页面结构。',
    '- 不要默认把内容拆成 3 条 bullet 页。',
    '- 如果某页更适合对比、流程、风险、引述、组织、架构、时间线、FAQ 等结构，应优先选择对应结构，而不是退回普通 bullet 页。',
    `- 目标页数尽量接近 ${analysisDocument.suggested_slide_count} 页，允许上下浮动 1 页。`,
    '- 一页只讲一个核心点。',
    '',
    '标题风格（极其重要）：',
    '- title 必须短、直觉化、像演讲投影上的标题，不像分析报告的段落标题。',
    '- 好标题示例：「写出来 ≠ 讲清楚」「表达转译」「谁需要这个」「用户价值」',
    '- 差标题示例：「内容富足时代的表达贫困」「两套表达系统的根本差异」「高频基础能力层的机会」',
    '- 差标题的共同问题：过于抽象、偏学术化、像论文章节名，不像演讲屏幕上的标题。',
    '- 优先使用：名词短语、对比式短句（A ≠ B）、动宾结构、疑问句。',
    '- 标题长度控制在 3-12 个字，最多不超过 15 个字。',
    '- 禁止出现"（续）""（上）""（下）"等续页标题，每页必须有独立主题。',
    '',
    '其他要求：',
    '- summary 只用一句话概括本页。',
    '- preview_points 提供 2 到 3 条核心内容，用于折叠态确认。',
    '- detail_points 提供 3 到 5 条完整短要点，用于展开态确认。',
    '- preview_points 和 detail_points 都必须短句化，不能照搬原文长句。',
    '- intent 只能从 define, explain, compare, example, process, summary, cta 中选择。',
    '- 你必须自己判断 content_intent 与 audience_guess。',
    '- 如果你对内容意图、受众、页数或重点不确定，就降低 planning_confidence，并把真正影响规划的不确定点写进 uncertainties。',
    '- uncertainties 最多 3 条；没有明显不确定就返回空数组。',
    '- 如果内容有明显收束价值，最后一页优先做 summary。',
    ...qualityGuidance,
    '',
    '当前 skill：',
    JSON.stringify({
      name: skill.name,
      description: skill.description,
      default_theme: skill.default_theme,
      narrative_pattern: skill.planning.narrative_pattern,
      planner_rules: skill.planner_rules,
      format_guidance: skill.format_guidance,
      quality_focus: skill.quality?.focus || []
    }, null, 2),
    '',
    '可参考的 skill 示例大纲：',
    JSON.stringify(skill.outline_example, null, 2),
    '',
    '用户补充信息：',
    JSON.stringify(answers, null, 2),
    '',
    '输入分析工件（仅供参考，不代表最终语义判断）：',
    JSON.stringify(analysis, null, 2)
  ].join('\n');
};

// Expander prompt：在已确认大纲基础上，补成可上屏内容；重点是改写质量，不是扩写长度。
export const buildExpandPrompt = ({
  markdown,
  outline,
  context,
  analysisArtifact
}: {
  markdown: string;
  outline: OutlineResult;
  context?: PlanContext;
  analysisArtifact?: AnalysisResult;
}): string => {
  const analysis = analysisArtifact || buildAnalysisResult(markdown, context);
  const analysisDocument = analysis.document;
  const intentHint = outline.meta?.content_intent || 'general presentation';
  const audienceHint = outline.meta?.audience_guess || '未指定受众';
  const rewriteHint = analysisDocument.rewrite_strategy;
  const skill = getSkill(outline.meta?.skill || outline.meta?.profile);
  const answers = context?.answers || {};
  const qualityGuidance = buildExpandQualityGuidance(skill.quality?.focus || []);

  return [
    '你是一个高质量中文演示文稿 Expander。',
    '你的任务不是补更多字，而是把已确认大纲改写成能直接上屏的页面内容。',
    '只输出 JSON。',
    '格式: {"deck_title":"...","meta":{"skill":"...","profile":"...","rewrite_quality":0.0,"tone":"presentation","review_issues":["..."],"actions_taken":["..."]},"slides":[{"index":1,"title":"...","format":"hero","bullets":["..."],"body":"...","blocks":[{"type":"hero"}]}] }',
    '',
    '硬性要求：',
    '- meta.skill 固定返回当前 skill 名称。',
    '- meta.profile 作为兼容字段时与 skill 保持相同值。',
    '- format 只能使用 hero, title-bullets, title-body, compare, metrics, process, summary, cta。',
    '- 优先输出 blocks 数组来表达页面语义结构；普通文本页可省略 blocks，由系统回退到 paragraph/list。',
    '- 大多数常规解释页使用 title-bullets。',
    '- bullets 必须是可直接上屏的短句，优先 8 到 18 个字，不得复述原始长句。',
    '- bullets 之间必须平行，避免一条是结论、一条是过程、一条是备注。',
    '- 先提炼本页想让观众记住的结论，再写 bullets。',
    '- 优先“结论先行”，不要保留讲稿腔、笔记腔、任务说明腔。',
    '- 避免使用“帮助理解、可以看到、需要注意、然后、比如、后面、另外”这类讲稿提示语，直接输出可展示内容。',
    '- body 只在 title-body 或 summary 页面使用，且不超过两句。',
    '- 不要改动已确认大纲顺序和页标题主旨。',
    '- 如果 rewrite_strategy 不是 preserve，必须主动重写表达，而不是压缩原文。',
    '- 屏幕内容的目标不是完整复述讲稿，而是支持表达。',
    '- 展示内容必须来自演讲内容，但要经过压缩、取舍和视觉化。',
    '- 不要把讲稿全文直接搬上屏。',
    '- title-bullets 只能作为保底 fallback，不应成为默认页面形态。',
    '- 对于产品主张、对比、风险、组织、架构、时间线、数字证明、FAQ 等页面，优先选择更合适的 semantic block，而不是普通 bullets。',
    '- 如果某页 detail_points 已经足够清楚，就围绕它重写，不要回去拼贴原始文稿。',
    '- 如果原始内容里存在“比如、然后、后面、可能、顺便、也可以、差不多”这类草稿语气，要改成正式演示表达，但不要机械列词替换。',
    '- hero 页优先输出 2 到 3 条高密度主张，并保留一句短 body。',
    '- hero 页如果输出 blocks，使用 {"type":"hero","headline":"...","body":"...","points":["..."]}。',
    '- compare 页优先输出 4 条 bullet，按 左列前两条 + 右列后两条 的顺序组织；body 用“左标签 | 右标签”的形式。',
    '- compare 页如果输出 blocks，使用 {"type":"compare","left":{"label":"...","items":["..."]},"right":{"label":"...","items":["..."]}}。',
    '- metrics 页优先输出 3 条 bullet，并把数字、倍率、百分比放在每条最前面。',
    '- metrics 页如果输出 blocks，使用 {"type":"metrics","items":[{"value":"...","label":"...","note":"..."}]}。',
    '- process 页输出 3 到 5 条顺序清晰的步骤，避免泛泛的过渡词。',
    '- process 页如果输出 blocks，使用 {"type":"process","steps":[{"label":"...","detail":"..."}]}。',
    '- summary 页优先输出 3 条收束性 bullet 或 1 段很短 body。',
    '- summary 页如果输出 blocks，使用 {"type":"summary","items":["..."]}。',
    '- cta 页必须像收尾页，body 给一句主张，bullets 给合作方向或下一步动作。',
    '- cta 页如果输出 blocks，使用 {"type":"cta","message":"...","actions":["..."]}。',
    '- 输出 meta.rewrite_quality，范围 0 到 1。',
    '- 如果输出仍然保留草稿痕迹或某页表达不够上屏，要把问题写进 meta.review_issues。',
    '- actions_taken 简要说明你做了哪些改写动作，例如“压缩长句”“改成结论式要点”“合并重复表达”。',
    ...qualityGuidance,
    '',
    '当前 skill：',
    JSON.stringify({
      name: skill.name,
      description: skill.description,
      default_theme: skill.default_theme,
      bullet_style: skill.expansion.bullet_style,
      body_usage: skill.expansion.body_usage,
      preferred_blocks: skill.blocks.preferred,
      expansion_rules: skill.expansion_rules,
      format_guidance: skill.format_guidance,
      quality_focus: skill.quality?.focus || []
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
    '可参考的 skill 示例成稿：',
    JSON.stringify(skill.expanded_example, null, 2),
    '',
    '已确认大纲：',
    JSON.stringify(outline, null, 2),
    '',
    '输入分析工件：',
    JSON.stringify(analysis, null, 2)
  ].join('\n');
};
