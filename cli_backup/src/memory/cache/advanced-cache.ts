import { sdCache } from './cache';
import { MemoryRecordDTO } from '../../shared/contracts/memory-record';
import fs from 'fs/promises';
import path from 'path';

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

interface AdvancedCacheStats {
  l1Hits: number;
  l1Misses: number;
  l2Hits: number;
  l2Misses: number;
  l3Hits: number;
  l3Misses: number;
  totalRequests: number;
}

/**
 * AdvancedCacheClient - Multi-tier caching system for memory records
 */
export class AdvancedCacheClient {
  private l1Cache: sdCache;  // In-memory cache (fastest)
  private l2Cache: Map<string, CacheEntry>;  // Disk cache (medium speed)
  private l3CacheDir: string;  // Database cache (slowest but persistent)
  private repository: any;  // Memory repository to use as L3
  
  // Stats for performance monitoring
  private stats: AdvancedCacheStats = {
    l1Hits: 0,
    l1Misses: 0,
    l2Hits: 0,
    l2Misses: 0,
    l3Hits: 0,
    l3Misses: 0,
    totalRequests: 0
  };

  constructor(repository: any, cacheSize: number = 1000, cacheDir: string = './cache') {
    // Initialize L1 cache (the original in-memory cache)
    this.l1Cache = new sdCache(cacheSize, 300000); // 5 min TTL
    
    // Initialize L2 cache (disk-based)
    this.l2Cache = new Map();
    this.l3CacheDir = cacheDir;
    
    // Ensure cache directory exists
    fs.mkdir(cacheDir, { recursive: true }).catch(() => {});
    
    // Store reference to repository for L3 cache
    this.repository = repository;
  }

  /**
   * Get data with fallback through all cache tiers
   */
  async getWithFallback(key: string): Promise<any | null> {
    this.stats.totalRequests++;
    
    // Try L1 cache first (in-memory)
    const l1Result = this.l1Cache.get<CacheEntry>(key);
    if (l1Result) {
      this.stats.l1Hits++;
      return l1Result;
    }
    this.stats.l1Misses++;

    // Try L2 cache (disk)
    const l2Result = this.getFromL2(key);
    if (l2Result) {
      this.stats.l2Hits++;
      // Put in L1 for faster access next time
      this.l1Cache.set(key, l2Result, 60000); // Shorter TTL in L1
      return l2Result;
    }
    this.stats.l2Misses++;

    // Try L3 cache (database)
    if (this.repository && typeof this.repository.getRecord === 'function') {
      try {
        const l3Result = await this.repository.getRecord(key);
        if (l3Result) {
          this.stats.l3Hits++;
          // Put in L1 and L2 for faster access next time
          this.l1Cache.set(key, l3Result, 60000);
          this.putInL2(key, l3Result, 300000); // Longer TTL in L2
          return l3Result;
        }
      } catch (error) {
        console.error('Error accessing L3 cache:', error);
      }
    }
    this.stats.l3Misses++;

    return null;
  }

  /**
   * Set data across all cache tiers
   */
  async set(key: string, data: any, l1TTL?: number, l2TTL?: number, l3TTL?: number): Promise<void> {
    // Set in L1 cache
    this.l1Cache.set(key, data, l1TTL);
    
    // Set in L2 cache
    this.putInL2(key, data, l2TTL);
    
    // Set in L3 cache if repository supports it
    if (this.repository && typeof this.repository.putMemoryRecord === 'function') {
      try {
        // Create a standard memory record format
        const record: MemoryRecordDTO = {
          id: key,
          key,
          category: 'cache',
          data,
          metadata: {
            agentOrigin: 'cache-system',
            tags: ['cache'],
            timestamp: new Date().toISOString()
          }
        };
        
        await this.repository.putMemoryRecord(record);
      } catch (error) {
        console.error('Error setting L3 cache:', error);
      }
    }
  }

  /**
   * Get from L2 cache (disk)
   */
  private getFromL2(key: string): any | null {
    // First check in-memory L2 cache
    if (this.l2Cache.has(key)) {
      const entry = this.l2Cache.get(key)!;
      
      // Check if expired
      if (Date.now() - entry.timestamp > entry.ttl) {
        this.l2Cache.delete(key);
        this.deleteL2File(key);
        return null;
      }
      
      return entry.data;
    }

    // Then check disk
    return this.getFromL2File(key);
  }

  /**
   * Put in L2 cache (disk)
   */
  private putInL2(key: string, data: any, ttl?: number): void {
    const actualTTL = ttl !== undefined ? ttl : 300000; // 5 minutes default
    
    // Update in-memory L2 cache
    this.l2Cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: actualTTL
    });
    
    // Persist to disk
    this.putInL2File(key, data, actualTTL);
  }

  /**
   * Get from L2 file storage
   */
  private async getFromL2File(key: string): Promise<any | null> {
    const filePath = path.join(this.l3CacheDir, `${key}.json`);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const entry: CacheEntry = JSON.parse(content);
      
      // Check if expired
      if (Date.now() - entry.timestamp > entry.ttl) {
        await fs.unlink(filePath);
        return null;
      }
      
      return entry.data;
    } catch (error) {
      // File doesn't exist or is invalid
      return null;
    }
  }

  /**
   * Put in L2 file storage
   */
  private async putInL2File(key: string, data: any, ttl: number): Promise<void> {
    const filePath = path.join(this.l3CacheDir, `${key}.json`);
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl
    };
    
    try {
      await fs.writeFile(filePath, JSON.stringify(entry, null, 2));
    } catch (error) {
      console.error(`Error writing to L2 cache file ${filePath}:`, error);
    }
  }

  /**
   * Delete from L2 file storage
   */
  private async deleteL2File(key: string): Promise<void> {
    const filePath = path.join(this.l3CacheDir, `${key}.json`);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // File might not exist, that's fine
    }
  }

  /**
   * Preload likely needed data based on context
   */
  async preloadLikelyNeeded(context: string): Promise<void> {
    // This would implement predictive caching based on patterns
    // For now, we'll implement a simple version that preloads recent records
    if (this.repository && typeof this.repository.fetchSimilarRecords === 'function') {
      try {
        const similarRecords = await this.repository.fetchSimilarRecords(context, undefined, 5);
        
        for (const record of similarRecords) {
          // Put in L1 cache for quick access
          this.l1Cache.set(record.id, record, 120000); // 2 minutes for preloaded items
        }
      } catch (error) {
        console.error('Error preloading likely needed data:', error);
      }
    }
  }

  /**
   * Optimize cache based on usage patterns
   */
  async optimizeBasedOnUsage(): Promise<void> {
    // This would analyze usage patterns to optimize cache performance
    // For now, we'll implement a simple cleanup of expired entries
    
    // Clean up L2 cache of expired entries
    const now = Date.now();
    for (const [key, entry] of this.l2Cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.l2Cache.delete(key);
        this.deleteL2File(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): AdvancedCacheStats {
    return { ...this.stats };
  }

  /**
   * Clear all cache tiers
   */
  async clear(): Promise<void> {
    // Clear L1
    this.l1Cache.clear();
    
    // Clear L2 in-memory
    this.l2Cache.clear();
    
    // Clear L2 disk
    try {
      const files = await fs.readdir(this.l3CacheDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(this.l3CacheDir, file));
        }
      }
    } catch (error) {
      console.error('Error clearing L2 cache:', error);
    }
  }
}