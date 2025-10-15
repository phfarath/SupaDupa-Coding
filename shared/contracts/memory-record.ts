// shared/contracts/memory-record.ts

/**
 * @interface MemoryRecordDTO
 * @description Memory record structure for shared agent memory system.
 */
export interface MemoryRecordDTO {
  /** Unique identifier for the memory record */
  id: string;
  
  /** Searchable key for the memory record */
  key: string;
  
  /** Category for organizing and filtering memories */
  category: 'solutions' | 'decisions' | 'context' | 'history' | 'patterns' | 'preferences' | 'agent-memory';
  
  /** Actual data/content being stored */
  data: any;
  
  /** Rich metadata for search and organization */
  metadata: {
    /** Which agent created this memory */
    agentOrigin: string;
    
    /** Optional embedding vector for semantic search */
    embeddingVector?: number[];
    
    /** Tags for categorization and search */
    tags: string[];
    
    /** When this record was created */
    timestamp: string;
    
    /** When this record was last accessed */
    lastAccessed?: string;
    
    /** How many times this record has been accessed */
    accessCount?: number;
    
    /** Success rate if this represents a solution */
    successRate?: number;
    
    /** Relevance score for search ranking */
    relevanceScore?: number;
    
    /** Size of the data in bytes */
    size?: number;
    
    /** Whether this record is archived */
    archived?: boolean;
    
    /** Optional expiration time */
    expiresAt?: string;
  };
}

/**
 * @interface MemorySearchRequestDTO
 * @description Request structure for searching memory records.
 */
export interface MemorySearchRequestDTO {
  /** Search query string */
  query: string;
  
  /** Category to search within (optional) */
  category?: string;
  
  /** Maximum number of results to return */
  limit?: number;
  
  /** Minimum relevance score threshold */
  minRelevance?: number;
  
  /** Tags to filter by */
  tags?: string[];
  
  /** Agent origin to filter by */
  agentOrigin?: string;
  
  /** Whether to include archived records */
  includeArchived?: boolean;
  
  /** Date range filter */
  dateRange?: {
    from?: string;
    to?: string;
  };
  
  /** Search type */
  searchType?: 'text' | 'semantic' | 'hybrid';
}

/**
 * @interface MemorySearchResultDTO
 * @description Result structure for memory search operations.
 */
export interface MemorySearchResultDTO {
  /** Matching memory records */
  records: MemoryRecordDTO[];
  
  /** Total number of matches (may be more than returned) */
  totalMatches: number;
  
  /** Search execution metrics */
  metrics: {
    searchTime: number;
    recordsScanned: number;
    algorithm: string;
  };
  
  /** Search metadata */
  metadata: {
    query: string;
    category?: string;
    limit: number;
    hasMore: boolean;
    nextOffset?: number;
  };
}

/**
 * @interface CacheKeyDTO
 * @description Cache key structure for solution caching.
 */
export interface CacheKeyDTO {
  /** Problem or task description */
  problem: string;
  
  /** Context factors that affect the solution */
  context: {
    techStack?: string[];
    projectType?: string;
    constraints?: string[];
    preferences?: string[];
  };
  
  /** Agent that generated the solution */
  agentType: string;
  
  /** Version of the solution approach */
  version?: string;
}

/**
 * @interface CachedSolutionDTO
 * @description Cached solution structure.
 */
export interface CachedSolutionDTO {
  /** The cached solution */
  solution: {
    code?: string;
    approach: string;
    steps: string[];
    artifacts: string[];
  };
  
  /** Cache metadata */
  metadata: {
    createdAt: string;
    lastUsed: string;
    usageCount: number;
    successRate: number;
    agentId: string;
    problemHash: string;
    expiresAt?: string;
  };
  
  /** Performance metrics */
  metrics: {
    executionTime?: number;
    quality?: number;
    relevanceScore?: number;
  };
}