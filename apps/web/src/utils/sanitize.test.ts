import { describe, expect, it } from 'vitest';
import { sanitizeMessageText, escapeHtml } from './sanitize.js';

describe('sanitizeMessageText', () => {
  it('preserves plain text unchanged', () => {
    expect(sanitizeMessageText('Hello, world!')).toBe('Hello, world!');
    expect(sanitizeMessageText('This is a normal message.')).toBe('This is a normal message.');
  });

  it('strips HTML tags', () => {
    expect(sanitizeMessageText('<b>bold text</b>')).toBe('bold text');
    expect(sanitizeMessageText('<script>alert("xss")</script>')).toBe('');
    expect(sanitizeMessageText('<img src="x" onerror="alert(1)">')).toBe('');
  });

  it('prevents XSS via script tags', () => {
    const malicious = '<script>document.cookie</script>Hello';
    const result = sanitizeMessageText(malicious);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('document.cookie');
    expect(result).toBe('Hello');
  });

  it('prevents XSS via event handlers', () => {
    expect(sanitizeMessageText('<div onclick="alert(1)">Click me</div>')).toBe('Click me');
    expect(sanitizeMessageText('<img src=x onerror="alert(1)">')).toBe('');
  });

  it('prevents XSS via javascript: URLs', () => {
    expect(sanitizeMessageText('<a href="javascript:alert(1)">link</a>')).toBe('link');
  });

  it('handles empty and null-ish inputs', () => {
    expect(sanitizeMessageText('')).toBe('');
    expect(sanitizeMessageText('   ')).toBe('');
  });

  it('preserves Unicode and emoji', () => {
    expect(sanitizeMessageText('Hello 👋 世界')).toBe('Hello 👋 世界');
    expect(sanitizeMessageText('Café ☕')).toBe('Café ☕');
  });

  it('preserves line breaks and whitespace within text', () => {
    expect(sanitizeMessageText('Line 1\nLine 2')).toBe('Line 1\nLine 2');
    expect(sanitizeMessageText('Word  spaces  preserved')).toBe('Word  spaces  preserved');
  });

  it('handles special characters', () => {
    // DOMPurify escapes HTML entities for safety
    expect(sanitizeMessageText('Price: $100 & tax < $20')).toBe('Price: $100 &amp; tax &lt; $20');
    expect(sanitizeMessageText('Math: 2 + 2 = 4')).toBe('Math: 2 + 2 = 4');
  });

  it('prevents attribute-based XSS', () => {
    expect(sanitizeMessageText('<div style="background:url(javascript:alert(1))">text</div>')).toBe(
      'text',
    );
  });
});

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<div>test</div>')).toBe('&lt;div&gt;test&lt;/div&gt;');
    expect(escapeHtml('a & b')).toBe('a &amp; b');
    expect(escapeHtml('"quotes"')).toBe('&quot;quotes&quot;');
  });

  it('preserves plain text', () => {
    expect(escapeHtml('plain text')).toBe('plain text');
  });
});
