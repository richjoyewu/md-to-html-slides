const escapeHtml = (value = '') => {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const slugify = (value = '') => {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'slide';
};

/* ── SVG icon library (inline, 24×24) ─────────────────────────── */

const ICONS = {
  translate: '<svg viewBox="0 0 24 24"><path d="M4 5h7M7.5 5v7M5 8.5c1 2 3 4.5 5.5 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 14l2.5-6L18 14M13.75 12.5h3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  mic: '<svg viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5 11a7 7 0 0014 0M12 18v3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  layers: '<svg viewBox="0 0 24 24"><path d="M12 4l8 4-8 4-8-4 8-4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M4 12l8 4 8-4M4 16l8 4 8-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  puzzle: '<svg viewBox="0 0 24 24"><path d="M7 5h4a2 2 0 014 0h4v4a2 2 0 010 4v4H15a2 2 0 01-4 0H7v-4a2 2 0 010-4V5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  zap: '<svg viewBox="0 0 24 24"><path d="M13 2L4 14h8l-1 8 9-12h-8l1-8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  target: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg>',
  users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="7" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3 20c0-3 3-5.5 6-5.5s6 2.5 6 5.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="8" r="2.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M17 13.5c2 0 4 1.5 4 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  rocket: '<svg viewBox="0 0 24 24"><path d="M12 2C8 6 6 10 6 14l6 6c4 0 8-2 12-6C20 10 16 6 12 2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="12" r="2" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M6 14l-3 3M18 14l3 3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  compass: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M16 8l-5.5 2.5L8 16l5.5-2.5z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  bulb: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M9 14c-1.5-1.3-2.5-3.2-2.5-5.3C6.5 5.5 9 3 12 3s5.5 2.5 5.5 5.7c0 2.1-1 4-2.5 5.3v1H9v-1z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  chart: '<svg viewBox="0 0 24 24"><path d="M4 19V10M9 19V6M14 19v-8M19 19V4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/><ellipse cx="12" cy="12" rx="4" ry="9" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M3 12h18M4.5 7.5h15M4.5 16.5h15" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M4 4h5c2 0 3 1 3 2v14c0-1-1-2-3-2H4V4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M20 4h-5c-2 0-3 1-3 2v14c0-1 1-2 3-2h5V4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24"><path d="M12 2l2 5.5L19.5 9l-5.5 2L12 16.5 10 11 4.5 9l5.5-1.5L12 2z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M17 14l1 2.5 2.5 1-2.5 1L17 21l-1-2.5L13.5 17.5 16 16.5 17 14z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
  trending: '<svg viewBox="0 0 24 24"><path d="M4 17l5-5 3 2 7-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 7h4v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  grid: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M4 7l2 2 4-4M4 17l2 2 4-4M14 6h6M14 12h6M14 18h6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

const KEYWORD_ICON_MAP = [
  // More specific patterns first — order matters (first match wins)
  { re: /核心价值|关键/, icon: 'sparkle' },
  { re: /受众|客户|三类|audience/, icon: 'users' },
  { re: /验证|希望|一起|validate|together/, icon: 'check' },
  { re: /未来|长期|边界|vision/, icon: 'compass' },
  { re: /当前|第一步|起点|current|start/, icon: 'rocket' },
  { re: /为什么|时机|值得|why|when/, icon: 'trending' },
  { re: /场景|服务|scenario|serve/, icon: 'grid' },
  { re: /产品|目标|product|goal/, icon: 'target' },
  { re: /工具|生成|tool|system/, icon: 'puzzle' },
  { re: /演讲|speech|speak|present/, icon: 'mic' },
  { re: /翻译|转译|translat/, icon: 'translate' },
  { re: /简单|清晰|高效|simple|clear/, icon: 'zap' },
  { re: /全球|市场|global|market/, icon: 'globe' },
  { re: /数据|指标|增长|data|metric/, icon: 'chart' },
  { re: /视觉|展示|visual|display/, icon: 'eye' },
  { re: /结构|体系|structure|layer/, icon: 'layers' },
  { re: /内容|文档|文本|content|document/, icon: 'book' },
  { re: /想法|灵感|idea|inspire/, icon: 'bulb' },
  { re: /表达|语言|express/, icon: 'translate' },
];

const pickIcon = (title = '', index = 0) => {
  const lower = title.toLowerCase();
  for (const entry of KEYWORD_ICON_MAP) {
    if (entry.re.test(lower)) return ICONS[entry.icon];
  }
  const fallbacks = ['layers', 'compass', 'sparkle', 'grid', 'zap', 'globe'];
  return ICONS[fallbacks[index % fallbacks.length]];
};

/**
 * Pick a bullet-level icon. Uses a rotating set of visually distinct small icons
 * to ensure variety within a slide. The slide title's first-match icon is excluded
 * from the rotation to avoid redundancy with the page-level content-icon.
 */
const BULLET_ICON_SETS = [
  ['zap', 'target', 'compass', 'bulb', 'rocket', 'globe'],
  ['sparkle', 'layers', 'eye', 'chart', 'book', 'grid'],
  ['mic', 'puzzle', 'trending', 'users', 'translate', 'check'],
];

const pickBulletIcon = (slideTitle = '', bulletIndex = 0) => {
  // Pick a set based on a hash of the slide title for consistency
  const titleHash = slideTitle.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const set = BULLET_ICON_SETS[titleHash % BULLET_ICON_SETS.length];
  return ICONS[set[bulletIndex % set.length]];
};

/* ── Highlight key phrase in title ──────────────────────────────── */

const HIGHLIGHT_PHRASES = [
  /不是[^，,。]+[，,]而是[^，,。]+/,
  /["""「][^"""」]+["""」]/,
  /表达转译/, /视觉语言/, /演讲/, /核心价值/,
  /PPT/, /HTML/, /deck/i,
];

const highlightTitle = (title) => {
  const escaped = escapeHtml(title);
  for (const re of HIGHLIGHT_PHRASES) {
    const match = title.match(re);
    if (match) {
      const escapedMatch = escapeHtml(match[0]);
      return escaped.replace(escapedMatch, `<em class="hl">${escapedMatch}</em>`);
    }
  }
  return escaped;
};

/* ── Render blocks ──────────────────────────────────────────────── */

const renderItems = (items = []) => items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');

const renderBlock = (block, slideTitle = '') => {
  if (block.type === 'paragraph') {
    return `<p class="slide-paragraph reveal">${escapeHtml(block.content)}</p>`;
  }

  if (block.type === 'list') {
    const items = block.items.map((item, i) => {
      const icon = pickBulletIcon(slideTitle, i);
      return `<li class="point-card">
        <span class="point-icon">${icon}</span>
        <span class="point-text">${escapeHtml(item)}</span>
      </li>`;
    }).join('');
    return `<ul class="slide-list reveal">${items}</ul>`;
  }

  if (block.type === 'image') {
    return [
      '<figure class="slide-figure reveal">',
      `  <img src="${block.inlinedSrc}" alt="${escapeHtml(block.alt)}" />`,
      block.alt ? `  <figcaption>${escapeHtml(block.alt)}</figcaption>` : '',
      '</figure>'
    ].filter(Boolean).join('\n');
  }

  if (block.type === 'code') {
    return [
      '<div class="slide-code-wrap reveal">',
      block.language ? `  <div class="slide-code-lang">${escapeHtml(block.language)}</div>` : '',
      `  <pre class="slide-code"><code>${escapeHtml(block.content)}</code></pre>`,
      '</div>'
    ].filter(Boolean).join('\n');
  }

  if (block.type === 'quote') {
    return `
      <section class="slide-quote reveal">
        <div class="quote-mark">“</div>
        <blockquote class="quote-copy">${escapeHtml(block.quote)}</blockquote>
        ${block.emphasis ? `<div class="quote-emphasis">${escapeHtml(block.emphasis)}</div>` : ''}
        ${block.attribution ? `<div class="quote-attribution">— ${escapeHtml(block.attribution)}</div>` : ''}
      </section>
    `;
  }

  if (block.type === 'transition') {
    return `
      <section class="slide-transition reveal">
        ${block.kicker ? `<div class="transition-kicker">${escapeHtml(block.kicker)}</div>` : ''}
        <h3 class="transition-headline">${escapeHtml(block.headline)}</h3>
        ${block.body ? `<p class="slide-paragraph transition-body">${escapeHtml(block.body)}</p>` : ''}
      </section>
    `;
  }

  if (block.type === 'tags') {
    return `
      <section class="slide-tags reveal">
        ${block.intro ? `<p class="slide-paragraph">${escapeHtml(block.intro)}</p>` : ''}
        <div class="cta-pill-row">
          ${block.items.map((item) => `<span class="cta-pill">${escapeHtml(item)}</span>`).join('')}
        </div>
      </section>
    `;
  }

  if (block.type === 'flow') {
    return `
      <section class="slide-flow reveal">
        ${block.eyebrow ? `<div class="transition-kicker">${escapeHtml(block.eyebrow)}</div>` : ''}
        ${block.intro ? `<p class="slide-paragraph">${escapeHtml(block.intro)}</p>` : ''}
        <ol class="process-list">
          ${block.nodes.map((node, index) => `
            <li>
              <span class="process-index">${String(index + 1).padStart(2, '0')}</span>
              <span class="process-copy">${escapeHtml(node.label)}</span>
            </li>
          `).join('')}
        </ol>
      </section>
    `;
  }

  if (block.type === 'table-lite') {
    return `
      <section class="slide-table reveal">
        ${block.caption ? `<p class="slide-paragraph">${escapeHtml(block.caption)}</p>` : ''}
        <div class="slide-table-wrap">
          <table class="slide-table-lite">
            <thead>
              <tr>${block.columns.map((item) => `<th>${escapeHtml(item)}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${block.rows.map((row) => `<tr>${row.cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  if (block.type === 'timeline') {
    return `
      <section class="slide-timeline reveal">
        ${block.eyebrow ? `<div class="transition-kicker">${escapeHtml(block.eyebrow)}</div>` : ''}
        ${block.intro ? `<p class="slide-paragraph">${escapeHtml(block.intro)}</p>` : ''}
        <ol class="process-list">
          ${block.items.map((item, index) => `
            <li>
              <span class="process-index">${String(index + 1).padStart(2, '0')}</span>
              <span class="process-copy">${escapeHtml(item.label)}</span>
            </li>
          `).join('')}
        </ol>
      </section>
    `;
  }

  if (block.type === 'callout') {
    return `
      <section class="slide-callout reveal tone-${escapeHtml(block.tone || 'neutral')}">
        ${block.title ? `<div class="transition-kicker">${escapeHtml(block.title)}</div>` : ''}
        <p class="slide-paragraph transition-body">${escapeHtml(block.body)}</p>
      </section>
    `;
  }

  if (block.type === 'stat-strip') {
    return `
      <section class="slide-stat-strip reveal">
        <div class="metric-grid">
          ${block.items.map((item) => `
            <div class="metric-card">
              <div class="metric-value">${escapeHtml(item.value)}</div>
              <div class="metric-label">${escapeHtml(item.label)}</div>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  if (block.type === 'matrix') {
    return `
      <section class="slide-matrix reveal">
        <div class="slide-table-wrap">
          <table class="slide-table-lite">
            <thead>
              <tr><th></th>${block.columns.map((item) => `<th>${escapeHtml(item)}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${block.rows.map((row) => `
                <tr>
                  <th>${escapeHtml(row.label)}</th>
                  ${row.cells.map((cell) => `<td><strong>${escapeHtml(cell.title)}</strong>${cell.body ? `<div>${escapeHtml(cell.body)}</div>` : ''}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  if (block.type === 'people') {
    return `
      <section class="slide-people reveal">
        ${block.intro ? `<p class="slide-paragraph">${escapeHtml(block.intro)}</p>` : ''}
        <div class="summary-grid">
          ${block.people.map((person) => `
            <div class="summary-card">
              <span class="summary-icon">${pickBulletIcon(person.name, 0)}</span>
              <span><strong>${escapeHtml(person.name)}</strong><br/>${escapeHtml(person.role)}${person.note ? `<br/><small>${escapeHtml(person.note)}</small>` : ''}</span>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  if (block.type === 'faq') {
    return `
      <section class="slide-faq reveal">
        ${block.intro ? `<p class="slide-paragraph">${escapeHtml(block.intro)}</p>` : ''}
        <div class="summary-grid">
          ${block.items.map((item) => `
            <div class="summary-card">
              <span><strong>${escapeHtml(item.question)}</strong>${item.answer ? `<br/><small>${escapeHtml(item.answer)}</small>` : ''}</span>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  if (block.type === 'risk') {
    return `
      <section class="slide-risk reveal">
        ${block.intro ? `<p class="slide-paragraph">${escapeHtml(block.intro)}</p>` : ''}
        <div class="summary-grid">
          ${block.items.map((item) => `
            <div class="summary-card">
              <span class="summary-icon">${item.severity === 'high' ? '!' : item.severity === 'low' ? '·' : '~'}</span>
              <span><strong>${escapeHtml(item.title)}</strong>${item.detail ? `<br/><small>${escapeHtml(item.detail)}</small>` : ''}</span>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  if (block.type === 'architecture') {
    return `
      <section class="slide-architecture reveal">
        ${block.intro ? `<p class="slide-paragraph">${escapeHtml(block.intro)}</p>` : ''}
        <div class="summary-grid">
          ${block.nodes.map((node) => `
            <div class="summary-card">
              <span class="summary-icon">${pickBulletIcon(node.label, 0)}</span>
              <span><strong>${escapeHtml(node.label)}</strong>${node.detail ? `<br/><small>${escapeHtml(node.detail)}</small>` : ''}</span>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  /* hero — only render points, skip headline (outer title covers it), skip repeated proof & fake stats */
  if (block.type === 'hero') {
    const points = (block.points || []).slice(0, 4);
    if (!points.length) return '';
    const items = points.map((item, i) => {
      const icon = pickBulletIcon(slideTitle, i);
      return `<li class="point-card">
        <span class="point-icon">${icon}</span>
        <span class="point-text">${escapeHtml(item)}</span>
      </li>`;
    }).join('');
    return `<ul class="slide-list reveal">${items}</ul>`;
  }

  if (block.type === 'compare') {
    return `
      <section class="slide-compare two-col-system reveal">
        <div class="compare-card-shell">
          <div class="compare-label">${escapeHtml(block.left.label)}</div>
          ${block.left.caption ? `<p class="compare-caption">${escapeHtml(block.left.caption)}</p>` : ''}
          <ul class="compare-points">${renderItems(block.left.items)}</ul>
        </div>
        <div class="compare-card-shell accent">
          <div class="compare-label">${escapeHtml(block.right.label)}</div>
          ${block.right.caption ? `<p class="compare-caption">${escapeHtml(block.right.caption)}</p>` : ''}
          <ul class="compare-points">${renderItems(block.right.items)}</ul>
        </div>
      </section>
    `;
  }

  if (block.type === 'metrics') {
    return `
      <section class="slide-metrics reveal">
        ${block.intro ? `<p class="slide-paragraph">${escapeHtml(block.intro)}</p>` : ''}
        <div class="metric-grid">
          ${block.items.map((item) => `
            <div class="metric-card">
              <div class="metric-value">${escapeHtml(item.value)}</div>
              <div class="metric-label">${escapeHtml(item.label)}</div>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  if (block.type === 'process') {
    return `
      <section class="slide-process reveal">
        ${block.intro ? `<p class="slide-paragraph">${escapeHtml(block.intro)}</p>` : ''}
        <ol class="process-list">
          ${block.steps.map((step, index) => `
            <li>
              <span class="process-index">${String(index + 1).padStart(2, '0')}</span>
              <span class="process-copy">${escapeHtml(step.label)}</span>
            </li>
          `).join('')}
        </ol>
      </section>
    `;
  }

  if (block.type === 'summary') {
    return `
      <section class="slide-summary reveal">
        ${block.intro ? `<p class="slide-paragraph">${escapeHtml(block.intro)}</p>` : ''}
        <ul class="slide-list">${renderItems(block.items)}</ul>
      </section>
    `;
  }

  if (block.type === 'cta') {
    return `
      <section class="slide-cta reveal">
        <p class="slide-paragraph">${escapeHtml(block.message)}</p>
        <div class="cta-pill-row">
          ${block.actions.map((item) => `<span class="cta-pill">${escapeHtml(item)}</span>`).join('')}
        </div>
      </section>
    `;
  }

  return '';
};

/* ── Decorative orb color pairs ──────────────────────────────── */

const orbPalette = [
  { a: 'rgba(255,122,69,0.16)', b: 'rgba(118,184,255,0.10)' },
  { a: 'rgba(118,184,255,0.14)', b: 'rgba(160,100,255,0.09)' },
  { a: 'rgba(160,100,255,0.13)', b: 'rgba(255,122,69,0.09)' },
  { a: 'rgba(80,200,180,0.12)', b: 'rgba(118,184,255,0.09)' },
];

export const renderDarkCardDeck = (deck, options) => {
  const totalSlides = deck.slides.length + 1;
  const titleText = options.title || deck.title;
  const subtitle = deck.intro || 'Markdown-first HTML slide deck';
  const previewItems = deck.slides
    .slice(0, 4)
    .map((slide, index) => `
      <div class="cover-item">
        <span class="cover-item-index">${String(index + 2).padStart(2, '0')}</span>
        <span class="cover-item-title">${escapeHtml(slide.title)}</span>
      </div>
    `)
    .join('');

  const titleSlide = `
    <section class="slide title-slide" data-title="${escapeHtml(titleText)}">
      <div class="page-no">01</div>
      <div class="slide-shell hero-shell">
        <aside class="meta-panel reveal">
          <div class="meta-eyebrow">OpenClaw Deck</div>
          <div class="meta-stack">
            <span class="meta-label">Theme</span>
            <span class="meta-value">${escapeHtml(options.theme)}</span>
          </div>
          <div class="meta-stack">
            <span class="meta-label">Slides</span>
            <span class="meta-value">${String(totalSlides)}</span>
          </div>
          <div class="meta-stack">
            <span class="meta-label">Mode</span>
            <span class="meta-value">Single-file HTML</span>
          </div>
        </aside>
        <div class="hero-panel reveal">
          <div class="hero-grid">
            <div class="hero-main">
              <div class="hero-mark">课程封面</div>
              <h1 class="slide-title" data-fit-text data-fit-min="42" data-fit-max="92" data-fit-lines="2">${escapeHtml(titleText)}</h1>
              <p class="slide-subtitle">${escapeHtml(subtitle)}</p>
              <div class="hero-rule"></div>
              <div class="hero-note">面向中文内容排版优化，减少大写英文海报式冲突，保留科技感和课程节奏。</div>
            </div>
            <div class="cover-side">
              <div class="cover-side-label">课程导览</div>
              <div class="cover-list">
                ${previewItems}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="slide-footer">
        <span>md-to-html-slides</span>
        <span>${String(1).padStart(2, '0')} / ${String(totalSlides).padStart(2, '0')}</span>
      </div>
    </section>
  `;

  const contentSlides = deck.slides.map((slide, index) => {
    const count = index + 2;
    const renderedBlocks = slide.blocks.map((b) => renderBlock(b, slide.title)).join('\n');
    const pageIcon = pickIcon(slide.title, index);
    const orb = orbPalette[index % orbPalette.length];
    const ox = 50 + (index * 17) % 40;
    const oy = 20 + (index * 23) % 50;
    return `
      <section class="slide" data-title="${escapeHtml(slide.title)}" id="${slugify(slide.title)}">
        <div class="page-no">${String(count).padStart(2, '0')}</div>
        <div class="slide-orb" style="background:radial-gradient(ellipse at ${ox}% ${oy}%,${orb.a},transparent 52%),radial-gradient(ellipse at ${100-ox}% ${100-oy}%,${orb.b},transparent 48%);"></div>
        <div class="slide-shell content-shell">
          <div class="content-panel reveal">
            <div class="content-panel-inner">
              <div class="content-kicker">Chapter ${String(count).padStart(2, '0')}</div>
              <div class="content-icon">${pageIcon}</div>
              <h2 class="slide-heading" data-fit-text data-fit-min="30" data-fit-max="58" data-fit-lines="2">${highlightTitle(slide.title)}</h2>
              <div class="slide-body">
                ${renderedBlocks}
              </div>
            </div>
          </div>
        </div>
        <div class="slide-footer">
          <span>${escapeHtml(slide.title)}</span>
          <span>${String(count).padStart(2, '0')} / ${String(totalSlides).padStart(2, '0')}</span>
        </div>
      </section>
    `;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(titleText)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&family=Noto+Sans+SC:wght@400;500;700;800&family=Noto+Serif+SC:wght@600;700;900&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg-0: #0b0e14;
      --bg-1: #101621;
      --bg-2: #172030;
      --panel: rgba(15, 20, 30, 0.78);
      --panel-soft: rgba(19, 26, 39, 0.52);
      --line: rgba(255,255,255,0.08);
      --line-soft: rgba(255,255,255,0.04);
      --text-1: #f3f5fb;
      --text-2: rgba(243,245,251,0.72);
      --text-3: rgba(243,245,251,0.46);
      --accent: #ff7a45;
      --accent-soft: #ffb48a;
      --accent-alt: #76b8ff;
      --font-sans: 'Noto Sans SC', sans-serif;
      --font-serif: 'Noto Serif SC', serif;
      --font-mono: 'JetBrains Mono', monospace;
      --title-size: clamp(2.6rem, 5vw, 5rem);
      --heading-size: clamp(1.75rem, 3vw, 3rem);
      --body-size: clamp(1rem, 1.35vw, 1.08rem);
      --small-size: clamp(0.7rem, 0.9vw, 0.82rem);
      --slide-padding: clamp(1rem, 2.8vw, 2.2rem);
      --duration-normal: 0.6s;
      --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; overflow-x: hidden; }
    html { scroll-snap-type: y mandatory; scroll-behavior: smooth; }

    body {
      color: var(--text-1);
      font-family: var(--font-sans);
      background:
        radial-gradient(circle at 18% 10%, rgba(255, 122, 69, 0.18), transparent 24%),
        radial-gradient(circle at 88% 20%, rgba(118, 184, 255, 0.12), transparent 20%),
        linear-gradient(135deg, var(--bg-0) 0%, var(--bg-1) 48%, #0a0d13 100%);
    }

    .slide {
      position: relative;
      width: 100vw;
      height: 100vh;
      height: 100dvh;
      scroll-snap-align: start;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      padding: var(--slide-padding);
    }

    .slide::before {
      content: '';
      position: absolute;
      inset: 14px;
      border: 1px solid var(--line-soft);
      pointer-events: none;
    }

    .slide::after {
      content: '';
      position: absolute;
      inset: 0;
      background:
        linear-gradient(90deg, rgba(255,255,255,0.015) 0, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 120px),
        linear-gradient(rgba(255,255,255,0.012) 0, rgba(255,255,255,0.012) 1px, transparent 1px, transparent 120px);
      opacity: 0.28;
      pointer-events: none;
    }

    /* ── Background orb decoration ── */
    .slide-orb {
      position: absolute;
      inset: -15%;
      z-index: 0;
      pointer-events: none;
      opacity: 0.65;
    }

    .progress-bar {
      position: fixed;
      top: 0;
      left: 0;
      z-index: 300;
      width: 100%;
      height: 4px;
      background: rgba(255,255,255,0.04);
    }

    .progress-bar-fill {
      height: 100%;
      width: 0;
      background: linear-gradient(90deg, var(--accent), var(--accent-soft));
      box-shadow: 0 0 24px rgba(255,122,69,0.35);
      transition: width 0.24s ease;
    }

    .nav-dots {
      position: fixed;
      right: 22px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      flex-direction: column;
      gap: 10px;
      z-index: 220;
    }

    .nav-dot {
      width: 12px;
      height: 12px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.08);
      cursor: pointer;
      transition: transform 0.2s ease, background 0.2s ease;
    }

    .nav-dot.active {
      background: var(--accent);
      transform: scale(1.18);
    }

    .page-no {
      position: absolute;
      top: 24px;
      left: 24px;
      z-index: 2;
      font-family: var(--font-serif);
      font-size: clamp(3.2rem, 7vw, 6rem);
      font-weight: 900;
      line-height: 0.9;
      letter-spacing: -0.06em;
      color: rgba(255,255,255,0.08);
    }

    .slide-shell {
      position: relative;
      z-index: 2;
      flex: 1;
      width: min(1320px, 100%);
      margin: 0 auto;
      display: grid;
      gap: clamp(1rem, 2vw, 1.5rem);
      min-height: 0;
      padding-top: clamp(2rem, 4.8vw, 3.4rem);
      padding-bottom: clamp(2rem, 4.8vw, 3.2rem);
    }

    .hero-shell {
      grid-template-columns: 260px minmax(0, 1fr);
    }

    .content-shell {
      grid-template-columns: minmax(0, 1fr);
    }

    .meta-panel,
    .hero-panel,
    .content-panel {
      min-height: 0;
    }

    .meta-panel {
      background: var(--panel-soft);
      border: 1px solid var(--line);
      backdrop-filter: blur(12px);
      padding: clamp(1.2rem, 2.4vw, 1.7rem);
      display: grid;
      align-content: start;
      gap: 1rem;
    }

    .meta-eyebrow,
    .meta-label,
    .content-kicker,
    .slide-code-lang,
    .slide-footer {
      font-family: var(--font-mono);
      font-size: var(--small-size);
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .meta-eyebrow,
    .content-kicker {
      color: var(--accent-soft);
    }

    .meta-stack {
      display: grid;
      gap: 0.2rem;
      padding-top: 0.8rem;
      border-top: 1px solid var(--line);
    }

    .meta-label {
      color: var(--text-3);
    }

    .meta-value {
      color: var(--text-1);
      font-size: 0.98rem;
      line-height: 1.5;
    }

    .hero-panel,
    .content-panel {
      background: var(--panel);
      border: 1px solid var(--line);
      backdrop-filter: blur(14px);
      overflow: hidden;
      position: relative;
    }

    .hero-panel::before,
    .content-panel::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 5px;
      background: linear-gradient(180deg, var(--accent), var(--accent-alt));
    }

    .hero-panel {
      padding: clamp(1.4rem, 3vw, 2.4rem) clamp(1.5rem, 3vw, 2.6rem) clamp(1.5rem, 3vw, 2.4rem) clamp(2rem, 4vw, 2.8rem);
      display: flex;
      align-items: stretch;
    }

    .hero-mark {
      color: var(--text-3);
      font-size: 0.96rem;
      line-height: 1.5;
    }

    .hero-grid {
      width: 100%;
      display: grid;
      grid-template-columns: minmax(0, 1.05fr) minmax(280px, 0.72fr);
      gap: clamp(1.2rem, 2.2vw, 1.8rem);
      align-items: center;
    }

    .hero-main {
      display: grid;
      align-content: center;
      gap: 1rem;
      min-width: 0;
    }

    .cover-side {
      display: grid;
      align-content: start;
      gap: 0.95rem;
      min-width: 0;
      padding: 1rem 0 0.2rem 1.2rem;
      border-left: 1px solid var(--line);
    }

    .cover-side-label {
      font-family: var(--font-mono);
      font-size: var(--small-size);
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--accent-soft);
    }

    .cover-list {
      display: grid;
      gap: 0.8rem;
    }

    .cover-item {
      display: grid;
      grid-template-columns: 34px 1fr;
      gap: 0.8rem;
      align-items: start;
      padding-top: 0.8rem;
      border-top: 1px solid var(--line);
    }

    .cover-item-index {
      font-family: var(--font-mono);
      font-size: var(--small-size);
      color: var(--text-3);
      letter-spacing: 0.12em;
    }

    .cover-item-title {
      color: var(--text-2);
      font-size: 0.98rem;
      line-height: 1.55;
    }

    .slide-title,
    .slide-heading {
      font-family: var(--font-serif);
      font-weight: 900;
      letter-spacing: -0.03em;
      color: var(--text-1);
      text-wrap: balance;
    }

    .slide-title {
      max-width: 12ch;
      font-size: var(--fit-size, var(--title-size));
      line-height: 1.12;
    }

    .slide-heading {
      max-width: 18ch;
      font-size: var(--fit-size, var(--heading-size));
      line-height: 1.2;
    }

    /* ── Title keyword highlight ── */
    .slide-heading .hl {
      font-style: normal;
      color: var(--accent);
    }

    .slide-subtitle,
    .slide-paragraph,
    .slide-list li,
    .slide-figure figcaption {
      font-size: var(--body-size);
      line-height: 1.75;
    }

    .slide-subtitle,
    .hero-note,
    .slide-paragraph,
    .slide-figure figcaption {
      color: var(--text-2);
      max-width: 54ch;
    }

    .hero-rule {
      width: min(220px, 40%);
      height: 1px;
      background: linear-gradient(90deg, var(--accent), transparent);
    }

    /* ── Content icon (per slide) ── */
    .content-icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 14px;
      background: linear-gradient(135deg, rgba(255,122,69,0.12), rgba(118,184,255,0.10));
      border: 1px solid rgba(255,255,255,0.06);
      color: var(--accent);
    }

    .content-icon svg {
      width: 26px;
      height: 26px;
    }

    .content-panel-inner {
      height: 100%;
      display: grid;
      align-content: center;
      gap: 0.9rem;
      padding: clamp(1.4rem, 3vw, 2rem) clamp(1.5rem, 3vw, 2.4rem) clamp(1.4rem, 3vw, 2rem) clamp(2rem, 4vw, 2.8rem);
      overflow: hidden;
    }

    .slide-body {
      display: grid;
      gap: 1rem;
      align-content: start;
      overflow: auto;
      padding-right: 0.25rem;
    }

    /* ── Point cards (icon + text per bullet) ── */
    .slide-list {
      list-style: none;
      display: grid;
      gap: 0.7rem;
      max-width: 64ch;
    }

    .point-card {
      display: grid;
      grid-template-columns: 40px 1fr;
      gap: 0;
      align-items: stretch;
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
      background: rgba(255,255,255,0.02);
      transition: background 0.2s ease;
    }

    .point-card:hover {
      background: rgba(255,255,255,0.04);
    }

    .point-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255,122,69,0.06);
      border-right: 1px solid var(--line);
      color: var(--accent);
    }

    .point-icon svg {
      width: 20px;
      height: 20px;
    }

    .point-text {
      display: block;
      padding: 0.72rem 0.9rem;
      font-size: var(--body-size);
      line-height: 1.6;
      color: var(--text-1);
    }

    .slide-figure,
    .slide-code-wrap {
      display: grid;
      gap: 0.8rem;
      padding: 1rem;
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--line);
    }

    .slide-figure img {
      width: 100%;
      max-height: 46vh;
      object-fit: contain;
      background: rgba(255,255,255,0.03);
    }

    .slide-code {
      overflow: auto;
      max-height: 40vh;
      color: #edf2ff;
      font-family: var(--font-mono);
      font-size: clamp(0.76rem, 1vw, 0.92rem);
      line-height: 1.68;
    }

    .semantic-kicker,
    .compare-label,
    .process-index {
      font-family: var(--font-mono);
      font-size: var(--small-size);
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--accent-soft);
    }

    .semantic-chip-list,
    .compare-points,
    .process-list {
      list-style: none;
    }

    .semantic-chip-list {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 1rem;
    }

    .semantic-chip-list li,
    .cta-pill {
      padding: 0.55rem 0.8rem;
      border-radius: 999px;
      border: 1px solid var(--line);
      background: rgba(255,255,255,0.04);
      color: var(--text-1);
      font-size: 0.95rem;
    }

    .slide-compare {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
      align-items: stretch;
    }

    .compare-card-shell {
      border: 1px solid var(--line);
      background: rgba(255,255,255,0.03);
      padding: 1rem;
      display: grid;
      gap: 0.9rem;
    }

    .compare-card-shell.accent {
      background: rgba(118,184,255,0.08);
    }

    .compare-points {
      display: grid;
      gap: 10px;
    }

    .compare-points li,
    .process-list li {
      color: var(--text-2);
      line-height: 1.6;
    }

    .compare-caption {
      color: var(--text-3);
      font-size: 0.92rem;
      line-height: 1.5;
    }

    .metric-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-top: 1rem;
    }

    .metric-card {
      border: 1px solid var(--line);
      background: rgba(255,255,255,0.03);
      padding: 1rem;
      min-height: 150px;
      display: grid;
      align-content: end;
      gap: 0.45rem;
    }

    .metric-value {
      font-family: var(--font-serif);
      font-size: clamp(2rem, 4vw, 3rem);
      line-height: 0.95;
      color: var(--accent-soft);
    }

    .metric-label {
      color: var(--text-2);
      line-height: 1.55;
    }

    .process-list {
      display: grid;
      gap: 12px;
      margin-top: 1rem;
    }

    .process-list li {
      display: grid;
      grid-template-columns: 44px 1fr;
      gap: 12px;
      padding: 0.9rem 1rem;
      border: 1px solid var(--line);
      background: rgba(255,255,255,0.03);
    }

    .cta-pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 1rem;
    }

    .hero-grid-system {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(260px, 0.9fr);
      gap: 16px;
      align-items: stretch;
    }

    .hero-grid-main,
    .hero-grid-side {
      display: grid;
      gap: 14px;
      align-content: start;
    }

    .hero-grid-title {
      font-family: var(--font-serif);
      font-size: clamp(1.8rem, 3vw, 3rem);
      line-height: 1;
      letter-spacing: -0.03em;
      color: var(--text-1);
    }

    .hero-proof-note,
    .hero-stat-label {
      color: var(--text-3);
    }

    .hero-proof-note {
      font-size: 0.95rem;
      line-height: 1.55;
    }

    .hero-stat-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .hero-stat-box {
      border: 1px solid var(--line);
      background: rgba(255,255,255,0.03);
      padding: 0.8rem;
      display: grid;
      gap: 0.35rem;
    }

    .hero-stat-value {
      color: var(--accent-soft);
      font-family: var(--font-mono);
      font-size: 1rem;
    }

    .slide-footer {
      position: relative;
      z-index: 2;
      width: min(1320px, 100%);
      margin: 0 auto;
      padding-top: 0.35rem;
      display: flex;
      justify-content: space-between;
      gap: 18px;
      color: var(--text-3);
    }

    .reveal {
      opacity: 0;
      transform: translateY(22px);
      transition:
        opacity var(--duration-normal) var(--ease-out-expo),
        transform var(--duration-normal) var(--ease-out-expo);
    }

    .slide.is-active .reveal {
      opacity: 1;
      transform: translateY(0);
    }

    .slide.is-active .reveal:nth-child(2) { transition-delay: 0.08s; }
    .slide.is-active .reveal:nth-child(3) { transition-delay: 0.16s; }
    .slide.is-active .reveal:nth-child(4) { transition-delay: 0.24s; }
    .slide.is-active .reveal:nth-child(5) { transition-delay: 0.32s; }

    @media (max-width: 920px) {
      .hero-shell {
        grid-template-columns: 1fr;
      }

      .meta-panel {
        display: none;
      }

      .hero-grid {
        grid-template-columns: 1fr;
      }

      .cover-side {
        padding-left: 0;
        border-left: 0;
        border-top: 1px solid var(--line);
        padding-top: 1rem;
      }
    }

    @media (max-width: 720px) {
      .slide {
        padding: 0.9rem;
      }

      .slide::before {
        inset: 10px;
      }

      .page-no {
        top: 18px;
        left: 18px;
      }

      .nav-dots {
        right: auto;
        left: 50%;
        top: auto;
        bottom: 14px;
        transform: translateX(-50%);
        flex-direction: row;
      }

      .slide-shell {
        padding-top: 4.2rem;
      }

      .hero-panel,
      .content-panel-inner {
        padding-left: 1.45rem;
      }

      .slide-footer {
        padding-bottom: 2.2rem;
      }

      .slide-figure img,
      .slide-code {
        max-height: 34vh;
      }
    }
  </style>
</head>
<body>
  <div class="progress-bar"><div class="progress-bar-fill" id="progressFill"></div></div>
  <div class="nav-dots" id="navDots"></div>
  <main id="slidesRoot">
    ${titleSlide}
    ${contentSlides}
  </main>
  <script>
    (() => {
      const slides = Array.from(document.querySelectorAll('.slide'));
      const navDotsRoot = document.getElementById('navDots');
      const progressFill = document.getElementById('progressFill');
      let resizeTimer = 0;

      const fitText = (element) => {
        const min = Number(element.dataset.fitMin || 28);
        const max = Number(element.dataset.fitMax || 72);
        const maxLines = Number(element.dataset.fitLines || 2);

        element.style.setProperty('--fit-size', max + 'px');

        const getRatio = () => {
          const computed = window.getComputedStyle(element);
          const fontSize = parseFloat(computed.fontSize) || max;
          const lineHeight = parseFloat(computed.lineHeight);
          if (Number.isFinite(lineHeight) && lineHeight > 0) {
            return lineHeight / fontSize;
          }
          return 1.2;
        };

        const ratio = getRatio();
        let size = max;

        while (size > min) {
          const allowedHeight = size * ratio * maxLines + 1;
          if (element.scrollHeight <= allowedHeight) break;
          size -= 1;
          element.style.setProperty('--fit-size', size + 'px');
        }
      };

      const fitAllText = () => {
        document.querySelectorAll('[data-fit-text]').forEach(fitText);
      };
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const activeIndex = slides.indexOf(entry.target);
            setActiveSlide(activeIndex);
          }
        });
      }, { threshold: 0.6 });

      let activeIndex = 0;
      let touchStartY = 0;
      let ticking = false;

      const clampIndex = (value) => Math.max(0, Math.min(value, slides.length - 1));

      const goToSlide = (index) => {
        const nextIndex = clampIndex(index);
        slides[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'start' });
      };

      const setActiveSlide = (index) => {
        activeIndex = clampIndex(index);
        slides.forEach((slide, slideIndex) => {
          slide.classList.toggle('is-active', slideIndex === activeIndex);
        });
        const progress = slides.length > 1 ? (activeIndex / (slides.length - 1)) * 100 : 100;
        progressFill.style.width = progress + '%';
        Array.from(navDotsRoot.children).forEach((dot, dotIndex) => {
          dot.classList.toggle('active', dotIndex === activeIndex);
          dot.setAttribute('aria-current', dotIndex === activeIndex ? 'true' : 'false');
        });
      };

      slides.forEach((slide, index) => {
        observer.observe(slide);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'nav-dot' + (index === 0 ? ' active' : '');
        button.setAttribute('aria-label', 'Go to slide ' + (index + 1));
        button.addEventListener('click', () => goToSlide(index));
        navDotsRoot.appendChild(button);
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === 'ArrowRight' || event.key === ' ') {
          event.preventDefault();
          goToSlide(activeIndex + 1);
        }
        if (event.key === 'ArrowUp' || event.key === 'PageUp' || event.key === 'ArrowLeft') {
          event.preventDefault();
          goToSlide(activeIndex - 1);
        }
        if (event.key === 'Home') {
          event.preventDefault();
          goToSlide(0);
        }
        if (event.key === 'End') {
          event.preventDefault();
          goToSlide(slides.length - 1);
        }
      });

      window.addEventListener('wheel', (event) => {
        if (ticking || Math.abs(event.deltaY) < 18) return;
        ticking = true;
        goToSlide(activeIndex + (event.deltaY > 0 ? 1 : -1));
        window.setTimeout(() => {
          ticking = false;
        }, 420);
      }, { passive: true });

      window.addEventListener('touchstart', (event) => {
        touchStartY = event.changedTouches[0].clientY;
      }, { passive: true });

      window.addEventListener('touchend', (event) => {
        const deltaY = touchStartY - event.changedTouches[0].clientY;
        if (Math.abs(deltaY) < 40) return;
        goToSlide(activeIndex + (deltaY > 0 ? 1 : -1));
      }, { passive: true });

      window.addEventListener('resize', () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(fitAllText, 120);
      });

      setActiveSlide(0);
      slides[0].classList.add('is-active');

      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          fitAllText();
          window.requestAnimationFrame(fitAllText);
        });
      } else {
        fitAllText();
      }
    })();
  </script>
</body>
</html>`;
};
