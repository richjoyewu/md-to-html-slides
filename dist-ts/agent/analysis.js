import { preprocessMarkdown } from './preprocess.js';
// 轻量 Analyzer：先识别输入形态，再决定 Planner 应该保守还是激进重写。
const detectContentType = (source) => {
    const joined = [source.deck_title, ...source.sections.map((section) => [section.title, ...section.points].join(' '))].join(' ').toLowerCase();
    if (/(课程|教学|本节|学习|课时)/.test(joined))
        return 'course';
    if (/(汇报|结论|建议|指标|分析)/.test(joined))
        return 'report';
    if (/(故事|经历|转折|结局)/.test(joined))
        return 'story';
    if (/(产品|方案|价值|优势|客户|增长)/.test(joined))
        return 'pitch';
    return 'general';
};
const detectInputShape = (source, markdown) => {
    const raw = String(markdown || '');
    const explicitSections = (raw.match(/^##\s+/gm) || []).length;
    const explicitBullets = (raw.match(/^[-*+]\s+/gm) || []).length;
    const sectionCount = source.sections.length;
    const avgPoints = sectionCount
        ? source.sections.reduce((sum, section) => sum + section.points.length, 0) / sectionCount
        : 0;
    if (explicitSections >= 2 || (sectionCount >= 3 && explicitBullets >= 3 && avgPoints <= 3))
        return 'slide_like';
    if (explicitSections === 0 && explicitBullets <= 2)
        return 'document_like';
    if (avgPoints >= 4)
        return 'document_like';
    return 'notes_like';
};
const detectDensity = (source) => {
    const pointCount = source.sections.reduce((sum, section) => sum + section.points.length, 0);
    const rawLength = source.raw_excerpt.length;
    if (pointCount >= 18 || rawLength >= 1800)
        return 'high';
    if (pointCount >= 8 || rawLength >= 900)
        return 'medium';
    return 'low';
};
const detectRoughness = (source, markdown, inputShape, density) => {
    const totalPoints = source.sections.reduce((sum, section) => sum + section.points.length, 0);
    const avgPointLength = totalPoints
        ? source.sections.reduce((sum, section) => sum + section.points.join(' ').length, 0) / totalPoints
        : source.raw_excerpt.length;
    const genericTitles = source.sections.filter((section) => /^(内容|说明|介绍|问题|总结|补充|部分|场景|第[0-9一二三四五六七八九十]+页)$/i.test(section.title)).length;
    const raw = String(markdown || '');
    const explicitSections = (raw.match(/^##\s+/gm) || []).length;
    const explicitBullets = (raw.match(/^[-*+]\s+/gm) || []).length;
    const hasLooseSentenceStyle = /我想|然后|比如|例如|还要|也许|可以/.test(raw);
    if (explicitSections === 0 && explicitBullets <= 2 && hasLooseSentenceStyle)
        return 'very_rough';
    if (inputShape === 'notes_like' || genericTitles >= 2 || avgPointLength >= 40)
        return 'very_rough';
    if (inputShape === 'document_like' || density === 'high' || avgPointLength >= 26)
        return 'rough';
    return 'clean';
};
const selectRewriteStrategy = (roughness, inputShape) => {
    if (roughness === 'very_rough')
        return 'aggressive_rewrite';
    if (roughness === 'rough' || inputShape === 'document_like')
        return 'light_rewrite';
    return 'preserve';
};
const suggestSlideCount = (source, density) => {
    const base = Math.max(4, Math.min(10, source.sections.length || 4));
    if (density === 'high')
        return Math.min(10, base + 2);
    if (density === 'low')
        return Math.max(4, base - 1);
    return base;
};
// 不同内容类型走不同规划策略，让 Planner 真正分流。
export const buildPlanningProfile = (analysis) => {
    const commonRules = [
        '一页只讲一个核心点',
        '标题使用上屏短标题，不复述原文小节名',
        '先给结构，再给内容，不要把整段解释搬上屏'
    ];
    if (analysis.content_type === 'course') {
        return {
            narrative: '按知识学习顺序组织页面，优先保证概念定义、对比、总结的教学节奏。',
            emphasis: ['概念讲清楚', '循序渐进', '最后有总结'],
            pageTypes: ['define', 'compare', 'example', 'summary'],
            rules: [...commonRules, '优先保留教学主线，避免跳跃式结构', '最后一页尽量做本节总结']
        };
    }
    if (analysis.content_type === 'report') {
        return {
            narrative: '按结论、分析、建议的顺序组织页面，强调判断和行动建议。',
            emphasis: ['结论先行', '结构严谨', '建议明确'],
            pageTypes: ['summary', 'explain', 'compare', 'process'],
            rules: [...commonRules, '优先把结论放前面', '避免教学腔和口语化表达']
        };
    }
    if (analysis.content_type === 'pitch') {
        return {
            narrative: '按问题、价值、方案、优势的顺序组织页面，强调吸引力和说服力。',
            emphasis: ['问题钩子', '价值表达', '方案优势'],
            pageTypes: ['define', 'example', 'compare', 'cta'],
            rules: [...commonRules, '标题更有冲击力', '优先突出价值而不是细节说明']
        };
    }
    if (analysis.content_type === 'story') {
        return {
            narrative: '按叙事推进组织页面，突出转折、冲突和结果。',
            emphasis: ['叙事节奏', '转折', '结果'],
            pageTypes: ['define', 'example', 'process', 'summary'],
            rules: [...commonRules, '保留时间顺序或事件推进感', '避免把故事拆成过于抽象的概念页']
        };
    }
    return {
        narrative: '按主题聚类和理解顺序组织页面，优先保证结构清楚。',
        emphasis: ['结构清楚', '信息可读', '结尾收束'],
        pageTypes: ['define', 'explain', 'example', 'summary'],
        rules: [...commonRules, '信息不足时优先补结构，不要硬做复杂风格']
    };
};
// 总结输入特征，提供给 Planner 和 Clarification 共同决策。
export const analyzeMarkdown = (markdown) => {
    const source = preprocessMarkdown(markdown);
    const contentType = detectContentType(source);
    const inputShape = detectInputShape(source, markdown);
    const density = detectDensity(source);
    const roughness = detectRoughness(source, markdown, inputShape, density);
    const rewriteStrategy = selectRewriteStrategy(roughness, inputShape);
    const suggestedSlideCount = suggestSlideCount(source, density);
    const notes = [];
    if (inputShape === 'document_like')
        notes.push('contains longer sections that should be compressed into slide points');
    if (inputShape === 'notes_like')
        notes.push('contains rough notes that may need title normalization');
    if (density === 'high')
        notes.push('content density is high; split overloaded sections rather than keeping long bullets');
    if (roughness === 'rough')
        notes.push('rewrite slide titles and shorten explanatory sentences before presenting them');
    if (roughness === 'very_rough')
        notes.push('treat this as draft material: infer structure, fill missing transitions, and rewrite aggressively');
    if (contentType === 'course')
        notes.push('preserve teaching sequence and end with a concise summary slide');
    if (contentType === 'report')
        notes.push('keep conclusion-oriented titles and analytical structure');
    if (contentType === 'pitch')
        notes.push('surface the problem-value-solution arc instead of mirroring the original wording');
    return {
        content_type: contentType,
        input_shape: inputShape,
        density,
        roughness,
        rewrite_strategy: rewriteStrategy,
        suggested_slide_count: suggestedSlideCount,
        needs_rewrite: rewriteStrategy !== 'preserve',
        notes
    };
};
