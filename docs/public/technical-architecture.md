# Technical Architecture

This document explains the current technical architecture of `md-to-html-slides` in a form that is easy to share with teammates.

Current version statement:

- The current version only provides `System Mode` (stable, confirmable structured generation).
- The current primary output is single-file HTML.
- The current primary mode is `deck`.

## 1. System Overview

`md-to-html-slides` is not a direct `Markdown -> HTML` converter.

The system is split into three layers:

1. **Input understanding**
   Parse and normalize Markdown, extract structure, and analyze the source.
2. **Agentic content transformation**
   Decide what each page should say, ask for clarification when needed, and rewrite content into presentation-ready structures.
3. **Deterministic rendering**
   Convert the semantic output into a stable render-deck contract and then render final HTML through a theme.

In practice, the system behaves like:

```text
Input
  -> Analyze
  -> Plan
  -> Clarification (if needed)
  -> Outline
  -> Expand
  -> RenderDeck
  -> Theme Renderer
  -> HTML
```

## 2. Canonical Artifacts

The current canonical artifact chain is:

```text
outline.json
  -> expanded.json
  -> render-deck.json
  -> HTML
```

Responsibilities:

- `outline.json`
  Defines what each page is about and in what order pages should appear.
- `expanded.json`
  Defines what each page should show on screen, including semantic blocks.
- `render-deck.json`
  Defines the final deterministic renderer input.
- `HTML`
  The final single-file output used for preview, sharing, and publishing.

## 3. Main Entry Points

### CLI

The CLI is the canonical interface.

Main files:

- `scripts/build.mjs`
  Small bootstrap wrapper that compiles TypeScript when needed and delegates to the compiled CLI.
- `scripts/cli.ts`
  The actual command-line entry point.

Current CLI responsibilities:

- parse commands and flags
- load local skill files
- run the shared core pipeline
- write artifact files
- render HTML
- provide interactive clarification in terminal mode

### Studio

Studio is a thin local shell over the same shared pipeline.

Main files:

- `scripts/studio-server.ts`
  Local HTTP server and thin adapter over the shared pipeline.
- `studio/app.mjs`
  Browser-side shell for markdown input, outline editing, and preview.

Current Studio responsibilities:

- collect markdown input
- send plan / expand requests
- show outline editing UI
- show theme preview
- export generated HTML

Studio does **not** own a separate orchestration model.
It reuses the same pipeline as the CLI.

## 4. Core Pipeline

The shared orchestration layer lives in:

- `agent/pipeline.ts`

This is the central coordinator for:

- `plan()`
- `expand()`
- `build()`
- `toRenderDeck()`
- `render()`

Current responsibilities of the pipeline:

- normalize context
- run clarification gate
- use plan / expand cache
- call provider-backed or fallback plan / expand paths
- normalize expanded output
- convert to render-deck
- render via a selected theme

This keeps CLI and Studio aligned on behavior.

## 5. Agent Layer

The agent layer contains the non-deterministic or semi-structured reasoning parts of the system.

Main modules:

- `agent/analysis.ts`
  Structural analysis of the input.
- `agent/planner.ts`
  Planner stage that produces outline output.
- `agent/clarification.ts`
  Clarification gate logic for missing information.
- `agent/expander.ts`
  Expander stage that rewrites outline pages into presentation-ready output.
- `agent/fallback.ts`
  Heuristic fallback generation when LLM calls are unavailable or fail.
- `agent/prompt-builder.ts`
  Prompt construction for plan and expand stages.
- `agent/quality-check.ts`
  Post-check layer for selected skill quality goals.
- `agent/polisher.ts`
  Outline stabilization and structural cleanup before downstream use.

Design rule:

- the agent decides **what the deck should communicate**
- the renderer decides **how that structure is rendered**

## 6. Shared Contracts

The shared layer defines contracts that must remain stable across CLI, Studio, server, and tests.

Main files:

- `shared/core.js`
  Central contract normalization and artifact transformation layer.
- `shared/core.d.ts`
  Shared type definitions for render-deck and related structures.
- `shared/markdown.js`
  Deterministic markdown parsing helpers.
- `shared/skills.js`
  Built-in skills, custom skill validation, and skill registration.
- `shared/deck-profiles.js`
  Legacy compatibility alias layer for `profile`.

This layer is especially important because it defines:

- plan context normalization
- outline normalization
- expanded normalization
- render block normalization
- render-deck validation

## 7. Rendering Layer

The renderer layer is deterministic and theme-driven.

Main files:

- `templates/index.mjs`
  Theme registry.
- `templates/dark-card.mjs`
- `templates/tech-launch.mjs`
- `templates/editorial-light.mjs`

Current renderer design:

- themes consume `render-deck.json`
- each theme interprets the same semantic block contract
- themes differ in typography, framing, density, motion, and atmosphere
- rendering stays deterministic

This is a key architectural rule:

- LLM should not directly generate final HTML
- renderer should not need to make major semantic guesses

## 8. Skill System

The current preferred reusable abstraction is `skill`.

Main files:

- `shared/skills.js`
- `shared/skills.d.ts`
- `scripts/skill-loader.ts`
- `skills/`

Current skill responsibilities:

- planning rules
- expansion rules
- preferred block hints
- default theme recommendation
- quality focus tags

Custom local skills are supported through `--skill-file` and skill directory validation.

Current built-in skills:

- `general`
- `pitch-tech-launch`

Legacy `profile` naming is still supported as a compatibility alias.

## 9. Testing and Regression

Current regression coverage is script-based rather than framework-heavy.

Main files:

- `scripts/check-agent.ts`
  Fallback and heuristic quality regression.
- `scripts/check-skill.ts`
  Skill schema validation regression.
- `scripts/check-render-deck.ts`
  Render-deck contract regression.
- `scripts/check-llm.ts`
  Live LLM regression.

This gives the project coverage over:

- fallback stability
- skill schema correctness
- render-deck contract correctness
- live model behavior

## 10. Key Architectural Rules

These are the most important rules to preserve:

1. **CLI is canonical**
   Studio should not invent a separate flow.

2. **Artifacts are explicit**
   `outline -> expanded -> render-deck -> HTML` is the stable chain.

3. **Agent and renderer stay separated**
   Agent decides content and structure.
   Renderer stays deterministic.

4. **Fallback is a product feature**
   The system must still produce usable results when LLM calls fail.

5. **Skills are reusable strategy inputs**
   They should influence generation behavior, but should not become arbitrary code plugins.

## 11. Current Extension Points

The safest current extension points are:

- add new skills
- strengthen prompt constraints
- add new semantic blocks
- improve fallback heuristics
- improve renderer-level visual elements

The riskiest current extension points are:

- changing core artifact boundaries
- mixing agent reasoning into renderer logic
- adding too many new display modes before current contracts stabilize

## 12. Practical Mental Model

If you need one short mental model for the whole system, use this:

> `md-to-html-slides` is a contract-driven presentation generation system:
> Markdown in, semantic artifacts through the middle, deterministic themed HTML out.
