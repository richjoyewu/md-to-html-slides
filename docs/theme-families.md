# Theme Families

## Purpose

This document defines the first three target theme families for `md-to-html-slides`.

These are not final implementation specs.
They are style briefs used to guide:

- renderer design
- token selection
- preview art direction
- template packs

All themes in this document must follow [design-principles.md](./design-principles.md).

## Theme 1: Apple Minimal Light

### Positioning

Use for:

- product strategy decks
- internal leadership reviews
- simple founder presentations
- clean course material with premium tone

### Keywords

- quiet
- premium
- airy
- precise
- calm confidence

### Visual Personality

This theme should feel extremely controlled.
It should not look plain.
It should look expensive because of restraint.

### Color Direction

- warm-white or neutral-light background
- charcoal or near-black text
- one cool accent by default
- optional muted support tone for secondary separators

Recommended accent behavior:

- use accent on one focal object, not across the entire slide
- use color blocks sparingly

### Typography Direction

- elegant sans or humanist sans for body
- refined display companion for large headings only if it stays disciplined
- body copy must remain highly readable

### Layout Direction

- generous margins
- very clear title/content separation
- minimal chrome
- large whitespace fields
- structured image or stat placement

### Motion

- fade
- slight vertical lift
- subtle stagger

No dramatic transitions.
No glowing effects.

### Density

- low to medium
- default 3 bullets
- allow 4 when content is strong and parallel

### Best Content Shapes

- product narrative
- strategic explanation
- summary-driven communication

### Avoid

- crowded compare tables
- heavy editorial textures
- loud colors
- retro or playful styling

## Theme 2: Editorial Clarity

### Positioning

Use for:

- teaching decks
- explainers
- case-study storytelling
- article-to-slides conversion

### Keywords

- editorial
- readable
- literate
- structured
- warm clarity

### Visual Personality

This theme should feel like a well-designed magazine feature that became an interactive deck.
It should be warm, but not nostalgic to the point of becoming decorative.

### Color Direction

- paper-like light background
- dark ink text
- muted rust, olive, slate, or blue as restrained accents
- occasional section tabs or rule lines

### Typography Direction

- serif-led heading system
- readable sans or clean serif body depending on contrast needs
- strong hierarchy between kicker, title, body, and note

### Layout Direction

- editorial columns when useful
- strong heading blocks
- understated dividers
- quote and summary slides should feel especially strong

### Motion

- almost invisible
- page transition should feel like content moving into place

### Density

- medium
- supports 3 to 4 bullets comfortably
- can support short paragraph slides if line length is controlled

### Best Content Shapes

- course content
- narrative explainers
- structured insight decks

### Avoid

- dark-mode neon
- product-dashboard aesthetics
- overly thin typography
- too many cards in one slide

## Theme 3: Signal Dark Minimal

### Positioning

Use for:

- product launches
- technical talks
- roadmap decks
- high-contrast keynote-style presentations

### Keywords

- dark
- sharp
- focused
- modern
- controlled energy

### Visual Personality

This theme should feel high-signal and modern.
It can be bold, but it must remain disciplined.
Think "confident dark presentation system," not cyberpunk.

### Color Direction

- deep charcoal or blue-black background
- near-white primary text
- one vivid accent
- one cool support highlight at most

Accent should be used for:

- focal numbers
- cover anchor
- compare emphasis
- subtle section markers

Not for:

- every border
- every bullet
- every headline

### Typography Direction

- assertive sans display titles
- compact readable sans body
- stronger scale contrast than the light themes

### Layout Direction

- bold cover composition
- larger contrast zones
- simple cards or panels only when they improve grouping
- image and code layouts should feel clean, not developer-tool themed

### Motion

- stronger than light themes, but still finite
- slide entry may use small scale + fade
- compare slides may use directional reveal

### Density

- low to medium
- best with 3 bullets
- use summary and compare slides heavily

### Best Content Shapes

- product overviews
- keynote-style explainers
- launch and roadmap narratives

### Avoid

- terminal cosplay
- electric glow on every element
- too many floating panels
- decorative grid overload

## Family Rules

Across all three theme families:

- keep one strong visual idea per slide
- keep bullet layouts compact
- keep summary slides intentionally designed
- keep theme identity visible on body slides, not only the cover
- keep templates as structured style systems, not freeform canvases

## Implementation Order

Recommended build order:

1. `Editorial Clarity`
2. `Signal Dark Minimal`
3. `Apple Minimal Light`

Reason:

- `Editorial Clarity` aligns most directly with current project strengths
- `Signal Dark Minimal` can evolve from the dark-card direction with better restraint
- `Apple Minimal Light` requires the highest discipline and is easiest to do badly if rushed
