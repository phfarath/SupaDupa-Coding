# SupaDupa-Coding API Integration

Complete implementation of the agentic API system for accepting requests, generating execution plans, and returning structured responses.

## Overview

The API integration provides a RESTful interface to the SupaDupa-Coding planner orchestrator, enabling external systems to:

1. Submit feature requests for planning
2. Receive structured execution plans
3. Monitor queue status
4. Check system health

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   API Request (POST /api/plan)              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Request Validation Middleware                  │
│           (Validates PlannerInputDTO Schema)                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                 Codebase Context Loader                     │
│         (Loads and analyzes repository files)               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              sdPlannerOrchestrator                          │
│         (Generates structured execution plan)               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                 Event System Emission                       │
│              (SD_EVENT_PLAN_CREATED)                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              JSON Response (PlannerPlanDTO)                 │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. API Server (`cli/src/api/server.ts`)

Main Express server with:
- CORS support
- Request logging
- Error handling
- Health checks
- Graceful shutdown

**Key Features:**
- Auto-initialization of LLM providers
- Event-driven architecture
- Production-ready error handling
- Configurable via environment variables

### 2. Plan Route (`cli/src/api/routes/plan.ts`)

Core planning endpoint:

**POST `/api/plan`**
- Accepts: `PlannerInputDTO`
- Returns: `PlannerPlanDTO`
- Validates: Request body schema
- Loads: Codebase context (optional)
- Emits: Plan creation events

**GET `/api/plan/health`**
- Returns: Provider status and orchestrator health

**GET `/api/plan/queue`**
- Returns: Current queue status and items

### 3. Validation Middleware (`cli/src/api/middleware/validation.ts`)

Request validation using AJV:
- Schema-based validation
- Detailed error messages
- Async error handling wrapper
- Development mode stack traces

### 4. Codebase Loader (`shared/utils/codebase-loader.ts`)

Intelligent repository analysis:
- Respects `.gitignore` patterns
- Filters binary files
- Size limits protection
- Context formatting for LLMs
- Recursive directory traversal

### 5. LLM Client Factory (`cli/src/config/llm.ts`)

Provider management:
- Singleton pattern
- Auto-loads from environment
- Supports OpenAI, Anthropic, Local models
- Dynamic provider registration

### 6. Event System (`shared/events/event-emitter.ts`)

Global event emitter:
- System-wide event constants
- Type-safe event names
- Cross-module communication

## API Endpoints

### Create Execution Plan

**Request:**
```bash
POST /api/plan
Content-Type: application/json

{
  "request": "Implement user authentication with JWT",
  "context": {
    "techStack": ["typescript", "express", "postgresql"],
    "existingArtifacts": ["src/server.ts", "src/routes/"],
    "projectType": "backend-api"
  },
  "preferences": {
    "prioritizeQuality": true
  },
  "constraints": {
    "maxDuration": 480,
    "forbiddenAgents": []
  },
  "metadata": {
    "source": "api",
    "urgency": "high",
    "tags": ["authentication", "security"]
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "plan": {
    "planId": "plan-1234567890",
    "description": "Implement user authentication with JWT",
    "steps": [
      {
        "id": "step-analysis-1234",
        "name": "Scope & Requirements Review",
        "type": "analysis",
        "agent": "planner",
        "description": "Clarify business goals...",
        "dependencies": [],
        "expectedOutputs": [
          "docs/requirements/plan-1234567890-requirements.md"
        ],
        "estimatedDuration": 45
      }
    ],
    "artifacts": [
      "docs/requirements/plan-1234567890-requirements.md",
      "docs/design/plan-1234567890-architecture.md"
    ],
    "metadata": {
      "createdAt": "2024-01-30T10:00:00.000Z",
      "estimatedDuration": 315,
      "dependencies": [],
      "priority": "high",
      "tags": ["authentication", "security"],
      "version": "1.0.0"
    }
  },
  "metadata": {
    "codebaseAnalyzed": true,
    "repositoryPath": "/path/to/project",
    "timestamp": "2024-01-30T10:00:00.000Z"
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Validation failed",
  "errors": [
    {
      "field": "/request",
      "message": "must NOT be shorter than 1 characters"
    }
  ],
  "timestamp": "2024-01-30T10:00:00.000Z"
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "error": "Plan creation failed: ...",
  "timestamp": "2024-01-30T10:00:00.000Z"
}
```

### Health Check

**Request:**
```bash
GET /api/plan/health
```

**Response:**
```json
{
  "status": "healthy",
  "orchestrator": "ready",
  "providers": 2,
  "timestamp": "2024-01-30T10:00:00.000Z"
}
```

### Queue Status

**Request:**
```bash
GET /api/plan/queue
```

**Response:**
```json
{
  "success": true,
  "queue": {
    "size": 3,
    "isEmpty": false,
    "items": [
      {
        "plan": { "planId": "...", ... },
        "enqueuedAt": "2024-01-30T10:00:00.000Z",
        "metadata": {
          "request": "Implement feature X",
          "source": "api",
          "tags": ["feature"]
        }
      }
    ]
  },
  "timestamp": "2024-01-30T10:00:00.000Z"
}
```

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# LLM Provider Selection
LLM_PROVIDER="openai"

# OpenAI Configuration
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4"
OPENAI_ENDPOINT="https://api.openai.com/v1"

# Anthropic Configuration
ANTHROPIC_API_KEY="sk-ant-..."
ANTHROPIC_MODEL="claude-3-5-sonnet-20241022"
ANTHROPIC_ENDPOINT="https://api.anthropic.com/v1"

# Local Model Configuration
LOCAL_PROVIDER_ENDPOINT="http://localhost:11434/v1"
LOCAL_MODEL="llama3"

# API Server Configuration
API_PORT="3000"
API_HOST="0.0.0.0"
CORS_ORIGIN="*"

# Repository Path
REPOSITORY_PATH="/path/to/your/codebase"

# Environment
NODE_ENV="development"
```

## Running the Server

### Development Mode

```bash
npm run start:api
```

This uses `ts-node` for live TypeScript compilation.

### Production Mode

```bash
npm run build
npm run start:api:prod
```

This compiles TypeScript first, then runs the compiled JavaScript.

### Direct Invocation

```bash
node dist/src/api-server.js
```

## Testing with cURL

### Create a Plan

```bash
curl -X POST http://localhost:3000/api/plan \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Add user profile management",
    "context": {
      "techStack": ["typescript", "react"],
      "projectType": "web-app"
    },
    "preferences": {
      "prioritizeSpeed": true
    }
  }'
```

### Check Health

```bash
curl http://localhost:3000/api/plan/health
```

### View Queue

```bash
curl http://localhost:3000/api/plan/queue
```

## Event System

The API emits events that can be subscribed to:

```typescript
import { systemEvents, SystemEvent } from '../shared/events/event-emitter';

// Listen for plan creation
systemEvents.on(SystemEvent.PLAN_CREATED, (data) => {
  console.log('New plan created:', data.plan.planId);
});

// Listen for plan failures
systemEvents.on(SystemEvent.PLAN_FAILED, (data) => {
  console.error('Plan failed:', data.error);
});
```

## Integration with Existing System

The API integrates seamlessly with:

1. **Planner Core** (`cli/src/agents/planner/`)
   - Uses existing `sdPlannerOrchestrator`
   - Stores plans in `plannerExecutionQueue`

2. **Memory System** (`cli/src/memory/`)
   - Plans can be stored in memory for learning
   - Future: Retrieve similar plans from cache

3. **Provider Registry** (`cli/src/api/provider-registry.ts`)
   - Auto-loads configured LLM providers
   - Supports multiple providers simultaneously

4. **Event System** (`shared/events/`)
   - Emits standard events for orchestration
   - Enables cross-module communication

## Error Handling

The API implements multiple layers of error handling:

1. **Request Validation** - Catches malformed requests before processing
2. **Business Logic Errors** - Handles planner failures gracefully
3. **System Errors** - Catches unexpected errors with stack traces (dev mode)
4. **Timeout Protection** - 30s max for all async operations
5. **Retry Logic** - LLM requests retry 3x before failing

## Security Considerations

1. **API Keys** - Never commit `.env` file
2. **CORS** - Configure `CORS_ORIGIN` for production
3. **Rate Limiting** - Integrate `sdRateLimiter` for production use
4. **Input Validation** - All requests validated against JSON schema
5. **Path Traversal** - Codebase loader sanitizes file paths

## Production Deployment

### Environment Setup

```bash
# Set production environment
export NODE_ENV=production

# Secure CORS
export CORS_ORIGIN="https://your-frontend.com"

# Set API keys
export OPENAI_API_KEY="..."
export ANTHROPIC_API_KEY="..."

# Configure port (use reverse proxy in production)
export API_PORT=3000
```

### Process Management

Use PM2 or similar:

```bash
pm2 start dist/src/api-server.js --name supadupa-api
pm2 save
pm2 startup
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoring

Key metrics to monitor:

- **Request Rate** - Requests per minute
- **Response Time** - Average latency
- **Error Rate** - 4xx and 5xx responses
- **Queue Size** - Plan backlog
- **Provider Status** - LLM availability

## Future Enhancements

1. **LLM Integration** - Call LLM providers for intelligent planning
2. **Plan Execution** - Auto-execute generated plans
3. **WebSocket Support** - Real-time plan updates
4. **Authentication** - API key/JWT authentication
5. **Rate Limiting** - Request throttling per client
6. **Caching** - Cache similar plans from memory
7. **Batch Operations** - Submit multiple plans at once
8. **Plan Templates** - Reusable plan patterns

## Troubleshooting

### Server Won't Start

- Check port availability: `lsof -i :3000`
- Verify environment variables: `cat .env`
- Check TypeScript compilation: `npm run build`

### Plans Not Being Created

- Verify orchestrator initialization
- Check plan validation errors in logs
- Ensure prompt file exists: `cli/prompts/planner/system/v1.md`

### Codebase Loading Fails

- Verify `REPOSITORY_PATH` is correct
- Check file permissions
- Review ignore patterns

## Support

For issues or questions:
- Check logs for detailed error messages
- Review `IMPLEMENTATION_STATUS.md` for module status
- Consult `docs/imp-plan.md` for architecture details
