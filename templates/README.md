# Templates

This directory stores reusable slide themes.

## Current Themes

- `dark-card`: deep dark background, editorial display typography, high-contrast product deck styling
- `editorial-light`: warm paper background, serif-led editorial layout, print-inspired accents

## Template Contract

Each theme module should export one renderer function that accepts:

- `deck`: normalized slide data after Markdown parsing and asset inlining
- `options`: CLI options such as `theme` and optional title override

And returns:

- a complete HTML document string

## Why This Exists

The renderer is separated from `scripts/build.mjs` so new themes can be added without growing the CLI parser and Markdown pipeline into one large file.
