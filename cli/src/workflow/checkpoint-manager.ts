/**
 * sdCheckpointManager - Manages workflow checkpoints
 * Handles saving, loading, and cleanup of checkpoints
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { 
  CheckpointDTO, 
  CheckpointRestoreDTO, 
  CheckpointConfig, 
  CheckpointSummary,
  CheckpointListResponse,
  CheckpointValidationResult,
  CHECKPOINT_EVENTS
} from '../../shared/contracts/checkpoint-schema';
import { WorkflowSummaryDTO } from '../../shared/contracts/workflow-schema';

export class sdCheckpointManager extends EventEmitter {
  private config: CheckpointConfig;
  private checkpointPath: string;
  private reportsPath: string;

  constructor(config: any) {
    super();
    this.config = {
      checkpointPath: config.checkpointPath || './data/checkpoints',
      maxCheckpoints: config.maxCheckpoints || 100,
      compressionEnabled: config.compressionEnabled || false,
      autoCleanup: config.autoCleanup || true,
      retentionDays: config.retentionDays || 30,
      encryptionEnabled: config.encryptionEnabled || false,
    };
    this.checkpointPath = this.config.checkpointPath;
    this.reportsPath = config.reportsPath || './workflow/reports';
  }

  async initialize(): Promise<void> {
    try {
      // Ensure directories exist
      await fs.mkdir(this.checkpointPath, { recursive: true });
      await fs.mkdir(this.reportsPath, { recursive: true });
      
      // Run cleanup if enabled
      if (this.config.autoCleanup) {
        await this.cleanupOldCheckpoints();
      }
      
      console.log('sdCheckpointManager initialized');
    } catch (error) {
      console.error('Failed to initialize sdCheckpointManager:', error);
      throw error;
    }
  }

  async saveCheckpoint(checkpoint: CheckpointDTO): Promise<void> {
    try {
      const filename = `${checkpoint.checkpointId}.json`;
      const filepath = join(this.checkpointPath, filename);
      
      // Ensure directory exists
      await fs.mkdir(dirname(filepath), { recursive: true });
      
      // Validate checkpoint
      const validation = this.validateCheckpoint(checkpoint);
      if (!validation.valid) {
        throw new Error(`Invalid checkpoint: ${validation.errors.join(', ')}`);
      }
      
      // Save checkpoint
      const checkpointData = JSON.stringify(checkpoint, null, 2);
      await fs.writeFile(filepath, checkpointData, 'utf-8');
      
      // Emit event
      this.emit('checkpoint-saved', checkpoint);
      this.emit(CHECKPOINT_EVENTS.CHECKPOINT_CREATED, {
        checkpointId: checkpoint.checkpointId,
        workflowId: checkpoint.workflowId,
        stepId: checkpoint.stepId,
        timestamp: checkpoint.timestamp,
      });
      
      console.log(`Checkpoint saved: ${checkpoint.checkpointId}`);
    } catch (error) {
      console.error('Failed to save checkpoint:', error);
      throw error;
    }
  }

  async loadCheckpoint(checkpointId: string): Promise<CheckpointDTO | null> {
    try {
      const filename = `${checkpointId}.json`;
      const filepath = join(this.checkpointPath, filename);
      
      // Check if file exists
      try {
        await fs.access(filepath);
      } catch {
        return null;
      }
      
      // Read and parse checkpoint
      const checkpointData = await fs.readFile(filepath, 'utf-8');
      const checkpoint: CheckpointDTO = JSON.parse(checkpointData);
      
      // Validate loaded checkpoint
      const validation = this.validateCheckpoint(checkpoint);
      if (!validation.valid) {
        console.warn(`Loaded checkpoint validation failed: ${validation.errors.join(', ')}`);
      }
      
      return checkpoint;
    } catch (error) {
      console.error(`Failed to load checkpoint ${checkpointId}:`, error);
      return null;
    }
  }

  async listCheckpoints(workflowId?: string, limit: number = 50, offset: number = 0): Promise<CheckpointListResponse> {
    try {
      const files = await fs.readdir(this.checkpointPath);
      const checkpointFiles = files
        .filter(file => file.endsWith('.json'))
        .sort((a, b) => {
          // Sort by timestamp (newest first)
          const aTime = parseInt(a.split('_')[1]);
          const bTime = parseInt(b.split('_')[1]);
          return bTime - aTime;
        });

      const checkpoints: CheckpointSummary[] = [];
      
      for (const file of checkpointFiles.slice(offset, offset + limit)) {
        try {
          const filepath = join(this.checkpointPath, file);
          const stats = await fs.stat(filepath);
          const checkpointData = await fs.readFile(filepath, 'utf-8');
          const checkpoint: CheckpointDTO = JSON.parse(checkpointData);
          
          // Filter by workflow ID if specified
          if (workflowId && checkpoint.workflowId !== workflowId) {
            continue;
          }
          
          checkpoints.push({
            checkpointId: checkpoint.checkpointId,
            workflowId: checkpoint.workflowId,
            stepId: checkpoint.stepId,
            timestamp: checkpoint.timestamp,
            size: stats.size,
            compressed: false, // TODO: Implement compression detection
            metadata: checkpoint.metadata,
          });
        } catch (error) {
          console.warn(`Failed to process checkpoint file ${file}:`, error);
        }
      }
      
      return {
        checkpoints,
        total: checkpointFiles.length,
        hasMore: offset + limit < checkpointFiles.length,
        nextPage: offset + limit < checkpointFiles.length ? offset + limit : undefined,
      };
    } catch (error) {
      console.error('Failed to list checkpoints:', error);
      return {
        checkpoints: [],
        total: 0,
        hasMore: false,
      };
    }
  }

  async deleteCheckpoint(checkpointId: string): Promise<boolean> {
    try {
      const filename = `${checkpointId}.json`;
      const filepath = join(this.checkpointPath, filename);
      
      await fs.unlink(filepath);
      
      this.emit(CHECKPOINT_EVENTS.CHECKPOINT_DELETED, { checkpointId });
      
      console.log(`Checkpoint deleted: ${checkpointId}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete checkpoint ${checkpointId}:`, error);
      return false;
    }
  }

  async restoreCheckpoint(checkpointId: string): Promise<CheckpointRestoreDTO | null> {
    try {
      const checkpoint = await this.loadCheckpoint(checkpointId);
      
      if (!checkpoint) {
        return null;
      }
      
      const restoreInfo: CheckpointRestoreDTO = {
        checkpointId,
        workflowId: checkpoint.workflowId,
        restored: true,
        state: checkpoint.state,
        timestamp: new Date().toISOString(),
        metadata: {
          restoreTime: Date.now(),
          restoreReason: 'manual_restore',
        },
      };
      
      this.emit(CHECKPOINT_EVENTS.CHECKPOINT_RESTORED, restoreInfo);
      
      return restoreInfo;
    } catch (error) {
      console.error(`Failed to restore checkpoint ${checkpointId}:`, error);
      return null;
    }
  }

  async saveSummary(summary: WorkflowSummaryDTO): Promise<void> {
    try {
      const filename = `run-summary_${summary.workflowId}.json`;
      const filepath = join(this.reportsPath, filename);
      
      // Ensure directory exists
      await fs.mkdir(dirname(filepath), { recursive: true });
      
      // Save summary
      const summaryData = JSON.stringify(summary, null, 2);
      await fs.writeFile(filepath, summaryData, 'utf-8');
      
      // Also save as latest summary
      const latestPath = join(this.reportsPath, 'run-summary.json');
      await fs.writeFile(latestPath, summaryData, 'utf-8');
      
      console.log(`Workflow summary saved: ${filename}`);
    } catch (error) {
      console.error('Failed to save workflow summary:', error);
      throw error;
    }
  }

  async cleanupOldCheckpoints(): Promise<void> {
    try {
      const cutoffTime = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);
      const files = await fs.readdir(this.checkpointPath);
      
      let deletedCount = 0;
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        try {
          const filepath = join(this.checkpointPath, file);
          const stats = await fs.stat(filepath);
          
          // Delete old checkpoints
          if (stats.mtime.getTime() < cutoffTime) {
            await fs.unlink(filepath);
            deletedCount++;
          }
        } catch (error) {
          console.warn(`Failed to process checkpoint file ${file} during cleanup:`, error);
        }
      }
      
      // If we still have too many checkpoints, delete the oldest ones
      if (deletedCount === 0) {
        const allFiles = (await fs.readdir(this.checkpointPath))
          .filter(f => f.endsWith('.json'))
          .sort((a, b) => {
            const aTime = parseInt(a.split('_')[1]);
            const bTime = parseInt(b.split('_')[1]);
            return aTime - bTime;
          });
        
        if (allFiles.length > this.config.maxCheckpoints) {
          const filesToDelete = allFiles.slice(0, allFiles.length - this.config.maxCheckpoints);
          
          for (const file of filesToDelete) {
            try {
              const filepath = join(this.checkpointPath, file);
              await fs.unlink(filepath);
              deletedCount++;
            } catch (error) {
              console.warn(`Failed to delete excess checkpoint file ${file}:`, error);
            }
          }
        }
      }
      
      if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} old checkpoints`);
        this.emit(CHECKPOINT_EVENTS.CHECKPOINT_CLEANED_UP, { deletedCount });
      }
    } catch (error) {
      console.error('Failed to cleanup old checkpoints:', error);
    }
  }

  validateCheckpoint(checkpoint: CheckpointDTO): CheckpointValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Required fields
    if (!checkpoint.checkpointId) errors.push('Missing checkpointId');
    if (!checkpoint.workflowId) errors.push('Missing workflowId');
    if (!checkpoint.stepId) errors.push('Missing stepId');
    if (!checkpoint.timestamp) errors.push('Missing timestamp');
    
    // State validation
    if (!checkpoint.state) errors.push('Missing state');
    else {
      if (typeof checkpoint.state.currentStepIndex !== 'number') {
        errors.push('Invalid currentStepIndex');
      }
      if (!Array.isArray(checkpoint.state.completedSteps)) {
        errors.push('Invalid completedSteps');
      }
      if (!Array.isArray(checkpoint.state.pendingSteps)) {
        errors.push('Invalid pendingSteps');
      }
    }
    
    // Metadata validation
    if (!checkpoint.metadata) errors.push('Missing metadata');
    else {
      if (!checkpoint.metadata.agentId) errors.push('Missing agentId');
      if (typeof checkpoint.metadata.duration !== 'number') {
        errors.push('Invalid duration');
      }
    }
    
    // Warnings
    if (checkpoint.state && checkpoint.state.artifacts.length > 100) {
      warnings.push('Large number of artifacts may affect performance');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      checkpointId: checkpoint.checkpointId,
    };
  }

  async getCheckpointStats(): Promise<{
    totalCheckpoints: number;
    totalSize: number;
    oldestCheckpoint?: string;
    newestCheckpoint?: string;
  }> {
    try {
      const files = await fs.readdir(this.checkpointPath);
      const checkpointFiles = files.filter(file => file.endsWith('.json'));
      
      let totalSize = 0;
      let oldestTime = Date.now();
      let newestTime = 0;
      let oldestFile = '';
      let newestFile = '';
      
      for (const file of checkpointFiles) {
        try {
          const filepath = join(this.checkpointPath, file);
          const stats = await fs.stat(filepath);
          
          totalSize += stats.size;
          
          if (stats.mtime.getTime() < oldestTime) {
            oldestTime = stats.mtime.getTime();
            oldestFile = file;
          }
          
          if (stats.mtime.getTime() > newestTime) {
            newestTime = stats.mtime.getTime();
            newestFile = file;
          }
        } catch (error) {
          console.warn(`Failed to stat checkpoint file ${file}:`, error);
        }
      }
      
      return {
        totalCheckpoints: checkpointFiles.length,
        totalSize,
        oldestCheckpoint: oldestFile ? oldestFile.replace('.json', '') : undefined,
        newestCheckpoint: newestFile ? newestFile.replace('.json', '') : undefined,
      };
    } catch (error) {
      console.error('Failed to get checkpoint stats:', error);
      return {
        totalCheckpoints: 0,
        totalSize: 0,
      };
    }
  }

  async cleanup(): Promise<void> {
    // Final cleanup before shutdown
    if (this.config.autoCleanup) {
      await this.cleanupOldCheckpoints();
    }
    
    this.removeAllListeners();
    console.log('sdCheckpointManager cleaned up');
  }
}