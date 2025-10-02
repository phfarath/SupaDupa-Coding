# SupaDupaCode CLI - Integration Guide

This guide explains how to integrate the SupaDupaCode CLI orchestrator into your existing projects.

## Table of Contents

- [Quick Start](#quick-start)
- [Installation Methods](#installation-methods)
- [Project Setup](#project-setup)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Quick Start

### 1. Install the CLI

For local development in your project:

```bash
# Clone the repository or install from npm (when published)
cd your-existing-project
npm install --save-dev supadupacode

# Or use npx to run without installation
npx supadupacode --help
```

For global installation:

```bash
npm install -g supadupacode
# Or use npm link if developing locally
cd path/to/SupaDupa-Coding/cli
npm link
```

### 2. Initialize Configuration

Navigate to your project root and initialize the CLI configuration:

```bash
cd your-existing-project
supadupacode config init
```

This creates a `.supadupacode.json` file in your project root with default settings.

### 3. Customize Configuration

Edit `.supadupacode.json` to match your project structure and requirements:

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
    "defaultMode": "sequential"
  }
}
```

### 4. Start Using the CLI

```bash
# Plan a new feature
supadupacode plan "Add user authentication"

# Run the plan
supadupacode run --plan plan-xxx.json

# Check status
supadupacode status
```

## Installation Methods

### Method 1: NPM Package (Recommended when published)

```bash
cd your-project
npm install --save-dev supadupacode
```

Add to your `package.json` scripts:

```json
{
  "scripts": {
    "supa:plan": "supadupacode plan",
    "supa:run": "supadupacode run",
    "supa:status": "supadupacode status",
    "supa:agent": "supadupacode agent"
  }
}
```

Usage:
```bash
npm run supa:plan "Implement feature X"
npm run supa:agent list
```

### Method 2: Global Installation

```bash
npm install -g supadupacode
```

Usage anywhere:
```bash
cd any-project
supadupacode config init
supadupacode plan "Feature description"
```

### Method 3: Local Development with npm link

For development or testing:

```bash
# In the CLI directory
cd path/to/SupaDupa-Coding/cli
npm install
npm link

# In your project
cd your-project
supadupacode config init
```

### Method 4: Using npx (No Installation)

```bash
npx supadupacode config init
npx supadupacode plan "Feature description"
```

## Project Setup

### Directory Structure

Add the CLI configuration to your existing project:

```
your-project/
├── .supadupacode.json      # CLI configuration (add this)
├── .gitignore              # Add .supadupacode.json if needed
├── src/
│   └── your-code/
├── tests/
│   └── your-tests/
└── package.json
```

### Add to .gitignore (Optional)

If you want to keep configuration local to each developer:

```gitignore
# .gitignore
.supadupacode.json
plan-*.json
```

Or commit it to share configuration across your team:

```bash
git add .supadupacode.json
git commit -m "Add SupaDupaCode CLI configuration"
```

## Configuration

### Basic Configuration

Minimum viable configuration:

```json
{
  "orchestration": {
    "defaultMode": "sequential"
  }
}
```

### Full Configuration

Complete configuration with all options:

```json
{
  "agents": {
    "planner": {
      "enabled": true,
      "capabilities": ["analysis", "planning"]
    },
    "developer": {
      "enabled": true,
      "capabilities": ["implementation", "coding"]
    },
    "qa": {
      "enabled": true,
      "capabilities": ["testing", "validation"]
    },
    "docs": {
      "enabled": true,
      "capabilities": ["documentation"]
    }
  },
  "customAgents": {
    "myagent": {
      "type": "assistant",
      "model": "gpt-4",
      "memorySize": 8192,
      "capabilities": ["custom-task"]
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

### Project-Specific Settings

#### For Frontend Projects

```json
{
  "agents": {
    "frontend": {
      "enabled": true,
      "mcp_tools": ["filesystem", "git", "build"]
    }
  },
  "orchestration": {
    "defaultMode": "concurrent"
  }
}
```

#### For Backend APIs

```json
{
  "agents": {
    "backend": {
      "enabled": true,
      "mcp_tools": ["filesystem", "git", "db", "test"]
    }
  },
  "orchestration": {
    "defaultMode": "sequential"
  }
}
```

#### For Full-Stack Projects

```json
{
  "agents": {
    "frontend": { "enabled": true },
    "backend": { "enabled": true },
    "qa": { "enabled": true },
    "docs": { "enabled": true }
  },
  "orchestration": {
    "defaultMode": "concurrent"
  }
}
```

## Usage Examples

### Example 1: Adding a New Feature

```bash
# 1. Plan the feature
supadupacode plan "Add user profile page with avatar upload"

# 2. Review the plan (saved as plan-xxx.json)
cat plan-xxx.json

# 3. Execute the plan
supadupacode run --plan plan-xxx.json

# 4. Monitor progress
supadupacode status
```

### Example 2: Using Custom Agents

```bash
# Create a custom agent for your specific task
supadupacode agent create security-scanner \
  --type=assistant \
  --model=gpt-4 \
  --memory-size=8192

# List all agents (including your custom one)
supadupacode agent list

# View agent details
supadupacode agent info security-scanner
```

### Example 3: Team Workflow

```bash
# Developer A: Plan the feature
supadupacode plan "Implement payment gateway"

# Commit the plan
git add plan-xxx.json
git commit -m "Add payment gateway plan"
git push

# Developer B: Pull and execute
git pull
supadupacode run --plan plan-xxx.json
```

### Example 4: CI/CD Integration

Add to your `.github/workflows/main.yml`:

```yaml
name: SupaDupaCode Automation

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Dependencies
        run: npm install -g supadupacode
      
      - name: Review PR
        run: supadupacode review --pr ${{ github.event.pull_request.number }}
      
      - name: Run Status Check
        run: supadupacode status
```

### Example 5: NPM Scripts Integration

Add to your `package.json`:

```json
{
  "scripts": {
    "dev": "your-dev-server",
    "test": "your-test-command",
    "supa:init": "supadupacode config init",
    "supa:plan": "supadupacode plan",
    "supa:run": "supadupacode run",
    "supa:status": "supadupacode status",
    "supa:agents": "supadupacode agent list",
    "supa:health": "supadupacode health"
  }
}
```

Usage:
```bash
npm run supa:init
npm run supa:plan "Feature description"
npm run supa:agents
```

## Best Practices

### 1. Version Control

**Commit the configuration:**
```bash
git add .supadupacode.json
git commit -m "Add SupaDupaCode configuration"
```

**Keep plans in version control:**
```bash
git add plan-*.json
git commit -m "Add feature plans"
```

### 2. Team Collaboration

- Share `.supadupacode.json` across your team
- Commit plan files for complex features
- Use consistent branch prefixes
- Document custom agents in your project README

### 3. Project Organization

```
your-project/
├── .supadupacode.json           # Main configuration
├── plans/                       # Store plan files
│   ├── feature-a.json
│   └── feature-b.json
├── docs/
│   └── agents/                  # Custom agent docs
│       └── custom-agent.md
└── package.json
```

### 4. Configuration Management

Use environment-specific configurations:

```bash
# Development
cp .supadupacode.dev.json .supadupacode.json

# Production
cp .supadupacode.prod.json .supadupacode.json
```

### 5. Monitoring and Debugging

```bash
# Regular health checks
supadupacode health

# View logs
supadupacode logs query --severity=error

# Debug specific agents
supadupacode debug trace --agent=developer --duration=60
```

## Troubleshooting

### Configuration Not Found

```bash
# Error: Configuration file not found
# Solution: Initialize configuration
supadupacode config init
```

### Agent Not Listed After Creation

This issue has been fixed! Agents are now persisted to the configuration file. If you still experience issues:

```bash
# Verify agent is in configuration
cat .supadupacode.json | grep customAgents

# List all agents
supadupacode agent list

# Recreate agent if needed
supadupacode agent create myagent --type=assistant --model=gpt-4
```

### Git Branch Issues

```bash
# Ensure you're in a git repository
git init

# Check current branch
git branch

# Verify git configuration
supadupacode config show git
```

### Command Not Found

```bash
# If using npm link
cd path/to/SupaDupa-Coding/cli
npm link

# If using global install
npm install -g supadupacode

# If using local install
npx supadupacode --help
```

### Permission Issues

```bash
# On Unix/Linux
sudo npm install -g supadupacode

# Or install without sudo using a version manager like nvm
nvm use 18
npm install -g supadupacode
```

### Reset Configuration

```bash
# Reset to defaults
supadupacode config reset

# Reinitialize
supadupacode config init
```

## Integration with Popular Frameworks

### React Projects

```json
{
  "agents": {
    "frontend": {
      "enabled": true,
      "mcp_tools": ["filesystem", "git", "build"]
    }
  }
}
```

```bash
npm run supa:plan "Add new React component"
```

### Node.js/Express APIs

```json
{
  "agents": {
    "backend": {
      "enabled": true,
      "mcp_tools": ["filesystem", "git", "db", "test"]
    }
  }
}
```

### Next.js Projects

```json
{
  "agents": {
    "frontend": { "enabled": true },
    "backend": { "enabled": true }
  },
  "orchestration": {
    "defaultMode": "concurrent"
  }
}
```

### Python Projects

```json
{
  "agents": {
    "developer": {
      "enabled": true,
      "mcp_tools": ["filesystem", "git", "test", "lint"]
    }
  }
}
```

## Advanced Integration

### Custom Agents for Domain-Specific Tasks

```bash
# Create a specialized agent for your domain
supadupacode agent create data-pipeline \
  --type=coordinator \
  --model=gpt-4 \
  --memory-size=16384

# Configure it in .supadupacode.json
```

### Workflow Automation

```bash
# Create a workflow
supadupacode workflow create release-prep \
  --description="Prepare for production release" \
  --parallel

# Run the workflow
supadupacode workflow run release-prep
```

### API Integration

```bash
# Register external APIs
supadupacode api register openai --key=sk-xxx
supadupacode api register anthropic --key=sk-ant-xxx

# Verify connectivity
supadupacode auth verify --provider=openai
```

## Getting Help

- **Documentation**: See [README.md](README.md), [USAGE.md](USAGE.md), and [COMMANDS.md](COMMANDS.md)
- **Health Check**: Run `supadupacode health` to diagnose issues
- **Validation**: Run `supadupacode validate` to check configuration
- **Verbose Mode**: Use `-v` or `--verbose` flags for detailed output

## Next Steps

1. Initialize configuration in your project
2. Customize agents for your tech stack
3. Create your first plan
4. Integrate into your development workflow
5. Add to CI/CD pipelines
6. Share configuration with your team

For more information, see the [main documentation](README.md) and [MVP specification](../docs/MVP.md).
