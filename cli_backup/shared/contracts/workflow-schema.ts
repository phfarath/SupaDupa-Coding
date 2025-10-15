/**
 * Workflow Schema Contracts
 * Defines interfaces for workflow execution and management
 */

export interface WorkflowStepDTO {
  id: string;
  name: string;
  type: 'planning' | 'coding' | 'testing' | 'review';
  agent: string;
  description: string;
  dependencies: string[];
  expectedOutputs: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  error?: string;
  metadata?: {
    duration?: number;
    retryCount?: number;
    artifacts?: string[];
  };
}

export interface WorkflowExecutionDTO {
  workflowId: string;
  planId: string;
  steps: WorkflowStepDTO[];
  currentStepIndex: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  startedAt: string;
  completedAt?: string;
  checkpoints: string[];
  artifacts: string[];
  metadata: {
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    estimatedDuration: number;
    actualDuration?: number;
    retryAttempts: number;
  };
}

export interface WorkflowSummaryDTO {
  workflowId: string;
  planId: string;
  status: 'completed' | 'failed' | 'partial';
  duration: number;
  agents: string[];
  artifacts: string[];
  checkpoints: string[];
  steps: {
    total: number;
    completed: number;
    failed: number;
  };
  success: boolean;
  timestamp: string;
  errors?: string[];
  warnings?: string[];
}

export interface WorkflowConfig {
  maxConcurrentTasks: number;
  checkpointInterval: number;
  retryAttempts: number;
  timeoutMs: number;
  enableAutoRecovery: boolean;
  checkpointPath: string;
  reportsPath: string;
}

export interface WorkflowEvent {
  type: string;
  workflowId: string;
  stepId?: string;
  timestamp: string;
  data: Record<string, any>;
}

// Event types for workflow system
export const WORKFLOW_EVENTS = {
  WORKFLOW_STARTED: 'SD_EVENT_WORKFLOW_STARTED',
  WORKFLOW_COMPLETED: 'SD_EVENT_WORKFLOW_COMPLETED',
  WORKFLOW_FAILED: 'SD_EVENT_WORKFLOW_FAILED',
  WORKFLOW_PAUSED: 'SD_EVENT_WORKFLOW_PAUSED',
  WORKFLOW_RESUMED: 'SD_EVENT_WORKFLOW_RESUMED',
  STEP_STARTED: 'SD_EVENT_STEP_STARTED',
  STEP_COMPLETED: 'SD_EVENT_STEP_COMPLETED',
  STEP_FAILED: 'SD_EVENT_STEP_FAILED',
  CHECKPOINT_CREATED: 'SD_EVENT_CHECKPOINT_CREATED',
  CHECKPOINT_RESTORED: 'SD_EVENT_CHECKPOINT_RESTORED',
} as const;

export type WorkflowEventType = typeof WORKFLOW_EVENTS[keyof typeof WORKFLOW_EVENTS];