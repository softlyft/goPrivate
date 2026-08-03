import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { sweepExpiredSessions } from './handlers/messages.js';
import { InMemorySessionStore } from './session/store.js';
import { registerWebsocket } from './websocket/index.js';

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? '0.0.0.0';
const SWEEP_INTERVAL_MS = 5_000;

async function main() {
  const app = Fastify({ logger: true });
  const store = new InMemorySessionStore();

  await app.register(cors, { origin: true });
  await app.register(websocket);

  app.get('/health', async () => ({
    status: 'ok',
    sessions: store.size(),
  }));

  await registerWebsocket(app, store);

  const sweeper = setInterval(() => {
    const removed = sweepExpiredSessions(store);
    if (removed > 0) {
      app.log.info({ removed }, 'expired sessions swept');
    }
  }, SWEEP_INTERVAL_MS);
  sweeper.unref();

  await app.listen({ port: PORT, host: HOST });
  app.log.info(`goPrivate relay listening on ${HOST}:${PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
