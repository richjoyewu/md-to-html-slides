export const DEFAULT_SKILL = 'general';

const GENERAL_OUTLINE_EXAMPLE = {
  deck_title: '理解 AI Agent 的基本结构',
  slides: [
    {
      index: 1,
      title: 'Agent 不只是聊天框',
      summary: '先用一句结论区分 Agent 和普通问答工具。',
      preview_points: ['围绕目标行动', '可连接工具', '会做多步决策'],
      detail_points: ['先定义 Agent 的最小特征', '说明它会连接工具和外部环境', '强调它重视结果而不是单次回复'],
      intent: 'define'
    },
    {
      index: 2,
      title: '为什么它更像执行系统',
      summary: '用一页解释 Agent 的核心工作方式。',
      preview_points: ['先理解目标', '再拆成步骤', '最后调用工具执行'],
      detail_points: ['解释理解目标和规划步骤的关系', '解释为什么工具调用是关键差异', '收束到执行结果而不是对话长度'],
      intent: 'explain'
    }
  ]
};

const GENERAL_EXPANDED_EXAMPLE = {
  deck_title: '理解 AI Agent 的基本结构',
  slides: [
    {
      index: 1,
      title: 'Agent 不只是聊天框',
      format: 'title-bullets',
      bullets: ['围绕目标行动', '连接工具执行', '处理多步任务'],
      body: ''
    },
    {
      index: 2,
      title: '为什么它更像执行系统',
      format: 'process',
      bullets: ['理解目标', '拆分步骤', '调用工具', '返回结果'],
      body: '把一次对话变成一条可执行链路'
    }
  ]
};

const PITCH_OUTLINE_EXAMPLE = {
  deck_title: 'Aurora Launch',
  slides: [
    {
      index: 1,
      title: '让企业知识库秒变可执行产品脑',
      summary: '开场直接给出主张，不先讲背景。',
      preview_points: ['统一知识与流程', '把资料变成动作', '更快上线 AI 工作流'],
      detail_points: ['先定义产品主张', '说明它连接知识、流程与模型', '强调上线速度和业务落地'],
      intent: 'define'
    },
    {
      index: 2,
      title: '旧方式在扩张时集体失速',
      summary: '对比旧流程和新架构的差异。',
      preview_points: ['知识散在多系统', '人工交接慢', '数据无法复用'],
      detail_points: ['旧栈靠手工整理和人工同步', '新栈把资料、流程、权限统一编排', '结论是交付速度和一致性明显提升'],
      intent: 'compare'
    },
    {
      index: 3,
      title: '三组指标证明产品正在起飞',
      summary: '用一页承接 traction 和业务证据。',
      preview_points: ['交付更快', '启用率更高', '运维更轻'],
      detail_points: ['指标必须短而硬', '优先讲增长和效率', '避免把指标写成长句说明'],
      intent: 'explain'
    }
  ]
};

const PITCH_EXPANDED_EXAMPLE = {
  deck_title: 'Aurora Launch',
  slides: [
    {
      index: 1,
      title: '让企业知识库秒变可执行产品脑',
      format: 'hero',
      bullets: ['统一知识与流程', '把资料直接变动作', '7 天内完成首个工作流'],
      body: '不是再做一个知识库，而是把知识转成可执行产品能力'
    },
    {
      index: 2,
      title: '旧方式在扩张时集体失速',
      format: 'compare',
      bullets: ['手工同步资料', '需求反复返工', '统一编排知识', '需求上线更快'],
      body: '传统交付 | Aurora 工作流'
    },
    {
      index: 3,
      title: '三组指标证明产品正在起飞',
      format: 'metrics',
      bullets: ['3x: 项目上线速度', '82%: 首周功能启用率', '45%: 运维工单下降'],
      body: '每组指标都直接对应业务价值'
    },
    {
      index: 4,
      title: '现在适合一起把行业标准改写',
      format: 'cta',
      bullets: ['开放试点合作', '支持联合发布', 'Q2 启动行业样板客户'],
      body: '这不是一个功能升级，而是一次产品范式切换'
    }
  ]
};

const createSkill = ({
  id,
  label,
  studio_label,
  description,
  studio_description,
  default_theme,
  planning,
  expansion,
  blocks,
  quality,
  examples
}) => ({
  id,
  name: id,
  label,
  studio_label,
  description,
  studio_description,
  version: 'skill@1',
  default_theme,
  planning,
  expansion,
  blocks,
  quality,
  examples,
  planner_rules: planning.rules,
  expansion_rules: expansion.rules,
  format_guidance: blocks.format_guidance,
  outline_example: examples.outline,
  expanded_example: examples.expanded
});

export const SKILLS = [
  createSkill({
    id: 'general',
    label: 'General',
    studio_label: '通用演示',
    description: 'Balanced presentation skill for courses, notes, internal explainers, and general-purpose decks.',
    studio_description: '适合课程、说明稿和一般内容整理。',
    default_theme: 'dark-card',
    planning: {
      narrative_pattern: 'clarify-and-explain',
      rules: [
        '优先把原始内容拆成清楚的单页主张，而不是机械保留原文段落顺序。',
        '每页只保留一个核心点，允许主动合并细节和背景。',
        '如果内容已经接近 slide_like，就尽量保留原有结构主线。'
      ]
    },
    expansion: {
      bullet_style: 'balanced-presentation',
      body_usage: 'supportive',
      rules: [
        '优先把长句压缩为短句化上屏语言。',
        'Bullet 要平行，避免一条讲现象、一条讲方法、一条讲备注。',
        'Summary 页要真正收束，而不是重复前文标题。'
      ]
    },
    blocks: {
      preferred: ['list', 'process', 'summary'],
      format_guidance: [
        { when: '常规解释页', format: 'title-bullets' },
        { when: '需要强调单一结论时', format: 'title-body' },
        { when: '有明显步骤顺序时', format: 'process' },
        { when: '结尾收束时', format: 'summary' }
      ]
    },
    quality: {
      focus: ['clarity', 'parallel_bullets', 'good_summary']
    },
    examples: {
      outline: GENERAL_OUTLINE_EXAMPLE,
      expanded: GENERAL_EXPANDED_EXAMPLE
    }
  }),
  createSkill({
    id: 'pitch-tech-launch',
    label: 'Pitch Tech Launch',
    studio_label: 'Pitch · 科技发布',
    description: 'High-clarity product launch and founder pitch skill for technology products, solution reveals, traction decks, and launch-event style storytelling.',
    studio_description: '适合产品发布、融资 pitch、方案发布和科技演示。',
    default_theme: 'tech-launch',
    planning: {
      narrative_pattern: 'thesis-proof-ask',
      rules: [
        '开场直接给出主张，不要先讲泛泛背景。',
        '优先采用 问题 -> 方案 -> 差异化 -> 核心能力 -> 证据 -> 路线图 -> 收束 的节奏。',
        '标题要像发布会字幕，短、硬、可单独成立，避免说明文口气。',
        '只保留能支撑产品发布叙事的内容，不要把讲稿备注搬上屏。'
      ]
    },
    expansion: {
      bullet_style: 'conclusion-first',
      body_usage: 'minimal',
      rules: [
        'Hero 页要像产品主张，不像摘要。',
        'Compare 页优先做旧方式和新方式的两栏对照。',
        'Metrics 页必须把数字写到前面，不能把指标埋进长句。',
        'CTA 页要有明确动作和合作方向，不能只是重复总结。'
      ]
    },
    blocks: {
      preferred: ['hero', 'compare', 'metrics', 'process', 'cta'],
      format_guidance: [
        { when: '封面或产品主张页', format: 'hero' },
        { when: '旧方案 vs 新方案、人工 vs 自动化', format: 'compare' },
        { when: '效率、增长、规模、收入、上线进度', format: 'metrics' },
        { when: '路线图、实施步骤、Go-to-market 节奏', format: 'process' },
        { when: '收尾、融资诉求、合作邀请', format: 'cta' }
      ]
    },
    quality: {
      focus: ['strong_opening', 'proof_with_numbers', 'clear_cta']
    },
    examples: {
      outline: PITCH_OUTLINE_EXAMPLE,
      expanded: PITCH_EXPANDED_EXAMPLE
    }
  })
];

const runtimeSkills = new Map(SKILLS.map((skill) => [skill.id, skill]));

export const SKILL_MAP = runtimeSkills;

export const normalizeSkillName = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return DEFAULT_SKILL;
  return runtimeSkills.has(normalized) ? normalized : DEFAULT_SKILL;
};

export const getSkill = (value) => runtimeSkills.get(normalizeSkillName(value)) || runtimeSkills.get(DEFAULT_SKILL);

export const registerSkill = (skill) => {
  if (!skill || typeof skill !== 'object') throw new Error('Skill definition must be an object');
  const normalizedId = String(skill.id || skill.name || '').trim().toLowerCase();
  if (!normalizedId) throw new Error('Skill definition requires id');

  const base = getSkill(skill.base_skill || skill.extends || DEFAULT_SKILL);
  const merged = createSkill({
    id: normalizedId,
    label: skill.label || base.label,
    studio_label: skill.studio_label || skill.studioLabel || skill.label || base.studio_label,
    description: skill.description || base.description,
    studio_description: skill.studio_description || skill.studioDescription || base.studio_description,
    default_theme: skill.default_theme || skill.defaultTheme || base.default_theme,
    planning: {
      narrative_pattern: skill.planning?.narrative_pattern || skill.planning?.narrativePattern || base.planning.narrative_pattern,
      rules: Array.isArray(skill.planning?.rules) && skill.planning.rules.length ? skill.planning.rules : base.planning.rules
    },
    expansion: {
      bullet_style: skill.expansion?.bullet_style || skill.expansion?.bulletStyle || base.expansion.bullet_style,
      body_usage: skill.expansion?.body_usage || skill.expansion?.bodyUsage || base.expansion.body_usage,
      rules: Array.isArray(skill.expansion?.rules) && skill.expansion.rules.length ? skill.expansion.rules : base.expansion.rules
    },
    blocks: {
      preferred: Array.isArray(skill.blocks?.preferred) && skill.blocks.preferred.length ? skill.blocks.preferred : base.blocks.preferred,
      format_guidance: Array.isArray(skill.blocks?.format_guidance) && skill.blocks.format_guidance.length
        ? skill.blocks.format_guidance
        : base.blocks.format_guidance
    },
    quality: {
      focus: Array.isArray(skill.quality?.focus) && skill.quality.focus.length ? skill.quality.focus : base.quality.focus
    },
    examples: {
      outline: skill.examples?.outline || base.examples.outline,
      expanded: skill.examples?.expanded || base.examples.expanded
    }
  });

  runtimeSkills.set(merged.id, merged);
  return merged;
};
