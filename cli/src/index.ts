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

import { providerCommand } from './commands/provider.js';
import { createChatCommand } from './commands/chat.js';
import { createSetupCommand } from './commands/setup.js';
import { createSDCommand } from './commands/sd.js';

interface CommandOptions {
  feature?: string;
  plan?: string;
  mode?: string;
  verbose?: boolean;
  output?: string;
  all?: boolean;
  watch?: boolean;
  pr?: string;
  autoApprove?: boolean;
  check?: string;
  autoCommit?: boolean;
  key?: string;
  model?: string;
  endpoint?: string;
  setActive?: boolean;
  type?: string;
  memorySize?: number;
  status?: string;
  backend?: string;
  agent?: string;
  file?: string;
  quota?: number;
  format?: string;
  interval?: number;
  parallel?: boolean;
  errorStrategy?: string;
  description?: string;
}

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
  .action((description: string, options: CommandOptions) => planCommand(description, options));

// Run command - execute planned feature development
program
  .command('run')
  .description('Execute feature development with AI agents')
  .option('-f, --feature <name>', 'Feature name/identifier')
  .option('-p, --plan <file>', 'Plan file to execute')
  .option('-m, --mode <mode>', 'Execution mode (sequential, concurrent, handoff)', 'sequential')
  .action((options: CommandOptions) => runCommand(options));

// Status command - monitor feature progress
program
  .command('status')
  .description('Check status of feature development')
  .option('-f, --feature <name>', 'Feature name/identifier')
  .option('-a, --all', 'Show all features')
  .option('-w, --watch', 'Watch mode - continuous updates')
  .action((options: CommandOptions) => statusCommand(options));

// Review command - review PRs
program
  .command('review')
  .description('Review pull request')
  .option('--pr <number>', 'Pull request number')
  .option('--auto-approve', 'Automatically approve if checks pass')
  .action((options: CommandOptions) => reviewCommand(options));

// Fix command - automated fixes for failing checks
program
  .command('fix')
  .description('Fix issues in pull request')
  .option('--pr <number>', 'Pull request number')
  .option('--check <name>', 'Specific check to fix')
  .option('--auto-commit', 'Automatically commit fixes')
  .action((options: CommandOptions) => fixCommand(options));

// Config command - manage configuration
program
  .command('config')
  .description('Manage CLI configuration')
  .argument('[action]', 'Action: init, show, set, reset')
  .argument('[key]', 'Configuration key')
  .argument('[value]', 'Configuration value')
  .action((action?: string, key?: string, value?: string) => configCommand(action, key, value));

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
  .action((action?: string, name?: string, options: CommandOptions = {}) => providerCommand(action, name, options));

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
  .action((action?: string, name?: string, options: CommandOptions = {}) => agentCommand(action, name, options));

// Memory command - manage persistent memory
program
  .command('memory')
  .description('Manage persistent memory and context')
  .argument('[action]', 'Action: init, context, optimize', 'init')
  .argument('[subAction]', 'Sub-action for context (show, clear, backup)')
  .option('--backend <backend>', 'Memory backend (filesystem, redis, postgres)')
  .option('--agent <id>', 'Agent ID')
  .option('--file <path>', 'Backup file path')
  .action((action?: string, subAction?: string, options: CommandOptions = {}) => memoryCommand(action, subAction, options));

// API command - manage API integrations
program
  .command('api')
  .description('Manage API integrations')
  .argument('[action]', 'Action: register, status', 'status')
  .argument('[provider]', 'Provider name')
  .option('--key <key>', 'API key')
  .option('--endpoint <url>', 'API endpoint URL')
  .option('--quota <rpm>', 'Requests per minute quota')
  .action((action?: string, provider?: string, options: CommandOptions = {}) => apiCommand(action, provider, options));

// Auth command - manage authentication
program
  .command('auth')
  .description('Manage API authentication')
  .argument('[action]', 'Action: configure, verify', 'configure')
  .argument('[provider]', 'Provider name')
  .action((action?: string, provider?: string, options: CommandOptions = {}) => authCommand(action, provider, options));

// Workflow command - manage workflows
program
  .command('workflow')
  .description('Manage multi-agent workflows')
  .argument('[action]', 'Action: create, run, status, logs, list', 'list')
  .argument('[workflowId]', 'Workflow ID')
  .option('--description <desc>', 'Workflow description')
  .option('--parallel', 'Enable parallel execution')
  .option('--error-strategy <strategy>', 'Error handling strategy')
  .action((action?: string, workflowId?: string, options: CommandOptions = {}) => workflowCommand(action, workflowId, options));

// Chat command - interactive conversational mode
program.addCommand(createChatCommand());

// Setup command - interactive setup wizard
program.addCommand(createSetupCommand());

// SD command - simplified interface (can also be run as root command)
program.addCommand(createSDCommand());

// Error handling
program.configureOutput({
  outputError: (str: string, write: (str: string) => void) => write(chalk.red(str))
});

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
