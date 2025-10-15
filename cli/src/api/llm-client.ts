import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { detectJsonModeSupport, formatModelName, getModelsForProvider, ModelInfo } from './model-detector';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMCallOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
  stopSequences?: string[];
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  finishReason?: string;
}

export class LLMClient {
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(process.cwd(), '.supadupacode', 'config.json');
  }

  private async loadConfig(): Promise<any> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`Failed to load config from ${this.configPath}: ${(error as Error).message}`);
    }
  }

  async call(
    agentName: string,
    messages: LLMMessage[],
    options: LLMCallOptions = {}
  ): Promise<LLMResponse> {
    // Pegar mapping do agente
    const config = await this.loadConfig();
    const mapping = config.agentMappings?.find((m: any) => m.agentName === agentName);
    
    if (!mapping) {
      throw new Error(`No provider mapping found for agent: ${agentName}`);
    }

    // Pegar provider configurado
    const provider = config.providers?.find(p => p.name === mapping.providerName);
    
    if (!provider) {
      throw new Error(`Provider not found: ${mapping.providerName}`);
    }

    if (!provider.enabled) {
      throw new Error(`Provider is disabled: ${mapping.providerName}`);
    }

    // Determinar modelo (ordem de prioridade: options > mapping > provider)
    const model = options.model || mapping.model || provider.model;

    // Fazer chamada baseada no provider
    switch (provider.name) {
      case 'openai':
        return await this.callOpenAI(provider, messages, model, options);
      case 'anthropic':
        return await this.callAnthropic(provider, messages, model, options);
      case 'google':
        return await this.callGoogle(provider, messages, model, options);
      case 'ollama':
        return await this.callOllama(provider, messages, model, options);
      default:
        throw new Error(`Unsupported provider: ${provider.name}`);
    }
  }

  /**
   * Fetch available models from OpenAI API
   */
  async fetchAvailableModels(providerName: string): Promise<ModelInfo[]> {
    const config = await this.loadConfig();
    const provider = config.providers?.find((p: any) => p.name === providerName);
    
    if (!provider) {
      throw new Error(`Provider not found: ${providerName}`);
    }

    if (provider.name === 'openai') {
      return await this.fetchOpenAIModels(provider);
    } else if (provider.name === 'anthropic') {
      return this.getStaticModels('anthropic');
    } else if (provider.name === 'google') {
      return this.getStaticModels('google');
    } else if (provider.name === 'ollama') {
      return await this.fetchOllamaModels(provider);
    }

    return [];
  }

  private async fetchOpenAIModels(provider: any): Promise<ModelInfo[]> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data: any = await response.json();
      
      // Filtrar apenas modelos GPT
      return data.data
        .filter((m: any) => m.id.startsWith('gpt'))
        .map((m: any) => ({
          id: m.id,
          name: formatModelName(m.id),
          provider: 'openai' as const,
          capabilities: {
            supportsJsonMode: detectJsonModeSupport(m.id),
            contextWindow: this.getContextWindowFromId(m.id),
            pricing: this.getPricingFromId(m.id),
            features: this.getFeaturesFromId(m.id),
          },
        }))
        .sort((a: any, b: any) => {
          // Ordenar: GPT-4 Turbo > GPT-4 > GPT-3.5 Turbo
          if (a.id.includes('gpt-4-turbo')) return -1;
          if (b.id.includes('gpt-4-turbo')) return 1;
          if (a.id.includes('gpt-4') && !b.id.includes('gpt-4')) return -1;
          if (b.id.includes('gpt-4') && !a.id.includes('gpt-4')) return 1;
          return a.id.localeCompare(b.id);
        });
    } catch (error) {
      console.warn('Failed to fetch OpenAI models, using static list');
      return this.getStaticModels('openai');
    }
  }

  private async fetchOllamaModels(provider: any): Promise<ModelInfo[]> {
    try {
      const endpoint = provider.endpoint || 'http://localhost:11434';
      const response = await fetch(`${endpoint}/api/tags`);

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data: any = await response.json();
      
      return data.models.map((m: any) => ({
        id: m.name,
        name: `${m.name} (${Math.floor(m.size / 1e9)}GB)`,
        provider: 'ollama' as const,
        capabilities: {
          supportsJsonMode: false,
          contextWindow: 4096,
          pricing: { input: 0, output: 0 },
          features: [],
        },
      }));
    } catch (error) {
      console.warn('Failed to fetch Ollama models, using static list');
      return this.getStaticModels('ollama');
    }
  }

  private getStaticModels(provider: 'openai' | 'anthropic' | 'google' | 'ollama'): ModelInfo[] {
    const modelIds = getModelsForProvider(provider);
    
    return modelIds.map(id => ({
      id,
      name: formatModelName(id),
      provider,
      capabilities: {
        supportsJsonMode: detectJsonModeSupport(id),
        contextWindow: this.getContextWindowFromId(id),
        pricing: this.getPricingFromId(id),
        features: this.getFeaturesFromId(id),
      },
    }));
  }

  private getContextWindowFromId(modelId: string): number {
    if (modelId.includes('gpt-4-turbo') || modelId.includes('-1106') || modelId.includes('-0125')) return 128000;
    if (modelId.includes('gpt-4')) return 8192;
    if (modelId.includes('gpt-3.5-turbo-16k')) return 16385;
    if (modelId.includes('gpt-3.5-turbo')) return 4096;
    if (modelId.includes('claude-3')) return 200000;
    if (modelId.includes('gemini-1.5')) return 1000000;
    if (modelId.includes('gemini')) return 32000;
    return 4096;
  }

  private getPricingFromId(modelId: string): { input: number; output: number } {
    if (modelId.includes('gpt-4-turbo')) return { input: 10, output: 30 };
    if (modelId.includes('gpt-4')) return { input: 30, output: 60 };
    if (modelId.includes('gpt-3.5-turbo-0125')) return { input: 0.5, output: 1.5 };
    if (modelId.includes('gpt-3.5-turbo')) return { input: 1.5, output: 2 };
    return { input: 0, output: 0 };
  }

  private getFeaturesFromId(modelId: string): string[] {
    const features: string[] = [];
    if (detectJsonModeSupport(modelId)) features.push('json_mode');
    if (!modelId.includes('gpt-3.5-turbo-instruct')) features.push('function_calling');
    if (modelId.includes('vision') || modelId.includes('gpt-4-turbo') || modelId.includes('claude-3')) {
      features.push('vision');
    }
    return features;
  }

  private async callOpenAI(
    provider: any,
    messages: LLMMessage[],
    model: string,
    options: LLMCallOptions
  ): Promise<LLMResponse> {
    const endpoint = provider.endpoint || 'https://api.openai.com/v1/chat/completions';
    
    const requestBody: any = {
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2000,
    };

    // Detectar se modelo suporta JSON mode
    const supportsJsonMode = detectJsonModeSupport(model);
    
    // Adicionar response_format se JSON for solicitado E modelo suportar
    if (options.responseFormat === 'json') {
      if (supportsJsonMode) {
        requestBody.response_format = { type: 'json_object' };
        
        // Garantir que o system prompt mencione JSON
        if (messages[0]?.role === 'system') {
          messages[0].content += '\n\nYou must respond with valid JSON only.';
        }
      } else {
        // Modelo não suporta JSON mode - apenas instruir via prompt
        console.warn(`⚠️  Model ${model} doesn't support JSON mode natively. Using prompt instructions instead.`);
        if (messages[0]?.role === 'system') {
          messages[0].content += '\n\nIMPORTANT: You MUST respond with valid JSON only. Do not include any text before or after the JSON.';
        }
      }
    }

    if (options.stopSequences) {
      requestBody.stop = options.stopSequences;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
      }

      const data: any = await response.json();

      return {
        content: data.choices[0].message.content,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
        model: data.model,
        finishReason: data.choices[0].finish_reason,
      };
    } catch (error) {
      throw new Error(`Failed to call OpenAI: ${(error as Error).message}`);
    }
  }

  private async callAnthropic(
    provider: any,
    messages: LLMMessage[],
    model: string,
    options: LLMCallOptions
  ): Promise<LLMResponse> {
    const endpoint = provider.endpoint || 'https://api.anthropic.com/v1/messages';
    
    // Anthropic usa formato diferente - system é separado
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const requestBody: any = {
      model,
      messages: conversationMessages,
      max_tokens: options.maxTokens ?? 2000,
      temperature: options.temperature ?? 0.7,
    };

    if (systemMessage) {
      requestBody.system = systemMessage.content;
    }

    if (options.stopSequences) {
      requestBody.stop_sequences = options.stopSequences;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'x-api-key': provider.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Anthropic API error: ${JSON.stringify(error)}`);
      }

      const data: any = await response.json();

      return {
        content: data.content[0].text,
        usage: {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        },
        model: data.model,
        finishReason: data.stop_reason,
      };
    } catch (error) {
      throw new Error(`Failed to call Anthropic: ${(error as Error).message}`);
    }
  }

  private async callGoogle(
    provider: any,
    messages: LLMMessage[],
    model: string,
    options: LLMCallOptions
  ): Promise<LLMResponse> {
    const endpoint = provider.endpoint || `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    
    // Google usa formato diferente - combina mensagens em contents
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    // System prompt vai em systemInstruction (se disponível)
    const systemMessage = messages.find(m => m.role === 'system');

    const requestBody: any = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 2000,
      },
    };

    if (systemMessage) {
      requestBody.systemInstruction = {
        parts: [{ text: systemMessage.content }],
      };
    }

    if (options.stopSequences) {
      requestBody.generationConfig.stopSequences = options.stopSequences;
    }

    try {
      const response = await fetch(`${endpoint}?key=${provider.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Google API error: ${JSON.stringify(error)}`);
      }

      const data: any = await response.json();

      return {
        content: data.candidates[0].content.parts[0].text,
        usage: {
          promptTokens: data.usageMetadata?.promptTokenCount || 0,
          completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: data.usageMetadata?.totalTokenCount || 0,
        },
        model,
        finishReason: data.candidates[0].finishReason,
      };
    } catch (error) {
      throw new Error(`Failed to call Google: ${(error as Error).message}`);
    }
  }

  private async callOllama(
    provider: any,
    messages: LLMMessage[],
    model: string,
    options: LLMCallOptions
  ): Promise<LLMResponse> {
    const endpoint = provider.endpoint || 'http://localhost:11434';
    
    const requestBody = {
      model,
      messages,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.maxTokens ?? 2000,
      },
    };

    if (options.stopSequences) {
      requestBody.options['stop'] = options.stopSequences;
    }

    try {
      const response = await fetch(`${endpoint}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama API error: ${error}`);
      }

      const data: any = await response.json();

      return {
        content: data.message.content,
        usage: {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        },
        model: data.model,
        finishReason: 'stop',
      };
    } catch (error) {
      throw new Error(`Failed to call Ollama: ${(error as Error).message}`);
    }
  }

  /**
   * Test connection to provider
   */
  async testConnection(providerName: string): Promise<boolean> {
    const config = await this.loadConfig();
    const provider = config.providers?.find((p: any) => p.name === providerName);
    
    if (!provider) {
      throw new Error(`Provider not found: ${providerName}`);
    }

    try {
      const response = await this.callOpenAI(
        provider,
        [{ role: 'user', content: 'Test' }],
        provider.model,
        { maxTokens: 5 }
      );
      return response.content.length > 0;
    } catch {
      return false;
    }
  }
}
