import fetch from 'node-fetch';
import { sdBaseProvider } from './base-provider';
import { LlmRequest, LlmResponse, ProviderConfig, ProviderStatus } from '../../../shared/contracts/llm-contracts';

/**
 * sdAnthropicProvider
 * @description Anthropic Claude API provider implementation.
 */
export class sdAnthropicProvider extends sdBaseProvider {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;

  constructor(config: ProviderConfig) {
    super(config);
    this.baseUrl = config.endpoint || 'https://api.anthropic.com';
    
    if (!config.credentials.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    this.defaultHeaders = {
      'x-api-key': config.credentials.apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'User-Agent': 'supadupacode-cli/1.0.0'
    };
  }

  async initialize(): Promise<void> {
    try {
      await this.test();
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize Anthropic provider: ${error.message}`);
    }
  }

  async execute(request: LlmRequest): Promise<LlmResponse> {
    if (!this.isInitialized) {
      throw new Error('Anthropic provider not initialized');
    }

    const startTime = Date.now();
    const maxRetries = this.config.settings?.maxRetries || 3;
    const retryDelay = this.config.settings?.retryDelay || 1000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.makeRequest(request);
        const responseTime = Date.now() - startTime;

        return {
          content: response.content[0]?.text || '',
          model: response.model,
          usage: response.usage ? {
            promptTokens: response.usage.input_tokens,
            completionTokens: response.usage.output_tokens,
            totalTokens: response.usage.input_tokens + response.usage.output_tokens
          } : undefined,
          metadata: {
            finishReason: response.stop_reason,
            responseTime,
            requestId: response.id
          }
        };
      } catch (error) {
        if (attempt === maxRetries || !this.isRetryableError(error)) {
          return this.handleError(error);
        }

        const delay = retryDelay * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }

    return this.handleError(new Error('Max retries exceeded'));
  }

  async test(): Promise<{ success: boolean; data: any }> {
    try {
      const testRequest: LlmRequest = {
        messages: [
          { role: 'user', content: 'Hello, this is a connection test.' }
        ],
        parameters: {
          maxTokens: 10,
          temperature: 0.1
        }
      };

      const response = await this.makeRequest(testRequest);
      
      return {
        success: true,
        data: {
          model: response.model,
          latency: Date.now(),
          available: true
        }
      };
    } catch (error) {
      return {
        success: false,
        data: {
          error: error.message,
          available: false
        }
      };
    }
  }

  async getStatus(): Promise<ProviderStatus> {
    const testResult = await this.test();
    
    return {
      providerId: `anthropic-${this.config.model}`,
      status: testResult.success ? 'online' : 'offline',
      metrics: {
        responseTime: testResult.data.latency,
        successRate: testResult.success ? 1 : 0,
        errorCount: testResult.success ? 0 : 1,
        lastError: testResult.success ? undefined : testResult.data.error,
        lastCheck: new Date().toISOString()
      }
    };
  }

  private async makeRequest(request: LlmRequest): Promise<any> {
    // Convert OpenAI-style messages to Claude format
    const systemMessage = request.messages.find(msg => msg.role === 'system');
    const conversationMessages = request.messages.filter(msg => msg.role !== 'system');
    
    const payload = {
      model: request.model || this.config.model,
      max_tokens: request.parameters?.maxTokens ?? this.config.defaultParameters?.maxTokens ?? 1000,
      messages: conversationMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      })),
      system: systemMessage?.content,
      ...this.mergeParameters(request.parameters)
    };

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify(payload),
      timeout: this.config.settings?.timeout || 30000
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.error?.message || response.statusText);
      (error as any).code = errorData.error?.type || 'HTTP_ERROR';
      (error as any).status = response.status;
      (error as any).type = errorData.error?.type || 'api_error';
      throw error;
    }

    return response.json();
  }

  private mergeParameters(requestParams?: any): any {
    const defaultParams = this.config.defaultParameters || {};
    return {
      temperature: requestParams?.temperature ?? defaultParams.temperature,
      top_p: requestParams?.topP ?? defaultParams.topP,
      top_k: requestParams?.topK,
      stop_sequences: requestParams?.stop ?? defaultParams.stop,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}