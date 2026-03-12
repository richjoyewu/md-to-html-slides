import type { ExpandFormat, ExpandedResult, OutlineResult, SlideIntent } from './types.js';

// 只保留下游渲染和分析能识别的 intent 标签。
const ALLOWED_INTENTS = new Set<SlideIntent>(['define', 'explain', 'compare', 'example', 'process', 'summary', 'cta']);
const ALLOWED_FORMATS = new Set<ExpandFormat>(['title-bullets', 'title-body', 'summary']);

const compactText = (value: string): string => String(value || '').replace(/\s+/g, ' ').trim();

// LLM 产出的标题通常偏长，先在这里压缩，避免直接污染渲染层。
const compactTitle = (value: string): string => {
  const cleaned = compactText(value)
    .replace(/^[0-9０-９]+[.、\-:]\s*/, '')
    .replace(/[✨🧠🤖🦁📌📘📊🔥]+/g, '')
    .trim();
  return cleaned.slice(0, 28).trim() || '未命名页面';
};

const dedupeList = (items: string[]): string[] => {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const item of items.map(compactText).filter(Boolean)) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
};

const compactBullet = (value: string): string => compactText(value).replace(/[；;。]+$/g, '').slice(0, 34).trim();
const compactBody = (value: string): string => compactText(value).slice(0, 96).trim();

// 把宽松的模型输出规整成稳定的 Planner 结构契约。
export const normalizeOutline = (payload: unknown): OutlineResult => {
  const source = payload as Record<string, unknown> | null;
  const deckTitle = String(source?.deck_title || source?.title || 'Untitled Deck').trim() || 'Untitled Deck';
  const rawSlides = Array.isArray(source?.slides) ? source?.slides : [];
  const slides = rawSlides
    .map((slide, index) => {
      const item = slide as Record<string, unknown> | null;
      return {
        index: Number(item?.index || index + 1),
        title: compactTitle(String(item?.title || '').trim()),
        summary: String(item?.summary || '').trim().slice(0, 72),
        preview_points: Array.isArray(item?.preview_points)
          ? item.preview_points.map((entry) => String(entry || '').trim()).filter(Boolean).slice(0, 3)
          : [],
        detail_points: Array.isArray(item?.detail_points)
          ? item.detail_points.map((entry) => String(entry || '').trim()).filter(Boolean).slice(0, 5)
          : [],
        intent: (() => {
          const rawIntent = (String(item?.intent || 'explain').trim() || 'explain') as SlideIntent;
          return ALLOWED_INTENTS.has(rawIntent) ? rawIntent : 'explain';
        })()
      };
    })
    .map((slide) => {
      const detailPoints = slide.detail_points.length
        ? slide.detail_points
        : (slide.preview_points.length ? slide.preview_points : [slide.summary].filter(Boolean)).slice(0, 5);
      const previewPoints = slide.preview_points.length
        ? slide.preview_points
        : detailPoints.slice(0, 3);
      return {
        ...slide,
        detail_points: detailPoints,
        preview_points: previewPoints
      };
    })
    .filter((slide) => slide.title);

  if (!slides.length) throw new Error('Outline is empty');
  return { deck_title: deckTitle, slides: slides.slice(0, 16) };
};

// 把扩展后的内容规整成稳定结构，让渲染层保持确定性。
export const normalizeExpanded = (payload: unknown): ExpandedResult => {
  const source = payload as Record<string, unknown> | null;
  const deckTitle = String(source?.deck_title || source?.title || 'Untitled Deck').trim() || 'Untitled Deck';
  const rawSlides = Array.isArray(source?.slides) ? source?.slides : [];
  const slides = rawSlides
    .map((slide, index) => {
      const item = slide as Record<string, unknown> | null;
      const bullets = Array.isArray(item?.bullets)
        ? dedupeList(item.bullets.map((entry) => compactBullet(String(entry || '')))).slice(0, 5)
        : [];
      const body = compactBody(String(item?.body || ''));
      let format = (String(item?.format || 'title-bullets').trim() || 'title-bullets') as ExpandFormat;
      if (!ALLOWED_FORMATS.has(format)) format = 'title-bullets';
      if (!bullets.length && body) format = format === 'summary' ? 'summary' : 'title-body';
      if (bullets.length >= 3) format = 'title-bullets';
      return {
        index: Number(item?.index || index + 1),
        title: compactTitle(String(item?.title || '').trim()),
        format,
        bullets,
        body
      };
    })
    .map((slide) => {
      if (slide.format === 'title-bullets' && !slide.bullets.length && slide.body) {
        return {
          ...slide,
          format: 'title-body' as const
        };
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
  return { deck_title: deckTitle, slides: slides.slice(0, 16) };
};
