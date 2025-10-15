import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { LLMClient } from '../api/llm-client';
import { getModelsForProvider, recommendModel } from '../api/model-detector';

interface ProviderConfig {
  name: string;
  displayName: string;
  apiKey: string;
  model?: string;
  endpoint?: string;
  enabled: boolean;
}

interface AgentProviderMapping {
  agentName: string;
  providerName: string;
  model: string;
}

interface SetupConfig {
  providers: ProviderConfig[];
  agentMappings: AgentProviderMapping[];
  defaultProvider?: string;
}

const AVAILABLE_PROVIDERS = [
  { name: 'openai', displayName: 'OpenAI (GPT-4, GPT-3.5)', models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  { name: 'anthropic', displayName: 'Anthropic (Claude)', models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'] },
  { name: 'google', displayName: 'Google (Gemini)', models: ['gemini-pro', 'gemini-ultra'] },
  { name: 'ollama', displayName: 'Ollama (Local)', models: ['llama2', 'mistral', 'codellama'], isLocal: true },
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

  const configPath = path.join(process.cwd(), '.supadupacode', 'config.json');
  let config: SetupConfig = await loadConfig(configPath);

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
        config = await addProvider(config);
        break;
      case 'configure-agents':
        config = await configureAgents(config);
        break;
      case 'view-config':
        await viewConfig(config);
        break;
      case 'remove-provider':
        config = await removeProvider(config);
        break;
      case 'save-exit':
        await saveConfig(configPath, config);
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

async function addProvider(config: SetupConfig): Promise<SetupConfig> {
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
      default: config.providers.length === 0,
    },
  ]);

  // Adicionar ou atualizar provider
  const existingIndex = config.providers.findIndex(p => p.name === providerType);
  const newProvider: ProviderConfig = {
    name: providerType,
    displayName: provider.displayName,
    apiKey: apiKey || '',
    model,
    endpoint,
    enabled: true,
  };

  if (existingIndex >= 0) {
    config.providers[existingIndex] = newProvider;
    console.log(chalk.green(`\n✓ Provider ${provider.displayName} atualizado`));
  } else {
    config.providers.push(newProvider);
    console.log(chalk.green(`\n✓ Provider ${provider.displayName} adicionado`));
  }

  if (setAsDefault) {
    config.defaultProvider = providerType;
    console.log(chalk.blue(`  → Definido como padrão`));
  }
  
  // Mostrar info do modelo
  console.log(chalk.gray(`  → Modelo: ${model}`));

  return config;
}

async function configureAgents(config: SetupConfig): Promise<SetupConfig> {
  if (config.providers.length === 0) {
    console.log(chalk.yellow('\n⚠️  Nenhum provider configurado. Adicione um provider primeiro.\n'));
    return config;
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

  const newMappings: AgentProviderMapping[] = [];

  for (const agentName of selectedAgents) {
    const agent = AVAILABLE_AGENTS.find(a => a.name === agentName)!;
    
    console.log(chalk.cyan(`\n→ Configurando: ${agent.displayName}`));

    const { providerName } = await inquirer.prompt([
      {
        type: 'list',
        name: 'providerName',
        message: 'Qual provider usar?',
        choices: config.providers.map(p => ({
          name: `${p.displayName} (${p.model})`,
          value: p.name,
        })),
        default: config.defaultProvider,
      },
    ]);

    const selectedProvider = config.providers.find(p => p.name === providerName)!;

    const { model } = await inquirer.prompt([
      {
        type: 'input',
        name: 'model',
        message: 'Modelo a usar:',
        default: selectedProvider.model,
      },
    ]);

    newMappings.push({
      agentName,
      providerName,
      model,
    });
  }

  // Substituir mappings antigos
  config.agentMappings = newMappings;

  console.log(chalk.green(`\n✓ ${newMappings.length} agente(s) configurado(s)`));

  return config;
}

async function viewConfig(config: SetupConfig) {
  console.log(chalk.bold.cyan('\n📋 Configuração Atual\n'));

  if (config.providers.length === 0) {
    console.log(chalk.yellow('  Nenhum provider configurado\n'));
  } else {
    console.log(chalk.bold('Providers:'));
    config.providers.forEach(p => {
      const isDefault = p.name === config.defaultProvider;
      const defaultLabel = isDefault ? chalk.green(' (padrão)') : '';
      console.log(`  ${chalk.cyan('•')} ${p.displayName}${defaultLabel}`);
      console.log(`    Modelo: ${p.model}`);
      console.log(`    API Key: ${p.apiKey ? chalk.green('✓ Configurada') : chalk.red('✗ Não configurada')}`);
      if (p.endpoint) {
        console.log(`    Endpoint: ${p.endpoint}`);
      }
      console.log('');
    });
  }

  if (config.agentMappings.length === 0) {
    console.log(chalk.yellow('  Nenhum agente configurado\n'));
  } else {
    console.log(chalk.bold('Agentes:'));
    config.agentMappings.forEach(m => {
      const agent = AVAILABLE_AGENTS.find(a => a.name === m.agentName);
      const provider = config.providers.find(p => p.name === m.providerName);
      console.log(`  ${chalk.cyan('•')} ${agent?.displayName || m.agentName}`);
      console.log(`    Provider: ${provider?.displayName || m.providerName}`);
      console.log(`    Modelo: ${m.model}`);
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

async function removeProvider(config: SetupConfig): Promise<SetupConfig> {
  if (config.providers.length === 0) {
    console.log(chalk.yellow('\n⚠️  Nenhum provider para remover.\n'));
    return config;
  }

  const { providerName } = await inquirer.prompt([
    {
      type: 'list',
      name: 'providerName',
      message: 'Qual provider deseja remover?',
      choices: config.providers.map(p => ({
        name: p.displayName,
        value: p.name,
      })),
    },
  ]);

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Tem certeza que deseja remover ${providerName}?`,
      default: false,
    },
  ]);

  if (confirm) {
    config.providers = config.providers.filter(p => p.name !== providerName);
    config.agentMappings = config.agentMappings.filter(m => m.providerName !== providerName);
    
    if (config.defaultProvider === providerName) {
      config.defaultProvider = config.providers[0]?.name;
    }

    console.log(chalk.green(`\n✓ Provider removido`));
  } else {
    console.log(chalk.yellow('\n  Operação cancelada'));
  }

  return config;
}

async function loadConfig(configPath: string): Promise<SetupConfig> {
  try {
    const data = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {
      providers: [],
      agentMappings: [],
    };
  }
}

async function saveConfig(configPath: string, config: SetupConfig) {
  const dir = path.dirname(configPath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
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
