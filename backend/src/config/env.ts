import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',

  // Redis
  redisUrl: process.env.REDIS_URL || '',
  redisHost: process.env.REDIS_HOST || '127.0.0.1',
  redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),
  redisPassword: process.env.REDIS_PASSWORD || undefined,

  // BullMQ & Workers
  workerConcurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  delayBetweenEmailsMs: parseInt(process.env.DELAY_BETWEEN_EMAILS_MS || '2000', 10),
  maxEmailsPerHourDefault: parseInt(process.env.MAX_EMAILS_PER_HOUR || '200', 10),

  // Database
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',

  // Elasticsearch
  elasticsearchNode: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
  elasticsearchIndex: process.env.ELASTICSEARCH_INDEX || 'reachinbox_emails',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'reachinbox-super-secret-jwt-key-2026',

  // Google OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback',

  // Slack OAuth & Alerts
  slackClientId: process.env.SLACK_CLIENT_ID || '',
  slackClientSecret: process.env.SLACK_CLIENT_SECRET || '',
  slackRedirectUri: process.env.SLACK_REDIRECT_URI || 'http://localhost:5000/api/slack/callback',
  slackDefaultWebhookUrl: process.env.SLACK_DEFAULT_WEBHOOK_URL || '',
};
