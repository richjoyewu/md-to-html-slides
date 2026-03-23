import { normalizeAnalysis } from '../shared/core.js';
import { normalizeMarkdownLines, partitionMarkdownBlocks } from '../shared/markdown.js';
import { getSkill } from '../shared/skills.js';
import type {
  AnalysisClarification,
  AnalysisResult,
  AnalysisSection,
  ClarificationQuestion,
  DocumentType,
  ExpandFormat,
  IngestArtifact,
  IngestBlock,
  IngestSourceType,
  InputShape,
  LlmJsonProvider,
  MarkdownAnalysis,
  MarkdownSourceFeatures,
  PlanContext,
  PreprocessedMarkdown,
  RewriteStrategy,
  RoughnessLevel,
  SectionRole,
  SlideIntent,
  DensityLevel,
  AnalysisSignal,
  ClarificationDimension
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

const isWeakTitleLike = (value: string = ''): boolean =>
  /^(untitled deck|未命名页面|大家好|你好|hello|hi|开场|开始|今天我想|我想先|我想聊|先聊|接下来我想|谢谢大家)/i.test(compactText(value));

const pickWorkingTitleFromText = (markdown: string): string => {
  const lines = normalizeMarkdownLines(markdown).map((line) => compactText(line)).filter(Boolean);
  const candidates = lines
    .flatMap((line) => line.split(/[。！？!?\n]/))
    .flatMap((part) => part.split(/[；;]/))
    .flatMap((part) => part.split(/[，,:：]/))
    .map((part) => compactText(part))
    .map((part) =>
      part
        .replace(/^(大家好|你好|hello|hi)\s*/i, '')
        .replace(/^(今天我想|我想先|我想聊聊|接下来我想|先讲一个|先聊一个)\s*/i, '')
        .replace(/^(我们做的这个产品|我们做的事情|真正想做的事情|一句话总结这个产品想做的事情)\s*(是|就是)?\s*/i, '')
        .trim()
    )
    .filter((part) => part.length >= 6 && part.length <= 28)
    .filter((part) => !isWeakTitleLike(part));

  return candidates[0] || '';
};

const resolveAnalysisTitleHint = (source: PreprocessedMarkdown, markdown: string): string => {
  const explicit = compactText(source.deck_title);
  if (explicit && !isWeakTitleLike(explicit)) return explicit;

  const inferred = pickWorkingTitleFromText(markdown);
  if (inferred) return inferred.slice(0, 28).trim();

  return 'Untitled Deck';
};

const SENTENCE_SEGMENTER = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter('zh', { granularity: 'sentence' })
  : null;

const splitTextIntoSentences = (text: string): string[] => {
  const normalized = compactText(text);
  if (!normalized) return [];

  if (SENTENCE_SEGMENTER) {
    const sentences = Array.from(SENTENCE_SEGMENTER.segment(normalized), (entry) => compactText(entry.segment)).filter(Boolean);
    if (sentences.length) return sentences;
  }

  return normalized
    .split(/(?<=[。！？!?；;])\s*|(?<=\.)\s+(?=[A-Z0-9])/)
    .map((part) => compactText(part))
    .filter(Boolean);
};

const chunkSentences = (
  text: string,
  options: {
    maxChunkChars?: number;
    maxSentencesPerChunk?: number;
  } = {}
): string[] => {
  const {
    maxChunkChars = 240,
    maxSentencesPerChunk = 4
  } = options;

  const sentences = splitTextIntoSentences(text);
  if (!sentences.length) return [];

  const chunks: string[] = [];
  let current: string[] = [];
  let currentLength = 0;

  for (const sentence of sentences) {
    const nextLength = currentLength + sentence.length;
    if (current.length > 0 && (current.length >= maxSentencesPerChunk || nextLength > maxChunkChars)) {
      chunks.push(current.join(' ').trim());
      current = [];
      currentLength = 0;
    }
    current.push(sentence);
    currentLength += sentence.length;
  }

  if (current.length) chunks.push(current.join(' ').trim());
  return chunks.filter(Boolean);
};

const detectBlockSignals = (text: string): IngestBlock['signals'] => {
  const value = compactText(text).toLowerCase();
  return {
    has_numbers: /(\d+[%x倍万亿k])|(增长|效率|指标|用户|客户|收入|转化|成本|部署|分钟|小时|周|月)/.test(value),
    has_question: /(\?)|(为什么|为何|问题|挑战|疑问)/.test(value),
    has_process_words: /(步骤|流程|路径|阶段|方法|如何|怎么做|首先|然后|最后)/.test(value),
    has_comparison_words: /(对比|比较|区别|vs|versus|竞品|优劣)/.test(value)
  };
};

const detectSourceTypeHint = (markdown: string, inputShape: InputShape): IngestSourceType => {
  const raw = String(markdown || '');
  const hasMarkdownMarkers = /(^#{1,6}\s+)|(^[-*+]\s+)|(^>\s+)|(^!\[)|(^```)|(^~~~)/m.test(raw);
  const oralMarkers = /(大家好|今天我想|我想先|我相信|我们先聊|接下来我想|先讲一个)/.test(raw);

  if (hasMarkdownMarkers && oralMarkers) return 'mixed';
  if (hasMarkdownMarkers) return 'markdown';
  if (oralMarkers || inputShape === 'notes_like') return 'speech_draft';
  return 'plain_text';
};

const splitPlainTextBlocks = (markdown: string): Array<{ kind: IngestBlock['kind']; text: string; sourceSectionTitle?: string }> => {
  const lines = normalizeMarkdownLines(markdown);
  const blocks: Array<{ kind: IngestBlock['kind']; text: string; sourceSectionTitle?: string }> = [];
  let index = 0;
  let sectionIndex = 0;

  while (index < lines.length) {
    const line = lines[index].trimEnd();
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (/^---+\s*$/.test(line.trim())) {
      sectionIndex += 1;
      index += 1;
      continue;
    }

    if (/^[-*+]\s+/.test(line.trim())) {
      const blockLines = [];
      while (index < lines.length && /^[-*+]\s+/.test(lines[index].trim())) {
        blockLines.push(lines[index].trim());
        index += 1;
      }
      blocks.push({
        kind: 'list',
        text: blockLines.join('\n'),
        sourceSectionTitle: sectionIndex > 0 ? `section-${sectionIndex + 1}` : ''
      });
      continue;
    }

    const paragraphLines = [];
    while (index < lines.length && lines[index].trim() && !/^---+\s*$/.test(lines[index].trim())) {
      const current = lines[index].trim();
      if (/^[-*+]\s+/.test(current)) break;
      paragraphLines.push(current);
      index += 1;
    }

    if (paragraphLines.length) {
      const paragraphText = paragraphLines.join(' ');
      const chunks = chunkSentences(paragraphText, {
        maxChunkChars: 240,
        maxSentencesPerChunk: 4
      });
      for (const chunk of chunks) {
        blocks.push({
          kind: 'paragraph',
          text: chunk,
          sourceSectionTitle: sectionIndex > 0 ? `section-${sectionIndex + 1}` : ''
        });
      }
      continue;
    }

    index += 1;
  }

  return blocks.slice(0, 24);
};

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

export const buildIngestArtifact = (markdown: string): IngestArtifact => {
  const source = preprocessMarkdown(markdown);
  const inputShape = detectInputShape(source, markdown);
  const titleHint = resolveAnalysisTitleHint(source, markdown);
  const sourceTypeHint = detectSourceTypeHint(markdown, inputShape);
  const partitionedBlocks = sourceTypeHint === 'markdown' || sourceTypeHint === 'mixed'
    ? partitionMarkdownBlocks(markdown, {
        maxBlocks: 24,
        maxChunkChars: 240,
        maxSentencesPerChunk: 4
      })
    : splitPlainTextBlocks(markdown);
  const blocks = partitionedBlocks.map((block, index) => ({
    id: `b${index + 1}`,
    index: index + 1,
    kind: block.kind,
    text: block.text.slice(0, 480).trim(),
    source_section_title: block.sourceSectionTitle || source.sections.find((section) => block.text.includes(section.title))?.title,
    signals: detectBlockSignals(block.text)
  }));

  return {
    contract_version: 'ingest@1',
    title_hint: titleHint,
    source_type_hint: sourceTypeHint,
    raw_length: String(markdown || '').trim().length,
    block_count: blocks.length,
    raw_excerpt: source.raw_excerpt,
    blocks
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

const clampScore = (value: number): number => Math.max(0, Math.min(1, value));

const hasAnswer = (context: PlanContext | undefined, key: string): boolean =>
  Boolean(compactText(context?.answers?.[key] || ''));

const isGenericDeckTitle = (title: string): boolean =>
  /^(untitled deck|未命名页面|大家好|你好|hello|hi|开场|开始|今天想聊聊)/i.test(compactText(title));

const createClarificationQuestion = (
  id: ClarificationQuestion['id'],
  label: string,
  placeholder: string,
  whyItMatters: string
): ClarificationQuestion => ({
  id,
  label,
  placeholder,
  why_it_matters: whyItMatters
});

const dedupeQuestions = (questions: ClarificationQuestion[]): ClarificationQuestion[] => {
  const seen = new Set<string>();
  return questions.filter((question) => {
    if (seen.has(question.id)) return false;
    seen.add(question.id);
    return true;
  });
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

const buildAnalysisClarification = (
  source: PreprocessedMarkdown,
  analysis: MarkdownAnalysis,
  context: PlanContext | undefined,
  docType: DocumentType,
  audienceHint: string,
  goalHint: string
): AnalysisClarification => {
  const rawLength = source.raw_excerpt.trim().length;
  const structurallyThin = analysis.section_count === 0 || (analysis.section_count <= 1 && analysis.point_count <= 1);
  const roughAndThin = analysis.roughness === 'very_rough' && analysis.section_count <= 1;
  const genericTitle = isGenericDeckTitle(source.deck_title);
  const noAudience = !hasAnswer(context, 'audience');
  const noGoal = !hasAnswer(context, 'goal');
  const noSlideCount = !hasAnswer(context, 'slide_count');
  const noMustKeep = !hasAnswer(context, 'must_keep');
  const missingDimensions: ClarificationDimension[] = [];
  const triggerRuleIds: string[] = [];
  const reasons: string[] = [];
  const assumptions: string[] = [];
  const questions: ClarificationQuestion[] = [];

  const addTrigger = (ruleId: string, reason: string): void => {
    if (!triggerRuleIds.includes(ruleId)) triggerRuleIds.push(ruleId);
    if (!reasons.includes(reason)) reasons.push(reason);
  };

  const ask = (dimension: ClarificationDimension, question: ClarificationQuestion): void => {
    if (!missingDimensions.includes(dimension)) missingDimensions.push(dimension);
    questions.push(question);
  };

  if (noAudience) {
    assumptions.push(`默认受众暂按「${audienceHint}」处理`);
  }
  if (noGoal) {
    assumptions.push(`默认目标暂按「${goalHint}」处理`);
  }
  if (noSlideCount) {
    assumptions.push(`默认页数暂按 ${analysis.suggested_slide_count} 页估计`);
  }
  if (noMustKeep && analysis.density === 'high') {
    assumptions.push('默认允许系统主动舍弃次要细节，优先保留主线');
  }

  if (rawLength < 40 || structurallyThin || roughAndThin) {
    addTrigger('thin_input', '输入过短或结构过薄，系统无法稳定判断最终表达重点。');
    if (noAudience) {
      ask('audience', createClarificationQuestion(
        'audience',
        '这份内容主要给谁看？',
        '例如：零基础学员、内部团队、客户、投资人',
        '受众会直接影响表达密度、术语假设和页面风格'
      ));
    }
    if (noGoal) {
      ask('goal', createClarificationQuestion(
        'goal',
        '这份演示最想让观众记住什么？',
        '例如：理解 Agent 和 Chatbot 的区别',
        '目标会决定整套页面主线和收束方式'
      ));
    }
  }

  if (noAudience && (analysis.roughness === 'very_rough' || docType === 'pitch' || docType === 'report' || analysis.input_shape === 'notes_like')) {
    addTrigger('audience_gap', '当前内容对受众敏感，缺少受众信息会明显影响规划与语气。');
    ask('audience', createClarificationQuestion(
      'audience',
      '这份内容主要给谁看？',
      docType === 'pitch' ? '例如：投资人、合作方、客户、内部管理层' : '例如：零基础学员、内部团队、客户',
      '不同受众会改变标题风格、信息密度和案例选择'
    ));
  }

  if (noGoal && (analysis.roughness !== 'clean' || genericTitle || docType === 'pitch' || docType === 'notes')) {
    addTrigger('goal_gap', '当前标题或素材不足以稳定代表最终演讲目标，需要确认观众记忆点。');
    ask('goal', createClarificationQuestion(
      'goal',
      '这份演示最想让观众记住什么？',
      '例如：理解产品的核心价值，或理解这套方法为什么值得采用',
      '目标会决定核心信息、拆页主线和结尾形式'
    ));
  }

  if (noSlideCount && ((analysis.density === 'high' && analysis.section_count <= 2) || analysis.point_count >= 12 || analysis.roughness === 'very_rough')) {
    addTrigger('slide_count_gap', '信息密度较高但结构松散，页数预期会直接影响拆页和取舍策略。');
    ask('slide_count', createClarificationQuestion(
      'slide_count',
      '你希望大约生成多少页？',
      '例如：6 页、8 页、10 页',
      '页数会直接影响内容压缩力度和页面粒度'
    ));
  }

  if (noMustKeep && analysis.density === 'high' && analysis.point_count >= 16) {
    addTrigger('must_keep_gap', '当前素材较多，如有必须保留的内容，提前说明可避免系统误删重点。');
    ask('must_keep', createClarificationQuestion(
      'must_keep',
      '有没有必须保留的内容或页面？',
      '例如：客户案例、关键数字、路线图、某段原话',
      '必须保留项会影响取舍顺序和 omitted topics 判断'
    ));
  }

  let confidence = analysis.roughness === 'clean' ? 0.82 : analysis.roughness === 'rough' ? 0.68 : 0.54;
  if (analysis.input_shape === 'slide_like') confidence += 0.06;
  if (analysis.section_count >= 3) confidence += 0.05;
  if (analysis.section_count <= 1 && analysis.density === 'high') confidence -= 0.08;
  if (missingDimensions.includes('audience')) confidence -= 0.1;
  if (missingDimensions.includes('goal')) confidence -= 0.14;
  if (missingDimensions.includes('slide_count')) confidence -= 0.08;
  if (missingDimensions.includes('must_keep')) confidence -= 0.05;

  const dedupedQuestions = dedupeQuestions(questions).slice(0, 2);
  const required = dedupedQuestions.length > 0;

  return {
    required,
    confidence: clampScore(confidence),
    message: required
      ? '当前分析仍缺少 1 到 2 个会显著影响规划的问题，补充后结果会更稳。'
      : '当前分析已足够进入规划。',
    trigger_rule_ids: triggerRuleIds,
    reasons: reasons.slice(0, 4),
    assumptions: assumptions.slice(0, 4),
    missing_dimensions: missingDimensions,
    questions: dedupedQuestions
  };
};

interface AnalysisRequestOptions {
  allowFallback?: boolean;
  timeoutMs?: number;
  maxTokens?: number;
  ingest?: IngestArtifact;
}

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

export const buildHeuristicAnalysisResult = (markdown: string, context?: PlanContext): AnalysisResult => {
  const source = preprocessMarkdown(markdown);
  const analysis = analyzeMarkdown(markdown);
  const skill = getSkill(context?.skill || context?.profile);
  const features = collectSourceFeatures(markdown);
  const titleHint = resolveAnalysisTitleHint(source, markdown);
  const docType = inferDocType(markdown, skill.name, source, analysis, features);
  const audienceHint = inferAudienceHint(context, docType, analysis.roughness);
  const goalHint = inferGoalHint(context, docType, titleHint);
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
    deck_title: titleHint,
    meta: {
      skill: skill.name,
      profile: skill.name,
      audience_hint: audienceHint,
      goal_hint: goalHint
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
    },
    clarification: buildAnalysisClarification(source, analysis, context, docType, audienceHint, goalHint)
  }) as AnalysisResult;
};

export const buildAnalysisResult = (markdown: string, context?: PlanContext): AnalysisResult =>
  buildHeuristicAnalysisResult(markdown, context);

export const requestAnalysis = async (
  provider: LlmJsonProvider,
  markdown: string,
  context?: PlanContext,
  options: AnalysisRequestOptions = {}
): Promise<{ analysis: AnalysisResult; mode: 'llm' | 'fallback' }> => {
  const ingest = options.ingest || buildIngestArtifact(markdown);

  try {
    const { buildAnalysisPrompt } = await import('./prompt-builder.js');
    const payload = await provider.callJson({
      prompt: buildAnalysisPrompt({ markdown, context, ingest }),
      timeoutMs: options.timeoutMs ?? 90000,
      maxTokens: options.maxTokens ?? 8192
    });
    return { analysis: normalizeAnalysis(payload) as AnalysisResult, mode: 'llm' };
  } catch (error) {
    if (options.allowFallback === false) {
      throw error;
    }
    console.error('[analysis-fallback]', (error as Error)?.message || error);
    return { analysis: buildHeuristicAnalysisResult(markdown, context), mode: 'fallback' };
  }
};
