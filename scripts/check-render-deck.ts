import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { buildHeuristicExpanded, buildHeuristicOutline } from '../agent/fallback.js';
import { polishOutline } from '../agent/polisher.js';
import { expandedToRenderDeck, validateRenderDeck } from '../shared/core.js';

interface RenderDeckCaseResult {
  case_id: string;
  slide_count: number;
  semantic_slide_count: number;
  skill: string | undefined;
}

const FIXTURES_DIR = path.resolve(process.cwd(), 'fixtures');

const assert = (condition: unknown, message: string): void => {
  if (!condition) throw new Error(message);
};

const collectFixtureFiles = (dir: string): string[] => {
  const entries = readdirSync(dir).map((name) => path.join(dir, name));
  return entries.flatMap((entry) => {
    const stat = statSync(entry);
    if (stat.isDirectory()) return collectFixtureFiles(entry);
    return entry.endsWith('.md') ? [entry] : [];
  });
};

const inferSkill = (relativePath: string): 'general' | 'pitch-tech-launch' => {
  const category = relativePath.split('/')[0];
  return category === 'pitch' ? 'pitch-tech-launch' : 'general';
};

const runCase = (filePath: string): RenderDeckCaseResult => {
  const markdown = readFileSync(filePath, 'utf8');
  const relative = path.relative(FIXTURES_DIR, filePath).replace(/\\/g, '/');
  const skill = inferSkill(relative);
  const outline = polishOutline(buildHeuristicOutline(markdown, { skill }));
  const expanded = buildHeuristicExpanded(markdown, outline);
  const deck = validateRenderDeck(expandedToRenderDeck(expanded));

  assert(deck.meta.contract_version === 'render-deck@1', `[${relative}] invalid render-deck version`);
  assert(deck.meta.slide_count === deck.slides.length, `[${relative}] slide_count mismatch`);
  assert(deck.slides.every((slide) => slide.id), `[${relative}] every render slide needs id`);
  assert(deck.slides.every((slide) => slide.blocks.length > 0), `[${relative}] every render slide needs blocks`);

  const semanticSlideCount = deck.slides.filter((slide) => slide.variant !== 'default').length;

  return {
    case_id: relative,
    slide_count: deck.slides.length,
    semantic_slide_count: semanticSlideCount,
    skill: deck.meta.skill
  };
};

const files = collectFixtureFiles(FIXTURES_DIR);
assert(files.length > 0, 'No fixture files found');

const results = files.map(runCase);
const summary = {
  total_cases: results.length,
  average_slide_count: Number((results.reduce((sum, item) => sum + item.slide_count, 0) / results.length).toFixed(2)),
  average_semantic_slide_count: Number((results.reduce((sum, item) => sum + item.semantic_slide_count, 0) / results.length).toFixed(2))
};

console.log(JSON.stringify({ summary, results }, null, 2));
console.log('\nrender-deck regression checks passed');
