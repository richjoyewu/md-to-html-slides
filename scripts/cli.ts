#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { normalizeOutline, normalizePlanContext } from '../shared/core.js';
import { DECK_PROFILES } from '../shared/deck-profiles.js';
import { parseMarkdownDeck } from '../shared/markdown.js';
import { createCorePipeline, loadDotEnv, resolveProviderRuntime } from '../agent/pipeline.js';
import type { OutlineResult, PlanContext } from '../agent/types.js';

const MIME_TYPES = new Map([
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml']
]);

interface ThemeListEntry {
  name: string;
  description: string;
}

interface ThemeModule {
  THEMES: ThemeListEntry[];
}

const loadThemesModule = async (): Promise<ThemeModule> =>
  import(new URL('../../templates/index.mjs', import.meta.url).href) as Promise<ThemeModule>;

const usage = (): string => {
  return [
    'Usage:',
    '  md-to-html-slides plan <input.md> [--profile <name>] [--answer <key=value>] [-o <outline.json>]',
    '  md-to-html-slides expand <input.md> [--profile <name>] [--answer <key=value>] [--outline <outline.json>] [-o <expanded.json>]',
    '  md-to-html-slides build <input.md> -o <output.html> [--theme <name>] [--title <text>] [--profile <name>] [--answer <key=value>] [--outline <outline.json>]',
    '  md-to-html-slides preview <input.md> [--theme <name>] [--title <text>] [--profile <name>] [--answer <key=value>] [--outline <outline.json>]',
    '  md-to-html-slides render <expanded.json> -o <output.html> [--theme <name>] [--title <text>]',
    '  md-to-html-slides skills',
    '  md-to-html-slides validate <input.md>',
    '  md-to-html-slides themes',
    '',
    'Examples:',
    '  md-to-html-slides plan ./slides-src/pitch/01-launch.md --profile pitch-tech-launch',
    '  md-to-html-slides build ./slides-src/pitch/01-launch.md -o ./examples/01-launch-tech.html --profile pitch-tech-launch',
    '  md-to-html-slides build ./slides-src/pitch/01-launch.md -o ./examples/01-launch-tech.html --answer audience=投资人 --answer goal=解释融资亮点',
    '  md-to-html-slides render ./tmp/expanded.json -o ./examples/custom.html --theme signal-blue',
    '  md-to-html-slides preview ./slides-src/openclaw/01-agent.md --profile general',
    '  md-to-html-slides validate ./slides-src/openclaw/01-agent.md',
    '  md-to-html-slides skills',
    '  md-to-html-slides themes'
  ].join('\n');
};

interface ParsedArgs {
  answers: Record<string, string>;
  command: 'build' | 'expand' | 'help' | 'plan' | 'preview' | 'render' | 'skills' | 'themes' | 'validate';
  input?: string;
  jsonOutput?: string;
  outlinePath?: string;
  output?: string;
  profile?: string;
  title?: string;
  theme?: string;
}

const parseAnswerToken = (token: string): [string, string] => {
  const separator = token.indexOf('=');
  if (separator <= 0 || separator === token.length - 1) {
    throw new Error(`Invalid --answer value: ${token}. Expected key=value.`);
  }
  return [token.slice(0, separator).trim(), token.slice(separator + 1).trim()];
};

const parseArgs = (argv: string[]): ParsedArgs => {
  const args = argv.slice(2);
  const command = args.shift();

  if (!command || command === '--help' || command === '-h') {
    return { command: 'help', answers: {} };
  }

  if (command === 'skills') {
    if (args.length) throw new Error('The "skills" command does not accept any arguments.');
    return { command, answers: {} };
  }

  if (command === 'themes') {
    if (args.length) throw new Error('The "themes" command does not accept any arguments.');
    return { command, answers: {} };
  }

  const input = args.shift();
  if (!input) throw new Error('Missing input Markdown file.');

  const parsed: ParsedArgs = {
    answers: {},
    command: command as ParsedArgs['command'],
    input,
    jsonOutput: '',
    outlinePath: '',
    output: '',
    profile: '',
    theme: '',
    title: ''
  };

  while (args.length) {
    const token = args.shift();
    if (!token) continue;

    if (token === '-o' || token === '--output') {
      const value = args.shift() || '';
      if (!value) throw new Error('Missing value for output path.');
      if (parsed.command === 'build' || parsed.command === 'preview' || parsed.command === 'render') {
        parsed.output = value;
      } else {
        parsed.jsonOutput = value;
      }
      continue;
    }

    if (token === '--theme') {
      parsed.theme = args.shift() || '';
      continue;
    }

    if (token === '--title') {
      parsed.title = args.shift() || '';
      continue;
    }

    if (token === '--profile') {
      parsed.profile = args.shift() || '';
      continue;
    }

    if (token === '--outline') {
      parsed.outlinePath = args.shift() || '';
      continue;
    }

    if (token === '--answer') {
      const raw = args.shift() || '';
      const [key, value] = parseAnswerToken(raw);
      parsed.answers[key] = value;
      continue;
    }

    throw new Error(`Unknown option: ${token}`);
  }

  if ((parsed.command === 'build' || parsed.command === 'render') && !parsed.output) {
    throw new Error('Missing required output path. Use -o or --output.');
  }

  return parsed;
};

const validateDeckAssets = async (inputPath: string): Promise<{ imageCount: number; slideCount: number; title: string }> => {
  const sourceDir = path.dirname(inputPath);
  const markdown = await readFile(inputPath, 'utf8');
  const parsedDeck = parseMarkdownDeck(markdown);
  let imageCount = 0;

  for (const slide of parsedDeck.slides) {
    for (const block of slide.blocks) {
      if (block.type !== 'image') continue;
      imageCount += 1;

      const src = String(block.src || '').trim();
      if (!src) throw new Error(`Image source is required in slide "${slide.title}".`);
      if (/^(https?:)?\/\//i.test(src) || src.startsWith('data:')) continue;

      const resolved = path.resolve(sourceDir, src);
      const extension = path.extname(resolved).toLowerCase();
      const mime = MIME_TYPES.get(extension);

      if (!mime) throw new Error(`Unsupported image format: ${src}`);
      await access(resolved);
    }
  }

  return {
    imageCount,
    slideCount: parsedDeck.slides.length + 1,
    title: parsedDeck.title
  };
};

const getPreviewOutputPath = (inputPath: string, themeName: string): string => {
  const baseName = path.basename(inputPath, path.extname(inputPath));
  return path.resolve(process.cwd(), '.tmp', 'previews', `${baseName}-${themeName}.html`);
};

const readOutlineFile = async (outlinePath: string): Promise<OutlineResult> => {
  const raw = await readFile(path.resolve(process.cwd(), outlinePath), 'utf8');
  return normalizeOutline(JSON.parse(raw)) as OutlineResult;
};

const writeJson = async (outputPath: string | undefined, payload: unknown): Promise<void> => {
  const serialized = JSON.stringify(payload, null, 2);
  if (!outputPath) {
    process.stdout.write(`${serialized}\n`);
    return;
  }
  const resolved = path.resolve(process.cwd(), outputPath);
  await mkdir(path.dirname(resolved), { recursive: true });
  await writeFile(resolved, serialized, 'utf8');
};

const printClarificationForBuild = (payload: unknown): void => {
  process.stderr.write('Clarification required before continuing.\n');
  process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
};

const main = async (): Promise<void> => {
  loadDotEnv(process.cwd());

  const args = parseArgs(process.argv);
  if (args.command === 'help') {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const runtime = resolveProviderRuntime(process.env);
  const pipeline = createCorePipeline({ provider: runtime.provider });

  if (args.command === 'themes') {
    const { THEMES } = await loadThemesModule();
    process.stdout.write(
      [
        `Provider: ${runtime.description}`,
        'Available themes:',
        ...THEMES.map((theme) => `- ${theme.name}: ${theme.description}`)
      ].join('\n') + '\n'
    );
    return;
  }

  if (args.command === 'skills') {
    process.stdout.write(
      [
        'Available skills:',
        ...DECK_PROFILES.map((profile) => `- ${profile.name}: ${profile.description}`)
      ].join('\n') + '\n'
    );
    return;
  }

  const inputPath = path.resolve(process.cwd(), args.input || '');
  const context = normalizePlanContext({
    profile: args.profile,
    answers: args.answers
  }) as PlanContext;

  if (args.command === 'render') {
    const raw = JSON.parse(await readFile(inputPath, 'utf8'));
    const rendered = await pipeline.render(raw, {
      theme: args.theme,
      title: args.title
    });
    const outputPath = path.resolve(process.cwd(), args.output || '');
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, rendered.html, 'utf8');
    process.stdout.write(`Theme:  ${rendered.theme.name}\n`);
    process.stdout.write(`Slides: ${rendered.deck.slides.length + 1}\n`);
    process.stdout.write(`Output: ${path.relative(process.cwd(), outputPath)}\n`);
    process.stdout.write('Done.\n');
    return;
  }

  const markdown = await readFile(inputPath, 'utf8');

  if (args.command === 'validate') {
    const assets = await validateDeckAssets(inputPath);
    process.stdout.write(`Input:   ${path.relative(process.cwd(), inputPath)}\n`);
    process.stdout.write(`Title:   ${assets.title}\n`);
    process.stdout.write(`Slides:  ${assets.slideCount}\n`);
    process.stdout.write(`Images:  ${assets.imageCount}\n`);
    process.stdout.write('Status:  valid\n');
    return;
  }

  if (args.command === 'plan') {
    const result = await pipeline.plan(markdown, context);
    if (result.kind === 'clarification') {
      await writeJson(args.jsonOutput, { ...result.payload, mode: result.mode, source: result.source });
      return;
    }
    await writeJson(args.jsonOutput, { ...result.payload, mode: result.mode });
    return;
  }

  if (args.command === 'expand') {
    const outline = args.outlinePath ? await readOutlineFile(args.outlinePath) : null;
    if (!outline) {
      const planned = await pipeline.plan(markdown, context);
      if (planned.kind === 'clarification') {
        await writeJson(args.jsonOutput, { ...planned.payload, mode: planned.mode, source: planned.source });
        process.exitCode = 2;
        return;
      }
      const expanded = await pipeline.expand(markdown, planned.payload, context);
      await writeJson(args.jsonOutput, { ...expanded.payload, mode: expanded.mode });
      return;
    }

    const expanded = await pipeline.expand(markdown, outline, context);
    await writeJson(args.jsonOutput, { ...expanded.payload, mode: expanded.mode });
    return;
  }

  const outline = args.outlinePath ? await readOutlineFile(args.outlinePath) : null;
  const built = await pipeline.build(markdown, {
    context,
    outline,
    theme: args.theme
  });

  if (built.kind === 'clarification') {
    printClarificationForBuild({ ...built.payload, mode: built.mode, source: built.source });
    process.exitCode = 2;
    return;
  }

  const rendered = await pipeline.render(built.expanded, {
    theme: built.theme,
    title: args.title
  });

  const outputPath = args.command === 'preview'
    ? getPreviewOutputPath(inputPath, rendered.theme.name)
    : path.resolve(process.cwd(), args.output || '');

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, rendered.html, 'utf8');

  process.stdout.write(`Provider: ${runtime.description}\n`);
  process.stdout.write(`Input:  ${path.relative(process.cwd(), inputPath)}\n`);
  process.stdout.write(`Theme:  ${rendered.theme.name}\n`);
  process.stdout.write(`Slides: ${rendered.deck.slides.length + 1}\n`);
  process.stdout.write(`Plan:   ${built.plan_mode}\n`);
  process.stdout.write(`Expand: ${built.expand_mode}\n`);
  process.stdout.write(`Output: ${path.relative(process.cwd(), outputPath)}\n`);
  if (args.command === 'preview') {
    process.stdout.write('Preview: open the generated file in your browser.\n');
    return;
  }
  process.stdout.write('Done.\n');
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n\n`);
  process.stderr.write(`${usage()}\n`);
  process.exitCode = 1;
});
