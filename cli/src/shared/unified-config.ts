/**
 * Unified Configuration Schema for SupaDupaCode
 * Single source of truth for all configuration
 */

export interface UnifiedProviderConfig {
  type: 'openai' | 'anthropic' | 'local';
  model: string;
  apiKey?: string;
  endpoint?: string;
  active?: boolean;
  settings?: {
    timeout?: number;
    maxRetries?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface AgentConfig {
  provider: string;
  model: string;
  enabled: boolean;
  role?: string;
  mcpTools?: string[];
}

export interface MCPConfig {
  servers: Record<string, {
    enabled: boolean;
    config?: Record<string, any>;
  }>;
}

export interface GitConfig {
  branchPrefix?: string;
  commitMessageFormat?: string;
  requirePR?: boolean;
  autoMerge?: boolean;
}

export interface OrchestrationConfig {
  defaultMode?: 'sequential' | 'parallel';
  retries?: number;
  timeout?: number;
}

export interface UnifiedConfig {
  providers: Record<string, UnifiedProviderConfig>;
  agents: Record<string, AgentConfig>;
  mcp?: MCPConfig;
  git?: GitConfig;
  orchestration?: OrchestrationConfig;
  version?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_UNIFIED_CONFIG: Partial<UnifiedConfig> = {
  providers: {},
  agents: {
    planner: {
      provider: 'openai',
      model: 'gpt-4o',
      enabled: true,
      role: 'planning',
      mcpTools: ['filesystem', 'git']
    },
    developer: {
      provider: 'openai',
      model: 'gpt-4o',
      enabled: true,
      role: 'implementation',
      mcpTools: ['filesystem', 'git', 'test']
    },
    qa: {
      provider: 'openai',
      model: 'gpt-4o',
      enabled: true,
      role: 'testing',
      mcpTools: ['filesystem', 'git', 'test']
    },
    docs: {
      provider: 'openai',
      model: 'gpt-4o',
      enabled: true,
      role: 'documentation',
      mcpTools: ['filesystem', 'git']
    },
    brain: {
      provider: 'openai',
      model: 'gpt-4o',
      enabled: true,
      role: 'orchestration',
      mcpTools: ['filesystem', 'git']
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
  version: '1.0.0'
};