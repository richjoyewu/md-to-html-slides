import { analyzeMarkdown } from './analysis.js';
import type { ClarificationQuestion, ClarificationResult, OutlineResult, PlanContext } from './types.js';

function dedupeQuestions(questions: ClarificationQuestion[]): ClarificationQuestion[] {
  const seen = new Set<string>();
  return questions.filter((question) => {
    if (seen.has(question.id)) return false;
    seen.add(question.id);
    return true;
  });
}

const hasAnswer = (context: PlanContext | undefined, questionId: string): boolean =>
  Boolean(String(context?.answers?.[questionId] || '').trim());

const unansweredQuestions = (
  questions: ClarificationQuestion[],
  context?: PlanContext
): ClarificationQuestion[] => questions.filter((question) => !hasAnswer(context, question.id));

const buildClarificationResult = (
  message: string,
  questions: ClarificationQuestion[],
  context?: PlanContext,
  meta?: ClarificationResult['meta']
): ClarificationResult | null => {
  const pending = unansweredQuestions(questions, context);
  if (!pending.length) return null;
  return {
    kind: 'clarification',
    message,
    questions: pending,
    meta
  };
};

function fallbackQuestions(options: {
  rough?: boolean;
  dense?: boolean;
  thin?: boolean;
  askGoal?: boolean;
}): ClarificationQuestion[] {
  const questions: ClarificationQuestion[] = [];

  if (options.rough) {
    questions.push({
      id: 'audience',
      label: '这份内容主要给谁看？',
      placeholder: '例如：零基础学员、内部团队、客户、投资人',
    });
  }

  if (options.dense || options.thin) {
    questions.push({
      id: 'slide_count',
      label: '你希望大约生成多少页？',
      placeholder: '例如：6 页、8 页、10 页',
    });
  }

  if (options.askGoal || questions.length === 0) {
    questions.push({
      id: 'goal',
      label: '这份演示最想让观众记住什么？',
      placeholder: '例如：理解 Agent 和 Chatbot 的区别',
    });
  }

  return dedupeQuestions(questions).slice(0, 2);
}

// 兜底追问：只在输入极短或结构极弱时介入，避免规则层抢主判断。
export function buildClarification(markdown: string, context?: PlanContext): ClarificationResult | null {
  const analysis = analyzeMarkdown(markdown);
  const rawLength = markdown.trim().length;
  const obviouslyShort = rawLength < 20;
  const structurallyThin = analysis.section_count === 0 || (analysis.section_count <= 1 && analysis.point_count <= 1);
  const roughAndThin = analysis.roughness === 'very_rough' && analysis.section_count <= 1;

  if (!obviouslyShort && !structurallyThin && !roughAndThin) {
    return null;
  }

  return buildClarificationResult(
    '当前内容过短或结构不足，先补一点关键信息再生成大纲会更准。',
    fallbackQuestions({
    rough: analysis.roughness !== 'clean',
    dense: analysis.density === 'high',
    thin: structurallyThin,
    askGoal: true,
    }),
    context
  );
}

// 主追问逻辑：优先依赖 Planner 的置信度和不确定点。
export function buildClarificationFromPlan(outline: OutlineResult, context?: PlanContext): ClarificationResult | null {
  const meta = outline.meta;
  if (!meta) return null;

  const questions: ClarificationQuestion[] = [];
  const uncertainties = meta.uncertainties ?? [];

  for (const item of uncertainties) {
    const normalized = item.toLowerCase();
    if (normalized.includes('audience') || normalized.includes('受众')) {
      questions.push({
        id: 'audience',
        label: '这份内容主要给谁看？',
        placeholder: '例如：零基础学员、管理层、客户、投资人',
      });
      continue;
    }

    if (normalized.includes('slide') || normalized.includes('页数')) {
      questions.push({
        id: 'slide_count',
        label: '你希望大约生成多少页？',
        placeholder: '例如：6 页、8 页、10 页',
      });
      continue;
    }

    if (normalized.includes('goal') || normalized.includes('重点') || normalized.includes('核心')) {
      questions.push({
        id: 'goal',
        label: '这份演示最想让观众记住什么？',
        placeholder: '例如：OpenClaw 的本地优势',
      });
    }
  }

  const deduped = dedupeQuestions(questions).slice(0, 2);
  if (deduped.length > 0) {
    return buildClarificationResult(
      '当前规划还有 1 到 2 个关键点不够确定，补充后继续生成会更准。',
      deduped,
      context,
      meta
    );
  }

  const confidence = meta.planning_confidence ?? 0.75;
  const thinOutline = outline.slides.length <= 2;

  if (confidence >= 0.58 && !thinOutline) {
    return null;
  }

  return buildClarificationResult(
    '当前大纲还不够稳定，补充关键信息后再继续生成。',
    fallbackQuestions({
    rough: confidence < 0.58,
    dense: false,
    thin: thinOutline,
    askGoal: !meta.core_message || meta.core_message.length < 8,
    }),
    context,
    meta
  );
}
