import { sdMemoryRepository } from './memory-repository';
import { sdCache } from './cache';
import { AdvancedCacheClient } from './cache/advanced-cache';
import { MemoryAnalytics } from './analytics';
import { MemoryArchivalService } from './archival';
import { CrossAgentMemoryService } from './cross-agent';
import { MemoryHealthService } from './health';

/**
 * Memory client singleton for the application
 * Exposes the memoryClient as specified in the implementation plan
 */

class MemoryClient {
  private static instance: MemoryClient;
  private repository: sdMemoryRepository;
  private cache: AdvancedCacheClient;
  private analytics: MemoryAnalytics;
  private archivalService: MemoryArchivalService;
  private crossAgentService: CrossAgentMemoryService;
  private healthService: MemoryHealthService;

  private constructor() {
    // Initialize with default settings, could be configured via environment variables
    const dbPath = process.env.MEMORY_DB_PATH || './data/memory.db';
    const cacheSize = parseInt(process.env.MEMORY_CACHE_SIZE || '1000', 10);
    
    this.repository = new sdMemoryRepository(dbPath);
    this.cache = new AdvancedCacheClient(this.repository, cacheSize);
    this.analytics = new MemoryAnalytics(this.repository);
    this.archivalService = new MemoryArchivalService(this.repository);
    this.crossAgentService = new CrossAgentMemoryService(this.repository);
    this.healthService = new MemoryHealthService(this.repository);
  }

  public static getInstance(): MemoryClient {
    if (!MemoryClient.instance) {
      MemoryClient.instance = new MemoryClient();
    }
    return MemoryClient.instance;
  }

  async initialize(): Promise<void> {
    await this.repository.initialize();
    
    // Setup permissions table after repository is initialized
    await this.crossAgentService.setupPermissionsTable();
  }

  getRepository(): sdMemoryRepository {
    return this.repository;
  }

  getCache(): AdvancedCacheClient {
    return this.cache;
  }

  getAnalytics(): MemoryAnalytics {
    return this.analytics;
  }

  getArchivalService(): MemoryArchivalService {
    return this.archivalService;
  }

  getCrossAgentService(): CrossAgentMemoryService {
    return this.crossAgentService;
  }

  getHealthService(): MemoryHealthService {
    return this.healthService;
  }

  async putMemoryRecord(record: any): Promise<void> {
    await this.repository.putMemoryRecord(record);
    // Also store in cache for quick access
    await this.cache.set(record.id, record);
  }

  async fetchSimilarRecords(query: string, category?: string, limit: number = 10): Promise<any[]> {
    // Use advanced cache with fallback
    const cacheKey = `search:${query}:${category || 'all'}:${limit}`;
    let records = await this.cache.getWithFallback(cacheKey);
    
    if (!records) {
      // Fetch from database if not in cache
      records = await this.repository.fetchSimilarRecords(query, category, limit);
      
      // Store result in cache
      await this.cache.set(cacheKey, records, 60000, 300000); // Cache search results
    }
    
    return records;
  }

  async getRecord(recordId: string): Promise<any | null> {
    // Use advanced cache with fallback
    const cached = await this.cache.getWithFallback(recordId);
    if (cached) {
      return cached;
    }

    // If not in cache, get from repository
    const record = await this.repository.getRecord(recordId);
    
    // Store in cache if found
    if (record) {
      await this.cache.set(recordId, record);
    }
    
    return record;
  }

  async fetchSimilarRecordsByVector(
    queryVector: number[], 
    category?: string, 
    limit: number = 10
  ): Promise<{ record: any; similarity: number }[]> {
    // This is a direct call to the repository, bypassing cache since vector searches
    // typically won't have exact matches to cache
    return await this.repository.fetchSimilarRecordsByVector(queryVector, category, limit);
  }

  async preloadLikelyNeeded(context: string): Promise<void> {
    await this.cache.preloadLikelyNeeded(context);
  }

  async getUsagePatterns(agentId: string): Promise<any[]> {
    return await this.analytics.getUsagePatterns(agentId);
  }

  async getSuggestionsForSimilarProblems(problem: string): Promise<any[]> {
    return await this.analytics.getSuggestionsForSimilarProblems(problem);
  }

  async getCacheStats(): Promise<any> {
    return this.cache.getStats();
  }

  // Archival methods
  async archiveOldRecords(daysOld?: number): Promise<void> {
    if (daysOld !== undefined) {
      // Create a new service instance with custom threshold for this call
      const tempService = new MemoryArchivalService(this.repository, undefined, daysOld);
      await tempService.archiveOldRecords();
    } else {
      await this.archivalService.archiveOldRecords();
    }
  }

  async restoreFromArchive(recordId: string): Promise<boolean> {
    return await this.archivalService.restoreFromArchive(recordId);
  }

  async getArchiveStats(): Promise<any> {
    return await this.archivalService.getArchiveStats();
  }

  // Cross-agent memory sharing methods
  async shareMemoryWithAgents(recordId: string, targetAgents: string[]): Promise<void> {
    await this.crossAgentService.shareMemoryWithAgents(recordId, targetAgents);
  }

  async getSharedMemories(agentId: string): Promise<any[]> {
    return await this.crossAgentService.getSharedMemories(agentId);
  }

  async createMemoryPool(poolName: string, agents: string[], description?: string): Promise<void> {
    await this.crossAgentService.createMemoryPool(poolName, agents, description);
  }

  async checkAccessPermission(
    agentId: string,
    recordId: string,
    operation: 'read' | 'write' | 'delete'
  ): Promise<boolean> {
    return await this.crossAgentService.checkAccessPermission(agentId, recordId, operation);
  }

  async grantAccess(recordId: string, agentId: string, permissions: string[]): Promise<void> {
    await this.crossAgentService.grantAccess(recordId, agentId, permissions);
  }

  // Health and maintenance methods
  async checkDatabaseIntegrity(): Promise<any> {
    return await this.healthService.checkDatabaseIntegrity();
  }

  async repairCorruptedRecords(): Promise<any> {
    return await this.healthService.repairCorruptedRecords();
  }

  async optimizeDatabase(): Promise<void> {
    await this.healthService.optimizeDatabase();
  }

  async generateMemoryReport(): Promise<any> {
    return await this.healthService.generateMemoryReport();
  }

  async close(): Promise<void> {
    await this.repository.close();
  }
}

// Export the singleton instance as memoryClient
export const memoryClient = MemoryClient.getInstance();

// Also export the class for testing purposes
export { MemoryClient };