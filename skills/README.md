# Skill Files

Official skill-file examples and templates for `md-to-html-slides`.

Recommended workflow:

```bash
node ./scripts/build.mjs validate-skill ./skills/founder-pitch.json
node ./scripts/build.mjs plan ./fixtures/pitch/clean/product-pitch.md --skill-file ./skills/founder-pitch.json
```

Included files:

- `founder-pitch.json`: ready-to-use custom pitch skill example
- `templates/general-template.json`: template extending `general`
- `templates/pitch-tech-launch-template.json`: template extending `pitch-tech-launch`

Current contract version:

- `skill-file@1`
