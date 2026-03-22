import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_SKILL,
  listSkills,
  registerResolvedSkill,
  resolveSkill,
  validateResolvedSkill,
  validateSkillInput
} from '../shared/skills.js';

interface SkillFileEntry {
  baseSkill: string;
  filePath: string;
  id: string;
  raw: unknown;
}

interface SkillDirectorySummaryItem {
  base_skill: string;
  default_theme: string;
  file: string;
  id: string;
}

interface ResolvedSkillDirectoryItem extends SkillDirectorySummaryItem {
  resolved: ReturnType<typeof resolveSkill>;
}

export interface SkillDirectoryReport {
  directory: string;
  loaded: number;
  skills: SkillDirectorySummaryItem[];
  resolved_skills: ResolvedSkillDirectoryItem[];
}

const isJsonFile = (filePath: string): boolean => path.extname(filePath).toLowerCase() === '.json';

const collectJsonFiles = (dir: string): string[] => {
  const entries = readdirSync(dir).map((name) => path.join(dir, name));
  return entries.flatMap((entry) => {
    const stat = statSync(entry);
    if (stat.isDirectory()) return collectJsonFiles(entry);
    return isJsonFile(entry) ? [entry] : [];
  });
};

const readSkillId = (payload: unknown, filePath: string): string => {
  const source = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  const value = String(source.id || source.name || '').trim().toLowerCase();
  if (!value) throw new Error(`Skill file ${filePath} is missing id`);
  return value;
};

const readBaseSkill = (payload: unknown): string => {
  const source = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  return String(source.base_skill || source.baseSkill || source.extends || DEFAULT_SKILL).trim().toLowerCase() || DEFAULT_SKILL;
};

const getRuntimeSkillIds = () => new Set(listSkills().map((skill) => skill.id));

const detectDirectoryConflicts = (entries: SkillFileEntry[], existingIds: Set<string>): void => {
  const seen = new Map<string, string>();

  for (const entry of entries) {
    if (existingIds.has(entry.id)) {
      throw new Error(`Local skill id conflicts with existing skill: ${entry.id} (${entry.filePath})`);
    }

    const previous = seen.get(entry.id);
    if (previous) {
      throw new Error(`Duplicate skill id "${entry.id}" found in:\n- ${previous}\n- ${entry.filePath}`);
    }
    seen.set(entry.id, entry.filePath);
  }
};

const topoSortEntries = (entries: SkillFileEntry[]): SkillFileEntry[] => {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const resolved = new Set<string>();
  const visiting = new Set<string>();
  const ordered: SkillFileEntry[] = [];

  const visit = (entry: SkillFileEntry): void => {
    if (resolved.has(entry.id)) return;
    if (visiting.has(entry.id)) {
      throw new Error(`Circular local skill inheritance detected at ${entry.id}`);
    }

    visiting.add(entry.id);
    const dependency = byId.get(entry.baseSkill);
    if (dependency) visit(dependency);
    visiting.delete(entry.id);
    resolved.add(entry.id);
    ordered.push(entry);
  };

  for (const entry of entries) visit(entry);
  return ordered;
};

export const validateSkillDirectory = (dirPath: string): SkillDirectoryReport => {
  const resolvedDir = path.resolve(process.cwd(), dirPath);
  if (!existsSync(resolvedDir)) {
    throw new Error(`Skill directory not found: ${resolvedDir}`);
  }

  const files = collectJsonFiles(resolvedDir);
  const rawEntries = files.map((filePath) => {
    const raw = JSON.parse(readFileSync(filePath, 'utf8'));
    return {
      baseSkill: readBaseSkill(raw),
      filePath,
      id: readSkillId(raw, filePath),
      raw
    };
  });

  const runtimeIds = getRuntimeSkillIds();
  detectDirectoryConflicts(rawEntries, runtimeIds);

  const builtinIds = new Set(runtimeIds);
  const localIds = new Set(rawEntries.map((entry) => entry.id));
  const knownBaseSkills = new Set([...builtinIds, ...localIds]);

  rawEntries.forEach((entry) => {
    validateSkillInput(entry.raw, {
      existingIds: builtinIds,
      knownBaseSkills
    });
  });

  const ordered = topoSortEntries(rawEntries);
  const registry = new Map();
  listSkills().forEach((skill) => {
    registry.set(skill.id, skill);
  });

  const resolvedSkills = ordered.map((entry) => {
    const resolved = resolveSkill(entry.raw, {
      registry,
      existingIds: builtinIds,
      knownBaseSkills
    });
    validateResolvedSkill(resolved);
    registry.set(resolved.id, resolved);
    return {
      base_skill: entry.baseSkill,
      default_theme: resolved.default_theme,
      file: path.relative(process.cwd(), entry.filePath),
      id: resolved.id,
      resolved
    };
  });

  return {
    directory: path.relative(process.cwd(), resolvedDir),
    loaded: resolvedSkills.length,
    resolved_skills: resolvedSkills,
    skills: resolvedSkills.map(({ base_skill, default_theme, file, id }) => ({
      base_skill,
      default_theme,
      file,
      id
    }))
  };
};

export const loadProjectSkills = (cwd: string = process.cwd()): SkillDirectoryReport | null => {
  const defaultDir = path.join(cwd, 'skills');
  if (!existsSync(defaultDir)) return null;

  const report = validateSkillDirectory(defaultDir);
  for (const item of report.resolved_skills) {
    registerResolvedSkill(item.resolved);
  }
  return report;
};
