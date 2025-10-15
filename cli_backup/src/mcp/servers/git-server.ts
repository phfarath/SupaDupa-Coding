/**
 * sdGitServer - MCP server for Git operations
 * Provides standardized commit functionality via MCP protocol
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import {
  MCPTool,
  MCPCommitParams,
  MCPCommitResult,
  MCP_PROTOCOL,
  MCP_EVENTS
} from '../../../shared/contracts/mcp-protocol';
import { CommitManager } from '../../git/commit-manager';

export class sdGitServer extends EventEmitter {
  private commitManager: CommitManager;
  private tools: MCPTool[];
  private name: string;
  private enabled: boolean;

  constructor(config: any) {
    super();
    this.name = 'git-server';
    this.enabled = config.enabled !== false;
    this.commitManager = new CommitManager(config);
    this.tools = this.defineTools();
  }

  private defineTools(): MCPTool[] {
    return [
      {
        name: MCP_PROTOCOL.TOOLS.GIT_COMMIT,
        description: 'Create a standardized git commit',
        parameters: [
          { 
            name: 'agent', 
            type: 'string', 
            required: true, 
            description: 'Agent name performing the commit' 
          },
          { 
            name: 'scope', 
            type: 'string', 
            required: true, 
            description: 'Scope of the changes (e.g., feature, bugfix, docs)' 
          },
          { 
            name: 'description', 
            type: 'string', 
            required: true, 
            description: 'Description of the changes' 
          },
          { 
            name: 'files', 
            type: 'array', 
            required: false, 
            description: 'List of files to include in commit' 
          },
          { 
            name: 'autoStage', 
            type: 'boolean', 
            required: false, 
            description: 'Automatically stage all changes before commit' 
          },
          { 
            name: 'message', 
            type: 'string', 
            required: false, 
            description: 'Custom commit message (overrides default format)' 
          },
        ],
        returns: {
          type: 'object',
          description: 'Commit information including hash, branch, and metadata',
        },
      },
      {
        name: MCP_PROTOCOL.TOOLS.GIT_STATUS,
        description: 'Get current git repository status',
        parameters: [],
        returns: {
          type: 'object',
          description: 'Repository status including staged and unstaged changes',
        },
      },
      {
        name: MCP_PROTOCOL.TOOLS.GIT_DIFF,
        description: 'Get diff of uncommitted changes',
        parameters: [
          {
            name: 'files',
            type: 'array',
            required: false,
            description: 'Specific files to get diff for (optional)',
          },
        ],
        returns: {
          type: 'object',
          description: 'Diff information showing changes',
        },
      },
      {
        name: MCP_PROTOCOL.TOOLS.GIT_PUSH,
        description: 'Push commits to remote repository',
        parameters: [
          {
            name: 'branch',
            type: 'string',
            required: false,
            description: 'Branch to push (defaults to current branch)',
          },
          {
            name: 'force',
            type: 'boolean',
            required: false,
            description: 'Force push (use with caution)',
          },
        ],
        returns: {
          type: 'object',
          description: 'Push result information',
        },
      },
    ];
  }

  async handleToolCall(toolName: string, params: any): Promise<any> {
    if (!this.enabled) {
      throw new Error(`Git server is disabled`);
    }

    this.emit('tool-call-received', { toolName, params });

    try {
      let result: any;

      switch (toolName) {
        case MCP_PROTOCOL.TOOLS.GIT_COMMIT:
          result = await this.handleCommit(params as MCPCommitParams);
          break;
        case MCP_PROTOCOL.TOOLS.GIT_STATUS:
          result = await this.handleStatus();
          break;
        case MCP_PROTOCOL.TOOLS.GIT_DIFF:
          result = await this.handleDiff(params.files);
          break;
        case MCP_PROTOCOL.TOOLS.GIT_PUSH:
          result = await this.handlePush(params.branch, params.force);
          break;
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }

      this.emit('tool-call-completed', { toolName, params, result });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit('tool-call-failed', { toolName, params, error: errorMessage });
      throw error;
    }
  }

  private async handleCommit(params: MCPCommitParams): Promise<MCPCommitResult> {
    try {
      // Set custom message if provided
      if (params.message) {
        this.commitManager.messageFormat = params.message;
      }

      const commitInfo = await this.commitManager.commit(
        params.agent,
        params.scope,
        params.description,
        { 
          autoStage: params.autoStage !== false,
          files: params.files,
        }
      );

      const result: MCPCommitResult = {
        commitHash: commitInfo.sha || 'unknown',
        branch: await this.getCurrentBranch(),
        files: params.files || [],
        message: commitInfo.message,
        timestamp: commitInfo.createdAt || new Date().toISOString(),
        author: {
          name: params.agent,
          email: `${params.agent}@supadupacode.local`,
        },
      };

      // Save commit info for QA and tracking
      await this.saveCommitInfo(result);

      this.emit('commit-created', result);
      return result;
    } catch (error) {
      throw new Error(`Failed to create commit: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleStatus(): Promise<{
    hasChanges: boolean;
    stagedFiles: string[];
    modifiedFiles: string[];
    untrackedFiles: string[];
    currentBranch: string;
    timestamp: string;
  }> {
    try {
      const hasChanges = this.commitManager.hasUncommittedChanges();
      const currentBranch = await this.getCurrentBranch();
      
      // Get detailed status information
      const statusInfo = await this.getDetailedStatus();

      return {
        hasChanges,
        stagedFiles: statusInfo.stagedFiles || [],
        modifiedFiles: statusInfo.modifiedFiles || [],
        untrackedFiles: statusInfo.untrackedFiles || [],
        currentBranch,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to get git status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleDiff(files?: string[]): Promise<{
    hasChanges: boolean;
    diff: string;
    files: string[];
    timestamp: string;
  }> {
    try {
      const diff = this.commitManager.getDiff();
      const hasChanges = diff.length > 0;

      return {
        hasChanges,
        diff,
        files: files || [],
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to get git diff: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handlePush(branch?: string, force?: boolean): Promise<{
    success: boolean;
    branch: string;
    pushed: boolean;
    timestamp: string;
    error?: string;
  }> {
    try {
      const pushResult = await this.commitManager.push((branch || null) as any, force);
      
      return {
        success: true,
        branch: pushResult.branch,
        pushed: pushResult.pushed,
        timestamp: pushResult.timestamp,
      };
    } catch (error) {
      return {
        success: false,
        branch: branch || 'unknown',
        pushed: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async getCurrentBranch(): Promise<string> {
    try {
      // In a real implementation, this would use git commands
      // For now, return a mock value
      return 'main';
    } catch (error) {
      return 'unknown';
    }
  }

  private async getDetailedStatus(): Promise<{
    stagedFiles: string[];
    modifiedFiles: string[];
    untrackedFiles: string[];
  }> {
    try {
      // In a real implementation, this would parse `git status --porcelain`
      // For now, return mock data
      return {
        stagedFiles: [],
        modifiedFiles: [],
        untrackedFiles: [],
      };
    } catch (error) {
      return {
        stagedFiles: [],
        modifiedFiles: [],
        untrackedFiles: [],
      };
    }
  }

  private async saveCommitInfo(result: MCPCommitResult): Promise<void> {
    try {
      // Save to mcp/git/commit_info.json
      const outputPath = join(process.cwd(), 'cli', 'mcp', 'git', 'commit_info.json');
      await fs.mkdir(dirname(outputPath), { recursive: true });
      
      const commitData = {
        ...result,
        serverName: this.name,
        savedAt: new Date().toISOString(),
      };

      await fs.writeFile(outputPath, JSON.stringify(commitData, null, 2));
      
      // Also save to a history file
      const historyPath = join(process.cwd(), 'cli', 'mcp', 'git', 'commit_history.json');
      let history: any[] = [];
      
      try {
        const existingHistory = await fs.readFile(historyPath, 'utf-8');
        history = JSON.parse(existingHistory);
      } catch {
        // File doesn't exist, start with empty array
      }

      history.push({
        ...commitData,
        index: history.length + 1,
      });

      // Keep only last 100 commits
      if (history.length > 100) {
        history = history.slice(-100);
      }

      await fs.writeFile(historyPath, JSON.stringify(history, null, 2));
      
      console.log(`Commit info saved: ${result.commitHash}`);
    } catch (error) {
      console.error('Failed to save commit info:', error);
    }
  }

  getTools(): MCPTool[] {
    return this.tools;
  }

  getName(): string {
    return this.name;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.emit('enabled-changed', { enabled });
  }

  async getCommitHistory(limit: number = 10): Promise<any[]> {
    try {
      const historyPath = join(process.cwd(), 'cli', 'mcp', 'git', 'commit_history.json');
      const historyData = await fs.readFile(historyPath, 'utf-8');
      const history: any[] = JSON.parse(historyData);
      
      return history.slice(-limit).reverse();
    } catch (error) {
      return [];
    }
  }

  async getServerStats(): Promise<{
    totalCommits: number;
    lastCommit?: MCPCommitResult;
    uptime: number;
    toolsAvailable: number;
  }> {
    try {
      const history = await this.getCommitHistory(1);
      const lastCommit = history.length > 0 ? history[0] : undefined;
      
      return {
        totalCommits: await this.getCommitHistory().then(h => h.length),
        lastCommit,
        uptime: process.uptime() * 1000, // Convert to milliseconds
        toolsAvailable: this.tools.length,
      };
    } catch (error) {
      return {
        totalCommits: 0,
        uptime: process.uptime() * 1000,
        toolsAvailable: this.tools.length,
      };
    }
  }

  async cleanup(): Promise<void> {
    this.removeAllListeners();
    console.log('sdGitServer cleaned up');
  }
}