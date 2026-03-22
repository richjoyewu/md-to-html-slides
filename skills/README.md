# Skill Files

Official skill-file examples and templates for `md-to-html-slides`.

Recommended workflow:

```bash
node ./scripts/build.mjs validate-skill ./skills/founder-pitch.json
node ./scripts/build.mjs validate-skill-dir ./skills
node ./scripts/build.mjs plan ./fixtures/pitch/clean/product-pitch.md --skill-file ./skills/founder-pitch.json
```

Included files:

- `founder-pitch.json`: ready-to-use custom pitch skill example
- `templates/general-template.json`: template extending `general`
- `templates/pitch-tech-launch-template.json`: template extending `pitch-tech-launch`

Current contract version:

- `skill-file@1`

Validation layers now include:

- file structure validation
- directory-level conflict validation
- resolved inheritance validation
- semantic plausibility validation

Directory-level validation checks:

- duplicate local skill ids
- conflicts between local skill ids and built-in skill ids
- circular local inheritance
- whether every `base_skill` points to a known built-in or local skill

Resolved-skill validation checks:

- merged skill must still have:
  - `planning.rules`
  - `expansion.rules`
  - `blocks.preferred`
  - `blocks.format_guidance`
  - `quality.focus`
- `blocks.preferred` and `blocks.format_guidance` must have semantic overlap
- pitch-like skills must include at least one of:
  - `hero`
  - `compare`
  - `metrics`
  - `cta`
- pitch-like skills should include `hero` guidance

Example JSON report from `validate-skill-dir ./skills`:

```json
{
  "directory": "skills",
  "loaded": 3,
  "skills": [
    {
      "id": "founder-story-pitch",
      "base_skill": "pitch-tech-launch",
      "default_theme": "tech-launch",
      "file": "skills/founder-pitch.json"
    },
    {
      "id": "custom-general",
      "base_skill": "general",
      "default_theme": "dark-card",
      "file": "skills/templates/general-template.json"
    }
  ]
}
```
