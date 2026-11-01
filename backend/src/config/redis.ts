import Redis, { RedisOptions } from 'ioredis';
import { config } from './env';

const getRedisOptions = (): RedisOptions => {
  if (config.redisUrl) {
    try {
      const parsed = new URL(config.redisUrl);
      return {
        host: parsed.hostname,
        port: parseInt(parsed.port || '6379', 10),
        username: parsed.username || undefined,
        password: parsed.password || undefined,
        tls: parsed.protocol === 'rediss:' ? {} : undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy(times) {
          const delay = Math.min(times * 100, 3000);
          return delay;
        },
      };
    } catch {
      console.warn('[Redis] Failed to parse REDIS_URL, falling back to host/port');
    }
  }

  return {
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
};

export const redisConnectionOptions: RedisOptions = getRedisOptions();

export const redisClient = config.redisUrl 
  ? new Redis(config.redisUrl, { maxRetriesPerRequest: null, enableReadyCheck: false })
  : new Redis(redisConnectionOptions);

redisClient.on('connect', () => {
  console.log(`[Redis] Connected successfully ${config.redisUrl ? 'via REDIS_URL' : `to ${config.redisHost}:${config.redisPort}`}`);
});

redisClient.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});
