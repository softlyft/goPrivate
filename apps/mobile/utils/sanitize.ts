/**
 * Sanitize user-generated text to prevent XSS attacks.
 * React Native doesn't render HTML by default, but we sanitize for consistency.
 */

export function sanitizeMessageText(text: string): string {
  return text.trim().replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
