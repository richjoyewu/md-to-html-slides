# Design Principles

## Purpose

This document defines the visual direction for `md-to-html-slides`.

It exists to answer one question consistently:

> What should a strong deck from this product feel like before any theme-specific styling is applied?

This is not a renderer implementation file.
It is a decision document for:

- theme creation
- template design
- preview selection
- layout tradeoffs
- visual quality review

## Design Thesis

The product should aim for:

> Distinctive minimal web presentations.

That means:

- not generic AI slideshow output
- not enterprise template blandness
- not noisy poster art
- not skeuomorphic PPT imitation

The target is a deck that feels:

- web-native
- editorial
- controlled
- high-contrast where needed
- quiet enough to read
- memorable enough to share

## Current Design Scope

The current product is still `deck`-first.

That means design work should optimize for:

- slide-by-slide speaking
- strong title-to-content hierarchy
- theme switching with clear personality
- HTML output that feels web-native rather than PPT-like

Future presentation modes may expand beyond decks, but current design decisions should first strengthen the default deck flow.

## Reference Directions

This project intentionally combines two reference directions.

### 1. Curated Style Discovery

Borrow from `frontend-slides`:

- strong visual point of view
- style presets with clear personality
- anti-generic AI aesthetics
- visual discovery through previews, not abstract style prompts

Keep:

- curated theme families
- visual distinctiveness
- clear style names and preview-first selection

Do not copy blindly:

- overly loud visual treatments
- novelty for its own sake
- decoration that weakens reading hierarchy

### 2. Apple-Style Restraint

Borrow from Apple-style interface discipline:

- clarity
- hierarchy
- spacing
- calm motion
- consistency
- readability-first decisions

Keep:

- restrained color systems
- precise spacing
- low-noise surfaces
- gentle transitions
- strong typographic hierarchy

Do not imitate literally:

- platform chrome
- fake Apple marketing layouts
- sterile emptiness with no personality

## Core Principles

### 1. Distinctive, Not Generic

Every theme should have a recognisable point of view.

Good differentiation:

- a clear contrast model
- a distinct typography pairing
- a specific cover behavior
- a consistent density level

Bad differentiation:

- only changing accent colors
- adding random gradients
- using "AI-looking" effects as identity

### 2. Clarity Before Decoration

The deck must remain readable at first glance.

This means:

- headings establish the page immediately
- body content never fights the title
- decorative elements support composition, not attention theft

If a visual element makes the slide harder to parse, it should be removed.

### 3. One Visual Idea Per Slide

A slide may contain several content blocks, but it should still feel organized around one dominant idea.

Use one of these as the main anchor:

- title scale
- contrast block
- image
- stat
- quote
- structured comparison

Do not let multiple anchors compete with equal weight.

### 4. Use Tension Through Hierarchy, Not Clutter

Interesting slides should come from:

- scale changes
- spacing
- alignment
- contrast
- controlled asymmetry

Not from:

- too many cards
- too many labels
- too many accent colors
- too many effects

### 5. Motion Should Confirm Structure

Animation is allowed, but only when it improves orientation.

Good uses:

- page entry
- staggered bullet reveal
- gentle section transition
- preview state change

Bad uses:

- constant floating
- looped decorative motion
- aggressive parallax
- flashy transitions between ordinary slides

### 6. Themes Are Systems, Not One-Off Artboards

A theme must define:

- a reading rhythm
- a spacing system
- a type hierarchy
- an accent rule
- a density rule
- a summary slide behavior

The goal is not to make one beautiful cover.
The goal is to make the whole deck feel coherent.

## Theme Direction

The current theme system should stay intentionally small, with each theme occupying a clearly different role:

- dark, high-contrast product or technical presentation
- light, editorial teaching or explainer presentation
- signal-driven product-story presentation

Theme differentiation should come from:

- composition
- typography
- contrast model
- density rhythm

Not from superficial accent swaps alone.

## Presentation Shape

The current default presentation shape is:

- one slide at a time
- clear page boundaries
- keyboard or click/tap navigation
- summary or wrap-up near the end

Design work should not simulate unrelated presentation modes through CSS hacks.
If a future mode needs a different shape, it should be introduced as a separate rendering model rather than forced through deck styling.

## Visual Rules

### Typography

- Prefer at most two font families per theme.
- Title typography can be expressive, but body typography must stay calm and readable.
- Titles should usually stay within two lines.
- Body text should not become paragraph-sized when a bullet layout is more appropriate.
- Avoid default system-font-only themes unless the visual direction truly depends on neutrality.

### Color

- Default to a restrained base: neutral background + one primary accent + one support accent at most.
- High contrast is preferred over muddy richness.
- Accent color should guide attention, not flood the whole slide.
- Use saturation selectively on covers, dividers, and focal elements.
- Avoid generic "purple gradient on white" AI aesthetics.

### Spacing

- Use generous outer margins.
- Keep alignment strong and intentional.
- Prefer fewer blocks with better spacing over more blocks with tighter packing.
- Dense layouts should still preserve clean separation between title, content, and support elements.

### Surfaces

- Cards are allowed, but not required.
- Panels should feel purposeful, not like dashboard leftovers.
- Texture may be subtle in light themes, but should never reduce text contrast.
- Shadows should stay soft and structural, not theatrical.

### Images and Media

- Use image-led layouts only when the image deserves focal status.
- Do not shrink important images into decorative thumbnails.
- When image quality is weak, the layout should degrade gracefully back to typography-first composition.

## Anti-Patterns

Avoid these by default:

- generic AI gradients
- glowing neon everywhere
- too many badges, chips, and panels
- endless card grids
- dashboard-style clutter
- decorative dividers with no compositional function
- motion that keeps moving after the slide is understood
- cover slides that look strong but leave body slides visually empty

## Quality Checklist

Use this list when reviewing a theme or generated deck:

1. Can the slide purpose be understood in under two seconds?
2. Is there one clear visual anchor?
3. Is the title stronger than everything except the intentional focal element?
4. Does the accent color guide attention instead of flooding the page?
5. Would the deck still feel good if animation were disabled?
6. Does the style feel specific without becoming noisy?
7. Does the deck avoid looking like a generic AI-generated presentation?

## Implementation Implications

These principles imply the following product decisions:

- keep theme selection preview-first
- keep theme families curated rather than open-ended
- keep template overrides narrow and system-safe
- keep LLMs focused on content, not CSS invention
- keep renderer decisions deterministic

Theme and template work should be judged against this document before implementation.
