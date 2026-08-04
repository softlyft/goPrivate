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

  await app.register(cors, { origin: true });
  await app.register(websocket, {
    options: {
      maxPayload: MAX_WS_MESSAGE_BYTES,
    },
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
