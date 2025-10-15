"use strict";
/**
 * Tests for Retry and Circuit Breaker functionality
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const retry_js_1 = require("../src/utils/retry.js");
(0, node_test_1.test)('retryWithBackoff - succeeds on first attempt', async (t) => {
    let attempts = 0;
    const result = await (0, retry_js_1.retryWithBackoff)(async () => {
        attempts++;
        return 'success';
    }, { maxRetries: 3 });
    node_assert_1.default.strictEqual(result, 'success');
    node_assert_1.default.strictEqual(attempts, 1);
});
(0, node_test_1.test)('retryWithBackoff - retries on failure then succeeds', async (t) => {
    let attempts = 0;
    const result = await (0, retry_js_1.retryWithBackoff)(async () => {
        attempts++;
        if (attempts < 3) {
            throw new Error('Temporary failure');
        }
        return 'success';
    }, { maxRetries: 3, initialDelay: 10 });
    node_assert_1.default.strictEqual(result, 'success');
    node_assert_1.default.strictEqual(attempts, 3);
});
(0, node_test_1.test)('retryWithBackoff - fails after max retries', async (t) => {
    let attempts = 0;
    await node_assert_1.default.rejects(async () => {
        await (0, retry_js_1.retryWithBackoff)(async () => {
            attempts++;
            throw new Error('Permanent failure');
        }, { maxRetries: 2, initialDelay: 10 });
    }, {
        message: 'Permanent failure'
    });
    node_assert_1.default.strictEqual(attempts, 3); // Initial attempt + 2 retries
});
(0, node_test_1.test)('retryWithBackoff - calls onRetry callback', async (t) => {
    let retryCallbacks = 0;
    await (0, retry_js_1.retryWithBackoff)(async () => {
        if (retryCallbacks === 0) {
            throw new Error('First failure');
        }
        return 'success';
    }, {
        maxRetries: 2,
        initialDelay: 10,
        onRetry: (error, attempt, delay) => {
            retryCallbacks++;
            node_assert_1.default.strictEqual(error.message, 'First failure');
            node_assert_1.default.ok(attempt > 0);
            node_assert_1.default.ok(delay > 0);
        }
    });
    node_assert_1.default.strictEqual(retryCallbacks, 1);
});
(0, node_test_1.test)('CircuitBreaker - starts in CLOSED state', (t) => {
    const breaker = new retry_js_1.CircuitBreaker();
    const state = breaker.getState();
    node_assert_1.default.strictEqual(state.state, 'CLOSED');
    node_assert_1.default.strictEqual(state.failureCount, 0);
});
(0, node_test_1.test)('CircuitBreaker - opens after threshold failures', async (t) => {
    const breaker = new retry_js_1.CircuitBreaker({ failureThreshold: 3 });
    // Trigger failures
    for (let i = 0; i < 3; i++) {
        try {
            await breaker.execute(async () => {
                throw new Error('Failure');
            });
        }
        catch (err) {
            // Expected
        }
    }
    const state = breaker.getState();
    node_assert_1.default.strictEqual(state.state, 'OPEN');
    node_assert_1.default.strictEqual(state.failureCount, 3);
});
(0, node_test_1.test)('CircuitBreaker - rejects when OPEN', async (t) => {
    const breaker = new retry_js_1.CircuitBreaker({ failureThreshold: 2 });
    // Open the circuit
    for (let i = 0; i < 2; i++) {
        try {
            await breaker.execute(async () => {
                throw new Error('Failure');
            });
        }
        catch (err) {
            // Expected
        }
    }
    // Circuit should be open now
    await node_assert_1.default.rejects(async () => {
        await breaker.execute(async () => 'success');
    }, {
        message: 'Circuit breaker is OPEN'
    });
});
(0, node_test_1.test)('CircuitBreaker - resets failure count on success', async (t) => {
    const breaker = new retry_js_1.CircuitBreaker({ failureThreshold: 5 });
    // One failure
    try {
        await breaker.execute(async () => {
            throw new Error('Failure');
        });
    }
    catch (err) {
        // Expected
    }
    let state = breaker.getState();
    node_assert_1.default.strictEqual(state.failureCount, 1);
    // Success
    await breaker.execute(async () => 'success');
    state = breaker.getState();
    node_assert_1.default.strictEqual(state.failureCount, 0);
    node_assert_1.default.strictEqual(state.state, 'CLOSED');
});
(0, node_test_1.test)('CircuitBreaker - reset method works', async (t) => {
    const breaker = new retry_js_1.CircuitBreaker({ failureThreshold: 2 });
    // Open the circuit
    for (let i = 0; i < 2; i++) {
        try {
            await breaker.execute(async () => {
                throw new Error('Failure');
            });
        }
        catch (err) {
            // Expected
        }
    }
    node_assert_1.default.strictEqual(breaker.getState().state, 'OPEN');
    // Reset
    breaker.reset();
    const state = breaker.getState();
    node_assert_1.default.strictEqual(state.state, 'CLOSED');
    node_assert_1.default.strictEqual(state.failureCount, 0);
});
//# sourceMappingURL=retry.test.js.map