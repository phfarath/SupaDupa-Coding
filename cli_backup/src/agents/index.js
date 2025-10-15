/**
 * Agent exports
 */

export { BaseAgent } from './base-agent.js';
export { PlannerAgent } from './planner-agent.js';
export { DeveloperAgent } from './developer-agent.js';
export { QaAgent } from './qa-agent.js';
export { DocsAgent } from './docs-agent.js';

import { PlannerAgent } from './planner-agent.js';
import { DeveloperAgent } from './developer-agent.js';
import { QaAgent } from './qa-agent.js';
import { DocsAgent } from './docs-agent.js';

/**
 * Create default agents
 */
export function createDefaultAgents(config = {}) {
  const agents = new Map();
  
  agents.set('planner', new PlannerAgent(config.agents?.planner));
  agents.set('developer', new DeveloperAgent(config.agents?.developer));
  agents.set('qa', new QaAgent(config.agents?.qa));
  agents.set('docs', new DocsAgent(config.agents?.docs));
  
  return agents;
}
