# SupaDupaCode CLI - Command Reference

This document provides a comprehensive reference for all available commands in the SupaDupaCode CLI.

## Table of Contents

1. [Core Workflow Commands](#core-workflow-commands)
2. [Agent Management](#agent-management)
3. [Memory Management](#memory-management)
4. [API Integration](#api-integration)
5. [Workflow Management](#workflow-management)
6. [Configuration](#configuration)

---

## Core Workflow Commands

### `plan <description>`
Plan and decompose a feature into tasks for parallel execution.

**Usage:**
```bash
supadupacode plan <description> [options]
```

**Options:**
- `-v, --verbose` - Verbose output
- `-o, --output <format>` - Output format: json, text (default: text)

**Example:**
```bash
supadupacode plan "Add user authentication"
supadupacode plan "Implement REST API" --output=json
```

### `run`
Execute feature development with AI agents.

**Usage:**
```bash
supadupacode run [options]
```

**Options:**
- `-f, --feature <name>` - Feature name/identifier
- `-p, --plan <file>` - Plan file to execute
- `-m, --mode <mode>` - Execution mode: sequential, concurrent, handoff (default: sequential)

**Example:**
```bash
supadupacode run --feature=auth-system
supadupacode run --plan=plan.json --mode=concurrent
```

### `status`
Check status of feature development and agent progress.

**Usage:**
```bash
supadupacode status [options]
```

**Options:**
- `-f, --feature <name>` - Feature name/identifier
- `-a, --all` - Show all features
- `-w, --watch` - Watch mode (continuous updates)

**Example:**
```bash
supadupacode status --feature=auth-system
supadupacode status --all --watch
```

### `review`
Review pull request with automated feedback.

**Usage:**
```bash
supadupacode review [options]
```

**Options:**
- `--pr <number>` - Pull request number
- `--auto-approve` - Automatically approve if checks pass

**Example:**
```bash
supadupacode review --pr=123
supadupacode review --pr=123 --auto-approve
```

### `fix`
Fix issues in pull request automatically.

**Usage:**
```bash
supadupacode fix [options]
```

**Options:**
- `--pr <number>` - Pull request number
- `--check <name>` - Specific check to fix
- `--auto-commit` - Automatically commit fixes

**Example:**
```bash
supadupacode fix --pr=123
supadupacode fix --pr=123 --check=lint --auto-commit
```

### `chat`
Interactive conversational mode for multi-agent orchestration.

**Usage:**
```bash
supadupacode chat
```

**Description:**
Starts an interactive chat session where you can orchestrate multi-agent workflows conversationally. The chat mode provides real-time collaboration with AI agents.

---

## Agent Management

### `agent list`
List all registered agents in the system.

**Usage:**
```bash
supadupacode agent list [options]
```

**Options:**
- `--type <type>` - Filter by agent type (assistant, researcher, coordinator)
- `--status <status>` - Filter by status (active, stopped)
- `-v, --verbose` - Show detailed information including resource usage

**Example:**
```bash
supadupacode agent list
supadupacode agent list --status=active --verbose
```

### `agent info <name>`
Show detailed information about a specific agent.

**Usage:**
```bash
supadupacode agent info <name>
```

**Example:**
```bash
supadupacode agent info planner
```

### `agent create <name>`
Create a new agent with custom configuration.

**Usage:**
```bash
supadupacode agent create <name> [options]
```

**Options:**
- `--type <type>` - Agent type: assistant, researcher, coordinator (default: assistant)
- `--model <model>` - Language model: gpt-4, claude, local (default: gpt-4)
- `--memory-size <size>` - Memory size in tokens (default: 4096)

**Example:**
```bash
supadupacode agent create myagent --type=assistant --model=gpt-4 --memory-size=8192
```

### `agent start <name>`
Start a stopped agent with health checks.

**Usage:**
```bash
supadupacode agent start <name>
```

**Example:**
```bash
supadupacode agent start myagent
```

### `agent stop <name>`
Stop a running agent with cleanup.

**Usage:**
```bash
supadupacode agent stop <name>
```

**Example:**
```bash
supadupacode agent stop myagent
```

### `agent restart <name>`
Restart an agent with integrity checks.

**Usage:**
```bash
supadupacode agent restart <name>
```

**Example:**
```bash
supadupacode agent restart myagent
```

### `agent delete <name>`
Delete an agent and clean up all resources.

**Usage:**
```bash
supadupacode agent delete <name>
```

**Example:**
```bash
supadupacode agent delete myagent
```

---

## Memory Management

### `memory init`
Initialize the memory system with persistent storage.

**Usage:**
```bash
supadupacode memory init [options]
```

**Options:**
- `--backend <backend>` - Storage backend: filesystem, redis, postgres (default: filesystem)

**Example:**
```bash
supadupacode memory init --backend=filesystem
```

### `memory context show`
Display the current context state of an agent.

**Usage:**
```bash
supadupacode memory context show --agent=<id>
```

**Example:**
```bash
supadupacode memory context show --agent=planner
```

### `memory context clear`
Clear/reset the context memory of an agent.

**Usage:**
```bash
supadupacode memory context clear --agent=<id>
```

**Example:**
```bash
supadupacode memory context clear --agent=planner
```

### `memory context backup`
Backup agent context to a file.

**Usage:**
```bash
supadupacode memory context backup --agent=<id> --file=<path>
```

**Example:**
```bash
supadupacode memory context backup --agent=planner --file=planner-backup.json
```

### `memory optimize`
Run memory optimization and garbage collection.

**Usage:**
```bash
supadupacode memory optimize
```

---

## API Integration

### `api register <provider>`
Register a new API provider with authentication.

**Usage:**
```bash
supadupacode api register <provider> [options]
```

**Options:**
- `--key <key>` - API key (required)
- `--endpoint <url>` - API endpoint URL (default: provider's standard endpoint)
- `--quota <rpm>` - Requests per minute quota (default: 60)

**Example:**
```bash
supadupacode api register openai --key=sk-xxx --quota=60
supadupacode api register anthropic --key=sk-ant-xxx --endpoint=https://api.anthropic.com/v1
```

### `api status`
Show real-time status of all registered API providers.

**Usage:**
```bash
supadupacode api status
```

### `auth configure <provider>`
Configure secure authentication for a provider.

**Usage:**
```bash
supadupacode auth configure <provider>
```

**Example:**
```bash
supadupacode auth configure openai
```

### `auth verify`
Verify API authentication and connectivity.

**Usage:**
```bash
supadupacode auth verify --provider=<name>
```

**Example:**
```bash
supadupacode auth verify --provider=openai
```

### `provider`
Manage API providers (add, list, switch, remove, show, update).

**Usage:**
```bash
supadupacode provider [action] [name] [options]
```

**Actions:**
- `add` - Add a new provider
- `list` - List all providers (default)
- `switch` - Switch active provider
- `remove` - Remove a provider
- `show` - Show provider details
- `update` - Update provider configuration

**Options:**
- `-k, --key <key>` - API key
- `-m, --model <model>` - Model name (e.g., gpt-4, claude-3)
- `-e, --endpoint <url>` - API endpoint URL
- `--set-active` - Set as active provider

**Example:**
```bash
supadupacode provider list
supadupacode provider add openai --key=sk-xxx --model=gpt-4
supadupacode provider switch anthropic
```

---

## Workflow Management

### `workflow create <name>`
Create a new multi-agent workflow.

**Usage:**
```bash
supadupacode workflow create <name> [options]
```

**Options:**
- `--description <desc>` - Workflow description
- `--parallel` - Enable parallel execution
- `--error-strategy <strategy>` - Error handling: retry, rollback, notify

**Example:**
```bash
supadupacode workflow create build-feature --description="Build authentication" --parallel
```

### `workflow list`
List all available workflows.

**Usage:**
```bash
supadupacode workflow list
```

### `workflow run <id>`
Execute a workflow.

**Usage:**
```bash
supadupacode workflow run <id>
```

**Example:**
```bash
supadupacode workflow run workflow-123
```

### `workflow status <id>`
Check the status of a workflow execution.

**Usage:**
```bash
supadupacode workflow status <id>
```

**Example:**
```bash
supadupacode workflow status workflow-123
```

### `workflow logs <id>`
View execution logs for a workflow.

**Usage:**
```bash
supadupacode workflow logs <id>
```

**Example:**
```bash
supadupacode workflow logs workflow-123
```

---

## Configuration

### `config`
Manage CLI configuration.

**Usage:**
```bash
supadupacode config [action] [key] [value]
```

**Actions:**
- `init` - Initialize configuration
- `show` - Show configuration
- `set` - Set configuration value
- `reset` - Reset to defaults

**Example:**
```bash
supadupacode config init
supadupacode config show
supadupacode config set api.provider openai
supadupacode config reset
```

### `setup`
Interactive setup wizard for initial configuration.

**Usage:**
```bash
supadupacode setup
```

**Description:**
Guides you through the initial setup process, including:
- API provider configuration
- Agent setup
- Memory system initialization
- Workflow preferences

### `sd`
Simplified interface for common operations.

**Usage:**
```bash
sd [command]
```

**Description:**
A simplified alias for common SupaDupaCode operations. Provides a streamlined interface for frequently used commands.

---

## Global Options

All commands support these global options:

- `-h, --help` - Display help for command
- `-V, --version` - Output the version number

## Exit Codes

- `0` - Success
- `1` - Error (detailed error message displayed)

## Environment Variables

The CLI respects these environment variables:

- `SUPADUPACODE_CONFIG` - Path to custom configuration file
- `SUPADUPACODE_LOG_LEVEL` - Logging level: debug, info, warn, error
- `NODE_ENV` - Environment: development, production

## Configuration File

The CLI uses `.supadupacode.json` in the project root. Initialize with:

```bash
supadupacode config init
```

## Support

For issues and questions:
- GitHub Issues: https://github.com/phfarath/SupaDupa-Coding/issues
- Documentation: See README.md and USAGE.md
