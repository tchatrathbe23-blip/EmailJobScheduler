import { redisClient } from '../config/redis';
import { prisma } from '../config/db';
import { config } from '../config/env';
import { slackService } from './slackService';

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  hourWindow: string;
  nextWindowStart?: Date;
  retryDelayMs?: number;
}

export class RateLimiterService {
  /**
   * Helper to format current hour window e.g. "2026-11-02T02:00:00.000Z"
   */
  public getHourWindow(date: Date = new Date()): string {
    const d = new Date(date);
    d.setMinutes(0, 0, 0);
    return d.toISOString();
  }

  /**
   * Calculates the exact start time of the next hour window
   */
  public getNextHourWindow(date: Date = new Date()): Date {
    const d = new Date(date);
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d;
  }

  /**
   * Fetch configured limit for sender, or fall back to default
   */
  public async getSenderLimit(senderEmail: string, customLimit?: number | null): Promise<number> {
    if (customLimit && customLimit > 0) {
      return customLimit;
    }

    try {
      const senderConfig = await prisma.senderConfig.findUnique({
        where: { email: senderEmail },
      });
      if (senderConfig?.hourlyLimit) {
        return senderConfig.hourlyLimit;
      }
    } catch {
      // In case DB is offline or table is empty
    }

    return config.maxEmailsPerHourDefault;
  }

  /**
   * Atomic check and consume an email send slot for sender within the current hour window.
   */
  public async checkAndConsumeSlot(
    senderEmail: string,
    userId?: string | null,
    customLimit?: number | null
  ): Promise<RateLimitCheckResult> {
    const now = new Date();
    const hourWindow = this.getHourWindow(now);
    const limit = await this.getSenderLimit(senderEmail, customLimit);
    const key = `ratelimit:${senderEmail}:${hourWindow}`;

    try {
      // Read current counter first
      const currentRaw = await redisClient.get(key);
      const currentCount = currentRaw ? parseInt(currentRaw, 10) : 0;

      if (currentCount >= limit) {
        const nextWindowStart = this.getNextHourWindow(now);
        // Add a small jitter (0-2000ms) to avoid all rescheduled jobs hitting simultaneously
        const jitter = Math.floor(Math.random() * 2000);
        const retryDelayMs = Math.max(1000, nextWindowStart.getTime() - now.getTime() + jitter);

        // Check if Slack has already been alerted for this sender and hour window
        const alertKey = `ratelimit_alert:${senderEmail}:${hourWindow}`;
        const alreadyAlerted = await redisClient.get(alertKey);

        if (!alreadyAlerted) {
          await redisClient.set(alertKey, '1', 'EX', 7200); // 2 hours
          console.log(`[RateLimiter] Sender ${senderEmail} reached hourly limit (${currentCount}/${limit}). Triggering Slack alert...`);
          
          // Asynchronously notify Slack without blocking worker
          slackService.notifyRateLimitHit({
            userId,
            senderEmail,
            hourWindow,
            limit,
            count: currentCount,
            rescheduledTo: nextWindowStart,
          }).catch(err => console.error('[RateLimiter] Slack alert error:', err.message));
        }

        return {
          allowed: false,
          currentCount,
          limit,
          hourWindow,
          nextWindowStart,
          retryDelayMs,
        };
      }

      // Increment atomically
      const newCount = await redisClient.incr(key);
      if (newCount === 1) {
        // Expire key in 2 hours
        await redisClient.expire(key, 7200);
      }

      return {
        allowed: true,
        currentCount: newCount,
        limit,
        hourWindow,
      };
    } catch (err: any) {
      console.warn(`[RateLimiter] Redis error (${err.message}). Safe fallback allowing job to proceed.`);
      return {
        allowed: true,
        currentCount: 1,
        limit,
        hourWindow,
      };
    }
  }

  /**
   * Get current usage stats for a sender
   */
  public async getSenderUsage(senderEmail: string): Promise<{ currentCount: number; limit: number; hourWindow: string }> {
    const hourWindow = this.getHourWindow();
    const key = `ratelimit:${senderEmail}:${hourWindow}`;
    const limit = await this.getSenderLimit(senderEmail);

    try {
      const currentRaw = await redisClient.get(key);
      const currentCount = currentRaw ? parseInt(currentRaw, 10) : 0;
      return { currentCount, limit, hourWindow };
    } catch {
      return { currentCount: 0, limit, hourWindow };
    }
  }
}

export const rateLimiter = new RateLimiterService();
