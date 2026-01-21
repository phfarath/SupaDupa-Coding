# Workflow Module

## Purpose

The workflow module orchestrates task execution based on execution plans. It manages task dependencies, maintains execution state through checkpoints, and provides recovery mechanisms for long-running workflows.

---

## Main Files

- **`workflow-runner.ts`**: Main workflow execution engine that processes execution plans
- **`checkpoint-manager.ts`**: Saves and restores workflow state for fault tolerance
- **`task-executor.ts`**: Executes individual tasks and manages agent invocation
- **`utils/state-manager.ts`**: Manages workflow state transitions (pending → running → completed)
- **`utils/task-queue.ts`**: Priority queue with dependency resolution

---

## Key Interfaces

### WorkflowConfig

```typescript
interface WorkflowConfig {
  workflowId: string;
  planId: string;
  mode: 'sequential' | 'parallel' | 'adaptive';
  checkpointEnabled: boolean;
  maxRetries: number;
  timeout: number;
}
```

### WorkflowCheckpoint

```typescript
interface WorkflowCheckpoint {
  checkpointId: string;
  workflowId: string;
  state: WorkflowState;
  completedTasks: string[];
  pendingTasks: string[];
  failedTasks: string[];
  timestamp: string;
}
```

### TaskResult

```typescript
interface TaskResult {
  taskId: string;
  status: 'success' | 'failed' | 'skipped';
  output?: any;
  error?: Error;
  duration: number;
  checkpointId?: string;
}
```

---

## Workflow Flow

```
1. Load Execution Plan
   ↓
2. Initialize Workflow State
   - Create checkpoint
   - Load dependencies
   ↓
3. Build Task Queue
   - Resolve dependencies
   - Sort by priority
   ↓
4. Execute Tasks
   - Dequeue task
   - Check dependencies met
   - Invoke agent
   - Save checkpoint
   ↓
5. Handle Results
   - Update state
   - Queue dependent tasks
   - Emit events
   ↓
6. Workflow Complete
   - Final checkpoint
   - Report metrics
```

---

## Usage Examples

### Running a Workflow

```typescript
import { WorkflowRunner } from './workflow/workflow-runner';
import { loadPlan } from './agents/planner/plan-orchestrator';

const plan = await loadPlan('plan-123');
const runner = new WorkflowRunner({
  workflowId: 'workflow-456',
  planId: plan.planId,
  mode: 'sequential',
  checkpointEnabled: true,
  maxRetries: 3,
  timeout: 300000
});

await runner.initialize();

const result = await runner.execute(plan);
console.log('Workflow completed:', result.status);
console.log('Tasks executed:', result.completedTasks.length);
```

### Resuming from Checkpoint

```typescript
import { CheckpointManager } from './workflow/checkpoint-manager';

const manager = new CheckpointManager('./data/checkpoints');

// Save checkpoint
await manager.saveCheckpoint({
  checkpointId: 'checkpoint-789',
  workflowId: 'workflow-456',
  state: currentState,
  completedTasks: ['task-1', 'task-2'],
  pendingTasks: ['task-3', 'task-4'],
  failedTasks: [],
  timestamp: new Date().toISOString()
});

// Resume workflow
const checkpoint = await manager.loadCheckpoint('checkpoint-789');
const runner = WorkflowRunner.fromCheckpoint(checkpoint);
await runner.resume();
```

### Custom Task Executor

```typescript
import { TaskExecutor } from './workflow/task-executor';

const executor = new TaskExecutor({
  timeout: 60000,
  retries: 3,
  retryDelay: 5000
});

const result = await executor.execute({
  taskId: 'task-1',
  agent: 'developer',
  input: {
    task: 'Implement feature X',
    context: {}
  }
});

if (result.status === 'success') {
  console.log('Task completed:', result.output);
}
```

---

## Edge Cases & Gotchas

### Dependency Cycles
- **Issue**: Circular dependencies prevent workflow execution
- **Solution**: Task queue detects cycles during dependency resolution
- **Error**: `DependencyCycleError` with cycle path

### Task Timeout
- **Issue**: Task exceeds configured timeout
- **Solution**: Task executor cancels execution and marks as failed
- **Recovery**: Retry logic kicks in if retries configured

### Checkpoint Corruption
- **Issue**: Checkpoint file corrupted or incomplete
- **Solution**: Checkpoint manager validates on load
- **Fallback**: Start workflow from beginning if no valid checkpoint

### Parallel Task Conflicts
- **Issue**: Parallel tasks modify same files/resources
- **Solution**: Workflow runner detects resource conflicts
- **Mitigation**: Use sequential mode or explicit resource locks

### Agent Failure
- **Issue**: Agent crashes during task execution
- **Solution**: Task executor catches errors and saves state
- **Recovery**: Workflow resumes from last checkpoint

### State Inconsistency
- **Issue**: Workflow state out of sync with actual progress
- **Solution**: Checkpoint includes integrity hash
- **Validation**: State manager verifies state transitions

---

## Testing

### Unit Tests

```bash
# Test workflow runner
npm test -- tests/workflow-runner.test.ts

# Test checkpoint manager
npm test -- tests/checkpoint-manager.test.ts
```

### Integration Tests

```bash
# Test end-to-end workflow
npm run example:e2e
```

### Test Criteria

- **Execution**: Workflow executes plan steps in correct order
- **Dependencies**: Dependent tasks wait for prerequisites
- **Checkpointing**: State saved and restored correctly
- **Error Handling**: Failed tasks trigger retry logic
- **Recovery**: Workflow resumes from checkpoint after crash
- **Parallel Execution**: Multiple tasks execute concurrently (if mode=parallel)

### Mock Agents

```typescript
// Mock agent for testing
class MockAgent {
  async execute(input: any): Promise<any> {
    await delay(100); // Simulate work
    return { success: true, result: 'mock output' };
  }
}
```

---

## Points of Attention

### Checkpointing
- **Frequency**: Save checkpoint after each task completes
- **Storage**: Checkpoints written to `cli/workflow/reports/`
- **Cleanup**: Old checkpoints should be archived/deleted
- **Compression**: TODO (see checkpoint-manager.ts)

### Task Queue
- **Priority**: Higher priority tasks execute first
- **Dependencies**: Tasks block until all dependencies met
- **Fairness**: Ensure no task is starved
- **Backpressure**: Limit concurrent tasks based on resources

### Resource Management
- **Memory**: Monitor memory usage per task
- **CPU**: Distribute tasks across available cores
- **Concurrency**: Limit parallel tasks to prevent overload
- **Cleanup**: Release resources after task completion

### Error Handling
- **Retries**: Exponential backoff between retries
- **Partial Failure**: Continue workflow if non-critical task fails
- **Rollback**: Support undo operations for critical failures
- **Alerts**: Emit events for monitoring

### Performance
- **Lazy Loading**: Don't load all tasks into memory at once
- **Streaming**: Stream large outputs to disk
- **Caching**: Cache agent initialization for reuse
- **Metrics**: Track task duration and bottlenecks

---

## Workflow Modes

### Sequential Mode
- Tasks execute one at a time
- Simplest mode; no concurrency issues
- Best for: Simple linear workflows

### Parallel Mode
- Independent tasks execute concurrently
- Requires resource conflict resolution
- Best for: I/O-bound tasks with no dependencies

### Adaptive Mode
- Automatically switches based on task characteristics
- Uses heuristics to determine parallelism
- Best for: Complex workflows with mixed task types

---

## State Transitions

```
PENDING → RUNNING → COMPLETED
           ↓
         FAILED → RETRYING → RUNNING
                     ↓
                   FAILED (max retries)
```

---

## Configuration

### Workflow Config Example

```json
{
  "workflow": {
    "mode": "sequential",
    "timeout": 300000,
    "maxRetries": 3,
    "checkpointEnabled": true,
    "checkpointInterval": 60000,
    "parallelTasks": 3
  }
}
```

---

## Related Documentation

- **Agents**: `cli/src/agents/README.md`
- **Memory System**: `cli/src/memory/README.md`
- **Checkpoints**: `cli/workflow/reports/`
