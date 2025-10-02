/**
 * Agent Command - manage agents (list, register, info)
 */

import chalk from 'chalk';
import { Orchestrator } from '../core/orchestrator.js';
import { ConfigManager } from '../core/config-manager.js';
import { createDefaultAgents } from '../agents/index.js';
import { logger } from '../utils/logger.js';

export async function agentCommand(action = 'list', name, options = {}) {
  try {
    // Load configuration
    const configManager = new ConfigManager();
    const config = await configManager.load();

    // Initialize orchestrator
    const orchestrator = new Orchestrator(config.orchestration);

    // Register default agents
    const defaultAgents = createDefaultAgents(config);
    for (const [agentName, agent] of defaultAgents) {
      orchestrator.registerAgent(agentName, agent);
    }

    switch (action) {
      case 'list':
        listAgents(orchestrator);
        break;
      
      case 'info':
        if (!name) {
          console.error(chalk.red('Error: Agent name is required for info action'));
          console.log(chalk.gray('Usage: agent info <name>'));
          process.exit(1);
        }
        showAgentInfo(orchestrator, name);
        break;
      
      default:
        listAgents(orchestrator);
        break;
    }

    logger.info('Agent command executed', { action, name });

  } catch (error) {
    logger.error('Agent command failed', { error: error.message });
    console.error(chalk.red('\nError:'), error.message);
    process.exit(1);
  }
}

function listAgents(orchestrator) {
  console.log('\n' + chalk.bold.cyan('Registered Agents'));
  console.log(chalk.gray('─'.repeat(50)));
  
  const agents = Array.from(orchestrator.agents.entries());
  
  if (agents.length === 0) {
    console.log(chalk.yellow('No agents registered'));
    return;
  }

  for (const [name, agent] of agents) {
    const info = agent.getInfo();
    console.log(chalk.green('●'), chalk.bold(name));
    console.log('  ', chalk.gray('Capabilities:'), info.capabilities.join(', '));
  }
  
  console.log();
  console.log(chalk.blue('ℹ'), `Total agents: ${agents.length}`);
  console.log(chalk.gray('Use "agent info <name>" to see detailed information'));
}

function showAgentInfo(orchestrator, name) {
  const agent = orchestrator.agents.get(name);
  
  if (!agent) {
    console.error(chalk.red(`Agent "${name}" not found`));
    console.log(chalk.gray('Use "agent list" to see available agents'));
    process.exit(1);
  }

  const info = agent.getInfo();
  
  console.log('\n' + chalk.bold.cyan(`Agent: ${name}`));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.bold('Name:'), info.name);
  console.log(chalk.bold('Capabilities:'), info.capabilities.join(', '));
  
  if (info.config && Object.keys(info.config).length > 0) {
    console.log(chalk.bold('Configuration:'));
    console.log('  ', JSON.stringify(info.config, null, 2).split('\n').join('\n  '));
  }
}
