/**
 * Shared Contracts Index
 * Exports all contract interfaces and constants
 */

// Workflow contracts
export * from './workflow-schema';

// Checkpoint contracts
export * from './checkpoint-schema';

// MCP Protocol contracts
export * from './mcp-protocol';

// Plan contracts
export * from './plan-schema';

// Import event constants
import { WORKFLOW_EVENTS } from './workflow-schema';
import { CHECKPOINT_EVENTS } from './checkpoint-schema';
import { MCP_EVENTS } from './mcp-protocol';
import { PLAN_EVENTS } from './plan-schema';

// Combined constants
export const SD_EVENTS = {
  // Workflow events
  ...WORKFLOW_EVENTS,
  // Checkpoint events
  ...CHECKPOINT_EVENTS,
  // MCP events
  ...MCP_EVENTS,
  // Plan events
  ...PLAN_EVENTS,
} as const;

// Global constants
export const SD_CONSTANTS = {
  // Prefixes
  PREFIX: 'sd',
  
  // File paths
  PATHS: {
    CHECKPOINTS: './data/checkpoints',
    REPORTS: './workflow/reports',
    QA_INPUT: './qa/input',
    MCP_OUTPUT: './mcp/output',
    PLANNER_OUTPUT: './planner/output',
  },
  
  // Timeouts
  TIMEOUTS: {
    WORKFLOW_STEP: 300000, // 5 minutes
    MCP_TOOL: 60000, // 1 minute
    CHECKPOINT_SAVE: 10000, // 10 seconds
  },
  
  // Limits
  LIMITS: {
    MAX_CONCURRENT_TASKS: 5,
    MAX_CHECKPOINTS: 100,
    MAX_RETRIES: 3,
    MAX_RECONNECT_ATTEMPTS: 5,
  },
} as const;