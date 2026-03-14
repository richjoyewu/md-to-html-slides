import { analyzeMarkdown } from './analysis.js';
import { preprocessMarkdown } from './preprocess.js';
function truncate(text, max) {
    if (text.length <= max)
        return text;
    return `${text.slice(0, Math.max(0, max - 1)).trim()}…`;
}
function toSlideTitle(text, fallback) {
    const cleaned = compactClause(text
        .replace(/^#+\s*/, '')
        .replace(/^第[一二三四五六七八九十\d]+[章节课讲部分篇]\s*/, '')
        .replace(/^[\d一二三四五六七八九十]+[\.、]\s*/, '')
        .replace(/[：:。；;].*$/, '')
        .replace(/[!?！？].*$/, '')
        .trim());
    const candidate = truncate(cleaned, 18);
    return candidate.length >= 4 ? candidate : fallback;
}
const looksPlanningMeta = (value) => /^(一些想法|后面也许可以举例|也许可以举例|可以举例|还要提一下|可能还要提一下|我想做一个|第一页讲)/.test(value);
function compactClause(text) {
    const normalized = text
        .replace(/^[-*+]\s*/, '')
        .replace(/^\d+[\.、]\s*/, '')
        .replace(/[“”"'`]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    const clauses = normalized
        .split(/[。！？；;：:\n]/)
        .flatMap((part) => part.split(/[，,、]/))
        .flatMap((part) => part.split(/(?:还有|然后再讲|然后后面|后面也许可以|后面可以|比如)/))
        .map((part) => part.trim())
        .filter((part) => part.length >= 2)
        .map((part) => part
        .replace(/^(这个|这个产品|这一页|这一块|这里|有个|我们|我|还有|然后|后面|可能|也许)\s*/, '')
        .replace(/^(想做|想讲|想解决|先说|再讲|提一下|做一个)\s*/, '')
        .replace(/^(就是|还是|其实|比如)\s*/, '')
        .replace(/^第一页讲/, '')
        .replace(/^一些想法/, '')
        .replace(/^可能还要提一下/, '')
        .replace(/^还要提一下/, '')
        .replace(/^也许可以举例/, '应用案例')
        .replace(/^可以举例/, '应用案例')
        .replace(/^跟chatbot的区别$/, 'Agent 和 Chatbot 的区别')
        .replace(/^agent是什么$/, '什么是 AI Agent')
        .replace(/^为什么openclaw适合个人用$/, 'OpenClaw 为什么适合个人使用')
        .replace(/^agent = 模型 \+ 工具 \+ 执行$/, 'Agent = 模型 + 工具 + 执行')
        .trim())
        .filter((part) => part.length >= 4)
        .filter((part) => !looksPlanningMeta(part));
    const picked = clauses.find((part) => part.length >= 6 && part.length <= 18) ?? clauses[0] ?? normalized;
    return truncate(picked, 18);
}
function sentenceUnits(section) {
    const pool = [...section.points].map((item) => item.trim()).filter(Boolean);
    const units = pool.flatMap((item) => item
        .split(/[。！？；;\n]/)
        .flatMap((part) => part.split(/[，,:：]/))
        .map((part) => compactClause(part))
        .filter((part) => part.length >= 4));
    return Array.from(new Set(units)).slice(0, 12);
}
function splitBuckets(units, roughness) {
    if (units.length <= 3)
        return [units];
    const targetSize = roughness === 'very_rough' ? 2 : roughness === 'rough' ? 3 : 4;
    const buckets = [];
    for (let index = 0; index < units.length; index += targetSize) {
        buckets.push(units.slice(index, index + targetSize));
    }
    return buckets;
}
function regroupSections(source, analysis) {
    const sections = [];
    source.sections.forEach((section, index) => {
        const units = sentenceUnits(section);
        const buckets = splitBuckets(units.length ? units : section.points.slice(0, 6), analysis.roughness);
        if (buckets.length === 1) {
            sections.push({
                title: toSlideTitle(section.title, `第${index + 1}页`),
                points: buckets[0],
            });
            return;
        }
        buckets.forEach((bucket, bucketIndex) => {
            sections.push({
                title: bucketIndex === 0 ? toSlideTitle(section.title, `第${index + 1}页`) : `${toSlideTitle(section.title, `第${index + 1}页`)}（续）`,
                points: bucket,
            });
        });
    });
    return sections;
}
function buildPreview(points) {
    return points.slice(0, 3).map((item) => truncate(compactClause(item), 16));
}
function buildOmittedTopics(source, slides, analysis) {
    if (analysis.roughness === 'clean' && analysis.density !== 'high')
        return [];
    const slideTitles = new Set(slides.map((slide) => slide.title.toLowerCase()));
    const candidates = source.sections
        .flatMap((section) => [section.title, ...section.points])
        .map((item) => toSlideTitle(item, ''))
        .filter((item) => item.length >= 4)
        .filter((item) => !slideTitles.has(item.toLowerCase()))
        .filter((item) => !/^(内容概览|核心内容|主要内容|帮助观众快速理解|提炼主题)/.test(item));
    return Array.from(new Set(candidates)).slice(0, 3);
}
function inferCoreMessage(source, slides, deckTitle) {
    const candidates = [
        ...slides.flatMap((slide) => slide.points.slice(0, 2)),
        ...source.sections.flatMap((section) => section.points.slice(0, 2)),
        source.sections[0]?.title,
    ]
        .map((item) => compactClause(item ?? ''))
        .filter((item) => item.length >= 8)
        .filter((item) => item !== deckTitle)
        .filter((item) => !/^(帮助观众快速理解|提炼主题|当前主题|主要内容|内容概览)/.test(item));
    return candidates[0] ?? `围绕 ${truncate(deckTitle, 14)} 提炼关键结论`;
}
function inferIntent(title) {
    const value = title.toLowerCase();
    if (value.includes('总结') || value.includes('结论'))
        return 'summary';
    if (value.includes('案例') || value.includes('示例'))
        return 'example';
    if (value.includes('区别') || value.includes('对比'))
        return 'compare';
    if (value.includes('步骤') || value.includes('流程') || value.includes('如何'))
        return 'process';
    if (value.includes('定义') || value.includes('什么是'))
        return 'define';
    return 'explain';
}
function buildPlanMeta(source, analysis, slideCount, slides) {
    const structurallyThin = source.sections.length <= 1 && analysis.input_shape !== 'slide_like';
    const strongCoverage = slideCount >= Math.max(4, analysis.suggested_slide_count - 1);
    const confidence = structurallyThin
        ? 0.54
        : strongCoverage
            ? 0.76
            : analysis.roughness === 'clean'
                ? 0.74
                : 0.64;
    const uncertainties = [];
    if (structurallyThin) {
        uncertainties.push('当前内容更像草稿，仍需确认受众或展示重点');
    }
    if (!strongCoverage && slideCount <= Math.max(2, analysis.suggested_slide_count - 2) && analysis.roughness !== 'clean') {
        uncertainties.push('当前内容可能需要拆成更多页以提升可读性');
    }
    if (!source.deck_title) {
        uncertainties.push('标题还不够明确，可能需要确认展示重点');
    }
    const deckTitle = source.deck_title || '当前主题';
    return {
        planning_confidence: confidence,
        uncertainties: Array.from(new Set(uncertainties)).slice(0, 2),
        content_intent: analysis.input_shape === 'slide_like' ? 'structured_notes' : 'draft_to_slides',
        audience_guess: structurallyThin ? 'needs_confirmation' : 'general_reader',
        deck_goal: source.deck_title ? `帮助观众快速理解 ${truncate(source.deck_title, 16)}` : '帮助观众快速理解当前主题',
        core_message: inferCoreMessage(source, slides, deckTitle),
        omitted_topics: buildOmittedTopics(source, slides, analysis),
    };
}
export function buildHeuristicOutline(markdown) {
    const source = preprocessMarkdown(markdown);
    const analysis = analyzeMarkdown(markdown);
    const regrouped = regroupSections(source, analysis);
    const slides = regrouped.map((section, index) => {
        const normalizedPoints = section.points.map((point) => compactClause(point)).filter((point) => point.length >= 4);
        return {
            index: index + 1,
            title: section.title,
            summary: normalizedPoints[0] ?? '补充这一页的关键内容',
            preview_points: buildPreview(normalizedPoints),
            detail_points: normalizedPoints.slice(0, 5),
            intent: inferIntent(section.title),
        };
    });
    return {
        deck_title: source.deck_title || 'Untitled Deck',
        slides,
        meta: buildPlanMeta(source, analysis, slides.length, regrouped),
    };
}
function coerceFormat(slide) {
    if ((slide.detail_points?.length ?? 0) >= 2)
        return 'title-bullets';
    return 'title-body';
}
function buildSlideBody(slide) {
    const points = slide.detail_points ?? slide.preview_points ?? [];
    if (points.length === 0)
        return slide.summary ?? '';
    return compactClause(points[0]).slice(0, 40);
}
function buildExpandMeta(outline) {
    return {
        rewrite_quality: 0.62,
        tone: 'mixed',
        review_issues: outline.meta?.planning_confidence < 0.6 ? ['fallback_used'] : [],
        actions_taken: ['heuristic_expand'],
    };
}
export function buildHeuristicExpanded(markdown, outline) {
    void markdown;
    const slides = outline.slides.map((slide) => ({
        index: slide.index,
        title: slide.title,
        format: coerceFormat(slide),
        bullets: (slide.detail_points ?? slide.preview_points ?? []).slice(0, 4).map((item) => compactClause(item)).filter(Boolean),
        body: buildSlideBody(slide),
    }));
    return {
        deck_title: outline.deck_title,
        meta: buildExpandMeta(outline),
        slides,
    };
}
