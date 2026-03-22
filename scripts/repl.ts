import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline/promises';
import { getSkill, listSkills } from '../shared/skills.js';
import type { ClarificationResult, OutlineResult, PlanContext } from '../agent/types.js';
import type { createCorePipeline } from '../agent/pipeline.js';

interface ThemeListEntry {
  description: string;
  name: string;
}

interface ThemeModule {
  THEMES: ThemeListEntry[];
}

type ReplInterface = ReturnType<typeof createInterface>;

interface ReplState {
  answers: Record<string, string>;
  inputMode: 'command' | 'paste';
  lastOutputPath: string;
  markdown: string;
  outline: OutlineResult | null;
  pendingPasteLines: number;
  skill: string;
  theme: string;
}

const DEFAULT_OUTPUT_PATH = './.tmp/repl-output.html';
const AUDIENCE_KEYWORDS = ['投资人', '客户', '管理层', '内部团队', '学员', '老板', '候选人'];
const LOADABLE_EXTENSIONS = new Set(['.md', '.markdown', '.txt']);
const WARN_LINE_THRESHOLD = 120;
const WARN_CHAR_THRESHOLD = 6000;
const WARN_IMAGE_THRESHOLD = 1;
const WARN_CODEBLOCK_THRESHOLD = 2;

const loadThemesModule = async (): Promise<ThemeModule> =>
  import(new URL('../../templates/index.mjs', import.meta.url).href) as Promise<ThemeModule>;

const appendMarkdown = (source: string, line: string): string => {
  if (!source.trim()) return line.trimEnd();
  return `${source}\n${line.trimEnd()}`;
};

const stripWrappingQuotes = (value: string): string => {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const resetOutline = (state: ReplState): void => {
  state.outline = null;
};

const beginPasteMode = (state: ReplState): void => {
  state.inputMode = 'paste';
  state.pendingPasteLines = 0;
};

const finishPasteMode = (state: ReplState): void => {
  const appended = state.pendingPasteLines;
  state.inputMode = 'command';
  state.pendingPasteLines = 0;
  process.stdout.write(`已接收多行内容，本次共 ${appended} 行，当前总计 ${state.markdown.split('\n').length} 行。\n`);
  printMarkdownWarnings(state.markdown);
};

const isMarkdownLike = (line: string): boolean =>
  /^#{1,6}\s+/.test(line)
  || /^[-*+]\s+/.test(line)
  || /^>/.test(line)
  || /^```/.test(line)
  || /^!\[.*\]\(.+\)/.test(line)
  || line.includes('## ')
  || line.includes('|');

const summarizeAnswers = (answers: Record<string, string>): string[] => {
  const entries = [
    answers.audience ? `Audience: ${answers.audience}` : '',
    answers.goal ? `Goal: ${answers.goal}` : '',
    answers.slide_count ? `Pages: ${answers.slide_count}` : '',
    answers.tone_preference ? `Tone: ${answers.tone_preference}` : ''
  ].filter(Boolean);
  return entries.length ? entries : ['Answers: none'];
};

const analyzeMarkdownWarnings = (markdown: string): string[] => {
  const warnings: string[] = [];
  const text = String(markdown || '');
  const lines = text.split('\n').length;
  const imageRefs = (text.match(/!\[[^\]]*\]\(([^)]+)\)/g) || []).length;
  const localImageRefs = (text.match(/!\[[^\]]*\]\((?!https?:\/\/|data:)[^)]+\)/g) || []).length;
  const codeBlocks = (text.match(/```/g) || []).length / 2;

  if (lines > WARN_LINE_THRESHOLD || text.length > WARN_CHAR_THRESHOLD) {
    warnings.push('内容较长，建议优先粘贴本地文件路径或拆成更聚焦的一份文稿。');
  }
  if (imageRefs > WARN_IMAGE_THRESHOLD) {
    warnings.push('检测到多张图片引用，直接粘贴时资源路径可能不稳定。');
  }
  if (localImageRefs > 0) {
    warnings.push('检测到本地图片或相对路径资源，推荐直接粘贴文件路径。');
  }
  if (codeBlocks > WARN_CODEBLOCK_THRESHOLD) {
    warnings.push('检测到较多代码块，终端确认体验可能会变差。');
  }

  return warnings;
};

const printMarkdownWarnings = (markdown: string): void => {
  const warnings = analyzeMarkdownWarnings(markdown);
  if (!warnings.length) return;
  process.stdout.write(`${warnings.map((item) => `提示：${item}`).join('\n')}\n`);
};

const resolveLocalMarkdownPath = async (input: string): Promise<string | null> => {
  const candidate = stripWrappingQuotes(input);
  if (!candidate) return null;
  const resolved = path.resolve(process.cwd(), candidate);
  if (!LOADABLE_EXTENSIONS.has(path.extname(resolved).toLowerCase())) return null;

  try {
    await access(resolved);
    return resolved;
  } catch {
    return null;
  }
};

const loadMarkdownFromFile = async (state: ReplState, filePath: string): Promise<void> => {
  const markdown = await readFile(filePath, 'utf8');
  state.markdown = String(markdown || '').trimEnd();
  state.outline = null;
  process.stdout.write(`已读取文件：${path.relative(process.cwd(), filePath)}\n`);
  process.stdout.write(`共 ${state.markdown.split('\n').length} 行。输入 /plan 开始生成大纲。\n`);
  printMarkdownWarnings(state.markdown);
};

const renderOutlineSummary = (outline: OutlineResult): string[] => {
  const meta = outline.meta;
  const lines = [
    '',
    `  大纲草案`,
    '',
    `  演示目标：${meta?.deck_goal || '未确定'}`,
    `  核心信息：${meta?.core_message || '未确定'}`,
    `  目标受众：${meta?.audience_guess || '未指定'}`,
    `  页数：${outline.slides.length}`,
    ''
  ];

  lines.push('  页面结构：');
  outline.slides.forEach((slide) => {
    lines.push(`    ${String(slide.index).padStart(2, '0')}. ${slide.title}`);
    if (slide.summary) lines.push(`        ${slide.summary}`);
  });

  const uncertainties = meta?.uncertainties?.filter((u) => u.trim()) || [];
  if (uncertainties.length > 0) {
    lines.push('');
    lines.push('  不确定项：');
    uncertainties.forEach((u) => lines.push(`    - ${u}`));
  }

  const omitted = meta?.omitted_topics?.filter((t) => t.trim()) || [];
  if (omitted.length > 0) {
    lines.push('');
    lines.push('  已舍弃：');
    omitted.forEach((t) => lines.push(`    - ${t}`));
  }

  lines.push('');
  return lines;
};

const askClarificationQuestions = async (
  clarification: ClarificationResult,
  answers: Record<string, string>,
  rl: ReplInterface
): Promise<Record<string, string>> => {
  const nextAnswers = { ...answers };
  process.stdout.write(`${clarification.message || '需要补充 1 到 2 个关键信息。'}\n`);

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

  return nextAnswers;
};

const planInteractively = async (
  pipeline: ReturnType<typeof createCorePipeline>,
  state: ReplState,
  rl: ReplInterface
): Promise<{ context: PlanContext; outline: OutlineResult | null }> => {
  let context: PlanContext = { skill: state.skill, answers: state.answers };

  while (true) {
    const result = await pipeline.plan(state.markdown, context);
    if (result.kind !== 'clarification') {
      return { context, outline: result.payload };
    }

    state.answers = await askClarificationQuestions(result.payload, context.answers || {}, rl);
    context = { skill: state.skill, answers: state.answers };
  }
};

const confirmOutline = async (outline: OutlineResult, rl: ReplInterface): Promise<boolean> => {
  process.stdout.write(`${renderOutlineSummary(outline).join('\n')}\n`);

  // Step 1: 确认或修改演示目标
  const goalAnswer = (await rl.question(
    `演示目标：${outline.meta?.deck_goal || '未确定'}\n  回车确认，或输入新的目标 > `
  )).trim();
  if (goalAnswer) {
    outline.meta.deck_goal = goalAnswer;
  }

  // Step 2: 确认或修改核心信息
  const messageAnswer = (await rl.question(
    `核心信息：${outline.meta?.core_message || '未确定'}\n  回车确认，或输入新的核心信息 > `
  )).trim();
  if (messageAnswer) {
    outline.meta.core_message = messageAnswer;
  }

  // Step 3: 确认页面结构
  process.stdout.write('\n  页面结构：\n');
  outline.slides.forEach((slide) => {
    process.stdout.write(`    ${String(slide.index).padStart(2, '0')}. ${slide.title}\n`);
  });
  const structureAnswer = (await rl.question('\n  确认页面结构？ [Y/n] ')).trim().toLowerCase();
  return structureAnswer === '' || structureAnswer === 'y' || structureAnswer === 'yes';
};

const printHelp = (): void => {
  process.stdout.write([
    '',
    '交互式命令：',
    '/help, /帮助              查看帮助',
    '/status, /状态            查看当前状态',
    '/skills, /技能            列出可用 skills',
    '/skill <id>, /技能 <id>   切换 skill',
    '/themes, /主题            列出可用 themes',
    '/theme <id>, /主题设定    切换 theme',
    '/load <path>, /加载       读取本地 Markdown/TXT 文件',
    '/paste, /粘贴             进入多行粘贴模式',
    '/end, /完成               结束多行粘贴模式',
    '/audience <text>, /受众   设置 audience',
    '/goal <text>, /目标       设置 goal',
    '/pages <text>, /页数      设置页数偏好',
    '/doc, /文档               预览当前 Markdown',
    '/outline, /大纲           查看当前大纲',
    '/plan, /规划              生成并展示大纲',
    '/build [path], /生成      生成 HTML，默认输出到 ./.tmp/repl-output.html',
    '/clear, /清空             清空当前文档和中间状态',
    '/quit, /退出              退出',
    '',
    '自然语言输入：',
    '- 包含“投资人 / 8页 / 克制 / pitch / 发布”等线索的短句会被当作偏好',
    '- 粘贴本地 Markdown/TXT 路径会自动读取文件',
    '- Markdown 标题/列表会自动进入多行粘贴模式',
    '- 在粘贴模式里直接输入 /plan 或 /build 会自动结束粘贴并继续',
    ''
  ].join('\n'));
};

const printStatus = (state: ReplState): void => {
  process.stdout.write([
    '',
    `Skill:   ${state.skill}`,
    `Theme:   ${state.theme}`,
    `Mode:    ${state.inputMode}`,
    `Lines:   ${state.markdown ? state.markdown.split('\n').length : 0}`,
    `Outline: ${state.outline ? `${state.outline.slides.length} 页` : '未生成'}`,
    `Output:  ${state.lastOutputPath}`,
    ...summarizeAnswers(state.answers),
    ''
  ].join('\n'));
};

const printMarkdownPreview = (state: ReplState): void => {
  if (!state.markdown.trim()) {
    process.stdout.write('当前还没有 Markdown 内容。\n');
    return;
  }
  const lines = state.markdown.split('\n').slice(-20);
  process.stdout.write(`${lines.join('\n')}\n`);
};

const inferNaturalIntent = (
  line: string,
  themesModule: ThemeModule
): {
  handled: boolean;
  nextAnswers?: Record<string, string>;
  nextSkill?: string;
  nextTheme?: string;
  summary?: string[];
} => {
  const nextAnswers: Record<string, string> = {};
  let nextSkill = '';
  let nextTheme = '';
  const summary: string[] = [];
  const compact = line.trim();

  if (!compact || isMarkdownLike(compact)) {
    return { handled: false };
  }

  for (const audience of AUDIENCE_KEYWORDS) {
    if (compact.includes(audience)) {
      nextAnswers.audience = audience;
      summary.push(`识别 audience：${audience}`);
      break;
    }
  }

  const slideCountMatch = compact.match(/(\d+)\s*页/);
  if (slideCountMatch) {
    nextAnswers.slide_count = `${slideCountMatch[1]} 页`;
    summary.push(`识别页数：${nextAnswers.slide_count}`);
  }

  if (/pitch|融资|投资人|发布|发布会|路演/i.test(compact)) {
    nextSkill = 'pitch-tech-launch';
    summary.push('识别 skill：pitch-tech-launch');
  } else if (/课程|培训|教学|说明|通用|分享/.test(compact)) {
    nextSkill = 'general';
    summary.push('识别 skill：general');
  }

  const mentionedTheme = themesModule.THEMES.find((theme) => compact.includes(theme.name));
  if (mentionedTheme) {
    nextTheme = mentionedTheme.name;
    summary.push(`识别 theme：${nextTheme}`);
  }

  if (/克制|简洁|冷静/.test(compact)) {
    nextAnswers.tone_preference = '克制';
    summary.push('识别 tone：克制');
  } else if (/强势|更硬|更强烈/.test(compact)) {
    nextAnswers.tone_preference = '强势';
    summary.push('识别 tone：强势');
  }

  if (/记住|重点|目标|想让/.test(compact)) {
    nextAnswers.goal = compact;
    summary.push('识别 goal');
  }

  return {
    handled: summary.length > 0,
    nextAnswers,
    nextSkill,
    nextTheme,
    summary
  };
};

export const runInteractiveRepl = async (
  pipeline: ReturnType<typeof createCorePipeline>,
  options: {
    defaultSkill?: string;
    defaultTheme?: string;
  } = {}
): Promise<void> => {
  const themesModule = await loadThemesModule();
  const state: ReplState = {
    answers: {},
    inputMode: 'command',
    lastOutputPath: DEFAULT_OUTPUT_PATH,
    markdown: '',
    outline: null,
    pendingPasteLines: 0,
    skill: options.defaultSkill || 'general',
    theme: options.defaultTheme || getSkill(options.defaultSkill || 'general').default_theme
  };

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  process.stdout.write('md-to-html-slides interactive shell\n');
  process.stdout.write('直接粘贴 Markdown，或先说需求，例如：给投资人看，控制在 8 页，语气克制一点。\n');
  process.stdout.write('输入 /help 查看命令。\n');

  try {
    while (true) {
      const input = await rl.question('md> ');
      const line = input.trim();
      if (!line) continue;

      if (state.inputMode === 'paste' && !line.startsWith('/')) {
        state.markdown = appendMarkdown(state.markdown, input);
        state.pendingPasteLines += 1;
        state.outline = null;
        continue;
      }

      if (!line.startsWith('/')) {
        const detectedPath = await resolveLocalMarkdownPath(input);
        if (detectedPath) {
          await loadMarkdownFromFile(state, detectedPath);
          continue;
        }

        const intent = inferNaturalIntent(line, themesModule);
        if (intent.handled) {
          state.answers = { ...state.answers, ...(intent.nextAnswers || {}) };
          if (intent.nextSkill) state.skill = intent.nextSkill;
          if (intent.nextTheme) state.theme = intent.nextTheme;
          state.outline = null;
          process.stdout.write(`${(intent.summary || []).join('；')}\n`);
          continue;
        }

        if (isMarkdownLike(line)) {
          beginPasteMode(state);
          state.markdown = appendMarkdown(state.markdown, input);
          state.pendingPasteLines += 1;
          state.outline = null;
          process.stdout.write('已进入多行粘贴模式，继续粘贴内容；输入 /end 结束，或直接输入 /plan 开始规划。\n');
          continue;
        }

        state.markdown = appendMarkdown(state.markdown, input);
        state.outline = null;
        process.stdout.write(`已追加内容，当前 ${state.markdown.split('\n').length} 行。\n`);
        printMarkdownWarnings(state.markdown);
        continue;
      }

      const [rawCommand, ...rest] = line.slice(1).split(/\s+/);
      const command = rawCommand.trim();
      const value = rest.join(' ').trim();

      if (state.inputMode === 'paste' && !['end', '完成'].includes(command) && !['plan', '规划', 'build', '生成', 'status', '状态', 'doc', '文档', 'outline', '大纲', 'help', '帮助', 'quit', 'exit', '退出'].includes(command)) {
        state.markdown = appendMarkdown(state.markdown, input);
        state.pendingPasteLines += 1;
        state.outline = null;
        continue;
      }

      if (state.inputMode === 'paste' && ['end', '完成'].includes(command)) {
        finishPasteMode(state);
        continue;
      }

      if (state.inputMode === 'paste') {
        finishPasteMode(state);
      }

      if (['help', '帮助'].includes(command)) {
        printHelp();
        continue;
      }

      if (['quit', 'exit', '退出'].includes(command)) {
        break;
      }

      if (['status', '状态'].includes(command)) {
        printStatus(state);
        continue;
      }

      if (['skills', '技能'].includes(command)) {
        process.stdout.write(`${listSkills().map((skill) => `- ${skill.id}`).join('\n')}\n`);
        continue;
      }

      if (['themes', '主题'].includes(command)) {
        process.stdout.write(`${themesModule.THEMES.map((theme) => `- ${theme.name}`).join('\n')}\n`);
        continue;
      }

      if (['paste', '粘贴'].includes(command)) {
        beginPasteMode(state);
        process.stdout.write('已进入多行粘贴模式，继续粘贴 Markdown；输入 /end 结束，或直接输入 /plan 开始规划。\n');
        continue;
      }

      if (['load', '加载'].includes(command)) {
        if (!value) {
          process.stdout.write('用法：/load <path>\n');
          continue;
        }
        const detectedPath = await resolveLocalMarkdownPath(value);
        if (!detectedPath) {
          process.stdout.write('未找到可读取的本地 Markdown/TXT 文件。\n');
          continue;
        }
        await loadMarkdownFromFile(state, detectedPath);
        continue;
      }

      if (['skill', '技能设定', '技能'].includes(command)) {
        if (!value) {
          process.stdout.write('用法：/skill <id>\n');
          continue;
        }
        const nextSkill = listSkills().find((skill) => skill.id === value);
        if (!nextSkill) {
          process.stdout.write(`未知 skill：${value}\n`);
          continue;
        }
        state.skill = nextSkill.id;
        state.theme = nextSkill.default_theme;
        state.outline = null;
        process.stdout.write(`已切换 skill：${state.skill}；推荐 theme：${state.theme}\n`);
        continue;
      }

      if (['theme', '主题设定'].includes(command)) {
        if (!value) {
          process.stdout.write('用法：/theme <id>\n');
          continue;
        }
        const themeExists = themesModule.THEMES.some((theme) => theme.name === value);
        if (!themeExists) {
          process.stdout.write(`未知 theme：${value}\n`);
          continue;
        }
        state.theme = value;
        process.stdout.write(`已切换 theme：${state.theme}\n`);
        continue;
      }

      if (['audience', '受众'].includes(command)) {
        state.answers.audience = value;
        state.outline = null;
        process.stdout.write(`Audience: ${value || '(empty)'}\n`);
        continue;
      }

      if (['goal', '目标'].includes(command)) {
        state.answers.goal = value;
        state.outline = null;
        process.stdout.write(`Goal: ${value || '(empty)'}\n`);
        continue;
      }

      if (['pages', '页数'].includes(command)) {
        state.answers.slide_count = value;
        state.outline = null;
        process.stdout.write(`Slide count: ${value || '(empty)'}\n`);
        continue;
      }

      if (['doc', '文档'].includes(command)) {
        printMarkdownPreview(state);
        continue;
      }

      if (['outline', '大纲'].includes(command)) {
        if (!state.outline) {
          process.stdout.write('当前还没有大纲，请先 /plan。\n');
          continue;
        }
        process.stdout.write(`${renderOutlineSummary(state.outline).join('\n')}\n`);
        continue;
      }

      if (['clear', '清空'].includes(command)) {
        state.answers = {};
        state.markdown = '';
        state.outline = null;
        process.stdout.write('已清空当前文档和中间状态。\n');
        continue;
      }

      if (['plan', '规划'].includes(command)) {
        if (!state.markdown.trim()) {
          process.stdout.write('请先输入 Markdown 内容。\n');
          continue;
        }
        const planned = await planInteractively(pipeline, state, rl);
        state.outline = planned.outline;
        if (!state.outline) {
          process.stdout.write('未生成大纲。\n');
          continue;
        }
        process.stdout.write(`${renderOutlineSummary(state.outline).join('\n')}\n`);
        process.stdout.write('输入 /build 继续生成 HTML，或继续补充内容。\n');
        continue;
      }

      if (['build', '生成'].includes(command)) {
        if (!state.markdown.trim()) {
          process.stdout.write('请先输入 Markdown 内容。\n');
          continue;
        }
        if (!state.outline) {
          const planned = await planInteractively(pipeline, state, rl);
          state.outline = planned.outline;
        }
        if (!state.outline) {
          process.stdout.write('未生成大纲，无法继续 build。\n');
          continue;
        }

        const confirmed = await confirmOutline(state.outline, rl);
        if (!confirmed) {
          process.stdout.write('已取消生成，继续修改内容或输入 /plan 重新规划。\n');
          continue;
        }

        const built = await pipeline.build(state.markdown, {
          context: { skill: state.skill, answers: state.answers },
          outline: state.outline,
          theme: state.theme
        });

        if (built.kind === 'clarification') {
          state.answers = await askClarificationQuestions(built.payload, state.answers, rl);
          state.outline = null;
          continue;
        }

        const rendered = await pipeline.render(built.expanded, {
          theme: state.theme
        });
        const outputPath = path.resolve(process.cwd(), value || DEFAULT_OUTPUT_PATH);
        await mkdir(path.dirname(outputPath), { recursive: true });
        await writeFile(outputPath, rendered.html, 'utf8');
        state.lastOutputPath = path.relative(process.cwd(), outputPath);
        process.stdout.write(`已生成 HTML：${state.lastOutputPath}\n`);
        continue;
      }

      process.stdout.write(`未知命令：/${command}\n`);
    }
  } finally {
    rl.close();
  }
};
