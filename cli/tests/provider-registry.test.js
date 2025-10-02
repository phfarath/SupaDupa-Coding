/**
 * Tests for Provider Registry and Encryption
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { ProviderRegistry } from '../src/core/provider-registry.js';
import { encrypt, decrypt, isEncrypted, validateApiKey } from '../src/security/encryption.js';
import fs from 'fs/promises';
import path from 'path';

// Encryption Tests
test('encrypt - encrypts a string', async (t) => {
  const plaintext = 'sk-test1234567890abcdefghijklmnopqr';
  const encrypted = await encrypt(plaintext);
  
  assert.ok(encrypted, 'Should return encrypted value');
  assert.ok(typeof encrypted === 'string', 'Encrypted value should be string');
  assert.ok(encrypted !== plaintext, 'Encrypted should not equal plaintext');
});

test('decrypt - decrypts encrypted string', async (t) => {
  const plaintext = 'sk-test1234567890abcdefghijklmnopqr';
  const encrypted = await encrypt(plaintext);
  const decrypted = await decrypt(encrypted);
  
  assert.strictEqual(decrypted, plaintext, 'Decrypted should match original');
});

test('encrypt/decrypt - roundtrip with special characters', async (t) => {
  const plaintext = 'sk-test!@#$%^&*()_+-=[]{}|;:,.<>?123456';
  const encrypted = await encrypt(plaintext);
  const decrypted = await decrypt(encrypted);
  
  assert.strictEqual(decrypted, plaintext, 'Should handle special characters');
});

test('isEncrypted - detects encrypted values', async (t) => {
  const plaintext = 'sk-test1234567890abcdefghijklmnopqr';
  const encrypted = await encrypt(plaintext);
  
  assert.ok(isEncrypted(encrypted), 'Should detect encrypted value');
  assert.ok(!isEncrypted(plaintext), 'Should not detect plaintext as encrypted');
  assert.ok(!isEncrypted(''), 'Should not detect empty string as encrypted');
  assert.ok(!isEncrypted(123), 'Should not detect number as encrypted');
});

test('validateApiKey - validates OpenAI keys', async (t) => {
  assert.ok(
    validateApiKey('openai', 'sk-1234567890abcdefghijklmnopqrstuvwxyz'),
    'Should accept valid OpenAI key'
  );
  
  assert.throws(
    () => validateApiKey('openai', 'invalid-key'),
    /Invalid API key format/,
    'Should reject invalid OpenAI key'
  );
  
  assert.throws(
    () => validateApiKey('openai', 'sk-short'),
    /Invalid API key format/,
    'Should reject short OpenAI key'
  );
});

test('validateApiKey - validates Anthropic keys', async (t) => {
  const validKey = 'sk-ant-' + 'a'.repeat(95);
  assert.ok(
    validateApiKey('anthropic', validKey),
    'Should accept valid Anthropic key'
  );
  
  assert.throws(
    () => validateApiKey('anthropic', 'sk-short'),
    /Invalid API key format/,
    'Should reject invalid Anthropic key'
  );
});

test('validateApiKey - validates generic keys', async (t) => {
  assert.ok(
    validateApiKey('custom', 'abcdefghijklmnop'),
    'Should accept generic key with 10+ chars'
  );
  
  assert.throws(
    () => validateApiKey('custom', 'short'),
    /Invalid API key format/,
    'Should reject short generic key'
  );
});

// Provider Registry Tests
test('ProviderRegistry - add provider', async (t) => {
  const tempPath = `/tmp/test-config-${Date.now()}.json`;
  const registry = new ProviderRegistry(tempPath);
  
  const result = await registry.addProvider('openai', 'sk-1234567890abcdefghijklmnopqrstuvwxyz', {
    model: 'gpt-4'
  });
  
  assert.strictEqual(result.name, 'openai', 'Should return provider name');
  assert.strictEqual(result.model, 'gpt-4', 'Should return model');
  assert.ok(result.active, 'Should be active as first provider');
  
  // Cleanup
  await fs.unlink(tempPath).catch(() => {});
  await fs.unlink('/tmp/.supadupacode.key').catch(() => {});
});

test('ProviderRegistry - list providers', async (t) => {
  const tempPath = `/tmp/test-config-${Date.now()}.json`;
  const registry = new ProviderRegistry(tempPath);
  
  await registry.addProvider('openai', 'sk-1234567890abcdefghijklmnopqrstuvwxyz', {
    model: 'gpt-4'
  });
  
  const validAnthropicKey = 'sk-ant-' + 'a'.repeat(95);
  await registry.addProvider('anthropic', validAnthropicKey, {
    model: 'claude-3-opus'
  });
  
  const providers = await registry.listProviders();
  
  assert.strictEqual(providers.length, 2, 'Should list 2 providers');
  assert.ok(providers.find(p => p.name === 'openai'), 'Should include openai');
  assert.ok(providers.find(p => p.name === 'anthropic'), 'Should include anthropic');
  assert.ok(providers.find(p => p.active), 'Should have one active provider');
  assert.ok(providers.every(p => p.hasKey), 'All should have keys');
  
  // Verify keys are not exposed
  assert.ok(providers.every(p => !p.encrypted_key), 'Should not expose encrypted keys');
  assert.ok(providers.every(p => !p.apiKey), 'Should not expose API keys');
  
  // Cleanup
  await fs.unlink(tempPath).catch(() => {});
  await fs.unlink('/tmp/.supadupacode.key').catch(() => {});
});

test('ProviderRegistry - switch provider', async (t) => {
  const tempPath = `/tmp/test-config-${Date.now()}.json`;
  const registry = new ProviderRegistry(tempPath);
  
  await registry.addProvider('openai', 'sk-1234567890abcdefghijklmnopqrstuvwxyz');
  
  const validAnthropicKey = 'sk-ant-' + 'a'.repeat(95);
  await registry.addProvider('anthropic', validAnthropicKey);
  
  const result = await registry.switchProvider('anthropic');
  
  assert.strictEqual(result.name, 'anthropic', 'Should switch to anthropic');
  assert.ok(result.active, 'Should be active');
  
  const providers = await registry.listProviders();
  const anthropic = providers.find(p => p.name === 'anthropic');
  const openai = providers.find(p => p.name === 'openai');
  
  assert.ok(anthropic.active, 'Anthropic should be active');
  assert.ok(!openai.active, 'OpenAI should not be active');
  
  // Cleanup
  await fs.unlink(tempPath).catch(() => {});
  await fs.unlink('/tmp/.supadupacode.key').catch(() => {});
});

test('ProviderRegistry - get provider without key', async (t) => {
  const tempPath = `/tmp/test-config-${Date.now()}.json`;
  const registry = new ProviderRegistry(tempPath);
  
  await registry.addProvider('openai', 'sk-1234567890abcdefghijklmnopqrstuvwxyz', {
    model: 'gpt-4'
  });
  
  const provider = await registry.getProvider('openai', false);
  
  assert.strictEqual(provider.name, 'openai', 'Should return provider');
  assert.strictEqual(provider.model, 'gpt-4', 'Should have model');
  assert.ok(!provider.apiKey, 'Should not include API key when not requested');
  
  // Cleanup
  await fs.unlink(tempPath).catch(() => {});
  await fs.unlink('/tmp/.supadupacode.key').catch(() => {});
});

test('ProviderRegistry - get provider with key', async (t) => {
  const tempPath = `/tmp/test-config-${Date.now()}.json`;
  const registry = new ProviderRegistry(tempPath);
  
  const apiKey = 'sk-1234567890abcdefghijklmnopqrstuvwxyz';
  await registry.addProvider('openai', apiKey, { model: 'gpt-4' });
  
  const provider = await registry.getProvider('openai', true);
  
  assert.strictEqual(provider.name, 'openai', 'Should return provider');
  assert.strictEqual(provider.apiKey, apiKey, 'Should decrypt and return API key');
  
  // Cleanup
  await fs.unlink(tempPath).catch(() => {});
  await fs.unlink('/tmp/.supadupacode.key').catch(() => {});
});

test('ProviderRegistry - remove provider', async (t) => {
  const tempPath = `/tmp/test-config-${Date.now()}.json`;
  const registry = new ProviderRegistry(tempPath);
  
  await registry.addProvider('openai', 'sk-1234567890abcdefghijklmnopqrstuvwxyz');
  
  const validAnthropicKey = 'sk-ant-' + 'a'.repeat(95);
  await registry.addProvider('anthropic', validAnthropicKey);
  
  await registry.removeProvider('openai');
  
  const providers = await registry.listProviders();
  
  assert.strictEqual(providers.length, 1, 'Should have 1 provider left');
  assert.ok(!providers.find(p => p.name === 'openai'), 'Should not include openai');
  
  // Cleanup
  await fs.unlink(tempPath).catch(() => {});
  await fs.unlink('/tmp/.supadupacode.key').catch(() => {});
});

test('ProviderRegistry - update provider', async (t) => {
  const tempPath = `/tmp/test-config-${Date.now()}.json`;
  const registry = new ProviderRegistry(tempPath);
  
  await registry.addProvider('openai', 'sk-1234567890abcdefghijklmnopqrstuvwxyz', {
    model: 'gpt-3.5-turbo'
  });
  
  await registry.updateProvider('openai', {
    model: 'gpt-4',
    apiKey: 'sk-newapikey1234567890abcdefghijklmnop'
  });
  
  const provider = await registry.getProvider('openai', true);
  
  assert.strictEqual(provider.model, 'gpt-4', 'Should update model');
  assert.strictEqual(provider.apiKey, 'sk-newapikey1234567890abcdefghijklmnop', 'Should update API key');
  
  // Cleanup
  await fs.unlink(tempPath).catch(() => {});
  await fs.unlink('/tmp/.supadupacode.key').catch(() => {});
});

test('ProviderRegistry - get active provider', async (t) => {
  const tempPath = `/tmp/test-config-${Date.now()}.json`;
  const registry = new ProviderRegistry(tempPath);
  
  await registry.addProvider('openai', 'sk-1234567890abcdefghijklmnopqrstuvwxyz');
  
  const active = await registry.getActiveProvider();
  
  assert.strictEqual(active.name, 'openai', 'Should return active provider');
  assert.ok(active.active, 'Should be marked as active');
  
  // Cleanup
  await fs.unlink(tempPath).catch(() => {});
  await fs.unlink('/tmp/.supadupacode.key').catch(() => {});
});

test('ProviderRegistry - rejects invalid provider name', async (t) => {
  const tempPath = `/tmp/test-config-${Date.now()}.json`;
  const registry = new ProviderRegistry(tempPath);
  
  await assert.rejects(
    async () => await registry.addProvider('', 'sk-1234567890abcdefghijklmnopqrstuvwxyz'),
    /Provider name is required/,
    'Should reject empty provider name'
  );
  
  // Cleanup
  await fs.unlink(tempPath).catch(() => {});
});

test('ProviderRegistry - rejects invalid API key', async (t) => {
  const tempPath = `/tmp/test-config-${Date.now()}.json`;
  const registry = new ProviderRegistry(tempPath);
  
  await assert.rejects(
    async () => await registry.addProvider('openai', ''),
    /API key is required/,
    'Should reject empty API key'
  );
  
  await assert.rejects(
    async () => await registry.addProvider('openai', 'invalid-short'),
    /Invalid API key format/,
    'Should reject invalid API key format'
  );
  
  // Cleanup
  await fs.unlink(tempPath).catch(() => {});
});

test('ProviderRegistry - errors on non-existent provider', async (t) => {
  const tempPath = `/tmp/test-config-${Date.now()}.json`;
  const registry = new ProviderRegistry(tempPath);
  
  await assert.rejects(
    async () => await registry.getProvider('nonexistent'),
    /Provider 'nonexistent' not found/,
    'Should error on non-existent provider'
  );
  
  await assert.rejects(
    async () => await registry.switchProvider('nonexistent'),
    /Provider 'nonexistent' not found/,
    'Should error when switching to non-existent provider'
  );
  
  // Cleanup
  await fs.unlink(tempPath).catch(() => {});
});
