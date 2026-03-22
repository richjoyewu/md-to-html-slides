import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { analyzeMarkdown } from '../agent/analysis.js';
import { buildClarification, buildClarificationFromPlan } from '../agent/clarification.js';
import { requestExpand } from '../agent/expander.js';
import { requestPlan } from '../agent/planner.js';
import {
  createLlmProvider,
  describeLlmProvider,
  effectiveJsonMode,
  resolveLlmProviderConfig
} from '../agent/provider.js';
import type {
  ClarificationQuestion,
  LlmProviderConfig,
  OutlineResult,
  PlanContext
} from '../agent/types.js';
import {
  loadGoldenOutput,
  scoreGoldenSlideCount,
  scoreGoldenTitleCoverage,
  scoreGoldenDeckGoal,
  scoreGoldenCoreMessage,
  type GoldenOutput
} from '../agent/golden-loader.js';

interface QualityScores {
  llm_mode_score: number;
  clarification_score: number;
  plan_contract_score: number;
  slide_count_score: number;
  deck_goal_score: number;
  core_message_score: number;
  uncertainty_quality_score: number;
  slide_likeness_score: number;
  expansion_score: number;
  golden_slide_count_score: number | null;
  golden_title_coverage_score: number | null;
  golden_deck_goal_score: number | null;
  golden_core_message_score: number | null;
  overall: number;
}

interface ClarificationTrace {
  source: 'preplan' | 'postplan';
  message: string;
  question_ids: string[];
}

interface CaseResult {
  case_id: string;
  category: string;
  level: string;
  clarification_triggered: boolean;
  clarification_rounds: ClarificationTrace[];
  outline_slide_count: number;
  plan_mode: 'llm' | 'fallback' | 'failed';
  expand_mode: 'llm' | 'fallback' | 'failed';
  planning_confidence: number | null;
  scores: QualityScores;
  bugs: string[];
  error?: string;
  llm_output?: {
    deck_goal: string;
    core_message: string;
    slide_titles: string[];
    uncertainties: string[];
    planning_confidence: number;
  };
}

interface ProfileRunSummary {
  profile: string;
  provider: string;
  total_cases: number;
  clarification_cases: number;
  average_overall: number;
  bug_counts: Record<string, number>;
}

interface ProfileRunReport {
  config: Pick<LlmProviderConfig, 'provider' | 'model' | 'jsonMode' | 'baseUrl'>;
  summary: ProfileRunSummary;
  results: CaseResult[];
}

const FIXTURES_DIR = path.resolve(process.cwd(), 'fixtures');
const REPORT_DIR = path.resolve(process.cwd(), '.tmp', 'evals');
const REPORT_PATH = path.join(REPORT_DIR, 'check-llm-latest.json');
const PLAN_TIMEOUT_MS = Number(process.env.CHECK_LLM_PLAN_TIMEOUT_MS || 90000);
const EXPAND_TIMEOUT_MS = Number(process.env.CHECK_LLM_EXPAND_TIMEOUT_MS || 120000);
const RETRY_COUNT = Math.max(0, Number(process.env.CHECK_LLM_RETRIES || 1));
const RETRY_BACKOFF_MS = Math.max(250, Number(process.env.CHECK_LLM_RETRY_BACKOFF_MS || 1500));
const DEFAULT_CASES = [
  'product/extreme/product-intro.md'
] as const;

const clampScore = (value: number): number => Math.max(0, Math.min(1, value));
const compactText = (value: string): string => String(value || '').replace(/\s+/g, ' ').trim();

const loadDotEnv = (): void => {
  const envPath = path.join(process.cwd(), '.env');
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const separator = trimmed.indexOf('=');
    if (separator <= 0) return;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    value = value.replace(/^['"]|['"]$/g, '');

    if (!(key in process.env)) process.env[key] = value;
  });
};

const collectFixtureFiles = (dir: string): string[] => {
  const entries = readdirSync(dir).map((name) => path.join(dir, name));
  return entries.flatMap((entry) => {
    const stat = statSync(entry);
    if (stat.isDirectory()) return collectFixtureFiles(entry);
    return entry.endsWith('.md') ? [entry] : [];
  });
};

const resolveFixturePath = (input: string): string => {
  const asAbsolute = path.resolve(process.cwd(), input);
  if (existsSync(asAbsolute)) return asAbsolute;

  const fromFixtures = path.resolve(FIXTURES_DIR, input);
  if (existsSync(fromFixtures)) return fromFixtures;

  throw new Error(`Fixture file not found: ${input}`);
};

const countOverlap = (left: string[], right: string[]): number => {
  const a = new Set(left.map((item) => compactText(item).toLowerCase()).filter(Boolean));
  const b = new Set(right.map((item) => compactText(item).toLowerCase()).filter(Boolean));
  let overlap = 0;
  for (const item of a) if (b.has(item)) overlap += 1;
  return overlap;
};

const looksGeneric = (value: string): boolean =>
  /(核心内容|内容概览|主要内容|帮助受众|快速理解核心内容|提炼输入中的主要结论)/.test(value);

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

const scoreUncertaintyQuality = (
  confidence: number,
  uncertainties: string[],
  clarificationTriggered: boolean
): number => {
  if ((clarificationTriggered || confidence < 0.65) && uncertainties.length === 0) return 0.2;
  if (!clarificationTriggered && confidence >= 0.65 && uncertainties.length > 2) return 0.6;
  return 1;
};

const isDraftySurface = (value: string): boolean => {
  const text = compactText(value);
  return text.length > 28 || /可能|大概|比如|然后|后面|另外|顺便|我觉得|我想|可以先|先看/.test(text);
};

const scorePlanContract = (outline: OutlineResult): number => {
  if (!outline.slides.length) return 0;
  const validSlides = outline.slides.filter((slide) =>
    slide.title && slide.summary && slide.preview_points.length > 0 && slide.detail_points.length > 0
  ).length;
  const metaFields = [
    outline.meta.content_intent,
    outline.meta.audience_guess,
    outline.meta.deck_goal,
    outline.meta.core_message
  ].filter((item) => compactText(item).length > 0).length;
  return clampScore((validSlides / outline.slides.length) * 0.75 + (metaFields / 4) * 0.25);
};

const scoreSlideCount = (suggestedSlideCount: number, actualSlideCount: number): number => {
  const diff = Math.abs(suggestedSlideCount - actualSlideCount);
  if (diff <= 1) return 1;
  if (diff <= 2) return 0.75;
  if (diff <= 3) return 0.5;
  return 0.2;
};

const scoreSlideLikeness = (
  expanded: Awaited<ReturnType<typeof requestExpand>>['expanded']
): number => {
  const surfaces = expanded.slides.flatMap((slide) => [...slide.bullets, slide.body].filter(Boolean));
  if (!surfaces.length) return 0;

  const drafty = surfaces.filter(isDraftySurface).length;
  const overlyLong = expanded.slides.flatMap((slide) => slide.bullets).filter((bullet) => bullet.length > 24).length;
  const duplicateSlides = expanded.slides.reduce((penalty, slide, index) => {
    if (index === 0) return penalty;
    return penalty + (countOverlap(expanded.slides[index - 1].bullets, slide.bullets) >= 3 ? 1 : 0);
  }, 0);

  return clampScore(1 - (drafty + overlyLong + duplicateSlides) / Math.max(1, surfaces.length));
};

const scoreExpansion = (
  expanded: Awaited<ReturnType<typeof requestExpand>>['expanded']
): number => {
  const emptySlides = expanded.slides.filter((slide) => !slide.bullets.length && !slide.body).length;
  const weakSlides = expanded.slides.filter(
    (slide) => slide.format === 'title-bullets' && slide.bullets.length < 2
  ).length;
  return clampScore(1 - (emptySlides + weakSlides) / Math.max(1, expanded.slides.length));
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

const isRetryableError = (error: unknown): boolean =>
  /(timed out|overloaded|fetch failed|econnreset|socket hang up|429|temporarily unavailable)/i.test(
    error instanceof Error ? error.message : String(error)
  );

const withRetries = async <T>(label: string, operation: () => Promise<T>): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_COUNT; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error) || attempt === RETRY_COUNT) {
        throw error;
      }
      console.error(
        `[check-llm-retry] ${label} attempt=${attempt + 1}/${RETRY_COUNT + 1} message=${
          error instanceof Error ? error.message : String(error)
        }`
      );
      await delay(RETRY_BACKOFF_MS * (attempt + 1));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Retry failed for ${label}`);
};

const answerBank = {
  product: {
    audience: '潜在合作方和投资人',
    goal: '让听众理解产品解决什么问题、怎么解决、为什么值得做'
  },
  course: {
    audience: '零基础学员',
    goal: '帮助观众建立核心概念和整体认知'
  },
  pitch: {
    audience: '投资人',
    goal: '让观众快速理解产品价值和商业机会'
  },
  report: {
    audience: '内部团队',
    goal: '让团队快速掌握重点进展、风险和下一步'
  },
  story: {
    audience: '客户与内部团队',
    goal: '让观众理解案例脉络、结果和关键启发'
  },
  default: {
    audience: '普通观众',
    goal: '帮助观众快速理解主题主线'
  }
} as const;

const deriveAnswer = ({
  category,
  question,
  suggestedSlideCount
}: {
  category: string;
  question: ClarificationQuestion;
  suggestedSlideCount: number;
}): string => {
  const bank = answerBank[category as keyof typeof answerBank] || answerBank.default;
  const label = `${question.id} ${question.label}`.toLowerCase();

  if (question.id === 'audience' || label.includes('给谁看') || label.includes('受众')) {
    return bank.audience;
  }
  if (question.id === 'goal' || label.includes('记住') || label.includes('重点') || label.includes('核心')) {
    return bank.goal;
  }
  if (question.id === 'slide_count' || label.includes('几页') || label.includes('页数')) {
    return `${Math.max(4, Math.min(10, suggestedSlideCount))} 页`;
  }

  return bank.goal;
};

const applyClarificationAnswers = ({
  context,
  category,
  questions,
  suggestedSlideCount
}: {
  context: PlanContext;
  category: string;
  questions: ClarificationQuestion[];
  suggestedSlideCount: number;
}): number => {
  const answers = { ...(context.answers || {}) };
  let applied = 0;

  for (const question of questions) {
    if (compactText(answers[question.id] || '')) continue;
    answers[question.id] = deriveAnswer({ category, question, suggestedSlideCount });
    applied += 1;
  }

  context.answers = answers;
  return applied;
};

const runPlanFlow = async ({
  category,
  markdown,
  provider
}: {
  category: string;
  markdown: string;
  provider: ReturnType<typeof createLlmProvider>;
}): Promise<{
  clarificationRounds: ClarificationTrace[];
  outline: OutlineResult;
  context: PlanContext;
  planMode: 'llm' | 'fallback';
}> => {
  const analysis = analyzeMarkdown(markdown);
  const context: PlanContext = { answers: {} };
  const clarificationRounds: ClarificationTrace[] = [];

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const preplan = buildClarification(markdown, context);
    if (preplan) {
      clarificationRounds.push({
        source: 'preplan',
        message: preplan.message,
        question_ids: preplan.questions.map((question) => question.id)
      });
      const applied = applyClarificationAnswers({
        context,
        category,
        questions: preplan.questions,
        suggestedSlideCount: analysis.suggested_slide_count
      });
      if (!applied) {
        throw new Error('Pre-plan clarification repeated without collecting new answers');
      }
      continue;
    }

    const { outline, mode } = await withRetries('plan', () =>
      requestPlan(provider, markdown, context, {
        allowFallback: false,
        timeoutMs: PLAN_TIMEOUT_MS,
        maxTokens: 8192
      })
    );
    const postplan = buildClarificationFromPlan(outline, context);
    if (postplan) {
      clarificationRounds.push({
        source: 'postplan',
        message: postplan.message,
        question_ids: postplan.questions.map((question) => question.id)
      });
      const applied = applyClarificationAnswers({
        context,
        category,
        questions: postplan.questions,
        suggestedSlideCount: analysis.suggested_slide_count
      });
      if (!applied) {
        throw new Error('Post-plan clarification repeated without collecting new answers');
      }
      continue;
    }

    return {
      clarificationRounds,
      outline,
      context,
      planMode: mode
    };
  }

  throw new Error('Clarification did not converge within 4 rounds');
};

const buildFailureScores = (): QualityScores => ({
  llm_mode_score: 0,
  clarification_score: 0,
  plan_contract_score: 0,
  slide_count_score: 0,
  deck_goal_score: 0,
  core_message_score: 0,
  uncertainty_quality_score: 0,
  slide_likeness_score: 0,
  expansion_score: 0,
  golden_slide_count_score: null,
  golden_title_coverage_score: null,
  golden_deck_goal_score: null,
  golden_core_message_score: null,
  overall: 0
});

const runCase = async (
  filePath: string,
  provider: ReturnType<typeof createLlmProvider>
): Promise<CaseResult> => {
  const markdown = readFileSync(filePath, 'utf8');
  const relative = path.relative(FIXTURES_DIR, filePath).replace(/\\/g, '/');
  const [category = 'default', level = 'unknown'] = relative.split(path.sep);
  const analysis = analyzeMarkdown(markdown);
  const golden = loadGoldenOutput(filePath);

  try {
    const { clarificationRounds, outline, planMode } = await runPlanFlow({
      category,
      markdown,
      provider
    });
    const { expanded, mode: expandMode } = await withRetries('expand', () =>
      requestExpand(provider, markdown, outline, undefined, {
        allowFallback: false,
        timeoutMs: EXPAND_TIMEOUT_MS,
        maxTokens: 8192
      })
    );

    const clarificationTriggered = clarificationRounds.length > 0;
    const sectionCount = analysis.input_shape === 'slide_like'
      ? outline.slides.length
      : Math.max(1, markdown.split(/^##\s+/gm).filter(Boolean).length - 1);

    // Golden output comparison scores
    const goldenSlideCountScore = golden
      ? scoreGoldenSlideCount(golden.slides.length, outline.slides.length)
      : null;
    const goldenTitleCoverageScore = golden
      ? scoreGoldenTitleCoverage(
          golden.slides.map((s) => s.title),
          outline.slides.map((s) => s.title)
        )
      : null;
    const goldenDeckGoalScore = golden
      ? scoreGoldenDeckGoal(golden.deck_goal, outline.meta.deck_goal)
      : null;
    const goldenCoreMessageScore = golden
      ? scoreGoldenCoreMessage(golden.core_message, outline.meta.core_message)
      : null;

    const scores = {
      llm_mode_score: planMode === 'llm' && expandMode === 'llm' ? 1 : 0,
      clarification_score: expectedClarification(level, analysis, sectionCount) === clarificationTriggered ? 1 : 0,
      plan_contract_score: scorePlanContract(outline),
      slide_count_score: scoreSlideCount(analysis.suggested_slide_count, outline.slides.length),
      deck_goal_score: scoreDeckGoal(outline.meta.deck_goal, outline.deck_title),
      core_message_score: scoreCoreMessage(outline.meta.core_message, outline.deck_title, outline.meta.deck_goal),
      uncertainty_quality_score: scoreUncertaintyQuality(
        outline.meta.planning_confidence,
        outline.meta.uncertainties,
        clarificationTriggered
      ),
      slide_likeness_score: scoreSlideLikeness(expanded),
      expansion_score: scoreExpansion(expanded),
      golden_slide_count_score: goldenSlideCountScore,
      golden_title_coverage_score: goldenTitleCoverageScore,
      golden_deck_goal_score: goldenDeckGoalScore,
      golden_core_message_score: goldenCoreMessageScore,
      overall: 0
    };

    // Compute overall: base scores + golden scores (if available)
    const baseScores = [
      scores.llm_mode_score,
      scores.clarification_score,
      scores.plan_contract_score,
      scores.slide_count_score,
      scores.deck_goal_score,
      scores.core_message_score,
      scores.uncertainty_quality_score,
      scores.slide_likeness_score,
      scores.expansion_score
    ];
    const goldenScores = [
      goldenSlideCountScore,
      goldenTitleCoverageScore,
      goldenDeckGoalScore,
      goldenCoreMessageScore
    ].filter((s): s is number => s !== null);

    const allScores = [...baseScores, ...goldenScores];
    scores.overall = Number((allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(3));

    const bugs: string[] = [];
    if (planMode !== 'llm') bugs.push('plan_fallback_bug');
    if (expandMode !== 'llm') bugs.push('expand_fallback_bug');
    if (scores.clarification_score < 1) {
      bugs.push(clarificationTriggered ? 'unexpected_clarification_bug' : 'missing_clarification_bug');
    }
    if (scores.plan_contract_score < 0.9) bugs.push('weak_plan_contract_bug');
    if (scores.deck_goal_score < 1) bugs.push('weak_deck_goal_bug');
    if (scores.core_message_score < 1) bugs.push('weak_core_message_bug');
    if (scores.uncertainty_quality_score < 1) bugs.push('weak_uncertainty_bug');
    if (scores.slide_likeness_score < 0.75) bugs.push('slide_likeness_bug');
    if (scores.expansion_score < 0.85) bugs.push('weak_expansion_bug');
    if (clarificationRounds.length > 2) bugs.push('too_many_clarification_rounds_bug');
    // Golden output bugs
    if (goldenSlideCountScore !== null && goldenSlideCountScore < 0.6) bugs.push('golden_slide_count_mismatch');
    if (goldenTitleCoverageScore !== null && goldenTitleCoverageScore < 0.5) bugs.push('golden_title_coverage_low');
    if (goldenDeckGoalScore !== null && goldenDeckGoalScore < 0.3) bugs.push('golden_deck_goal_mismatch');
    if (goldenCoreMessageScore !== null && goldenCoreMessageScore < 0.3) bugs.push('golden_core_message_mismatch');

    return {
      case_id: relative,
      category,
      level,
      clarification_triggered: clarificationTriggered,
      clarification_rounds: clarificationRounds,
      outline_slide_count: outline.slides.length,
      plan_mode: planMode,
      expand_mode: expandMode,
      planning_confidence: outline.meta.planning_confidence,
      scores,
      bugs,
      llm_output: {
        deck_goal: outline.meta.deck_goal,
        core_message: outline.meta.core_message,
        slide_titles: outline.slides.map((s) => s.title),
        uncertainties: outline.meta.uncertainties,
        planning_confidence: outline.meta.planning_confidence
      }
    };
  } catch (error) {
    return {
      case_id: relative,
      category,
      level,
      clarification_triggered: false,
      clarification_rounds: [],
      outline_slide_count: 0,
      plan_mode: 'failed',
      expand_mode: 'failed',
      planning_confidence: null,
      scores: buildFailureScores(),
      bugs: ['runtime_error_bug'],
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

interface CliOptions {
  ab: boolean;
  fixtureFiles: string[];
}

const parseArgs = (): CliOptions => {
  const args = process.argv.slice(2);
  const ab = args.includes('--ab');
  const explicitCases = args.filter((item) => item && item !== '--all' && item !== '--ab');
  if (explicitCases.length > 0) {
    return { ab, fixtureFiles: explicitCases.map(resolveFixturePath) };
  }
  if (args.includes('--all')) {
    return { ab, fixtureFiles: collectFixtureFiles(FIXTURES_DIR) };
  }
  return { ab, fixtureFiles: DEFAULT_CASES.map((item) => resolveFixturePath(item)) };
};

const assertProviderConfig = (config: LlmProviderConfig | null, profile: string): LlmProviderConfig => {
  if (!config) {
    throw new Error(`Missing provider configuration for profile ${profile}`);
  }
  if (!config.apiKey) {
    throw new Error(`Missing API key for profile ${profile}`);
  }
  if (!config.baseUrl) {
    throw new Error(`Missing base URL for profile ${profile}`);
  }
  if (!config.model) {
    throw new Error(`Missing model for profile ${profile}`);
  }
  return config;
};

const summarizeProfileRun = (
  profile: string,
  config: LlmProviderConfig,
  results: CaseResult[]
): ProfileRunReport => {
  const summary: ProfileRunSummary = {
    profile,
    provider: describeLlmProvider(config),
    total_cases: results.length,
    clarification_cases: results.filter((item) => item.clarification_triggered).length,
    average_overall: Number((results.reduce((sum, item) => sum + item.scores.overall, 0) / results.length).toFixed(3)),
    bug_counts: results.flatMap((item) => item.bugs).reduce<Record<string, number>>((acc, bug) => {
      acc[bug] = (acc[bug] || 0) + 1;
      return acc;
    }, {})
  };

  return {
    config: {
      provider: config.provider,
      model: config.model,
      jsonMode: effectiveJsonMode(config),
      baseUrl: config.baseUrl
    },
    summary,
    results
  };
};

const runProfile = async (
  profile: string,
  config: LlmProviderConfig,
  fixtureFiles: string[]
): Promise<ProfileRunReport> => {
  const provider = createLlmProvider(config);
  const results: CaseResult[] = [];
  for (const filePath of fixtureFiles) {
    results.push(await runCase(filePath, provider));
  }
  return summarizeProfileRun(profile, config, results);
};

const totalBugs = (bugCounts: Record<string, number>): number =>
  Object.values(bugCounts).reduce((sum, count) => sum + count, 0);

const buildComparison = (baseline: ProfileRunReport, candidate: ProfileRunReport) => {
  const candidateByCase = new Map(candidate.results.map((result) => [result.case_id, result]));
  const case_deltas = baseline.results.map((baseResult) => {
    const candidateResult = candidateByCase.get(baseResult.case_id);
    return {
      case_id: baseResult.case_id,
      baseline_overall: baseResult.scores.overall,
      candidate_overall: candidateResult?.scores.overall ?? null,
      overall_delta: candidateResult
        ? Number((candidateResult.scores.overall - baseResult.scores.overall).toFixed(3))
        : null,
      baseline_bugs: baseResult.bugs,
      candidate_bugs: candidateResult?.bugs || []
    };
  });

  const average_overall_delta = Number(
    (candidate.summary.average_overall - baseline.summary.average_overall).toFixed(3)
  );
  const total_bug_delta = totalBugs(candidate.summary.bug_counts) - totalBugs(baseline.summary.bug_counts);

  return {
    baseline_provider: baseline.summary.provider,
    candidate_provider: candidate.summary.provider,
    average_overall_delta,
    total_bug_delta,
    winner:
      average_overall_delta > 0 && total_bug_delta <= 0
        ? 'candidate'
        : average_overall_delta < 0 && total_bug_delta >= 0
          ? 'baseline'
          : 'tie',
    case_deltas
  };
};

loadDotEnv();

const cliOptions = parseArgs();
if (cliOptions.fixtureFiles.length === 0) {
  throw new Error('No fixture files selected for check:llm');
}

const baselineConfig = assertProviderConfig(
  resolveLlmProviderConfig(process.env, { prefix: 'LLM', fallbackToLegacyMoonshot: true }),
  'baseline'
);

if (!cliOptions.ab) {
  const baselineReport = await runProfile('baseline', baselineConfig, cliOptions.fixtureFiles);
  const summary = {
    ...baselineReport.summary,
    report_path: path.relative(process.cwd(), REPORT_PATH)
  };

  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(REPORT_PATH, JSON.stringify({ summary, results: baselineReport.results }, null, 2));

  console.log(JSON.stringify({ summary, results: baselineReport.results }, null, 2));
  console.log(`\nllm regression report written to ${path.relative(process.cwd(), REPORT_PATH)}`);

  if (baselineReport.results.some((item) => item.bugs.length > 0)) {
    process.exitCode = 1;
  } else {
    console.log('llm regression checks passed');
  }
} else {
  const candidateConfig = assertProviderConfig(
    resolveLlmProviderConfig(process.env, {
      prefix: 'LLM_CANDIDATE',
      inheritPrefix: 'LLM',
      requireAnyFromPrefix: true
    }),
    'candidate'
  );
  const baselineReport = await runProfile('baseline', baselineConfig, cliOptions.fixtureFiles);
  const candidateReport = await runProfile('candidate', candidateConfig, cliOptions.fixtureFiles);
  const comparison = buildComparison(baselineReport, candidateReport);
  const reportPath = path.join(REPORT_DIR, 'check-llm-ab-latest.json');
  const report = {
    baseline: baselineReport,
    candidate: candidateReport,
    comparison,
    report_path: path.relative(process.cwd(), reportPath)
  };

  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report, null, 2));
  console.log(`\nllm A/B regression report written to ${path.relative(process.cwd(), reportPath)}`);

  if (
    baselineReport.results.some((item) => item.bugs.length > 0)
    || candidateReport.results.some((item) => item.bugs.length > 0)
  ) {
    process.exitCode = 1;
  } else {
    console.log('llm A/B regression checks passed');
  }
}
