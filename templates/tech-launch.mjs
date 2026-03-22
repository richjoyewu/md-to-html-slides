const escapeHtml = (value = '') => {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const slugify = (value = '') => {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'slide';
};

const compactText = (value = '') => String(value || '').replace(/\s+/g, ' ').trim();

const renderGlyph = (kind) => {
  const icons = {
    pulse: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13h4l2.2-4.5L13 16l2-3h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    split: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h12M6 18h12M12 6v12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    orbit: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="2.4" fill="currentColor"/><ellipse cx="12" cy="12" rx="8" ry="3.6" fill="none" stroke="currentColor" stroke-width="1.5"/><ellipse cx="12" cy="12" rx="3.6" ry="8" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    stack: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l7 4-7 4-7-4 7-4zm0 8l7 4-7 4-7-4 7-4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    launch: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l3 6 5 2-5 2-3 6-3-6-5-2 5-2 3-6z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h12M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    graph: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17l4-5 3 2 5-7 2 1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 19h14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    target: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/></svg>',
    spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 4.8L19 9.6l-5.2 1.8L12 16.3l-1.8-4.9L5 9.6l5.2-1.8L12 3z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>'
  };
  return icons[kind] || icons.orbit;
};

const getBlocksByType = (slide, type) => slide.blocks.filter((block) => block.type === type);
const getSemanticBlock = (slide, type) => slide.blocks.find((block) => block.type === type) || null;
const getParagraphs = (slide) => getBlocksByType(slide, 'paragraph').map((block) => block.content);
const getListItems = (slide) => getBlocksByType(slide, 'list').flatMap((block) => block.items);

const renderImageBlock = (block) => [
  '<figure class="media-card reveal">',
  `  <img src="${block.inlinedSrc}" alt="${escapeHtml(block.alt)}" />`,
  block.alt ? `  <figcaption>${escapeHtml(block.alt)}</figcaption>` : '',
  '</figure>'
].filter(Boolean).join('\n');

const renderCodeBlock = (block) => [
  '<div class="code-card reveal">',
  block.language ? `  <div class="code-lang">${escapeHtml(block.language)}</div>` : '',
  `  <pre><code>${escapeHtml(block.content)}</code></pre>`,
  '</div>'
].filter(Boolean).join('\n');

const renderQuoteSurface = (slide) => {
  const quoteBlock = getSemanticBlock(slide, 'quote');
  if (!quoteBlock) return '';
  return `
    <div class="quote-surface reveal">
      <div class="surface-kicker">${escapeHtml(quoteBlock.emphasis || 'Quote')}</div>
      <blockquote class="quote-headline">${escapeHtml(quoteBlock.quote)}</blockquote>
      ${quoteBlock.attribution ? `<div class="quote-source">— ${escapeHtml(quoteBlock.attribution)}</div>` : ''}
    </div>
  `;
};

const renderTransitionSurface = (slide) => {
  const transitionBlock = getSemanticBlock(slide, 'transition');
  if (!transitionBlock) return '';
  return `
    <div class="transition-surface reveal">
      ${transitionBlock.kicker ? `<div class="surface-kicker">${escapeHtml(transitionBlock.kicker)}</div>` : ''}
      <h2 class="transition-heading" data-fit-text data-fit-min="34" data-fit-max="68" data-fit-lines="3">${escapeHtml(transitionBlock.headline)}</h2>
      ${transitionBlock.body ? `<p class="lead-copy">${escapeHtml(transitionBlock.body)}</p>` : ''}
    </div>
  `;
};

const renderTagsSurface = (slide) => {
  const tagsBlock = getSemanticBlock(slide, 'tags');
  if (!tagsBlock) return '';
  return `
    <div class="summary-surface reveal">
      ${tagsBlock.intro ? `<p class="summary-body">${escapeHtml(tagsBlock.intro)}</p>` : ''}
      <div class="summary-grid">
        ${tagsBlock.items.map((item) => `
          <div class="summary-card">
            <span class="summary-icon">${renderGlyph('spark')}</span>
            <span>${escapeHtml(item)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
};

const renderFlowSurface = (slide) => {
  const flowBlock = getSemanticBlock(slide, 'flow');
  if (!flowBlock) return '';
  return `
    <div class="process-surface reveal">
      ${flowBlock.eyebrow ? `<div class="surface-kicker">${escapeHtml(flowBlock.eyebrow)}</div>` : ''}
      ${flowBlock.intro ? `<p class="process-body">${escapeHtml(flowBlock.intro)}</p>` : ''}
      <div class="process-line"></div>
      <div class="process-grid">
        ${flowBlock.nodes.map((item, index) => `
          <div class="process-card">
            <div class="process-card-head">
              <div class="process-step">0${index + 1}</div>
              <div class="process-icon">${renderGlyph(['orbit', 'target', 'graph', 'spark', 'launch'][index % 5])}</div>
            </div>
            <div class="process-copy">${escapeHtml(item.label)}</div>
            ${item.detail ? `<div class="process-detail">${escapeHtml(item.detail)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
};

const renderTableLiteSurface = (slide) => {
  const tableBlock = getSemanticBlock(slide, 'table-lite');
  if (!tableBlock) return '';
  return `
    <div class="metrics-surface reveal">
      ${tableBlock.caption ? `<p class="metrics-body">${escapeHtml(tableBlock.caption)}</p>` : ''}
      <div class="slide-table-wrap">
        <table class="slide-table-lite">
          <thead>
            <tr>${tableBlock.columns.map((item) => `<th>${escapeHtml(item)}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${tableBlock.rows.map((row) => `<tr>${row.cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

const renderTimelineSurface = (slide) => {
  const timelineBlock = getSemanticBlock(slide, 'timeline');
  if (!timelineBlock) return '';
  return `
    <div class="process-surface reveal">
      ${timelineBlock.eyebrow ? `<div class="surface-kicker">${escapeHtml(timelineBlock.eyebrow)}</div>` : ''}
      ${timelineBlock.intro ? `<p class="process-body">${escapeHtml(timelineBlock.intro)}</p>` : ''}
      <div class="process-line"></div>
      <div class="process-grid">
        ${timelineBlock.items.map((item, index) => `
          <div class="process-card">
            <div class="process-card-head">
              <div class="process-step">0${index + 1}</div>
              <div class="process-icon">${renderGlyph(['orbit', 'target', 'graph', 'spark', 'launch'][index % 5])}</div>
            </div>
            <div class="process-copy">${escapeHtml(item.label)}</div>
            ${item.detail ? `<div class="process-detail">${escapeHtml(item.detail)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
};

const renderCalloutSurface = (slide) => {
  const calloutBlock = getSemanticBlock(slide, 'callout');
  if (!calloutBlock) return '';
  return `
    <div class="transition-surface reveal">
      ${calloutBlock.title ? `<div class="surface-kicker">${escapeHtml(calloutBlock.title)}</div>` : ''}
      <h2 class="transition-heading" data-fit-text data-fit-min="30" data-fit-max="60" data-fit-lines="3">${escapeHtml(calloutBlock.body)}</h2>
    </div>
  `;
};

const renderStatStripSurface = (slide) => {
  const statBlock = getSemanticBlock(slide, 'stat-strip');
  if (!statBlock) return '';
  return `
    <div class="metrics-surface reveal">
      <div class="metrics-grid">
        ${statBlock.items.map((metric, index) => `
          <div class="metric-card">
            <div class="metric-icon">${renderGlyph(['graph', 'target', 'orbit', 'spark'][index % 4])}</div>
            <div class="metric-value">${escapeHtml(metric.value)}</div>
            <div class="metric-label">${escapeHtml(metric.label)}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
};

const renderMatrixSurface = (slide) => {
  const matrixBlock = getSemanticBlock(slide, 'matrix');
  if (!matrixBlock) return '';
  return `
    <div class="metrics-surface reveal">
      <div class="slide-table-wrap">
        <table class="slide-table-lite">
          <thead>
            <tr><th></th>${matrixBlock.columns.map((item) => `<th>${escapeHtml(item)}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${matrixBlock.rows.map((row) => `
              <tr>
                <th>${escapeHtml(row.label)}</th>
                ${row.cells.map((cell) => `<td><strong>${escapeHtml(cell.title)}</strong>${cell.body ? `<div>${escapeHtml(cell.body)}</div>` : ''}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

const renderPeopleSurface = (slide) => {
  const peopleBlock = getSemanticBlock(slide, 'people');
  if (!peopleBlock) return '';
  return `
    <div class="summary-surface reveal">
      ${peopleBlock.intro ? `<p class="summary-body">${escapeHtml(peopleBlock.intro)}</p>` : ''}
      <div class="summary-grid">
        ${peopleBlock.people.map((person) => `
          <div class="summary-card">
            <span class="summary-icon">${renderGlyph('orbit')}</span>
            <span><strong>${escapeHtml(person.name)}</strong><br/>${escapeHtml(person.role)}${person.note ? `<br/><small>${escapeHtml(person.note)}</small>` : ''}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
};

const renderFaqSurface = (slide) => {
  const faqBlock = getSemanticBlock(slide, 'faq');
  if (!faqBlock) return '';
  return `
    <div class="summary-surface reveal">
      ${faqBlock.intro ? `<p class="summary-body">${escapeHtml(faqBlock.intro)}</p>` : ''}
      <div class="summary-grid">
        ${faqBlock.items.map((item) => `
          <div class="summary-card">
            <span class="summary-icon">${renderGlyph('spark')}</span>
            <span><strong>${escapeHtml(item.question)}</strong>${item.answer ? `<br/><small>${escapeHtml(item.answer)}</small>` : ''}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
};

const renderRiskSurface = (slide) => {
  const riskBlock = getSemanticBlock(slide, 'risk');
  if (!riskBlock) return '';
  return `
    <div class="summary-surface reveal">
      ${riskBlock.intro ? `<p class="summary-body">${escapeHtml(riskBlock.intro)}</p>` : ''}
      <div class="summary-grid">
        ${riskBlock.items.map((item) => `
          <div class="summary-card">
            <span class="summary-icon">${renderGlyph(item.severity === 'high' ? 'target' : item.severity === 'low' ? 'orbit' : 'graph')}</span>
            <span><strong>${escapeHtml(item.title)}</strong>${item.detail ? `<br/><small>${escapeHtml(item.detail)}</small>` : ''}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
};

const renderArchitectureSurface = (slide) => {
  const architectureBlock = getSemanticBlock(slide, 'architecture');
  if (!architectureBlock) return '';
  return `
    <div class="process-surface reveal">
      ${architectureBlock.eyebrow ? `<div class="surface-kicker">${escapeHtml(architectureBlock.eyebrow)}</div>` : ''}
      ${architectureBlock.intro ? `<p class="process-body">${escapeHtml(architectureBlock.intro)}</p>` : ''}
      <div class="process-grid">
        ${architectureBlock.nodes.map((node, index) => `
          <div class="process-card">
            <div class="process-card-head">
              <div class="process-step">0${index + 1}</div>
              <div class="process-icon">${renderGlyph(['stack', 'orbit', 'graph', 'target', 'spark'][index % 5])}</div>
            </div>
            <div class="process-copy">${escapeHtml(node.label)}</div>
            ${node.detail ? `<div class="process-detail">${escapeHtml(node.detail)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
};

const renderDefaultSurface = (slide) => {
  const paragraphs = getParagraphs(slide);
  const lists = getBlocksByType(slide, 'list');
  const images = getBlocksByType(slide, 'image');
  const codes = getBlocksByType(slide, 'code');

  return [
    paragraphs.length ? `<p class="lead-copy reveal">${escapeHtml(paragraphs[0])}</p>` : '',
    lists.map((block) => `
      <ul class="signal-list reveal">
        ${block.items.map((item) => `<li><span class="bullet-mark">${renderGlyph('pulse')}</span><span>${escapeHtml(item)}</span></li>`).join('')}
      </ul>
    `).join('\n'),
    images.map(renderImageBlock).join('\n'),
    codes.map(renderCodeBlock).join('\n')
  ].filter(Boolean).join('\n');
};

const renderHeroSurface = (slide) => {
  const heroBlock = getSemanticBlock(slide, 'hero');
  const bullets = heroBlock?.points?.slice(0, 3) || getListItems(slide).slice(0, 3);
  const lead = heroBlock?.body || getParagraphs(slide)[0] || '';
  const headline = heroBlock?.headline || slide.title;
  const eyebrow = heroBlock?.eyebrow || 'Launch Thesis';
  const proof = heroBlock?.proof || bullets[bullets.length - 1] || '';
  const stats = heroBlock?.stats?.slice(0, 3) || [];
  return `
    <div class="hero-surface reveal">
      <div class="hero-copy">
        <div class="surface-kicker">${escapeHtml(eyebrow)}</div>
        <h2 class="hero-heading" data-fit-text data-fit-min="34" data-fit-max="72" data-fit-lines="3">${escapeHtml(headline)}</h2>
        ${lead ? `<p class="hero-body">${escapeHtml(lead)}</p>` : ''}
        ${proof ? `<div class="hero-proof"><span class="hero-proof-icon">${renderGlyph('graph')}</span><span>${escapeHtml(proof)}</span></div>` : ''}
        ${stats.length ? `<div class="hero-stat-strip">${stats.map((item) => `<div class="hero-stat-chip"><span class="hero-stat-chip-value">${escapeHtml(item.value)}</span><span class="hero-stat-chip-label">${escapeHtml(item.label)}</span></div>`).join('')}</div>` : ''}
      </div>
      <div class="hero-ambient">
        <div class="hero-orbit orbit-a"></div>
        <div class="hero-orbit orbit-b"></div>
        <div class="hero-orbit orbit-c"></div>
        <div class="hero-axis"></div>
      </div>
      <div class="hero-chip-grid">
        ${bullets.map((item) => `
          <div class="hero-chip">
            <span class="chip-icon">${renderGlyph('launch')}</span>
            <span>${escapeHtml(item)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
};

const parseCompareLabels = (slide) => {
  const compareBlock = getSemanticBlock(slide, 'compare');
  if (compareBlock) {
    return [compareBlock.left?.label || '旧方式', compareBlock.right?.label || '新方式'];
  }

  const lead = getParagraphs(slide)[0] || '';
  if (lead.includes('|')) {
    const parts = lead.split('|').map((part) => compactText(part)).filter(Boolean);
    if (parts.length >= 2) return parts.slice(0, 2);
  }
  return ['旧方式', '新方式'];
};

const renderCompareSurface = (slide) => {
  const compareBlock = getSemanticBlock(slide, 'compare');
  const items = getListItems(slide);
  const midpoint = Math.max(2, Math.ceil(items.length / 2));
  const leftItems = compareBlock?.left?.items?.length ? compareBlock.left.items : items.slice(0, midpoint);
  const rightItems = compareBlock?.right?.items?.length ? compareBlock.right.items : items.slice(midpoint);
  const [leftLabel, rightLabel] = parseCompareLabels(slide);
  const eyebrow = compareBlock?.eyebrow || 'Signal Shift';
  const summary = compareBlock?.summary || slide.title;
  return `
    <div class="compare-surface reveal">
      <div class="compare-summary">
        <div class="surface-kicker">${escapeHtml(eyebrow)}</div>
        <div class="compare-summary-text">${escapeHtml(summary)}</div>
      </div>
      <div class="compare-panel">
        <div class="panel-label"><span class="panel-icon">${renderGlyph('split')}</span>${escapeHtml(leftLabel)}</div>
        ${compareBlock?.left?.caption ? `<p class="compare-panel-caption">${escapeHtml(compareBlock.left.caption)}</p>` : ''}
        <ul class="compare-list">
          ${leftItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </div>
      <div class="compare-divider">${renderGlyph('arrow')}</div>
      <div class="compare-panel accent">
        <div class="panel-label"><span class="panel-icon">${renderGlyph('orbit')}</span>${escapeHtml(rightLabel)}</div>
        ${compareBlock?.right?.caption ? `<p class="compare-panel-caption">${escapeHtml(compareBlock.right.caption)}</p>` : ''}
        <ul class="compare-list">
          ${rightItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </div>
    </div>
  `;
};

const parseMetricItem = (item, index) => {
  const text = compactText(item);
  const separated = text.match(/^([^:：|]{1,16})[:：|]\s*(.+)$/);
  if (separated && /[\d%+xX]/.test(separated[1])) {
    return { value: separated[1], label: separated[2], note: '' };
  }
  const leading = text.match(/^([0-9][0-9a-zA-Z.%+/xX-]{0,11})\s+(.+)$/);
  if (leading) {
    return { value: leading[1], label: leading[2], note: '' };
  }
  return { value: `0${index + 1}`, label: text, note: '' };
};

const renderMetricsSurface = (slide) => {
  const metricsBlock = getSemanticBlock(slide, 'metrics');
  const lead = metricsBlock?.intro || getParagraphs(slide)[0] || '';
  const metrics = metricsBlock?.items?.length
    ? metricsBlock.items.slice(0, 4)
    : getListItems(slide).slice(0, 4).map(parseMetricItem);
  const eyebrow = metricsBlock?.eyebrow || 'Proof Points';
  const proof = metricsBlock?.proof || slide.title;
  const metricIcons = ['graph', 'target', 'orbit', 'spark'];
  return `
    <div class="metrics-surface reveal">
      <div class="metrics-meta">
        <div class="surface-kicker">${escapeHtml(eyebrow)}</div>
        ${proof ? `<div class="metrics-proof">${escapeHtml(proof)}</div>` : ''}
      </div>
      ${lead ? `<p class="metrics-body">${escapeHtml(lead)}</p>` : ''}
      <div class="metrics-grid">
        ${metrics.map((metric, index) => `
          <div class="metric-card">
            <div class="metric-icon">${renderGlyph(metricIcons[index % metricIcons.length])}</div>
            <div class="metric-value">${escapeHtml(metric.value)}</div>
            <div class="metric-label">${escapeHtml(metric.label)}</div>
            <div class="metric-spark">
              <span></span><span></span><span></span><span></span><span></span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
};

const renderProcessSurface = (slide) => {
  const processBlock = getSemanticBlock(slide, 'process');
  const steps = processBlock?.steps?.length ? processBlock.steps.slice(0, 5) : getListItems(slide).slice(0, 5).map((item) => ({ label: item }));
  const lead = processBlock?.intro || getParagraphs(slide)[0] || '';
  const eyebrow = processBlock?.eyebrow || 'Execution Path';
  const stepIcons = ['orbit', 'target', 'graph', 'spark', 'launch'];
  return `
    <div class="process-surface reveal">
      <div class="surface-kicker">${escapeHtml(eyebrow)}</div>
      ${lead ? `<p class="process-body">${escapeHtml(lead)}</p>` : ''}
      <div class="process-line"></div>
      <div class="process-grid">
        ${steps.map((item, index) => `
          <div class="process-card">
            <div class="process-card-head">
              <div class="process-step">0${index + 1}</div>
              <div class="process-icon">${renderGlyph(stepIcons[index % stepIcons.length])}</div>
            </div>
            <div class="process-copy">${escapeHtml(item.label || item)}</div>
            ${item.detail ? `<div class="process-detail">${escapeHtml(item.detail)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
};

const renderSummarySurface = (slide) => {
  const summaryBlock = getSemanticBlock(slide, 'summary');
  const lead = summaryBlock?.intro || getParagraphs(slide)[0] || '';
  const bullets = summaryBlock?.items?.length ? summaryBlock.items.slice(0, 3) : getListItems(slide).slice(0, 3);
  const eyebrow = summaryBlock?.eyebrow || 'Key Takeaways';
  return `
    <div class="summary-surface reveal">
      <div class="surface-kicker">${escapeHtml(eyebrow)}</div>
      ${lead ? `<p class="summary-body">${escapeHtml(lead)}</p>` : ''}
      <div class="summary-grid">
        ${bullets.map((item) => `
          <div class="summary-card">
            <span class="summary-icon">${renderGlyph('stack')}</span>
            <span>${escapeHtml(item)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
};

const renderCtaSurface = (slide) => {
  const ctaBlock = getSemanticBlock(slide, 'cta');
  const lead = ctaBlock?.message || getParagraphs(slide)[0] || '';
  const actions = ctaBlock?.actions?.length ? ctaBlock.actions.slice(0, 3) : getListItems(slide).slice(0, 3);
  const eyebrow = ctaBlock?.eyebrow || 'Call To Action';
  const proof = ctaBlock?.proof || '';
  return `
    <div class="cta-surface reveal">
      <div class="cta-rings"></div>
      <div class="cta-core">
        <div class="surface-kicker">${escapeHtml(eyebrow)}</div>
        <h2 class="cta-heading" data-fit-text data-fit-min="34" data-fit-max="68" data-fit-lines="3">${escapeHtml(slide.title)}</h2>
        ${lead ? `<p class="cta-body">${escapeHtml(lead)}</p>` : ''}
        ${proof ? `<div class="cta-proof">${escapeHtml(proof)}</div>` : ''}
        <div class="cta-actions">
          ${actions.map((item) => `<span class="cta-pill"><span class="cta-pill-icon">${renderGlyph('launch')}</span><span>${escapeHtml(item)}</span></span>`).join('')}
        </div>
      </div>
    </div>
  `;
};

const renderVariantSurface = (slide) => {
  if (getSemanticBlock(slide, 'quote')) return renderQuoteSurface(slide);
  if (getSemanticBlock(slide, 'transition')) return renderTransitionSurface(slide);
  if (getSemanticBlock(slide, 'tags')) return renderTagsSurface(slide);
  if (getSemanticBlock(slide, 'flow')) return renderFlowSurface(slide);
  if (getSemanticBlock(slide, 'table-lite')) return renderTableLiteSurface(slide);
  if (getSemanticBlock(slide, 'timeline')) return renderTimelineSurface(slide);
  if (getSemanticBlock(slide, 'callout')) return renderCalloutSurface(slide);
  if (getSemanticBlock(slide, 'stat-strip')) return renderStatStripSurface(slide);
  if (getSemanticBlock(slide, 'matrix')) return renderMatrixSurface(slide);
  if (getSemanticBlock(slide, 'people')) return renderPeopleSurface(slide);
  if (getSemanticBlock(slide, 'faq')) return renderFaqSurface(slide);
  if (getSemanticBlock(slide, 'risk')) return renderRiskSurface(slide);
  if (getSemanticBlock(slide, 'architecture')) return renderArchitectureSurface(slide);
  if (slide.variant === 'hero') return renderHeroSurface(slide);
  if (slide.variant === 'compare') return renderCompareSurface(slide);
  if (slide.variant === 'metrics') return renderMetricsSurface(slide);
  if (slide.variant === 'process') return renderProcessSurface(slide);
  if (slide.variant === 'summary') return renderSummarySurface(slide);
  if (slide.variant === 'cta') return renderCtaSurface(slide);
  return renderDefaultSurface(slide);
};

export const renderTechLaunchDeck = (deck, options = {}) => {
  const totalSlides = deck.slides.length + 1;
  const titleText = options.title || deck.title;
  const subtitle = deck.intro || 'Technology launch deck';
  const previewItems = deck.slides.slice(0, 4).map((slide, index) => `
    <div class="launch-preview-card">
      <span class="launch-preview-index">${String(index + 2).padStart(2, '0')}</span>
      <span class="launch-preview-title">${escapeHtml(slide.title)}</span>
    </div>
  `).join('');

  const titleSlide = `
    <section class="slide title-slide" data-title="${escapeHtml(titleText)}">
      <div class="page-no">01</div>
      <div class="slide-shell cover-shell">
        <div class="cover-grid reveal">
          <div class="cover-copy">
            <div class="cover-badge"><span>${renderGlyph('launch')}</span><span>Tech Launch Profile</span></div>
            <h1 class="slide-title" data-fit-text data-fit-min="44" data-fit-max="94" data-fit-lines="3">${escapeHtml(titleText)}</h1>
            <p class="slide-subtitle">${escapeHtml(subtitle)}</p>
            <div class="cover-line"></div>
            <div class="cover-meta-row">
              <div class="cover-meta-card">
                <span class="meta-label">Theme</span>
                <strong>${escapeHtml(options.theme || 'tech-launch')}</strong>
              </div>
              <div class="cover-meta-card">
                <span class="meta-label">Slides</span>
                <strong>${String(totalSlides)}</strong>
              </div>
            </div>
          </div>
          <div class="cover-preview">
            <div class="cover-preview-label">Launch Sequence</div>
            <div class="cover-preview-grid">
              ${previewItems}
            </div>
          </div>
        </div>
      </div>
      <div class="slide-footer">
        <span>md-to-html-slides</span>
        <span>01 / ${String(totalSlides).padStart(2, '0')}</span>
      </div>
    </section>
  `;

  const contentSlides = deck.slides.map((slide, index) => {
    const count = index + 2;
    const variantLabel = slide.variant === 'default' ? 'content' : slide.variant;
    const showSurfaceTitle = slide.variant !== 'hero' && slide.variant !== 'cta';
    return `
      <section class="slide variant-${slide.variant}" data-title="${escapeHtml(slide.title)}" id="${slugify(slide.title)}">
        <div class="page-no">${String(count).padStart(2, '0')}</div>
        <div class="slide-shell content-shell">
          <div class="slide-frame reveal">
            <div class="frame-head">
              <div class="frame-chip"><span>${renderGlyph('pulse')}</span><span>${escapeHtml(variantLabel)}</span></div>
              <div class="frame-code">Frame ${String(count).padStart(2, '0')}</div>
            </div>
            ${showSurfaceTitle ? `
              <div class="surface-title-wrap">
                <h2 class="surface-title" data-fit-text data-fit-min="28" data-fit-max="54" data-fit-lines="2">${escapeHtml(slide.title)}</h2>
              </div>
            ` : ''}
            ${renderVariantSurface(slide)}
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
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg-0: #040814;
      --bg-1: #07101f;
      --bg-2: #0a1730;
      --panel: rgba(10, 18, 34, 0.76);
      --panel-2: rgba(11, 22, 42, 0.9);
      --line: rgba(131, 225, 255, 0.14);
      --line-strong: rgba(131, 225, 255, 0.32);
      --text-1: #f4f8ff;
      --text-2: rgba(244, 248, 255, 0.74);
      --text-3: rgba(244, 248, 255, 0.48);
      --accent: #71f4ff;
      --accent-2: #7f86ff;
      --accent-3: #86ffc4;
      --warning: #ffb26a;
      --font-display: 'Space Grotesk', 'IBM Plex Sans', sans-serif;
      --font-body: 'IBM Plex Sans', sans-serif;
      --font-mono: 'IBM Plex Mono', monospace;
      --small: clamp(0.72rem, 0.9vw, 0.84rem);
      --body: clamp(1rem, 1.35vw, 1.1rem);
      --title: clamp(3rem, 6vw, 6.4rem);
      --heading: clamp(2rem, 4vw, 3.8rem);
      --pad: clamp(1rem, 2.8vw, 2.2rem);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; overflow-x: hidden; }
    html { scroll-snap-type: y mandatory; scroll-behavior: smooth; }

    body {
      color: var(--text-1);
      font-family: var(--font-body);
      background:
        radial-gradient(circle at 15% 0%, rgba(113, 244, 255, 0.16), transparent 24%),
        radial-gradient(circle at 86% 14%, rgba(127, 134, 255, 0.18), transparent 24%),
        linear-gradient(145deg, #040814 0%, #07101f 54%, #04070f 100%);
    }

    body::before {
      content: '';
      position: fixed;
      inset: 0;
      pointer-events: none;
      background:
        linear-gradient(90deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 120px),
        linear-gradient(rgba(255,255,255,0.016) 0, rgba(255,255,255,0.016) 1px, transparent 1px, transparent 120px);
      opacity: 0.18;
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
      padding: var(--pad);
    }

    .slide::before {
      content: '';
      position: absolute;
      inset: 12px;
      border: 1px solid rgba(255,255,255,0.04);
      pointer-events: none;
    }

    .slide::after {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 20% 0%, rgba(113, 244, 255, 0.08), transparent 28%),
        radial-gradient(circle at 92% 20%, rgba(127, 134, 255, 0.1), transparent 24%);
      pointer-events: none;
    }

    .progress-bar {
      position: fixed;
      top: 0;
      left: 0;
      z-index: 300;
      width: 100%;
      height: 4px;
      background: rgba(255,255,255,0.05);
    }

    .progress-bar-fill {
      width: 0;
      height: 100%;
      background: linear-gradient(90deg, var(--accent), var(--accent-2), var(--accent-3));
      box-shadow: 0 0 28px rgba(113, 244, 255, 0.24);
      transition: width 0.24s ease;
    }

    .nav-dots {
      position: fixed;
      right: 20px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      flex-direction: column;
      gap: 10px;
      z-index: 200;
    }

    .nav-dot {
      width: 12px;
      height: 12px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.16);
      background: rgba(255,255,255,0.08);
      cursor: pointer;
      transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
    }

    .nav-dot.active {
      background: var(--accent);
      border-color: var(--accent);
      transform: scale(1.16);
    }

    .page-no {
      position: absolute;
      top: 24px;
      left: 24px;
      z-index: 2;
      font-family: var(--font-mono);
      font-size: clamp(0.9rem, 1.2vw, 1rem);
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.32);
    }

    .slide-shell {
      position: relative;
      z-index: 2;
      flex: 1;
      width: min(1360px, 100%);
      margin: 0 auto;
      display: grid;
      min-height: 0;
      padding-top: clamp(2rem, 5vw, 3.4rem);
      padding-bottom: clamp(1.8rem, 4.2vw, 3rem);
    }

    .cover-shell { align-items: center; }
    .content-shell { align-items: stretch; }

    .cover-grid,
    .slide-frame {
      min-height: 0;
      border: 1px solid var(--line);
      background:
        linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0)),
        var(--panel);
      backdrop-filter: blur(16px);
      position: relative;
      overflow: hidden;
    }

    .cover-grid::before,
    .slide-frame::before {
      content: '';
      position: absolute;
      inset: auto -10% -35% auto;
      width: 420px;
      height: 420px;
      border-radius: 999px;
      background: radial-gradient(circle, rgba(127, 134, 255, 0.18), transparent 60%);
      pointer-events: none;
    }

    .cover-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(340px, 0.8fr);
      gap: clamp(1rem, 2.6vw, 2rem);
      padding: clamp(1.4rem, 3vw, 2rem);
    }

    .cover-copy,
    .cover-preview {
      position: relative;
      z-index: 1;
      min-height: 0;
    }

    .cover-copy {
      display: grid;
      align-content: center;
      gap: 1rem;
    }

    .cover-badge,
    .frame-chip,
    .frame-code,
    .slide-footer {
      font-family: var(--font-mono);
      font-size: var(--small);
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .cover-badge,
    .frame-chip {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      width: fit-content;
      padding: 0.6rem 0.8rem;
      border-radius: 999px;
      border: 1px solid var(--line-strong);
      color: var(--accent);
      background: rgba(7, 17, 34, 0.84);
    }

    .cover-badge span:first-child,
    .frame-chip span:first-child,
    .panel-icon,
    .summary-icon,
    .chip-icon {
      width: 18px;
      height: 18px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: currentColor;
    }

    .cover-badge svg,
    .frame-chip svg,
    .panel-icon svg,
    .summary-icon svg,
    .chip-icon svg,
    .compare-divider svg {
      width: 100%;
      height: 100%;
    }

    .slide-title,
    .hero-heading,
    .cta-heading {
      font-family: var(--font-display);
      font-size: var(--title);
      line-height: 0.92;
      letter-spacing: -0.05em;
      max-width: 9ch;
    }

    .slide-title { max-width: 10ch; }
    .hero-heading,
    .cta-heading {
      font-size: var(--heading);
      max-width: 11ch;
    }

    [data-fit-text] {
      font-size: var(--fit-size, inherit);
    }

    .slide-subtitle,
    .hero-body,
    .lead-copy,
    .metrics-body,
    .process-body,
    .summary-body,
    .cta-body {
      color: var(--text-2);
      font-size: clamp(1rem, 1.45vw, 1.18rem);
      line-height: 1.65;
      max-width: 42ch;
    }

    .cover-line {
      width: min(420px, 72%);
      height: 1px;
      background: linear-gradient(90deg, rgba(113,244,255,0.8), rgba(127,134,255,0));
    }

    .cover-meta-row {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .cover-meta-card {
      min-width: 150px;
      padding: 0.9rem 1rem;
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(6, 14, 28, 0.74);
      display: grid;
      gap: 0.25rem;
    }

    .meta-label {
      color: var(--text-3);
      font-family: var(--font-mono);
      font-size: var(--small);
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .cover-meta-card strong {
      font-size: 1rem;
      color: var(--text-1);
    }

    .cover-preview {
      padding: 1.2rem;
      border-radius: 26px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(7, 15, 29, 0.82);
      display: grid;
      align-content: center;
      gap: 1rem;
    }

    .cover-preview-label,
    .surface-kicker {
      color: var(--accent-3);
      font-family: var(--font-mono);
      font-size: var(--small);
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .cover-preview-grid {
      display: grid;
      gap: 12px;
    }

    .launch-preview-card {
      display: grid;
      grid-template-columns: 42px 1fr;
      gap: 14px;
      align-items: start;
      padding: 0.95rem 1rem;
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,0.08);
      background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
    }

    .launch-preview-index {
      color: var(--accent);
      font-family: var(--font-mono);
      font-size: 0.84rem;
      letter-spacing: 0.12em;
    }

    .launch-preview-title {
      font-size: 0.98rem;
      line-height: 1.5;
      color: var(--text-1);
    }

    .slide-frame {
      padding: clamp(1.2rem, 2.8vw, 1.9rem);
      display: grid;
      gap: 1.2rem;
      align-content: start;
      min-height: 100%;
    }

    .variant-hero .slide-frame,
    .variant-cta .slide-frame {
      grid-template-rows: auto 1fr;
    }

    .frame-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      position: relative;
      z-index: 1;
    }

    .frame-code {
      color: var(--text-3);
    }

    .surface-title-wrap {
      position: relative;
      z-index: 1;
      padding-bottom: 0.1rem;
    }

    .surface-title {
      font-family: var(--font-display);
      font-size: var(--heading);
      line-height: 0.96;
      letter-spacing: -0.045em;
      max-width: 12ch;
    }

    .variant-compare .surface-title,
    .variant-metrics .surface-title,
    .variant-process .surface-title {
      max-width: 18ch;
    }

    .hero-surface,
    .compare-surface,
    .metrics-surface,
    .process-surface,
    .summary-surface,
    .cta-surface {
      position: relative;
      z-index: 1;
      min-height: 0;
    }

    .hero-surface {
      display: grid;
      grid-template-columns: minmax(0, 1.05fr) minmax(220px, 0.55fr) minmax(320px, 0.8fr);
      gap: clamp(1rem, 2.4vw, 1.8rem);
      align-items: center;
    }

    .hero-copy {
      display: grid;
      gap: 1rem;
      align-content: center;
    }

    .hero-chip-grid {
      display: grid;
      gap: 14px;
    }

    .hero-ambient {
      position: relative;
      min-height: 360px;
      display: grid;
      place-items: center;
      opacity: 0.82;
    }

    .hero-orbit {
      position: absolute;
      border-radius: 999px;
      border: 1px solid rgba(113,244,255,0.12);
    }

    .orbit-a {
      width: 220px;
      height: 220px;
    }

    .orbit-b {
      width: 300px;
      height: 300px;
      border-color: rgba(127,134,255,0.14);
    }

    .orbit-c {
      width: 140px;
      height: 140px;
      border-color: rgba(134,255,196,0.18);
    }

    .hero-axis {
      width: 1px;
      height: 260px;
      background: linear-gradient(180deg, rgba(113,244,255,0), rgba(113,244,255,0.45), rgba(127,134,255,0));
    }

    .hero-proof,
    .metrics-proof,
    .cta-proof,
    .compare-summary-text {
      color: var(--text-2);
      line-height: 1.55;
      font-size: 0.98rem;
    }

    .hero-proof {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      width: fit-content;
      padding: 0.7rem 0.9rem;
      border-radius: 999px;
      border: 1px solid rgba(113,244,255,0.18);
      background: rgba(8, 16, 30, 0.64);
    }

    .hero-proof-icon {
      width: 18px;
      height: 18px;
      color: var(--accent);
    }

    .hero-stat-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .hero-stat-chip {
      display: grid;
      gap: 0.2rem;
      min-width: 120px;
      padding: 0.7rem 0.8rem;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(8, 16, 30, 0.5);
    }

    .hero-stat-chip-value {
      color: var(--accent);
      font-family: var(--font-mono);
      font-size: 0.95rem;
    }

    .hero-stat-chip-label {
      color: var(--text-3);
      font-size: 0.82rem;
      line-height: 1.4;
    }

    .hero-chip {
      display: grid;
      grid-template-columns: 34px 1fr;
      gap: 12px;
      align-items: center;
      padding: 1rem 1.05rem;
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(6, 14, 28, 0.72);
      color: var(--text-1);
      font-size: 1rem;
      line-height: 1.45;
    }

    .compare-surface {
      display: grid;
      grid-template-columns: minmax(220px, 0.42fr) minmax(0, 1fr) 72px minmax(0, 1fr);
      gap: 16px;
      align-items: start;
    }

    .compare-summary {
      display: grid;
      align-content: start;
      gap: 0.8rem;
      padding-top: 0.25rem;
    }

    .compare-panel {
      border-radius: 24px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(8, 16, 30, 0.74);
      padding: 1.2rem;
      display: grid;
      gap: 1rem;
    }

    .compare-panel.accent {
      background: linear-gradient(180deg, rgba(11, 24, 42, 0.96), rgba(9, 18, 34, 0.84));
      border-color: rgba(113, 244, 255, 0.22);
    }

    .compare-panel-caption {
      color: var(--text-3);
      font-size: 0.92rem;
      line-height: 1.5;
    }

    .panel-label {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      width: fit-content;
      color: var(--accent);
      font-family: var(--font-mono);
      font-size: var(--small);
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .compare-list,
    .signal-list {
      list-style: none;
      display: grid;
      gap: 12px;
    }

    .compare-list li,
    .signal-list li {
      padding: 0.95rem 1rem;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.03);
      color: var(--text-2);
      line-height: 1.55;
      font-size: 1rem;
    }

    .signal-list li {
      display: grid;
      grid-template-columns: 18px 1fr;
      gap: 12px;
      align-items: start;
    }

    .bullet-mark {
      color: var(--accent);
      width: 18px;
      height: 18px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .compare-divider {
      display: grid;
      place-items: center;
      color: var(--accent-2);
    }

    .metrics-surface,
    .process-surface,
    .summary-surface {
      display: grid;
      gap: 1rem;
    }

    .metrics-meta {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .metrics-grid,
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
    }

    .metric-card,
    .summary-card,
    .process-card,
    .media-card,
    .code-card {
      border-radius: 22px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(8, 15, 28, 0.78);
      overflow: hidden;
      position: relative;
      z-index: 1;
    }

    .metric-card {
      padding: 1.2rem;
      display: grid;
      gap: 0.5rem;
      min-height: 180px;
      align-content: end;
    }

    .metric-card:nth-child(1) .metric-value,
    .metric-card:nth-child(1) .metric-icon {
      color: var(--accent);
    }

    .metric-card:nth-child(2) .metric-value,
    .metric-card:nth-child(2) .metric-icon {
      color: var(--accent-3);
    }

    .metric-card:nth-child(3) .metric-value,
    .metric-card:nth-child(3) .metric-icon {
      color: var(--accent-2);
    }

    .metric-card:nth-child(4) .metric-value,
    .metric-card:nth-child(4) .metric-icon {
      color: var(--warning);
    }

    .metric-icon,
    .process-icon,
    .cta-pill-icon {
      width: 18px;
      height: 18px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--accent);
    }

    .metric-icon {
      width: 22px;
      height: 22px;
      margin-bottom: 0.4rem;
      color: var(--accent-3);
    }

    .metric-value {
      font-family: var(--font-display);
      font-size: clamp(2.1rem, 4vw, 3.8rem);
      line-height: 0.92;
      letter-spacing: -0.05em;
      color: var(--accent);
    }

    .metric-label {
      color: var(--text-2);
      line-height: 1.55;
      font-size: 1rem;
    }

    .metric-spark {
      display: flex;
      align-items: end;
      gap: 6px;
      height: 28px;
      margin-top: 0.4rem;
    }

    .metric-spark span {
      flex: 1;
      border-radius: 999px;
      background: linear-gradient(180deg, rgba(113,244,255,0.92), rgba(113,244,255,0.12));
      opacity: 0.72;
    }

    .metric-spark span:nth-child(1) { height: 28%; }
    .metric-spark span:nth-child(2) { height: 44%; }
    .metric-spark span:nth-child(3) { height: 62%; }
    .metric-spark span:nth-child(4) { height: 78%; }
    .metric-spark span:nth-child(5) { height: 92%; }

    .metric-card:nth-child(2) .metric-spark span {
      background: linear-gradient(180deg, rgba(134,255,196,0.92), rgba(134,255,196,0.12));
    }

    .metric-card:nth-child(3) .metric-spark span {
      background: linear-gradient(180deg, rgba(127,134,255,0.92), rgba(127,134,255,0.12));
    }

    .metric-card:nth-child(4) .metric-spark span {
      background: linear-gradient(180deg, rgba(255,178,106,0.92), rgba(255,178,106,0.12));
    }

    .process-surface {
      padding-top: 0.4rem;
    }

    .process-line {
      height: 1px;
      background: linear-gradient(90deg, rgba(113,244,255,0.52), rgba(127,134,255,0.18));
    }

    .process-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
    }

    .process-card {
      padding: 1.1rem;
      display: grid;
      gap: 0.8rem;
      min-height: 180px;
      align-content: start;
    }

    .process-card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .process-step {
      color: var(--accent);
      font-family: var(--font-mono);
      font-size: var(--small);
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .process-copy {
      color: var(--text-1);
      font-size: 1rem;
      line-height: 1.6;
    }

    .process-detail {
      color: var(--text-3);
      font-size: 0.92rem;
      line-height: 1.55;
    }

    .summary-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .summary-card {
      padding: 1rem;
      display: grid;
      gap: 0.9rem;
      align-content: start;
      min-height: 180px;
    }

    .summary-card span:last-child {
      color: var(--text-1);
      line-height: 1.55;
    }

    .cta-surface {
      min-height: 100%;
      display: grid;
      place-items: center;
      text-align: center;
      padding: 1rem;
    }

    .cta-rings {
      position: absolute;
      inset: 50% auto auto 50%;
      width: min(62vh, 540px);
      height: min(62vh, 540px);
      transform: translate(-50%, -50%);
      border-radius: 999px;
      border: 1px solid rgba(113,244,255,0.16);
      box-shadow:
        0 0 0 38px rgba(113,244,255,0.04),
        0 0 0 96px rgba(127,134,255,0.03);
    }

    .cta-core {
      position: relative;
      z-index: 1;
      display: grid;
      gap: 1rem;
      place-items: center;
      max-width: 820px;
    }

    .cta-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .cta-pill {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 0.8rem 1rem;
      border-radius: 999px;
      border: 1px solid rgba(113,244,255,0.22);
      background: rgba(8, 16, 30, 0.74);
      color: var(--text-1);
      line-height: 1.4;
    }

    .lead-copy {
      margin-bottom: 0.4rem;
    }

    .media-card img {
      width: 100%;
      height: auto;
      display: block;
      max-height: 42vh;
      object-fit: cover;
    }

    .media-card figcaption,
    .code-lang {
      padding: 0.8rem 1rem 0;
      color: var(--text-3);
      font-family: var(--font-mono);
      font-size: var(--small);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .code-card pre {
      padding: 1rem;
      overflow: auto;
      color: var(--text-1);
      font-size: 0.92rem;
      line-height: 1.55;
    }

    .slide-footer {
      position: relative;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 0 4px 4px;
      color: var(--text-3);
    }

    .reveal {
      opacity: 0;
      transform: translateY(24px);
      transition: opacity 0.7s ease, transform 0.7s ease;
    }

    .slide.is-active .reveal,
    .title-slide .reveal {
      opacity: 1;
      transform: translateY(0);
    }

    @media (max-width: 1180px) {
      .cover-grid,
      .hero-surface,
      .compare-surface,
      .process-grid,
      .metrics-grid,
      .summary-grid {
        grid-template-columns: 1fr;
      }

      .compare-divider {
        height: 48px;
      }

      .process-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 720px) {
      .slide {
        padding: 0.85rem;
      }

      .page-no,
      .nav-dots {
        display: none;
      }

      .slide-shell {
        padding-top: 1.8rem;
        padding-bottom: 1.6rem;
      }

      .process-grid,
      .metrics-grid,
      .summary-grid {
        grid-template-columns: 1fr;
      }

      .slide-footer {
        padding-bottom: 1.1rem;
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
          if (Number.isFinite(lineHeight) && lineHeight > 0) return lineHeight / fontSize;
          return 1.08;
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
          if (!entry.isIntersecting) return;
          const activeIndex = slides.indexOf(entry.target);
          setActiveSlide(activeIndex);
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
