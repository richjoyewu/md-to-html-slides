const compactText = (value = '') => String(value).replace(/\s+/g, ' ').trim();

export const normalizeMarkdownLines = (markdown = '') =>
  String(markdown || '')
    .replace(/\r\n?/g, '\n')
    .split('\n');

export const inferDeckTitle = (markdown = '') => {
  const lines = normalizeMarkdownLines(markdown).map((line) => line.trim()).filter(Boolean);
  const explicit = (lines.find((line) => line.startsWith('# ')) || '').replace(/^#\s+/, '').trim();
  if (explicit) return explicit;

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

  const sections = [];
  let current = null;

  for (const rawLine of normalizeMarkdownLines(markdown)) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('## ')) {
      if (current) sections.push(current);
      current = { title: line.replace(/^##\s+/, '').trim(), points: [] };
      continue;
    }

    if (!current) current = { title: fallbackTitle, points: [] };

    if (/^[-*+]\s+/.test(line)) {
      current.points.push(line.replace(/^[-*+]\s+/, '').trim());
    } else if (!/^#\s+/.test(line)) {
      current.points.push(line);
    }
  }

  if (current) sections.push(current);

  return sections
    .filter((section) => section.title)
    .slice(0, maxSections)
    .map((section) => ({
      title: section.title,
      points: section.points.slice(0, maxPointsPerSection)
    }));
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
