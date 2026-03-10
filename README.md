# md-to-html-slides

Generate polished single-file HTML slide decks from Markdown.

## What This Project Is

`md-to-html-slides` is a Markdown-first slide generation project.
The goal is to turn structured slide content into visually strong, web-native HTML presentations that are easy to publish and easy to maintain.

## Preview

### Dark Card

![Dark Card preview](./assets/previews/dark-card-preview.svg)

Sample output: `examples/01-agent.html`

### Editorial Light

![Editorial Light preview](./assets/previews/editorial-light-preview.svg)

Sample output: `examples/01-agent-editorial.html`

## Current Direction

- Input: `Markdown + images`
- Output: single-file `HTML` slide deck
- Themes: `dark-card`, `editorial-light`
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
- `examples/demo-openclaw.html`: earlier visual demo
- `examples/01-agent.html`: generated deck using `dark-card`
- `scripts/build.mjs`: first working CLI prototype

## Status

Early-stage open source project. The current focus is to make one Markdown file reliably generate one strong HTML deck.

## First Working Commands

```bash
npm run build:example
npm run build:example:editorial
npm run themes
npm run validate:example
npm run check
```

Or run the CLI directly:

```bash
node ./scripts/build.mjs build ./slides-src/openclaw/01-agent.md -o ./examples/01-agent.html --theme dark-card
node ./scripts/build.mjs build ./slides-src/openclaw/01-agent.md -o ./examples/01-agent-editorial.html --theme editorial-light
node ./scripts/build.mjs validate ./slides-src/openclaw/01-agent.md
node ./scripts/build.mjs themes
```
