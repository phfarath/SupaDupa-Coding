import { memoryClient } from './index';

interface CacheKey {
  problem: string;
  context?: string;
  tags?: string[];
}

interface Solution {
  id: string;
  problem: string;
  solution: string;
  code?: string;
  metadata: {
    agentId: string;
    timestamp: string;
    successRate?: number;
  };
}

/**
 * CacheClient - Shared cache endpoint for reusing previous solutions
 * Implements the cache client as specified in the implementation plan
 */
export class CacheClient {
  /**
   * Retrieve a cached solution based on the provided cache key
   */
  async getCachedSolution(cacheKey: CacheKey): Promise<Solution | null> {
    try {
      // Search for similar problems in memory
      const results = await memoryClient.fetchSimilarRecords(
        cacheKey.problem,
        'solutions',
        5
      );

      if (results && results.length > 0) {
        // Find the most relevant solution based on similarity
        // In a real implementation, we would use vector similarity
        const bestMatch = results[0];
        
        // Return the solution in the expected format
        return {
          id: bestMatch.id,
          problem: bestMatch.key,
          solution: bestMatch.data?.solution || JSON.stringify(bestMatch.data),
          code: bestMatch.data?.code,
          metadata: {
            agentId: bestMatch.metadata.agentOrigin,
            timestamp: bestMatch.metadata.timestamp || new Date().toISOString(),
            successRate: bestMatch.data?.successRate
          }
        };
      }

      return null;
    } catch (error) {
      console.error('Error retrieving cached solution:', error);
      return null;
    }
  }

  /**
   * Store a solution in the cache
   */
  async storeSolution(solution: Solution): Promise<void> {
    try {
      const record = {
        id: solution.id,
        key: solution.problem,
        category: 'solutions',
        data: {
          solution: solution.solution,
          code: solution.code,
          successRate: solution.metadata.successRate
        },
        metadata: {
          agentOrigin: solution.metadata.agentId,
          tags: solution.metadata.successRate ? ['solution'] : ['solution'],
          timestamp: solution.metadata.timestamp
        }
      };

      await memoryClient.putMemoryRecord(record);
    } catch (error) {
      console.error('Error storing solution:', error);
    }
  }
}

// Export a singleton instance
export const cacheClient = new CacheClient();