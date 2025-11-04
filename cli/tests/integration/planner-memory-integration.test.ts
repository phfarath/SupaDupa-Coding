/**
 * Integration Test: Planner + Memory + Queue
 * Tests the complete flow of plan creation, queueing, and memory storage
 */

import { sdPlannerOrchestrator } from '../../src/agents/planner/plan-orchestrator';
import { plannerExecutionQueue } from '../../src/agents/planner/queue';
import { sdMemoryRepository } from '../../src/memory/memory-repository';
import { PlannerInputDTO } from '../../shared/contracts/plan-schema';
import { SD_API_EVENTS } from '../../shared/constants/api-events';
import { mkdirSync, existsSync } from 'fs';
import path from 'path';

describe('Planner + Memory + Queue Integration', () => {
  let orchestrator: sdPlannerOrchestrator;
  let memoryRepo: sdMemoryRepository;
  const testDbPath = path.join(__dirname, '../../data/test-memory.db');

  beforeAll(async () => {
    // Ensure test data directory exists
    const dataDir = path.join(__dirname, '../../data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    // Initialize orchestrator
    orchestrator = new sdPlannerOrchestrator({
      persistOutput: false, // Don't persist in tests
      baseDir: path.join(__dirname, '../..'),
    });

    // Initialize memory repository
    memoryRepo = new sdMemoryRepository(testDbPath);
    await memoryRepo.initialize();
  });

  afterAll(async () => {
    // Cleanup
    await memoryRepo.close();
    plannerExecutionQueue.clear();
  });

  beforeEach(() => {
    // Clear queue before each test
    plannerExecutionQueue.clear();
  });

  describe('Plan Creation and Queueing', () => {
    test('should create plan and enqueue automatically', () => {
      const input: PlannerInputDTO = {
        request: 'Test feature implementation',
        metadata: {
          source: 'integration-test',
          category: 'test',
        },
      };

      const plan = orchestrator.createExecutionPlan(input);

      expect(plan).toBeDefined();
      expect(plan.planId).toBeTruthy();
      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plannerExecutionQueue.size()).toBe(1);

      const queuedItem = plannerExecutionQueue.peek();
      expect(queuedItem?.plan.planId).toBe(plan.planId);
    });

    test('should emit SD_EVENT_PLAN_CREATED event', (done) => {
      orchestrator.once(SD_API_EVENTS.EVENT_PLAN_CREATED, ({ plan }) => {
        expect(plan).toBeDefined();
        expect(plan.planId).toBeTruthy();
        done();
      });

      orchestrator.createExecutionPlan({
        request: 'Event test feature',
      });
    });

    test('should handle constraints properly', () => {
      const input: PlannerInputDTO = {
        request: 'Constrained feature',
        constraints: {
          maxDuration: 50,
          forbiddenAgents: ['qa'],
        },
        preferences: {
          prioritizeSpeed: true,
        },
      };

      const plan = orchestrator.createExecutionPlan(input);

      expect(plan.metadata.estimatedDuration).toBeLessThanOrEqual(50);
      expect(plan.steps.every((step) => step.agent !== 'qa')).toBe(true);
    });
  });

  describe('Memory Storage Integration', () => {
    test('should store plan in memory', async () => {
      const input: PlannerInputDTO = {
        request: 'Memory integration test',
      };

      const plan = orchestrator.createExecutionPlan(input);

      // Store plan in memory as a record
      await memoryRepo.putMemoryRecord({
        id: `plan_${plan.planId}`,
        key: plan.description,
        category: 'plans',
        data: {
          plan,
          status: 'created',
        },
        metadata: {
          agentOrigin: 'planner',
          tags: plan.metadata.tags,
          timestamp: plan.metadata.createdAt,
        },
      });

      // Retrieve from memory
      const retrieved = await memoryRepo.getRecord(`plan_${plan.planId}`);

      expect(retrieved).toBeDefined();
      expect(retrieved?.data.plan.planId).toBe(plan.planId);
    });

    test('should search for similar plans', async () => {
      // Store multiple plans
      const plans = [
        { request: 'User authentication system', tags: ['auth', 'security'] },
        { request: 'Payment integration', tags: ['payment', 'api'] },
        { request: 'User profile management', tags: ['user', 'profile'] },
      ];

      for (const planInput of plans) {
        const plan = orchestrator.createExecutionPlan(planInput);
        await memoryRepo.putMemoryRecord({
          id: `plan_${plan.planId}`,
          key: plan.description,
          category: 'plans',
          data: { plan },
          metadata: {
            agentOrigin: 'planner',
            tags: planInput.tags,
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Search for authentication-related plans
      const results = await memoryRepo.fetchSimilarRecords('authentication', 'plans', 5);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].key).toContain('authentication');
    });
  });

  describe('Queue Operations', () => {
    test('should maintain queue order', () => {
      const plans = [
        orchestrator.createExecutionPlan({ request: 'Plan 1' }),
        orchestrator.createExecutionPlan({ request: 'Plan 2' }),
        orchestrator.createExecutionPlan({ request: 'Plan 3' }),
      ];

      expect(plannerExecutionQueue.size()).toBe(3);

      const first = plannerExecutionQueue.dequeue();
      expect(first?.plan.planId).toBe(plans[0].planId);

      const second = plannerExecutionQueue.dequeue();
      expect(second?.plan.planId).toBe(plans[1].planId);

      expect(plannerExecutionQueue.size()).toBe(1);
    });

    test('should get immutable snapshot', () => {
      orchestrator.createExecutionPlan({ request: 'Snapshot test' });

      const snapshot = plannerExecutionQueue.getSnapshot();
      const originalSize = plannerExecutionQueue.size();

      // Mutating snapshot should not affect queue
      snapshot.pop();

      expect(plannerExecutionQueue.size()).toBe(originalSize);
    });

    test('should find plan by ID', () => {
      const plan = orchestrator.createExecutionPlan({ request: 'Find test' });

      const found = plannerExecutionQueue.findByPlanId(plan.planId);
      expect(found?.plan.planId).toBe(plan.planId);

      const notFound = plannerExecutionQueue.findByPlanId('nonexistent');
      expect(notFound).toBeUndefined();
    });

    test('should remove plan by ID', () => {
      const plan = orchestrator.createExecutionPlan({ request: 'Remove test' });
      const initialSize = plannerExecutionQueue.size();

      const removed = plannerExecutionQueue.removeByPlanId(plan.planId);
      expect(removed).toBe(true);
      expect(plannerExecutionQueue.size()).toBe(initialSize - 1);

      const removedAgain = plannerExecutionQueue.removeByPlanId(plan.planId);
      expect(removedAgain).toBe(false);
    });
  });

  describe('Complex Scenarios', () => {
    test('should handle quality-focused request with review step', () => {
      const input: PlannerInputDTO = {
        request: 'Critical security update',
        preferences: {
          prioritizeQuality: true,
        },
      };

      const plan = orchestrator.createExecutionPlan(input);

      const hasReviewStep = plan.steps.some((step) => step.type === 'governance');
      expect(hasReviewStep).toBe(true);
    });

    test('should adapt plan when agents are forbidden', () => {
      const input: PlannerInputDTO = {
        request: 'Feature with agent constraints',
        constraints: {
          forbiddenAgents: ['developer'],
        },
      };

      const plan = orchestrator.createExecutionPlan(input);

      expect(plan.steps.every((step) => step.agent !== 'developer')).toBe(true);
    });

    test('should store and retrieve complete workflow', async () => {
      // Create plan
      const plan = orchestrator.createExecutionPlan({
        request: 'Complete workflow test',
        preferences: { prioritizeQuality: true },
      });

      // Store in memory
      await memoryRepo.putMemoryRecord({
        id: `workflow_${plan.planId}`,
        key: `workflow:${plan.description}`,
        category: 'workflows',
        data: {
          plan,
          queue: plannerExecutionQueue.getSnapshot(),
          status: 'ready',
        },
        metadata: {
          agentOrigin: 'planner',
          tags: [...plan.metadata.tags, 'workflow'],
          timestamp: new Date().toISOString(),
        },
      });

      // Retrieve workflow
      const workflow = await memoryRepo.getRecord(`workflow_${plan.planId}`);

      expect(workflow).toBeDefined();
      expect(workflow?.data.plan.planId).toBe(plan.planId);
      expect(workflow?.data.status).toBe('ready');
    });
  });

  describe('Error Handling', () => {
    test('should reject empty request', () => {
      expect(() => {
        orchestrator.createExecutionPlan({ request: '' });
      }).toThrow('request must be provided');
    });

    test('should reject request with only whitespace', () => {
      expect(() => {
        orchestrator.createExecutionPlan({ request: '   ' });
      }).toThrow('request must be provided');
    });

    test('should handle memory errors gracefully', async () => {
      // Close the repository to simulate error
      await memoryRepo.close();

      await expect(
        memoryRepo.putMemoryRecord({
          id: 'test',
          key: 'test',
          category: 'test',
          data: {},
          metadata: {
            agentOrigin: 'test',
            tags: [],
            timestamp: new Date().toISOString(),
          },
        })
      ).rejects.toThrow('Database not initialized');

      // Reinitialize for other tests
      await memoryRepo.initialize();
    });
  });
});
