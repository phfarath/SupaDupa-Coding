/**
 * sdWorkflowRunner - Main workflow execution engine
 * Implements workflow orchestration with checkpoint management
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { 
  WorkflowExecutionDTO, 
  WorkflowStepDTO, 
  WorkflowSummaryDTO, 
  WorkflowConfig,
  WorkflowEventType,
  WORKFLOW_EVENTS
} from '../../shared/contracts/workflow-schema';
import { sdCheckpointManager } from './checkpoint-manager';
import { sdTaskExecutor } from './task-executor';
import { sdStateManager } from './utils/state-manager';

export class sdWorkflowRunner extends EventEmitter {
  private checkpointManager: sdCheckpointManager;
  private taskExecutor: sdTaskExecutor;
  private stateManager: sdStateManager;
  private currentExecution: WorkflowExecutionDTO | null = null;
  private config: WorkflowConfig;
  private isRunning: boolean = false;
  private startTime: number = 0;

  constructor(config: WorkflowConfig) {
    super();
    this.config = config;
    this.checkpointManager = new sdCheckpointManager(config);
    this.taskExecutor = new sdTaskExecutor(config);
    this.stateManager = new sdStateManager();
    
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.checkpointManager.on('checkpoint-saved', (checkpoint) => {
      this.emit(WORKFLOW_EVENTS.CHECKPOINT_CREATED, checkpoint);
    });

    this.taskExecutor.on('step-started', (data) => {
      this.emit(WORKFLOW_EVENTS.STEP_STARTED, data);
    });

    this.taskExecutor.on('step-completed', (data) => {
      this.emit(WORKFLOW_EVENTS.STEP_COMPLETED, data);
    });

    this.taskExecutor.on('step-failed', (data) => {
      this.emit(WORKFLOW_EVENTS.STEP_FAILED, data);
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.checkpointManager.initialize();
      await this.taskExecutor.initialize();
      await this.stateManager.initialize();
      
      console.log('sdWorkflowRunner initialized successfully');
    } catch (error) {
      console.error('Failed to initialize sdWorkflowRunner:', error);
      throw error;
    }
  }

  async runWorkflow(planId: string, steps: WorkflowStepDTO[]): Promise<WorkflowSummaryDTO> {
    if (this.isRunning) {
      throw new Error('Workflow is already running');
    }

    const workflowId = this.generateWorkflowId();
    this.startTime = Date.now();
    this.isRunning = true;

    this.currentExecution = {
      workflowId,
      planId,
      steps: this.cloneSteps(steps),
      currentStepIndex: 0,
      status: 'running',
      startedAt: new Date().toISOString(),
      checkpoints: [],
      artifacts: [],
      metadata: {
        totalSteps: steps.length,
        completedSteps: 0,
        failedSteps: 0,
        estimatedDuration: this.estimateDuration(steps),
        retryAttempts: 0,
      },
    };

    this.emit(WORKFLOW_EVENTS.WORKFLOW_STARTED, { 
      workflowId, 
      planId, 
      totalSteps: steps.length 
    });

    try {
      for (let i = 0; i < steps.length; i++) {
        const step = this.currentExecution.steps[i];
        this.currentExecution.currentStepIndex = i;

        // Check dependencies
        if (!this.checkDependencies(step, this.currentExecution.steps)) {
          throw new Error(`Dependencies not met for step: ${step.name}`);
        }

        const result = await this.runStep(step);
        
        if (!result.success) {
          this.currentExecution.status = 'failed';
          this.currentExecution.metadata.failedSteps++;
          
          // Attempt retry if configured
          if (this.config.retryAttempts > 0) {
            await this.handleStepRetry(step, result.error);
          } else {
            break;
          }
        } else {
          this.currentExecution.metadata.completedSteps++;
          
          // Persist checkpoint after each successful step
          await this.persistCheckpoint(this.currentExecution, step.id);
        }
      }

      if (this.currentExecution.metadata.failedSteps === 0) {
        this.currentExecution.status = 'completed';
      }

      this.currentExecution.completedAt = new Date().toISOString();
      
      const summary = await this.generateSummary(this.currentExecution, Date.now() - this.startTime);
      
      this.emit(WORKFLOW_EVENTS.WORKFLOW_COMPLETED, summary);
      
      return summary;
    } catch (error) {
      this.currentExecution.status = 'failed';
      this.currentExecution.completedAt = new Date().toISOString();
      
      const errorSummary = await this.generateSummary(this.currentExecution, Date.now() - this.startTime);
      this.emit(WORKFLOW_EVENTS.WORKFLOW_FAILED, { 
        workflowId, 
        error: error.message,
        summary: errorSummary
      });
      
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  async runStep(step: WorkflowStepDTO): Promise<{ success: boolean; result: any; error?: string }> {
    step.status = 'running';
    step.startedAt = new Date().toISOString();

    this.emit(WORKFLOW_EVENTS.STEP_STARTED, { 
      stepId: step.id, 
      name: step.name,
      agent: step.agent 
    });

    try {
      const result = await this.taskExecutor.executeStep(step);
      
      step.status = 'completed';
      step.completedAt = new Date().toISOString();
      step.metadata = {
        ...step.metadata,
        duration: Date.now() - new Date(step.startedAt!).getTime(),
        artifacts: result.artifacts || [],
      };
      
      // Add artifacts to workflow
      if (result.artifacts) {
        this.currentExecution!.artifacts.push(...result.artifacts);
      }
      
      this.emit(WORKFLOW_EVENTS.STEP_COMPLETED, { 
        stepId: step.id, 
        result,
        duration: step.metadata.duration
      });
      
      return { success: true, result };
    } catch (error) {
      step.status = 'failed';
      step.error = error.message;
      step.completedAt = new Date().toISOString();
      step.metadata = {
        ...step.metadata,
        duration: Date.now() - new Date(step.startedAt!).getTime(),
        retryCount: (step.metadata?.retryCount || 0) + 1,
      };
      
      this.emit(WORKFLOW_EVENTS.STEP_FAILED, { 
        stepId: step.id, 
        error: error.message,
        retryCount: step.metadata.retryCount
      });
      
      return { success: false, result: null, error: error.message };
    }
  }

  async persistCheckpoint(execution: WorkflowExecutionDTO, stepId: string): Promise<string> {
    const checkpoint = {
      checkpointId: this.generateCheckpointId(),
      workflowId: execution.workflowId,
      stepId,
      timestamp: new Date().toISOString(),
      state: {
        currentStepIndex: execution.currentStepIndex,
        completedSteps: execution.steps
          .filter(s => s.status === 'completed')
          .map(s => s.id),
        pendingSteps: execution.steps
          .filter(s => s.status === 'pending')
          .map(s => s.id),
        artifacts: execution.artifacts,
        context: this.stateManager.getContext(),
        variables: this.stateManager.getVariables(),
      },
      metadata: {
        agentId: execution.steps[execution.currentStepIndex].agent,
        duration: 0,
        memoryUsage: process.memoryUsage().heapUsed,
        diskUsage: await this.getDiskUsage(),
        retryCount: execution.metadata.retryAttempts,
      },
    };

    await this.checkpointManager.saveCheckpoint(checkpoint);
    execution.checkpoints.push(checkpoint.checkpointId);
    
    this.emit(WORKFLOW_EVENTS.CHECKPOINT_CREATED, { 
      checkpointId: checkpoint.checkpointId,
      workflowId: execution.workflowId,
      stepId
    });
    
    return checkpoint.checkpointId;
  }

  async restoreCheckpoint(checkpointId: string): Promise<WorkflowExecutionDTO> {
    const checkpoint = await this.checkpointManager.loadCheckpoint(checkpointId);
    
    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${checkpointId}`);
    }

    this.stateManager.restoreContext(checkpoint.state.context);
    this.stateManager.setVariables(checkpoint.state.variables);
    
    // Reconstruct workflow execution state
    this.currentExecution = {
      workflowId: checkpoint.workflowId,
      planId: '', // Will be loaded from original plan
      steps: [], // Will be reconstructed from original plan
      currentStepIndex: checkpoint.state.currentStepIndex,
      status: 'running',
      startedAt: checkpoint.timestamp,
      checkpoints: [checkpointId],
      artifacts: checkpoint.state.artifacts,
      metadata: {
        totalSteps: 0, // Will be set from original plan
        completedSteps: checkpoint.state.completedSteps.length,
        failedSteps: 0,
        estimatedDuration: 0,
        retryAttempts: checkpoint.metadata.retryCount,
      },
    };
    
    this.emit(WORKFLOW_EVENTS.CHECKPOINT_RESTORED, { 
      checkpointId,
      workflowId: checkpoint.workflowId
    });
    
    return this.currentExecution;
  }

  async pauseWorkflow(): Promise<void> {
    if (!this.isRunning || !this.currentExecution) {
      throw new Error('No workflow is currently running');
    }

    this.currentExecution.status = 'paused';
    this.isRunning = false;
    
    this.emit(WORKFLOW_EVENTS.WORKFLOW_PAUSED, { 
      workflowId: this.currentExecution.workflowId 
    });
  }

  async resumeWorkflow(): Promise<void> {
    if (!this.currentExecution) {
      throw new Error('No workflow execution to resume');
    }

    if (this.currentExecution.status !== 'paused') {
      throw new Error('Workflow is not in paused state');
    }

    this.currentExecution.status = 'running';
    this.isRunning = true;
    
    this.emit(WORKFLOW_EVENTS.WORKFLOW_RESUMED, { 
      workflowId: this.currentExecution.workflowId 
    });
  }

  getCurrentExecution(): WorkflowExecutionDTO | null {
    return this.currentExecution;
  }

  isWorkflowRunning(): boolean {
    return this.isRunning;
  }

  private async generateSummary(execution: WorkflowExecutionDTO, duration: number): Promise<WorkflowSummaryDTO> {
    const summary: WorkflowSummaryDTO = {
      workflowId: execution.workflowId,
      planId: execution.planId,
      status: execution.status === 'completed' ? 'completed' : 
              execution.status === 'failed' ? 'failed' : 'partial',
      duration,
      agents: [...new Set(execution.steps.map(s => s.agent))],
      artifacts: execution.artifacts,
      checkpoints: execution.checkpoints,
      steps: {
        total: execution.metadata.totalSteps,
        completed: execution.metadata.completedSteps,
        failed: execution.metadata.failedSteps,
      },
      success: execution.status === 'completed',
      timestamp: new Date().toISOString(),
      errors: execution.steps.filter(s => s.error).map(s => s.error!),
      warnings: [], // Add warning collection logic if needed
    };

    // Save summary to file
    await this.saveSummaryReport(summary);
    
    return summary;
  }

  private async saveSummaryReport(summary: WorkflowSummaryDTO): Promise<void> {
    await this.checkpointManager.saveSummary(summary);
  }

  private checkDependencies(step: WorkflowStepDTO, allSteps: WorkflowStepDTO[]): boolean {
    if (step.dependencies.length === 0) {
      return true;
    }

    return step.dependencies.every(depId => {
      const depStep = allSteps.find(s => s.id === depId);
      return depStep && depStep.status === 'completed';
    });
  }

  private async handleStepRetry(step: WorkflowStepDTO, error: string): Promise<void> {
    if (!this.currentExecution) return;

    const retryCount = step.metadata?.retryCount || 0;
    if (retryCount < this.config.retryAttempts) {
      console.log(`Retrying step ${step.name} (attempt ${retryCount + 1}/${this.config.retryAttempts})`);
      
      // Reset step status and retry
      step.status = 'pending';
      step.error = undefined;
      step.startedAt = undefined;
      step.completedAt = undefined;
      
      // Decrement current step index to retry
      this.currentExecution.currentStepIndex--;
      this.currentExecution.metadata.retryAttempts++;
      
      // Wait before retry
      await this.delay(Math.pow(2, retryCount) * 1000); // Exponential backoff
    }
  }

  private estimateDuration(steps: WorkflowStepDTO[]): number {
    // Simple estimation: 60 seconds per step, adjusted by complexity
    const baseTime = 60000; // 1 minute per step
    return steps.reduce((total, step) => {
      const complexity = step.metadata?.complexity || 'medium';
      const multiplier = complexity === 'simple' ? 0.5 : 
                        complexity === 'complex' ? 2 : 1;
      return total + (baseTime * multiplier);
    }, 0);
  }

  private cloneSteps(steps: WorkflowStepDTO[]): WorkflowStepDTO[] {
    return steps.map(step => ({ ...step }));
  }

  private async getDiskUsage(): Promise<number> {
    // Simple disk usage estimation
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const stats = await fs.stat(process.cwd());
      return stats.size || 0;
    } catch {
      return 0;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateWorkflowId(): string {
    return `workflow_${Date.now()}_${uuidv4().substr(0, 8)}`;
  }

  private generateCheckpointId(): string {
    return `checkpoint_${Date.now()}_${uuidv4().substr(0, 8)}`;
  }

  async cleanup(): Promise<void> {
    await this.checkpointManager.cleanup();
    await this.taskExecutor.cleanup();
    await this.stateManager.cleanup();
    
    this.removeAllListeners();
    this.currentExecution = null;
    this.isRunning = false;
  }
}