# SupaDupaCode CLI - Quick Start Guide

Get up and running with the SupaDupaCode CLI in under 5 minutes!

## 🚀 Installation

```bash
# Clone the repository
git clone <repository-url>
cd supadupacode/cli

# Install dependencies
npm install

# Build the project
npm run build
```

## 📦 Initialize Database with Seed Data

```bash
# Create database and load seed data
npm run seed
```

This loads:
- **8 memory records** (solutions & patterns)
- **4 workflow templates**
- **6 agent configurations**

## 🎯 Quick Examples

### 1. Run End-to-End Workflow Example

```bash
npm run example:e2e
```

This demonstrates:
- Creating execution plans with different constraints
- Queue operations
- Event emission
- Plan generation with quality/speed preferences

**Expected Output**:
```
🚀 SupaDupaCode CLI - End-to-End Workflow Example
============================================================

✅ Planner Orchestrator initialized
📄 System Prompt Preview:
You are **sdPlanner**, the core planning agent...

📋 Example 1: Simple Feature Request
   Input: { request: "Add user authentication..." }
   
🎉 Plan Created Event Received!
   Plan ID: plan_xxx
   Steps: 4
   Estimated Duration: 285 min
   ...
```

### 2. Test Planner Integration

```bash
npm run example:planner
```

### 3. Simple Planner Test

```bash
npm run example:simple
```

## 💡 Basic Usage

### Creating a Plan

```typescript
import { sdPlannerOrchestrator } from './src/agents/planner/plan-orchestrator';
import { PlannerInputDTO } from './shared/contracts/plan-schema';

const orchestrator = new sdPlannerOrchestrator();

const input: PlannerInputDTO = {
  request: 'Implement user authentication',
  preferences: {
    prioritizeQuality: true
  },
  constraints: {
    maxDuration: 120
  }
};

const plan = orchestrator.createExecutionPlan(input);
console.log(`Generated ${plan.steps.length} steps`);
```

### Working with Memory

```typescript
import { sdMemoryRepository } from './src/memory/memory-repository';

const repo = new sdMemoryRepository();
await repo.initialize();

// Store a solution
await repo.putMemoryRecord({
  id: 'mem_custom_001',
  key: 'my-solution',
  category: 'solutions',
  data: { problem: '...', solution: '...' },
  metadata: {
    agentOrigin: 'coder',
    tags: ['custom'],
    timestamp: new Date().toISOString()
  }
});

// Search for similar records
const results = await repo.fetchSimilarRecords('authentication', 'solutions', 5);
console.log(`Found ${results.length} similar solutions`);
```

### Using Queue

```typescript
import { plannerExecutionQueue } from './src/agents/planner/queue';

// Check queue status
console.log(`Queue size: ${plannerExecutionQueue.size()}`);
console.log(`Is empty: ${plannerExecutionQueue.isEmpty()}`);

// Get next plan
const nextPlan = plannerExecutionQueue.peek();

// Dequeue for execution
const plan = plannerExecutionQueue.dequeue();
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file (use `.env.example` as template):

```bash
# OpenAI (for Planner, QA, Docs agents)
OPENAI_API_KEY=sk-...

# Anthropic (for Coder, Brain agents)
ANTHROPIC_API_KEY=sk-ant-...

# Optional: Local models
LOCAL_MODEL_PATH=/path/to/models
```

### Agent Configuration

Edit `config/.supadupacode.json` or load from seed:

```bash
# View example configs
cat data/seed/agents/example_agent_configs.json
```

## 📚 Exploring Seed Data

### Memory Records

```bash
# View all seed records
cat data/seed/memory/init_records.json | jq '.records[] | {id, key, category}'

# Example records include:
# - JWT Authentication
# - REST API patterns
# - Error handling
# - Testing strategies
```

### Workflows

```bash
# View workflow templates
cat data/seed/workflows/default_workflows.json | jq '.workflows[] | {id, name, estimatedTotalDuration}'

# Available workflows:
# - Standard Feature Development (68 min)
# - Rapid Bugfix (32 min)
# - Safe Refactoring (79 min)
# - Documentation Generation (29 min)
```

## 🧪 Running Tests

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Run all tests (when available)
npm test
```

## 📖 Documentation

- `README.md` - Project overview
- `IMPLEMENTATION_STATUS.md` - Current implementation status
- `COMMANDS.md` - CLI commands reference
- `USAGE.md` - Detailed usage guide
- `data/seed/README.md` - Seed data documentation
- `docs/imp-plan.md` - Complete implementation plan

## 🎯 Next Steps

1. **Explore Examples**
   ```bash
   npm run example:e2e
   ```

2. **Review Generated Plans**
   ```bash
   ls -la planner/output/
   cat planner/output/plan_v1_example.json | jq
   ```

3. **Search Memory**
   ```bash
   # After seeding, search for patterns
   # (CLI commands coming soon)
   ```

4. **Create Custom Workflow**
   - Copy a template from `data/seed/workflows/`
   - Modify steps to fit your needs
   - Save and execute

## 🆘 Troubleshooting

### Database Issues

```bash
# Remove and recreate database
rm -f data/memory.db
npm run seed
```

### Build Errors

```bash
# Clean and rebuild
npm run clean
npm run build
```

### Permission Issues

```bash
# Fix permissions
chmod -R 755 data/
chmod +x scripts/seed-database.ts
```

## 📊 Verify Installation

```bash
# Check all examples work
npm run example:e2e
npm run example:planner
npm run example:simple

# All should complete without errors ✅
```

## 🎉 You're Ready!

Start building with SupaDupaCode CLI:

```typescript
// Your first plan
const orchestrator = new sdPlannerOrchestrator();
const plan = orchestrator.createExecutionPlan({
  request: 'Build my awesome feature',
  preferences: { prioritizeSpeed: true }
});

console.log(`Ready to execute ${plan.steps.length} steps!`);
```

---

## 🔗 Quick Links

- **Full Status**: `IMPLEMENTATION_STATUS.md`
- **API Reference**: Coming soon
- **Community**: Coming soon
- **Issues**: GitHub Issues

---

**Version**: 1.0.0  
**Last Updated**: 2024-01-30

🚀 Happy Coding with SupaDupaCode!
