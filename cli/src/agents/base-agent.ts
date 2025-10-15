/**
 * Base Agent - template for all agents
 */

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
