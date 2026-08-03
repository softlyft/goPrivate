import type { WebSocket } from '@fastify/websocket';
import type { RelayToClientMessage } from '@goprivate/protocol';

export function sendToSocket(socket: WebSocket, message: RelayToClientMessage): void {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

export function broadcast(
  sockets: WebSocket[],
  message: RelayToClientMessage,
  exclude?: WebSocket,
): void {
  for (const socket of sockets) {
    if (socket !== exclude) {
      sendToSocket(socket, message);
    }
  }
}
