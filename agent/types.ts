// Planner / Expander / Renderer 之间共享的结构契约。
export type SlideIntent = 'define' | 'explain' | 'compare' | 'example' | 'process' | 'summary' | 'cta';
export type ContentType = 'course' | 'pitch' | 'report' | 'story' | 'general';
export type InputShape = 'slide_like' | 'document_like' | 'notes_like';
export type DensityLevel = 'low' | 'medium' | 'high';
export type RoughnessLevel = 'clean' | 'rough' | 'very_rough';
export type RewriteStrategy = 'preserve' | 'light_rewrite' | 'aggressive_rewrite';
export type ExpandFormat = 'title-bullets' | 'title-body' | 'summary';
export type AgentMode = 'llm' | 'fallback' | 'cache';

export interface SourceSection {
  title: string;
  points: string[];
}

export interface PreprocessedMarkdown {
  deck_title: string;
  sections: SourceSection[];
  raw_excerpt: string;
}


// Analyzer 的输出，用来指导规划阶段，但不会直接暴露给用户。
export interface MarkdownAnalysis {
  content_type: ContentType;
  input_shape: InputShape;
  density: DensityLevel;
  roughness: RoughnessLevel;
  rewrite_strategy: RewriteStrategy;
  suggested_slide_count: number;
  needs_rewrite: boolean;
  notes: string[];
}

export interface PlanningProfile {
  narrative: string;
  emphasis: string[];
  pageTypes: SlideIntent[];
  rules: string[];
}

export interface ClarificationResult {
  kind: 'clarification';
  message: string;
  questions: ClarificationQuestion[];
}

export interface ClarificationQuestion {
  id: string;
  label: string;
  placeholder?: string;
}

export interface PlanContext {
  answers?: Record<string, string>;
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
  slides: OutlineSlide[];
}

export interface ExpandedSlide {
  index: number;
  title: string;
  format: ExpandFormat;
  bullets: string[];
  body: string;
}

// Expander 输出：可直接交给渲染层的稳定结构化内容。
export interface ExpandedResult {
  deck_title: string;
  slides: ExpandedSlide[];
}

export interface KimiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}
