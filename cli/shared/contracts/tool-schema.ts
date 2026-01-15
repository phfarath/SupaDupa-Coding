/**
 * Tool Schema Definitions
 */

export interface ToolDefinition {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: Record<string, any>;
        required?: string[];
    };
}

export interface ToolResult {
    tool: string;
    output: string;
    success: boolean;
    error?: string;
    metadata?: Record<string, any>;
}

export interface ITool {
    definition: ToolDefinition;
    execute(args: any): Promise<ToolResult>;
}
