import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { resolveSkill, validateSkillInput } from '../shared/skills.js';
import { validateSkillDirectory } from './skill-loader.js';

interface SkillCheckResult {
  case_id: string;
  kind: 'positive' | 'negative' | 'directory';
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

const expectDirectoryValid = (caseId: string, relativePath: string): SkillCheckResult => {
  const report = validateSkillDirectory(relativePath);
  assert(report.loaded > 0, `[${caseId}] expected at least one loaded skill`);
  return {
    case_id: caseId,
    kind: 'directory',
    status: 'passed',
    detail: `${report.loaded} skills`
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

const expectDirectoryInvalid = (
  caseId: string,
  files: Record<string, unknown>,
  pattern: RegExp
): SkillCheckResult => {
  const dir = mkdtempSync(path.join(tmpdir(), 'md-to-html-slides-skill-dir-'));
  Object.entries(files).forEach(([relative, payload]) => {
    const target = path.join(dir, relative);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, JSON.stringify(payload, null, 2), 'utf8');
  });

  try {
    validateSkillDirectory(dir);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert(pattern.test(message), `[${caseId}] unexpected directory error: ${message}`);
    return {
      case_id: caseId,
      kind: 'directory',
      status: 'passed',
      detail: message
    };
  }

  throw new Error(`[${caseId}] expected directory validation to fail`);
};

const results: SkillCheckResult[] = [
  expectValid('official-founder-pitch', 'skills/founder-pitch.json'),
  expectValid('template-general', 'skills/templates/general-template.json'),
  expectValid('template-pitch-tech-launch', 'skills/templates/pitch-tech-launch-template.json'),
  expectDirectoryValid('project-skills-directory', 'skills'),
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
  ),
  expectDirectoryInvalid(
    'duplicate-local-id',
    {
      'a.json': { version: 'skill-file@1', id: 'dup-skill', base_skill: 'general' },
      'nested/b.json': { version: 'skill-file@1', id: 'dup-skill', base_skill: 'general' }
    },
    /Duplicate skill id/
  ),
  expectDirectoryInvalid(
    'circular-local-inheritance',
    {
      'a.json': { version: 'skill-file@1', id: 'loop-a', base_skill: 'loop-b' },
      'b.json': { version: 'skill-file@1', id: 'loop-b', base_skill: 'loop-a' }
    },
    /Circular local skill inheritance/
  ),
  expectDirectoryInvalid(
    'builtin-conflict',
    {
      'general.json': { version: 'skill-file@1', id: 'general', base_skill: 'general' }
    },
    /conflicts with existing skill/
  )
];

const summary = {
  total_cases: results.length,
  positive_cases: results.filter((item) => item.kind === 'positive').length,
  negative_cases: results.filter((item) => item.kind === 'negative').length
};

console.log(JSON.stringify({ summary, results }, null, 2));
console.log('\nskill schema checks passed');
