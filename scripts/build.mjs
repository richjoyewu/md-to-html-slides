#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { normalizeRenderDeck } from '../shared/core.js';
import { parseMarkdownDeck } from '../shared/markdown.js';
import { getTheme, THEMES } from '../templates/index.mjs';

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
    '  md-to-html-slides preview <input.md> [--theme <name>] [--title "Deck title"]',
    '  md-to-html-slides validate <input.md>',
    '  md-to-html-slides themes',
    '',
    'Example:',
    '  md-to-html-slides build slides-src/openclaw/01-agent.md -o examples/01-agent.html --theme dark-card',
    '  md-to-html-slides preview slides-src/openclaw/01-agent.md --theme dark-card',
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

  if (command === 'preview') {
    const input = args.shift();
    if (!input) {
      throw new Error('Missing input Markdown file.');
    }

    let theme = 'dark-card';
    let title = '';

    while (args.length) {
      const token = args.shift();
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

    return { command, input, theme, title };
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
  const theme = getTheme(themeName);
  if (!theme) {
    const supportedThemes = THEMES.map((entry) => entry.name).join(', ');
    throw new Error(`Unsupported theme: ${themeName}. Supported themes: ${supportedThemes}`);
  }
  return theme.renderer;
};

const renderThemesList = () => {
  return [
    'Available themes:',
    ...THEMES.map((theme) => `- ${theme.name}: ${theme.description}`)
  ].join('\n');
};

const getPreviewOutputPath = (inputPath, themeName) => {
  const baseName = path.basename(inputPath, path.extname(inputPath));
  return path.resolve(process.cwd(), '.tmp', 'previews', `${baseName}-${themeName}.html`);
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
    const parsedDeck = normalizeRenderDeck(parseMarkdownDeck(markdown));

    if (options.command === 'validate') {
      const assets = await validateDeckAssets(parsedDeck, sourceDir);
      console.log(`Input:   ${path.relative(process.cwd(), inputPath)}`);
      console.log(`Title:   ${parsedDeck.title}`);
      console.log(`Slides:  ${parsedDeck.slides.length + 1}`);
      console.log(`Images:  ${assets.imageCount}`);
      console.log('Status:  valid');
      return;
    }

    const outputPath = options.command === 'preview'
      ? getPreviewOutputPath(inputPath, options.theme)
      : path.resolve(process.cwd(), options.output);
    const preparedDeck = normalizeRenderDeck(await prepareDeck(parsedDeck, sourceDir));
    const renderDeck = getRenderer(options.theme);
    const html = renderDeck(preparedDeck, options);

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, html, 'utf8');

    console.log(`Input:  ${path.relative(process.cwd(), inputPath)}`);
    console.log(`Theme:  ${options.theme}`);
    console.log(`Slides: ${preparedDeck.slides.length + 1}`);
    console.log(`Output: ${path.relative(process.cwd(), outputPath)}`);
    if (options.command === 'preview') {
      console.log('Preview: open the generated file in your browser.');
      return;
    }
    console.log('Done.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error('');
    console.error(usage());
    process.exitCode = 1;
  }
};

await main();
