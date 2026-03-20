#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const distCliPath = path.join(rootDir, 'dist-ts', 'scripts', 'cli.js');
const tscEntrypoint = path.join(rootDir, 'node_modules', 'typescript', 'bin', 'tsc');

const collectLatestMtime = (entryPath) => {
  const stat = statSync(entryPath);
  if (stat.isFile()) return stat.mtimeMs;
  return readdirSync(entryPath).reduce((latest, child) => {
    return Math.max(latest, collectLatestMtime(path.join(entryPath, child)));
  }, stat.mtimeMs);
};

const needsCompile = () => {
  if (!existsSync(distCliPath)) return true;

  const distMtime = statSync(distCliPath).mtimeMs;
  const watchPaths = [
    path.join(rootDir, 'agent'),
    path.join(rootDir, 'scripts'),
    path.join(rootDir, 'shared'),
    path.join(rootDir, 'templates'),
    path.join(rootDir, 'tsconfig.json'),
    path.join(rootDir, 'package.json')
  ];

  return watchPaths.some((watchPath) => existsSync(watchPath) && collectLatestMtime(watchPath) > distMtime);
};

const run = (args, options = {}) => spawnSync(process.execPath, args, {
  cwd: rootDir,
  stdio: 'inherit',
  ...options
});

if (!existsSync(tscEntrypoint)) {
  process.stderr.write('TypeScript compiler not found. Run `npm install` first.\n');
  process.exit(1);
}

if (needsCompile()) {
  const build = run([tscEntrypoint, '-p', path.join(rootDir, 'tsconfig.json'), '--pretty', 'false']);
  if (build.status !== 0) process.exit(build.status ?? 1);
}

const delegated = run([distCliPath, ...process.argv.slice(2)], { cwd: process.cwd() });
process.exit(delegated.status ?? 1);
