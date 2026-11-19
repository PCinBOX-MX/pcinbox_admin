/** Opciones de socket.io-client (tipos locales: @types v1 choca con el cliente v4). */
export type SocketClientOptions = {
  transports?: string[];
  upgrade?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  timeout?: number;
};

/**
 * Con PM2 cluster (≥2 workers), el polling de Engine.IO hace 400
 * ("Session ID unknown") si el sid cae en otro worker.
 * WebSocket evita sticky sessions; el Redis Adapter del server sigue
 * haciendo falta para que io.emit llegue entre instancias.
 */
export function getSocketClientOptions(
  overrides: SocketClientOptions = {},
): SocketClientOptions {
  return {
    transports: ["websocket"],
    upgrade: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    ...overrides,
  };
}
