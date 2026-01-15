import ora, { Ora } from 'ora';
import chalk from 'chalk';
import cliProgress from 'cli-progress';

interface AgentProgress {
  spinner?: Ora;
  bar?: cliProgress.SingleBar;
  status: 'idle' | 'running' | 'completed' | 'failed';
  startTime?: number;
}

export class ProgressUI {
  private agents: Map<string, AgentProgress> = new Map();
  private multibar?: cliProgress.MultiBar;
  private currentSection?: string;
  private streamBuffer: string = '';

  constructor() {
    // Inicializar multibar para progress bars
    this.multibar = new cliProgress.MultiBar({
      clearOnComplete: false,
      hideCursor: true,
      format: chalk.cyan('{agent}') + ' |{bar}| {percentage}% | {value}/{total} | {task}',
    }, cliProgress.Presets.shades_classic);
  }

  /**
   * Inicia o trabalho de um agente com spinner
   */
  startAgentWork(agentName: string, task: string): void {
    const emoji = this.getAgentEmoji(agentName);
    const spinner = ora({
      text: chalk.white(`${emoji} ${agentName}: ${task}`),
      spinner: 'dots',
      color: 'cyan',
    }).start();

    this.agents.set(agentName, {
      spinner,
      status: 'running',
      startTime: Date.now(),
    });

    // Reset stream buffer for new task
    if (agentName === 'brain') {
      this.resetStreamBuffer();
    }
  }

  /**
   * Atualiza o texto do spinner de um agente
   */
  updateAgentTask(agentName: string, task: string): void {
    const agent = this.agents.get(agentName);
    if (agent && agent.spinner) {
      const emoji = this.getAgentEmoji(agentName);
      agent.spinner.text = chalk.white(`${emoji} ${agentName}: ${task}`);
    }
  }

  /**
   * Updates streaming thinking process
   */
  streamUpdate(text: string): void {
    if (this.currentSection) {
      if (this.agents.size > 0 && this.agents.get('brain')) {
        // If brain agent is running (planning phase), update its spinner
        const agent = this.agents.get('brain');
        if (agent && agent.spinner) {
          // Accumulate buffer
          this.streamBuffer += text;

          // Get last 60 chars for "scrolling" effect
          const cleanBuffer = this.streamBuffer.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').trim();
          const windowSize = 60;
          const displayWindow = cleanBuffer.length > windowSize
            ? '...' + cleanBuffer.slice(-windowSize)
            : cleanBuffer;

          agent.spinner.text = `${chalk.cyan('🧠 Brain')}: ${chalk.gray(displayWindow)}`;
        }
      } else {
        // Fallback if no brain agent spinner
        process.stdout.write(text);
      }
    }
  }

  /**
   * Limpa o buffer de stream
   */
  resetStreamBuffer(): void {
    this.streamBuffer = '';
  }

  /**
   * Cria uma progress bar para um agente
   */
  createAgentProgressBar(agentName: string, total: number, task: string): void {
    const agent = this.agents.get(agentName);

    // Parar spinner se existir
    if (agent?.spinner) {
      agent.spinner.stop();
    }

    const bar = this.multibar!.create(total, 0, {
      agent: `${this.getAgentEmoji(agentName)} ${agentName}`,
      task,
    });

    this.agents.set(agentName, {
      ...agent,
      bar,
      status: 'running',
    });
  }

  /**
   * Atualiza o progresso de um agente
   */
  updateAgentProgress(agentName: string, current: number, task?: string): void {
    const agent = this.agents.get(agentName);
    if (agent?.bar) {
      agent.bar.update(current, task ? { task } : undefined);
    }
  }

  /**
   * Completa o trabalho de um agente com sucesso
   */
  completeAgent(agentName: string, result: string): void {
    const agent = this.agents.get(agentName);
    if (!agent) return;

    const duration = agent.startTime ? Date.now() - agent.startTime : 0;
    const durationText = this.formatDuration(duration);
    const emoji = this.getAgentEmoji(agentName);

    if (agent.spinner) {
      agent.spinner.succeed(
        chalk.green(`${emoji} ${agentName}: ${result}`) +
        chalk.gray(` (${durationText})`)
      );
    }

    if (agent.bar) {
      agent.bar.stop();
    }

    agent.status = 'completed';
  }

  /**
   * Marca um agente como falho
   */
  failAgent(agentName: string, error: string): void {
    const agent = this.agents.get(agentName);
    if (!agent) return;

    const emoji = this.getAgentEmoji(agentName);

    if (agent.spinner) {
      agent.spinner.fail(chalk.red(`${emoji} ${agentName}: ${error}`));
    }

    if (agent.bar) {
      agent.bar.stop();
    }

    agent.status = 'failed';
  }

  /**
   * Mostra uma seção (ex: "🧠 Analisando requisito...")
   */
  startSection(title: string): void {
    this.currentSection = title;
    console.log(chalk.bold.cyan(`\n${title}`));
  }

  /**
   * Mostra um item de lista na seção atual
   */
  addSectionItem(text: string, level: number = 1): void {
    const indent = '   '.repeat(level - 1);
    console.log(chalk.gray(`${indent}├─ ${text}`));
  }

  /**
   * Finaliza uma seção
   */
  endSection(summary?: string): void {
    if (summary) {
      console.log(chalk.gray(`   └─ ${summary}\n`));
    }
    this.currentSection = undefined;
  }

  /**
   * Mostra uma linha de separação
   */
  showSeparator(): void {
    console.log(chalk.gray('━'.repeat(60)));
  }

  /**
   * Mostra informação genérica
   */
  info(message: string): void {
    console.log(chalk.blue('ℹ ') + chalk.white(message));
  }

  /**
   * Mostra warning
   */
  warn(message: string): void {
    console.log(chalk.yellow('⚠ ') + chalk.white(message));
  }

  /**
   * Mostra erro
   */
  error(message: string): void {
    console.log(chalk.red('✗ ') + chalk.white(message));
  }

  /**
   * Mostra sucesso
   */
  success(message: string): void {
    console.log(chalk.green('✓ ') + chalk.white(message));
  }

  /**
   * Limpa todos os progress indicators
   */
  clear(): void {
    // Parar todos os spinners
    for (const agent of this.agents.values()) {
      if (agent.spinner && agent.status === 'running') {
        agent.spinner.stop();
      }
      if (agent.bar) {
        agent.bar.stop();
      }
    }

    if (this.multibar) {
      this.multibar.stop();
    }

    this.agents.clear();
  }

  /**
   * Obtém emoji para o agente
   */
  private getAgentEmoji(agentName: string): string {
    const emojis: Record<string, string> = {
      brain: '🧠',
      planner: '📋',
      developer: '👨‍💻',
      qa: '🧪',
      docs: '📚',
      devops: '🚀',
    };

    return emojis[agentName.toLowerCase()] || '🤖';
  }

  /**
   * Formata duração em ms para texto legível
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    }

    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }
}
