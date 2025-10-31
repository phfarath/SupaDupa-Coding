import { EventEmitter } from 'events';
import { PlannerPlanDTO, PlannerStepDTO } from '../../../shared/contracts/plan-schema';

export interface PlannerQueueItemMetadata {
  request?: string;
  source?: string;
  tags?: string[];
}

export interface PlannerQueueItem {
  plan: PlannerPlanDTO;
  enqueuedAt: string;
  metadata: PlannerQueueItemMetadata;
}

/**
 * sdPlannerExecutionQueue - lightweight in-memory queue for planner plans.
 * Provides observability hooks for orchestrator coordination and testing.
 */
export class sdPlannerExecutionQueue extends EventEmitter {
  private items: PlannerQueueItem[] = [];

  enqueue(plan: PlannerPlanDTO, metadata: PlannerQueueItemMetadata = {}): PlannerQueueItem {
    const item: PlannerQueueItem = {
      plan,
      enqueuedAt: new Date().toISOString(),
      metadata,
    };

    this.items.push(item);
    this.emit('plan:enqueued', item);
    return item;
  }

  dequeue(): PlannerQueueItem | undefined {
    const item = this.items.shift();
    if (item) {
      this.emit('plan:dequeued', item);
    }
    return item;
  }

  peek(): PlannerQueueItem | undefined {
    return this.items[0];
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }

  /**
   * BUG FIX #3: Deep copy snapshot to prevent external mutation
   * Ensures metadata and nested objects are fully cloned
   */
  getSnapshot(): PlannerQueueItem[] {
    return this.items.map((item) => this.cloneQueueItem(item));
  }

  private cloneQueueItem(item: PlannerQueueItem): PlannerQueueItem {
    return {
      plan: this.clonePlan(item.plan),
      enqueuedAt: item.enqueuedAt,
      metadata: this.cloneMetadata(item.metadata),
    };
  }

  private clonePlan(plan: PlannerPlanDTO): PlannerPlanDTO {
    return {
      planId: plan.planId,
      description: plan.description,
      steps: plan.steps.map((step) => this.cloneStep(step)),
      artifacts: [...plan.artifacts],
      metadata: {
        createdAt: plan.metadata.createdAt,
        estimatedDuration: plan.metadata.estimatedDuration,
        dependencies: [...plan.metadata.dependencies],
        priority: plan.metadata.priority,
        tags: [...plan.metadata.tags],
        version: plan.metadata.version,
      },
    };
  }

  private cloneStep(step: PlannerStepDTO): PlannerStepDTO {
    return {
      id: step.id,
      name: step.name,
      type: step.type,
      agent: step.agent,
      description: step.description,
      dependencies: [...step.dependencies],
      expectedOutputs: [...step.expectedOutputs],
      estimatedDuration: step.estimatedDuration,
      metadata: step.metadata
        ? {
            complexity: step.metadata.complexity,
            risk: step.metadata.risk,
            requiredSkills: [...step.metadata.requiredSkills],
            prerequisites: [...step.metadata.prerequisites],
          }
        : undefined,
    };
  }

  private cloneMetadata(metadata: PlannerQueueItemMetadata): PlannerQueueItemMetadata {
    return {
      request: metadata.request,
      source: metadata.source,
      tags: metadata.tags ? [...metadata.tags] : undefined,
    };
  }

  findByPlanId(planId: string): PlannerQueueItem | undefined {
    return this.items.find((item) => item.plan.planId === planId);
  }

  removeByPlanId(planId: string): boolean {
    const initialLength = this.items.length;
    this.items = this.items.filter((item) => item.plan.planId !== planId);
    const removed = this.items.length !== initialLength;

    if (removed) {
      this.emit('plan:removed', planId);
    }

    return removed;
  }

  clear(): void {
    if (this.items.length === 0) {
      return;
    }

    this.items = [];
    this.emit('queue:cleared');
  }
}

export const plannerExecutionQueue = new sdPlannerExecutionQueue();
