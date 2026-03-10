import { renderDarkCardDeck } from './dark-card.mjs';
import { renderEditorialLightDeck } from './editorial-light.mjs';

export const THEMES = [
  {
    name: 'dark-card',
    label: 'Dark Card',
    description: 'Deep dark background, editorial display typography, high-contrast product deck styling.',
    renderer: renderDarkCardDeck
  },
  {
    name: 'editorial-light',
    label: 'Editorial Light',
    description: 'Warm paper background, serif-led editorial layout, print-inspired accents.',
    renderer: renderEditorialLightDeck
  }
];

export const THEME_MAP = new Map(THEMES.map((theme) => [theme.name, theme.renderer]));
