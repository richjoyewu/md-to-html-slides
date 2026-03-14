import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { analyzeMarkdown } from '../agent/analysis.js';
import { buildClarification, buildClarificationFromPlan } from '../agent/clarification.js';
import { buildHeuristicExpanded, buildHeuristicOutline } from '../agent/fallback.js';
import { polishOutline } from '../agent/polisher.js';

interface QualityScores {
  clarification_score: number;
  planning_confidence_score: number;
  segmentation_score: number;
  title_length_score: number;
  density_score: number;
  duplication_score: number;
  rawness_rewrite_score: number;
  expansion_score: number;
  deck_goal_score: number;
  core_message_score: number;
  omission_quality_score: number;
  uncertainty_quality_score: number;
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

const expectedClarification = (
  level: string,
  analysis: ReturnType<typeof analyzeMarkdown>,
  sectionCount: number
): boolean => {
  if (analysis.roughness === 'very_rough') return true;
  if (level === 'extreme' && analysis.input_shape !== 'slide_like') return true;
  if (level === 'extreme' && analysis.density === 'high' && sectionCount <= 3) return true;
  if (level === 'rough' && analysis.input_shape === 'document_like' && sectionCount <= 2) return true;
  return false;
};

const scorePlanningConfidence = (
  clarificationTriggered: boolean,
  confidence: number,
  uncertainties: string[]
): number => {
  if (clarificationTriggered && confidence <= 0.7) return 1;
  if (!clarificationTriggered && confidence >= 0.55 && uncertainties.length <= 2) return 1;
  if (confidence < 0.35 || confidence > 1) return 0;
  return 0.7;
};

const scoreClarification = (
  level: string,
  triggered: boolean,
  analysis: ReturnType<typeof analyzeMarkdown>,
  sectionCount: number
): number =>
  expectedClarification(level, analysis, sectionCount) === triggered ? 1 : 0;

const scoreSegmentation = (level: string, outlineSlideCount: number): number => {
  if (level === 'extreme') {
    if (outlineSlideCount >= 6) return 1;
    if (outlineSlideCount >= 4) return 0.6;
    return 0;
  }
  if (level === 'rough') {
    if (outlineSlideCount >= 4) return 1;
    if (outlineSlideCount >= 3) return 0.6;
    return 0;
  }
  if (outlineSlideCount >= 3) return 1;
  if (outlineSlideCount >= 2) return 0.7;
  return 0.3;
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

const countRawSentenceLeaks = (items: string[]): number => {
  const leakPattern = /(我想|然后|后面|也许|可以先|差不多|还有一个|比如说|这一块|我们先|然后再|的话|目前)/;
  return items.filter((item) => leakPattern.test(item) || item.length > 40).length;
};

const scoreRewriteQuality = (detailPoints: string[][], expanded: ReturnType<typeof buildHeuristicExpanded>): number => {
  const outlineLeaks = detailPoints.flatMap((points) => points).length
    ? countRawSentenceLeaks(detailPoints.flatMap((points) => points))
    : 0;
  const expandedLeaks = countRawSentenceLeaks(
    expanded.slides.flatMap((slide) => [...slide.bullets, slide.body].filter(Boolean))
  );
  const total = Math.max(1, detailPoints.flatMap((points) => points).length + expanded.slides.length);
  return clampScore(1 - (outlineLeaks + expandedLeaks) / total);
};

const looksGeneric = (value: string): boolean => /(核心内容|内容概览|主要内容|帮助受众|快速理解核心内容|提炼输入中的主要结论)/.test(value);

const scoreDeckGoal = (deckGoal: string, deckTitle: string): number => {
  const text = deckGoal.trim();
  if (!text) return 0;
  if (text === deckTitle.trim()) return 0.2;
  if (looksGeneric(text) && text.length < 18) return 0.4;
  if (text.length < 10 || text.length > 72) return 0.6;
  return 1;
};

const scoreCoreMessage = (coreMessage: string, deckTitle: string, deckGoal: string): number => {
  const text = coreMessage.trim();
  if (!text) return 0;
  if (text === deckTitle.trim() || text === deckGoal.trim()) return 0.2;
  if (looksGeneric(text) && text.length < 18) return 0.4;
  if (text.length < 8 || text.length > 72) return 0.6;
  return 1;
};

const scoreOmissionQuality = (omittedTopics: string[], titles: string[], analysis: ReturnType<typeof analyzeMarkdown>): number => {
  const duplicateTitle = omittedTopics.some((topic) => titles.includes(topic));
  if (duplicateTitle) return 0.2;
  if ((analysis.density === 'high' || analysis.roughness !== 'clean') && omittedTopics.length === 0) return 0.7;
  if (omittedTopics.length > 3) return 0.5;
  return 1;
};

const scoreUncertaintyQuality = (confidence: number, uncertainties: string[], clarificationTriggered: boolean): number => {
  if ((clarificationTriggered || confidence < 0.65) && uncertainties.length === 0) return 0.2;
  if (!clarificationTriggered && confidence >= 0.65 && uncertainties.length > 2) return 0.6;
  return 1;
};

const detectBugs = ({
  level,
  analysis,
  clarificationTriggered,
  outlineSlideCount,
  titles,
  detailPoints,
  expanded,
  sectionCount,
  deckGoal,
  coreMessage,
  omittedTopics,
  planningConfidence,
  uncertainties,
  deckTitle
}: {
  level: string;
  analysis: ReturnType<typeof analyzeMarkdown>;
  clarificationTriggered: boolean;
  outlineSlideCount: number;
  titles: string[];
  detailPoints: string[][];
  expanded: ReturnType<typeof buildHeuristicExpanded>;
  sectionCount: number;
  deckGoal: string;
  coreMessage: string;
  omittedTopics: string[];
  planningConfidence: number;
  uncertainties: string[];
  deckTitle: string;
}): string[] => {
  const bugs: string[] = [];
  if (expectedClarification(level, analysis, sectionCount) && !clarificationTriggered) bugs.push('clarification_miss_bug');
  if (!expectedClarification(level, analysis, sectionCount) && clarificationTriggered) bugs.push('clarification_overtrigger_bug');
  if ((level === 'rough' && outlineSlideCount < 3) || (level === 'extreme' && outlineSlideCount < 4)) bugs.push('undersegmented_outline_bug');
  if ((level === 'rough' || level === 'extreme') && analysis.rewrite_strategy === 'preserve') bugs.push('rewrite_strategy_bug');
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
  if (countRawSentenceLeaks(detailPoints.flatMap((points) => points)) > 0) bugs.push('raw_sentence_leak_bug');
  if (scoreDeckGoal(deckGoal, deckTitle) < 1) bugs.push('weak_deck_goal_bug');
  if (scoreCoreMessage(coreMessage, deckTitle, deckGoal) < 1) bugs.push('weak_core_message_bug');
  if (scoreOmissionQuality(omittedTopics, titles, analysis) < 1) bugs.push('omitted_topics_bug');
  if (scoreUncertaintyQuality(planningConfidence, uncertainties, clarificationTriggered) < 1) bugs.push('uncertainty_quality_bug');
  return Array.from(new Set(bugs));
};

const runCase = (filePath: string): CaseResult => {
  const markdown = readFileSync(filePath, 'utf8');
  const relative = path.relative(FIXTURES_DIR, filePath);
  const [category, level] = relative.split(path.sep);
  const caseId = relative.replace(/\\/g, '/');

  const analysis = analyzeMarkdown(markdown);
  const outline = polishOutline(buildHeuristicOutline(markdown));
  const clarification = buildClarification(markdown) || buildClarificationFromPlan(outline);
  const expanded = buildHeuristicExpanded(markdown, outline);
  const sectionCount = analysis.input_shape === 'slide_like'
    ? outline.slides.length
    : Math.max(1, markdown.split(/^##\s+/gm).filter(Boolean).length - 1);

  assert(outline.slides.length > 0, `[${caseId}] outline should not be empty`);
  assert(expanded.slides.length === outline.slides.length, `[${caseId}] expanded slides should match outline count`);
  assert(outline.slides.every((slide) => slide.preview_points.length > 0), `[${caseId}] every outline slide should have preview points`);
  assert(outline.slides.every((slide) => slide.detail_points.length > 0), `[${caseId}] every outline slide should have detail points`);
  assert(expanded.slides.every((slide) => slide.bullets.length > 0 || slide.body), `[${caseId}] every expanded slide should have bullets or body`);

  const titles = outline.slides.map((slide) => slide.title);
  const detailPoints = outline.slides.map((slide) => slide.detail_points);
  const scores = {
    clarification_score: scoreClarification(level, Boolean(clarification), analysis, sectionCount),
    planning_confidence_score: scorePlanningConfidence(Boolean(clarification), outline.meta.planning_confidence, outline.meta.uncertainties),
    segmentation_score: scoreSegmentation(level, outline.slides.length),
    title_length_score: scoreTitleLength(titles),
    density_score: scoreDensity(detailPoints),
    duplication_score: scoreDuplication(detailPoints),
    rawness_rewrite_score: scoreRewriteQuality(detailPoints, expanded),
    expansion_score: scoreExpansion(expanded),
    deck_goal_score: scoreDeckGoal(outline.meta.deck_goal, outline.deck_title),
    core_message_score: scoreCoreMessage(outline.meta.core_message, outline.deck_title, outline.meta.deck_goal),
    omission_quality_score: scoreOmissionQuality(outline.meta.omitted_topics, titles, analysis),
    uncertainty_quality_score: scoreUncertaintyQuality(outline.meta.planning_confidence, outline.meta.uncertainties, Boolean(clarification)),
    overall: 0
  };
  scores.overall = Number(((
    scores.clarification_score +
    scores.planning_confidence_score +
    scores.segmentation_score +
    scores.title_length_score +
    scores.density_score +
    scores.duplication_score +
    scores.rawness_rewrite_score +
    scores.expansion_score +
    scores.deck_goal_score +
    scores.core_message_score +
    scores.omission_quality_score +
    scores.uncertainty_quality_score
  ) / 12).toFixed(3));

  const bugs = detectBugs({
    level,
    analysis,
    clarificationTriggered: Boolean(clarification),
    outlineSlideCount: outline.slides.length,
    titles,
    detailPoints,
    expanded,
    sectionCount,
    deckGoal: outline.meta.deck_goal,
    coreMessage: outline.meta.core_message,
    omittedTopics: outline.meta.omitted_topics,
    planningConfidence: outline.meta.planning_confidence,
    uncertainties: outline.meta.uncertainties,
    deckTitle: outline.deck_title
  });

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
