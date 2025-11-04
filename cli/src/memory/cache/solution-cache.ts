/**
 * sdSolutionCache - Enhanced solution caching with relevance scoring
 * Implements intelligent caching with similarity matching and invalidation strategies
 */

import { EventEmitter } from 'events';
import { memoryClient } from '../index';
import { MemoryRecordDTO } from '../../../shared/contracts/memory-record';

export interface CacheKey {
  problem: string;
  context?: string;
  tags?: string[];
  constraints?: Record<string, any>;
}

export interface Solution {
  id: string;
  problem: string;
  solution: string;
  code?: string;
  metadata: {
    agentId: string;
    timestamp: string;
    successRate?: number;
    usageCount?: number;
    lastUsed?: string;
    version?: string;
  };
}

export interface SolutionMatch {
  solution: Solution;
  relevanceScore: number;
  matchReason: string;
}

export interface CacheStats {
  totalSolutions: number;
  hits: number;
  misses: number;
  hitRate: number;
  averageRelevanceScore: number;
}

/**
 * sdSolutionCache - Enhanced solution cache with intelligent matching
 */
export class sdSolutionCache extends EventEmitter {
  private stats: {
    hits: number;
    misses: number;
    totalScores: number;
    scoreCount: number;
  };

  private cacheInvalidationRules: Map<string, (solution: Solution) => boolean>;

  constructor() {
    super();
    this.stats = {
      hits: 0,
      misses: 0,
      totalScores: 0,
      scoreCount: 0,
    };
    this.cacheInvalidationRules = new Map();
    this.initializeDefaultInvalidationRules();
  }

  /**
   * Get cached solution with relevance scoring
   */
  async getCachedSolution(cacheKey: CacheKey, minRelevance: number = 0.6): Promise<SolutionMatch | null> {
    try {
      // Search for similar problems
      const results = await this.searchSolutions(cacheKey);

      if (results.length === 0) {
        this.stats.misses++;
        this.emit('cache-miss', { cacheKey });
        return null;
      }

      // Score and rank solutions
      const scoredSolutions = this.scoreResults(results, cacheKey);

      // Filter by minimum relevance
      const relevantSolutions = scoredSolutions.filter(s => s.relevanceScore >= minRelevance);

      if (relevantSolutions.length === 0) {
        this.stats.misses++;
        this.emit('cache-miss', { cacheKey, reason: 'low-relevance' });
        return null;
      }

      // Get best match
      const bestMatch = relevantSolutions[0];

      // Update usage statistics
      await this.updateUsageStats(bestMatch.solution);

      // Record stats
      this.stats.hits++;
      this.stats.totalScores += bestMatch.relevanceScore;
      this.stats.scoreCount++;

      this.emit('cache-hit', { 
        cacheKey, 
        solution: bestMatch.solution,
        relevanceScore: bestMatch.relevanceScore
      });

      return bestMatch;
    } catch (error) {
      this.emit('cache-error', { error: (error as Error).message, cacheKey });
      return null;
    }
  }

  /**
   * Store a solution with metadata
   */
  async storeSolution(solution: Solution): Promise<void> {
    try {
      const record: MemoryRecordDTO = {
        id: solution.id,
        key: solution.problem,
        category: 'solutions',
        data: {
          solution: solution.solution,
          code: solution.code,
          successRate: solution.metadata.successRate || 0,
          usageCount: solution.metadata.usageCount || 0,
          version: solution.metadata.version || '1.0.0',
        },
        metadata: {
          agentOrigin: solution.metadata.agentId,
          tags: this.generateTags(solution),
          timestamp: solution.metadata.timestamp || new Date().toISOString(),
        },
      };

      await memoryClient.putMemoryRecord(record);

      this.emit('solution-stored', { solution });
    } catch (error) {
      this.emit('storage-error', { error: (error as Error).message, solution });
      throw error;
    }
  }

  /**
   * Invalidate solutions based on custom rules
   */
  async invalidateSolutions(predicate: (solution: Solution) => boolean): Promise<number> {
    try {
      const allSolutions = await memoryClient.fetchSimilarRecords('', 'solutions', 1000);
      let invalidatedCount = 0;

      for (const record of allSolutions) {
        const solution = this.recordToSolution(record);
        
        if (predicate(solution)) {
          // Mark as invalidated by updating metadata
          await memoryClient.putMemoryRecord({
            ...record,
            metadata: {
              ...record.metadata,
              tags: [...(record.metadata.tags || []), 'invalidated'],
              timestamp: new Date().toISOString(),
            },
          });
          invalidatedCount++;
        }
      }

      this.emit('solutions-invalidated', { count: invalidatedCount });
      return invalidatedCount;
    } catch (error) {
      this.emit('invalidation-error', { error: (error as Error).message });
      return 0;
    }
  }

  /**
   * Invalidate solutions older than a specified age
   */
  async invalidateOlderThan(ageInDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ageInDays);
    const cutoffTimestamp = cutoffDate.getTime();

    return await this.invalidateSolutions((solution) => {
      const solutionTime = new Date(solution.metadata.timestamp).getTime();
      return solutionTime < cutoffTimestamp;
    });
  }

  /**
   * Invalidate solutions with low success rate
   */
  async invalidateLowPerformers(minSuccessRate: number = 0.5): Promise<number> {
    return await this.invalidateSolutions((solution) => {
      return (solution.metadata.successRate || 0) < minSuccessRate;
    });
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const allSolutions = await memoryClient.fetchSimilarRecords('', 'solutions', 10000);
    const validSolutions = allSolutions.filter(r => 
      !r.metadata.tags?.includes('invalidated')
    );

    return {
      totalSolutions: validSolutions.length,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      averageRelevanceScore: this.stats.totalScores / this.stats.scoreCount || 0,
    };
  }

  /**
   * Clear cache statistics
   */
  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.totalScores = 0;
    this.stats.scoreCount = 0;
    this.emit('stats-reset');
  }

  /**
   * Register custom invalidation rule
   */
  registerInvalidationRule(name: string, rule: (solution: Solution) => boolean): void {
    this.cacheInvalidationRules.set(name, rule);
    this.emit('rule-registered', { name });
  }

  /**
   * Run all invalidation rules
   */
  async runInvalidationRules(): Promise<number> {
    let totalInvalidated = 0;

    for (const [name, rule] of this.cacheInvalidationRules.entries()) {
      const count = await this.invalidateSolutions(rule);
      totalInvalidated += count;
      this.emit('rule-executed', { name, invalidatedCount: count });
    }

    return totalInvalidated;
  }

  /**
   * Search for solutions matching cache key
   */
  private async searchSolutions(cacheKey: CacheKey): Promise<MemoryRecordDTO[]> {
    // Build search query
    const query = [
      cacheKey.problem,
      cacheKey.context,
      ...(cacheKey.tags || [])
    ].filter(Boolean).join(' ');

    // Search with vector similarity if available
    const results = await memoryClient.fetchSimilarRecords(query, 'solutions', 10);

    // Filter out invalidated solutions
    return results.filter(r => !r.metadata.tags?.includes('invalidated'));
  }

  /**
   * Score solutions based on relevance to cache key
   */
  private scoreResults(results: MemoryRecordDTO[], cacheKey: CacheKey): SolutionMatch[] {
    const matches: SolutionMatch[] = [];

    for (const record of results) {
      const solution = this.recordToSolution(record);
      const score = this.calculateRelevanceScore(solution, cacheKey);
      const reason = this.getMatchReason(solution, cacheKey);

      matches.push({
        solution,
        relevanceScore: score,
        matchReason: reason,
      });
    }

    // Sort by relevance score descending
    return matches.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Calculate relevance score (0-1)
   */
  private calculateRelevanceScore(solution: Solution, cacheKey: CacheKey): number {
    let score = 0;
    let factors = 0;

    // Problem similarity (text matching)
    const problemSimilarity = this.textSimilarity(solution.problem, cacheKey.problem);
    score += problemSimilarity * 0.4;
    factors++;

    // Context similarity
    if (cacheKey.context) {
      const contextSimilarity = this.textSimilarity(
        solution.solution,
        cacheKey.context
      );
      score += contextSimilarity * 0.2;
      factors++;
    }

    // Tag overlap
    if (cacheKey.tags && cacheKey.tags.length > 0) {
      const tagScore = this.calculateTagOverlap(solution, cacheKey.tags);
      score += tagScore * 0.2;
      factors++;
    }

    // Success rate boost
    if (solution.metadata.successRate) {
      score += solution.metadata.successRate * 0.1;
      factors++;
    }

    // Usage count boost (popular solutions)
    if (solution.metadata.usageCount) {
      const usageScore = Math.min(solution.metadata.usageCount / 100, 1);
      score += usageScore * 0.1;
      factors++;
    }

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Simple text similarity (Jaccard similarity on words)
   */
  private textSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Calculate tag overlap score
   */
  private calculateTagOverlap(solution: Solution, tags: string[]): number {
    // This would need to extract tags from solution metadata
    // For now, return a default score
    return 0.5;
  }

  /**
   * Get human-readable match reason
   */
  private getMatchReason(solution: Solution, cacheKey: CacheKey): string {
    const reasons: string[] = [];

    if (this.textSimilarity(solution.problem, cacheKey.problem) > 0.7) {
      reasons.push('high problem similarity');
    }

    if (solution.metadata.successRate && solution.metadata.successRate > 0.8) {
      reasons.push('high success rate');
    }

    if (solution.metadata.usageCount && solution.metadata.usageCount > 10) {
      reasons.push('frequently used');
    }

    return reasons.length > 0 ? reasons.join(', ') : 'general match';
  }

  /**
   * Convert memory record to solution
   */
  private recordToSolution(record: MemoryRecordDTO): Solution {
    return {
      id: record.id,
      problem: record.key,
      solution: record.data.solution || JSON.stringify(record.data),
      code: record.data.code,
      metadata: {
        agentId: record.metadata.agentOrigin,
        timestamp: record.metadata.timestamp || new Date().toISOString(),
        successRate: record.data.successRate,
        usageCount: record.data.usageCount || 0,
        lastUsed: record.data.lastUsed,
        version: record.data.version,
      },
    };
  }

  /**
   * Update usage statistics for a solution
   */
  private async updateUsageStats(solution: Solution): Promise<void> {
    try {
      const record = await memoryClient.getRecord(solution.id);
      if (!record) return;

      record.data.usageCount = (record.data.usageCount || 0) + 1;
      record.data.lastUsed = new Date().toISOString();

      await memoryClient.putMemoryRecord(record);
    } catch (error) {
      // Silently fail - non-critical
    }
  }

  /**
   * Generate tags from solution
   */
  private generateTags(solution: Solution): string[] {
    const tags: string[] = ['solution'];

    if (solution.code) {
      tags.push('has-code');
    }

    if (solution.metadata.successRate && solution.metadata.successRate > 0.8) {
      tags.push('high-quality');
    }

    return tags;
  }

  /**
   * Initialize default invalidation rules
   */
  private initializeDefaultInvalidationRules(): void {
    // Rule: Invalidate very old solutions (> 180 days)
    this.registerInvalidationRule('age-limit', (solution) => {
      const ageInDays = (Date.now() - new Date(solution.metadata.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      return ageInDays > 180;
    });

    // Rule: Invalidate low performers
    this.registerInvalidationRule('low-performance', (solution) => {
      return (solution.metadata.successRate || 0) < 0.3;
    });
  }
}

// Singleton instance
export const sdSolutionCacheInstance = new sdSolutionCache();
