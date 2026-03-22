import { renderDarkCardDeck } from './dark-card.mjs';
import { renderEditorialLightDeck } from './editorial-light.mjs';
import { renderTechLaunchDeck } from './tech-launch.mjs';

export const THEMES = [
  {
    name: 'dark-card',
    label: 'Dark Card',
    description: 'Deep dark background, editorial display typography, high-contrast product deck styling.',
    swatches: ['#0b0e14', '#ff7a45', '#76b8ff'],
    renderer: renderDarkCardDeck
  },
  {
    name: 'tech-launch',
    label: 'Tech Launch',
    description: 'Neon product-launch theme tuned for hero claims, comparisons, metrics, and CTA slides.',
    swatches: ['#040814', '#71f4ff', '#7f86ff'],
    renderer: renderTechLaunchDeck
  },
  {
    name: 'editorial-light',
    label: 'Editorial Light',
    description: 'Warm paper background, serif-led editorial layout, print-inspired accents.',
    swatches: ['#f8f4ec', '#c96b4d', '#a8d8ea'],
    renderer: renderEditorialLightDeck
  }
];

export const THEME_MAP = new Map(THEMES.map((theme) => [theme.name, theme]));

export const getTheme = (themeName) => THEME_MAP.get(themeName);
