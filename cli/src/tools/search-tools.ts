import { ITool, ToolDefinition, ToolResult } from '../../shared/contracts/tool-schema';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';

const execAsync = util.promisify(exec);

export class SearchFilesTool implements ITool {
    definition: ToolDefinition = {
        name: 'search_files',
        description: 'Search for text patterns in files within a directory using grep',
        parameters: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'Directory to search in (absolute or relative)'
                },
                pattern: {
                    type: 'string',
                    description: 'Text pattern or regex to search for'
                },
                recursive: {
                    type: 'boolean',
                    description: 'Search recursively (default: true)'
                }
            },
            required: ['path', 'pattern']
        }
    };

    async execute(args: { path: string; pattern: string; recursive?: boolean }): Promise<ToolResult> {
        try {
            const isRecursive = args.recursive !== false; // Default to true
            const grepFlags = isRecursive ? '-nrI' : '-nI'; // n: line number, r: recursive, I: ignore binary

            // Escape pattern to avoid shell injection or issues
            const escapedPattern = args.pattern.replace(/'/g, "'\\''");

            const command = `grep ${grepFlags} "${escapedPattern}" "${args.path}"`;

            const { stdout } = await execAsync(command);

            // Truncate output if too long
            const maxOutputLength = 10000;
            let output = stdout;
            if (output.length > maxOutputLength) {
                output = output.substring(0, maxOutputLength) + '\n... (output truncated)';
            }

            return {
                tool: 'search_files',
                output: output || 'No matches found.',
                success: true
            };
        } catch (error: any) {
            // Grep returns exit code 1 if no matches found, which is not an error for us
            if (error.code === 1) {
                return {
                    tool: 'search_files',
                    output: 'No matches found.',
                    success: true
                };
            }

            return {
                tool: 'search_files',
                output: '',
                success: false,
                error: error.message
            };
        }
    }
}

export class FindFilesTool implements ITool {
    definition: ToolDefinition = {
        name: 'find_files',
        description: 'Find files by name pattern',
        parameters: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'Directory to search in'
                },
                pattern: {
                    type: 'string',
                    description: 'Filename pattern (e.g. *.ts)'
                }
            },
            required: ['path', 'pattern']
        }
    };

    async execute(args: { path: string; pattern: string }): Promise<ToolResult> {
        try {
            // Using find command
            const command = `find "${args.path}" -name "${args.pattern}" -not -path "*/node_modules/*"`;

            const { stdout } = await execAsync(command);

            return {
                tool: 'find_files',
                output: stdout || 'No files found.',
                success: true
            };
        } catch (error: any) {
            if (error.code === 1) {
                return {
                    tool: 'find_files',
                    output: 'No files found.',
                    success: true
                };
            }

            return {
                tool: 'find_files',
                output: '',
                success: false,
                error: error.message
            };
        }
    }
}
