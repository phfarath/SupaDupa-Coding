import { EventEmitter } from 'events';
import { AgentConfigSchema, AgentTaskDTO, AgentStatusDTO } from '../../shared/contracts/agent-config';
import { LlmRequest, LlmResponse } from '../../shared/contracts/llm-contracts';
import { sdProviderRegistry } from '../api/provider-registry';

// Legacy exports for backward compatibility
export interface AgentConfig {
  [key: string]: any;
}

export interface AgentTask {
  type: string;
  [key: string]: any;
}

export interface AgentInfo {
  name: string;
  capabilities: string[];
  config: AgentConfig;
}

/**
 * sdBaseAgent - Enhanced base class for all AI agents with LLM integration
 */
export abstract class sdBaseAgent extends EventEmitter {
  protected config: AgentConfigSchema;
  protected providerRegistry: sdProviderRegistry;
  protected status: 'idle' | 'busy' | 'error' | 'offline' = 'idle';
  protected currentTask?: AgentTaskDTO;
  protected metrics: {
    tasksCompleted: number;
    tasksFailed: number;
    totalExecutionTime: number;
    lastActivity?: string;
  };

  constructor(config: AgentConfigSchema, providerRegistry: sdProviderRegistry) {
    super();
    this.config = config;
    this.providerRegistry = providerRegistry;
    this.metrics = {
      tasksCompleted: 0,
      tasksFailed: 0,
      totalExecutionTime: 0
    };
  }

  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    try {
      // Validate configuration
      this.validateConfig();
      
      // Test provider connection
      await this.testProviderConnection();
      
      this.status = 'idle';
      this.emit('agent:initialized', { agentId: this.config.id });
    } catch (error) {
      this.status = 'error';
      this.emit('agent:error', { agentId: this.config.id, error });
      throw error;
    }
  }

  /**
   * Execute a task using LLM integration
   */
  async execute(task: AgentTaskDTO): Promise<any> {
    if (this.status !== 'idle') {
      throw new Error(`Agent ${this.config.id} is not available (status: ${this.status})`);
    }

    const startTime = Date.now();
    this.status = 'busy';
    this.currentTask = task;
    this.metrics.lastActivity = new Date().toISOString();

    try {
      this.emit('task:started', { agentId: this.config.id, task });

      // Prepare LLM request
      const llmRequest = await this.prepareLLMRequest(task);
      
      // Execute via provider
      const providerId = this.getProviderId();
      const llmResponse = await this.providerRegistry.execute(providerId, llmRequest);
      
      // Process response
      const result = await this.processLLMResponse(task, llmResponse);
      
      // Update metrics
      const executionTime = Date.now() - startTime;
      this.metrics.tasksCompleted++;
      this.metrics.totalExecutionTime += executionTime;
      
      this.status = 'idle';
      this.currentTask = undefined;
      
      this.emit('task:completed', { 
        agentId: this.config.id, 
        task, 
        result, 
        executionTime 
      });
      
      return result;
    } catch (error) {
      this.metrics.tasksFailed++;
      this.status = 'error';
      
      this.emit('task:failed', { 
        agentId: this.config.id, 
        task, 
        error 
      });
      
      throw error;
    }
  }

  /**
   * Prepare LLM request from task
   */
  protected async prepareLLMRequest(task: AgentTaskDTO): Promise<LlmRequest> {
    const messages = [
      {
        role: 'system' as const,
        content: this.config.systemPrompt
      },
      {
        role: 'user' as const,
        content: this.buildUserPrompt(task)
      }
    ];

    return {
      messages,
      model: this.config.api.model,
      parameters: {
        temperature: this.config.api.settings?.temperature ?? 0.7,
        maxTokens: this.config.api.settings?.maxTokens ?? 2000,
        topP: this.config.api.settings?.topP,
        frequencyPenalty: this.config.api.settings?.frequencyPenalty,
        presencePenalty: this.config.api.settings?.presencePenalty
      },
      metadata: {
        agentId: this.config.id,
        taskType: task.type,
        requestId: task.id
      }
    };
  }

  /**
   * Build user prompt from task
   */
  protected abstract buildUserPrompt(task: AgentTaskDTO): string;

  /**
   * Process LLM response into task result
   */
  protected abstract processLLMResponse(task: AgentTaskDTO, response: LlmResponse): Promise<any>;

  /**
   * Validate if agent can handle a task
   */
  canHandle(task: AgentTaskDTO): boolean {
    return this.config.capabilities.includes(task.type);
  }

  /**
   * Legacy canHandle for backward compatibility
   */
  canHandleLegacy(task: AgentTask): boolean {
    return this.config.capabilities.includes(task.type);
  }

  /**
   * Get agent status
   */
  getStatus(): AgentStatusDTO {
    return {
      agentId: this.config.id,
      status: this.status,
      currentTask: this.currentTask ? {
        taskId: this.currentTask.id,
        type: this.currentTask.type,
        startedAt: this.metrics.lastActivity || new Date().toISOString()
      } : undefined,
      metrics: {
        tasksCompleted: this.metrics.tasksCompleted,
        tasksFailed: this.metrics.tasksFailed,
        averageTaskDuration: this.metrics.tasksCompleted > 0 
          ? this.metrics.totalExecutionTime / this.metrics.tasksCompleted 
          : 0,
        uptime: Date.now() - (this.metrics.lastActivity ? new Date(this.metrics.lastActivity).getTime() : Date.now()),
        memoryUsage: 0, // TODO: Implement memory tracking
        cpuUsage: 0 // TODO: Implement CPU tracking
      },
      health: {
        apiConnected: this.status !== 'offline',
        lastHeartbeat: new Date().toISOString(),
        errorRate: this.metrics.tasksCompleted > 0 
          ? this.metrics.tasksFailed / (this.metrics.tasksCompleted + this.metrics.tasksFailed) 
          : 0
      },
      resources: {
        maxConcurrentTasks: this.config.settings.maxConcurrentTasks || 1,
        activeTasks: this.status === 'busy' ? 1 : 0,
        queuedTasks: 0
      }
    };
  }

  /**
   * Get agent information
   */
  getInfo(): AgentConfigSchema {
    return { ...this.config };
  }

  /**
   * Legacy getInfo for backward compatibility
   */
  getInfoLegacy(): AgentInfo {
    return {
      name: this.config.name,
      capabilities: this.config.capabilities,
      config: this.config as AgentConfig
    };
  }

  /**
   * Validate agent configuration
   */
  protected validateConfig(): void {
    if (!this.config.id) {
      throw new Error('Agent ID is required');
    }
    if (!this.config.name) {
      throw new Error('Agent name is required');
    }
    if (!this.config.type) {
      throw new Error('Agent type is required');
    }
    if (!this.config.api.provider) {
      throw new Error('API provider is required');
    }
    if (!this.config.api.model) {
      throw new Error('API model is required');
    }
  }

  /**
   * Test provider connection
   */
  protected async testProviderConnection(): Promise<void> {
    const providerId = this.getProviderId();
    const provider = this.providerRegistry.get(providerId);
    
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    try {
      await provider.test();
    } catch (error) {
      throw new Error(`Provider connection failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get provider ID for this agent
   */
  protected getProviderId(): string {
    return `${this.config.api.provider}-${this.config.api.model}`;
  }

  /**
   * Cleanup agent resources
   */
  async cleanup(): Promise<void> {
    this.status = 'offline';
    this.currentTask = undefined;
    this.emit('agent:cleanup', { agentId: this.config.id });
  }

  /**
   * Legacy execute method for backward compatibility
   */
  async executeLegacy(task: AgentTask): Promise<any> {
    // Convert legacy task to new format
    const newTask: AgentTaskDTO = {
      id: `legacy_${Date.now()}`,
      type: task.type,
      description: task.description || `Legacy task: ${task.type}`,
      input: {
        data: task,
        context: task.context
      },
      expectedOutputs: task.expectedOutputs || [],
      metadata: {
        createdAt: new Date().toISOString(),
        createdBy: 'legacy',
        assignedTo: this.config.id
      }
    };

    return this.execute(newTask);
  }
}

/**
 * BaseAgent - Legacy class for backward compatibility
 */
export abstract class BaseAgent {
  name: string;
  config: AgentConfig;
  capabilities: string[];

  constructor(name: string, config: AgentConfig = {}) {
    this.name = name;
    this.config = config;
    this.capabilities = config.capabilities || [];
  }

  /**
   * Execute a task
   */
  abstract execute(task: AgentTask): Promise<any>;

  /**
   * Validate if agent can handle a task
   */
  canHandle(task: AgentTask): boolean {
    return this.capabilities.includes(task.type);
  }

  /**
   * Get agent information
   */
  getInfo(): AgentInfo {
    return {
      name: this.name,
      capabilities: this.capabilities,
      config: this.config
    };
  }
}