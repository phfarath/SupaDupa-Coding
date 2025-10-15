/**
 * Branch Manager - handles Git branch operations
 */

import { execSync } from 'child_process';

interface BranchInfo {
  name: string;
  base: string;
  agent: string;
  task: string;
  createdAt: string;
}

interface BranchStatus {
  branch: string;
  clean: boolean;
  ahead: number;
  files: number;
  error?: string;
}

interface MergeResult {
  source: string;
  target: string;
  mergedAt: string;
}

export class BranchManager {
  config: any;
  branchPrefix: string;

  constructor(config: any = {}) {
    this.config = config;
    this.branchPrefix = config.branchPrefix || 'agent';
  }

  /**
   * Create a branch for an agent/task
   */
  async createBranch(agent: string, task: string, baseBranch: string = 'main'): Promise<BranchInfo> {
    const branchName = this.generateBranchName(agent, task);
    
    try {
      // Ensure we're on the base branch
      execSync(`git checkout ${baseBranch}`, { stdio: 'pipe' });
      
      // Pull latest changes
      execSync(`git pull origin ${baseBranch}`, { stdio: 'pipe' });
      
      // Create and checkout new branch
      execSync(`git checkout -b ${branchName}`, { stdio: 'pipe' });
      
      return {
        name: branchName,
        base: baseBranch,
        agent,
        task,
        createdAt: new Date().toISOString()
      };
    } catch (error: any) {
      throw new Error(`Failed to create branch: ${error.message}`);
    }
  }

  /**
   * Generate standardized branch name
   */
  generateBranchName(agent: string, task: string): string {
    const slug = task.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    return `${this.branchPrefix}/${agent}/${slug}`;
  }

  /**
   * Switch to a branch
   */
  async switchBranch(branchName: string): Promise<boolean> {
    try {
      execSync(`git checkout ${branchName}`, { stdio: 'pipe' });
      return true;
    } catch (error: any) {
      throw new Error(`Failed to switch branch: ${error.message}`);
    }
  }

  /**
   * Get current branch
   */
  getCurrentBranch(): string {
    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', { 
        encoding: 'utf-8' 
      }).trim();
      return branch;
    } catch (error: any) {
      throw new Error(`Failed to get current branch: ${error.message}`);
    }
  }

  /**
   * List branches by pattern
   */
  listBranches(pattern: string | null = null): string[] {
    try {
      let branches = execSync('git branch -a', { 
        encoding: 'utf-8' 
      }).split('\n')
        .map(b => b.trim().replace(/^\*\s+/, ''))
        .filter(b => b);

      if (pattern) {
        branches = branches.filter(b => b.includes(pattern));
      }

      return branches;
    } catch (error: any) {
      throw new Error(`Failed to list branches: ${error.message}`);
    }
  }

  /**
   * Delete a branch
   */
  async deleteBranch(branchName: string, force: boolean = false): Promise<boolean> {
    try {
      const flag = force ? '-D' : '-d';
      execSync(`git branch ${flag} ${branchName}`, { stdio: 'pipe' });
      return true;
    } catch (error: any) {
      throw new Error(`Failed to delete branch: ${error.message}`);
    }
  }

  /**
   * Merge branches
   */
  async mergeBranches(sourceBranch: string, targetBranch: string): Promise<MergeResult> {
    try {
      // Switch to target branch
      await this.switchBranch(targetBranch);
      
      // Merge source branch
      execSync(`git merge ${sourceBranch} --no-ff`, { stdio: 'pipe' });
      
      return {
        source: sourceBranch,
        target: targetBranch,
        mergedAt: new Date().toISOString()
      };
    } catch (error: any) {
      throw new Error(`Failed to merge branches: ${error.message}`);
    }
  }

  /**
   * Check if branch exists
   */
  branchExists(branchName: string): boolean {
    try {
      execSync(`git rev-parse --verify ${branchName}`, { stdio: 'pipe' });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get branch status
   */
  getBranchStatus(branchName: string | null = null): BranchStatus {
    try {
      const branch = branchName || this.getCurrentBranch();
      const status = execSync('git status --porcelain', { 
        encoding: 'utf-8' 
      });
      
      const ahead = execSync(`git rev-list --count origin/${branch}..${branch}`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore']
      }).trim() || '0';

      return {
        branch,
        clean: status.length === 0,
        ahead: parseInt(ahead),
        files: status.split('\n').filter(f => f).length
      };
    } catch (error: any) {
      return {
        branch: branchName || 'unknown',
        clean: false,
        ahead: 0,
        files: 0,
        error: error.message
      };
    }
  }
}