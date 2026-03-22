import { createAnthropicProvider } from './adapters/anthropic.js';
import { createMoonshotProvider } from './adapters/moonshot.js';
import { createOpenAiProvider } from './adapters/openai.js';
import type { JsonMode, LlmJsonProvider, LlmProviderConfig, ProviderKind } from './types.js';

interface ResolveLlmProviderOptions {
  prefix?: string;
  inheritPrefix?: string;
  fallbackToLegacyMoonshot?: boolean;
  requireAnyFromPrefix?: boolean;
}

const hasOwnProfileValue = (env: NodeJS.ProcessEnv, prefix: string): boolean =>
  Object.keys(env).some((key) => key.startsWith(`${prefix}_`) && String(env[key] || '').trim());

const readOwnProfileValue = (env: NodeJS.ProcessEnv, prefix: string, key: string): string =>
  String(env[`${prefix}_${key}`] || '').trim();

const normalizeProviderKind = (value: string): ProviderKind | null => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'moonshot' || normalized === 'kimi') return 'moonshot';
  if (normalized === 'openai') return 'openai';
  if (normalized === 'openai-compatible' || normalized === 'openai_compatible' || normalized === 'compatible') {
    return 'openai-compatible';
  }
  if (normalized === 'anthropic' || normalized === 'claude') return 'anthropic';
  throw new Error(`Unsupported provider: ${value}`);
};

const normalizeJsonMode = (value: string): JsonMode | undefined => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === 'prompt') return 'prompt';
  if (normalized === 'native' || normalized === 'json' || normalized === 'json_object') return 'native';
  throw new Error(`Unsupported JSON mode: ${value}`);
};

const defaultBaseUrl = (provider: ProviderKind): string => {
  if (provider === 'moonshot') return 'https://api.moonshot.cn/v1';
  if (provider === 'openai') return 'https://api.openai.com/v1';
  if (provider === 'anthropic') return 'https://api.anthropic.com/v1';
  return '';
};

const defaultModel = (provider: ProviderKind): string => {
  if (provider === 'moonshot') return 'kimi-k2-5';
  if (provider === 'openai') return 'gpt-4.1-mini';
  if (provider === 'anthropic') return 'claude-sonnet-4-6';
  return '';
};

const providerSpecificApiKey = (env: NodeJS.ProcessEnv, provider: ProviderKind): string => {
  if (provider === 'moonshot') return String(env.KIMI_API_KEY || env.MOONSHOT_API_KEY || '').trim();
  if (provider === 'openai') return String(env.OPENAI_API_KEY || '').trim();
  return String(env.OPENAI_COMPAT_API_KEY || env.OPENAI_API_KEY || '').trim();
};

const providerSpecificBaseUrl = (env: NodeJS.ProcessEnv, provider: ProviderKind): string => {
  if (provider === 'moonshot') return String(env.KIMI_BASE_URL || '').trim();
  if (provider === 'openai') return String(env.OPENAI_BASE_URL || '').trim();
  return String(env.OPENAI_COMPAT_BASE_URL || '').trim();
};

const providerSpecificModel = (env: NodeJS.ProcessEnv, provider: ProviderKind): string => {
  if (provider === 'moonshot') return String(env.KIMI_MODEL || '').trim();
  if (provider === 'openai') return String(env.OPENAI_MODEL || '').trim();
  return String(env.OPENAI_COMPAT_MODEL || '').trim();
};

export const effectiveJsonMode = (config: LlmProviderConfig): JsonMode => {
  if (config.jsonMode) return config.jsonMode;
  if (config.provider === 'openai') return 'native';
  return 'prompt';
};

export const describeLlmProvider = (config: LlmProviderConfig): string =>
  `${config.provider}:${config.model}:${effectiveJsonMode(config)}`;

export const resolveLlmProviderConfig = (
  env: NodeJS.ProcessEnv,
  options: ResolveLlmProviderOptions = {}
): LlmProviderConfig | null => {
  const prefix = options.prefix || 'LLM';
  const inheritPrefix = options.inheritPrefix;

  if (options.requireAnyFromPrefix && !hasOwnProfileValue(env, prefix)) {
    return null;
  }

  const ownProvider = normalizeProviderKind(readOwnProfileValue(env, prefix, 'PROVIDER'));
  const inheritedProvider = inheritPrefix
    ? normalizeProviderKind(readOwnProfileValue(env, inheritPrefix, 'PROVIDER'))
    : null;
  const provider = ownProvider
    || inheritedProvider
    || normalizeProviderKind(options.fallbackToLegacyMoonshot ? 'moonshot' : '');

  if (!provider) return null;

  const allowInheritedProviderScopedValues = Boolean(inheritPrefix) && (!ownProvider || ownProvider === inheritedProvider);
  const inheritedValue = (key: string): string =>
    allowInheritedProviderScopedValues && inheritPrefix ? readOwnProfileValue(env, inheritPrefix, key) : '';

  const apiKey = readOwnProfileValue(env, prefix, 'API_KEY') || inheritedValue('API_KEY') || providerSpecificApiKey(env, provider);
  const baseUrl = readOwnProfileValue(env, prefix, 'BASE_URL')
    || inheritedValue('BASE_URL')
    || providerSpecificBaseUrl(env, provider)
    || defaultBaseUrl(provider);
  const model = readOwnProfileValue(env, prefix, 'MODEL')
    || inheritedValue('MODEL')
    || providerSpecificModel(env, provider)
    || defaultModel(provider);
  const jsonMode = normalizeJsonMode(readOwnProfileValue(env, prefix, 'JSON_MODE') || inheritedValue('JSON_MODE'));

  return {
    provider,
    apiKey,
    baseUrl,
    model,
    jsonMode
  };
};

export const createLlmProvider = (config: LlmProviderConfig): LlmJsonProvider => {
  if (config.provider === 'moonshot') return createMoonshotProvider(config);
  if (config.provider === 'anthropic') return createAnthropicProvider(config);
  if (config.provider === 'openai' || config.provider === 'openai-compatible') {
    return createOpenAiProvider(config);
  }
  throw new Error(`Unsupported provider: ${config.provider satisfies never}`);
};

export { analyzeMarkdown } from './analysis.js';
export { buildClarification } from './clarification.js';
export { buildHeuristicOutline, buildHeuristicExpanded } from './fallback.js';
export { buildPlanPrompt, buildExpandPrompt } from './prompt-builder.js';
export { requestPlan } from './planner.js';
export { requestExpand } from './expander.js';
