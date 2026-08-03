import type { FastifyInstance } from 'fastify';
import type { ISessionStore } from '../session/store.js';
import { createMessageHandler, handleDisconnect } from '../handlers/messages.js';

export async function registerWebsocket(app: FastifyInstance, store: ISessionStore): Promise<void> {
  const handleMessage = createMessageHandler(store);

  app.get('/ws', { websocket: true }, (socket) => {
    socket.on('message', (raw) => {
      const data = typeof raw === 'string' ? raw : raw.toString();
      handleMessage(socket, data);
    });

    socket.on('close', () => {
      handleDisconnect(store, socket);
    });

    socket.on('error', () => {
      handleDisconnect(store, socket);
    });
  });
}
