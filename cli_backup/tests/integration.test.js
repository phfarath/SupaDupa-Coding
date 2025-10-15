/**
 * Integration Tests for Orchestrator with Retry Logic
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { Orchestrator } from '../src/core/orchestrator.js';
import { BaseAgent } from '../src/agents/base-agent.js';

class FlakyAgent extends BaseAgent {
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

class AlwaysFailAgent extends BaseAgent {
  constructor(name) {
    super(name, { capabilities: ['test'] });
  }

  async execute(task) {
    throw new Error('Permanent failure');
  }
}

test('Orchestrator - retries task on failure', async (t) => {
  const orchestrator = new Orchestrator({ retries: 3 });
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
  
  assert.strictEqual(result.status, 'success');
  assert.strictEqual(agent.attempts, 3);
});

test('Orchestrator - emits retry events', async (t) => {
  const orchestrator = new Orchestrator({ retries: 3 });
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
  
  assert.strictEqual(retryEvents.length, 2); // 2 retries before success
  assert.ok(retryEvents[0].delay > 0);
});

test('Orchestrator - fails after max retries', async (t) => {
  const orchestrator = new Orchestrator({ retries: 2 });
  const agent = new AlwaysFailAgent('always-fail');
  
  orchestrator.registerAgent('always-fail', agent);
  
  const task = {
    id: 'test-1',
    name: 'Test Task',
    agent: 'always-fail',
    type: 'test'
  };
  
  const result = await orchestrator.executeTask(task);
  
  assert.strictEqual(result.status, 'failed');
  assert.ok(result.error.includes('failure'));
});

test('Orchestrator - circuit breaker opens after failures', async (t) => {
  const orchestrator = new Orchestrator({ retries: 0 });
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
  
  assert.strictEqual(result.status, 'failed');
  assert.ok(result.error.includes('Circuit breaker is OPEN') || result.error.includes('failure'));
});

test('Orchestrator - sequential execution with retries', async (t) => {
  const orchestrator = new Orchestrator({ 
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
  
  assert.strictEqual(execution.status, 'completed');
  assert.strictEqual(execution.results.length, 2);
  assert.strictEqual(execution.results[0].status, 'success');
  assert.strictEqual(execution.results[1].status, 'success');
});

test('Orchestrator - concurrent execution with retries', async (t) => {
  const orchestrator = new Orchestrator({ 
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
  
  assert.strictEqual(execution.status, 'completed');
  assert.strictEqual(execution.results.length, 2);
  assert.strictEqual(execution.results[0].status, 'success');
  assert.strictEqual(execution.results[1].status, 'success');
});
