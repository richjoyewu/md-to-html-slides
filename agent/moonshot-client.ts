import type { KimiConfig } from './types.js';

// Kimi 可能返回 fenced JSON 或夹带说明文字，这里做防御性 JSON 提取。
const extractJson = (text = ''): unknown => {
  const cleaned = String(text).trim();
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

  throw new Error('Kimi did not return valid JSON');
};

// 对 Moonshot API 的薄封装，把传输层细节隔离在 Client 内。
export const callKimiJson = async ({
  config,
  prompt,
  timeoutMs = 12000,
  maxTokens = 700
}: {
  config: KimiConfig;
  prompt: string;
  timeoutMs?: number;
  maxTokens?: number;
}): Promise<unknown> => {
  if (!config.apiKey) throw new Error('Missing KIMI_API_KEY or MOONSHOT_API_KEY');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 1,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }]
      }),
      signal: controller.signal
    });

    const raw = await response.text();
    let payload: Record<string, unknown> = {};
    try {
      payload = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    } catch {
      throw new Error(`Kimi returned non-JSON response: ${raw.slice(0, 200)}`);
    }

    if (!response.ok) {
      const maybeError = payload.error as { message?: string } | undefined;
      const message = maybeError?.message || String(payload.message || 'Kimi request failed');
      throw new Error(message);
    }

    const choices = payload.choices as Array<{ message?: { content?: string } }> | undefined;
    return extractJson(choices?.[0]?.message?.content || '');
  } catch (error) {
    if ((error as { name?: string } | null)?.name === 'AbortError') {
      throw new Error(`Kimi request timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};
