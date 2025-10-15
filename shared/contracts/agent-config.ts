// shared/contracts/agent-config.ts

/**
 * @interface AgentConfigSchema
 * @description Configuration schema for AI agents in the system.
 */
export interface AgentConfigSchema {
  /** Unique identifier for the agent */
  id: string;
  
  /** Human-readable name for the agent */
  name: string;
  
  /** Type of agent (determines capabilities and behavior) */
  type: 'planner' | 'coder' | 'qa' | 'docs' | 'brain' | 'custom';
  
  /** List of capabilities this agent possesses */
  capabilities: string[];
  
  /** API configuration for LLM integration */
  api: {
    provider: string;
    model: string;
    endpoint?: string;
    credentials: Record<string, string>;
    settings?: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
    };
  };
  
  /** Tools and integrations available to this agent */
  tools: string[];
  
  /** System prompt that defines agent behavior */
  systemPrompt: string;
  
  /** Additional agent-specific settings */
  settings: {
    maxConcurrentTasks?: number;
    timeout?: number;
    retryAttempts?: number;
    memorySize?: number;
    enableCache?: boolean;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    customSettings?: Record<string, any>;
  };
  
  /** Agent metadata */
  metadata?: {
    version?: string;
    description?: string;
    author?: string;
    tags?: string[];
    createdAt?: string;
    updatedAt?: string;
  };
}

/**
 * @interface AgentStatusDTO
 * @description Current status and health information for an agent.
 */
export interface AgentStatusDTO {
  /** Agent identifier */
  agentId: string;
  
  /** Current operational status */
  status: 'idle' | 'busy' | 'error' | 'offline' | 'initializing' | 'maintenance';
  
  /** Current task being processed (if any) */
  currentTask?: {
    taskId: string;
    type: string;
    startedAt: string;
    progress?: number;
  };
  
  /** Performance metrics */
  metrics: {
    tasksCompleted: number;
    tasksFailed: number;
    averageTaskDuration: number;
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  
  /** Health indicators */
  health: {
    apiConnected: boolean;
    lastHeartbeat: string;
    errorRate: number;
    lastError?: string;
  };
  
  /** Available resources */
  resources: {
    maxConcurrentTasks: number;
    activeTasks: number;
    queuedTasks: number;
  };
}

/**
 * @interface AgentTaskDTO
 * @description Task definition for agent execution.
 */
export interface AgentTaskDTO {
  /** Unique task identifier */
  id: string;
  
  /** Type of task */
  type: string;
  
  /** Task description and requirements */
  description: string;
  
  /** Input data and context */
  input: {
    data: any;
    context?: Record<string, any>;
    artifacts?: string[];
    dependencies?: string[];
  };
  
  /** Expected outputs */
  expectedOutputs: string[];
  
  /** Execution constraints */
  constraints?: {
    timeout?: number;
    maxRetries?: number;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    resources?: Record<string, any>;
  };
  
  /** Task metadata */
  metadata: {
    createdAt: string;
    createdBy: string;
    assignedTo: string;
    tags?: string[];
  };
}