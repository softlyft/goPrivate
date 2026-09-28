#!/usr/bin/env node
/**
 * Issue or rotate a time-limited handle lease.
 *
 * Usage (from repo root):
 *   node tools/issue-handle.mjs alice --days 30
 *
 * Writes the public key + expiry into apps/relay/handles.json (committed).
 * Prints the private key once — send that to the assignee out of band.
 * Never commit the private key.
 */
import { generateKeyPairSync } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultFile = resolve(root, 'apps/relay/handles.json');

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index < 0) return undefined;
  return process.argv[index + 1];
}

const handle = (process.argv[2] ?? '').trim().toLowerCase();
if (!handle || handle.startsWith('-')) {
  console.error('Usage: node tools/issue-handle.mjs <handle> [--days 30] [--out path]');
  process.exit(1);
}

const days = Number(argValue('--days') ?? 30);
if (!Number.isFinite(days) || days <= 0) {
  console.error('--days must be a positive number');
  process.exit(1);
}

const outFile = resolve(argValue('--out') ?? defaultFile);
const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const publicKeyB64 = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
const privateKeyB64 = privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64');

let current = {};
try {
  current = JSON.parse(readFileSync(outFile, 'utf8'));
} catch {
  current = {};
}
if (typeof current !== 'object' || current === null || Array.isArray(current)) {
  current = {};
}

current[handle] = { publicKey: publicKeyB64, expiresAt };
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(current, null, 2)}\n`);

console.log(`Updated ${outFile}`);
console.log('Send the block below to the assignee. Do not commit the private key.\n');
console.log(`handle=${handle}`);
console.log(`expiresAt=${expiresAt}`);
console.log(`publicKey=${publicKeyB64}`);
console.log(`privateKey=${privateKeyB64}`);
