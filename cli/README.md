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
Manage agents (list, info):

```bash
supadupacode agent list
supadupacode agent info planner
supadupacode agent info developer
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
