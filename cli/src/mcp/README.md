# MCP (Model Context Protocol) Module

## Purpose

The MCP module provides integration with Model Context Protocol servers, enabling agents to perform structured operations (file system access, Git operations, database queries) through a standardized protocol. MCP acts as a secure bridge between AI agents and system tools.

---

## Main Files

- **`mcp-client.ts`**: Main MCP client implementation for tool invocation
- **`servers/git-server.ts`**: Git MCP server integration for version control operations

---

## Key Interfaces

### MCPTool

```typescript
interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  handler: (input: any) => Promise<any>;
}
```

### MCPServerConfig

```typescript
interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
  cwd?: string;
}
```

### MCPToolInvocation

```typescript
interface MCPToolInvocation {
  tool: string;
  input: any;
  permissions?: string[];
}
```

---

## MCP Flow

```
Agent requests tool
   ↓
MCP Client validates permissions
   ↓
MCP Client invokes MCP Server
   ↓
MCP Server executes tool
   ↓
Result returned to agent
```

---

## Usage Examples

### Initializing MCP Client

```typescript
import { MCPClient } from './mcp/mcp-client';

const client = new MCPClient({
  servers: {
    git: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-git'],
      env: {}
    },
    filesystem: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem'],
      env: {}
    }
  }
});

await client.initialize();
```

### Invoking Git Tool

```typescript
// Commit changes
const result = await client.invokeTool({
  tool: 'git_commit',
  input: {
    message: 'feat: Add user authentication',
    files: ['src/auth.ts', 'tests/auth.test.ts']
  },
  permissions: ['git:commit']
});

console.log('Commit SHA:', result.sha);
```

### Creating Branch

```typescript
const branchResult = await client.invokeTool({
  tool: 'git_create_branch',
  input: {
    name: 'feature/auth',
    from: 'main'
  },
  permissions: ['git:branch']
});
```

### File Operations

```typescript
// Read file
const content = await client.invokeTool({
  tool: 'filesystem_read',
  input: {
    path: 'src/config.ts'
  },
  permissions: ['filesystem:read']
});

// Write file
await client.invokeTool({
  tool: 'filesystem_write',
  input: {
    path: 'src/config.ts',
    content: newContent
  },
  permissions: ['filesystem:write']
});
```

---

## Available Tools

### Git Tools (git-server)

**git_status**
- Get repository status
- Input: `{}`
- Output: `{ modified: string[], staged: string[], untracked: string[] }`

**git_commit**
- Commit changes
- Input: `{ message: string, files?: string[] }`
- Output: `{ sha: string }`

**git_create_branch**
- Create new branch
- Input: `{ name: string, from?: string }`
- Output: `{ name: string, sha: string }`

**git_checkout**
- Checkout branch
- Input: `{ branch: string }`
- Output: `{ branch: string }`

**git_diff**
- Get diff for files
- Input: `{ files?: string[] }`
- Output: `{ diff: string }`

**git_log**
- Get commit history
- Input: `{ count?: number }`
- Output: `{ commits: Commit[] }`

### Filesystem Tools (filesystem-server)

**filesystem_read**
- Read file content
- Input: `{ path: string }`
- Output: `{ content: string }`

**filesystem_write**
- Write file content
- Input: `{ path: string, content: string }`
- Output: `{ success: boolean }`

**filesystem_list**
- List directory contents
- Input: `{ path: string }`
- Output: `{ entries: string[] }`

**filesystem_search**
- Search files by pattern
- Input: `{ pattern: string, path?: string }`
- Output: `{ matches: string[] }`

---

## Edge Cases & Gotchas

### Permission Denied
- **Issue**: Agent lacks permission for tool
- **Solution**: MCP client checks permissions before invocation
- **Error**: `PermissionDeniedError` with required permissions
- **Fix**: Add permission to agent's `mcp_tools` config

### Server Not Running
- **Issue**: MCP server process crashes or not started
- **Solution**: Client auto-restarts server on failure
- **Retry**: Exponential backoff for retries
- **Alert**: Log warning after 3 consecutive failures

### Invalid Input Schema
- **Issue**: Tool invocation with invalid input
- **Solution**: Client validates input against tool schema
- **Error**: `ValidationError` with schema diff
- **Fix**: Check tool documentation for correct schema

### Concurrent Tool Access
- **Issue**: Multiple agents invoke conflicting tools
- **Solution**: MCP client serializes conflicting operations
- **Example**: Two agents trying to commit at same time

### Tool Timeout
- **Issue**: Tool execution exceeds timeout
- **Solution**: Client cancels operation and returns error
- **Default**: 30 second timeout per tool
- **Override**: Set `timeout` in tool invocation

### Path Traversal
- **Issue**: Agent tries to access files outside repository
- **Solution**: MCP server validates all paths
- **Block**: Reject paths with `..` or absolute paths outside repo

---

## Testing

### Unit Tests

```bash
# Test MCP client
npm test -- tests/mcp-client.test.ts
```

### Integration Tests

```bash
# Test Git operations
npm run example:git-operations
```

### Test Criteria

- **Initialization**: Client starts MCP servers successfully
- **Tool Invocation**: Tools execute and return expected results
- **Permissions**: Unauthorized tool access is blocked
- **Error Handling**: Invalid inputs handled gracefully
- **Retry Logic**: Failed operations retry with backoff
- **Cleanup**: Servers stopped on client shutdown

### Mock MCP Server

```typescript
// Mock server for testing
class MockMCPServer {
  async handleTool(name: string, input: any): Promise<any> {
    switch (name) {
      case 'git_status':
        return { modified: [], staged: [], untracked: [] };
      default:
        throw new Error('Unknown tool');
    }
  }
}
```

---

## Points of Attention

### Security
- **Permissions**: Always check permissions before tool invocation (TODO: fine-grained checks)
- **Path Validation**: MCP servers must validate all file paths
- **Command Injection**: Sanitize all inputs to prevent shell injection
- **Secret Exposure**: Don't log sensitive tool inputs (API keys, passwords)

### Performance
- **Connection Pooling**: Reuse MCP server connections
- **Parallel Execution**: Support concurrent tool invocations where safe
- **Caching**: Cache tool schemas to avoid repeated requests
- **Lazy Start**: Only start servers when first tool is invoked

### Reliability
- **Server Restart**: Auto-restart crashed servers
- **Timeout**: Set reasonable timeouts for all tools
- **Retries**: Retry transient failures (network, busy resources)
- **Health Checks**: Periodically check server health

### Monitoring
- **Metrics**: Track tool invocation counts and latency
- **Errors**: Log all tool errors with context
- **Usage**: Monitor which tools are used most frequently
- **Quotas**: Track resource usage per agent

---

## MCP Server Configuration

### Git Server

```json
{
  "mcp": {
    "enabled": true,
    "servers": {
      "git": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-git"],
        "env": {
          "GIT_AUTHOR_NAME": "SupaDupa Agent",
          "GIT_AUTHOR_EMAIL": "agent@supadupa.dev"
        },
        "cwd": "/path/to/repo"
      }
    }
  }
}
```

### Filesystem Server

```json
{
  "mcp": {
    "servers": {
      "filesystem": {
        "command": "npx",
        "args": [
          "-y",
          "@modelcontextprotocol/server-filesystem",
          "/allowed/path"
        ],
        "env": {}
      }
    }
  }
}
```

---

## Agent Permission Model

Agents specify which MCP tools they can use:

```json
{
  "agents": {
    "developer": {
      "enabled": true,
      "mcp_tools": ["filesystem", "git"]
    },
    "qa": {
      "enabled": true,
      "mcp_tools": ["filesystem"]
    },
    "docs": {
      "enabled": true,
      "mcp_tools": ["filesystem"]
    }
  }
}
```

**Granular Permissions (TODO):**
```json
{
  "agents": {
    "developer": {
      "mcp_tools": [
        "filesystem:read",
        "filesystem:write",
        "git:commit",
        "git:branch"
      ]
    }
  }
}
```

---

## Adding Custom MCP Servers

1. Create server implementation following MCP spec
2. Add server config to `.supadupacode.json`
3. Document available tools and schemas
4. Add permissions to agent configs
5. Test tool invocations

Example custom server:

```typescript
// custom-db-server.ts
import { MCPServer } from '@modelcontextprotocol/sdk';

const server = new MCPServer({
  name: 'database',
  version: '1.0.0'
});

server.registerTool({
  name: 'db_query',
  description: 'Execute database query',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string' }
    },
    required: ['query']
  },
  handler: async (input) => {
    // Execute query
    return results;
  }
});

server.start();
```

---

## Related Documentation

- **Agents**: `cli/src/agents/README.md`
- **Git Operations**: `cli/src/git/README.md`
- **MCP Specification**: https://modelcontextprotocol.io/
- **Configuration**: `cli/src/core/README.md`
