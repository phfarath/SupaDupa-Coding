/**
 * Configuration Manager - handles CLI configuration
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';
import { configSchema } from './config-schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ajv = new Ajv({ allErrors: true });

export class ConfigManager {
  constructor(configPath = null) {
    this.configPath = configPath || path.join(process.cwd(), '.supadupacode.json');
    this.config = null;
  }

  /**
   * Initialize configuration
   */
  async init(defaults = {}) {
    const defaultConfig = {
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
  async load() {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(data);
      
      // Validate configuration
      this.validate(this.config);
      
      return this.config;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return await this.init();
      }
      throw error;
    }
  }

  /**
   * Save configuration
   */
  async save(config) {
    // Validate before saving
    this.validate(config);
    
    this.config = config;
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
  }

  /**
   * Get configuration value
   */
  async get(key) {
    if (!this.config) {
      await this.load();
    }

    const keys = key.split('.');
    let value = this.config;
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) break;
    }

    return value;
  }

  /**
   * Set configuration value
   */
  async set(key, value) {
    if (!this.config) {
      await this.load();
    }

    const keys = key.split('.');
    let current = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    await this.save(this.config);
  }

  /**
   * Reset configuration to defaults
   */
  async reset() {
    return await this.init();
  }

  /**
   * Show current configuration
   */
  async show() {
    if (!this.config) {
      await this.load();
    }
    return this.config;
  }

  /**
   * Validate configuration against schema
   */
  validate(config) {
    const validate = ajv.compile(configSchema);
    const valid = validate(config);
    
    if (!valid) {
      const errors = validate.errors.map(err => 
        `${err.instancePath} ${err.message}`
      ).join(', ');
      throw new Error(`Configuration validation failed: ${errors}`);
    }
    
    return true;
  }
}
