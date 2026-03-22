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

Sample output path after running example commands: `.tmp/examples/01-agent.html`

### Editorial Light

![Editorial Light preview](./assets/previews/editorial-light-preview.svg)

Sample output path after running example commands: `.tmp/examples/01-agent-editorial.html`

## Canonical Interface

The project is now moving toward a `CLI-first` model:

- `CLI` is the canonical interface for plan / expand / build workflows
- `Studio` is a thin local shell for clarification, outline editing, and HTML preview
- `agent` modules stay focused on planning, rewriting, and fallback
- `shared` modules keep the semantic contracts and render-deck normalization stable
- `skill` is now the preferred abstraction for reusable expression strategy
- `profile` remains as a compatibility alias during migration
- CLI clarification supports both interactive and non-interactive execution

The canonical artifact chain is now:

- `outline.json`
- `expanded.json`
- `render-deck.json`
- `HTML`

Default shell experience:

- run `md-to-html-slides` with no arguments to enter the interactive REPL
- paste Markdown directly into the terminal
- paste a local Markdown/TXT file path to load that file directly
- use `/paste` to enter multi-line paste mode
- use `/plan` to generate an outline
- use `/build` to generate HTML
- use `/end` to finish an explicit paste session
- when content is very long or contains local image references, the shell will suggest using a file path instead of raw paste

## Studio Demo

There is now a minimal playable studio demo:

```bash
npm run studio
```

Then open:

`http://127.0.0.1:4173/`

What it includes:

- left-side markdown editor
- skill selector
- live theme switching
- right-side iframe preview
- copy-html and open-in-new-window actions

## Current Direction

- Input: `Markdown + images`
- Output: single-file `HTML` presentation surface
- Current primary mode: `deck`
- Future modes: `roadmap`, `briefing`, `storyflow`
- Themes: `dark-card`, `tech-launch`, `signal-blue`, `editorial-light`
- Skills: `general`, `pitch-tech-launch`
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
├─ skills/
├─ templates/
├─ scripts/
├─ fixtures/
└─ studio/
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

- `fixtures/course/clean/openclaw-intro.md`: sample course-style input
- `fixtures/pitch/clean/product-pitch.md`: sample pitch-style input
- `skills/founder-pitch.json`: ready-to-use custom skill-file example
- `skills/templates/pitch-tech-launch-template.json`: local skill-file template
- `.tmp/examples/01-agent.html`: generated deck using `dark-card`
- `.tmp/examples/01-launch-tech.html`: generated deck using `tech-launch`
- `scripts/build.mjs`: bootstrap wrapper for the canonical CLI

## Status

Early-stage open source project. The current focus is to make one Markdown file reliably generate one strong speaker-friendly HTML presentation, with `deck` as the current default mode.

## NPM Scripts

### Core Commands

```bash
npm run core:themes
npm run core:skills
npm run studio
```

### Test Commands

```bash
npm run test
npm run test:fallback
npm run test:render-deck
npm run test:cli
npm run test:llm
npm run test:llm:ab
```

### Example Commands

```bash
npm run example:validate-skill
npm run example:plan:skill-file
npm run example:validate
npm run example:plan
npm run example:expand
npm run example:render-deck
npm run example:render
npm run example:build
npm run example:build:editorial
npm run example:build:launch
npm run example:preview
```

Or run the canonical CLI directly:

```bash
node ./scripts/build.mjs
node ./scripts/build.mjs themes
node ./scripts/build.mjs validate-skill ./skills/founder-pitch.json
node ./scripts/build.mjs validate-skill-dir ./skills
node ./scripts/build.mjs validate ./fixtures/course/clean/openclaw-intro.md
node ./scripts/build.mjs skills
node ./scripts/build.mjs plan ./fixtures/pitch/clean/product-pitch.md --skill-file ./skills/founder-pitch.json
node ./scripts/build.mjs plan ./fixtures/course/clean/openclaw-intro.md --skill general
node ./scripts/build.mjs expand ./fixtures/course/clean/openclaw-intro.md --skill general
node ./scripts/build.mjs render-deck ./tmp/expanded.json -o ./tmp/render-deck.json
node ./scripts/build.mjs render ./tmp/render-deck.json -o ./.tmp/examples/custom.html --theme signal-blue
node ./scripts/build.mjs build ./fixtures/course/clean/openclaw-intro.md -o ./.tmp/examples/01-agent.html --skill general
node ./scripts/build.mjs build ./fixtures/course/clean/openclaw-intro.md -o ./.tmp/examples/01-agent-editorial.html --theme editorial-light --skill general
node ./scripts/build.mjs build ./fixtures/pitch/clean/product-pitch.md -o ./.tmp/examples/01-launch-tech.html --skill pitch-tech-launch
node ./scripts/build.mjs preview ./fixtures/course/clean/openclaw-intro.md --skill general
node ./scripts/build.mjs build ./fixtures/pitch/clean/product-pitch.md -o ./.tmp/examples/01-launch-tech.html --skill pitch-tech-launch --interactive
node ./scripts/build.mjs plan ./fixtures/pitch/clean/product-pitch.md --skill pitch-tech-launch --no-interactive
```

Interactive shell commands:

- `/help`
- `/status`
- `/skills`
- `/skill <id>`
- `/themes`
- `/theme <id>`
- `/load <path>`
- `/paste`
- `/end`
- `/audience <text>`
- `/goal <text>`
- `/pages <text>`
- `/plan`
- `/build [path]`
- `/clear`
- `/quit`

Artifact responsibilities:

- `outline.json`: page order, focus, and intent
- `expanded.json`: on-screen wording and semantic blocks
- `render-deck.json`: deterministic renderer input

Custom skill files:

- validate a custom skill with `validate-skill`
- validate a project skill directory with `validate-skill-dir`
- load a custom skill into planning/build with `--skill-file`
- skills under `./skills` are auto-loaded for project-local reuse
- official templates and examples live in [skills/README.md](./skills/README.md)

## Design Direction

- [Docs Index](./docs/README.md)
- [Design Principles](./docs/design-principles.md)
- [Engineering Spec](./docs/engineering-spec.md)
