import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { MAX_WS_MESSAGE_BYTES } from '@goprivate/protocol';
import { sweepExpiredSessions } from './handlers/messages.js';
import { InMemorySessionStore } from './session/store.js';
import { sweepRateLimits } from './services/limits.js';
import { registerWebsocket } from './websocket/index.js';

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? '0.0.0.0';
const SWEEP_INTERVAL_MS = 5_000;

async function main() {
  const app = Fastify({ logger: true });
  const store = new InMemorySessionStore();
  const connectionCounter = { current: 0 };

  // CORS: Allow specific origins only
  // In production, restrict to known domains
  // In development, allow localhost and local network IPs
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'https://goprivate.app',
    'https://www.goprivate.app',
    ...(process.env.NODE_ENV === 'development'
      ? [
          'http://localhost:3000',
          'http://localhost:3001',
          /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
          /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
        ]
      : []),
  ];

  await app.register(cors, {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Check if origin is in allowed list
      const isAllowed = allowedOrigins.some((allowed) => {
        if (typeof allowed === 'string') {
          return origin === allowed;
        }
        // RegExp for development IPs
        return allowed.test(origin);
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        app.log.warn({ origin }, 'CORS: Origin not allowed');
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: false,
  });
  await app.register(websocket, {
    options: {
      maxPayload: MAX_WS_MESSAGE_BYTES,
    },
  });

  // Security headers middleware
  app.addHook('onSend', async (_request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '1; mode=block');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  });

  app.get('/health', async () => ({
    status: 'ok',
    // Avoid leaking live occupancy details publicly
    ok: true,
  }));

  await registerWebsocket(app, store, connectionCounter);

  const sweeper = setInterval(() => {
    const removed = sweepExpiredSessions(store);
    if (removed > 0) {
      app.log.info({ removed }, 'expired sessions swept');
    }
    sweepRateLimits();
  }, SWEEP_INTERVAL_MS);
  sweeper.unref();

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'shutting down');
    clearInterval(sweeper);
    try {
      await app.close();
    } catch (err) {
      app.log.error({ err }, 'error during shutdown');
    }
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  await app.listen({ port: PORT, host: HOST });
  app.log.info(`goPrivate relay listening on ${HOST}:${PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
