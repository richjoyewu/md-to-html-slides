#!/usr/bin/env node

import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { createCorePipeline, loadDotEnv, resolveProviderRuntime } from '../agent/pipeline.js';
import type { OutlineResult, PlanContext } from '../agent/types.js';
import { normalizeOutline, normalizePlanContext } from '../shared/core.js';

const rootDir = process.cwd();
const host = '127.0.0.1';
const port = Number(process.env.PORT || 4173);

loadDotEnv(rootDir);

const runtime = resolveProviderRuntime(process.env);
const pipeline = createCorePipeline({ provider: runtime.provider });

class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

const MIME_TYPES = new Map<string, string>([
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

const sendText = (response: ServerResponse, statusCode: number, message: string): void => {
  response.writeHead(statusCode, { 'content-type': 'text/plain; charset=utf-8' });
  response.end(message);
};

const sendJson = (response: ServerResponse, statusCode: number, payload: unknown): void => {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
};

const openSse = (response: ServerResponse): void => {
  response.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive'
  });
};

const sendSseEvent = (response: ServerResponse, event: string, payload: unknown): void => {
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const sendNotFound = (response: ServerResponse): void => sendText(response, 404, 'Not found');

const sendFile = (response: ServerResponse, filePath: string): void => {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES.get(extension) || 'application/octet-stream';
  response.writeHead(200, { 'content-type': contentType });
  createReadStream(filePath).pipe(response);
};

const readJsonBody = async (request: IncomingMessage): Promise<Record<string, unknown>> => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
};

const parsePlanRequest = (body: Record<string, unknown>): { markdown: string; context: PlanContext } => {
  const markdown = String(body?.markdown || '').trim();
  if (!markdown) throw new HttpError(400, 'Markdown is required');
  const context = normalizePlanContext(body?.context) as PlanContext;
  return { markdown, context };
};

const parseExpandRequest = (
  body: Record<string, unknown>
): { markdown: string; outline: OutlineResult; context: PlanContext } => {
  const markdown = String(body?.markdown || '').trim();
  if (!markdown) throw new HttpError(400, 'Markdown is required');

  const rawOutline = body?.outline;
  if (!rawOutline || !Array.isArray((rawOutline as { slides?: unknown }).slides) || !(rawOutline as { slides: unknown[] }).slides.length) {
    throw new HttpError(400, 'Confirmed outline is required');
  }

  return {
    markdown,
    outline: normalizeOutline(rawOutline) as OutlineResult,
    context: normalizePlanContext(body?.context) as PlanContext
  };
};

const executePlan = async (body: Record<string, unknown>) => {
  const { markdown, context } = parsePlanRequest(body);
  const result = await pipeline.plan(markdown, context);
  if (result.kind === 'clarification') {
    return { ...result.payload, mode: result.mode, source: result.source };
  }
  return { ...result.payload, mode: result.mode };
};

const executeExpand = async (body: Record<string, unknown>) => {
  const { markdown, outline, context } = parseExpandRequest(body);
  const result = await pipeline.expand(markdown, outline, context);
  return { ...result.payload, mode: result.mode };
};

const sendPipelineStatus = (
  response: ServerResponse,
  mode: unknown,
  messages: { cache: string; fallback: string; llm: string }
): void => {
  if (mode === 'cache') {
    sendSseEvent(response, 'status', { stage: 'cache', message: messages.cache });
    return;
  }
  if (mode === 'fallback') {
    sendSseEvent(response, 'status', { stage: 'fallback', message: messages.fallback });
    return;
  }
  sendSseEvent(response, 'status', { stage: 'completed', message: messages.llm });
};

const sendPipelineError = (response: ServerResponse, error: unknown): void => {
  if (error instanceof HttpError) {
    sendSseEvent(response, 'error', { error: error.message, statusCode: error.statusCode });
    return;
  }
  sendSseEvent(response, 'error', { error: (error as Error)?.message || 'Request failed' });
};

const handlePlanStream = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
  const startedAt = Date.now();
  openSse(response);

  try {
    const body = await readJsonBody(request);
    sendSseEvent(response, 'status', { stage: 'planning', message: '正在分析并生成大纲...' });
    const payload = await executePlan(body);
    console.error('[plan-ok]', `mode=${String(payload.mode || 'clarification')}`, `ms=${Date.now() - startedAt}`);
    if (!('kind' in payload) || payload.kind !== 'clarification') {
      sendPipelineStatus(response, payload.mode, {
        cache: '命中缓存，直接返回大纲...',
        fallback: '模型较慢，已切换快速模式...',
        llm: '大纲已准备完成，请确认结构。'
      });
    }
    sendSseEvent(response, 'final', payload);
  } catch (error) {
    console.error('[plan-error]', (error as Error)?.message || error, `ms=${Date.now() - startedAt}`);
    sendPipelineError(response, error);
  } finally {
    response.end();
  }
};

const handlePlanJson = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
  const startedAt = Date.now();
  try {
    const body = await readJsonBody(request);
    const payload = await executePlan(body);
    console.error('[plan-ok]', `mode=${String(payload.mode || 'clarification')}`, `ms=${Date.now() - startedAt}`);
    sendJson(response, 200, payload);
  } catch (error) {
    console.error('[plan-error]', (error as Error)?.message || error, `ms=${Date.now() - startedAt}`);
    if (error instanceof HttpError) {
      sendJson(response, error.statusCode, { error: error.message });
      return;
    }
    sendJson(response, 500, { error: (error as Error)?.message || 'Planning failed' });
  }
};

const handleExpandStream = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
  const startedAt = Date.now();
  openSse(response);

  try {
    const body = await readJsonBody(request);
    sendSseEvent(response, 'status', { stage: 'expanding', message: '正在补全每页展示内容...' });
    const payload = await executeExpand(body);
    console.error('[expand-ok]', `mode=${String(payload.mode || 'unknown')}`, `ms=${Date.now() - startedAt}`);
    sendPipelineStatus(response, payload.mode, {
      cache: '命中缓存，直接返回展示内容...',
      fallback: '模型较慢，已切换快速模式...',
      llm: '展示内容已准备完成，正在进入模板预览...'
    });
    sendSseEvent(response, 'final', payload);
  } catch (error) {
    console.error('[expand-error]', (error as Error)?.message || error, `ms=${Date.now() - startedAt}`);
    sendPipelineError(response, error);
  } finally {
    response.end();
  }
};

const handleExpandJson = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
  const startedAt = Date.now();
  try {
    const body = await readJsonBody(request);
    const payload = await executeExpand(body);
    console.error('[expand-ok]', `mode=${String(payload.mode || 'unknown')}`, `ms=${Date.now() - startedAt}`);
    sendJson(response, 200, payload);
  } catch (error) {
    console.error('[expand-error]', (error as Error)?.message || error, `ms=${Date.now() - startedAt}`);
    if (error instanceof HttpError) {
      sendJson(response, error.statusCode, { error: error.message });
      return;
    }
    sendJson(response, 500, { error: (error as Error)?.message || 'Expansion failed' });
  }
};

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${host}:${port}`);
  let pathname = decodeURIComponent(requestUrl.pathname);

  if (request.method === 'POST' && pathname === '/api/plan-stream') {
    await handlePlanStream(request, response);
    return;
  }

  if (request.method === 'POST' && pathname === '/api/plan') {
    await handlePlanJson(request, response);
    return;
  }

  if (request.method === 'POST' && pathname === '/api/expand-stream') {
    await handleExpandStream(request, response);
    return;
  }

  if (request.method === 'POST' && pathname === '/api/expand') {
    await handleExpandJson(request, response);
    return;
  }

  if (pathname === '/') pathname = '/studio/index.html';

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
  process.stdout.write(`Studio running at http://${host}:${port} (${runtime.description})\n`);
});
