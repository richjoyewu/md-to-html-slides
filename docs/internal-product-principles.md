# Internal Product Principles

## Purpose

This document defines the internal product principles for `md-to-html-slides`.

It is not a marketing document.
It is a decision document used to judge:
- what problem the product is actually solving
- what belongs in the MVP
- what the agent should decide
- what the system should keep deterministic
- what should be postponed even if it looks attractive

## Core Problem

The product is not solving `Markdown to HTML` as a narrow technical transformation.

The actual problem is:

> Users have content, but they do not know how to reliably turn that content into a clear, presentable, and publishable presentation surface.

This breaks down into four recurring user failures:
- users do not know how to split content into presentation units
- users do not know how to compress document language into presentation language
- users do not know what should appear on screen versus what should remain speaker context
- users do not know how to turn structure into a visually usable HTML presentation

Any feature that does not improve this core conversion path is secondary.

## Product Definition

This product should be defined as:

> An agentic system that turns Markdown or draft content into a confirmable presentation structure, then into a speaker-friendly HTML presentation surface.

This means the product is not primarily:
- a Markdown editor
- a theme gallery
- an HTML exporter
- a slide renderer

Those are supporting layers.
The core value is the conversion from raw content to presentation structure.

At the implementation level, the current product is still primarily `deck`-first.
But the product definition should be broader than decks.
Over time it should support multiple presentation modes such as:

- `deck`
- `roadmap`
- `briefing`
- `storyflow`

## Product Principle 1: The User Provides Content, Not Structure

The user should not be required to understand the internal system shape.

The user should not have to distinguish between:
- draft markdown
- slide markdown
- planner input
- renderer input

From the user perspective, there is only one input:
- content

The system is responsible for deciding whether that content must be:
- clarified
- split
- rewritten
- expanded
- polished

Implication:
- avoid exposing internal technical abstractions in the UI
- avoid making users learn an artificial authoring format too early
- prefer simple user-facing language like `输入内容`, `生成展示大纲`, `确认结构`

## Product Principle 2: Agentic Means Better Decisions, Not More Freedom

The agent is valuable only when it improves decision quality.

Agentic behavior in this product means:
- deciding whether the input is already slide-like or still document-like
- deciding whether more information is needed before planning
- deciding which presentation mode best fits the content
- deciding how many slides or sections are appropriate
- deciding what each presentation unit should focus on
- deciding when to split overloaded slides or sections
- deciding when to rewrite long document language into display language

Agentic does not mean:
- letting the model freely generate final HTML
- letting the model redesign every layer of the product
- removing deterministic system boundaries

Implication:
- use LLMs for planning and rewriting
- keep rendering deterministic
- keep output contracts strict

## Product Principle 3: Ask the User Only When It Materially Improves Planning

The system should not over-question the user.

The default rule is:
- if the system can plan reliably, it should proceed automatically
- if a missing detail would materially change the outline, it should ask
- if it asks, it should ask the minimum number of questions possible

Good clarification questions are:
- who is this for
- is this a course, report, or pitch
- roughly how many slides or sections are expected

Bad clarification behavior is:
- asking for many rounds of details
- asking questions that do not change planning quality
- asking questions because the implementation is weak rather than because the content is ambiguous

Implication:
- clarification should be treated as a gate, not a chat mode
- maximum one to two questions unless the user explicitly asks for more control

## Product Principle 4: Keep the Main Flow Narrow

The MVP flow should remain:
1. input content
2. generate presentation outline
3. confirm outline
4. expand presentation content
5. preview presentation surface
6. export HTML

Anything outside this flow is secondary.

This means the following are not core during MVP:
- file upload systems
- collaboration features
- many advanced themes
- animation controls
- a large icon system
- complex formatting DSLs

Implication:
- do not widen the product before the main conversion loop is reliable
- do not optimize secondary surfaces while the planning loop is still weak

The current implementation should stay focused on `deck` mode until that loop is reliable.
But the product itself should be judged as a presentation-surface system, not as a PPT clone.

## Product Principle 5: Reliability Is More Important Than Brilliance

A product built on LLMs becomes useful only when it is predictable.

The system must therefore include:
- state transitions
- clarification gate
- cache
- fallback
- timeout boundaries
- strict schemas
- confirmation points

A flashy result that only works occasionally is less valuable than a simpler result that works consistently.

Implication:
- deterministic rendering is required
- fallback is not optional
- cached successful results are product features, not implementation details

## Product Principle 6: Uncertainty Belongs in Agent Layers, Stability Belongs in System Layers

This project should separate uncertain decisions from deterministic execution.

The recommended split is:
- agent layer:
  - analyzer
  - planner
  - clarification
  - expander
  - future polisher
- system layer:
  - cache
  - timeout
  - request lifecycle
  - state machine
  - HTML rendering
  - preview orchestration

Implication:
- do not let LLM output directly control rendering behavior without normalization
- do not collapse agent and renderer into one step

## Product Principle 7: Outline Quality Determines Everything Downstream

The outline is the highest-leverage artifact in the system.

If the outline is wrong:
- expansion quality collapses
- preview becomes misleading
- templates cannot rescue the result

So the highest-priority intelligence work belongs in:
- better planning
- better clarification
- better presentation-unit focus

Implication:
- planning is a higher priority than new themes
- planning is a higher priority than image support during early stages
- outline confirmation is a product requirement, not an optional extra

## Product Principle 8: The UI Should Expose Only the Current Decision

Each step should only expose the action relevant to that step.

Examples:
- before outline generation, the user should focus on input only
- after outline generation, the user should focus on confirming page structure
- after confirmation, the user should focus on preview and export

Bad UI behavior:
- showing future-stage containers too early
- presenting side information that competes with the primary task
- making the interface look like a dashboard when the user only needs one action

Implication:
- use step-gated views
- prefer low-noise interfaces
- remove decorative surfaces that do not improve decision quality

## Product Principle 9: The Product Should Hide Internal Complexity

Internally, the system may have:
- analyzer
- planner
- clarification gate
- expander
- polisher
- fallback modes
- cache modes
- state machine

Users should not have to understand these abstractions.

The user should feel only this:
- I gave the system content
- it understood what I was trying to present
- it asked me only when necessary
- it gave me a result I could confirm and publish

Implication:
- do not surface internal module names in the main UI
- do not make the product feel like an AI workflow console unless that is a deliberate future direction

## Product Principle 10: The Product Must Improve Human Judgment, Not Replace It Blindly

This product should not assume that the model is always correct.

The role of the system is not to remove the human from the loop entirely.
The role of the system is to improve human leverage.

That means:
- the system should propose structure
- the user should confirm major structure decisions
- the system should carry the heavy transformation work
- the user should retain control at high-value checkpoints

Implication:
- confirm outline before expand
- allow returning to plan

## Product Principle 11: Presentation Mode Is A Product Decision, Not A Theme Trick

The system should eventually distinguish between:

- `presentation mode`
- `theme`
- `template`

Where:

- presentation mode defines structure and navigation
- theme defines visual language
- template defines constrained stylistic defaults within a mode and theme

This means:

- a roadmap should not be forced into artificial slide boundaries if it is better presented as a continuous walkthrough
- a theme should not fake a different presentation mode through CSS alone
- the planner should eventually recommend or select the right mode before rendering

Implication:

- keep renderer contracts mode-aware over time
- keep mode count small and purposeful
- treat `deck` as the current default, not the permanent product boundary
- future polishing should suggest, not silently rewrite without visibility

## Current MVP Priorities

P0:
- stable plan generation
- stable expand generation
- state machine clarity
- clarification gate that can continue planning after answers
- cache and fallback in the main flow

P1:
- stronger planner quality
- stronger clarification precision
- better expand rewriting
- streaming progress that reflects real backend stages

P2:
- polisher
- image support
- icon support
- richer block types

P3:
- broader provider support
- deeper orchestration
- more advanced product surfaces

## Decision Filter

Before building a feature, ask:
1. Does this improve the conversion from raw content to presentation structure?
2. Does this reduce user effort in the main flow?
3. Does this make the system more reliable, not merely more impressive?
4. Would the user notice the value immediately?
5. If this is postponed, does the core product still work?

If the answer to the first two questions is weak, the feature is probably not core.

## Summary

The product should be judged by one standard:

> Does it reliably help a user turn raw content into a confirmable, publishable presentation structure?

If yes, the product is moving in the right direction.
If not, the feature is likely peripheral, even if it looks sophisticated.
