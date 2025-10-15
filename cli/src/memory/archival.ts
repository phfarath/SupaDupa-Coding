import { sdMemoryRepository } from './memory-repository';
import fs from 'fs/promises';
import path from 'path';
import zlib from 'zlib';

interface ArchiveStats {
  totalRecords: number;
  archivedRecords: number;
  compressionRatio: number;
  lastArchival: string;
  nextScheduledArchival: string;
}

interface ArchiveRecord {
  id: string;
  key: string;
  category: string;
  data: any;
  agentOrigin: string;
  archivedAt: string;
  originalSize: number;
  compressedSize: number;
  metadata?: {
    agentOrigin: string;
    embeddingVector?: number[];
    tags: string[];
    timestamp: string;
  };
}

/**
 * MemoryArchivalService - Handles archiving and compression of old memory records
 */
export class MemoryArchivalService {
  private repository: sdMemoryRepository;
  private archiveDir: string;
  private archiveThresholdDays: number;

  constructor(repository: sdMemoryRepository, archiveDir?: string, archiveThresholdDays: number = 30) {
    this.repository = repository;
    this.archiveDir = archiveDir || path.join(process.cwd(), 'data', 'archive');
    this.archiveThresholdDays = archiveThresholdDays;
    
    // Ensure archive directory exists
    fs.mkdir(this.archiveDir, { recursive: true }).catch(() => {});
  }

  /**
   * Archive records older than the threshold
   */
  async archiveOldRecords(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.archiveThresholdDays);
    const cutoffDateString = cutoffDate.toISOString();

    // Get records older than threshold that haven't been archived
    const sql = `
      SELECT record_id as id, key, category, data, agent_origin as agentOrigin, created_at
      FROM memory_records
      WHERE created_at < ? AND created_at IS NOT NULL
      ORDER BY created_at ASC
    `;

    const recordsToArchive: any[] = await this.repository['db'].all(sql, [cutoffDateString]);
    
    if (recordsToArchive.length === 0) {
      console.log(`No records to archive (older than ${this.archiveThresholdDays} days)`);
      return;
    }

    // Create an archive file with timestamp
    const archiveFileName = `archive_${new Date().toISOString().replace(/[:.]/g, '-')}.json.gz`;
    const archivePath = path.join(this.archiveDir, archiveFileName);

    // Prepare records for archiving
    const archiveRecords: ArchiveRecord[] = recordsToArchive.map(record => ({
      id: record.id,
      key: record.key,
      category: record.category,
      data: JSON.parse(record.data), // Parse stored JSON
      agentOrigin: record.agentOrigin,
      archivedAt: new Date().toISOString(),
      originalSize: record.data.length,
      compressedSize: 0 // Will be calculated after compression
    }));

    // Calculate original total size
    const originalTotalSize = archiveRecords.reduce((sum, record) => sum + record.originalSize, 0);

    // Compress the archive records
    const jsonString = JSON.stringify(archiveRecords);
    const compressedData = zlib.gzipSync(jsonString);
    
    // Update the compressed sizes
    const compressionRatio = compressedData.length / originalTotalSize;
    for (const record of archiveRecords) {
      record.compressedSize = Math.floor(record.originalSize * compressionRatio);
    }

    // Write compressed archive to file
    await fs.writeFile(archivePath, compressedData);
    
    // Remove archived records from the main database
    const ids = recordsToArchive.map(r => `'${r.id}'`).join(',');
    if (ids) {
      await this.repository['db'].run(`DELETE FROM memory_records WHERE record_id IN (${ids})`);
    }

    console.log(`Archived ${archiveRecords.length} records to ${archivePath}`);
    console.log(`Original size: ${originalTotalSize} bytes, Compressed size: ${compressedData.length} bytes`);
    console.log(`Compression ratio: ${(compressionRatio * 100).toFixed(2)}%`);
  }

  /**
   * Restore a record from archive
   */
  async restoreFromArchive(recordId: string): Promise<boolean> {
    // Find the archive file containing the record
    const archiveFiles = await fs.readdir(this.archiveDir);
    for (const fileName of archiveFiles) {
      if (fileName.endsWith('.gz')) {
        const archivePath = path.join(this.archiveDir, fileName);
        const compressedData = await fs.readFile(archivePath);
        const decompressedData = zlib.gunzipSync(compressedData);
        const archiveRecords: ArchiveRecord[] = JSON.parse(decompressedData.toString());

        // Find the requested record
        const record = archiveRecords.find(r => r.id === recordId);
        if (record) {
          // Restore to main database
          await this.repository.putMemoryRecord({
            id: record.id,
            key: record.key,
            category: record.category,
            data: record.data,
            metadata: {
              agentOrigin: record.agentOrigin,
              tags: record.metadata?.tags || [],
              timestamp: record.metadata?.timestamp || new Date().toISOString(),
              embeddingVector: record.metadata?.embeddingVector,
              archived: true,
              archivedAt: record.archivedAt
            }
          });
          
          console.log(`Restored record ${recordId} from archive`);
          return true;
        }
      }
    }

    console.log(`Record ${recordId} not found in archives`);
    return false;
  }

  /**
   * Get archive statistics
   */
  async getArchiveStats(): Promise<ArchiveStats> {
    // Count total records in main database
    const totalResult: any = await this.repository['db'].get('SELECT COUNT(*) as count FROM memory_records');
    const totalRecords = totalResult.count;

    // Count archived records
    const archiveFiles = await fs.readdir(this.archiveDir);
    let archivedRecords = 0;
    
    for (const fileName of archiveFiles) {
      if (fileName.endsWith('.gz')) {
        const archivePath = path.join(this.archiveDir, fileName);
        try {
          const compressedData = await fs.readFile(archivePath);
          const decompressedData = zlib.gunzipSync(compressedData);
          const archiveRecords: ArchiveRecord[] = JSON.parse(decompressedData.toString());
          archivedRecords += archiveRecords.length;
        } catch (error) {
          console.error(`Error reading archive ${fileName}:`, error);
        }
      }
    }

    // Calculate compression ratio
    let totalOriginalSize = 0;
    let totalCompressedSize = 0;
    
    for (const fileName of archiveFiles) {
      if (fileName.endsWith('.gz')) {
        const archivePath = path.join(this.archiveDir, fileName);
        try {
          const compressedData = await fs.readFile(archivePath);
          const decompressedData = zlib.gunzipSync(compressedData);
          const archiveRecords: ArchiveRecord[] = JSON.parse(decompressedData.toString());
          
          const originalSize = archiveRecords.reduce((sum, record) => sum + record.originalSize, 0);
          totalOriginalSize += originalSize;
          totalCompressedSize += compressedData.length;
        } catch (error) {
          console.error(`Error analyzing compression for ${fileName}:`, error);
        }
      }
    }
    
    const compressionRatio = totalOriginalSize > 0 ? (1 - totalCompressedSize / totalOriginalSize) : 0;

    // Calculate last and next archival times
    let lastArchival = 'never';
    let nextArchival = new Date().toISOString();
    
    // Find the most recent archive
    const sortedArchives = archiveFiles
      .filter(f => f.endsWith('.gz'))
      .sort((a, b) => {
        const dateA = a.replace(/^archive_|\.json\.gz$/g, '').replace(/-/g, '');
        const dateB = b.replace(/^archive_|\.json\.gz$/g, '').replace(/-/g, '');
        return parseInt(dateB) - parseInt(dateA);
      });
      
    if (sortedArchives.length > 0) {
      const lastArchive = sortedArchives[0];
      const dateStr = lastArchive.replace(/^archive_|\.json\.gz$/g, '');
      // Convert the date string back to ISO format
      const date = `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}T${dateStr.slice(9,11)}:${dateStr.slice(11,13)}:${dateStr.slice(13,15)}`;
      lastArchival = new Date(date).toISOString();
      
      const nextDate = new Date(lastArchival);
      nextDate.setDate(nextDate.getDate() + this.archiveThresholdDays);
      nextArchival = nextDate.toISOString();
    }

    return {
      totalRecords,
      archivedRecords,
      compressionRatio,
      lastArchival,
      nextScheduledArchival: nextArchival
    };
  }

  /**
   * Compress frequently accessed records
   */
  async compressFrequentlyAccessed(): Promise<void> {
    // This would identify frequently accessed records and compress them efficiently
    // In current implementation, we rely on the database's internal optimization
    // For now, we'll perform a database optimization
    
    await this.repository['db'].exec('VACUUM');
    await this.repository['db'].exec('ANALYZE');
    
    console.log('Database optimized (VACUUM and ANALYZE executed)');
  }

  /**
   * Get list of all archive files
   */
  async getArchiveList(): Promise<string[]> {
    return await fs.readdir(this.archiveDir);
  }
}