"use strict";
/**
 * Tests for Orchestrator
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const orchestrator_js_1 = require("../src/core/orchestrator.js");
(0, node_test_1.test)('Orchestrator - create plan', async (t) => {
    const orchestrator = new orchestrator_js_1.Orchestrator();
    const plan = await orchestrator.createPlan('Test feature');
    node_assert_1.default.ok(plan.id, 'Plan should have an ID');
    node_assert_1.default.strictEqual(plan.description, 'Test feature');
    node_assert_1.default.ok(Array.isArray(plan.tasks), 'Plan should have tasks array');
    node_assert_1.default.ok(plan.tasks.length > 0, 'Plan should have at least one task');
});
(0, node_test_1.test)('Orchestrator - generate unique IDs', (t) => {
    const orchestrator = new orchestrator_js_1.Orchestrator();
    const id1 = orchestrator.generateId();
    const id2 = orchestrator.generateId();
    node_assert_1.default.notStrictEqual(id1, id2, 'Generated IDs should be unique');
});
(0, node_test_1.test)('Orchestrator - decompose tasks', (t) => {
    const orchestrator = new orchestrator_js_1.Orchestrator();
    const tasks = orchestrator.decomposeTasks('Test feature');
    node_assert_1.default.ok(Array.isArray(tasks), 'Should return array of tasks');
    node_assert_1.default.ok(tasks.length > 0, 'Should decompose into at least one task');
    for (const task of tasks) {
        node_assert_1.default.ok(task.id, 'Task should have ID');
        node_assert_1.default.ok(task.name, 'Task should have name');
        node_assert_1.default.ok(task.agent, 'Task should have assigned agent');
    }
});
(0, node_test_1.test)('Orchestrator - register agent', (t) => {
    const orchestrator = new orchestrator_js_1.Orchestrator();
    const mockAgent = { execute: async () => ({ success: true }) };
    orchestrator.registerAgent('test-agent', mockAgent);
    node_assert_1.default.ok(orchestrator.agents.has('test-agent'), 'Agent should be registered');
});
(0, node_test_1.test)('Orchestrator - get status', (t) => {
    const orchestrator = new orchestrator_js_1.Orchestrator();
    const status = orchestrator.getStatus('test-feature');
    node_assert_1.default.ok(status.feature, 'Status should have feature ID');
    node_assert_1.default.ok(status.status, 'Status should have status field');
    node_assert_1.default.ok(Array.isArray(status.tasks), 'Status should have tasks array');
});
//# sourceMappingURL=orchestrator.test.js.map