/**
 * Agent exports
 */

export { BaseAgent, AgentConfig, AgentTask, AgentInfo, sdBaseAgent } from './base-agent';
export { sdPlannerAgent as PlannerAgent } from './planner-agent';
export { DeveloperAgent } from './developer-agent';
export { QaAgent } from './qa-agent';
export { DocsAgent } from './docs-agent';

import { BaseAgent, AgentConfig, sdBaseAgent } from './base-agent';
import { sdPlannerAgent as PlannerAgent } from './planner-agent';
import { DeveloperAgent } from './developer-agent';
import { QaAgent } from './qa-agent';
import { DocsAgent } from './docs-agent';

/**
 * Create default agents
 */
export function createDefaultAgents(config: AgentConfig = {}): Map<string, sdBaseAgent> {
  const agents = new Map<string, sdBaseAgent>();
  
  agents.set('planner', new PlannerAgent(config.agents?.planner, config.providers));
  agents.set('developer', new DeveloperAgent(config.agents?.developer, config.providers));
  agents.set('qa', new QaAgent(config.agents?.qa, config.providers));
  agents.set('docs', new DocsAgent(config.agents?.docs, config.providers));
  
  return agents;
}
