/**
 * Logger - structured logging for CLI operations
 */

import chalk from 'chalk';

export interface LoggerOptions {
  verbose?: boolean;
  level?: string;
}

export interface LogEntry {
  level: string;
  message: string;
  data: Record<string, any>;
  timestamp: string;
}

export interface LogFilter {
  level?: string;
  since?: string;
}

export class Logger {
  private verbose: boolean;
  private level: string;
  private logs: LogEntry[];

  constructor(options: LoggerOptions = {}) {
    this.verbose = options.verbose || false;
    this.level = options.level || 'info';
    this.logs = [];
  }

  /**
   * Log info message
   */
  info(message: string, data: Record<string, any> = {}): void {
    this.log('info', message, data);
    console.log(chalk.blue('ℹ'), message);
  }

  /**
   * Log success message
   */
  success(message: string, data: Record<string, any> = {}): void {
    this.log('success', message, data);
    console.log(chalk.green('✓'), message);
  }

  /**
   * Log warning message
   */
  warn(message: string, data: Record<string, any> = {}): void {
    this.log('warn', message, data);
    console.log(chalk.yellow('⚠'), message);
  }

  /**
   * Log error message
   */
  error(message: string, data: Record<string, any> = {}): void {
    this.log('error', message, data);
    console.error(chalk.red('✖'), message);
  }

  /**
   * Log debug message (only if verbose)
   */
  debug(message: string, data: Record<string, any> = {}): void {
    if (this.verbose) {
      this.log('debug', message, data);
      console.log(chalk.gray('⚙'), message);
    }
  }

  /**
   * Internal log method
   */
  private log(level: string, message: string, data: Record<string, any>): void {
    const entry: LogEntry = {
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
  getHistory(filter: LogFilter = {}): LogEntry[] {
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
  clear(): void {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   */
  export(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Export singleton instance
export const logger = new Logger();