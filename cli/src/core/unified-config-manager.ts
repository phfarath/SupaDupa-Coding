import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';
import { UnifiedConfig, UnifiedProviderConfig, DEFAULT_UNIFIED_CONFIG } from '../shared/unified-config';

export class UnifiedConfigManager extends EventEmitter {
  private configPath: string;
  private config: UnifiedConfig;

  constructor(configPath?: string) {
    super();
    this.configPath = configPath || path.join(process.cwd(), '.supadupacode.json');
    this.config = { ...DEFAULT_UNIFIED_CONFIG } as UnifiedConfig;
  }

  /**
   * Initialize the configuration manager
   */
  async initialize(): Promise<void> {
    await this.loadConfig();
  }

  /**
   * Load configuration from file
   */
  async loadConfig(): Promise<void> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      const loadedConfig = JSON.parse(data);
      
      // Merge with defaults
      this.config = {
        ...DEFAULT_UNIFIED_CONFIG,
        ...loadedConfig,
        providers: {
          ...DEFAULT_UNIFIED_CONFIG.providers,
          ...loadedConfig.providers
        },
        agents: {
          ...DEFAULT_UNIFIED_CONFIG.agents,
          ...loadedConfig.agents
        },
        mcp: {
          ...DEFAULT_UNIFIED_CONFIG.mcp,
          ...loadedConfig.mcp,
          servers: {
            ...DEFAULT_UNIFIED_CONFIG.mcp?.servers,
            ...loadedConfig.mcp?.servers
          }
        }
      };
      
      this.emit('config:loaded', this.config);
    } catch (error) {
      // Config doesn't exist, use defaults
      this.config = { ...DEFAULT_UNIFIED_CONFIG } as UnifiedConfig;
      await this.saveConfig();
    }
  }

  /**
   * Save configuration to file
   */
  async saveConfig(): Promise<void> {
    try {
      const dir = path.dirname(this.configPath);
      await fs.mkdir(dir, { recursive: true });
      
      this.config.updatedAt = new Date().toISOString();
      
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
      this.emit('config:saved', this.config);
    } catch (error) {
      throw new Error(`Failed to save config: ${(error as Error).message}`);
    }
  }

  /**
   * Get the entire configuration
   */
  getConfig(): UnifiedConfig {
    return { ...this.config };
  }

  /**
   * Get all providers
   */
  getProviders(): Record<string, UnifiedProviderConfig> {
    return { ...this.config.providers };
  }

  /**
   * Get a specific provider
   */
  getProvider(name: string): UnifiedProviderConfig | undefined {
    return this.config.providers[name];
  }

  /**
   * Add or update a provider
   */
  async setProvider(name: string, config: UnifiedProviderConfig): Promise<void> {
    const isUpdate = !!this.config.providers[name];
    
    this.config.providers[name] = {
      ...config,
      updatedAt: new Date().toISOString(),
      ...(isUpdate ? {} : { createdAt: new Date().toISOString() })
    };

    // If this is the first provider or marked as active, make it active
    const providers = Object.keys(this.config.providers);
    if (providers.length === 1 || config.active) {
      // Deactivate all others
      Object.keys(this.config.providers).forEach(key => {
        if (key !== name) {
          this.config.providers[key].active = false;
        }
      });
      this.config.providers[name].active = true;
    }

    await this.saveConfig();
    this.emit(isUpdate ? 'provider:updated' : 'provider:added', { name, config });
  }

  /**
   * Remove a provider
   */
  async removeProvider(name: string): Promise<void> {
    if (!this.config.providers[name]) {
      throw new Error(`Provider "${name}" not found`);
    }

    delete this.config.providers[name];
    await this.saveConfig();
    this.emit('provider:removed', { name });
  }

  /**
   * Get active provider
   */
  getActiveProvider(): { name: string; config: UnifiedProviderConfig } | null {
    for (const [name, config] of Object.entries(this.config.providers)) {
      if (config.active) {
        return { name, config };
      }
    }
    return null;
  }

  /**
   * Set active provider
   */
  async setActiveProvider(name: string): Promise<void> {
    if (!this.config.providers[name]) {
      throw new Error(`Provider "${name}" not found`);
    }

    // Deactivate all others
    Object.keys(this.config.providers).forEach(key => {
      this.config.providers[key].active = false;
    });

    // Activate the selected one
    this.config.providers[name].active = true;
    await this.saveConfig();
    this.emit('provider:activated', { name });
  }

  /**
   * Get agent configuration
   */
  getAgent(name: string) {
    return this.config.agents[name];
  }

  /**
   * Set agent configuration
   */
  async setAgent(name: string, config: any): Promise<void> {
    this.config.agents[name] = config;
    await this.saveConfig();
    this.emit('agent:updated', { name, config });
  }

  /**
   * Migrate from old configuration formats
   */
  async migrateFromOldConfigs(): Promise<void> {
    let migrated = false;
    
    // Migrate from .supadupacode/config.json (setup command)
    try {
      const oldSetupPath = path.join(process.cwd(), '.supadupacode', 'config.json');
      const setupData = await fs.readFile(oldSetupPath, 'utf-8');
      const setupConfig = JSON.parse(setupData);
      
      if (setupConfig.providers) {
        for (const provider of setupConfig.providers) {
          if (provider.apiKey) {
            this.config.providers[provider.name] = {
              type: provider.name as any,
              model: provider.model,
              apiKey: provider.apiKey,
              endpoint: provider.endpoint,
              active: provider.name === setupConfig.defaultProvider
            };
          }
        }
      }
      
      if (setupConfig.agentMappings) {
        for (const mapping of setupConfig.agentMappings) {
          if (this.config.agents[mapping.agentName]) {
            this.config.agents[mapping.agentName].provider = mapping.providerName;
            this.config.agents[mapping.agentName].model = mapping.model;
          }
        }
      }
      
      // Backup old config
      await fs.rename(oldSetupPath, oldSetupPath + '.backup');
      migrated = true;
    } catch (error) {
      // Old setup config doesn't exist
    }
    
    // Migrate from .supadupacode/providers.json (provider commands)
    try {
      const oldProvidersPath = path.join(process.cwd(), '.supadupacode', 'providers.json');
      const providersData = await fs.readFile(oldProvidersPath, 'utf-8');
      const providersConfig = JSON.parse(providersData);
      
      if (providersConfig.providers) {
        for (const [name, provider] of Object.entries(providersConfig.providers)) {
          if (name !== 'active' && provider && typeof provider === 'object') {
            this.config.providers[name] = {
              type: (provider as any).type,
              model: (provider as any).model,
              apiKey: (provider as any).encrypted_key,
              endpoint: (provider as any).endpoint,
              active: providersConfig.active === name
            };
          }
        }
      }
      
      // Backup old config
      await fs.rename(oldProvidersPath, oldProvidersPath + '.backup');
      migrated = true;
    } catch (error) {
      // Old providers config doesn't exist
    }
    
    if (migrated) {
      await this.saveConfig();
      this.emit('config:migrated');
    }
  }
}