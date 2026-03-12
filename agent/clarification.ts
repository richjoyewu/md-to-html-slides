import { analyzeMarkdown } from './analysis.js';
import { preprocessMarkdown } from './preprocess.js';
import type { ClarificationQuestion, ClarificationResult, PlanContext } from './types.js';

// Clarification gate：只在缺少关键意图时打断用户，不做无意义追问。
export const buildClarification = (markdown: string, context?: PlanContext): ClarificationResult | null => {
  const source = preprocessMarkdown(markdown);
  const analysis = analyzeMarkdown(markdown);
  const sectionCount = source.sections.length;
  const pointCount = source.sections.reduce((sum, section) => sum + section.points.length, 0);
  const rawLength = String(markdown || '').trim().length;
  const answers = context?.answers || {};
  const hasAudience = Boolean(String(answers.audience || '').trim());
  const hasSlideCount = Boolean(String(answers.slide_count || '').trim());
  const hasGoal = hasAudience && hasSlideCount;

  const questions: ClarificationQuestion[] = [];

  if (!hasAudience && (analysis.content_type === 'general' || analysis.roughness === 'very_rough' || rawLength < 220)) {
    questions.push({
      id: 'audience',
      label: '这份内容更偏课程、汇报还是宣传？',
      placeholder: '例如：课程 / 汇报 / 宣传'
    });
  }

  if (!hasSlideCount && (analysis.density !== 'low' || analysis.roughness !== 'clean' || sectionCount <= 1)) {
    questions.push({
      id: 'slide_count',
      label: '你希望大约做几页？',
      placeholder: '例如：5 页或 8 页'
    });
  }

  if (!questions.length) return null;
  if (hasGoal) return null;
  if (sectionCount >= 3 && pointCount >= 6 && rawLength >= 260 && analysis.roughness === 'clean') return null;

  const message = analysis.roughness === 'very_rough'
    ? '当前内容更像草稿，先补一点关键信息，Agent 才能更稳地帮你重组为演示大纲。'
    : '先补一点关键信息，再生成大纲会更准。';

  return {
    kind: 'clarification',
    message,
    questions: questions.slice(0, 2)
  };
};
