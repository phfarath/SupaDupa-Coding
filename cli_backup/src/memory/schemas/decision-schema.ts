// Schema for decision-related memory records
export interface DecisionSchema {
  id: string;
  context: string;
  decision: string;
  rationale: string;
  metadata: {
    agentOrigin: string;
    timestamp: string;
    taskRef?: string;
  };
}