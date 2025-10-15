# Memory & Cache Module

The Memory & Cache module provides shared memory functionality for the SupaDupaCode CLI. It implements a SQLite-based storage system with caching for efficient access to previous solutions, decisions, and project context.

## Components

### sdMemoryRepository
- Main repository class for managing memory records in SQLite database
- Implements `putMemoryRecord` and `fetchSimilarRecords` methods as specified
- Uses table `memory_records` with columns `record_id`, `agent_origin`, `embedding_vector`

### sdCache
- In-memory cache for frequently accessed records
- Implements TTL-based expiration
- LRU eviction policy when max size is reached

### MemoryClient
- Singleton client that combines repository and cache functionality
- Provides unified interface for memory operations

### CacheClient
- Shared cache endpoint for reusing previous solutions
- Implements `getCachedSolution(cacheKey: CacheKey)` method as specified

## Schema

The module uses the following database schema:
- `memory_records` table with indexes on key, category, and agent_origin
- Migrations system to ensure schema is up-to-date

## Usage

```typescript
import { memoryClient } from './src/memory';

// Initialize the memory system
await memoryClient.initialize();

// Store a memory record
await memoryClient.putMemoryRecord({
  id: 'record-123',
  key: 'user-authentication',
  category: 'solutions',
  data: { /* solution data */ },
  metadata: {
    agentOrigin: 'planner-agent',
    tags: ['auth', 'security'],
    timestamp: new Date().toISOString()
  }
});

// Fetch similar records
const similarRecords = await memoryClient.fetchSimilarRecords('authentication');
```

## Configuration

The module can be configured using environment variables:
- `MEMORY_DB_PATH` - Path to SQLite database file (default: './data/memory.db')
- `MEMORY_CACHE_SIZE` - Maximum number of items in cache (default: 1000)