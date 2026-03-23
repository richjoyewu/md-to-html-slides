import { normalizeAnalysis } from '../shared/core.js';
import { getSkill } from '../shared/skills.js';
import type {
  AnalysisResult,
  AnalysisSection,
  DocumentType,
  ExpandFormat,
  InputShape,
  MarkdownAnalysis,
  MarkdownSourceFeatures,
  PlanContext,
  PreprocessedMarkdown,
  RewriteStrategy,
  RoughnessLevel,
  SectionRole,
  SlideIntent,
  DensityLevel,
  AnalysisSignal
} from './types.js';
import { preprocessMarkdown } from './preprocess.js';

// 结构分析器：只提供输入的结构事实，不提前替 LLM 做语义分类。

const compactText = (value: string = ''): string => String(value || '').replace(/\s+/g, ' ').trim();

const compactPoint = (value: string = '', max: number = 34): string =>
  compactText(value)
    .replace(/^[-*+]\s*/, '')
    .replace(/[；;。]+$/g, '')
    .slice(0, max)
    .trim();

const compactIdentifier = (value: string = ''): string =>
  compactText(value)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const detectInputShape = (source: PreprocessedMarkdown, markdown: string): InputShape => {
  const raw = String(markdown || '');
  const explicitSections = (raw.match(/^##\s+/gm) || []).length;
  const explicitBullets = (raw.match(/^[-*+]\s+/gm) || []).length;
  const sectionCount = source.sections.length;
  const avgPoints = sectionCount
    ? source.sections.reduce((sum, section) => sum + section.points.length, 0) / sectionCount
    : 0;

  if (explicitSections >= 2 || (sectionCount >= 3 && explicitBullets >= 3 && avgPoints <= 3)) return 'slide_like';
  if (explicitSections === 0 && explicitBullets <= 2) return 'document_like';
  if (avgPoints >= 4) return 'document_like';
  return 'notes_like';
};

const detectDensity = (source: PreprocessedMarkdown): DensityLevel => {
  const pointCount = source.sections.reduce((sum, section) => sum + section.points.length, 0);
  const rawLength = source.raw_excerpt.length;
  if (pointCount >= 18 || rawLength >= 1800) return 'high';
  if (pointCount >= 8 || rawLength >= 900) return 'medium';
  return 'low';
};

const averageSentenceLength = (source: PreprocessedMarkdown): number => {
  const points = source.sections.flatMap((section) => section.points).filter(Boolean);
  if (!points.length) return source.raw_excerpt.length;
  const totalLength = points.reduce((sum, point) => sum + String(point || '').trim().length, 0);
  return totalLength / points.length;
};

const detectRoughness = (
  source: PreprocessedMarkdown,
  markdown: string,
  inputShape: InputShape,
  density: DensityLevel,
  avgSentenceLength: number
): RoughnessLevel => {
  const raw = String(markdown || '');
  const explicitSections = (raw.match(/^##\s+/gm) || []).length;
  const explicitBullets = (raw.match(/^[-*+]\s+/gm) || []).length;
  const sectionCount = source.sections.length;

  if (explicitSections === 0 && explicitBullets <= 2 && avgSentenceLength >= 28) return 'very_rough';
  if (inputShape === 'notes_like' || avgSentenceLength >= 40) return 'very_rough';
  if (sectionCount <= 1 && density !== 'low') return 'very_rough';
  if (inputShape === 'document_like' || density === 'high' || avgSentenceLength >= 26) return 'rough';
  return 'clean';
};

const selectRewriteStrategy = (roughness: RoughnessLevel, inputShape: InputShape): RewriteStrategy => {
  if (roughness === 'very_rough') return 'aggressive_rewrite';
  if (roughness === 'rough' || inputShape === 'document_like') return 'light_rewrite';
  return 'preserve';
};

const suggestSlideCount = (source: PreprocessedMarkdown, density: DensityLevel, roughness: RoughnessLevel): number => {
  const sectionCount = source.sections.length;
  const pointCount = source.sections.reduce((sum, section) => sum + section.points.length, 0);

  if (sectionCount <= 1) {
    if (roughness === 'very_rough') return Math.min(8, Math.max(4, Math.ceil(pointCount / 1.5)));
    if (density === 'high') return Math.min(8, Math.max(4, Math.ceil(pointCount / 2)));
  }

  const base = Math.max(4, Math.min(10, sectionCount || 4));
  if (density === 'high') return Math.min(10, base + 2);
  if (density === 'low' && roughness === 'clean') return Math.max(4, base - 1);
  return base;
};

const countTableGroups = (markdown: string): number => {
  const lines = String(markdown || '').split(/\r?\n/);
  let count = 0;
  let inTable = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const looksLikeTableRow = /^\|.+\|\s*$/.test(line);

    if (looksLikeTableRow && !inTable) {
      count += 1;
      inTable = true;
      continue;
    }

    if (!looksLikeTableRow) inTable = false;
  }

  return count;
};

const countMarkdownLinks = (markdown: string): number => {
  const matches = String(markdown || '').match(/!?\[[^\]]*?\]\(([^)]+)\)/g) || [];
  return matches.filter((item) => !item.startsWith('![')).length;
};

const collectSourceFeatures = (markdown: string): MarkdownSourceFeatures => {
  const raw = String(markdown || '');
  const fenceCount = (raw.match(/^(?:```|~~~)/gm) || []).length;

  return {
    heading_1_count: (raw.match(/^#\s+/gm) || []).length,
    heading_2_count: (raw.match(/^##\s+/gm) || []).length,
    bullet_count: (raw.match(/^[-*+]\s+/gm) || []).length,
    image_count: (raw.match(/^!\[[^\]]*?\]\((.+?)\)\s*$/gm) || []).length,
    code_block_count: Math.floor(fenceCount / 2),
    table_count: countTableGroups(raw),
    quote_count: (raw.match(/^>\s+/gm) || []).length,
    link_count: countMarkdownLinks(raw)
  };
};

const inferDocType = (
  markdown: string,
  skillName: string,
  source: PreprocessedMarkdown,
  analysis: MarkdownAnalysis,
  features: MarkdownSourceFeatures
): DocumentType => {
  const haystack = [source.deck_title, source.raw_excerpt, skillName].join(' ').toLowerCase();

  if (skillName === 'pitch-tech-launch' || /pitch|launch|融资|创始人|商业计划|投资人/.test(haystack)) return 'pitch';
  if (/教程|如何|怎么|步骤|安装|使用|quickstart|walkthrough|how to/.test(haystack)) return 'tutorial';
  if (/课程|讲义|课堂|lesson|lecture|教学/.test(haystack)) return 'lesson';
  if (/报告|分析|复盘|研究|report|analysis/.test(haystack)) return 'report';
  if (/faq|参考|reference|术语|字典|手册/.test(haystack)) return 'reference';
  if (analysis.input_shape === 'notes_like' && analysis.roughness !== 'clean') return 'notes';
  if (features.code_block_count > 0) return 'tutorial';
  return 'general';
};

const inferAudienceHint = (context: PlanContext | undefined, docType: DocumentType, roughness: RoughnessLevel): string => {
  const explicit = compactText(context?.answers?.audience || '');
  if (explicit) return explicit;
  if (roughness === 'very_rough') return '需要用户补充受众';
  if (docType === 'pitch') return '投资人、合作方或业务决策者';
  if (docType === 'tutorial' || docType === 'lesson') return '学习者或需要落地执行的人';
  if (docType === 'report') return '管理层或项目相关方';
  if (docType === 'reference') return '需要快速查阅信息的人';
  return '未指定受众';
};

const inferGoalHint = (context: PlanContext | undefined, docType: DocumentType, deckTitle: string): string => {
  const explicit = compactText(context?.answers?.goal || '');
  if (explicit) return explicit;
  if (docType === 'pitch') return '让观众理解价值、证据与下一步动作';
  if (docType === 'tutorial' || docType === 'lesson') return '让观众按顺序理解并执行关键步骤';
  if (docType === 'report') return '让观众快速抓住结论、依据与影响';
  if (docType === 'reference') return `让观众快速查到 ${deckTitle || '关键信息'}`;
  return `让观众快速理解 ${deckTitle || '核心主题'}`;
};

const collectSignals = (title: string, points: string[]): AnalysisSignal[] => {
  const haystack = compactText([title, ...points].join(' ')).toLowerCase();
  const signals: AnalysisSignal[] = [];

  if (/(\d+[%x倍万亿k])|(增长|效率|指标|用户|客户|收入|转化|成本|部署|分钟|小时|周|月)/.test(haystack)) signals.push('numbers');
  if (/对比|比较|区别|vs|versus|竞品|优劣/.test(haystack)) signals.push('comparison');
  if (/步骤|流程|路径|阶段|方法|如何|怎么做/.test(haystack)) signals.push('process');
  if (/案例|示例|example|场景/.test(haystack)) signals.push('example');
  if (/为什么|为何|问题|挑战|疑问|\?/.test(haystack)) signals.push('question');
  if (/风险|限制|约束|难点|注意事项/.test(haystack)) signals.push('risk');
  if (/代码|函数|接口|命令|api|sdk|脚本/.test(haystack)) signals.push('code');
  if (/图片|图示|截图|封面|logo|插图/.test(haystack)) signals.push('image');
  if (/引用|原话|quote|金句/.test(haystack)) signals.push('quote');
  if (/表格|矩阵|table|清单/.test(haystack)) signals.push('table');

  return Array.from(new Set(signals));
};

const inferSectionRole = (
  title: string,
  signals: AnalysisSignal[],
  index: number,
  total: number,
  docType: DocumentType
): SectionRole => {
  const value = compactText(title).toLowerCase();

  if (/下一步|行动|合作|联系|试点|加入|预约|call to action|cta/.test(value)) return 'cta';
  if (/总结|结论|回顾|收尾|summary/.test(value)) return 'summary';
  if (/问题|挑战|痛点|为什么难|现状/.test(value)) return 'problem';
  if (/方案|解法|我们怎么做|产品|能力|方法/.test(value)) return 'solution';
  if (signals.includes('comparison')) return 'comparison';
  if (signals.includes('process')) return 'process';
  if (signals.includes('example')) return 'example';
  if (signals.includes('numbers')) return 'evidence';
  if (index === 0) return 'opening';
  if (index === total - 1 && docType === 'pitch') return 'cta';
  if (index === total - 1) return 'summary';
  if (/定义|什么是|背景|概念/.test(value)) return 'context';
  return 'detail';
};

const roleToIntent = (title: string, role: SectionRole): SlideIntent => {
  const value = compactText(title).toLowerCase();
  if (role === 'comparison') return 'compare';
  if (role === 'process') return 'process';
  if (role === 'example') return 'example';
  if (role === 'summary') return 'summary';
  if (role === 'cta') return 'cta';
  if (/定义|什么是/.test(value)) return 'define';
  return 'explain';
};

const roleToVisualCandidates = (
  role: SectionRole,
  pointCount: number,
  signals: AnalysisSignal[],
  docType: DocumentType
): ExpandFormat[] => {
  if (role === 'opening') return docType === 'pitch' ? ['hero', 'title-body'] : ['title-bullets', 'title-body'];
  if (role === 'comparison') return ['compare', 'title-bullets'];
  if (role === 'process') return ['process', 'title-bullets'];
  if (role === 'evidence' || signals.includes('numbers')) return ['metrics', 'title-bullets'];
  if (role === 'summary') return ['summary', 'title-bullets'];
  if (role === 'cta') return ['cta', 'summary'];
  if (pointCount <= 1) return ['title-body', 'title-bullets'];
  return ['title-bullets', 'title-body'];
};

const inferOmittedTopics = (source: PreprocessedMarkdown, density: DensityLevel): string[] => {
  if (density !== 'high') return [];

  return source.sections
    .map((section) => compactPoint(section.title, 24))
    .filter((title) => /附录|备注|补充|更多|参考|额外|细节/.test(title))
    .slice(0, 3);
};

const inferSectionSummaryHint = (title: string, points: string[]): string => {
  const firstPoint = points.map((point) => compactPoint(point, 42)).find(Boolean);
  return firstPoint || compactPoint(title, 42) || '补充这一页的关键信息';
};

const buildSectionAnalysis = (
  section: PreprocessedMarkdown['sections'][number],
  index: number,
  total: number,
  docType: DocumentType
): AnalysisSection => {
  const title = compactText(section.title) || `第 ${index + 1} 部分`;
  const points = section.points.map((point) => compactPoint(point)).filter(Boolean);
  const signals = collectSignals(title, points);
  const role = inferSectionRole(title, signals, index, total, docType);
  const intent = roleToIntent(title, role);
  const visualCandidates = roleToVisualCandidates(role, points.length, signals, docType);

  return {
    id: compactIdentifier(title) || `section-${index + 1}`,
    index: index + 1,
    title,
    point_count: points.length,
    role,
    intent,
    signals,
    visual_candidates: visualCandidates,
    key_points: points.slice(0, 4),
    summary_hint: inferSectionSummaryHint(title, points)
  };
};

const buildWatchouts = (
  analysis: MarkdownAnalysis,
  features: MarkdownSourceFeatures,
  docType: DocumentType
): string[] => {
  const watchouts = [...analysis.notes];

  if (features.table_count > 0) watchouts.push('表格信息应先压缩成对比或指标块，不要直接把整表搬上屏幕');
  if (features.code_block_count > 0) watchouts.push('代码块需要单独控制信息密度，避免与长段落混排');
  if (docType === 'pitch') watchouts.push('融资或发布型内容需要明确证据页与收尾 ask，避免只讲背景');

  return Array.from(new Set(watchouts)).slice(0, 6);
};

export const analyzeMarkdown = (markdown: string): MarkdownAnalysis => {
  const source = preprocessMarkdown(markdown);
  const inputShape = detectInputShape(source, markdown);
  const density = detectDensity(source);
  const avgSentenceLen = averageSentenceLength(source);
  const roughness = detectRoughness(source, markdown, inputShape, density, avgSentenceLen);
  const rewriteStrategy = selectRewriteStrategy(roughness, inputShape);
  const suggestedSlideCount = suggestSlideCount(source, density, roughness);
  const notes: string[] = [];

  if (inputShape === 'document_like') notes.push('内容更像文稿而不是页面结构，需要先压缩再拆页');
  if (inputShape === 'notes_like') notes.push('内容更像零散笔记，需要先补结构再规划页面');
  if (density === 'high') notes.push('信息密度较高，应主动拆页，不要保留长列表');
  if (roughness === 'rough') notes.push('需要将说明文句式改成更适合演示的短标题与短要点');
  if (roughness === 'very_rough') notes.push('应把输入视为草稿素材，先提炼主线，再重组为线性页面');

  return {
    input_shape: inputShape,
    density,
    roughness,
    rewrite_strategy: rewriteStrategy,
    heading_depth: source.sections.length ? 2 : 1,
    section_count: source.sections.length,
    point_count: source.sections.reduce((sum, section) => sum + section.points.length, 0),
    avg_sentence_length: Number(avgSentenceLen.toFixed(2)),
    suggested_slide_count: suggestedSlideCount,
    needs_rewrite: rewriteStrategy !== 'preserve',
    notes
  };
};

export const buildAnalysisResult = (markdown: string, context?: PlanContext): AnalysisResult => {
  const source = preprocessMarkdown(markdown);
  const analysis = analyzeMarkdown(markdown);
  const skill = getSkill(context?.skill || context?.profile);
  const features = collectSourceFeatures(markdown);
  const docType = inferDocType(markdown, skill.name, source, analysis, features);
  const sections = source.sections.map((section, index) => buildSectionAnalysis(section, index, source.sections.length, docType));
  const mustKeepSections = Array.from(new Set(
    sections
      .filter((section, index) =>
        index === 0 ||
        index === sections.length - 1 ||
        ['evidence', 'comparison', 'process', 'cta'].includes(section.role))
      .map((section) => section.id)
  )).slice(0, 6);

  return normalizeAnalysis({
    contract_version: 'analysis@1',
    deck_title: source.deck_title || 'Untitled Deck',
    meta: {
      skill: skill.name,
      profile: skill.name,
      audience_hint: inferAudienceHint(context, docType, analysis.roughness),
      goal_hint: inferGoalHint(context, docType, source.deck_title)
    },
    document: {
      ...analysis,
      doc_type: docType,
      source_features: features
    },
    structure: {
      notes: analysis.notes,
      omitted_topics: inferOmittedTopics(source, analysis.density),
      sections
    },
    recommendations: {
      preferred_opening_format: docType === 'pitch' ? 'hero' : 'title-bullets',
      preferred_ending_format: docType === 'pitch' ? 'cta' : 'summary',
      must_keep_sections: mustKeepSections,
      watchouts: buildWatchouts(analysis, features, docType)
    }
  }) as AnalysisResult;
};
