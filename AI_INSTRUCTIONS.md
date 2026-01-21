# AI_INSTRUCTIONS.md

**Rules for AI Agents Modifying SupaDupa-Coding**

This document defines operational rules and guidelines for AI agents (including GitHub Copilot, Cursor, and other code assistants) when making changes to this repository.

---

## 🎯 Overview

SupaDupa-Coding is a multi-agent orchestration system built with TypeScript, Node.js, and SQLite. When modifying this codebase:

1. **Understand the context**: This is an agent coordination system. Changes affect agent behavior.
2. **Preserve contracts**: Shared interfaces in `shared/contracts/` are sacred.
3. **Test locally**: Always run `npm run build && npm test` before committing.
4. **Follow conventions**: Use `sd*` prefix for classes, maintain TypeScript strictness.

---

## 🔧 How to Add New Components

### Adding a New Agent

**Steps:**
1. Create file in `cli/src/agents/<agent-name>-agent.ts`
2. Extend `BaseAgent` from `cli/src/agents/base-agent.ts`
3. Implement required methods:
   ```typescript
   class MyAgent extends BaseAgent {
     async execute(input: AgentInput): Promise<AgentOutput> {
       // Agent logic here
     }
   }
   ```
4. Register in `cli/src/agents/index.ts`:
   ```typescript
   export { MyAgent } from './my-agent';
   ```
5. Update agent config schema in `shared/contracts/agent-config.ts`
6. Add system prompt in `cli/prompts/<agent-name>/system.md`
7. Update `.supadupacode.json` example config
8. Add tests in `cli/tests/agent.test.ts`

**Required Checklist:**
- [ ] Extends BaseAgent
- [ ] Has `execute()` method
- [ ] Emits events for key operations
- [ ] Logs using `utils/logger.ts`
- [ ] Handles errors gracefully
- [ ] Has unit tests
- [ ] Documented in agent README

### Adding a New CLI Command

**Steps:**
1. Create file in `cli/src/commands/<command-name>.ts`
2. Export function matching signature:
   ```typescript
   export async function myCommand(options: CommandOptions): Promise<void> {
     // Command logic
   }
   ```
3. Register in `cli/src/index.ts`:
   ```typescript
   program
     .command('mycommand')
     .description('Description')
     .option('-f, --flag', 'Flag description')
     .action(myCommand);
   ```
4. Add validation for required options
5. Add tests in `cli/tests/`
6. Update `cli/COMMANDS.md` documentation

**Required Checklist:**
- [ ] Validates all inputs
- [ ] Provides user feedback (ora/chalk)
- [ ] Handles errors with helpful messages
- [ ] Has --help text
- [ ] Documented in COMMANDS.md
- [ ] Integration test added

### Adding a New LLM Provider

**Steps:**
1. Create file in `cli/src/api/providers/<provider-name>-provider.ts`
2. Implement `BaseProvider` interface:
   ```typescript
   export class MyProvider extends BaseProvider {
     async complete(prompt: string, options?: CompletionOptions): Promise<CompletionResponse> {
       // Provider-specific API call
     }
   }
   ```
3. Register in `cli/src/api/provider-registry.ts`:
   ```typescript
   this.registerProvider('myprovider', new MyProvider(config));
   ```
4. Add environment variables to `.env.example`:
   ```bash
   MY_PROVIDER_API_KEY="key"
   MY_PROVIDER_ENDPOINT="https://api.example.com"
   MY_PROVIDER_MODEL="model-name"
   ```
5. Update provider config in `shared/unified-config.ts`
6. Add tests in `cli/tests/provider-registry.test.ts`

**Required Checklist:**
- [ ] Implements complete() method
- [ ] Handles rate limits
- [ ] Supports streaming (if applicable)
- [ ] Has timeout handling
- [ ] Documented in README
- [ ] Integration test with mock API

### Adding a New MCP Tool/Server

**Steps:**
1. Create file in `cli/src/mcp/servers/<tool-name>-server.ts`
2. Define tool schema following MCP spec:
   ```typescript
   export const MyToolSchema = {
     name: 'my_tool',
     description: 'Tool description',
     inputSchema: {
       type: 'object',
       properties: { /* ... */ }
     }
   };
   ```
3. Implement tool handler in MCP client (`cli/src/mcp/mcp-client.ts`)
4. Add permission checks (which agents can use this tool)
5. Update agent configs to include new tool in `mcp_tools` array
6. Add tests for tool invocation

**Required Checklist:**
- [ ] Schema follows MCP specification
- [ ] Input validation implemented
- [ ] Permission model defined
- [ ] Error handling for tool failures
- [ ] Integration test with agent

### Adding a New Workflow Type

**Steps:**
1. Define workflow schema in `shared/contracts/workflow-schema.ts`
2. Create workflow runner in `cli/src/workflow/runners/<workflow-name>-runner.ts`
3. Implement checkpoint logic for state persistence
4. Add to workflow registry in `cli/src/workflow/workflow-runner.ts`
5. Create example workflow in `cli/examples/<workflow-name>-example.ts`
6. Add workflow tests

**Required Checklist:**
- [ ] Has checkpoint/restore logic
- [ ] Handles task dependencies
- [ ] Emits progress events
- [ ] Has error recovery
- [ ] Documented in workflow README

---

## 📏 Mandatory Standards

### TypeScript Standards
- ✅ **Strict mode**: All code must compile with `strict: true`
- ✅ **Explicit types**: No `any` types (use `unknown` if needed)
- ✅ **Interfaces**: Use interfaces for contracts, not type aliases
- ✅ **Exports**: Use named exports, not default exports
- ✅ **Async**: Always use async/await, not raw Promises

### Async Patterns
- ✅ Use `async/await` for all asynchronous operations
- ✅ Wrap in `try/catch` with specific error handling
- ✅ Use `Promise.all` for parallel operations (when safe)
- ✅ Always set timeouts for external API calls
- ✅ Implement retry logic via `utils/retry.ts` for flaky operations

### Logging Standards
- ✅ Import from `utils/logger.ts`
- ✅ Log levels: `error`, `warn`, `info`, `debug`
- ✅ Always include context: agent name, operation, timestamp
- ✅ Use structured logging (JSON) for machine-readable logs
- ✅ Never log sensitive data (API keys, tokens, PII)

### Validation Standards
- ✅ Validate all user inputs (CLI args, API requests)
- ✅ Use AJV for JSON Schema validation
- ✅ Use TypeScript guards for runtime type checking
- ✅ Sanitize inputs to prevent injection attacks
- ✅ Return meaningful error messages

### Security Standards
- ✅ Never hardcode API keys or secrets
- ✅ Use `.env` files (gitignored) for local secrets
- ✅ Use environment variables for production
- ✅ Encrypt sensitive data in memory system (use `security/encryption.ts`)
- ✅ Validate all file paths to prevent directory traversal
- ✅ Implement rate limiting for public APIs

### Transaction/Idempotency
- ✅ Memory operations: Use transactions where needed
- ✅ Workflow steps: Design for idempotency (can be retried safely)
- ✅ Git operations: Check state before modifying
- ✅ File operations: Use atomic writes (write to temp, then rename)

---

## ✅ Pull Request Checklist

Before submitting a PR, ensure:

### Code Quality
- [ ] `npm run build` succeeds
- [ ] `npm test` passes
- [ ] `npm run lint:check` passes (or run `npm run lint` to auto-fix)
- [ ] `npm run type-check` succeeds
- [ ] No console.log statements (use logger)
- [ ] No TODOs without GitHub issues

### Testing
- [ ] Unit tests added for new functions
- [ ] Integration test if adding new feature
- [ ] Edge cases covered
- [ ] Error paths tested
- [ ] Tests are deterministic (no flaky tests)

### Documentation
- [ ] Updated relevant README files
- [ ] Added JSDoc comments for public APIs
- [ ] Updated ARCHITECTURE.md if architectural change
- [ ] Updated AI_INSTRUCTIONS.md if new patterns
- [ ] Updated COMMANDS.md if new CLI command

### Database Changes
- [ ] Created migration file in `cli/src/memory/migrations/`
- [ ] Migration is reversible (has down migration)
- [ ] Updated schema documentation
- [ ] Tested migration on fresh database

### Environment Variables
- [ ] Added to `.env.example` with placeholder values
- [ ] Documented in README
- [ ] Has sensible defaults (if applicable)
- [ ] Validated in config loader

### Versioning
- [ ] Updated package.json version (if releasing)
- [ ] Added CHANGELOG entry (if exists)
- [ ] Tagged Git commit (for releases)

---

## 🚫 Never Do This

### Anti-Patterns to Avoid

**❌ Don't Modify Shared Contracts Without Coordination**
- Files in `shared/contracts/` are used by multiple agents
- Changes break existing agents
- **Instead**: Add new optional fields; deprecate old fields gradually

**❌ Don't Use Synchronous File Operations**
- `fs.readFileSync`, `fs.writeFileSync` block the event loop
- **Instead**: Use async versions from `fs/promises`

**❌ Don't Swallow Errors Silently**
- `catch (err) { /* nothing */ }` hides bugs
- **Instead**: Log error and re-throw or handle gracefully

**❌ Don't Query Memory Without Permissions**
- Cross-agent memory access requires permission checks
- **Instead**: Use `memory/index.ts` API with permission validation

**❌ Don't Hardcode File Paths**
- Absolute paths break on different machines
- **Instead**: Use `path.join()` and config-based paths

**❌ Don't Create Agents Without Memory Integration**
- Agents need shared context to coordinate
- **Instead**: Always integrate with memory system

**❌ Don't Skip Input Validation**
- Unvalidated inputs lead to crashes and security issues
- **Instead**: Validate at API boundaries (CLI, REST API)

**❌ Don't Use `process.exit()` in Library Code**
- Kills entire process, can't be caught
- **Instead**: Throw errors and let caller decide

**❌ Don't Mix Promise and Callback Styles**
- Inconsistent error handling and confusing code
- **Instead**: Use async/await everywhere

**❌ Don't Store State in Agent Instances**
- Agents may be instantiated multiple times
- **Instead**: Use memory system or workflow state

---

## 🗺️ Main Flow Navigation

### HTTP Request → Plan Execution → Git PR

**Entry: API Request**
1. `cli/src/api-server.ts` → Express app starts
2. `cli/src/api/server.ts` → Routes defined
3. `cli/src/api/routes/plan.ts` → POST `/plan` endpoint
4. Validation middleware checks request schema
5. Rate limiter checks quotas

**Planner Agent**
6. `cli/src/api/routes/plan.ts` → calls `createPlan()`
7. `cli/src/agents/planner/plan-orchestrator.ts` → `createExecutionPlan()`
8. LLM call via provider registry (`cli/src/api/provider-registry.ts`)
9. Plan stored in `cli/planner/output/plan_v1.json`
10. Event `SD_EVENT_PLAN_CREATED` emitted

**Orchestrator**
11. `cli/src/core/orchestrator.ts` → picks up plan
12. `cli/src/workflow/workflow-runner.ts` → executes plan steps
13. Task queue resolves dependencies (`cli/src/workflow/utils/task-queue.ts`)

**Agent Execution**
14. Developer Agent (`cli/src/agents/developer-agent.ts`) → implements code
15. MCP Client (`cli/src/mcp/mcp-client.ts`) → invokes Git tools
16. Git operations (`cli/src/git/commit-manager.ts`, `branch-manager.ts`)

**Memory & Checkpoints**
17. Agent stores decisions in memory (`cli/src/memory/index.ts`)
18. Workflow saves checkpoint (`cli/src/workflow/checkpoint-manager.ts`)

**QA & Docs**
19. QA Agent runs tests (`cli/src/agents/qa-agent.ts`)
20. Docs Agent updates docs (`cli/src/agents/docs-agent.ts`)

**Output: Pull Request**
21. MCP Git Server creates PR (if configured)
22. Workflow complete event emitted

### CLI Command → Agent Execution

**Entry: CLI**
1. `cli/src/index.ts` → Commander parses command
2. `cli/src/commands/<command>.ts` → Command handler
3. Config loaded (`cli/src/core/unified-config-manager.ts`)

**Agent Invocation**
4. Agent instantiated from registry
5. Memory context loaded (`cli/src/memory/index.ts`)
6. Agent executes task
7. Results stored in memory
8. Progress displayed via `cli/src/ui/progress-ui.ts`

---

## ⚙️ Configuration & Environment

### Configuration Files
- **`.supadupacode.json`**: Main config (agents, providers, MCP servers)
- **`.env`**: Local secrets (API keys, tokens) - **gitignored**
- **`.env.example`**: Template for environment variables
- **`cli/config/`**: Default configurations

### Key Environment Variables
```bash
# LLM Provider
LLM_PROVIDER="openai|anthropic|local"
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."

# API Server
API_PORT="3000"
API_HOST="0.0.0.0"

# Repository
REPOSITORY_PATH="/path/to/codebase"

# Environment
NODE_ENV="development|production"
```

### Config Loading Order
1. Default config in code (`shared/unified-config.ts`)
2. `.supadupacode.json` in project root
3. Environment variables (override config file)
4. CLI flags (override everything)

### Secrets Management
- ✅ Use `.env` for local development
- ✅ Use secret manager (AWS Secrets, Vault) for production
- ✅ Never commit `.env` file (in `.gitignore`)
- ✅ Reference `.env.example` for required variables
- ❌ Never hardcode secrets in code
- ❌ Never log secrets (even in debug mode)

---

## 🧪 Testing Requirements

### Before Every Commit
```bash
# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build

# Test
npm test
```

### Minimum Test Coverage
- **Core agents**: 80%+ coverage
- **API endpoints**: 90%+ coverage (including error paths)
- **Memory system**: 85%+ coverage
- **Workflow engine**: 75%+ coverage
- **Utilities**: 70%+ coverage

### Test Categorization
- **Unit tests**: Test individual functions/classes in isolation
- **Integration tests**: Test interactions between components
- **End-to-end tests**: Test full workflows (CLI → agents → Git)

### Testing Best Practices
- ✅ Tests must be deterministic (no flaky tests)
- ✅ Use in-memory SQLite for memory tests
- ✅ Mock external APIs (OpenAI, Anthropic)
- ✅ Clean up test artifacts (temp files, databases)
- ✅ Test both success and error paths
- ✅ Use descriptive test names: `should <expected behavior> when <condition>`

---

## 🔄 Common Workflows

### Adding a New Feature
1. Create feature branch: `git checkout -b feature/my-feature`
2. Add tests first (TDD approach)
3. Implement feature
4. Run full test suite: `npm test`
5. Lint and type check: `npm run lint && npm run type-check`
6. Update documentation
7. Commit with descriptive message
8. Push and create PR

### Fixing a Bug
1. Reproduce bug with a failing test
2. Fix the bug
3. Verify test now passes
4. Check for similar bugs in related code
5. Add regression test if needed
6. Update changelog/issue tracker

### Refactoring
1. Ensure full test coverage of area being refactored
2. Refactor in small, incremental steps
3. Run tests after each change
4. No behavior changes (tests still pass)
5. Update documentation if APIs changed

### Adding a Database Migration
1. Create file: `cli/src/memory/migrations/00X-description.sql`
2. Write up migration (CREATE, ALTER, etc.)
3. Write down migration (DROP, revert changes)
4. Test on fresh database: `npm run db:init`
5. Test on existing database (upgrade path)
6. Document schema changes in README

---

## 📊 Observability

### Logging
- Use structured logging (JSON format)
- Include correlation IDs for request tracing
- Log at appropriate levels (error, warn, info, debug)
- Never log sensitive data

### Metrics
- Track agent execution time
- Track LLM API call latency
- Track memory usage per agent
- Track workflow completion rates

### Events
- Emit events for key operations (plan created, task completed)
- Use `shared/events/event-emitter.ts`
- Document event contracts in code

### Error Tracking
- Log all errors with stack traces
- Include context (agent, operation, inputs)
- Use error codes for categorization
- Track error rates per component

---

## 🚀 Deployment

### Local Development
```bash
cd cli
npm install
npm run build
npm link  # Makes 'supadupacode' available globally
supadupacode --help
```

### Production Build
```bash
npm run build
npm run start:api:prod  # For API server
# Or package as Docker container
```

### Environment Setup
1. Copy `.env.example` to `.env`
2. Fill in API keys and configuration
3. Initialize database: `npm run db:init`
4. Test configuration: `supadupacode status`

---

## 📚 Additional Resources

- **Implementation Plan**: `docs/imp-plan.md`
- **CLI Guide**: `cli/GUIDE.md`
- **Memory System**: `cli/src/memory/README.md`
- **Agent Documentation**: `cli/src/agents/README.md` (to be created)
- **API Documentation**: `cli/src/api/README.md` (to be created)

---

**Last Updated**: 2026-01-21  
**Maintainer**: Auto-generated via standardized documentation process  
**Review**: Update when adding new patterns or anti-patterns
