/**
 * Plan Command - decompose and plan feature implementation
 */

import chalk from 'chalk';
import ora from 'ora';
import { Orchestrator } from '../core/orchestrator';
import { ConfigManager } from '../core/config-manager';
import { logger } from '../utils/logger';

interface PlanCommandOptions {
  output?: string;
  [key: string]: any;
}

interface PlanTask {
  name: string;
  agent: string;
  type: string;
  description: string;
  dependencies: string[];
}

interface Plan {
  id: string;
  description: string;
  orchestrationPattern: string;
  createdAt: string;
  tasks: PlanTask[];
}

import { SessionManager } from '../core/session-manager';
import { BrainAgent } from '../agents/brain-agent';
import { ProgressUI } from '../ui/progress-ui';

export async function planCommand(description: string, options: PlanCommandOptions) {
  const spinner = ora('Initializing planner...').start();

  try {
    // Initialize session
    const sessionManager = new SessionManager({
      workspacePath: process.cwd(),
      autoApprove: true // For planning we just want the plan
    });
    await sessionManager.initialize();

    // Initialize Brain Agent
    const brainAgent = new BrainAgent({
      name: 'brain',
      sessionManager,
      activeAgents: ['planner', 'developer', 'qa']
    });
    await brainAgent.initialize();

    spinner.text = 'Analyzing requirements with AI...';

    // Create a progress UI that won't interfere too much with CLI output
    const progressUI = new ProgressUI();

    // Stop local spinner to let BrainAgent handle the UI
    spinner.stop();

    // Process the request
    const response = await brainAgent.processPrompt(description, progressUI);

    if (response.type !== 'task' || !response.strategy) {
      spinner.fail('Failed to generate a valid plan');
      if (response.message) console.log(chalk.yellow(response.message));
      return;
    }

    const strategy = response.strategy;

    // Convert to Plan format
    const plan: Plan = {
      id: `plan-${Date.now()}`,
      description: strategy.description,
      orchestrationPattern: strategy.mode,
      createdAt: new Date().toISOString(),
      tasks: strategy.steps.map(step => ({
        name: step.id,
        agent: step.agent,
        type: 'task',
        description: step.task,
        dependencies: step.dependencies
      }))
    };

    spinner.succeed('Plan created successfully!');

    // Display plan
    console.log('\n' + chalk.bold.cyan('Feature Plan'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.bold('Description:'), plan.description);
    console.log(chalk.bold('Plan ID:'), plan.id);
    console.log(chalk.bold('Orchestration:'), plan.orchestrationPattern);
    console.log(chalk.bold('Created:'), new Date(plan.createdAt).toLocaleString());

    console.log('\n' + chalk.bold.cyan('Tasks'));
    console.log(chalk.gray('─'.repeat(50)));

    for (const task of plan.tasks) {
      console.log(chalk.yellow('●'), chalk.bold(task.name));
      console.log('  ', chalk.gray('Agent:'), task.agent);
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

  } catch (error: any) {
    spinner.fail('Failed to create plan');
    logger.error('Plan creation failed', { error: error.message });
    console.error(chalk.red('\nError:'), error.message);
    process.exit(1);
  }
}