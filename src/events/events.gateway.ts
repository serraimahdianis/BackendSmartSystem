import { UnauthorizedException } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token || client.handshake.query?.token;
    if (!token) {
      client.emit('error', { message: 'Authentication required' });
      client.disconnect();
      return;
    }

    try {
      const secret = process.env.JWT_SECRET || 'fallback_secret';
      const decoded = jwt.verify(token as string, secret);
      (client as any).user = decoded;
      console.log(`Client authenticated: ${client.id} (${(decoded as any).role || 'unknown'})`);
    } catch (err) {
      client.emit('error', { message: 'Invalid or expired token' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:session')
  handleJoinSession(client: Socket, sessionId: string) {
    client.join(`session:${sessionId}`);
    console.log(`${client.id} joined session:${sessionId}`);
  }

  @SubscribeMessage('leave:session')
  handleLeaveSession(client: Socket, sessionId: string) {
    client.leave(`session:${sessionId}`);
    console.log(`${client.id} left session:${sessionId}`);
  }

  @SubscribeMessage('join:teacher')
  handleJoinTeacher(client: Socket, teacherId: string) {
    client.join(`teacher:${teacherId}`);
    console.log(`${client.id} joined teacher:${teacherId}`);
  }

  @SubscribeMessage('leave:teacher')
  handleLeaveTeacher(client: Socket, teacherId: string) {
    client.leave(`teacher:${teacherId}`);
    console.log(`${client.id} left teacher:${teacherId}`);
  }

  @SubscribeMessage('join:group')
  handleJoinGroup(client: Socket, group: string) {
    client.join(`group:${group}`);
    console.log(`${client.id} joined group:${group}`);
  }

  @SubscribeMessage('leave:group')
  handleLeaveGroup(client: Socket, group: string) {
    client.leave(`group:${group}`);
    console.log(`${client.id} left group:${group}`);
  }

  emitAttendanceScan(payload: {
    sessionId: string;
    studentId: string;
    studentName: string;
    status: string;
    scanTime: string;
  }) {
    this.server.to(`session:${payload.sessionId}`).emit('attendance:scan', payload);
  }

  emitAttendanceStatusChanged(payload: {
    sessionId: string;
    studentId: string;
    oldStatus: string;
    newStatus: string;
  }) {
    this.server.to(`session:${payload.sessionId}`).emit('attendance:status-changed', payload);
  }

  emitFraudAlert(payload: {
    sessionId: string;
    studentId: string;
    reason: string;
    riskScore: number;
  }) {
    this.server.to(`session:${payload.sessionId}`).emit('attendance:fraud-alert', payload);
    this.server.to(`teacher:${payload.sessionId}`).emit('attendance:fraud-alert', payload);
  }

  emitSessionStarted(payload: {
    sessionId: string;
    moduleId: string;
    moduleName: string;
    group: string;
    teacherId: string;
    startTime: string;
  }) {
    this.server.to(`group:${payload.group}`).emit('session:started', payload);
    this.server.to(`teacher:${payload.teacherId}`).emit('session:started', payload);
  }

  emitSessionEnded(payload: {
    sessionId: string;
    teacherId: string;
  }) {
    this.server.to(`session:${payload.sessionId}`).emit('session:ended', payload);
    this.server.to(`teacher:${payload.teacherId}`).emit('session:ended', payload);
  }
}
