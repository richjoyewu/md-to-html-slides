import type { SkillName, ExpandFormat } from '../agent/types.js';

export interface SkillFormatHint {
  when: string;
  format: ExpandFormat;
}

export type SkillQualityFocus =
  | 'clarity'
  | 'parallel_bullets'
  | 'good_summary'
  | 'strong_opening'
  | 'proof_with_numbers'
  | 'clear_cta'
  | 'clear_ask'
  | 'founder_conviction';

export interface SkillFileInput {
  version?: string;
  id: SkillName;
  name?: SkillName;
  base_skill?: SkillName;
  label?: string;
  studio_label?: string;
  description?: string;
  studio_description?: string;
  default_theme?: string;
  planning?: {
    narrative_pattern?: string;
    rules?: string[];
  };
  expansion?: {
    bullet_style?: string;
    body_usage?: string;
    rules?: string[];
  };
  blocks?: {
    preferred?: string[];
    format_guidance?: SkillFormatHint[];
  };
  quality?: {
    focus?: SkillQualityFocus[];
  };
  examples?: {
    outline?: unknown;
    expanded?: unknown;
  };
}

export interface SkillDefinition {
  id: SkillName;
  name: SkillName;
  label: string;
  studio_label: string;
  description: string;
  studio_description: string;
  version: string;
  default_theme: string;
  planning: {
    narrative_pattern: string;
    rules: string[];
  };
  expansion: {
    bullet_style: string;
    body_usage: string;
    rules: string[];
  };
  blocks: {
    preferred: string[];
    format_guidance: SkillFormatHint[];
  };
  quality: {
    focus: SkillQualityFocus[];
  };
  examples: {
    outline: unknown;
    expanded: unknown;
  };
  planner_rules: string[];
  expansion_rules: string[];
  format_guidance: SkillFormatHint[];
  outline_example: unknown;
  expanded_example: unknown;
}

export const DEFAULT_SKILL: SkillName;
export const SKILLS: SkillDefinition[];
export const SKILL_MAP: Map<SkillName, SkillDefinition>;
export function normalizeSkillName(value: unknown): SkillName;
export function getSkill(value: unknown): SkillDefinition;
export function hasSkill(value: unknown): boolean;
export function validateSkillInput(skill: unknown, options?: { existingIds?: Iterable<string> | Map<string, unknown>; knownBaseSkills?: Iterable<string> | Map<string, unknown> }): SkillFileInput;
export function validateResolvedSkill(skill: unknown): SkillDefinition;
export function resolveSkill(skill: unknown, options?: { registry?: Map<string, SkillDefinition>; existingIds?: Iterable<string> | Map<string, unknown>; knownBaseSkills?: Iterable<string> | Map<string, unknown> }): SkillDefinition;
export function registerResolvedSkill(skill: SkillDefinition): SkillDefinition;
export function registerSkill(skill: unknown): SkillDefinition;
export function listSkills(): SkillDefinition[];
