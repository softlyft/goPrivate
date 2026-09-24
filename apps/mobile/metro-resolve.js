/**
 * Map TypeScript ESM `.js` specifiers to source files, preferring platform
 * variants so `platform.native.ts` wins over `platform.ts` on iOS/Android.
 */
function jsImportToTsCandidates(moduleName, platform) {
  if (!moduleName.startsWith('.') || !moduleName.endsWith('.js')) {
    return [];
  }

  const base = moduleName.slice(0, -3);
  const candidates = [];

  if (platform && platform !== 'web') {
    candidates.push(`${base}.${platform}.ts`, `${base}.${platform}.tsx`);
    candidates.push(`${base}.native.ts`, `${base}.native.tsx`);
  }

  candidates.push(`${base}.ts`, `${base}.tsx`);
  return candidates;
}

module.exports = { jsImportToTsCandidates };
