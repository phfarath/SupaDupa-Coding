
/**
 * @typedef {import('../../../shared/contracts/llm-request').LlmRequest} LlmRequest
 * @typedef {import('../../../shared/contracts/llm-response').LlmResponse} LlmResponse
 */

/**
 * @class sdBaseProvider
 * @description Base class for all API providers, defining the common interface.
 */
class sdBaseProvider {
  /**
   * @param {object} config Provider-specific configuration.
   */
  constructor(config) {
    this.config = config;
  }

  /**
   * Initializes the provider. This can be used for setup tasks like authentication.
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('sdBaseProvider.initialize must be implemented by subclasses');
  }

  /**
   * Executes a request to the provider's LLM.
   * @param {LlmRequest} request The request object for the LLM.
   * @returns {Promise<LlmResponse>} The response from the LLM.
   */
  async execute(request) {
    throw new Error('sdBaseProvider.execute must be implemented by subclasses');
  }

  /**
   * Tests the connection to the provider's API.
   * @returns {Promise<{success: boolean, data: any}>} The result of the test.
   */
  async test() {
    throw new Error('sdBaseProvider.test must be implemented by subclasses');
  }
}

module.exports = { sdBaseProvider };
