import type { PreprocessedMarkdown } from '../agent/types.js';

export interface SectionExtractionOptions {
  fallbackTitle?: string;
  maxSections?: number;
  maxPointsPerSection?: number;
}

export interface ParsedMarkdownDeck {
  title: string;
  intro: string;
  slides: Array<{
    title: string;
    blocks: Array<Record<string, unknown>>;
  }>;
}

export function normalizeMarkdownLines(markdown?: string): string[];
export function inferDeckTitle(markdown?: string): string;
export function extractMarkdownSections(markdown?: string, options?: SectionExtractionOptions): PreprocessedMarkdown['sections'];
export function parseMarkdownDeck(markdown?: string): ParsedMarkdownDeck;
