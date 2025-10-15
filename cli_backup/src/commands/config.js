/**
 * Config Command - manage CLI configuration
 */

import chalk from 'chalk';
import { ConfigManager } from '../core/config-manager.js';
import { logger } from '../utils/logger.js';

export async function configCommand(action, key, value) {
  try {
    const configManager = new ConfigManager();

    if (!action) {
      action = 'show';
    }

    switch (action) {
      case 'init':
        await handleInit(configManager);
        break;
      
      case 'show':
        await handleShow(configManager, key);
        break;
      
      case 'set':
        await handleSet(configManager, key, value);
        break;
      
      case 'reset':
        await handleReset(configManager);
        break;
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    logger.error('Config operation failed', { error: error.message });
    console.error(chalk.red('\nError:'), error.message);
    process.exit(1);
  }
}

async function handleInit(configManager) {
  console.log(chalk.bold.cyan('Initializing Configuration'));
  console.log(chalk.gray('─'.repeat(50)));
  
  const config = await configManager.init();
  
  console.log(chalk.green('✓'), 'Configuration initialized');
  console.log(chalk.blue('ℹ'), `Config file: ${configManager.configPath}`);
  
  console.log('\n' + chalk.bold('Default Configuration:'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(JSON.stringify(config, null, 2));
  
  logger.info('Configuration initialized');
}

async function handleShow(configManager, key) {
  console.log(chalk.bold.cyan('Configuration'));
  console.log(chalk.gray('─'.repeat(50)));
  
  if (key) {
    const value = await configManager.get(key);
    
    if (value === undefined) {
      console.log(chalk.yellow('⚠'), `Key not found: ${key}`);
    } else {
      console.log(chalk.bold(key + ':'));
      console.log(typeof value === 'object' 
        ? JSON.stringify(value, null, 2) 
        : value
      );
    }
  } else {
    const config = await configManager.show();
    console.log(JSON.stringify(config, null, 2));
  }
  
  console.log('\n' + chalk.blue('ℹ'), `Config file: ${configManager.configPath}`);
}

async function handleSet(configManager, key, value) {
  if (!key || value === undefined) {
    throw new Error('Both key and value are required for set action');
  }

  console.log(chalk.bold.cyan('Setting Configuration'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.bold('Key:'), key);
  console.log(chalk.bold('Value:'), value);
  
  // Try to parse value as JSON
  let parsedValue = value;
  try {
    parsedValue = JSON.parse(value);
  } catch (e) {
    // Keep as string if not valid JSON
  }
  
  await configManager.set(key, parsedValue);
  
  console.log(chalk.green('✓'), 'Configuration updated');
  
  logger.info('Configuration updated', { key, value: parsedValue });
}

async function handleReset(configManager) {
  console.log(chalk.bold.cyan('Resetting Configuration'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.yellow('⚠'), 'This will reset all configuration to defaults');
  
  // TODO: Add confirmation prompt in interactive mode
  
  const config = await configManager.reset();
  
  console.log(chalk.green('✓'), 'Configuration reset to defaults');
  console.log('\n' + chalk.bold('Default Configuration:'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(JSON.stringify(config, null, 2));
  
  logger.info('Configuration reset');
}
