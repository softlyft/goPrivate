#!/usr/bin/env node
/**
 * Apply .github/rulesets/main.json to the GitHub repository via the Rulesets API.
 * Usage: node scripts/apply-git-policy.mjs
 * Requires: gh auth with admin on the repo.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rulesetPath = join(root, '.github/rulesets/main.json');
const body = JSON.parse(readFileSync(rulesetPath, 'utf8'));

function ghJson(args) {
  const out = execFileSync('gh', args, { encoding: 'utf8' });
  return out.trim() ? JSON.parse(out) : null;
}

const repo = execFileSync('gh', ['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner'], {
  encoding: 'utf8',
}).trim();

const existing = ghJson(['api', `repos/${repo}/rulesets`]) ?? [];
const current = existing.find((r) => r.name === body.name);

if (current) {
  console.log(`Updating ruleset #${current.id} (${body.name}) on ${repo}…`);
  execFileSync(
    'gh',
    ['api', '-X', 'PUT', `repos/${repo}/rulesets/${current.id}`, '--input', '-'],
    { input: JSON.stringify(body), encoding: 'utf8', stdio: ['pipe', 'inherit', 'inherit'] },
  );
} else {
  console.log(`Creating ruleset (${body.name}) on ${repo}…`);
  execFileSync('gh', ['api', '-X', 'POST', `repos/${repo}/rulesets`, '--input', '-'], {
    input: JSON.stringify(body),
    encoding: 'utf8',
    stdio: ['pipe', 'inherit', 'inherit'],
  });
}

console.log('Done. Verify: Settings → Rules → Rulesets');
