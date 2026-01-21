# Inline Documentation Recommendations

## Level 3: Inline Documentation Strategy

This document identifies the **top 15 locations** where inline documentation (JSDoc/docstrings) would provide the most value, followed by **5 complete examples** ready to be inserted into the code.

---

## 📍 Top 15 Priority Locations for Documentation

### Critical (Add First)

1. **`cli/src/agents/base-agent.ts` → `sdBaseAgent.execute()`**
   - **Why**: Core agent execution method used by all agents
   - **Missing**: Parameters, return types, error conditions, side effects
   - **Impact**: High - affects all agent implementations

2. **`cli/src/agents/planner/plan-orchestrator.ts` → `sdPlannerOrchestrator.createExecutionPlan()`**
   - **Why**: Main entry point for plan generation
   - **Missing**: Input validation rules, LLM fallback behavior, event emission
   - **Impact**: High - critical path for entire system

3. **`cli/src/api/provider-registry.ts` → `sdProviderRegistry.complete()`**
   - **Why**: Unified interface for LLM interactions with failover logic
   - **Missing**: Failover behavior, circuit breaker state, retry strategy
   - **Impact**: High - all LLM calls go through this

4. **`cli/src/memory/memory-repository.ts` → `MemoryRepository.store()`**
   - **Why**: Central memory storage with permission management
   - **Missing**: Permission rules, transaction handling, embedding behavior
   - **Impact**: High - critical for agent coordination

5. **`cli/src/workflow/workflow-runner.ts` → `WorkflowRunner.execute()`**
   - **Why**: Orchestrates entire workflow execution
   - **Missing**: Checkpoint strategy, dependency resolution, error recovery
   - **Impact**: High - controls all task execution

### High Priority

6. **`cli/src/mcp/mcp-client.ts` → `MCPClient.invokeTool()`**
   - **Why**: Gateway for all MCP tool invocations
   - **Missing**: Permission checks (TODO), tool validation, error mapping
   - **Impact**: Medium-High - security-critical operation

7. **`cli/src/api/circuit-breaker.ts` → `CircuitBreaker.execute()`**
   - **Why**: Prevents cascade failures from external APIs
   - **Missing**: State transition logic, threshold calculations, recovery strategy
   - **Impact**: Medium-High - affects system reliability

8. **`cli/src/workflow/checkpoint-manager.ts` → `CheckpointManager.saveCheckpoint()`**
   - **Why**: Persistence layer for workflow recovery
   - **Missing**: Compression strategy (TODO), validation rules, retention policy
   - **Impact**: Medium-High - critical for long-running workflows

9. **`cli/src/core/unified-config-manager.ts` → `UnifiedConfigManager.loadConfig()`**
   - **Why**: Configuration loading with validation and merging
   - **Missing**: Merge strategy, environment variable precedence, validation rules
   - **Impact**: Medium - affects all components

10. **`cli/src/api/rate-limiter.ts` → `RateLimiter.removeTokens()`**
    - **Why**: Rate limiting implementation (token bucket)
    - **Missing**: Algorithm details, bucket refill strategy, overflow behavior
    - **Impact**: Medium - protects against API quota exhaustion

### Medium Priority

11. **`cli/src/agents/planner/queue.ts` → `PlannerQueue.enqueue()`**
    - **Why**: Priority queue with custom comparator
    - **Missing**: Priority calculation logic, FIFO tie-breaking, capacity limits
    - **Impact**: Medium - affects plan execution order

12. **`cli/src/memory/cache.ts` → `MemoryCache.get()`**
    - **Why**: In-memory cache with eviction strategy
    - **Missing**: Eviction algorithm (LRU), TTL handling, cache invalidation
    - **Impact**: Medium - affects memory performance

13. **`cli/src/git/commit-manager.ts` → `CommitManager.createCommit()`**
    - **Why**: Git commit creation with validation
    - **Missing**: Commit message conventions, file staging rules, error recovery
    - **Impact**: Medium - affects code quality

14. **`cli/src/utils/retry.ts` → `retry()`**
    - **Why**: Generic retry logic with exponential backoff
    - **Missing**: Backoff algorithm, jitter calculation, when to give up
    - **Impact**: Medium - used throughout system

15. **`cli/src/security/encryption.ts` → `encrypt()` / `decrypt()`**
    - **Why**: Encryption utilities for sensitive data
    - **Missing**: Algorithm details, key derivation, security guarantees
    - **Impact**: Medium - affects data security

---

## 📝 Complete JSDoc Examples (Ready to Insert)

### Example 1: `sdBaseAgent.execute()` (cli/src/agents/base-agent.ts, line ~71)

```typescript
  /**
   * Execute a task using LLM integration with comprehensive error handling.
   * 
   * This method:
   * 1. Validates agent is in idle state
   * 2. Invokes LLM provider with task description and system prompt
   * 3. Processes LLM response and extracts result
   * 4. Updates agent metrics and status
   * 5. Emits events for monitoring and orchestration
   * 
   * @param task - Task to execute, must include type and description
   * @param task.taskId - Unique identifier for this task
   * @param task.type - Task type (e.g., 'code_implementation', 'test_generation')
   * @param task.description - Detailed description of what needs to be done
   * @param task.context - Optional context from previous steps or memory
   * 
   * @returns Promise resolving to task result
   * @returns result.success - Whether task completed successfully
   * @returns result.output - Task-specific output (e.g., generated code, test results)
   * @returns result.artifacts - List of created/modified artifacts (files, reports)
   * @returns result.memoryUpdates - Memory records to persist for future use
   * 
   * @throws {Error} If agent is not in idle state (already busy or errored)
   * @throws {LLMProviderError} If LLM API call fails after retries
   * @throws {ValidationError} If task input is invalid or missing required fields
   * 
   * @fires agent:task:started - When task execution begins
   * @fires agent:task:completed - When task completes successfully
   * @fires agent:task:failed - When task fails with error details
   * 
   * @example
   * const result = await agent.execute({
   *   taskId: 'task-123',
   *   type: 'code_implementation',
   *   description: 'Implement JWT authentication middleware',
   *   context: {
   *     techStack: ['Express', 'TypeScript', 'jsonwebtoken'],
   *     existingFiles: ['src/auth/types.ts']
   *   }
   * });
   * 
   * if (result.success) {
   *   console.log('Generated files:', result.artifacts);
   * }
   * 
   * @observability
   * - Metrics updated: tasksCompleted, tasksFailed, totalExecutionTime
   * - Events emitted for integration with monitoring systems
   * - Logs: info level for success, error level for failures
   */
  async execute(task: AgentTaskDTO): Promise<any> {
```

---

### Example 2: `sdPlannerOrchestrator.createExecutionPlan()` (cli/src/agents/planner/plan-orchestrator.ts, line ~47)

```typescript
  /**
   * Transform high-level requirements into a structured execution plan with dependency graph.
   * 
   * This is the main entry point for plan generation. The method:
   * 1. Validates input against schema (required: request string)
   * 2. Attempts LLM-based planning using system prompt from prompts/planner/system/v1.md
   * 3. Falls back to hardcoded plan composition if LLM fails (e.g., API down, quota exceeded)
   * 4. Enqueues plan in execution queue with metadata for priority sorting
   * 5. Persists plan to filesystem (planner/output/plan_v1.json) if enabled
   * 6. Emits SD_EVENT_PLAN_CREATED event for downstream consumers (orchestrator, API)
   * 
   * @param planInput - Input specification for plan generation
   * @param planInput.request - Primary feature request or task description (required)
   * @param planInput.context - Optional context to guide planning
   * @param planInput.context.techStack - Technologies used in project (e.g., ["TypeScript", "React"])
   * @param planInput.context.existingArtifacts - Existing files/modules to consider
   * @param planInput.context.projectType - Type of project (e.g., "web-api", "cli", "library")
   * @param planInput.preferences - User preferences that influence plan structure
   * @param planInput.preferences.prioritizeSpeed - Generate simpler plan with fewer steps
   * @param planInput.preferences.prioritizeQuality - Add more QA and review steps
   * @param planInput.constraints - Hard constraints that must be respected
   * @param planInput.constraints.maxDuration - Maximum execution time in minutes
   * @param planInput.constraints.forbiddenAgents - Agents that cannot be used
   * 
   * @returns Promise<PlannerPlanDTO> - Structured execution plan
   * @returns planDTO.planId - Unique identifier (UUID v4)
   * @returns planDTO.description - High-level summary of what plan accomplishes
   * @returns planDTO.steps - Ordered array of execution steps with dependencies
   * @returns planDTO.metadata - Creation timestamp, version, priority, tags
   * 
   * @throws {ValidationError} If planInput is missing required fields or has invalid schema
   * @throws {PlanGenerationError} If both LLM and fallback planning fail (rare)
   * 
   * @fires SD_EVENT_PLAN_CREATED - Emitted with { plan: PlannerPlanDTO }
   * 
   * @sideEffects
   * - Writes plan JSON to filesystem (if persistOutput=true)
   * - Adds plan to execution queue (plannerExecutionQueue)
   * - Updates internal metadata tags set
   * 
   * @example
   * const plan = await orchestrator.createExecutionPlan({
   *   request: "Add user authentication with JWT",
   *   context: {
   *     techStack: ["Node.js", "TypeScript", "Express"],
   *     existingArtifacts: ["src/api/routes/users.ts"],
   *     projectType: "web-api"
   *   },
   *   preferences: {
   *     prioritizeQuality: true
   *   },
   *   constraints: {
   *     maxDuration: 60
   *   }
   * });
   * 
   * console.log(`Generated plan ${plan.planId} with ${plan.steps.length} steps`);
   * 
   * @observability
   * - Logs: info on success, warn on LLM fallback, error on complete failure
   * - Events: SD_EVENT_PLAN_CREATED for monitoring
   * - Metrics: Plan generation latency, LLM vs fallback usage ratio
   */
  async createExecutionPlan(planInput: PlannerInputDTO): Promise<PlannerPlanDTO> {
```

---

### Example 3: `sdProviderRegistry.complete()` (cli/src/api/provider-registry.ts, line ~100+)

```typescript
  /**
   * Execute LLM completion with automatic failover and circuit breaker protection.
   * 
   * This method provides a unified interface for LLM interactions across multiple providers.
   * It implements:
   * - Active provider selection (from unified config)
   * - Automatic failover to backup providers on failure
   * - Circuit breaker pattern to fail fast when provider is down
   * - Retry logic with exponential backoff for transient errors
   * - Request/response normalization across provider APIs
   * 
   * Failover chain (attempts in order until success):
   * 1. Active provider (from config.providers.active)
   * 2. First available backup provider (different type than active)
   * 3. Any remaining providers in registry
   * 
   * Circuit breaker states:
   * - CLOSED: Normal operation, requests pass through
   * - OPEN: Provider marked unhealthy, requests fail immediately
   * - HALF_OPEN: Testing if provider recovered, limited requests allowed
   * 
   * @param request - LLM completion request
   * @param request.messages - Conversation history with roles (system, user, assistant)
   * @param request.model - Optional model override (uses provider default if not specified)
   * @param request.temperature - Sampling temperature (0.0-2.0, default 0.7)
   * @param request.maxTokens - Maximum tokens to generate (default varies by provider)
   * @param request.stopSequences - Stop generation on these strings
   * @param options - Additional options
   * @param options.timeout - Request timeout in ms (default 60000)
   * @param options.retries - Max retry attempts (default 3)
   * @param options.preferredProvider - Try this provider first (bypasses active provider)
   * 
   * @returns Promise<LlmResponse> - Normalized response across providers
   * @returns response.content - Generated text content
   * @returns response.model - Actual model used
   * @returns response.usage - Token usage breakdown
   * @returns response.usage.promptTokens - Input tokens consumed
   * @returns response.usage.completionTokens - Output tokens generated
   * @returns response.usage.totalTokens - Total tokens (prompt + completion)
   * @returns response.finishReason - Why generation stopped ('stop', 'length', 'content_filter')
   * @returns response.provider - Provider that fulfilled request (for tracking)
   * 
   * @throws {NoProvidersAvailableError} If all providers are unavailable (circuit open + no backups)
   * @throws {ProviderError} If all retry attempts exhausted across all providers
   * @throws {ValidationError} If request is invalid (e.g., negative temperature)
   * 
   * @fires provider:request - Before invoking provider
   * @fires provider:response - On successful response
   * @fires provider:failover - When switching to backup provider
   * @fires provider:error - On provider-specific errors
   * 
   * @example
   * const response = await registry.complete({
   *   messages: [
   *     { role: 'system', content: 'You are a helpful coding assistant.' },
   *     { role: 'user', content: 'Write a TypeScript function to sort an array.' }
   *   ],
   *   temperature: 0.3,
   *   maxTokens: 500
   * });
   * 
   * console.log('Generated code:', response.content);
   * console.log('Used', response.usage.totalTokens, 'tokens');
   * 
   * @observability
   * - Logs: Request ID, provider used, latency, token usage, errors
   * - Metrics: Completion latency, failover rate, token consumption per provider
   * - Events: provider:* events for monitoring dashboards
   * 
   * @performance
   * - Request timeout: 60s default (configurable)
   * - Retry delays: 1s, 2s, 4s (exponential backoff)
   * - Circuit breaker recovery: 60s cooldown period
   */
  async complete(request: LlmRequest, options?: CompletionOptions): Promise<LlmResponse> {
```

---

### Example 4: `MemoryRepository.store()` (cli/src/memory/memory-repository.ts)

```typescript
  /**
   * Store a memory record with automatic permission management and optional embedding.
   * 
   * Memory records are the primary mechanism for agents to share context and decisions.
   * Each record:
   * - Has a unique record_id (UUID if not provided)
   * - Belongs to an agent_origin (for provenance tracking)
   * - Can have an embedding_vector for semantic search (TODO: not yet implemented)
   * - Includes metadata for categorization and filtering
   * 
   * Permissions:
   * - Creating agent automatically gets full permissions (read, write, delete)
   * - Other agents need explicit permission grants to access
   * - See grantPermission() to share records across agents
   * 
   * Transactions:
   * - Record and permission are created in a single transaction
   * - Failure rolls back both operations
   * - Prevents orphaned permissions
   * 
   * @param record - Memory record to store
   * @param record.recordId - Unique identifier (auto-generated if not provided)
   * @param record.key - Semantic key for retrieval (e.g., "auth-decision-2024-01")
   * @param record.category - Category for filtering ("decision", "artifact", "context", etc.)
   * @param record.data - Actual data as JSON object (will be stringified)
   * @param record.agentOrigin - Agent that created this record (for permission tracking)
   * @param record.embeddingVector - Optional vector for semantic search (array of numbers)
   * @param record.metadata - Optional metadata (tags, timestamps, references)
   * 
   * @returns Promise<string> - The record_id of stored record
   * 
   * @throws {ValidationError} If required fields missing (key, category, data, agentOrigin)
   * @throws {DuplicateKeyError} If recordId already exists (unique constraint violation)
   * @throws {DatabaseError} If database write fails (disk full, corruption)
   * 
   * @fires memory:stored - After successful storage with { recordId, agentOrigin }
   * 
   * @sideEffects
   * - Writes to memory_records table
   * - Creates entry in memory_permissions table
   * - Updates internal cache (if caching enabled)
   * 
   * @example
   * const recordId = await memoryRepo.store({
   *   key: 'auth-implementation-plan',
   *   category: 'decision',
   *   data: {
   *     decision: 'use-jwt',
   *     rationale: 'Stateless, scalable, widely supported',
   *     alternatives: ['session-based', 'oauth2'],
   *     trade-offs: { security: 'high', complexity: 'medium' }
   *   },
   *   agentOrigin: 'planner',
   *   metadata: {
   *     tags: ['authentication', 'security'],
   *     relatedRecords: ['user-model-record-id'],
   *     confidence: 0.95
   *   }
   * });
   * 
   * // Later, developer agent can read this decision (if permission granted)
   * const authDecision = await memoryRepo.load(recordId);
   * 
   * @observability
   * - Logs: Record creation with key, category, agentOrigin
   * - Metrics: Records stored per agent, average record size, storage latency
   * - Events: memory:stored for audit trail
   * 
   * @security
   * - Data is stored as-is (no automatic encryption)
   * - Use security/encryption.ts for sensitive data before storing
   * - Permissions are enforced at load() time, not store() time
   */
  async store(record: MemoryRecord): Promise<string> {
```

---

### Example 5: `WorkflowRunner.execute()` (cli/src/workflow/workflow-runner.ts)

```typescript
  /**
   * Execute a complete workflow from an execution plan with checkpointing and error recovery.
   * 
   * Workflow execution phases:
   * 1. Initialization: Validate plan, build dependency graph, create initial checkpoint
   * 2. Task Queue: Resolve dependencies, sort by priority, prepare for execution
   * 3. Execution Loop: Dequeue tasks, invoke agents, handle results, save checkpoints
   * 4. Completion: Final checkpoint, emit completion event, report metrics
   * 
   * Dependency Resolution:
   * - Tasks with no dependencies execute first
   * - Dependent tasks wait until all prerequisites complete
   * - Circular dependencies detected and rejected during initialization
   * - Failed tasks block dependents (unless configured to continue)
   * 
   * Checkpointing Strategy:
   * - Checkpoint saved after each task completion
   * - Checkpoint includes: completed tasks, pending tasks, failed tasks, workflow state
   * - Checkpoints written to workflow/reports/<workflowId>-<timestamp>.json
   * - Old checkpoints retained for audit (cleanup TODO)
   * 
   * Error Recovery:
   * - Failed tasks retried up to maxRetries times (default 3)
   * - Exponential backoff between retries: 5s, 10s, 20s
   * - Workflow can resume from last checkpoint after crash
   * - Idempotent tasks can be safely re-executed
   * 
   * Execution Modes:
   * - sequential: Tasks execute one at a time (simple, no concurrency issues)
   * - parallel: Independent tasks execute concurrently (faster, requires resource management)
   * - adaptive: Automatically chooses based on task characteristics (TODO)
   * 
   * @param plan - Execution plan to run
   * @param plan.planId - Unique plan identifier
   * @param plan.steps - Array of steps with dependencies
   * @param options - Workflow configuration options
   * @param options.mode - Execution mode ('sequential' | 'parallel' | 'adaptive')
   * @param options.maxRetries - Max retry attempts per task (default 3)
   * @param options.timeout - Overall workflow timeout in ms (default 300000 = 5min)
   * @param options.continueOnFailure - Continue executing independent tasks after failure
   * @param options.checkpointInterval - Minimum time between checkpoints in ms
   * 
   * @returns Promise<WorkflowResult> - Workflow execution result
   * @returns result.status - Overall status ('completed' | 'failed' | 'partial')
   * @returns result.completedTasks - Array of successfully completed task IDs
   * @returns result.failedTasks - Array of failed task IDs with error details
   * @returns result.skippedTasks - Tasks skipped due to failed dependencies
   * @returns result.duration - Total execution time in ms
   * @returns result.checkpoints - Array of checkpoint IDs for audit trail
   * 
   * @throws {ValidationError} If plan is invalid (missing steps, invalid dependencies)
   * @throws {DependencyCycleError} If circular dependency detected
   * @throws {TimeoutError} If workflow exceeds timeout (after saving checkpoint)
   * 
   * @fires workflow:started - When workflow begins
   * @fires workflow:task:started - When each task starts
   * @fires workflow:task:completed - When each task completes
   * @fires workflow:task:failed - When task fails (before retry)
   * @fires workflow:checkpoint - After each checkpoint save
   * @fires workflow:completed - When workflow finishes
   * @fires workflow:failed - If workflow fails completely
   * 
   * @example
   * const runner = new WorkflowRunner({
   *   workflowId: 'workflow-123',
   *   planId: plan.planId,
   *   mode: 'sequential',
   *   checkpointEnabled: true,
   *   maxRetries: 3,
   *   timeout: 600000 // 10 minutes
   * });
   * 
   * const result = await runner.execute(plan);
   * 
   * if (result.status === 'completed') {
   *   console.log(`Workflow completed in ${result.duration}ms`);
   *   console.log(`${result.completedTasks.length} tasks successful`);
   * } else {
   *   console.error(`Workflow failed: ${result.failedTasks.length} tasks failed`);
   *   // Resume from last checkpoint
   *   const checkpoint = await checkpointManager.loadCheckpoint(result.checkpoints[result.checkpoints.length - 1]);
   *   await runner.resume(checkpoint);
   * }
   * 
   * @observability
   * - Logs: Workflow lifecycle events, task execution progress, errors
   * - Metrics: Workflow duration, task success rate, checkpoint frequency
   * - Events: workflow:* events for monitoring dashboards
   * - Checkpoints: Full audit trail of execution state over time
   * 
   * @performance
   * - Sequential mode: ~N * task_duration (simple, predictable)
   * - Parallel mode: ~max(task_durations) (faster, but resource-intensive)
   * - Checkpoint overhead: ~50-100ms per checkpoint (async write)
   * 
   * @recovery
   * - Call WorkflowRunner.fromCheckpoint(checkpoint) to resume
   * - Completed tasks are skipped on resume
   * - Failed tasks can be retried from beginning
   * - Workflow state is consistent at each checkpoint
   */
  async execute(plan: PlannerPlanDTO, options?: WorkflowOptions): Promise<WorkflowResult> {
```

---

## 🎯 Documentation Principles Applied

All examples follow these principles:

1. **Purpose First**: Start with what the function does
2. **Process**: Explain the algorithm/flow
3. **Parameters**: Document each parameter with types and constraints
4. **Returns**: Describe return value structure
5. **Errors**: List all possible exceptions
6. **Side Effects**: Document state changes, I/O, events
7. **Examples**: Provide realistic usage examples
8. **Observability**: Explain logging, metrics, events
9. **Performance**: Note important performance characteristics
10. **Security**: Highlight security-relevant behavior

---

## 📊 Implementation Priority

Implement documentation in this order:

1. **Critical Path** (Examples 1-5): Document these first - they're used everywhere
2. **High Traffic** (6-10): Functions called frequently or in hot paths
3. **Complex Logic** (11-15): Functions with non-obvious behavior or algorithms
4. **Public APIs**: Any function exported from a module
5. **Everything Else**: Comprehensive coverage for maintainability

---

## ✅ Quality Checklist

Before considering documentation complete:

- [ ] JSDoc syntax valid (runs without errors)
- [ ] All parameters documented with types
- [ ] Return value structure explained
- [ ] Error conditions listed
- [ ] At least one realistic example provided
- [ ] Side effects explicitly documented
- [ ] Events listed (if function emits)
- [ ] Performance notes (if non-trivial)
- [ ] Security implications (if relevant)
- [ ] Cross-references to related functions

---

**Document maintained by**: Auto-generated via standardized documentation process  
**Review cycle**: Update when APIs change or new critical functions added
