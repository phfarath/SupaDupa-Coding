/**
 * Checkpoint Schema Contracts
 * Defines interfaces for workflow checkpoint management
 */

export interface CheckpointDTO {
  checkpointId: string;
  workflowId: string;
  stepId: string;
  timestamp: string;
  state: {
    currentStepIndex: number;
    completedSteps: string[];
    pendingSteps: string[];
    artifacts: string[];
    context: Record<string, any>;
    variables: Record<string, any>;
  };
  metadata: {
    agentId: string;
    duration: number;
    memoryUsage: number;
    diskUsage: number;
    retryCount: number;
  };
}

export interface CheckpointRestoreDTO {
  checkpointId: string;
  workflowId: string;
  restored: boolean;
  state: CheckpointDTO['state'];
  timestamp: string;
  metadata: {
    restoreTime: number;
    restoreReason: string;
    previousCheckpointId?: string;
  };
}

export interface CheckpointConfig {
  checkpointPath: string;
  maxCheckpoints: number;
  compressionEnabled: boolean;
  autoCleanup: boolean;
  retentionDays: number;
  encryptionEnabled: boolean;
}

export interface CheckpointSummary {
  checkpointId: string;
  workflowId: string;
  stepId: string;
  timestamp: string;
  size: number;
  compressed: boolean;
  metadata: CheckpointDTO['metadata'];
}

export interface CheckpointListResponse {
  checkpoints: CheckpointSummary[];
  total: number;
  hasMore: boolean;
  nextPage?: number;
}

// Checkpoint events
export const CHECKPOINT_EVENTS = {
  CHECKPOINT_CREATED: 'SD_EVENT_CHECKPOINT_CREATED',
  CHECKPOINT_RESTORED: 'SD_EVENT_CHECKPOINT_RESTORED',
  CHECKPOINT_DELETED: 'SD_EVENT_CHECKPOINT_DELETED',
  CHECKPOINT_COMPRESSED: 'SD_EVENT_CHECKPOINT_COMPRESSED',
  CHECKPOINT_CLEANED_UP: 'SD_EVENT_CHECKPOINT_CLEANED_UP',
} as const;

export type CheckpointEventType = typeof CHECKPOINT_EVENTS[keyof typeof CHECKPOINT_EVENTS];

// Checkpoint validation
export interface CheckpointValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  checkpointId: string;
}

// Checkpoint compression
export interface CheckpointCompressionResult {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  compressionTime: number;
  success: boolean;
  error?: string;
}