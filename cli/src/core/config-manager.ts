/**
 * Configuration Manager - handles CLI configuration
 */

import * as fs from 'fs/promises';
import * as path from 'path';

import Ajv, { ValidateFunction } from 'ajv';
import { configSchema } from './config-schema.js';




const ajv = new Ajv({ allErrors: true });

export interface AgentConfig {
  enabled: boolean;
  role: string;
  mcp_tools: string[];
}

export interface AgentsConfig {
  frontend: AgentConfig;
  backend: AgentConfig;
  qa: AgentConfig;
  docs: AgentConfig;
}

export interface MCPServerConfig {
  enabled: boolean;
}

export interface MCPServersConfig {
  filesystem: MCPServerConfig;
  git: MCPServerConfig;
  test: MCPServerConfig;
  lint: MCPServerConfig;
  build: MCPServerConfig;
}

export interface MCPConfig {
  servers: MCPServersConfig;
}

export interface GitConfig {
  branchPrefix: string;
  commitMessageFormat: string;
  requirePR: boolean;
  autoMerge: boolean;
}

export interface OrchestrationConfig {
  defaultMode: string;
  retries: number;
  timeout: number;
}

export interface Config {
  agents: AgentsConfig;
  mcp: MCPConfig;
  git: GitConfig;
  orchestration: OrchestrationConfig;
  [key: string]: any;
}

export class ConfigManager {
  private configPath: string;
  private config: Config | null;

  constructor(configPath: string | null = null) {
    this.configPath = configPath || path.join(process.cwd(), '.supadupacode.json');
    this.config = null;
  }

  /**
   * Initialize configuration
   */
  async init(defaults: Partial<Config> = {}): Promise<Config> {
    const defaultConfig: Config = {
      agents: {
        frontend: {
          enabled: true,
          role: 'frontend',
          mcp_tools: ['filesystem', 'git']
        },
        backend: {
          enabled: true,
          role: 'backend',
          mcp_tools: ['filesystem', 'git', 'db']
        },
        qa: {
          enabled: true,
          role: 'qa',
          mcp_tools: ['filesystem', 'git', 'test']
        },
        docs: {
          enabled: true,
          role: 'docs',
          mcp_tools: ['filesystem', 'git']
        }
      },
      mcp: {
        servers: {
          filesystem: { enabled: true },
          git: { enabled: true },
          test: { enabled: true },
          lint: { enabled: true },
          build: { enabled: true }
        }
      },
      git: {
        branchPrefix: 'agent',
        commitMessageFormat: '[{agent}] {scope}: {description}',
        requirePR: true,
        autoMerge: false
      },
      orchestration: {
        defaultMode: 'sequential',
        retries: 3,
        timeout: 300000
      },
      ...defaults
    };

    await this.save(defaultConfig);
    return defaultConfig;
  }

  /**
   * Load configuration
   */
  async load(): Promise<Config> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(data);
      
      // Validate configuration
      this.validate(this.config);
      
      return this.config;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return await this.init();
      }
      throw error;
    }
  }

  /**
   * Save configuration
   */
  async save(config: Config): Promise<void> {
    // Validate before saving
    this.validate(config);
    
    this.config = config;
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
  }

  /**
   * Get configuration value
   */
  async get(key: string): Promise<any> {
    if (!this.config) {
      await this.load();
    }

    const keys = key.split('.');
    let value: any = this.config;
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) break;
    }

    return value;
  }

  /**
   * Set configuration value
   */
  async set(key: string, value: any): Promise<void> {
    if (!this.config) {
      await this.load();
    }

    const keys = key.split('.');
    let current: any = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    await this.save(this.config!);
  }

  /**
   * Reset configuration to defaults
   */
  async reset(): Promise<Config> {
    return await this.init();
  }

  /**
   * Show current configuration
   */
  async show(): Promise<Config | null> {
    if (!this.config) {
      await this.load();
    }
    return this.config;
  }

  /**
   * Validate configuration against schema
   */
  validate(config: Config): boolean {
    const validate: ValidateFunction = ajv.compile(configSchema);
    const valid = validate(config);
    
    if (!valid) {
      const errors = validate.errors!.map(err => 
        `${err.instancePath} ${err.message}`
      ).join(', ');
      throw new Error(`Configuration validation failed: ${errors}`);
    }
    
    return true;
  }
}
