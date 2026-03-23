import { unified } from 'unified';
import remarkParse from 'remark-parse';

const compactText = (value = '') => String(value).replace(/\s+/g, ' ').trim();

const markdownProcessor = unified().use(remarkParse);

const createSentenceSegmenter = () => {
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
      return new Intl.Segmenter('zh', { granularity: 'sentence' });
    }
  } catch {
    return null;
  }
  return null;
};

const SENTENCE_SEGMENTER = createSentenceSegmenter();

const splitSentences = (text = '') => {
  const normalized = compactText(text);
  if (!normalized) return [];

  if (SENTENCE_SEGMENTER) {
    const sentences = Array.from(SENTENCE_SEGMENTER.segment(normalized), (entry) => compactText(entry.segment)).filter(Boolean);
    if (sentences.length) return sentences;
  }

  return normalized
    .split(/(?<=[。！？!?；;])\s*|(?<=\.)\s+(?=[A-Z0-9])/)
    .map((part) => compactText(part))
    .filter(Boolean);
};

const chunkSentences = (text = '', options = {}) => {
  const {
    maxChunkChars = 260,
    maxSentencesPerChunk = 4
  } = options;

  const sentences = splitSentences(text);
  if (!sentences.length) return [];

  const chunks = [];
  let current = [];
  let currentLength = 0;

  for (const sentence of sentences) {
    const nextLength = currentLength + sentence.length;
    if (current.length > 0 && (current.length >= maxSentencesPerChunk || nextLength > maxChunkChars)) {
      chunks.push(current.join(' ').trim());
      current = [];
      currentLength = 0;
    }
    current.push(sentence);
    currentLength += sentence.length;
  }

  if (current.length) chunks.push(current.join(' ').trim());
  return chunks.filter(Boolean);
};

const stringifyNode = (node) => {
  if (!node || typeof node !== 'object') return '';

  if (node.type === 'text' || node.type === 'inlineCode' || node.type === 'code' || node.type === 'html') {
    return compactText(node.value || '');
  }

  if (node.type === 'image') {
    return compactText(node.alt || node.title || '');
  }

  if (node.type === 'link' || node.type === 'strong' || node.type === 'emphasis' || node.type === 'delete' || node.type === 'paragraph' || node.type === 'heading' || node.type === 'blockquote' || node.type === 'listItem' || node.type === 'root') {
    return Array.isArray(node.children)
      ? node.children.map((child) => stringifyNode(child)).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
      : '';
  }

  if (node.type === 'list') {
    return Array.isArray(node.children)
      ? node.children.map((child) => stringifyNode(child)).filter(Boolean).join('\n')
      : '';
  }

  return Array.isArray(node.children)
    ? node.children.map((child) => stringifyNode(child)).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
    : '';
};

const parseMarkdownAst = (markdown = '') => markdownProcessor.parse(String(markdown || ''));

const sectionPointsFromNode = (node, options = {}) => {
  const {
    maxPointChars = 120,
    maxSentencesPerPoint = 2
  } = options;

  if (!node) return [];

  if (node.type === 'list') {
    return Array.isArray(node.children)
      ? node.children
          .map((child) => stringifyNode(child))
          .map((item) => compactText(item).slice(0, maxPointChars).trim())
          .filter(Boolean)
      : [];
  }

  const text = stringifyNode(node);
  if (!text) return [];

  return chunkSentences(text, {
    maxChunkChars: maxPointChars,
    maxSentencesPerChunk: maxSentencesPerPoint
  }).slice(0, 4);
};

const pushSection = (sections, section) => {
  if (!section || !compactText(section.title)) return;
  const points = (section.points || []).map((point) => compactText(point)).filter(Boolean);
  sections.push({
    title: compactText(section.title),
    points
  });
};

export const normalizeMarkdownLines = (markdown = '') =>
  String(markdown || '')
    .replace(/\r\n?/g, '\n')
    .split('\n');

export const inferDeckTitle = (markdown = '') => {
  const tree = parseMarkdownAst(markdown);
  const explicitHeading = Array.isArray(tree.children)
    ? tree.children.find((node) => node?.type === 'heading' && Number(node.depth) === 1)
    : null;
  const explicit = compactText(stringifyNode(explicitHeading));
  if (explicit) return explicit;

  const lines = normalizeMarkdownLines(markdown).map((line) => line.trim()).filter(Boolean);
  const first = compactText(lines[0] || '');
  if (!first) return 'Untitled Deck';

  const normalized = first.replace(/[，。；：:].*$/, '').trim();
  return normalized.slice(0, 18).trim() || 'Untitled Deck';
};

export const extractMarkdownSections = (markdown = '', options = {}) => {
  const {
    fallbackTitle = inferDeckTitle(markdown),
    maxSections = 10,
    maxPointsPerSection = 6
  } = options;

  const tree = parseMarkdownAst(markdown);
  const sections = [];
  let current = {
    title: fallbackTitle,
    points: []
  };

  for (const node of Array.isArray(tree.children) ? tree.children : []) {
    if (node?.type === 'heading' && Number(node.depth) >= 2) {
      pushSection(sections, current);
      current = {
        title: stringifyNode(node) || fallbackTitle,
        points: []
      };
      continue;
    }

    if (node?.type === 'heading' && Number(node.depth) === 1) {
      if (!compactText(current.title)) current.title = stringifyNode(node) || fallbackTitle;
      continue;
    }

    if (node?.type === 'thematicBreak') continue;

    const points = sectionPointsFromNode(node);
    if (points.length) current.points.push(...points);
  }

  pushSection(sections, current);

  return sections
    .filter((section) => section.title)
    .slice(0, maxSections)
    .map((section) => ({
      title: section.title,
      points: section.points.slice(0, maxPointsPerSection)
    }));
};

export const partitionMarkdownBlocks = (markdown = '', options = {}) => {
  const {
    maxBlocks = 24,
    maxChunkChars = 260,
    maxSentencesPerChunk = 4
  } = options;

  const tree = parseMarkdownAst(markdown);
  const blocks = [];
  let currentSectionTitle = '';

  for (const node of Array.isArray(tree.children) ? tree.children : []) {
    if (blocks.length >= maxBlocks) break;

    if (node?.type === 'heading') {
      const text = stringifyNode(node);
      if (!text) continue;
      if (Number(node.depth) >= 2) currentSectionTitle = text;
      blocks.push({
        kind: 'heading',
        text,
        sourceSectionTitle: currentSectionTitle || text
      });
      continue;
    }

    if (node?.type === 'thematicBreak') {
      currentSectionTitle = currentSectionTitle || '';
      continue;
    }

    if (node?.type === 'list') {
      const text = stringifyNode(node);
      if (!text) continue;
      blocks.push({
        kind: 'list',
        text,
        sourceSectionTitle: currentSectionTitle
      });
      continue;
    }

    if (node?.type === 'blockquote') {
      const text = stringifyNode(node);
      if (!text) continue;
      blocks.push({
        kind: 'quote',
        text,
        sourceSectionTitle: currentSectionTitle
      });
      continue;
    }

    if (node?.type === 'code') {
      const text = compactText(node.value || '');
      if (!text) continue;
      blocks.push({
        kind: 'code',
        text,
        sourceSectionTitle: currentSectionTitle
      });
      continue;
    }

    const text = stringifyNode(node);
    if (!text) continue;

    const chunks = chunkSentences(text, {
      maxChunkChars,
      maxSentencesPerChunk
    });
    for (const chunk of chunks) {
      if (blocks.length >= maxBlocks) break;
      blocks.push({
        kind: 'paragraph',
        text: chunk,
        sourceSectionTitle: currentSectionTitle
      });
    }
  }

  return blocks;
};

export const parseMarkdownDeck = (markdown = '') => {
  const lines = normalizeMarkdownLines(markdown);
  let title = '';
  const intro = [];
  let currentSlide = null;
  const slides = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!title && line.startsWith('# ')) {
      title = line.slice(2).trim();
      index += 1;
      continue;
    }

    if (line.startsWith('## ')) {
      if (currentSlide) slides.push(currentSlide);
      currentSlide = {
        title: line.slice(3).trim(),
        blocks: []
      };
      index += 1;
      continue;
    }

    if (!currentSlide) {
      if (line.trim()) intro.push(line.trim());
      index += 1;
      continue;
    }

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith('```') || line.startsWith('~~~')) {
      const fence = line.slice(0, 3);
      const language = line.slice(3).trim();
      const codeLines = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith(fence)) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index >= lines.length) {
        throw new Error(`Unclosed code block in slide "${currentSlide.title}".`);
      }
      currentSlide.blocks.push({
        type: 'code',
        language,
        content: codeLines.join('\n')
      });
      index += 1;
      continue;
    }

    const imageMatch = line.trim().match(/^!\[(.*?)\]\((.+?)\)$/);
    if (imageMatch) {
      currentSlide.blocks.push({
        type: 'image',
        alt: imageMatch[1].trim(),
        src: imageMatch[2].trim()
      });
      index += 1;
      continue;
    }

    if (line.trim().startsWith('- ')) {
      const items = [];
      while (index < lines.length && lines[index].trim().startsWith('- ')) {
        items.push(lines[index].trim().slice(2).trim());
        index += 1;
      }
      currentSlide.blocks.push({
        type: 'list',
        items
      });
      continue;
    }

    const paragraphLines = [];
    while (index < lines.length) {
      const candidate = lines[index];
      if (!candidate.trim()) break;
      if (candidate.startsWith('## ')) break;
      if (candidate.startsWith('```') || candidate.startsWith('~~~')) break;
      if (candidate.trim().startsWith('- ')) break;
      if (candidate.trim().match(/^!\[(.*?)\]\((.+?)\)$/)) break;
      paragraphLines.push(candidate.trim());
      index += 1;
    }

    currentSlide.blocks.push({
      type: 'paragraph',
      content: paragraphLines.join(' ')
    });
  }

  if (currentSlide) slides.push(currentSlide);

  if (!title) {
    throw new Error('Markdown file must start with a top-level "# " title.');
  }
  if (!slides.length) {
    throw new Error('Markdown file must contain at least one "## " slide heading.');
  }

  return {
    title,
    intro: intro.join(' '),
    slides
  };
};
