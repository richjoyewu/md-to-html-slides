# Presentation Modes

## Purpose

This document defines the target presentation modes for `md-to-html-slides`.

The product should not be framed as a PPT replacement.
It should be framed as a system for generating speaker-friendly HTML presentation surfaces.

A presentation mode defines:

- how content is organized for display
- how an audience navigates it
- how a speaker uses it during presentation
- which theme families fit it best

Themes and templates control the visual language.
Presentation modes control the presentation shape.

## Current Product Direction

The current implementation is primarily `deck`-first.

That means the product already supports:

- confirmable slide outline flow
- theme preview
- single-file HTML deck rendering

But the long-term product should support more than one presentation shape.

## Mode Hierarchy

Recommended rendering stack:

`content -> plan -> choose presentation mode -> choose theme/template -> render HTML`

This means:

- the planner should eventually choose or recommend a presentation mode
- the renderer should stay deterministic within a chosen mode
- themes should not have to fake a different mode through CSS hacks

## Mode 1: Deck

### Description

A traditional slide-by-slide presentation surface.

### Best For

- talks
- demos
- teaching sessions
- standard product presentations
- keynote-style presentations

### Structure

- one slide at a time
- strong page boundaries
- explicit next/previous navigation
- summary slide often appears near the end

### Speaker Fit

Very strong for live speaking.
Best when the presentation should move in a controlled sequence.

### Navigation

- keyboard
- click / tap
- progress indicator

### Theme Fit

Works with all theme families.
This is the default mode for the current product.

## Mode 2: Roadmap

### Description

A structured single-page or sectioned presentation surface designed for stage-based plans, learning paths, or timelines.

### Best For

- product roadmaps
- training camp structures
- phased rollout plans
- learning journeys
- multi-stage transformation stories

### Structure

- hero section
- key outcomes or audience fit
- grouped phases
- timeline, milestone, or stage navigation
- persistent orientation cues

### Speaker Fit

Strong for walkthrough-style speaking.
Better than decks when the audience needs to understand the whole system before drilling into parts.

### Navigation

- scroll
- sticky section navigation
- anchor jumps
- optional progress footer

### Theme Fit

Works especially well with:

- `Editorial Clarity`
- `Signal Dark Minimal`

### Notes

This mode should not be forced into artificial slide boundaries.
It should feel like a presentation page, not a deck pretending to be a webpage.

## Mode 3: Briefing

### Description

A concise presentation surface for structured updates, decision reviews, and executive communication.

### Best For

- internal reviews
- project updates
- recommendation memos
- board or leadership briefings

### Structure

- short intro context
- key findings
- evidence or support
- decision / recommendation
- next actions

### Speaker Fit

Strong for short live briefings and decision-oriented meetings.
Less theatrical than keynote decks.

### Navigation

- deck-like section stepping
- or short scroll sections with fixed anchors

### Theme Fit

Works especially well with:

- `Apple Minimal Light`
- `Editorial Clarity`

## Mode 4: Storyflow

### Description

A narrative presentation surface for guided case studies, explanatory stories, and long-form walkthroughs.

### Best For

- case studies
- transformation stories
- product narratives
- before / after explanations
- article-to-presentation conversions

### Structure

- narrative chapters
- transition sections
- contrast blocks
- quotes, moments, and resolution

### Speaker Fit

Strong when the speaker wants the audience to follow a story arc rather than a strict bullet sequence.

### Navigation

- chapter scroll
- section stepping
- optional progress markers

### Theme Fit

Works especially well with:

- `Editorial Clarity`
- `Signal Dark Minimal`

## Mode Selection Principles

### 1. Mode Is A Content Decision

Choose the mode based on how the content should be understood, not just on which visual style looks attractive.

### 2. Theme Is Not Mode

Do not use a theme to simulate a different presentation mode.

Examples:

- a roadmap should not be squeezed into artificial slides if the structure is inherently continuous
- a keynote should not be turned into a long scroll page unless the speaking format really needs it

### 3. Speaker Experience Comes First

The right question is:

> What presentation surface best supports the speaker's job in this context?

Not:

> What looks most like a PowerPoint?

### 4. Keep The Number Of Modes Small

The product does not need many modes early on.

Recommended sequence:

1. `deck` as stable default
2. `roadmap` as the first non-deck mode
3. `briefing`
4. `storyflow`

## Implementation Guidance

### Near-Term

- Keep the current renderer focused on `deck`
- Add mode language to product docs now
- Design future templates with mode separation in mind

### Next Step

The first mode to add after `deck` should be:

`roadmap`

Reason:

- it covers a real presentation use case already visible in project examples and user goals
- it proves the product is not restricted to slide-shaped output
- it fits the speaker-first product direction
