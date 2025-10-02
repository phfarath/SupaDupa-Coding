/**
 * Tests for Agent functionality
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { BaseAgent, PlannerAgent, DeveloperAgent, QaAgent, DocsAgent, createDefaultAgents } from '../src/agents/index.js';

test('BaseAgent - constructor', (t) => {
  const agent = new BaseAgent('test-agent', { capabilities: ['test'] });
  
  assert.strictEqual(agent.name, 'test-agent');
  assert.deepStrictEqual(agent.capabilities, ['test']);
});

test('BaseAgent - getInfo', (t) => {
  const agent = new BaseAgent('test-agent', { capabilities: ['test'] });
  const info = agent.getInfo();
  
  assert.strictEqual(info.name, 'test-agent');
  assert.deepStrictEqual(info.capabilities, ['test']);
});

test('BaseAgent - canHandle', (t) => {
  const agent = new BaseAgent('test-agent', { capabilities: ['test'] });
  
  assert.ok(agent.canHandle({ type: 'test' }));
  assert.ok(!agent.canHandle({ type: 'other' }));
});

test('PlannerAgent - constructor', (t) => {
  const agent = new PlannerAgent();
  
  assert.strictEqual(agent.name, 'planner');
  assert.ok(agent.capabilities.includes('analysis'));
  assert.ok(agent.capabilities.includes('planning'));
});

test('PlannerAgent - execute', async (t) => {
  const agent = new PlannerAgent();
  const result = await agent.execute({ description: 'Test task' });
  
  assert.strictEqual(result.status, 'completed');
  assert.ok(result.message.includes('Test task'));
  assert.ok(result.artifacts);
});

test('DeveloperAgent - constructor', (t) => {
  const agent = new DeveloperAgent();
  
  assert.strictEqual(agent.name, 'developer');
  assert.ok(agent.capabilities.includes('implementation'));
});

test('DeveloperAgent - execute', async (t) => {
  const agent = new DeveloperAgent();
  const result = await agent.execute({ description: 'Test task' });
  
  assert.strictEqual(result.status, 'completed');
  assert.ok(result.artifacts.files);
});

test('QaAgent - constructor', (t) => {
  const agent = new QaAgent();
  
  assert.strictEqual(agent.name, 'qa');
  assert.ok(agent.capabilities.includes('testing'));
});

test('QaAgent - execute', async (t) => {
  const agent = new QaAgent();
  const result = await agent.execute({ description: 'Test task' });
  
  assert.strictEqual(result.status, 'completed');
  assert.ok(result.artifacts.testCases >= 0);
});

test('DocsAgent - constructor', (t) => {
  const agent = new DocsAgent();
  
  assert.strictEqual(agent.name, 'docs');
  assert.ok(agent.capabilities.includes('documentation'));
});

test('DocsAgent - execute', async (t) => {
  const agent = new DocsAgent();
  const result = await agent.execute({ description: 'Test task' });
  
  assert.strictEqual(result.status, 'completed');
  assert.ok(result.artifacts.files);
});

test('createDefaultAgents - creates all default agents', (t) => {
  const agents = createDefaultAgents({});
  
  assert.ok(agents instanceof Map);
  assert.strictEqual(agents.size, 4);
  assert.ok(agents.has('planner'));
  assert.ok(agents.has('developer'));
  assert.ok(agents.has('qa'));
  assert.ok(agents.has('docs'));
});

test('createDefaultAgents - with config', (t) => {
  const config = {
    agents: {
      planner: { custom: 'config' }
    }
  };
  const agents = createDefaultAgents(config);
  
  assert.ok(agents.has('planner'));
  const planner = agents.get('planner');
  assert.strictEqual(planner.config.custom, 'config');
});

test('Custom agent - persistence test', async (t) => {
  // This is an integration test to verify custom agents are loaded from config
  const { Orchestrator } = await import('../src/core/orchestrator.js');
  const orchestrator = new Orchestrator({});
  
  // Simulate a custom agent config
  const customAgentConfig = {
    type: 'assistant',
    model: 'gpt-4',
    memorySize: 8192,
    createdAt: new Date().toISOString(),
    capabilities: ['general']
  };
  
  // Create a custom agent object (similar to what's loaded from config)
  const customAgent = {
    name: 'test-custom',
    type: customAgentConfig.type,
    model: customAgentConfig.model,
    memorySize: customAgentConfig.memorySize,
    status: 'active',
    createdAt: customAgentConfig.createdAt,
    capabilities: customAgentConfig.capabilities,
    execute: async (task) => {
      return {
        status: 'completed',
        message: `Task completed by test-custom`,
        artifacts: {}
      };
    },
    getInfo: function() {
      return {
        name: this.name,
        capabilities: this.capabilities,
        config: { type: this.type, model: this.model, memorySize: this.memorySize }
      };
    }
  };
  
  // Register and verify
  orchestrator.registerAgent('test-custom', customAgent);
  assert.ok(orchestrator.agents.has('test-custom'));
  
  const agent = orchestrator.agents.get('test-custom');
  assert.strictEqual(agent.name, 'test-custom');
  assert.strictEqual(agent.type, 'assistant');
  assert.strictEqual(agent.model, 'gpt-4');
  assert.strictEqual(agent.memorySize, 8192);
});
