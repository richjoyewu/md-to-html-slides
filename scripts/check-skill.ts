import { readFileSync } from 'node:fs';
import path from 'node:path';
import { resolveSkill, validateSkillInput } from '../shared/skills.js';

interface SkillCheckResult {
  case_id: string;
  kind: 'positive' | 'negative';
  status: 'passed';
  detail: string;
}

const rootDir = process.cwd();

const assert = (condition: unknown, message: string): void => {
  if (!condition) throw new Error(message);
};

const readJson = (relativePath: string): unknown =>
  JSON.parse(readFileSync(path.resolve(rootDir, relativePath), 'utf8'));

const expectValid = (caseId: string, relativePath: string): SkillCheckResult => {
  const payload = readJson(relativePath);
  const validated = validateSkillInput(payload);
  const resolved = resolveSkill(payload);

  assert(validated.id === resolved.id, `[${caseId}] validated id should match resolved id`);
  assert(resolved.version === 'skill@1', `[${caseId}] resolved version should be skill@1`);
  assert(Boolean(resolved.default_theme), `[${caseId}] resolved skill must have default theme`);
  assert(Array.isArray(resolved.planning.rules) && resolved.planning.rules.length > 0, `[${caseId}] planning rules missing`);
  assert(Array.isArray(resolved.expansion.rules) && resolved.expansion.rules.length > 0, `[${caseId}] expansion rules missing`);
  assert(Array.isArray(resolved.blocks.format_guidance) && resolved.blocks.format_guidance.length > 0, `[${caseId}] format guidance missing`);

  return {
    case_id: caseId,
    kind: 'positive',
    status: 'passed',
    detail: resolved.id
  };
};

const expectInvalid = (
  caseId: string,
  payload: unknown,
  pattern: RegExp
): SkillCheckResult => {
  try {
    validateSkillInput(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert(pattern.test(message), `[${caseId}] unexpected error: ${message}`);
    return {
      case_id: caseId,
      kind: 'negative',
      status: 'passed',
      detail: message
    };
  }

  throw new Error(`[${caseId}] expected validation to fail`);
};

const results: SkillCheckResult[] = [
  expectValid('official-founder-pitch', 'skills/founder-pitch.json'),
  expectValid('template-general', 'skills/templates/general-template.json'),
  expectValid('template-pitch-tech-launch', 'skills/templates/pitch-tech-launch-template.json'),
  expectInvalid(
    'missing-id',
    {
      version: 'skill-file@1',
      base_skill: 'general'
    },
    /skill\.id is required/
  ),
  expectInvalid(
    'invalid-base-skill',
    {
      version: 'skill-file@1',
      id: 'invalid-base',
      base_skill: 'not-exists'
    },
    /must reference an existing skill/
  ),
  expectInvalid(
    'invalid-theme',
    {
      version: 'skill-file@1',
      id: 'invalid-theme-skill',
      default_theme: 'paper-red'
    },
    /default_theme must be one of/
  ),
  expectInvalid(
    'invalid-format-guidance',
    {
      version: 'skill-file@1',
      id: 'invalid-format-guidance',
      blocks: {
        format_guidance: [{ when: 'custom block', format: 'masonry' }]
      }
    },
    /format must be one of/
  ),
  expectInvalid(
    'unknown-top-level-key',
    {
      version: 'skill-file@1',
      id: 'unknown-top-level',
      random_field: true
    },
    /contains unsupported keys/
  ),
  expectInvalid(
    'duplicate-built-in-id',
    {
      version: 'skill-file@1',
      id: 'general'
    },
    /already exists/
  )
];

const summary = {
  total_cases: results.length,
  positive_cases: results.filter((item) => item.kind === 'positive').length,
  negative_cases: results.filter((item) => item.kind === 'negative').length
};

console.log(JSON.stringify({ summary, results }, null, 2));
console.log('\nskill schema checks passed');
