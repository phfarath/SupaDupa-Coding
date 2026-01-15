/**
 * Developer Agent - handles implementation tasks
 */

import { sdBaseAgent, AgentTask } from './base-agent';
import { sdProviderRegistry } from '../api/provider-registry';
import { ITool } from '../../shared/contracts/tool-schema';

export interface DevelopmentResult {
  status: string;
  message: string;
  artifacts: {
    files: string[];
    linesOfCode: number;
    commits: string[];
  };
}


export class DeveloperAgent extends sdBaseAgent {
  private tools: Map<string, ITool> = new Map();

  constructor(config: any = {}, providerRegistry?: sdProviderRegistry) {
    const fullConfig = {
      id: 'developer',
      name: 'developer',
      type: 'coder' as const,
      capabilities: ['implementation', 'coding', 'refactoring'],
      api: config.api || {
        provider: 'openai',
        model: 'gpt-4',
        credentials: {}
      },
      tools: config.tools || [],
      systemPrompt: config.systemPrompt || 'You are a development agent specializing in implementation tasks. You have access to tools to read, write, and list files. ALWAYS use these tools to perform your tasks. When creating files, ensure you first check if the directory exists.',
      settings: config.settings || {}
    };
    super(fullConfig, providerRegistry || new sdProviderRegistry());

    this.registerDefaultTools();
  }

  private registerDefaultTools() {
    // Dynamically import tools to avoid circular dependencies if any
    // For now we import them directly as they are available
    const { ReadFileTool, WriteFileTool, ListDirTool, RunCommandTool } = require('../tools/file-tools');
    const { SearchFilesTool, FindFilesTool } = require('../tools/search-tools');

    this.registerTool(new ReadFileTool());
    this.registerTool(new WriteFileTool());
    this.registerTool(new ListDirTool());
    this.registerTool(new RunCommandTool());
    this.registerTool(new SearchFilesTool());
    this.registerTool(new FindFilesTool());
  }

  public registerTool(tool: ITool) {
    this.tools.set(tool.definition.name, tool);
  }

  protected buildUserPrompt(task: AgentTask): string {
    const toolDefinitions = Array.from(this.tools.values()).map(t => t.definition);
    return `
Task: ${task.description}

Available Tools:
${JSON.stringify(toolDefinitions, null, 2)}

Instructions:
1. Analyze the task.
2. Use the available tools to execute the task.
3. If you need to write a file, use 'write_file'.
4. If you need to read a file, use 'read_file'.
5. If you need to search for files or content, use 'search_files' or 'find_files'.
6. If you need to run a shell command, use 'run_command'.
7. Return a final status when done.

IMPORTANT: To use a tool, your response MUST be a valid JSON object with this structure:
{
  "tool": "tool_name",
  "parameters": { ... }
}

If you have completed the task, respond with:
{
  "status": "completed",
  "message": "Description of what was done"
}
`;
  }

  protected processLLMResponse(response: any): any {
    // This method is used by base class but we override execute for full control
    return response;
  }

  async execute(task: AgentTask): Promise<DevelopmentResult> {
    const maxSteps = 10;
    const history: any[] = [];
    let currentStep = 0;
    let finalResult: DevelopmentResult = {
      status: 'failed',
      message: 'Max steps reached',
      artifacts: { files: [], linesOfCode: 0, commits: [] }
    };

    try {
      // Initial prompt
      const systemPrompt = this.config.systemPrompt;
      let userPrompt = this.buildUserPrompt(task);

      while (currentStep < maxSteps) {
        currentStep++;

        // Call LLM
        // Note: We need to access the provider directly here for a custom loop
        const response = await this.callLLM(systemPrompt, userPrompt, history);

        let parsedResponse;
        try {
          // Clean markdown code blocks if present
          const cleanContent = response.content.replace(/```json\n?/, '').replace(/\n?```$/, '').trim();
          parsedResponse = JSON.parse(cleanContent);
        } catch (e) {
          console.warn('Failed to parse LLM response:', response.content);
          // Allow LLM to correct itself in next turn if we were feeding back error
          // For now, just fail or retry?
          // Let's retry by appending error to history
          history.push({ role: 'assistant', content: response.content });
          history.push({ role: 'user', content: 'Invalid JSON response. Please respond with valid JSON only.' });
          continue;
        }

        // Add assistant response to history
        history.push({ role: 'assistant', content: response.content });

        // Check if task is completed
        if (parsedResponse.status === 'completed') {
          finalResult = {
            status: 'completed',
            message: parsedResponse.message,
            artifacts: {
              files: [], // TODO: Track modified files
              linesOfCode: 0,
              commits: []
            }
          };
          break;
        }

        // Check for tool execution
        if (parsedResponse.tool) {
          const tool = this.tools.get(parsedResponse.tool);
          if (tool) {
            console.log(`Executing tool: ${parsedResponse.tool}`);
            try {
              const result = await tool.execute(parsedResponse.parameters);
              const resultStr = `Tool '${parsedResponse.tool}' output:\n${result.output}\nSuccess: ${result.success}`;

              // Feed result back to LLM
              history.push({ role: 'user', content: resultStr });
            } catch (err: any) {
              history.push({ role: 'user', content: `Tool error: ${err.message}` });
            }
          } else {
            history.push({ role: 'user', content: `Error: Tool '${parsedResponse.tool}' not found.` });
          }
        } else {
          // Unknown response format
          history.push({ role: 'user', content: 'Please use a tool or complete the task with the specified JSON format.' });
        }
      }
    } catch (error: any) {
      finalResult.message = `Error executing task: ${error.message}`;
    }

    return finalResult;
  }

  // Initial helper to call LLM using the registry
  // This duplicates some logic from BaseAgent/BrainAgent but gives us the raw response for the loop
  private async callLLM(system: string, user: string, history: any[]): Promise<any> {
    const providers = this.providerRegistry.list();
    if (providers.length === 0) throw new Error('No providers available');

    // Construct messages
    const messages = [
      { role: 'system', content: system },
      { role: 'user', content: user },
      ...history
    ];

    const request = {
      messages,
      parameters: { temperature: 0.1 }
    };

    const providerId = providers[0];
    return await this.providerRegistry.execute(providerId, request);
  }
}