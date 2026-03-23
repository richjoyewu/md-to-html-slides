import { readFileSync } from 'node:fs';
import path from 'node:path';
import { buildIngestArtifact } from '../agent/analysis.js';
import { validateIngest } from '../shared/core.js';

const FIXTURE_PATH = path.resolve(process.cwd(), 'fixtures', 'product', 'extreme', 'product-intro.md');

const assert = (condition: unknown, message: string): void => {
  if (!condition) throw new Error(message);
};

const markdown = readFileSync(FIXTURE_PATH, 'utf8');
const ingest = validateIngest(buildIngestArtifact(markdown));

assert(ingest.contract_version === 'ingest@1', 'Invalid ingest contract version');
assert(ingest.block_count === ingest.blocks.length, 'Ingest block_count mismatch');
assert(ingest.blocks.length > 0, 'Ingest should include blocks');
assert(Boolean(ingest.title_hint), 'Ingest should include title_hint');

const result = {
  case_id: path.relative(process.cwd(), FIXTURE_PATH),
  title_hint: ingest.title_hint,
  source_type_hint: ingest.source_type_hint,
  block_count: ingest.block_count,
  block_kinds: Array.from(new Set(ingest.blocks.map((block) => block.kind)))
};

console.log(JSON.stringify({ result }, null, 2));
console.log('\ningest contract checks passed');
