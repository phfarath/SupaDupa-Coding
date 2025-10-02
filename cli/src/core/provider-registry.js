/**
 * Provider Registry - manages API providers and their credentials
 */

import { ConfigManager } from './config-manager.js';
import { encrypt, decrypt, validateApiKey } from '../security/encryption.js';

export class ProviderRegistry {
  constructor(configPath = null) {
    this.configManager = new ConfigManager(configPath);
    this.providers = null;
  }

  /**
   * Initialize provider registry
   */
  async init() {
    await this.configManager.load();
    
    // Ensure providers section exists
    let config = await this.configManager.show();
    if (!config.providers) {
      config.providers = {
        active: null,
        registered: {}
      };
      await this.configManager.save(config);
    }
    
    this.providers = config.providers;
    return this.providers;
  }

  /**
   * Add a new provider
   */
  async addProvider(name, apiKey, options = {}) {
    if (!name || typeof name !== 'string') {
      throw new Error('Provider name is required and must be a string');
    }

    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('API key is required and must be a string');
    }

    // Validate API key format
    validateApiKey(name, apiKey);

    // Load current providers
    await this.init();

    // Encrypt the API key
    const encryptedKey = await encrypt(apiKey);

    // Store provider configuration
    const config = await this.configManager.show();
    if (!config.providers) {
      config.providers = { active: null, registered: {} };
    }

    config.providers.registered[name] = {
      name,
      encrypted_key: encryptedKey,
      model: options.model || null,
      endpoint: options.endpoint || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Set as active if it's the first provider or explicitly requested
    if (!config.providers.active || options.setActive) {
      config.providers.active = name;
    }

    await this.configManager.save(config);
    
    return {
      name,
      model: options.model,
      active: config.providers.active === name
    };
  }

  /**
   * List all registered providers
   */
  async listProviders() {
    await this.init();
    
    const config = await this.configManager.show();
    const providers = config.providers?.registered || {};
    const active = config.providers?.active || null;

    return Object.keys(providers).map(name => ({
      name,
      model: providers[name].model,
      endpoint: providers[name].endpoint,
      active: name === active,
      created_at: providers[name].created_at,
      hasKey: !!providers[name].encrypted_key
    }));
  }

  /**
   * Get a specific provider (with decrypted key)
   */
  async getProvider(name, includeKey = false) {
    await this.init();
    
    const config = await this.configManager.show();
    const provider = config.providers?.registered?.[name];

    if (!provider) {
      throw new Error(`Provider '${name}' not found`);
    }

    const result = {
      name: provider.name,
      model: provider.model,
      endpoint: provider.endpoint,
      active: config.providers.active === name,
      created_at: provider.created_at,
      updated_at: provider.updated_at
    };

    if (includeKey && provider.encrypted_key) {
      result.apiKey = await decrypt(provider.encrypted_key);
    }

    return result;
  }

  /**
   * Switch active provider
   */
  async switchProvider(name) {
    await this.init();
    
    const config = await this.configManager.show();
    
    if (!config.providers?.registered?.[name]) {
      throw new Error(`Provider '${name}' not found. Add it first with 'provider add'.`);
    }

    config.providers.active = name;
    await this.configManager.save(config);

    return {
      name,
      active: true
    };
  }

  /**
   * Remove a provider
   */
  async removeProvider(name) {
    await this.init();
    
    const config = await this.configManager.show();
    
    if (!config.providers?.registered?.[name]) {
      throw new Error(`Provider '${name}' not found`);
    }

    delete config.providers.registered[name];

    // If this was the active provider, clear active or set to another
    if (config.providers.active === name) {
      const remaining = Object.keys(config.providers.registered);
      config.providers.active = remaining.length > 0 ? remaining[0] : null;
    }

    await this.configManager.save(config);

    return { name, removed: true };
  }

  /**
   * Get active provider
   */
  async getActiveProvider(includeKey = false) {
    await this.init();
    
    const config = await this.configManager.show();
    const activeName = config.providers?.active;

    if (!activeName) {
      throw new Error('No active provider set. Add a provider with "provider add".');
    }

    return await this.getProvider(activeName, includeKey);
  }

  /**
   * Update provider configuration
   */
  async updateProvider(name, updates = {}) {
    await this.init();
    
    const config = await this.configManager.show();
    const provider = config.providers?.registered?.[name];

    if (!provider) {
      throw new Error(`Provider '${name}' not found`);
    }

    // Update allowed fields
    if (updates.apiKey) {
      validateApiKey(name, updates.apiKey);
      provider.encrypted_key = await encrypt(updates.apiKey);
    }
    if (updates.model !== undefined) {
      provider.model = updates.model;
    }
    if (updates.endpoint !== undefined) {
      provider.endpoint = updates.endpoint;
    }

    provider.updated_at = new Date().toISOString();

    await this.configManager.save(config);

    return {
      name,
      updated: true
    };
  }
}
