/**
 * sdPlannerAgent - Enhanced planner agent with real LLM integration
 */

import { sdBaseAgent } from './base-agent';
import { AgentTaskDTO, AgentConfigSchema } from '../../shared/contracts/agent-config';
import { LlmResponse } from '../../shared/contracts/llm-contracts';
import { PlannerInputDTO, PlannerPlanDTO } from '../../shared/contracts/plan-schema';

interface PlanningResult {
  plan: PlannerPlanDTO;
  status: string;
  message: string;
}

export class sdPlannerAgent extends sdBaseAgent {
  constructor(config: AgentConfigSchema, providerRegistry: any) {
    super({
      ...config,
      type: 'planner',
      capabilities: ['analysis', 'planning', 'decomposition', 'requirements-gathering']
    }, providerRegistry);
  }

  protected buildUserPrompt(task: AgentTaskDTO): string {
    const input = task.input.data as PlannerInputDTO;
    
    return `
You are a senior software architect and project planner. Please analyze the following request and create a comprehensive execution plan.

REQUEST: ${input.request}

CONTEXT:
${input.context ? `
- Tech Stack: ${Array.isArray(input.context.techStack) ? input.context.techStack.join(', ') : input.context.techStack}
- Project Type: ${input.context.projectType || 'Not specified'}
- Existing Artifacts: ${input.context.existingArtifacts?.join(', ') || 'None'}
` : 'No additional context provided.'}

PREFERENCES:
${input.preferences ? `
- Prioritize Speed: ${input.preferences.prioritizeSpeed ? 'Yes' : 'No'}
- Prioritize Quality: ${input.preferences.prioritizeQuality ? 'Yes' : 'No'}
- Minimize Cost: ${input.preferences.minimizeCost ? 'Yes' : 'No'}
` : 'No specific preferences.'}

CONSTRAINTS:
${input.constraints ? `
- Max Duration: ${input.constraints.maxDuration ? input.constraints.maxDuration + ' minutes' : 'Not specified'}
- Forbidden Agents: ${input.constraints.forbiddenAgents?.join(', ') || 'None'}
- Required Agents: ${input.constraints.allowedAgents?.join(', ') || 'None'}
` : 'No hard constraints.'}

Please create a detailed execution plan following this JSON structure:
{
  "planId": "unique_plan_id",
  "description": "Clear description of what this plan accomplishes",
  "steps": [
    {
      "id": "step_unique_id",
      "name": "Step name",
      "type": "analysis|design|implementation|quality-assurance|governance",
      "agent": "planner|coder|qa|docs",
      "description": "Detailed description of what this step accomplishes",
      "dependencies": ["step_id_1", "step_id_2"],
      "expectedOutputs": ["artifact1.md", "artifact2.json"],
      "estimatedDuration": 45,
      "metadata": {
        "complexity": "simple|medium|complex",
        "risk": "low|medium|high",
        "requiredSkills": ["skill1", "skill2"],
        "prerequisites": ["prerequisite1"]
      }
    }
  ],
  "artifacts": ["all_artifacts_that_will_be_produced"],
  "metadata": {
    "createdAt": "ISO_timestamp",
    "estimatedDuration": total_duration_in_minutes,
    "dependencies": ["all_dependency_ids"],
    "priority": "low|medium|high|critical",
    "tags": ["tag1", "tag2"],
    "version": "1.0.0"
  }
}

Focus on creating practical, executable steps with clear deliverables and realistic time estimates.
`;
  }

  protected async processLLMResponse(task: AgentTaskDTO, response: LlmResponse): Promise<PlanningResult> {
    try {
      // Extract JSON from response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in LLM response');
      }

      const planData = JSON.parse(jsonMatch[0]);
      
      // Validate the plan structure
      this.validatePlan(planData);
      
      // Enhance with metadata
      const plan: PlannerPlanDTO = {
        ...planData,
        metadata: {
          ...planData.metadata,
          createdAt: planData.metadata.createdAt || new Date().toISOString(),
          version: planData.metadata.version || '1.0.0'
        }
      };

      return {
        plan,
        status: 'completed',
        message: `Successfully created execution plan with ${plan.steps.length} steps`
      };
    } catch (error) {
      throw new Error(`Failed to process LLM response: ${error.message}`);
    }
  }

  private validatePlan(plan: any): void {
    if (!plan.planId) {
      throw new Error('Plan ID is required');
    }
    if (!plan.description) {
      throw new Error('Plan description is required');
    }
    if (!Array.isArray(plan.steps) || plan.steps.length === 0) {
      throw new Error('Plan must have at least one step');
    }
    if (!Array.isArray(plan.artifacts)) {
      throw new Error('Plan must have artifacts array');
    }
    if (!plan.metadata) {
      throw new Error('Plan metadata is required');
    }

    // Validate each step
    plan.steps.forEach((step: any, index: number) => {
      if (!step.id) {
        throw new Error(`Step ${index} missing ID`);
      }
      if (!step.name) {
        throw new Error(`Step ${index} missing name`);
      }
      if (!step.type) {
        throw new Error(`Step ${index} missing type`);
      }
      if (!step.agent) {
        throw new Error(`Step ${index} missing agent`);
      }
      if (!step.description) {
        throw new Error(`Step ${index} missing description`);
      }
      if (!Array.isArray(step.dependencies)) {
        throw new Error(`Step ${index} dependencies must be array`);
      }
      if (!Array.isArray(step.expectedOutputs)) {
        throw new Error(`Step ${index} expectedOutputs must be array`);
      }
    });
  }

  /**
   * Create a planning task from input
   */
  createPlanningTask(input: PlannerInputDTO): AgentTaskDTO {
    return {
      id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'planning',
      description: `Create execution plan for: ${input.request}`,
      input: {
        data: input,
        context: {
          techStack: input.context?.techStack,
          projectType: input.context?.projectType
        }
      },
      expectedOutputs: ['plan.json'],
      metadata: {
        createdAt: new Date().toISOString(),
        createdBy: 'system',
        assignedTo: this.config.id,
        tags: ['planning', 'analysis']
      }
    };
  }
}