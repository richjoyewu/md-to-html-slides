# Block Registry

This document defines the current semantic block registry for `md-to-html-slides`.

It is the canonical reference for:

- block naming
- block classification
- lifecycle status
- intended usage
- boundary definitions between similar blocks

## Status Levels

- `core`
  Mainline system blocks. Must remain stable across prompt, fallback, render-deck, renderer, and regression.
- `stable`
  Valuable blocks with clear long-term use. Lower priority than mainline blocks, but still worth maintaining.
- `experimental`
  Blocks with real potential, but not yet a strong long-term commitment.
- `observe`
  Blocks kept for observation. Do not expand aggressively until repeated real usage justifies them.

## Classification

- `foundation`
  Low-level content blocks that carry raw material.
- `spine`
  Main presentation blocks that shape deck rhythm and slide intent.
- `structure`
  Blocks used to organize information into stronger spatial or relational patterns.
- `accent`
  Supporting blocks used to emphasize, pace, or enrich expression.

## Registry

| Block | Classification | Status | Primary Use | Boundary |
|---|---|---|---|---|
| `paragraph` | `foundation` | `core` | Carry plain explanatory text | Does not imply semantic structure beyond prose |
| `list` | `foundation` | `core` | Carry plain bullet lists | Generic enumeration only; not a semantic comparison/process/timeline block |
| `image` | `foundation` | `core` | Carry visual media | Media display only, not a semantic data or layout block |
| `code` | `foundation` | `core` | Carry source code or command snippets | Technical content only; not a prose or comparison block |
| `hero` | `spine` | `core` | Opening thesis, headline claim, cover-grade expression | Use for a single dominant claim, not a generic title page |
| `compare` | `spine` | `core` | Direct comparison between two options or states | Use for A vs B, not for 2x2 matrices or multidimensional classification |
| `metrics` | `spine` | `core` | Numeric proof, traction, efficiency, KPI evidence | Use when numbers are the main message, not for light decorative stats |
| `process` | `spine` | `core` | Ordered execution steps or method sequence | Use for "how it works", not for time progression or graph-like flow |
| `summary` | `spine` | `core` | End-of-section or end-of-deck synthesis | Use for convergence, not for transition or CTA |
| `cta` | `spine` | `core` | Clear ask, next action, cooperation request | Use for action-oriented endings, not for generic summary |
| `transition` | `spine` | `core` | Section break, chapter handoff, pacing reset | Use for movement between segments, not for detailed content explanation |
| `quote` | `accent` | `stable` | Quoted sentence, user voice, founder line, citation | Use when the value comes from the fact that someone said it |
| `callout` | `accent` | `stable` | Emphasize one key judgment, warning, or reminder | Use for one highlighted message, not for a sourced quote or full risk list |
| `timeline` | `structure` | `stable` | Milestones, phases, time-based progress | Use for "when things happen", not for procedural steps |
| `table-lite` | `structure` | `stable` | Small structured table, compact field comparison | Use for simple tabular structure only, not complex data tables |
| `people` | `structure` | `stable` | Roles, team members, personas, responsibilities | Use when people and roles are primary, not generic tags or bullets |
| `tags` | `accent` | `observe` | Keyword cluster, terminology, tag cloud-like grouping | Use for lightweight concept grouping; easy to overlap with list |
| `flow` | `structure` | `experimental` | Node-to-node flow, handoff, upstream/downstream chain | Use for movement across nodes, not ordered steps or timeline |
| `stat-strip` | `accent` | `observe` | Lightweight row of headline numbers | Use for light numeric emphasis; overlaps with metrics if overused |
| `matrix` | `structure` | `experimental` | 2x2 classification, quadrant view, dual-axis grouping | Use for multidimensional classification, not left-right compare |
| `faq` | `accent` | `experimental` | Q&A explanation, objection handling, clarification pages | Use when the page is naturally question-answer shaped |
| `risk` | `accent` | `experimental` | Risks, constraints, warning conditions, limitations | Use when negative conditions or execution boundaries are primary |

## Boundary Rules

### `compare` vs `matrix`

- `compare` is for two-sided direct contrast.
- `matrix` is for dual-axis or quadrant classification.

### `process` vs `timeline` vs `flow`

- `process` answers: how to do it.
- `timeline` answers: when things happen.
- `flow` answers: how things move between nodes.

### `callout` vs `quote` vs `risk`

- `callout` emphasizes one important system-owned judgment.
- `quote` emphasizes one sourced or attributed line.
- `risk` emphasizes negative conditions, constraints, or execution limits.

### `metrics` vs `stat-strip`

- `metrics` is a proof-oriented semantic block centered on evidence.
- `stat-strip` is a lighter visual numeric accent, usually secondary.

### `summary` vs `transition`

- `summary` closes and converges.
- `transition` hands off and resets pacing.

## Governance Rule

Before promoting a block to `core` or `stable`, it should satisfy all of the following:

1. It is semantically distinct from existing blocks.
2. It appears repeatedly across multiple deck types or skills.
3. It is supported across the full chain:
   - schema
   - normalize
   - fallback or inference
   - renderer
   - regression
4. It reduces renderer guesswork rather than increasing ambiguity.

## Practical Rule

Do not add new blocks just because a layout looks visually different.

A block should exist only when the semantic unit is distinct enough to deserve:

- its own contract
- its own inference path
- its own rendering treatment
