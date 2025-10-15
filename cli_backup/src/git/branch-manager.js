/**
 * Branch Manager - handles Git branch operations
 */

import { execSync } from 'child_process';

export class BranchManager {
  constructor(config = {}) {
    this.config = config;
    this.branchPrefix = config.branchPrefix || 'agent';
  }

  /**
   * Create a branch for an agent/task
   */
  async createBranch(agent, task, baseBranch = 'main') {
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
    } catch (error) {
      throw new Error(`Failed to create branch: ${error.message}`);
    }
  }

  /**
   * Generate standardized branch name
   */
  generateBranchName(agent, task) {
    const slug = task.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    return `${this.branchPrefix}/${agent}/${slug}`;
  }

  /**
   * Switch to a branch
   */
  async switchBranch(branchName) {
    try {
      execSync(`git checkout ${branchName}`, { stdio: 'pipe' });
      return true;
    } catch (error) {
      throw new Error(`Failed to switch branch: ${error.message}`);
    }
  }

  /**
   * Get current branch
   */
  getCurrentBranch() {
    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', { 
        encoding: 'utf-8' 
      }).trim();
      return branch;
    } catch (error) {
      throw new Error(`Failed to get current branch: ${error.message}`);
    }
  }

  /**
   * List branches by pattern
   */
  listBranches(pattern = null) {
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
    } catch (error) {
      throw new Error(`Failed to list branches: ${error.message}`);
    }
  }

  /**
   * Delete a branch
   */
  async deleteBranch(branchName, force = false) {
    try {
      const flag = force ? '-D' : '-d';
      execSync(`git branch ${flag} ${branchName}`, { stdio: 'pipe' });
      return true;
    } catch (error) {
      throw new Error(`Failed to delete branch: ${error.message}`);
    }
  }

  /**
   * Merge branches
   */
  async mergeBranches(sourceBranch, targetBranch) {
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
    } catch (error) {
      throw new Error(`Failed to merge branches: ${error.message}`);
    }
  }

  /**
   * Check if branch exists
   */
  branchExists(branchName) {
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
  getBranchStatus(branchName = null) {
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
    } catch (error) {
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
