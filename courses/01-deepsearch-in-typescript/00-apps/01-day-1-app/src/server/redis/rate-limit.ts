import { setTimeout } from "node:timers/promises";
import { redis } from "~/server/redis/redis";

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
  maxRetries?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalHits: number;
  retry: () => Promise<boolean>;
}

export async function recordRateLimit({
  windowMs,
  keyPrefix = "rate_limit",
}: Pick<RateLimitConfig, "windowMs" | "keyPrefix">): Promise<void> {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const key = `${keyPrefix}:${windowStart}`;

  try {
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, Math.ceil(windowMs / 1000));

    const results = await pipeline.exec();

    if (!results) {
      throw new Error("Redis pipeline execution failed");
    }
  } catch (error) {
    console.error("Rate limit recording failed:", error);
    throw error;
  }
}

export async function checkRateLimit({
  maxRequests,
  windowMs,
  keyPrefix = "rate_limit",
  maxRetries = 3,
}: RateLimitConfig): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const key = `${keyPrefix}:${windowStart}`;

  try {
    const currentCount = await redis.get(key);
    const count = currentCount ? Number.parseInt(currentCount, 10) : 0;

    const allowed = count < maxRequests;
    const remaining = Math.max(0, maxRequests - count);
    const resetTime = windowStart + windowMs;

    let retryCount = 0;

    const retry = async (): Promise<boolean> => {
      if (!allowed) {
        const waitTime = resetTime - Date.now();
        if (waitTime > 0) {
          await setTimeout(waitTime);
        }

        const retryResult = await checkRateLimit({
          maxRequests,
          windowMs,
          keyPrefix,
          maxRetries,
        });

        if (!retryResult.allowed) {
          if (retryCount >= maxRetries) {
            return false;
          }
          retryCount++;
          return await retryResult.retry();
        }
        return true;
      }
      return true;
    };

    return {
      allowed,
      remaining,
      resetTime,
      totalHits: count,
      retry,
    };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - 1),
      resetTime: windowStart + windowMs,
      totalHits: 0,
      retry: async () => true,
    };
  }
}
