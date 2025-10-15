import { LlmRequest, LlmResponse, ProviderConfig, ProviderStatus } from '../../../shared/contracts/llm-contracts';

/**
 * sdBaseProvider
 * @description Base class for all API providers, defining the common interface.
 */
export abstract class sdBaseProvider {
  protected config: ProviderConfig;
  protected isInitialized: boolean = false;
  protected lastError?: Error;

  /**
   * @param config Provider-specific configuration.
   */
  constructor(config: ProviderConfig) {
    this.config = config;
  }

  /**
   * Initializes the provider. This can be used for setup tasks like authentication.
   */
  abstract initialize(): Promise<void>;

  /**
   * Executes a request to the provider's LLM.
   * @param request The request object for the LLM.
   * @returns The response from the LLM.
   */
  abstract execute(request: LlmRequest): Promise<LlmResponse>;

  /**
   * Tests the connection to the provider's API.
   * @returns The result of the test.
   */
  abstract test(): Promise<{ success: boolean; data: any }>;

  /**
   * Gets the current status of the provider.
   * @returns Provider status information.
   */
  abstract getStatus(): Promise<ProviderStatus>;

  /**
   * Validates the provider configuration.
   * @returns True if configuration is valid.
   */
  protected validateConfig(): boolean {
    return !!(this.config.type && this.config.model && this.config.credentials);
  }

  /**
   * Activates the provider for use.
   */
  async activate(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Deactivates the provider.
   */
  deactivate(): void {
    // Base implementation - can be overridden by subclasses
    this.isInitialized = false;
  }

  /**
   * Handles common error scenarios.
   * @param error The error to handle.
   * @returns Formatted error response.
   */
  protected handleError(error: any): LlmResponse {
    this.lastError = error;
    
    return {
      content: '',
      model: this.config.model,
      error: {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || 'An unknown error occurred',
        type: error.type || 'API_ERROR',
        retryable: this.isRetryableError(error)
      }
    };
  }

  /**
   * Determines if an error is retryable.
   * @param error The error to check.
   * @returns True if the error is retryable.
   */
  protected isRetryableError(error: any): boolean {
    const retryableCodes = ['RATE_LIMIT', 'TIMEOUT', 'NETWORK_ERROR', 'SERVER_ERROR'];
    const retryableTypes = ['rate_limit_error', 'timeout_error', 'network_error'];
    
    return retryableCodes.includes(error.code) || 
           retryableTypes.includes(error.type) ||
           (error.status >= 500 && error.status < 600);
  }

  /**
   * Gets the provider configuration.
   * @returns The provider configuration.
   */
  getConfig(): ProviderConfig {
    return { ...this.config };
  }

  /**
   * Checks if the provider is initialized.
   * @returns True if initialized.
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Gets the last error that occurred.
   * @returns The last error or undefined.
   */
  getLastError(): Error | undefined {
    return this.lastError;
  }
}