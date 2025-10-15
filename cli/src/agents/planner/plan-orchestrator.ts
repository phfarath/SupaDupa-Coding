import { EventEmitter } from 'events';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import {
  PlannerInputDTO,
  PlannerPlanDTO,
  PlannerStepDTO,
} from '../../../shared/contracts/plan-schema';
import { SD_API_EVENTS } from '../../../../shared/constants/api-events';
import { plannerExecutionQueue, PlannerQueueItemMetadata } from './queue';

interface PlannerOrchestratorConfig {
  promptPath?: string;
  outputPath?: string;
  baseDir?: string;
  persistOutput?: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * sdPlannerOrchestrator - transforms PlannerInputDTO into structured PlannerPlanDTO artifacts.
 */
export class sdPlannerOrchestrator extends EventEmitter {
  private readonly baseDir: string;
  private readonly outputPath: string;
  private readonly systemPrompt: string;
  private readonly persistOutput: boolean;

  constructor(config: PlannerOrchestratorConfig = {}) {
    super();

    this.baseDir = config.baseDir ?? path.resolve(__dirname, '../../..');
    this.outputPath = config.outputPath ?? path.join(this.baseDir, 'planner', 'output', 'plan_v1.json');
    this.persistOutput = config.persistOutput ?? true;
    this.systemPrompt = this.loadSystemPrompt(config.promptPath);
  }

  getSystemPrompt(): string {
    return this.systemPrompt;
  }

  createExecutionPlan(planInput: PlannerInputDTO): PlannerPlanDTO {
    this.validateInput(planInput);

    const plan = this.composePlan(planInput);

    const enqueueMetadata: PlannerQueueItemMetadata = {
      request: planInput.request,
      source: planInput.metadata?.source,
      tags: plan.metadata.tags,
    };

    plannerExecutionQueue.enqueue(plan, enqueueMetadata);

    if (this.persistOutput) {
      this.persistPlan(plan);
    }

    this.emit(SD_API_EVENTS.SD_EVENT_PLAN_CREATED, { plan });

    return plan;
  }

  private validateInput(planInput: PlannerInputDTO): void {
    if (!planInput.request || planInput.request.trim().length === 0) {
      throw new Error('PlannerInputDTO.request must be provided for plan generation.');
    }
  }

  private composePlan(planInput: PlannerInputDTO): PlannerPlanDTO {
    const planId = this.generatePlanId();
    const description = planInput.request.trim();
    const steps = this.buildSteps(planId, planInput);
    const metadata = this.buildMetadata(planInput, steps);
    const artifacts = this.deriveArtifacts(planInput, planId, steps);

    return {
      planId,
      description,
      steps,
      artifacts,
      metadata,
    };
  }

  private buildSteps(planId: string, planInput: PlannerInputDTO): PlannerStepDTO[] {
    const baseDurations = {
      analysis: 45,
      design: 60,
      implementation: 120,
      qa: 60,
      review: 30,
    };

    const analysisStepId = this.generateStepId('analysis');
    const designStepId = this.generateStepId('design');
    const implementationStepId = this.generateStepId('implementation');
    const qaStepId = this.generateStepId('qa');

    const steps: PlannerStepDTO[] = [
      {
        id: analysisStepId,
        name: 'Scope & Requirements Review',
        type: 'analysis',
        agent: 'planner',
        description: `Clarify business goals, constraints, and success metrics for "${planInput.request}"`,
        dependencies: [],
        expectedOutputs: [
          `docs/requirements/${planId}-requirements.md`,
          `docs/constraints/${planId}-constraints.json`,
        ],
        estimatedDuration: this.adjustDuration(baseDurations.analysis, planInput),
        metadata: {
          complexity: this.deriveComplexity(planInput, 'analysis'),
          risk: this.deriveRisk(planInput, 'analysis'),
          requiredSkills: this.composeRequiredSkills(planInput, ['stakeholder-analysis', 'risk-profiling']),
          prerequisites: [],
        },
      },
      {
        id: designStepId,
        name: 'Solution Design Blueprint',
        type: 'design',
        agent: 'planner',
        description: `Design the solution approach that satisfies the validated requirements for "${planInput.request}"`,
        dependencies: [analysisStepId],
        expectedOutputs: [
          `docs/design/${planId}-architecture.md`,
          `backlog/${planId}-work-breakdown.json`,
        ],
        estimatedDuration: this.adjustDuration(baseDurations.design, planInput),
        metadata: {
          complexity: this.deriveComplexity(planInput, 'design'),
          risk: this.deriveRisk(planInput, 'design'),
          requiredSkills: this.composeRequiredSkills(planInput, ['system-design', 'tradeoff-analysis']),
          prerequisites: [`Approval of ${analysisStepId}`],
        },
      },
      {
        id: implementationStepId,
        name: 'Implementation Strategy',
        type: 'implementation',
        agent: 'developer',
        description: `Translate the blueprint into executable work packages and delivery sequencing for "${planInput.request}"`,
        dependencies: [designStepId],
        expectedOutputs: [
          `delivery/${planId}-implementation-plan.md`,
          `delivery/${planId}-task-matrix.json`,
        ],
        estimatedDuration: this.adjustDuration(baseDurations.implementation, planInput),
        metadata: {
          complexity: this.deriveComplexity(planInput, 'implementation'),
          risk: this.deriveRisk(planInput, 'implementation'),
          requiredSkills: this.composeRequiredSkills(planInput, ['typescript', 'automation', 'integration']),
          prerequisites: [`Design artifacts from ${designStepId}`],
        },
      },
      {
        id: qaStepId,
        name: 'Validation & QA Strategy',
        type: 'quality-assurance',
        agent: 'qa',
        description: `Define quality strategy, test coverage, and validation checkpoints for "${planInput.request}"`,
        dependencies: [implementationStepId],
        expectedOutputs: [
          `quality/${planId}-qa-strategy.md`,
          `quality/${planId}-test-catalog.json`,
        ],
        estimatedDuration: this.adjustDuration(baseDurations.qa, planInput),
        metadata: {
          complexity: this.deriveComplexity(planInput, 'qa'),
          risk: this.deriveRisk(planInput, 'qa'),
          requiredSkills: ['test-automation', 'metrics-definition'],
          prerequisites: [`Implementation strategy ${implementationStepId}`],
        },
      },
    ];

    if (planInput.preferences?.prioritizeQuality) {
      const reviewStepId = this.generateStepId('signoff');
      steps.push({
        id: reviewStepId,
        name: 'Plan Review & Sign-off',
        type: 'governance',
        agent: 'planner',
        description: `Facilitate review and sign-off for plan "${planId}" with stakeholders`,
        dependencies: [qaStepId],
        expectedOutputs: [
          `governance/${planId}-signoff-report.md`,
        ],
        estimatedDuration: this.adjustDuration(baseDurations.review, planInput),
        metadata: {
          complexity: 'medium',
          risk: 'low',
          requiredSkills: ['facilitation', 'risk-management'],
          prerequisites: ['QA strategy approved'],
        },
      });
    }

    return this.applyDurationConstraints(steps, planInput);
  }

  private adjustDuration(baseDuration: number, planInput: PlannerInputDTO): number {
    let duration = baseDuration;

    if (planInput.preferences?.prioritizeSpeed) {
      duration = Math.round(duration * 0.75);
    } else if (planInput.preferences?.prioritizeQuality) {
      duration = Math.round(duration * 1.25);
    }

    if (planInput.constraints?.maxDuration && planInput.constraints.maxDuration < duration) {
      duration = Math.max(15, Math.round(planInput.constraints.maxDuration / 2));
    }

    return Math.max(15, duration);
  }

  private applyDurationConstraints(steps: PlannerStepDTO[], planInput: PlannerInputDTO): PlannerStepDTO[] {
    const maxDuration = planInput.constraints?.maxDuration;
    if (!maxDuration) {
      return steps;
    }

    const totalDuration = this.computeEstimatedDuration(steps);
    if (totalDuration === 0 || totalDuration <= maxDuration) {
      return steps;
    }

    const ratio = maxDuration / totalDuration;
    return steps.map((step) => ({
      ...step,
      estimatedDuration: step.estimatedDuration
        ? Math.max(15, Math.round(step.estimatedDuration * ratio))
        : undefined,
    }));
  }

  private buildMetadata(planInput: PlannerInputDTO, steps: PlannerStepDTO[]) {
    return {
      createdAt: new Date().toISOString(),
      estimatedDuration: this.computeEstimatedDuration(steps),
      dependencies: this.collectDependencies(steps),
      priority: this.derivePriority(planInput),
      tags: this.deriveTags(planInput, steps),
      version: '1.0.0',
    };
  }

  private derivePriority(planInput: PlannerInputDTO): 'low' | 'medium' | 'high' | 'critical' {
    const urgency = planInput.metadata?.urgency ?? 'medium';
    if (planInput.preferences?.prioritizeSpeed && urgency === 'high') {
      return 'critical';
    }

    switch (urgency) {
      case 'low':
        return 'low';
      case 'high':
        return 'high';
      default:
        return 'medium';
    }
  }

  private deriveTags(planInput: PlannerInputDTO, steps: PlannerStepDTO[]): string[] {
    const tags = new Set<string>();
    tags.add('sd-planner');

    steps.forEach((step) => tags.add(this.normalizeTag(step.type)));

    if (planInput.metadata?.category) {
      tags.add(this.normalizeTag(planInput.metadata.category));
    }

    this.extractTechStack(planInput).forEach((tech) => tags.add(this.normalizeTag(tech)));

    if (planInput.preferences?.prioritizeSpeed) {
      tags.add('fast-track');
    }

    if (planInput.preferences?.prioritizeQuality) {
      tags.add('quality-first');
    }

    if (planInput.preferences?.minimizeCost) {
      tags.add('cost-aware');
    }

    return Array.from(tags);
  }

  private deriveArtifacts(planInput: PlannerInputDTO, planId: string, steps: PlannerStepDTO[]): string[] {
    const artifacts = new Set<string>();

    steps.forEach((step) => {
      step.expectedOutputs.forEach((output) => artifacts.add(output));
    });

    this.extractContextArtifacts(planInput).forEach((artifact) => artifacts.add(artifact));

    artifacts.add('planner/output/plan_v1.json');
    artifacts.add(`planner/output/${planId}.json`);

    return Array.from(artifacts);
  }

  private composeRequiredSkills(planInput: PlannerInputDTO, baseSkills: string[]): string[] {
    const skills = new Set<string>(baseSkills.map((skill) => this.normalizeTag(skill)));
    this.extractTechStack(planInput).forEach((tech) => skills.add(this.normalizeTag(tech)));
    return Array.from(skills);
  }

  private deriveComplexity(planInput: PlannerInputDTO, phase: string): 'simple' | 'medium' | 'complex' {
    const urgency = planInput.metadata?.urgency ?? 'medium';
    const techDepth = this.extractTechStack(planInput).length;

    if (phase === 'implementation' && techDepth > 2) {
      return 'complex';
    }

    if (urgency === 'high' && phase !== 'qa') {
      return 'complex';
    }

    if (urgency === 'low') {
      return 'simple';
    }

    return 'medium';
  }

  private deriveRisk(planInput: PlannerInputDTO, phase: string): 'low' | 'medium' | 'high' {
    if (phase === 'implementation' && planInput.preferences?.prioritizeSpeed) {
      return 'high';
    }

    if (planInput.constraints?.forbiddenAgents?.includes('qa') && phase === 'qa') {
      return 'high';
    }

    if (planInput.metadata?.urgency === 'high') {
      return 'high';
    }

    return 'medium';
  }

  private computeEstimatedDuration(steps: PlannerStepDTO[]): number {
    return steps.reduce((total, step) => total + (step.estimatedDuration ?? 0), 0);
  }

  private collectDependencies(steps: PlannerStepDTO[]): string[] {
    const dependencies = new Set<string>();
    steps.forEach((step) => {
      step.dependencies.forEach((dependency) => dependencies.add(dependency));
    });
    return Array.from(dependencies);
  }

  private extractTechStack(planInput: PlannerInputDTO): string[] {
    const techStack = planInput.context?.techStack;

    if (Array.isArray(techStack)) {
      return techStack.flatMap((item) => this.normalizeTag(String(item))).filter(Boolean);
    }

    if (typeof techStack === 'string') {
      return techStack
        .split(',')
        .map((item) => this.normalizeTag(item))
        .filter(Boolean);
    }

    return [];
  }

  private extractContextArtifacts(planInput: PlannerInputDTO): string[] {
    if (!planInput.context) {
      return [];
    }

    const artifactKeys = ['existingArtifacts', 'artifacts', 'relatedArtifacts'];
    const artifacts: string[] = [];

    for (const key of artifactKeys) {
      const value = planInput.context[key as keyof typeof planInput.context];
      if (!value) {
        continue;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (typeof item === 'string' && item.trim()) {
            artifacts.push(item.trim());
          }
        });
      } else if (typeof value === 'string' && value.trim()) {
        artifacts.push(value.trim());
      }
    }

    return artifacts;
  }

  private normalizeTag(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
  }

  private loadSystemPrompt(customPath?: string): string {
    const promptPath = customPath ?? path.join(this.baseDir, 'prompts', 'planner', 'system', 'v1.md');
    try {
      const data = readFileSync(promptPath, 'utf-8');
      return data.trim();
    } catch (error) {
      return '';
    }
  }

  private persistPlan(plan: PlannerPlanDTO): void {
    const directory = path.dirname(this.outputPath);
    mkdirSync(directory, { recursive: true });
    writeFileSync(this.outputPath, JSON.stringify(plan, null, 2), 'utf-8');
  }

  private generatePlanId(): string {
    return `plan_${Date.now()}_${uuidv4().slice(0, 8)}`;
  }

  private generateStepId(prefix: string): string {
    return `step_${prefix}_${uuidv4().slice(0, 8)}`;
  }
}
