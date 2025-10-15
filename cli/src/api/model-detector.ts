export interface ModelCapabilities {
  supportsJsonMode: boolean;
  contextWindow: number;
  pricing: {
    input: number;   // $ per 1M tokens
    output: number;  // $ per 1M tokens
  };
  features: string[];
  description?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'ollama';
  capabilities: ModelCapabilities;
}

/**
 * Registry of known models and their capabilities
 */
export const MODEL_REGISTRY: Record<string, ModelCapabilities> = {
  // OpenAI GPT-4 Turbo
  'gpt-4-turbo-preview': {
    supportsJsonMode: true,
    contextWindow: 128000,
    pricing: { input: 10, output: 30 },
    features: ['json_mode', 'function_calling', 'vision'],
    description: 'GPT-4 Turbo - Mais rápido e barato que GPT-4'
  },
  'gpt-4-1106-preview': {
    supportsJsonMode: true,
    contextWindow: 128000,
    pricing: { input: 10, output: 30 },
    features: ['json_mode', 'function_calling'],
    description: 'GPT-4 Turbo (Nov 2023)'
  },
  'gpt-4-0125-preview': {
    supportsJsonMode: true,
    contextWindow: 128000,
    pricing: { input: 10, output: 30 },
    features: ['json_mode', 'function_calling'],
    description: 'GPT-4 Turbo (Jan 2024)'
  },

  // OpenAI GPT-4 Standard
  'gpt-4': {
    supportsJsonMode: false,
    contextWindow: 8192,
    pricing: { input: 30, output: 60 },
    features: ['function_calling'],
    description: 'GPT-4 Original'
  },
  'gpt-4-0613': {
    supportsJsonMode: false,
    contextWindow: 8192,
    pricing: { input: 30, output: 60 },
    features: ['function_calling'],
    description: 'GPT-4 (Jun 2023)'
  },

  // OpenAI GPT-3.5 Turbo
  'gpt-3.5-turbo': {
    supportsJsonMode: false,
    contextWindow: 4096,
    pricing: { input: 1.5, output: 2 },
    features: ['function_calling'],
    description: 'GPT-3.5 Turbo - Rápido e barato'
  },
  'gpt-3.5-turbo-1106': {
    supportsJsonMode: true,
    contextWindow: 16385,
    pricing: { input: 1, output: 2 },
    features: ['json_mode', 'function_calling'],
    description: 'GPT-3.5 Turbo (Nov 2023) - Suporta JSON'
  },
  'gpt-3.5-turbo-0125': {
    supportsJsonMode: true,
    contextWindow: 16385,
    pricing: { input: 0.5, output: 1.5 },
    features: ['json_mode', 'function_calling'],
    description: 'GPT-3.5 Turbo (Jan 2024) - Mais barato'
  },

  // Anthropic Claude
  'claude-3-opus-20240229': {
    supportsJsonMode: false,
    contextWindow: 200000,
    pricing: { input: 15, output: 75 },
    features: ['function_calling', 'vision'],
    description: 'Claude 3 Opus - Mais poderoso'
  },
  'claude-3-sonnet-20240229': {
    supportsJsonMode: false,
    contextWindow: 200000,
    pricing: { input: 3, output: 15 },
    features: ['function_calling', 'vision'],
    description: 'Claude 3 Sonnet - Balanceado'
  },
  'claude-3-haiku-20240307': {
    supportsJsonMode: false,
    contextWindow: 200000,
    pricing: { input: 0.25, output: 1.25 },
    features: ['function_calling', 'vision'],
    description: 'Claude 3 Haiku - Mais rápido'
  },

  // Google Gemini
  'gemini-pro': {
    supportsJsonMode: false,
    contextWindow: 32000,
    pricing: { input: 0.5, output: 1.5 },
    features: ['function_calling'],
    description: 'Gemini Pro'
  },
  'gemini-1.5-pro': {
    supportsJsonMode: false,
    contextWindow: 1000000,
    pricing: { input: 7, output: 21 },
    features: ['function_calling', 'vision'],
    description: 'Gemini 1.5 Pro - Contexto enorme'
  },

  // Ollama (local models - estimativas)
  'llama2': {
    supportsJsonMode: false,
    contextWindow: 4096,
    pricing: { input: 0, output: 0 },
    features: [],
    description: 'Llama 2 - Local'
  },
  'mistral': {
    supportsJsonMode: false,
    contextWindow: 8192,
    pricing: { input: 0, output: 0 },
    features: [],
    description: 'Mistral - Local'
  },
  'codellama': {
    supportsJsonMode: false,
    contextWindow: 16384,
    pricing: { input: 0, output: 0 },
    features: [],
    description: 'Code Llama - Local'
  }
};

/**
 * Detect if a model supports JSON mode based on its ID
 */
export function detectJsonModeSupport(modelId: string): boolean {
  // Check exact match first
  if (MODEL_REGISTRY[modelId]) {
    return MODEL_REGISTRY[modelId].supportsJsonMode;
  }

  // Pattern matching for unknown models
  const jsonModePatterns = [
    'turbo-preview',
    '-1106',
    '-0125',
    'gpt-4-turbo',
    'gpt-3.5-turbo-1106',
    'gpt-3.5-turbo-0125'
  ];

  return jsonModePatterns.some(pattern => modelId.includes(pattern));
}

/**
 * Get model capabilities
 */
export function getModelCapabilities(modelId: string): ModelCapabilities | null {
  // Check exact match
  if (MODEL_REGISTRY[modelId]) {
    return MODEL_REGISTRY[modelId];
  }

  // Try partial match for versioned models
  const baseModel = modelId.split('-').slice(0, 3).join('-');
  if (MODEL_REGISTRY[baseModel]) {
    return MODEL_REGISTRY[baseModel];
  }

  return null;
}

/**
 * Get context window size for a model
 */
export function getContextWindow(modelId: string): number {
  const capabilities = getModelCapabilities(modelId);
  return capabilities?.contextWindow || 4096; // Default
}

/**
 * Get pricing information for a model
 */
export function getPricing(modelId: string): { input: number; output: number } {
  const capabilities = getModelCapabilities(modelId);
  return capabilities?.pricing || { input: 0, output: 0 };
}

/**
 * Format model name for display
 */
export function formatModelName(modelId: string): string {
  const capabilities = getModelCapabilities(modelId);
  
  const parts: string[] = [modelId];
  
  if (capabilities) {
    if (capabilities.supportsJsonMode) {
      parts.push('✅ JSON');
    }
    
    const contextK = Math.floor(capabilities.contextWindow / 1000);
    parts.push(`(${contextK}k tokens)`);
    
    if (capabilities.pricing.input > 0) {
      parts.push(`$${capabilities.pricing.input}/$${capabilities.pricing.output}`);
    } else {
      parts.push('(Free/Local)');
    }
  }
  
  return parts.join(' ');
}

/**
 * Get all models for a provider
 */
export function getModelsForProvider(provider: 'openai' | 'anthropic' | 'google' | 'ollama'): string[] {
  const models: string[] = [];
  
  for (const [modelId, capabilities] of Object.entries(MODEL_REGISTRY)) {
    if (
      (provider === 'openai' && modelId.startsWith('gpt')) ||
      (provider === 'anthropic' && modelId.startsWith('claude')) ||
      (provider === 'google' && modelId.startsWith('gemini')) ||
      (provider === 'ollama' && ['llama', 'mistral', 'code'].some(p => modelId.startsWith(p)))
    ) {
      models.push(modelId);
    }
  }
  
  return models;
}

/**
 * Recommend best model for a use case
 */
export function recommendModel(
  provider: 'openai' | 'anthropic' | 'google' | 'ollama',
  useCase: 'analysis' | 'coding' | 'chat' | 'cost-effective'
): string {
  const recommendations: Record<string, Record<string, string>> = {
    openai: {
      analysis: 'gpt-4-turbo-preview',
      coding: 'gpt-4-turbo-preview',
      chat: 'gpt-3.5-turbo-0125',
      'cost-effective': 'gpt-3.5-turbo-0125'
    },
    anthropic: {
      analysis: 'claude-3-opus-20240229',
      coding: 'claude-3-opus-20240229',
      chat: 'claude-3-haiku-20240307',
      'cost-effective': 'claude-3-haiku-20240307'
    },
    google: {
      analysis: 'gemini-1.5-pro',
      coding: 'gemini-1.5-pro',
      chat: 'gemini-pro',
      'cost-effective': 'gemini-pro'
    },
    ollama: {
      analysis: 'codellama',
      coding: 'codellama',
      chat: 'llama2',
      'cost-effective': 'mistral'
    }
  };
  
  return recommendations[provider][useCase];
}
