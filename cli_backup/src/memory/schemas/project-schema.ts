// Schema for project-related memory records
export interface ProjectSchema {
  id: string;
  name: string;
  type: string; // 'javascript', 'typescript', 'python', etc.
  dependencies: string[];
  config: Record<string, any>;
  metadata: {
    created: string;
    lastModified: string;
    workspacePath: string;
  };
}