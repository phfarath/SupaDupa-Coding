import { EventEmitter } from 'events';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  PlannerInputDTO,
  PlannerPlanDTO,
  PlannerStepDTO,
} from '../../../shared/contracts/plan-schema';
import { SD_API_EVENTS } from '../../constants/api-events';
import { logger } from '../../utils/logger';
import { plannerExecutionQueue, PlannerQueueItemMetadata } from './queue';

interface PlannerOrchestratorConfig {
  promptPath?: string;
  outputPath?: string;
  baseDir?: string;
  persistOutput?: boolean;
}

/**
 * sdPlannerOrchestrator - transforms PlannerInputDTO into structured PlannerPlanDTO artifacts.
 */
export class sdPlannerOrchestrator extends EventEmitter {
  private readonly baseDir: string;
  private readonly outputPath: string;
  private readonly systemPrompt: string;
  private readonly persistOutput: boolean;
  private readonly planMetadataTags: Set<string>;

  constructor(config: PlannerOrchestratorConfig = {}) {
    super();

    this.baseDir = config.baseDir ?? path.resolve(__dirname, '../../..');
    this.outputPath = config.outputPath ?? path.join(this.baseDir, 'planner', 'output', 'plan_v1.json');
    this.persistOutput = config.persistOutput ?? true;
    this.systemPrompt = this.loadSystemPrompt(config.promptPath);
    this.planMetadataTags = new Set();
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

    this.emit(SD_API_EVENTS.EVENT_PLAN_CREATED, { plan });

    return plan;
  }

  private validateInput(planInput: PlannerInputDTO): void {
    if (!planInput.request || planInput.request.trim().length === 0) {
      throw new Error('PlannerInputDTO.request must be provided for plan generation.');
    }
  }

  private composePlan(planInput: PlannerInputDTO): PlannerPlanDTO {
    this.resetPlanContext();

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

    let adjustedSteps = this.enforceAgentConstraints(steps, planInput);
    adjustedSteps = this.applyDurationConstraints(adjustedSteps, planInput);
    return adjustedSteps;
  }

  /**
   * BUG FIX #1: Enforce forbiddenAgents constraint
   * Validates each step's agent and adapts if forbidden
   */
  private enforceAgentConstraints(steps: PlannerStepDTO[], planInput: PlannerInputDTO): PlannerStepDTO[] {
    const forbiddenAgents = new Set(
      (planInput.constraints?.forbiddenAgents ?? []).map((agent) => agent.toLowerCase().trim())
    );

    if (forbiddenAgents.size === 0) {
      return steps.map((step) => this.cloneStep(step));
    }

    const allowedAgents = (planInput.constraints?.allowedAgents ?? [])
      .map((agent) => ({ raw: agent, normalized: agent.toLowerCase().trim() }))
      .filter((candidate) => !forbiddenAgents.has(candidate.normalized));

    const agentMapping: Record<string, string[]> = {
      planner: ['coder', 'developer'],
      developer: ['coder', 'planner'],
      coder: ['developer', 'planner'],
      qa: ['planner', 'developer'],
    };

    const removedStepIds = new Set<string>();
    const adjustedSteps: PlannerStepDTO[] = [];

    for (const step of steps) {
      const clonedStep = this.cloneStep(step);
      const normalizedAgent = clonedStep.agent.toLowerCase().trim();

      if (!forbiddenAgents.has(normalizedAgent)) {
        adjustedSteps.push(clonedStep);
        continue;
      }

      const alternative = this.resolveAlternativeAgent(
        clonedStep.agent,
        allowedAgents,
        agentMapping,
        forbiddenAgents
      );

      if (alternative) {
        logger.warn(
          `Remapping agent for step '${clonedStep.name}' from '${clonedStep.agent}' to '${alternative.agent}' due to forbidden agent constraint`,
          {
            stepId: clonedStep.id,
            originalAgent: clonedStep.agent,
            newAgent: alternative.agent,
            source: alternative.source,
          }
        );

        clonedStep.agent = alternative.agent;
        clonedStep.description = this.appendMitigationNote(
          clonedStep.description,
          `reassigned from '${step.agent}' due to agent constraint`
        );
        this.appendMetadataPrerequisite(
          clonedStep,
          `Agent reassigned from '${step.agent}' to '${alternative.agent}' to satisfy forbidden agent constraints.`
        );
        this.registerMetadataTag('agent-remapped');
        adjustedSteps.push(clonedStep);
        continue;
      }

      if (this.isOptionalStep(clonedStep)) {
        logger.warn(
          `Removing optional step '${clonedStep.name}' because agent '${clonedStep.agent}' is forbidden and no alternatives exist`,
          {
            stepId: clonedStep.id,
            agent: clonedStep.agent,
          }
        );
        removedStepIds.add(clonedStep.id);
        this.registerMetadataTag('optional-step-removed');
        continue;
      }

      logger.warn(
        `Agent '${clonedStep.agent}' for step '${clonedStep.name}' is forbidden; manual mitigation required`,
        {
          stepId: clonedStep.id,
          agent: clonedStep.agent,
        }
      );
      clonedStep.description = this.appendMitigationNote(
        clonedStep.description,
        `manual mitigation required because '${clonedStep.agent}' is forbidden`
      );
      this.appendMetadataPrerequisite(
        clonedStep,
        `Manual mitigation required: agent '${clonedStep.agent}' is forbidden. Assign alternative resource or handle manually.`
      );
      this.registerMetadataTag('agent-mitigation-required');
      adjustedSteps.push(clonedStep);
    }

    if (removedStepIds.size === 0) {
      return adjustedSteps;
    }

    return adjustedSteps.map((step) => {
      const filteredDependencies = step.dependencies.filter(
        (dependency) => !removedStepIds.has(dependency)
      );

      if (filteredDependencies.length !== step.dependencies.length) {
        this.appendMetadataPrerequisite(
          step,
          `Dependencies adjusted after removing steps: ${Array.from(removedStepIds).join(', ')}`
        );
        this.registerMetadataTag('dependency-adjusted');
      }

      return {
        ...step,
        dependencies: filteredDependencies,
      };
    });
  }

  private cloneStep(step: PlannerStepDTO): PlannerStepDTO {
    return {
      ...step,
      dependencies: [...step.dependencies],
      expectedOutputs: [...step.expectedOutputs],
      metadata: step.metadata
        ? {
            ...step.metadata,
            requiredSkills: [...(step.metadata.requiredSkills ?? [])],
            prerequisites: [...(step.metadata.prerequisites ?? [])],
          }
        : undefined,
    };
  }

  private resolveAlternativeAgent(
    originalAgent: string,
    allowedAgents: { raw: string; normalized: string }[],
    mapping: Record<string, string[]>,
    forbiddenAgents: Set<string>
  ): { agent: string; source: string } | null {
    const normalizedOriginal = originalAgent.toLowerCase().trim();

    if (allowedAgents.length > 0) {
      for (const candidate of allowedAgents) {
        if (candidate.normalized !== normalizedOriginal) {
          return { agent: candidate.raw, source: 'allowedAgents' };
        }
      }
    }

    const alternatives = mapping[normalizedOriginal] ?? [];
    for (const alternative of alternatives) {
      if (!forbiddenAgents.has(alternative.toLowerCase().trim())) {
        return { agent: alternative, source: 'mapping' };
      }
    }

    return null;
  }

  private isOptionalStep(step: PlannerStepDTO): boolean {
    return step.type === 'governance';
  }

  private appendMitigationNote(description: string, note: string): string {
    const formattedNote = `[NOTE: ${note}]`;
    if (description.includes(formattedNote)) {
      return description;
    }
    return `${description} ${formattedNote}`.trim();
  }

  private appendMetadataPrerequisite(step: PlannerStepDTO, prerequisite: string): void {
    if (!step.metadata) {
      return;
    }

    if (!step.metadata.prerequisites.includes(prerequisite)) {
      step.metadata.prerequisites = [...step.metadata.prerequisites, prerequisite];
    }
  }

  private registerMetadataTag(tag: string): void {
    const normalized = this.normalizeTag(tag);
    if (normalized) {
      this.planMetadataTags.add(normalized);
    }
  }

  private resetPlanContext(): void {
    this.planMetadataTags.clear();
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

  /**
   * OPTIMIZATION #3: Adjust duration distribution with optional step removal
   * and metadata documentation
   */
  private applyDurationConstraints(steps: PlannerStepDTO[], planInput: PlannerInputDTO): PlannerStepDTO[] {
    const maxDuration = planInput.constraints?.maxDuration;
    if (!maxDuration) {
      return steps.map((step) => this.cloneStep(step));
    }

    let workingSteps = steps.map((step) => this.cloneStep(step));
    let totalDuration = this.computeEstimatedDuration(workingSteps);

    if (totalDuration === 0 || totalDuration <= maxDuration) {
      return workingSteps;
    }

    const initialRatio = maxDuration / totalDuration;
    const optionalSteps = workingSteps.filter((step) => this.isOptionalStep(step));
    const optionalDuration = optionalSteps.reduce((sum, step) => sum + (step.estimatedDuration ?? 0), 0);
    const requiredReduction = totalDuration - maxDuration;

    logger.warn(
      `Plan duration (${totalDuration} min) exceeds constraint (${maxDuration} min). Reduction needed: ${requiredReduction} min.`,
      {
        totalDuration,
        maxDuration,
        requiredReduction,
        initialRatio,
      }
    );

    const shouldRemoveOptional =
      optionalSteps.length > 0 && (optionalDuration >= requiredReduction || initialRatio < 0.6);

    if (shouldRemoveOptional) {
      const removedIds = new Set(optionalSteps.map((step) => step.id));
      logger.warn(
        `Removing ${optionalSteps.length} optional step(s) to enforce maxDuration (saves ${optionalDuration} min)`,
        {
          removedSteps: optionalSteps.map((step) => ({ id: step.id, name: step.name })),
          savedMinutes: optionalDuration,
        }
      );

      this.registerMetadataTag('optional-steps-removed-duration');

      workingSteps = workingSteps
        .filter((step) => !removedIds.has(step.id))
        .map((step) => {
          const filteredDependencies = step.dependencies.filter((dependency) => !removedIds.has(dependency));
          if (filteredDependencies.length !== step.dependencies.length) {
            this.appendMetadataPrerequisite(
              step,
              `Dependencies adjusted after removing optional steps: ${Array.from(removedIds).join(', ')}`
            );
            this.registerMetadataTag('dependency-adjusted');
          }

          step.dependencies = filteredDependencies;
          this.appendMetadataPrerequisite(
            step,
            `Optional steps removed to satisfy maxDuration (${maxDuration} min). Original total duration: ${totalDuration} min.`
          );
          return step;
        });

      totalDuration = this.computeEstimatedDuration(workingSteps);

      if (totalDuration <= maxDuration) {
        this.registerMetadataTag('duration-constrained');
        logger.warn('Max duration satisfied after optional step removal', {
          maxDuration,
          updatedDuration: totalDuration,
        });
        return workingSteps;
      }
    }

    const ratio = maxDuration / totalDuration;

    workingSteps = workingSteps.map((step) => {
      if (!step.estimatedDuration) {
        return step;
      }

      const originalDuration = step.estimatedDuration;
      const scaledDuration = Math.max(15, Math.round(originalDuration * ratio));

      if (scaledDuration < originalDuration) {
        this.registerMetadataTag('duration-adjusted');
        this.registerMetadataTag('partial-execution');
        step.description = this.appendMitigationNote(
          step.description,
          `partial execution expected, duration reduced by ${Math.round((1 - ratio) * 100)}%`
        );
        this.appendMetadataPrerequisite(
          step,
          `Duration reduced from ${originalDuration} min to ${scaledDuration} min to comply with maxDuration (${maxDuration} min).`
        );
      }

      step.estimatedDuration = scaledDuration;
      return step;
    });

    this.redistributeDurationOverflow(workingSteps, maxDuration);

    const finalDuration = this.computeEstimatedDuration(workingSteps);
    this.registerMetadataTag('duration-constrained');
    logger.warn('Duration ratio applied to satisfy maxDuration constraint', {
      maxDuration,
      finalDuration,
      ratio: Number.isFinite(ratio) ? ratio.toFixed(2) : 'n/a',
    });

    return workingSteps;
  }

  private redistributeDurationOverflow(steps: PlannerStepDTO[], maxDuration: number): void {
    const totalDuration = this.computeEstimatedDuration(steps);
    if (totalDuration <= maxDuration) {
      return;
    }

    const overflow = totalDuration - maxDuration;
    const flexibleSteps = steps.filter((step) => step.estimatedDuration && step.estimatedDuration > 15);

    if (flexibleSteps.length === 0) {
      logger.warn('Unable to redistribute duration overflow: all steps at minimum duration threshold', {
        totalDuration,
        maxDuration,
      });
      this.registerMetadataTag('duration-floor-reached');
      return;
    }

    const reductionPerStep = Math.ceil(overflow / flexibleSteps.length);
    let remainingOverflow = overflow;

    for (const step of flexibleSteps) {
      if (remainingOverflow <= 0 || !step.estimatedDuration) {
        break;
      }

      const maxReduction = step.estimatedDuration - 15;
      const actualReduction = Math.min(reductionPerStep, maxReduction, remainingOverflow);

      if (actualReduction > 0) {
        step.estimatedDuration -= actualReduction;
        remainingOverflow -= actualReduction;
        this.appendMetadataPrerequisite(
          step,
          `Additional ${actualReduction} min reduction applied to distribute overflow within maxDuration.`
        );
        this.registerMetadataTag('duration-redistributed');
      }
    }

    if (remainingOverflow > 0) {
      logger.warn('Unable to fully satisfy maxDuration constraint due to minimum duration limits', {
        remainingOverflow,
        maxDuration,
      });
      this.registerMetadataTag('duration-floor-reached');
    }
  }

  private buildMetadata(planInput: PlannerInputDTO, steps: PlannerStepDTO[]) {
    const derivedTags = this.deriveTags(planInput, steps);
    const collectedTags = Array.from(this.planMetadataTags);

    return {
      createdAt: new Date().toISOString(),
      estimatedDuration: this.computeEstimatedDuration(steps),
      dependencies: this.collectDependencies(steps),
      priority: this.derivePriority(planInput),
      tags: [...derivedTags, ...collectedTags.filter((tag) => !derivedTags.includes(tag))],
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

    const metadataRecord = planInput.metadata as Record<string, unknown> | undefined;
    const metadataTags = metadataRecord?.tags;
    if (Array.isArray(metadataTags)) {
      metadataTags.forEach((tag) => {
        if (typeof tag === 'string' && tag.trim()) {
          tags.add(this.normalizeTag(tag));
        }
      });
    } else if (typeof metadataTags === 'string') {
      metadataTags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .forEach((tag) => tags.add(this.normalizeTag(tag)));
    }

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

  /**
   * BUG FIX #2: Only declare artifacts that will actually be persisted
   */
  private deriveArtifacts(planInput: PlannerInputDTO, _planId: string, steps: PlannerStepDTO[]): string[] {
    const artifacts = new Set<string>();

    steps.forEach((step) => {
      step.expectedOutputs.forEach((output) => artifacts.add(output));
    });

    this.extractContextArtifacts(planInput).forEach((artifact) => artifacts.add(artifact));

    artifacts.add('planner/output/plan_v1.json');

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

  /**
   * OPTIMIZATION #2: Add telemetry when loading prompt (log failed fallback paths)
   */
  private loadSystemPrompt(customPath?: string): string {
    if (customPath) {
      try {
        const data = readFileSync(customPath, 'utf-8');
        return data.trim();
      } catch (error) {
        logger.warn(`Custom prompt path failed: ${customPath}`, { error: String(error) });
      }
    }

    const possiblePaths = [
      path.join(process.cwd(), 'prompts', 'planner', 'system', 'v1.md'),
      path.join(process.cwd(), 'cli', 'prompts', 'planner', 'system', 'v1.md'),
      path.join(__dirname, '../../prompts/planner/system/v1.md'),
      path.join(__dirname, '../../../prompts/planner/system/v1.md'),
      path.join(__dirname, '../../../../prompts/planner/system/v1.md'),
      path.join(this.baseDir, 'prompts', 'planner', 'system', 'v1.md'),
    ];

    for (const promptPath of possiblePaths) {
      try {
        const data = readFileSync(promptPath, 'utf-8');
        return data.trim();
      } catch (error) {
        logger.warn(`Prompt file not found at fallback path: ${promptPath}`, { error: String(error) });
        continue;
      }
    }

    logger.warn('All prompt file paths failed, using embedded fallback prompt', {
      attemptedPaths: possiblePaths.length,
    });

    return `# sdPlanner System Prompt

You are sdPlanner, the core planning agent inside the SupaDupaCode CLI.
Transform high-level feature requests into structured execution plans.

## Output Contract
Respond in JSON matching PlannerPlanDTO with:
- planId, description, steps, artifacts, metadata
- Each step must have: id, agent, type, dependencies, expectedOutputs
- Plan metadata: timestamps, duration, priority, tags, version

## Quality Guardrails
- Keep dependencies acyclic
- Never omit QA unless constraints forbid it
- Use sd* naming convention
- Respect maxDuration constraints`;
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
