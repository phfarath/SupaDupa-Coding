/**
 * Utility functions for memory operations
 */

/**
 * Generate a simple hash for a given input string
 * @param input The input string to hash
 * @returns A string representation of the hash
 */
export function generateHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString();
}

/**
 * Calculate relevance score between a query and a memory record
 * @param query The search query
 * @param record The memory record to evaluate
 * @returns A relevance score between 0 and 1
 */
export function calculateRelevance(query: string, record: any): number {
  const queryLower = query.toLowerCase();
  const recordText = JSON.stringify(record).toLowerCase();
  
  // Count occurrences of query terms in the record
  const queryTerms = queryLower.split(/\s+/).filter(term => term.length > 0);
  let score = 0;
  
  for (const term of queryTerms) {
    if (recordText.includes(term)) {
      score += 1;
    }
  }
  
  // Normalize by query length and add other factors
  const termMatchScore = score / queryTerms.length;
  const successRateFactor = record.data?.successRate || 0;
  
  return (termMatchScore + successRateFactor) / 2;
}

/**
 * Sanitize data before storing in memory
 * @param data The data to sanitize
 * @returns Sanitized data
 */
export function sanitizeMemoryData(data: any): any {
  // Remove potentially sensitive information
  const sanitized = { ...data };
  
  // Remove any fields that might contain sensitive data
  if (sanitized.metadata && sanitized.metadata.credentials) {
    delete sanitized.metadata.credentials;
  }
  
  return sanitized;
}