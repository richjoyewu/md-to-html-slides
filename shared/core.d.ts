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

export interface RenderHeroBlock {
  type: 'hero';
  eyebrow?: string;
  headline: string;
  body?: string;
  points: string[];
  proof?: string;
  stats?: Array<{
    value: string;
    label: string;
  }>;
  layout?: 'hero-grid';
}

export interface RenderCompareColumn {
  label: string;
  items: string[];
  caption?: string;
}

export interface RenderCompareBlock {
  type: 'compare';
  eyebrow?: string;
  body?: string;
  summary?: string;
  left: RenderCompareColumn;
  right: RenderCompareColumn;
}

export interface RenderMetricItem {
  value: string;
  label: string;
  note?: string;
}

export interface RenderMetricsBlock {
  type: 'metrics';
  eyebrow?: string;
  intro?: string;
  proof?: string;
  items: RenderMetricItem[];
}

export interface RenderProcessStep {
  label: string;
  detail?: string;
}

export interface RenderProcessBlock {
  type: 'process';
  eyebrow?: string;
  intro?: string;
  steps: RenderProcessStep[];
}

export interface RenderSummaryBlock {
  type: 'summary';
  eyebrow?: string;
  intro?: string;
  items: string[];
}

export interface RenderCtaBlock {
  type: 'cta';
  eyebrow?: string;
  message: string;
  actions: string[];
  proof?: string;
}

export type RenderBlock =
  | RenderParagraphBlock
  | RenderListBlock
  | RenderImageBlock
  | RenderCodeBlock
  | RenderHeroBlock
  | RenderCompareBlock
  | RenderMetricsBlock
  | RenderProcessBlock
  | RenderSummaryBlock
  | RenderCtaBlock;

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
export function markdownDeckToRenderDeck(deck: unknown): RenderDeck;
export function expandedToRenderDeck(expanded: unknown): RenderDeck;
