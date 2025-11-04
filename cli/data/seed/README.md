# Seed Data for SupaDupaCode CLI

This directory contains initial seed data for populating the SupaDupaCode CLI databases and demonstrating functionality.

## Directory Structure

```
data/seed/
├── memory/
│   └── init_records.json          # Initial memory records (solutions & patterns)
├── workflows/
│   └── default_workflows.json     # Pre-configured workflow templates
├── agents/
│   └── example_agent_configs.json # Sample agent configurations
└── README.md                      # This file
```

## Contents Overview

### 📚 Memory Records (`memory/init_records.json`)

Contains **8 initial memory records** covering:

- **Solutions** (5 records):
  - JWT Authentication implementation
  - REST API with Express.js
  - Error handling patterns
  - CLI application design
  - Git automation

- **Patterns** (3 records):
  - Database migration management
  - Testing pyramid strategy
  - Multi-agent architecture

Each record includes:
- Problem description
- Solution approach
- Implementation details (technologies, files, dependencies)
- Test coverage metrics
- Agent origin and tags

### 🔄 Workflows (`workflows/default_workflows.json`)

Contains **4 workflow templates**:

1. **Standard Feature Development** (~68 min)
   - Complete workflow: Plan → Implement → Commit → Test → Report
   - Best for: New features with full QA cycle

2. **Rapid Bugfix Workflow** (~32 min)
   - Fast-track: Analyze → Fix → Test → Commit
   - Best for: Critical bugs requiring quick resolution

3. **Safe Refactoring Workflow** (~79 min)
   - Comprehensive: Plan → Baseline → Refactor → Validate → Commit
   - Best for: Major code restructuring with safety checks

4. **Documentation Generation** (~29 min)
   - Documentation: Analyze → Generate → Validate → Commit
   - Best for: Automated documentation updates

### 🤖 Agent Configs (`agents/example_agent_configs.json`)

Contains **6 agent configurations**:

- **Planner** (OpenAI GPT-4 Turbo)
- **Coder** (Anthropic Claude 3 Opus)
- **QA** (OpenAI GPT-4)
- **Docs** (OpenAI GPT-4 Turbo)
- **Brain** (Anthropic Claude 3 Sonnet)
- **Local Assistant** (Qwen Coder 32B - local model)

## Loading Seed Data

### Automatic Seeding

Run the seed script to populate the memory database:

```bash
# From cli/ directory
npm run seed

# Or directly with ts-node
ts-node scripts/seed-database.ts
```

### Manual Loading

For workflows and agent configs, you can reference them in commands:

```bash
# Use a workflow template
supadupacode workflow run --template=data/seed/workflows/default_workflows.json --workflow=wf_001_feature_standard

# Load agent config
supadupacode agent create --config=data/seed/agents/example_agent_configs.json --agent=agent_planner_001
```

## Seed Data Statistics

### Memory Records
- **Total**: 8 records
- **Categories**: Solutions (5), Patterns (3)
- **Agents**: Coder (5), Planner (2), QA (1)
- **Avg Success Rate**: 93%

### Workflows
- **Total**: 4 workflows
- **Avg Duration**: 52 minutes
- **Categories**: Feature Dev, Bugfix, Refactoring, Documentation

### Agent Configs
- **Total**: 6 agents
- **Providers**: OpenAI (3), Anthropic (2), Local (1)
- **Types**: Planner, Coder (2), QA, Docs, Brain

## Environment Variables Required

To use the seed agent configurations, set these environment variables:

```bash
# OpenAI (for Planner, QA, Docs agents)
export OPENAI_API_KEY="sk-..."

# Anthropic (for Coder, Brain agents)
export ANTHROPIC_API_KEY="sk-ant-..."

# Optional: For local models
export LOCAL_MODEL_PATH="/path/to/qwen-coder-32b"
```

## Customization

### Adding New Memory Records

Edit `memory/init_records.json` and add new entries following the schema:

```json
{
  "id": "mem_XXX_identifier",
  "key": "searchable-key",
  "category": "solutions" | "patterns",
  "data": {
    "problem": "Description",
    "solution": "Approach",
    "implementation": { ... }
  },
  "metadata": {
    "agentOrigin": "agent-name",
    "tags": ["tag1", "tag2"],
    "timestamp": "ISO-8601-date"
  }
}
```

### Creating Custom Workflows

Add new workflows to `workflows/default_workflows.json`:

```json
{
  "id": "wf_custom_XXX",
  "name": "My Custom Workflow",
  "steps": [ ... ],
  "config": {
    "parallelExecution": false,
    "errorStrategy": "halt"
  }
}
```

### Defining New Agents

Add agent configs to `agents/example_agent_configs.json`:

```json
{
  "id": "agent_custom_XXX",
  "name": "my-agent",
  "type": "coder" | "planner" | "qa" | "docs" | "brain",
  "capabilities": ["cap1", "cap2"],
  "api": { ... },
  "settings": { ... }
}
```

## Verification

After seeding, verify the data:

```bash
# Check memory records
supadupacode memory list

# List available workflows
ls -la data/seed/workflows/

# View agent configs
cat data/seed/agents/example_agent_configs.json | jq '.agents[].name'
```

## Troubleshooting

### Seeding Fails

1. **Database locked**: Ensure no other process is using the database
2. **Invalid JSON**: Validate JSON files with `jq` or online validators
3. **Schema mismatch**: Check that records match the expected schema

### Missing Dependencies

```bash
# Install required packages
npm install

# Check TypeScript compilation
npm run build
```

### Permission Issues

```bash
# Ensure data directory is writable
chmod -R 755 data/
```

## Next Steps

After loading seed data:

1. **Test Memory Search**: `supadupacode memory search "authentication"`
2. **Generate a Plan**: `supadupacode plan "Add user login"`
3. **Run a Workflow**: `supadupacode workflow run --template=wf_001_feature_standard`
4. **View Statistics**: `supadupacode status --all`

## Contributing

To add more seed data:

1. Follow the existing patterns and schemas
2. Ensure data is realistic and useful
3. Update statistics in JSON files
4. Test loading before committing

---

**Version**: 1.0.0  
**Last Updated**: 2024-01-30  
**Maintained By**: SupaDupaCode Team
