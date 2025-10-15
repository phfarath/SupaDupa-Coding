/**
 * Agent exports
 */

export { BaseAgent, AgentConfig, AgentTask, AgentInfo } from './base-agent';
export { PlannerAgent } from './planner-agent';
export { DeveloperAgent } from './developer-agent';
export { QaAgent } from './qa-agent';
export { DocsAgent } from './docs-agent';

import { BaseAgent, AgentConfig } from './base-agent';
import { PlannerAgent } from './planner-agent';
import { DeveloperAgent } from './developer-agent';
import { QaAgent } from './qa-agent';
import { DocsAgent } from './docs-agent';

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
