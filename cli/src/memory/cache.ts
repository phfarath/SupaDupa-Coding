import { MemoryRecordDTO } from '../../shared/contracts/memory-record';

/**
 * sdCache - In-memory cache for frequently accessed memory records
 * Implements caching layer for improved performance
 */
export class sdCache {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }>;
  private maxSize: number;
  private defaultTTL: number; // Time-to-live in milliseconds

  constructor(maxSize: number = 1000, defaultTTL: number = 300000) { // 5 minutes default
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Store data in cache with optional TTL
   */
  set(key: string, data: any, ttl?: number): void {
    // Check if cache is at max size and evict oldest entry if needed
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const actualTTL = ttl !== undefined ? ttl : this.defaultTTL;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: actualTTL
    });
  }

  /**
   * Retrieve data from cache
   */
  get<T = any>(key: string): T | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return false;
    }

    // Check if entry has expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Remove key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  stats(): { size: number; maxSize: number; utilization: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilization: this.cache.size / this.maxSize
    };
  }
}