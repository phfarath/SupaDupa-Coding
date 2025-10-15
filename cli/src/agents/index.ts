/**
 * Agent exports
 */

export { BaseAgent } from './base-agent';
export { PlannerAgent } from './planner-agent';
export { DeveloperAgent } from './developer-agent';
export { QaAgent } from './qa-agent';
export { DocsAgent } from './docs-agent';

interface AgentConfig {
  [key: string]: any;
}

/**
 * Create default agents
 */
export function createDefaultAgents(config: AgentConfig = {}): Map<string, BaseAgent> {
  const agents = new Map<string, BaseAgent>();
  
  agents.set('planner', new PlannerAgent(config.agents?.planner));
  agents.set('developer', new DeveloperAgent(config.agents?.developer));
  agents.set('qa', new QaAgent(config.agents?.qa));
  agents.set('docs', new DocsAgent(config.agents?.docs));
  
  return agents;
}