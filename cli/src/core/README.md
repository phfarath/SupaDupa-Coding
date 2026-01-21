# Core Module

## Purpose

The core module provides foundational services for the entire application including configuration management, session management, and orchestration of multi-agent workflows. It acts as the central coordination point for the system.

---

## Main Files

- **`unified-config-manager.ts`**: Central configuration management with hot-reload support
- **`config-manager.ts`**: Legacy configuration management (deprecated)
- **`session-manager.ts`**: Manages agent sessions and lifecycle
- **`provider-registry.ts`**: Registry for LLM providers (duplicate of api/provider-registry.ts)
- **`config-schema.ts`**: JSON Schema for configuration validation
- **`orchestrator.ts`**: (Partial implementation) Multi-agent workflow orchestration

---

## Key Interfaces

### UnifiedConfig

```typescript
interface UnifiedConfig {
  agents: {
    [agentName: string]: AgentConfig;
  };
  providers: {
    active: string;
    openai?: ProviderConfig;
    anthropic?: ProviderConfig;
    local?: ProviderConfig;
  };
  orchestration: {
    defaultMode: 'sequential' | 'parallel';
    retries: number;
    timeout: number;
  };
  mcp?: {
    enabled: boolean;
    servers: {
      [serverName: string]: MCPServerConfig;
    };
  };
  memory?: {
    dbPath: string;
    cacheSize: number;
  };
}
```

### AgentConfig

```typescript
interface AgentConfig {
  enabled: boolean;
  role: string;
  mcp_tools?: string[];
  config?: Record<string, any>;
}
```

---

## Configuration Flow

```
1. Application starts
   ↓
2. UnifiedConfigManager.initialize()
   - Load .supadupacode.json
   - Merge with defaults
   - Validate schema
   ↓
3. Configuration available to all modules
   - Agents read agent configs
   - API reads provider configs
   - Workflow reads orchestration config
   ↓
4. Hot reload on config changes
   - File watcher detects changes
   - Reload and re-validate
   - Emit CONFIG_UPDATED event
```

---

## Usage Examples

### Loading Configuration

```typescript
import { UnifiedConfigManager } from './core/unified-config-manager';

const configManager = new UnifiedConfigManager();
await configManager.initialize();

const config = configManager.getConfig();
console.log('Active provider:', config.providers.active);
console.log('Agents:', Object.keys(config.agents));
```

### Accessing Agent Config

```typescript
const agentConfig = configManager.getAgentConfig('planner');
if (agentConfig.enabled) {
  console.log('Planner agent enabled with role:', agentConfig.role);
  console.log('MCP tools:', agentConfig.mcp_tools);
}
```

### Updating Configuration

```typescript
// Update provider
await configManager.updateProvider('openai', {
  apiKey: newApiKey,
  model: 'gpt-4-turbo'
});

// Update agent config
await configManager.updateAgentConfig('developer', {
  enabled: true,
  mcp_tools: ['filesystem', 'git', 'search']
});

// Save to disk
await configManager.saveConfig();
```

### Listening to Config Changes

```typescript
configManager.on('config:updated', (section) => {
  console.log('Config section updated:', section);
  // Reload affected components
});

configManager.on('provider:changed', (provider) => {
  console.log('Active provider changed to:', provider);
  // Reinitialize LLM clients
});
```

---

## Edge Cases & Gotchas

### Config File Not Found
- **Issue**: `.supadupacode.json` doesn't exist on first run
- **Solution**: Manager creates default config from `DEFAULT_UNIFIED_CONFIG`
- **Command**: `supadupacode config --init` explicitly creates config

### Invalid Config Schema
- **Issue**: Config file has invalid JSON or schema violations
- **Solution**: Validation throws error with detailed message
- **Recovery**: Falls back to defaults for invalid sections

### Concurrent Config Updates
- **Issue**: Multiple processes try to update config simultaneously
- **Solution**: Use file locking (TODO: not yet implemented)
- **Workaround**: Avoid running multiple instances

### Config Merge Conflicts
- **Issue**: Default config and loaded config have incompatible structures
- **Solution**: Deep merge with lodash.merge, defaults take precedence
- **Check**: Validate after merge

### Environment Variable Override
- **Issue**: Config file values differ from environment variables
- **Resolution**: Environment variables override config file
- **Priority**: CLI args > env vars > config file > defaults

---

## Testing

### Unit Tests

```bash
# Test config manager
npm test -- tests/config-manager.test.ts
```

### Test Criteria

- **Load**: Load config from file successfully
- **Validation**: Reject invalid config with helpful errors
- **Defaults**: Fill in missing values with defaults
- **Update**: Update specific sections without affecting others
- **Save**: Persist changes to disk correctly
- **Events**: Emit events on config changes

### Test Config

```json
{
  "agents": {
    "planner": {
      "enabled": true,
      "role": "planner",
      "mcp_tools": ["filesystem"]
    }
  },
  "providers": {
    "active": "openai",
    "openai": {
      "model": "gpt-4"
    }
  }
}
```

---

## Points of Attention

### Configuration Management
- **Single Source of Truth**: UnifiedConfigManager is the only config source
- **Validation**: Always validate config after loading or updating
- **Defaults**: Provide sensible defaults for all optional fields
- **Documentation**: Keep .env.example in sync with config schema

### Session Management
- **Lifecycle**: Sessions have init → active → cleanup phases
- **Cleanup**: Always call cleanup() to release resources
- **Isolation**: Sessions should not share mutable state
- **Timeout**: Set session timeouts to prevent resource leaks

### Orchestration
- **Coordination**: Orchestrator manages multiple agent lifecycles
- **Error Handling**: One agent failure shouldn't crash entire system
- **Resource Management**: Limit concurrent agents based on available resources
- **State**: Orchestrator state should be persisted for recovery

### Performance
- **Config Caching**: Cache config in memory, don't read file on every access
- **Lazy Loading**: Only load agent configs when agent is instantiated
- **Hot Reload**: Debounce file watcher to avoid excessive reloads

### Security
- **Secrets**: Never log or expose API keys from config
- **Permissions**: Validate file permissions on config file
- **Validation**: Sanitize all config values before use

---

## Configuration Schema

### Example .supadupacode.json

```json
{
  "agents": {
    "planner": {
      "enabled": true,
      "role": "planner",
      "mcp_tools": ["filesystem", "search"],
      "config": {
        "maxSteps": 20,
        "complexity": "adaptive"
      }
    },
    "developer": {
      "enabled": true,
      "role": "developer",
      "mcp_tools": ["filesystem", "git"],
      "config": {
        "autoCommit": false
      }
    },
    "qa": {
      "enabled": true,
      "role": "qa",
      "mcp_tools": ["filesystem"],
      "config": {
        "testFramework": "jest"
      }
    }
  },
  "providers": {
    "active": "openai",
    "openai": {
      "model": "gpt-4",
      "endpoint": "https://api.openai.com/v1",
      "timeout": 60000
    },
    "anthropic": {
      "model": "claude-3-5-sonnet-20241022",
      "endpoint": "https://api.anthropic.com/v1"
    }
  },
  "orchestration": {
    "defaultMode": "sequential",
    "retries": 3,
    "timeout": 300000
  },
  "mcp": {
    "enabled": true,
    "servers": {
      "git": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-git"],
        "env": {}
      }
    }
  },
  "memory": {
    "dbPath": "./data/memory.db",
    "cacheSize": 100
  }
}
```

---

## Environment Variables

### Provider Configuration
```bash
# Override provider settings
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
LOCAL_PROVIDER_ENDPOINT="http://localhost:11434"
```

### System Configuration
```bash
# Repository path
REPOSITORY_PATH="/path/to/repo"

# Environment
NODE_ENV="development|production"

# Logging
LOG_LEVEL="debug|info|warn|error"
```

---

## Orchestration (TODO)

The orchestrator module is partially implemented. Key TODOs:

1. **AI-based task decomposition** (core/orchestrator.ts line 45)
2. **Status tracking** (core/orchestrator.ts line 78)
3. **Agent coordination patterns** (parallel, sequential, adaptive)

See `docs/imp-plan.md` for full orchestrator specification.

---

## Migration from Legacy Config

If migrating from old config format:

1. Use UnifiedConfigManager instead of ConfigManager
2. Update config file structure to new schema
3. Update agent instantiation to use new config format
4. Test thoroughly before deploying

---

## Related Documentation

- **Agents**: `cli/src/agents/README.md`
- **API**: `cli/src/api/README.md`
- **Workflow**: `cli/src/workflow/README.md`
- **Implementation Plan**: `docs/imp-plan.md`
