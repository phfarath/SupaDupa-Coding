import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora, { Ora } from 'ora';
import { SessionManager } from '../core/session-manager';
import { BrainAgent } from '../agents/brain-agent';
import { ProgressUI } from '../ui/progress-ui';

interface ChatOptions {
  workspace?: string;
  autoApprove?: boolean;
  agents?: string;
}

export function createChatCommand(): Command {
  const command = new Command('chat');

  command
    .description('Modo conversacional interativo com orquestração multi-agente')
    .option('-w, --workspace <path>', 'Caminho do workspace', process.cwd())
    .option('-a, --auto-approve', 'Ativar modo auto-approve', false)
    .option('--agents <agents>', 'Agentes ativos (separados por vírgula)', 'planner,developer,qa')
    .action(async (options: ChatOptions) => {
      await runChatSession(options);
    });

  return command;
}

async function runChatSession(options: ChatOptions) {
  console.clear();
  displayWelcomeBanner();

  // Inicializar sessão
  const sessionManager = new SessionManager({
    workspacePath: options.workspace || process.cwd(),
    autoApprove: options.autoApprove || false,
  });

  // Carregar ou criar sessão
  const sessionSpinner = ora('Inicializando sessão...').start();
  await sessionManager.initialize();
  sessionSpinner.succeed('Sessão inicializada');

  // Selecionar agentes ativos
  const activeAgents = await selectActiveAgents(options.agents);
  sessionManager.setActiveAgents(activeAgents);

  // Inicializar Brain Agent
  const brainAgent = new BrainAgent({
    name: 'brain',
    sessionManager,
    activeAgents,
  });
  
  // Initialize the brain agent to load providers
  const brainSpinner = ora('Inicializando Brain Agent...').start();
  await brainAgent.initialize();
  brainSpinner.succeed('Brain Agent inicializado');

  const progressUI = new ProgressUI();

  displaySessionInfo(sessionManager, activeAgents);

  // REPL Loop
  console.log(chalk.gray('\nDigite seu prompt ou comandos:'));
  console.log(chalk.gray('  • /help     - Mostrar ajuda'));
  console.log(chalk.gray('  • /agents   - Gerenciar agentes ativos'));
  console.log(chalk.gray('  • /toggle   - Alternar auto-approve'));
  console.log(chalk.gray('  • /history  - Ver histórico'));
  console.log(chalk.gray('  • /exit     - Sair\n'));

  while (true) {
    try {
      const { input } = await inquirer.prompt([
        {
          type: 'input',
          name: 'input',
          message: chalk.cyan('Você:'),
          prefix: '',
        },
      ]);

      const trimmedInput = input.trim();

      // Comandos especiais
      if (trimmedInput === '/exit' || trimmedInput === 'exit') {
        await handleExit(sessionManager);
        break;
      }

      if (trimmedInput === '/help' || trimmedInput === 'help') {
        displayHelp();
        continue;
      }

      if (trimmedInput === '/agents') {
        const newAgents = await selectActiveAgents();
        sessionManager.setActiveAgents(newAgents);
        console.log(chalk.green('✓ Agentes atualizados'));
        continue;
      }

      if (trimmedInput === '/toggle') {
        sessionManager.toggleAutoApprove();
        continue;
      }

      if (trimmedInput === '/history') {
        await displayHistory(sessionManager);
        continue;
      }

      if (!trimmedInput) {
        continue;
      }

      // Processar prompt com Brain Agent
      console.log(''); // Espaço
      await processBrainRequest(trimmedInput, brainAgent, progressUI, sessionManager);
      console.log(''); // Espaço

    } catch (error) {
      if ((error as any).isTtyError) {
        console.error(chalk.red('Erro: Prompt não pode ser renderizado neste ambiente'));
        break;
      } else {
        console.error(chalk.red(`Erro: ${(error as Error).message}`));
      }
    }
  }
}

function displayWelcomeBanner() {
  const banner = `
${chalk.bold.cyan('╔══════════════════════════════════════════════════════════╗')}
${chalk.bold.cyan('║')}           ${chalk.bold.white('🧠 SupaDupaCode Brain v2.0')}                     ${chalk.bold.cyan('║')}
${chalk.bold.cyan('║')}        ${chalk.white('Orquestrador Multi-Agente Inteligente')}             ${chalk.bold.cyan('║')}
${chalk.bold.cyan('╚══════════════════════════════════════════════════════════╝')}
`;
  console.log(banner);
}

function displaySessionInfo(sessionManager: SessionManager, activeAgents: string[]) {
  const config = sessionManager.getConfig();
  
  console.log(chalk.blue('📂 Workspace:'), chalk.white(config.workspacePath));
  console.log(chalk.blue('🤖 Agentes ativos:'), chalk.white(activeAgents.join(', ')));
  console.log(chalk.blue('⚡ Auto-approve:'), config.autoApprove ? chalk.green('Ativado') : chalk.yellow('Desativado'));
  
  if (sessionManager.getIndexedFilesCount() > 0) {
    console.log(chalk.blue('📊 Arquivos indexados:'), chalk.white(sessionManager.getIndexedFilesCount().toString()));
  }
}

async function selectActiveAgents(preselected?: string): Promise<string[]> {
  const availableAgents = [
    { name: 'Planner - Planejamento e arquitetura', value: 'planner', checked: true },
    { name: 'Developer - Implementação de código', value: 'developer', checked: true },
    { name: 'QA - Testes e qualidade', value: 'qa', checked: true },
    { name: 'Docs - Documentação', value: 'docs', checked: false },
    { name: 'DevOps - Deploy e infraestrutura', value: 'devops', checked: false },
  ];

  // Se pré-selecionados via CLI
  if (preselected) {
    const selected = preselected.split(',').map(a => a.trim());
    return selected;
  }

  const { agents } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'agents',
      message: 'Selecione os agentes ativos:',
      choices: availableAgents,
      validate: (answer) => {
        if (answer.length < 1) {
          return 'Você deve selecionar pelo menos um agente.';
        }
        return true;
      },
    },
  ]);

  return agents;
}

async function processBrainRequest(
  userPrompt: string,
  brainAgent: BrainAgent,
  progressUI: ProgressUI,
  sessionManager: SessionManager
) {
  try {
    // Processar com Brain Agent
    const response = await brainAgent.processPrompt(userPrompt, progressUI);

    if (response.cancelled) {
      console.log(chalk.yellow('⚠️  Operação cancelada pelo usuário'));
      return;
    }

    if (response.error) {
      console.log(chalk.red(`❌ Erro: ${response.error}`));
      return;
    }

    // Mostrar resultado
    displayResult(response);

    // Salvar na memória
    await sessionManager.saveConversation({
      userPrompt,
      brainResponse: response,
      timestamp: new Date(),
    });

  } catch (error) {
    console.error(chalk.red(`❌ Erro ao processar: ${(error as Error).message}`));
  }
}

function displayResult(response: any) {
  console.log(chalk.green('\n✅ Tarefa concluída'));
  
  if (response.summary) {
    console.log(chalk.white(`   ${response.summary}`));
  }

  if (response.filesModified && response.filesModified.length > 0) {
    console.log(chalk.blue('\n📝 Arquivos modificados:'));
    response.filesModified.forEach((file: string) => {
      console.log(chalk.gray(`   - ${file}`));
    });
  }

  if (response.testsRun) {
    console.log(chalk.blue(`\n🧪 Testes executados: ${response.testsRun}`));
  }

  if (response.duration) {
    console.log(chalk.gray(`⏱️  Duração: ${response.duration}ms`));
  }
}

function displayHelp() {
  console.log(chalk.bold('\n📖 Comandos Disponíveis:\n'));
  console.log(chalk.cyan('  /help      ') + chalk.white('- Mostrar esta ajuda'));
  console.log(chalk.cyan('  /agents    ') + chalk.white('- Alterar agentes ativos'));
  console.log(chalk.cyan('  /toggle    ') + chalk.white('- Alternar modo auto-approve'));
  console.log(chalk.cyan('  /history   ') + chalk.white('- Ver histórico de conversas'));
  console.log(chalk.cyan('  /exit      ') + chalk.white('- Sair do chat'));
  
  console.log(chalk.bold('\n💡 Exemplos de Prompts:\n'));
  console.log(chalk.gray('  "Criar sistema de autenticação JWT"'));
  console.log(chalk.gray('  "Adicionar validação de email no formulário"'));
  console.log(chalk.gray('  "Corrigir bug no login"'));
  console.log(chalk.gray('  "Criar testes para o módulo de usuários"\n'));
}

async function displayHistory(sessionManager: SessionManager) {
  const history = await sessionManager.getConversationHistory(10);
  
  if (history.length === 0) {
    console.log(chalk.yellow('📜 Nenhuma conversa anterior'));
    return;
  }

  console.log(chalk.bold('\n📜 Histórico de Conversas:\n'));
  
  history.forEach((conv, idx) => {
    const date = new Date(conv.timestamp).toLocaleString('pt-BR');
    console.log(chalk.cyan(`${idx + 1}. `) + chalk.white(conv.userPrompt));
    console.log(chalk.gray(`   ${date} - ${conv.agentsUsed?.join(', ') || 'N/A'}`));
    if (conv.summary) {
      console.log(chalk.gray(`   → ${conv.summary}`));
    }
    console.log('');
  });
}

async function handleExit(sessionManager: SessionManager) {
  console.log(chalk.yellow('\n👋 Encerrando sessão...'));
  
  const spinner = ora('Salvando estado').start();
  await sessionManager.saveSession();
  spinner.succeed('Sessão salva');
  
  console.log(chalk.green('✓ Até logo!\n'));
}
