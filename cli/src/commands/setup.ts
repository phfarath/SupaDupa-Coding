import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { LLMClient } from '../api/llm-client';
import { getModelsForProvider, recommendModel } from '../api/model-detector';
import { UnifiedConfigManager } from '../core/unified-config-manager';
import { UnifiedConfig } from '../shared/unified-config';

// Using UnifiedConfig from shared/unified-config.ts
// Legacy interfaces for backward compatibility during migration
interface LegacyProviderConfig {
  name: string;
  displayName: string;
  apiKey: string;
  model?: string;
  endpoint?: string;
  enabled: boolean;
}

interface LegacyAgentMapping {
  agentName: string;
  providerName: string;
  model: string;
}

interface LegacySetupConfig {
  providers: LegacyProviderConfig[];
  agentMappings: LegacyAgentMapping[];
  defaultProvider?: string;
}

const AVAILABLE_PROVIDERS = [
  { 
    name: 'openai', 
    displayName: 'OpenAI (GPT-4o, GPT-4)', 
    models: [
      'gpt-4o',           // Latest flagship (recommended)
      'gpt-4o-mini',      // Faster, cheaper
      'gpt-4-turbo',      // Previous generation
      'gpt-3.5-turbo'     // Budget option
    ] 
  },
  { 
    name: 'anthropic', 
    displayName: 'Anthropic (Claude 3.5)', 
    models: [
      'claude-3-5-sonnet-20241022',  // Latest (recommended)
      'claude-3-opus-20240229',      // High-performance
      'claude-3-sonnet-20240229',    // Balanced
      'claude-3-haiku-20240307'      // Fast, cost-effective
    ] 
  },
  { 
    name: 'google', 
    displayName: 'Google (Gemini)', 
    models: [
      'gemini-1.5-pro-latest',    // Latest Pro
      'gemini-1.5-flash-latest',  // Fast, cost-effective
      'gemini-pro'                // Previous generation
    ] 
  },
  { 
    name: 'local', 
    displayName: 'Ollama (Local Models)', 
    models: [
      'llama3.1:8b',      // Meta's latest 8B
      'llama3.1:70b',     // Meta's latest 70B
      'codellama:7b',     // Code-specialized
      'mistral:7b',       // Efficient general purpose
      'qwen2.5:7b'        // Qwen latest
    ], 
    isLocal: true 
  },
];

const AVAILABLE_AGENTS = [
  { name: 'planner', displayName: '📋 Planner - Planejamento e arquitetura' },
  { name: 'developer', displayName: '👨‍💻 Developer - Implementação de código' },
  { name: 'qa', displayName: '🧪 QA - Testes e qualidade' },
  { name: 'docs', displayName: '📚 Docs - Documentação' },
  { name: 'brain', displayName: '🧠 Brain - Orquestrador principal' },
];

export function createSetupCommand(): Command {
  const command = new Command('setup');

  command
    .description('Configuração interativa de providers de API e agentes')
    .action(async () => {
      await runInteractiveSetup();
    });

  return command;
}

async function runInteractiveSetup() {
  console.clear();
  displayWelcome();

  const configManager = new UnifiedConfigManager();
  await configManager.initialize();
  
  // Try to migrate old configs first
  await configManager.migrateFromOldConfigs();
  
  let continueSetup = true;

  while (continueSetup) {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'O que deseja configurar?',
        choices: [
          { name: '🔑 Adicionar/Configurar Provider de API', value: 'add-provider' },
          { name: '🤖 Configurar Agentes (vincular aos providers)', value: 'configure-agents' },
          { name: '📋 Ver Configuração Atual', value: 'view-config' },
          { name: '🗑️  Remover Provider', value: 'remove-provider' },
          { name: '💾 Salvar e Sair', value: 'save-exit' },
          { name: '❌ Sair sem Salvar', value: 'exit' },
        ],
      },
    ]);

    switch (action) {
      case 'add-provider':
        await addProvider(configManager);
        break;
      case 'configure-agents':
        await configureAgents(configManager);
        break;
      case 'view-config':
        await viewConfig(configManager);
        break;
      case 'remove-provider':
        await removeProvider(configManager);
        break;
      case 'save-exit':
        await configManager.saveConfig();
        console.log(chalk.green('\n✓ Configuração salva com sucesso!'));
        continueSetup = false;
        break;
      case 'exit':
        console.log(chalk.yellow('\n⚠️  Saindo sem salvar...'));
        continueSetup = false;
        break;
    }

    if (continueSetup) {
      console.log('\n' + chalk.gray('─'.repeat(60)) + '\n');
    }
  }
}

async function addProvider(configManager: UnifiedConfigManager): Promise<void> {
  console.log(chalk.bold.cyan('\n📡 Adicionar Provider de API\n'));

  // Selecionar provider
  const { providerType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'providerType',
      message: 'Selecione o provider:',
      choices: AVAILABLE_PROVIDERS.map(p => ({
        name: p.displayName,
        value: p.name,
      })),
    },
  ]);

  const provider = AVAILABLE_PROVIDERS.find(p => p.name === providerType)!;
  const isLocal = provider.isLocal || false;

  // Configurar API Key primeiro
  const { apiKey } = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: 'API Key:',
      when: !isLocal,
      validate: (input) => input.length > 0 || 'API Key é obrigatória',
    },
  ]);

  // Buscar modelos disponíveis
  let modelChoices: { name: string; value: string }[] = [];
  
  if (!isLocal && apiKey) {
    console.log(chalk.blue('\n📡 Buscando modelos disponíveis...'));
    
    try {
      // Criar config temporária para buscar modelos
      const tempConfig = {
        providers: [{
          name: providerType,
          apiKey,
          enabled: true,
        }],
      };
      
      // Salvar temporariamente
      const tempConfigPath = path.join(process.cwd(), '.supadupacode', '.temp-config.json');
      await fs.mkdir(path.dirname(tempConfigPath), { recursive: true });
      await fs.writeFile(tempConfigPath, JSON.stringify(tempConfig, null, 2));
      
      const llmClient = new LLMClient(tempConfigPath);
      const models = await llmClient.fetchAvailableModels(providerType);
      
      // Limpar temp config
      await fs.unlink(tempConfigPath).catch(() => {});
      
      if (models.length > 0) {
        modelChoices = models.map(m => ({
          name: m.name,
          value: m.id,
        }));
        console.log(chalk.green(`✓ ${models.length} modelos encontrados\n`));
      } else {
        throw new Error('Nenhum modelo encontrado');
      }
    } catch (error) {
      console.log(chalk.yellow(`⚠️  Não foi possível buscar modelos: ${(error as Error).message}`));
      console.log(chalk.gray('Usando lista estática de modelos...\n'));
      
      // Fallback para lista estática
      const staticModels = getModelsForProvider(providerType as any);
      modelChoices = staticModels.map(id => ({
        name: id,
        value: id,
      }));
    }
  } else {
    // Provider local - usar lista estática
    const staticModels = getModelsForProvider(providerType as any);
    modelChoices = staticModels.map(id => ({
      name: id,
      value: id,
    }));
  }

  // Selecionar modelo e outras configs
  const { model, endpoint, setAsDefault } = await inquirer.prompt([
    {
      type: 'list',
      name: 'model',
      message: 'Selecione o modelo:',
      choices: modelChoices,
      default: modelChoices[0]?.value,
    },
    {
      type: 'input',
      name: 'endpoint',
      message: 'Endpoint (opcional):',
      default: isLocal ? 'http://localhost:11434' : '',
    },
    {
      type: 'confirm',
      name: 'setAsDefault',
      message: 'Definir como provider padrão?',
      default: Object.keys(configManager.getProviders()).length === 0,
    },
  ]);

  // Adicionar ou atualizar provider usando config manager
  const existingProvider = configManager.getProvider(providerType);
  const isUpdate = !!existingProvider;
  
  await configManager.setProvider(providerType, {
    type: providerType as any,
    model,
    apiKey: apiKey || '',
    endpoint,
    active: setAsDefault || (!existingProvider && Object.keys(configManager.getProviders()).length === 0)
  });

  if (isUpdate) {
    console.log(chalk.green(`\n✓ Provider ${provider.displayName} atualizado`));
  } else {
    console.log(chalk.green(`\n✓ Provider ${provider.displayName} adicionado`));
  }

  if (setAsDefault) {
    console.log(chalk.blue(`  → Definido como padrão`));
  }
  
  // Mostrar info do modelo
  console.log(chalk.gray(`  → Modelo: ${model}`));
}

async function configureAgents(configManager: UnifiedConfigManager): Promise<void> {
  const providers = configManager.getProviders();
  if (Object.keys(providers).length === 0) {
    console.log(chalk.yellow('\n⚠️  Nenhum provider configurado. Adicione um provider primeiro.\n'));
    return;
  }

  console.log(chalk.bold.cyan('\n🤖 Configurar Agentes\n'));

  // Selecionar agentes para configurar
  const { selectedAgents } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedAgents',
      message: 'Selecione os agentes para configurar:',
      choices: AVAILABLE_AGENTS.map(a => ({
        name: a.displayName,
        value: a.name,
        checked: true,
      })),
    },
  ]);

  for (const agentName of selectedAgents) {
    const agent = AVAILABLE_AGENTS.find(a => a.name === agentName)!;
    
    console.log(chalk.cyan(`\n→ Configurando: ${agent.displayName}`));

    const { providerName } = await inquirer.prompt([
      {
        type: 'list',
        name: 'providerName',
        message: 'Qual provider usar?',
        choices: Object.entries(providers).map(([name, config]) => ({
          name: `${name} (${config.model})`,
          value: name,
        })),
        default: configManager.getActiveProvider()?.name || Object.keys(providers)[0],
      },
    ]);

    const selectedProvider = providers[providerName];

    const { model } = await inquirer.prompt([
      {
        type: 'input',
        name: 'model',
        message: 'Modelo a usar:',
        default: selectedProvider.model,
      },
    ]);

    // Update agent configuration
    const currentAgent = configManager.getAgent(agentName);
    await configManager.setAgent(agentName, {
      ...currentAgent,
      provider: providerName,
      model,
      enabled: true
    });
  }

  console.log(chalk.green(`\n✓ ${selectedAgents.length} agente(s) configurado(s)`));
}

async function viewConfig(configManager: UnifiedConfigManager) {
  const config = configManager.getConfig();
  console.log(chalk.bold.cyan('\n📋 Configuração Atual\n'));

  const providers = config.providers;
  if (Object.keys(providers).length === 0) {
    console.log(chalk.yellow('  Nenhum provider configurado\n'));
  } else {
    console.log(chalk.bold('Providers:'));
    Object.entries(providers).forEach(([name, p]) => {
      const isActive = p.active;
      const activeLabel = isActive ? chalk.green(' (ativo)') : '';
      console.log(`  ${chalk.cyan('•')} ${name}${activeLabel}`);
      console.log(`    Tipo: ${p.type}`);
      console.log(`    Modelo: ${p.model}`);
      console.log(`    API Key: ${p.apiKey ? chalk.green('✓ Configurada') : chalk.red('✗ Não configurada')}`);
      if (p.endpoint) {
        console.log(`    Endpoint: ${p.endpoint}`);
      }
      console.log('');
    });
  }

  const agents = config.agents;
  if (Object.keys(agents).length === 0) {
    console.log(chalk.yellow('  Nenhum agente configurado\n'));
  } else {
    console.log(chalk.bold('Agentes:'));
    Object.entries(agents).forEach(([name, agent]) => {
      const agentInfo = AVAILABLE_AGENTS.find(a => a.name === name);
      const provider = providers[agent.provider];
      console.log(`  ${chalk.cyan('•')} ${agentInfo?.displayName || name}`);
      console.log(`    Provider: ${agent.provider}`);
      console.log(`    Modelo: ${agent.model}`);
      console.log(`    Status: ${agent.enabled ? chalk.green('Ativo') : chalk.red('Inativo')}`);
      console.log('');
    });
  }

  await inquirer.prompt([
    {
      type: 'input',
      name: 'continue',
      message: 'Pressione ENTER para continuar...',
    },
  ]);
}

async function removeProvider(configManager: UnifiedConfigManager): Promise<void> {
  const providers = configManager.getProviders();
  if (Object.keys(providers).length === 0) {
    console.log(chalk.yellow('\n⚠️  Nenhum provider para remover\n'));
    return;
  }

  const { providerName } = await inquirer.prompt([
    {
      type: 'list',
      name: 'providerName',
      message: 'Qual provider deseja remover?',
      choices: Object.entries(providers).map(([name, config]) => ({
        name: `${name} (${config.model})`,
        value: name,
      })),
    },
  ]);

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Tem certeza que deseja remover o provider "${providerName}"?`,
      default: false,
    },
  ]);

  if (confirm) {
    await configManager.removeProvider(providerName);
    
    // Update agents that were using this provider
    const agents = configManager.getConfig().agents;
    for (const [agentName, agent] of Object.entries(agents)) {
      if (agent.provider === providerName) {
        // Find another provider or disable
        const otherProviders = Object.keys(providers).filter(p => p !== providerName);
        if (otherProviders.length > 0) {
          await configManager.setAgent(agentName, {
            ...agent,
            provider: otherProviders[0]
          });
        } else {
          await configManager.setAgent(agentName, {
            ...agent,
            enabled: false
          });
        }
      }
    }
    
    console.log(chalk.green(`\n✓ Provider "${providerName}" removido`));
  }
}



function displayWelcome() {
  const banner = `
${chalk.bold.cyan('╔══════════════════════════════════════════════════════════╗')}
${chalk.bold.cyan('║')}          ${chalk.bold.white('⚙️  SupaDupaCode Setup')}                        ${chalk.bold.cyan('║')}
${chalk.bold.cyan('║')}        ${chalk.white('Configuração de Providers e Agentes')}              ${chalk.bold.cyan('║')}
${chalk.bold.cyan('╚══════════════════════════════════════════════════════════╝')}
`;
  console.log(banner);
  console.log(chalk.gray('Configure seus providers de API e vincule-os aos agentes\n'));
}
