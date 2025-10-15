import { LlmRequest, LlmResponse } from '../../../shared/contracts/llm-contracts';

/**
 * sdBaseProvider
 * @description Base class for all API providers, defining the common interface.
 */
export abstract class sdBaseProvider {
  config: any;

  /**
   * @param config Provider-specific configuration.
   */
  constructor(config: any) {
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
}