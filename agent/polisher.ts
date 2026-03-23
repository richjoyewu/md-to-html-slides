import type { OutlineResult, OutlineSlide, SlideIntent } from './types.js';

const compactText = (value: string): string =>
  String(value || '').replace(/\s+/g, ' ').trim();

interface PolishReview {
  issues: string[];
  actions: string[];
}

const compactTitle = (value: string): string => {
  const cleaned = compactText(value)
    .replace(/^[0-9０-９]+[.、\-:]\s*/, '')
    .replace(/[✨🧠🤖🦁📌📘📊🔥]+/g, '')
    .trim();
  return cleaned.slice(0, 24).trim() || '未命名页面';
};

const dedupePoints = (points: string[]): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const point of points.map(compactText).filter(Boolean)) {
    const key = point.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(point);
  }
  return normalized;
};

const stripContinuation = (title: string): string => compactTitle(title).replace(/（续）$/, '').trim();

const titleTokens = (title: string): string[] =>
  stripContinuation(title)
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fa5]+/i)
    .filter((token) => token.length >= 2);

const titleSimilarity = (left: string, right: string): number => {
  const a = new Set(titleTokens(left));
  const b = new Set(titleTokens(right));
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const token of a) {
    if (b.has(token)) overlap += 1;
  }
  return overlap / Math.min(a.size, b.size);
};

const pointOverlapRatio = (left: string[], right: string[]): number => {
  const a = new Set(left.map((item) => compactText(item).toLowerCase()).filter(Boolean));
  const b = new Set(right.map((item) => compactText(item).toLowerCase()).filter(Boolean));
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const item of a) {
    if (b.has(item)) overlap += 1;
  }
  return overlap / Math.min(a.size, b.size);
};

const pointWeight = (point: string): number => Math.max(1, Math.ceil(compactText(point).length / 14));

const isTransitionPoint = (point: string): boolean =>
  /^(另外|其次|最后|进一步|补充|此外|同时|然后|接下来|案例|示例|总结)/.test(compactText(point));

const intentOrder: Record<SlideIntent, number> = {
  define: 10,
  explain: 20,
  compare: 30,
  process: 40,
  example: 50,
  summary: 80,
  cta: 90
};

const isIntentCompatibleForMerge = (left: SlideIntent, right: SlideIntent): boolean => {
  if (left === right) return true;
  const compatiblePairs = new Set([
    'define:explain',
    'explain:define',
    'compare:example',
    'example:compare',
    'process:example',
    'example:process'
  ]);
  return compatiblePairs.has(`${left}:${right}`);
};

const polishSlide = (slide: OutlineSlide): OutlineSlide => {
  const detailPoints = dedupePoints(slide.detail_points.length ? slide.detail_points : slide.preview_points)
    .map((item) => item.slice(0, 42).trim())
    .slice(0, 6);
  const previewPoints = dedupePoints(slide.preview_points.length ? slide.preview_points : detailPoints)
    .slice(0, 3);

  return {
    ...slide,
    title: compactTitle(slide.title),
    summary: compactText(slide.summary).slice(0, 72),
    detail_points: detailPoints.length ? detailPoints : [compactText(slide.summary || '待补充')],
    preview_points: previewPoints.length ? previewPoints : detailPoints.slice(0, 3)
  };
};

const chunkPointsForSplit = (points: string[]): string[][] => {
  const first: string[] = [];
  const second: string[] = [];
  let firstWeight = 0;
  let secondWeight = 0;

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const weight = pointWeight(point) + (isTransitionPoint(point) ? 1 : 0);
    if (!first.length) {
      first.push(point);
      firstWeight += weight;
      continue;
    }
    const preferSecond = second.length > 0
      ? secondWeight <= firstWeight
      : index >= Math.ceil(points.length / 2) || firstWeight >= 6;

    if (preferSecond) {
      second.push(point);
      secondWeight += weight;
    } else {
      first.push(point);
      firstWeight += weight;
    }
  }

  if (!second.length) {
    second.push(...first.splice(Math.max(1, first.length - 2)));
  }

  return [first, second];
};

const shouldSplitSlide = (slide: OutlineSlide): boolean => {
  if (slide.detail_points.length > 4) return true;
  if (slide.detail_points.length <= 4) return false;
  const totalWeight = slide.detail_points.reduce((sum, point) => sum + pointWeight(point), 0);
  return totalWeight >= 8 || slide.detail_points.some((point) => compactText(point).length > 30);
};

const expandOverloadedSlides = (slides: OutlineSlide[]): OutlineSlide[] => {
  const expanded: OutlineSlide[] = [];

  for (const slide of slides) {
    if (!shouldSplitSlide(slide)) {
      expanded.push(slide);
      continue;
    }

    const base = stripContinuation(slide.title);
    const [firstPoints, secondPoints] = chunkPointsForSplit(slide.detail_points);

    expanded.push({
      ...slide,
      title: base,
      summary: slide.summary,
      detail_points: firstPoints,
      preview_points: firstPoints.slice(0, 3)
    });

    expanded.push({
      ...slide,
      title: `${base}（续）`,
      summary: slide.summary || `${base} 的补充内容`,
      detail_points: secondPoints,
      preview_points: secondPoints.slice(0, 3)
    });
  }

  return expanded;
};

const shouldMergeThinSlide = (last: OutlineSlide | undefined, current: OutlineSlide): boolean => {
  if (!last) return false;
  if (last.title.endsWith('（续）')) return false;
  if (current.detail_points.length > 1 || last.detail_points.length > 4) return false;
  if (!isIntentCompatibleForMerge(last.intent, current.intent)) return false;

  const overlap = pointOverlapRatio(last.detail_points, current.detail_points);
  const titleScore = titleSimilarity(last.title, current.title);
  return overlap > 0 || titleScore >= 0.5 || stripContinuation(last.title) === stripContinuation(current.title);
};

const mergeThinSlides = (slides: OutlineSlide[]): OutlineSlide[] => {
  const merged: OutlineSlide[] = [];

  for (const slide of slides) {
    const last = merged[merged.length - 1];
    if (shouldMergeThinSlide(last, slide)) {
      const nextPoints = dedupePoints([...(last?.detail_points || []), ...slide.detail_points]).slice(0, 5);
      last.detail_points = nextPoints;
      last.preview_points = nextPoints.slice(0, 3);
      last.summary = compactText(last.summary || slide.summary).slice(0, 72);
      continue;
    }

    merged.push({ ...slide });
  }

  return merged;
};

const reduceAdjacentOverlap = (slides: OutlineSlide[]): OutlineSlide[] => {
  return slides.map((slide, index) => {
    if (index === 0) return { ...slide };
    const previous = slides[index - 1];
    const detailOverlap = pointOverlapRatio(previous.detail_points, slide.detail_points);
    const previewOverlap = pointOverlapRatio(previous.preview_points, slide.preview_points);
    const titleScore = titleSimilarity(previous.title, slide.title);

    if (detailOverlap < 0.5 && previewOverlap < 0.67 && titleScore < 0.8) {
      return { ...slide };
    }

    const filtered = slide.detail_points.filter((point) => {
      const normalized = compactText(point).toLowerCase();
      return !previous.detail_points.some((prev) => compactText(prev).toLowerCase() === normalized);
    });

    const nextPoints = filtered.length ? filtered : slide.detail_points.slice(0, 2);
    return {
      ...slide,
      detail_points: nextPoints.slice(0, 5),
      preview_points: nextPoints.slice(0, 3),
      summary: compactText(slide.summary || nextPoints[0] || '').slice(0, 72)
    };
  });
};

const reindexSlides = (slides: OutlineSlide[]): OutlineSlide[] =>
  slides.map((slide, index) => ({ ...slide, index: index + 1 }));

const buildReviewMeta = (before: OutlineSlide[], after: OutlineSlide[]): PolishReview => {
  const issues: string[] = [];
  const actions: string[] = [];

  if (before.some((slide) => slide.detail_points.length > 4)) issues.push('overloaded_slide_detected');
  if (before.some((slide) => slide.detail_points.length < 1)) issues.push('thin_slide_detected');
  if (before.some((slide, index) => index > 0 && pointOverlapRatio(before[index - 1].detail_points, slide.detail_points) >= 0.5)) {
    issues.push('adjacent_overlap_detected');
  }
  if (after.length > before.length) actions.push('split_overloaded_slides');
  if (after.length < before.length) actions.push('merged_thin_slides');
  if (after.some((slide) => slide.title.endsWith('（续）'))) actions.push('rebalanced_slide_density');
  if (after.some((slide, index) => index > 0 && pointOverlapRatio(after[index - 1].detail_points, slide.detail_points) < pointOverlapRatio(before[Math.max(index - 1, 0)]?.detail_points || [], before[Math.min(index, before.length - 1)]?.detail_points || []))) {
    actions.push('reduced_adjacent_overlap');
  }

  return {
    issues: Array.from(new Set(issues)).slice(0, 5),
    actions: Array.from(new Set(actions)).slice(0, 5)
  };
};

// Polisher：在用户确认前做最后一层稳定化，避免明显过长、重复、空内容直接暴露给用户。
export const polishOutline = (outline: OutlineResult): OutlineResult => {
  const polished = outline.slides
    .map(polishSlide)
    .filter((slide) => slide.title);

  const expanded = expandOverloadedSlides(polished);
  const merged = mergeThinSlides(expanded);
  const deOverlapped = reduceAdjacentOverlap(merged);
  const reviewed = buildReviewMeta(polished, deOverlapped);
  const confidencePenalty = reviewed.issues.length * 0.04;

  return {
    deck_title: compactText(outline.deck_title || 'Untitled Deck') || 'Untitled Deck',
    meta: {
      ...outline.meta,
      planning_confidence: Math.max(0.3, Number(((outline.meta?.planning_confidence ?? 0.72) - confidencePenalty).toFixed(2))),
      review_issues: reviewed.issues,
      actions_taken: reviewed.actions
    },
    slides: reindexSlides(deOverlapped).slice(0, 16)
  };
};
