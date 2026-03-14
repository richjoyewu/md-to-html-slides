import { renderDarkCardDeck } from '../templates/dark-card.mjs';
import { renderEditorialLightDeck } from '../templates/editorial-light.mjs';

const renderSignalBlueDeck = (deck, options = {}) => {
  return renderDarkCardDeck(deck, { ...options, theme: 'signal-blue' })
    .replace('--accent: #ff7a45;', '--accent: #59a6ff;')
    .replace('--accent-soft: #ffb48a;', '--accent-soft: #9bcbff;')
    .replace('--accent-alt: #76b8ff;', '--accent-alt: #7ce6bb;')
    .replace('OpenClaw Deck', 'Signal Blue Deck');
};

const SAMPLE_MARKDOWN = `# 第1课 揭秘 AI Agent
课程目标：帮助零基础用户理解 Agent 与 Chatbot 的区别，并理解 OpenClaw 的本地价值。

## 什么是 AI Agent
- Agent 不只是问答工具
- 它围绕目标执行任务
- 它可以连接工具和外部环境

## Agent 和 Chatbot 的区别
- Chatbot 偏向单轮对话
- Agent 偏向目标执行
- Agent 可以连接工具和外部环境

## OpenClaw 的本地优势
- 本地部署，隐私更可控
- 能接入个人工作流
- 更适合作为长期 AI 助手

## 本节总结
- Agent = 模型 + 工具 + 执行
- Chatbot 偏对话，Agent 偏任务
- OpenClaw 更适合做个人 AI 中枢`;

const THEMES = [
  {
    key: 'dark-card',
    label: 'Dark Card',
    description: '深色、课程感、中文标题容错更高。',
    swatches: ['#0b0e14', '#ff7a45', '#76b8ff'],
    renderer: renderDarkCardDeck
  },
  {
    key: 'signal-blue',
    label: 'Signal Blue',
    description: '更冷、更产品化，适合路线图和方法论展示。',
    swatches: ['#0b1020', '#59a6ff', '#7ce6bb'],
    renderer: renderSignalBlueDeck
  },
  {
    key: 'editorial-light',
    label: 'Editorial Light',
    description: '纸张和刊物感更强，适合教学和结构化说明。',
    swatches: ['#f8f4ec', '#c96b4d', '#a8d8ea'],
    renderer: renderEditorialLightDeck
  }
];

const markdownInput = document.getElementById('markdownInput');
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

let activeTheme = THEMES[0];
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


const normalizePlan = (payload) => {
  if (payload?.kind === 'clarification') {
    return {
      kind: 'clarification',
      message: String(payload?.message || '').trim(),
      meta: payload?.meta || null,
      questions: Array.isArray(payload?.questions)
        ? payload.questions
            .map((item, index) => {
              if (typeof item === 'string') {
                return { id: `q_${index + 1}`, label: String(item || '').trim(), placeholder: '' };
              }
              return {
                id: String(item?.id || `q_${index + 1}`).trim(),
                label: String(item?.label || '').trim(),
                placeholder: String(item?.placeholder || '').trim()
              };
            })
            .filter((item) => item.label)
            .slice(0, 3)
        : []
    };
  }

  const title = String(payload?.deck_title || payload?.title || 'Untitled Deck').trim() || 'Untitled Deck';
  const slides = Array.isArray(payload?.slides)
    ? payload.slides
        .map((slide, index) => ({
          index: Number(slide?.index || index + 1),
          title: String(slide?.title || '').trim(),
          summary: String(slide?.summary || '').trim(),
          previewPoints: Array.isArray(slide?.preview_points)
            ? slide.preview_points.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 3)
            : [],
          detailPoints: Array.isArray(slide?.detail_points)
            ? slide.detail_points.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 5)
            : [],
          intent: String(slide?.intent || 'explain').trim() || 'explain'
        }))
        .filter((slide) => slide.title)
    : [];

  return {
    kind: 'outline',
    deckTitle: title,
    meta: payload?.meta || {
      content_intent: 'general presentation',
      audience_guess: '未指定受众',
      planning_confidence: 0.72,
      uncertainties: []
    },
    slides: slides.slice(0, 16)
  };
};

const outlineToApiPayload = (outline) => ({
  deck_title: outline?.deckTitle || 'Untitled Deck',
  meta: outline?.meta || null,
  slides: Array.isArray(outline?.slides)
    ? outline.slides.map((slide, index) => ({
        index: Number(slide?.index || index + 1),
        title: String(slide?.title || '').trim(),
        summary: String(slide?.summary || '').trim(),
        preview_points: Array.isArray(slide?.previewPoints)
          ? slide.previewPoints.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 3)
          : [],
        detail_points: Array.isArray(slide?.detailPoints)
          ? slide.detailPoints.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 5)
          : [],
        intent: String(slide?.intent || 'explain').trim() || 'explain'
      })).filter((slide) => slide.title)
    : []
});

const normalizeExpanded = (payload) => {
  const title = String(payload?.deck_title || payload?.title || 'Untitled Deck').trim() || 'Untitled Deck';
  const slides = Array.isArray(payload?.slides)
    ? payload.slides
        .map((slide, index) => ({
          index: Number(slide?.index || index + 1),
          title: String(slide?.title || '').trim(),
          format: String(slide?.format || 'title-bullets').trim() || 'title-bullets',
          bullets: Array.isArray(slide?.bullets)
            ? slide.bullets.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 5)
            : [],
          body: String(slide?.body || '').trim()
        }))
        .filter((slide) => slide.title)
    : [];

  return {
    deckTitle: title,
    slides: slides.slice(0, 16)
  };
};

const expandedToDeck = (expanded) => ({
  title: expanded.deckTitle,
  intro: 'Generated from confirmed outline',
  slides: expanded.slides.map((slide) => ({
    title: slide.title,
    blocks: slide.format === 'title-body'
      ? [{ type: 'paragraph', text: slide.body || slide.bullets.join(' ') }]
      : [{ type: 'list', items: slide.bullets.length ? slide.bullets : [slide.body || slide.title] }]
  }))
});

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
    const previewPoints = (slide.previewPoints && slide.previewPoints.length
      ? slide.previewPoints
      : slide.detailPoints && slide.detailPoints.length
        ? slide.detailPoints.slice(0, 3)
        : [slide.summary || '待补充'])
      .slice(0, 3);
    const detailPoints = (slide.detailPoints && slide.detailPoints.length
      ? slide.detailPoints
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
    <button class="theme-card${theme.key === activeTheme.key ? ' active' : ''}" data-theme="${theme.key}">
      <div class="theme-card-head">
        <strong>${escapeHtml(theme.label)}</strong>
        <span class="theme-chip">${escapeHtml(theme.key)}</span>
      </div>
      <span>${escapeHtml(theme.description)}</span>
      <div class="theme-swatch">
        ${theme.swatches.map((color) => `<i style="background:${color}"></i>`).join('')}
      </div>
    </button>
  `).join('');

  Array.from(themeGrid.querySelectorAll('.theme-card')).forEach((button) => {
    button.addEventListener('click', () => {
      const nextTheme = THEMES.find((theme) => theme.key === button.dataset.theme);
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

  const deck = expandedToDeck(expandedDeck);
  const renderedThemes = THEMES.map((theme) => ({
    theme,
    html: theme.renderer(deck, { theme: theme.key, title: deck.title })
  }));
  const selected = renderedThemes.find((entry) => entry.theme.key === activeTheme.key) || renderedThemes[0];
  const subtitle = expandedDeck.slides[0]?.title || 'Slide content ready';

  currentHtml = selected.html;
  previewTitle.textContent = selected.theme.label;
  slideCountPill.textContent = `${deck.slides.length + 1} slides`;
  previewFrame.srcdoc = currentHtml;
  copyHtmlBtn.disabled = false;
  openDeckBtn.disabled = false;

  compareGrid.innerHTML = renderedThemes.map(({ theme }) => `
    <button class="compare-card${theme.key === activeTheme.key ? ' active' : ''}" data-theme="${theme.key}">
      <div class="compare-card-head">
        <strong>${escapeHtml(theme.label)}</strong>
        <span class="theme-chip">${escapeHtml(theme.key)}</span>
      </div>
      <div class="compare-card-note">${escapeHtml(theme.description)}</div>
      <div class="compare-card-frame">
        <div class="compare-cover ${escapeHtml(theme.key)}">
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
      const nextTheme = THEMES.find((theme) => theme.key === button.dataset.theme);
      if (!nextTheme || nextTheme.key === activeTheme.key) return;
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
      body: JSON.stringify({ markdown, context: { answers: clarificationAnswers } })
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
    const modeMap = { fallback: '已切换快速模式并生成大纲。', cache: '命中缓存，已直接返回大纲。', llm: '已生成大纲，请确认后继续。' };
    const mode = modeMap[finalPayload?.mode] || '已生成大纲，请确认后继续。';
    const confidence = Number(outlinePlan?.meta?.planning_confidence || 0);
    const confidenceText = Number.isFinite(confidence) ? ` 规划置信度 ${(confidence * 100).toFixed(0)}%。` : '';
    setPlannerStatus(`${mode} 共 ${outlinePlan.slides.length} 页。${confidenceText}`);
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
renderThemeGrid();
renderOutlineList(outlinePanel, null, '先生成并确认每页大纲');
setPreviewLocked();
setPlannerStatus('输入内容后生成每页大纲。');
syncTaskState(TASK_STATE.IDLE);
setStep('plan');
