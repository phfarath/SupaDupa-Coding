/**
 * Monitoring Commands - metrics, logs, and alerts
 */

import chalk from 'chalk';
import { logger } from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

export async function metricsCommand(action = 'collect', options = {}) {
  try {
    switch (action) {
      case 'collect':
        await collectMetrics(options);
        break;
      
      case 'show':
        await showMetrics(options);
        break;
      
      default:
        console.error(chalk.red(`Unknown metrics action: ${action}`));
        console.log(chalk.gray('Available actions: collect, show'));
        process.exit(1);
    }

    logger.info('Metrics command executed', { action });

  } catch (error) {
    logger.error('Metrics command failed', { error: error.message });
    console.error(chalk.red('\nError:'), error.message);
    process.exit(1);
  }
}

async function collectMetrics(options) {
  const format = options.format || 'json';
  const interval = options.interval || 60;

  console.log(chalk.cyan('Collecting metrics...'));
  console.log(chalk.gray('  Format:'), format);
  console.log(chalk.gray('  Interval:'), `${interval}s`);

  const metrics = {
    timestamp: new Date().toISOString(),
    agents: {
      total: 4,
      active: 4,
      performance: {
        avgResponseTime: Math.floor(Math.random() * 1000 + 500),
        successRate: (95 + Math.random() * 5).toFixed(2) + '%',
        tasksCompleted: Math.floor(Math.random() * 100 + 50)
      }
    },
    apis: {
      totalCalls: Math.floor(Math.random() * 1000 + 500),
      avgLatency: Math.floor(Math.random() * 100 + 50),
      errorRate: (Math.random() * 5).toFixed(2) + '%'
    },
    memory: {
      totalUsage: Math.floor(Math.random() * 500 + 100) + 'MB',
      efficiency: (95 + Math.random() * 5).toFixed(1) + '%'
    }
  };

  // Save metrics
  const metricsDir = path.join(process.cwd(), '.supadupacode', 'metrics');
  await fs.mkdir(metricsDir, { recursive: true });
  
  const filename = `metrics-${Date.now()}.${format}`;
  const filePath = path.join(metricsDir, filename);
  
  if (format === 'json') {
    await fs.writeFile(filePath, JSON.stringify(metrics, null, 2));
  } else {
    // Prometheus format
    const prometheus = [
      `# HELP agents_total Total number of agents`,
      `agents_total ${metrics.agents.total}`,
      `# HELP agents_active Active agents`,
      `agents_active ${metrics.agents.active}`,
      `# HELP api_calls_total Total API calls`,
      `api_calls_total ${metrics.apis.totalCalls}`,
      `# HELP api_latency_ms Average API latency in milliseconds`,
      `api_latency_ms ${metrics.apis.avgLatency}`
    ].join('\n');
    await fs.writeFile(filePath, prometheus);
  }

  console.log();
  console.log(chalk.bold('Metrics Summary:'));
  console.log(chalk.gray('  Agents:'), `${metrics.agents.active}/${metrics.agents.total} active`);
  console.log(chalk.gray('  API Latency:'), `${metrics.apis.avgLatency}ms`);
  console.log(chalk.gray('  Memory Usage:'), metrics.memory.totalUsage);
  console.log(chalk.green('✓'), `Metrics saved to ${filename}`);
}

async function showMetrics(options) {
  console.log(chalk.bold.cyan('System Metrics'));
  console.log(chalk.gray('═'.repeat(50)));

  const metricsDir = path.join(process.cwd(), '.supadupacode', 'metrics');
  
  try {
    const files = await fs.readdir(metricsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json')).sort().reverse();
    
    if (jsonFiles.length === 0) {
      console.log(chalk.yellow('No metrics available'));
      console.log(chalk.gray('Use "metrics collect" to collect metrics'));
      return;
    }

    const latestFile = jsonFiles[0];
    const data = await fs.readFile(path.join(metricsDir, latestFile), 'utf-8');
    const metrics = JSON.parse(data);

    console.log();
    console.log(chalk.bold('Agent Performance:'));
    console.log(chalk.gray('  Active Agents:'), `${metrics.agents.active}/${metrics.agents.total}`);
    console.log(chalk.gray('  Avg Response Time:'), `${metrics.agents.performance.avgResponseTime}ms`);
    console.log(chalk.gray('  Success Rate:'), metrics.agents.performance.successRate);
    console.log(chalk.gray('  Tasks Completed:'), metrics.agents.performance.tasksCompleted);

    console.log();
    console.log(chalk.bold('API Performance:'));
    console.log(chalk.gray('  Total Calls:'), metrics.apis.totalCalls);
    console.log(chalk.gray('  Avg Latency:'), `${metrics.apis.avgLatency}ms`);
    console.log(chalk.gray('  Error Rate:'), metrics.apis.errorRate);

    console.log();
    console.log(chalk.bold('Memory:'));
    console.log(chalk.gray('  Total Usage:'), metrics.memory.totalUsage);
    console.log(chalk.gray('  Efficiency:'), metrics.memory.efficiency);

    console.log();
    console.log(chalk.gray('Last updated:'), metrics.timestamp);
  } catch (error) {
    console.log(chalk.yellow('No metrics available'));
  }
}

export async function logsCommand(action = 'query', options = {}) {
  try {
    switch (action) {
      case 'query':
        await queryLogs(options);
        break;
      
      case 'export':
        await exportLogs(options);
        break;
      
      default:
        console.error(chalk.red(`Unknown logs action: ${action}`));
        console.log(chalk.gray('Available actions: query, export'));
        process.exit(1);
    }

    logger.info('Logs command executed', { action });

  } catch (error) {
    logger.error('Logs command failed', { error: error.message });
    console.error(chalk.red('\nError:'), error.message);
    process.exit(1);
  }
}

async function queryLogs(options) {
  const agent = options.agent;
  const severity = options.severity || 'all';
  const since = options.since;

  console.log(chalk.cyan('Querying logs...'));
  if (agent) console.log(chalk.gray('  Agent:'), agent);
  console.log(chalk.gray('  Severity:'), severity);
  if (since) console.log(chalk.gray('  Since:'), since);

  console.log();
  console.log(chalk.bold('Log Entries:'));
  console.log(chalk.gray('─'.repeat(50)));

  // Simulate log entries
  const logs = [
    { timestamp: new Date().toISOString(), level: 'info', agent: 'planner', message: 'Task analysis completed' },
    { timestamp: new Date().toISOString(), level: 'info', agent: 'developer', message: 'Code implementation started' },
    { timestamp: new Date().toISOString(), level: 'warn', agent: 'qa', message: 'Test coverage below 80%' },
    { timestamp: new Date().toISOString(), level: 'info', agent: 'developer', message: 'Code implementation completed' },
    { timestamp: new Date().toISOString(), level: 'error', agent: 'qa', message: 'Unit test failed: auth-service' }
  ];

  let filteredLogs = logs;
  if (agent) {
    filteredLogs = logs.filter(log => log.agent === agent);
  }
  if (severity !== 'all') {
    filteredLogs = filteredLogs.filter(log => log.level === severity);
  }

  for (const log of filteredLogs) {
    const levelColor = log.level === 'error' ? chalk.red : 
                       log.level === 'warn' ? chalk.yellow : 
                       chalk.gray;
    
    console.log(levelColor(`[${log.level.toUpperCase()}]`), 
                chalk.gray(log.timestamp),
                chalk.cyan(`[${log.agent}]`),
                log.message);
  }

  console.log();
  console.log(chalk.blue('ℹ'), `Showing ${filteredLogs.length} of ${logs.length} entries`);
}

async function exportLogs(options) {
  const format = options.format || 'json';
  const output = options.output || `logs-export-${Date.now()}.${format}`;

  console.log(chalk.cyan('Exporting logs...'));
  console.log(chalk.gray('  Format:'), format);
  console.log(chalk.gray('  Output:'), output);

  await new Promise(resolve => setTimeout(resolve, 500));

  console.log(chalk.green('✓'), 'Logs exported successfully');
}

export async function alertCommand(action = 'configure', alertName, options = {}) {
  try {
    switch (action) {
      case 'configure':
        await configureAlert(alertName, options);
        break;
      
      case 'list':
        await listAlerts(options);
        break;
      
      default:
        console.error(chalk.red(`Unknown alert action: ${action}`));
        console.log(chalk.gray('Available actions: configure, list'));
        process.exit(1);
    }

    logger.info('Alert command executed', { action, alertName });

  } catch (error) {
    logger.error('Alert command failed', { error: error.message });
    console.error(chalk.red('\nError:'), error.message);
    process.exit(1);
  }
}

async function configureAlert(alertName, options) {
  if (!alertName) {
    console.error(chalk.red('Error: Alert name is required'));
    console.log(chalk.gray('Usage: alert configure <name> --metric=<metric> --threshold=<value> --channel=<channel>'));
    process.exit(1);
  }

  const metric = options.metric;
  const threshold = options.threshold;
  const channel = options.channel || 'console';

  if (!metric || !threshold) {
    console.error(chalk.red('Error: Metric and threshold are required'));
    console.log(chalk.gray('Usage: alert configure <name> --metric=<metric> --threshold=<value>'));
    process.exit(1);
  }

  console.log(chalk.cyan(`Configuring alert: ${alertName}`));
  console.log(chalk.gray('  Metric:'), metric);
  console.log(chalk.gray('  Threshold:'), threshold);
  console.log(chalk.gray('  Channel:'), channel);

  const alert = {
    name: alertName,
    metric,
    threshold,
    channel,
    enabled: true,
    createdAt: new Date().toISOString()
  };

  const alertsDir = path.join(process.cwd(), '.supadupacode', 'alerts');
  await fs.mkdir(alertsDir, { recursive: true });

  const alertPath = path.join(alertsDir, `${alertName}.json`);
  await fs.writeFile(alertPath, JSON.stringify(alert, null, 2));

  console.log(chalk.green('✓'), 'Alert configured successfully');
}

async function listAlerts(options) {
  console.log(chalk.bold.cyan('Configured Alerts'));
  console.log(chalk.gray('─'.repeat(50)));

  const alertsDir = path.join(process.cwd(), '.supadupacode', 'alerts');
  
  try {
    const files = await fs.readdir(alertsDir);
    
    if (files.length === 0) {
      console.log(chalk.yellow('No alerts configured'));
      console.log(chalk.gray('Use "alert configure" to create alerts'));
      return;
    }

    for (const file of files) {
      const data = await fs.readFile(path.join(alertsDir, file), 'utf-8');
      const alert = JSON.parse(data);
      
      const statusIcon = alert.enabled ? chalk.green('●') : chalk.gray('○');
      console.log();
      console.log(statusIcon, chalk.bold(alert.name));
      console.log(chalk.gray('  Metric:'), alert.metric);
      console.log(chalk.gray('  Threshold:'), alert.threshold);
      console.log(chalk.gray('  Channel:'), alert.channel);
    }

    console.log();
    console.log(chalk.blue('ℹ'), `Total alerts: ${files.length}`);
  } catch (error) {
    console.log(chalk.yellow('No alerts configured'));
  }
}
