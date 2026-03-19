import { createHash } from 'node:crypto';
import type { OutlineResult, PlanContext, PreprocessedMarkdown } from './types.js';
import { extractMarkdownSections, inferDeckTitle } from '../shared/markdown.js';

export const getCacheKey = (value: string): string =>
  createHash('sha1').update(String(value || '')).digest('hex');

// 把原始 Markdown 压成轻量 section 模型，尽量保留原始结构，不替 LLM 重组语义。
export const preprocessMarkdown = (markdown: string): PreprocessedMarkdown => {
  const deckTitle = inferDeckTitle(markdown);
  const normalizedSections = extractMarkdownSections(markdown, {
    fallbackTitle: deckTitle,
    maxSections: 10,
    maxPointsPerSection: 6
  });

  return {
    deck_title: deckTitle,
    sections: normalizedSections,
    raw_excerpt: String(markdown || '').slice(0, 2400)
  };
};

export const buildExpandCacheKey = (markdown: string, outline: OutlineResult, context?: PlanContext): string =>
  getCacheKey(JSON.stringify({ markdown, outline, context: context || null }));
