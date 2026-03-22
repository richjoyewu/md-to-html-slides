# Visual Elements Registry

This document defines the current visual element registry for `md-to-html-slides`.

It complements `block-registry.md`.

- `block` answers: what semantic unit the content is.
- `visual element` answers: how that semantic unit gains visual richness, hierarchy, rhythm, and atmosphere.

Visual elements should not replace blocks.
They are renderer-level design ingredients layered on top of blocks.

## Status Levels

- `core`
  Elements that should be broadly reusable across themes and appear in many decks.
- `stable`
  Valuable elements with clear long-term use, but not required everywhere.
- `experimental`
  Useful in some themes or scenarios, but still evolving.
- `observe`
  Keep under observation; do not expand aggressively until real usage proves value.

## Classification

- `identity`
  Elements that reinforce recognizability and theme signature.
- `hierarchy`
  Elements that improve information scanning and emphasis.
- `atmosphere`
  Elements that enrich background, depth, and mood.
- `container`
  Elements that frame content into stronger visual groups.
- `evidence`
  Elements that strengthen proof, metrics, and structured signals.
- `rhythm`
  Elements that control pacing, sequencing, and slide-to-slide continuity.
- `media`
  Elements that help images, screenshots, logos, and visual assets feel intentional.

## Registry

| Element | Classification | Status | Primary Use | Boundary |
|---|---|---|---|---|
| `kicker` | `hierarchy` | `core` | Small pre-title label above a main title or section | Supports hierarchy; does not replace title text |
| `eyebrow` | `hierarchy` | `core` | Small semantic overline inside a block surface | Belongs to block presentation; should not carry the main message alone |
| `badge` | `hierarchy` | `stable` | Small highlighted status or label chip | Use for emphasis, not as a full CTA |
| `pill` | `hierarchy` | `core` | Lightweight compact label for actions, tags, or filters | More compact than a card, less semantic than a block |
| `chip` | `hierarchy` | `stable` | Dense compact token for grouped short items | Use for tight clusters; not for long list items |
| `divider` | `rhythm` | `core` | Separate sections or create visual pause | Supports pacing; does not carry content itself |
| `chapter-marker` | `rhythm` | `stable` | Mark the start of a new section or phase | More structural than a decorative divider |
| `step-connector` | `rhythm` | `stable` | Visually connect ordered process or timeline items | Use only when sequence matters |
| `big-number` | `hierarchy` | `stable` | Oversized numeric emphasis for sections, steps, or metrics | Use for emphasis, not as a substitute for a full metrics surface |
| `icon` | `identity` | `core` | Give blocks and items recognizable symbolic anchors | Should support content meaning, not become decorative clutter |
| `glyph` | `identity` | `stable` | Theme-specific symbolic mark used repeatedly in one theme | More stylistic than a semantic icon |
| `label-strip` | `hierarchy` | `stable` | Horizontal label band used to group or classify content | Use for framing and sectioning, not as a title replacement |
| `signal-bar` | `evidence` | `stable` | Small visual confidence / delta / progress indicator | Use as supporting evidence, not a full chart |
| `delta-badge` | `evidence` | `stable` | Compact up/down change indicator | Use for trend or movement, not for standalone proof |
| `sparkline` | `evidence` | `experimental` | Tiny trend line for metrics-heavy themes | Use only when a real trend is more useful than plain numbers |
| `mini-chart` | `evidence` | `experimental` | Small chart-like proof element embedded inside cards or surfaces | Do not use it as a substitute for full charting support |
| `card-shell` | `container` | `core` | Frame content as a visually distinct unit | Base container, not a semantic block on its own |
| `panel-group` | `container` | `stable` | Group related content into aligned multi-panel compositions | More structural than a plain card |
| `split-frame` | `container` | `stable` | Create a strong left/right or top/bottom framing system | Use when composition needs visible partitioning |
| `stack-frame` | `container` | `experimental` | Layer multiple content shells with depth | Use for depth and density, not plain grouping |
| `gradient-orb` | `atmosphere` | `stable` | Add depth and focal glow to dark or launch themes | Background accent only; should not reduce readability |
| `grid-pattern` | `atmosphere` | `stable` | Give structure and technical texture to the background | Use subtly; avoid turning into visual noise |
| `noise-texture` | `atmosphere` | `experimental` | Add tactile finish to light/editorial themes | Use lightly; not suitable for every theme |
| `paper-texture` | `atmosphere` | `stable` | Add editorial or print-like surface quality | Theme-dependent, especially useful for light themes |
| `glow-line` | `atmosphere` | `experimental` | Add neon or launch-event energy to separators and frames | Best for launch themes, not general-purpose decks |
| `device-frame` | `media` | `stable` | Present screenshots or product UI in a clearer product context | Use for product demo surfaces, not generic images |
| `media-card` | `media` | `core` | Standard framed image/screenshot container | Reusable across themes; should stay simple and robust |
| `logo-strip` | `media` | `experimental` | Row of customer, partner, or ecosystem logos | Only useful when logo density itself is a message |
| `gallery-rail` | `media` | `experimental` | Horizontal image or screenshot sequence | Use when sequence matters more than one hero image |

## Boundary Rules

### Block vs Visual Element

- A `block` defines semantic meaning.
- A `visual element` defines renderer-side emphasis, framing, or atmosphere.
- If the content meaning changes, it is probably a block.
- If only the appearance or emphasis changes, it is probably a visual element.

### `icon` vs `glyph`

- `icon` should reinforce content meaning.
- `glyph` should reinforce theme character or motif.

### `badge` vs `pill` vs `chip`

- `badge` = small emphasized state or label.
- `pill` = compact reusable label or action token.
- `chip` = denser token used in grouped clusters.

### `divider` vs `chapter-marker`

- `divider` creates pause.
- `chapter-marker` marks a structural transition.

### `signal-bar` vs `mini-chart` vs `sparkline`

- `signal-bar` = simple supporting indicator.
- `sparkline` = compact trend line.
- `mini-chart` = richer embedded proof element.

### `card-shell` vs `panel-group` vs `split-frame`

- `card-shell` frames one unit.
- `panel-group` frames related units together.
- `split-frame` creates a stronger compositional partition.

## Governance Rule

Before promoting a visual element to `core` or `stable`, it should satisfy all of the following:

1. It improves multiple blocks or multiple themes, not just one page.
2. It improves readability, hierarchy, proof, or atmosphere without creating confusion.
3. It can be implemented consistently across themes without excessive bespoke logic.
4. It helps reduce generic-looking output rather than adding decorative noise.

## Practical Rule

Do not add visual elements only because the page looks “too empty”.

A visual element should be added when it clearly improves at least one of:

- hierarchy
- rhythm
- evidence
- atmosphere
- media framing

If an element only adds decoration without improving communication, it should not be promoted.
