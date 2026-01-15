import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ITool, ToolDefinition, ToolResult } from '../../shared/contracts/tool-schema';

const execAsync = promisify(exec);

/**
 * Read File Tool
 */
export class ReadFileTool implements ITool {
    definition: ToolDefinition = {
        name: 'read_file',
        description: 'Read the contents of a file',
        parameters: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'The path to the file to read'
                }
            },
            required: ['path']
        }
    };

    async execute(args: { path: string }): Promise<ToolResult> {
        try {
            const content = await fs.readFile(args.path, 'utf-8');
            return {
                tool: 'read_file',
                output: content,
                success: true
            };
        } catch (error: any) {
            return {
                tool: 'read_file',
                output: '',
                success: false,
                error: error.message
            };
        }
    }
}

/**
 * Write File Tool
 */
export class WriteFileTool implements ITool {
    definition: ToolDefinition = {
        name: 'write_file',
        description: 'Write content to a file',
        parameters: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'The path to the file to write'
                },
                content: {
                    type: 'string',
                    description: 'The content to write to the file'
                }
            },
            required: ['path', 'content']
        }
    };

    async execute(args: { path: string; content: string }): Promise<ToolResult> {
        try {
            // Ensure directory exists
            await fs.mkdir(path.dirname(args.path), { recursive: true });
            await fs.writeFile(args.path, args.content, 'utf-8');
            return {
                tool: 'write_file',
                output: `File written to ${args.path}`,
                success: true
            };
        } catch (error: any) {
            return {
                tool: 'write_file',
                output: '',
                success: false,
                error: error.message
            };
        }
    }
}

/**
 * List Directory Tool
 */
export class ListDirTool implements ITool {
    definition: ToolDefinition = {
        name: 'list_dir',
        description: 'List contents of a directory',
        parameters: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'The directory path to list'
                }
            },
            required: ['path']
        }
    };

    async execute(args: { path: string }): Promise<ToolResult> {
        try {
            const items = await fs.readdir(args.path, { withFileTypes: true });
            const output = items
                .map(item => `${item.isDirectory() ? '[DIR]' : '[FILE]'} ${item.name}`)
                .join('\n');

            return {
                tool: 'list_dir',
                output: output || '(Same directory is empty)',
                success: true
            };
        } catch (error: any) {
            return {
                tool: 'list_dir',
                output: '',
                success: false,
                error: error.message
            };
        }
    }
}

/**
 * Run Command Tool
 */
export class RunCommandTool implements ITool {
    definition: ToolDefinition = {
        name: 'run_command',
        description: 'Execute a shell command',
        parameters: {
            type: 'object',
            properties: {
                command: {
                    type: 'string',
                    description: 'The command to execute'
                }
            },
            required: ['command']
        }
    };

    async execute(args: { command: string }): Promise<ToolResult> {
        try {
            const { stdout, stderr } = await execAsync(args.command);
            return {
                tool: 'run_command',
                output: stdout + (stderr ? `\nSTDERR:\n${stderr}` : ''),
                success: true
            };
        } catch (error: any) {
            return {
                tool: 'run_command',
                output: error.stdout + (error.stderr ? `\nSTDERR:\n${error.stderr}` : ''),
                success: false,
                error: error.message
            };
        }
    }
}
