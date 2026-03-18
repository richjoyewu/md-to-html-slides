import { expandedToRenderDeck, normalizeClarification, normalizeExpanded, normalizeOutline, outlineToApiPayload } from '../shared/core.js';
import { DECK_PROFILES, getDeckProfile } from '../shared/deck-profiles.js';
import { THEMES } from '../templates/index.mjs';

const SAMPLE_MARKDOWN = `# Aurora Launch
一句话主张：把企业知识和业务流程直接变成可执行产品能力。

## 市场正在被慢交付拖住
- 知识分散在文档、工单和 IM 里
- 需求改一次，流程就要重复同步一次
- AI 试点很多，但真正上线很慢

## Aurora 重新定义企业工作流
- 把知识、权限、流程统一建模
- 让团队用自然语言编排执行链路
- 7 天内完成首个业务工作流上线

## 旧方式 vs Aurora
- 旧方式依赖人工整理和交接
- 项目一多，响应速度明显下降
- Aurora 把知识、流程和模型统一编排
- 需求变化后仍能快速迭代上线

## 三个指标说明它已经跑起来
- 3x 项目上线速度提升
- 82% 首周功能启用率
- 45% 运维工单下降

## 下一阶段怎么扩张
- 先做行业样板客户
- 再开放标准化模板市场
- 最后形成合作伙伴生态

## 现在是启动试点的窗口期
- 开放联合发布与试点合作
- 支持行业场景共创
- Q2 启动首批样板客户`;

const markdownInput = document.getElementById('markdownInput');
const sourceDropzone = document.getElementById('sourceDropzone');
const sourceFileInput = document.getElementById('sourceFileInput');
const sourceFileMeta = document.getElementById('sourceFileMeta');
const pickFileBtn = document.getElementById('pickFileBtn');
const profileSelect = document.getElementById('profileSelect');
const profileHint = document.getElementById('profileHint');
const audienceInput = document.getElementById('audienceInput');
const goalInput = document.getElementById('goalInput');
const slideCountInput = document.getElementById('slideCountInput');
const densityToggle = document.getElementById('densityToggle');
const rewriteToggle = document.getElementById('rewriteToggle');
const useSampleBtn = document.getElementById('useSampleBtn');
const clearInputBtn = document.getElementById('clearInputBtn');
const plannerStatus = document.getElementById('plannerStatus');
const planMarkdownBtn = document.getElementById('planMarkdownBtn');
const confirmOutlineBtn = document.getElementById('confirmOutlineBtn');
const addSlideBtn = document.getElementById('addSlideBtn');
const outlinePanel = document.getElementById('outlinePanel');
const outlineSection = document.querySelector('.outline-panel');
const outlineToolbar = document.getElementById('outlineToolbar');
const outlineSummary = document.getElementById('outlineSummary');
const themeGrid = document.getElementById('themeGrid');
const compareGrid = document.getElementById('compareGrid');
const previewFrame = document.getElementById('previewFrame');
const previewTitle = document.getElementById('previewTitle');
const previewSubtitle = document.getElementById('previewSubtitle');
const slideCountPill = document.getElementById('slideCountPill');
const copyHtmlBtn = document.getElementById('copyHtmlBtn');
const openDeckBtn = document.getElementById('openDeckBtn');
const previewSummary = document.getElementById('previewSummary');
const themeHighlight = document.getElementById('themeHighlight');
const toast = document.getElementById('toast');
const stepPlanBtn = document.getElementById('stepPlanBtn');
const stepPreviewBtn = document.getElementById('stepPreviewBtn');
const planView = document.getElementById('planView');
const previewView = document.getElementById('previewView');
const backToPlanBtn = document.getElementById('backToPlanBtn');
const processBadge = document.getElementById('processBadge');
const processSteps = document.getElementById('processSteps');

let activeProfile = getDeckProfile('pitch-tech-launch');
let activeTheme = THEMES.find((theme) => theme.name === activeProfile.default_theme) || THEMES[0];
let currentHtml = '';
let outlinePlan = null;
let expandedDeck = null;
let toastTimer = null;
let clarificationAnswers = {};
let importedSource = null;
let briefPreferences = {
  density: 'balanced',
  rewrite: 'rewrite'
};

const TASK_STATE = {
  IDLE: 'idle',
  PLANNING: 'planning',
  CLARIFICATION: 'clarification',
  OUTLINE_READY: 'outline_ready',
  EXPANDING: 'expanding',
  PREVIEW_READY: 'preview_ready',
  FAILED: 'failed'
};

let taskState = TASK_STATE.IDLE;

const getThemeLabel = (name) => THEMES.find((theme) => theme.name === name)?.label || name || '未指定';
const getConfidenceLabel = (value) => `${Math.round(Number(value || 0) * 100)}%`;
const INTENT_OPTIONS = [
  ['define', '定义'],
  ['explain', '解释'],
  ['compare', '对比'],
  ['example', '案例'],
  ['process', '流程'],
  ['summary', '总结'],
  ['cta', '收尾']
];
const DENSITY_LABELS = {
  concise: '简洁',
  balanced: '平衡',
  detailed: '详细'
};
const REWRITE_LABELS = {
  rewrite: '演讲重构',
  preserve: '忠实整理'
};
const SAMPLE_BRIEF = {
  'general': {
    audience: '内部团队',
    goal: '帮助观众快速理解主题主线和关键结论',
    slide_count: '6 页',
    density: 'balanced',
    rewrite: 'rewrite'
  },
  'pitch-tech-launch': {
    audience: '投资人 / 客户',
    goal: '让观众快速理解产品价值、差异化与商业机会',
    slide_count: '8 页',
    density: 'balanced',
    rewrite: 'rewrite'
  }
};

const escapeHtml = (value = '') => {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const showToast = (message) => {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 1500);
};

const setPlannerStatus = (message) => {
  plannerStatus.textContent = message;
};

const formatFileSize = (bytes = 0) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const updateSourceFileMeta = () => {
  if (!sourceFileMeta) return;
  if (!importedSource?.name) {
    sourceFileMeta.textContent = '未导入文件';
    return;
  }
  const size = formatFileSize(importedSource.size);
  sourceFileMeta.textContent = size ? `${importedSource.name} · ${size}` : importedSource.name;
};

const renderChoiceGroup = (group, value) => {
  document.querySelectorAll(`[data-choice-group="${group}"]`).forEach((button) => {
    button.classList.toggle('active', button.dataset.choiceValue === value);
  });
};

const renderBriefPreferences = () => {
  renderChoiceGroup('density', briefPreferences.density);
  renderChoiceGroup('rewrite', briefPreferences.rewrite);
};

const applyAnswersToBrief = (answers = {}) => {
  if (answers.audience && audienceInput) audienceInput.value = answers.audience;
  if (answers.goal && goalInput) goalInput.value = answers.goal;
  if (answers.slide_count && slideCountInput) slideCountInput.value = answers.slide_count;
};

const collectBriefAnswers = () => {
  const answers = {};
  if (audienceInput?.value.trim()) answers.audience = audienceInput.value.trim();
  if (goalInput?.value.trim()) answers.goal = goalInput.value.trim();
  if (slideCountInput?.value.trim()) answers.slide_count = slideCountInput.value.trim();
  answers.density_preference = briefPreferences.density;
  answers.rewrite_preference = briefPreferences.rewrite;
  return answers;
};

const collectPlannerAnswers = () => ({
  ...collectBriefAnswers(),
  ...clarificationAnswers
});

const applySampleBrief = () => {
  const sample = SAMPLE_BRIEF[activeProfile.name] || SAMPLE_BRIEF.general;
  if (audienceInput) audienceInput.value = sample.audience;
  if (goalInput) goalInput.value = sample.goal;
  if (slideCountInput) slideCountInput.value = sample.slide_count;
  briefPreferences = {
    density: sample.density || 'balanced',
    rewrite: sample.rewrite || 'rewrite'
  };
  renderBriefPreferences();
};

const resetWorkflow = (statusMessage = '输入内容已变更，请重新生成每页大纲') => {
  outlinePlan = null;
  clarificationAnswers = {};
  if (addSlideBtn) addSlideBtn.disabled = true;
  renderOutlineToolbar(null);
  renderOutlineList(outlinePanel, null, '输入已变更，请重新生成大纲');
  renderOutlineSummary(null);
  setPreviewLocked();
  setPlannerStatus(statusMessage);
  setStep('plan');
};

const handlePlanningInputChange = (statusMessage = '输入内容已变更，请重新生成每页大纲') => {
  resetWorkflow(statusMessage);
};

const readTextFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(new Error('读取文件失败'));
  reader.readAsText(file, 'utf-8');
});

const loadSourceFile = async (file) => {
  if (!file) return;

  const allowed = /\.(md|markdown|txt)$/i.test(file.name) || ['text/plain', 'text/markdown'].includes(file.type);
  if (!allowed) {
    showToast('目前只支持导入 Markdown 或 TXT');
    return;
  }

  try {
    const text = String(await readTextFile(file)).trim();
    if (!text) {
      showToast('文件内容为空');
      return;
    }

    importedSource = { name: file.name, size: file.size };
    updateSourceFileMeta();
    markdownInput.value = text;
    handlePlanningInputChange(`已导入 ${file.name}，请生成每页大纲。`);
    showToast('文件已导入');
  } catch (error) {
    showToast(error?.message || '读取文件失败');
  } finally {
    if (sourceFileInput) sourceFileInput.value = '';
  }
};

const buildEmptySlide = (index) => ({
  index,
  title: `新增页面 ${index}`,
  summary: '补充这一页想传达的核心结论',
  preview_points: ['填写第一条上屏要点'],
  detail_points: ['填写第一条上屏要点'],
  intent: 'explain'
});

const sanitizeOutlineSlide = (slide, index) => {
  const detailPoints = Array.isArray(slide?.detail_points)
    ? slide.detail_points.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 6)
    : [];
  const previewPoints = detailPoints.slice(0, 3);
  const fallbackSummary = String(slide?.summary || detailPoints[0] || '补充这一页想传达的核心结论').trim();
  const intent = INTENT_OPTIONS.some(([value]) => value === slide?.intent) ? slide.intent : 'explain';

  return {
    index,
    title: String(slide?.title || `新增页面 ${index}`).trim() || `新增页面 ${index}`,
    summary: fallbackSummary,
    preview_points: previewPoints.length ? previewPoints : [fallbackSummary].slice(0, 3),
    detail_points: detailPoints.length ? detailPoints : [fallbackSummary],
    intent
  };
};

const sanitizeOutlinePlan = (plan) => {
  if (!plan || plan.kind === 'clarification') return plan;
  return {
    ...plan,
    slides: (plan.slides || []).map((slide, index) => sanitizeOutlineSlide(slide, index + 1))
  };
};

const invalidatePreviewFromOutline = () => {
  currentHtml = '';
  expandedDeck = null;
  previewFrame.srcdoc = '<!doctype html><html><body style="margin:0;display:grid;place-items:center;height:100vh;background:#05070d;color:#eef3ff;font-family:system-ui,sans-serif">大纲已更新，请重新生成展示内容</body></html>';
  previewTitle.textContent = '选择主题并导出 HTML';
  if (previewSubtitle) previewSubtitle.textContent = '大纲已更新，请重新生成 HTML 预览。';
  slideCountPill.textContent = '0 页';
  compareGrid.innerHTML = '';
  stepPreviewBtn.disabled = true;
  copyHtmlBtn.disabled = true;
  openDeckBtn.disabled = true;
  renderThemeHighlight();
  syncTaskState(TASK_STATE.OUTLINE_READY);
  setPlannerStatus('大纲已手动调整，请重新生成 HTML 预览。');
  setStep('plan');
};

const patchOutlinePlan = (mutator, options = {}) => {
  if (!outlinePlan || outlinePlan.kind === 'clarification') return;
  const draft = sanitizeOutlinePlan({
    ...outlinePlan,
    slides: outlinePlan.slides.map((slide) => ({ ...slide, preview_points: [...slide.preview_points], detail_points: [...slide.detail_points] }))
  });
  mutator(draft);
  outlinePlan = sanitizeOutlinePlan(draft);
  renderOutlineToolbar(outlinePlan);
  renderOutlineSummary(outlinePlan);
  renderOutlineList(outlinePanel, outlinePlan, '未生成大纲');
  if (!options.keepPreview) invalidatePreviewFromOutline();
};

const markOutlineEdited = () => {
  if (!outlinePlan || outlinePlan.kind === 'clarification') return;
  renderOutlineToolbar(outlinePlan);
  renderOutlineSummary(outlinePlan);
  if (expandedDeck || currentHtml) {
    invalidatePreviewFromOutline();
    return;
  }
  syncTaskState(TASK_STATE.OUTLINE_READY);
  setPlannerStatus('大纲已手动调整，请确认后生成 HTML。');
};

const renderProcessState = () => {
  if (!processBadge || !processSteps) return;

  const hasInput = Boolean(markdownInput?.value.trim());
  const steps = [
    { index: '01', title: '输入内容', description: '粘贴文稿或 Markdown', state: hasInput ? 'done' : 'active' },
    { index: '02', title: '分析与拆页', description: '生成每页标题与重点', state: 'pending' },
    { index: '03', title: '确认结构', description: '检查页数、重点与主题建议', state: 'pending' },
    { index: '04', title: '预览与导出', description: '选择主题并导出 HTML', state: 'pending' }
  ];

  let badgeText = '等待输入';
  let badgeTone = 'muted';

  if (hasInput) {
    steps[0].state = 'done';
    steps[1].state = 'active';
    badgeText = '准备生成大纲';
    badgeTone = 'accent';
  }

  if (taskState === TASK_STATE.PLANNING) {
    badgeText = '正在分析内容';
    badgeTone = 'accent';
    steps[1].state = 'active';
  }

  if (taskState === TASK_STATE.CLARIFICATION) {
    badgeText = '等待补充信息';
    badgeTone = 'warning';
    steps[1].state = 'done';
    steps[2].state = 'active';
  }

  if (taskState === TASK_STATE.OUTLINE_READY) {
    badgeText = '等待确认大纲';
    badgeTone = 'success';
    steps[1].state = 'done';
    steps[2].state = 'active';
  }

  if (taskState === TASK_STATE.EXPANDING) {
    badgeText = '正在生成预览';
    badgeTone = 'accent';
    steps[1].state = 'done';
    steps[2].state = 'done';
    steps[3].state = 'active';
  }

  if (taskState === TASK_STATE.PREVIEW_READY) {
    badgeText = '可以导出';
    badgeTone = 'success';
    steps[1].state = 'done';
    steps[2].state = 'done';
    steps[3].state = 'done';
  }

  if (taskState === TASK_STATE.FAILED) {
    badgeText = '生成失败';
    badgeTone = 'warning';
    steps[1].state = hasInput ? 'active' : 'pending';
  }

  processBadge.textContent = badgeText;
  processBadge.className = `preview-pill process-pill ${badgeTone}`;
  processSteps.innerHTML = steps.map((step) => `
    <article class="process-step ${step.state}">
      <span class="process-step-index">${step.index}</span>
      <div class="process-step-copy">
        <strong>${escapeHtml(step.title)}</strong>
        <span>${escapeHtml(step.description)}</span>
      </div>
    </article>
  `).join('');
};

const renderOutlineSummary = (plan = outlinePlan) => {
  if (!outlineSummary) return;

  if (!plan) {
    outlineSummary.classList.add('outline-summary-empty');
    outlineSummary.innerHTML = `
      <div class="outline-summary-placeholder">
        生成后会显示页数、规划置信度、场景和推荐主题。
      </div>
    `;
    return;
  }

  if (plan.kind === 'clarification') {
    const confidence = Number(plan.meta?.planning_confidence || 0);
    outlineSummary.classList.remove('outline-summary-empty');
    outlineSummary.innerHTML = `
      <div class="outline-metrics">
        <article class="outline-metric">
          <span>当前状态</span>
          <strong>需要补充信息</strong>
        </article>
        <article class="outline-metric">
          <span>问题数</span>
          <strong>${String(plan.questions?.length || 0)} 项</strong>
        </article>
        <article class="outline-metric">
          <span>规划置信度</span>
          <strong>${getConfidenceLabel(confidence)}</strong>
        </article>
      </div>
      <div class="outline-summary-note">
        系统缺少 1-2 个关键上下文，补充后会更稳定地拆页和推荐主题。
      </div>
    `;
    return;
  }

  const profile = getDeckProfile(plan.meta?.profile);
  const recommendedTheme = getThemeLabel(plan.meta?.default_theme);
  outlineSummary.classList.remove('outline-summary-empty');
  outlineSummary.innerHTML = `
    <div class="outline-metrics">
      <article class="outline-metric">
        <span>页数</span>
        <strong>${String(plan.slides.length)} 页</strong>
      </article>
      <article class="outline-metric">
        <span>规划置信度</span>
        <strong>${getConfidenceLabel(plan.meta?.planning_confidence)}</strong>
      </article>
      <article class="outline-metric">
        <span>场景</span>
        <strong>${escapeHtml(profile.studio_label)}</strong>
      </article>
      <article class="outline-metric">
        <span>推荐主题</span>
        <strong>${escapeHtml(recommendedTheme)}</strong>
      </article>
    </div>
    <div class="outline-summary-note">
      ${escapeHtml(plan.meta?.deck_goal || plan.meta?.core_message || '确认结构后再进入 HTML 预览。')}
    </div>
  `;
};

const renderOutlineToolbar = (plan = outlinePlan) => {
  if (!outlineToolbar) return;

  if (!plan) {
    outlineToolbar.classList.add('outline-toolbar-empty');
    outlineToolbar.innerHTML = '<div class="outline-toolbar-placeholder">生成大纲后，这里会显示结构编辑和质量控制入口。</div>';
    return;
  }

  if (plan.kind === 'clarification') {
    outlineToolbar.classList.remove('outline-toolbar-empty');
    outlineToolbar.innerHTML = `
      <div class="outline-toolbar-main">
        <div class="outline-toolbar-copy">
          <strong>Clarification Gate</strong>
          <span>系统判断当前信息不足，先补 1 到 2 个关键问题再继续规划。</span>
        </div>
        <div class="outline-toolbar-pills">
          <span class="outline-toolbar-pill warning">等待补充信息</span>
          <span class="outline-toolbar-pill">密度 ${escapeHtml(DENSITY_LABELS[briefPreferences.density] || briefPreferences.density)}</span>
        </div>
      </div>
    `;
    return;
  }

  const confidence = Number(plan.meta?.planning_confidence || 0);
  const confidenceTone = confidence < 0.58 ? 'warning' : confidence < 0.74 ? 'accent' : 'success';
  outlineToolbar.classList.remove('outline-toolbar-empty');
  outlineToolbar.innerHTML = `
    <div class="outline-toolbar-main">
      <div class="outline-toolbar-copy">
        <strong>先确认结构，再生成 HTML</strong>
        <span>标题、顺序、页面意图和上屏要点都可以直接修改。</span>
      </div>
      <div class="outline-toolbar-pills">
        <span class="outline-toolbar-pill ${confidenceTone}">规划置信度 ${getConfidenceLabel(confidence)}</span>
        <span class="outline-toolbar-pill">密度 ${escapeHtml(DENSITY_LABELS[briefPreferences.density] || briefPreferences.density)}</span>
        <span class="outline-toolbar-pill">改写 ${escapeHtml(REWRITE_LABELS[briefPreferences.rewrite] || briefPreferences.rewrite)}</span>
      </div>
    </div>
  `;
};

const renderThemeHighlight = () => {
  if (!previewSummary || !themeHighlight) return;

  if (!expandedDeck) {
    previewSummary.textContent = '先确认大纲，再选择主题并导出 HTML。';
    themeHighlight.classList.add('theme-highlight-empty');
    themeHighlight.innerHTML = `
      <div class="theme-highlight-placeholder">
        生成完成后，这里会显示当前主题、适用场景和导出入口。
      </div>
    `;
    return;
  }

  const profile = getDeckProfile(expandedDeck.meta?.profile || outlinePlan?.meta?.profile || activeProfile.name);
  const recommended = outlinePlan?.meta?.default_theme === activeTheme.name;
  previewSummary.textContent = `已生成 ${expandedDeck.slides.length} 页内容，选择主题后可直接导出 HTML。`;
  themeHighlight.classList.remove('theme-highlight-empty');
  themeHighlight.innerHTML = `
    <div class="theme-highlight-card">
      <div class="theme-highlight-head">
        <strong>${escapeHtml(activeTheme.label)}</strong>
        <span class="theme-chip">${recommended ? '推荐主题' : '当前主题'}</span>
      </div>
      <p class="theme-highlight-copy">${escapeHtml(activeTheme.description)}</p>
      <div class="theme-swatch">
        ${(activeTheme.swatches || []).map((color) => `<i style="background:${color}"></i>`).join('')}
      </div>
      <div class="theme-highlight-meta">
        <div>
          <span>适用场景</span>
          <strong>${escapeHtml(profile.studio_label)}</strong>
        </div>
        <div>
          <span>输出格式</span>
          <strong>单文件 HTML</strong>
        </div>
      </div>
    </div>
  `;
};

const renderProfileSelect = () => {
  if (!profileSelect) return;
  profileSelect.innerHTML = DECK_PROFILES.map((profile) => `
    <option value="${escapeHtml(profile.name)}">${escapeHtml(profile.studio_label)}</option>
  `).join('');
  profileSelect.value = activeProfile.name;
  if (profileHint) profileHint.textContent = activeProfile.studio_description;
};

const syncProfileTheme = () => {
  const profileTheme = THEMES.find((theme) => theme.name === activeProfile.default_theme);
  if (profileTheme) activeTheme = profileTheme;
};

const syncTaskState = (nextState) => {
  taskState = nextState;
  document.body.dataset.taskState = nextState;

  const hasOutline = nextState === TASK_STATE.CLARIFICATION || nextState === TASK_STATE.OUTLINE_READY || nextState === TASK_STATE.EXPANDING || nextState === TASK_STATE.PREVIEW_READY;
  const previewReady = nextState === TASK_STATE.PREVIEW_READY;
  const planning = nextState === TASK_STATE.PLANNING;
  const expanding = nextState === TASK_STATE.EXPANDING;
  const editableOutline = nextState === TASK_STATE.OUTLINE_READY || nextState === TASK_STATE.PREVIEW_READY;

  outlineSection?.classList.toggle('has-results', hasOutline);
  planMarkdownBtn.disabled = planning;
  confirmOutlineBtn.disabled = ![TASK_STATE.OUTLINE_READY].includes(nextState);
  if (addSlideBtn) addSlideBtn.disabled = !editableOutline;
  stepPreviewBtn.disabled = !previewReady;

  if (planning || expanding) {
    copyHtmlBtn.disabled = true;
    openDeckBtn.disabled = true;
  }

  renderProcessState();
};

const readEventStream = async (response, handlers) => {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Streaming is not supported in this browser');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() || '';

    for (const chunk of chunks) {
      let event = 'message';
      const dataLines = [];
      for (const line of chunk.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
      }
      const dataText = dataLines.join('\n');
      const payload = dataText ? JSON.parse(dataText) : {};
      handlers?.[event]?.(payload);
    }
  }
};


const normalizePlan = (payload) =>
  payload?.kind === 'clarification'
    ? normalizeClarification(payload)
    : normalizeOutline(payload);

const setStep = (step) => {
  const planActive = step === 'plan';
  stepPlanBtn.classList.toggle('active', planActive);
  stepPreviewBtn.classList.toggle('active', !planActive);
  planView.classList.toggle('active', planActive);
  previewView.classList.toggle('active', !planActive);
};

const setPreviewLocked = () => {
  currentHtml = '';
  expandedDeck = null;
  previewFrame.srcdoc = '<!doctype html><html><body style="margin:0;display:grid;place-items:center;height:100vh;background:#05070d;color:#eef3ff;font-family:system-ui,sans-serif">请先确认大纲并生成展示内容</body></html>';
  previewTitle.textContent = '选择主题并导出 HTML';
  if (previewSubtitle) previewSubtitle.textContent = '先确认大纲，再进入 HTML 预览。';
  slideCountPill.textContent = '0 页';
  compareGrid.innerHTML = '';
  stepPreviewBtn.disabled = true;
  copyHtmlBtn.disabled = true;
  openDeckBtn.disabled = true;
  renderThemeHighlight();
  syncTaskState(TASK_STATE.IDLE);
};

const renderOutlineList = (container, plan, emptyText, mode = 'plan') => {
  const isClarification = plan?.kind === 'clarification';
  const isEmpty = !plan || (!isClarification && !plan.slides?.length);
  if (container === outlinePanel) {
    outlineSection?.classList.toggle('is-empty', isEmpty);
  }
  container.classList.toggle('outline-list-empty', isEmpty);

  if (isClarification) {
    container.innerHTML = `
      <div class="outline-item clarification-card">
        <div class="clarification-head">
          <div class="outline-title">${escapeHtml(plan.message || '需要补充信息')}</div>
          <span class="outline-toolbar-pill warning">Gate</span>
        </div>
        ${plan.meta ? `<div class="clarification-meta">当前规划置信度 ${(Number(plan.meta.planning_confidence || 0) * 100).toFixed(0)}%</div>` : ''}
        <div class="clarification-form">
          ${(plan.questions || []).map((item) => `
            <label class="clarification-field">
              <span>${escapeHtml(item.label)}</span>
              <input data-clarify-id="${escapeHtml(item.id)}" type="text" value="${escapeHtml(collectPlannerAnswers()[item.id] || '')}" placeholder="${escapeHtml(item.placeholder || '')}" />
            </label>
          `).join('')}
          <button id="clarificationSubmitBtn" class="editor-btn primary">补充信息后继续生成</button>
        </div>
      </div>
    `;
    const submitBtn = container.querySelector('#clarificationSubmitBtn');
    submitBtn?.addEventListener('click', () => {
      const nextAnswers = collectPlannerAnswers();
      container.querySelectorAll('[data-clarify-id]').forEach((input) => {
        const key = input.getAttribute('data-clarify-id');
        if (!key) return;
        nextAnswers[key] = input.value.trim();
      });
      applyAnswersToBrief(nextAnswers);
      clarificationAnswers = nextAnswers;
      requestPlan();
    });
    return;
  }

  if (isEmpty) {
    container.innerHTML = `<div class="outline-item empty"><div class="outline-title">${escapeHtml(emptyText)}</div></div>`;
    return;
  }

  container.innerHTML = plan.slides.map((slide, index) => {
    const detailPoints = (slide.detail_points && slide.detail_points.length
      ? slide.detail_points
      : slide.preview_points && slide.preview_points.length
        ? slide.preview_points
        : [slide.summary || '待补充'])
      .slice(0, 6);

    return `
      <article class="outline-item outline-editor-card" data-slide-index="${index}">
        <div class="outline-item-head outline-item-head-editor">
          <span class="outline-index">${String(index + 1).padStart(2, '0')}</span>
          <div class="outline-title-wrap outline-title-wrap-editor">
            <label class="outline-input-field">
              <span class="outline-points-label">标题</span>
              <input class="outline-title-input" data-slide-field="title" data-slide-index="${index}" type="text" value="${escapeHtml(slide.title)}" />
            </label>
          </div>
          <div class="outline-card-actions">
            <button class="text-btn" type="button" data-slide-action="move-up" data-slide-index="${index}" ${index === 0 ? 'disabled' : ''}>上移</button>
            <button class="text-btn" type="button" data-slide-action="move-down" data-slide-index="${index}" ${index === plan.slides.length - 1 ? 'disabled' : ''}>下移</button>
            <button class="text-btn" type="button" data-slide-action="delete" data-slide-index="${index}" ${plan.slides.length <= 1 ? 'disabled' : ''}>删除</button>
          </div>
        </div>
        <div class="outline-card-grid">
          <label class="outline-input-field">
            <span class="outline-points-label">页面意图</span>
            <select class="outline-select" data-slide-field="intent" data-slide-index="${index}">
              ${INTENT_OPTIONS.map(([value, label]) => `
                <option value="${value}"${slide.intent === value ? ' selected' : ''}>${label}</option>
              `).join('')}
            </select>
          </label>
          <label class="outline-input-field">
            <span class="outline-points-label">本页摘要</span>
            <textarea class="outline-summary-input" data-slide-field="summary" data-slide-index="${index}" rows="2">${escapeHtml(slide.summary || '')}</textarea>
          </label>
        </div>
        <div class="outline-points-label">上屏要点</div>
        <div class="outline-edit-points">
          ${detailPoints.map((item, pointIndex) => `
            <label class="outline-point-row">
              <input class="outline-point-input" data-slide-field="point" data-slide-index="${index}" data-point-index="${pointIndex}" type="text" value="${escapeHtml(item)}" />
              <button class="text-btn" type="button" data-slide-action="remove-point" data-slide-index="${index}" data-point-index="${pointIndex}" ${detailPoints.length <= 1 ? 'disabled' : ''}>删除</button>
            </label>
          `).join('')}
        </div>
        <div class="outline-card-footer">
          <button class="text-btn" type="button" data-slide-action="add-point" data-slide-index="${index}">新增要点</button>
          <span class="outline-card-hint">前 3 条会优先影响预览态，更多要点会提高 HTML 文字密度。</span>
        </div>
      </article>
    `;
  }).join('');

  container.querySelectorAll('[data-slide-field="title"]').forEach((input) => {
    input.addEventListener('input', (event) => {
      const index = Number(event.currentTarget.dataset.slideIndex);
      if (!outlinePlan || outlinePlan.kind === 'clarification') return;
      outlinePlan.slides[index].title = event.currentTarget.value;
      markOutlineEdited();
    });
  });

  container.querySelectorAll('[data-slide-field="summary"]').forEach((input) => {
    input.addEventListener('input', (event) => {
      const index = Number(event.currentTarget.dataset.slideIndex);
      if (!outlinePlan || outlinePlan.kind === 'clarification') return;
      outlinePlan.slides[index].summary = event.currentTarget.value;
      markOutlineEdited();
    });
  });

  container.querySelectorAll('[data-slide-field="intent"]').forEach((select) => {
    select.addEventListener('change', (event) => {
      const index = Number(event.currentTarget.dataset.slideIndex);
      if (!outlinePlan || outlinePlan.kind === 'clarification') return;
      outlinePlan.slides[index].intent = event.currentTarget.value;
      markOutlineEdited();
    });
  });

  container.querySelectorAll('[data-slide-field="point"]').forEach((input) => {
    input.addEventListener('input', (event) => {
      const index = Number(event.currentTarget.dataset.slideIndex);
      const pointIndex = Number(event.currentTarget.dataset.pointIndex);
      if (!outlinePlan || outlinePlan.kind === 'clarification') return;
      outlinePlan.slides[index].detail_points[pointIndex] = event.currentTarget.value;
      markOutlineEdited();
    });
  });

  container.querySelectorAll('[data-slide-action]').forEach((button) => {
    button.addEventListener('click', (event) => {
      const action = event.currentTarget.dataset.slideAction;
      const index = Number(event.currentTarget.dataset.slideIndex);
      const pointIndex = Number(event.currentTarget.dataset.pointIndex);
      if (Number.isNaN(index)) return;

      if (action === 'move-up' && index > 0) {
        patchOutlinePlan((draft) => {
          [draft.slides[index - 1], draft.slides[index]] = [draft.slides[index], draft.slides[index - 1]];
        });
      }

      if (action === 'move-down' && index < plan.slides.length - 1) {
        patchOutlinePlan((draft) => {
          [draft.slides[index + 1], draft.slides[index]] = [draft.slides[index], draft.slides[index + 1]];
        });
      }

      if (action === 'delete' && plan.slides.length > 1) {
        patchOutlinePlan((draft) => {
          draft.slides.splice(index, 1);
        });
      }

      if (action === 'add-point') {
        patchOutlinePlan((draft) => {
          draft.slides[index].detail_points.push('补充一条上屏要点');
        });
      }

      if (action === 'remove-point' && !Number.isNaN(pointIndex)) {
        patchOutlinePlan((draft) => {
          draft.slides[index].detail_points.splice(pointIndex, 1);
        });
      }
    });
  });
};

const renderThemeGrid = () => {
  if (!themeGrid) return;
  themeGrid.innerHTML = THEMES.map((theme) => `
    <button class="theme-card${theme.name === activeTheme.name ? ' active' : ''}" data-theme="${theme.name}">
      <div class="theme-card-head">
        <strong>${escapeHtml(theme.label)}</strong>
        <span class="theme-chip">${escapeHtml(theme.name)}</span>
      </div>
      <span>${escapeHtml(theme.description)}</span>
      <div class="theme-swatch">
        ${(theme.swatches || []).map((color) => `<i style="background:${color}"></i>`).join('')}
      </div>
    </button>
  `).join('');

  Array.from(themeGrid.querySelectorAll('.theme-card')).forEach((button) => {
    button.addEventListener('click', () => {
      const nextTheme = THEMES.find((theme) => theme.name === button.dataset.theme);
      if (!nextTheme) return;
      activeTheme = nextTheme;
      renderThemeGrid();
      if (expandedDeck) renderHtmlCompare();
    });
  });
};

const renderHtmlCompare = () => {
  if (!expandedDeck) {
    setPreviewLocked();
    return;
  }

  const deck = expandedToRenderDeck(expandedDeck);
  const renderedThemes = THEMES.map((theme) => ({
    theme,
    html: theme.renderer(deck, { theme: theme.name, title: deck.title })
  }));
  const selected = renderedThemes.find((entry) => entry.theme.name === activeTheme.name) || renderedThemes[0];
  const subtitle = expandedDeck.slides[0]?.title || 'Slide content ready';
  const recommendedTheme = outlinePlan?.meta?.default_theme;

  currentHtml = selected.html;
  previewTitle.textContent = deck.title;
  if (previewSubtitle) previewSubtitle.textContent = `${selected.theme.label} · ${selected.theme.description}`;
  slideCountPill.textContent = `${deck.slides.length + 1} 页`;
  previewFrame.srcdoc = currentHtml;
  copyHtmlBtn.disabled = false;
  openDeckBtn.disabled = false;
  renderThemeHighlight();

  compareGrid.innerHTML = renderedThemes.map(({ theme }) => `
    <button class="compare-card${theme.name === activeTheme.name ? ' active' : ''}" data-theme="${theme.name}">
      <div class="compare-card-head">
        <strong>${escapeHtml(theme.label)}</strong>
        <span class="theme-chip">${escapeHtml(theme.name)}</span>
      </div>
      ${theme.name === recommendedTheme ? '<div class="compare-card-badge">推荐</div>' : ''}
      <div class="compare-card-note">${escapeHtml(theme.description)}</div>
      <div class="compare-card-frame">
        <div class="compare-cover ${escapeHtml(theme.name)}">
          <div class="compare-cover-kicker">${escapeHtml(theme.label)}</div>
          <div class="compare-cover-title">${escapeHtml(deck.title)}</div>
          <div class="compare-cover-subtitle">${escapeHtml(subtitle)}</div>
          <div class="compare-cover-meta">${String(deck.slides.length + 1)} slides</div>
        </div>
      </div>
    </button>
  `).join('');

  Array.from(compareGrid.querySelectorAll('.compare-card')).forEach((button) => {
    button.addEventListener('click', () => {
      const nextTheme = THEMES.find((theme) => theme.name === button.dataset.theme);
      if (!nextTheme || nextTheme.name === activeTheme.name) return;
      activeTheme = nextTheme;
      renderThemeGrid();
      renderHtmlCompare();
    });
  });
};

const requestPlan = async () => {
  const markdown = markdownInput.value.trim();
  if (!markdown) {
    showToast('请先输入 Markdown');
    return;
  }

  outlinePlan = null;
  setPreviewLocked();
  setStep('plan');
  renderOutlineList(outlinePanel, null, '正在整理每页内容...');
  renderOutlineSummary(null);
  syncTaskState(TASK_STATE.PLANNING);
  setPlannerStatus('正在分析内容并生成大纲...');

  try {
    const response = await fetch('/api/plan-stream', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ markdown, context: { answers: collectPlannerAnswers(), profile: activeProfile.name } })
    });

    if (!response.ok) {
      throw new Error('流式规划请求失败');
    }

    let finalPayload = null;
    await readEventStream(response, {
      status: (payload) => {
        setPlannerStatus(payload?.message || '正在生成大纲...');
      },
      final: (payload) => {
        finalPayload = payload;
      },
      error: (payload) => {
        throw new Error(payload?.error || '生成大纲失败');
      }
    });

    if (!finalPayload) {
      throw new Error('规划结果为空');
    }

    outlinePlan = normalizePlan(finalPayload);
    if (outlinePlan?.kind !== 'clarification') {
      outlinePlan = sanitizeOutlinePlan(outlinePlan);
    }
    renderOutlineToolbar(outlinePlan);
    renderOutlineList(outlinePanel, outlinePlan, '未生成大纲');
    renderOutlineSummary(outlinePlan);
    if (outlinePlan.kind === 'clarification') {
      syncTaskState(TASK_STATE.CLARIFICATION);
      setPlannerStatus('补充这 1-2 个关键信息后，大纲会更准确。');
      showToast('需要补充信息');
      return;
    }
    syncTaskState(TASK_STATE.OUTLINE_READY);
    const recommendedTheme = THEMES.find((theme) => theme.name === outlinePlan?.meta?.default_theme);
    if (recommendedTheme) {
      activeTheme = recommendedTheme;
      renderThemeGrid();
    }
    const modeMap = { fallback: '已切换快速模式并生成大纲。', cache: '命中缓存，已直接返回大纲。', llm: '已生成大纲，请确认后继续。' };
    const mode = modeMap[finalPayload?.mode] || '已生成大纲，请确认后继续。';
    const confidence = Number(outlinePlan?.meta?.planning_confidence || 0);
    const confidenceText = Number.isFinite(confidence) ? ` 规划置信度 ${(confidence * 100).toFixed(0)}%。` : '';
    const themeName = outlinePlan?.meta?.default_theme ? ` 推荐主题 ${outlinePlan.meta.default_theme}。` : '';
    setPlannerStatus(`${mode} 共 ${outlinePlan.slides.length} 页。${confidenceText}${themeName}`);
    showToast(finalPayload?.mode === 'cache' ? '已命中缓存' : finalPayload?.mode === 'fallback' ? '已切换快速模式' : '已生成大纲');
  } catch (error) {
    const message = error?.message || '生成大纲失败';
    syncTaskState(TASK_STATE.FAILED);
    renderOutlineToolbar(null);
    renderOutlineList(outlinePanel, null, message);
    renderOutlineSummary(null);
    setPlannerStatus(message);
    showToast(message);
  } finally {
    if (taskState === TASK_STATE.PLANNING) syncTaskState(TASK_STATE.IDLE);
  }
};

const requestExpand = async () => {
  if (!outlinePlan) return;
  const markdown = markdownInput.value.trim();
  syncTaskState(TASK_STATE.EXPANDING);
  setPlannerStatus('正在连接扩展服务...');

  try {
    const response = await fetch('/api/expand-stream', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ markdown, outline: outlineToApiPayload(sanitizeOutlinePlan(outlinePlan)) })
    });

    if (!response.ok) {
      throw new Error('流式扩展请求失败');
    }

    let finalPayload = null;
    await readEventStream(response, {
      status: (payload) => {
        setPlannerStatus(payload?.message || '正在补全展示内容...');
      },
      final: (payload) => {
        finalPayload = payload;
      },
      error: (payload) => {
        throw new Error(payload?.error || '补全展示内容失败');
      }
    });

    if (!finalPayload) {
      throw new Error('扩展结果为空');
    }

    expandedDeck = normalizeExpanded(finalPayload);
    renderHtmlCompare();
    syncTaskState(TASK_STATE.PREVIEW_READY);
    const modeMap = { fallback: '已切换快速模式并补全展示内容。', cache: '命中缓存，已直接返回展示内容。', llm: '已生成展示内容，进入 HTML 预览。' };
    setPlannerStatus(modeMap[finalPayload?.mode] || '已生成展示内容，进入 HTML 预览。');
    setStep('preview');
    showToast(finalPayload?.mode === 'cache' ? '已命中缓存' : finalPayload?.mode === 'fallback' ? '已切换快速模式' : '已生成 HTML 预览');
  } catch (error) {
    const message = error?.message || '补全展示内容失败';
    syncTaskState(TASK_STATE.OUTLINE_READY);
    setPlannerStatus(message);
    showToast(message);
  }
};

profileSelect?.addEventListener('change', () => {
  activeProfile = getDeckProfile(profileSelect.value);
  syncProfileTheme();
  applySampleBrief();
  renderProfileSelect();
  renderThemeGrid();
  handlePlanningInputChange(`当前 profile：${activeProfile.studio_label}。请重新生成每页大纲。`);
  setPlannerStatus(`当前 profile：${activeProfile.studio_label}。输入内容后生成每页大纲。`);
});

planMarkdownBtn.addEventListener('click', requestPlan);
confirmOutlineBtn.addEventListener('click', requestExpand);
backToPlanBtn.addEventListener('click', () => setStep('plan'));
stepPlanBtn.addEventListener('click', () => setStep('plan'));
stepPreviewBtn.addEventListener('click', () => {
  if (stepPreviewBtn.disabled) return;
  setStep('preview');
});
markdownInput.addEventListener('input', () => {
  importedSource = null;
  updateSourceFileMeta();
  handlePlanningInputChange('Markdown 已变更，请重新生成每页大纲');
});

[audienceInput, goalInput, slideCountInput].forEach((input) => {
  input?.addEventListener('input', () => handlePlanningInputChange('生成偏好已变更，请重新生成每页大纲'));
});

[densityToggle, rewriteToggle].forEach((container) => {
  container?.addEventListener('click', (event) => {
    const button = event.target.closest?.('[data-choice-group]');
    if (!button) return;
    const group = button.dataset.choiceGroup;
    const value = button.dataset.choiceValue;
    if (!group || !value) return;
    if (group === 'density') briefPreferences.density = value;
    if (group === 'rewrite') briefPreferences.rewrite = value;
    renderBriefPreferences();
    handlePlanningInputChange('生成偏好已变更，请重新生成每页大纲');
  });
});

addSlideBtn?.addEventListener('click', () => {
  patchOutlinePlan((draft) => {
    draft.slides.push(buildEmptySlide(draft.slides.length + 1));
  });
});

pickFileBtn?.addEventListener('click', () => sourceFileInput?.click());
sourceFileInput?.addEventListener('change', async () => {
  const [file] = Array.from(sourceFileInput.files || []);
  await loadSourceFile(file);
});

sourceDropzone?.addEventListener('click', (event) => {
  if (event.target?.closest?.('#pickFileBtn')) return;
  sourceFileInput?.click();
});

sourceDropzone?.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  sourceFileInput?.click();
});

sourceDropzone?.addEventListener('dragover', (event) => {
  event.preventDefault();
  sourceDropzone.classList.add('is-dragover');
});

sourceDropzone?.addEventListener('dragleave', () => {
  sourceDropzone.classList.remove('is-dragover');
});

sourceDropzone?.addEventListener('drop', async (event) => {
  event.preventDefault();
  sourceDropzone.classList.remove('is-dragover');
  const [file] = Array.from(event.dataTransfer?.files || []);
  await loadSourceFile(file);
});

useSampleBtn?.addEventListener('click', () => {
  markdownInput.value = SAMPLE_MARKDOWN;
  importedSource = null;
  updateSourceFileMeta();
  applySampleBrief();
  handlePlanningInputChange('已恢复示例内容，请重新生成每页大纲');
});

clearInputBtn?.addEventListener('click', () => {
  markdownInput.value = '';
  importedSource = null;
  updateSourceFileMeta();
  if (audienceInput) audienceInput.value = '';
  if (goalInput) goalInput.value = '';
  if (slideCountInput) slideCountInput.value = '';
  briefPreferences = { density: 'balanced', rewrite: 'rewrite' };
  renderBriefPreferences();
  handlePlanningInputChange('内容已清空，请重新输入后生成大纲');
});

copyHtmlBtn.addEventListener('click', async () => {
  if (!currentHtml) return;
  await navigator.clipboard.writeText(currentHtml);
  showToast('已复制 HTML');
});

openDeckBtn.addEventListener('click', () => {
  if (!currentHtml) return;
  const popup = window.open('', '_blank');
  if (!popup) return;
  popup.document.write(currentHtml);
  popup.document.close();
});

markdownInput.value = SAMPLE_MARKDOWN;
applySampleBrief();
updateSourceFileMeta();
renderProfileSelect();
renderThemeGrid();
renderOutlineToolbar(null);
renderOutlineList(outlinePanel, null, '先生成并确认每页大纲');
renderOutlineSummary(null);
setPreviewLocked();
setPlannerStatus(`当前 profile：${activeProfile.studio_label}。输入内容后生成每页大纲。`);
syncTaskState(TASK_STATE.IDLE);
setStep('plan');
