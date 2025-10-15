/**
 * sdTaskQueue - Manages task queuing and execution
 * Handles concurrent task execution and prioritization
 */

import { EventEmitter } from 'events';
import { WorkflowStepDTO } from '../../../shared/contracts/workflow-schema';

export interface TaskItem {
  id: string;
  step: WorkflowStepDTO;
  priority: number;
  addedAt: Date;
  scheduledAt: Date | null;
  attempts: number;
  maxAttempts: number;
  dependencies: string[];
}

export interface TaskExecutionResult {
  taskId: string;
  success: boolean;
  result: any;
  error?: string;
  duration: number;
  attempts: number;
}

export class sdTaskQueue extends EventEmitter {
  private queue: TaskItem[] = [];
  private running: Set<string> = new Set();
  private completed: Set<string> = new Set();
  private failed: Set<string> = new Set();
  private maxConcurrent: number;
  private isProcessing: boolean = false;
  private executionTimeout: number;

  constructor(maxConcurrent: number = 5, executionTimeout: number = 300000) {
    super();
    this.maxConcurrent = maxConcurrent;
    this.executionTimeout = executionTimeout;
  }

  addTask(step: WorkflowStepDTO, priority: number = 0, scheduledAt?: Date): string {
    const taskId = this.generateTaskId();
    
    const task: TaskItem = {
      id: taskId,
      step,
      priority,
      addedAt: new Date(),
      scheduledAt: scheduledAt || null,
      attempts: 0,
      maxAttempts: 3,
      dependencies: step.dependencies || [],
    };

    this.queue.push(task);
    this.sortQueue();
    
    this.emit('task-added', { taskId, step, priority });
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
    
    return taskId;
  }

  removeTask(taskId: string): boolean {
    const index = this.queue.findIndex(task => task.id === taskId);
    if (index !== -1) {
      const task = this.queue.splice(index, 1)[0];
      this.emit('task-removed', { taskId, task });
      return true;
    }
    return false;
  }

  getTask(taskId: string): TaskItem | null {
    return this.queue.find(task => task.id === taskId) || null;
  }

  getQueueStatus(): {
    pending: number;
    running: number;
    completed: number;
    failed: number;
    total: number;
  } {
    return {
      pending: this.queue.length,
      running: this.running.size,
      completed: this.completed.size,
      failed: this.failed.size,
      total: this.queue.length + this.running.size + this.completed.size + this.failed.size,
    };
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.emit('processing-started');

    while (this.shouldContinueProcessing()) {
      const task = this.getNextTask();
      if (!task) {
        break;
      }

      // Check if dependencies are satisfied
      if (!this.areDependenciesSatisfied(task)) {
        continue;
      }

      // Check if we can run more tasks concurrently
      if (this.running.size >= this.maxConcurrent) {
        break;
      }

      // Execute the task
      this.executeTask(task);
    }

    this.isProcessing = false;
    this.emit('processing-stopped');
  }

  private shouldContinueProcessing(): boolean {
    return this.queue.length > 0 && this.running.size < this.maxConcurrent;
  }

  private getNextTask(): TaskItem | null {
    const now = new Date();
    
    // Find tasks that are ready to run
    const readyTasks = this.queue.filter(task => {
      if (task.scheduledAt && task.scheduledAt > now) {
        return false;
      }
      return this.areDependenciesSatisfied(task);
    });

    if (readyTasks.length === 0) {
      return null;
    }

    // Get the highest priority task
    readyTasks.sort((a, b) => {
      // First by priority (higher first)
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      // Then by added time (earlier first)
      return a.addedAt.getTime() - b.addedAt.getTime();
    });

    const task = readyTasks[0];
    
    // Remove from queue
    const index = this.queue.indexOf(task);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }

    return task;
  }

  private areDependenciesSatisfied(task: TaskItem): boolean {
    if (task.dependencies.length === 0) {
      return true;
    }

    return task.dependencies.every(depId => this.completed.has(depId));
  }

  private async executeTask(task: TaskItem): Promise<void> {
    task.attempts++;
    this.running.add(task.id);

    this.emit('task-started', { taskId: task.id, step: task.step, attempts: task.attempts });

    try {
      const startTime = Date.now();
      
      // Execute the task with timeout
      const result = await this.executeWithTimeout(task, this.executionTimeout);
      
      const duration = Date.now() - startTime;
      
      // Mark as completed
      this.running.delete(task.id);
      this.completed.add(task.id);

      const executionResult: TaskExecutionResult = {
        taskId: task.id,
        success: true,
        result,
        duration,
        attempts: task.attempts,
      };

      this.emit('task-completed', executionResult);
      
      // Continue processing queue
      setTimeout(() => this.processQueue(), 0);
      
    } catch (error) {
      const duration = 0; // Failed tasks don't count duration
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.running.delete(task.id);

      // Check if we should retry
      if (task.attempts < task.maxAttempts) {
        // Re-add to queue for retry
        task.scheduledAt = new Date(Date.now() + Math.pow(2, task.attempts) * 1000); // Exponential backoff
        this.queue.push(task);
        this.sortQueue();
        
        this.emit('task-retry', { 
          taskId: task.id, 
          error: errorMessage, 
          attempts: task.attempts,
          nextRetryAt: task.scheduledAt,
        });
      } else {
        // Mark as failed
        this.failed.add(task.id);
        
        const executionResult: TaskExecutionResult = {
          taskId: task.id,
          success: false,
          result: null,
          error: errorMessage,
          duration,
          attempts: task.attempts,
        };

        this.emit('task-failed', executionResult);
      }
      
      // Continue processing queue
      setTimeout(() => this.processQueue(), 0);
    }
  }

  private async executeWithTimeout(task: TaskItem, timeout: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Task execution timeout: ${task.id}`));
      }, timeout);

      // Simulate task execution - in real implementation, this would call the actual task executor
      this.simulateTaskExecution(task.step)
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private async simulateTaskExecution(step: WorkflowStepDTO): Promise<any> {
    // Simulate different execution times based on step type
    const baseDelay = {
      planning: 1000,
      coding: 2000,
      testing: 3000,
      review: 1500,
    }[step.type] || 2000;

    // Add some randomness
    const delay = baseDelay + Math.random() * 1000;

    await new Promise(resolve => setTimeout(resolve, delay));

    // Simulate occasional failures (10% chance)
    if (Math.random() < 0.1) {
      throw new Error(`Simulated failure for step: ${step.name}`);
    }

    return {
      stepId: step.id,
      stepName: step.name,
      executedAt: new Date().toISOString(),
      artifacts: [`artifact_${step.id}_${Date.now()}.json`],
    };
  }

  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // First by scheduled time (earlier first)
      if (a.scheduledAt && b.scheduledAt) {
        return a.scheduledAt.getTime() - b.scheduledAt.getTime();
      }
      if (a.scheduledAt) return -1;
      if (b.scheduledAt) return 1;
      
      // Then by priority (higher first)
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      
      // Finally by added time (earlier first)
      return a.addedAt.getTime() - b.addedAt.getTime();
    });
  }

  pause(): void {
    this.isProcessing = false;
    this.emit('processing-paused');
  }

  resume(): void {
    if (!this.isProcessing) {
      this.processQueue();
      this.emit('processing-resumed');
    }
  }

  clear(): void {
    this.pause();
    this.queue = [];
    this.running.clear();
    this.completed.clear();
    this.failed.clear();
    this.emit('queue-cleared');
  }

  getPendingTasks(): TaskItem[] {
    return [...this.queue];
  }

  getRunningTasks(): string[] {
    return [...this.running];
  }

  getCompletedTasks(): string[] {
    return [...this.completed];
  }

  getFailedTasks(): string[] {
    return [...this.failed];
  }

  getTaskMetrics(): {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    averageExecutionTime: number;
    successRate: number;
  } {
    const totalTasks = this.completed.size + this.failed.size;
    const successRate = totalTasks > 0 ? this.completed.size / totalTasks : 0;
    
    // In a real implementation, track actual execution times
    const averageExecutionTime = 2500; // Mock value

    return {
      totalTasks,
      completedTasks: this.completed.size,
      failedTasks: this.failed.size,
      averageExecutionTime,
      successRate,
    };
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  destroy(): void {
    this.pause();
    this.removeAllListeners();
    this.clear();
  }
}