import { Injectable } from '@nestjs/common';

interface NonceEntry {
  nonce: string;
  sessionId: string;
  expiresAt: number;
  used: boolean;
}

@Injectable()
export class NonceService {
  private store = new Map<string, NonceEntry>();

  // Cleanup expired entries every 60 seconds
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
  }

  generate(sessionId: string): { nonce: string; expiresAt: number } {
    const nonce = this.randomHex(16);
    const expiresAt = Date.now() + 30_000; // 30 seconds TTL
    this.store.set(nonce, { nonce, sessionId, expiresAt, used: false });
    return { nonce, expiresAt };
  }

  verify(nonce: string, sessionId: string): boolean {
    const entry = this.store.get(nonce);
    if (!entry) return false;
    if (entry.used) return false;
    if (entry.sessionId !== sessionId) return false;
    if (Date.now() > entry.expiresAt) return false;

    entry.used = true;
    return true;
  }

  private cleanup() {
    const now = Date.now();
    let count = 0;
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      } else {
        count++;
      }
    }
    // Evict oldest entries if store exceeds 10,000
    if (count > 10_000) {
      const sorted = [...this.store.entries()]
        .filter(([, e]) => !e.used)
        .sort((a, b) => a[1].expiresAt - b[1].expiresAt);
      const toRemove = count - 10_000;
      for (let i = 0; i < toRemove && i < sorted.length; i++) {
        this.store.delete(sorted[i][0]);
      }
    }
  }

  private randomHex(length: number): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * 16)];
    }
    return result;
  }
}
