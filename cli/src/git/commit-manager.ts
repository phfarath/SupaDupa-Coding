/**
 * Commit Manager - handles Git commit operations
 */

import { execSync } from 'child_process';

interface CommitOptions {
  autoStage?: boolean;
}

interface CommitInfo {
  message: string;
  agent: string;
  scope: string;
  sha: string | null;
  createdAt: string;
}

interface CommitHistoryItem {
  sha: string;
  message: string;
}

interface PushResult {
  branch: string;
  pushed: boolean;
  timestamp: string;
}

interface AmendResult {
  sha: string | null;
  amended: boolean;
}

export class CommitManager {
  config: any;
  messageFormat: string;

  constructor(config: any = {}) {
    this.config = config;
    this.messageFormat = config.commitMessageFormat || '[{agent}] {scope}: {description}';
  }

  /**
   * Create a commit with standardized message
   */
  async commit(agent: string, scope: string, description: string, options: CommitOptions = {}): Promise<CommitInfo> {
    const message = this.formatMessage(agent, scope, description);
    
    try {
      // Stage all changes if auto-stage is enabled
      if (options.autoStage !== false) {
        execSync('git add .', { stdio: 'pipe' });
      }

      // Create commit
      execSync(`git commit -m "${message}"`, { stdio: 'pipe' });
      
      return {
        message,
        agent,
        scope,
        sha: this.getLastCommitSha(),
        createdAt: new Date().toISOString()
      };
    } catch (error: any) {
      throw new Error(`Failed to create commit: ${error.message}`);
    }
  }

  /**
   * Format commit message according to template
   */
  formatMessage(agent: string, scope: string, description: string): string {
    return this.messageFormat
      .replace('{agent}', agent)
      .replace('{scope}', scope)
      .replace('{description}', description);
  }

  /**
   * Get last commit SHA
   */
  getLastCommitSha(): string | null {
    try {
      return execSync('git rev-parse HEAD', { 
        encoding: 'utf-8' 
      }).trim();
    } catch (error) {
      return null;
    }
  }

  /**
   * Get commit history
   */
  getHistory(limit: number = 10): CommitHistoryItem[] {
    try {
      const log = execSync(`git log --oneline -${limit}`, { 
        encoding: 'utf-8' 
      });
      
      return log.split('\n')
        .filter(line => line)
        .map(line => {
          const [sha, ...messageParts] = line.split(' ');
          return {
            sha,
            message: messageParts.join(' ')
          };
        });
    } catch (error: any) {
      throw new Error(`Failed to get commit history: ${error.message}`);
    }
  }

  /**
   * Check if there are uncommitted changes
   */
  hasUncommittedChanges(): boolean {
    try {
      const status = execSync('git status --porcelain', { 
        encoding: 'utf-8' 
      });
      return status.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get diff of uncommitted changes
   */
  getDiff(): string {
    try {
      return execSync('git diff', { 
        encoding: 'utf-8' 
      });
    } catch (error: any) {
      throw new Error(`Failed to get diff: ${error.message}`);
    }
  }

  /**
   * Amend last commit
   */
  async amendCommit(message: string | null = null): Promise<AmendResult> {
    try {
      const cmd = message 
        ? `git commit --amend -m "${message}"`
        : 'git commit --amend --no-edit';
      
      execSync(cmd, { stdio: 'pipe' });
      
      return {
        sha: this.getLastCommitSha(),
        amended: true
      };
    } catch (error: any) {
      throw new Error(`Failed to amend commit: ${error.message}`);
    }
  }

  /**
   * Push commits to remote
   */
  async push(branch: string | null = null, force: boolean = false): Promise<PushResult> {
    try {
      const currentBranch = branch || execSync('git rev-parse --abbrev-ref HEAD', {
        encoding: 'utf-8'
      }).trim();
      
      const forceFlag = force ? '--force' : '';
      execSync(`git push origin ${currentBranch} ${forceFlag}`.trim(), { stdio: 'pipe' });
      
      return {
        branch: currentBranch,
        pushed: true,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      throw new Error(`Failed to push commits: ${error.message}`);
    }
  }
}