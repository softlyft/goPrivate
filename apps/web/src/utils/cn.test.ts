import { describe, expect, it } from 'vitest';
import { cn } from './cn.js';

describe('cn', () => {
  it('merges class names and tailwind conflicts', () => {
    expect(cn('px-2', 'px-4', false && 'hidden', 'text-sm')).toContain('px-4');
    expect(cn('px-2', 'px-4')).not.toContain('px-2');
  });
});
