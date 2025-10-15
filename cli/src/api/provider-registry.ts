import { EventEmitter } from 'events';
import { ProviderConfig, ProviderStatus, LlmRequest, LlmResponse, ProviderDetails } from '../../shared/contracts/llm-contracts';
import { sdBaseProvider } from './providers/base-provider';
import { sdOpenAIProvider } from './providers/openai-provider';
import { sdAnthropicProvider } from './providers/anthropic-provider';
import { sdLocalProvider } from './providers/local-provider';
import { UnifiedConfigManager } from '../core/unified-config-manager';
import { UnifiedProviderConfig } from '../shared/unified-config';

type ProviderId = string;
type ProviderAdapter = sdBaseProvider;

/**
 * sdProviderRegistry
 * @description Manages the registration and retrieval of API providers using unified configuration.
 */
export class sdProviderRegistry extends EventEmitter {
  private providerAdapters: Record<ProviderId, ProviderAdapter> = {};
  private configManager: UnifiedConfigManager;

  constructor(configPath?: string) {
    super();
    this.configManager = new UnifiedConfigManager(configPath);
  }

  /**
   * Initialize the registry by loading providers from unified config
   */
  async initialize(): Promise<void> {
    await this.configManager.initialize();
    await this.loadProviders();
  }

  /**
   * Registers a provider with the given ID and configuration.
   * @param providerId The unique identifier for the provider.
   * @param config The configuration for the provider.
   */
  async register(providerId: ProviderId, config: ProviderConfig): Promise<void> {
    if (this.providerAdapters[providerId]) {
      console.warn(`Provider "${providerId}" is already registered. Overwriting...`);
    }

    try {
      const adapter = this.createProvider(config);
      this.providerAdapters[providerId] = adapter;
      
      // Save to unified config
      const unifiedConfig: UnifiedProviderConfig = {
        type: config.type,
        model: config.model,
        apiKey: config.credentials?.apiKey,
        endpoint: config.endpoint,
        settings: config.settings
      };
      
      await this.configManager.setProvider(providerId, unifiedConfig);
      
      console.log(`Provider "${providerId}" registered successfully.`);
      this.emit('provider:registered', { providerId, config });
    } catch (error) {
      console.error(`Failed to register provider "${providerId}":`, (error as Error).message);
      throw new Error(`Failed to register provider "${providerId}": ${(error as Error).message}`);
    }
  }

  /**
   * Creates a provider instance based on configuration.
   * @param config The provider configuration.
   * @returns A provider instance.
   */
  private createProvider(config: ProviderConfig): sdBaseProvider {
    switch (config.type) {
      case 'openai':
        return new sdOpenAIProvider(config);
      case 'anthropic':
        return new sdAnthropicProvider(config);
      case 'local':
        return new sdLocalProvider(config);
      default:
        throw new Error(`Unsupported provider type: ${config.type}`);
    }
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
   * Gets the configuration for a provider.
   * @param providerId The ID of the provider.
   * @returns The provider configuration or undefined if not found.
   */
  getConfig(providerId: ProviderId): ProviderConfig | undefined {
    const unifiedConfig = this.configManager.getProvider(providerId);
    if (!unifiedConfig) return undefined;
    
    return {
      name: providerId,
      type: unifiedConfig.type,
      model: unifiedConfig.model,
      credentials: { apiKey: unifiedConfig.apiKey },
      endpoint: unifiedConfig.endpoint,
      settings: unifiedConfig.settings
    };
  }

  /**
   * Lists all registered provider IDs.
   * @returns Array of provider IDs.
   */
  list(): ProviderId[] {
    return Object.keys(this.providerAdapters);
  }

  /**
   * Executes a request using a specific provider.
   * @param providerId The ID of the provider to use.
   * @param request The LLM request to execute.
   * @returns The LLM response.
   */
  async execute(providerId: ProviderId, request: LlmRequest): Promise<LlmResponse> {
    const provider = this.get(providerId);
    if (!provider) {
      throw new Error(`Provider "${providerId}" not found`);
    }

    // Ensure provider is activated before executing
    try {
      await provider.activate();
    } catch (error) {
      console.warn(`Provider ${providerId} activation failed:`, (error as Error).message);
    }

    return await provider.execute(request);
  }

  /**
   * Gets the status of all providers.
   * @returns Array of provider statuses.
   */
  async getStatuses(): Promise<ProviderStatus[]> {
    const statuses: ProviderStatus[] = [];
    
    for (const providerId of this.list()) {
      try {
        const provider = this.get(providerId);
        if (provider) {
          const status = await provider.getStatus();
          statuses.push(status);
        }
      } catch (error) {
        statuses.push({
          providerId,
          status: 'error',
          metrics: {
            lastError: (error as Error).message,
            lastCheck: new Date().toISOString()
          }
        });
      }
    }

    return statuses;
  }

  /**
   * Gets the status of a specific provider.
   * @param providerId The ID of the provider.
   * @returns The provider status.
   */
  async getStatus(providerId: ProviderId): Promise<ProviderStatus> {
    const provider = this.get(providerId);
    if (!provider) {
      throw new Error(`Provider "${providerId}" not found`);
    }

    return await provider.getStatus();
  }

  /**
   * Unregisters a provider.
   * @param providerId The ID of the provider to unregister.
   */
  async unregister(providerId: ProviderId): Promise<void> {
    if (this.providerAdapters[providerId]) {
      delete this.providerAdapters[providerId];
      await this.configManager.removeProvider(providerId);
      console.log(`Provider "${providerId}" unregistered.`);
      this.emit('provider:unregistered', { providerId });
    }
  }

  /**
   * Clears all registered providers.
   */
  clear(): void {
    const providerIds = this.list();
    providerIds.forEach(id => this.unregister(id));
    this.emit('registry:cleared');
  }

  /**
   * Lists all providers with details for CLI display
   */
  async listProviders(): Promise<ProviderDetails[]> {
    const providers: ProviderDetails[] = [];
    
    for (const providerId of this.list()) {
      const config = this.getConfig(providerId);
      const provider = this.get(providerId);
      
      if (config && provider) {
        const status = await provider.getStatus();
        providers.push({
          id: providerId,
          name: config.name || providerId,
          type: config.type,
          model: config.model,
          endpoint: config.endpoint,
          active: status.status === 'online',
          hasKey: !!(config.credentials && (config.credentials as any).apiKey),
          created_at: new Date().toISOString()
        });
      }
    }
    
    return providers;
  }

  /**
   * Switches the active provider
   */
  async switchProvider(name: string): Promise<void> {
    const providerId = name as ProviderId;
    
    // Use unified config manager to set active provider
    await this.configManager.setActiveProvider(providerId);
    
    // Deactivate all provider adapters
    for (const id of this.list()) {
      const provider = this.get(id);
      if (provider) {
        provider.deactivate();
      }
    }
    
    // Activate the selected provider adapter
    const selectedProvider = this.get(providerId);
    if (selectedProvider) {
      await selectedProvider.activate();
      this.emit('provider:switched', { providerId });
    }
  }



  /**
   * Adds a new provider
   */
  async addProvider(config: ProviderConfig): Promise<void> {
    const providerId = config.name || config.type;
    this.register(providerId, config);
    this.emit('provider:added', { providerId, config });
  }

  /**
   * Updates an existing provider
   */
  async updateProvider(name: string, updates: Partial<ProviderConfig>): Promise<void> {
    const providerId = name as ProviderId;
    const existingConfig = this.getConfig(providerId);
    
    if (!existingConfig) {
      throw new Error(`Provider "${name}" not found`);
    }
    
    const updatedConfig = { ...existingConfig, ...updates };
    this.register(providerId, updatedConfig);
    this.emit('provider:updated', { providerId, updates });
  }

  /**
   * Removes a provider
   */
  async removeProvider(name: string): Promise<void> {
    const providerId = name as ProviderId;
    await this.unregister(providerId);
    this.emit('provider:removed', { providerId });
  }


  /**
   * Load providers from unified configuration
   */
  private async loadProviders(): Promise<void> {
    try {
      // First, try to migrate from old configs
      await this.configManager.migrateFromOldConfigs();
      
      const providers = this.configManager.getProviders();
      
      for (const [providerId, unifiedConfig] of Object.entries(providers)) {
        const config = {
          name: providerId,
          type: unifiedConfig.type,
          model: unifiedConfig.model,
          credentials: { apiKey: unifiedConfig.apiKey },
          endpoint: unifiedConfig.endpoint,
          settings: unifiedConfig.settings
        };
        
        try {
          const provider = this.createProvider(config);
          this.providerAdapters[providerId] = provider;
        } catch (error) {
          console.warn(`Failed to create provider ${providerId}:`, (error as Error).message);
        }
      }
    } catch (error) {
      console.debug('No existing provider configuration found');
    }
  }

  private getProviderType(name: string): 'openai' | 'anthropic' | 'local' {
    if (name.includes('anthropic')) return 'anthropic';
    if (name.includes('local')) return 'local';
    return 'openai';
  }
}