# SupaDupaCode CLI Guide

SupaDupaCode is an AI-powered CLI orchestrator for multi-agent software development. It helps you plan, implement, and verify features using specialized AI agents (Planner, Developer, QA, Docs).

## Quick Start

### 1. Installation

Assuming you are in the project root:

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

### 2. Setup

Configure your API keys (OpenAI, Anthropic, or Local/Ollama):

```bash
# Launches interactive setup wizard
npm start
```
Or manually via command:
```bash
npm start -- provider add openai --key sk-YOUR_KEY
```

### 3. Usage

#### Interactive Mode (Recommended)
Simply run the CLI without arguments to enter the interactive menu:

```bash
npm start
```
From here you can:
- **Chat**: Talk to the Brain Agent to brainstorm or execute tasks.
- **Plan**: Create a structured plan for a new feature.
- **Manage**: Configure providers and agents.

#### Command Line Mode

**Create a Plan:**
Describing your feature will trigger the Planner agent to create a detailed execution plan.
```bash
npm start -- plan "Create a user login system with JWT"
# Output: plan-123.json
```

**Execute a Plan:**
Run the agents to implement the plan.
```bash
npm start -- run --plan plan-123.json
```

**Chat directly:**
```bash
npm start -- chat
```

## Configuration

Configuration is stored in `.supadupacode.json` in your current directory.

```json
{
  "providers": {
    "openai": { "active": true, "model": "gpt-4o" }
  },
  "agents": {
    "planner": { "provider": "openai" },
    "developer": { "provider": "openai" }
  }
}
```

## Architecture

- **Brain Agent**: The central orchestrator that understands your intent.
- **Planner**: Decomposes requests into actionable steps.
- **Developer**: Writes code and file changes.
- **QA**: Runs tests and verifies quality.
- **Docs**: Updates documentation.

## Troubleshooting

- **API Issues**: Run `npm start -- provider list` to check your configuration.
- **Logs**: Check output for error messages.
