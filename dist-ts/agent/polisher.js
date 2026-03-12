const compactText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const compactTitle = (value) => {
    const cleaned = compactText(value)
        .replace(/^[0-9０-９]+[.、\-:]\s*/, '')
        .replace(/[✨🧠🤖🦁📌📘📊🔥]+/g, '')
        .trim();
    return cleaned.slice(0, 24).trim() || '未命名页面';
};
const dedupePoints = (points) => {
    const seen = new Set();
    const normalized = [];
    for (const point of points.map(compactText).filter(Boolean)) {
        const key = point.toLowerCase();
        if (seen.has(key))
            continue;
        seen.add(key);
        normalized.push(point);
    }
    return normalized;
};
const splitTitle = (title) => {
    const cleaned = compactTitle(title);
    return cleaned.endsWith('（续）') ? { base: cleaned.replace(/（续）$/, '').trim() } : { base: cleaned };
};
const pointOverlapRatio = (left, right) => {
    const a = new Set(left.map((item) => compactText(item).toLowerCase()).filter(Boolean));
    const b = new Set(right.map((item) => compactText(item).toLowerCase()).filter(Boolean));
    if (!a.size || !b.size)
        return 0;
    let overlap = 0;
    for (const item of a) {
        if (b.has(item))
            overlap += 1;
    }
    return overlap / Math.min(a.size, b.size);
};
const polishSlide = (slide) => {
    const detailPoints = dedupePoints(slide.detail_points.length ? slide.detail_points : slide.preview_points)
        .map((item) => item.slice(0, 42).trim())
        .slice(0, 6);
    const previewPoints = dedupePoints(slide.preview_points.length ? slide.preview_points : detailPoints)
        .slice(0, 3);
    return {
        ...slide,
        title: compactTitle(slide.title),
        summary: compactText(slide.summary).slice(0, 72),
        detail_points: detailPoints.length ? detailPoints : [compactText(slide.summary || '待补充')],
        preview_points: previewPoints.length ? previewPoints : detailPoints.slice(0, 3)
    };
};
const expandOverloadedSlides = (slides) => {
    const expanded = [];
    for (const slide of slides) {
        if (slide.detail_points.length <= 4) {
            expanded.push(slide);
            continue;
        }
        const { base } = splitTitle(slide.title);
        const firstPoints = slide.detail_points.slice(0, 3);
        const secondPoints = slide.detail_points.slice(3);
        expanded.push({
            ...slide,
            title: base,
            summary: slide.summary,
            detail_points: firstPoints,
            preview_points: firstPoints.slice(0, 3)
        });
        expanded.push({
            ...slide,
            title: `${base}（续）`,
            summary: slide.summary || `${base} 的补充内容`,
            detail_points: secondPoints,
            preview_points: secondPoints.slice(0, 3)
        });
    }
    return expanded;
};
const mergeThinSlides = (slides) => {
    const merged = [];
    for (const slide of slides) {
        const last = merged[merged.length - 1];
        const currentThin = slide.detail_points.length <= 1;
        const compatible = last && !last.title.endsWith('（续）') && last.detail_points.length <= 3 && slide.intent === last.intent;
        if (last && currentThin && compatible) {
            const nextPoints = dedupePoints([...last.detail_points, ...slide.detail_points]).slice(0, 5);
            last.detail_points = nextPoints;
            last.preview_points = nextPoints.slice(0, 3);
            last.summary = compactText(last.summary || slide.summary).slice(0, 72);
            continue;
        }
        merged.push({ ...slide });
    }
    return merged;
};
const reduceAdjacentOverlap = (slides) => {
    return slides.map((slide, index) => {
        if (index === 0)
            return { ...slide };
        const previous = slides[index - 1];
        const overlap = pointOverlapRatio(previous.detail_points, slide.detail_points);
        if (overlap < 0.67)
            return { ...slide };
        const filtered = slide.detail_points.filter((point) => {
            const normalized = compactText(point).toLowerCase();
            return !previous.detail_points.some((prev) => compactText(prev).toLowerCase() === normalized);
        });
        const nextPoints = filtered.length ? filtered : slide.detail_points.slice(0, 2);
        return {
            ...slide,
            detail_points: nextPoints.slice(0, 5),
            preview_points: nextPoints.slice(0, 3),
            summary: compactText(slide.summary || nextPoints[0] || '').slice(0, 72)
        };
    });
};
const reorderSummarySlides = (slides) => {
    const normalSlides = slides.filter((slide) => slide.intent !== 'summary');
    const summarySlides = slides.filter((slide) => slide.intent === 'summary');
    return [...normalSlides, ...summarySlides];
};
const reindexSlides = (slides) => slides.map((slide, index) => ({ ...slide, index: index + 1 }));
// Polisher：在用户确认前做最后一层稳定化，避免明显过长、重复、空内容直接暴露给用户。
export const polishOutline = (outline) => {
    const polished = outline.slides
        .map(polishSlide)
        .filter((slide) => slide.title);
    const expanded = expandOverloadedSlides(polished);
    const merged = mergeThinSlides(expanded);
    const deOverlapped = reduceAdjacentOverlap(merged);
    const reordered = reorderSummarySlides(deOverlapped);
    return {
        deck_title: compactText(outline.deck_title || 'Untitled Deck') || 'Untitled Deck',
        slides: reindexSlides(reordered).slice(0, 16)
    };
};
