import { getSkill } from '../shared/skills.js';
import type { ExpandedResult, ExpandedSlide } from './types.js';

export interface QualityFocusCheck {
  focus: string;
  applicable: boolean;
  issue: string;
  passed: boolean;
}

const compactText = (value: string = ''): string => String(value || '').replace(/\s+/g, ' ').trim();
const hasNumericLead = (value: string = ''): boolean => /^[0-9][0-9a-zA-Z.%+/xX-]{0,12}/.test(compactText(value));
const isDraftySurface = (value: string = ''): boolean =>
  compactText(value).length > 40 || /可能|大概|比如|然后|后面|另外|顺便|我觉得|我想|可以先|先看/.test(compactText(value));

const openingSurface = (slide: ExpandedSlide | undefined): string =>
  slide ? compactText([slide.title, slide.body, ...slide.bullets].join(' ')) : '';

const assertiveOpening = (value: string): boolean =>
  /不是|必须|已经|正在|重新定义|窗口期|现在|直接|改写|主张|失速|一起/.test(value);

const checkClarity = (slides: ExpandedSlide[]): QualityFocusCheck['passed'] => {
  const surfaces = slides.flatMap((slide) => [...slide.bullets, slide.body].filter(Boolean));
  if (!surfaces.length) return false;
  const noisy = surfaces.filter((entry) => isDraftySurface(entry)).length;
  return noisy / Math.max(1, surfaces.length) <= 0.2;
};

const hasParallelBulletOpportunity = (slides: ExpandedSlide[]): boolean =>
  slides.some((slide) => slide.format === 'title-bullets' && slide.bullets.length >= 2);

const checkParallelBullets = (slides: ExpandedSlide[]): QualityFocusCheck['passed'] => {
  const bulletSlides = slides.filter((slide) => slide.format === 'title-bullets' && slide.bullets.length >= 2);
  if (!bulletSlides.length) return false;

  return bulletSlides.every((slide) => {
    const lengths = slide.bullets.map((item) => compactText(item).length);
    const max = Math.max(...lengths);
    const min = Math.min(...lengths);
    return max - min <= 12 && !slide.bullets.some((item) => /[:：]/.test(compactText(item)));
  });
};

const hasSummaryOpportunity = (slides: ExpandedSlide[]): boolean => slides.length >= 4;

const checkGoodSummary = (slides: ExpandedSlide[]): QualityFocusCheck['passed'] => {
  const last = slides[slides.length - 1];
  if (!last) return false;
  return last.format === 'summary' || last.format === 'cta';
};

const checkStrongOpening = (slides: ExpandedSlide[]): QualityFocusCheck['passed'] => {
  const first = slides[0];
  if (!first) return false;
  return first.format === 'hero' || (first.bullets.length >= 2 && compactText(first.title).length >= 6);
};

const hasProofOpportunity = (slides: ExpandedSlide[]): boolean => {
  if (slides.some((slide) => slide.format === 'metrics')) return true;
  if (slides.flatMap((slide) => slide.bullets).some((item) => hasNumericLead(item))) return true;
  return slides.some((slide) => /指标|数据|增长|效率|收入|用户|客户|转化|速度|工单|留存/.test(compactText(slide.title)));
};

const checkProofWithNumbers = (slides: ExpandedSlide[]): QualityFocusCheck['passed'] => {
  if (slides.some((slide) => slide.format === 'metrics')) return true;
  const numericBullets = slides.flatMap((slide) => slide.bullets).filter((item) => hasNumericLead(item));
  return numericBullets.length >= 2;
};

const hasCtaOpportunity = (slides: ExpandedSlide[]): boolean => slides.length >= 4;

const checkClearCta = (slides: ExpandedSlide[]): QualityFocusCheck['passed'] => {
  const last = slides[slides.length - 1];
  return Boolean(last) && last.format === 'cta';
};

const hasFounderConvictionOpportunity = (slides: ExpandedSlide[]): boolean => slides.length >= 3;

const checkFounderConviction = (slides: ExpandedSlide[]): QualityFocusCheck['passed'] => {
  const first = slides[0];
  if (!first) return false;
  if (first.format === 'hero') return true;
  return assertiveOpening(openingSurface(first));
};

const FOCUS_CHECKS: Record<string, {
  applicable: (slides: ExpandedSlide[]) => boolean;
  issue: string;
  run: (slides: ExpandedSlide[]) => boolean;
}> = {
  clarity: {
    applicable: (slides) => slides.length > 0,
    issue: '未满足 skill quality focus: clarity',
    run: checkClarity
  },
  parallel_bullets: {
    applicable: hasParallelBulletOpportunity,
    issue: '未满足 skill quality focus: parallel_bullets',
    run: checkParallelBullets
  },
  good_summary: {
    applicable: hasSummaryOpportunity,
    issue: '未满足 skill quality focus: good_summary',
    run: checkGoodSummary
  },
  strong_opening: {
    applicable: (slides) => slides.length > 0,
    issue: '未满足 skill quality focus: strong_opening',
    run: checkStrongOpening
  },
  proof_with_numbers: {
    applicable: hasProofOpportunity,
    issue: '未满足 skill quality focus: proof_with_numbers',
    run: checkProofWithNumbers
  },
  clear_cta: {
    applicable: hasCtaOpportunity,
    issue: '未满足 skill quality focus: clear_cta',
    run: checkClearCta
  },
  clear_ask: {
    applicable: hasCtaOpportunity,
    issue: '未满足 skill quality focus: clear_ask',
    run: checkClearCta
  },
  founder_conviction: {
    applicable: hasFounderConvictionOpportunity,
    issue: '未满足 skill quality focus: founder_conviction',
    run: checkFounderConviction
  }
};

export const evaluateSkillQualityFocus = (expanded: ExpandedResult): QualityFocusCheck[] => {
  const skill = getSkill(expanded.meta?.skill || expanded.meta?.profile);
  const focuses = Array.isArray(skill.quality?.focus) ? skill.quality.focus : [];
  return focuses
    .filter((focus) => Boolean(FOCUS_CHECKS[focus]))
    .map((focus) => {
      const checker = FOCUS_CHECKS[focus];
      const applicable = checker.applicable(expanded.slides);
      return {
        focus,
        applicable,
        issue: checker.issue,
        passed: applicable ? checker.run(expanded.slides) : true
      };
    });
};

export const applySkillQualityFocusChecks = (expanded: ExpandedResult): ExpandedResult => {
  const checks = evaluateSkillQualityFocus(expanded);
  if (!checks.length) return expanded;

  const skillName = expanded.meta?.skill || expanded.meta?.profile || getSkill(undefined).name;
  const reviewIssues = new Set(expanded.meta?.review_issues || []);
  const actionsTaken = new Set(expanded.meta?.actions_taken || []);

  checks.filter((item) => item.applicable && !item.passed).forEach((item) => reviewIssues.add(item.issue));
  actionsTaken.add(`quality.focus checked: ${checks.map((item) => item.focus).join(', ')}`);
  const applicableChecks = checks.filter((item) => item.applicable);
  if (applicableChecks.length && applicableChecks.every((item) => item.passed)) {
    actionsTaken.add('quality.focus checks passed');
  }

  return {
    ...expanded,
    meta: {
      profile: expanded.meta?.profile || skillName,
      skill: expanded.meta?.skill || skillName,
      rewrite_quality: expanded.meta?.rewrite_quality ?? 0.72,
      tone: expanded.meta?.tone || 'presentation',
      review_issues: [...reviewIssues],
      actions_taken: [...actionsTaken]
    }
  };
};
