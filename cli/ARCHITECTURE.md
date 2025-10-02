# SupaDupaCode CLI - Architecture

## Overview

The SupaDupaCode CLI is a command-line orchestrator that manages multi-agent development workflows. It follows the architecture described in the MVP documentation with a focus on modularity, extensibility, and robustness.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLI Interface                            │
│                     (Commander.js + Chalk)                       │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ├──────────────────────────────────────────────────┐
                 │                                                  │
┌────────────────▼─────────────┐           ┌────────────────────┐ │
│     Command Layer            │           │   Config Manager   │ │
│  - plan.js                   │           │  - Load/Save       │ │
│  - run.js                    │           │  - Get/Set         │ │
│  - status.js                 │           │  - Validate        │ │
│  - review.js                 │           └────────────────────┘ │
│  - fix.js                    │                                  │
│  - config.js                 │                                  │
└────────────┬─────────────────┘                                  │
             │                                                    │
             ├────────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────────┐
│                      Core Orchestrator                           │
│  - Task decomposition                                            │
│  - Agent management                                              │
│  - Execution patterns (sequential/concurrent/handoff)            │
│  - Event emission                                                │
└──────────────┬───────────────────────────┬───────────────────────┘
               │                           │
   ┌───────────▼──────────┐    ┌──────────▼────────────┐
   │   Git Integration    │    │   MCP Integration     │
   │  - BranchManager     │    │  - MCPClient          │
   │  - CommitManager     │    │  - Server registry    │
   │  - Branch naming     │    │  - Tool execution     │
   │  - Commit formatting │    │  - Permissions        │
   └──────────────────────┘    └───────────────────────┘
               │                           │
   ┌───────────▼──────────────────────────▼───────────┐
   │              Utilities Layer                      │
   │  - Logger (structured logging)                    │
   │  - Metrics (performance tracking)                 │
   └───────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. CLI Interface (`src/index.js`)

**Responsibilities:**
- Parse command-line arguments
- Route commands to handlers
- Display help and version info
- Error handling and output formatting

**Technologies:**
- Commander.js for command parsing
- Chalk for colored output
- Ora for spinners

### 2. Command Layer (`src/commands/`)

Individual command implementations:

#### `plan.js`
- Decomposes feature descriptions into tasks
- Creates execution plans
- Saves plans to JSON files

#### `run.js`
- Executes saved plans
- Manages orchestration patterns
- Reports progress and results

#### `status.js`
- Shows development status
- Displays metrics and progress
- Monitors Git branches

#### `review.js`
- Reviews pull requests
- Checks status of CI/CD checks
- Provides recommendations

#### `fix.js`
- Identifies issues in PRs
- Applies automated fixes
- Creates commits

#### `config.js`
- Manages configuration
- Initialize, show, set, reset operations

### 3. Core Orchestrator (`src/core/orchestrator.js`)

**Responsibilities:**
- Task decomposition
- Agent registration and management
- Plan execution
- Event emission for observability

**Orchestration Patterns:**

1. **Sequential**: Tasks run one after another
   - Good for: Dependencies between tasks
   - Use case: Backend changes → Tests → Documentation

2. **Concurrent**: Tasks run in parallel
   - Good for: Independent tasks
   - Use case: Frontend + Backend + Tests simultaneously

3. **Handoff**: Tasks pass context to next task
   - Good for: Iterative refinement
   - Use case: Design → Implementation → Review → Polish

**Key Methods:**
```javascript
createPlan(description, options)
executePlan(plan, options)
executeTask(task)
registerAgent(name, agent)
```

### 4. Configuration Manager (`src/core/config-manager.js`)

**Responsibilities:**
- Load/save configuration
- Get/set configuration values
- Validate configuration
- Provide defaults

**Configuration Structure:**
```javascript
{
  agents: {},      // Agent definitions
  mcp: {},         // MCP server config
  git: {},         // Git settings
  orchestration: {}// Execution settings
}
```

### 5. Git Integration (`src/git/`)

#### Branch Manager (`branch-manager.js`)
- Create branches per agent/task
- Switch between branches
- List and filter branches
- Merge branches
- Check branch status

#### Commit Manager (`commit-manager.js`)
- Create standardized commits
- Format commit messages
- Push to remote
- Get commit history

**Branch Naming Convention:**
```
agent/{agent-name}/{feature-slug}
```

**Commit Message Format:**
```
[{agent}] {scope}: {description}
```

### 6. MCP Integration (`src/mcp/mcp-client.js`)

**Responsibilities:**
- Connect to MCP servers
- Execute tools via MCP
- Manage permissions
- Server registry

**Supported Servers:**
- filesystem (file operations)
- git (version control)
- test (test execution)
- lint (code linting)
- build (build operations)
- db (database operations)

### 7. Utilities (`src/utils/`)

#### Logger (`logger.js`)
- Structured logging
- Multiple log levels (info, warn, error, debug)
- Log history
- Export capability

#### Metrics (`metrics.js`)
- Track task execution
- Record lead times
- Agent performance
- Success rates
- Export metrics

## Data Flow

### Plan Command Flow

```
User Input
    │
    ▼
Command Parser
    │
    ▼
Plan Command
    │
    ▼
Orchestrator.createPlan()
    │
    ├──> Decompose tasks
    ├──> Assign agents
    └──> Save plan file
    │
    ▼
Display Plan + Save to File
```

### Run Command Flow

```
User Input (--plan file.json)
    │
    ▼
Command Parser
    │
    ▼
Run Command
    │
    ├──> Load Plan
    ├──> Load Config
    └──> Initialize Orchestrator
    │
    ▼
Orchestrator.executePlan()
    │
    ├──> Sequential/Concurrent/Handoff
    ├──> Execute Tasks
    ├──> Emit Events
    └──> Collect Results
    │
    ▼
Branch Manager (create branches)
    │
    ▼
MCP Client (execute tools)
    │
    ▼
Commit Manager (commit changes)
    │
    ▼
Metrics Collector
    │
    ▼
Display Results
```

## Event System

The orchestrator emits events for observability:

- `plan-created`: When a new plan is created
- `execution-started`: When plan execution begins
- `execution-completed`: When plan execution completes
- `execution-failed`: When plan execution fails
- `task-started`: When a task begins
- `task-completed`: When a task completes
- `agent-registered`: When an agent is registered

These events can be used for:
- Real-time monitoring
- Logging
- Metrics collection
- External integrations

## Extension Points

### 1. Adding New Commands

Create a new file in `src/commands/`:

```javascript
export async function myCommand(options) {
  // Implementation
}
```

Register in `src/index.js`:

```javascript
program
  .command('mycommand')
  .action(myCommand);
```

### 2. Adding New Agents

Register with orchestrator:

```javascript
const myAgent = {
  execute: async (task) => {
    // Implementation
    return result;
  }
};

orchestrator.registerAgent('my-agent', myAgent);
```

### 3. Adding MCP Servers

Register in configuration:

```json
{
  "mcp": {
    "servers": {
      "myserver": {
        "enabled": true,
        "tools": ["tool1", "tool2"]
      }
    }
  }
}
```

### 4. Custom Orchestration Patterns

Add to `orchestrator.js`:

```javascript
async executeCustomPattern(plan, execution) {
  // Custom logic
}
```

## Design Principles

1. **Modularity**: Each component has a single responsibility
2. **Extensibility**: Easy to add new commands, agents, and patterns
3. **Observability**: Events and metrics for monitoring
4. **Configuration**: Dynamic configuration without code changes
5. **Testability**: Unit tests for all components
6. **Error Handling**: Graceful degradation and clear error messages
7. **Documentation**: Inline comments and external docs

## Testing Strategy

### Unit Tests
- Component isolation
- Mock dependencies
- Edge case coverage

### Integration Tests
- Command execution
- Config persistence
- Git operations

### Current Test Coverage
- ✅ Orchestrator (5 tests)
- ✅ Config Manager (4 tests)
- ✅ Branch Manager (5 tests)

## Future Enhancements

1. **AI Integration**: Real AI-based task decomposition
2. **GitHub API**: Real PR review and management
3. **MCP Protocol**: Full MCP protocol implementation
4. **Event Bus**: Distributed event system
5. **Web Dashboard**: Real-time monitoring UI
6. **Plugin System**: Third-party extensions
7. **CI/CD Integration**: Native CI/CD support
8. **Telemetry**: Advanced observability

## Security Considerations

1. **Least Privilege**: Agents only access authorized MCP tools
2. **Input Validation**: All user inputs validated
3. **Secure Storage**: Sensitive config encrypted
4. **Audit Logs**: All operations logged
5. **Sandboxing**: Agent execution isolation

## Performance

- Task decomposition: O(n) where n is task count
- Concurrent execution: Limited by available resources
- Configuration access: Cached in memory
- Metrics collection: Minimal overhead

## Deployment

The CLI can be:
1. Run directly with Node.js
2. Installed globally via npm link
3. Packaged as npm package
4. Containerized with Docker

## Documentation

- README.md: Installation and quick start
- USAGE.md: Detailed command usage
- ARCHITECTURE.md: This document
- API docs: JSDoc in source files

## Maintenance

- Regular dependency updates
- Test suite execution
- Code quality checks
- Documentation updates

---

For implementation details, see source code in `src/` directory.
For usage examples, see `USAGE.md` and `examples/`.
