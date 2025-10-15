import { sdMemoryRepository } from './memory-repository';
import { MemoryRecordDTO } from '../../shared/contracts/memory-record';

interface MemoryPermission {
  recordId: string;
  agentId: string;
  permissions: string[]; // e.g., ['read', 'write', 'delete']
  grantedAt: string;
  grantedBy: string;
}

interface MemoryPool {
  poolName: string;
  agents: string[];
  description: string;
  createdAt: string;
}

/**
 * CrossAgentMemoryService - Handles sharing of memory records between agents
 */
export class CrossAgentMemoryService {
  private repository: sdMemoryRepository;

  constructor(repository: sdMemoryRepository) {
    this.repository = repository;
  }

  /**
   * Share a memory record with specific agents
   */
  async shareMemoryWithAgents(recordId: string, targetAgents: string[]): Promise<void> {
    // First verify the record exists
    const record = await this.repository.getRecord(recordId);
    if (!record) {
      throw new Error(`Record with ID ${recordId} does not exist`);
    }

    // Create permissions for each target agent
    for (const agentId of targetAgents) {
      await this.grantAccess(recordId, agentId, ['read']);
    }

    console.log(`Shared record ${recordId} with agents: ${targetAgents.join(', ')}`);
  }

  /**
   * Get shared memories for a specific agent
   */
  async getSharedMemories(agentId: string): Promise<MemoryRecordDTO[]> {
    // First get agent's permissions
    const permissions = await this.getAgentPermissions(agentId);
    const accessibleRecordIds = permissions.map(p => p.recordId);

    if (accessibleRecordIds.length === 0) {
      return [];
    }

    // Get records that this agent has permission to access
    const recordIdsPlaceholder = accessibleRecordIds.map(() => '?').join(',');
    const sql = `
      SELECT record_id as id, key, category, data, agent_origin as agentOrigin, embedding_vector as embeddingVector, metadata
      FROM memory_records
      WHERE record_id IN (${recordIdsPlaceholder})
    `;

    const records: any[] = await this.repository['db'].all(sql, accessibleRecordIds);
    
    // Parse the stored JSON data
    return records.map(record => ({
      ...record,
      data: JSON.parse(record.data),
      metadata: JSON.parse(record.metadata),
      ...(record.embeddingVector && { 
        metadata: { 
          ...JSON.parse(record.metadata),
          embeddingVector: JSON.parse(record.embeddingVector)
        }
      })
    }));
  }

  /**
   * Create a memory pool shared between specific agents
   */
  async createMemoryPool(poolName: string, agents: string[], description?: string): Promise<void> {
    // In this implementation, we'll create a special category for the pool
    // and manage access through permissions
    
    // Check if pool already exists
    const existingPool = await this.getMemoryPool(poolName);
    if (existingPool) {
      throw new Error(`Memory pool ${poolName} already exists`);
    }

    // Create a sample record to represent the pool (this is more for metadata)
    const poolRecord: MemoryRecordDTO = {
      id: `pool-${poolName}`,
      key: poolName,
      category: 'pool-metadata',
      data: {
        name: poolName,
        agents,
        description: description || `Shared memory pool: ${poolName}`,
        createdAt: new Date().toISOString()
      },
      metadata: {
        agentOrigin: 'system',
        tags: ['pool', 'shared'],
        timestamp: new Date().toISOString()
      }
    };

    await this.repository.putMemoryRecord(poolRecord);

    // Grant permissions to all agents in the pool for this specific record
    for (const agentId of agents) {
      await this.grantAccess(poolRecord.id, agentId, ['read', 'write']);
    }

    console.log(`Created memory pool "${poolName}" for agents: ${agents.join(', ')}`);
  }

  /**
   * Grant specific permissions for a record to an agent
   */
  async grantAccess(recordId: string, agentId: string, permissions: string[]): Promise<void> {
    // Check if permission already exists
    const existing = await this.repository['db'].get(
      'SELECT * FROM memory_permissions WHERE record_id = ? AND agent_id = ?',
      [recordId, agentId]
    );

    if (existing) {
      // Update existing permissions
      await this.repository['db'].run(
        'UPDATE memory_permissions SET permissions = ?, granted_at = ? WHERE record_id = ? AND agent_id = ?',
        [JSON.stringify(permissions), new Date().toISOString(), recordId, agentId]
      );
    } else {
      // Create new permission
      await this.repository['db'].run(
        `INSERT INTO memory_permissions (record_id, agent_id, permissions, granted_at, granted_by) 
         VALUES (?, ?, ?, ?, ?)`,
        [recordId, agentId, JSON.stringify(permissions), new Date().toISOString(), 'system']
      );
    }
  }

  /**
   * Check if an agent has permission to perform an operation on a record
   */
  async checkAccessPermission(
    agentId: string,
    recordId: string,
    operation: 'read' | 'write' | 'delete'
  ): Promise<boolean> {
    const permission = await this.repository['db'].get(
      'SELECT permissions FROM memory_permissions WHERE record_id = ? AND agent_id = ?',
      [recordId, agentId]
    );

    if (!permission) {
      return false;
    }

    const permissions: string[] = JSON.parse(permission.permissions);
    return permissions.includes(operation) || permissions.includes('admin');
  }

  /**
   * Revoke permissions for a record from an agent
   */
  async revokeAccess(recordId: string, agentId: string): Promise<void> {
    await this.repository['db'].run(
      'DELETE FROM memory_permissions WHERE record_id = ? AND agent_id = ?',
      [recordId, agentId]
    );
  }

  /**
   * Get all memory pools for an agent
   */
  async getAgentPools(agentId: string): Promise<MemoryPool[]> {
    // Get all pool metadata records
    const records = await this.repository['db'].all(
      `SELECT data FROM memory_records 
       WHERE category = 'pool-metadata' 
       AND data LIKE ?`,
      [`%${agentId}%`]
    );

    const pools: MemoryPool[] = [];
    for (const record of records) {
      try {
        const data = JSON.parse(record.data);
        if (data.agents && data.agents.includes(agentId)) {
          pools.push({
            poolName: data.name,
            agents: data.agents,
            description: data.description,
            createdAt: data.createdAt
          });
        }
      } catch (e) {
        console.error('Error parsing pool data:', e);
      }
    }

    return pools;
  }

  /**
   * Get memory pool information
   */
  private async getMemoryPool(poolName: string): Promise<MemoryPool | null> {
    const record = await this.repository['db'].get(
      'SELECT data FROM memory_records WHERE record_id = ? AND category = ?',
      [`pool-${poolName}`, 'pool-metadata']
    );

    if (!record) {
      return null;
    }

    try {
      const data = JSON.parse(record.data);
      return {
        poolName: data.name,
        agents: data.agents,
        description: data.description,
        createdAt: data.createdAt
      };
    } catch (e) {
      console.error('Error parsing pool data:', e);
      return null;
    }
  }

  /**
   * Get permissions for an agent
   */
  private async getAgentPermissions(agentId: string): Promise<MemoryPermission[]> {
    const permissions: any[] = await this.repository['db'].all(
      'SELECT * FROM memory_permissions WHERE agent_id = ?',
      [agentId]
    );

    return permissions.map(permission => ({
      ...permission,
      permissions: JSON.parse(permission.permissions)
    }));
  }

  /**
   * Setup required database tables for permissions (should be called during initialization)
   */
  async setupPermissionsTable(): Promise<void> {
    await this.repository['db'].exec(`
      CREATE TABLE IF NOT EXISTS memory_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        record_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        permissions TEXT NOT NULL,
        granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        granted_by TEXT NOT NULL,
        UNIQUE(record_id, agent_id)
      )
    `);

    // Create indexes for performance
    await this.repository['db'].exec(`
      CREATE INDEX IF NOT EXISTS idx_memory_permissions_agent_id ON memory_permissions(agent_id)
    `);
    
    await this.repository['db'].exec(`
      CREATE INDEX IF NOT EXISTS idx_memory_permissions_record_id ON memory_permissions(record_id)
    `);
  }
}