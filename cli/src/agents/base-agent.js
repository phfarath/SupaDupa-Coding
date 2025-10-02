/**
 * Base Agent - template for all agents
 */

export class BaseAgent {
  constructor(name, config = {}) {
    this.name = name;
    this.config = config;
    this.capabilities = config.capabilities || [];
  }

  /**
   * Execute a task
   */
  async execute(task) {
    throw new Error('Agent must implement execute method');
  }

  /**
   * Validate if agent can handle a task
   */
  canHandle(task) {
    return this.capabilities.includes(task.type);
  }

  /**
   * Get agent information
   */
  getInfo() {
    return {
      name: this.name,
      capabilities: this.capabilities,
      config: this.config
    };
  }
}
