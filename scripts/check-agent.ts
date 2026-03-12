import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { analyzeMarkdown } from '../agent/analysis.js';
import { buildClarification } from '../agent/clarification.js';
import { buildHeuristicExpanded, buildHeuristicOutline } from '../agent/fallback.js';
import { polishOutline } from '../agent/polisher.js';

interface QualityScores {
  title_length_score: number;
  density_score: number;
  duplication_score: number;
  expansion_score: number;
  overall: number;
}

interface CaseResult {
  case_id: string;
  category: string;
  level: string;
  analysis: ReturnType<typeof analyzeMarkdown>;
  clarification_triggered: boolean;
  outline_slide_count: number;
  scores: QualityScores;
  bugs: string[];
}

const FIXTURES_DIR = path.resolve(process.cwd(), 'fixtures');

const assert = (condition: unknown, message: string): void => {
  if (!condition) throw new Error(message);
};

const countOverlap = (left: string[], right: string[]): number => {
  const a = new Set(left.map((item) => item.trim().toLowerCase()).filter(Boolean));
  const b = new Set(right.map((item) => item.trim().toLowerCase()).filter(Boolean));
  let overlap = 0;
  for (const item of a) if (b.has(item)) overlap += 1;
  return overlap;
};

const clampScore = (value: number): number => Math.max(0, Math.min(1, value));

const collectFixtureFiles = (dir: string): string[] => {
  const entries = readdirSync(dir).map((name) => path.join(dir, name));
  return entries.flatMap((entry) => {
    const stat = statSync(entry);
    if (stat.isDirectory()) return collectFixtureFiles(entry);
    return entry.endsWith('.md') ? [entry] : [];
  });
};

const scoreTitleLength = (titles: string[]): number => {
  const longCount = titles.filter((title) => title.length > 24).length;
  return clampScore(1 - longCount / Math.max(1, titles.length));
};

const scoreDensity = (detailPoints: string[][]): number => {
  const overloaded = detailPoints.filter((points) => points.length > 4).length;
  const thin = detailPoints.filter((points) => points.length < 1).length;
  return clampScore(1 - (overloaded + thin) / Math.max(1, detailPoints.length));
};

const scoreDuplication = (detailPoints: string[][]): number => {
  if (detailPoints.length <= 1) return 1;
  let penalty = 0;
  for (let i = 1; i < detailPoints.length; i += 1) {
    const overlap = countOverlap(detailPoints[i - 1], detailPoints[i]);
    if (overlap >= 3) penalty += 1;
  }
  return clampScore(1 - penalty / Math.max(1, detailPoints.length - 1));
};

const scoreExpansion = (expanded: ReturnType<typeof buildHeuristicExpanded>): number => {
  const emptySlides = expanded.slides.filter((slide) => !slide.bullets.length && !slide.body).length;
  const bodyOnly = expanded.slides.filter((slide) => slide.format === 'title-body' && !slide.body).length;
  return clampScore(1 - (emptySlides + bodyOnly) / Math.max(1, expanded.slides.length));
};

const detectBugs = ({
  titles,
  detailPoints,
  expanded
}: {
  titles: string[];
  detailPoints: string[][];
  expanded: ReturnType<typeof buildHeuristicExpanded>;
}): string[] => {
  const bugs: string[] = [];
  if (titles.some((title) => title.length > 24)) bugs.push('title_too_long_bug');
  if (detailPoints.some((points) => points.length > 4)) bugs.push('overloaded_slide_bug');
  if (detailPoints.some((points) => points.length < 1)) bugs.push('thin_slide_bug');
  for (let i = 1; i < detailPoints.length; i += 1) {
    if (countOverlap(detailPoints[i - 1], detailPoints[i]) >= 3) {
      bugs.push('duplicate_slide_bug');
      break;
    }
  }
  if (expanded.slides.some((slide) => !slide.bullets.length && !slide.body)) bugs.push('empty_expanded_slide_bug');
  return bugs;
};

const runCase = (filePath: string): CaseResult => {
  const markdown = readFileSync(filePath, 'utf8');
  const relative = path.relative(FIXTURES_DIR, filePath);
  const [category, level] = relative.split(path.sep);
  const caseId = relative.replace(/\\/g, '/');

  const analysis = analyzeMarkdown(markdown);
  const clarification = buildClarification(markdown);
  const outline = polishOutline(buildHeuristicOutline(markdown));
  const expanded = buildHeuristicExpanded(markdown, outline);

  assert(outline.slides.length > 0, `[${caseId}] outline should not be empty`);
  assert(expanded.slides.length === outline.slides.length, `[${caseId}] expanded slides should match outline count`);
  assert(outline.slides.every((slide) => slide.preview_points.length > 0), `[${caseId}] every outline slide should have preview points`);
  assert(outline.slides.every((slide) => slide.detail_points.length > 0), `[${caseId}] every outline slide should have detail points`);
  assert(expanded.slides.every((slide) => slide.bullets.length > 0 || slide.body), `[${caseId}] every expanded slide should have bullets or body`);

  const titles = outline.slides.map((slide) => slide.title);
  const detailPoints = outline.slides.map((slide) => slide.detail_points);
  const scores = {
    title_length_score: scoreTitleLength(titles),
    density_score: scoreDensity(detailPoints),
    duplication_score: scoreDuplication(detailPoints),
    expansion_score: scoreExpansion(expanded),
    overall: 0
  };
  scores.overall = Number(((scores.title_length_score + scores.density_score + scores.duplication_score + scores.expansion_score) / 4).toFixed(3));

  const bugs = detectBugs({ titles, detailPoints, expanded });

  return {
    case_id: caseId,
    category,
    level,
    analysis,
    clarification_triggered: Boolean(clarification),
    outline_slide_count: outline.slides.length,
    scores,
    bugs
  };
};

const files = collectFixtureFiles(FIXTURES_DIR);
assert(files.length > 0, 'No fixture files found');

const results = files.map(runCase);
const summary = {
  total_cases: results.length,
  average_overall: Number((results.reduce((sum, item) => sum + item.scores.overall, 0) / results.length).toFixed(3)),
  clarification_cases: results.filter((item) => item.clarification_triggered).length,
  bug_counts: results.flatMap((item) => item.bugs).reduce<Record<string, number>>((acc, bug) => {
    acc[bug] = (acc[bug] || 0) + 1;
    return acc;
  }, {})
};

console.log(JSON.stringify({ summary, results }, null, 2));
console.log('\nagent regression checks passed');
