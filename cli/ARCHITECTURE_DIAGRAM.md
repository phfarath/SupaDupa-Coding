# Architecture Diagram: Error Recovery and Resilience

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SupaDupaCode CLI                                │
│                     Resilience Architecture                             │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   User Request   │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Configuration Manager                                                   │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  JSON Schema Validator (AJV)                                       │  │
│  │  • Validates structure                                             │  │
│  │  • Type checking                                                   │  │
│  │  • Constraint validation                                           │  │
│  │  • Clear error messages                                            │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Orchestrator (Enhanced)                                                 │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────┐         │
│  │  Task Execution Pipeline                                   │         │
│  │                                                             │         │
│  │  1. Select Agent                                           │         │
│  │  2. Check Circuit Breaker ──┐                             │         │
│  │  3. Execute with Retry      │                             │         │
│  │  4. Update Circuit Breaker ─┘                             │         │
│  └────────────────────────────────────────────────────────────┘         │
│                                                                          │
│  Per-Agent Circuit Breakers:                                            │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐         │
│  │   Frontend   │   Backend    │      QA      │     Docs     │         │
│  │  [CLOSED]    │  [CLOSED]    │  [CLOSED]    │  [CLOSED]    │         │
│  └──────────────┴──────────────┴──────────────┴──────────────┘         │
└──────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Retry Logic (Exponential Backoff)                                      │
│                                                                          │
│  Try 1 ──[fail]──> Wait 1s  ──> Try 2 ──[fail]──> Wait 2s  ──>         │
│  Try 3 ──[fail]──> Wait 4s  ──> Try 4 ──[fail]──> Wait 8s  ──>         │
│  Try 5 ──[fail]──> Wait 16s ──> Try 6 ──[fail]──> Wait 30s ──> FAIL    │
│                                                                          │
│  Events: task-retry(attempt, delay, error)                              │
└──────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Circuit Breaker State Machine                                          │
│                                                                          │
│         ┌─────────┐                                                     │
│         │ CLOSED  │ ◄────────────────────┐                              │
│         │ Normal  │                      │                              │
│         └────┬────┘                      │                              │
│              │                           │                              │
│         5 failures                  2 successes                         │
│              │                           │                              │
│              ▼                           │                              │
│         ┌─────────┐    60s timeout  ┌──────────┐                       │
│         │  OPEN   │ ───────────────>│ HALF_OPEN│                       │
│         │ Blocked │                 │  Testing │                       │
│         └─────────┘                 └────┬─────┘                       │
│              ▲                           │                              │
│              └─────── 1 failure ─────────┘                              │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Authentication Layer                                                    │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Token Manager                                                     │  │
│  │  • Secure generation (crypto.randomBytes)                         │  │
│  │  • SHA-256 hashing                                                │  │
│  │  • File permissions (0600)                                        │  │
│  │  • Token rotation                                                 │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  .supadupacode.token (gitignored)                                       │
└──────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Agents (Frontend, Backend, QA, Docs)                                   │
│                                                                          │
│  Execute tasks with:                                                    │
│  • Automatic retry on failure                                           │
│  • Circuit breaker protection                                           │
│  • Validated configuration                                              │
│  • Secure authentication                                                │
└──────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Event Bus & Monitoring                                                 │
│                                                                          │
│  Events:                                                                │
│  • task-retry(task, attempt, delay, error)                             │
│  • execution-failed(execution, error)                                   │
│  • agent-registered(name, agent)                                        │
│  • task-started(task)                                                   │
│  • task-completed(task, result)                                         │
│                                                                          │
│  Metrics:                                                               │
│  • Retry count per task                                                 │
│  • Circuit breaker states                                               │
│  • Validation failures                                                  │
│  • Authentication attempts                                              │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│  Data Flow Example: Task Execution with Failures                        │
│                                                                          │
│  1. Task received → Validate config ✓                                   │
│  2. Check circuit breaker → CLOSED ✓                                    │
│  3. Execute task → FAILED (network error)                               │
│  4. Emit task-retry event                                               │
│  5. Wait 1 second (exponential backoff)                                 │
│  6. Execute task → FAILED (timeout)                                     │
│  7. Emit task-retry event                                               │
│  8. Wait 2 seconds (exponential backoff)                                │
│  9. Execute task → SUCCESS ✓                                            │
│  10. Reset circuit breaker failure count                                │
│  11. Return result to user                                              │
│                                                                          │
│  Total time: ~3 seconds (1s + 2s delays)                                │
│  Retries used: 2 of 3                                                   │
│  Circuit breaker: Remained CLOSED                                       │
└──────────────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Configuration Manager
- **Purpose**: Load, validate, and manage configuration
- **Input**: `.supadupacode.json`
- **Validation**: JSON Schema with AJV
- **Output**: Validated configuration object

### 2. Orchestrator
- **Purpose**: Coordinate task execution across agents
- **Features**: 
  - Per-agent circuit breakers
  - Retry logic integration
  - Event emission
  - Task lifecycle management

### 3. Retry Logic
- **Algorithm**: Exponential backoff
- **Delays**: 1s → 2s → 4s → 8s → 16s → 30s (max)
- **Configurable**: Max retries, initial delay, backoff factor
- **Events**: Emits retry attempts for monitoring

### 4. Circuit Breaker
- **States**: CLOSED, OPEN, HALF_OPEN
- **Thresholds**: 5 failures to open, 2 successes to close
- **Timeout**: 60 seconds before testing recovery
- **Scope**: Per-agent (isolated failures)

### 5. Authentication
- **Mechanism**: Token-based
- **Storage**: File with restricted permissions (0600)
- **Security**: Crypto.randomBytes, SHA-256 hashing
- **Operations**: Generate, verify, rotate, delete

## Data Flow

```
User Request
    ↓
Configuration Validation (JSON Schema)
    ↓
Task Creation
    ↓
Orchestrator
    ↓
Circuit Breaker Check
    ↓
Task Execution (with Retry Logic)
    ↓
Agent Execution
    ↓
Result or Retry
    ↓
Circuit Breaker Update
    ↓
Event Emission
    ↓
Response to User
```

## Error Scenarios

### Scenario 1: Transient Failure (Network Issue)
1. Task fails with network error
2. Retry logic kicks in
3. Wait 1 second
4. Retry succeeds
5. Task completes successfully

**Outcome**: Self-recovery, no user intervention needed

### Scenario 2: Repeated Failures
1. Task fails 5 times
2. Circuit breaker opens
3. Subsequent attempts immediately rejected
4. Wait 60 seconds
5. Circuit breaker enters HALF_OPEN
6. Test request succeeds
7. Circuit breaker closes

**Outcome**: System protected, automatic recovery

### Scenario 3: Invalid Configuration
1. User attempts to save invalid config
2. JSON Schema validation fails
3. Clear error message returned
4. Configuration not saved
5. User corrects and retries

**Outcome**: Early error detection, runtime errors prevented

## Benefits Summary

✅ **Reliability**: Automatic retry on transient failures  
✅ **Resilience**: Circuit breaker prevents cascading failures  
✅ **Correctness**: Configuration validation prevents errors  
✅ **Security**: Token-based authentication for sensitive ops  
✅ **Observability**: Events and metrics for monitoring  
✅ **Maintainability**: Clean separation of concerns  
✅ **Testability**: Comprehensive test coverage (61 tests)  
