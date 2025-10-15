// shared/contracts/llm-contracts.ts

/**
 * @interface LlmMessage
 * @description Message structure for LLM conversations.
 */
export interface LlmMessage {
  /** Message role */
  role: 'system' | 'user' | 'assistant';
  
  /** Message content */
  content: string;
  
  /** Optional message metadata */
  metadata?: {
    timestamp?: string;
    tokenCount?: number;
    reasoning?: string;
  };
}

/**
 * @interface LlmRequest
 * @description Request structure for LLM API calls.
 */
export interface LlmRequest {
  /** Messages in the conversation */
  messages: LlmMessage[];
  
  /** Model to use for generation */
  model?: string;
  
  /** Generation parameters */
  parameters?: {
    /** Sampling temperature (0.0 to 2.0) */
    temperature?: number;
    
    /** Maximum tokens to generate */
    maxTokens?: number;
    
    /** Nucleus sampling parameter (0.0 to 1.0) */
    topP?: number;
    
    /** Frequency penalty (-2.0 to 2.0) */
    frequencyPenalty?: number;
    
    /** Presence penalty (-2.0 to 2.0) */
    presencePenalty?: number;
    
    /** Stop sequences */
    stop?: string[];
    
    /** Number of completions to generate */
    n?: number;
    
    /** Logit bias for specific tokens */
    logitBias?: Record<string, number>;
  };
  
  /** Request metadata */
  metadata?: {
    requestId?: string;
    agentId?: string;
    taskType?: string;
    timeout?: number;
    retryCount?: number;
  };
}

/**
 * @interface LlmResponse
 * @description Response structure from LLM API calls.
 */
export interface LlmResponse {
  /** Generated content */
  content: string;
  
  /** Model used for generation */
  model: string;
  
  /** Usage statistics */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  
  /** Generation metadata */
  metadata?: {
    finishReason?: 'stop' | 'length' | 'content_filter' | 'function_call' | 'tool_calls';
    requestId?: string;
    responseTime?: number;
    latency?: number;
    cacheHit?: boolean;
  };
  
  /** Error information if the request failed */
  error?: {
    code: string;
    message: string;
    type: string;
    retryable?: boolean;
  };
  
  /** Additional provider-specific data */
  providerData?: any;
}

/**
 * @interface ProviderConfig
 * @description Configuration structure for API providers.
 */
export interface ProviderConfig {
  /** Provider type identifier */
  type: 'openai' | 'anthropic' | 'local' | 'custom';
  
  /** API endpoint URL */
  endpoint?: string;
  
  /** Authentication credentials */
  credentials: {
    apiKey?: string;
    token?: string;
    username?: string;
    password?: string;
    [key: string]: string | undefined;
  };
  
  /** Default model to use */
  model: string;
  
  /** Provider-specific settings */
  settings?: {
    timeout?: number;
    maxRetries?: number;
    retryDelay?: number;
    rateLimitRpm?: number;
    rateLimitTpm?: number;
    [key: string]: any;
  };
  
  /** Default generation parameters */
  defaultParameters?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
}

/**
 * @interface ProviderStatus
 * @description Status information for API providers.
 */
export interface ProviderStatus {
  /** Provider identifier */
  providerId: string;
  
  /** Current status */
  status: 'online' | 'offline' | 'error' | 'rate_limited' | 'maintenance';
  
  /** Health metrics */
  metrics: {
    responseTime?: number;
    successRate?: number;
    errorCount?: number;
    lastError?: string;
    lastCheck?: string;
  };
  
  /** Rate limiting information */
  rateLimit?: {
    requestsRemaining?: number;
    tokensRemaining?: number;
    resetTime?: string;
  };
}