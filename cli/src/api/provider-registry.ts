import { sdBaseProvider } from './providers/base-provider';

type ProviderId = string;
type ProviderAdapter = sdBaseProvider;

/**
 * sdProviderRegistry
 * @description Manages the registration and retrieval of API providers.
 */
export class sdProviderRegistry {
  providerAdapters: Record<ProviderId, ProviderAdapter>;

  constructor() {
    this.providerAdapters = {};
  }

  /**
   * Registers a new provider adapter.
   * @param providerId The unique identifier for the provider.
   * @param adapter An instance of the provider adapter.
   */
  register(providerId: ProviderId, adapter: ProviderAdapter): void {
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
   * @param providerId The ID of the provider to retrieve.
   * @returns The provider adapter or undefined if not found.
   */
  get(providerId: ProviderId): ProviderAdapter | undefined {
    return this.providerAdapters[providerId];
  }

  /**
   * Lists all registered provider IDs.
   * @returns Array of provider IDs.
   */
  list(): ProviderId[] {
    return Object.keys(this.providerAdapters);
  }
}