# SupaDupa-Coding

> 🚀 **Autonomous Code Agent** with Multi-Agent Architecture

A code agent similar to Claude Code, Codex, and Qwen-Code, but with a unique **Brain Agent** architecture that coordinates workflows without conflicts.

## ✨ Vision

SupaDupa-Coding is a multi-agent orchestration system featuring:

- 🧠 **Brain Agent**: Central coordinator with conversational and Big Job modes
- 🤖 **Mini-Brains**: Distributed monitoring hierarchy
- 🔒 **Security Agent**: Automatic vulnerability detection with issue creation
- ✅ **PR Approval Agent**: Automated code review and approval
- 🔄 **Synchronized Workflow**: No branch conflicts, no codebase conflicts

### Workflow Modes

| Mode | Description |
|------|-------------|
| **Conversational** | Interactive chat for simple queries |
| **Direct Build** | Immediate code execution |
| **Planning** | Task decomposition |
| **Big Job** | Full synchronized multi-agent workflow |

## 🚀 Quick Start

### Installation

```bash
cd cli
npm install
npm run build
npm link  # Makes 'supadupacode' available globally
```

### Basic Usage

```bash
# Initialize project (coming soon)
supadupacode init

# Plan a feature
supadupacode plan "Add user authentication"

# Execute the plan
supadupacode run --feature auth

# Check status
supadupacode status

# Review pull requests
supadupacode review --pr 123
```

## 📚 Documentation

### Core Docs
- **[TODO.md](TODO.md)** - Comprehensive task tracking (Pre-MVP & Post-MVP)
- **[FUTURE_STEPS.md](FUTURE_STEPS.md)** - Detailed roadmap with micro-steps
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture and design patterns
- **[AI_INSTRUCTIONS.md](AI_INSTRUCTIONS.md)** - Rules for AI agents modifying the code

### Implementation
- **[docs/imp-plan.md](docs/imp-plan.md)** - Detailed implementation roadmap
- **[docs/MVP.md](docs/MVP.md)** - MVP specifications
- **[INLINE_DOCS_RECOMMENDATIONS.md](INLINE_DOCS_RECOMMENDATIONS.md)** - Documentation strategy

### CLI Guides
- **[cli/README.md](cli/README.md)** - CLI reference and usage guide
- **[cli/GUIDE.md](cli/GUIDE.md)** - Complete running guide

## 🏗️ Architecture

### Core Components

```
cli/
├── src/
│   ├── agents/      # AI agents (Planner, Developer, QA, Docs, Brain)
│   │   ├── brain/   # Brain Agent + Mini-Brains (NEW)
│   │   ├── security/# Security Agent (PLANNED)
│   │   └── reviewer/# PR Approval Agent (PLANNED)
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

- **Brain Agent**: Central coordinator with multiple modes
- **Planner Agent**: Decomposes requirements into actionable tasks
- **Developer Agent**: Implements code changes based on plans
- **QA Agent**: Runs tests and validates implementations
- **Docs Agent**: Maintains documentation
- **Security Agent**: Vulnerability detection (planned)
- **Memory System**: SQLite-based memory with caching
- **MCP Integration**: Autonomous Git operations
- **Provider Registry**: Multi-provider LLM support with fallbacks

## 📊 Project Status

| Component | Status |
|-----------|--------|
| CLI Framework | ✅ Complete |
| Agent System | ✅ Core Complete |
| Memory System | ✅ Complete |
| Workflow Engine | ✅ Complete |
| Brain Agent | 🟡 In Progress |
| Mini-Brains | 📋 Planned |
| Security Agent | 📋 Planned |
| PR Approval Agent | 📋 Planned |
| Big Job Mode | 📋 Planned |

**Overall Progress:** ~75% Core Complete

## ⚙️ Configuration

Example configuration:

```json
{
  "agents": {
    "brain": {
      "enabled": true,
      "modes": ["conversational", "direct", "planning", "big-job"]
    },
    "developer": {
      "enabled": true,
      "mcp_tools": ["filesystem", "git"]
    },
    "qa": {
      "enabled": true,
      "mcp_tools": ["filesystem", "test"]
    }
  },
  "orchestration": {
    "defaultMode": "sequential",
    "retries": 3,
    "timeout": 300000
  }
}
```

## 🛠️ Development

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

## 🌐 API Server

The CLI includes an optional API server:

```bash
# Development
npm run start:api

# Production
npm run start:api:prod
```

## 📋 Requirements

- Node.js 16+
- npm 8+
- Git
- API keys for LLM providers (OpenAI, Anthropic, etc.)

## 📄 License

ISC

## 🤝 Contributing

This is an active development project. See [TODO.md](TODO.md) for current tasks and [FUTURE_STEPS.md](FUTURE_STEPS.md) for the roadmap.

## 📞 Support

For issues, questions, or contributions:
1. Check the documentation files
2. Review [AI_INSTRUCTIONS.md](AI_INSTRUCTIONS.md) for contribution guidelines
3. See [docs/imp-plan.md](docs/imp-plan.md) for technical details
