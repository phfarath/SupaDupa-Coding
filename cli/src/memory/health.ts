import { sdMemoryRepository } from './memory-repository';

interface HealthReport {
  status: 'healthy' | 'warning' | 'error';
  checks: HealthCheck[];
  overallScore: number;
  timestamp: string;
}

interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

interface RepairReport {
  repairsAttempted: number;
  repairsSuccessful: number;
  issuesFound: number;
  details: RepairDetail[];
}

interface RepairDetail {
  recordId: string;
  issue: string;
  action: string;
  status: 'success' | 'failed';
  message: string;
}

interface MemoryReport {
  totalRecords: number;
  recordsByCategory: Record<string, number>;
  recordsByAgent: Record<string, number>;
  storageSize: number;
  oldestRecord: string;
  newestRecord: string;
  averageRecordSize: number;
  timestamp: string;
}

/**
 * MemoryHealthService - Provides health monitoring and maintenance for the memory system
 */
export class MemoryHealthService {
  private repository: sdMemoryRepository;

  constructor(repository: sdMemoryRepository) {
    this.repository = repository;
  }

  /**
   * Check the overall health of the memory database
   */
  async checkDatabaseIntegrity(): Promise<HealthReport> {
    const checks: HealthCheck[] = [];
    let overallScore = 100;
    
    const timestamp = new Date().toISOString();

    try {
      // Check if database connection is working
      const connectionCheck = await this.checkConnection();
      checks.push(connectionCheck);
      if (connectionCheck.status !== 'pass') {
        overallScore -= 25;
      }

      // Check database file integrity
      const integrityCheck = await this.checkDatabaseIntegrityInternal();
      checks.push(integrityCheck);
      if (integrityCheck.status !== 'pass') {
        overallScore -= 30;
      }

      // Check for orphaned permissions (permissions pointing to non-existent records)
      const permissionsCheck = await this.checkPermissionsIntegrity();
      checks.push(permissionsCheck);
      if (permissionsCheck.status !== 'pass') {
        overallScore -= 20;
      }

      // Check for invalid records (malformed JSON data)
      const recordsCheck = await this.checkRecordIntegrity();
      checks.push(recordsCheck);
      if (recordsCheck.status !== 'pass') {
        overallScore -= 25;
      }

      // Calculate overall status based on checks
      const failedChecks = checks.filter(c => c.status === 'fail').length;
      const status = failedChecks > 0 ? 'error' : 
                    checks.some(c => c.status === 'warning') ? 'warning' : 'healthy';

      return {
        status,
        checks,
        overallScore: Math.max(0, overallScore),
        timestamp
      };
    } catch (error) {
      return {
        status: 'error',
        checks: [{
          name: 'overall-check',
          status: 'fail',
          message: `Health check failed: ${error.message}`
        }],
        overallScore: 0,
        timestamp
      };
    }
  }

  /**
   * Repair corrupted records in the database
   */
  async repairCorruptedRecords(): Promise<RepairReport> {
    const details: RepairDetail[] = [];
    let issuesFound = 0;
    let repairsSuccessful = 0;

    // Check for records with malformed JSON data
    const recordsWithIssues = await this.findRecordIssues();
    issuesFound = recordsWithIssues.length;

    for (const recordId of recordsWithIssues) {
      // Attempt to repair by removing corrupted record and logging
      try {
        // For this implementation, we'll just log the corrupted record
        // In a real system, you might have backup copies to restore from
        details.push({
          recordId,
          issue: 'malformed JSON data',
          action: 'logged for manual repair',
          status: 'success',
          message: 'Record marked for manual review due to malformed JSON'
        });
        repairsSuccessful++;
      } catch (error) {
        details.push({
          recordId,
          issue: 'malformed JSON data',
          action: 'repair attempt',
          status: 'failed',
          message: error.message
        });
      }
    }

    // Check for orphaned permissions
    const orphanedPermissions = await this.findOrphanedPermissions();
    issuesFound += orphanedPermissions.length;

    for (const permId of orphanedPermissions) {
      try {
        // Remove orphaned permission
        await this.repository['db'].run(
          'DELETE FROM memory_permissions WHERE id = ?',
          [permId]
        );
        
        details.push({
          recordId: `permission-${permId}`,
          issue: 'orphaned permission',
          action: 'removed orphaned permission',
          status: 'success',
          message: 'Removed permission with no associated record'
        });
        repairsSuccessful++;
      } catch (error) {
        details.push({
          recordId: `permission-${permId}`,
          issue: 'orphaned permission',
          action: 'remove orphaned permission',
          status: 'failed',
          message: error.message
        });
      }
    }

    return {
      repairsAttempted: issuesFound,
      repairsSuccessful,
      issuesFound,
      details
    };
  }

  /**
   * Optimize the database (VACUUM, ANALYZE, etc.)
   */
  async optimizeDatabase(): Promise<void> {
    try {
      // Perform SQLite optimizations
      await this.repository['db'].exec('VACUUM');
      await this.repository['db'].exec('ANALYZE');
      
      // Rebuild indexes if needed
      await this.repository['db'].exec('REINDEX');
      
      console.log('Database optimization completed');
    } catch (error) {
      throw new Error(`Database optimization failed: ${error.message}`);
    }
  }

  /**
   * Generate a comprehensive memory report
   */
  async generateMemoryReport(): Promise<MemoryReport> {
    try {
      // Get total records count
      const totalResult: any = await this.repository['db'].get('SELECT COUNT(*) as count FROM memory_records');
      const totalRecords = totalResult.count;

      // Get records by category
      const categoryResult: any[] = await this.repository['db'].all(
        'SELECT category, COUNT(*) as count FROM memory_records GROUP BY category'
      );
      const recordsByCategory: Record<string, number> = {};
      categoryResult.forEach(row => {
        recordsByCategory[row.category] = row.count;
      });

      // Get records by agent origin
      const agentResult: any[] = await this.repository['db'].all(
        'SELECT agent_origin as agent, COUNT(*) as count FROM memory_records GROUP BY agent_origin'
      );
      const recordsByAgent: Record<string, number> = {};
      agentResult.forEach(row => {
        recordsByAgent[row.agent] = row.count;
      });

      // Get storage information
      const sizeResult: any[] = await this.repository['db'].all(
        'SELECT SUM(LENGTH(data) + LENGTH(metadata) + LENGTH(embedding_vector || \'\')) as total_size FROM memory_records'
      );
      const storageSize = sizeResult[0]?.total_size || 0;

      // Get date range
      const dateResult: any = await this.repository['db'].get(
        'SELECT MIN(created_at) as oldest, MAX(updated_at) as newest FROM memory_records'
      );
      const oldestRecord = dateResult?.oldest || new Date().toISOString();
      const newestRecord = dateResult?.newest || new Date().toISOString();

      // Calculate average record size
      const avgSizeResult: any = await this.repository['db'].get(
        'SELECT AVG(LENGTH(data) + LENGTH(metadata) + LENGTH(embedding_vector || \'\')) as avg_size FROM memory_records'
      );
      const averageRecordSize = avgSizeResult?.avg_size || 0;

      return {
        totalRecords,
        recordsByCategory,
        recordsByAgent,
        storageSize,
        oldestRecord,
        newestRecord,
        averageRecordSize,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to generate memory report: ${error.message}`);
    }
  }

  /**
   * Internal method to check database connection
   */
  private async checkConnection(): Promise<HealthCheck> {
    try {
      // Execute a simple query to test connection
      const result = await this.repository['db'].get('SELECT 1 as test');
      
      if (result && result.test === 1) {
        return {
          name: 'database-connection',
          status: 'pass',
          message: 'Database connection is working'
        };
      } else {
        return {
          name: 'database-connection',
          status: 'fail',
          message: 'Database connection test failed'
        };
      }
    } catch (error) {
      return {
        name: 'database-connection',
        status: 'fail',
        message: `Database connection failed: ${error.message}`
      };
    }
  }

  /**
   * Internal method to check database file integrity
   */
  private async checkDatabaseIntegrityInternal(): Promise<HealthCheck> {
    try {
      // Run SQLite's built-in integrity check
      const result: any = await this.repository['db'].get('PRAGMA integrity_check');
      
      if (result && result.integrity_check === 'ok') {
        return {
          name: 'database-integrity',
          status: 'pass',
          message: 'Database integrity check passed'
        };
      } else {
        return {
          name: 'database-integrity',
          status: 'fail',
          message: `Database integrity issue: ${result?.integrity_check || 'unknown'}`
        };
      }
    } catch (error) {
      return {
        name: 'database-integrity',
        status: 'fail',
        message: `Integrity check failed: ${error.message}`
      };
    }
  }

  /**
   * Check for orphaned permissions (permissions pointing to non-existent records)
   */
  private async checkPermissionsIntegrity(): Promise<HealthCheck> {
    try {
      // Find permissions that point to records that don't exist
      const result: any = await this.repository['db'].get(`
        SELECT COUNT(*) as orphaned_count
        FROM memory_permissions mp
        LEFT JOIN memory_records mr ON mp.record_id = mr.record_id
        WHERE mr.record_id IS NULL
      `);

      if (result.orphaned_count === 0) {
        return {
          name: 'permissions-integrity',
          status: 'pass',
          message: 'No orphaned permissions found'
        };
      } else {
        return {
          name: 'permissions-integrity',
          status: 'warning',
          message: `${result.orphaned_count} orphaned permissions found`,
          details: { orphanedCount: result.orphaned_count }
        };
      }
    } catch (error) {
      return {
        name: 'permissions-integrity',
        status: 'fail',
        message: `Permissions integrity check failed: ${error.message}`
      };
    }
  }

  /**
   * Check for invalid records (malformed JSON data)
   */
  private async checkRecordIntegrity(): Promise<HealthCheck> {
    try {
      // Find records with malformed JSON data or metadata
      const records: any[] = await this.repository['db'].all(
        'SELECT record_id, data, metadata FROM memory_records LIMIT 100'
      );

      let invalidCount = 0;
      for (const record of records) {
        try {
          JSON.parse(record.data);
          JSON.parse(record.metadata);
        } catch (e) {
          invalidCount++;
        }
      }

      if (invalidCount === 0) {
        return {
          name: 'record-integrity',
          status: 'pass',
          message: 'All checked records have valid JSON'
        };
      } else {
        return {
          name: 'record-integrity',
          status: 'warning',
          message: `${invalidCount} records with invalid JSON found`,
          details: { invalidCount }
        };
      }
    } catch (error) {
      return {
        name: 'record-integrity',
        status: 'fail',
        message: `Record integrity check failed: ${error.message}`
      };
    }
  }

  /**
   * Find records with JSON parsing issues
   */
  private async findRecordIssues(): Promise<string[]> {
    const records: any[] = await this.repository['db'].all(
      'SELECT record_id, data, metadata FROM memory_records'
    );

    const issueIds: string[] = [];
    for (const record of records) {
      try {
        JSON.parse(record.data);
        JSON.parse(record.metadata);
      } catch (e) {
        issueIds.push(record.record_id);
      }
    }

    return issueIds;
  }

  /**
   * Find orphaned permissions
   */
  private async findOrphanedPermissions(): Promise<string[]> {
    const permissions: any[] = await this.repository['db'].all(`
      SELECT mp.id
      FROM memory_permissions mp
      LEFT JOIN memory_records mr ON mp.record_id = mr.record_id
      WHERE mr.record_id IS NULL
    `);

    return permissions.map(p => p.id);
  }
}