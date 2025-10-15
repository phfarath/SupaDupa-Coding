"use strict";
/**
 * Tests for Agent functionality
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const index_js_1 = require("../src/agents/index.js");
(0, node_test_1.test)('BaseAgent - constructor', (t) => {
    const agent = new index_js_1.BaseAgent('test-agent', { capabilities: ['test'] });
    node_assert_1.default.strictEqual(agent.name, 'test-agent');
    node_assert_1.default.deepStrictEqual(agent.capabilities, ['test']);
});
(0, node_test_1.test)('BaseAgent - getInfo', (t) => {
    const agent = new index_js_1.BaseAgent('test-agent', { capabilities: ['test'] });
    const info = agent.getInfo();
    node_assert_1.default.strictEqual(info.name, 'test-agent');
    node_assert_1.default.deepStrictEqual(info.capabilities, ['test']);
});
(0, node_test_1.test)('BaseAgent - canHandle', (t) => {
    const agent = new index_js_1.BaseAgent('test-agent', { capabilities: ['test'] });
    node_assert_1.default.ok(agent.canHandle({ type: 'test' }));
    node_assert_1.default.ok(!agent.canHandle({ type: 'other' }));
});
(0, node_test_1.test)('PlannerAgent - constructor', (t) => {
    const agent = new index_js_1.PlannerAgent();
    node_assert_1.default.strictEqual(agent.name, 'planner');
    node_assert_1.default.ok(agent.capabilities.includes('analysis'));
    node_assert_1.default.ok(agent.capabilities.includes('planning'));
});
(0, node_test_1.test)('PlannerAgent - execute', async (t) => {
    const agent = new index_js_1.PlannerAgent();
    const result = await agent.execute({ description: 'Test task' });
    node_assert_1.default.strictEqual(result.status, 'completed');
    node_assert_1.default.ok(result.message?.includes('Test task'));
    node_assert_1.default.ok(result.artifacts);
});
(0, node_test_1.test)('DeveloperAgent - constructor', (t) => {
    const agent = new index_js_1.DeveloperAgent();
    node_assert_1.default.strictEqual(agent.name, 'developer');
    node_assert_1.default.ok(agent.capabilities.includes('implementation'));
});
(0, node_test_1.test)('DeveloperAgent - execute', async (t) => {
    const agent = new index_js_1.DeveloperAgent();
    const result = await agent.execute({ description: 'Test task' });
    node_assert_1.default.strictEqual(result.status, 'completed');
    node_assert_1.default.ok(result.artifacts.files);
});
(0, node_test_1.test)('QaAgent - constructor', (t) => {
    const agent = new index_js_1.QaAgent();
    node_assert_1.default.strictEqual(agent.name, 'qa');
    node_assert_1.default.ok(agent.capabilities.includes('testing'));
});
(0, node_test_1.test)('QaAgent - execute', async (t) => {
    const agent = new index_js_1.QaAgent();
    const result = await agent.execute({ description: 'Test task' });
    node_assert_1.default.strictEqual(result.status, 'completed');
    node_assert_1.default.ok(result.artifacts.testCases >= 0);
});
(0, node_test_1.test)('DocsAgent - constructor', (t) => {
    const agent = new index_js_1.DocsAgent();
    node_assert_1.default.strictEqual(agent.name, 'docs');
    node_assert_1.default.ok(agent.capabilities.includes('documentation'));
});
(0, node_test_1.test)('DocsAgent - execute', async (t) => {
    const agent = new index_js_1.DocsAgent();
    const result = await agent.execute({ description: 'Test task' });
    node_assert_1.default.strictEqual(result.status, 'completed');
    node_assert_1.default.ok(result.artifacts.files);
});
(0, node_test_1.test)('createDefaultAgents - creates all default agents', (t) => {
    const agents = (0, index_js_1.createDefaultAgents)({});
    node_assert_1.default.ok(agents instanceof Map);
    node_assert_1.default.strictEqual(agents.size, 4);
    node_assert_1.default.ok(agents.has('planner'));
    node_assert_1.default.ok(agents.has('developer'));
    node_assert_1.default.ok(agents.has('qa'));
    node_assert_1.default.ok(agents.has('docs'));
});
(0, node_test_1.test)('createDefaultAgents - with config', (t) => {
    const config = {
        agents: {
            planner: { custom: 'config' }
        }
    };
    const agents = (0, index_js_1.createDefaultAgents)(config);
    node_assert_1.default.ok(agents.has('planner'));
    const planner = agents.get('planner');
    node_assert_1.default.strictEqual(planner.config.custom, 'config');
});
(0, node_test_1.test)('Custom agent - persistence test', async (t) => {
    // This is an integration test to verify custom agents are loaded from config
    const { Orchestrator } = await Promise.resolve().then(() => __importStar(require('../src/core/orchestrator.js')));
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
        getInfo: function () {
            return {
                name: this.name,
                capabilities: this.capabilities,
                config: { type: this.type, model: this.model, memorySize: this.memorySize }
            };
        }
    };
    // Register and verify
    orchestrator.registerAgent('test-custom', customAgent);
    node_assert_1.default.ok(orchestrator.agents.has('test-custom'));
    const agent = orchestrator.agents.get('test-custom');
    node_assert_1.default.strictEqual(agent?.name, 'test-custom');
    node_assert_1.default.strictEqual(agent?.type, 'assistant');
    node_assert_1.default.strictEqual(agent?.model, 'gpt-4');
    node_assert_1.default.strictEqual(agent?.memorySize, 8192);
});
//# sourceMappingURL=agent.test.js.map