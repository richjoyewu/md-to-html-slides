# Slide Rewriting Specification

## Purpose

`Slide Rewriting` turns a structured slide plan into slide-friendly content blocks.

This module sits after planning and before rendering.

It does not decide the full deck structure.
It does not decide the final CSS or visual layout.

Its job is to take each planned slide and rewrite the content into a form that works well on slides.

## Position In The Pipeline

The intended pipeline is:

`raw input -> slide planning -> slide rewriting -> themed rendering`

The planner decides:

- what each slide is about
- what intent it has
- what key points belong on it

The rewriter decides:

- how those points should actually be phrased on the slide
- whether the slide should be bullets, body text, quote, or summary
- how to make the text short, readable, and presentation-friendly

## Goal

The first version of this module should make one thing reliable:

`turn planned slide content into concise display-ready markdown`

It should favor clarity and density control over stylistic cleverness.

## Inputs

The rewriter should accept:

- `deck_title`
- `deck_goal`
- `content_type`
- `tone_goal`
- `audience`
- `slides`

Each slide is expected to already contain:

- `index`
- `title`
- `intent`
- `key_points`
- `layout_hint`
- `summary`

Optional:

- `speaker_note`
- `source_refs`

## Outputs

The rewriter should output a rewritten slide collection.

Recommended shape:

```json
{
  "deck_title": "第1课 揭秘 AI Agent",
  "slides": [
    {
      "index": 1,
      "title": "什么是 AI Agent",
      "format": "title-bullets",
      "markdown": "## 什么是 AI Agent\n\n- Agent 不只是问答工具\n- 它围绕目标执行任务\n- 它可以连接工具和外部环境",
      "summary": "先定义 Agent 的本质"
    }
  ]
}
```

## Output Contract

Each rewritten slide should include:

- `index`
- `title`
- `format`
- `markdown`
- `summary`

This output should be easy for the renderer to consume directly.

## Rewriter Responsibilities

The rewriter must:

1. shorten and normalize slide titles when needed
2. convert raw points into display-friendly bullet phrasing
3. keep one slide focused on one idea
4. remove filler and repetition
5. preserve the original meaning
6. match the requested tone without becoming generic

## Markdown Forms

Phase 1 should support a small number of output forms.

### `cover`

Example:

```md
# 第1课 揭秘 AI Agent
## 从聊天到执行
```

### `title-bullets`

Example:

```md
## 什么是 AI Agent

- Agent 不只是问答工具
- 它围绕目标执行任务
- 它可以连接工具和外部环境
```

### `title-body`

Example:

```md
## OpenClaw 的本地优势

本地部署意味着隐私、可控性和长期可扩展能力都掌握在自己手里。
```

### `quote`

Example:

```md
> 这不叫用 AI，这叫喂 AI。
```

### `summary`

Example:

```md
## 本节总结

- Agent = 模型 + 工具 + 执行
- Chatbot 偏对话，Agent 偏任务
- OpenClaw 更适合做个人 AI 中枢
```

## Rewriting Heuristics

### Titles

Good title rewriting:

- shorter
- clearer
- concrete
- suitable for display

Bad title rewriting:

- vague abstraction
- slogan-like fluff
- overly long explanatory wording

### Bullets

Good bullets:

- one idea each
- similar grammatical shape
- compact
- meaningful without paragraph context

Bad bullets:

- full paragraphs
- repeated subject and filler words
- mixed levels of abstraction
- multiple ideas in one bullet

## Tone Behavior

### `teaching`

- clear and explanatory
- slightly more explicit
- less rhetorical

### `professional`

- compact and precise
- neutral tone

### `high-impact`

- stronger compression
- sharper titles
- more contrast-driven wording

### `calm`

- softer phrasing
- fewer dramatic contrasts

## Format Selection

The rewriter may refine the planner's `layout_hint` into a specific content form.

Suggested mapping:

- `cover` -> `cover`
- `title-bullets` -> `title-bullets`
- `title-body` -> `title-body`
- `quote` -> `quote`
- `summary` -> `summary`

If the planner hint is weak or ambiguous:

- use `title-bullets` as the safest default

## Compression Rules

Phase 1 compression should follow these rules:

- keep bullets usually under 22 Chinese characters when possible
- keep titles usually under 18 display characters when possible
- avoid more than 5 bullets on one slide
- if more than 5 bullets are required, planner should probably split the slide
- keep body text to 1 or 2 short paragraphs

## Hallucination Rule

The rewriter must not invent unsupported claims.

Allowed:

- shortening
- rephrasing
- restructuring
- summarizing

Not allowed:

- adding facts not implied by the source
- changing the meaning
- inventing examples or data

## Relationship To Agent Assist

This module is the best place for early agent assistance.

Useful agent behaviors here:

- compress long-form text
- propose shorter slide titles
- convert explanations into bullets
- write one-line slide summaries

This is a better place for agentic behavior than direct HTML generation.

## Phase 1 Non-Goals

This module should not do these yet:

- image prompt generation
- style-specific wording changes per theme
- speaker script expansion
- multilingual rewriting
- persuasion optimization across the whole deck

## Example Flow

```text
Planner output:
  title = "Agent 和 Chatbot 的区别"
  key_points = [
    "Chatbot 偏向单轮对话",
    "Agent 偏向目标执行",
    "Agent 可以连接工具和外部环境"
  ]

Rewriter output:
  format = "title-bullets"
  markdown =
    "## Agent 和 Chatbot 的区别
    
    - Chatbot 偏向单轮对话
    - Agent 偏向目标执行
    - Agent 可以连接工具和外部环境"
```

## Next Step

After this spec, the next implementation target should be:

`planner output schema + rewriter output schema wired into one testable pipeline`
