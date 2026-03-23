import type { RenderBlock } from '../shared/core.js';

// Planner / Expander / Renderer 之间共享的结构契约。
export type SlideIntent = 'define' | 'explain' | 'compare' | 'example' | 'process' | 'summary' | 'cta';
export type InputShape = 'slide_like' | 'document_like' | 'notes_like';
export type DensityLevel = 'low' | 'medium' | 'high';
export type RoughnessLevel = 'clean' | 'rough' | 'very_rough';
export type RewriteStrategy = 'preserve' | 'light_rewrite' | 'aggressive_rewrite';
export type DocumentType = 'general' | 'pitch' | 'tutorial' | 'lesson' | 'report' | 'reference' | 'notes';
export type SectionRole = 'opening' | 'context' | 'problem' | 'solution' | 'evidence' | 'comparison' | 'process' | 'example' | 'summary' | 'cta' | 'detail';
export type AnalysisSignal = 'numbers' | 'comparison' | 'process' | 'example' | 'question' | 'risk' | 'code' | 'image' | 'quote' | 'table';
export type ClarificationDimension = 'audience' | 'goal' | 'slide_count' | 'must_keep';
export type BuiltinSkillName = 'general' | 'pitch-tech-launch';
export type SkillName = BuiltinSkillName | (string & {});
// Legacy compatibility alias. New product-facing code should prefer SkillName.
export type DeckProfileName = SkillName;
export type ExpandFormat =
  | 'hero'
  | 'title-bullets'
  | 'title-body'
  | 'compare'
  | 'metrics'
  | 'process'
  | 'summary'
  | 'cta';
export type AgentMode = 'llm' | 'fallback' | 'cache';
export type ProviderKind = 'moonshot' | 'openai' | 'openai-compatible' | 'anthropic';
export type JsonMode = 'prompt' | 'native';

export interface SourceSection {
  title: string;
  points: string[];
}

export interface PreprocessedMarkdown {
  deck_title: string;
  sections: SourceSection[];
  raw_excerpt: string;
}

export type IngestSourceType = 'plain_text' | 'markdown' | 'speech_draft' | 'mixed';
export type IngestBlockKind = 'heading' | 'paragraph' | 'list' | 'quote' | 'code' | 'image' | 'unknown';

export interface IngestBlockSignals {
  has_numbers: boolean;
  has_question: boolean;
  has_process_words: boolean;
  has_comparison_words: boolean;
}

export interface IngestBlock {
  id: string;
  index: number;
  kind: IngestBlockKind;
  text: string;
  source_section_title?: string;
  signals: IngestBlockSignals;
}

export interface IngestArtifact {
  contract_version: 'ingest@1';
  title_hint: string;
  source_type_hint: IngestSourceType;
  raw_length: number;
  block_count: number;
  raw_excerpt: string;
  blocks: IngestBlock[];
}


// Analyzer 的输出，用来指导规划阶段，但不会直接暴露给用户。
export interface MarkdownAnalysis {
  input_shape: InputShape;
  density: DensityLevel;
  roughness: RoughnessLevel;
  rewrite_strategy: RewriteStrategy;
  heading_depth: number;
  section_count: number;
  point_count: number;
  avg_sentence_length: number;
  suggested_slide_count: number;
  needs_rewrite: boolean;
  notes: string[];
}

export interface MarkdownSourceFeatures {
  heading_1_count: number;
  heading_2_count: number;
  bullet_count: number;
  image_count: number;
  code_block_count: number;
  table_count: number;
  quote_count: number;
  link_count: number;
}

export interface AnalysisSection {
  id: string;
  index: number;
  title: string;
  point_count: number;
  role: SectionRole;
  intent: SlideIntent;
  signals: AnalysisSignal[];
  visual_candidates: ExpandFormat[];
  key_points: string[];
  summary_hint: string;
}

export interface AnalysisMeta {
  skill: SkillName;
  // Compatibility alias for legacy consumers.
  profile?: DeckProfileName;
  audience_hint: string;
  goal_hint: string;
}

export interface AnalysisDocument {
  input_shape: InputShape;
  doc_type: DocumentType;
  density: DensityLevel;
  roughness: RoughnessLevel;
  rewrite_strategy: RewriteStrategy;
  heading_depth: number;
  section_count: number;
  point_count: number;
  avg_sentence_length: number;
  suggested_slide_count: number;
  needs_rewrite: boolean;
  source_features: MarkdownSourceFeatures;
}

export interface AnalysisRecommendations {
  preferred_opening_format: ExpandFormat;
  preferred_ending_format: ExpandFormat;
  must_keep_sections: string[];
  watchouts: string[];
}

export interface AnalysisClarification {
  required: boolean;
  confidence: number;
  message: string;
  trigger_rule_ids: string[];
  reasons: string[];
  assumptions: string[];
  missing_dimensions: ClarificationDimension[];
  questions: ClarificationQuestion[];
}

export interface AnalysisResult {
  contract_version: 'analysis@1';
  deck_title: string;
  meta: AnalysisMeta;
  document: AnalysisDocument;
  structure: {
    notes: string[];
    omitted_topics: string[];
    sections: AnalysisSection[];
  };
  recommendations: AnalysisRecommendations;
  clarification: AnalysisClarification;
}

export interface ClarificationResult {
  kind: 'clarification';
  message: string;
  questions: ClarificationQuestion[];
  meta?: PlanMeta;
}

export interface ClarificationQuestion {
  id: string;
  label: string;
  placeholder?: string;
  why_it_matters?: string;
}

export interface PlanContext {
  answers?: Record<string, string>;
  // Compatibility alias for legacy callers.
  profile?: DeckProfileName;
  skill?: SkillName;
}

export interface OutlineSlide {
  index: number;
  title: string;
  summary: string;
  preview_points: string[];
  detail_points: string[];
  intent: SlideIntent;
}

// Planner 输出：用户确认后的轻量大纲，之后再进入扩展阶段。
export interface OutlineResult {
  deck_title: string;
  meta: PlanMeta;
  slides: OutlineSlide[];
}

export interface PlanMeta {
  skill: SkillName;
  // Compatibility alias for legacy consumers.
  profile?: DeckProfileName;
  default_theme: string;
  content_intent: string;
  audience_guess: string;
  deck_goal: string;
  core_message: string;
  omitted_topics: string[];
  planning_confidence: number;
  uncertainties: string[];
  review_issues?: string[];
  actions_taken?: string[];
}

export interface ExpandedSlide {
  index: number;
  title: string;
  format: ExpandFormat;
  bullets: string[];
  body: string;
  blocks?: RenderBlock[];
}

export interface ExpandMeta {
  skill?: SkillName;
  // Compatibility alias for legacy consumers.
  profile?: DeckProfileName;
  rewrite_quality: number;
  tone: 'presentation' | 'mixed';
  review_issues?: string[];
  actions_taken?: string[];
}

// Expander 输出：可直接交给渲染层的稳定结构化内容。
export interface ExpandedResult {
  deck_title: string;
  meta?: ExpandMeta;
  slides: ExpandedSlide[];
}

export interface LlmProviderConfig {
  provider: ProviderKind;
  apiKey: string;
  baseUrl: string;
  model: string;
  jsonMode?: JsonMode;
}

export interface LlmJsonRequest {
  prompt: string;
  timeoutMs?: number;
  maxTokens?: number;
}

export interface LlmJsonProvider {
  callJson(request: LlmJsonRequest): Promise<unknown>;
}
