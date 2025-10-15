/**
 * Simple cache implementation for memory system
 */

export interface CacheOptions {
  maxSize?: number;
  ttl?: number;
}

export class sdCache<K = string, V = any> {
  private cache: Map<K, { value: V; timestamp: number; ttl: number }>;
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize?: number, defaultTTL?: number) {
    this.cache = new Map();
    this.maxSize = maxSize || 1000;
    this.defaultTTL = defaultTTL || 3600000; // 1 hour default
  }

  set(key: K, value: V, ttl?: number): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  get<T = V>(key: K): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value as unknown as T;
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}
