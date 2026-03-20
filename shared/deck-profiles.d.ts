import type { SkillDefinition } from './skills.js';
import type { DeckProfileName } from '../agent/types.js';

// Legacy compatibility surface. New code should prefer shared/skills.*.
export type DeckProfile = SkillDefinition;

export const DEFAULT_DECK_PROFILE: DeckProfileName;
export const DECK_PROFILES: DeckProfile[];
export const DECK_PROFILE_MAP: Map<DeckProfileName, DeckProfile>;
export function normalizeDeckProfileName(value: unknown): DeckProfileName;
export function getDeckProfile(value: unknown): DeckProfile;
