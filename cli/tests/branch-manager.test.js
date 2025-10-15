"use strict";
/**
 * Tests for BranchManager
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const branch_manager_js_1 = require("../src/git/branch-manager.js");
(0, node_test_1.test)('BranchManager - generate branch name', (t) => {
    const branchManager = new branch_manager_js_1.BranchManager({ branchPrefix: 'agent' });
    const branchName = branchManager.generateBranchName('frontend', 'User Authentication');
    node_assert_1.default.strictEqual(branchName, 'agent/frontend/user-authentication');
});
(0, node_test_1.test)('BranchManager - generate branch name with special characters', (t) => {
    const branchManager = new branch_manager_js_1.BranchManager({ branchPrefix: 'agent' });
    const branchName = branchManager.generateBranchName('backend', 'Add API @v2.0 (beta)');
    node_assert_1.default.strictEqual(branchName, 'agent/backend/add-api-v2-0-beta');
});
(0, node_test_1.test)('BranchManager - get current branch', (t) => {
    const branchManager = new branch_manager_js_1.BranchManager();
    const branch = branchManager.getCurrentBranch();
    node_assert_1.default.ok(typeof branch === 'string', 'Should return branch name');
    node_assert_1.default.ok(branch.length > 0, 'Branch name should not be empty');
});
(0, node_test_1.test)('BranchManager - get branch status', (t) => {
    const branchManager = new branch_manager_js_1.BranchManager();
    const status = branchManager.getBranchStatus();
    node_assert_1.default.ok(status.branch, 'Status should have branch name');
    node_assert_1.default.ok(typeof status.clean === 'boolean', 'Status should have clean flag');
    node_assert_1.default.ok(typeof status.ahead === 'number', 'Status should have ahead count');
});
(0, node_test_1.test)('BranchManager - branch exists check', (t) => {
    const branchManager = new branch_manager_js_1.BranchManager();
    const currentBranch = branchManager.getCurrentBranch();
    const exists = branchManager.branchExists(currentBranch);
    node_assert_1.default.strictEqual(exists, true, 'Current branch should exist');
    const nonExistent = branchManager.branchExists('non-existent-branch-12345');
    node_assert_1.default.strictEqual(nonExistent, false, 'Non-existent branch should not exist');
});
//# sourceMappingURL=branch-manager.test.js.map