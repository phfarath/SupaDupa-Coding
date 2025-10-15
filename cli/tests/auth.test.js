"use strict";
/**
 * Tests for Authentication functionality
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const auth_js_1 = require("../src/utils/auth.js");
(0, node_test_1.test)('generateToken - generates unique tokens', (t) => {
    const token1 = (0, auth_js_1.generateToken)();
    const token2 = (0, auth_js_1.generateToken)();
    node_assert_1.default.ok(token1.length > 0);
    node_assert_1.default.ok(token2.length > 0);
    node_assert_1.default.notStrictEqual(token1, token2);
});
(0, node_test_1.test)('generateToken - generates tokens of correct length', (t) => {
    const token = (0, auth_js_1.generateToken)(16);
    // 16 bytes = 32 hex characters
    node_assert_1.default.strictEqual(token.length, 32);
});
(0, node_test_1.test)('hashValue - produces consistent hashes', (t) => {
    const value = 'test-value';
    const hash1 = (0, auth_js_1.hashValue)(value);
    const hash2 = (0, auth_js_1.hashValue)(value);
    node_assert_1.default.strictEqual(hash1, hash2);
});
(0, node_test_1.test)('hashValue - different values produce different hashes', (t) => {
    const hash1 = (0, auth_js_1.hashValue)('value1');
    const hash2 = (0, auth_js_1.hashValue)('value2');
    node_assert_1.default.notStrictEqual(hash1, hash2);
});
(0, node_test_1.test)('hashValue - salt affects hash', (t) => {
    const value = 'test-value';
    const hash1 = (0, auth_js_1.hashValue)(value, 'salt1');
    const hash2 = (0, auth_js_1.hashValue)(value, 'salt2');
    node_assert_1.default.notStrictEqual(hash1, hash2);
});
(0, node_test_1.test)('TokenManager - init creates token file', async (t) => {
    const tokenPath = path_1.default.join('/tmp', `.test-token-${Date.now()}`);
    const manager = new auth_js_1.TokenManager(tokenPath);
    try {
        const token = await manager.init();
        node_assert_1.default.ok(token.length > 0);
        // Verify file was created
        const fileContent = await promises_1.default.readFile(tokenPath, 'utf-8');
        node_assert_1.default.strictEqual(fileContent, token);
    }
    finally {
        // Cleanup
        try {
            await promises_1.default.unlink(tokenPath);
        }
        catch (err) {
            // Ignore cleanup errors
        }
    }
});
(0, node_test_1.test)('TokenManager - load reads token', async (t) => {
    const tokenPath = path_1.default.join('/tmp', `.test-token-${Date.now()}`);
    const manager = new auth_js_1.TokenManager(tokenPath);
    try {
        const originalToken = await manager.init();
        const loadedToken = await manager.load();
        node_assert_1.default.strictEqual(loadedToken, originalToken);
    }
    finally {
        await promises_1.default.unlink(tokenPath);
    }
});
(0, node_test_1.test)('TokenManager - verify checks token', async (t) => {
    const tokenPath = path_1.default.join('/tmp', `.test-token-${Date.now()}`);
    const manager = new auth_js_1.TokenManager(tokenPath);
    try {
        const token = await manager.init();
        const validCheck = await manager.verify(token);
        node_assert_1.default.strictEqual(validCheck, true);
        const invalidCheck = await manager.verify('wrong-token');
        node_assert_1.default.strictEqual(invalidCheck, false);
    }
    finally {
        await promises_1.default.unlink(tokenPath);
    }
});
(0, node_test_1.test)('TokenManager - rotate changes token', async (t) => {
    const tokenPath = path_1.default.join('/tmp', `.test-token-${Date.now()}`);
    const manager = new auth_js_1.TokenManager(tokenPath);
    try {
        const token1 = await manager.init();
        const token2 = await manager.rotate();
        node_assert_1.default.notStrictEqual(token1, token2);
        // Old token should no longer verify
        const oldCheck = await manager.verify(token1);
        node_assert_1.default.strictEqual(oldCheck, false);
        // New token should verify
        const newCheck = await manager.verify(token2);
        node_assert_1.default.strictEqual(newCheck, true);
    }
    finally {
        await promises_1.default.unlink(tokenPath);
    }
});
(0, node_test_1.test)('TokenManager - delete removes token file', async (t) => {
    const tokenPath = path_1.default.join('/tmp', `.test-token-${Date.now()}`);
    const manager = new auth_js_1.TokenManager(tokenPath);
    await manager.init();
    const deleted = await manager.delete();
    node_assert_1.default.strictEqual(deleted, true);
    // Verify file doesn't exist
    await node_assert_1.default.rejects(async () => await promises_1.default.readFile(tokenPath, 'utf-8'), { code: 'ENOENT' });
});
(0, node_test_1.test)('authorize - validates tokens', async (t) => {
    const tokenPath = path_1.default.join('/tmp', `.test-token-${Date.now()}`);
    const manager = new auth_js_1.TokenManager(tokenPath);
    try {
        const token = await manager.init();
        const valid = await (0, auth_js_1.authorize)(token, manager);
        node_assert_1.default.strictEqual(valid, true);
        const invalid = await (0, auth_js_1.authorize)('wrong-token', manager);
        node_assert_1.default.strictEqual(invalid, false);
    }
    finally {
        await promises_1.default.unlink(tokenPath);
    }
});
//# sourceMappingURL=auth.test.js.map