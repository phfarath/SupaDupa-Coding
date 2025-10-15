import { sdMemoryRepository } from './memory-repository';
import { MemoryRecordDTO } from '../../shared/contracts/memory-record';

interface UsagePattern {
  agentId: string;
  category: string;
  pattern: string;
  frequency: number;
  lastUsed: string;
  successRate: number;
}

interface Solution {
  id: string;
  problem: string;
  solution: string;
  code?: string;
  source: string;
  relevance: number;
}

interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

interface KnowledgeNode {
  id: string;
  label: string;
  type: string;
  properties: Record<string, any>;
}

interface KnowledgeEdge {
  from: string;
  to: string;
  relationship: string;
  weight: number;
}

interface DuplicatePattern {
  pattern: string;
  duplicates: string[];
  count: number;
}

/**
 * MemoryAnalytics - Provides analytics and insights about memory usage
 */
export class MemoryAnalytics {
  private repository: sdMemoryRepository;

  constructor(repository: sdMemoryRepository) {
    this.repository = repository;
  }

  /**
   * Get usage patterns for a specific agent
   */
  async getUsagePatterns(agentId: string): Promise<UsagePattern[]> {
    // This would typically use more sophisticated analysis
    // For now, we'll query the database for usage patterns
    
    // Get all records for the agent
    const sql = `
      SELECT agent_origin as agentId, category, key, updated_at
      FROM memory_records
      WHERE agent_origin = ?
      ORDER BY updated_at DESC
    `;
    
    const results: any[] = await this.repository['db'].all(sql, [agentId]);
    
    // Group by category and key to find patterns
    const patternsMap = new Map<string, UsagePattern>();
    
    for (const result of results) {
      const key = `${result.category}:${result.key}`;
      if (patternsMap.has(key)) {
        const pattern = patternsMap.get(key)!;
        pattern.frequency++;
        pattern.lastUsed = result.updated_at;
      } else {
        patternsMap.set(key, {
          agentId: result.agentId,
          category: result.category,
          pattern: result.key,
          frequency: 1,
          lastUsed: result.updated_at,
          successRate: 0.8 // Default success rate
        });
      }
    }
    
    return Array.from(patternsMap.values());
  }

  /**
   * Get suggestions for similar problems to the given problem
   */
  async getSuggestionsForSimilarProblems(problem: string): Promise<Solution[]> {
    // First try to find similar problems using text similarity
    const similarRecords = await this.repository.fetchSimilarRecords(problem, 'solutions');
    
    // Convert records to solutions format
    const solutions: Solution[] = similarRecords.map(record => ({
      id: record.id,
      problem: record.key,
      solution: record.data.solution || JSON.stringify(record.data),
      code: record.data.code,
      source: record.metadata.agentOrigin,
      relevance: 0.5 // Will be calculated in real implementation
    }));
    
    // Use vector similarity if possible (would need embeddings)
    // For now, return text-based similarity results
    
    return solutions;
  }

  /**
   * Get a knowledge graph representation of the memory records
   */
  async getKnowledgeGraph(): Promise<KnowledgeGraph> {
    // Get all records to build the knowledge graph
    const allRecords = await this.repository['db'].all(
      'SELECT record_id as id, key, category, agent_origin as agentOrigin FROM memory_records ORDER BY updated_at DESC LIMIT 100'
    );
    
    // Create nodes from records
    const nodes: KnowledgeNode[] = allRecords.map(record => ({
      id: record.id,
      label: record.key,
      type: record.category,
      properties: {
        agentOrigin: record.agentOrigin,
        category: record.category
      }
    }));
    
    // Create edges based on relationships (in a real system, this would be more sophisticated)
    const edges: KnowledgeEdge[] = [];
    
    // For simplicity, connect records that share the same agent origin
    const agentRecordMap = new Map<string, string[]>();
    for (const record of allRecords) {
      if (!agentRecordMap.has(record.agentOrigin)) {
        agentRecordMap.set(record.agentOrigin, []);
      }
      agentRecordMap.get(record.agentOrigin)!.push(record.id);
    }
    
    // Create edges between records from the same agent
    for (const [agentId, recordIds] of agentRecordMap.entries()) {
      if (recordIds.length > 1) {
        for (let i = 0; i < recordIds.length - 1; i++) {
          for (let j = i + 1; j < recordIds.length; j++) {
            edges.push({
              from: recordIds[i],
              to: recordIds[j],
              relationship: 'same_agent',
              weight: 0.5
            });
          }
        }
      }
    }
    
    return { nodes, edges };
  }

  /**
   * Detect duplicate patterns in the memory records
   */
  async detectDuplicatePatterns(): Promise<DuplicatePattern[]> {
    // Get all records grouped by category to find duplicates
    const sql = `
      SELECT category, key, COUNT(*) as count
      FROM memory_records
      GROUP BY category, key
      HAVING COUNT(*) > 1
    `;
    
    const results: any[] = await this.repository['db'].all(sql);
    
    const duplicates: DuplicatePattern[] = results.map(result => ({
      pattern: result.key,
      duplicates: [], // Would need to get actual record IDs in a real implementation
      count: result.count
    }));
    
    return duplicates;
  }

  /**
   * Get statistics about memory usage
   */
  async getMemoryStats(): Promise<MemoryStats> {
    const stats: any = await this.repository['db'].get(`
      SELECT 
        COUNT(*) as totalRecords,
        COUNT(DISTINCT agent_origin) as uniqueAgents,
        COUNT(DISTINCT category) as uniqueCategories,
        MIN(created_at) as oldestRecord,
        MAX(updated_at) as newestRecord
      FROM memory_records
    `);
    
    return {
      totalRecords: stats.totalRecords,
      uniqueAgents: stats.uniqueAgents,
      uniqueCategories: stats.uniqueCategories,
      oldestRecord: stats.oldestRecord,
      newestRecord: stats.newestRecord
    };
  }
}

interface MemoryStats {
  totalRecords: number;
  uniqueAgents: number;
  uniqueCategories: number;
  oldestRecord: string;
  newestRecord: string;
}