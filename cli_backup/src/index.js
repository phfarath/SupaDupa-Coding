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
import { memoryCommand } from './commands/memory.js';
import { apiCommand, authCommand } from './commands/api.js';
import { workflowCommand } from './commands/workflow.js';
import { metricsCommand, logsCommand, alertCommand } from './commands/monitoring.js';
import { debugCommand, healthCommand } from './commands/debug.js';
import { envCommand, deployCommand, rollbackCommand, versionCommand, validateCommand } from './commands/environment.js';
import { providerCommand } from './commands/provider.js';

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

// Provider command - manage API providers
program
  .command('provider')
  .description('Manage API providers (add, list, switch, remove, show, update)')
  .argument('[action]', 'Action: add, list, switch, remove, show, update', 'list')
  .argument('[name]', 'Provider name')
  .option('-k, --key <key>', 'API key')
  .option('-m, --model <model>', 'Model name (e.g., gpt-4, claude-3)')
  .option('-e, --endpoint <url>', 'API endpoint URL')
  .option('--set-active', 'Set as active provider')
  .action(providerCommand);

// Agent command - manage agents
program
  .command('agent')
  .description('Manage agents (list, info, create, start, stop, restart, delete)')
  .argument('[action]', 'Action: list, info, create, start, stop, restart, delete', 'list')
  .argument('[name]', 'Agent name')
  .option('--type <type>', 'Agent type (assistant, researcher, coordinator)')
  .option('--model <model>', 'Language model (gpt-4, claude, local)')
  .option('--memory-size <size>', 'Memory size in tokens')
  .option('--status <status>', 'Filter by status')
  .option('-v, --verbose', 'Verbose output')
  .action(agentCommand);

// Memory command - manage persistent memory
program
  .command('memory')
  .description('Manage persistent memory and context')
  .argument('[action]', 'Action: init, context, optimize', 'init')
  .argument('[subAction]', 'Sub-action for context (show, clear, backup)')
  .option('--backend <backend>', 'Memory backend (filesystem, redis, postgres)')
  .option('--agent <id>', 'Agent ID')
  .option('--file <path>', 'Backup file path')
  .action(memoryCommand);

// API command - manage API integrations
program
  .command('api')
  .description('Manage API integrations')
  .argument('[action]', 'Action: register, status', 'status')
  .argument('[provider]', 'Provider name')
  .option('--key <key>', 'API key')
  .option('--endpoint <url>', 'API endpoint URL')
  .option('--quota <rpm>', 'Requests per minute quota')
  .action(apiCommand);

// Auth command - manage authentication
program
  .command('auth')
  .description('Manage API authentication')
  .argument('[action]', 'Action: configure, verify', 'configure')
  .argument('[provider]', 'Provider name')
  .action(authCommand);

// Workflow command - manage workflows
program
  .command('workflow')
  .description('Manage multi-agent workflows')
  .argument('[action]', 'Action: create, run, status, logs, list', 'list')
  .argument('[workflowId]', 'Workflow ID')
  .option('--description <desc>', 'Workflow description')
  .option('--parallel', 'Enable parallel execution')
  .option('--error-strategy <strategy>', 'Error handling strategy')
  .action(workflowCommand);

// Metrics command - collect and view metrics
program
  .command('metrics')
  .description('Collect and view system metrics')
  .argument('[action]', 'Action: collect, show', 'collect')
  .option('--format <format>', 'Output format (json, prometheus)')
  .option('--interval <seconds>', 'Collection interval')
  .action(metricsCommand);

// Logs command - query and export logs
program
  .command('logs')
  .description('Query and export logs')
  .argument('[action]', 'Action: query, export', 'query')
  .option('--agent <name>', 'Filter by agent')
  .option('--severity <level>', 'Filter by severity (info, warn, error)')
  .option('--since <time>', 'Filter by time')
  .option('--format <format>', 'Export format')
  .option('--output <file>', 'Output file')
  .action(logsCommand);

// Alert command - configure alerts
program
  .command('alert')
  .description('Configure monitoring alerts')
  .argument('[action]', 'Action: configure, list', 'list')
  .argument('[name]', 'Alert name')
  .option('--metric <metric>', 'Metric to monitor')
  .option('--threshold <value>', 'Alert threshold')
  .option('--channel <channel>', 'Notification channel')
  .action(alertCommand);

// Debug command - debugging and diagnostics
program
  .command('debug')
  .description('Debug and trace system operations')
  .argument('[action]', 'Action: trace, inspect', 'trace')
  .option('--agent <name>', 'Agent to trace')
  .option('--duration <seconds>', 'Trace duration')
  .option('--component <name>', 'Component to inspect')
  .action(debugCommand);

// Health command - system health check
program
  .command('health')
  .description('Perform system health check')
  .action(healthCommand);

// Env command - environment management
program
  .command('env')
  .description('Manage execution environments')
  .argument('[action]', 'Action: setup, list', 'setup')
  .option('--env <environment>', 'Environment name (development, staging, production)')
  .action(envCommand);

// Deploy command - deploy application
program
  .command('deploy')
  .description('Deploy application to environment')
  .option('--env <environment>', 'Target environment')
  .option('--incremental', 'Incremental deployment')
  .action(deployCommand);

// Rollback command - rollback deployment
program
  .command('rollback')
  .description('Rollback to previous version')
  .option('--version <version>', 'Version to rollback to')
  .action(rollbackCommand);

// Version command - show version information
program
  .command('version')
  .description('Show version information')
  .option('--action <action>', 'Action: show, list')
  .action(versionCommand);

// Validate command - validate configuration
program
  .command('validate')
  .description('Validate system configuration')
  .action(validateCommand);

// Error handling
program.configureOutput({
  outputError: (str, write) => write(chalk.red(str))
});

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
