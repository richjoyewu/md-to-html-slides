import { buildHeuristicExpanded } from './fallback.js';
import { normalizeExpanded } from './normalize.js';
import { buildExpandPrompt } from './prompt-builder.js';
import { applySkillQualityFocusChecks } from './quality-check.js';
import type { ExpandedResult, ExpandedSlide, LlmJsonProvider, OutlineResult, PlanContext } from './types.js';

interface ExpandRequestOptions {
  allowFallback?: boolean;
  timeoutMs?: number;
  maxTokens?: number;
}

const FORMAT_LIMITS: Record<ExpandedSlide['format'], number> = {
  hero: 3,
  'title-bullets': 4,
  'title-body': 2,
  compare: 4,
  metrics: 4,
  process: 5,
  summary: 3,
  cta: 3
};

const compactSurface = (value: string): string => String(value || '').replace(/\s+/g, ' ').trim();

const splitClauses = (value: string): string[] =>
  compactSurface(value)
    .split(/[。！？；;：:\n]/)
    .flatMap((part) => part.split(/[，,、]/))
    .map((part) => part.trim())
    .filter((part) => part.length >= 4);

const toDisplayBullet = (value: string): string => {
  const clauses = splitClauses(value);
  const picked = clauses.find((part) => part.length >= 6 && part.length <= 22) ?? clauses[0] ?? compactSurface(value);
  return picked.slice(0, 24).trim();
};

const toDisplayBody = (value: string, bullets: string[]): string => {
  const direct = compactSurface(value);
  if (direct) {
    const picked = splitClauses(direct)[0] ?? direct;
    return picked.slice(0, 54).trim();
  }
  return bullets.slice(0, 2).join('；').slice(0, 54).trim();
};

const isDraftyBullet = (value: string): boolean => {
  const text = compactSurface(value);
  return text.length > 28 || /可能|大概|比如|然后|后面|另外|顺便|我觉得|我想|可以先|先看/.test(text);
};

const polishSlide = (slide: ExpandedSlide): ExpandedSlide => {
  const limit = FORMAT_LIMITS[slide.format] ?? 4;
  const bullets = Array.from(new Set(slide.bullets.map(toDisplayBullet).filter(Boolean))).slice(0, limit);
  const body = toDisplayBody(slide.body, bullets);
  const format = slide.format === 'title-bullets' || slide.format === 'title-body'
    ? (bullets.length >= 2 ? 'title-bullets' : body ? 'title-body' : slide.format)
    : slide.format;
  return {
    ...slide,
    bullets,
    body,
    format,
  };
};

const polishExpanded = (expanded: ExpandedResult): ExpandedResult => {
  const slides = expanded.slides.map(polishSlide);

  const reviewIssues = new Set(expanded.meta?.review_issues || []);
  const actionsTaken = new Set(expanded.meta?.actions_taken || []);

  if (slides.some((slide) => slide.bullets.some((bullet) => bullet.length > 22))) {
    reviewIssues.add('部分页面要点仍偏长，可继续压缩为更短的上屏句');
  }
  if (slides.some((slide) => slide.bullets.some(isDraftyBullet))) {
    reviewIssues.add('部分页面仍残留草稿腔，建议继续改写为结论式表达');
  }
  if (slides.some((slide) => slide.bullets.length < 2 && slide.format === 'title-bullets')) {
    reviewIssues.add('部分 bullet 页面要点偏少，可继续补强页面信息密度');
  }
  actionsTaken.add('expanded 输出已通过上屏表达压缩与结构校正');

  return {
    ...expanded,
    meta: {
      profile: expanded.meta?.profile,
      skill: expanded.meta?.skill || expanded.meta?.profile,
      rewrite_quality: Math.max(expanded.meta?.rewrite_quality || 0.72, 0.78),
      tone: expanded.meta?.tone || 'presentation',
      review_issues: [...reviewIssues],
      actions_taken: [...actionsTaken]
    },
    slides
  };
};

export const finalizeExpanded = (payload: unknown): ExpandedResult =>
  applySkillQualityFocusChecks(normalizeExpanded(polishExpanded(normalizeExpanded(payload))));

// Expander 阶段在已确认大纲基础上补足可上屏内容，并保持大纲顺序稳定。
export const requestExpand = async (
  provider: LlmJsonProvider,
  markdown: string,
  outline: OutlineResult,
  context?: PlanContext,
  options: ExpandRequestOptions = {}
): Promise<{ expanded: ExpandedResult; mode: 'llm' | 'fallback' }> => {
  try {
    const payload = await provider.callJson({
      prompt: buildExpandPrompt({ markdown, outline, context }),
      timeoutMs: options.timeoutMs ?? 120000,
      maxTokens: options.maxTokens ?? 8192
    });
    return { expanded: finalizeExpanded(payload), mode: 'llm' };
  } catch (error) {
    if (options.allowFallback === false) {
      throw error;
    }
    console.error('[expand-fallback]', (error as Error)?.message || error);
    return { expanded: finalizeExpanded(buildHeuristicExpanded(markdown, outline)), mode: 'fallback' };
  }
};
