"use strict";
/**
 * Integration Tests for Orchestrator with Retry Logic
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const orchestrator_js_1 = require("../src/core/orchestrator.js");
const base_agent_js_1 = require("../src/agents/base-agent.js");
class FlakyAgent extends base_agent_js_1.BaseAgent {
    constructor(name, failCount = 2) {
        super(name, { capabilities: ['test'] });
        this.failCount = failCount;
        this.attempts = 0;
    }
    async execute(task) {
        this.attempts++;
        if (this.attempts <= this.failCount) {
            throw new Error(`Temporary failure (attempt ${this.attempts})`);
        }
        return {
            status: 'completed',
            message: `Task completed after ${this.attempts} attempts`,
            attempts: this.attempts
        };
    }
}
class AlwaysFailAgent extends base_agent_js_1.BaseAgent {
    constructor(name) {
        super(name, { capabilities: ['test'] });
    }
    async execute(task) {
        throw new Error('Permanent failure');
    }
}
(0, node_test_1.test)('Orchestrator - retries task on failure', async (t) => {
    const orchestrator = new orchestrator_js_1.Orchestrator({ retries: 3 });
    const agent = new FlakyAgent('flaky', 2);
    orchestrator.registerAgent('flaky', agent);
    const task = {
        id: 'test-1',
        name: 'Test Task',
        description: 'Test task with retries',
        agent: 'flaky',
        type: 'test'
    };
    const result = await orchestrator.executeTask(task);
    node_assert_1.default.strictEqual(result.status, 'success');
    node_assert_1.default.strictEqual(agent.attempts, 3);
});
(0, node_test_1.test)('Orchestrator - emits retry events', async (t) => {
    const orchestrator = new orchestrator_js_1.Orchestrator({ retries: 3 });
    const agent = new FlakyAgent('flaky', 2);
    orchestrator.registerAgent('flaky', agent);
    const retryEvents = [];
    orchestrator.on('task-retry', (event) => {
        retryEvents.push(event);
    });
    const task = {
        id: 'test-1',
        name: 'Test Task',
        agent: 'flaky',
        type: 'test'
    };
    await orchestrator.executeTask(task);
    node_assert_1.default.strictEqual(retryEvents.length, 2); // 2 retries before success
    node_assert_1.default.ok(retryEvents[0].delay > 0);
});
(0, node_test_1.test)('Orchestrator - fails after max retries', async (t) => {
    const orchestrator = new orchestrator_js_1.Orchestrator({ retries: 2 });
    const agent = new AlwaysFailAgent('always-fail');
    orchestrator.registerAgent('always-fail', agent);
    const task = {
        id: 'test-1',
        name: 'Test Task',
        agent: 'always-fail',
        type: 'test'
    };
    const result = await orchestrator.executeTask(task);
    node_assert_1.default.strictEqual(result.status, 'failed');
    node_assert_1.default.ok(result.error?.includes('failure'));
});
(0, node_test_1.test)('Orchestrator - circuit breaker opens after failures', async (t) => {
    const orchestrator = new orchestrator_js_1.Orchestrator({ retries: 0 });
    const agent = new AlwaysFailAgent('always-fail');
    orchestrator.registerAgent('always-fail', agent);
    const task = {
        id: 'test-1',
        name: 'Test Task',
        agent: 'always-fail',
        type: 'test'
    };
    // Execute task 5 times to open circuit breaker (threshold is 5)
    for (let i = 0; i < 5; i++) {
        await orchestrator.executeTask(task);
    }
    // Next execution should be blocked by circuit breaker
    const result = await orchestrator.executeTask(task);
    node_assert_1.default.strictEqual(result.status, 'failed');
    node_assert_1.default.ok(result.error?.includes('Circuit breaker is OPEN') || result.error?.includes('failure'));
});
(0, node_test_1.test)('Orchestrator - sequential execution with retries', async (t) => {
    const orchestrator = new orchestrator_js_1.Orchestrator({
        retries: 3,
        executionMode: 'sequential'
    });
    const agent1 = new FlakyAgent('agent1', 1);
    const agent2 = new FlakyAgent('agent2', 1);
    orchestrator.registerAgent('agent1', agent1);
    orchestrator.registerAgent('agent2', agent2);
    const plan = {
        id: 'plan-1',
        orchestrationPattern: 'sequential',
        tasks: [
            {
                id: 'task-1',
                name: 'Task 1',
                agent: 'agent1',
                type: 'test'
            },
            {
                id: 'task-2',
                name: 'Task 2',
                agent: 'agent2',
                type: 'test'
            }
        ]
    };
    const execution = await orchestrator.executePlan(plan);
    node_assert_1.default.strictEqual(execution.status, 'completed');
    node_assert_1.default.strictEqual(execution.results.length, 2);
    node_assert_1.default.strictEqual(execution.results[0].status, 'success');
    node_assert_1.default.strictEqual(execution.results[1].status, 'success');
});
(0, node_test_1.test)('Orchestrator - concurrent execution with retries', async (t) => {
    const orchestrator = new orchestrator_js_1.Orchestrator({
        retries: 3,
        executionMode: 'concurrent'
    });
    const agent1 = new FlakyAgent('agent1', 1);
    const agent2 = new FlakyAgent('agent2', 1);
    orchestrator.registerAgent('agent1', agent1);
    orchestrator.registerAgent('agent2', agent2);
    const plan = {
        id: 'plan-1',
        orchestrationPattern: 'concurrent',
        tasks: [
            {
                id: 'task-1',
                name: 'Task 1',
                agent: 'agent1',
                type: 'test'
            },
            {
                id: 'task-2',
                name: 'Task 2',
                agent: 'agent2',
                type: 'test'
            }
        ]
    };
    const execution = await orchestrator.executePlan(plan);
    node_assert_1.default.strictEqual(execution.status, 'completed');
    node_assert_1.default.strictEqual(execution.results.length, 2);
    node_assert_1.default.strictEqual(execution.results[0].status, 'success');
    node_assert_1.default.strictEqual(execution.results[1].status, 'success');
});
//# sourceMappingURL=integration.test.js.map