# md-to-html-slides

**Language:** English | [简体中文](./README.zh-CN.md)

Turn written language into presentation-ready visual language, helping speakers communicate more clearly and more persuasively.

## Mission

`md-to-html-slides` is a Markdown-first presentation system for speakers, educators, founders, and operators.
It helps turn raw notes, draft content, and structured Markdown into web-native HTML presentations that are easier to present, easier to publish, and easier to maintain.

## What It Is

This project is not primarily a PPT clone.
It is an agentic system that:

- understands content structure
- turns written language into visual presentation structure
- renders the result as speaker-friendly HTML

Current public boundary:

- the product is currently `deck`-first
- output is single-file HTML
- future presentation modes include `roadmap`, `briefing`, and `storyflow`

## Preview

### Dark Card

![Dark Card preview](./assets/previews/dark-card-preview.svg)

Sample output: `examples/01-agent.html`

### Editorial Light

![Editorial Light preview](./assets/previews/editorial-light-preview.svg)

Sample output: `examples/01-agent-editorial.html`

## Studio Demo

There is now a minimal playable studio demo:

```bash
npm run studio
```

Then open:

`http://127.0.0.1:4173/`

What it includes:

- left-side markdown editor
- deck profile selector
- live theme switching
- right-side iframe preview
- copy-html and open-in-new-window actions

## Current Direction

- Input: `Markdown + images`
- Output: single-file `HTML` presentation surface
- Current primary mode: `deck`
- Future modes: `roadmap`, `briefing`, `storyflow`
- Themes: `dark-card`, `tech-launch`, `signal-blue`, `editorial-light`
- Profiles: `general`, `pitch-tech-launch`
- Focus: design quality, responsive layout, and simple publishing
- Non-goal for now: full online editor, full PPT replacement, complex runtime dependencies

## Repository Structure

```text
md-to-html-slides/
├─ assets/
├─ README.md
├─ LICENSE
├─ .gitignore
├─ docs/
├─ examples/
├─ templates/
├─ scripts/
└─ slides-src/
```

## Roadmap

### Phase 1

- Define a stable Markdown convention
- Generate clean single-file HTML output
- Support title, content, image, comparison, and summary slides
- Include keyboard navigation, touch navigation, progress bar, and responsive viewport fitting

### Phase 2

- Improve auto-pagination quality
- Improve layouts for images, code blocks, and dense content
- Add frontmatter config and a CLI entry

### Phase 3

- Add optional `pdf`, `pptx`, and `docx` import paths
- Add presenter notes support
- Add reusable theme/template inheritance

## Included Seed Files

- `slides-src/openclaw/01-agent.md`: sample input content
- `slides-src/pitch/01-launch.md`: sample product launch pitch
- `examples/demo-openclaw.html`: earlier visual demo
- `examples/01-agent.html`: generated deck using `dark-card`
- `examples/01-launch-tech.html`: generated deck using `tech-launch`
- `scripts/build.mjs`: first working CLI prototype

## Status

Early-stage open source project. The current focus is to make one Markdown file reliably generate one strong speaker-friendly HTML presentation, with `deck` as the current default mode.

## First Working Commands

```bash
npm run build:example
npm run build:example:editorial
npm run build:example:launch
npm run preview:example
npm run studio
npm run themes
npm run validate:example
npm run check
npm run check:llm
npm run check:llm:ab
```

Or run the CLI directly:

```bash
node ./scripts/build.mjs build ./slides-src/openclaw/01-agent.md -o ./examples/01-agent.html --theme dark-card
node ./scripts/build.mjs build ./slides-src/openclaw/01-agent.md -o ./examples/01-agent-editorial.html --theme editorial-light
node ./scripts/build.mjs build ./slides-src/pitch/01-launch.md -o ./examples/01-launch-tech.html --theme tech-launch
node ./scripts/build.mjs preview ./slides-src/openclaw/01-agent.md --theme dark-card
node ./scripts/build.mjs validate ./slides-src/openclaw/01-agent.md
node ./scripts/build.mjs themes
```

## Design Direction

- [Docs Index](./docs/README.md)
- [Design Principles](./docs/design-principles.md)
- [Engineering Spec](./docs/engineering-spec.md)
