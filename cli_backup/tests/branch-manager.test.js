/**
 * Tests for BranchManager
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { BranchManager } from '../src/git/branch-manager.js';

test('BranchManager - generate branch name', (t) => {
  const branchManager = new BranchManager({ branchPrefix: 'agent' });
  const branchName = branchManager.generateBranchName('frontend', 'User Authentication');
  
  assert.strictEqual(branchName, 'agent/frontend/user-authentication');
});

test('BranchManager - generate branch name with special characters', (t) => {
  const branchManager = new BranchManager({ branchPrefix: 'agent' });
  const branchName = branchManager.generateBranchName('backend', 'Add API @v2.0 (beta)');
  
  assert.strictEqual(branchName, 'agent/backend/add-api-v2-0-beta');
});

test('BranchManager - get current branch', (t) => {
  const branchManager = new BranchManager();
  const branch = branchManager.getCurrentBranch();
  
  assert.ok(typeof branch === 'string', 'Should return branch name');
  assert.ok(branch.length > 0, 'Branch name should not be empty');
});

test('BranchManager - get branch status', (t) => {
  const branchManager = new BranchManager();
  const status = branchManager.getBranchStatus();
  
  assert.ok(status.branch, 'Status should have branch name');
  assert.ok(typeof status.clean === 'boolean', 'Status should have clean flag');
  assert.ok(typeof status.ahead === 'number', 'Status should have ahead count');
});

test('BranchManager - branch exists check', (t) => {
  const branchManager = new BranchManager();
  const currentBranch = branchManager.getCurrentBranch();
  const exists = branchManager.branchExists(currentBranch);
  
  assert.strictEqual(exists, true, 'Current branch should exist');
  
  const nonExistent = branchManager.branchExists('non-existent-branch-12345');
  assert.strictEqual(nonExistent, false, 'Non-existent branch should not exist');
});
