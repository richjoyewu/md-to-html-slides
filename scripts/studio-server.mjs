#!/usr/bin/env node

import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';

const rootDir = process.cwd();
const host = '127.0.0.1';
const port = Number(process.env.PORT || 4173);

const loadDotEnv = () => {
  const envPath = path.join(rootDir, '.env');
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

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  });
};

loadDotEnv();

const kimiApiKey = process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY || '';
const kimiBaseUrl = process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1';
const kimiModel = process.env.KIMI_MODEL || 'kimi-k2-5';

const planCache = new Map();
const expandCache = new Map();
const PLAN_CACHE_LIMIT = 50;
const EXPAND_CACHE_LIMIT = 50;

const getCacheKey = (markdown) => createHash('sha1').update(String(markdown || '')).digest('hex');

const setPlanCache = (key, value) => {
  if (planCache.has(key)) planCache.delete(key);
  planCache.set(key, { ...value, cached_at: Date.now() });
  if (planCache.size > PLAN_CACHE_LIMIT) {
    const oldestKey = planCache.keys().next().value;
    planCache.delete(oldestKey);
  }
};

const setExpandCache = (key, value) => {
  if (expandCache.has(key)) expandCache.delete(key);
  expandCache.set(key, { ...value, cached_at: Date.now() });
  if (expandCache.size > EXPAND_CACHE_LIMIT) {
    const oldestKey = expandCache.keys().next().value;
    expandCache.delete(oldestKey);
  }
};

const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp']
]);

const sendText = (response, statusCode, message) => {
  response.writeHead(statusCode, { 'content-type': 'text/plain; charset=utf-8' });
  response.end(message);
};

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
};

const openSse = (response) => {
  response.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive'
  });
};

const sendSseEvent = (response, event, payload) => {
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const sendNotFound = (response) => sendText(response, 404, 'Not found');

const sendFile = (response, filePath) => {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES.get(extension) || 'application/octet-stream';
  response.writeHead(200, { 'content-type': contentType });
  createReadStream(filePath).pipe(response);
};

const readJsonBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
};

const extractJson = (text = '') => {
  const cleaned = String(text).trim();
  try {
    return JSON.parse(cleaned);
  } catch {}

  const fenced = cleaned.match(/```json\s*([\s\S]*?)```/i);
  if (fenced) {
    return JSON.parse(fenced[1]);
  }

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  }

  throw new Error('Kimi did not return valid JSON');
};

const preprocessMarkdown = (markdown) => {
  const lines = String(markdown || '').split(/\r?\n/);
  const deckTitle = (lines.find((line) => line.trim().startsWith('# ')) || '').replace(/^#\s+/, '').trim() || 'Untitled Deck';
  const sections = [];
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('## ')) {
      if (current) sections.push(current);
      current = { title: line.replace(/^##\s+/, '').trim(), points: [] };
      continue;
    }

    if (!current) {
      current = { title: deckTitle, points: [] };
    }

    if (/^[-*+]\s+/.test(line)) {
      current.points.push(line.replace(/^[-*+]\s+/, '').trim());
    } else if (!/^#\s+/.test(line)) {
      current.points.push(line);
    }
  }

  if (current) sections.push(current);

  const compact = sections
    .filter((section) => section.title)
    .slice(0, 10)
    .map((section) => ({
      title: section.title,
      points: section.points.slice(0, 4)
    }));

  return {
    deck_title: deckTitle,
    sections: compact,
    raw_excerpt: String(markdown || '').slice(0, 2400)
  };
};

const buildClarification = (markdown) => {
  const source = preprocessMarkdown(markdown);
  const sectionCount = source.sections.length;
  const pointCount = source.sections.reduce((sum, section) => sum + section.points.length, 0);
  const rawLength = String(markdown || '').trim().length;

  if (sectionCount >= 2 || pointCount >= 4 || rawLength >= 180) {
    return null;
  }

  return {
    kind: 'clarification',
    message: '当前内容过短或结构不足，先补一点关键信息再生成大纲会更准。',
    questions: [
      '这份内容更偏课程、汇报还是宣传？',
      '你希望大约做几页？例如 5 页或 8 页。'
    ]
  };
};

const buildHeuristicExpanded = (markdown, outline) => {
  const source = preprocessMarkdown(markdown);
  const sectionMap = new Map(source.sections.map((section) => [section.title, section.points]));

  return {
    deck_title: outline?.deck_title || source.deck_title,
    slides: (outline?.slides || []).map((slide, index) => {
      const points = sectionMap.get(slide.title) || [];
      const bullets = points.filter(Boolean).slice(0, 4);
      return {
        index: Number(slide.index || index + 1),
        title: slide.title,
        format: bullets.length <= 1 ? 'title-body' : 'title-bullets',
        bullets: bullets.length > 1 ? bullets : [],
        body: bullets.length <= 1 ? (bullets[0] || slide.summary || '') : ''
      };
    }).filter((slide) => slide.title)
  };
};

const buildHeuristicOutline = (markdown) => {
  const source = preprocessMarkdown(markdown);
  const slides = source.sections.length
    ? source.sections.map((section, index) => ({
        index: index + 1,
        title: section.title,
        summary: section.points[0] || `${section.title} 的核心内容`,
        intent: index === 0 ? 'define' : 'explain'
      }))
    : [{ index: 1, title: source.deck_title, summary: '内容概览', intent: 'summary' }];

  return {
    deck_title: source.deck_title,
    slides: slides.slice(0, 10)
  };
};

const normalizeOutline = (payload) => {
  const deckTitle = String(payload?.deck_title || payload?.title || 'Untitled Deck').trim() || 'Untitled Deck';
  const slides = Array.isArray(payload?.slides)
    ? payload.slides
        .map((slide, index) => ({
          index: Number(slide?.index || index + 1),
          title: String(slide?.title || '').trim(),
          summary: String(slide?.summary || '').trim(),
          intent: String(slide?.intent || 'explain').trim() || 'explain'
        }))
        .filter((slide) => slide.title)
    : [];

  if (!slides.length) {
    throw new Error('Outline is empty');
  }

  return {
    deck_title: deckTitle,
    slides: slides.slice(0, 16)
  };
};

const normalizeExpanded = (payload) => {
  const deckTitle = String(payload?.deck_title || payload?.title || 'Untitled Deck').trim() || 'Untitled Deck';
  const slides = Array.isArray(payload?.slides)
    ? payload.slides
        .map((slide, index) => ({
          index: Number(slide?.index || index + 1),
          title: String(slide?.title || '').trim(),
          format: String(slide?.format || 'title-bullets').trim() || 'title-bullets',
          bullets: Array.isArray(slide?.bullets)
            ? slide.bullets.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 5)
            : [],
          body: String(slide?.body || '').trim()
        }))
        .filter((slide) => slide.title)
    : [];

  if (!slides.length) {
    throw new Error('Expanded slides are empty');
  }

  return {
    deck_title: deckTitle,
    slides: slides.slice(0, 16)
  };
};

const callKimiJson = async ({ prompt, timeoutMs = 12000, maxTokens = 700 }) => {
  if (!kimiApiKey) {
    throw new Error('Missing KIMI_API_KEY or MOONSHOT_API_KEY');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${kimiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${kimiApiKey}`
      },
      body: JSON.stringify({
        model: kimiModel,
        temperature: 1,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }]
      }),
      signal: controller.signal
    });

    const raw = await response.text();
    let payload = {};
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch {
      throw new Error(`Kimi returned non-JSON response: ${raw.slice(0, 200)}`);
    }

    if (!response.ok) {
      const message = payload?.error?.message || payload?.message || 'Kimi request failed';
      throw new Error(message);
    }

    const content = payload?.choices?.[0]?.message?.content || '';
    return extractJson(content);
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`Kimi request timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const buildPlanPrompt = (markdown) => {
  const source = preprocessMarkdown(markdown);
  return [
    '你是一个演示文稿 Planner。',
    '根据输入的 sections，生成演示文稿大纲。',
    '只输出 JSON。',
    '格式: {"deck_title":"...","slides":[{"index":1,"title":"...","summary":"...","intent":"..."}] }',
    '要求:',
    '- 只做页结构规划，不要生成 bullets',
    '- slides 数量 4 到 8 页',
    '- title 要短',
    '- summary 每页一句话',
    '- intent 只能从 define, explain, compare, example, process, summary, cta 中选择',
    '',
    '输入 sections:',
    JSON.stringify(source, null, 2)
  ].join('\n');
};

const buildExpandPrompt = ({ markdown, outline }) => {
  const source = preprocessMarkdown(markdown);
  return [
    '你是一个演示文稿 Expander。',
    '根据用户原始内容和已确认大纲，为每页补充展示内容。',
    '只输出 JSON。',
    '格式: {"deck_title":"...","slides":[{"index":1,"title":"...","format":"title-bullets","bullets":["..."],"body":""}] }',
    '要求:',
    '- format 只能使用 title-bullets, title-body, summary',
    '- 大多数页面用 title-bullets',
    '- bullets 保持 3 到 5 条，短句化',
    '- 不要改动已确认大纲顺序',
    '',
    '已确认大纲:',
    JSON.stringify(outline, null, 2),
    '',
    '原始内容摘要:',
    JSON.stringify(source, null, 2)
  ].join('\n');
};

const requestKimiPlan = async (markdown) => {
  try {
    const payload = await callKimiJson({
      prompt: buildPlanPrompt(markdown),
      timeoutMs: 6000,
      maxTokens: 500
    });
    return { outline: normalizeOutline(payload), mode: 'llm' };
  } catch (error) {
    console.error('[plan-fallback]', error?.message || error);
    return { outline: buildHeuristicOutline(markdown), mode: 'fallback' };
  }
};

const requestKimiExpand = async (markdown, outline) => {
  try {
    const payload = await callKimiJson({
      prompt: buildExpandPrompt({ markdown, outline }),
      timeoutMs: 12000,
      maxTokens: 900
    });
    return { expanded: normalizeExpanded(payload), mode: 'llm' };
  } catch (error) {
    console.error('[expand-fallback]', error?.message || error);
    return { expanded: buildHeuristicExpanded(markdown, outline), mode: 'fallback' };
  }
};

const buildExpandCacheKey = (markdown, outline) => getCacheKey(JSON.stringify({ markdown, outline }));

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${host}:${port}`);
  let pathname = decodeURIComponent(requestUrl.pathname);

  if (request.method === 'POST' && pathname === '/api/plan-stream') {
    const startedAt = Date.now();
    openSse(response);

    try {
      const body = await readJsonBody(request);
      const markdown = String(body?.markdown || '').trim();
      if (!markdown) {
        sendSseEvent(response, 'error', { error: 'Markdown is required' });
        response.end();
        return;
      }

      sendSseEvent(response, 'status', { stage: 'analyzing', message: '正在分析 Markdown 结构...' });
      const clarification = buildClarification(markdown);
      if (clarification) {
        console.error('[plan-clarify]', `ms=${Date.now() - startedAt}`);
        sendSseEvent(response, 'final', clarification);
        response.end();
        return;
      }

      const cacheKey = getCacheKey(markdown);
      const cached = planCache.get(cacheKey);
      if (cached) {
        planCache.delete(cacheKey);
        planCache.set(cacheKey, cached);
        console.error('[plan-ok]', 'mode=cache', `ms=${Date.now() - startedAt}`);
        sendSseEvent(response, 'status', { stage: 'cache', message: '命中缓存，直接返回大纲...' });
        sendSseEvent(response, 'final', { ...cached.payload, mode: 'cache' });
        response.end();
        return;
      }

      sendSseEvent(response, 'status', { stage: 'planning', message: '正在规划页顺序与标题...' });
      const { outline, mode } = await requestKimiPlan(markdown);
      setPlanCache(cacheKey, { payload: outline });
      console.error('[plan-ok]', `mode=${mode}`, `ms=${Date.now() - startedAt}`);
      if (mode === 'fallback') {
        sendSseEvent(response, 'status', { stage: 'fallback', message: '模型较慢，已切换快速模式...' });
      }
      sendSseEvent(response, 'final', { ...outline, mode });
    } catch (error) {
      console.error('[plan-error]', error?.message || error, `ms=${Date.now() - startedAt}`);
      sendSseEvent(response, 'error', { error: error.message || 'Planning failed' });
    } finally {
      response.end();
    }
    return;
  }

  if (request.method === 'POST' && pathname === '/api/plan') {
    const startedAt = Date.now();
    try {
      const body = await readJsonBody(request);
      const markdown = String(body?.markdown || '').trim();
      if (!markdown) {
        sendJson(response, 400, { error: 'Markdown is required' });
        return;
      }

      const clarification = buildClarification(markdown);
      if (clarification) {
        console.error('[plan-clarify]', `ms=${Date.now() - startedAt}`);
        sendJson(response, 200, clarification);
        return;
      }

      const cacheKey = getCacheKey(markdown);
      const cached = planCache.get(cacheKey);
      if (cached) {
        planCache.delete(cacheKey);
        planCache.set(cacheKey, cached);
        console.error('[plan-ok]', 'mode=cache', `ms=${Date.now() - startedAt}`);
        sendJson(response, 200, { ...cached.payload, mode: 'cache' });
        return;
      }

      const { outline, mode } = await requestKimiPlan(markdown);
      setPlanCache(cacheKey, { payload: outline });
      console.error('[plan-ok]', `mode=${mode}`, `ms=${Date.now() - startedAt}`);
      sendJson(response, 200, { ...outline, mode });
    } catch (error) {
      console.error('[plan-error]', error?.message || error, `ms=${Date.now() - startedAt}`);
      sendJson(response, 500, { error: error.message || 'Planning failed' });
    }
    return;
  }

  if (request.method === 'POST' && pathname === '/api/expand-stream') {
    const startedAt = Date.now();
    openSse(response);

    try {
      const body = await readJsonBody(request);
      const markdown = String(body?.markdown || '').trim();
      const outline = body?.outline;
      if (!markdown) {
        sendSseEvent(response, 'error', { error: 'Markdown is required' });
        response.end();
        return;
      }
      if (!outline || !Array.isArray(outline?.slides) || !outline.slides.length) {
        sendSseEvent(response, 'error', { error: 'Confirmed outline is required' });
        response.end();
        return;
      }

      sendSseEvent(response, 'status', { stage: 'expanding', message: '正在补全每页展示内容...' });
      const expandKey = buildExpandCacheKey(markdown, outline);
      const cached = expandCache.get(expandKey);
      if (cached) {
        expandCache.delete(expandKey);
        expandCache.set(expandKey, cached);
        console.error('[expand-ok]', 'mode=cache', `ms=${Date.now() - startedAt}`);
        sendSseEvent(response, 'status', { stage: 'cache', message: '命中缓存，直接返回展示内容...' });
        sendSseEvent(response, 'final', { ...cached.payload, mode: 'cache' });
        response.end();
        return;
      }

      sendSseEvent(response, 'status', { stage: 'structuring', message: '正在压缩要点并组织页面...' });
      const { expanded, mode } = await requestKimiExpand(markdown, outline);
      setExpandCache(expandKey, { payload: expanded });
      console.error('[expand-ok]', `mode=${mode}`, `ms=${Date.now() - startedAt}`);
      if (mode === 'fallback') {
        sendSseEvent(response, 'status', { stage: 'fallback', message: '模型较慢，已切换快速模式...' });
      } else {
        sendSseEvent(response, 'status', { stage: 'render_ready', message: '展示内容已准备完成，正在进入模板预览...' });
      }
      sendSseEvent(response, 'final', { ...expanded, mode });
    } catch (error) {
      console.error('[expand-error]', error?.message || error, `ms=${Date.now() - startedAt}`);
      sendSseEvent(response, 'error', { error: error.message || 'Expansion failed' });
    } finally {
      response.end();
    }
    return;
  }

  if (request.method === 'POST' && pathname === '/api/expand') {
    const startedAt = Date.now();
    try {
      const body = await readJsonBody(request);
      const markdown = String(body?.markdown || '').trim();
      const outline = body?.outline;
      if (!markdown) {
        sendJson(response, 400, { error: 'Markdown is required' });
        return;
      }
      if (!outline || !Array.isArray(outline?.slides) || !outline.slides.length) {
        sendJson(response, 400, { error: 'Confirmed outline is required' });
        return;
      }

      const expandKey = buildExpandCacheKey(markdown, outline);
      const cached = expandCache.get(expandKey);
      if (cached) {
        expandCache.delete(expandKey);
        expandCache.set(expandKey, cached);
        console.error('[expand-ok]', 'mode=cache', `ms=${Date.now() - startedAt}`);
        sendJson(response, 200, { ...cached.payload, mode: 'cache' });
        return;
      }

      const { expanded, mode } = await requestKimiExpand(markdown, outline);
      setExpandCache(expandKey, { payload: expanded });
      console.error('[expand-ok]', `mode=${mode}`, `ms=${Date.now() - startedAt}`);
      sendJson(response, 200, { ...expanded, mode });
    } catch (error) {
      console.error('[expand-error]', error?.message || error, `ms=${Date.now() - startedAt}`);
      sendJson(response, 500, { error: error.message || 'Expansion failed' });
    }
    return;
  }

  if (pathname === '/') {
    pathname = '/studio/index.html';
  }

  const normalizedPath = path.normalize(pathname).replace(/^([.][.][/\\])+/, '');
  let filePath = path.join(rootDir, normalizedPath);

  if (!filePath.startsWith(rootDir)) {
    sendNotFound(response);
    return;
  }

  if (!existsSync(filePath)) {
    sendNotFound(response);
    return;
  }

  const fileStat = await stat(filePath);
  if (fileStat.isDirectory()) {
    const indexPath = path.join(filePath, 'index.html');
    if (!existsSync(indexPath)) {
      sendNotFound(response);
      return;
    }
    filePath = indexPath;
  }

  sendFile(response, filePath);
});

server.listen(port, host, () => {
  process.stdout.write(`Studio running at http://${host}:${port}\n`);
});
