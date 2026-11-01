export interface User {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
  slackConnected?: boolean;
  slackChannel?: string | null;
  slackTeamName?: string | null;
}

export interface EmailJob {
  id: string;
  userId?: string | null;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED' | 'RATE_LIMITED' | 'CANCELLED';
  scheduledAt: string;
  sentAt?: string | null;
  failedReason?: string | null;
  etherealPreviewUrl?: string | null;
  bullJobId?: string | null;
  batchId?: string | null;
  delayBetweenEmails?: number;
  hourlyLimit?: number;
  attempts?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SenderConfig {
  id: string;
  email: string;
  displayName?: string | null;
  hourlyLimit: number;
  currentHourSent?: number;
  hourWindow?: string;
}

export interface DashboardStats {
  scheduled: number;
  sent: number;
  failed: number;
  rateLimited: number;
  totalProcessed: number;
  sendersCount: number;
}
