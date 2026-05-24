import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import * as jwt from 'jsonwebtoken';
import { IncomingMessage } from 'http';
import { RoomManager, WSClient } from './room-manager';

interface JwtPayload {
  sub: string;
  role: string;
  iat?: number;
  exp?: number;
}

interface AuthenticatedClient extends WSClient {
  user: JwtPayload;
}

const roomManager = new RoomManager();

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  handleConnection(client: WSClient, ...args: any[]) {
    const req = args[0] as IncomingMessage | undefined;
    const reqUrl = req?.url || client.url || '';
    const url = new URL(reqUrl, 'http://localhost');
    const token = url.searchParams.get('token');

    if (!token) {
      this.sendError(client, 'Authentication required');
      client.close();
      return;
    }

    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        this.sendError(client, 'Server JWT secret not configured');
        client.close();
        return;
      }
      const decoded = jwt.verify(token, secret) as JwtPayload;
      (client as AuthenticatedClient).user = decoded;
      console.log(`Client authenticated (${decoded.role || 'unknown'})`);
    } catch {
      this.sendError(client, 'Invalid or expired token');
      client.close();
      return;
    }

    client.on('message', (raw: unknown) => {
      try {
        const text = raw instanceof Buffer ? raw.toString() : String(raw);
        const msg = JSON.parse(text) as { event: string; data: string };
        this.routeMessage(client, msg.event, msg.data);
      } catch {
        this.sendError(client, 'Invalid message format');
      }
    });

    client.on('close', () => {
      roomManager.removeClient(client);
    });
  }

  handleDisconnect(client: WSClient) {
    roomManager.removeClient(client);
  }

  private getRole(client: WSClient): string | undefined {
    return (client as AuthenticatedClient).user?.role;
  }

  private routeMessage(client: WSClient, event: string, data: string) {
    const role = this.getRole(client);

    switch (event) {
      case 'join:session':
        if (role !== 'teacher' && role !== 'admin') {
          this.sendError(client, 'Only teachers can monitor sessions');
          return;
        }
        roomManager.join(`session:${data}`, client);
        break;
      case 'leave:session':
        if (role !== 'teacher' && role !== 'admin') {
          this.sendError(client, 'Only teachers can monitor sessions');
          return;
        }
        roomManager.leave(`session:${data}`, client);
        break;
      case 'join:teacher':
        if (role !== 'teacher' && role !== 'admin') {
          this.sendError(client, 'Only teachers can monitor teacher rooms');
          return;
        }
        roomManager.join(`teacher:${data}`, client);
        break;
      case 'leave:teacher':
        if (role !== 'teacher' && role !== 'admin') {
          this.sendError(client, 'Only teachers can monitor teacher rooms');
          return;
        }
        roomManager.leave(`teacher:${data}`, client);
        break;
      case 'join:group':
        if (role !== 'student') {
          this.sendError(client, 'Only students can join group rooms');
          return;
        }
        roomManager.join(`group:${data}`, client);
        break;
      case 'leave:group':
        if (role !== 'student') {
          this.sendError(client, 'Only students can join group rooms');
          return;
        }
        roomManager.leave(`group:${data}`, client);
        break;
      default:
        this.sendError(client, `Unknown event: ${event}`);
    }
  }

  private sendError(client: WSClient, message: string) {
    roomManager.send(client, 'error', { message });
  }

  emitAttendanceScan(payload: {
    sessionId: string;
    studentId: string;
    studentName: string;
    status: string;
    scanTime: string;
  }) {
    roomManager.broadcast(
      `session:${payload.sessionId}`,
      'attendance:scan',
      payload,
    );
  }

  emitAttendanceStatusChanged(payload: {
    sessionId: string;
    studentId: string;
    oldStatus: string;
    newStatus: string;
  }) {
    roomManager.broadcast(
      `session:${payload.sessionId}`,
      'attendance:status-changed',
      payload,
    );
  }

  emitFraudAlert(payload: {
    sessionId: string;
    studentId: string;
    teacherId: string;
    reason: string;
    riskScore: number;
  }) {
    roomManager.broadcast(
      `session:${payload.sessionId}`,
      'attendance:fraud-alert',
      payload,
    );
    roomManager.broadcast(
      `teacher:${payload.teacherId}`,
      'attendance:fraud-alert',
      payload,
    );
  }

  emitSessionStarted(payload: {
    sessionId: string;
    moduleId: string;
    moduleName: string;
    group: string;
    teacherId: string;
    startTime: string;
  }) {
    roomManager.broadcast(`group:${payload.group}`, 'session:started', payload);
    roomManager.broadcast(
      `teacher:${payload.teacherId}`,
      'session:started',
      payload,
    );
  }

  emitSessionEnded(payload: { sessionId: string; teacherId: string }) {
    roomManager.broadcast(
      `session:${payload.sessionId}`,
      'session:ended',
      payload,
    );
    roomManager.broadcast(
      `teacher:${payload.teacherId}`,
      'session:ended',
      payload,
    );
  }
}
