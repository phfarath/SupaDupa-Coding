// Schema for solution-related memory records
export interface SolutionSchema {
  id: string;
  problem: string;
  solution: string;
  code?: string;
  tags: string[];
  successRate: number;
  usageCount: number;
  metadata: {
    agentOrigin: string;
    createdAt: string;
    lastUsed: string;
  };
}