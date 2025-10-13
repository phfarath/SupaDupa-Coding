/**
 * Tests for Retry and Circuit Breaker functionality
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { retryWithBackoff, CircuitBreaker } from '../src/utils/retry.js';

test('retryWithBackoff - succeeds on first attempt', async (t) => {
  let attempts = 0;
  
  const result = await retryWithBackoff(async () => {
    attempts++;
    return 'success';
  }, { maxRetries: 3 });
  
  assert.strictEqual(result, 'success');
  assert.strictEqual(attempts, 1);
});

test('retryWithBackoff - retries on failure then succeeds', async (t) => {
  let attempts = 0;
  
  const result = await retryWithBackoff(async () => {
    attempts++;
    if (attempts < 3) {
      throw new Error('Temporary failure');
    }
    return 'success';
  }, { maxRetries: 3, initialDelay: 10 });
  
  assert.strictEqual(result, 'success');
  assert.strictEqual(attempts, 3);
});

test('retryWithBackoff - fails after max retries', async (t) => {
  let attempts = 0;
  
  await assert.rejects(
    async () => {
      await retryWithBackoff(async () => {
        attempts++;
        throw new Error('Permanent failure');
      }, { maxRetries: 2, initialDelay: 10 });
    },
    {
      message: 'Permanent failure'
    }
  );
  
  assert.strictEqual(attempts, 3); // Initial attempt + 2 retries
});

test('retryWithBackoff - calls onRetry callback', async (t) => {
  let retryCallbacks = 0;
  
  await retryWithBackoff(async () => {
    if (retryCallbacks === 0) {
      throw new Error('First failure');
    }
    return 'success';
  }, {
    maxRetries: 2,
    initialDelay: 10,
    onRetry: (error, attempt, delay) => {
      retryCallbacks++;
      assert.strictEqual(error.message, 'First failure');
      assert.ok(attempt > 0);
      assert.ok(delay > 0);
    }
  });
  
  assert.strictEqual(retryCallbacks, 1);
});

test('CircuitBreaker - starts in CLOSED state', (t) => {
  const breaker = new CircuitBreaker();
  const state = breaker.getState();
  
  assert.strictEqual(state.state, 'CLOSED');
  assert.strictEqual(state.failureCount, 0);
});

test('CircuitBreaker - opens after threshold failures', async (t) => {
  const breaker = new CircuitBreaker({ failureThreshold: 3 });
  
  // Trigger failures
  for (let i = 0; i < 3; i++) {
    try {
      await breaker.execute(async () => {
        throw new Error('Failure');
      });
    } catch (err) {
      // Expected
    }
  }
  
  const state = breaker.getState();
  assert.strictEqual(state.state, 'OPEN');
  assert.strictEqual(state.failureCount, 3);
});

test('CircuitBreaker - rejects when OPEN', async (t) => {
  const breaker = new CircuitBreaker({ failureThreshold: 2 });
  
  // Open the circuit
  for (let i = 0; i < 2; i++) {
    try {
      await breaker.execute(async () => {
        throw new Error('Failure');
      });
    } catch (err) {
      // Expected
    }
  }
  
  // Circuit should be open now
  await assert.rejects(
    async () => {
      await breaker.execute(async () => 'success');
    },
    {
      message: 'Circuit breaker is OPEN'
    }
  );
});

test('CircuitBreaker - resets failure count on success', async (t) => {
  const breaker = new CircuitBreaker({ failureThreshold: 5 });
  
  // One failure
  try {
    await breaker.execute(async () => {
      throw new Error('Failure');
    });
  } catch (err) {
    // Expected
  }
  
  let state = breaker.getState();
  assert.strictEqual(state.failureCount, 1);
  
  // Success
  await breaker.execute(async () => 'success');
  
  state = breaker.getState();
  assert.strictEqual(state.failureCount, 0);
  assert.strictEqual(state.state, 'CLOSED');
});

test('CircuitBreaker - reset method works', async (t) => {
  const breaker = new CircuitBreaker({ failureThreshold: 2 });
  
  // Open the circuit
  for (let i = 0; i < 2; i++) {
    try {
      await breaker.execute(async () => {
        throw new Error('Failure');
      });
    } catch (err) {
      // Expected
    }
  }
  
  assert.strictEqual(breaker.getState().state, 'OPEN');
  
  // Reset
  breaker.reset();
  
  const state = breaker.getState();
  assert.strictEqual(state.state, 'CLOSED');
  assert.strictEqual(state.failureCount, 0);
});
