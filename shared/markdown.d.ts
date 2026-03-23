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

export interface PartitionedMarkdownBlock {
  kind: 'heading' | 'paragraph' | 'list' | 'quote' | 'code' | 'image' | 'unknown';
  text: string;
  sourceSectionTitle?: string;
}

export function normalizeMarkdownLines(markdown?: string): string[];
export function inferDeckTitle(markdown?: string): string;
export function extractMarkdownSections(markdown?: string, options?: SectionExtractionOptions): PreprocessedMarkdown['sections'];
export function partitionMarkdownBlocks(markdown?: string, options?: {
  maxBlocks?: number;
  maxChunkChars?: number;
  maxSentencesPerChunk?: number;
}): PartitionedMarkdownBlock[];
export function parseMarkdownDeck(markdown?: string): ParsedMarkdownDeck;
