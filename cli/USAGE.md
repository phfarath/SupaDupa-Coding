# SupaDupaCode CLI - Usage Guide

## 🚀 Quick Start

### 1. Installation

```bash
cd cli
npm install
npm run build
```

This compiles the TypeScript source files to JavaScript in the `dist/` directory.

### 2. Global Installation (Optional)

```bash
npm install -g .
```

After global installation, you can use `supadupacode` or `sd` commands from anywhere.

### 3. Initialize Configuration

```bash
supadupacode config init
# or
npm start config init
```

This creates a `.supadupacode.json` file in your project directory with default settings.

### 4. Setup AI Providers (Required)

Before using the CLI, you need to configure at least one AI provider:

```bash
# Setup OpenAI (Recommended)
supadupacode provider add openai --key=sk-your-openai-api-key --model=gpt-4o

# Setup Anthropic Claude
supadupacode provider add anthropic --key=sk-ant-your-anthropic-key --model=claude-3-5-sonnet-20241022

# Setup Local Ollama
supadupacode provider add local --model=llama3.1:8b --endpoint=http://localhost:11434

# Set active provider
supadupacode provider switch openai
```

### 5. Start Interactive Chat (Recommended)

```bash
supadupacode chat
# or
sd chat
```

This starts an interactive chat session with the Brain orchestrator.

### 6. Create a Plan (Alternative to Chat)

```bash
supadupacode plan "Add user authentication with email and password"
```

This will:
- Analyze the feature description
- Decompose it into tasks
- Assign agents to each task
- Save the plan to a JSON file

### 7. Check Status

```bash
supadupacode status
```

Shows current development status, branch info, and metrics.

## 🎯 Detailed Usage

### 🧠 Interactive Chat Mode (Primary Interface)

The `chat` command provides an interactive conversational interface with the Brain orchestrator:

```bash
# Start chat with default agents
supadupacode chat

# Start chat with specific agents
supadupacode chat --agents planner,developer,qa

# Start chat with auto-approve enabled
supadupacode chat --auto-approve

# Start chat in specific workspace
supadupacode chat --workspace /path/to/project
```

**Chat Commands:**
- `/help` - Show available commands
- `/agents` - Manage active agents
- `/toggle` - Toggle auto-approve mode
- `/history` - View conversation history
- `/exit` - Exit chat session

**Example Chat Interactions:**
```
Você: Create a user authentication system with JWT
🤖 Brain: I'll help you create a JWT authentication system. Let me plan this task...
✅ Planner: Created authentication architecture
✅ Developer: Implemented JWT middleware
✅ QA: Added security tests
✅ Docs: Updated API documentation

Você: Fix the login bug in the dashboard
🤖 Brain: I'll analyze and fix the login issue...
✅ Developer: Fixed session validation bug
✅ QA: Verified login functionality
```

### 📋 Planning Features

The `plan` command decomposes a feature description into executable tasks:

```bash
# Basic plan
supadupacode plan "Implement shopping cart"

# With JSON output
supadupacode plan "Add payment integration" --output json

# Verbose mode
supadupacode plan "Create admin dashboard" --verbose
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

### 🤖 AI Provider Management

Manage AI model providers (critical for functionality):

```bash
# Add OpenAI Provider (Recommended)
supadupacode provider add openai \
  --key=sk-your-openai-api-key \
  --model=gpt-4o \
  --setActive

# Add Anthropic Claude Provider
supadupacode provider add anthropic \
  --key=sk-ant-your-anthropic-key \
  --model=claude-3-5-sonnet-20241022

# Add Local Ollama Provider
supadupacode provider add local \
  --model=llama3.1:8b \
  --endpoint=http://localhost:11434

# List all providers
supadupacode provider list

# Switch active provider
supadupacode provider switch openai

# Test provider connection
supadupacode provider test openai

# Update provider settings
supadupacode provider update openai --model=gpt-4o-mini

# Remove provider
supadupacode provider remove anthropic
```

**Supported Models (2024):**

**OpenAI:**
- `gpt-4o` - Latest flagship model (recommended)
- `gpt-4o-mini` - Faster, cheaper alternative
- `gpt-4-turbo` - Previous generation
- `gpt-3.5-turbo` - Budget option

**Anthropic Claude:**
- `claude-3-5-sonnet-20241022` - Latest model (recommended)
- `claude-3-opus-20240229` - High-performance
- `claude-3-sonnet-20240229` - Balanced
- `claude-3-haiku-20240307` - Fast, cost-effective

**Local Models (Ollama):**
- `llama3.1:8b` - Meta's latest 8B model
- `llama3.1:70b` - Meta's latest 70B model
- `codellama:7b` - Code-specialized
- `mistral:7b` - Efficient general purpose

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

## 🌍 Installation Options

### Global Installation (Recommended)

```bash
cd cli
npm install -g .
```

After global installation:
```bash
supadupacode chat
supadupacode plan "Add user authentication"
supadupacode status
sd chat  # Short alias
```

### Local Development

```bash
cd cli
npm install
npm run build

# Direct execution
node dist/src/index.js chat

# Using npm scripts
npm start chat
npm start plan "Add user authentication"
```

### Docker Usage

```bash
# Build Docker image
docker build -t supadupacode .

# Run with Docker
docker run -it -v $(pwd):/workspace supadupacode chat
```

## 🔧 Configuration

### Environment Variables

```bash
# OpenAI API Key
export OPENAI_API_KEY=sk-your-key-here

# Anthropic API Key
export ANTHROPIC_API_KEY=sk-ant-your-key-here

# Default Provider
export SUPADUPACODE_DEFAULT_PROVIDER=openai

# Log Level
export SUPADUPACODE_LOG_LEVEL=info
```

### Configuration File (.supadupacode.json)

```json
{
  "providers": {
    "active": "openai",
    "openai": {
      "model": "gpt-4o",
      "apiKey": "${OPENAI_API_KEY}",
      "settings": {
        "temperature": 0.7,
        "maxTokens": 4000
      }
    }
  },
  "agents": {
    "planner": { "enabled": true },
    "developer": { "enabled": true },
    "qa": { "enabled": true },
    "docs": { "enabled": false }
  },
  "orchestration": {
    "defaultMode": "sequential",
    "autoApprove": false,
    "maxConcurrentTasks": 3
  },
  "workspace": {
    "indexFiles": true,
    "excludePatterns": ["node_modules", ".git", "dist"]
  }
}
```

## 💡 Tips and Best Practices

### For Best Results

1. **Start with Chat**: Use `supadupacode chat` for interactive development
2. **Configure Providers First**: Set up AI providers before any other task
3. **Use GPT-4o**: Best performance for complex tasks
4. **Be Specific**: Provide detailed requirements in chat
5. **Review Plans**: Always review generated plans before execution
6. **Use Auto-approve**: For trusted projects, enable auto-approve
7. **Monitor Usage**: Check token usage with provider commands

### Chat Best Practices

```
Good prompts:
- "Create a REST API for user management with CRUD operations"
- "Fix the authentication bug in the login component"
- "Add unit tests for the payment service"
- "Refactor the user dashboard to use React hooks"

Bad prompts:
- "fix it"
- "make it better"
- "add stuff"
```

### Project Setup

1. **Initialize in Git Repository**: Always work in a git repo
2. **Configure Per Project**: Customize `.supadupacode.json` for each project
3. **Version Control Config**: Commit `.supadupacode.json` (without API keys)
4. **Use Environment Variables**: Store API keys in environment

## 🚨 Troubleshooting

### Common Issues

#### Chat Not Working
```bash
# Check provider configuration
supadupacode provider list

# Test provider connection
supadupacode provider test openai

# Check API key
echo $OPENAI_API_KEY
```

#### Brain Orchestrator Not Responding
```bash
# Check active agents
supadupacode agent list

# Verify provider is active
supadupacode provider list

# Reset configuration
supadupacode config reset
supadupacode config init
```

#### Model Issues
```bash
# Update to latest model
supadupacode provider update openai --model=gpt-4o

# Check available models
supadupacode provider show openai
```

#### Configuration Issues
```bash
# Reset to defaults
supadupacode config reset

# Reinitialize
supadupacode config init

# Validate configuration
supadupacode validate
```

#### Command Not Found
```bash
# Ensure proper installation
npm install -g .

# Check installation
which supadupacode

# Use local version
cd cli && npm start chat
```

#### Git Issues
- Ensure you're in a Git repository
- Check git permissions: `git status`
- Configure git user: `git config --global user.name "Your Name"`

### Debug Mode

```bash
# Enable debug logging
export SUPADUPACODE_LOG_LEVEL=debug
supadupacode chat

# Run with verbose output
supadupacode chat --verbose

# Check system health
supadupacode health
```

### Getting Help

```bash
# General help
supadupacode --help

# Command-specific help
supadupacode chat --help
supadupacode provider --help

# Check version
supadupacode version
```

## Next Steps

- Customize agent configuration for your project
- Define your orchestration patterns
- Set up quality gates and required checks
- Integrate with CI/CD pipelines

For more information, see [README.md](README.md) and [MVP Documentation](../docs/MVP.md).
