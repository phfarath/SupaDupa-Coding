import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';

interface SDConfig {
  providers?: any[];
  agentMappings?: any[];
  defaultProvider?: string;
}

export function createSDCommand(): Command {
  const command = new Command('sd');

  command
    .description('🚀 SupaDupaCode - Interface Simplificada')
    .action(async () => {
      await runSDMenu();
    });

  return command;
}

async function runSDMenu() {
  console.clear();
  displayBanner();

  // Verificar status da configuração
  const configPath = path.join(process.cwd(), '.supadupacode', 'config.json');
  const config = await loadConfig(configPath);
  const isConfigured = config.providers && config.providers.length > 0;

  // Mostrar status
  displayStatus(isConfigured, config);

  // Menu contextual baseado no status
  const choices = buildMenuChoices(isConfigured);

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'O que deseja fazer?',
      choices,
      pageSize: 10,
    },
  ]);

  await handleAction(action);
}

function displayBanner() {
  const banner = `
${chalk.bold.cyan('╔══════════════════════════════════════════════════════════╗')}
${chalk.bold.cyan('║')}           ${chalk.bold.white('🚀 SupaDupaCode CLI v2.0')}                     ${chalk.bold.cyan('║')}
${chalk.bold.cyan('║')}        ${chalk.white('Orquestrador Multi-Agente Inteligente')}           ${chalk.bold.cyan('║')}
${chalk.bold.cyan('╚══════════════════════════════════════════════════════════╝')}
`;
  console.log(banner);
}

function displayStatus(isConfigured: boolean, config: SDConfig) {
  if (!isConfigured) {
    console.log(chalk.yellow('📌 Status: ') + chalk.red('Não configurado'));
    console.log(chalk.gray('   Configure suas APIs para começar\n'));
  } else {
    console.log(chalk.yellow('📌 Status: ') + chalk.green('Configurado ✓'));
    
    const providerCount = config.providers?.length || 0;
    const agentCount = config.agentMappings?.length || 0;
    const defaultProvider = config.providers?.find(p => p.name === config.defaultProvider);
    
    console.log(chalk.gray(`   Providers: ${providerCount}`));
    console.log(chalk.gray(`   Agentes: ${agentCount}`));
    if (defaultProvider) {
      console.log(chalk.gray(`   Provider padrão: ${defaultProvider.displayName}`));
    }
    console.log('');
  }
}

function buildMenuChoices(isConfigured: boolean) {
  if (!isConfigured) {
    // Menu para usuário não configurado
    return [
      { 
        name: chalk.bold('⚙️  Setup Inicial') + chalk.gray(' - Configure APIs e agentes (Recomendado)'),
        value: 'setup',
        short: 'Setup'
      },
      { 
        name: '💬 Chat ' + chalk.gray('- Iniciar modo conversacional (requer configuração)'),
        value: 'chat',
        short: 'Chat'
      },
      new inquirer.Separator(chalk.gray('─'.repeat(58))),
      {
        name: '📖 Tutorial' + chalk.gray(' - Como usar o SupaDupaCode'),
        value: 'tutorial',
        short: 'Tutorial'
      },
      {
        name: '🔧 Comandos Avançados' + chalk.gray(' - Ver todos os comandos'),
        value: 'advanced',
        short: 'Avançados'
      },
      {
        name: chalk.red('❌ Sair'),
        value: 'exit',
        short: 'Sair'
      },
    ];
  } else {
    // Menu para usuário configurado
    return [
      {
        name: chalk.bold('💬 Chat') + chalk.gray(' - Modo conversacional com IA'),
        value: 'chat',
        short: 'Chat'
      },
      {
        name: '📊 Status' + chalk.gray(' - Ver status do workspace'),
        value: 'status',
        short: 'Status'
      },
      new inquirer.Separator(chalk.gray('─'.repeat(58))),
      {
        name: '⚙️  Configurações' + chalk.gray(' - Gerenciar APIs e agentes'),
        value: 'setup',
        short: 'Setup'
      },
      {
        name: '📖 Tutorial' + chalk.gray(' - Como usar o SupaDupaCode'),
        value: 'tutorial',
        short: 'Tutorial'
      },
      {
        name: '🔧 Comandos Avançados' + chalk.gray(' - Ver todos os comandos'),
        value: 'advanced',
        short: 'Avançados'
      },
      new inquirer.Separator(chalk.gray('─'.repeat(58))),
      {
        name: chalk.red('❌ Sair'),
        value: 'exit',
        short: 'Sair'
      },
    ];
  }
}

async function handleAction(action: string) {
  switch (action) {
    case 'chat':
      console.log(chalk.cyan('\n🚀 Iniciando modo chat...\n'));
      await executeCommand('supadupacode', ['chat']);
      break;

    case 'setup':
      console.log(chalk.cyan('\n⚙️  Abrindo configuração...\n'));
      await executeCommand('supadupacode', ['setup']);
      break;

    case 'status':
      console.log(chalk.cyan('\n📊 Verificando status...\n'));
      await executeCommand('supadupacode', ['status', '--all']);
      break;

    case 'tutorial':
      await showTutorial();
      await promptContinue();
      await runSDMenu(); // Voltar ao menu
      break;

    case 'advanced':
      await showAdvancedCommands();
      await promptContinue();
      await runSDMenu(); // Voltar ao menu
      break;

    case 'exit':
      console.log(chalk.yellow('\n👋 Até logo!\n'));
      process.exit(0);
      break;
  }
}

async function executeCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function showTutorial() {
  console.clear();
  console.log(chalk.bold.cyan('\n📖 Tutorial SupaDupaCode\n'));
  
  console.log(chalk.bold('1️⃣ Primeiro Passo: Configuração'));
  console.log(chalk.gray('   Execute: ') + chalk.white('sd') + chalk.gray(' → Escolha "Setup Inicial"'));
  console.log(chalk.gray('   Ou: ') + chalk.white('supadupacode setup'));
  console.log('');
  
  console.log(chalk.bold('2️⃣ Adicione um Provider de API'));
  console.log(chalk.gray('   - OpenAI (GPT-4)'));
  console.log(chalk.gray('   - Anthropic (Claude)'));
  console.log(chalk.gray('   - Google (Gemini)'));
  console.log(chalk.gray('   - Ollama (Local)'));
  console.log('');
  
  console.log(chalk.bold('3️⃣ Configure os Agentes'));
  console.log(chalk.gray('   - Vincule cada agente a um provider'));
  console.log(chalk.gray('   - Escolha os modelos apropriados'));
  console.log('');
  
  console.log(chalk.bold('4️⃣ Inicie o Modo Chat'));
  console.log(chalk.gray('   Execute: ') + chalk.white('sd') + chalk.gray(' → Escolha "Chat"'));
  console.log(chalk.gray('   Ou: ') + chalk.white('supadupacode chat'));
  console.log('');
  
  console.log(chalk.bold('5️⃣ Exemplos de Uso no Chat:'));
  console.log(chalk.gray('   • ') + chalk.white('"criar API de autenticação JWT"'));
  console.log(chalk.gray('   • ') + chalk.white('"corrigir bug no login"'));
  console.log(chalk.gray('   • ') + chalk.white('"revisar código do módulo X"'));
  console.log(chalk.gray('   • ') + chalk.white('"documentar API REST"'));
  console.log('');
  
  console.log(chalk.bold('📝 Comandos Especiais no Chat:'));
  console.log(chalk.gray('   /help     - Mostrar ajuda'));
  console.log(chalk.gray('   /agents   - Gerenciar agentes ativos'));
  console.log(chalk.gray('   /toggle   - Alternar auto-approve'));
  console.log(chalk.gray('   /history  - Ver histórico'));
  console.log(chalk.gray('   /exit     - Sair'));
  console.log('');
}

async function showAdvancedCommands() {
  console.clear();
  console.log(chalk.bold.cyan('\n🔧 Comandos Avançados\n'));
  
  console.log(chalk.bold('Gerenciamento:'));
  console.log(chalk.gray('  supadupacode setup          ') + '- Configuração interativa');
  console.log(chalk.gray('  supadupacode chat           ') + '- Modo conversacional');
  console.log(chalk.gray('  supadupacode status --all   ') + '- Status completo');
  console.log('');
  
  console.log(chalk.bold('Planejamento e Execução:'));
  console.log(chalk.gray('  supadupacode plan <desc>    ') + '- Planejar feature');
  console.log(chalk.gray('  supadupacode run --feature  ') + '- Executar feature');
  console.log('');
  
  console.log(chalk.bold('Revisão e Qualidade:'));
  console.log(chalk.gray('  supadupacode review --pr    ') + '- Revisar PR');
  console.log(chalk.gray('  supadupacode fix --pr       ') + '- Corrigir issues');
  console.log('');
  
  console.log(chalk.bold('Agentes e Memória:'));
  console.log(chalk.gray('  supadupacode agent list     ') + '- Listar agentes');
  console.log(chalk.gray('  supadupacode memory init    ') + '- Inicializar memória');
  console.log('');
  
  console.log(chalk.bold('Workflows:'));
  console.log(chalk.gray('  supadupacode workflow list  ') + '- Listar workflows');
  console.log(chalk.gray('  supadupacode workflow run   ') + '- Executar workflow');
  console.log('');
  
  console.log(chalk.bold('Monitoramento:'));
  console.log(chalk.gray('  supadupacode metrics        ') + '- Ver métricas');
  console.log(chalk.gray('  supadupacode logs           ') + '- Consultar logs');
  console.log(chalk.gray('  supadupacode health         ') + '- Health check');
  console.log('');
  
  console.log(chalk.yellow('💡 Dica: ') + chalk.gray('Use ') + chalk.white('sd') + chalk.gray(' para interface simplificada'));
  console.log('');
}

async function promptContinue() {
  await inquirer.prompt([
    {
      type: 'input',
      name: 'continue',
      message: 'Pressione ENTER para voltar ao menu...',
    },
  ]);
}

async function loadConfig(configPath: string): Promise<SDConfig> {
  try {
    const data = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}
