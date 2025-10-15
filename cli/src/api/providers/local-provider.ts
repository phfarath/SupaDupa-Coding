import { spawn } from 'child_process';
import { sdBaseProvider } from './base-provider';
import { LlmRequest, LlmResponse, ProviderConfig, ProviderStatus } from '../../../shared/contracts/llm-contracts';

/**
 * sdLocalProvider
 * @description Local model provider implementation (Ollama, Llama.cpp, etc.).
 */
export class sdLocalProvider extends sdBaseProvider {
  private readonly modelPath: string;
  private readonly command: string;
  private readonly args: string[];

  constructor(config: ProviderConfig) {
    super(config);
    
    this.modelPath = config.endpoint || 'http://localhost:11434';
    this.command = config.credentials.command || 'ollama';
    this.args = config.credentials.args?.split(' ') || [];
  }

  async initialize(): Promise<void> {
    try {
      // Check if the local model is available
      await this.test();
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize local provider: ${error.message}`);
    }
  }

  async execute(request: LlmRequest): Promise<LlmResponse> {
    if (!this.isInitialized) {
      throw new Error('Local provider not initialized');
    }

    const startTime = Date.now();

    try {
      // For Ollama API
      if (this.modelPath.startsWith('http')) {
        return await this.executeViaAPI(request, startTime);
      } else {
        return await this.executeViaCLI(request, startTime);
      }
    } catch (error) {
      return this.handleError(error);
    }
  }

  async test(): Promise<{ success: boolean; data: any }> {
    try {
      const testRequest: LlmRequest = {
        messages: [
          { role: 'user', content: 'test' }
        ],
        parameters: {
          maxTokens: 5
        }
      };

      const response = await this.execute(testRequest);
      
      return {
        success: true,
        data: {
          model: this.config.model,
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
      providerId: `local-${this.config.model}`,
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

  private async executeViaAPI(request: LlmRequest, startTime: number): Promise<LlmResponse> {
    const fetch = (await import('node-fetch')).default;
    
    const payload = {
      model: this.config.model,
      messages: request.messages,
      options: {
        temperature: request.parameters?.temperature ?? this.config.defaultParameters?.temperature,
        num_predict: request.parameters?.maxTokens ?? this.config.defaultParameters?.maxTokens ?? 1000,
        top_p: request.parameters?.topP ?? this.config.defaultParameters?.topP,
        stop: request.parameters?.stop ?? this.config.defaultParameters?.stop
      }
    };

    const response = await fetch(`${this.modelPath}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      timeout: this.config.settings?.timeout || 60000
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || response.statusText);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    return {
      content: data.message?.content || '',
      model: this.config.model,
      metadata: {
        finishReason: data.done ? 'stop' : 'length',
        responseTime,
        requestId: `local-${Date.now()}`
      }
    };
  }

  private async executeViaCLI(request: LlmRequest, startTime: number): Promise<LlmResponse> {
    return new Promise((resolve, reject) => {
      const prompt = this.buildPrompt(request);
      const args = [...this.args, this.config.model, prompt];
      
      const child = spawn(this.command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: this.config.settings?.timeout || 60000
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        const responseTime = Date.now() - startTime;
        
        if (code === 0) {
          resolve({
            content: stdout.trim(),
            model: this.config.model,
            metadata: {
              finishReason: 'stop',
              responseTime,
              requestId: `local-${Date.now()}`
            }
          });
        } else {
          reject(new Error(`Local model process failed with code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to start local model: ${error.message}`));
      });
    });
  }

  private buildPrompt(request: LlmRequest): string {
    // Simple prompt building for CLI-based models
    const systemMessage = request.messages.find(msg => msg.role === 'system');
    const userMessages = request.messages.filter(msg => msg.role === 'user');
    const assistantMessages = request.messages.filter(msg => msg.role === 'assistant');

    let prompt = '';
    
    if (systemMessage) {
      prompt += `System: ${systemMessage.content}\n\n`;
    }

    userMessages.forEach((msg, index) => {
      prompt += `User: ${msg.content}\n`;
      if (assistantMessages[index]) {
        prompt += `Assistant: ${assistantMessages[index].content}\n`;
      }
    });

    prompt += 'Assistant: ';
    return prompt;
  }
}