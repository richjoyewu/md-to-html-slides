#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline/promises';
import { normalizeOutline, normalizePlanContext, validateRenderDeck } from '../shared/core.js';
import { DEFAULT_SKILL, hasSkill, listSkills, registerSkill, resolveSkill, validateSkillInput } from '../shared/skills.js';
import { parseMarkdownDeck } from '../shared/markdown.js';
import { createCorePipeline, loadDotEnv, resolveProviderRuntime } from '../agent/pipeline.js';
import { runInteractiveRepl } from './repl.js';
import { loadProjectSkills, validateSkillDirectory } from './skill-loader.js';
import type { ClarificationResult, OutlineResult, PlanContext } from '../agent/types.js';

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
    '  md-to-html-slides plan <input.md> [--skill <name>] [--skill-file <skill.json>] [--profile <name> compatibility alias] [--answer <key=value>] [-o <outline.json>]',
    '  md-to-html-slides expand <input.md> [--skill <name>] [--skill-file <skill.json>] [--profile <name> compatibility alias] [--answer <key=value>] [--outline <outline.json>] [-o <expanded.json>]',
    '  md-to-html-slides render-deck <expanded.json> [--title <text>] [-o <render-deck.json>]',
    '  md-to-html-slides build <input.md> -o <output.html> [--theme <name>] [--title <text>] [--skill <name>] [--skill-file <skill.json>] [--profile <name> compatibility alias] [--answer <key=value>] [--outline <outline.json>]',
    '  md-to-html-slides preview <input.md> [--theme <name>] [--title <text>] [--skill <name>] [--skill-file <skill.json>] [--profile <name> compatibility alias] [--answer <key=value>] [--outline <outline.json>]',
    '  md-to-html-slides render <render-deck.json|expanded.json> -o <output.html> [--theme <name>] [--title <text>]',
    '  md-to-html-slides repl',
    '  md-to-html-slides ... [--interactive|--no-interactive]',
    '  md-to-html-slides skills',
    '  md-to-html-slides validate-skill <skill.json> [-o <normalized-skill.json>]',
    '  md-to-html-slides validate-skill-dir <dir> [-o <skill-report.json>]',
    '  md-to-html-slides validate <input.md>',
    '  md-to-html-slides validate-render-deck <render-deck.json>',
    '  md-to-html-slides themes',
    '',
    'Examples:',
    '  md-to-html-slides plan ./fixtures/pitch/clean/product-pitch.md --skill pitch-tech-launch',
    '  md-to-html-slides plan ./fixtures/pitch/clean/product-pitch.md --skill-file ./skills/founder-pitch.json',
    '  md-to-html-slides render-deck ./tmp/expanded.json -o ./tmp/render-deck.json',
    '  md-to-html-slides build ./fixtures/pitch/clean/product-pitch.md -o ./.tmp/examples/01-launch-tech.html --skill pitch-tech-launch',
    '  md-to-html-slides build ./fixtures/pitch/clean/product-pitch.md -o ./.tmp/examples/01-launch-tech.html --answer audience=投资人 --answer goal=解释融资亮点',
    '  md-to-html-slides render ./tmp/render-deck.json -o ./.tmp/examples/custom.html --theme tech-launch',
    '  md-to-html-slides preview ./fixtures/course/clean/openclaw-intro.md --skill general',
    '  md-to-html-slides validate-skill ./skills/founder-pitch.json',
    '  md-to-html-slides validate-skill-dir ./skills',
    '  md-to-html-slides validate ./fixtures/course/clean/openclaw-intro.md',
    '  md-to-html-slides validate-render-deck ./tmp/render-deck.json',
    '  md-to-html-slides skills',
    '  md-to-html-slides themes'
  ].join('\n');
};

interface ParsedArgs {
  answers: Record<string, string>;
  command: 'build' | 'expand' | 'help' | 'plan' | 'preview' | 'render' | 'render-deck' | 'repl' | 'skills' | 'themes' | 'validate' | 'validate-render-deck' | 'validate-skill' | 'validate-skill-dir';
  input?: string;
  interactiveMode?: 'auto' | 'force' | 'off';
  jsonOutput?: string;
  outlinePath?: string;
  output?: string;
  profile?: string;
  skill?: string;
  skillFile?: string;
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

  if (!command) {
    return {
      command: process.stdin.isTTY && process.stdout.isTTY ? 'repl' : 'help',
      answers: {}
    };
  }

  if (command === '--help' || command === '-h') {
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

  if (command === 'repl') {
    if (args.length) throw new Error('The "repl" command does not accept any arguments.');
    return { command, answers: {} };
  }

  const input = args.shift();
  if (!input) throw new Error('Missing input Markdown file.');

  const parsed: ParsedArgs = {
    answers: {},
    command: command as ParsedArgs['command'],
    input,
    interactiveMode: 'auto',
    jsonOutput: '',
    outlinePath: '',
    output: '',
    profile: '',
    skill: '',
    skillFile: '',
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

    if (token === '--skill') {
      parsed.skill = args.shift() || '';
      continue;
    }

    if (token === '--skill-file') {
      parsed.skillFile = args.shift() || '';
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

    if (token === '--interactive') {
      parsed.interactiveMode = 'force';
      continue;
    }

    if (token === '--no-interactive') {
      parsed.interactiveMode = 'off';
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

const loadSkillFile = async (skillFilePath: string): Promise<string> => {
  const resolved = path.resolve(process.cwd(), skillFilePath);
  if (path.extname(resolved).toLowerCase() !== '.json') {
    throw new Error('First-version --skill-file only supports .json files');
  }

  const raw = JSON.parse(await readFile(resolved, 'utf8'));
  try {
    validateSkillInput(raw);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid skill file ${path.relative(process.cwd(), resolved)}: ${detail}`);
  }
  const registered = registerSkill(raw);
  return registered.id;
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

const isInteractiveTerminal = (): boolean => Boolean(process.stdin.isTTY && process.stdout.isTTY);

const shouldUseInteractiveClarification = (command: ParsedArgs['command'], mode: ParsedArgs['interactiveMode']): boolean => {
  if (mode === 'force') return true;
  if (mode === 'off') return false;
  if (!isInteractiveTerminal()) return false;
  return command === 'build' || command === 'preview';
};

const askClarificationQuestions = async (
  clarification: ClarificationResult,
  answers: Record<string, string>
): Promise<Record<string, string>> => {
  const nextAnswers = { ...answers };
  const rl = createInterface({
    input: process.stdin,
    output: process.stderr
  });

  try {
    process.stderr.write(`${clarification.message || '需要补充 1 到 2 个关键信息。'}\n`);
    for (const question of clarification.questions) {
      const existing = String(nextAnswers[question.id] || '').trim();
      if (existing) continue;

      const label = question.label || question.id;
      const placeholder = question.placeholder ? ` (${question.placeholder})` : '';
      let answer = '';
      while (!answer.trim()) {
        answer = await rl.question(`${label}${placeholder}\n> `);
      }
      nextAnswers[question.id] = answer.trim();
    }
  } finally {
    rl.close();
  }

  return nextAnswers;
};

const runPlanWithClarification = async (
  pipeline: ReturnType<typeof createCorePipeline>,
  markdown: string,
  command: ParsedArgs['command'],
  context: PlanContext,
  interactiveMode: ParsedArgs['interactiveMode']
) => {
  let activeContext = normalizePlanContext(context) as PlanContext;
  let result = await pipeline.plan(markdown, activeContext);
  if (result.kind !== 'clarification') return { context: activeContext, result };
  if (!shouldUseInteractiveClarification(command, interactiveMode)) {
    return { context: activeContext, result };
  }

  const nextAnswers = await askClarificationQuestions(result.payload, activeContext.answers || {});
  activeContext = normalizePlanContext({
    ...activeContext,
    answers: nextAnswers
  }) as PlanContext;
  result = await pipeline.plan(markdown, activeContext);
  return { context: activeContext, result };
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

  const shouldAutoloadProjectSkills = !['validate-skill', 'validate-skill-dir'].includes(args.command) && !args.skillFile;
  if (shouldAutoloadProjectSkills) {
    loadProjectSkills(process.cwd());
  }

  if (args.skillFile) {
    args.skill = await loadSkillFile(args.skillFile);
  }

  if (args.command === 'repl') {
    await runInteractiveRepl(pipeline, {
      defaultSkill: args.skill || DEFAULT_SKILL
    });
    return;
  }

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
        ...listSkills().map((skill) => `- ${skill.id}: ${skill.description} (default theme: ${skill.default_theme})`)
      ].join('\n') + '\n'
    );
    return;
  }

  const inputPath = path.resolve(process.cwd(), args.input || '');
  let context = normalizePlanContext({
    skill: args.skill,
    profile: args.profile,
    answers: args.answers
  }) as PlanContext;

  if (args.skill && !hasSkill(args.skill)) {
    throw new Error(`Unknown skill: ${args.skill}`);
  }

  if (args.command === 'render') {
    const raw = JSON.parse(await readFile(inputPath, 'utf8'));
    const renderDeck = pipeline.toRenderDeck(raw, {
      title: args.title
    });
    const rendered = await pipeline.render(renderDeck.deck, {
      theme: args.theme,
      title: args.title
    });
    const outputPath = path.resolve(process.cwd(), args.output || '');
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, rendered.html, 'utf8');
    process.stdout.write(`Source: ${renderDeck.deck.meta.source}\n`);
    process.stdout.write(`Theme:  ${rendered.theme.name}\n`);
    process.stdout.write(`Slides: ${rendered.deck.slides.length + 1}\n`);
    process.stdout.write(`Output: ${path.relative(process.cwd(), outputPath)}\n`);
    process.stdout.write('Done.\n');
    return;
  }

  if (args.command === 'render-deck') {
    const raw = JSON.parse(await readFile(inputPath, 'utf8'));
    const renderDeck = pipeline.toRenderDeck(raw, {
      title: args.title
    });
    await writeJson(args.jsonOutput, renderDeck.deck);
    return;
  }

  if (args.command === 'validate-skill-dir') {
    const report = validateSkillDirectory(inputPath);
    if (args.jsonOutput) {
      await writeJson(args.jsonOutput, report);
    } else {
      process.stdout.write(`Directory: ${report.directory}\n`);
      process.stdout.write(`Loaded:    ${report.loaded}\n`);
      report.skills.forEach((skill) => {
        process.stdout.write(`- ${skill.id} (${skill.base_skill}) -> ${skill.default_theme} [${skill.file}]\n`);
      });
    }
    return;
  }

  const markdown = await readFile(inputPath, 'utf8');

  if (args.command === 'validate-skill') {
    const raw = JSON.parse(markdown);
    validateSkillInput(raw);
    const skill = resolveSkill(raw);
    if (args.jsonOutput) await writeJson(args.jsonOutput, skill);
    process.stdout.write(`Skill:  ${skill.id}\n`);
    process.stdout.write(`Base:   ${String(raw.base_skill || raw.baseSkill || raw.extends || DEFAULT_SKILL)}\n`);
    process.stdout.write(`Theme:  ${skill.default_theme}\n`);
    process.stdout.write(`Status: valid\n`);
    return;
  }

  if (args.command === 'validate') {
    const assets = await validateDeckAssets(inputPath);
    process.stdout.write(`Input:   ${path.relative(process.cwd(), inputPath)}\n`);
    process.stdout.write(`Title:   ${assets.title}\n`);
    process.stdout.write(`Slides:  ${assets.slideCount}\n`);
    process.stdout.write(`Images:  ${assets.imageCount}\n`);
    process.stdout.write('Status:  valid\n');
    return;
  }

  if (args.command === 'validate-render-deck') {
    const raw = JSON.parse(markdown);
    const deck = validateRenderDeck(raw);
    process.stdout.write(`Title:   ${deck.title}\n`);
    process.stdout.write(`Slides:  ${deck.slides.length}\n`);
    process.stdout.write(`Skill:   ${deck.meta.skill || 'n/a'}\n`);
    process.stdout.write(`Status:  valid\n`);
    return;
  }

  if (args.command === 'plan') {
    const planned = await runPlanWithClarification(pipeline, markdown, args.command, context, args.interactiveMode);
    context = planned.context;
    const result = planned.result;
    if (result.kind === 'clarification') {
      await writeJson(args.jsonOutput, { ...result.payload, mode: result.mode, source: result.source });
      return;
    }
    // Interactive mode: print human-friendly confirmation format to stderr
    if (isInteractiveTerminal() && args.interactiveMode !== 'off') {
      const outline = result.payload as OutlineResult;
      const meta = outline.meta;
      process.stderr.write('\n  大纲草案\n\n');
      process.stderr.write(`  演示目标：${meta?.deck_goal || '未确定'}\n`);
      process.stderr.write(`  核心信息：${meta?.core_message || '未确定'}\n`);
      process.stderr.write(`  目标受众：${meta?.audience_guess || '未指定'}\n`);
      process.stderr.write(`  页数：${outline.slides.length}\n\n`);
      process.stderr.write('  页面结构：\n');
      for (const slide of outline.slides) {
        process.stderr.write(`    ${String(slide.index).padStart(2, '0')}. ${slide.title}\n`);
        if (slide.summary) process.stderr.write(`        ${slide.summary}\n`);
      }
      const uncertainties = meta?.uncertainties?.filter((u: string) => u.trim()) || [];
      if (uncertainties.length > 0) {
        process.stderr.write('\n  不确定项：\n');
        for (const u of uncertainties) process.stderr.write(`    - ${u}\n`);
      }
      process.stderr.write('\n');
    }
    // JSON always goes to stdout (for piping)
    await writeJson(args.jsonOutput, { ...result.payload, mode: result.mode });
    return;
  }

  if (args.command === 'expand') {
    const outline = args.outlinePath ? await readOutlineFile(args.outlinePath) : null;
    if (!outline) {
      const planned = await runPlanWithClarification(pipeline, markdown, args.command, context, args.interactiveMode);
      context = planned.context;
      if (planned.result.kind === 'clarification') {
        await writeJson(args.jsonOutput, { ...planned.result.payload, mode: planned.result.mode, source: planned.result.source });
        process.exitCode = 2;
        return;
      }
      const expanded = await pipeline.expand(markdown, planned.result.payload, context);
      await writeJson(args.jsonOutput, { ...expanded.payload, mode: expanded.mode });
      return;
    }

    const expanded = await pipeline.expand(markdown, outline, context);
    await writeJson(args.jsonOutput, { ...expanded.payload, mode: expanded.mode });
    return;
  }

  const outline = args.outlinePath ? await readOutlineFile(args.outlinePath) : null;
  let built;
  if (outline) {
    built = await pipeline.build(markdown, {
      context,
      outline,
      theme: args.theme
    });
  } else {
    const planned = await runPlanWithClarification(pipeline, markdown, args.command, context, args.interactiveMode);
    context = planned.context;
    if (planned.result.kind === 'clarification') {
      printClarificationForBuild({ ...planned.result.payload, mode: planned.result.mode, source: planned.result.source });
      process.exitCode = 2;
      return;
    }
    built = await pipeline.build(markdown, {
      context,
      outline: planned.result.payload,
      theme: args.theme
    });
  }

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
