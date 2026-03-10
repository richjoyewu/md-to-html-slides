#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { THEMES, THEME_MAP } from '../templates/index.mjs';

const MIME_TYPES = new Map([
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml']
]);

const usage = () => {
  return [
    'Usage:',
    '  md-to-html-slides build <input.md> -o <output.html> [--theme <name>] [--title "Deck title"]',
    '  md-to-html-slides validate <input.md>',
    '  md-to-html-slides themes',
    '',
    'Example:',
    '  md-to-html-slides build slides-src/openclaw/01-agent.md -o examples/01-agent.html --theme dark-card',
    '  md-to-html-slides validate slides-src/openclaw/01-agent.md',
    '  md-to-html-slides themes'
  ].join('\n');
};

const parseArgs = (argv) => {
  const args = argv.slice(2);
  const command = args.shift();

  if (!command || command === '--help' || command === '-h') {
    return { command: 'help' };
  }

  if (command === 'themes') {
    if (args.length) {
      throw new Error('The "themes" command does not accept any arguments.');
    }
    return { command: 'themes' };
  }

  if (command === 'validate') {
    const input = args.shift();
    if (!input) {
      throw new Error('Missing input Markdown file.');
    }
    if (args.length) {
      throw new Error('The "validate" command only accepts one input Markdown file.');
    }
    return { command, input };
  }

  if (command !== 'build') {
    throw new Error(`Unsupported command: ${command}`);
  }

  const input = args.shift();
  if (!input) {
    throw new Error('Missing input Markdown file.');
  }

  let output = '';
  let theme = 'dark-card';
  let title = '';

  while (args.length) {
    const token = args.shift();
    if (token === '-o' || token === '--output') {
      output = args.shift() || '';
      continue;
    }
    if (token === '--theme') {
      theme = args.shift() || '';
      continue;
    }
    if (token === '--title') {
      title = args.shift() || '';
      continue;
    }
    throw new Error(`Unknown option: ${token}`);
  }

  if (!output) {
    throw new Error('Missing required output path. Use -o or --output.');
  }

  return { command, input, output, theme, title };
};

const parseMarkdown = (markdown) => {
  const normalized = String(markdown || '').replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');

  let title = '';
  let intro = [];
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

const inlineImage = async (sourceDir, src) => {
  if (/^(https?:)?\/\//i.test(src) || src.startsWith('data:')) {
    return src;
  }

  const resolved = path.resolve(sourceDir, src);
  const extension = path.extname(resolved).toLowerCase();
  const mime = MIME_TYPES.get(extension);

  if (!mime) {
    throw new Error(`Unsupported image format: ${src}`);
  }

  const buffer = await readFile(resolved);
  return `data:${mime};base64,${buffer.toString('base64')}`;
};

const validateDeckAssets = async (deck, sourceDir) => {
  let imageCount = 0;

  for (const slide of deck.slides) {
    for (const block of slide.blocks) {
      if (block.type !== 'image') continue;
      imageCount += 1;

      if (/^(https?:)?\/\//i.test(block.src) || block.src.startsWith('data:')) {
        continue;
      }

      const resolved = path.resolve(sourceDir, block.src);
      const extension = path.extname(resolved).toLowerCase();
      const mime = MIME_TYPES.get(extension);

      if (!mime) {
        throw new Error(`Unsupported image format: ${block.src}`);
      }

      await access(resolved);
    }
  }

  return { imageCount };
};

const prepareDeck = async (deck, sourceDir) => {
  const slides = [];

  for (const slide of deck.slides) {
    const preparedBlocks = [];
    for (const block of slide.blocks) {
      if (block.type === 'image') {
        preparedBlocks.push({
          ...block,
          inlinedSrc: await inlineImage(sourceDir, block.src)
        });
        continue;
      }
      preparedBlocks.push(block);
    }
    slides.push({
      ...slide,
      blocks: preparedBlocks
    });
  }

  return {
    ...deck,
    slides
  };
};

const getRenderer = (themeName) => {
  const renderer = THEME_MAP.get(themeName);
  if (!renderer) {
    const supportedThemes = THEMES.map((theme) => theme.name).join(', ');
    throw new Error(`Unsupported theme: ${themeName}. Supported themes: ${supportedThemes}`);
  }
  return renderer;
};

const renderThemesList = () => {
  return [
    'Available themes:',
    ...THEMES.map((theme) => `- ${theme.name}: ${theme.description}`)
  ].join('\n');
};

const main = async () => {
  try {
    const options = parseArgs(process.argv);

    if (options.command === 'help') {
      console.log(usage());
      return;
    }

    if (options.command === 'themes') {
      console.log(renderThemesList());
      return;
    }

    const inputPath = path.resolve(process.cwd(), options.input);
    const sourceDir = path.dirname(inputPath);

    const markdown = await readFile(inputPath, 'utf8');
    const parsedDeck = parseMarkdown(markdown);

    if (options.command === 'validate') {
      const assets = await validateDeckAssets(parsedDeck, sourceDir);
      console.log(`Input:   ${path.relative(process.cwd(), inputPath)}`);
      console.log(`Title:   ${parsedDeck.title}`);
      console.log(`Slides:  ${parsedDeck.slides.length + 1}`);
      console.log(`Images:  ${assets.imageCount}`);
      console.log('Status:  valid');
      return;
    }

    const outputPath = path.resolve(process.cwd(), options.output);
    const preparedDeck = await prepareDeck(parsedDeck, sourceDir);
    const renderDeck = getRenderer(options.theme);
    const html = renderDeck(preparedDeck, options);

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, html, 'utf8');

    console.log(`Input:  ${path.relative(process.cwd(), inputPath)}`);
    console.log(`Theme:  ${options.theme}`);
    console.log(`Slides: ${preparedDeck.slides.length + 1}`);
    console.log(`Output: ${path.relative(process.cwd(), outputPath)}`);
    console.log('Done.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error('');
    console.error(usage());
    process.exitCode = 1;
  }
};

await main();
