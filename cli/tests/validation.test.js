"use strict";
/**
 * Tests for Configuration Validation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const config_manager_js_1 = require("../src/core/config-manager.js");
(0, node_test_1.test)('ConfigManager - validation accepts valid config', async (t) => {
    const configPath = path_1.default.join('/tmp', `.test-config-${Date.now()}.json`);
    const manager = new config_manager_js_1.ConfigManager(configPath);
    try {
        const config = await manager.init();
        // Validation should pass on default config
        node_assert_1.default.ok(config);
        node_assert_1.default.ok(config.agents);
        node_assert_1.default.ok(config.mcp);
    }
    finally {
        await promises_1.default.unlink(configPath);
    }
});
(0, node_test_1.test)('ConfigManager - validation rejects missing required fields', async (t) => {
    const configPath = path_1.default.join('/tmp', `.test-config-${Date.now()}.json`);
    const manager = new config_manager_js_1.ConfigManager(configPath);
    try {
        const invalidConfig = {
            agents: {},
            // Missing mcp, git, orchestration
        };
        await node_assert_1.default.rejects(async () => await manager.save(invalidConfig), {
            message: /Configuration validation failed/
        });
    }
    finally {
        try {
            await promises_1.default.unlink(configPath);
        }
        catch (err) {
            // Ignore
        }
    }
});
(0, node_test_1.test)('ConfigManager - validation rejects invalid agent config', async (t) => {
    const configPath = path_1.default.join('/tmp', `.test-config-${Date.now()}.json`);
    const manager = new config_manager_js_1.ConfigManager(configPath);
    try {
        const config = await manager.init();
        // Add invalid agent (missing required mcp_tools)
        config.agents.invalid = {
            enabled: true,
            role: 'test'
            // Missing mcp_tools
        };
        await node_assert_1.default.rejects(async () => await manager.save(config), {
            message: /Configuration validation failed/
        });
    }
    finally {
        await promises_1.default.unlink(configPath);
    }
});
(0, node_test_1.test)('ConfigManager - validation rejects invalid orchestration mode', async (t) => {
    const configPath = path_1.default.join('/tmp', `.test-config-${Date.now()}.json`);
    const manager = new config_manager_js_1.ConfigManager(configPath);
    try {
        const config = await manager.init();
        config.orchestration.defaultMode = 'invalid-mode';
        await node_assert_1.default.rejects(async () => await manager.save(config), {
            message: /Configuration validation failed/
        });
    }
    finally {
        await promises_1.default.unlink(configPath);
    }
});
(0, node_test_1.test)('ConfigManager - validation accepts valid orchestration modes', async (t) => {
    const configPath = path_1.default.join('/tmp', `.test-config-${Date.now()}.json`);
    const manager = new config_manager_js_1.ConfigManager(configPath);
    try {
        const modes = ['sequential', 'concurrent', 'handoff'];
        for (const mode of modes) {
            const config = await manager.init();
            config.orchestration.defaultMode = mode;
            // Should not throw
            await manager.save(config);
        }
    }
    finally {
        await promises_1.default.unlink(configPath);
    }
});
(0, node_test_1.test)('ConfigManager - validation rejects invalid retry count', async (t) => {
    const configPath = path_1.default.join('/tmp', `.test-config-${Date.now()}.json`);
    const manager = new config_manager_js_1.ConfigManager(configPath);
    try {
        const config = await manager.init();
        config.orchestration.retries = 100; // Exceeds maximum of 10
        await node_assert_1.default.rejects(async () => await manager.save(config), {
            message: /Configuration validation failed/
        });
    }
    finally {
        await promises_1.default.unlink(configPath);
    }
});
(0, node_test_1.test)('ConfigManager - load validates configuration', async (t) => {
    const configPath = path_1.default.join('/tmp', `.test-config-${Date.now()}.json`);
    try {
        // Write invalid config directly to file
        const invalidConfig = {
            agents: {},
            mcp: { servers: {} }
            // Missing git and orchestration
        };
        await promises_1.default.writeFile(configPath, JSON.stringify(invalidConfig, null, 2));
        const manager = new config_manager_js_1.ConfigManager(configPath);
        await node_assert_1.default.rejects(async () => await manager.load(), {
            message: /Configuration validation failed/
        });
    }
    finally {
        await promises_1.default.unlink(configPath);
    }
});
//# sourceMappingURL=validation.test.js.map