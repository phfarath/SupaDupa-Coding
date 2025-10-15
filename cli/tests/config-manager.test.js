"use strict";
/**
 * Tests for ConfigManager
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const config_manager_js_1 = require("../src/core/config-manager.js");
const promises_1 = __importDefault(require("fs/promises"));
(0, node_test_1.test)('ConfigManager - init creates default config', async (t) => {
    const tempPath = `/tmp/test-config-${Date.now()}.json`;
    const configManager = new config_manager_js_1.ConfigManager(tempPath);
    const config = await configManager.init();
    node_assert_1.default.ok(config.agents, 'Config should have agents');
    node_assert_1.default.ok(config.mcp, 'Config should have mcp');
    node_assert_1.default.ok(config.git, 'Config should have git settings');
    node_assert_1.default.ok(config.orchestration, 'Config should have orchestration settings');
    // Cleanup
    await promises_1.default.unlink(tempPath).catch(() => { });
});
(0, node_test_1.test)('ConfigManager - get configuration value', async (t) => {
    const tempPath = `/tmp/test-config-${Date.now()}.json`;
    const configManager = new config_manager_js_1.ConfigManager(tempPath);
    await configManager.init();
    const value = await configManager.get('orchestration.defaultMode');
    node_assert_1.default.strictEqual(value, 'sequential', 'Should get correct config value');
    // Cleanup
    await promises_1.default.unlink(tempPath).catch(() => { });
});
(0, node_test_1.test)('ConfigManager - set configuration value', async (t) => {
    const tempPath = `/tmp/test-config-${Date.now()}.json`;
    const configManager = new config_manager_js_1.ConfigManager(tempPath);
    await configManager.init();
    await configManager.set('orchestration.defaultMode', 'concurrent');
    const value = await configManager.get('orchestration.defaultMode');
    node_assert_1.default.strictEqual(value, 'concurrent', 'Should update config value');
    // Cleanup
    await promises_1.default.unlink(tempPath).catch(() => { });
});
(0, node_test_1.test)('ConfigManager - show returns full config', async (t) => {
    const tempPath = `/tmp/test-config-${Date.now()}.json`;
    const configManager = new config_manager_js_1.ConfigManager(tempPath);
    await configManager.init();
    const config = await configManager.show();
    node_assert_1.default.ok(typeof config === 'object', 'Should return config object');
    node_assert_1.default.ok(config.agents, 'Config should have agents');
    // Cleanup
    await promises_1.default.unlink(tempPath).catch(() => { });
});
//# sourceMappingURL=config-manager.test.js.map