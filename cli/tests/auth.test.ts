/**
 * Tests for Authentication functionality
 */

import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import { generateToken, hashValue, TokenManager, authorize } from '../src/utils/auth.js';

interface TokenManager {
  init(): Promise<string>;
  load(): Promise<string>;
  verify(token: string): Promise<boolean>;
  rotate(): Promise<string>;
  delete(): Promise<boolean>;
}

test('generateToken - generates unique tokens', (t) => {
  const token1 = generateToken();
  const token2 = generateToken();
  
  assert.ok(token1.length > 0);
  assert.ok(token2.length > 0);
  assert.notStrictEqual(token1, token2);
});

test('generateToken - generates tokens of correct length', (t) => {
  const token = generateToken(16);
  
  // 16 bytes = 32 hex characters
  assert.strictEqual(token.length, 32);
});

test('hashValue - produces consistent hashes', (t) => {
  const value = 'test-value';
  const hash1 = hashValue(value);
  const hash2 = hashValue(value);
  
  assert.strictEqual(hash1, hash2);
});

test('hashValue - different values produce different hashes', (t) => {
  const hash1 = hashValue('value1');
  const hash2 = hashValue('value2');
  
  assert.notStrictEqual(hash1, hash2);
});

test('hashValue - salt affects hash', (t) => {
  const value = 'test-value';
  const hash1 = hashValue(value, 'salt1');
  const hash2 = hashValue(value, 'salt2');
  
  assert.notStrictEqual(hash1, hash2);
});

test('TokenManager - init creates token file', async (t) => {
  const tokenPath = path.join('/tmp', `.test-token-${Date.now()}`);
  const manager = new TokenManager(tokenPath);
  
  try {
    const token = await manager.init();
    
    assert.ok(token.length > 0);
    
    // Verify file was created
    const fileContent = await fs.readFile(tokenPath, 'utf-8');
    assert.strictEqual(fileContent, token);
  } finally {
    // Cleanup
    try {
      await fs.unlink(tokenPath);
    } catch (err) {
      // Ignore cleanup errors
    }
  }
});

test('TokenManager - load reads token', async (t) => {
  const tokenPath = path.join('/tmp', `.test-token-${Date.now()}`);
  const manager = new TokenManager(tokenPath);
  
  try {
    const originalToken = await manager.init();
    const loadedToken = await manager.load();
    
    assert.strictEqual(loadedToken, originalToken);
  } finally {
    await fs.unlink(tokenPath);
  }
});

test('TokenManager - verify checks token', async (t) => {
  const tokenPath = path.join('/tmp', `.test-token-${Date.now()}`);
  const manager = new TokenManager(tokenPath);
  
  try {
    const token = await manager.init();
    
    const validCheck = await manager.verify(token);
    assert.strictEqual(validCheck, true);
    
    const invalidCheck = await manager.verify('wrong-token');
    assert.strictEqual(invalidCheck, false);
  } finally {
    await fs.unlink(tokenPath);
  }
});

test('TokenManager - rotate changes token', async (t) => {
  const tokenPath = path.join('/tmp', `.test-token-${Date.now()}`);
  const manager = new TokenManager(tokenPath);
  
  try {
    const token1 = await manager.init();
    const token2 = await manager.rotate();
    
    assert.notStrictEqual(token1, token2);
    
    // Old token should no longer verify
    const oldCheck = await manager.verify(token1);
    assert.strictEqual(oldCheck, false);
    
    // New token should verify
    const newCheck = await manager.verify(token2);
    assert.strictEqual(newCheck, true);
  } finally {
    await fs.unlink(tokenPath);
  }
});

test('TokenManager - delete removes token file', async (t) => {
  const tokenPath = path.join('/tmp', `.test-token-${Date.now()}`);
  const manager = new TokenManager(tokenPath);
  
  await manager.init();
  const deleted = await manager.delete();
  
  assert.strictEqual(deleted, true);
  
  // Verify file doesn't exist
  await assert.rejects(
    async () => await fs.readFile(tokenPath, 'utf-8'),
    { code: 'ENOENT' }
  );
});

test('authorize - validates tokens', async (t) => {
  const tokenPath = path.join('/tmp', `.test-token-${Date.now()}`);
  const manager = new TokenManager(tokenPath);
  
  try {
    const token = await manager.init();
    
    const valid = await authorize(token, manager);
    assert.strictEqual(valid, true);
    
    const invalid = await authorize('wrong-token', manager);
    assert.strictEqual(invalid, false);
  } finally {
    await fs.unlink(tokenPath);
  }
});