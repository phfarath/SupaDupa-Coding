import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';

export interface SessionConfig {
  id: string;
  workspacePath: string;
  autoApprove: boolean;
  activeAgents: string[];
  createdAt: Date;
  lastActiveAt: Date;
  preferences: {
    progressStyle: 'spinners' | 'bars' | 'both';
    confirmBeforeModify: boolean;
    saveHistory: boolean;
  };
}

export interface ConversationRecord {
  id: string;
  sessionId: string;
  userPrompt: string;
  brainResponse: any;
  agentsUsed?: string[];
  summary?: string;
  timestamp: Date;
  filesModified?: string[];
  duration?: number;
}

export class SessionManager {
  private config: SessionConfig;
  private sessionDir: string;
  private conversationHistory: ConversationRecord[] = [];
  private indexedFilesCount: number = 0;

  constructor(options: { workspacePath: string; autoApprove: boolean }) {
    this.sessionDir = path.join(options.workspacePath, '.supadupacode');
    
    this.config = {
      id: uuidv4(),
      workspacePath: options.workspacePath,
      autoApprove: options.autoApprove,
      activeAgents: [],
      createdAt: new Date(),
      lastActiveAt: new Date(),
      preferences: {
        progressStyle: 'both',
        confirmBeforeModify: true,
        saveHistory: true,
      },
    };
  }

  async initialize(): Promise<void> {
    // Criar diretório de sessão se não existir
    await fs.mkdir(this.sessionDir, { recursive: true });
    await fs.mkdir(path.join(this.sessionDir, 'sessions'), { recursive: true });
    await fs.mkdir(path.join(this.sessionDir, 'conversations'), { recursive: true });

    // Tentar carregar sessão anterior
    const sessionPath = path.join(this.sessionDir, 'current-session.json');
    
    try {
      const data = await fs.readFile(sessionPath, 'utf-8');
      const savedConfig = JSON.parse(data);
      
      // Restaurar configuração (exceto algumas que são sempre novas)
      this.config = {
        ...savedConfig,
        id: uuidv4(), // Nova sessão
        lastActiveAt: new Date(),
      };
    } catch (error) {
      // Sem sessão anterior, usar config padrão
    }

    // Carregar histórico de conversas
    await this.loadConversationHistory();
  }

  async saveSession(): Promise<void> {
    const sessionPath = path.join(this.sessionDir, 'current-session.json');
    await fs.writeFile(sessionPath, JSON.stringify(this.config, null, 2));

    // Salvar histórico
    const historyPath = path.join(this.sessionDir, 'conversations', `${this.config.id}.json`);
    await fs.writeFile(historyPath, JSON.stringify(this.conversationHistory, null, 2));
  }

  async saveConversation(data: {
    userPrompt: string;
    brainResponse: any;
    timestamp: Date;
  }): Promise<void> {
    const record: ConversationRecord = {
      id: uuidv4(),
      sessionId: this.config.id,
      userPrompt: data.userPrompt,
      brainResponse: data.brainResponse,
      agentsUsed: data.brainResponse.agentsUsed,
      summary: data.brainResponse.summary,
      timestamp: data.timestamp,
      filesModified: data.brainResponse.filesModified,
      duration: data.brainResponse.duration,
    };

    this.conversationHistory.push(record);

    // Salvar incrementalmente
    if (this.config.preferences.saveHistory) {
      await this.saveSession();
    }
  }

  async getConversationHistory(limit?: number): Promise<ConversationRecord[]> {
    const history = [...this.conversationHistory].reverse();
    return limit ? history.slice(0, limit) : history;
  }

  private async loadConversationHistory(): Promise<void> {
    try {
      const conversationsDir = path.join(this.sessionDir, 'conversations');
      const files = await fs.readdir(conversationsDir);
      
      // Carregar última sessão
      if (files.length > 0) {
        files.sort().reverse();
        const lastFile = files[0];
        const data = await fs.readFile(path.join(conversationsDir, lastFile), 'utf-8');
        this.conversationHistory = JSON.parse(data);
      }
    } catch (error) {
      // Sem histórico anterior
      this.conversationHistory = [];
    }
  }

  setActiveAgents(agents: string[]): void {
    this.config.activeAgents = agents;
  }

  getActiveAgents(): string[] {
    return this.config.activeAgents;
  }

  toggleAutoApprove(): void {
    this.config.autoApprove = !this.config.autoApprove;
    const status = this.config.autoApprove ? 'ativado' : 'desativado';
    console.log(`✓ Auto-approve ${status}`);
  }

  getConfig(): SessionConfig {
    return this.config;
  }

  setIndexedFilesCount(count: number): void {
    this.indexedFilesCount = count;
  }

  getIndexedFilesCount(): number {
    return this.indexedFilesCount;
  }

  async requestApproval(action: {
    description: string;
    agents: string[];
    files: string[];
    estimatedDuration?: number;
  }): Promise<boolean> {
    if (this.config.autoApprove) {
      console.log('\n⚡ Auto-approve ativo - Executando ação:');
      this.displayAction(action);
      return true;
    }

    // Mostrar ação proposta
    this.displayAction(action);

    // Aguardar confirmação do usuário
    const inquirer = await import('inquirer');
    const { approved } = await inquirer.default.prompt([
      {
        type: 'confirm',
        name: 'approved',
        message: 'Deseja prosseguir com esta ação?',
        default: true,
      },
    ]);

    return approved;
  }

  private displayAction(action: {
    description: string;
    agents: string[];
    files: string[];
    estimatedDuration?: number;
  }): void {
    console.log(chalk.blue('\n📋 Ação Proposta:'));
    console.log(chalk.white(`   Descrição: ${action.description}`));
    console.log(chalk.white(`   Agentes: ${action.agents.join(', ')}`));
    
    if (action.estimatedDuration) {
      const duration = this.formatDuration(action.estimatedDuration);
      console.log(chalk.white(`   Duração estimada: ${duration}`));
    }
    
    if (action.files.length > 0) {
      console.log(chalk.white(`   Arquivos a modificar:`));
      action.files.forEach(file => {
        console.log(chalk.gray(`      - ${file}`));
      });
    }
    console.log('');
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  }
}
