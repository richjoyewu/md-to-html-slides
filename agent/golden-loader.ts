import { readFileSync, existsSync } from 'node:fs';

export interface GoldenSlide {
  title: string;
  type?: string;
  notes?: string;
  points?: string[];
}

export interface GoldenOutput {
  deck_goal: string;
  core_message: string;
  slides: GoldenSlide[];
}

// Minimal YAML parser for golden output files.
// Only supports the flat structure used by golden outputs.
export const parseGoldenYaml = (content: string): GoldenOutput => {
  const lines = content.split('\n');
  const result: GoldenOutput = { deck_goal: '', core_message: '', slides: [] };
  let currentSlide: GoldenSlide | null = null;
  let currentList: string[] | null = null;

  for (const raw of lines) {
    const line = raw.trimEnd();

    // Top-level scalar
    if (line.startsWith('deck_goal:')) {
      result.deck_goal = line.slice('deck_goal:'.length).trim();
      continue;
    }
    if (line.startsWith('core_message:')) {
      result.core_message = line.slice('core_message:'.length).trim();
      continue;
    }

    // slides: array start
    if (line.trim() === 'slides:') continue;

    // New slide item
    const slideMatch = line.match(/^\s+-\s+title:\s*(.+)$/);
    if (slideMatch) {
      if (currentSlide) result.slides.push(currentSlide);
      currentSlide = { title: slideMatch[1].trim() };
      currentList = null;
      continue;
    }

    if (!currentSlide) continue;

    // Slide scalar fields
    const typeMatch = line.match(/^\s+type:\s*(.+)$/);
    if (typeMatch) {
      currentSlide.type = typeMatch[1].trim();
      continue;
    }

    const notesMatch = line.match(/^\s+notes:\s*(.+)$/);
    if (notesMatch) {
      currentSlide.notes = notesMatch[1].trim();
      continue;
    }

    // points: array start
    if (line.match(/^\s+points:\s*$/)) {
      currentSlide.points = [];
      currentList = currentSlide.points;
      continue;
    }

    // List item
    const itemMatch = line.match(/^\s+-\s+(.+)$/);
    if (itemMatch && currentList) {
      let value = itemMatch[1].trim();
      // Strip surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      currentList.push(value);
      continue;
    }
  }

  if (currentSlide) result.slides.push(currentSlide);
  return result;
};

export const loadGoldenOutput = (fixturePath: string): GoldenOutput | null => {
  const goldenPath = fixturePath.replace(/\.md$/, '.golden.yaml');
  if (!existsSync(goldenPath)) return null;
  const content = readFileSync(goldenPath, 'utf8');
  return parseGoldenYaml(content);
};

// Extract key Chinese characters/phrases from text for comparison
const extractKeyTerms = (text: string): Set<string> => {
  const terms = new Set<string>();
  // Split by common delimiters and keep meaningful chunks
  const chunks = text
    .replace(/[，。、；：！？\s→—·/|''""「」]/g, ' ')
    .split(/\s+/)
    .filter((chunk) => chunk.length >= 2);
  for (const chunk of chunks) {
    terms.add(chunk);
    // Also add sub-segments for long chunks (>= 6 chars) to improve partial matching
    if (chunk.length >= 6) {
      for (let i = 0; i + 4 <= chunk.length; i += 2) {
        terms.add(chunk.slice(i, i + 4));
      }
    }
  }
  return terms;
};

// Character bigram Jaccard similarity — catches semantic overlap that term-level misses
const bigramJaccard = (a: string, b: string): number => {
  const clean = (s: string) => s.replace(/[，。、；：！？\s→—·/|''""「」a-zA-Z0-9]/g, '');
  const ca = clean(a);
  const cb = clean(b);
  if (ca.length < 2 || cb.length < 2) return 0;
  const bigrams = (s: string): Set<string> => {
    const set = new Set<string>();
    for (let i = 0; i + 1 < s.length; i++) set.add(s.slice(i, i + 2));
    return set;
  };
  const setA = bigrams(ca);
  const setB = bigrams(cb);
  let intersection = 0;
  for (const bg of setA) {
    if (setB.has(bg)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
};

const termOverlap = (a: string, b: string): number => {
  const termsA = extractKeyTerms(a);
  const termsB = extractKeyTerms(b);
  if (!termsA.size || !termsB.size) return 0;
  let matches = 0;
  for (const term of termsA) {
    for (const other of termsB) {
      if (term.includes(other) || other.includes(term)) {
        matches += 1;
        break;
      }
    }
  }
  const overlap = matches / Math.max(termsA.size, termsB.size);
  // Use bigram Jaccard as a floor — it catches synonym-level similarity
  const bigram = bigramJaccard(a, b);
  return Math.max(overlap, bigram);
};

// Score how close the LLM slide count is to golden
export const scoreGoldenSlideCount = (goldenCount: number, actualCount: number): number => {
  const diff = Math.abs(goldenCount - actualCount);
  if (diff === 0) return 1;
  if (diff === 1) return 0.85;
  if (diff === 2) return 0.6;
  if (diff === 3) return 0.3;
  return 0;
};

// Score how well LLM titles cover golden titles (topic coverage)
export const scoreGoldenTitleCoverage = (
  goldenTitles: string[],
  actualTitles: string[]
): number => {
  if (!goldenTitles.length) return 1;
  let covered = 0;
  for (const golden of goldenTitles) {
    const bestMatch = Math.max(...actualTitles.map((actual) => termOverlap(golden, actual)));
    if (bestMatch >= 0.2) covered += 1;
  }
  return covered / goldenTitles.length;
};

// Score deck_goal similarity to golden
export const scoreGoldenDeckGoal = (goldenGoal: string, actualGoal: string): number => {
  if (!goldenGoal || !actualGoal) return 0;
  return termOverlap(goldenGoal, actualGoal);
};

// Score core_message similarity to golden
export const scoreGoldenCoreMessage = (goldenMessage: string, actualMessage: string): number => {
  if (!goldenMessage || !actualMessage) return 0;
  return termOverlap(goldenMessage, actualMessage);
};
