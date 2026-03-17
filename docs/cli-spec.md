# CLI Specification

## Goal

The first version of the CLI should make one workflow easy:

`Markdown in -> HTML slide deck out`

This CLI is intentionally small in Phase 1.

## Primary Command

```bash
md-to-html-slides build <input.md> -o <output.html>
```

Example:

```bash
md-to-html-slides build slides-src/openclaw/01-agent.md -o examples/01-agent.html --theme dark-card
```

## Phase 1 Command Set

### `build`

Convert one Markdown file into one single-file HTML slide deck.

Usage:

```bash
md-to-html-slides build <input.md> [options]
```

Supported options for Phase 1:

- `-o, --output <file>`
  - Required in Phase 1
  - Output HTML file path

- `--theme <name>`
  - Optional
  - Choose a theme/template
  - Example: `dark-card`, `tech-launch`, `editorial-light`

- `--title <text>`
  - Optional
  - Override the title extracted from Markdown

### `themes`

List the currently available themes.

Usage:

```bash
md-to-html-slides themes
```

Example output:

```text
Available themes:
- dark-card: Deep dark background, editorial display typography, high-contrast product deck styling.
- tech-launch: Neon product-launch theme tuned for hero claims, comparisons, metrics, and CTA slides.
- editorial-light: Warm paper background, serif-led editorial layout, print-inspired accents.
```

### `validate`

Check whether one Markdown file follows the input spec and whether local image references are usable.

Usage:

```bash
md-to-html-slides validate <input.md>
```

Example output:

```text
Input:   slides-src/openclaw/01-agent.md
Title:   OpenClaw Training Camp 01
Slides:  6
Images:  0
Status:  valid
```

### `preview`

Build one deck into a default local preview path without requiring `-o`.

Usage:

```bash
md-to-html-slides preview <input.md> [--theme <name>] [--title <text>]
```

Example output:

```text
Input:  slides-src/openclaw/01-agent.md
Theme:  dark-card
Slides: 6
Output: .tmp/previews/01-agent-dark-card.html
Preview: open the generated file in your browser.
```

## Behavior

### Input

- Accept one Markdown file
- Read local image references from the same project
- Parse according to the Markdown input spec

### Output

- Produce one HTML file
- Output should be self-contained when possible
- Output should be directly previewable in a browser

### Failure Conditions

The command should fail with a clear message when:

- the input file does not exist
- the input file does not contain a top-level title
- slide structure is invalid
- referenced image paths cannot be found
- output path is not writable

## Phase 1 Non-Goals

The first CLI version should not try to do these yet:

- batch build for whole directories
- live preview server
- watch mode
- PDF export
- PPTX import
- browser UI
- theme marketplace

## Possible Future Commands

These are candidates for later phases, not Phase 1 requirements.

### `init`

```bash
md-to-html-slides init
```

Create a starter project structure or example slide source file.

## Recommended Phase 1 UX

Good CLI behavior should be boring and clear.

Example:

```bash
$ md-to-html-slides build slides-src/openclaw/01-agent.md -o examples/01-agent.html --theme dark-card

Input:  slides-src/openclaw/01-agent.md
Theme:  dark-card
Slides: 6
Output: examples/01-agent.html
Done.
```

## Design Principle

Phase 1 should optimize for:

- simple mental model
- deterministic output
- low user confusion

Not for:

- feature count
- config complexity
- platform behavior
