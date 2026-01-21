# Commands Module

## Purpose

The commands module implements all CLI commands for user interaction. Each command file defines a specific user-facing operation (plan, run, review, status, etc.) and handles input validation, progress display, and error reporting.

---

## Main Files

- **`plan.ts`**: Generate execution plans from requirements
- **`run.ts`**: Execute workflow based on plan
- **`status.ts`**: Display workflow and agent status
- **`review.ts`**: Review and approve pull requests (TODO: GitHub integration)
- **`fix.ts`**: Detect and fix code issues (TODO: implementation)
- **`config.ts`**: Manage configuration settings
- **`agent.ts`**: Manage and inspect agents
- **`memory.ts`**: Query and manage memory system
- **`api.ts`**: API server management and authentication
- **`workflow.ts`**: Workflow inspection and control
- **`provider.ts`**: LLM provider management
- **`chat.ts`**: Interactive chat with agents
- **`setup.ts`**: Initial project setup wizard
- **`sd.ts`**: Shortcut commands (alias for common operations)

---

## Key Interfaces

### CommandOptions

```typescript
interface CommandOptions {
  feature?: string;
  plan?: string;
  mode?: string;
  verbose?: boolean;
  output?: string;
  all?: boolean;
  watch?: boolean;
  pr?: string;
  autoApprove?: boolean;
}
```

### CommandResult

```typescript
interface CommandResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: Error;
}
```

---

## Command Flow

```
User runs CLI command
   ↓
Commander parses arguments
   ↓
Command handler invoked
   ↓
Validate inputs
   ↓
Load configuration
   ↓
Execute command logic
   ↓
Display progress (ora/chalk)
   ↓
Return result
   ↓
Exit with status code
```

---

## Usage Examples

### Plan Command

```bash
# Generate a plan
supadupacode plan "Add user authentication"

# With context
supadupacode plan "Add JWT auth" --context '{"techStack":["Node.js","TypeScript"]}'

# Output to file
supadupacode plan "Feature X" --output ./my-plan.json
```

### Run Command

```bash
# Run a plan
supadupacode run --plan plan-123

# Run specific feature
supadupacode run --feature auth

# Run in parallel mode
supadupacode run --plan plan-123 --mode parallel
```

### Status Command

```bash
# Show overall status
supadupacode status

# Show specific workflow
supadupacode status --workflow workflow-456

# Watch mode (auto-refresh)
supadupacode status --watch
```

### Config Command

```bash
# Show config
supadupacode config --show

# Set provider
supadupacode config --set provider=openai

# Initialize config
supadupacode config --init
```

### Memory Command

```bash
# Query memory
supadupacode memory --query "auth decisions"

# Show stats
supadupacode memory --stats

# Clear cache
supadupacode memory --clear-cache
```

---

## Edge Cases & Gotchas

### Missing Configuration
- **Issue**: Command fails if `.supadupacode.json` missing
- **Solution**: `config --init` creates default config
- **Auto-fix**: Some commands create config automatically

### Invalid Arguments
- **Issue**: User provides incorrect command options
- **Solution**: Commander shows usage help
- **Validation**: Each command validates inputs before execution

### Long-Running Operations
- **Issue**: Commands may take minutes to complete
- **Solution**: Progress indicators (ora spinners) keep user informed
- **Interruption**: Ctrl+C should gracefully cancel operation

### Permission Errors
- **Issue**: Insufficient permissions for file operations
- **Solution**: Commands check permissions before execution
- **Error**: Clear error message with suggested fix

### API Key Missing
- **Issue**: Provider requires API key but not configured
- **Solution**: Command prompts user to set key
- **Fallback**: Some commands can use local provider

---

## Testing

### Manual Testing

```bash
# Test each command
npm run build
supadupacode plan "test feature"
supadupacode status
supadupacode config --show
```

### Integration Tests

```bash
# Run command integration tests
npm test -- tests/commands.test.ts
```

### Test Criteria

- **Help Text**: `supadupacode <command> --help` shows usage
- **Validation**: Invalid inputs rejected with helpful errors
- **Progress**: Long operations show progress indicators
- **Output**: Results formatted correctly (JSON, table, etc.)
- **Exit Codes**: 0 for success, non-zero for errors

---

## Points of Attention

### User Experience
- **Feedback**: Always show progress for operations >1s
- **Errors**: Provide actionable error messages
- **Defaults**: Sensible defaults for optional arguments
- **Confirmation**: Prompt before destructive operations

### Input Validation
- **Required Args**: Check all required arguments present
- **Type Checking**: Validate argument types (number, string, etc.)
- **Range Validation**: Check numeric values in valid range
- **Format Validation**: Validate file paths, URLs, etc.

### Error Handling
- **Graceful Degradation**: Continue on non-critical errors
- **Rollback**: Undo changes on critical errors
- **Logging**: Log errors for debugging
- **User Notification**: Show user-friendly error messages

### Configuration
- **Load Early**: Load config at command start
- **Override**: CLI flags override config file
- **Validation**: Validate config before use
- **Defaults**: Provide defaults for missing values

### Output Formatting
- **JSON**: Use `--output json` for machine-readable output
- **Table**: Use tables for structured data
- **Colors**: Use chalk for color-coded output
- **Quiet Mode**: Support `--quiet` flag for automation

---

## Command Reference

### plan
Generate execution plan from requirements

**Usage:** `supadupacode plan <request> [options]`

**Options:**
- `--context <json>`: Additional context
- `--output <file>`: Save plan to file
- `--verbose`: Show detailed planning process

### run
Execute workflow from plan

**Usage:** `supadupacode run --plan <id> [options]`

**Options:**
- `--plan <id>`: Plan ID to execute
- `--feature <name>`: Feature name (alternative to plan ID)
- `--mode <mode>`: Execution mode (sequential|parallel)
- `--auto-commit`: Auto-commit changes

### status
Show workflow and system status

**Usage:** `supadupacode status [options]`

**Options:**
- `--workflow <id>`: Show specific workflow
- `--all`: Show all workflows
- `--watch`: Auto-refresh every 5s

### review
Review pull request

**Usage:** `supadupacode review --pr <number> [options]`

**Options:**
- `--pr <number>`: PR number to review
- `--auto-approve`: Auto-approve if checks pass

### fix
Detect and fix code issues

**Usage:** `supadupacode fix [options]`

**Options:**
- `--check <type>`: Type of check (lint|security|quality)
- `--auto-commit`: Auto-commit fixes

### config
Manage configuration

**Usage:** `supadupacode config [options]`

**Options:**
- `--show`: Display current config
- `--set <key=value>`: Set config value
- `--init`: Initialize new config

### memory
Query and manage memory

**Usage:** `supadupacode memory [options]`

**Options:**
- `--query <text>`: Search memory
- `--stats`: Show memory statistics
- `--clear-cache`: Clear memory cache

### api
Manage API server

**Usage:** `supadupacode api <command>`

**Commands:**
- `start`: Start API server
- `stop`: Stop API server
- `status`: Show API server status

### provider
Manage LLM providers

**Usage:** `supadupacode provider <command>`

**Commands:**
- `list`: List available providers
- `add <name>`: Add new provider
- `set-active <name>`: Set active provider

---

## Adding New Commands

See `AI_INSTRUCTIONS.md` section "Adding a New CLI Command" for detailed steps.

---

## Related Documentation

- **CLI Guide**: `cli/GUIDE.md`
- **Commands Reference**: `cli/COMMANDS.md`
- **Configuration**: `cli/src/core/README.md`
