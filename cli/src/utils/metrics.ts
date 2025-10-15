/**
 * Metrics - track and report performance metrics
 */

export interface TaskMetric {
  taskId: string;
  agent: string;
  type: string;
  status: string;
  duration: number;
  timestamp: string;
}

export interface ExecutionMetric {
  planId: string;
  status: string;
  taskCount: number;
  duration: number | null;
  timestamp: string;
}

export interface CommitMetric {
  sha: string;
  agent: string;
  timestamp: string;
}

export interface PRMetric {
  number: number;
  status: string;
  checks: any[];
  timestamp: string;
}

export interface MetricsData {
  tasks: TaskMetric[];
  executions: ExecutionMetric[];
  commits: CommitMetric[];
  prs: PRMetric[];
}

export interface SummaryStats {
  totalTasks: number;
  successfulTasks: number;
  failedTasks: number;
  avgTaskDuration: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgExecutionDuration: number;
  totalCommits: number;
  totalPRs: number;
}

export interface LeadTimeMetrics {
  min: number;
  max: number;
  avg: number;
  count: number;
}

export interface AgentMetrics {
  [agent: string]: {
    total: number;
    success: number;
    failed: number;
    totalDuration: number;
    avgDuration?: number;
    successRate?: number;
  };
}

export class MetricsCollector {
  private metrics: MetricsData;

  constructor() {
    this.metrics = {
      tasks: [],
      executions: [],
      commits: [],
      prs: []
    };
  }

  /**
   * Record task metrics
   */
  recordTask(task: any, result: any): void {
    this.metrics.tasks.push({
      taskId: task.id,
      agent: task.agent,
      type: task.type,
      status: result.status,
      duration: result.duration,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Record execution metrics
   */
  recordExecution(execution: any): void {
    const duration = execution.completedAt 
      ? new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime()
      : null;

    this.metrics.executions.push({
      planId: execution.planId,
      status: execution.status,
      taskCount: execution.results?.length || 0,
      duration,
      timestamp: execution.startedAt
    });
  }

  /**
   * Record commit metrics
   */
  recordCommit(commit: any): void {
    this.metrics.commits.push({
      sha: commit.sha,
      agent: commit.agent,
      timestamp: commit.createdAt
    });
  }

  /**
   * Record PR metrics
   */
  recordPR(pr: any): void {
    this.metrics.prs.push({
      number: pr.number,
      status: pr.status,
      checks: pr.checks,
      timestamp: pr.createdAt
    });
  }

  /**
   * Get summary statistics
   */
  getSummary(): SummaryStats {
    const tasks = this.metrics.tasks;
    const executions = this.metrics.executions;

    return {
      totalTasks: tasks.length,
      successfulTasks: tasks.filter(t => t.status === 'success').length,
      failedTasks: tasks.filter(t => t.status === 'failed').length,
      avgTaskDuration: this.average(tasks.map(t => t.duration)),
      
      totalExecutions: executions.length,
      successfulExecutions: executions.filter(e => e.status === 'completed').length,
      failedExecutions: executions.filter(e => e.status === 'failed').length,
      avgExecutionDuration: this.average(executions.map(e => e.duration).filter((d): d is number => d !== null)),

      totalCommits: this.metrics.commits.length,
      totalPRs: this.metrics.prs.length
    };
  }

  /**
   * Calculate average
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  }

  /**
   * Get lead time metrics
   */
  getLeadTimeMetrics(): LeadTimeMetrics {
    const executions = this.metrics.executions.filter(e => e.duration !== null);
    
    if (executions.length === 0) {
      return { min: 0, max: 0, avg: 0, count: 0 };
    }

    const durations = executions.map(e => e.duration as number);
    
    return {
      min: Math.min(...durations),
      max: Math.max(...durations),
      avg: this.average(durations),
      count: durations.length
    };
  }

  /**
   * Get agent performance metrics
   */
  getAgentMetrics(): AgentMetrics {
    const tasks = this.metrics.tasks;
    const agents: AgentMetrics = {};

    for (const task of tasks) {
      if (!agents[task.agent]) {
        agents[task.agent] = {
          total: 0,
          success: 0,
          failed: 0,
          totalDuration: 0
        };
      }

      agents[task.agent].total++;
      if (task.status === 'success') agents[task.agent].success++;
      if (task.status === 'failed') agents[task.agent].failed++;
      agents[task.agent].totalDuration += task.duration || 0;
    }

    // Calculate averages and success rates
    for (const agent in agents) {
      agents[agent].avgDuration = agents[agent].totalDuration / agents[agent].total;
      agents[agent].successRate = agents[agent].success / agents[agent].total;
    }

    return agents;
  }

  /**
   * Export metrics
   */
  export(): any {
    return {
      summary: this.getSummary(),
      leadTime: this.getLeadTimeMetrics(),
      agents: this.getAgentMetrics(),
      raw: this.metrics
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = {
      tasks: [],
      executions: [],
      commits: [],
      prs: []
    };
  }
}

// Export singleton instance
export const metrics = new MetricsCollector();