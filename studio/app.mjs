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
const profileSelect = document.getElementById('profileSelect');
const profileHint = document.getElementById('profileHint');
const plannerStatus = document.getElementById('plannerStatus');
const planMarkdownBtn = document.getElementById('planMarkdownBtn');
const confirmOutlineBtn = document.getElementById('confirmOutlineBtn');
const outlinePanel = document.getElementById('outlinePanel');
const outlineSection = document.querySelector('.outline-panel');
const themeGrid = document.getElementById('themeGrid');
const compareGrid = document.getElementById('compareGrid');
const previewFrame = document.getElementById('previewFrame');
const previewTitle = document.getElementById('previewTitle');
const slideCountPill = document.getElementById('slideCountPill');
const copyHtmlBtn = document.getElementById('copyHtmlBtn');
const openDeckBtn = document.getElementById('openDeckBtn');
const toast = document.getElementById('toast');
const stepPlanBtn = document.getElementById('stepPlanBtn');
const stepPreviewBtn = document.getElementById('stepPreviewBtn');
const planView = document.getElementById('planView');
const previewView = document.getElementById('previewView');
const backToPlanBtn = document.getElementById('backToPlanBtn');

let activeProfile = getDeckProfile('pitch-tech-launch');
let activeTheme = THEMES.find((theme) => theme.name === activeProfile.default_theme) || THEMES[0];
let currentHtml = '';
let outlinePlan = null;
let expandedDeck = null;
let toastTimer = null;
let clarificationAnswers = {};

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

  outlineSection?.classList.toggle('has-results', hasOutline);
  planMarkdownBtn.disabled = planning;
  confirmOutlineBtn.disabled = ![TASK_STATE.OUTLINE_READY].includes(nextState);
  stepPreviewBtn.disabled = !previewReady;

  if (planning || expanding) {
    copyHtmlBtn.disabled = true;
    openDeckBtn.disabled = true;
  }
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
  previewTitle.textContent = '选择模板并导出';
  slideCountPill.textContent = '0 slides';
  compareGrid.innerHTML = '';
  stepPreviewBtn.disabled = true;
  copyHtmlBtn.disabled = true;
  openDeckBtn.disabled = true;
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
      <div class="outline-item">
        <div class="outline-title">${escapeHtml(plan.message || '需要补充信息')}</div>
        ${plan.meta ? `<div class="clarification-meta">当前规划置信度 ${(Number(plan.meta.planning_confidence || 0) * 100).toFixed(0)}%</div>` : ''}
        <div class="clarification-form">
          ${(plan.questions || []).map((item) => `
            <label class="clarification-field">
              <span>${escapeHtml(item.label)}</span>
              <input data-clarify-id="${escapeHtml(item.id)}" type="text" value="${escapeHtml(clarificationAnswers[item.id] || '')}" placeholder="${escapeHtml(item.placeholder || '')}" />
            </label>
          `).join('')}
          <button id="clarificationSubmitBtn" class="editor-btn primary">补充信息后继续生成</button>
        </div>
      </div>
    `;
    const submitBtn = container.querySelector('#clarificationSubmitBtn');
    submitBtn?.addEventListener('click', () => {
      const nextAnswers = {};
      container.querySelectorAll('[data-clarify-id]').forEach((input) => {
        const key = input.getAttribute('data-clarify-id');
        if (!key) return;
        nextAnswers[key] = input.value.trim();
      });
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
    const previewPoints = (slide.preview_points && slide.preview_points.length
      ? slide.preview_points
      : slide.detail_points && slide.detail_points.length
        ? slide.detail_points.slice(0, 3)
        : [slide.summary || '待补充'])
      .slice(0, 3);
    const detailPoints = (slide.detail_points && slide.detail_points.length
      ? slide.detail_points
      : previewPoints).slice(0, 6);
    const cardId = `outline-${mode}-${index + 1}`;

    return `
      <details class="outline-item outline-detail"${index === 0 ? ' open' : ''}>
        <div class="outline-item-head">
          <span class="outline-index">${String(index + 1).padStart(2, '0')}</span>
          <div class="outline-title-wrap">
            <div class="outline-title">${escapeHtml(slide.title)}</div>
          </div>
          <summary class="outline-toggle" aria-controls="${cardId}">
            <span class="outline-toggle-open">展开</span>
            <span class="outline-toggle-close">收起</span>
          </summary>
        </div>
        <div class="outline-points-label">本页要点</div>
        <ul class="outline-points">
          ${previewPoints
            .map((item) => `<li>${escapeHtml(item)}</li>`)
            .join('')}
        </ul>
        <div id="${cardId}" class="outline-detail-body">
          <div class="outline-points-label">完整内容</div>
          <ul class="outline-points outline-points-detail">
            ${detailPoints
              .map((item) => `<li>${escapeHtml(item)}</li>`)
              .join('')}
          </ul>
        </div>
      </details>
    `;
  }).join('');
};

const renderThemeGrid = () => {
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

  currentHtml = selected.html;
  previewTitle.textContent = selected.theme.label;
  slideCountPill.textContent = `${deck.slides.length + 1} slides`;
  previewFrame.srcdoc = currentHtml;
  copyHtmlBtn.disabled = false;
  openDeckBtn.disabled = false;

  compareGrid.innerHTML = renderedThemes.map(({ theme }) => `
    <button class="compare-card${theme.name === activeTheme.name ? ' active' : ''}" data-theme="${theme.name}">
      <div class="compare-card-head">
        <strong>${escapeHtml(theme.label)}</strong>
        <span class="theme-chip">${escapeHtml(theme.name)}</span>
      </div>
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
  syncTaskState(TASK_STATE.PLANNING);
  setPlannerStatus('正在分析内容并生成大纲...');

  try {
    const response = await fetch('/api/plan-stream', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ markdown, context: { answers: clarificationAnswers, profile: activeProfile.name } })
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
    renderOutlineList(outlinePanel, outlinePlan, '未生成大纲');
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
    renderOutlineList(outlinePanel, null, message);
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
      body: JSON.stringify({ markdown, outline: outlineToApiPayload(outlinePlan) })
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
    const modeMap = { fallback: '已切换快速模式并补全展示内容。', cache: '命中缓存，已直接返回展示内容。', llm: '已生成展示内容，进入模板预览。' };
    setPlannerStatus(modeMap[finalPayload?.mode] || '已生成展示内容，进入模板预览。');
    setStep('preview');
    showToast(finalPayload?.mode === 'cache' ? '已命中缓存' : finalPayload?.mode === 'fallback' ? '已切换快速模式' : '已生成 HTML 预览');
  } catch (error) {
    const message = error?.message || '补全展示内容失败';
    syncTaskState(TASK_STATE.OUTLINE_READY);
    setPlannerStatus(message);
    showToast(message);
  }
};

const handleMarkdownChange = () => {
  outlinePlan = null;
  clarificationAnswers = {};
  renderOutlineList(outlinePanel, null, 'Markdown 已变更，请重新生成大纲');
  setPreviewLocked();
  setPlannerStatus('Markdown 已变更，请重新生成每页大纲');
  syncTaskState(TASK_STATE.IDLE);
  setStep('plan');
};

profileSelect?.addEventListener('change', () => {
  activeProfile = getDeckProfile(profileSelect.value);
  syncProfileTheme();
  renderProfileSelect();
  renderThemeGrid();
  handleMarkdownChange();
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
markdownInput.addEventListener('input', handleMarkdownChange);

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
renderProfileSelect();
renderThemeGrid();
renderOutlineList(outlinePanel, null, '先生成并确认每页大纲');
setPreviewLocked();
setPlannerStatus(`当前 profile：${activeProfile.studio_label}。输入内容后生成每页大纲。`);
syncTaskState(TASK_STATE.IDLE);
setStep('plan');
