# Engineering Spec

This document combines the current engineering-facing specs for:

- Markdown input
- CLI behavior
- LLM provider abstraction

It is the single source of truth for contracts that must stay consistent across CLI, Studio, server, and agent layers.

## Markdown Input

### Goal

Support a small, reliable Markdown subset that is easy to author and easy to convert into presentation structure.

### Supported Structure

- `#` for deck title
- `##` for slide title
- paragraphs for explanatory text
- `-` bullet lists
- `![alt](path)` images
- fenced code blocks

### Minimum Shape

```md
# Deck Title

Optional intro text.

## Slide One

Short paragraph or bullets.

## Slide Two

- Point one
- Point two
```

### Rules

- The first `#` heading is the deck title.
- Each `##` heading starts a new slide.
- All content under a `##` belongs to that slide until the next `##`.
- Paragraphs should stay short and focused.
- Bullet lists should usually stay within 3 to 5 items.
- Images should use normal Markdown image syntax.
- Code blocks should be fenced and short enough to fit on a slide.

### Scope

Phase 1 intentionally supports only:

- title
- slide headings
- paragraphs
- bullets
- images
- code blocks

## CLI Behavior

### Goal

Keep the CLI small, deterministic, and easy to understand.
The CLI is the canonical interface for the core pipeline.

### Primary Command

```bash
md-to-html-slides build <input.md> -o <output.html>
```

### Supported Commands

#### `plan`

```bash
md-to-html-slides plan <input.md> [--profile <name>] [--answer <key=value>] [-o <outline.json>]
```

#### `expand`

```bash
md-to-html-slides expand <input.md> [--profile <name>] [--answer <key=value>] [--outline <outline.json>] [-o <expanded.json>]
```

#### `build`

```bash
md-to-html-slides build <input.md> -o <output.html> [--theme <name>] [--title <text>] [--profile <name>] [--answer <key=value>] [--outline <outline.json>]
```

#### `preview`

```bash
md-to-html-slides preview <input.md> [--theme <name>] [--title <text>] [--profile <name>] [--answer <key=value>] [--outline <outline.json>]
```

#### `render`

```bash
md-to-html-slides render <expanded.json> -o <output.html> [--theme <name>] [--title <text>]
```

#### `skills`

```bash
md-to-html-slides skills
```

#### `validate`

```bash
md-to-html-slides validate <input.md>
```

#### `themes`

```bash
md-to-html-slides themes
```

### Current CLI Principles

- Accept one Markdown file at a time.
- Expose the core pipeline stages: `plan -> expand -> render -> build`.
- Produce one self-contained HTML file.
- Keep renderer behavior deterministic.
- Use the same core pipeline as Studio for planning and expansion.
- Keep Studio as a thin shell over the canonical CLI/core contracts.
- Fail clearly when input is missing or invalid.

### Current Non-Goals

- batch directory build
- watch mode
- PDF export
- PPTX import
- browser-first editing
- theme marketplace

## LLM Provider Layer

### Goal

Keep the application layer provider-agnostic.

Planner, Expander, Studio, and CLI-adjacent logic should not depend directly on vendor-specific request shapes.

### Principle

The application layer should call a provider abstraction rather than a vendor API directly.

### Current Contract Direction

The provider layer should normalize:

- provider selection
- model selection
- request transport
- JSON extraction or structured output handling
- usage and raw response capture when needed

The rest of the system should only depend on normalized outputs.

### Environment Variables

Primary profile:

- `LLM_PROVIDER`
- `LLM_MODEL`
- `LLM_BASE_URL`
- `LLM_API_KEY`
- `LLM_JSON_MODE`

Candidate profile for A/B comparison:

- `LLM_CANDIDATE_PROVIDER`
- `LLM_CANDIDATE_MODEL`
- `LLM_CANDIDATE_BASE_URL`
- `LLM_CANDIDATE_API_KEY`
- `LLM_CANDIDATE_JSON_MODE`

Legacy Moonshot aliases may still exist for compatibility, but new work should follow the generic `LLM_*` contract.

### Layer Boundary

- provider adapters know vendor details
- planner and expander know only provider interfaces
- core pipeline orchestrates `plan / clarification / expand`
- CLI is the canonical caller of the core pipeline
- Studio is a thin shell that calls the same core pipeline over HTTP
- UI and tests know only normalized request and response shapes

### Practical Rule

Do not leak vendor-specific fields into planner, expander, Studio, or shared contracts.
