import { SESSION_ID_PATTERN } from '@goprivate/protocol';

export function extractSessionId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const fromUrl = sessionIdFromUrl(trimmed);
  if (fromUrl) return fromUrl;

  const pathMatch = trimmed.match(/(?:^|\/)chat\/([a-f0-9]{16,64})(?:[/?#]|$)/i);
  if (pathMatch?.[1] && SESSION_ID_PATTERN.test(pathMatch[1])) {
    return pathMatch[1];
  }

  return SESSION_ID_PATTERN.test(trimmed) ? trimmed : null;
}

function sessionIdFromUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    const parts = url.pathname.split('/').filter(Boolean);

    const chatIndex = parts.indexOf('chat');
    const fromPath = chatIndex >= 0 ? parts[chatIndex + 1] : undefined;
    if (fromPath && SESSION_ID_PATTERN.test(fromPath)) {
      return fromPath;
    }

    if (url.protocol === 'goprivate:') {
      if (url.hostname === 'chat') {
        const id = parts[0];
        if (id && SESSION_ID_PATTERN.test(id)) return id;
      }
      if (url.hostname && SESSION_ID_PATTERN.test(url.hostname)) {
        return url.hostname;
      }
    }
  } catch {
    // not a URL
  }

  const custom = raw.match(/^goprivate:\/\/(?:chat\/)?([a-f0-9]{16,64})/i);
  return custom?.[1] && SESSION_ID_PATTERN.test(custom[1]) ? custom[1] : null;
}

export function chatHref(
  sessionId: string,
  options?: { host?: boolean },
): {
  pathname: '/chat/[sessionId]';
  params: { sessionId: string; host?: string };
} {
  return {
    pathname: '/chat/[sessionId]',
    params: options?.host ? { sessionId, host: '1' } : { sessionId },
  };
}
