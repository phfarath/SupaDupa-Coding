/**
 * sdCircuitBreaker - Circuit breaker pattern for API resilience
 * Prevents cascading failures by failing fast when provider is unhealthy
 */

import { EventEmitter } from 'events';

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing fast, not allowing requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number;    // Number of failures before opening
  successThreshold: number;    // Number of successes to close from half-open
  timeout: number;             // Time in ms before attempting recovery
  resetTimeout?: number;       // Time to reset failure count (default: 60000)
}

export interface CircuitBreakerStats {
  providerId: string;
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime?: number;
  lastStateChange: number;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

/**
 * sdCircuitBreaker - Implements circuit breaker pattern for provider calls
 */
export class sdCircuitBreaker extends EventEmitter {
  private circuits: Map<string, Circuit>;
  private defaultConfig: CircuitBreakerConfig;

  constructor(defaultConfig?: Partial<CircuitBreakerConfig>) {
    super();
    this.circuits = new Map();
    this.defaultConfig = {
      failureThreshold: defaultConfig?.failureThreshold || 5,
      successThreshold: defaultConfig?.successThreshold || 2,
      timeout: defaultConfig?.timeout || 60000, // 1 minute
      resetTimeout: defaultConfig?.resetTimeout || 60000,
    };
  }

  /**
   * Register a provider with custom circuit breaker config
   */
  registerProvider(providerId: string, config?: Partial<CircuitBreakerConfig>): void {
    const fullConfig: CircuitBreakerConfig = {
      failureThreshold: config?.failureThreshold || this.defaultConfig.failureThreshold,
      successThreshold: config?.successThreshold || this.defaultConfig.successThreshold,
      timeout: config?.timeout || this.defaultConfig.timeout,
      resetTimeout: config?.resetTimeout || this.defaultConfig.resetTimeout,
    };

    const circuit = new Circuit(providerId, fullConfig, this);
    this.circuits.set(providerId, circuit);

    this.emit('circuit-registered', { providerId, config: fullConfig });
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    providerId: string,
    fn: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const circuit = this.getCircuit(providerId);

    if (!circuit.canAttempt()) {
      this.emit('circuit-blocked', { 
        providerId, 
        state: circuit.getState(),
        stats: circuit.getStats()
      });

      if (fallback) {
        this.emit('fallback-triggered', { providerId });
        return await fallback();
      }

      throw new Error(
        `Circuit breaker is ${circuit.getState()} for provider ${providerId}. ` +
        `Service temporarily unavailable.`
      );
    }

    try {
      const result = await fn();
      circuit.recordSuccess();
      return result;
    } catch (error) {
      circuit.recordFailure(error as Error);
      throw error;
    }
  }

  /**
   * Check if circuit allows requests
   */
  canExecute(providerId: string): boolean {
    const circuit = this.getCircuit(providerId);
    return circuit.canAttempt();
  }

  /**
   * Get circuit state for a provider
   */
  getState(providerId: string): CircuitState {
    const circuit = this.getCircuit(providerId);
    return circuit.getState();
  }

  /**
   * Get circuit statistics
   */
  getStats(providerId: string): CircuitBreakerStats {
    const circuit = this.getCircuit(providerId);
    return circuit.getStats();
  }

  /**
   * Manually reset a circuit (force close)
   */
  reset(providerId: string): void {
    const circuit = this.getCircuit(providerId);
    circuit.reset();
    this.emit('circuit-reset', { providerId });
  }

  /**
   * Reset all circuits
   */
  resetAll(): void {
    for (const [providerId, circuit] of this.circuits.entries()) {
      circuit.reset();
      this.emit('circuit-reset', { providerId });
    }
  }

  /**
   * Manually trip a circuit (force open)
   */
  trip(providerId: string): void {
    const circuit = this.getCircuit(providerId);
    circuit.trip();
    this.emit('circuit-tripped', { providerId, manual: true });
  }

  /**
   * Get health status of all providers
   */
  getHealthStatus(): Map<string, CircuitBreakerStats> {
    const status = new Map<string, CircuitBreakerStats>();
    
    for (const [providerId, circuit] of this.circuits.entries()) {
      status.set(providerId, circuit.getStats());
    }

    return status;
  }

  /**
   * Remove a provider's circuit breaker
   */
  unregisterProvider(providerId: string): void {
    const circuit = this.circuits.get(providerId);
    if (circuit) {
      circuit.destroy();
      this.circuits.delete(providerId);
      this.emit('circuit-unregistered', { providerId });
    }
  }

  /**
   * Get or create circuit for provider
   */
  private getCircuit(providerId: string): Circuit {
    let circuit = this.circuits.get(providerId);
    
    if (!circuit) {
      // Auto-register with default config
      this.registerProvider(providerId);
      circuit = this.circuits.get(providerId)!;
    }

    return circuit;
  }

  /**
   * Cleanup all circuits
   */
  destroy(): void {
    for (const circuit of this.circuits.values()) {
      circuit.destroy();
    }
    this.circuits.clear();
  }
}

/**
 * Individual Circuit implementation
 */
class Circuit {
  private providerId: string;
  private config: CircuitBreakerConfig;
  private state: CircuitState;
  private failures: number;
  private successes: number;
  private lastFailureTime?: number;
  private lastStateChange: number;
  private totalRequests: number;
  private totalFailures: number;
  private totalSuccesses: number;
  private resetTimer: NodeJS.Timeout | null;
  private recoveryTimer: NodeJS.Timeout | null;
  private emitter: EventEmitter;

  constructor(providerId: string, config: CircuitBreakerConfig, emitter: EventEmitter) {
    this.providerId = providerId;
    this.config = config;
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastStateChange = Date.now();
    this.totalRequests = 0;
    this.totalFailures = 0;
    this.totalSuccesses = 0;
    this.resetTimer = null;
    this.recoveryTimer = null;
    this.emitter = emitter;

    this.startResetTimer();
  }

  canAttempt(): boolean {
    // Update state if recovery timeout has passed
    if (this.state === CircuitState.OPEN) {
      const timeSinceOpen = Date.now() - this.lastStateChange;
      if (timeSinceOpen >= this.config.timeout) {
        this.transitionTo(CircuitState.HALF_OPEN);
      }
    }

    return this.state !== CircuitState.OPEN;
  }

  recordSuccess(): void {
    this.totalRequests++;
    this.totalSuccesses++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      
      if (this.successes >= this.config.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on successful request
      this.failures = 0;
    }

    this.emitter.emit('circuit-success', {
      providerId: this.providerId,
      state: this.state,
      stats: this.getStats()
    });
  }

  recordFailure(error: Error): void {
    this.totalRequests++;
    this.totalFailures++;
    this.failures++;
    this.lastFailureTime = Date.now();

    this.emitter.emit('circuit-failure', {
      providerId: this.providerId,
      state: this.state,
      error: error.message,
      stats: this.getStats()
    });

    if (this.state === CircuitState.HALF_OPEN) {
      // Fail immediately in half-open state
      this.transitionTo(CircuitState.OPEN);
    } else if (this.state === CircuitState.CLOSED) {
      // Check if threshold exceeded
      if (this.failures >= this.config.failureThreshold) {
        this.transitionTo(CircuitState.OPEN);
      }
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats(): CircuitBreakerStats {
    return {
      providerId: this.providerId,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastStateChange: this.lastStateChange,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    };
  }

  reset(): void {
    this.transitionTo(CircuitState.CLOSED);
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = undefined;
  }

  trip(): void {
    this.transitionTo(CircuitState.OPEN);
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();

    if (newState === CircuitState.CLOSED) {
      this.failures = 0;
      this.successes = 0;
    } else if (newState === CircuitState.HALF_OPEN) {
      this.successes = 0;
    } else if (newState === CircuitState.OPEN) {
      // Schedule recovery attempt
      this.scheduleRecovery();
    }

    this.emitter.emit('circuit-state-change', {
      providerId: this.providerId,
      oldState,
      newState,
      timestamp: this.lastStateChange,
      stats: this.getStats()
    });
  }

  private scheduleRecovery(): void {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }

    this.recoveryTimer = setTimeout(() => {
      if (this.state === CircuitState.OPEN) {
        this.transitionTo(CircuitState.HALF_OPEN);
      }
    }, this.config.timeout);
  }

  private startResetTimer(): void {
    if (this.config.resetTimeout) {
      this.resetTimer = setInterval(() => {
        // Reset failure count if circuit is closed and some time has passed
        if (this.state === CircuitState.CLOSED && this.failures > 0) {
          this.failures = Math.max(0, this.failures - 1);
        }
      }, this.config.resetTimeout);
    }
  }

  destroy(): void {
    if (this.resetTimer) {
      clearInterval(this.resetTimer);
      this.resetTimer = null;
    }
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
  }
}

// Singleton instance
export const sdCircuitBreakerInstance = new sdCircuitBreaker();
