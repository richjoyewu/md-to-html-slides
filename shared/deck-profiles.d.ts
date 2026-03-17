import type { DeckProfileName, ExpandFormat } from '../agent/types.js';

export interface DeckProfileFormatHint {
  when: string;
  format: ExpandFormat;
}

export interface DeckProfile {
  name: DeckProfileName;
  label: string;
  studio_label: string;
  description: string;
  studio_description: string;
  default_theme: string;
  planner_rules: string[];
  expansion_rules: string[];
  format_guidance: DeckProfileFormatHint[];
  outline_example: unknown;
  expanded_example: unknown;
}

export const DEFAULT_DECK_PROFILE: DeckProfileName;
export const DECK_PROFILES: DeckProfile[];
export const DECK_PROFILE_MAP: Map<DeckProfileName, DeckProfile>;
export function normalizeDeckProfileName(value: unknown): DeckProfileName;
export function getDeckProfile(value: unknown): DeckProfile;
