# SupaDupaCode CLI

CLI Orchestrator for multi-agent development automation based on the MVP documentation.

## Overview

`supadupacode` is a command-line interface that orchestrates AI agents to automate software development tasks. It interprets user requirements, decomposes them into tasks, manages Git branches, integrates with MCP (Model Context Protocol), and automates pull request workflows.

## Installation

```bash
cd cli
npm install
npm link  # Optional: makes supadupacode available globally
```

## Usage

### Basic Commands

#### Plan Command
Decompose and plan a feature implementation:

```bash
supadupacode plan "Add user authentication"
supadupacode plan "Implement social login" --output json
```

#### Run Command
Execute feature development with AI agents:

```bash
supadupacode run --feature login-social
supadupacode run --plan plan-12345.json
supadupacode run --feature dashboard --mode concurrent
```

#### Status Command
Monitor feature development progress:

```bash
supadupacode status
supadupacode status --feature login-social
supadupacode status --all
```

#### Review Command
Review pull requests:

```bash
supadupacode review --pr 123
supadupacode review --pr 123 --auto-approve
```

#### Fix Command
Automated fixes for failing checks:

```bash
supadupacode fix --pr 123
supadupacode fix --check unit-tests --auto-commit
```

#### Config Command
Manage CLI configuration:

```bash
supadupacode config init
supadupacode config show
supadupacode config show agents.frontend
supadupacode config set orchestration.defaultMode concurrent
supadupacode config reset
```

#### Agent Command
Manage agents (list, info, create, start, stop, restart, delete):

```bash
supadupacode agent list
supadupacode agent info planner
supadupacode agent create myagent --type=assistant --model=gpt-4 --memory-size=8192
supadupacode agent start myagent
supadupacode agent stop myagent
supadupacode agent restart myagent
supadupacode agent delete myagent
```

#### Memory Command
Manage persistent memory and context:

```bash
supadupacode memory init --backend=filesystem
supadupacode memory context show --agent=planner
supadupacode memory context clear --agent=planner
supadupacode memory context backup --agent=planner --file=backup.json
supadupacode memory optimize
```

#### API Command
Manage API integrations:

```bash
supadupacode api register openai --key=sk-xxx --quota=60
supadupacode api status
```

#### Auth Command
Manage authentication:

```bash
supadupacode auth configure openai
supadupacode auth verify --provider=openai
```

#### Workflow Command
Manage multi-agent workflows:

```bash
supadupacode workflow create my-workflow --description="Build feature"
supadupacode workflow run workflow-123
supadupacode workflow status workflow-123
supadupacode workflow logs workflow-123
supadupacode workflow list
```

#### Metrics Command
Collect and view system metrics:

```bash
supadupacode metrics collect --format=json
supadupacode metrics show
```

#### Logs Command
Query and export logs:

```bash
supadupacode logs query --agent=planner --severity=error
supadupacode logs export --format=json --output=logs.json
```

#### Alert Command
Configure monitoring alerts:

```bash
supadupacode alert configure high-latency --metric=api.latency --threshold=1000 --channel=slack
supadupacode alert list
```

#### Debug Command
Debug and trace operations:

```bash
supadupacode debug trace --agent=planner --duration=60
supadupacode debug inspect --component=system
```

#### Health Command
Perform system health check:

```bash
supadupacode health
```

#### Environment Command
Manage execution environments:

```bash
supadupacode env setup --env=development
supadupacode env list
```

#### Deploy Command
Deploy application:

```bash
supadupacode deploy --env=production
supadupacode deploy --env=staging --incremental
```

#### Rollback Command
Rollback deployment:

```bash
supadupacode rollback --version=0.9.0
```

#### Version Command
Show version information:

```bash
supadupacode version
supadupacode version --action=list
```

#### Validate Command
Validate configuration:

```bash
supadupacode validate
```

## Configuration

The CLI uses a `.supadupacode.json` file in the project root. Initialize with:

```bash
supadupacode config init
```

### Default Configuration Structure

```json
{
  "agents": {
    "frontend": {
      "enabled": true,
      "role": "frontend",
      "mcp_tools": ["filesystem", "git"]
    },
    "backend": {
      "enabled": true,
      "role": "backend",
      "mcp_tools": ["filesystem", "git", "db"]
    },
    "qa": {
      "enabled": true,
      "role": "qa",
      "mcp_tools": ["filesystem", "git", "test"]
    },
    "docs": {
      "enabled": true,
      "role": "docs",
      "mcp_tools": ["filesystem", "git"]
    }
  },
  "mcp": {
    "servers": {
      "filesystem": { "enabled": true },
      "git": { "enabled": true },
      "test": { "enabled": true },
      "lint": { "enabled": true },
      "build": { "enabled": true }
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

## Architecture

### Components

- **CLI Orchestrator**: Command parsing, task routing, execution coordination
- **Core Modules**:
  - `orchestrator.js`: Multi-agent task execution management
  - `config-manager.js`: Configuration handling
- **Git Integration**:
  - `branch-manager.js`: Git branch operations
  - `commit-manager.js`: Git commit operations
- **MCP Integration**:
  - `mcp-client.js`: Model Context Protocol client
- **Utilities**:
  - `logger.js`: Structured logging
  - `metrics.js`: Performance metrics

### Orchestration Patterns

- **Sequential**: Tasks executed one after another
- **Concurrent**: Tasks executed in parallel
- **Handoff**: Tasks executed with context passing

### Branch Naming Convention

Branches are created following the pattern: `agent/{agent-name}/{feature-slug}`

Example: `agent/frontend/user-authentication`

### Commit Message Format

Commits follow the format: `[{agent}] {scope}: {description}`

Example: `[frontend] feature: Add login form component`

## Features

### Core Features
✅ Command parsing and routing  
✅ Task decomposition and planning  
✅ Multi-agent orchestration  
✅ Git branch management  
✅ Standardized commit messages  
✅ Configuration management  
✅ Logging and metrics  
✅ Status monitoring  
✅ PR review automation  
✅ Automated fix suggestions  

### Agent Management
✅ Agent creation with custom configurations  
✅ Agent lifecycle management (start, stop, restart)  
✅ Agent filtering and listing  
✅ Performance monitoring per agent  
✅ Resource cleanup and deletion  

### Memory Management
✅ Persistent memory initialization  
✅ Context management (show, clear, backup)  
✅ Multiple backend support (filesystem, Redis, PostgreSQL)  
✅ Memory optimization and garbage collection  
✅ Context export and import  

### API Integration
✅ API provider registration  
✅ Authentication management  
✅ Rate limiting and quota tracking  
✅ Real-time API status monitoring  
✅ Secure credential storage  

### Workflow Orchestration
✅ Declarative workflow creation  
✅ Parallel and sequential execution  
✅ Error handling and retry logic  
✅ Workflow status tracking  
✅ Execution history and logs  

### Monitoring & Observability
✅ Metrics collection (JSON, Prometheus)  
✅ Advanced log querying and filtering  
✅ Alert configuration and management  
✅ Real-time system health checks  
✅ Performance analytics  

### Debugging & Diagnostics
✅ Detailed event tracing  
✅ Component inspection  
✅ Latency analysis  
✅ System integrity checks  
✅ Automated recommendations  

### Deployment & Environment
✅ Environment setup automation  
✅ Zero-downtime deployment  
✅ Version management  
✅ Rollback capabilities  
✅ Configuration validation  

## Development

### Project Structure

```
cli/
├── src/
│   ├── commands/         # Command implementations
│   ├── core/            # Core orchestration logic
│   ├── git/             # Git integration
│   ├── mcp/             # MCP integration
│   ├── utils/           # Utilities
│   └── index.js         # CLI entry point
├── tests/               # Test files
├── config/              # Configuration templates
├── package.json
└── README.md
```

### Running Tests

```bash
npm test
```

### Running Locally

```bash
node src/index.js plan "test feature"
# or if installed globally
supadupacode plan "test feature"
```

## Future Enhancements

- [ ] AI-based task decomposition
- [ ] Real MCP server integration
- [ ] GitHub API integration for PR operations
- [ ] Interactive prompts for complex operations
- [ ] Watch mode for status monitoring
- [ ] Event bus for agent communication
- [ ] Retry logic with circuit breakers
- [ ] Advanced conflict resolution
- [ ] Test coverage and quality gates
- [ ] Telemetry and observability dashboard

## Documentation

For more details on the architecture and design, see:
- [MVP Documentation](../docs/MVP.md)

## License

ISC
