import { EventEmitter } from 'events';
import { PlannerPlanDTO } from '../../../shared/contracts/plan-schema';

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

  getSnapshot(): PlannerQueueItem[] {
    return this.items.map((item) => ({
      ...item,
      plan: { ...item.plan, steps: item.plan.steps.map((step) => ({ ...step })) },
      metadata: { ...item.metadata },
    }));
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
