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
md-to-html-slides plan <input.md> [--skill <name>] [--skill-file <skill.json>] [--profile <name> compatibility alias] [--answer <key=value>] [-o <outline.json>]
```

#### `expand`

```bash
md-to-html-slides expand <input.md> [--skill <name>] [--skill-file <skill.json>] [--profile <name> compatibility alias] [--answer <key=value>] [--outline <outline.json>] [-o <expanded.json>]
```

#### `render-deck`

```bash
md-to-html-slides render-deck <expanded.json> [--title <text>] [-o <render-deck.json>]
```

#### `build`

```bash
md-to-html-slides build <input.md> -o <output.html> [--theme <name>] [--title <text>] [--skill <name>] [--skill-file <skill.json>] [--profile <name> compatibility alias] [--answer <key=value>] [--outline <outline.json>]
```

#### `preview`

```bash
md-to-html-slides preview <input.md> [--theme <name>] [--title <text>] [--skill <name>] [--skill-file <skill.json>] [--profile <name> compatibility alias] [--answer <key=value>] [--outline <outline.json>]
```

#### `render`

```bash
md-to-html-slides render <render-deck.json|expanded.json> -o <output.html> [--theme <name>] [--title <text>]
```

#### `skills`

```bash
md-to-html-slides skills
```

#### `validate-skill`

```bash
md-to-html-slides validate-skill <skill.json> [-o <normalized-skill.json>]
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
- Expose the core pipeline stages: `plan -> expand -> render-deck -> render -> build`.
- Produce one self-contained HTML file.
- Keep renderer behavior deterministic.
- Use the same core pipeline as Studio for planning and expansion.
- Keep Studio as a thin shell over the canonical CLI/core contracts.
- Support clarification in both interactive and non-interactive modes.
- Fail clearly when input is missing or invalid.

### Clarification Mode

- `build` and `preview` default to interactive clarification when running in a TTY
- `plan` and `expand` default to non-interactive clarification output
- `--interactive` forces terminal Q&A
- `--no-interactive` forces clarification to be returned as JSON/artifact instead of prompting

## Expanded Contract

### Goal

Make expanded output closer to semantic presentation blocks instead of leaving visual structure inference to the renderer.

### Direction

- `outline.json` answers: what to say and in what order
- `expanded.json` answers: what semantic surface each page should use
- `render-deck.json` answers: what deterministic render structure the theme consumes

### Current Rule

- `ExpandedResult.slides[*]` may keep compatibility fields like `format`, `bullets`, and `body`
- `ExpandedResult.slides[*].blocks` is now the preferred semantic surface field
- renderer should consume `blocks` first and only fall back to compatibility fields when needed
- semantic blocks should carry expressive visual meaning such as:
  - `hero`
  - `compare`
  - `metrics`
  - `process`
  - `summary`
  - `cta`

### Practical Boundary

- planner decides page order, focus, and intent
- expander decides semantic blocks and on-screen wording
- renderer decides deterministic HTML and theme styling

## Render-Deck Contract

### Goal

Make `render-deck.json` a stable artifact that can be stored, passed to other agents, and rendered later without re-running planning or expansion.

### Fixed Schema: `render-deck@1`

`render-deck.json` is the canonical deterministic renderer input.

Canonical top-level shape:

```json
{
  "title": "Deck Title",
  "intro": "Optional intro",
  "meta": {
    "contract_version": "render-deck@1",
    "source": "expanded",
    "skill": "general",
    "default_theme": "dark-card",
    "slide_count": 3
  },
  "slides": [
    {
      "id": "slide-1",
      "title": "Current Flow Slows Delivery",
      "variant": "hero",
      "source_format": "hero",
      "blocks": [
        {
          "type": "hero",
          "headline": "Current Flow Slows Delivery",
          "body": "Manual handoffs delay execution",
          "points": ["Manual sync", "Slow delivery", "Low consistency"]
        }
      ]
    }
  ]
}
```

### Top-Level Fields

- `title`: required string. Final deck title consumed by the renderer.
- `intro`: required string. May be empty.
- `meta`: required object.
- `slides`: required array of render slides.

### `meta` Object

- `contract_version`: required string literal. Current fixed value is `render-deck@1`.
- `source`: required enum. Allowed values: `expanded`, `markdown`, `manual`.
- `profile`: optional string. Compatibility alias for renderer-facing profile context.
- `skill`: optional string. Preferred reusable expression strategy identifier.
- `default_theme`: optional string. Recommended theme name for downstream rendering.
- `slide_count`: required integer. Must match `slides.length`.

### Render Slide Object

Each slide in `slides[]` must contain:

- `id`: required string. Stable slide identifier within the deck.
- `title`: required string.
- `variant`: required enum. Allowed values:
  - `default`
  - `hero`
  - `compare`
  - `metrics`
  - `process`
  - `summary`
  - `cta`
- `source_format`: optional string. Carries the upstream expanded-page format when available.
- `blocks`: required array of render blocks. Must not be empty.

### Render Block Union

Allowed `blocks[*].type` values and required fields:

- `paragraph`
  - required: `content`
- `list`
  - required: `items`
- `image`
  - required: `inlinedSrc`
  - optional: `alt`, `src`
- `code`
  - required: `content`
  - optional: `language`
- `hero`
  - required: `headline`, `points`
  - optional: `eyebrow`, `body`, `proof`, `stats`, `layout`
- `compare`
  - required: `left`, `right`
  - optional: `eyebrow`, `body`, `summary`, `layout`
- `metrics`
  - required: `items`
  - optional: `eyebrow`, `intro`, `proof`
- `process`
  - required: `steps`
  - optional: `eyebrow`, `intro`
- `summary`
  - required: `items`
  - optional: `eyebrow`, `intro`
- `cta`
  - required: `message`, `actions`
  - optional: `eyebrow`, `proof`

### Nested Object Rules

- `compare.left` and `compare.right` must contain:
  - `label`: required string
  - `items`: required string array
  - `caption`: optional string
- `metrics.items[*]` must contain:
  - `value`: required string
  - `label`: required string
  - `note`: optional string
- `process.steps[*]` must contain:
  - `label`: required string
  - `detail`: optional string
- `hero.stats[*]` must contain:
  - `value`: required string
  - `label`: required string

### Consistency Rules

- `meta.contract_version` must always be `render-deck@1`.
- `meta.slide_count` must equal `slides.length`.
- `slides[*].id` must be unique within a deck.
- `slides[*].blocks` must already be renderer-ready; renderer should not need to infer page semantics from `title`, `bullets`, or `body`.
- `render` may accept either `expanded.json` or `render-deck.json`, but `render-deck.json` is the preferred renderer input and the stable persisted artifact.

### Contract Boundary

- `outline.json` decides page order, focus, and intent.
- `expanded.json` decides on-screen wording and semantic block intent.
- `render-deck.json` freezes the deterministic structure the theme renderer consumes.

## Skill Schema

### Goal

Formalize the current legacy profile concept as a reusable skill contract while keeping profile naming compatible during migration.

### Current Rule

- `skill` is the preferred concept
- `profile` remains a compatibility alias for the same identifier
- canonical built-in skills are defined in `shared/skills.js`
- custom skill files are validated before registration
- official templates and examples live in `skills/`
- compatibility exports remain in `shared/deck-profiles.js`
- a skill currently owns:
  - planning rules
  - expansion rules
  - preferred semantic blocks
  - recommended default theme
  - quality focus

### `skill-file@1`

Current custom skill files use the `skill-file@1` schema.

Required fields:

- `id`

Optional top-level fields:

- `version`
- `name`
- `base_skill` / `extends`
- `label`
- `studio_label`
- `description`
- `studio_description`
- `default_theme`
- `planning`
- `expansion`
- `blocks`
- `quality`
- `examples`

Current validation rules:

- `id` must use lowercase letters, numbers, or hyphens
- `base_skill` must reference an existing registered skill
- `default_theme` must reference a registered built-in theme
- `blocks.format_guidance[*].format` must be a valid expand format
- unknown top-level or nested keys should fail validation

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

Primary provider config:

- `LLM_PROVIDER`
- `LLM_MODEL`
- `LLM_BASE_URL`
- `LLM_API_KEY`
- `LLM_JSON_MODE`

Candidate provider config for A/B comparison:

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
