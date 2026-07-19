import Redis from 'ioredis';

class RedisCacheManager {
  private client: Redis | null = null;
  private memoryCache: Map<string, { value: string; expiry: number }> = new Map();
  private isUsingMemory = true;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl && !redisUrl.includes('your_redis_password')) {
      try {
        this.client = new Redis(redisUrl, {
          maxRetriesPerRequest: 1,
          connectTimeout: 5000,
        });

        this.client.on('connect', () => {
          this.isUsingMemory = false;
          console.log('Redis connected successfully.');
        });

        this.client.on('error', (err) => {
          console.warn('Redis Connection Error, falling back to In-Memory store:', err.message);
          this.isUsingMemory = true;
        });
      } catch (err) {
        console.warn('Failed to initialize Redis client. Falling back to In-Memory store.');
        this.isUsingMemory = true;
      }
    } else {
      console.log('REDIS_URL not configured. Running with In-Memory store.');
    }
  }

  public async get(key: string): Promise<string | null> {
    if (this.isUsingMemory || !this.client) {
      const item = this.memoryCache.get(key);
      if (!item) return null;
      if (item.expiry > 0 && Date.now() > item.expiry) {
        this.memoryCache.delete(key);
        return null;
      }
      return item.value;
    }
    try {
      return await this.client.get(key);
    } catch (err) {
      return null;
    }
  }

  public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.isUsingMemory || !this.client) {
      const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0;
      this.memoryCache.set(key, { value, expiry });
      return;
    }
    try {
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch (err) {
      // Fallback to memory on failure
      const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0;
      this.memoryCache.set(key, { value, expiry });
    }
  }

  public async del(key: string): Promise<void> {
    if (this.isUsingMemory || !this.client) {
      this.memoryCache.delete(key);
      return;
    }
    try {
      await this.client.del(key);
    } catch (err) {
      this.memoryCache.delete(key);
    }
  }

  public getClient(): Redis | null {
    return this.client;
  }
}

export const redisCache = new RedisCacheManager();
