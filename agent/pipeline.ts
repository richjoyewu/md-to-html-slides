import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { buildClarification, buildClarificationFromPlan } from './clarification.js';
import { requestExpand } from './expander.js';
import { buildHeuristicExpanded, buildHeuristicOutline } from './fallback.js';
import { requestPlan } from './planner.js';
import { polishOutline } from './polisher.js';
import { buildExpandCacheKey, getCacheKey } from './preprocess.js';
import { createLlmProvider, describeLlmProvider, resolveLlmProviderConfig } from './provider.js';
import type {
  AgentMode,
  ClarificationResult,
  ExpandedResult,
  LlmJsonProvider,
  OutlineResult,
  PlanContext
} from './types.js';
import { expandedToRenderDeck, normalizeOutline, normalizePlanContext } from '../shared/core.js';
import type { RenderDeck } from '../shared/core.js';

interface CacheEntry<T> {
  cached_at: number;
  payload: T;
}

interface CorePipelineOptions {
  provider?: LlmJsonProvider | null;
  planCacheLimit?: number;
  expandCacheLimit?: number;
}

interface ResolvedProviderRuntime {
  config: ReturnType<typeof resolveLlmProviderConfig> | null;
  description: string;
  provider: LlmJsonProvider | null;
}

interface ThemeDefinition {
  name: string;
  label: string;
  description: string;
  swatches?: string[];
  renderer: (deck: RenderDeck, options: { theme: string; title: string }) => string;
}

interface ThemeModule {
  THEMES: ThemeDefinition[];
  getTheme: (themeName: string) => ThemeDefinition | undefined;
}

interface RenderOptions {
  theme?: string;
  title?: string;
}

export type PlanExecutionResult =
  | {
      kind: 'clarification';
      payload: ClarificationResult;
      source: 'preplan' | 'postplan';
      mode: 'clarification' | AgentMode;
    }
  | {
      kind: 'outline';
      payload: OutlineResult;
      mode: AgentMode;
    };

export interface ExpandExecutionResult {
  kind: 'expanded';
  payload: ExpandedResult;
  mode: AgentMode;
}

export interface RenderExecutionResult {
  kind: 'rendered';
  deck: RenderDeck;
  html: string;
  theme: ThemeDefinition;
}

export type BuildExecutionResult =
  | {
      kind: 'clarification';
      payload: ClarificationResult;
      source: 'preplan' | 'postplan';
      mode: 'clarification' | AgentMode;
    }
  | {
      kind: 'built';
      outline: OutlineResult;
      expanded: ExpandedResult;
      theme: string;
      plan_mode: AgentMode;
      expand_mode: AgentMode;
    };

const PLAN_CACHE_LIMIT = 50;
const EXPAND_CACHE_LIMIT = 50;

const loadThemesModule = async (): Promise<ThemeModule> =>
  import(new URL('../../templates/index.mjs', import.meta.url).href) as Promise<ThemeModule>;

const remember = <T>(cache: Map<string, CacheEntry<T>>, limit: number, key: string, payload: T): void => {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, { payload, cached_at: Date.now() });
  if (cache.size > limit) {
    cache.delete(cache.keys().next().value as string);
  }
};

const recall = <T>(cache: Map<string, CacheEntry<T>>, key: string): CacheEntry<T> | null => {
  const cached = cache.get(key);
  if (!cached) return null;
  cache.delete(key);
  cache.set(key, cached);
  return cached;
};

const hasRuntimeProviderSignal = (env: NodeJS.ProcessEnv): boolean => {
  const keys = [
    'LLM_PROVIDER',
    'LLM_MODEL',
    'LLM_BASE_URL',
    'LLM_API_KEY',
    'OPENAI_API_KEY',
    'OPENAI_BASE_URL',
    'OPENAI_MODEL',
    'OPENAI_COMPAT_API_KEY',
    'OPENAI_COMPAT_BASE_URL',
    'OPENAI_COMPAT_MODEL',
    'MOONSHOT_API_KEY',
    'KIMI_API_KEY',
    'KIMI_BASE_URL',
    'KIMI_MODEL'
  ];

  return keys.some((key) => String(env[key] || '').trim());
};

export const loadDotEnv = (cwd: string = process.cwd()): void => {
  const envPath = path.join(cwd, '.env');
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

export const resolveProviderRuntime = (env: NodeJS.ProcessEnv = process.env): ResolvedProviderRuntime => {
  if (!hasRuntimeProviderSignal(env)) {
    return {
      config: null,
      description: 'fallback-only',
      provider: null
    };
  }

  const config = resolveLlmProviderConfig(env, { fallbackToLegacyMoonshot: true });
  if (!config) {
    return {
      config: null,
      description: 'fallback-only',
      provider: null
    };
  }

  return {
    config,
    description: describeLlmProvider(config),
    provider: createLlmProvider(config)
  };
};

export const createCorePipeline = (options: CorePipelineOptions = {}) => {
  const provider = options.provider || null;
  const planCache = new Map<string, CacheEntry<OutlineResult>>();
  const expandCache = new Map<string, CacheEntry<ExpandedResult>>();
  const planCacheLimit = options.planCacheLimit ?? PLAN_CACHE_LIMIT;
  const expandCacheLimit = options.expandCacheLimit ?? EXPAND_CACHE_LIMIT;

  const plan = async (markdown: string, context?: PlanContext): Promise<PlanExecutionResult> => {
    const normalizedContext = normalizePlanContext(context) as PlanContext;
    const clarification = buildClarification(markdown, normalizedContext);
    if (clarification) {
      return { kind: 'clarification', payload: clarification, source: 'preplan', mode: 'clarification' };
    }

    const cacheKey = getCacheKey(JSON.stringify({ markdown, context: normalizedContext }));
    const cached = recall(planCache, cacheKey);
    if (cached) {
      const cachedClarification = buildClarificationFromPlan(cached.payload, normalizedContext);
      if (cachedClarification) {
        return { kind: 'clarification', payload: cachedClarification, source: 'postplan', mode: 'cache' };
      }
      return { kind: 'outline', payload: cached.payload, mode: 'cache' };
    }

    let outline: OutlineResult;
    let mode: AgentMode;

    if (provider) {
      const result = await requestPlan(provider, markdown, normalizedContext);
      outline = result.outline;
      mode = result.mode;
    } else {
      outline = polishOutline(buildHeuristicOutline(markdown, normalizedContext));
      mode = 'fallback';
    }

    const postPlanClarification = buildClarificationFromPlan(outline, normalizedContext);
    if (postPlanClarification) {
      return { kind: 'clarification', payload: postPlanClarification, source: 'postplan', mode };
    }

    remember(planCache, planCacheLimit, cacheKey, outline);
    return { kind: 'outline', payload: outline, mode };
  };

  const expand = async (markdown: string, outlineInput: OutlineResult, context?: PlanContext): Promise<ExpandExecutionResult> => {
    const outline = normalizeOutline(outlineInput) as OutlineResult;
    const normalizedContext = normalizePlanContext(context) as PlanContext;
    const expandKey = buildExpandCacheKey(markdown, outline, normalizedContext);
    const cached = recall(expandCache, expandKey);
    if (cached) {
      return { kind: 'expanded', payload: cached.payload, mode: 'cache' };
    }

    let expanded: ExpandedResult;
    let mode: AgentMode;

    if (provider) {
      const result = await requestExpand(provider, markdown, outline, normalizedContext);
      expanded = result.expanded;
      mode = result.mode;
    } else {
      expanded = buildHeuristicExpanded(markdown, outline);
      mode = 'fallback';
    }

    remember(expandCache, expandCacheLimit, expandKey, expanded);
    return { kind: 'expanded', payload: expanded, mode };
  };

  const build = async (
    markdown: string,
    options: {
      context?: PlanContext;
      outline?: OutlineResult | null;
      theme?: string;
    } = {}
  ): Promise<BuildExecutionResult> => {
    const normalizedContext = normalizePlanContext(options.context) as PlanContext;

    let outline: OutlineResult;
    let planMode: AgentMode = 'cache';

    if (options.outline) {
      outline = normalizeOutline(options.outline) as OutlineResult;
    } else {
      const planned = await plan(markdown, normalizedContext);
      if (planned.kind === 'clarification') return planned;
      outline = planned.payload;
      planMode = planned.mode;
    }

    const expanded = await expand(markdown, outline, normalizedContext);
    return {
      kind: 'built',
      outline,
      expanded: expanded.payload,
      theme: options.theme || outline.meta.default_theme,
      plan_mode: planMode,
      expand_mode: expanded.mode
    };
  };

  const render = async (expandedInput: ExpandedResult | unknown, options: RenderOptions = {}): Promise<RenderExecutionResult> => {
    const { getTheme, THEMES } = await loadThemesModule();
    const deck = expandedToRenderDeck(expandedInput);
    if (options.title?.trim()) deck.title = options.title.trim();

    const requestedTheme = options.theme?.trim();
    const themeName = requestedTheme || 'dark-card';
    const theme = getTheme(themeName) as ThemeDefinition | undefined;
    if (!theme) {
      const supportedThemes = THEMES.map((entry) => entry.name).join(', ');
      throw new Error(`Unsupported theme: ${themeName}. Supported themes: ${supportedThemes}`);
    }

    return {
      kind: 'rendered',
      deck,
      html: theme.renderer(deck, { theme: theme.name, title: deck.title }),
      theme
    };
  };

  return {
    build,
    expand,
    plan,
    render
  };
};
