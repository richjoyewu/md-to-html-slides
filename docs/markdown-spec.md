# Markdown Input Spec

## Goal

This spec defines the simplest possible Markdown format for `md-to-html-slides`.

It is designed for content creators, educators, founders, and operators who want to write slide content without touching HTML.

## Core Principle

Users should only need a small subset of Markdown:

- `#` for the deck title
- `##` for each slide title
- `-` for bullet points
- normal paragraphs for explanations
- `![alt](path)` for images
- fenced code blocks for code

Anything more advanced should be optional.

## Minimum Structure

Every slide deck should look like this:

```md
# Deck Title

Optional intro text for the whole deck.

## Slide One Title

Slide content here.

## Slide Two Title

- Bullet one
- Bullet two

## Slide Three Title

![Screenshot](./images/example.png)
```

## Rules

### 1. Deck title

- The first `#` heading is the presentation title.
- There should be only one top-level `#` heading in a file.

Example:

```md
# OpenClaw Training Camp
```

### 2. Slide boundaries

- Each `##` heading starts a new slide.
- All content under that `##` belongs to the same slide until the next `##`.

Example:

```md
## What Is an AI Agent

An AI agent is not just a chatbot.

- It can plan
- It can call tools
- It can execute tasks
```

### 3. Paragraphs

- Use short paragraphs.
- Keep each paragraph focused on one idea.
- Avoid long essay-style text blocks.

Recommended:

```md
AI agents are goal-oriented systems.

They do not only answer questions. They also decide what to do next.
```

### 4. Bullet lists

- Use `-` for bullets.
- Keep lists short when possible.
- Recommended maximum: 3-5 bullets per slide.

Example:

```md
## Why OpenClaw

- Local-first
- Privacy-friendly
- Extensible
- Good for personal workflows
```

### 5. Images

- Use normal Markdown image syntax.
- Prefer one main image per slide.
- Add a short lead-in sentence if the image needs context.

Example:

```md
## Feishu Bot Setup

This screenshot shows the webhook configuration page.

![Feishu bot settings](./images/feishu-bot.png)
```

### 6. Code blocks

- Use fenced code blocks.
- Add a language when possible.
- Keep code examples short enough to fit on a slide.

Example:

```md
## Start Local Server

~~~bash
python3 -m http.server 8000
~~~
```

### 7. Speaker notes

- Not required in Phase 1.
- If needed later, use blockquotes or a dedicated marker.
- For now, notes support is intentionally deferred.

## Recommended Writing Style

- One slide, one message
- One image, one purpose
- Short text beats dense text
- Bullet points should support the title, not repeat it
- If a slide feels crowded, split it into two slides

## Good Example

```md
# OpenClaw Training Camp

Learn how to build your own AI workflow system.

## What Is an AI Agent

AI agents are systems that can understand goals, plan actions, and use tools.

- Goal-oriented
- Tool-using
- Multi-step execution

## Agent vs Chatbot

- Chatbot focuses on responses
- Agent focuses on outcomes
- Agent can act across tools and environments

## OpenClaw Local Advantage

![OpenClaw local workflow](./images/openclaw-local.png)
```

## Bad Example

```md
# OpenClaw

## Slide 1

This slide contains too many ideas and too much text and too many long lines without visual hierarchy, so it will be hard to turn into a good slide automatically because the generator has no clear way to prioritize the content or split it.
```

Problems:

- title is vague
- content is too dense
- no hierarchy
- hard to auto-layout

## Phase 1 Scope

This spec intentionally supports only:

- title
- slide headings
- paragraphs
- bullets
- images
- code blocks

Everything else should be treated as optional future expansion.

## Next Step

Once this spec is stable, the generator should convert:

`Markdown -> slide structure -> themed HTML deck`
