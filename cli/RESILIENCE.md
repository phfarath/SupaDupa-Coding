# Error Recovery and Resilience

This document describes the error recovery and resilience features implemented in SupaDupaCode CLI.

## Overview

The CLI implements several resilience patterns to handle transient failures and prevent cascading errors:

1. **Retry Logic with Exponential Backoff** - Automatically retry failed operations
2. **Circuit Breaker Pattern** - Prevent repeated attempts to failing services
3. **Configuration Validation** - Ensure configuration integrity before execution
4. **Authentication** - Secure token-based authentication for sensitive operations

## Retry Logic with Exponential Backoff

### How It Works

When a task fails, the orchestrator will automatically retry it with increasing delays between attempts. This helps handle transient failures (network issues, temporary resource unavailability, etc.).

### Configuration

Configure retry behavior in `.supadupacode.json`:

```json
{
  "orchestration": {
    "retries": 3,
    "timeout": 300000
  }
}
```

- `retries`: Maximum number of retry attempts (0-10, default: 3)
- `timeout`: Maximum time in milliseconds for task execution (default: 300000 = 5 minutes)

### Retry Strategy

- **Initial Delay**: 1 second
- **Backoff Factor**: 2x (each retry doubles the delay)
- **Maximum Delay**: 30 seconds
- **Formula**: `delay = min(initialDelay * 2^attempt, maxDelay)`

Example retry delays:
- Attempt 1: 1 second
- Attempt 2: 2 seconds
- Attempt 3: 4 seconds
- Attempt 4: 8 seconds
- Attempt 5: 16 seconds
- Attempt 6+: 30 seconds (capped)

### Events

The orchestrator emits `task-retry` events you can listen to:

```javascript
orchestrator.on('task-retry', (event) => {
  console.log(`Retrying task ${event.task.id}, attempt ${event.attempt}, waiting ${event.delay}ms`);
  console.log(`Error: ${event.error}`);
});
```

### Usage Example

```javascript
import { Orchestrator } from './src/core/orchestrator.js';

const orchestrator = new Orchestrator({
  retries: 5,
  timeout: 600000 // 10 minutes
});

// Listen for retry events
orchestrator.on('task-retry', (event) => {
  logger.warn(`Retrying task after failure`, event);
});

const plan = await orchestrator.createPlan('Implement feature');
const execution = await orchestrator.executePlan(plan);
```

## Circuit Breaker Pattern

### How It Works

The circuit breaker prevents repeated calls to failing agents by tracking failure rates. It has three states:

1. **CLOSED** (normal operation) - All requests pass through
2. **OPEN** (circuit tripped) - Requests are immediately rejected
3. **HALF_OPEN** (testing) - Limited requests allowed to test recovery

### Configuration

Circuit breaker settings are configured per agent:

- **Failure Threshold**: 5 failures before opening (default)
- **Success Threshold**: 2 successes to close from half-open (default)
- **Timeout**: 60 seconds before attempting half-open (default)

### State Transitions

```
CLOSED --[5 failures]--> OPEN
OPEN --[60s timeout]--> HALF_OPEN
HALF_OPEN --[2 successes]--> CLOSED
HALF_OPEN --[1 failure]--> OPEN
```

### Benefits

- Prevents cascading failures
- Gives failing services time to recover
- Fast-fail instead of waiting for timeouts
- Automatic recovery detection

### Monitoring

Check circuit breaker state:

```javascript
const breaker = orchestrator.circuitBreakers.get('agent-name');
const state = breaker.getState();

console.log(`State: ${state.state}`);
console.log(`Failure Count: ${state.failureCount}`);
console.log(`Success Count: ${state.successCount}`);
```

## Configuration Validation

### Schema-Based Validation

All configuration is validated against a JSON Schema before saving or loading. This prevents invalid configurations from causing runtime errors.

### Validation Rules

The schema enforces:

- **Required Fields**: All essential configuration sections must be present
- **Type Checking**: Values must match expected types (string, boolean, integer, etc.)
- **Value Constraints**: 
  - Retry count: 0-10
  - Orchestration mode: sequential, concurrent, or handoff
  - Timeout: minimum 1000ms
- **Agent Configuration**: Each agent must have `enabled`, `role`, and `mcp_tools`
- **MCP Server Configuration**: Each server must have `enabled` flag

### Validation Errors

If validation fails, you'll receive a detailed error message:

```
Configuration validation failed: /orchestration/defaultMode must be equal to one of the allowed values
```

### Example Valid Configuration

```json
{
  "agents": {
    "frontend": {
      "enabled": true,
      "role": "frontend",
      "mcp_tools": ["filesystem", "git"]
    }
  },
  "mcp": {
    "servers": {
      "filesystem": { "enabled": true }
    }
  },
  "git": {
    "branchPrefix": "agent",
    "commitMessageFormat": "[{agent}] {scope}: {description}",
    "requirePR": true,
    "autoMerge": false
  },
  "orchestration": {
    "defaultMode": "sequential",
    "retries": 3,
    "timeout": 300000
  }
}
```

## Authentication

### Token-Based Authentication

The CLI supports token-based authentication for sensitive operations.

### Token Management

Generate and manage authentication tokens:

```javascript
import { TokenManager } from './src/utils/auth.js';

const tokenManager = new TokenManager();

// Initialize new token
const token = await tokenManager.init();

// Verify token
const isValid = await tokenManager.verify(token);

// Rotate token (for security)
const newToken = await tokenManager.rotate();

// Delete token
await tokenManager.delete();
```

### Token Storage

Tokens are stored in `.supadupacode.token` with owner-only read/write permissions (mode 0600) for security.

### Security Features

- **Secure Generation**: Uses crypto.randomBytes() for cryptographically secure tokens
- **SHA-256 Hashing**: Supports password/token hashing with optional salt
- **File Permissions**: Token files are created with restricted permissions
- **Token Rotation**: Easy rotation for security best practices

### Usage Example

```javascript
import { TokenManager, authorize } from './src/utils/auth.js';

const tokenManager = new TokenManager();
const token = await tokenManager.load(); // Or init() for new token

// Verify authorization
if (await authorize(userProvidedToken, tokenManager)) {
  // Authorized - proceed with sensitive operation
  console.log('Access granted');
} else {
  // Unauthorized
  console.log('Access denied');
}
```

## Best Practices

### Retry Configuration

1. **Set appropriate retry counts** based on operation criticality
   - Critical operations: 5-7 retries
   - Standard operations: 3 retries
   - Quick operations: 1-2 retries

2. **Configure timeouts** based on expected execution time
   - Short tasks: 1-2 minutes
   - Medium tasks: 5 minutes
   - Long tasks: 10+ minutes

3. **Monitor retry events** to identify problematic agents or tasks

### Circuit Breaker Usage

1. **Let it work automatically** - Circuit breakers are created per agent
2. **Monitor breaker states** in production
3. **Reset manually if needed** for testing or recovery

### Configuration Management

1. **Validate early** - Use `supadupacode validate` before deployment
2. **Version control** - Keep `.supadupacode.json` in version control
3. **Document changes** - Add comments (via external docs) explaining custom settings

### Authentication

1. **Rotate tokens regularly** - Use `tokenManager.rotate()` periodically
2. **Secure token storage** - Never commit `.supadupacode.token` to version control
3. **Use environment variables** - For CI/CD, store tokens as secrets

## Testing

### Unit Tests

Test retry logic:

```bash
npm test tests/retry.test.js
```

Test authentication:

```bash
npm test tests/auth.test.js
```

Test validation:

```bash
npm test tests/validation.test.js
```

### Integration Tests

Test orchestrator with retries:

```bash
npm test tests/integration.test.js
```

### All Tests

Run all tests:

```bash
npm test
```

## Monitoring and Observability

### Metrics

The following metrics are tracked:

- **Task Retry Count**: Number of retries per task
- **Circuit Breaker State**: Current state of each agent's circuit breaker
- **Validation Failures**: Count of configuration validation errors
- **Authentication Attempts**: Successful and failed authentication attempts

### Events

Subscribe to events for monitoring:

```javascript
orchestrator.on('task-retry', (event) => {
  metrics.increment('task.retry', { agent: event.task.agent });
});

orchestrator.on('execution-failed', (event) => {
  metrics.increment('execution.failure', { reason: event.error });
});
```

### Logs

All retry attempts, circuit breaker state changes, and authentication events are logged via the built-in logger.

## Troubleshooting

### Tasks Keep Failing After Retries

1. Check the error messages in logs
2. Verify agent configuration is correct
3. Ensure external dependencies are available
4. Consider increasing retry count or timeout
5. Check if circuit breaker is open

### Circuit Breaker Stuck Open

1. Check underlying service health
2. Manually reset the circuit breaker: `breaker.reset()`
3. Review failure threshold configuration
4. Investigate root cause of failures

### Configuration Validation Fails

1. Read the detailed validation error message
2. Check against schema requirements
3. Verify all required fields are present
4. Ensure values match expected types and constraints
5. Use `supadupacode config show` to inspect current config

### Authentication Issues

1. Verify token file exists and has correct permissions
2. Check token hasn't been corrupted
3. Rotate token if needed: `tokenManager.rotate()`
4. Ensure token path is accessible
5. Check file system permissions

## Future Enhancements

Planned improvements:

- [ ] Distributed circuit breaker state (for multi-node deployments)
- [ ] Custom retry strategies per agent
- [ ] Advanced authentication (OAuth, API keys, etc.)
- [ ] Real-time circuit breaker monitoring dashboard
- [ ] Automatic recovery recommendations
- [ ] Retry budget management
- [ ] Adaptive timeout adjustment
- [ ] Multi-factor authentication support
