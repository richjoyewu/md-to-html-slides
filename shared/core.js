import { getSkill, normalizeSkillName } from './skills.js';

const ALLOWED_INTENTS = new Set(['define', 'explain', 'compare', 'example', 'process', 'summary', 'cta']);
const ALLOWED_FORMATS = new Set(['hero', 'title-bullets', 'title-body', 'compare', 'metrics', 'process', 'summary', 'cta']);
const ALLOWED_VARIANTS = new Set(['default', 'hero', 'compare', 'metrics', 'process', 'summary', 'cta']);
const ALLOWED_DOC_TYPES = new Set(['general', 'pitch', 'tutorial', 'lesson', 'report', 'reference', 'notes']);
const ALLOWED_SECTION_ROLES = new Set(['opening', 'context', 'problem', 'solution', 'evidence', 'comparison', 'process', 'example', 'summary', 'cta', 'detail']);
const ALLOWED_ANALYSIS_SIGNALS = new Set(['numbers', 'comparison', 'process', 'example', 'question', 'risk', 'code', 'image', 'quote', 'table']);
const ALLOWED_INGEST_SOURCE_TYPES = new Set(['plain_text', 'markdown', 'speech_draft', 'mixed']);
const ALLOWED_INGEST_BLOCK_KINDS = new Set(['heading', 'paragraph', 'list', 'quote', 'code', 'image', 'unknown']);

const compactText = (value = '') => String(value || '').replace(/\s+/g, ' ').trim();
const normalizeSurfaceText = (value = '') => compactText(value).replace(/^[，、；;:\-]+/g, '').trim();
const compactIdentifier = (value = '') =>
  compactText(value)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
const compactTitle = (value = '') =>
  compactText(value)
    .replace(/^[0-9０-９]+[.、\-:]\s*/, '')
    .replace(/[✨🧠🤖🦁📌📘📊🔥]+/g, '')
    .trim()
    .slice(0, 28)
    .trim() || '未命名页面';
const compactBullet = (value = '') => normalizeSurfaceText(value).replace(/[；;。]+$/g, '').slice(0, 34).trim();
const compactBody = (value = '') => normalizeSurfaceText(value).slice(0, 96).trim();
const compactOutlinePoint = (value = '') => normalizeSurfaceText(value).replace(/[；;。]+$/g, '').slice(0, 30).trim();
const compactMetaText = (value, maxLength, fallback) => {
  const text = compactText(String(value || '')).slice(0, maxLength).trim();
  return text || fallback;
};
const compactUncertainty = (value = '') => compactText(value).slice(0, 64);
const score = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback;
};

const dedupeList = (items) => {
  const seen = new Set();
  const output = [];
  for (const item of (items || []).map(compactText).filter(Boolean)) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
};

const normalizeTextList = (items, max = 8) =>
  Array.isArray(items) ? dedupeList(items.map((item) => compactText(String(item || '')))).slice(0, max) : [];

const preserveNamedValue = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized || undefined;
};

const normalizeCount = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : fallback;
};

export const normalizePlanContext = (value) => {
  const source = value && typeof value === 'object' ? value : {};
  const answers = source.answers && typeof source.answers === 'object' ? source.answers : {};
  const normalizedSkill = normalizeSkillName(source.skill || source.profile);
  return {
    profile: normalizedSkill,
    skill: normalizedSkill,
    answers: Object.fromEntries(
      Object.entries(answers)
        .map(([key, raw]) => [key, String(raw || '').trim()])
        .filter(([, raw]) => raw)
    )
  };
};

export const normalizeClarification = (payload) => ({
  kind: 'clarification',
  message: String(payload?.message || '').trim(),
  meta: payload?.meta || null,
  questions: Array.isArray(payload?.questions)
    ? payload.questions
        .map((item, index) => {
          if (typeof item === 'string') {
            return { id: `q_${index + 1}`, label: String(item || '').trim(), placeholder: '', why_it_matters: '' };
          }
          return {
            id: String(item?.id || `q_${index + 1}`).trim(),
            label: String(item?.label || '').trim(),
            placeholder: String(item?.placeholder || '').trim(),
            why_it_matters: String(item?.why_it_matters || item?.whyItMatters || '').trim()
          };
        })
        .filter((item) => item.label)
        .slice(0, 3)
    : []
});

const normalizeClarificationQuestions = (questions, max = 3) =>
  Array.isArray(questions)
    ? questions
        .map((item, index) => {
          if (typeof item === 'string') {
            return { id: `q_${index + 1}`, label: String(item || '').trim(), placeholder: '', why_it_matters: '' };
          }

          return {
            id: String(item?.id || `q_${index + 1}`).trim(),
            label: String(item?.label || '').trim(),
            placeholder: String(item?.placeholder || '').trim(),
            why_it_matters: String(item?.why_it_matters || item?.whyItMatters || '').trim()
          };
        })
        .filter((item) => item.label)
        .slice(0, max)
    : [];

const normalizeAnalysisSourceFeatures = (source) => ({
  heading_1_count: normalizeCount(source?.heading_1_count ?? source?.heading1_count ?? source?.h1_count, 0),
  heading_2_count: normalizeCount(source?.heading_2_count ?? source?.heading2_count ?? source?.h2_count, 0),
  bullet_count: normalizeCount(source?.bullet_count, 0),
  image_count: normalizeCount(source?.image_count, 0),
  code_block_count: normalizeCount(source?.code_block_count ?? source?.code_blocks, 0),
  table_count: normalizeCount(source?.table_count, 0),
  quote_count: normalizeCount(source?.quote_count, 0),
  link_count: normalizeCount(source?.link_count, 0)
});

const ensureUniqueIngestBlockIds = (blocks = []) => {
  const seen = new Map();
  return blocks.map((block, index) => {
    const baseId = compactIdentifier(block.id || `b${index + 1}`) || `b${index + 1}`;
    const count = (seen.get(baseId) || 0) + 1;
    seen.set(baseId, count);
    return {
      ...block,
      id: count === 1 ? baseId : `${baseId}-${count}`
    };
  });
};

export const normalizeIngest = (payload) => {
  const source = payload && typeof payload === 'object' ? payload : {};
  const rawBlocks = Array.isArray(source.blocks) ? source.blocks : [];
  const blocks = ensureUniqueIngestBlockIds(
    rawBlocks.map((block, index) => {
      const item = block && typeof block === 'object' ? block : {};
      const kind = compactText(item.kind).toLowerCase();
      const signals = item.signals && typeof item.signals === 'object' ? item.signals : {};
      return {
        id: compactIdentifier(String(item.id || `b${index + 1}`)) || `b${index + 1}`,
        index: normalizeCount(item.index, index + 1),
        kind: ALLOWED_INGEST_BLOCK_KINDS.has(kind) ? kind : 'unknown',
        text: String(item.text || '').trim().slice(0, 480),
        source_section_title: compactText((item.source_section_title ?? item.sourceSectionTitle) || ''),
        signals: {
          has_numbers: Boolean(signals.has_numbers ?? signals.hasNumbers),
          has_question: Boolean(signals.has_question ?? signals.hasQuestion),
          has_process_words: Boolean(signals.has_process_words ?? signals.hasProcessWords),
          has_comparison_words: Boolean(signals.has_comparison_words ?? signals.hasComparisonWords)
        }
      };
    })
  );
  const sourceType = compactText(source.source_type_hint ?? source.sourceTypeHint).toLowerCase();

  return {
    contract_version: 'ingest@1',
    title_hint: compactText((source.title_hint ?? source.titleHint) || source.deck_title || source.title || 'Untitled Deck') || 'Untitled Deck',
    source_type_hint: ALLOWED_INGEST_SOURCE_TYPES.has(sourceType) ? sourceType : 'plain_text',
    raw_length: normalizeCount(source.raw_length ?? source.rawLength, blocks.reduce((sum, block) => sum + block.text.length, 0)),
    block_count: normalizeCount(source.block_count ?? source.blockCount, blocks.length),
    raw_excerpt: String((source.raw_excerpt ?? source.rawExcerpt) || '').slice(0, 6000),
    blocks
  };
};

export const validateIngest = (payload) => {
  const normalized = normalizeIngest(payload);
  if (normalized.contract_version !== 'ingest@1') {
    throw new Error('Ingest contract version is invalid');
  }
  if (normalized.block_count !== normalized.blocks.length) {
    throw new Error('Ingest block_count does not match blocks length');
  }

  const ids = new Set();
  for (const block of normalized.blocks) {
    if (!block.id) throw new Error('Ingest block is missing id');
    if (ids.has(block.id)) throw new Error(`Duplicate ingest block id: ${block.id}`);
    ids.add(block.id);
  }

  return normalized;
};

const ensureUniqueAnalysisSectionIds = (sections = []) => {
  const seen = new Map();
  return sections.map((section, index) => {
    const baseId = compactIdentifier(section.id || section.title || '') || `section-${index + 1}`;
    const count = (seen.get(baseId) || 0) + 1;
    seen.set(baseId, count);
    return {
      ...section,
      id: count === 1 ? baseId : `${baseId}-${count}`
    };
  });
};

export const normalizeAnalysis = (payload) => {
  const source = payload && typeof payload === 'object' ? payload : {};
  const metaSource = source.meta && typeof source.meta === 'object' ? source.meta : source;
  const documentSource = source.document && typeof source.document === 'object' ? source.document : source;
  const structureSource = source.structure && typeof source.structure === 'object' ? source.structure : source;
  const recommendationsSource = source.recommendations && typeof source.recommendations === 'object' ? source.recommendations : source;
  const clarificationSource = source.clarification && typeof source.clarification === 'object' ? source.clarification : source;
  const skill = getSkill(metaSource.skill || metaSource.profile || source.skill || source.profile);
  const rawSections = Array.isArray(structureSource.sections) ? structureSource.sections : [];
  const sections = ensureUniqueAnalysisSectionIds(
    rawSections
      .map((section, index) => {
        const item = section && typeof section === 'object' ? section : {};
        const role = compactText(item.role || '').toLowerCase();
        const intent = compactText(item.intent || '').toLowerCase();
        const visualCandidates = Array.isArray(item.visual_candidates)
          ? item.visual_candidates
          : Array.isArray(item.visualCandidates)
            ? item.visualCandidates
            : [];
        const normalizedVisualCandidates = dedupeList(
          visualCandidates
            .map((entry) => compactText(String(entry || '')).toLowerCase())
            .filter((entry) => ALLOWED_FORMATS.has(entry))
        ).slice(0, 3);

        return {
          id: compactIdentifier(String(item.id || item.title || '')) || `section-${index + 1}`,
          index: normalizeCount(item.index, index + 1),
          title: compactTitle(String(item.title || '').trim()),
          point_count: normalizeCount(item.point_count ?? item.pointCount ?? (Array.isArray(item.key_points) ? item.key_points.length : 0), 0),
          role: ALLOWED_SECTION_ROLES.has(role) ? role : 'detail',
          intent: ALLOWED_INTENTS.has(intent) ? intent : 'explain',
          signals: dedupeList(
            (Array.isArray(item.signals) ? item.signals : [])
              .map((entry) => compactText(String(entry || '')).toLowerCase())
              .filter((entry) => ALLOWED_ANALYSIS_SIGNALS.has(entry))
          ).slice(0, 6),
          visual_candidates: normalizedVisualCandidates.length
            ? normalizedVisualCandidates
            : [Array.isArray(item.key_points) && item.key_points.length <= 1 ? 'title-body' : 'title-bullets'],
          key_points: normalizeTextList(item.key_points ?? item.keyPoints, 4).map((entry) => compactOutlinePoint(entry)),
          summary_hint: compactMetaText(item.summary_hint ?? item.summaryHint, 72, compactTitle(String(item.title || '').trim()))
        };
      })
      .filter((section) => section.title)
  );

  const validSectionIds = new Set(sections.map((section) => section.id));
  const mustKeepSections = normalizeTextList(
    recommendationsSource.must_keep_sections ?? recommendationsSource.mustKeepSections,
    8
  ).map((entry) => compactIdentifier(entry)).filter((entry) => validSectionIds.has(entry));

  const defaultOpeningFormat = skill.name === 'pitch-tech-launch' ? 'hero' : 'title-bullets';
  const defaultEndingFormat = skill.name === 'pitch-tech-launch' ? 'cta' : 'summary';
  const openingFormat = compactText(recommendationsSource.preferred_opening_format ?? recommendationsSource.preferredOpeningFormat).toLowerCase();
  const endingFormat = compactText(recommendationsSource.preferred_ending_format ?? recommendationsSource.preferredEndingFormat).toLowerCase();
  const clarificationQuestions = normalizeClarificationQuestions(clarificationSource.questions, 3);
  const clarificationDimensions = dedupeList(
    (Array.isArray(clarificationSource.missing_dimensions) ? clarificationSource.missing_dimensions : [])
      .map((entry) => compactText(String(entry || '')).toLowerCase())
      .filter((entry) => ['audience', 'goal', 'slide_count', 'must_keep'].includes(entry))
  );
  const clarificationRuleIds = dedupeList(
    (Array.isArray(clarificationSource.trigger_rule_ids) ? clarificationSource.trigger_rule_ids : [])
      .map((entry) => compactText(String(entry || '')).toLowerCase())
      .filter(Boolean)
  ).slice(0, 8);
  const clarificationReasons = normalizeTextList(clarificationSource.reasons, 6).map((entry) => compactMetaText(entry, 88, ''));
  const clarificationAssumptions = normalizeTextList(clarificationSource.assumptions, 6).map((entry) => compactMetaText(entry, 88, ''));
  const clarificationRequired = Boolean(clarificationSource.required) && clarificationQuestions.length > 0;

  return {
    contract_version: 'analysis@1',
    deck_title: compactText(source.deck_title || source.title || 'Untitled Deck') || 'Untitled Deck',
    meta: {
      skill: skill.name,
      profile: skill.name,
      audience_hint: compactMetaText(metaSource.audience_hint ?? metaSource.audienceHint, 72, '未指定受众'),
      goal_hint: compactMetaText(metaSource.goal_hint ?? metaSource.goalHint, 72, '帮助观众快速理解主题')
    },
    document: {
      input_shape: compactText(documentSource.input_shape || documentSource.inputShape).toLowerCase() === 'slide_like'
        ? 'slide_like'
        : compactText(documentSource.input_shape || documentSource.inputShape).toLowerCase() === 'notes_like'
          ? 'notes_like'
          : 'document_like',
      doc_type: ALLOWED_DOC_TYPES.has(compactText(documentSource.doc_type || documentSource.docType).toLowerCase())
        ? compactText(documentSource.doc_type || documentSource.docType).toLowerCase()
        : 'general',
      density: compactText(documentSource.density).toLowerCase() === 'high'
        ? 'high'
        : compactText(documentSource.density).toLowerCase() === 'medium'
          ? 'medium'
          : 'low',
      roughness: compactText(documentSource.roughness).toLowerCase() === 'very_rough'
        ? 'very_rough'
        : compactText(documentSource.roughness).toLowerCase() === 'rough'
          ? 'rough'
          : 'clean',
      rewrite_strategy: compactText(documentSource.rewrite_strategy || documentSource.rewriteStrategy).toLowerCase() === 'aggressive_rewrite'
        ? 'aggressive_rewrite'
        : compactText(documentSource.rewrite_strategy || documentSource.rewriteStrategy).toLowerCase() === 'light_rewrite'
          ? 'light_rewrite'
          : 'preserve',
      heading_depth: normalizeCount(documentSource.heading_depth ?? documentSource.headingDepth, 1),
      section_count: normalizeCount(documentSource.section_count ?? documentSource.sectionCount ?? sections.length, sections.length),
      point_count: normalizeCount(documentSource.point_count ?? documentSource.pointCount, sections.reduce((sum, section) => sum + section.point_count, 0)),
      avg_sentence_length: Number.isFinite(Number(documentSource.avg_sentence_length ?? documentSource.avgSentenceLength))
        ? Number(Number(documentSource.avg_sentence_length ?? documentSource.avgSentenceLength).toFixed(2))
        : 0,
      suggested_slide_count: normalizeCount(documentSource.suggested_slide_count ?? documentSource.suggestedSlideCount ?? sections.length, Math.max(1, sections.length)),
      needs_rewrite: Boolean(documentSource.needs_rewrite ?? documentSource.needsRewrite),
      source_features: normalizeAnalysisSourceFeatures(documentSource.source_features ?? documentSource.sourceFeatures)
    },
    structure: {
      notes: normalizeTextList(structureSource.notes, 8).map((entry) => compactMetaText(entry, 72, '')),
      omitted_topics: normalizeTextList(structureSource.omitted_topics ?? structureSource.omittedTopics, 4).map((entry) => compactMetaText(entry, 48, '')),
      sections
    },
    recommendations: {
      preferred_opening_format: ALLOWED_FORMATS.has(openingFormat) ? openingFormat : defaultOpeningFormat,
      preferred_ending_format: ALLOWED_FORMATS.has(endingFormat) ? endingFormat : defaultEndingFormat,
      must_keep_sections: mustKeepSections.length
        ? mustKeepSections
        : sections.filter((section, index) => index === 0 || index === sections.length - 1).map((section) => section.id).slice(0, 4),
      watchouts: normalizeTextList(recommendationsSource.watchouts, 8).map((entry) => compactMetaText(entry, 88, ''))
    },
    clarification: {
      required: clarificationRequired,
      confidence: score(clarificationSource.confidence, clarificationRequired ? 0.56 : 0.82),
      message: compactMetaText(
        clarificationSource.message,
        96,
        clarificationRequired ? '当前分析仍缺少 1 到 2 个会显著影响规划的问题。' : '当前分析已足够进入规划。'
      ),
      trigger_rule_ids: clarificationRuleIds,
      reasons: clarificationReasons,
      assumptions: clarificationAssumptions,
      missing_dimensions: clarificationDimensions,
      questions: clarificationQuestions
    }
  };
};

export const validateAnalysis = (payload) => {
  const normalized = normalizeAnalysis(payload);
  if (normalized.contract_version !== 'analysis@1') {
    throw new Error('Analysis contract version is invalid');
  }

  const ids = new Set();
  for (const section of normalized.structure.sections) {
    if (!section.id) throw new Error('Analysis section is missing id');
    if (ids.has(section.id)) throw new Error(`Duplicate analysis section id: ${section.id}`);
    ids.add(section.id);
  }

  return normalized;
};

const normalizePlanMeta = (source) => {
  const skill = getSkill(source?.skill || source?.profile || source?.deck_profile);
  const confidence = Number(source?.planning_confidence ?? source?.confidence ?? 0.72);
  return {
    profile: skill.name,
    skill: skill.name,
    default_theme: compactMetaText(source?.default_theme || skill.default_theme, 32, skill.default_theme),
    content_intent: compactMetaText(source?.content_intent, 48, 'general presentation'),
    audience_guess: compactMetaText(source?.audience_guess, 48, '未指定受众'),
    deck_goal: compactMetaText(source?.deck_goal, 72, '帮助受众快速理解核心内容'),
    core_message: compactMetaText(source?.core_message, 72, '提炼输入中的主要结论或主线'),
    omitted_topics: Array.isArray(source?.omitted_topics)
      ? source.omitted_topics.map((item) => compactMetaText(item, 48, '')).filter(Boolean).slice(0, 3)
      : [],
    planning_confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.72,
    uncertainties: Array.isArray(source?.uncertainties)
      ? source.uncertainties.map((item) => compactUncertainty(String(item || ''))).filter(Boolean).slice(0, 3)
      : [],
    review_issues: Array.isArray(source?.review_issues)
      ? source.review_issues.map((item) => compactMetaText(item, 48, '')).filter(Boolean).slice(0, 5)
      : [],
    actions_taken: Array.isArray(source?.actions_taken)
      ? source.actions_taken.map((item) => compactMetaText(item, 48, '')).filter(Boolean).slice(0, 5)
      : []
  };
};

const normalizeExpandMeta = (source) => ({
  profile: preserveNamedValue(source?.skill || source?.profile),
  skill: preserveNamedValue(source?.skill || source?.profile),
  rewrite_quality: score(source?.rewrite_quality, 0.68),
  tone: String(source?.tone || 'presentation').trim() === 'mixed' ? 'mixed' : 'presentation',
  review_issues: Array.isArray(source?.review_issues)
    ? source.review_issues.map((item) => compactMetaText(item, 48, '')).filter(Boolean).slice(0, 5)
    : [],
  actions_taken: Array.isArray(source?.actions_taken)
    ? source.actions_taken.map((item) => compactMetaText(item, 48, '')).filter(Boolean).slice(0, 5)
    : []
});

export const normalizeOutline = (payload) => {
  const source = payload && typeof payload === 'object' ? payload : {};
  const deckTitle = String(source.deck_title || source.title || 'Untitled Deck').trim() || 'Untitled Deck';
  const meta = normalizePlanMeta(source.meta && typeof source.meta === 'object' ? source.meta : source);
  const rawSlides = Array.isArray(source.slides) ? source.slides : [];
  const slides = rawSlides
    .map((slide, index) => {
      const item = slide && typeof slide === 'object' ? slide : {};
      const rawIntent = String(item.intent || 'explain').trim() || 'explain';
      return {
        index: Number(item.index || index + 1),
        title: compactTitle(String(item.title || '').trim()),
        summary: String(item.summary || '').trim().slice(0, 72),
        preview_points: Array.isArray(item.preview_points)
          ? dedupeList(item.preview_points.map((entry) => compactOutlinePoint(String(entry || '')))).slice(0, 3)
          : Array.isArray(item.previewPoints)
            ? dedupeList(item.previewPoints.map((entry) => compactOutlinePoint(String(entry || '')))).slice(0, 3)
            : [],
        detail_points: Array.isArray(item.detail_points)
          ? dedupeList(item.detail_points.map((entry) => compactOutlinePoint(String(entry || '')))).slice(0, 5)
          : Array.isArray(item.detailPoints)
            ? dedupeList(item.detailPoints.map((entry) => compactOutlinePoint(String(entry || '')))).slice(0, 5)
            : [],
        intent: ALLOWED_INTENTS.has(rawIntent) ? rawIntent : 'explain'
      };
    })
    .map((slide) => {
      const detailPoints = slide.detail_points.length
        ? slide.detail_points
        : (slide.preview_points.length ? slide.preview_points : [slide.summary].filter(Boolean)).slice(0, 5);
      const previewPoints = slide.preview_points.length ? slide.preview_points : detailPoints.slice(0, 3);
      return {
        ...slide,
        detail_points: detailPoints,
        preview_points: previewPoints
      };
    })
    .filter((slide) => slide.title);

  if (!slides.length) throw new Error('Outline is empty');
  return { deck_title: deckTitle, meta, slides: slides.slice(0, 16) };
};

export const outlineToApiPayload = (outline) => normalizeOutline({
  deck_title: outline?.deck_title || outline?.deckTitle || 'Untitled Deck',
  meta: outline?.meta || null,
  slides: Array.isArray(outline?.slides) ? outline.slides : []
});

export const normalizeExpanded = (payload) => {
  const source = payload && typeof payload === 'object' ? payload : {};
  const deckTitle = String(source.deck_title || source.title || 'Untitled Deck').trim() || 'Untitled Deck';
  const meta = normalizeExpandMeta(source.meta && typeof source.meta === 'object' ? source.meta : source);
  const rawSlides = Array.isArray(source.slides) ? source.slides : [];
  const slides = rawSlides
    .map((slide, index) => {
      const item = slide && typeof slide === 'object' ? slide : {};
      const bullets = Array.isArray(item.bullets)
        ? dedupeList(item.bullets.map((entry) => compactBullet(String(entry || '')))).slice(0, 6)
        : [];
      const explicitBlocks = Array.isArray(item.blocks)
        ? item.blocks.map(normalizeRenderBlock).filter(Boolean)
        : [];
      let format = String(item.format || 'title-bullets').trim() || 'title-bullets';
      if (!ALLOWED_FORMATS.has(format)) format = bullets.length ? 'title-bullets' : 'title-body';
      if (!bullets.length && item.body) {
        format = format === 'summary' || format === 'cta' ? format : 'title-body';
      }
      if (format === 'title-bullets' && bullets.length < 2 && item.body) format = 'title-body';
      const normalizedSlide = {
        index: Number(item.index || index + 1),
        title: compactTitle(String(item.title || '').trim()),
        format,
        bullets,
        body: compactBody(String(item.body || ''))
      };

      if (normalizedSlide.format === 'title-bullets' && !normalizedSlide.bullets.length && normalizedSlide.body) {
        normalizedSlide.format = 'title-body';
      }
      if ((normalizedSlide.format === 'title-body' || normalizedSlide.format === 'summary') && !normalizedSlide.body && normalizedSlide.bullets.length) {
        normalizedSlide.body = normalizedSlide.bullets.slice(0, 2).join('；');
        if (normalizedSlide.format !== 'summary') normalizedSlide.bullets = [];
      }

      return {
        ...normalizedSlide,
        blocks: explicitBlocks.length ? explicitBlocks : buildExpandedBlocks(normalizedSlide)
      };
    })
    .filter((slide) => slide.title && (slide.blocks.length || slide.bullets.length || slide.body));

  if (!slides.length) throw new Error('Expanded slides are empty');
  return { deck_title: deckTitle, meta, slides: slides.slice(0, 16) };
};

const normalizeRenderDeckMeta = (source, slideCount) => {
  const profileName = source?.meta?.skill || source?.meta?.profile || source?.skill || source?.profile;
  const normalizedSkill = preserveNamedValue(profileName);
  const rawSource = compactText(source?.meta?.source || source?.source || '');
  const sourceType = rawSource === 'expanded' || rawSource === 'markdown' || rawSource === 'manual'
    ? rawSource
    : 'manual';

  return {
    contract_version: 'render-deck@1',
    source: sourceType,
    skill: normalizedSkill,
    profile: normalizedSkill,
    default_theme: compactText(source?.meta?.default_theme || source?.default_theme || ''),
    slide_count: slideCount
  };
};

const normalizeRenderVariant = (value = '') => {
  const variant = compactText(value);
  return ALLOWED_VARIANTS.has(variant) ? variant : 'default';
};

const ensureUniqueSlideIds = (slides = []) => {
  const seen = new Map();
  return slides.map((slide, index) => {
    const baseId = compactIdentifier(slide.id || slide.title || '') || `slide-${index + 1}`;
    const count = (seen.get(baseId) || 0) + 1;
    seen.set(baseId, count);
    return {
      ...slide,
      id: count === 1 ? baseId : `${baseId}-${count}`
    };
  });
};

const normalizeRenderBlock = (block) => {
  if (!block || typeof block !== 'object') return null;

  if (block.type === 'paragraph') {
    const content = compactText(block.content || block.text || '');
    return content ? { type: 'paragraph', content } : null;
  }

  if (block.type === 'list') {
    const items = Array.isArray(block.items) ? block.items.map((item) => compactText(item)).filter(Boolean).slice(0, 8) : [];
    return items.length ? { type: 'list', items } : null;
  }

  if (block.type === 'image') {
    const src = String(block.inlinedSrc || block.src || '').trim();
    if (!src) return null;
    return {
      type: 'image',
      alt: compactText(block.alt || ''),
      src: String(block.src || '').trim(),
      inlinedSrc: src
    };
  }

  if (block.type === 'code') {
    const content = String(block.content || block.text || '');
    return content ? { type: 'code', language: compactText(block.language || ''), content } : null;
  }

  if (block.type === 'quote') {
    const quote = compactText(block.quote || block.content || block.text || '');
    if (!quote) return null;
    return {
      type: 'quote',
      quote,
      attribution: compactText(block.attribution || block.author || ''),
      emphasis: compactText(block.emphasis || '')
    };
  }

  if (block.type === 'transition') {
    const headline = compactText(block.headline || block.title || '');
    const body = compactText(block.body || block.content || '');
    if (!headline && !body) return null;
    return {
      type: 'transition',
      kicker: compactText(block.kicker || block.eyebrow || ''),
      headline: headline || body || '下一部分',
      body
    };
  }

  if (block.type === 'tags') {
    const items = normalizeTextList(block.items, 10);
    const intro = compactText(block.intro || block.body || '');
    if (!items.length && !intro) return null;
    return {
      type: 'tags',
      intro,
      items,
      emphasis: compactText(block.emphasis || '')
    };
  }

  if (block.type === 'flow') {
    const nodes = Array.isArray(block.nodes)
      ? block.nodes.map((item) => ({
          label: compactText(item?.label || item?.title || ''),
          detail: compactText(item?.detail || '')
        })).filter((item) => item.label).slice(0, 6)
      : [];
    if (!nodes.length) return null;
    return {
      type: 'flow',
      eyebrow: compactText(block.eyebrow || ''),
      intro: compactText(block.intro || ''),
      nodes
    };
  }

  if (block.type === 'table-lite') {
    const columns = Array.isArray(block.columns)
      ? block.columns.map((item) => compactText(item)).filter(Boolean).slice(0, 4)
      : [];
    const rows = Array.isArray(block.rows)
      ? block.rows.map((row) => ({
          cells: Array.isArray(row?.cells)
            ? row.cells.map((cell) => compactText(cell)).filter(Boolean).slice(0, 4)
            : []
        })).filter((row) => row.cells.length)
      : [];
    if (!columns.length || !rows.length) return null;
    return {
      type: 'table-lite',
      eyebrow: compactText(block.eyebrow || ''),
      caption: compactText(block.caption || ''),
      columns,
      rows
    };
  }

  if (block.type === 'timeline') {
    const items = Array.isArray(block.items)
      ? block.items.map((item) => ({
          label: compactText(item?.label || item?.title || ''),
          detail: compactText(item?.detail || '')
        })).filter((item) => item.label).slice(0, 6)
      : [];
    if (!items.length) return null;
    return {
      type: 'timeline',
      eyebrow: compactText(block.eyebrow || ''),
      intro: compactText(block.intro || ''),
      items
    };
  }

  if (block.type === 'callout') {
    const body = compactText(block.body || block.content || '');
    if (!body) return null;
    const tone = compactText(block.tone || '').toLowerCase();
    return {
      type: 'callout',
      tone: tone === 'warning' || tone === 'accent' ? tone : 'neutral',
      title: compactText(block.title || ''),
      body
    };
  }

  if (block.type === 'stat-strip') {
    const items = Array.isArray(block.items)
      ? block.items.map((item) => ({
          value: compactText(item?.value || ''),
          label: compactText(item?.label || '')
        })).filter((item) => item.value || item.label).slice(0, 4)
      : [];
    if (!items.length) return null;
    return {
      type: 'stat-strip',
      eyebrow: compactText(block.eyebrow || ''),
      items
    };
  }

  if (block.type === 'matrix') {
    const columns = Array.isArray(block.columns)
      ? block.columns.map((item) => compactText(item)).filter(Boolean).slice(0, 2)
      : [];
    const rows = Array.isArray(block.rows)
      ? block.rows.map((row) => ({
          label: compactText(row?.label || ''),
          cells: Array.isArray(row?.cells)
            ? row.cells.map((cell) => ({
                title: compactText(cell?.title || ''),
                body: compactText(cell?.body || '')
              })).filter((cell) => cell.title).slice(0, 2)
            : []
        })).filter((row) => row.label && row.cells.length)
      : [];
    if (columns.length !== 2 || rows.length !== 2) return null;
    return {
      type: 'matrix',
      eyebrow: compactText(block.eyebrow || ''),
      columns,
      rows
    };
  }

  if (block.type === 'people') {
    const people = Array.isArray(block.people)
      ? block.people.map((item) => ({
          name: compactText(item?.name || ''),
          role: compactText(item?.role || ''),
          note: compactText(item?.note || '')
        })).filter((person) => person.name && person.role).slice(0, 4)
      : [];
    if (!people.length) return null;
    return {
      type: 'people',
      eyebrow: compactText(block.eyebrow || ''),
      intro: compactText(block.intro || ''),
      people
    };
  }

  if (block.type === 'faq') {
    const items = Array.isArray(block.items)
      ? block.items.map((item) => ({
          question: compactText(item?.question || ''),
          answer: compactText(item?.answer || '')
        })).filter((entry) => entry.question).slice(0, 6)
      : [];
    if (!items.length) return null;
    return {
      type: 'faq',
      eyebrow: compactText(block.eyebrow || ''),
      intro: compactText(block.intro || ''),
      items
    };
  }

  if (block.type === 'risk') {
    const items = Array.isArray(block.items)
      ? block.items.map((item) => {
          const severity = compactText(item?.severity || '').toLowerCase();
          return {
            title: compactText(item?.title || ''),
            detail: compactText(item?.detail || ''),
            severity: severity === 'low' || severity === 'high' ? severity : 'medium'
          };
        }).filter((entry) => entry.title).slice(0, 6)
      : [];
    if (!items.length) return null;
    return {
      type: 'risk',
      eyebrow: compactText(block.eyebrow || ''),
      intro: compactText(block.intro || ''),
      items
    };
  }

  if (block.type === 'architecture') {
    const nodes = Array.isArray(block.nodes)
      ? block.nodes.map((item) => ({
          label: compactText(item?.label || item?.title || ''),
          detail: compactText(item?.detail || ''),
          group: compactText(item?.group || '')
        })).filter((entry) => entry.label).slice(0, 8)
      : [];
    if (!nodes.length) return null;
    return {
      type: 'architecture',
      eyebrow: compactText(block.eyebrow || ''),
      intro: compactText(block.intro || ''),
      nodes
    };
  }

  if (block.type === 'hero') {
    const headline = compactText(block.headline || block.title || '');
    const points = normalizeTextList(block.points, 4);
    const body = compactText(block.body || block.content || '');
    const stats = Array.isArray(block.stats)
      ? block.stats
          .map((item) => ({
            value: compactText(item?.value || ''),
            label: compactText(item?.label || '')
          }))
          .filter((item) => item.value || item.label)
          .slice(0, 3)
      : [];
    if (!headline && !points.length && !body) return null;
    return {
      type: 'hero',
      eyebrow: compactText(block.eyebrow || ''),
      headline: headline || body || '核心主张',
      body,
      points,
      proof: compactText(block.proof || ''),
      stats,
      layout: 'hero-grid'
    };
  }

  if (block.type === 'compare') {
    const leftLabel = compactText(block.left?.label || block.left_label || '旧方式');
    const rightLabel = compactText(block.right?.label || block.right_label || '新方式');
    const leftItems = normalizeTextList(block.left?.items || block.left_items, 4);
    const rightItems = normalizeTextList(block.right?.items || block.right_items, 4);
    const body = compactText(block.body || '');
    const leftCaption = compactText(block.left?.caption || block.left_caption || '');
    const rightCaption = compactText(block.right?.caption || block.right_caption || '');
    if (!leftItems.length && !rightItems.length) return null;
    return {
      type: 'compare',
      eyebrow: compactText(block.eyebrow || ''),
      body,
      summary: compactText(block.summary || ''),
      left: { label: leftLabel || '旧方式', items: leftItems, caption: leftCaption },
      right: { label: rightLabel || '新方式', items: rightItems, caption: rightCaption },
      layout: 'two-col'
    };
  }

  if (block.type === 'metrics') {
    const items = Array.isArray(block.items)
      ? block.items.map((item) => ({
          value: compactText(item?.value || ''),
          label: compactText(item?.label || ''),
          note: compactText(item?.note || '')
        })).filter((item) => item.value || item.label).slice(0, 4)
      : [];
    if (!items.length) return null;
    return {
      type: 'metrics',
      eyebrow: compactText(block.eyebrow || ''),
      intro: compactText(block.intro || ''),
      proof: compactText(block.proof || ''),
      items
    };
  }

  if (block.type === 'process') {
    const steps = Array.isArray(block.steps)
      ? block.steps.map((item) => ({
          label: compactText(item?.label || item?.title || ''),
          detail: compactText(item?.detail || '')
        })).filter((item) => item.label).slice(0, 6)
      : [];
    if (!steps.length) return null;
    return {
      type: 'process',
      eyebrow: compactText(block.eyebrow || ''),
      intro: compactText(block.intro || ''),
      steps
    };
  }

  if (block.type === 'summary') {
    const items = normalizeTextList(block.items, 4);
    if (!items.length && !compactText(block.intro || '')) return null;
    return {
      type: 'summary',
      eyebrow: compactText(block.eyebrow || ''),
      intro: compactText(block.intro || ''),
      items
    };
  }

  if (block.type === 'cta') {
    const actions = normalizeTextList(block.actions, 4);
    const message = compactText(block.message || block.body || '');
    if (!message && !actions.length) return null;
    return {
      type: 'cta',
      eyebrow: compactText(block.eyebrow || ''),
      message: message || '下一步行动',
      actions,
      proof: compactText(block.proof || '')
    };
  }

  return null;
};

const hasNumericLead = (value = '') => /^[0-9][0-9a-zA-Z.%+/xX-]{0,12}(\s|[:：|])/.test(compactText(value));

const parseCompareLabels = (text = '', title = '') => {
  const source = compactText(text) || compactText(title);
  if (source.includes('|')) {
    const parts = source.split('|').map((part) => compactText(part)).filter(Boolean);
    if (parts.length >= 2) return parts.slice(0, 2);
  }
  const vsMatch = source.match(/^(.+?)\s+vs\.?\s+(.+)$/i);
  if (vsMatch) return [compactText(vsMatch[1]), compactText(vsMatch[2])];
  return ['旧方式', '新方式'];
};

const parseMetricItem = (value, index) => {
  const text = compactText(value);
  const separated = text.match(/^([^:：|]{1,16})[:：|]\s*(.+)$/);
  if (separated && /[\d%+xX]/.test(separated[1])) {
    return { value: separated[1], label: separated[2], note: '' };
  }
  const leading = text.match(/^([0-9][0-9a-zA-Z.%+/xX-]{0,11})\s+(.+)$/);
  if (leading) {
    return { value: leading[1], label: leading[2], note: '' };
  }
  return { value: `0${index + 1}`, label: text, note: '' };
};

const collectParagraphs = (blocks = []) =>
  blocks.filter((block) => block?.type === 'paragraph').map((block) => compactText(block.content)).filter(Boolean);

const collectListItems = (blocks = []) =>
  blocks
    .filter((block) => block?.type === 'list')
    .flatMap((block) => (Array.isArray(block.items) ? block.items : []).map((item) => compactText(item)))
    .filter(Boolean);

const collectNonTextBlocks = (blocks = []) =>
  blocks.filter((block) => block?.type === 'image' || block?.type === 'code');

const buildHeroBlockFromBlocks = (title, blocks) => {
  const paragraphs = collectParagraphs(blocks);
  const listItems = collectListItems(blocks);
  return {
    type: 'hero',
    eyebrow: 'Launch Thesis',
    headline: compactTitle(title),
    body: paragraphs[0] || '',
    points: listItems.slice(0, 3),
    proof: listItems[2] || listItems[1] || paragraphs[1] || '',
    stats: [
      { value: `${Math.max(3, listItems.length)}`, label: 'core points' },
      { value: paragraphs[0] ? '1' : '0', label: 'support line' }
    ],
    layout: 'hero-grid'
  };
};

const buildCompareBlockFromBlocks = (title, blocks) => {
  const paragraphs = collectParagraphs(blocks);
  const items = collectListItems(blocks);
  const [leftLabel, rightLabel] = parseCompareLabels(paragraphs[0], title);
  const midpoint = Math.max(2, Math.ceil(items.length / 2));
  const support = paragraphs.filter((entry) => !entry.includes('|'));
  return {
    type: 'compare',
    eyebrow: 'Signal Shift',
    body: support[0] || '',
    summary: compactTitle(title),
    left: {
      label: leftLabel,
      items: items.slice(0, midpoint),
      caption: support[1] || ''
    },
    right: {
      label: rightLabel,
      items: items.slice(midpoint),
      caption: support[2] || ''
    },
    layout: 'two-col'
  };
};

const buildMetricsBlockFromBlocks = (title, blocks) => {
  const paragraphs = collectParagraphs(blocks);
  const items = collectListItems(blocks).slice(0, 4).map(parseMetricItem);
  return {
    type: 'metrics',
    eyebrow: 'Proof Points',
    intro: paragraphs[0] || '',
    proof: compactTitle(title),
    items
  };
};

const buildProcessBlockFromBlocks = (blocks) => {
  const paragraphs = collectParagraphs(blocks);
  const items = collectListItems(blocks);
  return {
    type: 'process',
    eyebrow: 'Execution Path',
    intro: paragraphs[0] || '',
    steps: items.slice(0, 5).map((item) => ({ label: item }))
  };
};

const buildSummaryBlockFromBlocks = (blocks) => {
  const paragraphs = collectParagraphs(blocks);
  const items = collectListItems(blocks);
  return {
    type: 'summary',
    eyebrow: 'Key Takeaways',
    intro: paragraphs[0] || '',
    items: items.slice(0, 4)
  };
};

const buildCtaBlockFromBlocks = (title, blocks) => {
  const paragraphs = collectParagraphs(blocks);
  const items = collectListItems(blocks);
  return {
    type: 'cta',
    eyebrow: 'Call To Action',
    message: paragraphs[0] || compactTitle(title),
    actions: items.slice(0, 4),
    proof: compactTitle(title)
  };
};

const buildQuoteBlockFromBlocks = (title, blocks) => {
  const paragraphs = collectParagraphs(blocks);
  const items = collectListItems(blocks);
  const quote = paragraphs[0] || items[0] || compactTitle(title);
  const attribution = paragraphs[1] || '';
  return {
    type: 'quote',
    quote,
    attribution,
    emphasis: compactTitle(title)
  };
};

const buildTransitionBlockFromBlocks = (title, blocks) => {
  const paragraphs = collectParagraphs(blocks);
  return {
    type: 'transition',
    kicker: 'Next Section',
    headline: compactTitle(title),
    body: paragraphs[0] || ''
  };
};

const buildTagsBlockFromBlocks = (title, blocks) => {
  const paragraphs = collectParagraphs(blocks);
  const items = collectListItems(blocks);
  return {
    type: 'tags',
    intro: paragraphs[0] || '',
    items: items.slice(0, 8),
    emphasis: compactTitle(title)
  };
};

const buildFlowBlockFromBlocks = (title, blocks) => {
  const paragraphs = collectParagraphs(blocks);
  const items = collectListItems(blocks);
  return {
    type: 'flow',
    eyebrow: 'Flow',
    intro: paragraphs[0] || '',
    nodes: items.slice(0, 6).map((item) => ({ label: item || compactTitle(title) }))
  };
};

const buildTableLiteBlockFromBlocks = (title, blocks) => {
  const items = collectListItems(blocks);
  const rows = items
    .map((item) => item.split(/[|｜]/).map((cell) => compactText(cell)).filter(Boolean))
    .filter((cells) => cells.length >= 2)
    .slice(0, 5);
  if (!rows.length) return null;
  const columnCount = Math.min(4, Math.max(...rows.map((cells) => cells.length)));
  const columns = Array.from({ length: columnCount }, (_, index) => `字段 ${index + 1}`);
  return {
    type: 'table-lite',
    eyebrow: 'Table',
    caption: compactTitle(title),
    columns,
    rows: rows.map((cells) => ({ cells: cells.slice(0, columnCount) }))
  };
};

const buildTimelineBlockFromBlocks = (title, blocks) => {
  const paragraphs = collectParagraphs(blocks);
  const items = collectListItems(blocks);
  return {
    type: 'timeline',
    eyebrow: 'Timeline',
    intro: paragraphs[0] || '',
    items: items.slice(0, 6).map((item) => ({ label: item }))
  };
};

const buildCalloutBlockFromBlocks = (title, blocks) => {
  const paragraphs = collectParagraphs(blocks);
  const items = collectListItems(blocks);
  const body = paragraphs[0] || items[0] || compactTitle(title);
  return {
    type: 'callout',
    tone: /(风险|警告|提醒|warning|risk)/i.test(title) ? 'warning' : 'accent',
    title: compactTitle(title),
    body
  };
};

const buildStatStripBlockFromBlocks = (title, blocks) => {
  const items = collectListItems(blocks).slice(0, 4).map(parseMetricItem);
  if (!items.length) return null;
  return {
    type: 'stat-strip',
    eyebrow: compactTitle(title),
    items: items.map((item) => ({ value: item.value, label: item.label }))
  };
};

const buildMatrixBlockFromBlocks = (title, blocks) => {
  const items = collectListItems(blocks)
    .map((item) => item.split(/[|｜]/).map((cell) => compactText(cell)).filter(Boolean))
    .filter((cells) => cells.length >= 3)
    .slice(0, 4);
  if (items.length < 4) return null;

  return {
    type: 'matrix',
    eyebrow: compactTitle(title),
    columns: ['维度 A', '维度 B'],
    rows: [
      {
        label: '象限 1',
        cells: [
          { title: items[0][0], body: items[0].slice(1).join(' · ') },
          { title: items[1][0], body: items[1].slice(1).join(' · ') }
        ]
      },
      {
        label: '象限 2',
        cells: [
          { title: items[2][0], body: items[2].slice(1).join(' · ') },
          { title: items[3][0], body: items[3].slice(1).join(' · ') }
        ]
      }
    ]
  };
};

const buildPeopleBlockFromBlocks = (title, blocks) => {
  const paragraphs = collectParagraphs(blocks);
  const items = collectListItems(blocks)
    .map((item) => item.split(/[：:|-]/).map((part) => compactText(part)).filter(Boolean))
    .filter((parts) => parts.length >= 2)
    .slice(0, 4);
  if (!items.length) return null;
  return {
    type: 'people',
    eyebrow: compactTitle(title),
    intro: paragraphs[0] || '',
    people: items.map((parts) => ({
      name: parts[0],
      role: parts[1],
      note: parts.slice(2).join(' · ')
    }))
  };
};

const buildFaqBlockFromBlocks = (title, blocks) => {
  const paragraphs = collectParagraphs(blocks);
  const listItems = collectListItems(blocks);
  const items = listItems
    .map((item) => {
      const qaMatch = item.match(/^(.+?[？?])\s*(.+)$/);
      if (qaMatch) {
        return {
          question: compactText(qaMatch[1]),
          answer: compactText(qaMatch[2])
        };
      }
      const parts = item.split(/[：:]/).map((part) => compactText(part)).filter(Boolean);
      if (parts.length >= 2) {
        return {
          question: parts[0],
          answer: parts.slice(1).join('：')
        };
      }
      return {
        question: compactText(item),
        answer: ''
      };
    })
    .filter((entry) => entry.question)
    .slice(0, 6);

  if (!items.length) return null;
  return {
    type: 'faq',
    eyebrow: compactTitle(title),
    intro: paragraphs[0] || '',
    items
  };
};

const buildRiskBlockFromBlocks = (title, blocks) => {
  const paragraphs = collectParagraphs(blocks);
  const listItems = collectListItems(blocks);
  const items = listItems
    .map((item) => {
      const parts = item.split(/[：:]/).map((part) => compactText(part)).filter(Boolean);
      const head = parts[0] || compactText(item);
      const detail = parts.length > 1 ? parts.slice(1).join('：') : '';
      const severity = /高|critical|严重|关键/i.test(head)
        ? 'high'
        : /低|minor|轻微/i.test(head)
          ? 'low'
          : 'medium';
      return {
        title: head,
        detail,
        severity
      };
    })
    .filter((entry) => entry.title)
    .slice(0, 6);
  if (!items.length) return null;
  return {
    type: 'risk',
    eyebrow: compactTitle(title),
    intro: paragraphs[0] || '',
    items
  };
};

const buildArchitectureBlockFromBlocks = (title, blocks) => {
  const paragraphs = collectParagraphs(blocks);
  const listItems = collectListItems(blocks);
  const nodes = listItems
    .map((item) => {
      const parts = item.split(/[：:|-]/).map((part) => compactText(part)).filter(Boolean);
      return {
        label: parts[0] || compactText(item),
        detail: parts.length > 1 ? parts.slice(1).join(' · ') : '',
        group: ''
      };
    })
    .filter((entry) => entry.label)
    .slice(0, 8);
  if (!nodes.length) return null;
  return {
    type: 'architecture',
    eyebrow: compactTitle(title),
    intro: paragraphs[0] || '',
    nodes
  };
};

const buildExpandedBlocks = (slide) => {
  if (slide.format === 'title-body' && slide.body && !slide.bullets.length) {
    return [{
      type: 'transition',
      kicker: 'Next Section',
      headline: slide.title,
      body: slide.body
    }].map(normalizeRenderBlock).filter(Boolean);
  }

  if (slide.format === 'title-bullets' && slide.bullets.length >= 4 && /标签|关键词|tag|术语|维度/.test(slide.title)) {
    return [{
      type: 'tags',
      intro: slide.body,
      items: slide.bullets.slice(0, 8),
      emphasis: slide.title
    }].map(normalizeRenderBlock).filter(Boolean);
  }

  if (slide.format === 'process' && slide.bullets.length >= 3 && /流程图|流转|链路|架构流|flow/.test(slide.title)) {
    return [{
      type: 'flow',
      eyebrow: 'Flow',
      intro: slide.body,
      nodes: slide.bullets.slice(0, 6).map((item) => ({ label: item }))
    }].map(normalizeRenderBlock).filter(Boolean);
  }

  if (slide.format === 'compare' && slide.bullets.length >= 2 && /表格|对照表|table|矩阵/.test(slide.title)) {
    const rows = slide.bullets
      .map((item) => item.split(/[|｜]/).map((cell) => compactText(cell)).filter(Boolean))
      .filter((cells) => cells.length >= 2)
      .slice(0, 5);
    if (rows.length) {
      const columnCount = Math.min(4, Math.max(...rows.map((cells) => cells.length)));
      return [{
        type: 'table-lite',
        eyebrow: 'Table',
        caption: slide.title,
        columns: Array.from({ length: columnCount }, (_, index) => `字段 ${index + 1}`),
        rows: rows.map((cells) => ({ cells: cells.slice(0, columnCount) }))
      }].map(normalizeRenderBlock).filter(Boolean);
    }
  }

  if (slide.format === 'process' && slide.bullets.length >= 3 && /时间线|timeline|阶段进展|里程碑/.test(slide.title)) {
    return [{
      type: 'timeline',
      eyebrow: 'Timeline',
      intro: slide.body,
      items: slide.bullets.slice(0, 6).map((item) => ({ label: item }))
    }].map(normalizeRenderBlock).filter(Boolean);
  }

  if (slide.format === 'title-body' && slide.body && /提醒|判断|结论|风险|warning|callout/.test(slide.title)) {
    return [{
      type: 'callout',
      tone: /(风险|warning)/i.test(slide.title) ? 'warning' : 'accent',
      title: slide.title,
      body: slide.body
    }].map(normalizeRenderBlock).filter(Boolean);
  }

  if (slide.format === 'metrics' && slide.bullets.length >= 2 && slide.bullets.length <= 4) {
    return [{
      type: 'stat-strip',
      eyebrow: slide.title,
      items: slide.bullets.slice(0, 4).map(parseMetricItem).map((item) => ({ value: item.value, label: item.label }))
    }].map(normalizeRenderBlock).filter(Boolean);
  }

  if (slide.format === 'compare' && slide.bullets.length >= 4 && /矩阵|matrix|象限/.test(slide.title)) {
    const items = slide.bullets
      .map((item) => item.split(/[|｜]/).map((cell) => compactText(cell)).filter(Boolean))
      .filter((cells) => cells.length >= 2)
      .slice(0, 4);
    if (items.length === 4) {
      return [{
        type: 'matrix',
        eyebrow: slide.title,
        columns: ['维度 A', '维度 B'],
        rows: [
          {
            label: '象限 1',
            cells: [
              { title: items[0][0], body: items[0].slice(1).join(' · ') },
              { title: items[1][0], body: items[1].slice(1).join(' · ') }
            ]
          },
          {
            label: '象限 2',
            cells: [
              { title: items[2][0], body: items[2].slice(1).join(' · ') },
              { title: items[3][0], body: items[3].slice(1).join(' · ') }
            ]
          }
        ]
      }].map(normalizeRenderBlock).filter(Boolean);
    }
  }

  if (slide.format === 'compare' && slide.bullets.length >= 2 && /团队|角色|画像|用户群|people|persona/.test(slide.title)) {
    const people = slide.bullets
      .map((item) => item.split(/[：:|-]/).map((part) => compactText(part)).filter(Boolean))
      .filter((parts) => parts.length >= 2)
      .slice(0, 4);
    if (people.length) {
      return [{
        type: 'people',
        eyebrow: slide.title,
        intro: slide.body,
        people: people.map((parts) => ({
          name: parts[0],
          role: parts[1],
          note: parts.slice(2).join(' · ')
        }))
      }].map(normalizeRenderBlock).filter(Boolean);
    }
  }

  if (slide.format === 'title-bullets' && slide.bullets.length >= 2 && /faq|常见问题|问答|问题解答/i.test(slide.title)) {
    return [{
      type: 'faq',
      eyebrow: slide.title,
      intro: slide.body,
      items: slide.bullets.slice(0, 6).map((item) => {
        const qaMatch = compactText(item).match(/^(.+?[？?])\s*(.+)$/);
        if (qaMatch) return { question: qaMatch[1], answer: qaMatch[2] };
        const parts = compactText(item).split(/[：:]/).map((part) => compactText(part)).filter(Boolean);
        return {
          question: parts[0] || compactText(item),
          answer: parts.length > 1 ? parts.slice(1).join('：') : ''
        };
      })
    }].map(normalizeRenderBlock).filter(Boolean);
  }

  if ((slide.format === 'title-bullets' || slide.format === 'title-body') && /风险|限制|约束|注意事项|risk/i.test(slide.title)) {
    return [{
      type: 'risk',
      eyebrow: slide.title,
      intro: slide.body,
      items: slide.bullets.slice(0, 6).map((item) => {
        const parts = compactText(item).split(/[：:]/).map((part) => compactText(part)).filter(Boolean);
        const head = parts[0] || compactText(item);
        return {
          title: head,
          detail: parts.length > 1 ? parts.slice(1).join('：') : '',
          severity: /高|critical|严重|关键/i.test(head) ? 'high' : (/低|minor|轻微/i.test(head) ? 'low' : 'medium')
        };
      })
    }].map(normalizeRenderBlock).filter(Boolean);
  }

  if ((slide.format === 'process' || slide.format === 'title-bullets') && slide.bullets.length >= 3 && /架构|系统图|architecture|模块图|组件图|平台结构/.test(slide.title)) {
    return [{
      type: 'architecture',
      eyebrow: slide.title,
      intro: slide.body,
      nodes: slide.bullets.slice(0, 8).map((item) => {
        const parts = compactText(item).split(/[：:|-]/).map((part) => compactText(part)).filter(Boolean);
        return {
          label: parts[0] || compactText(item),
          detail: parts.length > 1 ? parts.slice(1).join(' · ') : '',
          group: ''
        };
      })
    }].map(normalizeRenderBlock).filter(Boolean);
  }

  if (slide.format === 'hero') {
    return [{
      type: 'hero',
      eyebrow: 'Launch Thesis',
      headline: slide.title,
      body: slide.body,
      points: slide.bullets.slice(0, 3),
      proof: slide.bullets[2] || '',
      stats: [
        { value: `${slide.bullets.slice(0, 3).length}`, label: 'core signals' },
        { value: slide.body ? '1' : '0', label: 'proof lines' }
      ],
      layout: 'hero-grid'
    }].map(normalizeRenderBlock).filter(Boolean);
  }

  if (slide.format === 'compare') {
    const [leftLabel, rightLabel] = parseCompareLabels(slide.body, slide.title);
    const midpoint = Math.max(2, Math.ceil(slide.bullets.length / 2));
    return [{
      type: 'compare',
      eyebrow: 'Signal Shift',
      body: slide.body,
      summary: slide.title,
      left: { label: leftLabel, items: slide.bullets.slice(0, midpoint) },
      right: { label: rightLabel, items: slide.bullets.slice(midpoint) },
      layout: 'two-col'
    }].map(normalizeRenderBlock).filter(Boolean);
  }

  if (slide.format === 'metrics') {
    return [{
      type: 'metrics',
      eyebrow: 'Proof Points',
      intro: slide.body,
      proof: slide.title,
      items: slide.bullets.slice(0, 4).map(parseMetricItem)
    }].map(normalizeRenderBlock).filter(Boolean);
  }

  if (slide.format === 'process') {
    return [{
      type: 'process',
      eyebrow: 'Execution Path',
      intro: slide.body,
      steps: slide.bullets.slice(0, 5).map((item) => ({ label: item }))
    }].map(normalizeRenderBlock).filter(Boolean);
  }

  if (slide.format === 'summary') {
    return [{
      type: 'summary',
      eyebrow: 'Key Takeaways',
      intro: slide.body,
      items: slide.bullets.slice(0, 4)
    }].map(normalizeRenderBlock).filter(Boolean);
  }

  if (slide.format === 'cta') {
    return [{
      type: 'cta',
      eyebrow: 'Call To Action',
      message: slide.body || slide.title,
      actions: slide.bullets.slice(0, 4),
      proof: slide.title
    }].map(normalizeRenderBlock).filter(Boolean);
  }

  return [
    ...(slide.body ? [{ type: 'paragraph', content: slide.body }] : []),
    ...(slide.bullets.length ? [{ type: 'list', items: slide.bullets }] : []),
    ...(!slide.body && !slide.bullets.length ? [{ type: 'paragraph', content: slide.title }] : [])
  ].map(normalizeRenderBlock).filter(Boolean);
};

const looksHeroSlide = (title, paragraphs, listItems) => {
  const titleText = compactText(title).toLowerCase();
  const paragraphSurface = paragraphs.join(' ').toLowerCase();
  const bulletSurface = listItems.join(' ').toLowerCase();
  const combined = `${titleText} ${paragraphSurface} ${bulletSurface}`;

  if (!titleText) return false;
  if (listItems.filter(hasNumericLead).length >= 2) return false;
  if (/对比|vs|区别|传统|旧方式|新方式/.test(combined)) return false;
  if (/合作|试点|加入|联系|下一步|窗口期|启动/.test(combined)) return false;

  const titleHeroSignals = [
    /重新定义/,
    /让.+变/,
    /把.+变/,
    /打造/,
    /重构/,
    /统一.+流程/,
    /产品脑/,
    /下一代/,
    /平台/,
    /引擎/
  ];

  const sentenceHeroSignals = [
    /不是.+而是/
  ];

  const hasTitleHeroSignal = titleHeroSignals.some((pattern) => pattern.test(titleText));
  const hasSentenceHeroSignal = sentenceHeroSignals.some((pattern) => pattern.test(combined));

  if (hasTitleHeroSignal && (paragraphs.length > 0 || listItems.length >= 2)) return true;
  if (/指标|数据|增长|效率|收入|用户|客户|转化|速度|上线|工单|留存/.test(combined)) return false;

  return hasSentenceHeroSignal && (paragraphs.length > 0 || listItems.length >= 2);
};

const inferRenderVariant = (item, blocks) => {
  const explicitVariant = String(item.variant || '').trim();
  if (ALLOWED_VARIANTS.has(explicitVariant)) return explicitVariant;

  const semanticBlock = blocks.find((block) =>
    ['hero', 'compare', 'metrics', 'process', 'summary', 'cta'].includes(block.type)
  );
  if (semanticBlock && ALLOWED_VARIANTS.has(semanticBlock.type)) return semanticBlock.type;

  if (blocks.some((block) => block.type === 'transition')) return 'default';
  if (blocks.some((block) => block.type === 'quote')) return 'default';
  if (blocks.some((block) => block.type === 'tags')) return 'default';
  if (blocks.some((block) => block.type === 'flow')) return 'default';
  if (blocks.some((block) => block.type === 'table-lite')) return 'default';
  if (blocks.some((block) => block.type === 'timeline')) return 'default';
  if (blocks.some((block) => block.type === 'callout')) return 'default';
  if (blocks.some((block) => block.type === 'stat-strip')) return 'default';
  if (blocks.some((block) => block.type === 'matrix')) return 'default';
  if (blocks.some((block) => block.type === 'people')) return 'default';
  if (blocks.some((block) => block.type === 'faq')) return 'default';
  if (blocks.some((block) => block.type === 'risk')) return 'default';
  if (blocks.some((block) => block.type === 'architecture')) return 'default';

  const title = compactText(item.title || '');
  const paragraphs = blocks
    .filter((block) => block.type === 'paragraph')
    .map((block) => compactText(block.content));
  const listItems = blocks
    .filter((block) => block.type === 'list')
    .flatMap((block) => block.items.map((entry) => compactText(entry)));
  const semanticSurface = `${title} ${paragraphs.join(' ')}`.toLowerCase();
  const metricSurface = `${semanticSurface} ${listItems.join(' ')}`.toLowerCase();

  if (/总结|结论|回顾|recap|summary/.test(title)) return 'summary';
  if (looksHeroSlide(title, paragraphs, listItems)) return 'hero';
  if (/对比|vs| versus |传统|旧方式|新方式/.test(semanticSurface)) return 'compare';
  if (listItems.length >= 2 && /路线图|阶段|扩张|推进|实施|落地|步骤|流程|path|roadmap/.test(semanticSurface)) return 'process';
  if (/合作|试点|加入|预约|联系|启动|下一步|窗口期|立即|现在/.test(semanticSurface)) return 'cta';
  if (
    /指标|数据|增长|效率|收入|用户|客户|转化|速度|上线|工单|留存|traction|metric/.test(metricSurface)
    || (listItems.length >= 2 && listItems.filter(hasNumericLead).length >= Math.min(3, listItems.length))
  ) {
    return 'metrics';
  }

  return 'default';
};

export const normalizeRenderDeck = (deck) => {
  const source = deck && typeof deck === 'object' ? deck : {};
  const rawSlides = Array.isArray(source.slides)
    ? source.slides
        .map((slide, index) => {
          const item = slide && typeof slide === 'object' ? slide : {};
          const blocks = Array.isArray(item.blocks)
            ? item.blocks.map(normalizeRenderBlock).filter(Boolean)
            : [];
          return {
            id: compactIdentifier(String(item.id || item.title || '')) || `slide-${index + 1}`,
            title: compactTitle(String(item.title || '').trim()),
            variant: normalizeRenderVariant(item.variant),
            source_format: compactText(item.source_format || item.format || ''),
            blocks
          };
        })
        .filter((slide) => slide.title && slide.blocks.length)
    : [];
  const slides = ensureUniqueSlideIds(rawSlides);

  return {
    title: compactText(source.title || source.deck_title || source.deckTitle || 'Untitled Deck') || 'Untitled Deck',
    intro: compactText(source.intro || ''),
    meta: normalizeRenderDeckMeta(source, slides.length),
    slides
  };
};

export const validateRenderDeck = (deck) => {
  const normalized = normalizeRenderDeck(deck);
  if (normalized.meta.contract_version !== 'render-deck@1') {
    throw new Error('Render deck contract version is invalid');
  }
  if (normalized.meta.slide_count !== normalized.slides.length) {
    throw new Error('Render deck slide_count does not match slides length');
  }

  const ids = new Set();
  for (const slide of normalized.slides) {
    if (!slide.id) throw new Error('Render deck slide is missing id');
    if (ids.has(slide.id)) throw new Error(`Duplicate render deck slide id: ${slide.id}`);
    ids.add(slide.id);

    if (!slide.variant || !ALLOWED_VARIANTS.has(slide.variant)) {
      throw new Error(`Invalid render deck variant for slide ${slide.id}`);
    }
    if (!Array.isArray(slide.blocks) || !slide.blocks.length) {
      throw new Error(`Render deck slide ${slide.id} has no blocks`);
    }
  }

  return normalized;
};

export const markdownDeckToRenderDeck = (deck) => {
  const source = deck && typeof deck === 'object' ? deck : {};

  return normalizeRenderDeck({
    title: source.title || source.deck_title || 'Untitled Deck',
    intro: source.intro || '',
    meta: {
      source: 'markdown'
    },
    slides: Array.isArray(source.slides)
      ? source.slides.map((slide) => {
          const item = slide && typeof slide === 'object' ? slide : {};
          return {
            title: item.title,
            variant: normalizeRenderVariant(item.variant),
            blocks: Array.isArray(item.blocks)
              ? item.blocks.map(normalizeRenderBlock).filter(Boolean)
              : []
          };
        })
      : []
  });
};

export const expandedToRenderDeck = (expanded) => {
  const normalized = normalizeExpanded(expanded);
  const toVariant = (format) => {
    if (format === 'hero' || format === 'compare' || format === 'metrics' || format === 'process' || format === 'summary' || format === 'cta') {
      return format;
    }
    return 'default';
  };
  return normalizeRenderDeck({
    title: normalized.deck_title,
    intro: 'Generated from confirmed outline',
    meta: {
      source: 'expanded',
      profile: normalized.meta?.profile,
      skill: normalized.meta?.skill,
      default_theme: normalized.meta?.skill ? getSkill(normalized.meta.skill).default_theme : (normalized.meta?.profile ? getSkill(normalized.meta.profile).default_theme : '')
    },
    slides: normalized.slides.map((slide) => ({
      id: compactIdentifier(slide.title) || `slide-${slide.index}`,
      title: slide.title,
      variant: toVariant(slide.format),
      source_format: slide.format,
      blocks: slide.blocks
    }))
  });
};
