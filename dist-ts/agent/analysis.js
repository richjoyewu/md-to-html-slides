import { preprocessMarkdown } from './preprocess.js';
// 结构分析器：只提供输入的结构事实，不提前替 LLM 做语义分类。
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
const averageSentenceLength = (source) => {
    const points = source.sections.flatMap((section) => section.points).filter(Boolean);
    if (!points.length)
        return source.raw_excerpt.length;
    const totalLength = points.reduce((sum, point) => sum + String(point || '').trim().length, 0);
    return totalLength / points.length;
};
const detectRoughness = (source, markdown, inputShape, density, avgSentenceLength) => {
    const raw = String(markdown || '');
    const explicitSections = (raw.match(/^##\s+/gm) || []).length;
    const explicitBullets = (raw.match(/^[-*+]\s+/gm) || []).length;
    const sectionCount = source.sections.length;
    if (explicitSections === 0 && explicitBullets <= 2 && avgSentenceLength >= 28)
        return 'very_rough';
    if (inputShape === 'notes_like' || avgSentenceLength >= 40)
        return 'very_rough';
    if (sectionCount <= 1 && density !== 'low')
        return 'very_rough';
    if (inputShape === 'document_like' || density === 'high' || avgSentenceLength >= 26)
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
const suggestSlideCount = (source, density, roughness) => {
    const sectionCount = source.sections.length;
    const pointCount = source.sections.reduce((sum, section) => sum + section.points.length, 0);
    if (sectionCount <= 1) {
        if (roughness === 'very_rough')
            return Math.min(8, Math.max(4, Math.ceil(pointCount / 1.5)));
        if (density === 'high')
            return Math.min(8, Math.max(4, Math.ceil(pointCount / 2)));
    }
    const base = Math.max(4, Math.min(10, sectionCount || 4));
    if (density === 'high')
        return Math.min(10, base + 2);
    if (density === 'low' && roughness === 'clean')
        return Math.max(4, base - 1);
    return base;
};
export const analyzeMarkdown = (markdown) => {
    const source = preprocessMarkdown(markdown);
    const inputShape = detectInputShape(source, markdown);
    const density = detectDensity(source);
    const avgSentenceLen = averageSentenceLength(source);
    const roughness = detectRoughness(source, markdown, inputShape, density, avgSentenceLen);
    const rewriteStrategy = selectRewriteStrategy(roughness, inputShape);
    const suggestedSlideCount = suggestSlideCount(source, density, roughness);
    const notes = [];
    if (inputShape === 'document_like')
        notes.push('内容更像文稿而不是页面结构，需要先压缩再拆页');
    if (inputShape === 'notes_like')
        notes.push('内容更像零散笔记，需要先补结构再规划页面');
    if (density === 'high')
        notes.push('信息密度较高，应主动拆页，不要保留长列表');
    if (roughness === 'rough')
        notes.push('需要将说明文句式改成更适合演示的短标题与短要点');
    if (roughness === 'very_rough')
        notes.push('应把输入视为草稿素材，先提炼主线，再重组为线性页面');
    return {
        input_shape: inputShape,
        density,
        roughness,
        rewrite_strategy: rewriteStrategy,
        heading_depth: source.sections.length ? 2 : 1,
        section_count: source.sections.length,
        point_count: source.sections.reduce((sum, section) => sum + section.points.length, 0),
        avg_sentence_length: Number(avgSentenceLen.toFixed(2)),
        suggested_slide_count: suggestedSlideCount,
        needs_rewrite: rewriteStrategy !== 'preserve',
        notes
    };
};
