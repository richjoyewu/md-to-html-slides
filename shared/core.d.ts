import type { AnalysisResult, ClarificationResult, ExpandedResult, IngestArtifact, OutlineResult, PlanContext, SkillName } from '../agent/types.js';

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

export interface RenderQuoteBlock {
  type: 'quote';
  quote: string;
  attribution?: string;
  emphasis?: string;
}

export interface RenderTransitionBlock {
  type: 'transition';
  kicker?: string;
  headline: string;
  body?: string;
}

export interface RenderTagsBlock {
  type: 'tags';
  intro?: string;
  items: string[];
  emphasis?: string;
}

export interface RenderFlowNode {
  label: string;
  detail?: string;
}

export interface RenderFlowBlock {
  type: 'flow';
  eyebrow?: string;
  intro?: string;
  nodes: RenderFlowNode[];
}

export interface RenderTableLiteRow {
  cells: string[];
}

export interface RenderTableLiteBlock {
  type: 'table-lite';
  eyebrow?: string;
  caption?: string;
  columns: string[];
  rows: RenderTableLiteRow[];
}

export interface RenderTimelineItem {
  label: string;
  detail?: string;
}

export interface RenderTimelineBlock {
  type: 'timeline';
  eyebrow?: string;
  intro?: string;
  items: RenderTimelineItem[];
}

export interface RenderCalloutBlock {
  type: 'callout';
  tone?: 'neutral' | 'warning' | 'accent';
  title?: string;
  body: string;
}

export interface RenderStatStripItem {
  value: string;
  label: string;
}

export interface RenderStatStripBlock {
  type: 'stat-strip';
  eyebrow?: string;
  items: RenderStatStripItem[];
}

export interface RenderMatrixCell {
  title: string;
  body?: string;
}

export interface RenderMatrixBlock {
  type: 'matrix';
  eyebrow?: string;
  columns: string[];
  rows: Array<{
    label: string;
    cells: RenderMatrixCell[];
  }>;
}

export interface RenderPeoplePerson {
  name: string;
  role: string;
  note?: string;
}

export interface RenderPeopleBlock {
  type: 'people';
  eyebrow?: string;
  intro?: string;
  people: RenderPeoplePerson[];
}

export interface RenderFaqItem {
  question: string;
  answer?: string;
}

export interface RenderFaqBlock {
  type: 'faq';
  eyebrow?: string;
  intro?: string;
  items: RenderFaqItem[];
}

export interface RenderRiskItem {
  title: string;
  detail?: string;
  severity?: 'low' | 'medium' | 'high';
}

export interface RenderRiskBlock {
  type: 'risk';
  eyebrow?: string;
  intro?: string;
  items: RenderRiskItem[];
}

export interface RenderArchitectureNode {
  label: string;
  detail?: string;
  group?: string;
}

export interface RenderArchitectureBlock {
  type: 'architecture';
  eyebrow?: string;
  intro?: string;
  nodes: RenderArchitectureNode[];
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
  layout?: 'two-col';
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
  | RenderQuoteBlock
  | RenderTransitionBlock
  | RenderTagsBlock
  | RenderFlowBlock
  | RenderTableLiteBlock
  | RenderTimelineBlock
  | RenderCalloutBlock
  | RenderStatStripBlock
  | RenderMatrixBlock
  | RenderPeopleBlock
  | RenderFaqBlock
  | RenderRiskBlock
  | RenderArchitectureBlock
  | RenderHeroBlock
  | RenderCompareBlock
  | RenderMetricsBlock
  | RenderProcessBlock
  | RenderSummaryBlock
  | RenderCtaBlock;

export interface RenderSlide {
  id: string;
  title: string;
  variant: 'default' | 'hero' | 'compare' | 'metrics' | 'process' | 'summary' | 'cta';
  source_format?: string;
  blocks: RenderBlock[];
}

export interface RenderDeckMeta {
  contract_version: 'render-deck@1';
  source: 'expanded' | 'markdown' | 'manual';
  skill?: SkillName;
  // Compatibility alias for legacy consumers.
  profile?: SkillName;
  default_theme?: string;
  slide_count: number;
}

export interface RenderDeck {
  title: string;
  intro: string;
  meta: RenderDeckMeta;
  slides: RenderSlide[];
}

export interface NormalizedPlanContext extends PlanContext {
  skill: SkillName;
  // Compatibility alias for legacy callers.
  profile: SkillName;
}

export function normalizePlanContext(value: unknown): NormalizedPlanContext;
export function normalizeClarification(payload: unknown): ClarificationResult;
export function normalizeIngest(payload: unknown): IngestArtifact;
export function validateIngest(payload: unknown): IngestArtifact;
export function normalizeAnalysis(payload: unknown): AnalysisResult;
export function validateAnalysis(payload: unknown): AnalysisResult;
export function normalizeOutline(payload: unknown): OutlineResult;
export function outlineToApiPayload(outline: unknown): OutlineResult;
export function normalizeExpanded(payload: unknown): ExpandedResult;
export function normalizeRenderDeck(deck: unknown): RenderDeck;
export function validateRenderDeck(deck: unknown): RenderDeck;
export function markdownDeckToRenderDeck(deck: unknown): RenderDeck;
export function expandedToRenderDeck(expanded: unknown): RenderDeck;
