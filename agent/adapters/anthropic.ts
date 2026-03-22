import type { LlmJsonProvider, LlmProviderConfig } from '../types.js';

const normalizeBaseUrl = (value: string): string => String(value || '').replace(/\/+$/, '');

const extractJson = (text: string): unknown => {
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

  throw new Error(`Anthropic did not return valid JSON`);
};

export const createAnthropicProvider = (config: LlmProviderConfig): LlmJsonProvider => ({
  async callJson({ prompt, timeoutMs = 12000, maxTokens = 700 }) {
    if (!config.apiKey) throw new Error('Missing LLM_API_KEY for Anthropic provider');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${normalizeBaseUrl(config.baseUrl)}/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': config.apiKey,
          'authorization': `Bearer ${config.apiKey}`,
          'anthropic-version': '2023-06-01',
          'user-agent': 'Anthropic/JS 0.39.0'
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: maxTokens,
          temperature: 0,
          messages: [{ role: 'user', content: prompt }]
        }),
        signal: controller.signal
      });

      const raw = await response.text();
      let payload: Record<string, unknown> = {};
      try {
        payload = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      } catch {
        throw new Error(`Anthropic returned non-JSON response: ${raw.slice(0, 200)}`);
      }

      if (!response.ok) {
        const maybeError = payload.error as { message?: string } | undefined;
        const message = maybeError?.message || String(payload.message || 'Anthropic request failed');
        throw new Error(message);
      }

      // Anthropic response: { content: [{type: "text", text: "..."}], stop_reason, ... }
      const content = payload.content as Array<{ type?: string; text?: string }> | undefined;
      const text = content
        ?.filter((block) => block.type === 'text')
        .map((block) => block.text || '')
        .join('\n') || '';

      return extractJson(text);
    } catch (error) {
      if ((error as { name?: string } | null)?.name === 'AbortError') {
        throw new Error(`Anthropic request timed out after ${Math.round(timeoutMs / 1000)}s`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
});
