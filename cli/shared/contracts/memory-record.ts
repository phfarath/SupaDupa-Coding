/**
 * Memory Record Data Transfer Object
 */

export interface MemoryRecordDTO {
  id: string;
  key: string;
  category: string;
  data: any;
  metadata: {
    agentOrigin: string;
    embeddingVector?: number[];
    tags: string[];
    timestamp: string;
  };
}

export interface MemorySearchResult {
  records: MemoryRecordDTO[];
  totalCount: number;
  relevance?: number;
}

export interface MemoryCacheKey {
  category: string;
  key: string;
}

export interface MemoryQueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}
