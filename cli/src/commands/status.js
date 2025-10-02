/**
 * Status Command - check status of feature development
 */

import chalk from 'chalk';
import { Orchestrator } from '../core/orchestrator.js';
import { ConfigManager } from '../core/config-manager.js';
import { BranchManager } from '../git/branch-manager.js';
import { metrics } from '../utils/metrics.js';
import { logger } from '../utils/logger.js';

export async function statusCommand(options) {
  try {
    // Load configuration
    const configManager = new ConfigManager();
    const config = await configManager.load();

    const orchestrator = new Orchestrator(config.orchestration);
    const branchManager = new BranchManager(config.git);

    console.log(chalk.bold.cyan('Development Status'));
    console.log(chalk.gray('═'.repeat(50)));

    if (options.all) {
      // Show all features
      console.log(chalk.bold('\nActive Features:'));
      console.log(chalk.gray('─'.repeat(50)));
      
      const branches = branchManager.listBranches('agent/');
      
      if (branches.length === 0) {
        console.log(chalk.gray('  No active features'));
      } else {
        for (const branch of branches) {
          console.log(chalk.yellow('●'), branch);
        }
      }

    } else if (options.feature) {
      // Show specific feature status
      console.log(chalk.bold(`\nFeature: ${options.feature}`));
      console.log(chalk.gray('─'.repeat(50)));

      const status = orchestrator.getStatus(options.feature);
      
      console.log(chalk.bold('Status:'), status.status);
      console.log(chalk.bold('Tasks:'), status.tasks.length);
      
      if (status.tasks.length > 0) {
        console.log('\n' + chalk.bold('Task Details:'));
        for (const task of status.tasks) {
          const statusIcon = task.status === 'completed' ? '✓' : '○';
          const statusColor = task.status === 'completed' ? chalk.green : chalk.gray;
          console.log(statusColor(`  ${statusIcon} ${task.name}`));
        }
      }

    } else {
      // Show general status
      const currentBranch = branchManager.getCurrentBranch();
      const branchStatus = branchManager.getBranchStatus();
      
      console.log(chalk.bold('\nCurrent Context:'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(chalk.bold('Branch:'), currentBranch);
      console.log(chalk.bold('Status:'), 
        branchStatus.clean ? chalk.green('Clean') : chalk.yellow('Modified')
      );
      console.log(chalk.bold('Uncommitted Files:'), branchStatus.files);
      console.log(chalk.bold('Commits Ahead:'), branchStatus.ahead);
      
      // Show metrics summary
      const summary = metrics.getSummary();
      
      console.log('\n' + chalk.bold('Metrics Summary:'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(chalk.bold('Total Tasks:'), summary.totalTasks);
      console.log(chalk.bold('Successful:'), chalk.green(summary.successfulTasks));
      console.log(chalk.bold('Failed:'), summary.failedTasks > 0 ? chalk.red(summary.failedTasks) : summary.failedTasks);
      console.log(chalk.bold('Avg Task Duration:'), `${summary.avgTaskDuration.toFixed(0)}ms`);
      
      console.log('\n' + chalk.bold('Executions:'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(chalk.bold('Total:'), summary.totalExecutions);
      console.log(chalk.bold('Successful:'), chalk.green(summary.successfulExecutions));
      console.log(chalk.bold('Failed:'), summary.failedExecutions > 0 ? chalk.red(summary.failedExecutions) : summary.failedExecutions);
      
      if (summary.totalCommits > 0) {
        console.log('\n' + chalk.bold('Git Activity:'));
        console.log(chalk.gray('─'.repeat(50)));
        console.log(chalk.bold('Commits:'), summary.totalCommits);
        console.log(chalk.bold('PRs:'), summary.totalPRs);
      }
    }

    // Watch mode
    if (options.watch) {
      console.log('\n' + chalk.blue('ℹ'), 'Watch mode not yet implemented');
      console.log(chalk.gray('  Press Ctrl+C to exit'));
    }

    logger.info('Status checked', { feature: options.feature, all: options.all });

  } catch (error) {
    logger.error('Status check failed', { error: error.message });
    console.error(chalk.red('\nError:'), error.message);
    process.exit(1);
  }
}
