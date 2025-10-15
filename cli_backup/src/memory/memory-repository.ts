import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import { MemoryRecordDTO } from '../../shared/contracts/memory-record';
import { MigrationRunner } from './migrations/migration-runner';

/**
 * sdMemoryRepository - Repository for managing memory records in SQLite database
 * Implements the MemoryRepository as specified in the implementation plan
 */
export class sdMemoryRepository {
  private db: Database | null = null;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || path.join(process.cwd(), 'data', 'memory.db');
  }

  async initialize(): Promise<void> {
    try {
      // Open database connection
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });

      // Enable foreign keys
      await this.db.exec('PRAGMA foreign_keys = ON');

      // Run migrations to ensure schema is up-to-date
      const migrationRunner = new MigrationRunner(this.db);
      await migrationRunner.runMigrations();
      
      console.log(`Memory database initialized: ${this.dbPath}`);
    } catch (error) {
      throw new Error(`Failed to initialize memory database: ${error.message}`);
    }
  }

  async putMemoryRecord(record: MemoryRecordDTO): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const serializedData = JSON.stringify(record.data);
      const serializedMetadata = JSON.stringify(record.metadata);
      const embeddingVector = record.metadata.embeddingVector ? 
        JSON.stringify(record.metadata.embeddingVector) : null;

      await this.db.run(
        `INSERT OR REPLACE INTO memory_records 
         (record_id, key, category, data, agent_origin, embedding_vector, metadata) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          record.id,
          record.key,
          record.category,
          serializedData,
          record.metadata.agentOrigin,
          embeddingVector,
          serializedMetadata
        ]
      );
    } catch (error) {
      throw new Error(`Failed to store memory record: ${error.message}`);
    }
  }

  async fetchSimilarRecords(
    query: string, 
    category?: string, 
    limit: number = 10
  ): Promise<MemoryRecordDTO[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Simple text-based search - in a real implementation, this would use vector similarity
      let sql = `
        SELECT record_id as id, key, category, data, agent_origin as agentOrigin, embedding_vector as embeddingVector, metadata
        FROM memory_records 
        WHERE key LIKE ? OR data LIKE ?
      `;
      
      const params: any[] = [`%${query}%`, `%${query}%`];
      
      if (category) {
        sql += ` AND category = ?`;
        params.push(category);
      }
      
      sql += ` ORDER BY updated_at DESC LIMIT ?`;
      params.push(limit);

      const results = await this.db.all<MemoryRecordDTO>(sql, params);
      
      // Parse the stored JSON data
      return results.map(record => ({
        ...record,
        data: JSON.parse(record.data as unknown as string),
        metadata: JSON.parse(record.metadata as unknown as string),
        // Parse embedding vector if it exists
        ...(record.embeddingVector && { 
          metadata: { 
            ...JSON.parse(record.metadata as unknown as string),
            embeddingVector: JSON.parse(record.embeddingVector as unknown as string)
          }
        })
      }));
    } catch (error) {
      throw new Error(`Failed to fetch similar records: ${error.message}`);
    }
  }

  /**
   * Fetch records based on vector similarity using cosine similarity
   */
  async fetchSimilarRecordsByVector(
    queryVector: number[], 
    category?: string, 
    limit: number = 10
  ): Promise<{ record: MemoryRecordDTO; similarity: number }[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Get all records with embedding vectors
      let sql = `
        SELECT record_id as id, key, category, data, agent_origin as agentOrigin, embedding_vector as embeddingVector, metadata
        FROM memory_records 
        WHERE embedding_vector IS NOT NULL
      `;
      
      const params: any[] = [];
      
      if (category) {
        sql += ` AND category = ?`;
        params.push(category);
      }
      
      sql += ` ORDER BY updated_at DESC`;
      
      const results = await this.db.all<any>(sql, params);
      
      // Calculate cosine similarity for each record
      const similarities: { record: MemoryRecordDTO; similarity: number }[] = [];
      
      for (const result of results) {
        try {
          const storedVector = JSON.parse(result.embeddingVector as unknown as string);
          if (Array.isArray(storedVector) && storedVector.length === queryVector.length) {
            const similarity = this.cosineSimilarity(queryVector, storedVector);
            
            // Only include if similarity is above threshold
            if (similarity > 0.1) { // threshold can be adjusted
              const record: MemoryRecordDTO = {
                ...result,
                data: JSON.parse(result.data),
                metadata: JSON.parse(result.metadata),
                metadata: { 
                  ...JSON.parse(result.metadata),
                  embeddingVector: storedVector
                }
              };
              
              similarities.push({ record, similarity });
            }
          }
        } catch (e) {
          // Skip records with invalid embedding vectors
          continue;
        }
      }
      
      // Sort by similarity (highest first) and limit results
      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      throw new Error(`Failed to fetch similar records by vector: ${error.message}`);
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }
    
    // Calculate dot product
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] ** 2;
      normB += vecB[i] ** 2;
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) {
      return 0; // If one vector is zero, similarity is 0
    }
    
    return dotProduct / (normA * normB);
  }

  async getRecord(recordId: string): Promise<MemoryRecordDTO | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const record = await this.db.get(
        'SELECT record_id as id, key, category, data, agent_origin as agentOrigin, embedding_vector as embeddingVector, metadata FROM memory_records WHERE record_id = ?',
        [recordId]
      );

      if (!record) {
        return null;
      }

      return {
        ...record,
        data: JSON.parse(record.data),
        metadata: JSON.parse(record.metadata),
        ...(record.embeddingVector && { 
          metadata: { 
            ...JSON.parse(record.metadata),
            embeddingVector: JSON.parse(record.embeddingVector)
          }
        })
      };
    } catch (error) {
      throw new Error(`Failed to get record: ${error.message}`);
    }
  }

  async deleteRecord(recordId: string): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.db.run(
        'DELETE FROM memory_records WHERE record_id = ?',
        [recordId]
      );
      
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Failed to delete record: ${error.message}`);
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}