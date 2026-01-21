# Agents Module

## Purpose

The agents module implements specialized AI agents that autonomously execute different phases of software development. Each agent has a specific role (planning, coding, testing, documentation, decision-making) and can collaborate through a shared memory system.

---

## Main Files

- **`base-agent.ts`**: Abstract base class defining common agent interface and lifecycle
- **`planner-agent.ts`**: Decomposes requirements into executable tasks and generates plans
- **`developer-agent.ts`**: Implements code changes based on plans and requirements
- **`qa-agent.ts`**: Runs tests, validates implementations, and enforces quality gates
- **`docs-agent.ts`**: Generates and maintains project documentation
- **`brain-agent.ts`**: Provides decision-making, context management, and cross-agent coordination
- **`index.ts`**: Exports all agents for use by orchestrator
- **`planner/plan-orchestrator.ts`**: Core planner logic for plan generation
- **`planner/queue.ts`**: Task queue management for planner execution

---

## Key Interfaces

### BaseAgent (Abstract)

```typescript
abstract class BaseAgent {
  // Lifecycle
  abstract async initialize(): Promise<void>;
  abstract async execute(input: AgentInput): Promise<AgentOutput>;
  abstract async cleanup(): Promise<void>;

  // Memory integration
  protected async storeMemory(key: string, data: any): Promise<void>;
  protected async loadMemory(key: string): Promise<any>;

  // Metrics
  getMetrics(): AgentMetrics;
}
```

### AgentInput

```typescript
interface AgentInput {
  task: string;
  context?: Record<string, any>;
  config?: AgentConfig;
  memoryContext?: MemoryRecord[];
}
```

### AgentOutput

```typescript
interface AgentOutput {
  success: boolean;
  result?: any;
  error?: string;
  artifacts?: string[];
  memoryUpdates?: MemoryRecord[];
}
```

---

## Agent Flow

```
1. Orchestrator instantiates agent
   ↓
2. Agent.initialize()
   - Load config
   - Connect to memory system
   - Load context from memory
   ↓
3. Agent.execute(input)
   - Parse task requirements
   - Call LLM via provider registry
   - Process response
   - Store artifacts
   ↓
4. Store results in memory
   - Emit events for monitoring
   ↓
5. Agent.cleanup()
   - Flush memory
   - Close connections
```

---

## Usage Examples

### Using Planner Agent

```typescript
import { PlannerAgent } from './agents/planner-agent';
import { UnifiedConfigManager } from '../core/unified-config-manager';

const config = new UnifiedConfigManager();
await config.initialize();

const planner = new PlannerAgent(config);
await planner.initialize();

const result = await planner.execute({
  task: "Add user authentication to the application",
  context: {
    techStack: ["Node.js", "TypeScript", "Express", "JWT"],
    existingArtifacts: ["src/api/routes/", "src/models/user.ts"]
  }
});

// Result contains execution plan with steps
console.log(result.result.steps);
```

### Using Developer Agent

```typescript
import { DeveloperAgent } from './agents/developer-agent';

const developer = new DeveloperAgent(config);
await developer.initialize();

const result = await developer.execute({
  task: "Implement JWT authentication middleware",
  context: {
    plan: plannerResult.result,
    step: plannerResult.result.steps[0]
  }
});

// Result contains implemented code and modified files
console.log(result.artifacts);
```

### Memory-Aware Agent

```typescript
// Agent stores decision in memory
await agent.storeMemory('auth-decision', {
  decision: 'use-jwt',
  rationale: 'Stateless, scalable, widely supported',
  timestamp: new Date().toISOString()
});

// Other agents can load this context
const authDecision = await anotherAgent.loadMemory('auth-decision');
```

---

## Edge Cases & Gotchas

### Memory Permissions
- **Issue**: Agents cannot read memory records created by other agents without permissions
- **Solution**: Planner agent should grant permissions when creating execution plan
- **Check**: Use `memory.hasPermission(agentId, recordId)` before accessing

### LLM Provider Failures
- **Issue**: External API may fail or timeout
- **Solution**: Provider registry has circuit breaker and failover logic
- **Mitigation**: Agent should catch `ProviderError` and handle gracefully

### State Management
- **Issue**: Agents are stateless; don't store instance variables
- **Solution**: Use memory system or workflow state for persistence
- **Anti-pattern**: `this.state = {}` won't survive across invocations

### Concurrent Execution
- **Issue**: Multiple agents may access same resources
- **Solution**: Use memory transactions and optimistic locking
- **Pattern**: Check `updated_at` timestamp before updating

### Partial Failures
- **Issue**: Agent may complete some work but fail mid-execution
- **Solution**: Design for idempotency; track completed sub-tasks in memory
- **Recovery**: Re-running should skip completed work

---

## Testing

### Unit Tests

```bash
# Test individual agents
npm test -- tests/agent.test.ts

# Test planner integration
npm run example:planner
```

### Test Criteria

- **Initialization**: Agent loads config and connects to memory
- **Execution**: Agent processes valid input and returns expected output
- **Error Handling**: Agent handles invalid input gracefully
- **Memory Integration**: Agent reads/writes memory correctly
- **Cleanup**: Agent releases resources on cleanup

### Mock Strategy

```typescript
// Mock LLM provider for deterministic tests
const mockProvider = {
  async complete(prompt: string) {
    return { text: "Mocked response", usage: { tokens: 100 } };
  }
};

// Inject into agent config
const config = { provider: mockProvider };
const agent = new PlannerAgent(config);
```

---

## Points of Attention

### Planner Agent
- **Must** generate valid JSON plans matching `PlannerPlanDTO` schema
- **Must** include dependency graph (no circular dependencies)
- **Should** estimate task duration for scheduling

### Developer Agent
- **Must** track modified files in output
- **Must** use MCP tools for Git operations (no direct shell commands)
- **Should** validate syntax before committing

### QA Agent
- **Must** run tests in isolated environment
- **Must** report test failures with detailed logs
- **Should** support parallel test execution

### Brain Agent
- **Critical**: Coordinates multiple agents; failure blocks entire workflow
- **Must** maintain global context in memory
- **Should** implement retry logic for critical decisions

### All Agents
- **Must** emit events for monitoring (AGENT_STARTED, AGENT_COMPLETED, AGENT_FAILED)
- **Must** log at appropriate levels (error, warn, info)
- **Must** validate input before processing
- **Must** implement timeout handling (default: 5 minutes)

---

## Related Documentation

- **Memory System**: `cli/src/memory/README.md`
- **Provider Registry**: `cli/src/api/README.md`
- **Workflow Engine**: `cli/src/workflow/README.md`
- **Implementation Plan**: `docs/imp-plan.md`
