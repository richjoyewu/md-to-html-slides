import { createHash } from 'node:crypto';
import type { OutlineResult, PreprocessedMarkdown } from './types.js';

export const getCacheKey = (value: string): string =>
  createHash('sha1').update(String(value || '')).digest('hex');

const compactText = (value: string): string => String(value || '').replace(/\s+/g, ' ').trim();

const inferDeckTitle = (markdown: string): string => {
  const lines = String(markdown || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const explicit = (lines.find((line) => line.startsWith('# ')) || '').replace(/^#\s+/, '').trim();
  if (explicit) return explicit;

  const first = compactText(lines[0] || '');
  if (!first) return 'Untitled Deck';

  const normalized = first
    .replace(/^我想(做|讲|写|整理)/, '')
    .replace(/^这(是|份)?/, '')
    .replace(/[，。；：:].*$/, '')
    .trim();

  return normalized.slice(0, 18).trim() || 'Untitled Deck';
};

const splitSentenceUnits = (value: string): string[] => {
  return compactText(value)
    .split(/[。！？!?；;]+|(?<=\))\s+|\n+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .flatMap((item) => item.split(/(?=然后|另外|此外|同时|最后|比如|例如|还要|还可以|也可以)/g))
    .map((item) => item.trim())
    .filter(Boolean);
};

const titleFromPoint = (point: string, fallback: string): string => {
  const cleaned = compactText(point)
    .replace(/^[-*+]\s+/, '')
    .replace(/^(然后|另外|此外|同时|最后|比如|例如|还要|还可以|也可以)/, '')
    .replace(/[，。；：:].*$/, '')
    .trim();
  return cleaned.slice(0, 18).trim() || fallback;
};

const regroupRoughSections = (deckTitle: string, sections: PreprocessedMarkdown['sections']): PreprocessedMarkdown['sections'] => {
  if (sections.length !== 1) return sections;
  const [section] = sections;
  if (section.points.length <= 3) return sections;

  const units = section.points
    .flatMap((point) => splitSentenceUnits(point))
    .map((point) => compactText(point))
    .filter(Boolean);

  if (units.length <= 3) return sections;

  const chunkSize = units.length >= 7 ? 2 : 3;
  const regrouped: PreprocessedMarkdown['sections'] = [];
  for (let i = 0; i < units.length; i += chunkSize) {
    const chunk = units.slice(i, i + chunkSize);
    regrouped.push({
      title: titleFromPoint(chunk[0], i === 0 ? deckTitle : `第${regrouped.length + 1}页`),
      points: chunk.slice(0, 4)
    });
  }

  return regrouped.slice(0, 10);
};

// 把原始 Markdown 压成紧凑的 section 模型，供启发式逻辑和 LLM prompt 共用。
export const preprocessMarkdown = (markdown: string): PreprocessedMarkdown => {
  const lines = String(markdown || '').split(/\r?\n/);
  const deckTitle = inferDeckTitle(markdown);

  const sections: PreprocessedMarkdown['sections'] = [];
  let current: PreprocessedMarkdown['sections'][number] | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('## ')) {
      if (current) sections.push(current);
      current = { title: line.replace(/^##\s+/, '').trim(), points: [] };
      continue;
    }

    if (!current) current = { title: deckTitle, points: [] };

    if (/^[-*+]\s+/.test(line)) {
      current.points.push(line.replace(/^[-*+]\s+/, '').trim());
    } else if (!/^#\s+/.test(line)) {
      current.points.push(line);
    }
  }

  if (current) sections.push(current);

  const normalizedSections = sections
    .filter((section) => section.title)
    .slice(0, 10)
    .map((section) => ({
      title: section.title,
      points: section.points.slice(0, 6)
    }));

  return {
    deck_title: deckTitle,
    sections: regroupRoughSections(deckTitle, normalizedSections),
    raw_excerpt: String(markdown || '').slice(0, 2400)
  };
};

export const buildExpandCacheKey = (markdown: string, outline: OutlineResult): string =>
  getCacheKey(JSON.stringify({ markdown, outline }));
