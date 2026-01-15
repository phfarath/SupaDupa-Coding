// cli/shared/contracts/llm-contracts.ts

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
 * @interface ProviderConfig
 * @description Configuration for API providers.
 */
export interface ProviderConfig {
  /** Provider name for display */
  name?: string;

  /** Provider type */
  type: 'openai' | 'anthropic' | 'local';

  /** Model identifier */
  model: string;

  /** API endpoint (optional for some providers) */
  endpoint?: string;

  /** Authentication credentials */
  credentials: {
    /** API key or token */
    apiKey?: string;

    /** Additional authentication parameters */
    [key: string]: any;
  };

  /** Provider-specific settings */
  settings?: {
    /** Request timeout in milliseconds */
    timeout?: number;

    /** Maximum retry attempts */
    maxRetries?: number;

    /** Rate limiting settings */
    rateLimit?: {
      requestsPerSecond?: number;
      tokensPerMinute?: number;
    };

    /** Additional provider-specific settings */
    [key: string]: any;
  };

  /** Default generation parameters */
  defaultParameters?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stop?: string[];
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

  /** Whether to stream the response */
  stream?: boolean;

  /** Callback for streaming chunks */
  onChunk?: (chunk: string) => void;

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

/**
 * @interface ProviderDetails
 * @description Provider information for CLI display.
 */
export interface ProviderDetails {
  /** Provider identifier */
  id: string;

  /** Display name */
  name: string;

  /** Provider type */
  type: 'openai' | 'anthropic' | 'local';

  /** Model name */
  model?: string;

  /** API endpoint */
  endpoint?: string;

  /** Whether provider is active */
  active: boolean;

  /** Whether API key is configured */
  hasKey: boolean;

  /** Creation timestamp */
  created_at: string;
}

// LLM-specific events
export const LLM_EVENTS = {
  LLM_REQUEST_STARTED: 'llm:request:started',
  LLM_REQUEST_COMPLETED: 'llm:request:completed',
  LLM_REQUEST_FAILED: 'llm:request:failed',
  PROVIDER_REGISTERED: 'llm:provider:registered',
  PROVIDER_UNREGISTERED: 'llm:provider:unregistered',
} as const;