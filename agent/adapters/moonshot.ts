import type { LlmProviderConfig } from '../types.js';
import { createChatCompletionsJsonProvider } from './shared.js';

export const createMoonshotProvider = (config: LlmProviderConfig) =>
  createChatCompletionsJsonProvider(config, {
    providerName: 'Moonshot',
    defaultTemperature: 1,
    defaultJsonMode: 'prompt',
    missingApiKeyMessage: 'Missing KIMI_API_KEY or MOONSHOT_API_KEY'
  });
