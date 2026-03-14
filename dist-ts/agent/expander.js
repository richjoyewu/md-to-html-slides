import { analyzeMarkdown } from './analysis.js';
import { buildHeuristicExpanded } from './fallback.js';
import { normalizeExpanded } from './normalize.js';
import { buildExpandPrompt } from './prompt-builder.js';
import { callKimiJson } from './moonshot-client.js';
const compactSurface = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const splitClauses = (value) => compactSurface(value)
    .split(/[。！？；;：:\n]/)
    .flatMap((part) => part.split(/[，,、]/))
    .map((part) => part.trim())
    .filter((part) => part.length >= 4);
const toDisplayBullet = (value) => {
    const clauses = splitClauses(value);
    const picked = clauses.find((part) => part.length >= 6 && part.length <= 22) ?? clauses[0] ?? compactSurface(value);
    return picked.slice(0, 24).trim();
};
const toDisplayBody = (value, bullets) => {
    const direct = compactSurface(value);
    if (direct) {
        const picked = splitClauses(direct)[0] ?? direct;
        return picked.slice(0, 54).trim();
    }
    return bullets.slice(0, 2).join('；').slice(0, 54).trim();
};
const isDraftyBullet = (value) => {
    const text = compactSurface(value);
    return text.length > 28 || /可能|大概|比如|然后|后面|另外|顺便|我觉得|我想|可以先|先看/.test(text);
};
const polishSlide = (slide) => {
    const bullets = Array.from(new Set(slide.bullets.map(toDisplayBullet).filter(Boolean))).slice(0, 4);
    const body = toDisplayBody(slide.body, bullets);
    const format = bullets.length >= 2 ? 'title-bullets' : body ? 'title-body' : slide.format;
    return {
        ...slide,
        bullets,
        body,
        format,
    };
};
const polishExpanded = (expanded) => {
    const slides = expanded.slides.map(polishSlide);
    const reviewIssues = new Set(expanded.meta?.review_issues || []);
    const actionsTaken = new Set(expanded.meta?.actions_taken || []);
    if (slides.some((slide) => slide.bullets.some((bullet) => bullet.length > 22))) {
        reviewIssues.add('部分页面要点仍偏长，可继续压缩为更短的上屏句');
    }
    if (slides.some((slide) => slide.bullets.some(isDraftyBullet))) {
        reviewIssues.add('部分页面仍残留草稿腔，建议继续改写为结论式表达');
    }
    if (slides.some((slide) => slide.bullets.length < 2 && slide.format === 'title-bullets')) {
        reviewIssues.add('部分 bullet 页面要点偏少，可继续补强页面信息密度');
    }
    actionsTaken.add('expanded 输出已通过上屏表达压缩与结构校正');
    return {
        ...expanded,
        meta: {
            rewrite_quality: Math.max(expanded.meta?.rewrite_quality || 0.72, 0.78),
            tone: expanded.meta?.tone || 'presentation',
            review_issues: [...reviewIssues],
            actions_taken: [...actionsTaken]
        },
        slides
    };
};
// Expander 阶段在已确认大纲基础上补足可上屏内容，并保持大纲顺序稳定。
export const requestKimiExpand = async (config, markdown, outline) => {
    const analysis = analyzeMarkdown(markdown);
    try {
        const payload = await callKimiJson({
            config,
            prompt: buildExpandPrompt({ markdown, outline, analysis }),
            timeoutMs: 12000,
            maxTokens: 900
        });
        return { expanded: polishExpanded(normalizeExpanded(payload)), mode: 'llm' };
    }
    catch (error) {
        console.error('[expand-fallback]', error?.message || error);
        return { expanded: polishExpanded(buildHeuristicExpanded(markdown, outline)), mode: 'fallback' };
    }
};
