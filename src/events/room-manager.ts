export interface WSClient {
  url?: string;
  readyState: number;
  send(data: string): void;
  close(): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
}

const WS_OPEN = 1;

export class RoomManager {
  private rooms = new Map<string, Set<WSClient>>();

  join(room: string, client: WSClient) {
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room)!.add(client);
  }

  leave(room: string, client: WSClient) {
    this.rooms.get(room)?.delete(client);
    if (this.rooms.get(room)?.size === 0) {
      this.rooms.delete(room);
    }
  }

  to(room: string): Set<WSClient> {
    return this.rooms.get(room) ?? new Set();
  }

  removeClient(client: WSClient) {
    for (const [room, clients] of this.rooms) {
      clients.delete(client);
      if (clients.size === 0) {
        this.rooms.delete(room);
      }
    }
  }

  send(client: WSClient, event: string, data: unknown) {
    if (client.readyState === WS_OPEN) {
      client.send(JSON.stringify({ event, data }));
    }
  }

  broadcast(room: string, event: string, data: unknown) {
    const payload = JSON.stringify({ event, data });
    for (const client of this.to(room)) {
      if (client.readyState === WS_OPEN) {
        client.send(payload);
      }
    }
  }
}
