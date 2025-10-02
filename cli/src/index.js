#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { planCommand } from './commands/plan.js';
import { runCommand } from './commands/run.js';
import { statusCommand } from './commands/status.js';
import { reviewCommand } from './commands/review.js';
import { fixCommand } from './commands/fix.js';
import { configCommand } from './commands/config.js';
import { agentCommand } from './commands/agent.js';

const program = new Command();

program
  .name('supadupacode')
  .description('CLI Orchestrator for multi-agent development automation')
  .version('1.0.0');

// Plan command - decompose and plan feature implementation
program
  .command('plan')
  .description('Plan and decompose a feature into tasks')
  .argument('<description>', 'Feature description')
  .option('-v, --verbose', 'Verbose output')
  .option('-o, --output <format>', 'Output format (json, text)', 'text')
  .action(planCommand);

// Run command - execute planned feature development
program
  .command('run')
  .description('Execute feature development with AI agents')
  .option('-f, --feature <name>', 'Feature name/identifier')
  .option('-p, --plan <file>', 'Plan file to execute')
  .option('-m, --mode <mode>', 'Execution mode (sequential, concurrent, handoff)', 'sequential')
  .action(runCommand);

// Status command - monitor feature progress
program
  .command('status')
  .description('Check status of feature development')
  .option('-f, --feature <name>', 'Feature name/identifier')
  .option('-a, --all', 'Show all features')
  .option('-w, --watch', 'Watch mode - continuous updates')
  .action(statusCommand);

// Review command - review PRs
program
  .command('review')
  .description('Review pull request')
  .option('--pr <number>', 'Pull request number')
  .option('--auto-approve', 'Automatically approve if checks pass')
  .action(reviewCommand);

// Fix command - automated fixes for failing checks
program
  .command('fix')
  .description('Fix issues in pull request')
  .option('--pr <number>', 'Pull request number')
  .option('--check <name>', 'Specific check to fix')
  .option('--auto-commit', 'Automatically commit fixes')
  .action(fixCommand);

// Config command - manage configuration
program
  .command('config')
  .description('Manage CLI configuration')
  .argument('[action]', 'Action: init, show, set, reset')
  .argument('[key]', 'Configuration key')
  .argument('[value]', 'Configuration value')
  .action(configCommand);

// Agent command - manage agents
program
  .command('agent')
  .description('Manage agents (list, info)')
  .argument('[action]', 'Action: list, info', 'list')
  .argument('[name]', 'Agent name (for info action)')
  .action(agentCommand);

// Error handling
program.configureOutput({
  outputError: (str, write) => write(chalk.red(str))
});

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
