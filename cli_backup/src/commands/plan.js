/**
 * Plan Command - decompose and plan feature implementation
 */

import chalk from 'chalk';
import ora from 'ora';
import { Orchestrator } from '../core/orchestrator.js';
import { ConfigManager } from '../core/config-manager.js';
import { logger } from '../utils/logger.js';

export async function planCommand(description, options) {
  const spinner = ora('Analyzing feature description...').start();
  
  try {
    // Load configuration
    const configManager = new ConfigManager();
    const config = await configManager.load();

    // Initialize orchestrator
    const orchestrator = new Orchestrator(config.orchestration);

    spinner.text = 'Creating execution plan...';

    // Create plan
    const plan = await orchestrator.createPlan(description, {
      mode: config.orchestration.defaultMode
    });

    spinner.succeed('Plan created successfully!');

    // Display plan
    console.log('\n' + chalk.bold.cyan('Feature Plan'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.bold('Description:'), description);
    console.log(chalk.bold('Plan ID:'), plan.id);
    console.log(chalk.bold('Orchestration:'), plan.orchestrationPattern);
    console.log(chalk.bold('Created:'), new Date(plan.createdAt).toLocaleString());
    
    console.log('\n' + chalk.bold.cyan('Tasks'));
    console.log(chalk.gray('─'.repeat(50)));
    
    for (const task of plan.tasks) {
      console.log(chalk.yellow('●'), chalk.bold(task.name));
      console.log('  ', chalk.gray('Agent:'), task.agent);
      console.log('  ', chalk.gray('Type:'), task.type);
      console.log('  ', chalk.gray('Description:'), task.description);
      
      if (task.dependencies.length > 0) {
        console.log('  ', chalk.gray('Dependencies:'), task.dependencies.join(', '));
      }
      console.log();
    }

    // Output as JSON if requested
    if (options.output === 'json') {
      console.log('\n' + chalk.bold.cyan('JSON Output'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(JSON.stringify(plan, null, 2));
    }

    // Save plan to file
    const fs = await import('fs/promises');
    const planFile = `plan-${plan.id}.json`;
    await fs.writeFile(planFile, JSON.stringify(plan, null, 2));
    
    console.log(chalk.green('✓'), `Plan saved to ${planFile}`);
    console.log(chalk.blue('ℹ'), `Run with: ${chalk.bold(`supadupacode run --plan ${planFile}`)}`);

    logger.info('Plan created', { planId: plan.id, tasks: plan.tasks.length });

  } catch (error) {
    spinner.fail('Failed to create plan');
    logger.error('Plan creation failed', { error: error.message });
    console.error(chalk.red('\nError:'), error.message);
    process.exit(1);
  }
}
