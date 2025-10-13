/**
 * Tests for Configuration Validation
 */

import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import { ConfigManager } from '../src/core/config-manager.js';

test('ConfigManager - validation accepts valid config', async (t) => {
  const configPath = path.join('/tmp', `.test-config-${Date.now()}.json`);
  const manager = new ConfigManager(configPath);
  
  try {
    const config = await manager.init();
    
    // Validation should pass on default config
    assert.ok(config);
    assert.ok(config.agents);
    assert.ok(config.mcp);
  } finally {
    await fs.unlink(configPath);
  }
});

test('ConfigManager - validation rejects missing required fields', async (t) => {
  const configPath = path.join('/tmp', `.test-config-${Date.now()}.json`);
  const manager = new ConfigManager(configPath);
  
  try {
    const invalidConfig = {
      agents: {},
      // Missing mcp, git, orchestration
    };
    
    await assert.rejects(
      async () => await manager.save(invalidConfig),
      {
        message: /Configuration validation failed/
      }
    );
  } finally {
    try {
      await fs.unlink(configPath);
    } catch (err) {
      // Ignore
    }
  }
});

test('ConfigManager - validation rejects invalid agent config', async (t) => {
  const configPath = path.join('/tmp', `.test-config-${Date.now()}.json`);
  const manager = new ConfigManager(configPath);
  
  try {
    const config = await manager.init();
    
    // Add invalid agent (missing required mcp_tools)
    config.agents.invalid = {
      enabled: true,
      role: 'test'
      // Missing mcp_tools
    };
    
    await assert.rejects(
      async () => await manager.save(config),
      {
        message: /Configuration validation failed/
      }
    );
  } finally {
    await fs.unlink(configPath);
  }
});

test('ConfigManager - validation rejects invalid orchestration mode', async (t) => {
  const configPath = path.join('/tmp', `.test-config-${Date.now()}.json`);
  const manager = new ConfigManager(configPath);
  
  try {
    const config = await manager.init();
    config.orchestration.defaultMode = 'invalid-mode';
    
    await assert.rejects(
      async () => await manager.save(config),
      {
        message: /Configuration validation failed/
      }
    );
  } finally {
    await fs.unlink(configPath);
  }
});

test('ConfigManager - validation accepts valid orchestration modes', async (t) => {
  const configPath = path.join('/tmp', `.test-config-${Date.now()}.json`);
  const manager = new ConfigManager(configPath);
  
  try {
    const modes = ['sequential', 'concurrent', 'handoff'];
    
    for (const mode of modes) {
      const config = await manager.init();
      config.orchestration.defaultMode = mode;
      
      // Should not throw
      await manager.save(config);
    }
  } finally {
    await fs.unlink(configPath);
  }
});

test('ConfigManager - validation rejects invalid retry count', async (t) => {
  const configPath = path.join('/tmp', `.test-config-${Date.now()}.json`);
  const manager = new ConfigManager(configPath);
  
  try {
    const config = await manager.init();
    config.orchestration.retries = 100; // Exceeds maximum of 10
    
    await assert.rejects(
      async () => await manager.save(config),
      {
        message: /Configuration validation failed/
      }
    );
  } finally {
    await fs.unlink(configPath);
  }
});

test('ConfigManager - load validates configuration', async (t) => {
  const configPath = path.join('/tmp', `.test-config-${Date.now()}.json`);
  
  try {
    // Write invalid config directly to file
    const invalidConfig = {
      agents: {},
      mcp: { servers: {} }
      // Missing git and orchestration
    };
    
    await fs.writeFile(configPath, JSON.stringify(invalidConfig, null, 2));
    
    const manager = new ConfigManager(configPath);
    
    await assert.rejects(
      async () => await manager.load(),
      {
        message: /Configuration validation failed/
      }
    );
  } finally {
    await fs.unlink(configPath);
  }
});
