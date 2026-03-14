import { createHash } from 'node:crypto';
export const getCacheKey = (value) => createHash('sha1').update(String(value || '')).digest('hex');
const compactText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const inferDeckTitle = (markdown) => {
    const lines = String(markdown || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const explicit = (lines.find((line) => line.startsWith('# ')) || '').replace(/^#\s+/, '').trim();
    if (explicit)
        return explicit;
    const first = compactText(lines[0] || '');
    if (!first)
        return 'Untitled Deck';
    const normalized = first.replace(/[，。；：:].*$/, '').trim();
    return normalized.slice(0, 18).trim() || 'Untitled Deck';
};
// 把原始 Markdown 压成轻量 section 模型，尽量保留原始结构，不替 LLM 重组语义。
export const preprocessMarkdown = (markdown) => {
    const lines = String(markdown || '').split(/\r?\n/);
    const deckTitle = inferDeckTitle(markdown);
    const sections = [];
    let current = null;
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line)
            continue;
        if (line.startsWith('## ')) {
            if (current)
                sections.push(current);
            current = { title: line.replace(/^##\s+/, '').trim(), points: [] };
            continue;
        }
        if (!current)
            current = { title: deckTitle, points: [] };
        if (/^[-*+]\s+/.test(line)) {
            current.points.push(line.replace(/^[-*+]\s+/, '').trim());
        }
        else if (!/^#\s+/.test(line)) {
            current.points.push(line);
        }
    }
    if (current)
        sections.push(current);
    const normalizedSections = sections
        .filter((section) => section.title)
        .slice(0, 10)
        .map((section) => ({
        title: section.title,
        points: section.points.slice(0, 6)
    }));
    return {
        deck_title: deckTitle,
        sections: normalizedSections,
        raw_excerpt: String(markdown || '').slice(0, 2400)
    };
};
export const buildExpandCacheKey = (markdown, outline) => getCacheKey(JSON.stringify({ markdown, outline }));
