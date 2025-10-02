/**
 * Tests for Orchestrator
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { Orchestrator } from '../src/core/orchestrator.js';

test('Orchestrator - create plan', async (t) => {
  const orchestrator = new Orchestrator();
  const plan = await orchestrator.createPlan('Test feature');
  
  assert.ok(plan.id, 'Plan should have an ID');
  assert.strictEqual(plan.description, 'Test feature');
  assert.ok(Array.isArray(plan.tasks), 'Plan should have tasks array');
  assert.ok(plan.tasks.length > 0, 'Plan should have at least one task');
});

test('Orchestrator - generate unique IDs', (t) => {
  const orchestrator = new Orchestrator();
  const id1 = orchestrator.generateId();
  const id2 = orchestrator.generateId();
  
  assert.notStrictEqual(id1, id2, 'Generated IDs should be unique');
});

test('Orchestrator - decompose tasks', (t) => {
  const orchestrator = new Orchestrator();
  const tasks = orchestrator.decomposeTasks('Test feature');
  
  assert.ok(Array.isArray(tasks), 'Should return array of tasks');
  assert.ok(tasks.length > 0, 'Should decompose into at least one task');
  
  for (const task of tasks) {
    assert.ok(task.id, 'Task should have ID');
    assert.ok(task.name, 'Task should have name');
    assert.ok(task.agent, 'Task should have assigned agent');
  }
});

test('Orchestrator - register agent', (t) => {
  const orchestrator = new Orchestrator();
  const mockAgent = { execute: async () => ({ success: true }) };
  
  orchestrator.registerAgent('test-agent', mockAgent);
  assert.ok(orchestrator.agents.has('test-agent'), 'Agent should be registered');
});

test('Orchestrator - get status', (t) => {
  const orchestrator = new Orchestrator();
  const status = orchestrator.getStatus('test-feature');
  
  assert.ok(status.feature, 'Status should have feature ID');
  assert.ok(status.status, 'Status should have status field');
  assert.ok(Array.isArray(status.tasks), 'Status should have tasks array');
});
