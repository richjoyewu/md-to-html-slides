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

  return '';
};

export const renderEditorialLightDeck = (deck, options) => {
  const totalSlides = deck.slides.length + 1;
  const titleText = options.title || deck.title;
  const subtitle = deck.intro || 'Markdown-first HTML slide deck';

  const titleSlide = `
    <section class="slide title-slide" data-title="${escapeHtml(titleText)}">
      <div class="slide-count">01 / ${String(totalSlides).padStart(2, '0')}</div>
      <div class="slide-shell">
        <div class="slide-content">
          <div class="eyebrow reveal">Editorial Light</div>
          <h1 class="slide-title reveal">${escapeHtml(titleText)}</h1>
          <p class="slide-subtitle reveal">${escapeHtml(subtitle)}</p>
          <div class="slide-meta reveal">
            <span class="meta-pill">Theme: ${escapeHtml(options.theme)}</span>
            <span class="meta-pill">Slides: ${String(totalSlides)}</span>
          </div>
        </div>
      </div>
      <div class="slide-footer">
        <span>Arrow keys, wheel, or swipe</span>
        <span>${String(1).padStart(2, '0')} / ${String(totalSlides).padStart(2, '0')}</span>
      </div>
    </section>
  `;

  const contentSlides = deck.slides.map((slide, index) => {
    const count = index + 2;
    const renderedBlocks = slide.blocks.map(renderBlock).join('\n');
    return `
      <section class="slide" data-title="${escapeHtml(slide.title)}" id="${slugify(slide.title)}">
        <div class="slide-count">${String(count).padStart(2, '0')} / ${String(totalSlides).padStart(2, '0')}</div>
        <div class="slide-shell">
          <div class="slide-content">
            <div class="eyebrow reveal">Chapter ${String(count).padStart(2, '0')}</div>
            <h2 class="slide-heading reveal">${escapeHtml(slide.title)}</h2>
            <div class="slide-body">
              ${renderedBlocks}
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
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(titleText)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;700&family=Instrument+Sans:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,500;6..72,700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --paper: #f5efe2;
      --paper-strong: #efe4d1;
      --ink: #191613;
      --muted: #625748;
      --line: rgba(25, 22, 19, 0.12);
      --accent: #b6462f;
      --accent-soft: #d17158;
      --accent-alt: #1f5c73;
      --font-display: 'Newsreader', serif;
      --font-body: 'Instrument Sans', sans-serif;
      --font-mono: 'IBM Plex Mono', monospace;
      --title-size: clamp(2.3rem, 6.3vw, 5.4rem);
      --h2-size: clamp(1.7rem, 3.8vw, 3.2rem);
      --body-size: clamp(0.96rem, 1.5vw, 1.12rem);
      --small-size: clamp(0.7rem, 0.95vw, 0.84rem);
      --slide-padding: clamp(1.2rem, 4vw, 3rem);
      --content-gap: clamp(1rem, 1.8vw, 1.65rem);
      --duration-normal: 0.65s;
      --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    html, body { height: 100%; overflow-x: hidden; }
    html { scroll-snap-type: y mandatory; scroll-behavior: smooth; }
    body {
      color: var(--ink);
      font-family: var(--font-body);
      background:
        linear-gradient(0deg, rgba(255,255,255,0.22), rgba(255,255,255,0.22)),
        repeating-linear-gradient(90deg, transparent 0, transparent calc(25% - 1px), rgba(25,22,19,0.03) calc(25% - 1px), rgba(25,22,19,0.03) 25%),
        radial-gradient(circle at top left, rgba(182, 70, 47, 0.09), transparent 28%),
        radial-gradient(circle at 85% 22%, rgba(31, 92, 115, 0.08), transparent 24%),
        var(--paper);
    }

    .slide {
      width: 100vw;
      height: 100vh;
      height: 100dvh;
      overflow: hidden;
      scroll-snap-align: start;
      display: flex;
      flex-direction: column;
      position: relative;
      padding: var(--slide-padding);
    }

    .slide-shell {
      flex: 1;
      width: min(1200px, 100%);
      margin: 0 auto;
      display: flex;
      align-items: stretch;
    }

    .slide-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: var(--content-gap);
      padding: clamp(1.25rem, 2.6vw, 2.4rem);
      border: 1px solid var(--line);
      background:
        linear-gradient(135deg, rgba(255,255,255,0.55), rgba(255,255,255,0.18)),
        linear-gradient(180deg, rgba(255,255,255,0.3), rgba(255,255,255,0.08));
      box-shadow: 0 24px 70px rgba(67, 49, 28, 0.12);
      position: relative;
      overflow: hidden;
    }

    .slide-content::before {
      content: '';
      position: absolute;
      inset: 18px;
      border: 1px solid rgba(25, 22, 19, 0.08);
      pointer-events: none;
    }

    .slide-content::after {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 14px;
      background: linear-gradient(180deg, var(--accent), var(--accent-soft));
      opacity: 0.96;
    }

    .progress-bar {
      position: fixed;
      left: 0;
      top: 0;
      z-index: 200;
      width: 100%;
      height: 4px;
      background: rgba(25, 22, 19, 0.08);
    }

    .progress-bar-fill {
      height: 100%;
      width: 0;
      background: linear-gradient(90deg, var(--accent), var(--accent-alt));
      transition: width 0.24s ease;
    }

    .nav-dots {
      position: fixed;
      right: 18px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      flex-direction: column;
      gap: 10px;
      z-index: 120;
    }

    .nav-dot {
      width: 12px;
      height: 12px;
      border-radius: 999px;
      border: 1px solid rgba(25, 22, 19, 0.18);
      background: rgba(255,255,255,0.44);
      cursor: pointer;
      transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
    }

    .nav-dot.active {
      background: var(--accent);
      border-color: var(--accent);
      transform: scale(1.18);
      box-shadow: 0 0 0 6px rgba(182, 70, 47, 0.12);
    }

    .slide-count {
      position: absolute;
      top: 26px;
      right: 30px;
      font-family: var(--font-mono);
      font-size: var(--small-size);
      color: var(--muted);
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      font-family: var(--font-mono);
      font-size: var(--small-size);
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.18em;
    }

    .eyebrow::after {
      content: '';
      width: 44px;
      height: 1px;
      background: rgba(182, 70, 47, 0.34);
    }

    .slide-title,
    .slide-heading {
      font-family: var(--font-display);
      line-height: 0.98;
      letter-spacing: -0.04em;
      max-width: 11ch;
    }

    .slide-title { font-size: var(--title-size); }
    .slide-heading { font-size: var(--h2-size); }

    .slide-subtitle,
    .slide-paragraph,
    .slide-list li,
    .slide-figure figcaption {
      font-size: var(--body-size);
      line-height: 1.72;
      color: var(--ink);
      max-width: 62ch;
    }

    .slide-subtitle,
    .slide-figure figcaption {
      color: var(--muted);
    }

    .slide-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .meta-pill,
    .slide-code-lang {
      display: inline-flex;
      align-items: center;
      min-height: 32px;
      width: fit-content;
      padding: 0 12px;
      border-radius: 999px;
      border: 1px solid rgba(25, 22, 19, 0.1);
      background: rgba(255,255,255,0.55);
      font-family: var(--font-mono);
      font-size: var(--small-size);
      color: var(--muted);
    }

    .slide-body {
      display: grid;
      gap: clamp(0.85rem, 1.4vw, 1.2rem);
      align-content: start;
      position: relative;
      z-index: 1;
    }

    .slide-list {
      list-style: none;
      display: grid;
      gap: 0.88rem;
    }

    .slide-list li {
      display: grid;
      grid-template-columns: 18px 1fr;
      gap: 0.9rem;
      align-items: start;
    }

    .slide-list li::before {
      content: '';
      width: 12px;
      height: 12px;
      margin-top: 0.42rem;
      background: linear-gradient(135deg, var(--accent), var(--accent-soft));
      clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
    }

    .slide-figure {
      display: grid;
      gap: 0.85rem;
      padding: 1rem;
      border: 1px solid rgba(25, 22, 19, 0.1);
      background: rgba(255,255,255,0.62);
      box-shadow: 0 18px 36px rgba(67, 49, 28, 0.08);
    }

    .slide-figure img {
      width: 100%;
      max-height: 52vh;
      object-fit: contain;
      background: #fff;
      border: 1px solid rgba(25, 22, 19, 0.08);
    }

    .slide-code-wrap {
      display: grid;
      gap: 0.65rem;
      padding: 1rem;
      border: 1px solid rgba(25, 22, 19, 0.1);
      background: #fffdf8;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
    }

    .slide-code {
      overflow: auto;
      max-height: 46vh;
      color: #231d18;
      font-family: var(--font-mono);
      font-size: clamp(0.78rem, 1vw, 0.92rem);
      line-height: 1.68;
    }

    .slide-footer {
      width: min(1200px, calc(100% - 2 * var(--slide-padding)));
      margin: 0 auto;
      padding-top: 0.95rem;
      display: flex;
      justify-content: space-between;
      gap: 16px;
      font-family: var(--font-mono);
      font-size: var(--small-size);
      color: var(--muted);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .reveal {
      opacity: 0;
      transform: translateY(22px);
      transition:
        opacity var(--duration-normal) var(--ease-out-expo),
        transform var(--duration-normal) var(--ease-out-expo);
      position: relative;
      z-index: 1;
    }

    .slide.is-active .reveal {
      opacity: 1;
      transform: translateY(0);
    }

    .slide.is-active .reveal:nth-child(2) { transition-delay: 0.08s; }
    .slide.is-active .reveal:nth-child(3) { transition-delay: 0.16s; }
    .slide.is-active .reveal:nth-child(4) { transition-delay: 0.24s; }
    .slide.is-active .reveal:nth-child(5) { transition-delay: 0.32s; }

    @media (max-width: 840px) {
      .slide {
        padding-left: 1rem;
        padding-right: 1rem;
      }

      .slide-content {
        justify-content: flex-start;
        padding-top: 4rem;
      }

      .slide-content::after {
        width: 100%;
        height: 10px;
        top: 0;
        bottom: auto;
      }

      .slide-footer {
        width: calc(100% - 2rem);
      }
    }

    @media (max-width: 720px) {
      .slide-count {
        top: 16px;
        right: 18px;
      }

      .nav-dots {
        right: auto;
        left: 50%;
        bottom: 12px;
        top: auto;
        transform: translateX(-50%);
        flex-direction: row;
      }

      .slide-figure img,
      .slide-code {
        max-height: 38vh;
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

      setActiveSlide(0);
      slides[0].classList.add('is-active');
    })();
  </script>
</body>
</html>`;
};
