/**
 * Core Orchestrator - manages multi-agent task execution
 */

import { EventEmitter } from 'events';
import { retryWithBackoff, CircuitBreaker } from '../utils/retry.js';

export interface OrchestratorConfig {
  executionMode?: string;
  retries?: number;
  [key: string]: any;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  agent: string;
  type: string;
  dependencies: string[];
  context?: Record<string, any>;
}

export interface Plan {
  id: string;
  description: string;
  createdAt: string;
  tasks: Task[];
  dependencies: string[];
  estimatedDuration: number | null;
  orchestrationPattern: string;
}

export interface Execution {
  planId: string;
  startedAt: string;
  status: string;
  results: any[];
  metrics: Record<string, any>;
  completedAt?: string;
  error?: string;
}

export interface TaskResult {
  taskId: string;
  agent: string;
  status: string;
  output?: any;
  error?: string;
  duration: number;
  completedAt: string;
}

export class Orchestrator extends EventEmitter {
  private config: OrchestratorConfig;
  private tasks: Map<string, Task>;
  private agents: Map<string, any>;
  private executionMode: string;
  private circuitBreakers: Map<string, CircuitBreaker>;

  constructor(config: OrchestratorConfig = {}) {
    super();
    this.config = config;
    this.tasks = new Map();
    this.agents = new Map();
    this.executionMode = config.executionMode || 'sequential';
    this.circuitBreakers = new Map();
  }

  /**
   * Register an agent with the orchestrator
   */
  registerAgent(name: string, agent: any): void {
    this.agents.set(name, agent);
    this.emit('agent-registered', { name, agent });
  }

  /**
   * Create a task plan from a description
   */
  async createPlan(description: string, options: { mode?: string } = {}): Promise<Plan> {
    const plan: Plan = {
      id: this.generateId(),
      description,
      createdAt: new Date().toISOString(),
      tasks: [],
      dependencies: [],
      estimatedDuration: null,
      orchestrationPattern: options.mode || this.executionMode
    };

    // TODO: Implement AI-based task decomposition
    // For now, create a basic structure
    plan.tasks = this.decomposeTasks(description);
    
    this.emit('plan-created', plan);
    return plan;
  }

  /**
   * Execute a plan with the configured orchestration pattern
   */
  async executePlan(plan: Plan, options: Record<string, any> = {}): Promise<Execution> {
    const execution: Execution = {
      planId: plan.id,
      startedAt: new Date().toISOString(),
      status: 'running',
      results: [],
      metrics: {}
    };

    this.emit('execution-started', execution);

    try {
      switch (plan.orchestrationPattern) {
        case 'sequential':
          await this.executeSequential(plan, execution);
          break;
        case 'concurrent':
          await this.executeConcurrent(plan, execution);
          break;
        case 'handoff':
          await this.executeHandoff(plan, execution);
          break;
        default:
          throw new Error(`Unknown orchestration pattern: ${plan.orchestrationPattern}`);
      }

      execution.status = 'completed';
      execution.completedAt = new Date().toISOString();
    } catch (error: any) {
      execution.status = 'failed';
      execution.error = error.message;
      this.emit('execution-failed', { execution, error });
      throw error;
    }

    this.emit('execution-completed', execution);
    return execution;
  }

  /**
   * Execute tasks sequentially
   */
  private async executeSequential(plan: Plan, execution: Execution): Promise<void> {
    for (const task of plan.tasks) {
      this.emit('task-started', task);
      const result = await this.executeTask(task);
      execution.results.push(result);
      this.emit('task-completed', { task, result });
    }
  }

  /**
   * Execute tasks concurrently
   */
  private async executeConcurrent(plan: Plan, execution: Execution): Promise<void> {
    const promises = plan.tasks.map(task => {
      this.emit('task-started', task);
      return this.executeTask(task).then(result => {
        this.emit('task-completed', { task, result });
        return result;
      });
    });

    execution.results = await Promise.all(promises);
  }

  /**
   * Execute tasks with handoff pattern
   */
  private async executeHandoff(plan: Plan, execution: Execution): Promise<void> {
    let context: Record<string, any> = {};
    
    for (const task of plan.tasks) {
      this.emit('task-started', task);
      task.context = context;
      const result = await this.executeTask(task);
      execution.results.push(result);
      context = { ...context, ...result.output };
      this.emit('task-completed', { task, result });
    }
  }

  /**
   * Execute a single task with assigned agent
   */
  private async executeTask(task: Task): Promise<TaskResult> {
    const agent = this.agents.get(task.agent);
    
    if (!agent) {
      throw new Error(`Agent not found: ${task.agent}`);
    }

    // Get or create circuit breaker for this agent
    if (!this.circuitBreakers.has(task.agent)) {
      this.circuitBreakers.set(task.agent, new CircuitBreaker({
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 60000
      }));
    }
    
    const circuitBreaker = this.circuitBreakers.get(task.agent)!;
    const startTime = Date.now();
    const maxRetries = this.config.retries || 3;
    
    try {
      const result = await retryWithBackoff(
        async () => {
          return await circuitBreaker.execute(async () => {
            return await agent.execute(task);
          });
        },
        {
          maxRetries,
          initialDelay: 1000,
          maxDelay: 30000,
          backoffFactor: 2,
          onRetry: (error: Error, attempt: number, delay: number) => {
            this.emit('task-retry', { 
              task, 
              attempt, 
              delay, 
              error: error.message 
            });
          }
        }
      );
      
      const duration = Date.now() - startTime;
      
      return {
        taskId: task.id,
        agent: task.agent,
        status: 'success',
        output: result,
        duration,
        completedAt: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        taskId: task.id,
        agent: task.agent,
        status: 'failed',
        error: error.message,
        duration: Date.now() - startTime,
        completedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Decompose description into tasks
   */
  private decomposeTasks(description: string): Task[] {
    // Simple heuristic-based decomposition
    // TODO: Replace with AI-based decomposition
    const tasks: Task[] = [];
    
    tasks.push({
      id: this.generateId(),
      name: 'Analysis',
      description: `Analyze requirements: ${description}`,
      agent: 'planner',
      type: 'analysis',
      dependencies: []
    });

    tasks.push({
      id: this.generateId(),
      name: 'Implementation',
      description: `Implement: ${description}`,
      agent: 'developer',
      type: 'implementation',
      dependencies: [tasks[0].id]
    });

    tasks.push({
      id: this.generateId(),
      name: 'Testing',
      description: `Test implementation: ${description}`,
      agent: 'qa',
      type: 'testing',
      dependencies: [tasks[1].id]
    });

    return tasks;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get execution status
   */
  getStatus(featureId: string): any {
    // TODO: Implement status tracking
    return {
      feature: featureId,
      status: 'unknown',
      tasks: [],
      metrics: {}
    };
  }
}