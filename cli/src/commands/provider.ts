/**
 * Provider Command - manage API providers
 */

import chalk from 'chalk';
import path from 'path';
import { sdProviderRegistry } from '../api/provider-registry';
import { ProviderDetails } from '../../shared/contracts/llm-contracts';
import { logger } from '../utils/logger';

interface ProviderCommandOptions {
  key?: string;
  model?: string;
  endpoint?: string;
  setActive?: boolean;
  [key: string]: any;
}



interface AddProviderOptions {
  model?: string;
  endpoint?: string;
  setActive?: boolean;
}

interface UpdateProviderOptions {
  apiKey?: string;
  model?: string;
  endpoint?: string;
}

export async function providerCommand(action?: string, name?: string, options: ProviderCommandOptions = {}) {
  try {
    const configPath = path.join(process.cwd(), '.supadupacode.json');
    const registry = new sdProviderRegistry(configPath);
    
    // Initialize the registry to load existing providers
    await registry.initialize();

    if (!action) {
      action = 'list';
    }

    switch (action) {
      case 'add':
        await handleAdd(registry, name, options);
        break;
      
      case 'list':
        await handleList(registry);
        break;
      
      case 'switch':
        await handleSwitch(registry, name);
        break;
      
      case 'remove':
      case 'delete':
        await handleRemove(registry, name);
        break;
      
      case 'show':
        await handleShow(registry, name);
        break;
      
      case 'update':
        await handleUpdate(registry, name, options);
        break;
      
      default:
        throw new Error(`Unknown action: ${action}. Available: add, list, switch, remove, show, update`);
    }

  } catch (error: any) {
    logger.error('Provider operation failed', { error: error.message });
    console.error(chalk.red('\nError:'), error.message);
    process.exit(1);
  }
}

async function handleAdd(registry: sdProviderRegistry, name: string | undefined, options: ProviderCommandOptions) {
  if (!name) {
    throw new Error('Provider name is required. Usage: provider add <name> --key <api-key>');
  }

  if (!options.key) {
    throw new Error('API key is required. Usage: provider add <name> --key <api-key>');
  }

  console.log(chalk.bold.cyan('Adding API Provider'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.bold('Provider:'), name);
  
  if (options.model) {
    console.log(chalk.bold('Model:'), options.model);
  }
  if (options.endpoint) {
    console.log(chalk.bold('Endpoint:'), options.endpoint);
  }

  const providerConfig = {
    name,
    type: 'openai' as const, // Default type, should be determined from options
    model: options.model || 'gpt-4',
    endpoint: options.endpoint,
    credentials: { apiKey: options.key },
    settings: {
      timeout: 30000,
      maxRetries: 3
    }
  };

  await registry.addProvider(providerConfig);

  console.log(chalk.green('\n✓'), `Provider '${name}' added successfully`);
  
  if (options.setActive) {
    await registry.switchProvider(name);
    console.log(chalk.green('✓'), `Set as active provider`);
  }
  
  console.log(chalk.blue('\nℹ'), 'API key has been encrypted and stored securely');
  console.log(chalk.blue('ℹ'), `Use ${chalk.bold('provider switch <name>')} to change active provider`);

  logger.info('Provider added', { name, model: options.model });
}

async function handleList(registry: sdProviderRegistry) {
  console.log(chalk.bold.cyan('Registered API Providers'));
  console.log(chalk.gray('─'.repeat(50)));

  const providers: ProviderDetails[] = await registry.listProviders();

  if (providers.length === 0) {
    console.log(chalk.yellow('No providers registered'));
    console.log(chalk.blue('\nℹ'), `Add a provider with: ${chalk.bold('provider add <name> --key <api-key>')}`);
    return;
  }

  for (const provider of providers) {
    const activeIndicator = provider.active ? chalk.green('● ACTIVE') : chalk.gray('○');
    const keyIndicator = provider.hasKey ? chalk.green('✓ Key stored') : chalk.red('✗ No key');
    
    console.log(`\n${activeIndicator} ${chalk.bold(provider.name)}`);
    console.log(`  ${keyIndicator}`);
    
    if (provider.model) {
      console.log(`  Model: ${provider.model}`);
    }
    if (provider.endpoint) {
      console.log(`  Endpoint: ${provider.endpoint}`);
    }
    console.log(`  Created: ${new Date(provider.created_at).toLocaleString()}`);
  }

  console.log();
}

async function handleSwitch(registry: sdProviderRegistry, name: string | undefined) {
  if (!name) {
    throw new Error('Provider name is required. Usage: provider switch <name>');
  }

  console.log(chalk.bold.cyan('Switching Active Provider'));
  console.log(chalk.gray('─'.repeat(50)));

  await registry.switchProvider(name);

  console.log(chalk.green('✓'), `Active provider changed to '${name}'`);
  console.log(chalk.blue('\nℹ'), `All AI operations will now use the '${name}' provider`);

  logger.info('Provider switched', { name });
}

async function handleRemove(registry: sdProviderRegistry, name: string | undefined) {
  if (!name) {
    throw new Error('Provider name is required. Usage: provider remove <name>');
  }

  console.log(chalk.bold.cyan('Removing Provider'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.bold('Provider:'), name);

  const result = await registry.removeProvider(name);

  console.log(chalk.green('\n✓'), `Provider '${name}' removed successfully`);

  logger.info('Provider removed', { name });
}

async function handleShow(registry: sdProviderRegistry, name: string | undefined) {
  if (!name) {
    throw new Error('Provider name is required. Usage: provider show <name>');
  }

  console.log(chalk.bold.cyan('Provider Details'));
  console.log(chalk.gray('─'.repeat(50)));

  const providerAdapter = registry.get(name);
  if (!providerAdapter) {
    throw new Error(`Provider "${name}" not found`);
  }
  
  const config = registry.getConfig(name);
  const status = await providerAdapter.getStatus();
  
  const provider: ProviderDetails = {
    id: name,
    name: config?.name || name,
    type: config?.type || 'openai',
    model: config?.model,
    endpoint: config?.endpoint,
    active: status.status === 'online',
    hasKey: !!(config?.credentials && (config.credentials as any).apiKey),
    created_at: new Date().toISOString()
  };

  console.log(chalk.bold('Name:'), provider.name);
  console.log(chalk.bold('Active:'), provider.active ? chalk.green('Yes') : chalk.gray('No'));
  
  if (provider.model) {
    console.log(chalk.bold('Model:'), provider.model);
  }
  if (provider.endpoint) {
    console.log(chalk.bold('Endpoint:'), provider.endpoint);
  }
  
  console.log(chalk.bold('Created:'), new Date(provider.created_at).toLocaleString());
  
  console.log(chalk.blue('\nℹ'), 'API key is encrypted and not displayed');
}

async function handleUpdate(registry: sdProviderRegistry, name: string | undefined, options: ProviderCommandOptions) {
  if (!name) {
    throw new Error('Provider name is required. Usage: provider update <name> [options]');
  }

  console.log(chalk.bold.cyan('Updating Provider'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.bold('Provider:'), name);

  const updates: UpdateProviderOptions = {};
  
  if (options.key) {
    updates.apiKey = options.key;
    console.log(chalk.bold('Updating:'), 'API key');
  }
  if (options.model) {
    updates.model = options.model;
    console.log(chalk.bold('Model:'), options.model);
  }
  if (options.endpoint) {
    updates.endpoint = options.endpoint;
    console.log(chalk.bold('Endpoint:'), options.endpoint);
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('No updates specified. Use --key, --model, or --endpoint');
  }

  await registry.updateProvider(name, updates);

  console.log(chalk.green('\n✓'), `Provider '${name}' updated successfully`);

  logger.info('Provider updated', { name, fields: Object.keys(updates) });
}