import { preprocessMarkdown } from './preprocess.js';
const compact = (value) => String(value || '').replace(/\s+/g, ' ').trim();
// 当模型过慢或不可用时，使用本地快速 fallback 生成可用大纲。
export const buildHeuristicOutline = (markdown) => {
    const source = preprocessMarkdown(markdown);
    const slides = source.sections.length
        ? source.sections.map((section, index) => ({
            index: index + 1,
            title: section.title,
            summary: section.points[0] || `${section.title} 的核心内容`,
            preview_points: section.points.filter(Boolean).slice(0, 3),
            detail_points: section.points.filter(Boolean).slice(0, 5),
            intent: (index === 0 ? 'define' : 'explain')
        }))
        : [{ index: 1, title: source.deck_title, summary: '内容概览', preview_points: ['内容概览'], detail_points: ['内容概览'], intent: 'summary' }];
    return {
        deck_title: source.deck_title,
        slides: slides.slice(0, 10)
    };
};
// 本地扩展 fallback：优先复用已确认大纲中的 detail_points，避免粗糙输入时匹配失败。
export const buildHeuristicExpanded = (markdown, outline) => {
    const source = preprocessMarkdown(markdown);
    const sectionMap = new Map(source.sections.map((section) => [section.title, section.points]));
    return {
        deck_title: outline.deck_title || source.deck_title,
        slides: outline.slides
            .map((slide, index) => {
            const mappedPoints = sectionMap.get(slide.title) || [];
            const basePoints = slide.detail_points.length ? slide.detail_points : slide.preview_points;
            const bullets = (basePoints.length ? basePoints : mappedPoints)
                .map((item) => compact(item))
                .filter(Boolean)
                .slice(0, 5);
            const summaryText = compact(slide.summary || bullets[0] || '');
            const format = ((slide.intent === 'summary' || bullets.length <= 1) ? 'title-body' : 'title-bullets');
            return {
                index: Number(slide.index || index + 1),
                title: slide.title,
                format,
                bullets: format === 'title-bullets' ? bullets : [],
                body: format === 'title-body' ? (summaryText || bullets.slice(0, 2).join('；')) : ''
            };
        })
            .filter((slide) => slide.title)
    };
};
