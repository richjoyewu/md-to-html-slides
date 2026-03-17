import { renderDarkCardDeck } from './dark-card.mjs';

export const renderSignalBlueDeck = (deck, options = {}) => {
  return renderDarkCardDeck(deck, { ...options, theme: 'signal-blue' })
    .replace('--accent: #ff7a45;', '--accent: #59a6ff;')
    .replace('--accent-soft: #ffb48a;', '--accent-soft: #9bcbff;')
    .replace('--accent-alt: #76b8ff;', '--accent-alt: #7ce6bb;')
    .replace('OpenClaw Deck', 'Signal Blue Deck');
};
