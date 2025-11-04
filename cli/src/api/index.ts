/**
 * API Module Exports
 * Provides unified access to all API-related functionality
 */

export { sdProviderRegistry } from './provider-registry';
export { LLMClient } from './llm-client';
export * from './model-detector';

// Rate limiting
export { 
  sdRateLimiter, 
  sdRateLimiterInstance,
  type RateLimiterConfig,
  type RateLimitInfo
} from './rate-limiter';

// Circuit breaker
export {
  sdCircuitBreaker,
  sdCircuitBreakerInstance,
  CircuitState,
  type CircuitBreakerConfig,
  type CircuitBreakerStats
} from './circuit-breaker';

// Provider exports
export * from './providers/base-provider';
export * from './providers/openai-provider';
export * from './providers/anthropic-provider';
export * from './providers/local-provider';
