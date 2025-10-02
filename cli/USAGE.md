# SupaDupaCode CLI - Usage Guide

## Quick Start

### 1. Installation

```bash
cd cli
npm install
```

### 2. Initialize Configuration

```bash
node src/index.js config init
```

This creates a `.supadupacode.json` file in your project directory with default settings.

### 3. Create a Plan

```bash
node src/index.js plan "Add user authentication with email and password"
```

This will:
- Analyze the feature description
- Decompose it into tasks
- Assign agents to each task
- Save the plan to a JSON file

### 4. Check Status

```bash
node src/index.js status
```

Shows current development status, branch info, and metrics.

## Detailed Usage

### Planning Features

The `plan` command decomposes a feature description into executable tasks:

```bash
# Basic plan
node src/index.js plan "Implement shopping cart"

# With JSON output
node src/index.js plan "Add payment integration" --output json

# Verbose mode
node src/index.js plan "Create admin dashboard" --verbose
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
node src/index.js run --plan plan-12345.json

# Run by feature name
node src/index.js run --feature user-authentication

# With specific orchestration mode
node src/index.js run --feature dashboard --mode concurrent
```

**Orchestration Modes:**
- `sequential` - Tasks run one after another (default)
- `concurrent` - Tasks run in parallel
- `handoff` - Tasks run with context passing

### Monitoring Status

Track progress with the `status` command:

```bash
# General status
node src/index.js status

# Specific feature
node src/index.js status --feature user-authentication

# All features
node src/index.js status --all

# Watch mode (future)
node src/index.js status --watch
```

### Reviewing PRs

Review pull requests with the `review` command:

```bash
# Review PR
node src/index.js review --pr 123

# Auto-approve if checks pass
node src/index.js review --pr 123 --auto-approve
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
node src/index.js fix --pr 123

# Fix specific check
node src/index.js fix --check unit-tests

# Auto-commit fixes
node src/index.js fix --pr 123 --auto-commit
```

### Configuration Management

Manage settings with the `config` command:

```bash
# Show all configuration
node src/index.js config show

# Show specific key
node src/index.js config show orchestration.defaultMode

# Set value
node src/index.js config set orchestration.defaultMode concurrent

# Reset to defaults
node src/index.js config reset
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
