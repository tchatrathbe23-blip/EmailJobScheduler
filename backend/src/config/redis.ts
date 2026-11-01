import Redis, { RedisOptions } from 'ioredis';
import { config } from './env';

export const redisConnectionOptions: RedisOptions = {
  host: config.redisHost,
  port: config.redisPort,
  password: config.redisPassword || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
};

export const redisClient = new Redis(redisConnectionOptions);

redisClient.on('connect', () => {
  console.log(`[Redis] Connected successfully to ${config.redisHost}:${config.redisPort}`);
});

redisClient.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});
