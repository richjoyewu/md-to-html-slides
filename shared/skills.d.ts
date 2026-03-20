import type { SkillName, ExpandFormat } from '../agent/types.js';

export interface SkillFormatHint {
  when: string;
  format: ExpandFormat;
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
    focus: string[];
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
export function registerSkill(skill: unknown): SkillDefinition;
