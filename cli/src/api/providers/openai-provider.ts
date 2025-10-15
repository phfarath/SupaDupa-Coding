import fetch from 'node-fetch';
import { sdBaseProvider } from './base-provider';
import { LlmRequest, LlmResponse, ProviderConfig, ProviderStatus } from '../../../shared/contracts/llm-contracts';

/**
 * sdOpenAIProvider
 * @description OpenAI API provider implementation.
 */
export class sdOpenAIProvider extends sdBaseProvider {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;

  constructor(config: ProviderConfig) {
    super(config);
    this.baseUrl = config.endpoint || 'https://api.openai.com/v1';
    
    if (!config.credentials.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.defaultHeaders = {
      'Authorization': `Bearer ${config.credentials.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'supadupacode-cli/1.0.0'
    };
  }

  async initialize(): Promise<void> {
    try {
      // Test the connection with a minimal request
      await this.test();
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize OpenAI provider: ${error.message}`);
    }
  }

  async execute(request: LlmRequest): Promise<LlmResponse> {
    if (!this.isInitialized) {
      throw new Error('OpenAI provider not initialized');
    }

    const startTime = Date.now();
    const maxRetries = this.config.settings?.maxRetries || 3;
    const retryDelay = this.config.settings?.retryDelay || 1000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.makeRequest(request);
        const responseTime = Date.now() - startTime;

        return {
          content: response.choices[0]?.message?.content || '',
          model: response.model,
          usage: response.usage ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens
          } : undefined,
          metadata: {
            finishReason: response.choices[0]?.finish_reason,
            responseTime,
            requestId: response.id
          }
        };
      } catch (error) {
        if (attempt === maxRetries || !this.isRetryableError(error)) {
          return this.handleError(error);
        }

        // Exponential backoff
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
          maxTokens: 5,
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
      providerId: `openai-${this.config.model}`,
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
    const payload = {
      model: request.model || this.config.model,
      messages: request.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      ...this.mergeParameters(request.parameters)
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify(payload),
      timeout: this.config.settings?.timeout || 30000
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.error?.message || response.statusText);
      (error as any).code = errorData.error?.code || 'HTTP_ERROR';
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
      max_tokens: requestParams?.maxTokens ?? defaultParams.maxTokens ?? 1000,
      top_p: requestParams?.topP ?? defaultParams.topP,
      frequency_penalty: requestParams?.frequencyPenalty ?? defaultParams.frequencyPenalty,
      presence_penalty: requestParams?.presencePenalty ?? defaultParams.presencePenalty,
      stop: requestParams?.stop ?? defaultParams.stop,
      n: requestParams?.n ?? 1
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}