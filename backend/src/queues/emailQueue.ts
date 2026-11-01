import { Queue } from 'bullmq';
import { redisConnectionOptions } from '../config/redis';

export interface EmailJobData {
  emailId: string;
  userId?: string | null;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  delayBetweenEmailsMs?: number;
  hourlyLimit?: number;
}

export const EMAIL_QUEUE_NAME = 'email-dispatch-queue';

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 24 * 3600, // keep completed jobs for 24h
      count: 1000,
    },
    removeOnFail: {
      age: 48 * 3600,
      count: 1000,
    },
  },
});
