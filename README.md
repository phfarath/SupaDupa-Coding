# SupaDupa-Coding

A code agent with subscriptions + API connection for automated software development.

## Overview

SupaDupa-Coding is a multi-agent orchestration system that automates software development tasks using AI agents. It provides:

- 🤖 **Multi-Agent System**: Specialized agents (Planner, Developer, QA, Docs, Brain)
- 🔌 **API Integration**: Support for multiple LLM providers (OpenAI, Anthropic, local models)
- 💾 **Memory Management**: Shared memory and caching between agents
- 🔄 **Workflow Automation**: MCP (Model Context Protocol) integration for Git operations
- 📊 **Real-time Monitoring**: Progress tracking and status reporting

## Quick Start

### Installation

```bash
cd cli
npm install
npm run build
npm link  # Makes 'supadupacode' available globally
```

### Basic Usage

```bash
# Plan a feature
supadupacode plan "Add user authentication"

# Execute the plan
supadupacode run --feature auth

# Check status
supadupacode status

# Review pull requests
supadupacode review --pr 123
```

## Documentation

- **[CLI Documentation](cli/README.md)** - Complete CLI reference and usage guide
- **[Quick Start Guide](cli/QUICKSTART.md)** - Get up and running quickly
- **[Usage Guide](cli/USAGE.md)** - Detailed usage instructions
- **[Commands Reference](cli/COMMANDS.md)** - All available commands
- **[Implementation Plan](docs/imp-plan.md)** - Detailed implementation roadmap

## Architecture

### Core Components

```
cli/
├── src/
│   ├── agents/      # AI agents (Planner, Developer, QA, Docs, Brain)
│   ├── api/         # API server and LLM provider integrations
│   ├── commands/    # CLI commands
│   ├── core/        # Orchestrator and configuration
│   ├── workflow/    # Workflow execution engine
│   ├── mcp/         # Model Context Protocol integration
│   └── memory/      # Memory and caching system
├── shared/          # Shared contracts and utilities
└── tests/           # Test suite
```

### Key Features

- **Planner Agent**: Decomposes requirements into actionable tasks
- **Developer Agent**: Implements code changes based on plans
- **QA Agent**: Runs tests and validates implementations
- **Docs Agent**: Maintains documentation
- **Brain Agent**: Provides decision-making and context management
- **Memory System**: SQLite-based memory with caching for cross-agent context
- **MCP Integration**: Autonomous Git operations (commits, branches, PRs)
- **Provider Registry**: Flexible LLM provider management with fallbacks

## Recent Changes

This repository has been recently cleaned and organized. See [CLEANUP_SUMMARY.md](CLEANUP_SUMMARY.md) for details:

- ✅ Removed duplicate and backup files (~1.1MB)
- ✅ Consolidated documentation
- ✅ Reorganized test files
- ✅ Verified all core components
- ✅ Build and tests passing

## Configuration

Example configuration:

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
    }
  },
  "orchestration": {
    "defaultMode": "sequential",
    "retries": 3,
    "timeout": 300000
  }
}
```

## Requirements

- Node.js 16+
- npm 8+
- Git
- API keys for LLM providers (OpenAI, Anthropic, etc.)

## Development

```bash
# Install dependencies
cd cli
npm install

# Build
npm run build

# Watch mode
npm run build:watch

# Run tests
npm test

# Run examples
npm run example:planner
npm run example:api
```

## API Server

The CLI includes an optional API server for web integration:

```bash
# Start API server
npm run start:api

# Production mode
npm run start:api:prod
```

## License

ISC

## Contributing

This is an active development project. Contributions are welcome!

## Support

For issues, questions, or contributions, please refer to the CLI documentation and implementation plan.
