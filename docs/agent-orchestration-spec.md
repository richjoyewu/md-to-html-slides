# Agent Orchestration Specification

## Purpose

This project should not treat slide generation as a single prompt call.

The system should behave like a workflow-guided agent that:

- understands the user's Markdown
- decides how to structure the deck
- expands the structure into slide-friendly content
- polishes weak slides when needed
- hands structured output to the renderer

The intended top-level pipeline is:

`markdown input -> agent orchestration -> structured slide content -> themed html`

## Product Principle

From the user's point of view, there is only one input:

- `Markdown`

The user should not need to know whether the input is:

- raw notes
- article-style draft
- teaching script
- already slide-friendly markdown

The agent decides whether the Markdown needs to be:

- split
- compressed
- rewritten
- expanded into slide bullets
- lightly polished or heavily reorganized

## Why Orchestration Is Needed

A renderer alone is not enough.

The core difficulty is not HTML generation.
The core difficulty is transforming document logic into presentation logic.

That requires multiple reasoning steps:

1. understand the content
2. plan the slide sequence
3. expand each slide into display-ready points
4. polish weak slides
5. render the result

These steps should be coordinated by an orchestrator.

## Phase 1 Goal

The first version of orchestration should make one thing reliable:

`turn one Markdown input into a confirmed slide outline and then into renderable slide content`

It does not need to support open-ended autonomy.
It does need to support stable, low-friction slide generation.

## Agent Modules

Phase 1 should use five modules.

### 1. Analyzer

Purpose:

- inspect the raw Markdown
- identify content shape and difficulty
- decide whether the input is already slide-friendly or still document-like

Responsibilities:

- infer `content_type`
- estimate content density
- detect whether the input is structured or messy
- identify long sections that may require splitting
- identify likely audience and tone if possible

Suggested output:

```json
{
  "content_type": "course",
  "input_shape": "document_like",
  "density": "medium",
  "audience": "beginners",
  "tone_goal": "teaching",
  "suggested_slide_count": 8,
  "needs_rewrite": true,
  "notes": [
    "contains long explanatory paragraphs",
    "contains section structure that can be preserved"
  ]
}
```

### 2. Planner

Purpose:

- turn the input into a slide sequence

Responsibilities:

- decide how many slides are needed
- assign one core idea per slide
- draft slide titles
- assign slide intents
- create short per-slide summaries

Suggested output:

```json
{
  "deck_title": "第1课 揭秘 AI Agent",
  "slides": [
    {
      "index": 1,
      "title": "什么是 AI Agent",
      "intent": "define",
      "summary": "定义 Agent 的核心能力"
    }
  ]
}
```

### 3. Expander

Purpose:

- expand slide summaries into display-ready slide content

Responsibilities:

- generate 3 to 5 bullets per slide when appropriate
- choose content format per slide
- convert paragraph logic into slide logic
- keep bullets short and parallel

Suggested output:

```json
{
  "deck_title": "第1课 揭秘 AI Agent",
  "slides": [
    {
      "index": 1,
      "title": "什么是 AI Agent",
      "format": "title-bullets",
      "bullets": [
        "Agent 不只是问答工具",
        "它围绕目标执行任务",
        "它可以连接工具和外部环境"
      ]
    }
  ]
}
```

### 4. Polisher

Purpose:

- detect and fix weak slide content after expansion

Responsibilities:

- shorten titles that are too long
- split slides that are too dense
- merge slides that are too thin
- remove repetition
- normalize bullet quality

This module should only make bounded edits.
It should not re-plan the whole deck unless the deck clearly failed.

### 5. Renderer

Purpose:

- convert structured slide content into themed HTML

Responsibilities:

- apply selected theme
- map content format to layout
- render final single-file HTML

This module is not part of the agent reasoning layer.
It is a deterministic presentation layer.

## Orchestrator Responsibilities

The orchestrator coordinates the modules above.

Phase 1 responsibilities:

1. receive Markdown input
2. run `Analyzer`
3. run `Planner`
4. return outline to the user for confirmation
5. after confirmation, run `Expander`
6. optionally run `Polisher`
7. pass result to `Renderer`

This means the product flow should be:

`input markdown -> generate outline -> user confirms -> generate html preview`

## Confirmation Gates

The user should not confirm every internal step.
That would raise the interaction cost.

Phase 1 should use one explicit confirmation gate:

- `outline confirmation`

What the user confirms:

- slide count is reasonable
- slide titles make sense
- the sequence is correct enough to continue

What the user should not need to confirm:

- analyzer metadata
- internal prompt decisions
- polishing micro-edits

## Orchestration Strategy

Phase 1 should not use one huge prompt for everything.

Recommended strategy:

### Step A. Analyze

Input:

- raw Markdown

Output:

- content metadata
- suggested slide count
- rewrite difficulty

### Step B. Plan

Input:

- raw Markdown
- analyzer result

Output:

- deck title
- slide titles
- slide summaries

### Step C. User Confirmation

Input:

- planned outline

Output:

- continue
- or regenerate

### Step D. Expand

Input:

- confirmed outline
- raw Markdown

Output:

- per-slide bullets or body content

### Step E. Polish

Input:

- expanded slides

Output:

- density-controlled slides

### Step F. Render

Input:

- polished slide content
- selected theme

Output:

- single-file HTML deck

## Recommended Data Contracts

### Outline Contract

```json
{
  "deck_title": "string",
  "slides": [
    {
      "index": 1,
      "title": "string",
      "intent": "define|explain|compare|example|summary|cta",
      "summary": "string"
    }
  ]
}
```

### Expanded Slide Contract

```json
{
  "deck_title": "string",
  "slides": [
    {
      "index": 1,
      "title": "string",
      "format": "cover|title-bullets|title-body|quote|summary",
      "bullets": ["string"],
      "body": "optional string"
    }
  ]
}
```

## LLM Usage Guidance

The orchestration layer should not bind directly to one vendor.
It should call the provider layer through a stable interface.

The orchestrator should ask the provider for bounded outputs:

- analyzer result
- outline result
- expanded slides
- polish result

Do not let the provider generate final HTML.
That keeps rendering deterministic and easier to debug.

## Why The API Feels Slow Today

The current implementation is slow because it asks the model to do too much in one step.

Current anti-pattern:

- one request
- whole Markdown input
- full slide outline
- strict JSON output
- blocking wait for complete result

Phase 1 orchestration should split this into smaller reasoning units.

That improves:

- response time
- debuggability
- recovery from partial failure
- user trust

## Phase 1 Non-Goals

Do not add these yet:

- free-form multi-agent swarms
- autonomous tool-use loops
- self-reflection chains with many retries
- fully automatic theme selection without user input
- image generation orchestration
- long-running background jobs

## MVP Definition

Phase 1 orchestration MVP is complete when the system can do this reliably:

1. accept one Markdown input
2. produce a reasonable outline in one agent stage
3. let the user confirm the outline
4. expand the confirmed outline into renderable slide content
5. render that content into themed HTML

If this flow is stable, the system is ready for Phase 2 improvements.

## Phase 2 Extensions

After Phase 1 is stable, add these in order:

1. faster two-stage API flow
   - outline first
   - bullets second

2. stronger polisher
   - title compression
   - density balancing
   - continuation slide splitting

3. richer content forms
   - image slides
   - compare slides
   - process slides
   - icon tokens

4. optional user controls
   - preferred slide count
   - tone goal
   - content type hint

5. streaming progress
   - analyzing
   - planning
   - expanding
   - polishing
