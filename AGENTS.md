# md-to-html-slides

## Project Goal

- Build a Markdown-first slide generation system that turns one Markdown input into a polished, single-file HTML deck.
- Keep the product centered on the confirmed flow: `Markdown -> Plan -> Clarification -> Outline Confirmation -> Expand -> HTML`.
- Prioritize output quality, predictable structure, and a low-friction authoring workflow over feature breadth.

## Canonical Docs

- `README.md`: current product overview, local usage, and public-facing positioning.
- `docs/design-principles.md`: canonical visual direction and anti-generic design rules.
- `docs/internal-product-principles.zh-CN.md`: canonical product definition, main flow, and scope guardrails.
- `docs/next-technical-strategy.zh-CN.md`: current implementation priorities and next-stage direction.
- `docs/engineering-spec.md`: current Markdown, CLI, and provider contracts.
- `docs/freeform-html-art-mode-decision.zh-CN.md`: mode-splitting decision record for stable system mode versus freeform art mode.
- `docs/system-mode-vs-art-mode-boundary.zh-CN.md`: boundary definition for default system mode, future art mode, and task prioritisation.
- `docs/demo-openclaw-design-breakdown.zh-CN.md`: design asset breakdown of the hand-crafted demo baseline and what should enter System Mode.

## Common Commands

- `npm run build:ts`: compile TypeScript sources into `dist-ts/`.
- `npm run studio`: build TypeScript and start the local studio server at `http://127.0.0.1:4173/`.
- `npm run check:fallback`: run the fixture-based fallback regression script.
- `npm run check:agent`: compatibility alias for the fallback regression script.
- `npm run check:llm`: run the live LLM regression harness against representative fixtures.
- `npm run check:llm:ab`: compare baseline and candidate live LLM profiles on the same fixture set.
- `npm run check:cli`: run the deterministic CLI validation and example build flow.
- `npm run check`: run both fallback regression and CLI regression.
- `npm run themes`: list registered CLI themes.
- `npm run validate:example`: validate the sample Markdown input.
- `npm run build:example`: build the sample deck with the `dark-card` theme.
- `npm run build:example:editorial`: build the sample deck with the `editorial-light` theme.

## Edit Boundaries

- Treat `docs/internal-product-principles.zh-CN.md`, `docs/next-technical-strategy.zh-CN.md`, and `docs/engineering-spec.md` as the architectural source of truth before changing flow, module boundaries, or provider wiring.
- Keep the deterministic renderer separate from agent reasoning. Do not move content-planning logic into templates or rendering code.
- Do not introduce provider-specific request logic outside the provider layer.
- Avoid duplicating parsing, normalization, and schema-mapping logic across CLI, server, and studio code. Prefer shared contracts and shared helpers.
- Keep fallback behavior working even when LLM calls fail or are unavailable.
- Do not hand-edit generated files in `dist-ts/` unless the task explicitly requires it. Prefer editing source files and rebuilding.

## Acceptance Criteria

- The change preserves or improves the main flow: `Plan -> Clarification -> Expand -> Render`.
- Relevant commands still pass after the change. Use the smallest valid set for the scope:
  - Docs-only change: no command required.
  - Fallback or agent heuristic change: `npm run check:fallback`.
  - Live LLM prompt, provider, or orchestration change: `npm run check:llm`.
  - CLI, templates, or sample-output change: `npm run check:cli`.
  - Cross-cutting change that touches both layers: `npm run check`.
  - TypeScript server or agent source change: `npm run build:ts`.
- Any new workflow, boundary change, or architectural shift is reflected in the canonical docs above.
- Do not leave the repo in a state where Studio behavior, CLI behavior, and documented behavior disagree silently.
