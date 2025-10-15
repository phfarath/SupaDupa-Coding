
const { sdBaseProvider } = require('./providers/base-provider');

/**
 * @typedef {string} ProviderId
 * @typedef {sdBaseProvider} ProviderAdapter
 */

/**
 * @class sdProviderRegistry
 * @description Manages the registration and retrieval of API providers.
 */
class sdProviderRegistry {
  constructor() {
    /** @type {Record<ProviderId, ProviderAdapter>} */
    this.providerAdapters = {};
  }

  /**
   * Registers a new provider adapter.
   * @param {ProviderId} providerId The unique identifier for the provider.
   * @param {ProviderAdapter} adapter An instance of the provider adapter.
   */
  register(providerId, adapter) {
    if (!providerId) {
      throw new Error('Provider ID is required.');
    }
    if (!(adapter instanceof sdBaseProvider)) {
      throw new Error('Adapter must be an instance of sdBaseProvider.');
    }
    if (this.providerAdapters[providerId]) {
      console.warn(`Provider with ID "${providerId}" is already registered. Overwriting.`);
    }
    this.providerAdapters[providerId] = adapter;
    console.log(`Provider "${providerId}" registered.`);
  }

  /**
   * Retrieves a provider adapter by its ID.
   * @param {ProviderId} providerId The ID of the provider to retrieve.
   * @returns {ProviderAdapter | undefined}
   */
  get(providerId) {
    return this.providerAdapters[providerId];
  }

  /**
   * Lists all registered provider IDs.
   * @returns {ProviderId[]}
   */
  list() {
    return Object.keys(this.providerAdapters);
  }
}

module.exports = { sdProviderRegistry };
