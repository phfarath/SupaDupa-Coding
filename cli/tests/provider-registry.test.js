"use strict";
/**
 * Tests for Provider Registry and Encryption
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const provider_registry_js_1 = require("../src/core/provider-registry.js");
const encryption_js_1 = require("../src/security/encryption.js");
const promises_1 = __importDefault(require("fs/promises"));
// Encryption Tests
(0, node_test_1.test)('encrypt - encrypts a string', async (t) => {
    const plaintext = 'sk-test1234567890abcdefghijklmnopqr';
    const encrypted = await (0, encryption_js_1.encrypt)(plaintext);
    node_assert_1.default.ok(encrypted, 'Should return encrypted value');
    node_assert_1.default.ok(typeof encrypted === 'string', 'Encrypted value should be string');
    node_assert_1.default.ok(encrypted !== plaintext, 'Encrypted should not equal plaintext');
});
(0, node_test_1.test)('decrypt - decrypts encrypted string', async (t) => {
    const plaintext = 'sk-test1234567890abcdefghijklmnopqr';
    const encrypted = await (0, encryption_js_1.encrypt)(plaintext);
    const decrypted = await (0, encryption_js_1.decrypt)(encrypted);
    node_assert_1.default.strictEqual(decrypted, plaintext, 'Decrypted should match original');
});
(0, node_test_1.test)('encrypt/decrypt - roundtrip with special characters', async (t) => {
    const plaintext = 'sk-test!@#$%^&*()_+-=[]{}|;:,.<>?123456';
    const encrypted = await (0, encryption_js_1.encrypt)(plaintext);
    const decrypted = await (0, encryption_js_1.decrypt)(encrypted);
    node_assert_1.default.strictEqual(decrypted, plaintext, 'Should handle special characters');
});
(0, node_test_1.test)('isEncrypted - detects encrypted values', async (t) => {
    const plaintext = 'sk-test1234567890abcdefghijklmnopqr';
    const encrypted = await (0, encryption_js_1.encrypt)(plaintext);
    node_assert_1.default.ok((0, encryption_js_1.isEncrypted)(encrypted), 'Should detect encrypted value');
    node_assert_1.default.ok(!(0, encryption_js_1.isEncrypted)(plaintext), 'Should not detect plaintext as encrypted');
    node_assert_1.default.ok(!(0, encryption_js_1.isEncrypted)(''), 'Should not detect empty string as encrypted');
    node_assert_1.default.ok(!(0, encryption_js_1.isEncrypted)(123), 'Should not detect number as encrypted');
});
(0, node_test_1.test)('validateApiKey - validates OpenAI keys', async (t) => {
    node_assert_1.default.ok((0, encryption_js_1.validateApiKey)('openai', 'sk-1234567890abcdefghijklmnopqrstuvwxyz'), 'Should accept valid OpenAI key');
    node_assert_1.default.throws(() => (0, encryption_js_1.validateApiKey)('openai', 'invalid-key'), /Invalid API key format/, 'Should reject invalid OpenAI key');
    node_assert_1.default.throws(() => (0, encryption_js_1.validateApiKey)('openai', 'sk-short'), /Invalid API key format/, 'Should reject short OpenAI key');
});
(0, node_test_1.test)('validateApiKey - validates Anthropic keys', async (t) => {
    const validKey = 'sk-ant-' + 'a'.repeat(95);
    node_assert_1.default.ok((0, encryption_js_1.validateApiKey)('anthropic', validKey), 'Should accept valid Anthropic key');
    node_assert_1.default.throws(() => (0, encryption_js_1.validateApiKey)('anthropic', 'sk-short'), /Invalid API key format/, 'Should reject invalid Anthropic key');
});
(0, node_test_1.test)('validateApiKey - validates generic keys', async (t) => {
    node_assert_1.default.ok((0, encryption_js_1.validateApiKey)('custom', 'abcdefghijklmnop'), 'Should accept generic key with 10+ chars');
    node_assert_1.default.throws(() => (0, encryption_js_1.validateApiKey)('custom', 'short'), /Invalid API key format/, 'Should reject short generic key');
});
// Provider Registry Tests
(0, node_test_1.test)('ProviderRegistry - add provider', async (t) => {
    const tempPath = `/tmp/test-config-${Date.now()}.json`;
    const registry = new provider_registry_js_1.ProviderRegistry(tempPath);
    const result = await registry.addProvider('openai', 'sk-1234567890abcdefghijklmnopqrstuvwxyz', {
        model: 'gpt-4'
    });
    node_assert_1.default.strictEqual(result.name, 'openai', 'Should return provider name');
    node_assert_1.default.strictEqual(result.model, 'gpt-4', 'Should return model');
    node_assert_1.default.ok(result.active, 'Should be active as first provider');
    // Cleanup
    await promises_1.default.unlink(tempPath).catch(() => { });
    await promises_1.default.unlink('/tmp/.supadupacode.key').catch(() => { });
});
(0, node_test_1.test)('ProviderRegistry - list providers', async (t) => {
    const tempPath = `/tmp/test-config-${Date.now()}.json`;
    const registry = new provider_registry_js_1.ProviderRegistry(tempPath);
    await registry.addProvider('openai', 'sk-1234567890abcdefghijklmnopqrstuvwxyz', {
        model: 'gpt-4'
    });
    const validAnthropicKey = 'sk-ant-' + 'a'.repeat(95);
    await registry.addProvider('anthropic', validAnthropicKey, {
        model: 'claude-3-opus'
    });
    const providers = await registry.listProviders();
    node_assert_1.default.strictEqual(providers.length, 2, 'Should list 2 providers');
    node_assert_1.default.ok(providers.find(p => p.name === 'openai'), 'Should include openai');
    node_assert_1.default.ok(providers.find(p => p.name === 'anthropic'), 'Should include anthropic');
    node_assert_1.default.ok(providers.find(p => p.active), 'Should have one active provider');
    node_assert_1.default.ok(providers.every(p => p.hasKey), 'All should have keys');
    // Verify keys are not exposed
    node_assert_1.default.ok(providers.every(p => !p.encrypted_key), 'Should not expose encrypted keys');
    node_assert_1.default.ok(providers.every(p => !p.apiKey), 'Should not expose API keys');
    // Cleanup
    await promises_1.default.unlink(tempPath).catch(() => { });
    await promises_1.default.unlink('/tmp/.supadupacode.key').catch(() => { });
});
(0, node_test_1.test)('ProviderRegistry - switch provider', async (t) => {
    const tempPath = `/tmp/test-config-${Date.now()}.json`;
    const registry = new provider_registry_js_1.ProviderRegistry(tempPath);
    await registry.addProvider('openai', 'sk-1234567890abcdefghijklmnopqrstuvwxyz');
    const validAnthropicKey = 'sk-ant-' + 'a'.repeat(95);
    await registry.addProvider('anthropic', validAnthropicKey);
    const result = await registry.switchProvider('anthropic');
    node_assert_1.default.strictEqual(result.name, 'anthropic', 'Should switch to anthropic');
    node_assert_1.default.ok(result.active, 'Should be active');
    const providers = await registry.listProviders();
    const anthropic = providers.find(p => p.name === 'anthropic');
    const openai = providers.find(p => p.name === 'openai');
    node_assert_1.default.ok(anthropic.active, 'Anthropic should be active');
    node_assert_1.default.ok(!openai.active, 'OpenAI should not be active');
    // Cleanup
    await promises_1.default.unlink(tempPath).catch(() => { });
    await promises_1.default.unlink('/tmp/.supadupacode.key').catch(() => { });
});
(0, node_test_1.test)('ProviderRegistry - get provider without key', async (t) => {
    const tempPath = `/tmp/test-config-${Date.now()}.json`;
    const registry = new provider_registry_js_1.ProviderRegistry(tempPath);
    await registry.addProvider('openai', 'sk-1234567890abcdefghijklmnopqrstuvwxyz', {
        model: 'gpt-4'
    });
    const provider = await registry.getProvider('openai', false);
    node_assert_1.default.strictEqual(provider.name, 'openai', 'Should return provider');
    node_assert_1.default.strictEqual(provider.model, 'gpt-4', 'Should have model');
    node_assert_1.default.ok(!provider.apiKey, 'Should not include API key when not requested');
    // Cleanup
    await promises_1.default.unlink(tempPath).catch(() => { });
    await promises_1.default.unlink('/tmp/.supadupacode.key').catch(() => { });
});
(0, node_test_1.test)('ProviderRegistry - get provider with key', async (t) => {
    const tempPath = `/tmp/test-config-${Date.now()}.json`;
    const registry = new provider_registry_js_1.ProviderRegistry(tempPath);
    const apiKey = 'sk-1234567890abcdefghijklmnopqrstuvwxyz';
    await registry.addProvider('openai', apiKey, { model: 'gpt-4' });
    const provider = await registry.getProvider('openai', true);
    node_assert_1.default.strictEqual(provider.name, 'openai', 'Should return provider');
    node_assert_1.default.strictEqual(provider.apiKey, apiKey, 'Should decrypt and return API key');
    // Cleanup
    await promises_1.default.unlink(tempPath).catch(() => { });
    await promises_1.default.unlink('/tmp/.supadupacode.key').catch(() => { });
});
(0, node_test_1.test)('ProviderRegistry - remove provider', async (t) => {
    const tempPath = `/tmp/test-config-${Date.now()}.json`;
    const registry = new provider_registry_js_1.ProviderRegistry(tempPath);
    await registry.addProvider('openai', 'sk-1234567890abcdefghijklmnopqrstuvwxyz');
    const validAnthropicKey = 'sk-ant-' + 'a'.repeat(95);
    await registry.addProvider('anthropic', validAnthropicKey);
    await registry.removeProvider('openai');
    const providers = await registry.listProviders();
    node_assert_1.default.strictEqual(providers.length, 1, 'Should have 1 provider left');
    node_assert_1.default.ok(!providers.find(p => p.name === 'openai'), 'Should not include openai');
    // Cleanup
    await promises_1.default.unlink(tempPath).catch(() => { });
    await promises_1.default.unlink('/tmp/.supadupacode.key').catch(() => { });
});
(0, node_test_1.test)('ProviderRegistry - update provider', async (t) => {
    const tempPath = `/tmp/test-config-${Date.now()}.json`;
    const registry = new provider_registry_js_1.ProviderRegistry(tempPath);
    await registry.addProvider('openai', 'sk-1234567890abcdefghijklmnopqrstuvwxyz', {
        model: 'gpt-3.5-turbo'
    });
    await registry.updateProvider('openai', {
        model: 'gpt-4',
        apiKey: 'sk-newapikey1234567890abcdefghijklmnop'
    });
    const provider = await registry.getProvider('openai', true);
    node_assert_1.default.strictEqual(provider.model, 'gpt-4', 'Should update model');
    node_assert_1.default.strictEqual(provider.apiKey, 'sk-newapikey1234567890abcdefghijklmnop', 'Should update API key');
    // Cleanup
    await promises_1.default.unlink(tempPath).catch(() => { });
    await promises_1.default.unlink('/tmp/.supadupacode.key').catch(() => { });
});
(0, node_test_1.test)('ProviderRegistry - get active provider', async (t) => {
    const tempPath = `/tmp/test-config-${Date.now()}.json`;
    const registry = new provider_registry_js_1.ProviderRegistry(tempPath);
    await registry.addProvider('openai', 'sk-1234567890abcdefghijklmnopqrstuvwxyz');
    const active = await registry.getActiveProvider();
    node_assert_1.default.strictEqual(active.name, 'openai', 'Should return active provider');
    node_assert_1.default.ok(active.active, 'Should be marked as active');
    // Cleanup
    await promises_1.default.unlink(tempPath).catch(() => { });
    await promises_1.default.unlink('/tmp/.supadupacode.key').catch(() => { });
});
(0, node_test_1.test)('ProviderRegistry - rejects invalid provider name', async (t) => {
    const tempPath = `/tmp/test-config-${Date.now()}.json`;
    const registry = new provider_registry_js_1.ProviderRegistry(tempPath);
    await node_assert_1.default.rejects(async () => await registry.addProvider('', 'sk-1234567890abcdefghijklmnopqr'), /Provider name is required/, 'Should reject empty provider name');
    // Cleanup
    await promises_1.default.unlink(tempPath).catch(() => { });
});
(0, node_test_1.test)('ProviderRegistry - rejects invalid API key', async (t) => {
    const tempPath = `/tmp/test-config-${Date.now()}.json`;
    const registry = new provider_registry_js_1.ProviderRegistry(tempPath);
    await node_assert_1.default.rejects(async () => await registry.addProvider('openai', ''), /API key is required/, 'Should reject empty API key');
    await node_assert_1.default.rejects(async () => await registry.addProvider('openai', 'invalid-short'), /Invalid API key format/, 'Should reject invalid API key format');
    // Cleanup
    await promises_1.default.unlink(tempPath).catch(() => { });
});
(0, node_test_1.test)('ProviderRegistry - errors on non-existent provider', async (t) => {
    const tempPath = `/tmp/test-config-${Date.now()}.json`;
    const registry = new provider_registry_js_1.ProviderRegistry(tempPath);
    await node_assert_1.default.rejects(async () => await registry.getProvider('nonexistent'), /Provider 'nonexistent' not found/, 'Should error on non-existent provider');
    await node_assert_1.default.rejects(async () => await registry.switchProvider('nonexistent'), /Provider 'nonexistent' not found/, 'Should error when switching to non-existent provider');
    // Cleanup
    await promises_1.default.unlink(tempPath).catch(() => { });
});
//# sourceMappingURL=provider-registry.test.js.map