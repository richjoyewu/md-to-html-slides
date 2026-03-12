# Slide Planning Specification

## Purpose

`Slide Planning` is the core agentic module of this project.

Its job is to turn raw user input into a structured slide plan before any theme rendering happens.

This means the system should not go directly from:

`raw input -> html`

It should go through:

`raw input -> slide plan -> rewritten slide markdown -> themed html`

## Why This Module Matters

Theme quality affects visual output, but slide planning determines whether the deck makes sense at all.

This module is responsible for:

- deciding how many slides should exist
- deciding what each slide should focus on
- reducing information overload
- rewriting long-form content into slide-friendly structure
- giving the renderer a stable content contract

Without this module, the system is only a renderer.
With this module, the system becomes agentic.

## Phase 1 Goal

The first version of slide planning should make one thing reliable:

`turn messy source content into a coherent slide outline`

It does not need to be fully autonomous yet.
It does need to produce stable structured output.

## Inputs

The planner should accept:

- `raw_input`
  - free-form text from the user
  - may be notes, course content, product copy, report text, or rough markdown

- `content_type`
  - optional hint from user or upstream UI
  - examples: `course`, `pitch`, `report`, `story`

- `tone_goal`
  - optional communication goal
  - examples: `professional`, `high-impact`, `calm`, `teaching`

- `length_target`
  - optional slide count preference
  - examples: `short`, `standard`, `detailed`

- `audience`
  - optional audience hint
  - examples: `beginners`, `investors`, `internal team`, `customers`

## Outputs

The planner should output a structured `slide plan`.

Recommended shape:

```json
{
  "deck_title": "第1课 揭秘 AI Agent",
  "deck_goal": "帮助零基础用户理解 Agent 与 Chatbot 的区别",
  "content_type": "course",
  "tone_goal": "teaching",
  "audience": "beginners",
  "slides": [
    {
      "index": 1,
      "title": "什么是 AI Agent",
      "intent": "define",
      "key_points": [
        "Agent 不只是问答工具",
        "它围绕目标执行任务",
        "它可以连接工具和外部环境"
      ],
      "layout_hint": "title-bullets",
      "summary": "先给出最清晰的定义",
      "speaker_note": "强调 Agent 和普通聊天工具的根本差异"
    }
  ]
}
```

## Required Slide Fields

Each slide should include at least:

- `index`
- `title`
- `intent`
- `key_points`
- `layout_hint`
- `summary`

Optional:

- `speaker_note`
- `source_refs`
- `priority`

## Planner Responsibilities

The planner must do these things:

1. Identify the core topic
2. Infer the likely content type if not provided
3. Estimate a reasonable slide count
4. Group the content into one idea per slide
5. Rewrite each slide title into short display-friendly form
6. Compress raw content into concise slide points
7. Suggest a layout type for each slide

## Intent Types

The planner should classify each slide using a simple intent vocabulary.

Recommended starting set:

- `cover`
- `define`
- `problem`
- `solution`
- `explain`
- `compare`
- `process`
- `example`
- `summary`
- `cta`

This keeps the renderer and future UI simple.

## Layout Hints

The planner should suggest layout hints, not final HTML.

Recommended starting set:

- `cover`
- `title-bullets`
- `title-body`
- `quote`
- `compare`
- `process-steps`
- `image-focus`
- `summary`

The renderer may ignore or reinterpret these hints, but they should still be present.

## Planning Heuristics

Phase 1 should use simple planning rules:

- one slide should focus on one main idea
- titles should usually stay under 18 display characters in Chinese, or roughly 6 to 10 words in English
- bullet lists should usually stay between 3 and 5 items
- if a section contains too many ideas, split it
- if a section is weak or repetitive, merge it
- first slide should establish context
- last slide should summarize or end with action

## Rewriting Rules

The planner should rewrite for slide readability, not literary completeness.

Good rewriting behavior:

- shorten titles
- remove filler words
- convert paragraphs into bullets
- make bullets parallel in structure
- keep high-information phrases

Bad rewriting behavior:

- hallucinating content not supported by the input
- rewriting into vague motivational fluff
- turning everything into generic corporate language
- keeping paragraph-sized bullets

## Content-Type Defaults

### `course`

- emphasize clear explanation
- preserve teaching order
- include summary slide

### `pitch`

- emphasize hook, pain point, solution, value, call to action
- stronger titles
- fewer teaching details

### `report`

- emphasize structure, findings, evidence, recommendations
- more analytical tone

### `story`

- emphasize narrative sequence, contrast, tension, resolution

## Phase 1 Non-Goals

This module should not try to do these yet:

- image generation
- visual theme selection by itself
- animation planning
- precise typography control
- fully autonomous multi-round self-editing

Those belong in later phases.

## Integration Boundary

This module should sit between:

- upstream input collection
- downstream markdown or html rendering

The clean system boundary should be:

1. `Input Layer`
2. `Slide Planning`
3. `Slide Rewriting`
4. `Theme Rendering`
5. `Preview / Export`

## Example Flow

```text
User raw notes
  -> planner identifies "course"
  -> planner creates 6-slide structure
  -> rewriter turns long notes into concise bullets
  -> renderer applies chosen theme
  -> preview opens in browser
```

## Next Module

After this spec, the next most important module is:

`Slide Rewriting`

That module will take a structured slide plan and generate slide-friendly markdown blocks for each page.
