/**
 * Plan Schema Contracts
 * Defines interfaces for planner plan generation and management
 */

export interface PlannerPlanDTO {
  planId: string;
  description: string;
  steps: PlannerStepDTO[];
  artifacts: string[];
  metadata: {
    createdAt: string;
    estimatedDuration: number;
    dependencies: string[];
    priority: 'low' | 'medium' | 'high' | 'critical';
    tags: string[];
    version: string;
  };
}

export interface PlannerStepDTO {
  id: string;
  name: string;
  type: string;
  agent: string;
  description: string;
  dependencies: string[];
  expectedOutputs: string[];
  estimatedDuration?: number;
  metadata?: {
    complexity: 'simple' | 'medium' | 'complex';
    risk: 'low' | 'medium' | 'high';
    requiredSkills: string[];
    prerequisites: string[];
  };
}

export interface PlannerInputDTO {
  request: string;
  context?: Record<string, any>;
  constraints?: {
    maxDuration?: number;
    maxCost?: number;
    allowedAgents?: string[];
    forbiddenAgents?: string[];
    requiredAgents?: string[];
    deadline?: string;
  };
  preferences?: {
    prioritizeSpeed?: boolean;
    prioritizeQuality?: boolean;
    minimizeCost?: boolean;
    preferredAgents?: string[];
  };
  metadata?: {
    source: string;
    urgency: 'low' | 'medium' | 'high';
    category: string;
    tags?: string[];
  };
}

export interface PlannerAgentDTO {
  id: string;
  name: string;
  type: 'planner' | 'coder' | 'qa' | 'custom';
  capabilities: string[];
  availability: boolean;
  currentLoad: number;
  maxCapacity: number;
  averagePerformance: number;
  costPerMinute: number;
}

// Plan execution events
export const PLAN_EVENTS = {
  PLAN_CREATED: 'SD_EVENT_PLAN_CREATED',
  PLAN_UPDATED: 'SD_EVENT_PLAN_UPDATED',
  PLAN_EXECUTED: 'SD_EVENT_PLAN_EXECUTED',
  PLAN_FAILED: 'SD_EVENT_PLAN_FAILED',
  STEP_STARTED: 'SD_EVENT_PLAN_STEP_STARTED',
  STEP_COMPLETED: 'SD_EVENT_PLAN_STEP_COMPLETED',
  STEP_FAILED: 'SD_EVENT_PLAN_STEP_FAILED',
} as const;

export type PlanEventType = typeof PLAN_EVENTS[keyof typeof PLAN_EVENTS];

// Plan validation
export interface PlanValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  planId: string;
}

// Plan metrics
export interface PlanMetrics {
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  averageStepDuration: number;
  totalDuration: number;
  successRate: number;
  costEfficiency: number;
  timeEfficiency: number;
}

// Plan optimization
export interface PlanOptimizationResult {
  originalPlan: PlannerPlanDTO;
  optimizedPlan: PlannerPlanDTO;
  improvements: {
    timeReduction: number;
    costReduction: number;
    riskReduction: number;
    qualityImprovement: number;
  };
  rationale: string[];
}