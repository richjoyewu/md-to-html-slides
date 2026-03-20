/**
 * Shared SVG icon system for all slide themes.
 * Each icon is a 24x24 SVG suitable for inline use.
 */

const ICONS = {
  // Content / Expression
  translate: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h7M7.5 5v7M5 8.5c1 2 3 4.5 5.5 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 14l2.5-6L18 14M13.75 12.5h3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5 11a7 7 0 0014 0M12 18v3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  layers: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l8 4-8 4-8-4 8-4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M4 12l8 4 8-4M4 16l8 4 8-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  puzzle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4a2 2 0 014 0h4v4a2 2 0 010 4v4H15a2 2 0 01-4 0H7v-4a2 2 0 010-4V5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  zap: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2L4 14h8l-1 8 9-12h-8l1-8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  target: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg>',
  users: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="7" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3 20c0-3 3-5.5 6-5.5s6 2.5 6 5.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="8" r="2.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M17 13.5c2 0 4 1.5 4 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  rocket: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C8 6 6 10 6 14l6 6c4 0 8-2 12-6C20 10 16 6 12 2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="12" r="2" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M6 14l-3 3M18 14l3 3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  compass: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M16 8l-5.5 2.5L8 16l5.5-2.5z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  bulb: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M9 14c-1.5-1.3-2.5-3.2-2.5-5.3C6.5 5.5 9 3 12 3s5.5 2.5 5.5 5.7c0 2.1-1 4-2.5 5.3v1H9v-1z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V10M9 19V6M14 19v-8M19 19V4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3L4 7v5c0 4.5 3.5 8.5 8 9.5 4.5-1 8-5 8-9.5V7l-8-4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 12l2 2 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  globe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/><ellipse cx="12" cy="12" rx="4" ry="9" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M3 12h18M4.5 7.5h15M4.5 16.5h15" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>',
  book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h5c2 0 3 1 3 2v14c0-1-1-2-3-2H4V4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M20 4h-5c-2 0-3 1-3 2v14c0-1 1-2 3-2h5V4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2 5.5L19.5 9l-5.5 2L12 16.5 10 11 4.5 9l5.5-1.5L12 2z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M17 14l1 2.5 2.5 1-2.5 1L17 21l-1-2.5L13.5 17.5 16 16.5 17 14z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
  arrow_right: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h12M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  trending: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17l5-5 3 2 7-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 7h4v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  check_list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7l2 2 4-4M4 17l2 2 4-4M14 6h6M14 12h6M14 18h6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

/**
 * Keyword → icon mapping for Chinese and English slide titles.
 * Order matters: first match wins.
 */
const KEYWORD_MAP = [
  { keywords: ['表达', '语言', '翻译', '转译', 'express', 'translate'], icon: 'translate' },
  { keywords: ['演讲', '讲', '说', 'speech', 'speak', 'present'], icon: 'mic' },
  { keywords: ['内容', '文档', '文本', '文字', 'content', 'document', 'text'], icon: 'book' },
  { keywords: ['用户', '受众', '客户', 'user', 'audience', 'customer'], icon: 'users' },
  { keywords: ['产品', '目标', 'product', 'goal'], icon: 'target' },
  { keywords: ['工具', '系统', '生成', 'tool', 'system', 'generate'], icon: 'puzzle' },
  { keywords: ['核心', '价值', '关键', 'core', 'value', 'key'], icon: 'sparkle' },
  { keywords: ['场景', '应用', '服务', 'scenario', 'apply', 'serve'], icon: 'grid' },
  { keywords: ['未来', '长期', '形态', '边界', 'future', 'vision', 'boundary'], icon: 'compass' },
  { keywords: ['为什么', '做', '时机', 'why', 'when', 'timing'], icon: 'trending' },
  { keywords: ['验证', '希望', '一起', 'validate', 'together'], icon: 'check_list' },
  { keywords: ['当前', '第一步', '起点', 'current', 'start', 'first'], icon: 'rocket' },
  { keywords: ['简单', '清晰', '高效', 'simple', 'clear', 'efficient'], icon: 'zap' },
  { keywords: ['安全', '保护', 'security', 'protect'], icon: 'shield' },
  { keywords: ['全球', '市场', 'global', 'market'], icon: 'globe' },
  { keywords: ['数据', '指标', '增长', 'data', 'metric', 'growth'], icon: 'chart' },
  { keywords: ['看', '视觉', '展示', 'visual', 'view', 'display'], icon: 'eye' },
  { keywords: ['结构', '层', '体系', 'structure', 'layer'], icon: 'layers' },
  { keywords: ['想法', '灵感', '创意', 'idea', 'inspire'], icon: 'bulb' },
];

/**
 * Pick an icon SVG for a slide based on its title.
 * Falls back to a rotating set of geometric icons if no keyword matches.
 */
export const pickSlideIcon = (title = '', index = 0) => {
  const lower = title.toLowerCase();
  for (const entry of KEYWORD_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return ICONS[entry.icon];
    }
  }
  // Fallback: cycle through visually distinct icons
  const fallbacks = ['layers', 'compass', 'sparkle', 'grid', 'zap', 'globe'];
  return ICONS[fallbacks[index % fallbacks.length]];
};

/**
 * Get a specific icon by name.
 */
export const getIcon = (name) => ICONS[name] || ICONS.sparkle;

/**
 * Get all available icon names.
 */
export const getIconNames = () => Object.keys(ICONS);
