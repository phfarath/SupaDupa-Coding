# SupaDupaCode CLI - Usage Guide

## Quick Start

### 1. Installation

```bash
cd cli
npm install
```

### 2. Build the TypeScript Project

```bash
npm run build
```

This compiles the TypeScript source files to JavaScript in the `dist/` directory.

### 3. Initialize Configuration

```bash
npm start config init
```

This creates a `.supadupacode.json` file in your project directory with default settings.

### 4. Create a Plan

```bash
npm start plan "Add user authentication with email and password"
```

This will:
- Analyze the feature description
- Decompose it into tasks
- Assign agents to each task
- Save the plan to a JSON file

### 5. Check Status

```bash
npm start status
```

Shows current development status, branch info, and metrics.

## Detailed Usage

### Planning Features

The `plan` command decomposes a feature description into executable tasks:

```bash
# Basic plan
npm start plan "Implement shopping cart"

# With JSON output
npm start plan "Add payment integration" --output json

# Verbose mode
npm start plan "Create admin dashboard" --verbose
```

**Output:**
- Task breakdown with dependencies
- Agent assignments
- Orchestration pattern
- Saved plan file (plan-{id}.json)

### Running Features

Execute plans with the `run` command:

```bash
# Run from saved plan
npm start run --plan plan-12345.json

# Run by feature name
npm start run --feature user-authentication

# With specific orchestration mode
npm start run --feature dashboard --mode concurrent
```

**Orchestration Modes:**
- `sequential` - Tasks run one after another (default)
- `concurrent` - Tasks run in parallel
- `handoff` - Tasks run with context passing

### Monitoring Status

Track progress with the `status` command:

```bash
# General status
npm start status

# Specific feature
npm start status --feature user-authentication

# All features
npm start status --all

# Watch mode (future)
npm start status --watch
```

### Reviewing PRs

Review pull requests with the `review` command:

```bash
# Review PR
npm start review --pr 123

# Auto-approve if checks pass
npm start review --pr 123 --auto-approve
```

**Shows:**
- PR information
- Check status
- Files changed
- Recommendations

### Fixing Issues

Apply automated fixes with the `fix` command:

```bash
# Fix all issues in PR
npm start fix --pr 123

# Fix specific check
npm start fix --check unit-tests

# Auto-commit fixes
npm start fix --pr 123 --auto-commit
```

### Configuration Management

Manage settings with the `config` command:

```bash
# Show all configuration
npm start config show

# Show specific key
npm start config show orchestration.defaultMode

# Set value
npm start config set orchestration.defaultMode concurrent

# Reset to defaults
npm start config reset
```

### Agent Management

Manage and inspect agents with the `agent` command:

```bash
# List all available agents
npm start agent list

# Show detailed information about an agent
npm start agent info planner
npm start agent info developer
npm start agent info qa
npm start agent info docs

# Create a new agent (persisted to configuration)
npm start agent create myagent --type=assistant --model=gpt-4 --memory-size=8192

# Start, stop, restart agents
npm start agent start myagent
npm start agent stop myagent
npm start agent restart myagent

# Delete an agent (removes from configuration)
npm start agent delete myagent

# Note: Custom agents are automatically persisted to .supadupacode.json
# and will be available in subsequent commands

# Filter agents by status
npm start agent list --status=active
npm start agent list --type=assistant --verbose
```

The CLI includes four default agents:
- **planner**: Handles analysis and planning tasks
- **developer**: Handles implementation and coding tasks
- **qa**: Handles testing and quality assurance tasks
- **docs**: Handles documentation tasks

### Memory Management

Manage persistent memory and agent context:

```bash
# Initialize memory system
npm start memory init --backend=filesystem

# Show agent context
npm start memory context show --agent=planner

# Clear agent context (reset memory)
npm start memory context clear --agent=planner

# Backup agent context
npm start memory context backup --agent=planner --file=planner-backup.json

# Optimize memory (garbage collection)
npm start memory optimize
```

### API Integration Management

Manage external API integrations:

```bash
# Register an API provider
npm start api register openai --key=sk-xxx --endpoint=https://api.openai.com/v1 --quota=60

# Check API status
npm start api status

# Configure authentication
npm start auth configure openai

# Verify authentication
npm start auth verify --provider=openai
```

### Workflow Management

Create and manage multi-agent workflows:

```bash
# Create a workflow
npm start workflow create build-feature --description="Build authentication feature"

# List all workflows
npm start workflow list

# Run a workflow
npm start workflow run workflow-123

# Check workflow status
npm start workflow status workflow-123

# View workflow logs
npm start workflow logs workflow-123
```

### Monitoring and Observability

Collect metrics, query logs, and configure alerts:

```bash
# Collect metrics
npm start metrics collect --format=json --interval=60
npm start metrics collect --format=prometheus

# Show current metrics
npm start metrics show

# Query logs
npm start logs query --agent=planner --severity=error
npm start logs query --since="2024-01-01" --agent=developer

# Export logs
npm start logs export --format=json --output=logs-export.json

# Configure alerts
npm start alert configure high-latency --metric=api.latency --threshold=1000 --channel=slack
npm start alert configure agent-failure --metric=agent.status --threshold=0 --channel=email

# List alerts
npm start alert list
```

### Debugging and Diagnostics

Debug system operations and perform health checks:

```bash
# Start debug trace
npm start debug trace --agent=planner --duration=60

# Inspect system components
npm start debug inspect --component=orchestrator

# Perform system health check
npm start health
```

### Environment and Deployment

Manage environments and deployments:

```bash
# Setup environment
npm start env setup --env=development
npm start env setup --env=production

# List environments
npm start env list

# Deploy to environment
npm start deploy --env=production
npm start deploy --env=staging --incremental

# Rollback deployment
npm start rollback --version=0.9.0

# Show version information
npm start version
npm start version --action=list

# Validate configuration
npm start validate
```

## Configuration Guide

### Agent Configuration

Control which agents are active and their capabilities:

```json
{
  "agents": {
    "frontend": {
      "enabled": true,
      "role": "frontend",
      "mcp_tools": ["filesystem", "git"]
    }
  }
}
```

### MCP Server Configuration

Enable/disable MCP servers:

```json
{
  "mcp": {
    "servers": {
      "filesystem": { "enabled": true },
      "git": { "enabled": true },
      "test": { "enabled": true }
    }
  }
}
```

### Git Configuration

Customize Git behavior:

```json
{
  "git": {
    "branchPrefix": "agent",
    "commitMessageFormat": "[{agent}] {scope}: {description}",
    "requirePR": true,
    "autoMerge": false
  }
}
```

### Orchestration Configuration

Control task execution:

```json
{
  "orchestration": {
    "defaultMode": "sequential",
    "retries": 3,
    "timeout": 300000
  }
}
```

## Workflow Examples

### Example 1: Simple Feature

```bash
# 1. Plan the feature
node src/index.js plan "Add user profile page"

# 2. Run the plan (saves to plan-xxx.json)
node src/index.js run --plan plan-xxx.json

# 3. Check status
node src/index.js status

# 4. Review generated PR
node src/index.js review --pr 456
```

### Example 2: Complex Feature with Concurrent Execution

```bash
# 1. Configure concurrent mode
node src/index.js config set orchestration.defaultMode concurrent

# 2. Plan complex feature
node src/index.js plan "Build real-time chat system"

# 3. Run with concurrent mode
node src/index.js run --plan plan-xxx.json --mode concurrent

# 4. Monitor all features
node src/index.js status --all
```

### Example 3: Fix Failing Tests

```bash
# 1. Review PR with issues
node src/index.js review --pr 789

# 2. Apply fixes
node src/index.js fix --pr 789 --auto-commit

# 3. Verify status
node src/index.js status
```

## Branch Management

The CLI creates branches following this pattern:

```
agent/{agent-name}/{feature-slug}
```

Examples:
- `agent/frontend/user-profile`
- `agent/backend/payment-api`
- `agent/qa/integration-tests`

## Commit Messages

Commits follow this format:

```
[{agent}] {scope}: {description}
```

Examples:
- `[frontend] feature: Add login component`
- `[backend] fix: Resolve database connection issue`
- `[qa] test: Add unit tests for auth service`

## Metrics and Observability

The CLI tracks:
- Task completion rates
- Lead time per task/feature
- Success/failure rates
- Agent performance
- Git activity

View metrics with:
```bash
node src/index.js status
```

## Global Installation

To install the SupaDupaCode CLI globally:

```bash
cd cli
npm install -g .
```

Then you can run commands from anywhere:

```bash
supadupacode plan "Add user authentication"
supadupacode status
supadupacode run --plan plan-123.json
```

## Local Development

For local development without global installation:

```bash
cd cli
npm install
npm run build
node dist/index.js plan "Add user authentication"
```

Or use npm scripts:

```bash
cd cli
npm install
npm run build
npm start plan "Add user authentication"
```

## Tips and Best Practices

1. **Start with Planning**: Always create a plan before executing
2. **Monitor Frequently**: Use `status` to track progress
3. **Use Sequential for Dependencies**: Start with sequential mode for tasks with dependencies
4. **Review Before Merge**: Always review PRs even with auto-approval
5. **Configure Per Project**: Customize `.supadupacode.json` for each project
6. **Version Control Config**: Commit `.supadupacode.json` to your repository

## Troubleshooting

### Configuration Issues

```bash
# Reset to defaults
node src/index.js config reset

# Reinitialize
node src/index.js config init
```

### Command Not Found

Make sure you're in the cli directory:
```bash
cd cli
node src/index.js --help
```

### Git Issues

Ensure you're in a Git repository with proper permissions.

## Next Steps

- Customize agent configuration for your project
- Define your orchestration patterns
- Set up quality gates and required checks
- Integrate with CI/CD pipelines

For more information, see [README.md](README.md) and [MVP Documentation](../docs/MVP.md).
