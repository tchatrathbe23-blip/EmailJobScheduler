import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/env';
import { connectDB, prisma } from './config/db';
import { redisClient } from './config/redis';
import { initElasticsearch, isElasticsearchAvailable } from './config/elasticsearch';
import { setupEmailWorker } from './queues/emailWorker';
import { bullBoardRouter } from './queues/bullBoard';
import { schedulerService } from './services/schedulerService';
import authRoutes from './routes/authRoutes';
import emailRoutes from './routes/emailRoutes';
import slackRoutes from './routes/slackRoutes';
import searchRoutes from './routes/searchRoutes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Middleware
app.use(
  cors({
    origin: [config.clientUrl, 'http://localhost:3000'],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// BullMQ Live Admin Dashboard
app.use('/admin/queues', bullBoardRouter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/slack', slackRoutes);
app.use('/api/search', searchRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  let redisOk = false;
  try {
    const ping = await redisClient.ping();
    redisOk = ping === 'PONG';
  } catch {}

  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {}

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      redis: redisOk,
      database: dbOk,
      elasticsearch: isElasticsearchAvailable,
      bullmq: true,
    },
    config: {
      workerConcurrency: config.workerConcurrency,
      delayBetweenEmailsMs: config.delayBetweenEmailsMs,
      maxEmailsPerHour: config.maxEmailsPerHourDefault,
    },
  });
});

// Error handling middleware
app.use(errorHandler);

// Server startup
async function startServer() {
  try {
    console.log('----------------------------------------------------');
    console.log('🚀 Starting ReachInbox Email Job Scheduler Server...');
    console.log('----------------------------------------------------');

    await connectDB();
    await initElasticsearch();

    // Start BullMQ Worker
    const worker = setupEmailWorker();

    // Reconcile pending jobs after restart
    await schedulerService.reconcilePendingJobsOnStartup();

    const server = app.listen(config.port, () => {
      console.log(`✅ Backend server listening on http://localhost:${config.port}`);
      console.log(`📊 BullMQ Live Queue Dashboard: http://localhost:${config.port}/admin/queues`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\n[Server] Shutting down gracefully...');
      await worker.close();
      await redisClient.quit();
      await prisma.$disconnect();
      server.close(() => {
        console.log('[Server] Shutdown complete.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error: any) {
    console.error('Fatal startup error:', error.message);
    process.exit(1);
  }
}

startServer();
