import { getDeckProfile, normalizeDeckProfileName } from './deck-profiles.js';

const ALLOWED_INTENTS = new Set(['define', 'explain', 'compare', 'example', 'process', 'summary', 'cta']);
const ALLOWED_FORMATS = new Set(['hero', 'title-bullets', 'title-body', 'compare', 'metrics', 'process', 'summary', 'cta']);
const ALLOWED_VARIANTS = new Set(['default', 'hero', 'compare', 'metrics', 'process', 'summary', 'cta']);

const compactText = (value = '') => String(value || '').replace(/\s+/g, ' ').trim();
const normalizeSurfaceText = (value = '') => compactText(value).replace(/^[，、；;:\-]+/g, '').trim();
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

export const normalizePlanContext = (value) => {
  const source = value && typeof value === 'object' ? value : {};
  const answers = source.answers && typeof source.answers === 'object' ? source.answers : {};
  return {
    profile: normalizeDeckProfileName(source.profile),
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
            return { id: `q_${index + 1}`, label: String(item || '').trim(), placeholder: '' };
          }
          return {
            id: String(item?.id || `q_${index + 1}`).trim(),
            label: String(item?.label || '').trim(),
            placeholder: String(item?.placeholder || '').trim()
          };
        })
        .filter((item) => item.label)
        .slice(0, 3)
    : []
});

const normalizePlanMeta = (source) => {
  const profile = getDeckProfile(source?.profile || source?.deck_profile);
  const confidence = Number(source?.planning_confidence ?? source?.confidence ?? 0.72);
  return {
    profile: profile.name,
    default_theme: compactMetaText(source?.default_theme || profile.default_theme, 32, profile.default_theme),
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
  profile: normalizeDeckProfileName(source?.profile),
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
      let format = String(item.format || 'title-bullets').trim() || 'title-bullets';
      if (!ALLOWED_FORMATS.has(format)) format = bullets.length ? 'title-bullets' : 'title-body';
      if (!bullets.length && item.body) {
        format = format === 'summary' || format === 'cta' ? format : 'title-body';
      }
      if (format === 'title-bullets' && bullets.length < 2 && item.body) format = 'title-body';
      return {
        index: Number(item.index || index + 1),
        title: compactTitle(String(item.title || '').trim()),
        format,
        bullets,
        body: compactBody(String(item.body || ''))
      };
    })
    .map((slide) => {
      if (slide.format === 'title-bullets' && !slide.bullets.length && slide.body) {
        return { ...slide, format: 'title-body' };
      }
      if ((slide.format === 'title-body' || slide.format === 'summary') && !slide.body && slide.bullets.length) {
        return {
          ...slide,
          body: slide.bullets.slice(0, 2).join('；'),
          bullets: slide.format === 'summary' ? slide.bullets.slice(0, 3) : []
        };
      }
      return slide;
    })
    .filter((slide) => slide.title && (slide.bullets.length || slide.body));

  if (!slides.length) throw new Error('Expanded slides are empty');
  return { deck_title: deckTitle, meta, slides: slides.slice(0, 16) };
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
  const slides = Array.isArray(source.slides)
    ? source.slides
        .map((slide) => {
          const item = slide && typeof slide === 'object' ? slide : {};
          const blocks = Array.isArray(item.blocks)
            ? item.blocks.map(normalizeRenderBlock).filter(Boolean)
            : [];
          const variant = inferRenderVariant(item, blocks);
          return {
            title: compactTitle(String(item.title || '').trim()),
            variant,
            blocks
          };
        })
        .filter((slide) => slide.title && slide.blocks.length)
    : [];

  return {
    title: compactText(source.title || source.deck_title || source.deckTitle || 'Untitled Deck') || 'Untitled Deck',
    intro: compactText(source.intro || ''),
    slides
  };
};

export const markdownDeckToRenderDeck = (deck) => {
  const source = deck && typeof deck === 'object' ? deck : {};

  return normalizeRenderDeck({
    title: source.title || source.deck_title || 'Untitled Deck',
    intro: source.intro || '',
    slides: Array.isArray(source.slides)
      ? source.slides.map((slide) => {
          const item = slide && typeof slide === 'object' ? slide : {};
          const normalizedBlocks = Array.isArray(item.blocks)
            ? item.blocks.map(normalizeRenderBlock).filter(Boolean)
            : [];
          const variant = inferRenderVariant(item, normalizedBlocks);
          const carryBlocks = collectNonTextBlocks(normalizedBlocks);
          const fallbackSlide = {
            title: item.title,
            variant: 'default',
            blocks: normalizedBlocks
          };

          if (variant === 'hero') {
            const semanticBlock = normalizeRenderBlock(buildHeroBlockFromBlocks(item.title, normalizedBlocks));
            return {
              title: item.title,
              variant: semanticBlock ? variant : 'default',
              blocks: semanticBlock ? [semanticBlock, ...carryBlocks] : fallbackSlide.blocks
            };
          }

          if (variant === 'compare') {
            const semanticBlock = normalizeRenderBlock(buildCompareBlockFromBlocks(item.title, normalizedBlocks));
            return {
              title: item.title,
              variant: semanticBlock ? variant : 'default',
              blocks: semanticBlock ? [semanticBlock, ...carryBlocks] : fallbackSlide.blocks
            };
          }

          if (variant === 'metrics') {
            const semanticBlock = normalizeRenderBlock(buildMetricsBlockFromBlocks(item.title, normalizedBlocks));
            return {
              title: item.title,
              variant: semanticBlock ? variant : 'default',
              blocks: semanticBlock ? [semanticBlock, ...carryBlocks] : fallbackSlide.blocks
            };
          }

          if (variant === 'process') {
            const semanticBlock = normalizeRenderBlock(buildProcessBlockFromBlocks(normalizedBlocks));
            return {
              title: item.title,
              variant: semanticBlock ? variant : 'default',
              blocks: semanticBlock ? [semanticBlock, ...carryBlocks] : fallbackSlide.blocks
            };
          }

          if (variant === 'summary') {
            const semanticBlock = normalizeRenderBlock(buildSummaryBlockFromBlocks(normalizedBlocks));
            return {
              title: item.title,
              variant: semanticBlock ? variant : 'default',
              blocks: semanticBlock ? [semanticBlock, ...carryBlocks] : fallbackSlide.blocks
            };
          }

          if (variant === 'cta') {
            const semanticBlock = normalizeRenderBlock(buildCtaBlockFromBlocks(item.title, normalizedBlocks));
            return {
              title: item.title,
              variant: semanticBlock ? variant : 'default',
              blocks: semanticBlock ? [semanticBlock, ...carryBlocks] : fallbackSlide.blocks
            };
          }

          return fallbackSlide;
        })
      : []
  });
};

export const expandedToRenderDeck = (expanded) => {
  const normalized = normalizeExpanded(expanded);
  const eyebrowFor = (format) => {
    if (format === 'hero') return 'Launch Thesis';
    if (format === 'compare') return 'Signal Shift';
    if (format === 'metrics') return 'Proof Points';
    if (format === 'process') return 'Execution Path';
    if (format === 'summary') return 'Key Takeaways';
    if (format === 'cta') return 'Call To Action';
    return '';
  };
  const toVariant = (format) => {
    if (format === 'hero' || format === 'compare' || format === 'metrics' || format === 'process' || format === 'summary' || format === 'cta') {
      return format;
    }
    return 'default';
  };
  return normalizeRenderDeck({
    title: normalized.deck_title,
    intro: 'Generated from confirmed outline',
    slides: normalized.slides.map((slide) => ({
      title: slide.title,
      variant: toVariant(slide.format),
      blocks: (() => {
        if (slide.format === 'hero') {
          return [{
            type: 'hero',
            eyebrow: eyebrowFor(slide.format),
            headline: slide.title,
            body: slide.body,
            points: slide.bullets.slice(0, 3),
            proof: slide.bullets[2] || '',
            stats: [
              { value: `${slide.bullets.slice(0, 3).length}`, label: 'core signals' },
              { value: slide.body ? '1' : '0', label: 'proof lines' }
            ],
            layout: 'hero-grid'
          }];
        }

        if (slide.format === 'compare') {
          const [leftLabel, rightLabel] = parseCompareLabels(slide.body, slide.title);
          const midpoint = Math.max(2, Math.ceil(slide.bullets.length / 2));
          return [{
            type: 'compare',
            eyebrow: eyebrowFor(slide.format),
            body: slide.body,
            summary: slide.title,
            left: { label: leftLabel, items: slide.bullets.slice(0, midpoint) },
            right: { label: rightLabel, items: slide.bullets.slice(midpoint) },
            layout: 'two-col'
          }];
        }

        if (slide.format === 'metrics') {
          return [{
            type: 'metrics',
            eyebrow: eyebrowFor(slide.format),
            intro: slide.body,
            proof: slide.title,
            items: slide.bullets.slice(0, 4).map(parseMetricItem)
          }];
        }

        if (slide.format === 'process') {
          return [{
            type: 'process',
            eyebrow: eyebrowFor(slide.format),
            intro: slide.body,
            steps: slide.bullets.slice(0, 5).map((item) => ({ label: item }))
          }];
        }

        if (slide.format === 'summary') {
          return [{
            type: 'summary',
            eyebrow: eyebrowFor(slide.format),
            intro: slide.body,
            items: slide.bullets.slice(0, 4)
          }];
        }

        if (slide.format === 'cta') {
          return [{
            type: 'cta',
            eyebrow: eyebrowFor(slide.format),
            message: slide.body || slide.title,
            actions: slide.bullets.slice(0, 4),
            proof: slide.title
          }];
        }

        return [
          ...(slide.body ? [{ type: 'paragraph', content: slide.body }] : []),
          ...(slide.bullets.length ? [{ type: 'list', items: slide.bullets }] : []),
          ...(!slide.body && !slide.bullets.length ? [{ type: 'paragraph', content: slide.title }] : [])
        ];
      })()
    }))
  });
};
