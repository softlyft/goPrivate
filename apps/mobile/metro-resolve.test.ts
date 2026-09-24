import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { jsImportToTsCandidates } = require('./metro-resolve.js') as {
  jsImportToTsCandidates: (moduleName: string, platform?: string | null) => string[];
};

describe('jsImportToTsCandidates', () => {
  it('prefers platform.native.ts over platform.ts on android', () => {
    const candidates = jsImportToTsCandidates('./platform.js', 'android');
    expect(candidates.indexOf('./platform.native.ts')).toBeGreaterThan(-1);
    expect(candidates.indexOf('./platform.native.ts')).toBeLessThan(candidates.indexOf('./platform.ts'));
  });

  it('prefers platform.native.ts over platform.ts on ios', () => {
    const candidates = jsImportToTsCandidates('./platform.js', 'ios');
    expect(candidates.indexOf('./platform.native.ts')).toBeLessThan(candidates.indexOf('./platform.ts'));
  });

  it('does not pick native files for web', () => {
    expect(jsImportToTsCandidates('./platform.js', 'web')).toEqual(['./platform.ts', './platform.tsx']);
  });
});
