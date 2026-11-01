import { prisma } from '../config/db';
import { emailQueue, EmailJobData } from '../queues/emailQueue';
import { searchService } from './searchService';

export interface ScheduleEmailInput {
  userId?: string | null;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledAt: Date;
  delayBetweenEmails?: number;
  hourlyLimit?: number;
  batchId?: string;
}

export interface BulkScheduleInput {
  userId?: string | null;
  senderEmail: string;
  recipientEmails: string[];
  subject: string;
  body: string;
  startTime: Date;
  delayBetweenEmails?: number;
  hourlyLimit?: number;
}

export class SchedulerService {
  /**
   * Schedule a single email job
   */
  public async scheduleSingleEmail(input: ScheduleEmailInput): Promise<any> {
    const scheduledTime = new Date(input.scheduledAt);
    const now = Date.now();
    const delayMs = Math.max(0, scheduledTime.getTime() - now);

    // 1. Create record in Database
    const emailRecord = await prisma.emailJob.create({
      data: {
        userId: input.userId || null,
        senderEmail: input.senderEmail,
        recipientEmail: input.recipientEmail,
        subject: input.subject,
        body: input.body,
        status: 'SCHEDULED',
        scheduledAt: scheduledTime,
        delayBetweenEmails: input.delayBetweenEmails || 2000,
        hourlyLimit: input.hourlyLimit || 200,
        batchId: input.batchId || null,
      },
    });

    // 2. Schedule BullMQ delayed job
    const jobPayload: EmailJobData = {
      emailId: emailRecord.id,
      userId: input.userId || null,
      senderEmail: input.senderEmail,
      recipientEmail: input.recipientEmail,
      subject: input.subject,
      body: input.body,
      delayBetweenEmailsMs: input.delayBetweenEmails || 2000,
      hourlyLimit: input.hourlyLimit || 200,
    };

    const bullJob = await emailQueue.add('sendEmail', jobPayload, {
      delay: delayMs,
      jobId: emailRecord.id, // Idempotent job ID prevents duplicate queues
    });

    // 3. Update BullMQ Job ID in DB
    const updated = await prisma.emailJob.update({
      where: { id: emailRecord.id },
      data: { bullJobId: bullJob.id },
    });

    // 4. Index in Elasticsearch
    await searchService.indexEmail(updated);

    return updated;
  }

  /**
   * Schedule bulk emails from CSV or lead list
   */
  public async scheduleBulkEmails(input: BulkScheduleInput): Promise<{
    batchId: string;
    totalScheduled: number;
    firstEmailAt: Date;
    estimatedCompletionAt: Date;
    sampleEmails: any[];
  }> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const baseStartTime = new Date(input.startTime).getTime();
    const delayBetween = input.delayBetweenEmails || 2000;
    const scheduledEmails: any[] = [];

    for (let i = 0; i < input.recipientEmails.length; i++) {
      const recipient = input.recipientEmails[i];
      // Stagger each lead by the specified delay
      const emailScheduledTime = new Date(baseStartTime + (i * delayBetween));

      const email = await this.scheduleSingleEmail({
        userId: input.userId,
        senderEmail: input.senderEmail,
        recipientEmail: recipient,
        subject: input.subject,
        body: input.body,
        scheduledAt: emailScheduledTime,
        delayBetweenEmails: delayBetween,
        hourlyLimit: input.hourlyLimit,
        batchId,
      });

      if (i < 5) {
        scheduledEmails.push(email);
      }
    }

    const estimatedCompletionAt = new Date(baseStartTime + ((input.recipientEmails.length - 1) * delayBetween));

    return {
      batchId,
      totalScheduled: input.recipientEmails.length,
      firstEmailAt: new Date(baseStartTime),
      estimatedCompletionAt,
      sampleEmails: scheduledEmails,
    };
  }

  /**
   * Cancel a scheduled email
   */
  public async cancelEmail(emailId: string): Promise<boolean> {
    const email = await prisma.emailJob.findUnique({ where: { id: emailId } });
    if (!email) return false;

    if (email.status === 'SENT') {
      throw new Error('Cannot cancel an email that has already been sent');
    }

    // Remove from BullMQ queue if present
    if (email.bullJobId) {
      try {
        const job = await emailQueue.getJob(email.bullJobId);
        if (job) {
          await job.remove();
        }
      } catch (err: any) {
        console.warn(`[SchedulerService] Could not remove BullMQ job ${email.bullJobId}:`, err.message);
      }
    }

    const updated = await prisma.emailJob.update({
      where: { id: emailId },
      data: { status: 'CANCELLED' },
    });

    await searchService.indexEmail(updated);
    return true;
  }

  /**
   * Self-Healing Reconciler on Startup:
   * Ensures any pending/scheduled emails in DB remain scheduled in BullMQ after server/worker restart
   */
  public async reconcilePendingJobsOnStartup(): Promise<void> {
    console.log('[SchedulerService] Reconciling scheduled jobs on startup for restart-resilience...');
    try {
      const pendingEmails = await prisma.emailJob.findMany({
        where: {
          status: { in: ['SCHEDULED', 'RATE_LIMITED'] },
        },
      });

      console.log(`[SchedulerService] Found ${pendingEmails.length} pending emails in database.`);
      const now = Date.now();
      let restoredCount = 0;

      for (const email of pendingEmails) {
        // Check if job exists in BullMQ
        const existingJob = await emailQueue.getJob(email.id);
        if (!existingJob) {
          const delayMs = Math.max(0, new Date(email.scheduledAt).getTime() - now);
          await emailQueue.add(
            'sendEmail',
            {
              emailId: email.id,
              userId: email.userId,
              senderEmail: email.senderEmail,
              recipientEmail: email.recipientEmail,
              subject: email.subject,
              body: email.body,
              delayBetweenEmailsMs: email.delayBetweenEmails || 2000,
              hourlyLimit: email.hourlyLimit || 200,
            },
            {
              delay: delayMs,
              jobId: email.id,
            }
          );
          restoredCount++;
        }
      }

      console.log(`[SchedulerService] Startup reconciliation complete. Restored/synced ${restoredCount} jobs in BullMQ.`);
    } catch (err: any) {
      console.error('[SchedulerService] Error reconciling pending jobs:', err.message);
    }
  }
}

export const schedulerService = new SchedulerService();
