# SupaDupaCode CLI - Command Reference

This document provides a comprehensive reference for all available commands in the SupaDupaCode CLI.

## Table of Contents

1. [Agent Management](#agent-management)
2. [Memory Management](#memory-management)
3. [API Integration](#api-integration)
4. [Workflow Management](#workflow-management)
5. [Monitoring & Observability](#monitoring--observability)
6. [Debugging & Diagnostics](#debugging--diagnostics)
7. [Environment & Deployment](#environment--deployment)
8. [Legacy Commands](#legacy-commands)

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

## Monitoring & Observability

### `metrics collect`
Collect system performance metrics.

**Usage:**
```bash
supadupacode metrics collect [options]
```

**Options:**
- `--format <format>` - Output format: json, prometheus (default: json)
- `--interval <seconds>` - Collection interval (default: 60)

**Example:**
```bash
supadupacode metrics collect --format=json
supadupacode metrics collect --format=prometheus --interval=30
```

### `metrics show`
Display current system metrics.

**Usage:**
```bash
supadupacode metrics show
```

### `logs query`
Query and filter system logs.

**Usage:**
```bash
supadupacode logs query [options]
```

**Options:**
- `--agent <name>` - Filter by agent
- `--severity <level>` - Filter by severity: info, warn, error
- `--since <time>` - Filter by time

**Example:**
```bash
supadupacode logs query --agent=planner --severity=error
supadupacode logs query --since="2024-01-01" --agent=developer
```

### `logs export`
Export logs to a file.

**Usage:**
```bash
supadupacode logs export [options]
```

**Options:**
- `--format <format>` - Export format (default: json)
- `--output <file>` - Output file path

**Example:**
```bash
supadupacode logs export --format=json --output=logs-export.json
```

### `alert configure <name>`
Configure a monitoring alert.

**Usage:**
```bash
supadupacode alert configure <name> [options]
```

**Options:**
- `--metric <metric>` - Metric to monitor (required)
- `--threshold <value>` - Alert threshold (required)
- `--channel <channel>` - Notification channel: console, slack, email, webhook (default: console)

**Example:**
```bash
supadupacode alert configure high-latency --metric=api.latency --threshold=1000 --channel=slack
supadupacode alert configure agent-failure --metric=agent.status --threshold=0 --channel=email
```

### `alert list`
List all configured alerts.

**Usage:**
```bash
supadupacode alert list
```

---

## Debugging & Diagnostics

### `debug trace`
Start detailed event tracing.

**Usage:**
```bash
supadupacode debug trace [options]
```

**Options:**
- `--agent <name>` - Agent to trace
- `--duration <seconds>` - Trace duration (default: 60)

**Example:**
```bash
supadupacode debug trace --agent=planner --duration=120
```

### `debug inspect`
Inspect system components.

**Usage:**
```bash
supadupacode debug inspect [options]
```

**Options:**
- `--component <name>` - Component to inspect (default: system)

**Example:**
```bash
supadupacode debug inspect --component=orchestrator
```

### `health`
Perform comprehensive system health check.

**Usage:**
```bash
supadupacode health
```

**Checks:**
- Configuration integrity
- API connectivity
- Memory system status
- Agent availability
- Resource usage

---

## Environment & Deployment

### `env setup`
Setup an execution environment.

**Usage:**
```bash
supadupacode env setup [options]
```

**Options:**
- `--env <environment>` - Environment: development, staging, production (default: development)

**Example:**
```bash
supadupacode env setup --env=production
```

### `env list`
List available environments.

**Usage:**
```bash
supadupacode env list
```

### `deploy`
Deploy application to an environment.

**Usage:**
```bash
supadupacode deploy [options]
```

**Options:**
- `--env <environment>` - Target environment (default: production)
- `--incremental` - Use incremental deployment

**Example:**
```bash
supadupacode deploy --env=production
supadupacode deploy --env=staging --incremental
```

### `rollback`
Rollback to a previous version.

**Usage:**
```bash
supadupacode rollback --version=<version>
```

**Example:**
```bash
supadupacode rollback --version=0.9.0
```

### `version`
Show version information.

**Usage:**
```bash
supadupacode version [options]
```

**Options:**
- `--action <action>` - Action: show, list (default: show)

**Example:**
```bash
supadupacode version
supadupacode version --action=list
```

### `validate`
Validate system configuration.

**Usage:**
```bash
supadupacode validate
```

**Validates:**
- Configuration file
- Agent configuration
- API credentials
- Git settings
- Memory settings
- Network connectivity

---

## Legacy Commands

### `plan <description>`
Plan and decompose a feature into tasks.

**Usage:**
```bash
supadupacode plan <description> [options]
```

**Options:**
- `-v, --verbose` - Verbose output
- `-o, --output <format>` - Output format: json, text (default: text)

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

### `status`
Check status of feature development.

**Usage:**
```bash
supadupacode status [options]
```

**Options:**
- `-f, --feature <name>` - Feature name/identifier
- `-a, --all` - Show all features
- `-w, --watch` - Watch mode (continuous updates)

### `review`
Review pull request.

**Usage:**
```bash
supadupacode review [options]
```

**Options:**
- `--pr <number>` - Pull request number
- `--auto-approve` - Automatically approve if checks pass

### `fix`
Fix issues in pull request.

**Usage:**
```bash
supadupacode fix [options]
```

**Options:**
- `--pr <number>` - Pull request number
- `--check <name>` - Specific check to fix
- `--auto-commit` - Automatically commit fixes

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
