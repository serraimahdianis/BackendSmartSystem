import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import {
  FraudEvent,
  FraudEventDocument,
  FraudReasonCode,
} from './fraud-event.schema';
import { EventsGateway } from '../events/events.gateway';

interface ScanContext {
  sessionId: string;
  studentId: string;
  teacherId?: string;
  rfidCode?: string;
  deviceId?: string;
  ipAddress?: string;
  scanTime: Date;
  method: 'RFID' | 'QR' | 'MANUAL';
}

interface FraudCheckResult {
  rejected: boolean;
  reasonCode?: FraudReasonCode;
  description?: string;
  riskScore: number;
  fraudEvent?: FraudEvent;
}

@Injectable()
export class AntiFraudService {
  private readonly logger = new Logger(AntiFraudService.name);

  private recentScans: Map<string, { studentId: string; timestamp: number }[]> =
    new Map();

  constructor(
    @InjectModel(FraudEvent.name)
    private fraudEventModel: Model<FraudEventDocument>,
    private configService: ConfigService,
    private eventsGateway: EventsGateway,
  ) {}

  getDuplicateInterval(): number {
    return (
      this.configService.get<number>('FRAUD_DUPLICATE_INTERVAL_MS') ?? 30000
    );
  }

  getVelocityWindowMs(): number {
    return this.configService.get<number>('FRAUD_VELOCITY_WINDOW_MS') ?? 5000;
  }

  getVelocityThreshold(): number {
    return this.configService.get<number>('FRAUD_VELOCITY_THRESHOLD') ?? 3;
  }

  getSuspiciousScoreLimit(): number {
    return this.configService.get<number>('FRAUD_SUSPICIOUS_SCORE_LIMIT') ?? 50;
  }

  async checkAndRecord(ctx: ScanContext): Promise<FraudCheckResult> {
    let totalRiskScore = 0;
    let rejected = false;
    let finalReasonCode: FraudReasonCode | undefined;
    let finalDescription: string | undefined;
    let fraudEvent: FraudEvent | undefined;

    // Rule 1: Duplicate scan detection (same student in same session within interval)
    const duplicateCheck = await this.checkDuplicateScan(ctx);
    if (duplicateCheck) {
      rejected = true;
      totalRiskScore += 30;
      finalReasonCode = 'DUPLICATE_SCAN';
      finalDescription = duplicateCheck;
      fraudEvent = await this.persistFraudEvent({
        sessionId: ctx.sessionId,
        studentId: ctx.studentId,
        reasonCode: 'DUPLICATE_SCAN',
        description: duplicateCheck,
        riskScore: 30,
        metadata: { method: ctx.method, scanTime: ctx.scanTime },
      });
      return {
        rejected,
        reasonCode: finalReasonCode,
        description: finalDescription,
        riskScore: totalRiskScore,
        fraudEvent,
      };
    }

    // Rule 2: Minimum inter-scan interval (different students scanned too fast)
    const fastIntervalCheck = this.checkFastInterval(ctx);
    if (fastIntervalCheck) {
      totalRiskScore += 40;
      finalReasonCode = 'FAST_INTERVAL';
      finalDescription = fastIntervalCheck;
      fraudEvent = await this.persistFraudEvent({
        sessionId: ctx.sessionId,
        studentId: ctx.studentId,
        reasonCode: 'FAST_INTERVAL',
        description: fastIntervalCheck,
        riskScore: 40,
        metadata: { method: ctx.method, scanTime: ctx.scanTime },
      });
      this.eventsGateway.emitFraudAlert({
        sessionId: ctx.sessionId,
        studentId: ctx.studentId,
        teacherId: ctx.teacherId!,
        reason: fastIntervalCheck,
        riskScore: 40,
      });
    }

    // Rule 3: Velocity anomaly (too many scans in short window)
    const velocityCheck = this.checkVelocity(ctx);
    if (velocityCheck) {
      totalRiskScore += 50;
      finalReasonCode = 'VELOCITY_ANOMALY';
      finalDescription = velocityCheck;
      fraudEvent = await this.persistFraudEvent({
        sessionId: ctx.sessionId,
        studentId: ctx.studentId,
        reasonCode: 'VELOCITY_ANOMALY',
        description: velocityCheck,
        riskScore: 50,
        metadata: {
          method: ctx.method,
          scanTime: ctx.scanTime,
          totalScansInWindow: this.getRecentScansCount(ctx.sessionId),
        },
      });
      this.eventsGateway.emitFraudAlert({
        sessionId: ctx.sessionId,
        studentId: ctx.studentId,
        teacherId: ctx.teacherId!,
        reason: velocityCheck,
        riskScore: 50,
      });
    }

    // Rule 4: Relay attack detection (artificial delay)
    const relayCheck = this.checkRelayAttack(ctx);
    if (relayCheck) {
      totalRiskScore += 60;
      finalReasonCode = 'RELAY_ATTACK';
      finalDescription = relayCheck;
      fraudEvent = await this.persistFraudEvent({
        sessionId: ctx.sessionId,
        studentId: ctx.studentId,
        reasonCode: 'RELAY_ATTACK',
        description: relayCheck,
        riskScore: 60,
        metadata: { method: ctx.method, scanTime: ctx.scanTime },
      });
      this.eventsGateway.emitFraudAlert({
        sessionId: ctx.sessionId,
        studentId: ctx.studentId,
        teacherId: ctx.teacherId!,
        reason: relayCheck,
        riskScore: 60,
      });
    }

    // Record this scan in recent scans for future checks
    this.recordScan(ctx);

    return {
      rejected,
      reasonCode: finalReasonCode,
      description: finalDescription,
      riskScore: totalRiskScore,
      fraudEvent,
    };
  }

  private async checkDuplicateScan(ctx: ScanContext): Promise<string | null> {
    const interval = this.getDuplicateInterval();
    const existing = await this.fraudEventModel
      .findOne({
        sessionId: ctx.sessionId,
        studentId: ctx.studentId,
        reasonCode: {
          $in: ['DUPLICATE_SCAN', 'FAST_INTERVAL', 'VELOCITY_ANOMALY'],
        },
        createdAt: { $gte: new Date(Date.now() - interval) },
      })
      .exec();

    if (existing) {
      return (
        'Duplicate scan detected for student ' +
        ctx.studentId +
        ' in session ' +
        ctx.sessionId +
        ' within ' +
        interval +
        'ms window'
      );
    }

    return null;
  }

  private checkFastInterval(ctx: ScanContext): string | null {
    const scans = this.recentScans.get(ctx.sessionId);
    if (!scans || scans.length === 0) return null;

    const lastScan = scans[scans.length - 1];
    const elapsed = ctx.scanTime.getTime() - lastScan.timestamp;

    if (elapsed < 1000 && elapsed > 0) {
      return (
        'Fast inter-scan interval: ' +
        elapsed +
        'ms between student ' +
        lastScan.studentId +
        ' and student ' +
        ctx.studentId
      );
    }

    return null;
  }

  private checkVelocity(ctx: ScanContext): string | null {
    const windowMs = this.getVelocityWindowMs();
    const threshold = this.getVelocityThreshold();
    const scans = this.recentScans.get(ctx.sessionId);

    if (!scans || scans.length < threshold - 1) return null;

    const cutoff = ctx.scanTime.getTime() - windowMs;
    const windowedScans = scans.filter((s) => s.timestamp >= cutoff);

    if (windowedScans.length >= threshold) {
      return (
        'Velocity anomaly: ' +
        (windowedScans.length + 1) +
        ' scans in ' +
        windowMs +
        'ms window (threshold: ' +
        threshold +
        ')'
      );
    }

    return null;
  }

  private checkRelayAttack(ctx: ScanContext): string | null {
    if (ctx.method !== 'RFID') return null;
    if (!ctx.scanTime) return null;

    const now = Date.now();
    const diff = now - ctx.scanTime.getTime();

    if (diff > 3000) {
      return (
        'Possible relay attack: scan timestamp is ' +
        diff +
        'ms in the past (threshold: 3000ms)'
      );
    }

    return null;
  }

  private recordScan(ctx: ScanContext): void {
    const key = ctx.sessionId;
    if (!this.recentScans.has(key)) {
      this.recentScans.set(key, []);
    }
    this.recentScans.get(key)!.push({
      studentId: ctx.studentId,
      timestamp: ctx.scanTime.getTime(),
    });

    // Keep only last 100 scans per session
    const scans = this.recentScans.get(key)!;
    if (scans.length > 100) {
      scans.splice(0, scans.length - 100);
    }
  }

  private getRecentScansCount(sessionId: string): number {
    return this.recentScans.get(sessionId)?.length ?? 0;
  }

  private async persistFraudEvent(data: {
    sessionId: string;
    studentId?: string;
    reasonCode: FraudReasonCode;
    description: string;
    riskScore: number;
    metadata?: Record<string, any>;
  }): Promise<FraudEvent> {
    const event = new this.fraudEventModel({
      sessionId: data.sessionId,
      studentId: data.studentId,
      reasonCode: data.reasonCode,
      description: data.description,
      riskScore: data.riskScore,
      metadata: data.metadata ?? {},
    });
    return event.save();
  }

  async getFraudEvents(sessionId: string): Promise<FraudEvent[]> {
    return this.fraudEventModel
      .find({ sessionId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getStudentFraudStats(studentId: string): Promise<any> {
    const events = await this.fraudEventModel.find({ studentId }).exec();
    const totalScore = events.reduce((sum, e) => sum + e.riskScore, 0);
    const byReason = events.reduce(
      (acc, e) => {
        acc[e.reasonCode] = (acc[e.reasonCode] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return { totalEvents: events.length, totalRiskScore: totalScore, byReason };
  }

  cleanupSession(sessionId: string): void {
    this.recentScans.delete(sessionId);
  }
}
