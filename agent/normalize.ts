import { normalizeExpanded as normalizeExpandedShared, normalizeOutline as normalizeOutlineShared } from '../shared/core.js';
import type { ExpandedResult, OutlineResult } from './types.js';

export const normalizeOutline = (payload: unknown): OutlineResult =>
  normalizeOutlineShared(payload) as OutlineResult;

export const normalizeExpanded = (payload: unknown): ExpandedResult =>
  normalizeExpandedShared(payload) as ExpandedResult;
