import type { FastifyInstance } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import { MAX_WS_MESSAGE_BYTES, RelayEvent } from '@goprivate/protocol';
import type { ISessionStore } from '../session/store.js';
import { createMessageHandler, handleDisconnect } from '../handlers/messages.js';
import { canAcceptConnection, getClientIp } from '../services/limits.js';
import { sendToSocket } from '../services/messenger.js';

export async function registerWebsocket(
  app: FastifyInstance,
  store: ISessionStore,
  connectionCounter: { current: number },
): Promise<void> {
  const handleMessage = createMessageHandler(store);

  app.get('/ws', { websocket: true }, (socket, request) => {
    if (!canAcceptConnection(connectionCounter.current)) {
      sendToSocket(socket as unknown as WebSocket, {
        type: RelayEvent.ERROR,
        payload: { code: 'SERVER_BUSY', message: 'Too many connections' },
      });
      try {
        socket.close();
      } catch {
        // ignore
      }
      return;
    }

    connectionCounter.current += 1;
    let closed = false;
    const ip = getClientIp(
      request.headers as Record<string, string | string[] | undefined>,
      request.socket.remoteAddress,
    );

    const ws = socket as unknown as WebSocket;

    socket.on('message', (raw, isBinary) => {
      try {
        if (isBinary) {
          sendToSocket(ws, {
            type: RelayEvent.ERROR,
            payload: { code: 'INVALID_MESSAGE', message: 'Binary frames are not supported' },
          });
          return;
        }

        const data =
          typeof raw === 'string' ? raw : Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw);
        if (Buffer.byteLength(data, 'utf8') > MAX_WS_MESSAGE_BYTES) {
          sendToSocket(ws, {
            type: RelayEvent.ERROR,
            payload: { code: 'PAYLOAD_TOO_LARGE', message: 'Message exceeds size limit' },
          });
          return;
        }

        handleMessage(ws, data, ip);
      } catch (err) {
        app.log.error({ err }, 'websocket message handler failed');
        try {
          sendToSocket(ws, {
            type: RelayEvent.ERROR,
            payload: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' },
          });
        } catch {
          // ignore
        }
      }
    });

    const onEnd = () => {
      if (closed) return;
      closed = true;
      connectionCounter.current = Math.max(0, connectionCounter.current - 1);
      handleDisconnect(store, ws);
    };

    socket.on('close', onEnd);
    socket.on('error', onEnd);
  });
}
