#!/usr/bin/env node

/**
 * Example: Demonstrating Error Recovery and Resilience Features
 * 
 * This example shows:
 * - Retry logic with exponential backoff
 * - Circuit breaker pattern
 * - Configuration validation
 * - Token-based authentication
 */

import { Orchestrator } from '../src/core/orchestrator.js';
import { ConfigManager } from '../src/core/config-manager.js';
import { TokenManager } from '../src/utils/auth.js';
import { BaseAgent } from '../src/agents/base-agent.js';
import chalk from 'chalk';

// Example: Flaky Agent that fails sometimes
class FlakyAgent extends BaseAgent {
  constructor(name, successRate = 0.3) {
    super(name, { capabilities: ['test'] });
    this.successRate = successRate;
    this.attempts = 0;
  }

  async execute(task) {
    this.attempts++;
    
    // Simulate random failures
    if (Math.random() > this.successRate) {
      throw new Error(`Temporary failure on attempt ${this.attempts}`);
    }
    
    return {
      status: 'completed',
      message: `Task completed successfully after ${this.attempts} attempts`,
      attempts: this.attempts
    };
  }
}

async function demonstrateRetryLogic() {
  console.log(chalk.bold.cyan('\n1. Demonstrating Retry Logic with Exponential Backoff\n'));
  console.log(chalk.gray('─'.repeat(70)));
  
  const orchestrator = new Orchestrator({ retries: 5 });
  const agent = new FlakyAgent('flaky-agent', 0.4); // 40% success rate
  
  orchestrator.registerAgent('flaky-agent', agent);
  
  // Listen for retry events
  orchestrator.on('task-retry', (event) => {
    console.log(
      chalk.yellow('⚠ Retry:'),
      `Attempt ${event.attempt}, waiting ${event.delay}ms`,
      chalk.gray(`(${event.error})`)
    );
  });
  
  const task = {
    id: 'task-1',
    name: 'Flaky Task',
    description: 'Task that may fail',
    agent: 'flaky-agent',
    type: 'test'
  };
  
  console.log(chalk.blue('ℹ Starting task execution...'));
  const result = await orchestrator.executeTask(task);
  
  if (result.status === 'success') {
    console.log(chalk.green('✓ Task completed successfully!'));
    console.log(chalk.gray(`  Total attempts: ${agent.attempts}`));
    console.log(chalk.gray(`  Duration: ${result.duration}ms`));
  } else {
    console.log(chalk.red('✖ Task failed after all retries'));
    console.log(chalk.gray(`  Error: ${result.error}`));
  }
}

async function demonstrateCircuitBreaker() {
  console.log(chalk.bold.cyan('\n2. Demonstrating Circuit Breaker Pattern\n'));
  console.log(chalk.gray('─'.repeat(70)));
  
  const orchestrator = new Orchestrator({ retries: 0 }); // No retries for this demo
  const agent = new FlakyAgent('unreliable-agent', 0.1); // 10% success rate
  
  orchestrator.registerAgent('unreliable-agent', agent);
  
  const task = {
    id: 'task-2',
    name: 'Circuit Breaker Test',
    agent: 'unreliable-agent',
    type: 'test'
  };
  
  console.log(chalk.blue('ℹ Executing multiple tasks to test circuit breaker...'));
  
  for (let i = 1; i <= 8; i++) {
    const result = await orchestrator.executeTask({ ...task, id: `task-${i}` });
    const breaker = orchestrator.circuitBreakers.get('unreliable-agent');
    const state = breaker.getState();
    
    console.log(
      `  Task ${i}:`,
      result.status === 'success' ? chalk.green('✓ Success') : chalk.red('✖ Failed'),
      chalk.gray(`[Circuit: ${state.state}, Failures: ${state.failureCount}]`)
    );
    
    if (state.state === 'OPEN') {
      console.log(chalk.yellow('  ⚠ Circuit breaker opened - preventing further attempts'));
      break;
    }
  }
}

async function demonstrateConfigValidation() {
  console.log(chalk.bold.cyan('\n3. Demonstrating Configuration Validation\n'));
  console.log(chalk.gray('─'.repeat(70)));
  
  const configManager = new ConfigManager('/tmp/demo-config.json');
  
  // Valid configuration
  console.log(chalk.blue('ℹ Testing valid configuration...'));
  try {
    const validConfig = await configManager.init();
    console.log(chalk.green('✓ Valid configuration accepted'));
  } catch (error) {
    console.log(chalk.red('✖ Unexpected error:'), error.message);
  }
  
  // Invalid configuration
  console.log(chalk.blue('\nℹ Testing invalid configuration...'));
  try {
    const invalidConfig = {
      agents: {},
      mcp: { servers: {} }
      // Missing required fields: git, orchestration
    };
    await configManager.save(invalidConfig);
    console.log(chalk.red('✖ Invalid configuration was accepted (should not happen)'));
  } catch (error) {
    console.log(chalk.green('✓ Invalid configuration rejected as expected'));
    console.log(chalk.gray(`  Error: ${error.message}`));
  }
  
  // Invalid orchestration mode
  console.log(chalk.blue('\nℹ Testing invalid orchestration mode...'));
  try {
    const config = await configManager.load();
    config.orchestration.defaultMode = 'invalid-mode';
    await configManager.save(config);
    console.log(chalk.red('✖ Invalid mode was accepted (should not happen)'));
  } catch (error) {
    console.log(chalk.green('✓ Invalid mode rejected as expected'));
    console.log(chalk.gray(`  Error: ${error.message}`));
  }
}

async function demonstrateAuthentication() {
  console.log(chalk.bold.cyan('\n4. Demonstrating Token-Based Authentication\n'));
  console.log(chalk.gray('─'.repeat(70)));
  
  const tokenManager = new TokenManager('/tmp/demo.token');
  
  // Initialize token
  console.log(chalk.blue('ℹ Initializing authentication token...'));
  const token = await tokenManager.init();
  console.log(chalk.green('✓ Token generated:'), chalk.gray(token.substring(0, 16) + '...'));
  
  // Verify valid token
  console.log(chalk.blue('\nℹ Verifying valid token...'));
  const isValid = await tokenManager.verify(token);
  console.log(chalk.green('✓ Token verified:'), isValid);
  
  // Verify invalid token
  console.log(chalk.blue('\nℹ Verifying invalid token...'));
  const isInvalid = await tokenManager.verify('wrong-token');
  console.log(chalk.green('✓ Invalid token rejected:'), !isInvalid);
  
  // Rotate token
  console.log(chalk.blue('\nℹ Rotating token for security...'));
  const newToken = await tokenManager.rotate();
  console.log(chalk.green('✓ New token generated:'), chalk.gray(newToken.substring(0, 16) + '...'));
  
  // Old token should no longer work
  const oldTokenValid = await tokenManager.verify(token);
  console.log(chalk.green('✓ Old token invalidated:'), !oldTokenValid);
  
  // Cleanup
  await tokenManager.delete();
  console.log(chalk.gray('  Token file cleaned up'));
}

async function main() {
  console.log(chalk.bold.green('\n╔════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.green('║  SupaDupaCode CLI - Error Recovery & Resilience Demo          ║'));
  console.log(chalk.bold.green('╚════════════════════════════════════════════════════════════════╝'));
  
  try {
    await demonstrateRetryLogic();
    await demonstrateCircuitBreaker();
    await demonstrateConfigValidation();
    await demonstrateAuthentication();
    
    console.log(chalk.bold.green('\n✓ All demonstrations completed successfully!\n'));
  } catch (error) {
    console.error(chalk.red('\n✖ Demo failed:'), error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
