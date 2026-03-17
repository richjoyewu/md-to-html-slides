import type { JsonMode, LlmJsonProvider, LlmProviderConfig } from '../types.js';

interface ChatCompletionsAdapterOptions {
  providerName: string;
  defaultTemperature: number;
  defaultJsonMode: JsonMode;
  missingApiKeyMessage: string;
}

const normalizeBaseUrl = (value: string): string => String(value || '').replace(/\/+$/, '');

const extractJson = (text: string, providerName: string): unknown => {
  const cleaned = String(text || '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {}

  const fenced = cleaned.match(/```json\s*([\s\S]*?)```/i);
  if (fenced) return JSON.parse(fenced[1]);

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  }

  throw new Error(`${providerName} did not return valid JSON`);
};

const extractMessageContent = (content: unknown): string => {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';

  return content
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        if (typeof record.text === 'string') return record.text;
        if (record.type === 'text' && typeof record.text === 'string') return record.text;
      }
      return '';
    })
    .filter(Boolean)
    .join('\n');
};

export const createChatCompletionsJsonProvider = (
  config: LlmProviderConfig,
  options: ChatCompletionsAdapterOptions
): LlmJsonProvider => ({
  async callJson({ prompt, timeoutMs = 12000, maxTokens = 700 }) {
    if (!config.apiKey) throw new Error(options.missingApiKeyMessage);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const jsonMode = config.jsonMode ?? options.defaultJsonMode;

    try {
      const response = await fetch(`${normalizeBaseUrl(config.baseUrl)}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          temperature: options.defaultTemperature,
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: prompt }],
          ...(jsonMode === 'native' ? { response_format: { type: 'json_object' } } : {})
        }),
        signal: controller.signal
      });

      const raw = await response.text();
      let payload: Record<string, unknown> = {};
      try {
        payload = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      } catch {
        throw new Error(`${options.providerName} returned non-JSON response: ${raw.slice(0, 200)}`);
      }

      if (!response.ok) {
        const maybeError = payload.error as { message?: string } | undefined;
        const message = maybeError?.message || String(payload.message || `${options.providerName} request failed`);
        throw new Error(message);
      }

      const choices = payload.choices as Array<{ message?: { content?: unknown } }> | undefined;
      return extractJson(extractMessageContent(choices?.[0]?.message?.content), options.providerName);
    } catch (error) {
      if ((error as { name?: string } | null)?.name === 'AbortError') {
        throw new Error(`${options.providerName} request timed out after ${Math.round(timeoutMs / 1000)}s`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
});
