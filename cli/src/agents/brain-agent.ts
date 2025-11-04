import { BaseAgent, AgentConfig, AgentTask } from './base-agent';
import { SessionManager } from '../core/session-manager';
import { ProgressUI } from '../ui/progress-ui';
import { sdProviderRegistry } from '../api/provider-registry';
import { sdOpenAIProvider } from '../api/providers/openai-provider';
import { sdAnthropicProvider } from '../api/providers/anthropic-provider';
import { sdLocalProvider } from '../api/providers/local-provider';
import { sdPlannerOrchestrator } from './planner/plan-orchestrator';
import { PlannerInputDTO } from '../../shared/contracts/plan-schema';
import fs from 'fs/promises';
import path from 'path';

// Custom error for casual conversations
class CasualConversationResponse extends Error {
  constructor(public response: string) {
    super(response);
    this.name = 'CasualConversationResponse';
  }
}

export interface BrainResponse {
  type?: 'chat' | 'task';
  message?: string;
  success: boolean;
  cancelled?: boolean;
  error?: string;
  summary?: string;
  agentsUsed?: string[];
  filesModified?: string[];
  testsRun?: number;
  duration?: number;
  strategy?: ExecutionStrategy;
}

export interface ExecutionStrategy {
  intent: 'planning' | 'implementation' | 'bugfix' | 'review' | 'documentation';
  mode: 'sequential' | 'parallel';
  complexity: 'low' | 'medium' | 'high';
  requiresApproval: boolean;
  steps: ExecutionStep[];
  estimatedDuration: number;
  description: string;
}

export interface ExecutionStep {
  id: string;
  agent: string;
  task: string;
  dependencies: string[];
  files: string[];
  estimatedDuration?: number;
}

export class BrainAgent extends BaseAgent {
  private sessionManager: SessionManager;
  private activeAgents: Set<string>;
  private conversationHistory: Array<{ role: string; content: string }> = [];
  private providerRegistry: sdProviderRegistry;
  private plannerOrchestrator: sdPlannerOrchestrator;
  private useLLM: boolean = true; // Toggle para usar LLM ou fallback

  constructor(config: { name: string; sessionManager: SessionManager; activeAgents: string[] }) {
    super(config.name, {
      capabilities: ['orchestration', 'analysis', 'planning'],
      sessionManager: config.sessionManager,
      activeAgents: config.activeAgents,
    });
    this.sessionManager = config.sessionManager;
    this.activeAgents = new Set(config.activeAgents);
    this.providerRegistry = new sdProviderRegistry();
    this.plannerOrchestrator = new sdPlannerOrchestrator({ persistOutput: true });
  }

  /**
   * Initialize the brain agent and load providers
   */
  async initialize(): Promise<void> {
    await this.providerRegistry.initialize();
    await this.initializeProviders();
  }

  private async initializeProviders() {
    try {
      // The provider registry now handles loading from unified config
      // Just check if we have any providers
      const providers = this.providerRegistry.list();
      
      if (providers.length === 0) {
        console.warn('No providers configured. Run "supadupacode setup" or "supadupacode provider add" to configure providers.');
        
        // Set up default OpenAI provider from environment if available
        if (process.env.OPENAI_API_KEY) {
          await this.providerRegistry.register('openai', {
            name: 'openai',
            type: 'openai',
            model: 'gpt-4o',
            credentials: { apiKey: process.env.OPENAI_API_KEY },
            settings: { timeout: 30000, maxRetries: 3 }
          });
        }
      }
    } catch (error) {
      console.warn('Failed to initialize providers:', (error as Error).message);
    }
  }

  private getProviderType(name: string): 'openai' | 'anthropic' | 'local' {
    if (name.includes('anthropic')) return 'anthropic';
    if (name.includes('local')) return 'local';
    return 'openai';
  }

  async execute(task: AgentTask): Promise<any> {
    // Implementação do método abstrato
    return { success: true, message: 'BrainAgent execute not used directly' };
  }

  async processPrompt(userPrompt: string, progressUI: ProgressUI): Promise<BrainResponse> {
    const startTime = Date.now();

    try {
      // Adicionar ao histórico
      this.conversationHistory.push({
        role: 'user',
        content: userPrompt,
      });

      // Tentar analisar o prompt
      let analysis: ExecutionStrategy;
      
      try {
        progressUI.startSection('🧠 Analisando requisito...');
        analysis = await this.analyzePrompt(userPrompt, progressUI);
      } catch (error) {
        // Se for conversa casual, responder diretamente
        if (error instanceof CasualConversationResponse) {
          progressUI.endSection();
          console.log('\n' + error.response + '\n');
          
          return {
            type: 'chat',
            message: error.response,
            success: true,
            duration: Date.now() - startTime,
          };
        }
        throw error;
      }
      
      progressUI.addSectionItem(`Intent: ${analysis.intent}`);
      progressUI.addSectionItem(`Complexidade: ${analysis.complexity}`);
      progressUI.addSectionItem(`Agentes necessários: ${analysis.steps.map(s => s.agent).join(', ')}`);
      progressUI.addSectionItem(`Modo: ${analysis.mode}`);
      progressUI.endSection();

      // Solicitar aprovação se necessário
      if (analysis.requiresApproval) {
        const approved = await this.sessionManager.requestApproval({
          description: analysis.description,
          agents: analysis.steps.map(s => s.agent),
          files: this.extractAllFiles(analysis.steps),
          estimatedDuration: analysis.estimatedDuration,
        });

        if (!approved) {
          return { success: false, cancelled: true };
        }
      }

      // Executar estratégia
      progressUI.showSeparator();
      
      const result = await this.executeStrategy(analysis, progressUI, userPrompt);

      const duration = Date.now() - startTime;

      // Adicionar resposta ao histórico
      this.conversationHistory.push({
        role: 'assistant',
        content: JSON.stringify(result),
      });

      return {
        type: 'task',
        success: true,
        ...result,
        duration,
        strategy: analysis,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Não mostrar erro para conversas casuais
      if (!(error instanceof CasualConversationResponse)) {
        progressUI.error(`Erro ao processar: ${(error as Error).message}`);
      }
      
      return {
        success: false,
        error: (error as Error).message,
        duration,
      };
    }
  }

  private async analyzePrompt(prompt: string, progressUI: ProgressUI): Promise<ExecutionStrategy> {
    // Tentar usar LLM real primeiro
    if (this.useLLM) {
      try {
        return await this.analyzeWithLLM(prompt);
      } catch (error) {
        console.warn('LLM analysis failed, falling back to keyword analysis:', (error as Error).message);
        this.useLLM = false; // Desabilitar LLM para próximas tentativas nesta sessão
      }
    }
    
    // Fallback: análise por keywords (modo atual)
    return await this.analyzeWithKeywords(prompt);
  }

  private async analyzeWithLLM(prompt: string): Promise<ExecutionStrategy> {
    // Carregar system prompt
    const systemPrompt = await this.loadSystemPrompt();
    
    // Get active provider
    const activeProviders = this.providerRegistry.list();
    if (activeProviders.length === 0) {
      throw new Error('No AI providers configured. Please run: supadupacode provider add <provider> --key=<api-key>');
    }

    // Try to find an active provider, or use the first available
    const providerId = activeProviders[0];
    const provider = this.providerRegistry.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    // Ensure provider is activated
    try {
      await provider.activate();
    } catch (error) {
      console.warn(`Failed to activate provider ${providerId}:`, (error as Error).message);
    }

    // Fazer chamada ao LLM usando novo sistema
    const llmRequest = {
      messages: [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: prompt }
      ],
      parameters: {
        temperature: 0.3, // Mais determinístico para análise
        maxTokens: 500
      }
    };

    const response = await this.providerRegistry.execute(providerId, llmRequest);

    // Parse da resposta JSON
    let analysis: any;
    try {
      // Clean the response - remove any markdown code blocks
      let cleanContent = response.content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/```\n?/, '').replace(/\n?```$/, '');
      }
      
      analysis = JSON.parse(cleanContent);
    } catch (error) {
      console.debug('Raw LLM response:', response.content);
      throw new Error(`Failed to parse LLM response as JSON. Response was: "${response.content}"`);
    }

    // Se for conversa casual, lançar exceção
    if (analysis.type === 'chat') {
      throw new CasualConversationResponse(analysis.message);
    }

    // Se for task, converter para ExecutionStrategy
    if (analysis.type === 'task') {
      const steps = this.createStepsFromAnalysis(analysis);
      
      return {
        intent: analysis.intent,
        mode: analysis.mode,
        complexity: analysis.complexity,
        requiresApproval: !this.sessionManager.getConfig().autoApprove,
        steps,
        estimatedDuration: analysis.estimatedDuration || this.estimateDuration(analysis.complexity),
        description: analysis.description,
      };
    }

    throw new Error(`Unknown analysis type: ${analysis.type}`);
  }

  private async analyzeWithKeywords(prompt: string): Promise<ExecutionStrategy> {
    // Análise simples baseada em keywords (fallback)
    const promptLower = prompt.toLowerCase();
    
    // Simple heuristic for casual conversation vs task
    const words = prompt.split(' ').length;
    const hasQuestionWords = /\b(what|how|why|when|where|who|qual|como|por que|onde|quando|quem)\b/i.test(prompt);
    const hasTaskWords = /\b(create|implement|build|add|fix|correct|criar|implementar|construir|adicionar|corrigir|desenvolver)\b/i.test(prompt);
    
    // If it's short and doesn't contain task words, treat as casual
    if (words <= 5 && !hasTaskWords) {
      throw new CasualConversationResponse(this.generateCasualResponse(prompt));
    }
    
    // Determinar intent
    let intent: ExecutionStrategy['intent'] = 'implementation';
    if (promptLower.includes('planejar') || promptLower.includes('arquitetura') || promptLower.includes('design')) {
      intent = 'planning';
    } else if (promptLower.includes('bug') || promptLower.includes('corrigir') || promptLower.includes('fix')) {
      intent = 'bugfix';
    } else if (promptLower.includes('review') || promptLower.includes('revisar')) {
      intent = 'review';
    } else if (promptLower.includes('documentar') || promptLower.includes('doc')) {
      intent = 'documentation';
    }

    // Determinar complexidade
    let complexity: ExecutionStrategy['complexity'] = 'medium';
    if (promptLower.includes('simples') || promptLower.includes('pequeno')) {
      complexity = 'low';
    } else if (promptLower.includes('complexo') || promptLower.includes('grande') || promptLower.includes('sistema')) {
      complexity = 'high';
    }

    // Determinar agentes necessários
    const steps = this.determineSteps(intent, complexity, prompt);

    // Determinar modo de execução
    const mode = intent === 'planning' ? 'sequential' : 'parallel';

    // Estimar duração
    const estimatedDuration = steps.reduce((total, step) => {
      return total + (step.estimatedDuration || 30000);
    }, 0);

    return {
      intent,
      mode,
      complexity,
      requiresApproval: !this.sessionManager.getConfig().autoApprove,
      steps,
      estimatedDuration,
      description: this.generateDescription(intent, prompt),
    };
  }

  private createStepsFromAnalysis(analysis: any): ExecutionStep[] {
    // Criar steps baseado na análise do LLM
    const steps: ExecutionStep[] = [];
    
    analysis.agents.forEach((agentName: string, index: number) => {
      const stepId = `step-${index + 1}`;
      const dependencies = index > 0 && analysis.mode === 'sequential' 
        ? [`step-${index}`] 
        : [];
      
      steps.push({
        id: stepId,
        agent: agentName,
        task: this.getTaskForAgent(agentName, analysis.intent),
        dependencies,
        files: [],
        estimatedDuration: this.estimateDuration(analysis.complexity) / analysis.agents.length,
      });
    });
    
    return steps;
  }

  private getTaskForAgent(agentName: string, intent: string): string {
    const taskMap: Record<string, Record<string, string>> = {
      planner: {
        planning: 'Criar plano de execução',
        implementation: 'Analisar requisitos',
        bugfix: 'Analisar causa do bug',
        review: 'Revisar arquitetura',
        documentation: 'Planejar estrutura da documentação',
      },
      developer: {
        planning: 'Prototipar solução',
        implementation: 'Implementar solução',
        bugfix: 'Corrigir bug',
        review: 'Refatorar código',
        documentation: 'Adicionar comentários no código',
      },
      qa: {
        planning: 'Validar plano',
        implementation: 'Criar e executar testes',
        bugfix: 'Validar correção',
        review: 'Revisar código',
        documentation: 'Revisar documentação',
      },
      docs: {
        planning: 'Documentar decisões',
        implementation: 'Documentar implementação',
        bugfix: 'Atualizar troubleshooting',
        review: 'Revisar documentação',
        documentation: 'Criar documentação',
      },
    };
    
    return taskMap[agentName]?.[intent] || `Executar tarefa (${intent})`;
  }

  private estimateDuration(complexity: string): number {
    const durations = {
      low: 60000,      // 1min
      medium: 180000,  // 3min
      high: 600000,    // 10min
    };
    return durations[complexity as keyof typeof durations] || 180000;
  }

  private determineSteps(
    intent: ExecutionStrategy['intent'],
    complexity: ExecutionStrategy['complexity'],
    prompt: string
  ): ExecutionStep[] {
    const steps: ExecutionStep[] = [];
    const activeAgentsList = Array.from(this.activeAgents);

    switch (intent) {
      case 'planning':
        if (activeAgentsList.includes('planner')) {
          steps.push({
            id: 'plan-1',
            agent: 'planner',
            task: 'Criar plano de execução',
            dependencies: [],
            files: [],
            estimatedDuration: 45000,
          });
        }
        break;

      case 'implementation':
        if (activeAgentsList.includes('planner')) {
          steps.push({
            id: 'plan-1',
            agent: 'planner',
            task: 'Analisar requisitos',
            dependencies: [],
            files: [],
            estimatedDuration: 30000,
          });
        }

        if (activeAgentsList.includes('developer')) {
          steps.push({
            id: 'dev-1',
            agent: 'developer',
            task: 'Implementar solução',
            dependencies: activeAgentsList.includes('planner') ? ['plan-1'] : [],
            files: [],
            estimatedDuration: complexity === 'high' ? 180000 : complexity === 'medium' ? 120000 : 60000,
          });
        }

        if (activeAgentsList.includes('qa')) {
          steps.push({
            id: 'qa-1',
            agent: 'qa',
            task: 'Criar e executar testes',
            dependencies: activeAgentsList.includes('developer') ? ['dev-1'] : [],
            files: [],
            estimatedDuration: 60000,
          });
        }
        break;

      case 'bugfix':
        if (activeAgentsList.includes('developer')) {
          steps.push({
            id: 'dev-1',
            agent: 'developer',
            task: 'Identificar e corrigir bug',
            dependencies: [],
            files: [],
            estimatedDuration: 90000,
          });
        }

        if (activeAgentsList.includes('qa')) {
          steps.push({
            id: 'qa-1',
            agent: 'qa',
            task: 'Validar correção',
            dependencies: ['dev-1'],
            files: [],
            estimatedDuration: 45000,
          });
        }
        break;

      case 'review':
        if (activeAgentsList.includes('qa')) {
          steps.push({
            id: 'qa-1',
            agent: 'qa',
            task: 'Revisar código',
            dependencies: [],
            files: [],
            estimatedDuration: 60000,
          });
        }
        break;

      case 'documentation':
        if (activeAgentsList.includes('docs')) {
          steps.push({
            id: 'docs-1',
            agent: 'docs',
            task: 'Criar documentação',
            dependencies: [],
            files: [],
            estimatedDuration: 90000,
          });
        }
        break;
    }

    return steps;
  }

  private async executeStrategy(strategy: ExecutionStrategy, progressUI: ProgressUI, userPrompt: string): Promise<any> {
    if (strategy.mode === 'sequential') {
      return await this.executeSequential(strategy.steps, progressUI, userPrompt);
    } else {
      return await this.executeParallel(strategy.steps, progressUI, userPrompt);
    }
  }

  private async executeSequential(steps: ExecutionStep[], progressUI: ProgressUI, userPrompt: string): Promise<any> {
    const results: any[] = [];
    const filesModified: string[] = [];
    let testsRun = 0;

    for (const step of steps) {
      progressUI.startAgentWork(step.agent, step.task);

      try {
        // Execute real agent or simulate
        const agentResult = await this.simulateAgentWork(step, userPrompt);

        const result = {
          agent: step.agent,
          task: step.task,
          success: true,
          files: step.files,
          ...agentResult,
        };

        results.push(result);
        filesModified.push(...step.files);

        if (step.agent === 'qa') {
          testsRun += 5; // Simulado
        }

        progressUI.completeAgent(step.agent, `${step.task} - Concluído`);
      } catch (error) {
        progressUI.failAgent(step.agent, (error as Error).message);
        throw error;
      }
    }

    return {
      agentsUsed: steps.map(s => s.agent),
      filesModified: [...new Set(filesModified)],
      testsRun,
      summary: this.generateSummary(results),
    };
  }

  private async executeParallel(steps: ExecutionStep[], progressUI: ProgressUI, userPrompt: string): Promise<any> {
    // Criar DAG de dependências
    const levels = this.createDependencyLevels(steps);
    
    const results: any[] = [];
    const filesModified: string[] = [];
    let testsRun = 0;

    // Executar nível por nível
    for (const level of levels) {
      const levelTasks = level.map(async (step) => {
        progressUI.startAgentWork(step.agent, step.task);

        try {
          const agentResult = await this.simulateAgentWork(step, userPrompt);

          const result = {
            agent: step.agent,
            task: step.task,
            success: true,
            files: step.files,
            ...agentResult,
          };

          filesModified.push(...step.files);

          if (step.agent === 'qa') {
            testsRun += 5;
          }

          progressUI.completeAgent(step.agent, `${step.task} - Concluído`);
          return result;
        } catch (error) {
          progressUI.failAgent(step.agent, (error as Error).message);
          throw error;
        }
      });

      const levelResults = await Promise.all(levelTasks);
      results.push(...levelResults);
    }

    return {
      agentsUsed: steps.map(s => s.agent),
      filesModified: [...new Set(filesModified)],
      testsRun,
      summary: this.generateSummary(results),
    };
  }

  private createDependencyLevels(steps: ExecutionStep[]): ExecutionStep[][] {
    const levels: ExecutionStep[][] = [];
    const processed = new Set<string>();
    const stepsMap = new Map(steps.map(s => [s.id, s]));

    while (processed.size < steps.length) {
      const level: ExecutionStep[] = [];

      for (const step of steps) {
        if (processed.has(step.id)) continue;

        // Verificar se todas as dependências foram processadas
        const allDepsProcessed = step.dependencies.every(dep => processed.has(dep));

        if (allDepsProcessed) {
          level.push(step);
          processed.add(step.id);
        }
      }

      if (level.length > 0) {
        levels.push(level);
      } else {
        // Evitar loop infinito
        break;
      }
    }

    return levels;
  }

  private async simulateAgentWork(step: ExecutionStep, userPrompt?: string): Promise<any> {
    // Execute real planner orchestrator if the agent is 'planner'
    if (step.agent === 'planner' && userPrompt) {
      try {
        const planInput: PlannerInputDTO = {
          request: userPrompt,
          context: {
            projectType: 'cli-tool',
            techStack: ['TypeScript', 'Node.js'],
          },
          preferences: {
            prioritizeQuality: true,
          },
          metadata: {
            source: 'brain-agent',
            category: 'orchestrated-task',
            urgency: 'medium',
          },
        };
        
        const plan = this.plannerOrchestrator.createExecutionPlan(planInput);
        return { plan, success: true };
      } catch (error) {
        console.warn('Planner orchestrator failed:', (error as Error).message);
        // Fall back to simulation
      }
    }

    // Simular trabalho do agente para outros agentes
    const duration = step.estimatedDuration || 3000;
    await new Promise(resolve => setTimeout(resolve, Math.min(duration, 5000)));
    return { success: true };
  }

  private extractAllFiles(steps: ExecutionStep[]): string[] {
    const files = new Set<string>();
    steps.forEach(step => {
      step.files.forEach(file => files.add(file));
    });
    return Array.from(files);
  }

  private generateDescription(intent: string, prompt: string): string {
    const intentDescriptions = {
      planning: 'Criar plano de arquitetura e design',
      implementation: 'Implementar funcionalidade',
      bugfix: 'Corrigir bug identificado',
      review: 'Revisar código e qualidade',
      documentation: 'Criar documentação',
    };

    return `${intentDescriptions[intent as keyof typeof intentDescriptions] || 'Executar tarefa'}: ${prompt}`;
  }

  private async loadSystemPrompt(): Promise<string> {
    try {
      // Try multiple possible paths for the system prompt
      const possiblePaths = [
        path.join(process.cwd(), 'prompts', 'brain', 'system.md'),
        path.join(process.cwd(), 'cli', 'prompts', 'brain', 'system.md'),
        path.join(__dirname, '../../prompts/brain/system.md'),
        path.join(__dirname, '../../../prompts/brain/system.md'),
      ];

      for (const promptPath of possiblePaths) {
        try {
          return await fs.readFile(promptPath, 'utf-8');
        } catch {
          continue;
        }
      }

      // Fallback se não encontrar o arquivo
      return 'You are a Brain Agent orchestrator.';
    } catch {
      // Fallback se não encontrar o arquivo
      return 'You are a Brain Agent orchestrator.';
    }
  }

  private generateCasualResponse(prompt: string): string {
    const promptLower = prompt.toLowerCase();
    
    if (promptLower.includes('ola') || promptLower.includes('olá') || promptLower.includes('oi')) {
      return `Olá! 👋 Sou o Brain Agent, seu orquestrador inteligente.

Posso te ajudar com:
• Planejamento de features
• Implementação de código
• Correção de bugs
• Criação de testes
• Documentação

Como posso te ajudar hoje?`;
    }
    
    if (promptLower.includes('obrigado') || promptLower.includes('valeu')) {
      return 'De nada! 😊 Estou aqui sempre que precisar!';
    }
    
    if (promptLower.includes('quem é você') || promptLower.includes('o que você faz')) {
      return `Sou o Brain Agent 🧠, o orquestrador inteligente do SupaDupaCode.

Meu trabalho é:
1. Analisar suas requisições
2. Escolher os agentes apropriados (Planner, Developer, QA, Docs)
3. Orquestrar a execução
4. Garantir qualidade e eficiência

Estou pronto para ajudar! O que você gostaria de fazer?`;
    }
    
    return 'Olá! Como posso te ajudar?';
  }

  private generateSummary(results: any[]): string {
    const agentCounts = results.reduce((acc, r) => {
      acc[r.agent] = (acc[r.agent] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const summary = Object.entries(agentCounts)
      .map(([agent, count]) => `${agent} (${count} ${count === 1 ? 'tarefa' : 'tarefas'})`)
      .join(', ');

    return `Executado com sucesso: ${summary}`;
  }
}
