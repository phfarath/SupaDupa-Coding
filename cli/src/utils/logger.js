/**
 * Logger - structured logging for CLI operations
 */

import chalk from 'chalk';

export class Logger {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.level = options.level || 'info';
    this.logs = [];
  }

  /**
   * Log info message
   */
  info(message, data = {}) {
    this.log('info', message, data);
    console.log(chalk.blue('ℹ'), message);
  }

  /**
   * Log success message
   */
  success(message, data = {}) {
    this.log('success', message, data);
    console.log(chalk.green('✓'), message);
  }

  /**
   * Log warning message
   */
  warn(message, data = {}) {
    this.log('warn', message, data);
    console.log(chalk.yellow('⚠'), message);
  }

  /**
   * Log error message
   */
  error(message, data = {}) {
    this.log('error', message, data);
    console.error(chalk.red('✖'), message);
  }

  /**
   * Log debug message (only if verbose)
   */
  debug(message, data = {}) {
    if (this.verbose) {
      this.log('debug', message, data);
      console.log(chalk.gray('⚙'), message);
    }
  }

  /**
   * Internal log method
   */
  log(level, message, data) {
    const entry = {
      level,
      message,
      data,
      timestamp: new Date().toISOString()
    };
    
    this.logs.push(entry);
  }

  /**
   * Get log history
   */
  getHistory(filter = {}) {
    let logs = [...this.logs];

    if (filter.level) {
      logs = logs.filter(log => log.level === filter.level);
    }

    if (filter.since) {
      logs = logs.filter(log => new Date(log.timestamp) >= new Date(filter.since));
    }

    return logs;
  }

  /**
   * Clear log history
   */
  clear() {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   */
  export() {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Export singleton instance
export const logger = new Logger();
