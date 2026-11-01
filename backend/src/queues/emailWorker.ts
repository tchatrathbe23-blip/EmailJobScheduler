import { Worker, Job } from 'bullmq';
import { EMAIL_QUEUE_NAME, EmailJobData, emailQueue } from './emailQueue';
import { redisConnectionOptions, redisClient } from '../config/redis';
import { config } from '../config/env';
import { prisma } from '../config/db';
import { emailService } from '../services/emailService';
import { rateLimiter } from '../services/rateLimiter';
import { searchService } from '../services/searchService';

export function setupEmailWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const { emailId, userId, senderEmail, recipientEmail, subject, body, delayBetweenEmailsMs, hourlyLimit } = job.data;
      console.log(`[Worker] Picking up job #${job.id} for email: ${emailId} -> ${recipientEmail}`);

      // 1. Idempotency Check in Database
      const existingEmail = await prisma.emailJob.findUnique({
        where: { id: emailId },
      });

      if (!existingEmail) {
        console.warn(`[Worker] Email ${emailId} not found in database. Skipping.`);
        return { status: 'NOT_FOUND' };
      }

      if (existingEmail.status === 'SENT') {
        console.log(`[Worker] Email ${emailId} is already marked SENT. Skipping to preserve idempotency.`);
        return { status: 'ALREADY_SENT' };
      }

      if (existingEmail.status === 'CANCELLED') {
        console.log(`[Worker] Email ${emailId} was cancelled by user. Skipping.`);
        return { status: 'CANCELLED' };
      }

      // 2. Redis Distributed Lock to prevent duplicate concurrent processing across workers
      const lockKey = `lock:email:${emailId}`;
      const acquiredLock = await redisClient.set(lockKey, '1', 'PX', 60000, 'NX');
      if (!acquiredLock) {
        console.warn(`[Worker] Concurrent lock for email ${emailId} held by another worker. Skipping.`);
        return { status: 'LOCKED' };
      }

      try {
        // 3. Mark status as PROCESSING in DB
        await prisma.emailJob.update({
          where: { id: emailId },
          data: {
            status: 'PROCESSING',
            attempts: { increment: 1 },
          },
        });

        // 4. Rate Limiting Check (Atomic per-sender hourly limit)
        const rateCheck = await rateLimiter.checkAndConsumeSlot(senderEmail, userId, hourlyLimit);

        if (!rateCheck.allowed) {
          const nextWindow = rateCheck.nextWindowStart || new Date(Date.now() + 3600000);
          console.log(`[Worker] Rate limit reached for sender ${senderEmail} (${rateCheck.currentCount}/${rateCheck.limit}). Deferring email ${emailId} to ${nextWindow.toISOString()}...`);

          // Update DB status to RATE_LIMITED with new scheduled time
          const updatedEmail = await prisma.emailJob.update({
            where: { id: emailId },
            data: {
              status: 'RATE_LIMITED',
              scheduledAt: nextWindow,
            },
          });

          // Sync with Elasticsearch
          await searchService.indexEmail(updatedEmail);

          // Reschedule into BullMQ delayed queue (do not drop job!)
          const delayMs = rateCheck.retryDelayMs || 3600000;
          await emailQueue.add('sendEmail', job.data, {
            delay: delayMs,
            jobId: `${emailId}-rescheduled-${Date.now()}`,
          });

          return {
            status: 'RATE_LIMITED',
            rescheduledTo: nextWindow,
            reason: `Hourly sender limit (${rateCheck.limit}/hr) hit. Job safely delayed.`,
          };
        }

        // 5. Provider Throttling / Delay Between Sends
        const delay = delayBetweenEmailsMs !== undefined ? delayBetweenEmailsMs : config.delayBetweenEmailsMs;
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        // 6. Send the actual email via Ethereal SMTP
        const result = await emailService.sendEmail({
          from: senderEmail,
          to: recipientEmail,
          subject,
          body,
        });

        // 7. Update status to SENT in Database
        const sentEmail = await prisma.emailJob.update({
          where: { id: emailId },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            etherealPreviewUrl: result.previewUrl ? result.previewUrl : null,
          },
        });

        // 8. Index updated status into Elasticsearch
        await searchService.indexEmail(sentEmail);

        console.log(`[Worker] Successfully sent email ${emailId} to ${recipientEmail}`);
        return {
          status: 'SENT',
          messageId: result.messageId,
          previewUrl: result.previewUrl,
        };
      } catch (err: any) {
        console.error(`[Worker] Error sending email ${emailId}:`, err.message);

        // Update DB with failure info
        const failedEmail = await prisma.emailJob.update({
          where: { id: emailId },
          data: {
            status: 'FAILED',
            failedReason: err.message,
          },
        });

        await searchService.indexEmail(failedEmail);
        throw err;
      } finally {
        // Release Redis lock
        await redisClient.del(lockKey);
      }
    },
    {
      connection: redisConnectionOptions,
      concurrency: config.workerConcurrency,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed successfully.`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed with error:`, err.message);
  });

  console.log(`[Worker] BullMQ email worker started with concurrency = ${config.workerConcurrency}`);
  return worker;
}
