import { sdProviderRegistry } from '../api/provider-registry';
import { ProviderConfig } from '../../shared/contracts/llm-contracts';

export interface LlmClientConfig {
  provider: 'openai' | 'anthropic' | 'local';
  model?: string;
  apiKey?: string;
  endpoint?: string;
  timeout?: number;
  maxRetries?: number;
}

export class sdLlmClientFactory {
  private static instance: sdLlmClientFactory;
  private registry: sdProviderRegistry;
  private initialized: boolean = false;

  private constructor() {
    this.registry = new sdProviderRegistry();
  }

  static getInstance(): sdLlmClientFactory {
    if (!sdLlmClientFactory.instance) {
      sdLlmClientFactory.instance = new sdLlmClientFactory();
    }
    return sdLlmClientFactory.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.registry.initialize();
    await this.loadDefaultProviders();
    this.initialized = true;
  }

  private async loadDefaultProviders(): Promise<void> {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      const config: ProviderConfig = {
        type: 'openai',
        model: process.env.OPENAI_MODEL || 'gpt-4',
        endpoint: process.env.OPENAI_ENDPOINT || 'https://api.openai.com/v1',
        credentials: {
          apiKey: openaiKey,
        },
        settings: {
          temperature: 0.7,
          maxTokens: 4096,
        },
      };

      try {
        await this.registry.register('openai-default', config);
      } catch (error) {
        console.warn('Failed to register default OpenAI provider:', (error as Error).message);
      }
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      const config: ProviderConfig = {
        type: 'anthropic',
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
        endpoint: process.env.ANTHROPIC_ENDPOINT || 'https://api.anthropic.com/v1',
        credentials: {
          apiKey: anthropicKey,
        },
        settings: {
          temperature: 0.7,
          maxTokens: 4096,
        },
      };

      try {
        await this.registry.register('anthropic-default', config);
      } catch (error) {
        console.warn('Failed to register default Anthropic provider:', (error as Error).message);
      }
    }

    const localEndpoint = process.env.LOCAL_PROVIDER_ENDPOINT;
    if (localEndpoint) {
      const config: ProviderConfig = {
        type: 'local',
        model: process.env.LOCAL_MODEL || 'llama3',
        endpoint: localEndpoint,
        credentials: {},
        settings: {
          temperature: 0.7,
          maxTokens: 4096,
        },
      };

      try {
        await this.registry.register('local-default', config);
      } catch (error) {
        console.warn('Failed to register default Local provider:', (error as Error).message);
      }
    }
  }

  getRegistry(): sdProviderRegistry {
    if (!this.initialized) {
      throw new Error('LLM Client Factory not initialized. Call initialize() first.');
    }
    return this.registry;
  }

  async createProvider(config: LlmClientConfig): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    const providerId = `${config.provider}-${Date.now()}`;
    
    const providerConfig: ProviderConfig = {
      type: config.provider,
      model: config.model || this.getDefaultModel(config.provider),
      endpoint: config.endpoint || this.getDefaultEndpoint(config.provider),
      credentials: config.apiKey ? { apiKey: config.apiKey } : {},
      settings: {
        temperature: 0.7,
        maxTokens: 4096,
        timeout: config.timeout || 30000,
      },
    };

    await this.registry.register(providerId, providerConfig);
    return providerId;
  }

  private getDefaultModel(provider: string): string {
    switch (provider) {
      case 'openai':
        return 'gpt-4';
      case 'anthropic':
        return 'claude-3-5-sonnet-20241022';
      case 'local':
        return 'llama3';
      default:
        return 'gpt-4';
    }
  }

  private getDefaultEndpoint(provider: string): string {
    switch (provider) {
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'anthropic':
        return 'https://api.anthropic.com/v1';
      case 'local':
        return 'http://localhost:11434/v1';
      default:
        return '';
    }
  }

  getDefaultProviderId(): string {
    const llmProvider = process.env.LLM_PROVIDER?.toLowerCase() || 'openai';
    return `${llmProvider}-default`;
  }
}

export const llmClientFactory = sdLlmClientFactory.getInstance();
