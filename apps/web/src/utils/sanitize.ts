import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes user input to prevent XSS attacks.
 *
 * goPrivate chat messages are plain text only, so we strip all HTML tags
 * and only preserve line breaks and basic text content.
 *
 * This provides defense-in-depth even though messages are:
 * 1. End-to-end encrypted (relay can't inject malicious content)
 * 2. Vault-encrypted at rest (attacker needs PIN to read)
 *
 * However, a compromised client or malicious browser extension could
 * potentially inject HTML/JavaScript into the decrypted plaintext.
 */
export function sanitizeMessageText(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Configure DOMPurify to allow no HTML tags (text only)
  const clean = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true, // Keep text content even when stripping tags
  });

  // Trim excessive whitespace but preserve intentional line breaks
  return clean.trim();
}

/**
 * Escapes text for safe display in HTML contexts.
 * Use this when you need the raw text to be HTML-escaped.
 */
export function escapeHtml(text: string): string {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
