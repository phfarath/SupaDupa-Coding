/**
 * Tests for ConfigManager
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { ConfigManager } from '../src/core/config-manager.js';
import fs from 'fs/promises';
import path from 'path';

test('ConfigManager - init creates default config', async (t) => {
  const tempPath = `/tmp/test-config-${Date.now()}.json`;
  const configManager = new ConfigManager(tempPath);
  
  const config = await configManager.init();
  
  assert.ok(config.agents, 'Config should have agents');
  assert.ok(config.mcp, 'Config should have mcp');
  assert.ok(config.git, 'Config should have git settings');
  assert.ok(config.orchestration, 'Config should have orchestration settings');
  
  // Cleanup
  await fs.unlink(tempPath).catch(() => {});
});

test('ConfigManager - get configuration value', async (t) => {
  const tempPath = `/tmp/test-config-${Date.now()}.json`;
  const configManager = new ConfigManager(tempPath);
  
  await configManager.init();
  const value = await configManager.get('orchestration.defaultMode');
  
  assert.strictEqual(value, 'sequential', 'Should get correct config value');
  
  // Cleanup
  await fs.unlink(tempPath).catch(() => {});
});

test('ConfigManager - set configuration value', async (t) => {
  const tempPath = `/tmp/test-config-${Date.now()}.json`;
  const configManager = new ConfigManager(tempPath);
  
  await configManager.init();
  await configManager.set('orchestration.defaultMode', 'concurrent');
  const value = await configManager.get('orchestration.defaultMode');
  
  assert.strictEqual(value, 'concurrent', 'Should update config value');
  
  // Cleanup
  await fs.unlink(tempPath).catch(() => {});
});

test('ConfigManager - show returns full config', async (t) => {
  const tempPath = `/tmp/test-config-${Date.now()}.json`;
  const configManager = new ConfigManager(tempPath);
  
  await configManager.init();
  const config = await configManager.show();
  
  assert.ok(typeof config === 'object', 'Should return config object');
  assert.ok(config.agents, 'Config should have agents');
  
  // Cleanup
  await fs.unlink(tempPath).catch(() => {});
});
