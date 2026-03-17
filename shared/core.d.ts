import type { ClarificationResult, DeckProfileName, ExpandedResult, OutlineResult, PlanContext } from '../agent/types.js';

export interface RenderParagraphBlock {
  type: 'paragraph';
  content: string;
}

export interface RenderListBlock {
  type: 'list';
  items: string[];
}

export interface RenderImageBlock {
  type: 'image';
  alt: string;
  src?: string;
  inlinedSrc: string;
}

export interface RenderCodeBlock {
  type: 'code';
  language: string;
  content: string;
}

export type RenderBlock = RenderParagraphBlock | RenderListBlock | RenderImageBlock | RenderCodeBlock;

export interface RenderSlide {
  title: string;
  variant: 'default' | 'hero' | 'compare' | 'metrics' | 'process' | 'summary' | 'cta';
  blocks: RenderBlock[];
}

export interface RenderDeck {
  title: string;
  intro: string;
  slides: RenderSlide[];
}

export interface NormalizedPlanContext extends PlanContext {
  profile: DeckProfileName;
}

export function normalizePlanContext(value: unknown): NormalizedPlanContext;
export function normalizeClarification(payload: unknown): ClarificationResult;
export function normalizeOutline(payload: unknown): OutlineResult;
export function outlineToApiPayload(outline: unknown): OutlineResult;
export function normalizeExpanded(payload: unknown): ExpandedResult;
export function normalizeRenderDeck(deck: unknown): RenderDeck;
export function expandedToRenderDeck(expanded: unknown): RenderDeck;
