/**
 * sdRateLimiter - Token bucket rate limiting for API providers
 * Implements per-provider rate limiting to prevent API quota exhaustion
 */

import { EventEmitter } from 'events';

export interface RateLimiterConfig {
  maxTokens: number; // Maximum tokens in bucket
  refillRate: number; // Tokens added per second
  refillInterval?: number; // Refill interval in ms (default: 1000)
}

export interface RateLimitInfo {
  providerId: string;
  tokensAvailable: number;
  maxTokens: number;
  refillRate: number;
  waitTimeMs: number;
}

/**
 * sdRateLimiter - Token bucket implementation for rate limiting
 */
export class sdRateLimiter extends EventEmitter {
  private buckets: Map<string, TokenBucket>;
  private defaultConfig: RateLimiterConfig;

  constructor(defaultConfig?: Partial<RateLimiterConfig>) {
    super();
    this.buckets = new Map();
    this.defaultConfig = {
      maxTokens: defaultConfig?.maxTokens || 100,
      refillRate: defaultConfig?.refillRate || 10,
      refillInterval: defaultConfig?.refillInterval || 1000,
    };
  }

  /**
   * Register a provider with custom rate limit config
   */
  registerProvider(providerId: string, config?: Partial<RateLimiterConfig>): void {
    const fullConfig: RateLimiterConfig = {
      maxTokens: config?.maxTokens || this.defaultConfig.maxTokens,
      refillRate: config?.refillRate || this.defaultConfig.refillRate,
      refillInterval: config?.refillInterval || this.defaultConfig.refillInterval,
    };

    const bucket = new TokenBucket(fullConfig);
    this.buckets.set(providerId, bucket);

    this.emit('provider-registered', { providerId, config: fullConfig });
  }

  /**
   * Check if a request can be made (non-blocking)
   */
  canMakeRequest(providerId: string, tokens: number = 1): boolean {
    const bucket = this.getBucket(providerId);
    return bucket.hasTokens(tokens);
  }

  /**
   * Attempt to consume tokens (blocking with timeout)
   * Returns true if tokens were consumed, false if timeout reached
   */
  async tryConsume(
    providerId: string,
    tokens: number = 1,
    timeoutMs: number = 30000
  ): Promise<boolean> {
    const bucket = this.getBucket(providerId);
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (bucket.tryConsume(tokens)) {
        this.emit('tokens-consumed', { providerId, tokens, remaining: bucket.getAvailableTokens() });
        return true;
      }

      // Wait for refill
      const waitTime = Math.min(100, bucket.getWaitTimeForTokens(tokens));
      await this.sleep(waitTime);
    }

    this.emit('rate-limit-timeout', { providerId, tokens, timeoutMs });
    return false;
  }

  /**
   * Consume tokens immediately or throw if not available
   */
  consume(providerId: string, tokens: number = 1): void {
    const bucket = this.getBucket(providerId);
    
    if (!bucket.tryConsume(tokens)) {
      const waitTime = bucket.getWaitTimeForTokens(tokens);
      this.emit('rate-limit-exceeded', { providerId, tokens, waitTime });
      throw new Error(
        `Rate limit exceeded for provider ${providerId}. ` +
        `Wait ${waitTime}ms before retrying.`
      );
    }

    this.emit('tokens-consumed', { providerId, tokens, remaining: bucket.getAvailableTokens() });
  }

  /**
   * Get rate limit info for a provider
   */
  getInfo(providerId: string): RateLimitInfo {
    const bucket = this.getBucket(providerId);
    
    return {
      providerId,
      tokensAvailable: bucket.getAvailableTokens(),
      maxTokens: bucket.config.maxTokens,
      refillRate: bucket.config.refillRate,
      waitTimeMs: bucket.getWaitTimeForTokens(1),
    };
  }

  /**
   * Reset rate limits for a provider
   */
  reset(providerId: string): void {
    const bucket = this.getBucket(providerId);
    bucket.reset();
    this.emit('rate-limit-reset', { providerId });
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    for (const [providerId, bucket] of this.buckets.entries()) {
      bucket.reset();
      this.emit('rate-limit-reset', { providerId });
    }
  }

  /**
   * Remove a provider's rate limiter
   */
  unregisterProvider(providerId: string): void {
    const bucket = this.buckets.get(providerId);
    if (bucket) {
      bucket.stopRefill();
      this.buckets.delete(providerId);
      this.emit('provider-unregistered', { providerId });
    }
  }

  /**
   * Get or create bucket for provider
   */
  private getBucket(providerId: string): TokenBucket {
    let bucket = this.buckets.get(providerId);
    
    if (!bucket) {
      // Auto-register with default config
      this.registerProvider(providerId);
      bucket = this.buckets.get(providerId);
      if (!bucket) {
        throw new Error(`Failed to create bucket for provider ${providerId}`);
      }
    }

    return bucket;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup all buckets
   */
  destroy(): void {
    for (const bucket of this.buckets.values()) {
      bucket.stopRefill();
    }
    this.buckets.clear();
  }
}

/**
 * Token Bucket implementation
 */
class TokenBucket {
  public config: RateLimiterConfig;
  private tokens: number;
  private lastRefillTime: number;
  private refillTimer: NodeJS.Timeout | null;

  constructor(config: RateLimiterConfig) {
    this.config = config;
    this.tokens = config.maxTokens;
    this.lastRefillTime = Date.now();
    this.refillTimer = null;
    this.startRefill();
  }

  hasTokens(count: number): boolean {
    this.refill();
    return this.tokens >= count;
  }

  tryConsume(count: number): boolean {
    this.refill();
    
    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }
    
    return false;
  }

  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  getWaitTimeForTokens(count: number): number {
    this.refill();
    
    if (this.tokens >= count) {
      return 0;
    }

    const tokensNeeded = count - this.tokens;
    const refillInterval = this.config.refillInterval || 1000;
    return Math.ceil((tokensNeeded / this.config.refillRate) * refillInterval);
  }

  reset(): void {
    this.tokens = this.config.maxTokens;
    this.lastRefillTime = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefillTime;
    const refillInterval = this.config.refillInterval || 1000;
    const intervalsPassed = timePassed / refillInterval;
    const tokensToAdd = intervalsPassed * this.config.refillRate;

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.config.maxTokens, this.tokens + tokensToAdd);
      this.lastRefillTime = now;
    }
  }

  private startRefill(): void {
    if (this.refillTimer) {
      return;
    }

    const refillInterval = this.config.refillInterval || 1000;
    // Periodic refill to ensure smooth rate limiting
    this.refillTimer = setInterval(() => {
      this.refill();
    }, refillInterval);
  }

  stopRefill(): void {
    if (this.refillTimer) {
      clearInterval(this.refillTimer);
      this.refillTimer = null;
    }
  }
}

// Singleton instance
export const sdRateLimiterInstance = new sdRateLimiter();
