#!/usr/bin/env node
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { buildExpandCacheKey, getCacheKey } from '../agent/preprocess.js';
import { buildClarification } from '../agent/clarification.js';
import { requestKimiExpand } from '../agent/expander.js';
import { requestKimiPlan } from '../agent/planner.js';
const rootDir = process.cwd();
const host = '127.0.0.1';
const port = Number(process.env.PORT || 4173);
const loadDotEnv = () => {
    const envPath = path.join(rootDir, '.env');
    if (!existsSync(envPath))
        return;
    const content = readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#'))
            return;
        const separator = trimmed.indexOf('=');
        if (separator <= 0)
            return;
        const key = trimmed.slice(0, separator).trim();
        let value = trimmed.slice(separator + 1).trim();
        value = value.replace(/^['"]|['"]$/g, '');
        if (!(key in process.env))
            process.env[key] = value;
    });
};
loadDotEnv();
const kimiConfig = {
    apiKey: process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY || '',
    baseUrl: process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1',
    model: process.env.KIMI_MODEL || 'kimi-k2-5'
};
const planCache = new Map();
const expandCache = new Map();
const PLAN_CACHE_LIMIT = 50;
const EXPAND_CACHE_LIMIT = 50;
const setPlanCache = (key, value) => {
    if (planCache.has(key))
        planCache.delete(key);
    planCache.set(key, { ...value, cached_at: Date.now() });
    if (planCache.size > PLAN_CACHE_LIMIT) {
        planCache.delete(planCache.keys().next().value);
    }
};
const setExpandCache = (key, value) => {
    if (expandCache.has(key))
        expandCache.delete(key);
    expandCache.set(key, { ...value, cached_at: Date.now() });
    if (expandCache.size > EXPAND_CACHE_LIMIT) {
        expandCache.delete(expandCache.keys().next().value);
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
    for await (const chunk of request)
        chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8');
    return raw ? JSON.parse(raw) : {};
};
const normalizePlanContext = (value) => {
    const source = (value && typeof value === 'object') ? value : {};
    const answers = (source.answers && typeof source.answers === 'object') ? source.answers : {};
    return {
        answers: Object.fromEntries(Object.entries(answers)
            .map(([key, raw]) => [key, String(raw || '').trim()])
            .filter(([, raw]) => raw))
    };
};
const server = createServer(async (request, response) => {
    const requestUrl = new URL(request.url || '/', `http://${host}:${port}`);
    let pathname = decodeURIComponent(requestUrl.pathname);
    if (request.method === 'POST' && pathname === '/api/plan-stream') {
        const startedAt = Date.now();
        openSse(response);
        try {
            const body = await readJsonBody(request);
            const markdown = String(body?.markdown || '').trim();
            const context = normalizePlanContext(body?.context);
            if (!markdown) {
                sendSseEvent(response, 'error', { error: 'Markdown is required' });
                response.end();
                return;
            }
            sendSseEvent(response, 'status', { stage: 'analyzing', message: '正在分析 Markdown 结构...' });
            const clarification = buildClarification(markdown, context);
            if (clarification) {
                console.error('[plan-clarify]', `ms=${Date.now() - startedAt}`);
                sendSseEvent(response, 'final', clarification);
                response.end();
                return;
            }
            const cacheKey = getCacheKey(JSON.stringify({ markdown, context }));
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
            const { outline, mode } = await requestKimiPlan(kimiConfig, markdown, context);
            setPlanCache(cacheKey, { payload: outline });
            console.error('[plan-ok]', `mode=${mode}`, `ms=${Date.now() - startedAt}`);
            if (mode === 'fallback') {
                sendSseEvent(response, 'status', { stage: 'fallback', message: '模型较慢，已切换快速模式...' });
            }
            sendSseEvent(response, 'final', { ...outline, mode });
        }
        catch (error) {
            console.error('[plan-error]', error?.message || error, `ms=${Date.now() - startedAt}`);
            sendSseEvent(response, 'error', { error: error?.message || 'Planning failed' });
        }
        finally {
            response.end();
        }
        return;
    }
    if (request.method === 'POST' && pathname === '/api/plan') {
        const startedAt = Date.now();
        try {
            const body = await readJsonBody(request);
            const markdown = String(body?.markdown || '').trim();
            const context = normalizePlanContext(body?.context);
            if (!markdown) {
                sendJson(response, 400, { error: 'Markdown is required' });
                return;
            }
            const clarification = buildClarification(markdown, context);
            if (clarification) {
                console.error('[plan-clarify]', `ms=${Date.now() - startedAt}`);
                sendJson(response, 200, clarification);
                return;
            }
            const cacheKey = getCacheKey(JSON.stringify({ markdown, context }));
            const cached = planCache.get(cacheKey);
            if (cached) {
                planCache.delete(cacheKey);
                planCache.set(cacheKey, cached);
                console.error('[plan-ok]', 'mode=cache', `ms=${Date.now() - startedAt}`);
                sendJson(response, 200, { ...cached.payload, mode: 'cache' });
                return;
            }
            const { outline, mode } = await requestKimiPlan(kimiConfig, markdown, context);
            setPlanCache(cacheKey, { payload: outline });
            console.error('[plan-ok]', `mode=${mode}`, `ms=${Date.now() - startedAt}`);
            sendJson(response, 200, { ...outline, mode });
        }
        catch (error) {
            console.error('[plan-error]', error?.message || error, `ms=${Date.now() - startedAt}`);
            sendJson(response, 500, { error: error?.message || 'Planning failed' });
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
            if (!outline || !Array.isArray(outline.slides) || !outline.slides.length) {
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
            const { expanded, mode } = await requestKimiExpand(kimiConfig, markdown, outline);
            setExpandCache(expandKey, { payload: expanded });
            console.error('[expand-ok]', `mode=${mode}`, `ms=${Date.now() - startedAt}`);
            if (mode === 'fallback') {
                sendSseEvent(response, 'status', { stage: 'fallback', message: '模型较慢，已切换快速模式...' });
            }
            else {
                sendSseEvent(response, 'status', { stage: 'render_ready', message: '展示内容已准备完成，正在进入模板预览...' });
            }
            sendSseEvent(response, 'final', { ...expanded, mode });
        }
        catch (error) {
            console.error('[expand-error]', error?.message || error, `ms=${Date.now() - startedAt}`);
            sendSseEvent(response, 'error', { error: error?.message || 'Expansion failed' });
        }
        finally {
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
            if (!outline || !Array.isArray(outline.slides) || !outline.slides.length) {
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
            const { expanded, mode } = await requestKimiExpand(kimiConfig, markdown, outline);
            setExpandCache(expandKey, { payload: expanded });
            console.error('[expand-ok]', `mode=${mode}`, `ms=${Date.now() - startedAt}`);
            sendJson(response, 200, { ...expanded, mode });
        }
        catch (error) {
            console.error('[expand-error]', error?.message || error, `ms=${Date.now() - startedAt}`);
            sendJson(response, 500, { error: error?.message || 'Expansion failed' });
        }
        return;
    }
    if (pathname === '/')
        pathname = '/studio/index.html';
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
