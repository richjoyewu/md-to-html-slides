import type { JsonMode, LlmProviderConfig, ProviderKind } from '../types.js';
import { createChatCompletionsJsonProvider } from './shared.js';

const providerLabel = (provider: ProviderKind): string => {
  if (provider === 'openai') return 'OpenAI';
  return 'OpenAI-compatible';
};

const defaultJsonMode = (provider: ProviderKind, jsonMode: JsonMode | undefined): JsonMode => {
  if (jsonMode) return jsonMode;
  return provider === 'openai' ? 'native' : 'prompt';
};

export const createOpenAiProvider = (config: LlmProviderConfig) =>
  createChatCompletionsJsonProvider(
    {
      ...config,
      jsonMode: defaultJsonMode(config.provider, config.jsonMode)
    },
    {
      providerName: providerLabel(config.provider),
      defaultTemperature: 0,
      defaultJsonMode: defaultJsonMode(config.provider, config.jsonMode),
      missingApiKeyMessage:
        config.provider === 'openai'
          ? 'Missing LLM_API_KEY or OPENAI_API_KEY'
          : 'Missing LLM_API_KEY or OPENAI_COMPAT_API_KEY'
    }
  );
