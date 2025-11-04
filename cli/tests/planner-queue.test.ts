/**
 * Unit Tests for sdPlannerExecutionQueue
 * Tests all queue operations and data integrity
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert';
import { sdPlannerExecutionQueue } from '../src/agents/planner/queue.js';
import { PlannerPlanDTO } from '../shared/contracts/plan-schema.js';

describe('sdPlannerExecutionQueue', () => {
  let queue: sdPlannerExecutionQueue;

  // Helper to create a test plan
  const createMockPlan = (planId: string): PlannerPlanDTO => ({
    planId,
    description: `Test plan ${planId}`,
    steps: [
      {
        id: `step-${planId}-1`,
        name: 'Test Step',
        type: 'implementation',
        agent: 'developer',
        description: 'Test step description',
        dependencies: [],
        expectedOutputs: ['output.ts'],
        estimatedDuration: 30,
      },
    ],
    artifacts: ['artifact1.ts'],
    metadata: {
      createdAt: new Date().toISOString(),
      estimatedDuration: 30,
      dependencies: [],
      priority: 1,
      tags: ['test'],
      version: '1.0.0',
    },
  });

  beforeEach(() => {
    queue = new sdPlannerExecutionQueue();
  });

  describe('enqueue', () => {
    test('should enqueue a plan successfully', () => {
      const plan = createMockPlan('plan-1');
      const item = queue.enqueue(plan);

      assert.ok(item);
      assert.strictEqual(item.plan.planId, 'plan-1');
      assert.ok(item.enqueuedAt);
      assert.strictEqual(queue.size(), 1);
    });

    test('should emit plan:enqueued event', async () => {
      const plan = createMockPlan('plan-event');

      await new Promise<void>((resolve) => {
        queue.once('plan:enqueued', (item: any) => {
          assert.strictEqual(item.plan.planId, 'plan-event');
          resolve();
        });

        queue.enqueue(plan);
      });
    });

    test('should preserve metadata when enqueueing', () => {
      const plan = createMockPlan('plan-meta');
      const metadata = {
        request: 'Test request',
        source: 'test-source',
        tags: ['tag1', 'tag2'],
      };

      const item = queue.enqueue(plan, metadata);

      assert.strictEqual(item.metadata.request, 'Test request');
      assert.strictEqual(item.metadata.source, 'test-source');
      assert.deepStrictEqual(item.metadata.tags, ['tag1', 'tag2']);
    });

    test('should handle multiple plans', () => {
      const plan1 = createMockPlan('plan-1');
      const plan2 = createMockPlan('plan-2');
      const plan3 = createMockPlan('plan-3');

      queue.enqueue(plan1);
      queue.enqueue(plan2);
      queue.enqueue(plan3);

      assert.strictEqual(queue.size(), 3);
    });
  });

  describe('dequeue', () => {
    test('should dequeue in FIFO order', () => {
      const plan1 = createMockPlan('plan-1');
      const plan2 = createMockPlan('plan-2');
      const plan3 = createMockPlan('plan-3');

      queue.enqueue(plan1);
      queue.enqueue(plan2);
      queue.enqueue(plan3);

      const first = queue.dequeue();
      assert.strictEqual(first?.plan.planId, 'plan-1');

      const second = queue.dequeue();
      assert.strictEqual(second?.plan.planId, 'plan-2');

      assert.strictEqual(queue.size(), 1);
    });

    test('should return undefined when queue is empty', () => {
      const item = queue.dequeue();
      assert.strictEqual(item, undefined);
    });

    test('should emit plan:dequeued event', async () => {
      const plan = createMockPlan('plan-dequeue');
      queue.enqueue(plan);

      await new Promise<void>((resolve) => {
        queue.once('plan:dequeued', (item: any) => {
          assert.strictEqual(item.plan.planId, 'plan-dequeue');
          resolve();
        });

        queue.dequeue();
      });
    });
  });

  describe('peek', () => {
    test('should return first item without removing it', () => {
      const plan1 = createMockPlan('plan-1');
      const plan2 = createMockPlan('plan-2');

      queue.enqueue(plan1);
      queue.enqueue(plan2);

      const peeked = queue.peek();
      assert.strictEqual(peeked?.plan.planId, 'plan-1');
      assert.strictEqual(queue.size(), 2);
    });

    test('should return undefined for empty queue', () => {
      const peeked = queue.peek();
      assert.strictEqual(peeked, undefined);
    });
  });

  describe('isEmpty', () => {
    test('should return true for empty queue', () => {
      assert.strictEqual(queue.isEmpty(), true);
    });

    test('should return false for non-empty queue', () => {
      queue.enqueue(createMockPlan('plan-1'));
      assert.strictEqual(queue.isEmpty(), false);
    });
  });

  describe('size', () => {
    test('should return 0 for empty queue', () => {
      assert.strictEqual(queue.size(), 0);
    });

    test('should track size correctly', () => {
      queue.enqueue(createMockPlan('plan-1'));
      assert.strictEqual(queue.size(), 1);

      queue.enqueue(createMockPlan('plan-2'));
      assert.strictEqual(queue.size(), 2);

      queue.dequeue();
      assert.strictEqual(queue.size(), 1);
    });
  });

  describe('getSnapshot', () => {
    test('should return deep copy of queue items', () => {
      const plan = createMockPlan('plan-snapshot');
      queue.enqueue(plan);

      const snapshot = queue.getSnapshot();
      
      // Modify snapshot
      snapshot[0].plan.description = 'Modified';
      snapshot[0].plan.steps[0].name = 'Modified Step';

      // Original should be unchanged
      const original = queue.peek();
      assert.strictEqual(original?.plan.description, 'Test plan plan-snapshot');
      assert.strictEqual(original?.plan.steps[0].name, 'Test Step');
    });

    test('should return empty array for empty queue', () => {
      const snapshot = queue.getSnapshot();
      assert.deepStrictEqual(snapshot, []);
    });
  });

  describe('findByPlanId', () => {
    test('should find plan by ID', () => {
      queue.enqueue(createMockPlan('plan-1'));
      queue.enqueue(createMockPlan('plan-2'));
      queue.enqueue(createMockPlan('plan-3'));

      const found = queue.findByPlanId('plan-2');
      assert.strictEqual(found?.plan.planId, 'plan-2');
    });

    test('should return undefined for non-existent ID', () => {
      queue.enqueue(createMockPlan('plan-1'));
      
      const found = queue.findByPlanId('nonexistent');
      assert.strictEqual(found, undefined);
    });
  });

  describe('removeByPlanId', () => {
    test('should remove plan by ID', () => {
      queue.enqueue(createMockPlan('plan-1'));
      queue.enqueue(createMockPlan('plan-2'));
      queue.enqueue(createMockPlan('plan-3'));

      const removed = queue.removeByPlanId('plan-2');
      
      assert.strictEqual(removed, true);
      assert.strictEqual(queue.size(), 2);
      assert.strictEqual(queue.findByPlanId('plan-2'), undefined);
    });

    test('should return false for non-existent ID', () => {
      queue.enqueue(createMockPlan('plan-1'));
      
      const removed = queue.removeByPlanId('nonexistent');
      assert.strictEqual(removed, false);
      assert.strictEqual(queue.size(), 1);
    });

    test('should emit plan:removed event', async () => {
      queue.enqueue(createMockPlan('plan-remove'));

      await new Promise<void>((resolve) => {
        queue.once('plan:removed', (planId: string) => {
          assert.strictEqual(planId, 'plan-remove');
          resolve();
        });

        queue.removeByPlanId('plan-remove');
      });
    });
  });

  describe('clear', () => {
    test('should clear all items from queue', () => {
      queue.enqueue(createMockPlan('plan-1'));
      queue.enqueue(createMockPlan('plan-2'));
      queue.enqueue(createMockPlan('plan-3'));

      queue.clear();

      assert.strictEqual(queue.size(), 0);
      assert.strictEqual(queue.isEmpty(), true);
    });

    test('should emit queue:cleared event', async () => {
      queue.enqueue(createMockPlan('plan-1'));

      await new Promise<void>((resolve) => {
        queue.once('queue:cleared', () => {
          resolve();
        });

        queue.clear();
      });
    });
  });
});
