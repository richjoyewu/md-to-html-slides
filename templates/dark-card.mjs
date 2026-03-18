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

const renderItems = (items = []) => items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');

const renderBlock = (block) => {
  if (block.type === 'paragraph') {
    return `<p class="slide-paragraph reveal">${escapeHtml(block.content)}</p>`;
  }

  if (block.type === 'list') {
    const items = block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
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

  if (block.type === 'hero') {
    return [
      '<section class="slide-hero-block hero-grid hero-grid-system reveal">',
      '  <div class="hero-grid-main">',
      `    <div class="semantic-kicker">${escapeHtml(block.eyebrow || 'Core Thesis')}</div>`,
      `    <h3 class="hero-grid-title">${escapeHtml(block.headline || '')}</h3>`,
      block.body ? `    <p class="slide-paragraph">${escapeHtml(block.body)}</p>` : '',
      block.proof ? `    <div class="hero-proof-note">${escapeHtml(block.proof)}</div>` : '',
      '  </div>',
      '  <div class="hero-grid-side">',
      block.points?.length ? `    <ul class="semantic-chip-list">${renderItems(block.points)}</ul>` : '',
      block.stats?.length ? `    <div class="hero-stat-grid">${block.stats.map((item) => `<div class="hero-stat-box"><div class="hero-stat-value">${escapeHtml(item.value)}</div><div class="hero-stat-label">${escapeHtml(item.label)}</div></div>`).join('')}</div>` : '',
      '  </div>',
      '</section>'
    ].filter(Boolean).join('\n');
  }

  if (block.type === 'compare') {
    return [
      '<section class="slide-compare reveal">',
      `  <div class="compare-column"><div class="compare-label">${escapeHtml(block.left.label)}</div><ul class="compare-points">${renderItems(block.left.items)}</ul></div>`,
      '  <div class="compare-vs">VS</div>',
      `  <div class="compare-column accent"><div class="compare-label">${escapeHtml(block.right.label)}</div><ul class="compare-points">${renderItems(block.right.items)}</ul></div>`,
      '</section>'
    ].join('\n');
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
    const renderedBlocks = slide.blocks.map(renderBlock).join('\n');
    return `
      <section class="slide" data-title="${escapeHtml(slide.title)}" id="${slugify(slide.title)}">
        <div class="page-no">${String(count).padStart(2, '0')}</div>
        <div class="slide-shell content-shell">
          <div class="content-panel reveal">
            <div class="content-panel-inner">
              <div class="content-kicker">Chapter ${String(count).padStart(2, '0')}</div>
              <h2 class="slide-heading" data-fit-text data-fit-min="30" data-fit-max="58" data-fit-lines="2">${escapeHtml(slide.title)}</h2>
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
      width: 8px;
      background: linear-gradient(180deg, var(--accent), var(--accent-soft));
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

    .content-panel-inner {
      height: 100%;
      display: grid;
      align-content: center;
      gap: 1rem;
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

    .slide-list {
      list-style: none;
      display: grid;
      gap: 0.9rem;
      max-width: 60ch;
    }

    .slide-list li {
      display: grid;
      grid-template-columns: 16px 1fr;
      gap: 0.9rem;
      align-items: start;
      color: var(--text-1);
    }

    .slide-list li::before {
      content: '';
      width: 10px;
      height: 10px;
      margin-top: 0.48rem;
      border-radius: 2px;
      background: var(--accent-alt);
      box-shadow: 0 0 0 5px rgba(118,184,255,0.12);
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
      grid-template-columns: minmax(0, 1fr) 64px minmax(0, 1fr);
      gap: 14px;
      align-items: stretch;
    }

    .compare-column {
      border: 1px solid var(--line);
      background: rgba(255,255,255,0.03);
      padding: 1rem;
      display: grid;
      gap: 0.9rem;
    }

    .compare-column.accent {
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

    .compare-vs {
      display: grid;
      place-items: center;
      color: var(--accent);
      font-family: var(--font-mono);
      letter-spacing: 0.12em;
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
