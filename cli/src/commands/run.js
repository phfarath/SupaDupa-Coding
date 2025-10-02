/**
 * Run Command - execute feature development with AI agents
 */

import chalk from 'chalk';
import ora from 'ora';
import { Orchestrator } from '../core/orchestrator.js';
import { ConfigManager } from '../core/config-manager.js';
import { BranchManager } from '../git/branch-manager.js';
import { logger } from '../utils/logger.js';
import { metrics } from '../utils/metrics.js';
import fs from 'fs/promises';

export async function runCommand(options) {
  const spinner = ora('Initializing execution...').start();
  
  try {
    // Validate options
    if (!options.feature && !options.plan) {
      throw new Error('Either --feature or --plan must be specified');
    }

    // Load configuration
    const configManager = new ConfigManager();
    const config = await configManager.load();

    // Initialize orchestrator
    const orchestrator = new Orchestrator(config.orchestration);
    const branchManager = new BranchManager(config.git);

    let plan;

    if (options.plan) {
      // Load plan from file
      spinner.text = 'Loading plan...';
      const planData = await fs.readFile(options.plan, 'utf-8');
      plan = JSON.parse(planData);
    } else {
      // Create simple plan from feature name
      spinner.text = 'Creating plan...';
      plan = await orchestrator.createPlan(options.feature);
    }

    spinner.succeed(`Plan loaded: ${plan.id}`);

    // Display execution info
    console.log('\n' + chalk.bold.cyan('Execution Configuration'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.bold('Feature:'), options.feature || plan.description);
    console.log(chalk.bold('Mode:'), options.mode || plan.orchestrationPattern);
    console.log(chalk.bold('Tasks:'), plan.tasks.length);
    console.log();

    // Create branch for execution
    const currentBranch = branchManager.getCurrentBranch();
    console.log(chalk.blue('ℹ'), `Current branch: ${currentBranch}`);

    // Execute plan
    spinner.start('Executing tasks...');
    
    // Set up event listeners for progress updates
    orchestrator.on('task-started', (task) => {
      spinner.text = `Executing: ${task.name} (${task.agent})`;
    });

    orchestrator.on('task-completed', ({ task, result }) => {
      if (result.status === 'success') {
        console.log(chalk.green('✓'), task.name, chalk.gray(`(${result.duration}ms)`));
      } else {
        console.log(chalk.red('✖'), task.name, chalk.gray(result.error));
      }
    });

    // Execute the plan
    const execution = await orchestrator.executePlan(plan, {
      mode: options.mode || plan.orchestrationPattern
    });

    spinner.succeed('Execution completed!');

    // Display results
    console.log('\n' + chalk.bold.cyan('Execution Results'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.bold('Status:'), 
      execution.status === 'completed' 
        ? chalk.green(execution.status) 
        : chalk.red(execution.status)
    );
    console.log(chalk.bold('Duration:'), 
      new Date(execution.completedAt) - new Date(execution.startedAt), 'ms'
    );
    console.log(chalk.bold('Tasks Completed:'), execution.results.length);
    
    const successful = execution.results.filter(r => r.status === 'success').length;
    const failed = execution.results.filter(r => r.status === 'failed').length;
    
    console.log(chalk.bold('Success Rate:'), 
      `${successful}/${execution.results.length}`,
      chalk.gray(`(${((successful/execution.results.length)*100).toFixed(1)}%)`)
    );

    if (failed > 0) {
      console.log(chalk.bold('Failed Tasks:'), failed);
    }

    // Record metrics
    metrics.recordExecution(execution);

    logger.info('Execution completed', { 
      planId: plan.id, 
      status: execution.status,
      results: execution.results.length 
    });

  } catch (error) {
    spinner.fail('Execution failed');
    logger.error('Execution failed', { error: error.message });
    console.error(chalk.red('\nError:'), error.message);
    process.exit(1);
  }
}
