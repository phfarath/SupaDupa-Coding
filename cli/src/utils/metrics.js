/**
 * Metrics - track and report performance metrics
 */

export class MetricsCollector {
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
  recordTask(task, result) {
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
  recordExecution(execution) {
    const duration = execution.completedAt 
      ? new Date(execution.completedAt) - new Date(execution.startedAt)
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
  recordCommit(commit) {
    this.metrics.commits.push({
      sha: commit.sha,
      agent: commit.agent,
      timestamp: commit.createdAt
    });
  }

  /**
   * Record PR metrics
   */
  recordPR(pr) {
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
  getSummary() {
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
      avgExecutionDuration: this.average(executions.map(e => e.duration).filter(d => d)),

      totalCommits: this.metrics.commits.length,
      totalPRs: this.metrics.prs.length
    };
  }

  /**
   * Calculate average
   */
  average(values) {
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  }

  /**
   * Get lead time metrics
   */
  getLeadTimeMetrics() {
    const executions = this.metrics.executions.filter(e => e.duration);
    
    if (executions.length === 0) {
      return { min: 0, max: 0, avg: 0, count: 0 };
    }

    const durations = executions.map(e => e.duration);
    
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
  getAgentMetrics() {
    const tasks = this.metrics.tasks;
    const agents = {};

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
  export() {
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
  clear() {
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
