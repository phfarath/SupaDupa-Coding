# API Module

## Purpose

The API module provides a REST API server for external integrations and manages connections to multiple LLM providers (OpenAI, Anthropic, local models). It includes rate limiting, circuit breakers, and request validation for production-grade reliability.

---

## Main Files

- **`server.ts`**: Express server setup, route registration, and middleware configuration
- **`index.ts`**: Module exports and helper functions
- **`provider-registry.ts`**: Central registry for managing multiple LLM providers with failover
- **`llm-client.ts`**: Unified client interface for LLM interactions
- **`rate-limiter.ts`**: Token bucket rate limiting implementation
- **`circuit-breaker.ts`**: Circuit breaker pattern to prevent cascade failures
- **`model-detector.ts`**: Auto-detection of appropriate models based on task
- **`routes/plan.ts`**: REST endpoints for plan creation and management
- **`middleware/validation.ts`**: Request validation middleware using AJV
- **`providers/base-provider.ts`**: Abstract base class for LLM providers
- **`providers/openai-provider.ts`**: OpenAI API integration (GPT-4, etc.)
- **`providers/anthropic-provider.ts`**: Anthropic API integration (Claude)
- **`providers/local-provider.ts`**: Local model integration (Ollama)

---

## Key Interfaces

### Provider Interface

```typescript
abstract class BaseProvider {
  abstract async complete(
    prompt: string,
    options?: CompletionOptions
  ): Promise<CompletionResponse>;

  abstract async stream(
    prompt: string,
    options?: StreamOptions
  ): AsyncIterableIterator<CompletionChunk>;

  isAvailable(): Promise<boolean>;
  getModelInfo(): ModelInfo;
}
```

### CompletionOptions

```typescript
interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  systemPrompt?: string;
  model?: string;
}
```

### ProviderConfig

```typescript
interface ProviderConfig {
  provider: 'openai' | 'anthropic' | 'local';
  apiKey?: string;
  endpoint?: string;
  model?: string;
  timeout?: number;
  retries?: number;
}
```

---

## API Flow

```
Client Request → Express Server
   ↓
Rate Limiter (check quota)
   ↓
Validation Middleware (AJV schema check)
   ↓
Route Handler (/plan, /status, etc.)
   ↓
Circuit Breaker (check service health)
   ↓
Provider Registry (select provider)
   ↓
LLM Provider (OpenAI/Anthropic/Local)
   ↓
Response Processing
   ↓
JSON Response → Client
```

---

## Usage Examples

### Starting API Server

```typescript
import { startApiServer } from './api/server';

const server = await startApiServer({
  port: 3000,
  host: '0.0.0.0',
  cors: { origin: '*' }
});

console.log('API server running on http://localhost:3000');

// Graceful shutdown
process.on('SIGTERM', async () => {
  await server.stop();
});
```

### Using Provider Registry

```typescript
import { ProviderRegistry } from './api/provider-registry';

const registry = new ProviderRegistry();

// Register providers
await registry.registerProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4',
  endpoint: 'https://api.openai.com/v1'
});

await registry.registerProvider('anthropic', {
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022'
});

// Get active provider (with failover)
const provider = await registry.getProvider();
const response = await provider.complete('Write a hello world function');
console.log(response.text);
```

### Making API Requests

```bash
# Create a plan
curl -X POST http://localhost:3000/api/v1/plan \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Add user authentication",
    "context": {
      "techStack": ["Node.js", "TypeScript"],
      "projectType": "web-api"
    }
  }'
```

### Rate Limiting Configuration

```typescript
import { RateLimiter } from './api/rate-limiter';

const limiter = new RateLimiter({
  tokensPerInterval: 100,  // 100 requests
  interval: 60000,         // per minute
  fireImmediately: true
});

// Check if request allowed
if (await limiter.removeTokens(1)) {
  // Process request
} else {
  // Reject with 429 Too Many Requests
}
```

### Circuit Breaker Configuration

```typescript
import { CircuitBreaker } from './api/circuit-breaker';

const breaker = new CircuitBreaker({
  failureThreshold: 5,     // Open after 5 failures
  successThreshold: 2,     // Close after 2 successes
  timeout: 30000,          // 30 second timeout
  resetTimeout: 60000      // Try again after 1 minute
});

const result = await breaker.execute(async () => {
  return await externalApiCall();
});
```

---

## Edge Cases & Gotchas

### Provider Failover
- **Issue**: Primary provider (e.g., OpenAI) is down or rate-limited
- **Solution**: Registry automatically falls back to secondary provider
- **Check**: Monitor logs for "Provider failover" messages

### Rate Limit Exhaustion
- **Issue**: Client exceeds request quota
- **Solution**: Returns `429 Too Many Requests` with `Retry-After` header
- **Mitigation**: Implement exponential backoff on client side

### Circuit Breaker Open State
- **Issue**: Service marked as unavailable after repeated failures
- **Solution**: Circuit opens, requests fail fast without calling service
- **Recovery**: Circuit auto-recovers after reset timeout

### Validation Failures
- **Issue**: Client sends invalid request body
- **Solution**: Validation middleware returns `400 Bad Request` with detailed error
- **Fix**: Check request schema in error response

### Streaming Interruptions
- **Issue**: Client disconnects during stream response
- **Solution**: Detect disconnect and cancel LLM request to save tokens
- **Pattern**: Use `req.on('close')` to clean up

### Model Not Found
- **Issue**: Requested model doesn't exist for provider
- **Solution**: Model detector suggests alternative or falls back to default
- **Check**: `ModelNotFoundError` in logs

---

## Testing

### Unit Tests

```bash
# Test provider registry
npm test -- tests/provider-registry.test.ts

# Test API integration
npm run example:api
```

### Integration Tests

```bash
# Start test API server
npm run start:api

# In another terminal, test endpoints
curl http://localhost:3000/api/v1/health
curl -X POST http://localhost:3000/api/v1/plan -d '{"request":"test"}'
```

### Test Criteria

- **Provider Registration**: Can register and retrieve providers
- **Failover**: Falls back to secondary provider on primary failure
- **Rate Limiting**: Enforces request quotas correctly
- **Circuit Breaker**: Opens after threshold failures, closes after successes
- **Validation**: Rejects invalid requests with helpful errors
- **Streaming**: Handles streaming responses correctly
- **Error Handling**: Returns appropriate HTTP status codes

### Mock Providers

```typescript
// Mock provider for testing
class MockProvider extends BaseProvider {
  async complete(prompt: string): Promise<CompletionResponse> {
    return {
      text: 'Mocked response',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
    };
  }
}
```

---

## Points of Attention

### Security
- **Never log API keys**: Redact secrets in logs
- **Validate all inputs**: Use AJV schemas for request validation
- **CORS configuration**: Restrict origins in production
- **Rate limiting**: Always enabled for public endpoints
- **Timeout enforcement**: Prevent resource exhaustion

### Performance
- **Connection pooling**: Reuse HTTP connections to providers
- **Caching**: Cache model info and provider availability
- **Async processing**: Don't block on long LLM calls
- **Streaming**: Use streaming for long responses to improve perceived latency

### Reliability
- **Circuit breaker**: Required for all external API calls
- **Retry logic**: Implement exponential backoff with jitter
- **Health checks**: `/health` endpoint for monitoring
- **Graceful shutdown**: Clean up connections on SIGTERM

### Monitoring
- **Request logs**: Log all API requests with correlation IDs
- **Metrics**: Track latency, error rates, provider usage
- **Alerts**: Monitor circuit breaker state transitions
- **Quotas**: Track token usage per provider

### Provider-Specific Notes

**OpenAI**
- Rate limits vary by model and tier
- Use `gpt-4-turbo` for cost optimization
- Streaming reduces time-to-first-token

**Anthropic**
- Claude models have different context windows
- Use `claude-3-5-sonnet` for best balance
- System prompts are separate parameter

**Local (Ollama)**
- No rate limits but slower than cloud
- Requires local Ollama server running
- Model quality varies

---

## REST API Endpoints

### POST /api/v1/plan
Create an execution plan

**Request:**
```json
{
  "request": "string",
  "context": {
    "techStack": ["string"],
    "projectType": "string"
  }
}
```

**Response:**
```json
{
  "planId": "string",
  "description": "string",
  "steps": [
    {
      "id": "string",
      "name": "string",
      "agent": "string",
      "dependencies": ["string"]
    }
  ]
}
```

### GET /api/v1/health
Health check endpoint

**Response:**
```json
{
  "status": "healthy",
  "providers": {
    "openai": "available",
    "anthropic": "available"
  }
}
```

### GET /api/v1/providers
List available providers

**Response:**
```json
{
  "providers": [
    {
      "name": "openai",
      "status": "active",
      "model": "gpt-4"
    }
  ]
}
```

---

## Configuration

### Environment Variables

```bash
# Provider selection
LLM_PROVIDER="openai"

# OpenAI
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4"
OPENAI_ENDPOINT="https://api.openai.com/v1"

# Anthropic
ANTHROPIC_API_KEY="sk-ant-..."
ANTHROPIC_MODEL="claude-3-5-sonnet-20241022"
ANTHROPIC_ENDPOINT="https://api.anthropic.com/v1"

# Local
LOCAL_PROVIDER_ENDPOINT="http://localhost:11434/v1"
LOCAL_MODEL="llama3"

# API Server
API_PORT="3000"
API_HOST="0.0.0.0"
CORS_ORIGIN="*"
```

---

## Related Documentation

- **Agents**: `cli/src/agents/README.md`
- **Configuration**: `cli/src/core/README.md`
- **Implementation Plan**: `docs/imp-plan.md`
